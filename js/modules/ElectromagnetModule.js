/**
 * Electromagnet Module - Interactive electromagnet simulation
 * 
 * Physics Model:
 * - Magnetic field strength: B ∝ N × I (where N = turns, I = current)
 * - Current: I = V / R (Ohm's law)
 * - Magnetic force on objects: F ∝ B² (proportional to field squared)
 * 
 * Educational Features:
 * - Battery, wire coil, iron core construction
 * - Adjustable coil turns and voltage
 * - Metal object attraction demonstration
 * - Real-time magnetic field visualization
 */
import * as THREE from 'three';

export class ElectromagnetModule {
    constructor(app) {
        this.app = app;
        this.name = 'electromagnet';
        this.title = 'Electromagnet';
        this.description = 'Build an electromagnet with battery, coil, and iron core. Attract metal objects!';

        // Component references
        this.battery = null;
        this.ironCore = null;
        this.coilGroup = null;
        this.circuitWires = null;
        this.switchGroup = null;
        this.metalObjects = [];
        this.currentParticles = [];

        // State
        this.isPlaying = true;
        this.isSwitchOn = true;
        this.coilTurns = 10;
        this.voltage = 3.0;
        this.resistance = 1.0;

        // Core material multiplier
        this.coreMaterial = 'iron'; // 'iron', 'air', 'steel'
        this.coreMaterialMultipliers = {
            'air': 1,
            'iron': 200,
            'steel': 100
        };

        // Animation timing
        this.animationTime = 0;

        // Field strength indicator
        this.strengthMeter = null;
    }

    init() {
        // Create main electromagnet assembly
        this.createElectromagnetAssembly();

        // Create metal objects to attract
        this.createMetalObjects();

        // Create UI controls
        this.createControls();

        // Create educational tooltips
        this.createTooltips();

        // Initial field visualization
        this.updateFieldVisualization();
    }

    createElectromagnetAssembly() {
        // Create the iron core (nail)
        this.createIronCore();

        // Create the wire coil around the core
        this.createCoil();

        // Create the battery
        this.createBattery();

        // Create circuit wires connecting components
        this.createCircuitWires();

        // Create the toggle switch
        this.createSwitch();

        // Create current flow particles
        this.createCurrentParticles();

        // Create strength meter
        this.createStrengthMeter();
    }

    createIronCore() {
        const coreGroup = new THREE.Group();

        // Main iron nail body
        const coreLength = 2.5;
        const coreRadius = 0.12;

        // Nail body (cylinder)
        const bodyGeom = new THREE.CylinderGeometry(coreRadius, coreRadius, coreLength, 16);
        const coreMaterial = new THREE.MeshStandardMaterial({
            color: 0x4a4a4a,
            metalness: 0.9,
            roughness: 0.3
        });
        const body = new THREE.Mesh(bodyGeom, coreMaterial);
        body.rotation.z = Math.PI / 2; // Orient horizontally
        coreGroup.add(body);

        // Nail head (larger cylinder on left)
        const headGeom = new THREE.CylinderGeometry(coreRadius * 1.8, coreRadius * 1.8, 0.1, 16);
        const head = new THREE.Mesh(headGeom, coreMaterial);
        head.rotation.z = Math.PI / 2;
        head.position.x = -coreLength / 2 - 0.05;
        coreGroup.add(head);

        // Nail tip (cone on right)
        const tipGeom = new THREE.ConeGeometry(coreRadius, 0.3, 16);
        const tip = new THREE.Mesh(tipGeom, coreMaterial);
        tip.rotation.z = -Math.PI / 2;
        tip.position.x = coreLength / 2 + 0.15;
        coreGroup.add(tip);

        coreGroup.position.set(0, 0.5, 0);
        coreGroup.userData.coreLength = coreLength;
        coreGroup.userData.coreRadius = coreRadius;

        this.ironCore = coreGroup;
        this.app.sceneManager.add(coreGroup);
    }

    createCoil() {
        this.coilGroup = new THREE.Group();
        this.updateCoilGeometry();
        this.coilGroup.position.copy(this.ironCore.position);
        this.app.sceneManager.add(this.coilGroup);
    }

    updateCoilGeometry() {
        // Clear existing coil
        while (this.coilGroup.children.length > 0) {
            const child = this.coilGroup.children[0];
            this.coilGroup.remove(child);
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
        }

        const turns = this.coilTurns;
        const coreRadius = this.ironCore.userData.coreRadius;
        const coilRadius = coreRadius + 0.08;
        const coilLength = 1.5;
        const wireRadius = 0.02;

        // Create coil wire using helix
        const points = [];
        const segments = turns * 32;

        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const angle = t * turns * Math.PI * 2;
            const x = (t - 0.5) * coilLength;
            const y = Math.sin(angle) * coilRadius;
            const z = Math.cos(angle) * coilRadius;
            points.push(new THREE.Vector3(x, y, z));
        }

        const curve = new THREE.CatmullRomCurve3(points);
        const tubeGeom = new THREE.TubeGeometry(curve, segments, wireRadius, 8, false);
        const wireMaterial = new THREE.MeshStandardMaterial({
            color: 0xb87333, // Copper color
            metalness: 0.8,
            roughness: 0.2
        });
        const coilMesh = new THREE.Mesh(tubeGeom, wireMaterial);
        this.coilGroup.add(coilMesh);

        // Store coil data
        this.coilGroup.userData.turns = turns;
        this.coilGroup.userData.coilLength = coilLength;
        this.coilGroup.userData.coilRadius = coilRadius;
    }

    createBattery() {
        const batteryGroup = new THREE.Group();

        // Main battery body
        const bodyGeom = new THREE.CylinderGeometry(0.25, 0.25, 0.8, 16);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0x2c3e50,
            metalness: 0.3,
            roughness: 0.7
        });
        const body = new THREE.Mesh(bodyGeom, bodyMaterial);
        batteryGroup.add(body);

        // Positive terminal (top, red)
        const posTerminalGeom = new THREE.CylinderGeometry(0.08, 0.08, 0.15, 12);
        const posMaterial = new THREE.MeshStandardMaterial({
            color: 0xe74c3c,
            metalness: 0.6,
            roughness: 0.4
        });
        const posTerminal = new THREE.Mesh(posTerminalGeom, posMaterial);
        posTerminal.position.y = 0.45;
        batteryGroup.add(posTerminal);

        // Negative terminal (bottom, blue/black)
        const negTerminalGeom = new THREE.CylinderGeometry(0.12, 0.12, 0.08, 12);
        const negMaterial = new THREE.MeshStandardMaterial({
            color: 0x34495e,
            metalness: 0.6,
            roughness: 0.4
        });
        const negTerminal = new THREE.Mesh(negTerminalGeom, negMaterial);
        negTerminal.position.y = -0.42;
        batteryGroup.add(negTerminal);

        // Labels (+ and -)
        this.createBatteryLabel(batteryGroup, '+', 0xe74c3c, 0.55);
        this.createBatteryLabel(batteryGroup, '−', 0x34495e, -0.55);

        // Voltage label
        this.voltageLabel = this.createVoltageLabel();
        this.voltageLabel.position.set(0, 0, 0.27);
        batteryGroup.add(this.voltageLabel);

        batteryGroup.position.set(-2.5, 0.5, 1);
        batteryGroup.rotation.z = Math.PI / 2; // Horizontal orientation

        this.battery = batteryGroup;
        this.app.sceneManager.add(batteryGroup);
    }

    createBatteryLabel(parent, text, color, yPos) {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 32, 32);

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true
        });
        const sprite = new THREE.Sprite(material);
        sprite.position.set(yPos, 0, 0.3);
        sprite.scale.set(0.25, 0.25, 1);
        parent.add(sprite);
    }

    createVoltageLabel() {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${this.voltage.toFixed(1)}V`, 64, 32);

        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true
        });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(0.5, 0.25, 1);
        sprite.userData.texture = texture;
        sprite.userData.canvas = canvas;
        return sprite;
    }

    updateVoltageLabel() {
        if (!this.voltageLabel) return;
        const canvas = this.voltageLabel.userData.canvas;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${this.voltage.toFixed(1)}V`, 64, 32);
        this.voltageLabel.userData.texture.needsUpdate = true;
    }

    createCircuitWires() {
        const wireGroup = new THREE.Group();
        const wireMaterial = new THREE.MeshStandardMaterial({
            color: 0xb87333, // Copper
            metalness: 0.8,
            roughness: 0.2
        });
        const wireRadius = 0.015;

        // Wire from battery positive to coil
        const wire1Points = [
            new THREE.Vector3(-2.5, 0.95, 1),
            new THREE.Vector3(-2.5, 1.5, 1),
            new THREE.Vector3(-0.75, 1.5, 0),
            new THREE.Vector3(-0.75, 0.5, 0)
        ];

        // Wire from coil to switch to battery negative
        const wire2Points = [
            new THREE.Vector3(0.75, 0.5, 0),
            new THREE.Vector3(0.75, -0.5, 0),
            new THREE.Vector3(-1, -0.5, 1),
            new THREE.Vector3(-2.5, -0.5, 1),
            new THREE.Vector3(-2.5, 0.05, 1)
        ];

        // Create wire paths
        [wire1Points, wire2Points].forEach((points, idx) => {
            const curve = new THREE.CatmullRomCurve3(points);
            const tubeGeom = new THREE.TubeGeometry(curve, 32, wireRadius, 8, false);
            const wire = new THREE.Mesh(tubeGeom, wireMaterial);
            wireGroup.add(wire);
        });

        this.circuitWires = wireGroup;
        this.app.sceneManager.add(wireGroup);
    }

    createSwitch() {
        const switchGroup = new THREE.Group();

        // Switch base
        const baseGeom = new THREE.BoxGeometry(0.3, 0.15, 0.2);
        const baseMaterial = new THREE.MeshStandardMaterial({
            color: 0x2c3e50,
            metalness: 0.3,
            roughness: 0.7
        });
        const base = new THREE.Mesh(baseGeom, baseMaterial);
        switchGroup.add(base);

        // Switch lever
        const leverGeom = new THREE.BoxGeometry(0.08, 0.25, 0.06);
        const leverMaterial = new THREE.MeshStandardMaterial({
            color: this.isSwitchOn ? 0x27ae60 : 0xe74c3c,
            metalness: 0.5,
            roughness: 0.5
        });
        this.switchLever = new THREE.Mesh(leverGeom, leverMaterial);
        this.switchLever.position.y = 0.15;
        this.switchLever.rotation.z = this.isSwitchOn ? 0.3 : -0.3;
        switchGroup.add(this.switchLever);

        // Contact points
        const contactMaterial = new THREE.MeshStandardMaterial({
            color: 0xffd700,
            metalness: 0.9,
            roughness: 0.2
        });

        const contact1 = new THREE.Mesh(
            new THREE.SphereGeometry(0.04, 8, 8),
            contactMaterial
        );
        contact1.position.set(-0.08, 0.08, 0);
        switchGroup.add(contact1);

        const contact2 = new THREE.Mesh(
            new THREE.SphereGeometry(0.04, 8, 8),
            contactMaterial
        );
        contact2.position.set(0.08, 0.08, 0);
        switchGroup.add(contact2);

        // Status indicator light
        this.statusLight = new THREE.Mesh(
            new THREE.SphereGeometry(0.03, 8, 8),
            new THREE.MeshBasicMaterial({
                color: this.isSwitchOn ? 0x00ff00 : 0xff0000
            })
        );
        this.statusLight.position.set(0, 0.25, 0.12);
        switchGroup.add(this.statusLight);

        // ON/OFF label
        this.switchLabel = this.createSwitchLabel();
        this.switchLabel.position.set(0, -0.2, 0.12);
        switchGroup.add(this.switchLabel);

        switchGroup.position.set(0, -0.5, 1);

        this.switchGroup = switchGroup;
        this.app.sceneManager.add(switchGroup);
    }

    createSwitchLabel() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = this.isSwitchOn ? '#27ae60' : '#e74c3c';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.isSwitchOn ? 'ON' : 'OFF', 32, 16);

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true
        });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(0.2, 0.1, 1);
        sprite.userData.texture = texture;
        sprite.userData.canvas = canvas;
        return sprite;
    }

    updateSwitchVisuals() {
        if (this.switchLever) {
            this.switchLever.rotation.z = this.isSwitchOn ? 0.3 : -0.3;
            this.switchLever.material.color.setHex(this.isSwitchOn ? 0x27ae60 : 0xe74c3c);
        }

        if (this.statusLight) {
            this.statusLight.material.color.setHex(this.isSwitchOn ? 0x00ff00 : 0xff0000);
        }

        if (this.switchLabel) {
            const canvas = this.switchLabel.userData.canvas;
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = this.isSwitchOn ? '#27ae60' : '#e74c3c';
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.isSwitchOn ? 'ON' : 'OFF', 32, 16);
            this.switchLabel.userData.texture.needsUpdate = true;
        }
    }

    createCurrentParticles() {
        // Create particles that flow along the circuit
        const particleCount = 30;
        const particleMaterial = new THREE.MeshBasicMaterial({
            color: 0xf1c40f, // Yellow for current
            transparent: true,
            opacity: 0.9
        });

        // Define circuit path
        this.circuitPath = new THREE.CatmullRomCurve3([
            // From battery positive, up and around
            new THREE.Vector3(-2.5, 0.95, 1),
            new THREE.Vector3(-2.5, 1.5, 1),
            new THREE.Vector3(-0.75, 1.5, 0),
            new THREE.Vector3(-0.75, 0.5, 0),
            // Through coil (simplified)
            new THREE.Vector3(-0.5, 0.5, 0),
            new THREE.Vector3(0, 0.5, 0),
            new THREE.Vector3(0.5, 0.5, 0),
            new THREE.Vector3(0.75, 0.5, 0),
            // Down through switch
            new THREE.Vector3(0.75, -0.5, 0),
            new THREE.Vector3(-1, -0.5, 1),
            new THREE.Vector3(-2.5, -0.5, 1),
            new THREE.Vector3(-2.5, 0.05, 1)
        ], true); // Closed loop

        for (let i = 0; i < particleCount; i++) {
            const sphere = new THREE.Mesh(
                new THREE.SphereGeometry(0.03, 8, 8),
                particleMaterial.clone()
            );
            sphere.userData.phase = i / particleCount;
            sphere.visible = this.isSwitchOn && this.getCurrent() > 0.1;
            this.currentParticles.push(sphere);
            this.app.sceneManager.scene.add(sphere);
        }
    }

    createMetalObjects() {
        // Create paper clips and iron balls that can be attracted
        const metalMaterial = new THREE.MeshStandardMaterial({
            color: 0x808080,
            metalness: 0.9,
            roughness: 0.2
        });

        // Create several paper clips
        for (let i = 0; i < 5; i++) {
            const clip = this.createPaperClip();
            clip.position.set(
                3 + Math.random() * 0.5,
                0.2 + Math.random() * 0.3,
                -0.5 + Math.random() * 1
            );
            clip.userData.originalPosition = clip.position.clone();
            clip.userData.isAttracted = false;
            clip.userData.velocity = new THREE.Vector3();
            clip.userData.mass = 0.01;
            this.metalObjects.push(clip);
            this.app.sceneManager.add(clip);
        }

        // Create small iron balls
        for (let i = 0; i < 4; i++) {
            const ball = new THREE.Mesh(
                new THREE.SphereGeometry(0.08, 16, 16),
                metalMaterial.clone()
            );
            ball.position.set(
                3 + Math.random() * 0.3,
                0.3 + Math.random() * 0.4,
                -0.8 + Math.random() * 0.5
            );
            ball.userData.originalPosition = ball.position.clone();
            ball.userData.isAttracted = false;
            ball.userData.velocity = new THREE.Vector3();
            ball.userData.mass = 0.02;
            this.metalObjects.push(ball);
            this.app.sceneManager.add(ball);
        }

        // Make metal objects draggable
        this.metalObjects.forEach(obj => {
            this.app.interaction.addDraggable(obj);
        });
    }

    createPaperClip() {
        const group = new THREE.Group();
        const clipMaterial = new THREE.MeshStandardMaterial({
            color: 0xc0c0c0,
            metalness: 0.9,
            roughness: 0.15
        });
        const wireRadius = 0.012;

        // Create paper clip shape using curves
        const clipPoints = [
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0.15, 0, 0),
            new THREE.Vector3(0.2, 0.05, 0),
            new THREE.Vector3(0.2, 0.15, 0),
            new THREE.Vector3(0.15, 0.2, 0),
            new THREE.Vector3(0.05, 0.2, 0),
            new THREE.Vector3(0, 0.15, 0),
            new THREE.Vector3(0, 0.08, 0),
            new THREE.Vector3(0.05, 0.05, 0),
            new THREE.Vector3(0.12, 0.05, 0),
            new THREE.Vector3(0.15, 0.08, 0),
            new THREE.Vector3(0.15, 0.12, 0)
        ];

        const curve = new THREE.CatmullRomCurve3(clipPoints);
        const tubeGeom = new THREE.TubeGeometry(curve, 32, wireRadius, 8, false);
        const mesh = new THREE.Mesh(tubeGeom, clipMaterial);

        group.add(mesh);
        group.rotation.x = Math.PI / 2;

        return group;
    }

    createStrengthMeter() {
        const meterGroup = new THREE.Group();

        // Meter background
        const bgGeom = new THREE.PlaneGeometry(0.8, 0.4);
        const bgMaterial = new THREE.MeshBasicMaterial({
            color: 0x1a1a2e,
            transparent: true,
            opacity: 0.9
        });
        const bg = new THREE.Mesh(bgGeom, bgMaterial);
        meterGroup.add(bg);

        // Label
        const label = this.createMeterLabel();
        label.position.z = 0.01;
        meterGroup.add(label);

        // Strength bar
        this.strengthBar = new THREE.Mesh(
            new THREE.PlaneGeometry(0.6, 0.1),
            new THREE.MeshBasicMaterial({ color: 0x27ae60 })
        );
        this.strengthBar.position.set(-0.3, -0.08, 0.01);
        this.strengthBar.scale.x = 0;
        meterGroup.add(this.strengthBar);

        // Bar background
        const barBg = new THREE.Mesh(
            new THREE.PlaneGeometry(0.6, 0.1),
            new THREE.MeshBasicMaterial({ color: 0x2c3e50 })
        );
        barBg.position.set(0, -0.08, 0.005);
        meterGroup.add(barBg);

        meterGroup.position.set(-2, 1.8, 0);
        meterGroup.rotation.y = Math.PI / 8;

        this.strengthMeter = meterGroup;
        this.app.sceneManager.add(meterGroup);
    }

    createMeterLabel() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#00d4aa';
        ctx.font = 'bold 24px Inter, Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Magnetic Field Strength', 128, 20);

        ctx.fillStyle = '#a0c4bc';
        ctx.font = '16px Inter, Arial';
        ctx.fillText('B ∝ N × I', 128, 50);

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true
        });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(0.7, 0.2, 1);
        sprite.position.y = 0.08;
        return sprite;
    }

    updateStrengthMeter() {
        if (!this.strengthBar) return;

        const fieldStrength = this.getFieldStrength();
        const normalizedStrength = Math.min(fieldStrength / 100, 1);

        // Animate bar width
        this.strengthBar.scale.x = normalizedStrength;
        this.strengthBar.position.x = -0.3 * (1 - normalizedStrength);

        // Update color based on strength
        if (normalizedStrength < 0.3) {
            this.strengthBar.material.color.setHex(0x27ae60); // Green
        } else if (normalizedStrength < 0.7) {
            this.strengthBar.material.color.setHex(0xf39c12); // Orange
        } else {
            this.strengthBar.material.color.setHex(0xe74c3c); // Red
        }
    }

    createControls() {
        // Power switch control
        const optionsContainer = this.app.optionsContainer;
        if (optionsContainer) {
            // Power switch button
            const powerLabel = document.createElement('div');
            powerLabel.className = 'option-label';
            powerLabel.textContent = 'Power Switch:';
            powerLabel.style.cssText = 'font-size: 0.75rem; color: #a0c4bc; margin-bottom: 0.5rem;';
            optionsContainer.appendChild(powerLabel);

            const powerBtn = document.createElement('button');
            powerBtn.className = 'option-btn active';
            powerBtn.textContent = this.isSwitchOn ? 'ON ⚡' : 'OFF';
            powerBtn.style.cssText = `
                padding: 0.5rem 1rem;
                background: ${this.isSwitchOn ? 'var(--primary)' : 'var(--surface-light)'};
                border: 1px solid ${this.isSwitchOn ? 'var(--secondary)' : 'var(--border)'};
                border-radius: 6px;
                color: var(--text-primary);
                font-size: 0.85rem;
                cursor: pointer;
                transition: all 0.2s ease;
                width: 100%;
                margin-bottom: 1rem;
            `;

            powerBtn.addEventListener('click', () => {
                this.isSwitchOn = !this.isSwitchOn;
                powerBtn.textContent = this.isSwitchOn ? 'ON ⚡' : 'OFF';
                powerBtn.style.background = this.isSwitchOn ? 'var(--primary)' : 'var(--surface-light)';
                powerBtn.style.borderColor = this.isSwitchOn ? 'var(--secondary)' : 'var(--border)';
                this.updateSwitchVisuals();
                this.updateFieldVisualization();
            });

            optionsContainer.appendChild(powerBtn);

            // Core material selector
            const coreLabel = document.createElement('div');
            coreLabel.className = 'option-label';
            coreLabel.textContent = 'Core Material:';
            coreLabel.style.cssText = 'font-size: 0.75rem; color: #a0c4bc; margin-bottom: 0.5rem;';
            optionsContainer.appendChild(coreLabel);

            const coreButtonGroup = document.createElement('div');
            coreButtonGroup.style.cssText = 'display: flex; gap: 0.5rem; margin-bottom: 1rem;';

            ['Air', 'Iron', 'Steel'].forEach(material => {
                const btn = document.createElement('button');
                btn.className = 'option-btn' + (this.coreMaterial === material.toLowerCase() ? ' active' : '');
                btn.textContent = material;
                btn.style.cssText = `
                    padding: 0.4rem 0.6rem;
                    background: ${this.coreMaterial === material.toLowerCase() ? 'var(--primary)' : 'var(--surface-light)'};
                    border: 1px solid ${this.coreMaterial === material.toLowerCase() ? 'var(--secondary)' : 'var(--border)'};
                    border-radius: 6px;
                    color: var(--text-primary);
                    font-size: 0.75rem;
                    cursor: pointer;
                    flex: 1;
                `;

                btn.addEventListener('click', () => {
                    this.coreMaterial = material.toLowerCase();
                    coreButtonGroup.querySelectorAll('.option-btn').forEach(b => {
                        b.style.background = 'var(--surface-light)';
                        b.style.borderColor = 'var(--border)';
                        b.classList.remove('active');
                    });
                    btn.style.background = 'var(--primary)';
                    btn.style.borderColor = 'var(--secondary)';
                    btn.classList.add('active');
                    this.updateFieldVisualization();
                    this.updateCoreVisual();
                });

                coreButtonGroup.appendChild(btn);
            });

            optionsContainer.appendChild(coreButtonGroup);
        }

        // Coil turns slider
        this.app.sliders.createSlider({
            id: 'coil-turns',
            label: 'Coil Turns (N)',
            min: 5,
            max: 25,
            value: this.coilTurns,
            step: 1,
            unit: '',
            onChange: (val) => {
                this.coilTurns = val;
                this.updateCoilGeometry();
                this.updateFieldVisualization();
            }
        });

        // Voltage slider
        this.app.sliders.createSlider({
            id: 'battery-voltage',
            label: 'Battery Voltage (V)',
            min: 1,
            max: 12,
            value: this.voltage,
            step: 0.5,
            unit: ' V',
            onChange: (val) => {
                this.voltage = val;
                this.updateVoltageLabel();
                this.updateFieldVisualization();
            }
        });
    }

    createTooltips() {
        // Educational tooltips as 3D sprites
        const tooltips = [
            { text: 'Battery provides\nelectrical energy', pos: new THREE.Vector3(-2.5, 1.2, 1.5), color: 0xf39c12 },
            { text: 'Wire coil creates\nmagnetic field', pos: new THREE.Vector3(0, 1.3, 0.8), color: 0x3498db },
            { text: 'Iron core amplifies\nmagnetic strength', pos: new THREE.Vector3(0, -0.3, 0.5), color: 0xe74c3c },
            { text: 'More turns = \nStronger field!', pos: new THREE.Vector3(1.5, 1.5, 0), color: 0x27ae60 }
        ];

        this.tooltipSprites = [];

        tooltips.forEach(tip => {
            const sprite = this.createTooltipSprite(tip.text, tip.color);
            sprite.position.copy(tip.pos);
            sprite.scale.set(0.6, 0.3, 1);
            sprite.visible = false; // Initially hidden, shown on hover or toggle
            this.tooltipSprites.push(sprite);
            this.app.sceneManager.scene.add(sprite);
        });
    }

    createTooltipSprite(text, color) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');

        // Background
        ctx.fillStyle = 'rgba(26, 26, 46, 0.9)';
        ctx.roundRect(0, 0, 256, 128, 10);
        ctx.fill();

        // Border
        ctx.strokeStyle = `#${color.toString(16).padStart(6, '0')}`;
        ctx.lineWidth = 3;
        ctx.roundRect(0, 0, 256, 128, 10);
        ctx.stroke();

        // Text
        ctx.fillStyle = '#ffffff';
        ctx.font = '18px Inter, Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const lines = text.split('\n');
        lines.forEach((line, i) => {
            ctx.fillText(line, 128, 50 + i * 28);
        });

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true
        });
        return new THREE.Sprite(material);
    }

    updateCoreVisual() {
        // Update iron core appearance based on material
        if (!this.ironCore) return;

        const colors = {
            'air': 0x88ccff, // Light blue for air (transparent look)
            'iron': 0x4a4a4a, // Dark gray for iron
            'steel': 0x6a6a6a  // Lighter gray for steel
        };

        this.ironCore.traverse(child => {
            if (child.isMesh && child.material) {
                child.material.color.setHex(colors[this.coreMaterial] || 0x4a4a4a);
                child.material.opacity = this.coreMaterial === 'air' ? 0.3 : 1;
                child.material.transparent = this.coreMaterial === 'air';
            }
        });
    }

    getCurrent() {
        // I = V / R
        return this.isSwitchOn ? this.voltage / this.resistance : 0;
    }

    getFieldStrength() {
        // B ∝ N × I × μ (core material permeability)
        const current = this.getCurrent();
        const multiplier = this.coreMaterialMultipliers[this.coreMaterial] || 1;
        return this.coilTurns * current * multiplier / 10;
    }

    updateFieldVisualization() {
        if (!this.isSwitchOn || this.getCurrent() < 0.1) {
            this.app.fieldVisualizer.clearAll();
            this.updateStrengthMeter();
            return;
        }

        // Generate electromagnet field using solenoid field generator
        const electromagnetData = {
            position: this.ironCore.position.clone(),
            userData: {
                turns: this.coilTurns,
                current: this.getCurrent(),
                radius: this.ironCore.userData.coreRadius + 0.08,
                length: this.coilGroup.userData.coilLength,
                currentDirection: 1
            }
        };

        this.app.fieldVisualizer.generateSolenoidField(electromagnetData);
        this.updateStrengthMeter();
    }

    updateMetalObjects(deltaTime) {
        const fieldStrength = this.getFieldStrength();
        const magnetPosition = this.ironCore.position.clone();
        // Extend attraction point to nail tip
        magnetPosition.x += this.ironCore.userData.coreLength / 2 + 0.15;

        this.metalObjects.forEach(obj => {
            const toMagnet = new THREE.Vector3().subVectors(magnetPosition, obj.position);
            const distance = toMagnet.length();

            // Only attract if switch is on and field is strong enough
            if (this.isSwitchOn && fieldStrength > 1 && distance < 4) {
                // Magnetic force: F ∝ B² / r²
                const force = (fieldStrength * fieldStrength) / (distance * distance + 0.5);
                const clampedForce = Math.min(force, 10);

                // Apply force towards magnet
                toMagnet.normalize();
                obj.userData.velocity.add(toMagnet.multiplyScalar(clampedForce * deltaTime * 0.5));

                // Damping
                obj.userData.velocity.multiplyScalar(0.95);

                // Update position
                obj.position.add(obj.userData.velocity.clone().multiplyScalar(deltaTime));

                // Clamp near magnet (sticking effect)
                if (distance < 0.4) {
                    obj.userData.velocity.multiplyScalar(0.1);
                    obj.userData.isAttracted = true;
                }
            } else {
                // Gravity effect when switch is off
                if (!this.isSwitchOn && obj.userData.isAttracted) {
                    // Object falls
                    obj.userData.velocity.y -= 9.8 * deltaTime * 0.3;
                    obj.userData.velocity.multiplyScalar(0.98);
                    obj.position.add(obj.userData.velocity.clone().multiplyScalar(deltaTime));

                    // Ground collision
                    if (obj.position.y < 0.1) {
                        obj.position.y = 0.1;
                        obj.userData.velocity.set(0, 0, 0);
                        obj.userData.isAttracted = false;
                    }
                }
            }
        });
    }

    updateCurrentParticles(deltaTime) {
        if (!this.isSwitchOn || this.getCurrent() < 0.1) {
            this.currentParticles.forEach(p => p.visible = false);
            return;
        }

        const current = this.getCurrent();
        const speed = current * 0.3;

        this.currentParticles.forEach(particle => {
            particle.visible = true;

            // Move along circuit path
            particle.userData.phase += speed * deltaTime;
            if (particle.userData.phase > 1) particle.userData.phase -= 1;

            // Get position on path
            const point = this.circuitPath.getPoint(particle.userData.phase);
            particle.position.copy(point);

            // Fade based on speed
            particle.material.opacity = 0.5 + current * 0.2;
        });
    }

    update(deltaTime) {
        if (!this.isPlaying) return;

        this.animationTime += deltaTime;

        // Update current particles
        this.updateCurrentParticles(deltaTime);

        // Update metal object physics
        this.updateMetalObjects(deltaTime);

        // Animate coil glow when current is flowing
        if (this.isSwitchOn && this.getCurrent() > 0.1) {
            this.animateCoilGlow();
        }
    }

    animateCoilGlow() {
        if (!this.coilGroup) return;

        const glowIntensity = 0.5 + Math.sin(this.animationTime * 4) * 0.2;
        const current = this.getCurrent();

        this.coilGroup.traverse(child => {
            if (child.isMesh && child.material) {
                child.material.emissive = new THREE.Color(0xb87333);
                child.material.emissiveIntensity = glowIntensity * Math.min(current / 5, 1) * 0.3;
            }
        });
    }

    cleanup() {
        // Remove iron core
        if (this.ironCore) {
            this.app.sceneManager.remove(this.ironCore);
            this.ironCore.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
        }

        // Remove coil
        if (this.coilGroup) {
            this.app.sceneManager.remove(this.coilGroup);
            this.coilGroup.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
        }

        // Remove battery
        if (this.battery) {
            this.app.sceneManager.remove(this.battery);
            this.battery.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (child.material.map) child.material.map.dispose();
                    child.material.dispose();
                }
            });
        }

        // Remove circuit wires
        if (this.circuitWires) {
            this.app.sceneManager.remove(this.circuitWires);
            this.circuitWires.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
        }

        // Remove switch
        if (this.switchGroup) {
            this.app.sceneManager.remove(this.switchGroup);
            this.switchGroup.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (child.material.map) child.material.map.dispose();
                    child.material.dispose();
                }
            });
        }

        // Remove metal objects
        this.metalObjects.forEach(obj => {
            this.app.interaction.removeDraggable(obj);
            this.app.sceneManager.remove(obj);
            obj.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
        });
        this.metalObjects = [];

        // Remove current particles
        this.currentParticles.forEach(p => {
            this.app.sceneManager.scene.remove(p);
            if (p.geometry) p.geometry.dispose();
            if (p.material) p.material.dispose();
        });
        this.currentParticles = [];

        // Remove strength meter
        if (this.strengthMeter) {
            this.app.sceneManager.remove(this.strengthMeter);
            this.strengthMeter.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (child.material.map) child.material.map.dispose();
                    child.material.dispose();
                }
            });
        }

        // Remove tooltips
        this.tooltipSprites.forEach(sprite => {
            this.app.sceneManager.scene.remove(sprite);
            sprite.material.map.dispose();
            sprite.material.dispose();
        });
        this.tooltipSprites = [];

        // Clear visualizations
        this.app.fieldVisualizer.clearAll();
        this.app.sliders.clear();

        // Clear options
        if (this.app.optionsContainer) {
            this.app.optionsContainer.innerHTML = '';
        }
    }
}
