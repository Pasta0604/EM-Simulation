/**
 * AssemblyManager - Main orchestrator for the 3D assembly puzzle system
 * Manages piece creation, interaction, validation, and UI updates
 */
import * as THREE from 'three';
import { PuzzlePiece } from './PuzzlePiece.js';
import { AssemblyGuide } from './AssemblyGuide.js';
import { ValidationSystem } from './ValidationSystem.js';
import { getAssemblyDefinition, getAvailableComponents } from './AssemblyDefinitions.js';

export class AssemblyManager {
    constructor(sceneManager) {
        this.sceneManager = sceneManager;
        this.scene = sceneManager.scene;
        this.camera = sceneManager.camera;
        this.renderer = sceneManager.renderer;

        // Assembly state
        this.currentComponent = null;
        this.pieces = [];
        this.isActive = false;
        this.isComplete = false;
        this.isPaused = false;

        // Stats
        this.startTime = null;
        this.hintsUsed = 0;
        this.incorrectPlacements = 0;

        // Callbacks
        this.onComplete = null;
        this.onProgress = null;
        this.onPiecePlace = null;

        // Systems
        this.guide = new AssemblyGuide(this.scene, this.camera);
        this.validator = new ValidationSystem();

        // Interaction
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.selectedPiece = null;
        this.hoveredPiece = null;
        this.isDragging = false;
        this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        this.dragOffset = new THREE.Vector3();

        // Assembly group to hold all pieces
        this.assemblyGroup = new THREE.Group();
        this.scene.add(this.assemblyGroup);

        // Bind event handlers
        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
        this.onTouchStart = this.onTouchStart.bind(this);
        this.onTouchMove = this.onTouchMove.bind(this);
        this.onTouchEnd = this.onTouchEnd.bind(this);
    }

    /**
     * Start assembly mode for a specific component
     */
    startAssembly(componentType) {
        const definition = getAssemblyDefinition(componentType);
        if (!definition) {
            console.error(`Unknown component type: ${componentType}`);
            return false;
        }

        this.cleanup();

        this.currentComponent = componentType;
        this.isActive = true;
        this.isComplete = false;
        this.startTime = Date.now();
        this.hintsUsed = 0;
        this.incorrectPlacements = 0;

        // Load pieces
        this.loadPieces(definition);

        // Create ghost outline
        this.guide.createGhostOutline(definition);

        // Create workspace grid
        this.guide.createWorkspaceGrid();

        // Setup interaction
        this.setupEventListeners();

        // Set optimal camera position for assembly
        this.setupCamera();

        // Update UI
        this.updateUI();

        return true;
    }

    /**
     * Load pieces from definition
     */
    loadPieces(definition) {
        this.pieces = [];

        definition.pieces.forEach((pieceDef, index) => {
            // Override start position height to match correct height for 2D feel
            const piece = new PuzzlePiece(pieceDef, index);

            // Set initial Y to correct Y so it's on the right "layer"
            piece.mesh.position.y = piece.correctPosition.y;
            // Store this as the effective start Y for return animation
            piece.startPosition.y = piece.correctPosition.y;

            this.pieces.push(piece);
            this.assemblyGroup.add(piece.mesh);
        });
    }

    /**
     * Setup camera for optimal assembly view
     */
    setupCamera() {
        // Position camera for top-down 2D-style view
        this.sceneManager.camera.position.set(0, 6, 0);
        this.sceneManager.camera.lookAt(0, 0, 0);
        this.sceneManager.camera.up.set(0, 0, -1); // Orient so North (Z-) is up
        this.sceneManager.controls.target.set(0, 0, 0);

        // Lock rotation to keep it "2D" until complete
        this.sceneManager.controls.enableRotate = false;
        this.sceneManager.controls.enableZoom = true;
        this.sceneManager.controls.update();
    }

    /**
     * Setup event listeners for interaction
     */
    setupEventListeners() {
        const canvas = this.renderer.domElement;

        canvas.addEventListener('mousedown', this.onMouseDown);
        canvas.addEventListener('mousemove', this.onMouseMove);
        canvas.addEventListener('mouseup', this.onMouseUp);

        // Touch support
        canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
        canvas.addEventListener('touchmove', this.onTouchMove, { passive: false });
        canvas.addEventListener('touchend', this.onTouchEnd);
    }

    /**
     * Remove event listeners
     */
    removeEventListeners() {
        const canvas = this.renderer.domElement;

        canvas.removeEventListener('mousedown', this.onMouseDown);
        canvas.removeEventListener('mousemove', this.onMouseMove);
        canvas.removeEventListener('mouseup', this.onMouseUp);
        canvas.removeEventListener('touchstart', this.onTouchStart);
        canvas.removeEventListener('touchmove', this.onTouchMove);
        canvas.removeEventListener('touchend', this.onTouchEnd);
    }

    /**
     * Update mouse coordinates from event
     */
    updateMouse(event) {
        const canvas = this.renderer.domElement;
        const rect = canvas.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    /**
     * Raycast to find pieces
     */
    raycastPieces() {
        this.raycaster.setFromCamera(this.mouse, this.camera);

        const meshes = this.pieces
            .filter(p => !p.isLocked)
            .map(p => p.mesh);

        const intersects = this.raycaster.intersectObjects(meshes, true);

        if (intersects.length > 0) {
            // Find the piece from the intersected mesh
            let obj = intersects[0].object;
            while (obj && !obj.userData.isPuzzlePiece) {
                obj = obj.parent;
            }
            if (obj && obj.userData.puzzlePiece) {
                return obj.userData.puzzlePiece;
            }
        }

        return null;
    }

    /**
     * Get intersection point with drag plane
     */
    getIntersectionPoint() {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersection = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(this.dragPlane, intersection);
        return intersection;
    }

    /**
     * Mouse down handler
     */
    onMouseDown(event) {
        if (!this.isActive || this.isPaused) return;

        event.preventDefault();
        this.updateMouse(event);

        const piece = this.raycastPieces();

        if (piece && !piece.isLocked && !piece.isAnimating) {
            this.selectedPiece = piece;
            this.isDragging = true;
            piece.setDragging(true);

            // Set drag plane to the EXACT height of the correct position
            // This ensures we drag on the correct "layer"
            this.dragPlane.setComponents(0, -1, 0, piece.correctPosition.y); // Plane y = correct y

            // Calculate local offset from center of piece
            const intersection = this.getIntersectionPoint();
            if (intersection) {
                this.dragOffset.copy(piece.mesh.position).sub(intersection);
                // Zero out Y offset to prevent vertical drift
                this.dragOffset.y = 0;
            }

            // Show placement preview
            this.guide.createPlacementPreview(piece);

            // Disable orbit controls while dragging
            this.sceneManager.controls.enabled = false;
        }
    }

    /**
     * Mouse move handler
     */
    onMouseMove(event) {
        if (!this.isActive || this.isPaused) return;

        this.updateMouse(event);

        if (this.isDragging && this.selectedPiece) {
            // Update piece position on the plane
            const intersection = this.getIntersectionPoint();

            if (intersection) {
                // Only update X and Z, force Y to be correct height
                this.selectedPiece.mesh.position.x = intersection.x + this.dragOffset.x;
                this.selectedPiece.mesh.position.z = intersection.z + this.dragOffset.z;
                this.selectedPiece.mesh.position.y = this.selectedPiece.correctPosition.y; // Enforce height

                // Show proximity feedback
                const proximity = this.selectedPiece.getProximityFeedback();
                this.selectedPiece.showProximityFeedback(proximity);

                // Update connection line
                this.guide.showConnectionLine(this.selectedPiece);
            }
        } else {
            // Hover effect
            const piece = this.raycastPieces();

            if (piece !== this.hoveredPiece) {
                if (this.hoveredPiece) {
                    this.hoveredPiece.setHoverState(false);
                }
                this.hoveredPiece = piece;
                if (piece) {
                    piece.setHoverState(true);
                }
            }
        }
    }

    /**
     * Mouse up handler
     */
    async onMouseUp(event) {
        if (!this.isActive || this.isPaused) return;

        if (this.isDragging && this.selectedPiece) {
            // Check if piece can snap
            if (this.validator.canSnap(this.selectedPiece)) {
                // Snap to correct position
                await this.selectedPiece.snapToPosition();

                // Play success sound (if available)
                this.playSound('snap');

                // Update progress
                this.updateProgress();

                // Callback
                if (this.onPiecePlace) {
                    this.onPiecePlace(this.selectedPiece);
                }

                // Check completion
                this.checkCompletion();
            } else {
                // Shake and return to toolbox if too far
                const distance = this.selectedPiece.mesh.position.distanceTo(
                    this.selectedPiece.correctPosition
                );

                if (distance > this.selectedPiece.snapDistance * 3) {
                    await this.selectedPiece.shakeAnimation();
                    await this.selectedPiece.returnToToolbox();
                    this.incorrectPlacements++;
                    this.playSound('error');
                }
            }

            this.selectedPiece.setDragging(false);
            this.selectedPiece.showProximityFeedback(0);
            this.selectedPiece = null;
            this.isDragging = false;

            // Clear guides
            this.guide.hideConnectionLine();
            this.guide.clearPlacementPreview();

            // Re-enable orbit controls
            this.sceneManager.controls.enabled = true;
        }
    }

    /**
     * Touch handlers (wrapper for mouse handlers)
     */
    onTouchStart(event) {
        if (event.touches.length === 1) {
            event.preventDefault();
            const touch = event.touches[0];
            this.onMouseDown({
                clientX: touch.clientX,
                clientY: touch.clientY,
                preventDefault: () => { }
            });
        }
    }

    onTouchMove(event) {
        if (event.touches.length === 1) {
            event.preventDefault();
            const touch = event.touches[0];
            this.onMouseMove({
                clientX: touch.clientX,
                clientY: touch.clientY
            });
        }
    }

    onTouchEnd(event) {
        this.onMouseUp({});
    }

    /**
     * Show hint for next piece
     */
    showHint() {
        const nextPiece = this.validator.getNextPiece(this.pieces);

        if (nextPiece) {
            this.hintsUsed++;
            this.guide.showHint(nextPiece);
            this.updateUI();

            // Auto-hide hint after 5 seconds
            setTimeout(() => {
                this.guide.hideHint();
            }, 5000);

            return nextPiece.hint;
        }

        return null;
    }

    /**
     * Hide current hint
     */
    hideHint() {
        this.guide.hideHint();
    }

    /**
     * Check if assembly is complete
     */
    checkCompletion() {
        const validation = this.validator.validateAssembly(this.pieces);

        if (validation.isComplete) {
            this.isComplete = true;

            // Unlock camera for 3D view
            this.sceneManager.controls.enableRotate = true;
            // Smoothly move to perspective view (simple set for now)
            this.sceneManager.camera.position.set(3, 3, 4);
            this.sceneManager.camera.lookAt(0, 0, 0);
            this.sceneManager.controls.update();

            // Calculate stats
            const elapsedTime = Math.round((Date.now() - this.startTime) / 1000);
            const stats = {
                component: this.currentComponent,
                time: elapsedTime,
                hintsUsed: this.hintsUsed,
                incorrectPlacements: this.incorrectPlacements,
                stars: this.calculateStars()
            };

            // Callback
            if (this.onComplete) {
                this.onComplete(stats);
            }

            // Play completion sound
            this.playSound('complete');
        }
    }

    /**
     * Calculate star rating (1-3 stars)
     */
    calculateStars() {
        let stars = 3;

        // Reduce stars for hints
        if (this.hintsUsed > 0) stars--;
        if (this.hintsUsed > 2) stars--;

        // Reduce stars for many incorrect placements
        if (this.incorrectPlacements > 3) stars--;

        return Math.max(1, stars);
    }

    /**
     * Update progress display
     */
    updateProgress() {
        const progress = this.validator.getProgress(this.pieces);
        const placed = this.pieces.filter(p => p.isLocked).length;

        if (this.onProgress) {
            this.onProgress({
                progress,
                placed,
                total: this.pieces.length
            });
        }

        this.updateUI();
    }

    /**
     * Update UI elements
     */
    updateUI() {
        // Update progress bar
        const progressFill = document.getElementById('assembly-progress-fill');
        const progressText = document.getElementById('assembly-progress-text');

        if (progressFill && progressText) {
            const progress = this.validator.getProgress(this.pieces);
            const placed = this.pieces.filter(p => p.isLocked).length;

            progressFill.style.width = `${progress}%`;
            progressText.textContent = `${placed}/${this.pieces.length} pieces placed`;
        }

        // Update instruction highlighting
        this.updateInstructionHighlight();
    }

    /**
     * Update instruction list highlighting
     */
    updateInstructionHighlight() {
        const instructionItems = document.querySelectorAll('#assembly-instruction-list li');
        const placedCount = this.pieces.filter(p => p.isLocked).length;

        instructionItems.forEach((item, index) => {
            item.classList.remove('active', 'completed');

            if (index < placedCount) {
                item.classList.add('completed');
            } else if (index === placedCount) {
                item.classList.add('active');
            }
        });
    }

    /**
     * Play sound effect
     */
    playSound(type) {
        // Sound effects can be implemented with Web Audio API
        // For now, just log the action
        console.log(`[Sound] ${type}`);
    }

    /**
     * Reset current assembly
     */
    reset() {
        this.pieces.forEach(piece => piece.reset());
        this.guide.hideHint();
        this.hintsUsed = 0;
        this.incorrectPlacements = 0;
        this.startTime = Date.now();
        this.isComplete = false;
        this.updateUI();
    }

    /**
     * Pause assembly
     */
    pause() {
        this.isPaused = true;
    }

    /**
     * Resume assembly
     */
    resume() {
        this.isPaused = false;
    }

    /**
     * Update loop
     */
    update(deltaTime) {
        if (!this.isActive) return;

        // Update guide animations
        this.guide.update(deltaTime);

        // Update piece animations
        this.pieces.forEach(piece => {
            if (piece.isHighlighted) {
                // Keep highlight pulse going
            }
        });
    }

    /**
     * Get current definition
     */
    getCurrentDefinition() {
        return getAssemblyDefinition(this.currentComponent);
    }

    /**
     * Get elapsed time in seconds
     */
    getElapsedTime() {
        if (!this.startTime) return 0;
        return Math.round((Date.now() - this.startTime) / 1000);
    }

    /**
     * Format time as mm:ss
     */
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * Cleanup assembly mode
     */
    cleanup() {
        this.isActive = false;
        this.removeEventListeners();

        // Dispose pieces
        this.pieces.forEach(piece => {
            this.assemblyGroup.remove(piece.mesh);
            piece.dispose();
        });
        this.pieces = [];

        // Cleanup guide
        this.guide.dispose();
        this.guide = new AssemblyGuide(this.scene, this.camera);

        // Reset state
        this.selectedPiece = null;
        this.hoveredPiece = null;
        this.isDragging = false;
        this.currentComponent = null;
    }

    /**
     * Get available components for selection
     */
    static getAvailableComponents() {
        return getAvailableComponents();
    }
}
