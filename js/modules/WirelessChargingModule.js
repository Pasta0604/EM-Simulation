/**
 * Wireless Charging Simulator - Demonstrate Mutual Inductance
 * Shows how misalignment affects charging efficiency
 */
import * as THREE from 'three';

export class WirelessChargingModule {
    constructor(app) {
        this.app = app;
        this.name = 'wirelessCharging';
        this.title = 'Wireless Charging Simulator';
        this.description = 'Drag the smartphone to see how misalignment affects charging efficiency';

        // Simulation objects
        this.chargingPad = null;
        this.smartphone = null;
        this.magneticField = null;
        this.particles = [];

        // Simulation parameters
        this.maxEfficiency = 100;
        this.efficiency = 100;
        this.k = 2.5; // Gaussian fall-off constant
        this.chargeLevel = 0;
        this.isCharging = true;

        // UI elements
        this.chargingBar = null;
        this.efficiencyLabel = null;
        this.warningLabel = null;
        this.tooltipSprite = null;

        // Animation
        this.particleSpeed = 1;
        this.time = 0;
    }

    init() {
        this.createChargingSetup();
        this.createMagneticFieldCone();
        this.createParticles();
        this.createUIOverlay();
        this.setupSliders();
        this.setupInteraction();
        this.updateEfficiency();
    }

    createChargingSetup() {
        // Create charging pad (Tx Coil)
        const padGroup = new THREE.Group();

        // Base platform
        const baseGeom = new THREE.CylinderGeometry(1.5, 1.5, 0.15, 32);
        const baseMat = new THREE.MeshStandardMaterial({
            color: 0x2d2f5e,
            metalness: 0.6,
            roughness: 0.3
        });
        const base = new THREE.Mesh(baseGeom, baseMat);
        base.position.y = 0.075;
        padGroup.add(base);

        // Coil visualization on pad
        const coilGeom = new THREE.TorusGeometry(0.8, 0.05, 16, 50);
        const coilMat = new THREE.MeshStandardMaterial({
            color: 0xb87333, // Copper color
            metalness: 0.8,
            roughness: 0.2,
            emissive: 0x441100,
            emissiveIntensity: 0.3
        });

        // Multiple coil rings
        for (let i = 0; i < 4; i++) {
            const coil = new THREE.Mesh(
                new THREE.TorusGeometry(0.4 + i * 0.25, 0.03, 16, 50),
                coilMat
            );
            coil.rotation.x = Math.PI / 2;
            coil.position.y = 0.16;
            padGroup.add(coil);
        }

        // LED indicator ring
        const ledRingGeom = new THREE.RingGeometry(1.3, 1.4, 32);
        const ledRingMat = new THREE.MeshBasicMaterial({
            color: 0x00ff88,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8
        });
        this.ledRing = new THREE.Mesh(ledRingGeom, ledRingMat);
        this.ledRing.rotation.x = -Math.PI / 2;
        this.ledRing.position.y = 0.16;
        padGroup.add(this.ledRing);

        this.chargingPad = padGroup;
        this.chargingPad.position.set(0, 0, 0);
        this.app.sceneManager.add(this.chargingPad);

        // Create smartphone (Rx Coil)
        const phoneGroup = new THREE.Group();

        // Phone body
        const phoneGeom = new THREE.BoxGeometry(0.8, 0.05, 1.5);
        const phoneMat = new THREE.MeshStandardMaterial({
            color: 0x1a1a2e,
            metalness: 0.5,
            roughness: 0.4
        });
        const phone = new THREE.Mesh(phoneGeom, phoneMat);
        phoneGroup.add(phone);

        // Phone screen
        const screenGeom = new THREE.PlaneGeometry(0.7, 1.3);
        const screenMat = new THREE.MeshBasicMaterial({
            color: 0x0a0a20,
            transparent: true,
            opacity: 0.9
        });
        const screen = new THREE.Mesh(screenGeom, screenMat);
        screen.rotation.x = -Math.PI / 2;
        screen.position.y = 0.026;
        phoneGroup.add(screen);

        // Battery icon on screen
        this.batteryCanvas = document.createElement('canvas');
        this.batteryCanvas.width = 256;
        this.batteryCanvas.height = 512;
        this.batteryTexture = new THREE.CanvasTexture(this.batteryCanvas);

        const batteryPlane = new THREE.Mesh(
            new THREE.PlaneGeometry(0.5, 0.9),
            new THREE.MeshBasicMaterial({
                map: this.batteryTexture,
                transparent: true
            })
        );
        batteryPlane.rotation.x = -Math.PI / 2;
        batteryPlane.position.y = 0.028;
        phoneGroup.add(batteryPlane);

        // Rx coil underneath phone
        const rxCoilGeom = new THREE.TorusGeometry(0.25, 0.02, 16, 32);
        const rxCoil = new THREE.Mesh(rxCoilGeom, coilMat.clone());
        rxCoil.rotation.x = Math.PI / 2;
        rxCoil.position.y = -0.03;
        phoneGroup.add(rxCoil);

        this.smartphone = phoneGroup;
        this.smartphone.position.set(0, 0.8, 0);
        this.smartphone.userData.isDraggable = true;
        this.app.sceneManager.add(this.smartphone);
        this.app.interaction.addDraggable(this.smartphone);
    }

    createMagneticFieldCone() {
        // Create magnetic field visualization as a cone connecting coils
        const coneGroup = new THREE.Group();

        // Magnetic field cone (transparent gradient)
        const coneGeom = new THREE.CylinderGeometry(0.3, 0.8, 0.6, 32, 8, true);
        const coneMat = new THREE.ShaderMaterial({
            uniforms: {
                color1: { value: new THREE.Color(0x4285F4) },
                color2: { value: new THREE.Color(0x00ff88) },
                opacity: { value: 0.3 },
                time: { value: 0 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 color1;
                uniform vec3 color2;
                uniform float opacity;
                uniform float time;
                varying vec2 vUv;
                void main() {
                    float wave = sin(vUv.y * 10.0 - time * 3.0) * 0.5 + 0.5;
                    vec3 color = mix(color1, color2, vUv.y + wave * 0.2);
                    float alpha = opacity * (1.0 - vUv.y * 0.5);
                    gl_FragColor = vec4(color, alpha * wave);
                }
            `,
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false
        });

        const cone = new THREE.Mesh(coneGeom, coneMat);
        cone.position.y = 0.45;
        coneGroup.add(cone);

        // Magnetic field lines
        this.fieldLines = [];
        const numLines = 8;
        for (let i = 0; i < numLines; i++) {
            const angle = (i / numLines) * Math.PI * 2;
            const curve = new THREE.QuadraticBezierCurve3(
                new THREE.Vector3(Math.cos(angle) * 0.8, 0.15, Math.sin(angle) * 0.8),
                new THREE.Vector3(Math.cos(angle) * 0.5, 0.5, Math.sin(angle) * 0.5),
                new THREE.Vector3(Math.cos(angle) * 0.3, 0.8, Math.sin(angle) * 0.3)
            );

            const lineGeom = new THREE.TubeGeometry(curve, 20, 0.015, 8, false);
            const lineMat = new THREE.MeshBasicMaterial({
                color: 0x4285F4,
                transparent: true,
                opacity: 0.6
            });
            const line = new THREE.Mesh(lineGeom, lineMat);
            this.fieldLines.push(line);
            coneGroup.add(line);
        }

        this.magneticField = coneGroup;
        this.magneticField.userData.cone = cone;
        this.app.sceneManager.add(this.magneticField);
    }

    createParticles() {
        // Create energy particles flowing from pad to phone
        const particleCount = 30;
        const particleGeom = new THREE.SphereGeometry(0.03, 8, 8);
        const particleMat = new THREE.MeshBasicMaterial({
            color: 0x00ff88,
            transparent: true,
            opacity: 0.8
        });

        for (let i = 0; i < particleCount; i++) {
            const particle = new THREE.Mesh(particleGeom, particleMat.clone());
            particle.userData.offset = Math.random() * Math.PI * 2;
            particle.userData.radius = 0.2 + Math.random() * 0.4;
            particle.userData.progress = Math.random();
            particle.userData.speed = 0.5 + Math.random() * 0.5;
            this.particles.push(particle);
            this.app.sceneManager.scene.add(particle);
        }
    }

    createUIOverlay() {
        // Create HUD elements using sprites

        // Charging status bar background
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 100;
        this.hudCanvas = canvas;
        this.hudTexture = new THREE.CanvasTexture(canvas);

        const hudSprite = new THREE.Sprite(
            new THREE.SpriteMaterial({ map: this.hudTexture, transparent: true })
        );
        hudSprite.scale.set(3, 0.75, 1);
        hudSprite.position.set(0, 2.5, 0);
        this.hudSprite = hudSprite;
        this.app.sceneManager.add(hudSprite);

        // Warning label sprite
        const warningCanvas = document.createElement('canvas');
        warningCanvas.width = 512;
        warningCanvas.height = 64;
        this.warningCanvas = warningCanvas;
        this.warningTexture = new THREE.CanvasTexture(warningCanvas);

        const warningSprite = new THREE.Sprite(
            new THREE.SpriteMaterial({ map: this.warningTexture, transparent: true })
        );
        warningSprite.scale.set(3, 0.4, 1);
        warningSprite.position.set(0, 1.8, 0);
        warningSprite.visible = false;
        this.warningSprite = warningSprite;
        this.app.sceneManager.add(warningSprite);

        // Educational tooltip sprite
        this.createTooltipSprite();

        this.updateHUD();
    }

    createTooltipSprite() {
        const canvas = document.createElement('canvas');
        canvas.width = 600;
        canvas.height = 150;
        this.tooltipCanvas = canvas;
        this.tooltipTexture = new THREE.CanvasTexture(canvas);

        const sprite = new THREE.Sprite(
            new THREE.SpriteMaterial({ map: this.tooltipTexture, transparent: true })
        );
        sprite.scale.set(4, 1, 1);
        sprite.position.set(0, -0.8, 0);
        sprite.visible = false;
        this.tooltipSprite = sprite;
        this.app.sceneManager.add(sprite);
    }

    updateHUD() {
        const ctx = this.hudCanvas.getContext('2d');
        ctx.clearRect(0, 0, 400, 100);

        // Background
        ctx.fillStyle = 'rgba(26, 27, 61, 0.9)';
        ctx.roundRect(10, 10, 380, 80, 10);
        ctx.fill();

        // Border
        ctx.strokeStyle = this.getEfficiencyColor();
        ctx.lineWidth = 2;
        ctx.roundRect(10, 10, 380, 80, 10);
        ctx.stroke();

        // Label
        ctx.fillStyle = '#e8f4ff';
        ctx.font = 'bold 16px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('Charging Efficiency', 25, 35);

        // Efficiency value
        ctx.fillStyle = this.getEfficiencyColor();
        ctx.font = 'bold 24px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`${Math.round(this.efficiency)}%`, 375, 37);

        // Progress bar background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.roundRect(25, 50, 350, 25, 5);
        ctx.fill();

        // Progress bar fill
        const gradient = ctx.createLinearGradient(25, 0, 375, 0);
        if (this.efficiency > 70) {
            gradient.addColorStop(0, '#00ff88');
            gradient.addColorStop(1, '#4285F4');
        } else if (this.efficiency > 30) {
            gradient.addColorStop(0, '#ffcc00');
            gradient.addColorStop(1, '#ff8800');
        } else {
            gradient.addColorStop(0, '#ff4444');
            gradient.addColorStop(1, '#cc0000');
        }
        ctx.fillStyle = gradient;
        ctx.roundRect(25, 50, 350 * (this.efficiency / 100), 25, 5);
        ctx.fill();

        this.hudTexture.needsUpdate = true;

        // Update battery display
        this.updateBatteryDisplay();

        // Update warning
        this.updateWarning();

        // Update LED ring color
        if (this.ledRing) {
            this.ledRing.material.color.setHex(
                this.efficiency > 70 ? 0x00ff88 :
                    this.efficiency > 30 ? 0xffcc00 : 0xff4444
            );
            this.ledRing.material.opacity = this.efficiency > 5 ? 0.8 : 0.2;
        }
    }

    updateBatteryDisplay() {
        const ctx = this.batteryCanvas.getContext('2d');
        ctx.clearRect(0, 0, 256, 512);

        // Battery outline
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.strokeRect(60, 100, 136, 280);

        // Battery terminal
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(98, 80, 60, 20);

        // Battery fill level (based on charge + efficiency visualization)
        const fillHeight = 260 * (this.chargeLevel / 100);
        const gradient = ctx.createLinearGradient(0, 380 - fillHeight, 0, 380);

        if (this.efficiency > 70) {
            gradient.addColorStop(0, '#00ff88');
            gradient.addColorStop(1, '#00cc66');
        } else if (this.efficiency > 30) {
            gradient.addColorStop(0, '#ffcc00');
            gradient.addColorStop(1, '#ff8800');
        } else {
            gradient.addColorStop(0, '#ff4444');
            gradient.addColorStop(1, '#cc0000');
        }

        ctx.fillStyle = gradient;
        ctx.fillRect(68, 380 - fillHeight, 120, fillHeight);

        // Charging bolt icon if charging
        if (this.efficiency > 5) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.beginPath();
            ctx.moveTo(138, 180);
            ctx.lineTo(108, 250);
            ctx.lineTo(128, 250);
            ctx.lineTo(118, 320);
            ctx.lineTo(158, 230);
            ctx.lineTo(138, 230);
            ctx.closePath();
            ctx.fill();
        }

        // Charge percentage
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 32px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.round(this.chargeLevel)}%`, 128, 440);

        this.batteryTexture.needsUpdate = true;
    }

    updateWarning() {
        if (this.efficiency < 20) {
            this.warningSprite.visible = true;

            const ctx = this.warningCanvas.getContext('2d');
            ctx.clearRect(0, 0, 512, 64);

            // Warning background
            ctx.fillStyle = 'rgba(255, 68, 68, 0.9)';
            ctx.roundRect(10, 10, 492, 44, 8);
            ctx.fill();

            // Warning text
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 18px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('⚠️ Misaligned - Mutual Inductance Low', 256, 38);

            this.warningTexture.needsUpdate = true;

            // Show educational tooltip
            this.showTooltip('Magnetic flux linkage reduced due to misalignment.\nThe induced EMF decreases as coils move apart.');
        } else {
            this.warningSprite.visible = false;
            this.tooltipSprite.visible = false;
        }
    }

    showTooltip(text) {
        this.tooltipSprite.visible = true;

        const ctx = this.tooltipCanvas.getContext('2d');
        ctx.clearRect(0, 0, 600, 150);

        // Tooltip background
        ctx.fillStyle = 'rgba(26, 27, 61, 0.95)';
        ctx.roundRect(10, 10, 580, 130, 10);
        ctx.fill();

        // Border
        ctx.strokeStyle = '#4285F4';
        ctx.lineWidth = 2;
        ctx.roundRect(10, 10, 580, 130, 10);
        ctx.stroke();

        // Icon
        ctx.font = '24px sans-serif';
        ctx.fillText('💡', 25, 50);

        // Text
        ctx.fillStyle = '#e8f4ff';
        ctx.font = '16px Inter, sans-serif';
        ctx.textAlign = 'left';

        const lines = text.split('\n');
        lines.forEach((line, i) => {
            ctx.fillText(line, 60, 50 + i * 25);
        });

        // Formula
        ctx.fillStyle = '#00ff88';
        ctx.font = 'italic 14px Inter, sans-serif';
        ctx.fillText('Efficiency = η₀ × e^(-k × d²)', 60, 120);

        this.tooltipTexture.needsUpdate = true;
    }

    getEfficiencyColor() {
        if (this.efficiency > 70) return '#00ff88';
        if (this.efficiency > 30) return '#ffcc00';
        return '#ff4444';
    }

    setupSliders() {
        this.app.sliders.createSlider({
            id: 'max-efficiency',
            label: 'Maximum Efficiency',
            min: 50,
            max: 100,
            value: 100,
            step: 5,
            unit: '%',
            onChange: (val) => {
                this.maxEfficiency = val;
                this.updateEfficiency();
            }
        });

        this.app.sliders.createSlider({
            id: 'coupling-factor',
            label: 'Coupling Factor (k)',
            min: 1,
            max: 5,
            value: 2.5,
            step: 0.5,
            unit: '',
            onChange: (val) => {
                this.k = val;
                this.updateEfficiency();
            }
        });

        this.app.sliders.createSlider({
            id: 'phone-height',
            label: 'Phone Height',
            min: 0.3,
            max: 1.5,
            value: 0.8,
            step: 0.1,
            unit: 'm',
            onChange: (val) => {
                this.smartphone.position.y = val;
                this.updateEfficiency();
            }
        });
    }

    setupInteraction() {
        this.app.interaction.onDrag = () => {
            this.updateEfficiency();
        };

        this.app.interaction.onDragEnd = () => {
            this.updateEfficiency();
        };
    }

    updateEfficiency() {
        // Calculate distance from center in XZ plane
        const dx = this.smartphone.position.x;
        const dz = this.smartphone.position.z;
        const distanceXZ = Math.sqrt(dx * dx + dz * dz);

        // Calculate vertical distance factor
        const heightFactor = Math.max(0, 1 - Math.abs(this.smartphone.position.y - 0.5) * 0.5);

        // Gaussian drop-off for efficiency
        this.efficiency = this.maxEfficiency * Math.exp(-this.k * distanceXZ * distanceXZ) * heightFactor;
        this.efficiency = Math.max(0, Math.min(this.maxEfficiency, this.efficiency));

        // Update particle speed based on efficiency
        this.particleSpeed = this.efficiency / 50;

        // Update charging status
        this.isCharging = this.efficiency > 5;

        // Update magnetic field cone
        this.updateMagneticField();

        // Update HUD
        this.updateHUD();
    }

    updateMagneticField() {
        if (!this.magneticField) return;

        // Scale and opacity based on efficiency
        const scale = 0.5 + (this.efficiency / 100) * 0.5;
        this.magneticField.scale.set(scale, scale, scale);

        // Update cone shader
        const cone = this.magneticField.userData.cone;
        if (cone && cone.material.uniforms) {
            cone.material.uniforms.opacity.value = (this.efficiency / 100) * 0.4;
        }

        // Update field line opacity
        this.fieldLines.forEach(line => {
            line.material.opacity = (this.efficiency / 100) * 0.6;
        });

        // Position cone to connect pad and phone
        const phoneY = this.smartphone.position.y;
        this.magneticField.position.set(
            this.smartphone.position.x * 0.5,
            0,
            this.smartphone.position.z * 0.5
        );
    }

    update(deltaTime) {
        this.time += deltaTime;

        // Update charging level
        if (this.isCharging) {
            this.chargeLevel = Math.min(100, this.chargeLevel + (this.efficiency / 100) * deltaTime * 5);
        }

        // Update magnetic field animation
        const cone = this.magneticField?.userData?.cone;
        if (cone && cone.material.uniforms) {
            cone.material.uniforms.time.value = this.time;
        }

        // Animate particles
        this.particles.forEach(particle => {
            if (this.efficiency > 5) {
                particle.visible = true;
                particle.userData.progress += deltaTime * particle.userData.speed * this.particleSpeed;

                if (particle.userData.progress > 1) {
                    particle.userData.progress = 0;
                }

                const t = particle.userData.progress;
                const angle = particle.userData.offset + this.time * 2;
                const radius = particle.userData.radius * (1 - t * 0.5);

                // Spiral path from pad to phone
                particle.position.set(
                    Math.cos(angle) * radius + this.smartphone.position.x * t,
                    0.15 + t * (this.smartphone.position.y - 0.15),
                    Math.sin(angle) * radius + this.smartphone.position.z * t
                );

                // Fade based on efficiency and progress
                particle.material.opacity = (1 - Math.abs(t - 0.5) * 2) * (this.efficiency / 100);
            } else {
                particle.visible = false;
            }
        });

        // Pulse LED ring
        if (this.ledRing && this.isCharging) {
            const pulse = Math.sin(this.time * 3) * 0.2 + 0.8;
            this.ledRing.material.opacity = pulse * (this.efficiency / 100);
        }

        // Update HUD periodically
        if (Math.floor(this.time * 10) % 5 === 0) {
            this.updateHUD();
        }
    }

    cleanup() {
        // Remove charging pad
        if (this.chargingPad) {
            this.app.sceneManager.remove(this.chargingPad);
        }

        // Remove smartphone
        if (this.smartphone) {
            this.app.sceneManager.remove(this.smartphone);
            this.app.interaction.removeDraggable(this.smartphone);
        }

        // Remove magnetic field
        if (this.magneticField) {
            this.app.sceneManager.remove(this.magneticField);
        }

        // Remove particles
        this.particles.forEach(particle => {
            this.app.sceneManager.scene.remove(particle);
        });
        this.particles = [];

        // Remove HUD elements
        if (this.hudSprite) this.app.sceneManager.remove(this.hudSprite);
        if (this.warningSprite) this.app.sceneManager.remove(this.warningSprite);
        if (this.tooltipSprite) this.app.sceneManager.remove(this.tooltipSprite);

        // Clear sliders
        this.app.sliders.clear();

        // Clear callbacks
        this.app.interaction.onDrag = null;
        this.app.interaction.onDragEnd = null;
    }
}
