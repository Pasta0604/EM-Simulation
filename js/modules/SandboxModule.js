/**
 * Sandbox Module - Free experimentation mode
 */
import * as THREE from 'three';

export class SandboxModule {
    constructor(app) {
        this.app = app;
        this.name = 'sandbox';
        this.title = 'Sandbox Mode';
        this.description = 'Drag components from the palette to build your own electromagnetic experiments';

        this.placedObjects = [];
        this.selectedComponent = null;
    }

    init() {
        // Show component palette
        const palette = document.getElementById('component-palette');
        if (palette) {
            palette.classList.remove('hidden');
            this.setupPalette();
        }

        // Setup interaction callbacks
        this.app.interaction.onDrag = (obj) => {
            this.updateVisualization();
        };

        this.app.interaction.onDragEnd = (obj) => {
            this.updateVisualization();
        };

        // Create initial instruction
        this.createInstructions();

        // Setup clear and save buttons
        this.setupButtons();
    }

    setupPalette() {
        const componentItems = document.querySelectorAll('.component-item');

        componentItems.forEach(item => {
            item.addEventListener('click', () => {
                const componentType = item.dataset.component;
                this.addComponent(componentType);
            });

            // Visual feedback
            item.addEventListener('mouseenter', () => {
                item.style.transform = 'translateY(-2px)';
            });

            item.addEventListener('mouseleave', () => {
                item.style.transform = 'translateY(0)';
            });
        });
    }

    addComponent(type) {
        let component;
        const offset = (this.placedObjects.length % 5) * 0.5 - 1;

        switch (type) {
            case 'barMagnet':
                component = this.app.components.createBarMagnet({ strength: 1 });
                component.position.set(offset, 0.3, offset);
                break;

            case 'compass':
                component = this.app.components.createCompass();
                component.position.set(offset + 1, 0.15, offset);
                break;

            case 'solenoid':
                component = this.app.components.createSolenoid({
                    turns: 10,
                    radius: 0.4,
                    length: 1.5
                });
                component.position.set(offset, 0.5, offset - 1);
                component.userData.current = 0.5;
                break;

            case 'wire':
                component = this.app.components.createWire({ length: 2 });
                component.position.set(offset - 1, 0.2, offset);
                break;

            case 'battery':
                component = this.app.components.createBattery();
                component.position.set(offset + 2, 0.25, offset);
                break;

            default:
                return;
        }

        if (component) {
            this.app.sceneManager.add(component);
            this.app.interaction.addDraggable(component);
            this.placedObjects.push(component);

            // Update visualization
            this.updateVisualization();

            // Flash effect to show placement
            this.flashComponent(component);
        }
    }

    flashComponent(component) {
        const originalScale = component.scale.clone();
        component.scale.setScalar(1.2);

        setTimeout(() => {
            component.scale.copy(originalScale);
        }, 150);
    }

    updateVisualization() {
        // Get all magnets and solenoids for field visualization
        const fieldSources = this.placedObjects.filter(
            obj => obj.userData.type === 'barMagnet' || obj.userData.type === 'solenoid'
        );

        // Update field lines
        if (fieldSources.length > 0 && this.app.showFieldLines) {
            this.app.fieldVisualizer.generateFieldLines(fieldSources, {
                numLines: 8,
                steps: 60,
                stepSize: 0.12
            });
        } else {
            this.app.fieldVisualizer.clearFieldLines();
        }

        // Update arrow field
        if (fieldSources.length > 0 && this.app.showArrows) {
            this.app.fieldVisualizer.generateArrowField(fieldSources, {
                gridSize: 3,
                spacing: 0.8,
                yLevel: 0.15
            });
        } else {
            this.app.fieldVisualizer.clearArrows();
        }

        // Update compasses
        this.updateCompasses(fieldSources);
    }

    updateCompasses(fieldSources) {
        const compasses = this.placedObjects.filter(obj => obj.userData.type === 'compass');

        for (const compass of compasses) {
            if (!compass.userData.needle) continue;

            const compassPos = new THREE.Vector3();
            compass.getWorldPosition(compassPos);

            // Calculate total field from all sources
            const totalField = this.app.fieldVisualizer.calculateTotalField(compassPos, fieldSources);

            if (totalField.length() > 0.001) {
                const targetAngle = Math.atan2(totalField.x, totalField.z);
                compass.userData.targetRotation = targetAngle;
            }
        }
    }

    createInstructions() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = 'rgba(20, 50, 45, 0.9)';
        ctx.roundRect(10, 10, 492, 108, 12);
        ctx.fill();

        ctx.fillStyle = '#00d4aa';
        ctx.font = 'bold 24px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🧪 Sandbox Mode', 256, 45);

        ctx.fillStyle = '#a0c4bc';
        ctx.font = '18px Inter, sans-serif';
        ctx.fillText('Click components in the right panel to add them', 256, 80);
        ctx.fillText('Drag to position • Combine to experiment!', 256, 105);

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
        this.instructionSprite = new THREE.Sprite(material);
        this.instructionSprite.position.set(0, 2.5, 0);
        this.instructionSprite.scale.set(4, 1, 1);
        this.app.sceneManager.scene.add(this.instructionSprite);
    }

    setupButtons() {
        const clearBtn = document.getElementById('clear-scene-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearScene());
        }

        const saveBtn = document.getElementById('save-config-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveConfiguration());
        }
    }

    clearScene() {
        // Remove all placed objects
        for (const obj of this.placedObjects) {
            this.app.sceneManager.remove(obj);
            this.app.interaction.removeDraggable(obj);
        }
        this.placedObjects = [];

        // Clear visualizations
        this.app.fieldVisualizer.clearAll();
    }

    saveConfiguration() {
        // Serialize current configuration
        const config = {
            timestamp: new Date().toISOString(),
            objects: this.placedObjects.map(obj => ({
                type: obj.userData.type,
                position: {
                    x: obj.position.x,
                    y: obj.position.y,
                    z: obj.position.z
                },
                rotation: {
                    x: obj.rotation.x,
                    y: obj.rotation.y,
                    z: obj.rotation.z
                },
                userData: {
                    strength: obj.userData.strength,
                    current: obj.userData.current,
                    turns: obj.userData.turns
                }
            }))
        };

        // Save to localStorage
        const configurations = JSON.parse(localStorage.getItem('emlab-configs') || '[]');
        configurations.push(config);
        localStorage.setItem('emlab-configs', JSON.stringify(configurations));

        // Visual feedback
        this.showSaveNotification();
    }

    showSaveNotification() {
        const notification = document.createElement('div');
        notification.textContent = '✓ Configuration saved!';
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(0, 212, 170, 0.9);
            color: #0a1f1c;
            padding: 12px 24px;
            border-radius: 8px;
            font-family: Inter, sans-serif;
            font-weight: 500;
            z-index: 1000;
            animation: fadeInUp 0.3s ease;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    }

    update(deltaTime) {
        // Update compass needles smoothly
        const compasses = this.placedObjects.filter(obj => obj.userData.type === 'compass');

        for (const compass of compasses) {
            const needle = compass.userData.needle;
            if (!needle) continue;

            const current = needle.rotation.y;
            const target = compass.userData.targetRotation || 0;

            let diff = target - current;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;

            needle.rotation.y += diff * Math.min(deltaTime * 5, 1);
        }
    }

    cleanup() {
        // Hide component palette
        const palette = document.getElementById('component-palette');
        if (palette) {
            palette.classList.add('hidden');
        }

        // Remove all placed objects
        for (const obj of this.placedObjects) {
            this.app.sceneManager.remove(obj);
            this.app.interaction.removeDraggable(obj);
        }
        this.placedObjects = [];

        // Remove instruction sprite
        if (this.instructionSprite) {
            this.app.sceneManager.scene.remove(this.instructionSprite);
            this.instructionSprite.material.map.dispose();
            this.instructionSprite.material.dispose();
        }

        // Clear visualizations
        this.app.fieldVisualizer.clearAll();

        // Clear callbacks
        this.app.interaction.onDrag = null;
        this.app.interaction.onDragEnd = null;
    }
}
