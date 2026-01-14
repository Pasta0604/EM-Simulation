/**
 * ValidationSystem - Validates assembly correctness and provides feedback
 */
import * as THREE from 'three';

export class ValidationSystem {
    constructor() {
        // Tolerance settings
        this.tolerance = {
            position: 0.1,  // Distance tolerance in world units
            rotation: 0.15   // Rotation tolerance in radians (~8.5 degrees)
        };
    }

    /**
     * Validate a single piece placement
     */
    validatePiece(piece) {
        if (!piece || !piece.mesh) {
            return { valid: false, error: 'invalid_piece' };
        }

        const currentPos = piece.mesh.position;
        const correctPos = piece.correctPosition;
        const positionError = currentPos.distanceTo(correctPos);

        if (positionError > this.tolerance.position) {
            return {
                valid: false,
                error: 'position',
                piece: piece.id,
                distance: positionError,
                message: `${piece.label} is not in the correct position`
            };
        }

        // Check rotation if applicable (not for sprites)
        if (!piece.mesh.isSprite && piece.correctRotation) {
            const currentRot = piece.mesh.rotation;
            const correctRot = piece.correctRotation;

            const rotationError = this.getRotationError(currentRot, correctRot);

            if (rotationError > this.tolerance.rotation) {
                return {
                    valid: false,
                    error: 'rotation',
                    piece: piece.id,
                    angle: rotationError,
                    message: `${piece.label} needs to be rotated correctly`
                };
            }
        }

        return { valid: true, piece: piece.id };
    }

    /**
     * Calculate rotation error between two Euler angles
     */
    getRotationError(current, correct) {
        // Use quaternions for more accurate comparison
        const q1 = new THREE.Quaternion().setFromEuler(current);
        const q2 = new THREE.Quaternion().setFromEuler(correct);

        // The angle between two quaternions
        return q1.angleTo(q2);
    }

    /**
     * Validate entire assembly
     */
    validateAssembly(pieces, definition) {
        const results = {
            valid: true,
            completed: 0,
            total: pieces.length,
            errors: [],
            missing: [],
            placed: []
        };

        // Check each piece
        for (const piece of pieces) {
            if (piece.isLocked && piece.isCorrect) {
                results.completed++;
                results.placed.push(piece.id);
            } else if (!piece.isPlaced) {
                results.valid = false;
                results.missing.push({
                    id: piece.id,
                    label: piece.label
                });
            } else {
                const validation = this.validatePiece(piece);
                if (!validation.valid) {
                    results.valid = false;
                    results.errors.push(validation);
                }
            }
        }

        // Check if all pieces are placed correctly
        results.isComplete = results.completed === results.total;

        return results;
    }

    /**
     * Get progress percentage
     */
    getProgress(pieces) {
        if (!pieces || pieces.length === 0) return 0;

        const correct = pieces.filter(p => p.isLocked && p.isCorrect).length;
        return Math.round((correct / pieces.length) * 100);
    }

    /**
     * Get next piece to place based on order
     */
    getNextPiece(pieces) {
        // Sort by order and find first non-placed piece
        const sorted = [...pieces].sort((a, b) => a.order - b.order);
        return sorted.find(p => !p.isLocked);
    }

    /**
     * Provide detailed feedback for current state
     */
    provideFeedback(validationResult, pieces) {
        const feedback = {
            type: 'info',
            title: '',
            message: '',
            suggestions: []
        };

        if (validationResult.isComplete) {
            feedback.type = 'success';
            feedback.title = 'Assembly Complete!';
            feedback.message = 'All pieces are correctly placed.';
            return feedback;
        }

        const progress = this.getProgress(pieces);

        if (progress === 0) {
            feedback.type = 'info';
            feedback.title = 'Get Started';
            feedback.message = 'Drag pieces from the workspace to build the component.';
            feedback.suggestions = ['Start with piece #1'];
        } else if (progress < 50) {
            feedback.type = 'info';
            feedback.title = 'Keep Going!';
            feedback.message = `${validationResult.completed} of ${validationResult.total} pieces placed.`;

            const nextPiece = this.getNextPiece(pieces);
            if (nextPiece) {
                feedback.suggestions.push(`Next: ${nextPiece.label}`);
            }
        } else if (progress < 100) {
            feedback.type = 'info';
            feedback.title = 'Almost There!';
            feedback.message = `${validationResult.total - validationResult.completed} pieces remaining.`;

            if (validationResult.missing.length > 0) {
                feedback.suggestions = validationResult.missing.map(m => `Place: ${m.label}`);
            }
        }

        // Add specific error feedback
        if (validationResult.errors.length > 0) {
            const error = validationResult.errors[0];
            feedback.type = 'warning';
            feedback.title = 'Adjustment Needed';
            feedback.message = error.message;
        }

        return feedback;
    }

    /**
     * Check if a piece can be snapped to correct position
     */
    canSnap(piece) {
        if (!piece || piece.isLocked) return false;

        const distance = piece.mesh.position.distanceTo(piece.correctPosition);
        return distance <= piece.snapDistance;
    }

    /**
     * Set tolerance levels
     */
    setTolerance(position, rotation) {
        if (position !== undefined) this.tolerance.position = position;
        if (rotation !== undefined) this.tolerance.rotation = rotation;
    }

    /**
     * Adjust difficulty by changing tolerances
     */
    setDifficulty(level) {
        switch (level) {
            case 'easy':
                this.tolerance.position = 0.2;
                this.tolerance.rotation = 0.3;
                break;
            case 'medium':
                this.tolerance.position = 0.1;
                this.tolerance.rotation = 0.15;
                break;
            case 'hard':
                this.tolerance.position = 0.05;
                this.tolerance.rotation = 0.08;
                break;
        }
    }
}
