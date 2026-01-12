/**
 * Field Visualizer - Magnetic field visualization engine
 */
import * as THREE from 'three';

export class FieldVisualizer {
    constructor(scene) {
        this.scene = scene;
        this.fieldLines = [];
        this.arrows = [];
        this.particles = [];
        this.fluxLines = [];
        this.showFieldLines = true;
        this.showArrows = true;
    }

    /**
     * Calculate magnetic field direction at a point from a bar magnet
     */
    calculateDipoleField(point, magnet) {
        const worldPos = new THREE.Vector3();
        magnet.getWorldPosition(worldPos);

        const magnetRotation = new THREE.Quaternion();
        magnet.getWorldQuaternion(magnetRotation);

        // Get pole positions in world space
        const northWorld = magnet.userData.northPole.clone().applyQuaternion(magnetRotation).add(worldPos);
        const southWorld = magnet.userData.southPole.clone().applyQuaternion(magnetRotation).add(worldPos);

        // Vector from point to north and south poles
        const toNorth = new THREE.Vector3().subVectors(point, northWorld);
        const toSouth = new THREE.Vector3().subVectors(point, southWorld);

        const distNorth = toNorth.length();
        const distSouth = toSouth.length();

        // Avoid singularities
        const minDist = 0.1;
        if (distNorth < minDist || distSouth < minDist) {
            return new THREE.Vector3(0, 0, 0);
        }

        // Field from north pole (repels)
        const fieldFromNorth = toNorth.clone().normalize().multiplyScalar(
            magnet.userData.strength / (distNorth * distNorth)
        );

        // Field from south pole (attracts)
        const fieldFromSouth = toSouth.clone().normalize().multiplyScalar(
            -magnet.userData.strength / (distSouth * distSouth)
        );

        return fieldFromNorth.add(fieldFromSouth);
    }

    /**
     * Calculate field from a solenoid
     */
    calculateSolenoidField(point, solenoid) {
        const worldPos = new THREE.Vector3();
        solenoid.getWorldPosition(worldPos);

        const magnetRotation = new THREE.Quaternion();
        solenoid.getWorldQuaternion(magnetRotation);

        const { current, turns, length, radius } = solenoid.userData;

        if (Math.abs(current) < 0.01) {
            return new THREE.Vector3(0, 0, 0);
        }

        // Transform point to solenoid local space
        const localPoint = point.clone().sub(worldPos);
        const inverseRotation = magnetRotation.clone().invert();
        localPoint.applyQuaternion(inverseRotation);

        // Check if inside solenoid
        const distFromAxis = Math.sqrt(localPoint.y * localPoint.y + localPoint.z * localPoint.z);
        const alongAxis = localPoint.x;

        // Simplified uniform field inside, dipole-like outside
        let field = new THREE.Vector3();

        if (distFromAxis < radius && Math.abs(alongAxis) < length / 2) {
            // Inside: uniform field along axis
            field.set(current * turns * 0.1, 0, 0);
        } else {
            // Outside: approximate as dipole at each end
            const leftEnd = new THREE.Vector3(-length / 2, 0, 0);
            const rightEnd = new THREE.Vector3(length / 2, 0, 0);

            const toLeft = localPoint.clone().sub(leftEnd);
            const toRight = localPoint.clone().sub(rightEnd);

            const distLeft = Math.max(toLeft.length(), 0.1);
            const distRight = Math.max(toRight.length(), 0.1);

            // Left end acts like south pole, right end like north pole (for positive current)
            const strength = current * turns * 0.02;

            const fieldFromRight = toRight.clone().normalize().multiplyScalar(
                strength / (distRight * distRight)
            );
            const fieldFromLeft = toLeft.clone().normalize().multiplyScalar(
                -strength / (distLeft * distLeft)
            );

            field = fieldFromRight.add(fieldFromLeft);
        }

        // Transform back to world space
        field.applyQuaternion(magnetRotation);

        return field;
    }

    /**
     * Generate field lines from a bar magnet
     */
    generateMagnetFieldLines(magnet, options = {}) {
        const { numLines = 12, steps = 50, stepSize = 0.1 } = options;

        this.clearFieldLines();

        const worldPos = new THREE.Vector3();
        magnet.getWorldPosition(worldPos);

        const magnetRotation = new THREE.Quaternion();
        magnet.getWorldQuaternion(magnetRotation);

        const northWorld = magnet.userData.northPole.clone()
            .applyQuaternion(magnetRotation).add(worldPos);

        // Field line material with gradient
        const lineMaterial = new THREE.LineBasicMaterial({
            color: 0x00d4aa,
            linewidth: 2,
            transparent: true,
            opacity: 0.7
        });

        // Start field lines from around north pole
        for (let i = 0; i < numLines; i++) {
            const angle = (i / numLines) * Math.PI * 2;
            const offset = new THREE.Vector3(
                0.15,
                Math.sin(angle) * 0.15,
                Math.cos(angle) * 0.15
            ).applyQuaternion(magnetRotation);

            const startPoint = northWorld.clone().add(offset);

            const linePoints = this.traceFieldLine(startPoint, magnet, steps, stepSize);

            if (linePoints.length > 10) {
                const geometry = new THREE.BufferGeometry().setFromPoints(linePoints);
                const line = new THREE.Line(geometry, lineMaterial);
                this.scene.add(line);
                this.fieldLines.push(line);
            }
        }
    }

    /**
     * Trace a field line from a starting point
     */
    traceFieldLine(startPoint, source, steps, stepSize) {
        const points = [startPoint.clone()];
        let currentPoint = startPoint.clone();

        const sourcePos = new THREE.Vector3();
        source.getWorldPosition(sourcePos);

        for (let i = 0; i < steps; i++) {
            let field;
            if (source.userData.type === 'barMagnet') {
                field = this.calculateDipoleField(currentPoint, source);
            } else if (source.userData.type === 'solenoid') {
                field = this.calculateSolenoidField(currentPoint, source);
            } else {
                break;
            }

            if (field.length() < 0.001) break;

            // Move along field direction
            const step = field.normalize().multiplyScalar(stepSize);
            currentPoint.add(step);

            // Stop if too far from source or back at south pole
            const distFromSource = currentPoint.distanceTo(sourcePos);
            if (distFromSource > 5) break;

            // Check if reached south pole area
            if (source.userData.type === 'barMagnet') {
                const magnetRotation = new THREE.Quaternion();
                source.getWorldQuaternion(magnetRotation);
                const southWorld = source.userData.southPole.clone()
                    .applyQuaternion(magnetRotation).add(sourcePos);
                if (currentPoint.distanceTo(southWorld) < 0.2) {
                    points.push(southWorld.clone());
                    break;
                }
            }

            points.push(currentPoint.clone());
        }

        return points;
    }

    /**
     * Generate arrow field showing direction at grid points
     */
    generateArrowField(sources, options = {}) {
        const {
            gridSize = 4,
            spacing = 0.8,
            arrowScale = 0.25,
            yLevel = 0
        } = options;

        this.clearArrows();

        const arrowMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffcc });
        const arrowGeometry = this.createArrowGeometry(arrowScale);

        for (let x = -gridSize; x <= gridSize; x++) {
            for (let z = -gridSize; z <= gridSize; z++) {
                const point = new THREE.Vector3(x * spacing, yLevel, z * spacing);

                // Skip if too close to any source
                let tooClose = false;
                for (const source of sources) {
                    const sourcePos = new THREE.Vector3();
                    source.getWorldPosition(sourcePos);
                    if (point.distanceTo(sourcePos) < 0.5) {
                        tooClose = true;
                        break;
                    }
                }
                if (tooClose) continue;

                // Calculate total field from all sources
                let totalField = new THREE.Vector3();
                for (const source of sources) {
                    if (source.userData.type === 'barMagnet') {
                        totalField.add(this.calculateDipoleField(point, source));
                    } else if (source.userData.type === 'solenoid') {
                        totalField.add(this.calculateSolenoidField(point, source));
                    }
                }

                if (totalField.length() < 0.001) continue;

                // Create arrow
                const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial.clone());
                arrow.position.copy(point);

                // Orient arrow to field direction
                const direction = totalField.clone().normalize();
                const quaternion = new THREE.Quaternion();
                quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), direction);
                arrow.quaternion.copy(quaternion);

                // Scale by field strength (clamped)
                const strength = Math.min(totalField.length() * 3, 1);
                arrow.scale.setScalar(0.5 + strength * 0.5);
                arrow.material.opacity = 0.3 + strength * 0.5;
                arrow.material.transparent = true;

                this.scene.add(arrow);
                this.arrows.push(arrow);
            }
        }
    }

    createArrowGeometry(scale) {
        const shape = new THREE.Shape();
        shape.moveTo(0, 0);
        shape.lineTo(-0.6 * scale, 0.15 * scale);
        shape.lineTo(-0.4 * scale, 0);
        shape.lineTo(-0.6 * scale, -0.15 * scale);
        shape.lineTo(0, 0);

        const extrudeSettings = { depth: 0.02, bevelEnabled: false };
        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        geometry.rotateY(Math.PI / 2);
        geometry.translate(scale * 0.3, 0, 0);

        return geometry;
    }

    /**
     * Generate solenoid field visualization with internal arrows
     */
    generateSolenoidField(solenoid, options = {}) {
        const { numArrows = 8 } = options;

        this.clearFieldLines();
        this.clearArrows();

        const worldPos = new THREE.Vector3();
        solenoid.getWorldPosition(worldPos);

        const magnetRotation = new THREE.Quaternion();
        solenoid.getWorldQuaternion(magnetRotation);

        const { current, currentDirection, length, radius } = solenoid.userData;

        if (Math.abs(current) < 0.01) return;

        const fieldDirection = new THREE.Vector3(currentDirection * Math.sign(current), 0, 0);
        fieldDirection.applyQuaternion(magnetRotation);

        // Create arrows inside solenoid
        const arrowMaterial = new THREE.MeshBasicMaterial({ color: 0x00d4aa });
        const arrowScale = 0.4;
        const arrowGeometry = this.createArrowGeometry(arrowScale);

        for (let i = 0; i < numArrows; i++) {
            const t = (i + 0.5) / numArrows;
            const localPos = new THREE.Vector3((t - 0.5) * length * 0.8, 0, 0);
            const worldArrowPos = localPos.applyQuaternion(magnetRotation).add(worldPos);

            const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
            arrow.position.copy(worldArrowPos);

            const quaternion = new THREE.Quaternion();
            quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), fieldDirection.clone().normalize());
            arrow.quaternion.copy(quaternion);

            this.scene.add(arrow);
            this.arrows.push(arrow);
        }

        // Create field lines exiting from ends
        this.generateMagnetFieldLines({
            userData: {
                type: 'barMagnet',
                strength: current * solenoid.userData.turns * 0.1,
                northPole: new THREE.Vector3(length / 2, 0, 0),
                southPole: new THREE.Vector3(-length / 2, 0, 0)
            },
            getWorldPosition: (v) => v.copy(worldPos),
            getWorldQuaternion: (q) => q.copy(magnetRotation)
        }, { numLines: 8, steps: 40, stepSize: 0.15 });
    }

    /**
     * Create animated flux lines for transformer
     */
    createFluxLines(transformer, options = {}) {
        this.clearFluxLines();

        const worldPos = new THREE.Vector3();
        transformer.getWorldPosition(worldPos);

        const numLines = 6;
        const lineMaterial = new THREE.LineBasicMaterial({
            color: 0x00d4aa,
            transparent: true,
            opacity: 0.6
        });

        // Create closed loop flux lines through the core
        for (let i = 0; i < numLines; i++) {
            const offset = (i - numLines / 2 + 0.5) * 0.08;
            const points = [];

            // Create rectangular loop
            const w = 0.8;
            const h = 0.5;
            const segments = 40;

            for (let j = 0; j <= segments; j++) {
                const t = j / segments;
                let x, y;

                if (t < 0.25) {
                    x = -w + (t / 0.25) * 2 * w;
                    y = h;
                } else if (t < 0.5) {
                    x = w;
                    y = h - ((t - 0.25) / 0.25) * 2 * h;
                } else if (t < 0.75) {
                    x = w - ((t - 0.5) / 0.25) * 2 * w;
                    y = -h;
                } else {
                    x = -w;
                    y = -h + ((t - 0.75) / 0.25) * 2 * h;
                }

                points.push(new THREE.Vector3(x, y, offset).add(worldPos));
            }

            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(geometry, lineMaterial);
            this.scene.add(line);
            this.fluxLines.push({ line, phase: i / numLines * Math.PI * 2 });
        }
    }

    /**
     * Animate flux lines for AC visualization
     */
    animateFluxLines(time, frequency = 1) {
        for (const flux of this.fluxLines) {
            const intensity = Math.sin(time * frequency * Math.PI * 2 + flux.phase);
            flux.line.material.opacity = 0.2 + Math.abs(intensity) * 0.5;
            flux.line.scale.setScalar(0.8 + Math.abs(intensity) * 0.3);
        }
    }

    /**
     * Create Lenz's law opposing field visualization
     */
    createOpposingField(fallingMagnet, tube, velocity) {
        // This creates visual arrows showing the induced opposing field
        const arrows = [];
        const speed = Math.abs(velocity);

        if (speed < 0.01) return arrows;

        const magnetPos = new THREE.Vector3();
        fallingMagnet.getWorldPosition(magnetPos);

        const tubePos = new THREE.Vector3();
        tube.getWorldPosition(tubePos);

        // Check if magnet is inside tube
        const relY = magnetPos.y - tubePos.y;
        const tubeHeight = tube.userData.height;

        if (Math.abs(relY) > tubeHeight / 2 + 0.5) return arrows;

        // Create opposing field arrows around the magnet
        const numArrows = 6;
        const opposingDirection = velocity > 0 ? 1 : -1;

        const arrowMaterial = new THREE.MeshBasicMaterial({
            color: 0xff6b6b,
            transparent: true,
            opacity: 0.6
        });

        for (let i = 0; i < numArrows; i++) {
            const angle = (i / numArrows) * Math.PI * 2;
            const radius = 0.35;

            const arrowGroup = new THREE.Group();

            // Create simple arrow
            const bodyGeom = new THREE.CylinderGeometry(0.02, 0.02, 0.2, 6);
            const headGeom = new THREE.ConeGeometry(0.04, 0.1, 6);

            const body = new THREE.Mesh(bodyGeom, arrowMaterial);
            const head = new THREE.Mesh(headGeom, arrowMaterial);

            body.position.y = opposingDirection * 0.1;
            head.position.y = opposingDirection * 0.25;
            head.rotation.x = opposingDirection > 0 ? 0 : Math.PI;

            arrowGroup.add(body);
            arrowGroup.add(head);

            arrowGroup.position.set(
                magnetPos.x + Math.cos(angle) * radius,
                magnetPos.y,
                magnetPos.z + Math.sin(angle) * radius
            );

            // Scale by velocity
            const scale = 0.5 + speed * 2;
            arrowGroup.scale.setScalar(Math.min(scale, 1.5));

            this.scene.add(arrowGroup);
            arrows.push(arrowGroup);
        }

        return arrows;
    }

    setFieldLinesVisible(visible) {
        this.showFieldLines = visible;
        this.fieldLines.forEach(line => line.visible = visible);
        this.fluxLines.forEach(flux => flux.line.visible = visible);
    }

    setArrowsVisible(visible) {
        this.showArrows = visible;
        this.arrows.forEach(arrow => arrow.visible = visible);
    }

    clearFieldLines() {
        this.fieldLines.forEach(line => {
            this.scene.remove(line);
            line.geometry.dispose();
            line.material.dispose();
        });
        this.fieldLines = [];
    }

    clearArrows() {
        this.arrows.forEach(arrow => {
            this.scene.remove(arrow);
            if (arrow.geometry) arrow.geometry.dispose();
            if (arrow.material) arrow.material.dispose();
        });
        this.arrows = [];
    }

    clearFluxLines() {
        this.fluxLines.forEach(flux => {
            this.scene.remove(flux.line);
            flux.line.geometry.dispose();
            flux.line.material.dispose();
        });
        this.fluxLines = [];
    }

    clearAll() {
        this.clearFieldLines();
        this.clearArrows();
        this.clearFluxLines();
    }
}
