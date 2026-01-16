/**
 * AssemblyModule - Integration module for the assembly puzzle system
 * Connects the AssemblyManager with the main application
 */
import * as THREE from 'three';
import { AssemblyManager } from '../assembly/AssemblyManager.js';
import { getAssemblyDefinition, getAvailableComponents } from '../assembly/AssemblyDefinitions.js';

export class AssemblyModule {
    constructor(app) {
        this.app = app;
        this.name = 'assembly';
        this.title = 'Component Assembly';
        this.description = 'Learn by building electromagnetic components piece by piece';

        this.assemblyManager = null;
        this.selectedComponent = null;
        this.timerInterval = null;
    }

    init() {
        // Create assembly manager
        this.assemblyManager = new AssemblyManager(this.app.sceneManager);

        // Setup callbacks
        this.assemblyManager.onComplete = (stats) => this.onAssemblyComplete(stats);
        this.assemblyManager.onProgress = (progress) => this.onProgressUpdate(progress);
        this.assemblyManager.onPiecePlace = (piece) => this.onPiecePlace(piece);

        // Show component selection screen
        this.showComponentSelection();
    }

    /**
     * Show component selection UI
     */
    showComponentSelection() {
        const components = getAvailableComponents();

        // Create selection UI in options container
        this.app.optionsContainer.innerHTML = '';

        const selectionDiv = document.createElement('div');
        selectionDiv.className = 'assembly-component-selection';
        selectionDiv.innerHTML = `
            <p class="selection-prompt">Choose a component to build:</p>
            <div class="component-choices">
                ${components.map(c => `
                    <button class="component-choice-btn" data-component="${c.id}">
                        <span class="choice-icon">${this.getComponentIcon(c.id)}</span>
                        <span class="choice-name">${c.name}</span>
                        <span class="choice-difficulty difficulty-${c.difficulty.toLowerCase()}">${c.difficulty}</span>
                        <span class="choice-meta">${c.pieceCount} pieces • ${c.estimatedTime}</span>
                    </button>
                `).join('')}
            </div>
        `;

        this.app.optionsContainer.appendChild(selectionDiv);

        // Add event listeners
        selectionDiv.querySelectorAll('.component-choice-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const componentType = btn.dataset.component;
                this.startComponentAssembly(componentType);
            });
        });

        // Update UI state
        document.getElementById('top-bar').style.display = 'flex';

        // Hide assembly UI if visible
        const assemblyUI = document.getElementById('assembly-ui');
        if (assemblyUI) {
            assemblyUI.classList.add('hidden');
        }
    }

    /**
     * Start assembly for selected component
     */
    startComponentAssembly(componentType) {
        this.selectedComponent = componentType;
        const definition = getAssemblyDefinition(componentType);

        if (!definition) {
            console.error('Invalid component type');
            return;
        }

        // Start the assembly
        this.assemblyManager.startAssembly(componentType);

        // Show assembly UI
        this.showAssemblyUI(definition);

        // Start timer
        this.startTimer();

        // Update header
        document.getElementById('current-module-title').textContent =
            `Building: ${definition.name}`;
        document.getElementById('current-module-desc').textContent =
            'Drag pieces to their correct positions to build the component';

        // Clear options container (hide selection)
        this.app.optionsContainer.innerHTML = '';
    }

    /**
     * Show the assembly mode UI overlay
     */
    showAssemblyUI(definition) {
        let assemblyUI = document.getElementById('assembly-ui');

        if (!assemblyUI) {
            // Create assembly UI if it doesn't exist
            assemblyUI = document.createElement('div');
            assemblyUI.id = 'assembly-ui';
            assemblyUI.innerHTML = this.getAssemblyUIHTML();
            document.getElementById('canvas-container').appendChild(assemblyUI);
            this.setupAssemblyUIListeners();
        }

        // Update content
        document.getElementById('assembly-component-name').textContent = definition.name;
        document.getElementById('assembly-difficulty-badge').textContent = definition.difficulty;
        document.getElementById('assembly-difficulty-badge').className =
            `assembly-difficulty-badge difficulty-${definition.difficulty.toLowerCase()}`;

        // Update instructions
        const instructionList = document.getElementById('assembly-instruction-list');
        instructionList.innerHTML = definition.instructions
            .map((inst, i) => `<li>${inst}</li>`)
            .join('');

        // Update educational note
        document.getElementById('assembly-educational-text').textContent =
            definition.educationalNote;

        // Reset progress
        document.getElementById('assembly-progress-fill').style.width = '0%';
        document.getElementById('assembly-progress-text').textContent =
            `0/${definition.pieces.length} pieces placed`;

        // Show UI
        assemblyUI.classList.remove('hidden');
    }

    /**
     * Get assembly UI HTML template
     */
    getAssemblyUIHTML() {
        return `
            <!-- Top Bar -->
            <div class="assembly-header">
                <div class="assembly-header-left">
                    <h2 id="assembly-component-name">Bar Magnet</h2>
                    <span id="assembly-difficulty-badge" class="assembly-difficulty-badge">Easy</span>
                </div>
                <div class="assembly-header-right">
                    <span id="assembly-timer" class="assembly-timer">0:00</span>
                    <button id="assembly-exit-btn" class="assembly-btn assembly-btn-secondary">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 6L6 18M6 6l12 12"/>
                        </svg>
                        Exit
                    </button>
                </div>
            </div>

            <!-- Progress Bar -->
            <div class="assembly-progress-container">
                <div class="assembly-progress-bar">
                    <div id="assembly-progress-fill" class="assembly-progress-fill"></div>
                </div>
                <span id="assembly-progress-text" class="assembly-progress-text">0/4 pieces placed</span>
            </div>

            <!-- Instructions Panel (Left Side) -->
            <div class="assembly-instructions-panel">
                <h3>📋 Instructions</h3>
                <ol id="assembly-instruction-list" class="assembly-instruction-list">
                    <li class="active">Place the red North pole on the right</li>
                    <li>Place the blue South pole on the left</li>
                </ol>

                <div class="assembly-educational-note">
                    <h4>💡 Did You Know?</h4>
                    <p id="assembly-educational-text">Bar magnets have two poles...</p>
                </div>

                <div class="assembly-action-buttons">
                    <button id="assembly-hint-btn" class="assembly-btn assembly-btn-hint">
                        <span>💡</span>
                        Show Hint
                    </button>
                    <button id="assembly-reset-btn" class="assembly-btn assembly-btn-secondary">
                        <span>🔄</span>
                        Reset Puzzle
                    </button>
                </div>

                <div id="assembly-hints-counter" class="assembly-hints-counter">
                    Hints used: <span id="assembly-hints-count">0</span>
                </div>
            </div>

            <!-- Completion Modal -->
            <div id="assembly-completion-modal" class="assembly-modal hidden">
                <div class="assembly-modal-content">
                    <div class="assembly-success-icon">✓</div>
                    <h2>Excellent Work!</h2>
                    <p>You've successfully assembled the <span id="assembly-completed-component">Bar Magnet</span>!</p>
                    
                    <div id="assembly-stars" class="assembly-stars">
                        ⭐⭐⭐
                    </div>

                    <div class="assembly-completion-stats">
                        <div class="assembly-stat">
                            <span class="assembly-stat-value" id="assembly-completion-time">45s</span>
                            <span class="assembly-stat-label">Time</span>
                        </div>
                        <div class="assembly-stat">
                            <span class="assembly-stat-value" id="assembly-completion-hints">1</span>
                            <span class="assembly-stat-label">Hints Used</span>
                        </div>
                    </div>

                    <p id="assembly-completion-message" class="assembly-completion-message"></p>
                    
                    <div class="assembly-modal-buttons">
                        <button id="assembly-start-simulation-btn" class="assembly-btn assembly-btn-primary large">
                            <span>🚀</span>
                            Start Simulation
                        </button>
                        
                        <button id="assembly-try-another-btn" class="assembly-btn assembly-btn-secondary">
                            Build Another Component
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Setup assembly UI event listeners
     */
    setupAssemblyUIListeners() {
        // Hint button
        document.getElementById('assembly-hint-btn').addEventListener('click', () => {
            const hint = this.assemblyManager.showHint();
            if (hint) {
                document.getElementById('assembly-hints-count').textContent =
                    this.assemblyManager.hintsUsed;
            }
        });

        // Reset button
        document.getElementById('assembly-reset-btn').addEventListener('click', () => {
            this.assemblyManager.reset();
            this.resetTimer();
        });

        // Exit button
        document.getElementById('assembly-exit-btn').addEventListener('click', () => {
            this.exitAssembly();
        });

        // Start simulation button
        document.getElementById('assembly-start-simulation-btn').addEventListener('click', () => {
            this.startSimulationWithComponent();
        });

        // Try another button
        document.getElementById('assembly-try-another-btn').addEventListener('click', () => {
            this.hideCompletionModal();
            this.showComponentSelection();
            this.assemblyManager.cleanup();
        });
    }

    /**
     * Start timer
     */
    startTimer() {
        this.stopTimer();

        const updateTimer = () => {
            if (!this.assemblyManager) return;

            const elapsed = this.assemblyManager.getElapsedTime();
            const timerEl = document.getElementById('assembly-timer');
            if (timerEl) {
                timerEl.textContent = this.assemblyManager.formatTime(elapsed);
            }
        };

        this.timerInterval = setInterval(updateTimer, 1000);
        updateTimer();
    }

    /**
     * Stop timer
     */
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    /**
     * Reset timer
     */
    resetTimer() {
        const timerEl = document.getElementById('assembly-timer');
        if (timerEl) {
            timerEl.textContent = '0:00';
        }
    }

    /**
     * Called when assembly is complete
     */
    onAssemblyComplete(stats) {
        this.stopTimer();

        const definition = getAssemblyDefinition(stats.component);

        // Update modal
        document.getElementById('assembly-completed-component').textContent =
            definition.name;
        document.getElementById('assembly-completion-time').textContent =
            this.assemblyManager.formatTime(stats.time);
        document.getElementById('assembly-completion-hints').textContent =
            stats.hintsUsed;
        document.getElementById('assembly-completion-message').textContent =
            definition.completionMessage;

        // Show stars
        const starsEl = document.getElementById('assembly-stars');
        starsEl.innerHTML = '⭐'.repeat(stats.stars) + '☆'.repeat(3 - stats.stars);

        // Show modal
        this.showCompletionModal();
    }

    /**
     * Called when progress updates
     */
    onProgressUpdate(progress) {
        // Progress is already updated by AssemblyManager
    }

    /**
     * Called when a piece is placed
     */
    onPiecePlace(piece) {
        // Visual feedback already handled by PuzzlePiece
    }

    /**
     * Show completion modal
     */
    showCompletionModal() {
        const modal = document.getElementById('assembly-completion-modal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    }

    /**
     * Hide completion modal
     */
    hideCompletionModal() {
        const modal = document.getElementById('assembly-completion-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    /**
     * Start simulation with the built component
     */
    startSimulationWithComponent() {
        this.hideCompletionModal();

        // Map assembly component to simulation module
        const moduleMap = {
            'magnet': 'barMagnet',
            'solenoid': 'solenoid'
        };

        const targetModule = moduleMap[this.selectedComponent] || 'barMagnet';

        // Hide assembly UI
        const assemblyUI = document.getElementById('assembly-ui');
        if (assemblyUI) {
            assemblyUI.classList.add('hidden');
        }

        // Cleanup assembly manager
        this.assemblyManager.cleanup();
        this.stopTimer();

        // Load the simulation module
        this.app.loadModule(targetModule);

        // Update sidebar active state
        document.querySelectorAll('.module-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.module === targetModule) {
                item.classList.add('active');
            }
        });
    }

    /**
     * Exit assembly mode
     */
    exitAssembly() {
        this.hideCompletionModal();

        const assemblyUI = document.getElementById('assembly-ui');
        if (assemblyUI) {
            assemblyUI.classList.add('hidden');
        }

        this.assemblyManager.cleanup();
        this.stopTimer();
        this.showComponentSelection();
    }

    /**
     * Get icon for component type
     */
    getComponentIcon(componentType) {
        const icons = {
            'magnet': '🧲',
            'solenoid': '🔧'
        };
        return icons[componentType] || '⚡';
    }

    /**
     * Update loop
     */
    update(deltaTime) {
        if (this.assemblyManager && this.assemblyManager.isActive) {
            this.assemblyManager.update(deltaTime);
        }
    }

    /**
     * Cleanup module
     */
    cleanup() {
        this.stopTimer();

        if (this.assemblyManager) {
            this.assemblyManager.cleanup();
        }

        const assemblyUI = document.getElementById('assembly-ui');
        if (assemblyUI) {
            assemblyUI.classList.add('hidden');
        }

        // Clear options container
        if (this.app.optionsContainer) {
            this.app.optionsContainer.innerHTML = '';
        }
    }
}
