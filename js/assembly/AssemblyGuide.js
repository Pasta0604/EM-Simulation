/**
 * AssemblyGuide - Visual hints, instructions, and guidance for assembly puzzles
 */
import * as THREE from 'three';

export class AssemblyGuide {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;

        // Visual elements
        this.ghostOutline = null;
        this.hintArrow = null;
        this.targetIndicator = null;
        this.guideGroup = new THREE.Group();
        this.scene.add(this.guideGroup);

        // State
        this.isShowingHint = false;
        this.currentHintPiece = null;

        // Animation
        this.animationTime = 0;
    }

    /**
     * Create ghost outline showing final assembly
     */
    createGhostOutline(definition) {
        this.clearGhostOutline();

        const { ghostOutline } = definition;
        if (!ghostOutline) return;

        let geometry;

        switch (ghostOutline.geometry) {
            case 'box':
                geometry = new THREE.BoxGeometry(...ghostOutline.size);
                break;
            case 'cylinder':
                geometry = new THREE.CylinderGeometry(
                    ghostOutline.size.radius,
                    ghostOutline.size.radius,
                    ghostOutline.size.height,
                    32
                );
                break;
            case 'sphere':
                geometry = new THREE.SphereGeometry(ghostOutline.size.radius, 16, 16);
                break;
            default:
                geometry = new THREE.BoxGeometry(1, 1, 1);
        }

        const material = new THREE.MeshBasicMaterial({
            color: ghostOutline.material.color || 0x00ffcc,
            wireframe: true,
            transparent: true,
            opacity: ghostOutline.material.opacity || 0.4
        });

        this.ghostOutline = new THREE.Mesh(geometry, material);

        if (ghostOutline.position) {
            this.ghostOutline.position.copy(ghostOutline.position);
        }

        if (ghostOutline.rotation) {
            this.ghostOutline.rotation.copy(ghostOutline.rotation);
        }

        this.guideGroup.add(this.ghostOutline);
    }

    /**
     * Clear ghost outline
     */
    clearGhostOutline() {
        if (this.ghostOutline) {
            this.guideGroup.remove(this.ghostOutline);
            if (this.ghostOutline.geometry) this.ghostOutline.geometry.dispose();
            if (this.ghostOutline.material) this.ghostOutline.material.dispose();
            this.ghostOutline = null;
        }
    }

    /**
     * Show hint arrow pointing to next piece location
     */
    showHint(piece) {
        if (!piece || piece.isLocked) return;

        this.hideHint();
        this.isShowingHint = true;
        this.currentHintPiece = piece;

        // Create arrow pointing to correct position
        this.createHintArrow(piece.correctPosition);

        // Create target indicator at correct position
        this.createTargetIndicator(piece.correctPosition);

        // Highlight the piece
        piece.highlight(0x00ffcc, 1);
    }

    /**
     * Create a 3D arrow for hints
     */
    createHintArrow(targetPosition) {
        const arrowGroup = new THREE.Group();

        // Arrow body (cylinder)
        const bodyGeom = new THREE.CylinderGeometry(0.05, 0.05, 0.5, 8);
        const bodyMat = new THREE.MeshBasicMaterial({
            color: 0x00ffcc,
            transparent: true,
            opacity: 0.8
        });
        const body = new THREE.Mesh(bodyGeom, bodyMat);
        body.position.y = 0.25;
        arrowGroup.add(body);

        // Arrow head (cone)
        const headGeom = new THREE.ConeGeometry(0.1, 0.2, 8);
        const headMat = new THREE.MeshBasicMaterial({
            color: 0x00ffcc,
            transparent: true,
            opacity: 0.9
        });
        const head = new THREE.Mesh(headGeom, headMat);
        head.position.y = 0;
        head.rotation.x = Math.PI;
        arrowGroup.add(head);

        // Position above target
        arrowGroup.position.copy(targetPosition);
        arrowGroup.position.y += 1;

        this.hintArrow = arrowGroup;
        this.guideGroup.add(this.hintArrow);
    }

    /**
     * Create target indicator (pulsing ring)
     */
    createTargetIndicator(position) {
        const indicatorGroup = new THREE.Group();

        // Outer ring
        const ringGeom = new THREE.RingGeometry(0.3, 0.35, 32);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0x00ffcc,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide
        });
        const ring = new THREE.Mesh(ringGeom, ringMat);
        ring.rotation.x = -Math.PI / 2;
        indicatorGroup.add(ring);

        // Inner ring
        const innerRingGeom = new THREE.RingGeometry(0.15, 0.2, 32);
        const innerRingMat = new THREE.MeshBasicMaterial({
            color: 0x00ffcc,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        const innerRing = new THREE.Mesh(innerRingGeom, innerRingMat);
        innerRing.rotation.x = -Math.PI / 2;
        indicatorGroup.add(innerRing);

        indicatorGroup.position.copy(position);

        this.targetIndicator = indicatorGroup;
        this.guideGroup.add(this.targetIndicator);
    }

    /**
     * Hide current hint
     */
    hideHint() {
        this.isShowingHint = false;

        if (this.currentHintPiece) {
            this.currentHintPiece.unhighlight();
            this.currentHintPiece = null;
        }

        if (this.hintArrow) {
            this.guideGroup.remove(this.hintArrow);
            this.hintArrow.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
            this.hintArrow = null;
        }

        if (this.targetIndicator) {
            this.guideGroup.remove(this.targetIndicator);
            this.targetIndicator.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
            this.targetIndicator = null;
        }
    }

    /**
     * Show connection line between piece and target
     */
    showConnectionLine(piece) {
        if (!piece || piece.isLocked) return;

        // Remove existing line
        this.hideConnectionLine();

        const points = [
            piece.mesh.position.clone(),
            piece.correctPosition.clone()
        ];

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineDashedMaterial({
            color: 0x00ffcc,
            dashSize: 0.1,
            gapSize: 0.05,
            transparent: true,
            opacity: 0.5
        });

        this.connectionLine = new THREE.Line(geometry, material);
        this.connectionLine.computeLineDistances();
        this.guideGroup.add(this.connectionLine);
    }

    /**
     * Hide connection line
     */
    hideConnectionLine() {
        if (this.connectionLine) {
            this.guideGroup.remove(this.connectionLine);
            this.connectionLine.geometry.dispose();
            this.connectionLine.material.dispose();
            this.connectionLine = null;
        }
    }

    /**
     * Update animations
     */
    update(deltaTime) {
        this.animationTime += deltaTime;

        // Animate hint arrow (bobbing)
        if (this.hintArrow) {
            this.hintArrow.position.y =
                this.hintArrow.userData.baseY ||
                (this.currentHintPiece ? this.currentHintPiece.correctPosition.y + 1 : 1);
            this.hintArrow.position.y += Math.sin(this.animationTime * 3) * 0.1;

            if (!this.hintArrow.userData.baseY && this.currentHintPiece) {
                this.hintArrow.userData.baseY = this.currentHintPiece.correctPosition.y + 1;
            }
        }

        // Animate target indicator (pulsing and rotating)
        if (this.targetIndicator) {
            this.targetIndicator.rotation.y = this.animationTime * 0.5;

            // Pulse opacity
            const pulse = 0.4 + Math.sin(this.animationTime * 4) * 0.2;
            this.targetIndicator.traverse(child => {
                if (child.material && child.material.opacity !== undefined) {
                    child.material.opacity = pulse + (child.userData.opacityOffset || 0);
                }
            });
        }

        // Update ghost outline animation
        if (this.ghostOutline) {
            const pulse = 0.3 + Math.sin(this.animationTime * 2) * 0.1;
            this.ghostOutline.material.opacity = pulse;
        }
    }

    /**
     * Create workspace grid
     */
    createWorkspaceGrid() {
        // Create a subtle grid on the ground plane
        const gridSize = 6;
        const divisions = 12;

        const gridHelper = new THREE.GridHelper(
            gridSize,
            divisions,
            0x00d4aa,
            0x0d3530
        );
        gridHelper.material.opacity = 0.3;
        gridHelper.material.transparent = true;
        gridHelper.position.y = -0.01;

        this.workspaceGrid = gridHelper;
        this.guideGroup.add(gridHelper);
    }

    /**
     * Clear workspace grid
     */
    clearWorkspaceGrid() {
        if (this.workspaceGrid) {
            this.guideGroup.remove(this.workspaceGrid);
            this.workspaceGrid.dispose();
            this.workspaceGrid = null;
        }
    }

    /**
     * Create piece placement preview
     */
    createPlacementPreview(piece) {
        if (this.placementPreview) {
            this.clearPlacementPreview();
        }

        if (!piece || !piece.mesh.geometry) return;

        const previewMat = new THREE.MeshBasicMaterial({
            color: 0x00ff88,
            transparent: true,
            opacity: 0.3,
            wireframe: true
        });

        this.placementPreview = new THREE.Mesh(
            piece.mesh.geometry.clone(),
            previewMat
        );
        this.placementPreview.position.copy(piece.correctPosition);
        this.placementPreview.rotation.copy(piece.correctRotation);

        this.guideGroup.add(this.placementPreview);
    }

    /**
     * Clear placement preview
     */
    clearPlacementPreview() {
        if (this.placementPreview) {
            this.guideGroup.remove(this.placementPreview);
            this.placementPreview.geometry.dispose();
            this.placementPreview.material.dispose();
            this.placementPreview = null;
        }
    }

    /**
     * Clean up all resources
     */
    dispose() {
        this.hideHint();
        this.hideConnectionLine();
        this.clearGhostOutline();
        this.clearWorkspaceGrid();
        this.clearPlacementPreview();

        this.scene.remove(this.guideGroup);
    }
}
