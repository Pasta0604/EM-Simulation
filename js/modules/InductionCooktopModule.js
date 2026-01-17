/**
 * Induction Cooktop Simulator - Demonstrate Eddy Currents
 * Visualize invisible Eddy Currents creating heat
 */
import * as THREE from 'three';

export class InductionCooktopModule {
    constructor(app) {
        this.app = app;
        this.name = 'inductionCooktop';
        this.title = 'Induction Cooktop Simulator';
        this.description = 'Adjust frequency and field strength to see how eddy currents generate heat';

        // Simulation objects
        this.cooktop = null;
        this.pan = null;
        this.panMesh = null;
        this.coil = null;
        this.eddyCurrents = [];

        // Simulation parameters
        this.frequency = 25000; // Hz (25 kHz typical for induction)
        this.fieldStrength = 0.5; // Normalized 0-1
        this.temperature = 20; // Starting room temperature °C
        this.maxTemperature = 400; // Max temperature °C
        this.ghostViewEnabled = false;

        // Heat calculation constants
        this.heatRate = 0;
        this.time = 0;

        // Eddy current visualization
        this.eddyLines = [];
        this.eddyParticles = [];
    }

    init() {
        this.createCooktop();
        this.createPan();
        this.createCoil();
        this.createEddyCurrents();
        this.createHUD();
        this.setupSliders();
        this.setupOptions();
        this.calculateHeat();
    }

    createCooktop() {
        const cooktopGroup = new THREE.Group();

        // Ceramic glass surface
        const glassGeom = new THREE.BoxGeometry(3, 0.1, 3);
        const glassMat = new THREE.MeshPhysicalMaterial({
            color: 0x1a1a2e,
            metalness: 0.1,
            roughness: 0.1,
            transmission: 0.3,
            thickness: 0.1,
            clearcoat: 1,
            clearcoatRoughness: 0.1
        });
        const glass = new THREE.Mesh(glassGeom, glassMat);
        glass.position.y = 0.05;
        cooktopGroup.add(glass);

        // Heating zone indicator
        const zoneGeom = new THREE.RingGeometry(0.5, 0.8, 32);
        const zoneMat = new THREE.MeshBasicMaterial({
            color: 0xff4400,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        this.heatingZone = new THREE.Mesh(zoneGeom, zoneMat);
        this.heatingZone.rotation.x = -Math.PI / 2;
        this.heatingZone.position.y = 0.11;
        cooktopGroup.add(this.heatingZone);

        // Control panel area
        const panelGeom = new THREE.BoxGeometry(3, 0.05, 0.5);
        const panelMat = new THREE.MeshStandardMaterial({
            color: 0x2d2f5e,
            metalness: 0.5,
            roughness: 0.3
        });
        const panel = new THREE.Mesh(panelGeom, panelMat);
        panel.position.set(0, 0.075, 1.5);
        cooktopGroup.add(panel);

        this.cooktop = cooktopGroup;
        this.cooktop.position.set(0, 0, 0);
        this.app.sceneManager.add(this.cooktop);
    }

    createPan() {
        const panGroup = new THREE.Group();

        // Pan bottom (where eddy currents form)
        const bottomGeom = new THREE.CylinderGeometry(0.7, 0.7, 0.03, 32);
        this.panBottomMat = new THREE.MeshStandardMaterial({
            color: 0x4a4a4a,
            metalness: 0.8,
            roughness: 0.3,
            transparent: true,
            opacity: 1
        });
        const bottom = new THREE.Mesh(bottomGeom, this.panBottomMat);
        bottom.position.y = 0.015;
        panGroup.add(bottom);

        // Pan sides
        const sidesGeom = new THREE.CylinderGeometry(0.72, 0.7, 0.3, 32, 1, true);
        this.panSidesMat = new THREE.MeshStandardMaterial({
            color: 0x5a5a5a,
            metalness: 0.7,
            roughness: 0.4,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 1
        });
        const sides = new THREE.Mesh(sidesGeom, this.panSidesMat);
        sides.position.y = 0.18;
        panGroup.add(sides);

        // Pan rim
        const rimGeom = new THREE.TorusGeometry(0.72, 0.02, 16, 32);
        const rimMat = new THREE.MeshStandardMaterial({
            color: 0x6a6a6a,
            metalness: 0.8,
            roughness: 0.2
        });
        const rim = new THREE.Mesh(rimGeom, rimMat);
        rim.rotation.x = Math.PI / 2;
        rim.position.y = 0.33;
        panGroup.add(rim);

        // Handle
        const handleGeom = new THREE.CapsuleGeometry(0.05, 0.5, 8, 16);
        const handleMat = new THREE.MeshStandardMaterial({
            color: 0x2a2a2a,
            metalness: 0.2,
            roughness: 0.8
        });
        const handle = new THREE.Mesh(handleGeom, handleMat);
        handle.rotation.z = Math.PI / 2;
        handle.position.set(1.1, 0.2, 0);
        panGroup.add(handle);

        this.pan = panGroup;
        this.panMesh = bottom;
        this.pan.position.set(0, 0.12, 0);
        this.app.sceneManager.add(this.pan);
    }

    createCoil() {
        const coilGroup = new THREE.Group();

        // Copper coil underneath cooktop surface
        const coilMat = new THREE.MeshStandardMaterial({
            color: 0xb87333,
            metalness: 0.9,
            roughness: 0.2,
            emissive: 0x441100,
            emissiveIntensity: 0.2
        });

        // Spiral coil
        const coilCurve = [];
        const turns = 8;
        const maxRadius = 0.7;
        const minRadius = 0.15;

        for (let i = 0; i <= turns * 32; i++) {
            const t = i / (turns * 32);
            const angle = t * turns * Math.PI * 2;
            const radius = minRadius + (maxRadius - minRadius) * t;
            coilCurve.push(new THREE.Vector3(
                Math.cos(angle) * radius,
                -0.05,
                Math.sin(angle) * radius
            ));
        }

        const coilPath = new THREE.CatmullRomCurve3(coilCurve);
        const coilGeom = new THREE.TubeGeometry(coilPath, 256, 0.02, 8, false);
        const coil = new THREE.Mesh(coilGeom, coilMat);
        coilGroup.add(coil);

        // Store reference for animation
        this.coilMesh = coil;

        this.coil = coilGroup;
        this.coil.visible = false; // Hidden by default, shown in ghost view
        this.app.sceneManager.add(this.coil);
    }

    createEddyCurrents() {
        // Create eddy current visualization on pan bottom
        const eddyGroup = new THREE.Group();

        // Multiple concentric loops
        const numLoops = 5;
        for (let i = 0; i < numLoops; i++) {
            const radius = 0.15 + i * 0.12;
            const loopGeom = new THREE.TorusGeometry(radius, 0.01, 8, 64);
            const loopMat = new THREE.MeshBasicMaterial({
                color: 0xff6600,
                transparent: true,
                opacity: 0
            });
            const loop = new THREE.Mesh(loopGeom, loopMat);
            loop.rotation.x = Math.PI / 2;
            loop.position.y = 0.13;
            loop.userData.baseRadius = radius;
            loop.userData.index = i;
            this.eddyLines.push(loop);
            eddyGroup.add(loop);
        }

        // Create swirling particles for eddy current flow
        const particleCount = 50;
        for (let i = 0; i < particleCount; i++) {
            const particleGeom = new THREE.SphereGeometry(0.015, 8, 8);
            const particleMat = new THREE.MeshBasicMaterial({
                color: 0xff8800,
                transparent: true,
                opacity: 0
            });
            const particle = new THREE.Mesh(particleGeom, particleMat);

            // Random starting position on one of the loops
            const loopIndex = Math.floor(Math.random() * numLoops);
            const radius = 0.15 + loopIndex * 0.12;
            const angle = Math.random() * Math.PI * 2;

            particle.userData.radius = radius;
            particle.userData.angle = angle;
            particle.userData.loopIndex = loopIndex;
            particle.userData.speed = 1 + Math.random() * 0.5;

            this.eddyParticles.push(particle);
            eddyGroup.add(particle);
        }

        this.eddyCurrentGroup = eddyGroup;
        this.app.sceneManager.add(eddyGroup);
    }

    createHUD() {
        // Temperature gauge
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = 300;
        tempCanvas.height = 400;
        this.tempCanvas = tempCanvas;
        this.tempTexture = new THREE.CanvasTexture(tempCanvas);

        const tempSprite = new THREE.Sprite(
            new THREE.SpriteMaterial({ map: this.tempTexture, transparent: true })
        );
        tempSprite.scale.set(1.5, 2, 1);
        tempSprite.position.set(-2.5, 1.5, 0);
        this.tempSprite = tempSprite;
        this.app.sceneManager.add(tempSprite);

        // Info panel
        const infoCanvas = document.createElement('canvas');
        infoCanvas.width = 400;
        infoCanvas.height = 200;
        this.infoCanvas = infoCanvas;
        this.infoTexture = new THREE.CanvasTexture(infoCanvas);

        const infoSprite = new THREE.Sprite(
            new THREE.SpriteMaterial({ map: this.infoTexture, transparent: true })
        );
        infoSprite.scale.set(2.5, 1.25, 1);
        infoSprite.position.set(0, 2.2, 0);
        this.infoSprite = infoSprite;
        this.app.sceneManager.add(infoSprite);

        // Educational tooltip
        const tooltipCanvas = document.createElement('canvas');
        tooltipCanvas.width = 600;
        tooltipCanvas.height = 120;
        this.tooltipCanvas = tooltipCanvas;
        this.tooltipTexture = new THREE.CanvasTexture(tooltipCanvas);

        const tooltipSprite = new THREE.Sprite(
            new THREE.SpriteMaterial({ map: this.tooltipTexture, transparent: true })
        );
        tooltipSprite.scale.set(4, 0.8, 1);
        tooltipSprite.position.set(0, -1, 0);
        this.tooltipSprite = tooltipSprite;
        this.app.sceneManager.add(tooltipSprite);

        this.updateHUD();
    }

    updateHUD() {
        this.updateTemperatureGauge();
        this.updateInfoPanel();
        this.updateTooltip();
    }

    updateTemperatureGauge() {
        const ctx = this.tempCanvas.getContext('2d');
        ctx.clearRect(0, 0, 300, 400);

        // Background
        ctx.fillStyle = 'rgba(26, 27, 61, 0.95)';
        ctx.roundRect(10, 10, 280, 380, 15);
        ctx.fill();

        // Title
        ctx.fillStyle = '#e8f4ff';
        ctx.font = 'bold 18px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Temperature', 150, 40);

        // Thermometer background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.roundRect(120, 60, 60, 280, 30);
        ctx.fill();

        // Temperature fill
        const tempRatio = Math.min(1, (this.temperature - 20) / (this.maxTemperature - 20));
        const fillHeight = 260 * tempRatio;

        // Color gradient based on temperature
        const gradient = ctx.createLinearGradient(0, 340 - fillHeight, 0, 340);
        if (this.temperature < 100) {
            gradient.addColorStop(0, '#4a4a4a');
            gradient.addColorStop(1, '#666666');
        } else if (this.temperature < 200) {
            gradient.addColorStop(0, '#ff6600');
            gradient.addColorStop(1, '#ff4400');
        } else if (this.temperature < 300) {
            gradient.addColorStop(0, '#ff4400');
            gradient.addColorStop(1, '#ff2200');
        } else {
            gradient.addColorStop(0, '#ff2200');
            gradient.addColorStop(1, '#ff8800');
        }

        ctx.fillStyle = gradient;
        ctx.roundRect(125, 340 - fillHeight, 50, fillHeight + 5, 25);
        ctx.fill();

        // Glow effect for high temperatures
        if (this.temperature > 200) {
            ctx.shadowColor = '#ff4400';
            ctx.shadowBlur = 20;
            ctx.roundRect(125, 340 - fillHeight, 50, fillHeight + 5, 25);
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        // Temperature markers
        ctx.fillStyle = '#a0c8e8';
        ctx.font = '12px Inter, sans-serif';
        ctx.textAlign = 'right';
        const markers = [400, 300, 200, 100, 20];
        markers.forEach((temp, i) => {
            const y = 70 + i * 65;
            ctx.fillText(`${temp}°C`, 110, y + 4);
            ctx.fillRect(115, y, 5, 1);
        });

        // Current temperature value
        ctx.fillStyle = this.getTemperatureColor();
        ctx.font = 'bold 28px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.round(this.temperature)}°C`, 150, 375);

        this.tempTexture.needsUpdate = true;
    }

    updateInfoPanel() {
        const ctx = this.infoCanvas.getContext('2d');
        ctx.clearRect(0, 0, 400, 200);

        // Background
        ctx.fillStyle = 'rgba(26, 27, 61, 0.95)';
        ctx.roundRect(10, 10, 380, 180, 15);
        ctx.fill();

        // Border based on heat level
        ctx.strokeStyle = this.getTemperatureColor();
        ctx.lineWidth = 2;
        ctx.roundRect(10, 10, 380, 180, 15);
        ctx.stroke();

        // Title
        ctx.fillStyle = '#e8f4ff';
        ctx.font = 'bold 20px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Eddy Current Heating', 200, 45);

        // Parameters
        ctx.font = '14px Inter, sans-serif';
        ctx.textAlign = 'left';

        ctx.fillStyle = '#a0c8e8';
        ctx.fillText('AC Frequency:', 30, 80);
        ctx.fillStyle = '#00ff88';
        ctx.fillText(`${(this.frequency / 1000).toFixed(1)} kHz`, 150, 80);

        ctx.fillStyle = '#a0c8e8';
        ctx.fillText('Field Strength:', 30, 105);
        ctx.fillStyle = '#00ff88';
        ctx.fillText(`${(this.fieldStrength * 100).toFixed(0)}%`, 150, 105);

        ctx.fillStyle = '#a0c8e8';
        ctx.fillText('Heat Rate:', 30, 130);
        ctx.fillStyle = this.getTemperatureColor();
        ctx.fillText(`${this.heatRate.toFixed(1)} W/s`, 150, 130);

        // Formula
        ctx.fillStyle = '#4285F4';
        ctx.font = 'italic 14px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Q ∝ f² × B²', 200, 165);

        this.infoTexture.needsUpdate = true;
    }

    updateTooltip() {
        const ctx = this.tooltipCanvas.getContext('2d');
        ctx.clearRect(0, 0, 600, 120);

        // Background
        ctx.fillStyle = 'rgba(26, 27, 61, 0.95)';
        ctx.roundRect(10, 10, 580, 100, 10);
        ctx.fill();

        // Border
        ctx.strokeStyle = '#4285F4';
        ctx.lineWidth = 2;
        ctx.roundRect(10, 10, 580, 100, 10);
        ctx.stroke();

        // Icon
        ctx.font = '20px sans-serif';
        ctx.fillText('💡', 25, 50);

        // Educational text
        ctx.fillStyle = '#e8f4ff';
        ctx.font = '14px Inter, sans-serif';
        ctx.textAlign = 'left';

        let text1, text2;
        if (this.temperature < 50) {
            text1 = 'The AC magnetic field induces circular currents (eddy currents) in the pan.';
            text2 = 'Increase frequency or field strength to generate more heat.';
        } else if (this.temperature < 150) {
            text1 = 'Eddy currents encounter resistance in the metal, converting energy to heat.';
            text2 = 'Higher frequency = faster changing field = stronger induced currents.';
        } else if (this.temperature < 300) {
            text1 = 'The pan is heating up! Heat generation follows Q ∝ f² × B².';
            text2 = 'This is why only ferromagnetic pans work with induction cooktops.';
        } else {
            text1 = '⚠️ High temperature! The pan is glowing from intense eddy current heating.';
            text2 = 'In reality, safety limits would prevent such extreme temperatures.';
        }

        ctx.fillText(text1, 55, 45);
        ctx.fillStyle = '#a0c8e8';
        ctx.fillText(text2, 55, 75);

        this.tooltipTexture.needsUpdate = true;
    }

    getTemperatureColor() {
        if (this.temperature < 100) return '#4a4a4a';
        if (this.temperature < 200) return '#ff6600';
        if (this.temperature < 300) return '#ff4400';
        return '#ff8800';
    }

    setupSliders() {
        this.app.sliders.createSlider({
            id: 'ac-frequency',
            label: 'AC Frequency',
            min: 10000,
            max: 50000,
            value: 25000,
            step: 1000,
            unit: 'Hz',
            onChange: (val) => {
                this.frequency = val;
                this.calculateHeat();
            }
        });

        this.app.sliders.createSlider({
            id: 'field-strength',
            label: 'Magnetic Field (B)',
            min: 0,
            max: 1,
            value: 0.5,
            step: 0.05,
            unit: '',
            onChange: (val) => {
                this.fieldStrength = val;
                this.calculateHeat();
            }
        });
    }

    setupOptions() {
        // Ghost view toggle
        const ghostViewGroup = document.createElement('div');
        ghostViewGroup.className = 'toggle-group';

        const toggleLabel = document.createElement('label');
        toggleLabel.className = 'toggle-label';
        toggleLabel.innerHTML = `
            <input type="checkbox" id="ghost-view-toggle">
            <span class="toggle-switch"></span>
            <span>Ghost View (See Coil)</span>
        `;
        ghostViewGroup.appendChild(toggleLabel);

        this.app.optionsContainer.appendChild(ghostViewGroup);

        const checkbox = document.getElementById('ghost-view-toggle');
        checkbox.addEventListener('change', (e) => {
            this.ghostViewEnabled = e.target.checked;
            this.toggleGhostView();
        });

        // Reset temperature button
        const resetBtn = document.createElement('button');
        resetBtn.className = 'option-btn';
        resetBtn.textContent = '🌡️ Reset Temperature';
        resetBtn.addEventListener('click', () => {
            this.temperature = 20;
            this.updateHUD();
            this.updatePanColor();
        });
        this.app.optionsContainer.appendChild(resetBtn);
    }

    toggleGhostView() {
        if (this.ghostViewEnabled) {
            // Make pan transparent
            this.panBottomMat.opacity = 0.3;
            this.panSidesMat.opacity = 0.3;

            // Show coil
            this.coil.visible = true;

            // Make eddy currents more visible
            this.eddyLines.forEach(loop => {
                loop.position.y = 0.05; // Move to show on pan bottom clearly
            });
        } else {
            // Restore pan opacity
            this.panBottomMat.opacity = 1;
            this.panSidesMat.opacity = 1;

            // Hide coil
            this.coil.visible = false;

            // Reset eddy current position
            this.eddyLines.forEach(loop => {
                loop.position.y = 0.13;
            });
        }
    }

    calculateHeat() {
        // Heat rate proportional to f² × B²
        const normalizedFreq = this.frequency / 50000;
        this.heatRate = Math.pow(normalizedFreq, 2) * Math.pow(this.fieldStrength, 2) * 100;

        // Update eddy current visualization intensity
        this.updateEddyCurrentIntensity();

        // Update HUD
        this.updateHUD();

        // Update heating zone glow
        if (this.heatingZone) {
            this.heatingZone.material.opacity = 0.2 + this.heatRate * 0.008;
            this.heatingZone.material.color.setHex(
                this.heatRate > 50 ? 0xff2200 :
                    this.heatRate > 25 ? 0xff4400 : 0xff6600
            );
        }
    }

    updateEddyCurrentIntensity() {
        const intensity = Math.min(1, this.heatRate / 50);

        // Update eddy current loop visibility and color
        this.eddyLines.forEach((loop, i) => {
            loop.material.opacity = intensity * 0.8;

            // Color based on temperature
            if (this.temperature > 200) {
                loop.material.color.setHex(0xff2200);
            } else if (this.temperature > 100) {
                loop.material.color.setHex(0xff6600);
            } else {
                loop.material.color.setHex(0xff8800);
            }
        });

        // Update particles
        this.eddyParticles.forEach(particle => {
            particle.material.opacity = intensity * 0.9;

            if (this.temperature > 200) {
                particle.material.color.setHex(0xff4400);
            } else if (this.temperature > 100) {
                particle.material.color.setHex(0xff6600);
            } else {
                particle.material.color.setHex(0xff8800);
            }
        });
    }

    updatePanColor() {
        // Update pan color based on temperature
        const tempRatio = (this.temperature - 20) / (this.maxTemperature - 20);

        let color;
        if (this.temperature < 100) {
            // Grey (cold)
            color = new THREE.Color(0x4a4a4a);
        } else if (this.temperature < 200) {
            // Transitioning to red
            color = new THREE.Color().lerpColors(
                new THREE.Color(0x4a4a4a),
                new THREE.Color(0x8b0000),
                (this.temperature - 100) / 100
            );
        } else if (this.temperature < 300) {
            // Red (hot)
            color = new THREE.Color().lerpColors(
                new THREE.Color(0x8b0000),
                new THREE.Color(0xff4500),
                (this.temperature - 200) / 100
            );
        } else {
            // Glowing orange (very hot)
            color = new THREE.Color().lerpColors(
                new THREE.Color(0xff4500),
                new THREE.Color(0xff8c00),
                Math.min(1, (this.temperature - 300) / 100)
            );
        }

        this.panBottomMat.color.copy(color);
        this.panBottomMat.emissive.copy(color);
        this.panBottomMat.emissiveIntensity = Math.max(0, tempRatio * 0.5);
    }

    update(deltaTime) {
        this.time += deltaTime;

        // Update temperature based on heat rate
        if (this.heatRate > 0.1) {
            const heatGain = this.heatRate * deltaTime * 0.5;
            const heatLoss = (this.temperature - 20) * 0.01 * deltaTime; // Cooling
            this.temperature = Math.min(this.maxTemperature,
                Math.max(20, this.temperature + heatGain - heatLoss));
        } else {
            // Cooling when not heating
            this.temperature = Math.max(20, this.temperature - deltaTime * 2);
        }

        // Update pan visual based on temperature
        this.updatePanColor();

        // Animate eddy current loops (swirling effect)
        const swirlSpeed = (this.frequency / 25000) * 2; // Higher frequency = faster swirl
        this.eddyLines.forEach((loop, i) => {
            const phaseOffset = i * 0.5;
            loop.rotation.z = this.time * swirlSpeed + phaseOffset;

            // Pulsing effect
            const pulse = Math.sin(this.time * 5 + phaseOffset) * 0.1 + 0.9;
            loop.scale.setScalar(pulse);
        });

        // Animate eddy current particles
        this.eddyParticles.forEach(particle => {
            // Update angle based on frequency
            particle.userData.angle += deltaTime * swirlSpeed * particle.userData.speed;

            const radius = particle.userData.radius;
            const angle = particle.userData.angle;

            particle.position.x = Math.cos(angle) * radius;
            particle.position.z = Math.sin(angle) * radius;
            particle.position.y = this.ghostViewEnabled ? 0.06 : 0.14;

            // Pulsing glow
            const pulse = Math.sin(this.time * 8 + angle) * 0.3 + 0.7;
            particle.scale.setScalar(0.8 + pulse * 0.4);
        });

        // Animate coil emissive when visible
        if (this.coil.visible && this.coilMesh) {
            const pulse = Math.sin(this.time * 10) * 0.5 + 0.5;
            this.coilMesh.material.emissiveIntensity = 0.2 + pulse * this.fieldStrength * 0.3;
        }

        // Update HUD periodically
        if (Math.floor(this.time * 4) % 2 === 0) {
            this.updateHUD();
        }

        // Update heating zone pulse
        if (this.heatingZone && this.heatRate > 0.1) {
            const pulse = Math.sin(this.time * 4) * 0.1;
            this.heatingZone.scale.setScalar(1 + pulse);
        }
    }

    cleanup() {
        // Remove cooktop
        if (this.cooktop) {
            this.app.sceneManager.remove(this.cooktop);
        }

        // Remove pan
        if (this.pan) {
            this.app.sceneManager.remove(this.pan);
        }

        // Remove coil
        if (this.coil) {
            this.app.sceneManager.remove(this.coil);
        }

        // Remove eddy currents
        if (this.eddyCurrentGroup) {
            this.app.sceneManager.remove(this.eddyCurrentGroup);
        }
        this.eddyLines = [];
        this.eddyParticles = [];

        // Remove HUD elements
        if (this.tempSprite) this.app.sceneManager.remove(this.tempSprite);
        if (this.infoSprite) this.app.sceneManager.remove(this.infoSprite);
        if (this.tooltipSprite) this.app.sceneManager.remove(this.tooltipSprite);

        // Clear options
        if (this.app.optionsContainer) {
            this.app.optionsContainer.innerHTML = '';
        }

        // Clear sliders
        this.app.sliders.clear();
    }
}
