/**
 * PuzzlePiece - Individual draggable component piece for assembly puzzles
 */
import * as THREE from 'three';

export class PuzzlePiece {
    constructor(definition, index) {
        this.id = definition.id;
        this.label = definition.label;
        this.definition = definition;
        this.index = index;

        // Positions
        this.correctPosition = definition.correctPosition.clone();
        this.correctRotation = definition.correctRotation ?
            new THREE.Euler(definition.correctRotation.x, definition.correctRotation.y, definition.correctRotation.z) :
            new THREE.Euler(0, 0, 0);
        this.startPosition = definition.startPosition.clone();
        this.snapDistance = definition.snapDistance || 0.3;
        this.hint = definition.hint;
        this.order = definition.order || index + 1;

        // State
        this.isPlaced = false;
        this.isCorrect = false;
        this.isDragging = false;
        this.isHighlighted = false;
        this.isLocked = false;

        // 3D object
        this.mesh = null;
        this.outlineMesh = null;
        this.glowMesh = null;
        this.originalMaterial = null;

        // Animation
        this.animationProgress = 0;
        this.isAnimating = false;

        // Create the 3D mesh
        this.createMesh();
    }

    createMesh() {
        const { geometry, material } = this.definition;
        let geom;

        // Create geometry based on type
        switch (geometry.type) {
            case 'box':
                geom = new THREE.BoxGeometry(...geometry.params);
                break;
            case 'cylinder':
                geom = new THREE.CylinderGeometry(...geometry.params);
                break;
            case 'cone':
                geom = new THREE.ConeGeometry(...geometry.params);
                break;
            case 'sphere':
                geom = new THREE.SphereGeometry(...geometry.params);
                break;
            case 'torus':
                geom = new THREE.TorusGeometry(...geometry.params);
                break;
            case 'sprite':
                this.createSpriteMesh();
                return;
            default:
                geom = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        }

        // Create material
        const mat = new THREE.MeshStandardMaterial({
            color: material.color,
            metalness: material.metalness || 0.3,
            roughness: material.roughness || 0.5,
            emissive: material.emissive || material.color,
            emissiveIntensity: material.emissiveIntensity || 0.05,
            transparent: material.transparent || false,
            opacity: material.opacity !== undefined ? material.opacity : 1
        });

        this.originalMaterial = mat;

        // Create main mesh
        this.mesh = new THREE.Mesh(geom, mat);
        this.mesh.position.copy(this.startPosition);
        if (this.correctRotation) {
            this.mesh.rotation.copy(this.correctRotation);
        }
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;

        // Store reference to this piece on the mesh
        this.mesh.userData.puzzlePiece = this;
        this.mesh.userData.isPuzzlePiece = true;

        // Create outline/glow mesh for highlighting
        this.createOutlineMesh(geom);
    }

    createSpriteMesh() {
        const { params } = this.definition.geometry;

        // Create canvas for sprite text
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');

        // Draw text
        ctx.fillStyle = params.color || '#ffffff';
        ctx.font = 'bold 80px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(params.text, 64, 64);

        // Create sprite
        const texture = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({
            map: texture,
            transparent: true
        });

        this.mesh = new THREE.Sprite(spriteMat);
        this.mesh.position.copy(this.startPosition);
        this.mesh.scale.set(params.size || 0.3, params.size || 0.3, 1);

        // Store reference
        this.mesh.userData.puzzlePiece = this;
        this.mesh.userData.isPuzzlePiece = true;

        this.originalMaterial = spriteMat;
    }

    createOutlineMesh(geometry) {
        if (!geometry) return;

        // Create slightly larger outline mesh
        const outlineMat = new THREE.MeshBasicMaterial({
            color: 0x00ffcc,
            transparent: true,
            opacity: 0.3,
            side: THREE.BackSide
        });

        const scale = 1.08;
        this.outlineMesh = new THREE.Mesh(geometry.clone(), outlineMat);
        this.outlineMesh.scale.multiplyScalar(scale);
        this.outlineMesh.visible = false;
        this.mesh.add(this.outlineMesh);

        // Create glow mesh for success feedback
        const glowMat = new THREE.MeshBasicMaterial({
            color: 0x00ff88,
            transparent: true,
            opacity: 0,
            side: THREE.FrontSide
        });
        this.glowMesh = new THREE.Mesh(geometry.clone(), glowMat);
        this.glowMesh.scale.multiplyScalar(1.02);
        this.mesh.add(this.glowMesh);
    }

    /**
     * Check if piece is within snap distance of correct position
     */
    checkPosition() {
        if (this.isLocked) return this.isCorrect;

        const currentPos = this.mesh.position;
        const distance = currentPos.distanceTo(this.correctPosition);

        if (distance <= this.snapDistance) {
            return true;
        }
        return false;
    }

    /**
     * Get proximity feedback (0-1, where 1 is very close)
     */
    getProximityFeedback() {
        if (this.isLocked) return 1;

        const currentPos = this.mesh.position;
        const distance = currentPos.distanceTo(this.correctPosition);
        const maxDistance = 3; // Max distance for any feedback

        if (distance > maxDistance) return 0;
        return 1 - (distance / maxDistance);
    }

    /**
     * Snap piece to correct position with animation
     */
    snapToPosition(duration = 400) {
        return new Promise((resolve) => {
            const startPos = this.mesh.position.clone();
            const startRot = this.mesh.rotation.clone();
            const startTime = Date.now();

            this.isAnimating = true;

            const animate = () => {
                const elapsed = Date.now() - startTime;
                const t = Math.min(elapsed / duration, 1);

                // Ease out cubic
                const eased = 1 - Math.pow(1 - t, 3);

                // Interpolate position
                this.mesh.position.lerpVectors(startPos, this.correctPosition, eased);

                // Interpolate rotation
                this.mesh.rotation.x = startRot.x + (this.correctRotation.x - startRot.x) * eased;
                this.mesh.rotation.y = startRot.y + (this.correctRotation.y - startRot.y) * eased;
                this.mesh.rotation.z = startRot.z + (this.correctRotation.z - startRot.z) * eased;

                if (t < 1) {
                    requestAnimationFrame(animate);
                } else {
                    this.mesh.position.copy(this.correctPosition);
                    this.mesh.rotation.copy(this.correctRotation);
                    this.isPlaced = true;
                    this.isCorrect = true;
                    this.isLocked = true;
                    this.isAnimating = false;
                    this.showSuccessEffect();
                    resolve();
                }
            };

            animate();
        });
    }

    /**
     * Return piece to toolbox with animation
     */
    returnToToolbox(duration = 300) {
        return new Promise((resolve) => {
            const startPos = this.mesh.position.clone();
            const startTime = Date.now();

            this.isAnimating = true;

            const animate = () => {
                const elapsed = Date.now() - startTime;
                const t = Math.min(elapsed / duration, 1);

                // Ease in out quad
                const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

                this.mesh.position.lerpVectors(startPos, this.startPosition, eased);

                if (t < 1) {
                    requestAnimationFrame(animate);
                } else {
                    this.mesh.position.copy(this.startPosition);
                    this.isPlaced = false;
                    this.isCorrect = false;
                    this.isAnimating = false;
                    resolve();
                }
            };

            animate();
        });
    }

    /**
     * Shake animation for incorrect placement
     */
    shakeAnimation(duration = 300) {
        return new Promise((resolve) => {
            const originalPos = this.mesh.position.clone();
            const shakeAmount = 0.08;
            const startTime = Date.now();

            this.isAnimating = true;

            const animate = () => {
                const elapsed = Date.now() - startTime;
                const t = elapsed / duration;

                if (t < 1) {
                    const offset = Math.sin(t * Math.PI * 8) * shakeAmount * (1 - t);
                    this.mesh.position.x = originalPos.x + offset;
                    requestAnimationFrame(animate);
                } else {
                    this.mesh.position.copy(originalPos);
                    this.isAnimating = false;
                    resolve();
                }
            };

            animate();
        });
    }

    /**
     * Show success glow effect
     */
    showSuccessEffect() {
        if (!this.glowMesh) return;

        const glowMat = this.glowMesh.material;
        const duration = 600;
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const t = Math.min(elapsed / duration, 1);

            // Pulse in then fade out
            if (t < 0.3) {
                glowMat.opacity = t / 0.3 * 0.5;
            } else {
                glowMat.opacity = 0.5 * (1 - (t - 0.3) / 0.7);
            }

            if (t < 1) {
                requestAnimationFrame(animate);
            } else {
                glowMat.opacity = 0;
            }
        };

        animate();
    }

    /**
     * Highlight piece for hint or selection
     */
    highlight(color = 0x00ffcc, intensity = 1) {
        this.isHighlighted = true;

        if (this.outlineMesh) {
            this.outlineMesh.material.color.setHex(color);
            this.outlineMesh.material.opacity = 0.4 * intensity;
            this.outlineMesh.visible = true;
        }

        // Pulse animation for the outline
        this.startHighlightPulse();
    }

    /**
     * Remove highlight
     */
    unhighlight() {
        this.isHighlighted = false;

        if (this.outlineMesh) {
            this.outlineMesh.visible = false;
        }
    }

    /**
     * Pulsing highlight animation
     */
    startHighlightPulse() {
        if (!this.outlineMesh || !this.isHighlighted) return;

        const startTime = Date.now();
        const duration = 1000;

        const pulse = () => {
            if (!this.isHighlighted) return;

            const elapsed = Date.now() - startTime;
            const t = (elapsed % duration) / duration;
            const opacity = 0.2 + Math.sin(t * Math.PI * 2) * 0.2;

            this.outlineMesh.material.opacity = opacity;

            requestAnimationFrame(pulse);
        };

        pulse();
    }

    /**
     * Show proximity feedback (getting warmer)
     */
    showProximityFeedback(proximity) {
        if (this.isLocked || !this.outlineMesh) return;

        if (proximity > 0.3) {
            // Interpolate color from yellow to green based on proximity
            const color = new THREE.Color();
            color.setHSL(0.15 + proximity * 0.2, 1, 0.5); // Yellow to green

            this.outlineMesh.material.color.copy(color);
            this.outlineMesh.material.opacity = proximity * 0.5;
            this.outlineMesh.visible = true;
        } else {
            this.outlineMesh.visible = false;
        }
    }

    /**
     * Set dragging state
     */
    setDragging(dragging) {
        this.isDragging = dragging;

        if (dragging) {
            // Slight scale up when dragging
            this.mesh.scale.setScalar(1.05);
        } else {
            this.mesh.scale.setScalar(1);
        }
    }

    /**
     * Update the piece's material for hover state
     */
    setHoverState(isHovered) {
        if (this.isLocked) return;

        if (this.mesh.material && !this.mesh.isSprite) {
            if (isHovered) {
                this.mesh.material.emissiveIntensity = 0.2;
            } else {
                this.mesh.material.emissiveIntensity = this.definition.material?.emissiveIntensity || 0.05;
            }
        }
    }

    /**
     * Reset piece to initial state
     */
    reset() {
        this.isPlaced = false;
        this.isCorrect = false;
        this.isLocked = false;
        this.isDragging = false;
        this.isHighlighted = false;
        this.isAnimating = false;

        this.mesh.position.copy(this.startPosition);
        this.mesh.rotation.copy(this.correctRotation);
        this.mesh.scale.setScalar(1);

        this.unhighlight();

        if (this.glowMesh) {
            this.glowMesh.material.opacity = 0;
        }
    }

    /**
     * Dispose of Three.js resources
     */
    dispose() {
        if (this.mesh) {
            if (this.mesh.geometry) this.mesh.geometry.dispose();
            if (this.mesh.material) this.mesh.material.dispose();
        }
        if (this.outlineMesh) {
            if (this.outlineMesh.geometry) this.outlineMesh.geometry.dispose();
            if (this.outlineMesh.material) this.outlineMesh.material.dispose();
        }
        if (this.glowMesh) {
            if (this.glowMesh.geometry) this.glowMesh.geometry.dispose();
            if (this.glowMesh.material) this.glowMesh.material.dispose();
        }
    }
}
