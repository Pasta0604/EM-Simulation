/**
 * Assembly Definitions - Component puzzle piece specifications
 * Each component defines its pieces, correct positions, and educational content
 */
import * as THREE from 'three';

export const ASSEMBLY_DEFINITIONS = {
    magnet: {
        name: "Bar Magnet",
        difficulty: "Easy",
        estimatedTime: "1-2 min",
        pieces: [
            {
                id: "north_pole",
                label: "North Pole (Red)",
                geometry: { type: "box", params: [1.0, 0.4, 0.5] },
                material: {
                    color: 0xe74c3c,
                    metalness: 0.3,
                    roughness: 0.4,
                    emissive: 0xe74c3c,
                    emissiveIntensity: 0.1
                },
                correctPosition: new THREE.Vector3(0.5, 0, 0),
                correctRotation: new THREE.Euler(0, 0, 0),
                startPosition: new THREE.Vector3(-2, 0.5, 1.5),
                snapDistance: 0.4,
                hint: "The red North pole goes on the right side of the magnet",
                order: 1
            },
            {
                id: "south_pole",
                label: "South Pole (Blue)",
                geometry: { type: "box", params: [1.0, 0.4, 0.5] },
                material: {
                    color: 0x3498db,
                    metalness: 0.3,
                    roughness: 0.4,
                    emissive: 0x3498db,
                    emissiveIntensity: 0.1
                },
                correctPosition: new THREE.Vector3(-0.5, 0, 0),
                correctRotation: new THREE.Euler(0, 0, 0),
                startPosition: new THREE.Vector3(-2, 0.5, -1.5),
                snapDistance: 0.4,
                hint: "The blue South pole connects to the left side",
                order: 2
            },
            {
                id: "north_marker",
                label: "N Label Marker",
                geometry: { type: "sprite", params: { text: "N", color: "#ffffff", size: 0.3 } },
                material: null, // Sprites use sprite material
                correctPosition: new THREE.Vector3(0.5, 0.35, 0),
                correctRotation: new THREE.Euler(0, 0, 0),
                startPosition: new THREE.Vector3(-2.5, 0.5, 0),
                snapDistance: 0.3,
                hint: "Place the 'N' label above the North pole",
                order: 3
            },
            {
                id: "south_marker",
                label: "S Label Marker",
                geometry: { type: "sprite", params: { text: "S", color: "#ffffff", size: 0.3 } },
                material: null,
                correctPosition: new THREE.Vector3(-0.5, 0.35, 0),
                correctRotation: new THREE.Euler(0, 0, 0),
                startPosition: new THREE.Vector3(-3, 0.5, 0),
                snapDistance: 0.3,
                hint: "Place the 'S' label above the South pole",
                order: 4
            }
        ],
        ghostOutline: {
            geometry: "box",
            size: [2, 0.4, 0.5],
            position: new THREE.Vector3(0, 0, 0),
            material: { color: 0x00ffcc, wireframe: true, opacity: 0.4 }
        },
        instructions: [
            "Build a bar magnet by assembling the poles",
            "Connect the red North pole on the right",
            "Connect the blue South pole on the left",
            "Add the N and S labels to identify each pole"
        ],
        educationalNote: "A bar magnet has two poles: North (red) and South (blue). The magnetic field lines flow from North to South outside the magnet. Like poles repel, opposite poles attract!",
        completionMessage: "Excellent! You've built a bar magnet. The North pole (red) points toward Earth's magnetic North, while the South pole (blue) points South."
    },

    // Compass puzzle removed per user request - keeping only bar magnet and solenoid

    solenoid: {
        name: "Solenoid (Electromagnetic Coil)",
        difficulty: "Hard",
        estimatedTime: "3-4 min",
        pieces: [
            {
                id: "core_tube",
                label: "Iron Core Tube",
                geometry: { type: "cylinder", params: [0.15, 0.15, 2, 16] },
                material: {
                    color: 0x4a4a4a,
                    metalness: 0.6,
                    roughness: 0.4
                },
                correctPosition: new THREE.Vector3(0, 0, 0),
                correctRotation: new THREE.Euler(0, 0, Math.PI / 2),
                startPosition: new THREE.Vector3(-2, 0.5, 0),
                snapDistance: 0.4,
                hint: "The iron core goes in the center - it increases magnetic strength",
                order: 1
            },
            {
                id: "coil_section_1",
                label: "Copper Coil Section 1",
                geometry: { type: "torus", params: [0.25, 0.04, 8, 24] },
                material: {
                    color: 0xd4a574,
                    metalness: 0.6,
                    roughness: 0.3,
                    emissive: 0xd4a574,
                    emissiveIntensity: 0.05
                },
                correctPosition: new THREE.Vector3(-0.6, 0, 0),
                correctRotation: new THREE.Euler(0, Math.PI / 2, 0),
                startPosition: new THREE.Vector3(-2.5, 0.5, 1),
                snapDistance: 0.35,
                hint: "Wrap the first coil section around the left part of the core",
                order: 2
            },
            {
                id: "coil_section_2",
                label: "Copper Coil Section 2",
                geometry: { type: "torus", params: [0.25, 0.04, 8, 24] },
                material: {
                    color: 0xd4a574,
                    metalness: 0.6,
                    roughness: 0.3,
                    emissive: 0xd4a574,
                    emissiveIntensity: 0.05
                },
                correctPosition: new THREE.Vector3(-0.3, 0, 0),
                correctRotation: new THREE.Euler(0, Math.PI / 2, 0),
                startPosition: new THREE.Vector3(-3, 0.5, -0.5),
                snapDistance: 0.35,
                hint: "Add the second coil section next to the first",
                order: 3
            },
            {
                id: "coil_section_3",
                label: "Copper Coil Section 3",
                geometry: { type: "torus", params: [0.25, 0.04, 8, 24] },
                material: {
                    color: 0xd4a574,
                    metalness: 0.6,
                    roughness: 0.3,
                    emissive: 0xd4a574,
                    emissiveIntensity: 0.05
                },
                correctPosition: new THREE.Vector3(0, 0, 0),
                correctRotation: new THREE.Euler(0, Math.PI / 2, 0),
                startPosition: new THREE.Vector3(-2, 0.5, -1.5),
                snapDistance: 0.35,
                hint: "Place the third coil section in the center",
                order: 4
            },
            {
                id: "coil_section_4",
                label: "Copper Coil Section 4",
                geometry: { type: "torus", params: [0.25, 0.04, 8, 24] },
                material: {
                    color: 0xd4a574,
                    metalness: 0.6,
                    roughness: 0.3,
                    emissive: 0xd4a574,
                    emissiveIntensity: 0.05
                },
                correctPosition: new THREE.Vector3(0.3, 0, 0),
                correctRotation: new THREE.Euler(0, Math.PI / 2, 0),
                startPosition: new THREE.Vector3(-3.5, 0.5, 1),
                snapDistance: 0.35,
                hint: "Continue wrapping coils along the core",
                order: 5
            },
            {
                id: "coil_section_5",
                label: "Copper Coil Section 5",
                geometry: { type: "torus", params: [0.25, 0.04, 8, 24] },
                material: {
                    color: 0xd4a574,
                    metalness: 0.6,
                    roughness: 0.3,
                    emissive: 0xd4a574,
                    emissiveIntensity: 0.05
                },
                correctPosition: new THREE.Vector3(0.6, 0, 0),
                correctRotation: new THREE.Euler(0, Math.PI / 2, 0),
                startPosition: new THREE.Vector3(-1.5, 0.5, 1.5),
                snapDistance: 0.35,
                hint: "Add the final coil section on the right side",
                order: 6
            },
            {
                id: "left_terminal",
                label: "Left Wire Terminal",
                geometry: { type: "cylinder", params: [0.06, 0.06, 0.4, 8] },
                material: {
                    color: 0xd4a574,
                    metalness: 0.6,
                    roughness: 0.3
                },
                correctPosition: new THREE.Vector3(-0.8, -0.25, 0),
                correctRotation: new THREE.Euler(0, 0, 0),
                startPosition: new THREE.Vector3(-2, 0.5, 2),
                snapDistance: 0.3,
                hint: "Attach the left terminal for electrical connection",
                order: 7
            },
            {
                id: "right_terminal",
                label: "Right Wire Terminal",
                geometry: { type: "cylinder", params: [0.06, 0.06, 0.4, 8] },
                material: {
                    color: 0xd4a574,
                    metalness: 0.6,
                    roughness: 0.3
                },
                correctPosition: new THREE.Vector3(0.8, -0.25, 0),
                correctRotation: new THREE.Euler(0, 0, 0),
                startPosition: new THREE.Vector3(-3, 0.5, 2),
                snapDistance: 0.3,
                hint: "Attach the right terminal to complete the circuit path",
                order: 8
            }
        ],
        ghostOutline: {
            geometry: "cylinder",
            size: { radius: 0.3, height: 2 },
            position: new THREE.Vector3(0, 0, 0),
            rotation: new THREE.Euler(0, 0, Math.PI / 2),
            material: { color: 0x00ffcc, wireframe: true, opacity: 0.4 }
        },
        instructions: [
            "Build a solenoid - an electromagnet!",
            "Start with the iron core in the center",
            "Wrap the copper coil sections around the core",
            "Space the coils evenly along the length",
            "Attach the wire terminals at both ends",
            "When current flows, it creates a magnetic field!"
        ],
        educationalNote: "A solenoid is an electromagnet made by wrapping wire coils around a core. When electric current flows through the coils, it creates a magnetic field. The more coils and higher current, the stronger the magnet! This is the principle behind electric motors and MRI machines.",
        completionMessage: "Fantastic! You've built a solenoid. When electricity flows through the coils, the iron core becomes magnetized. The direction of the magnetic field follows the Right-Hand Rule!"
    }
};

// Helper function to get component by name
export function getAssemblyDefinition(componentType) {
    return ASSEMBLY_DEFINITIONS[componentType] || null;
}

// Get all available components
export function getAvailableComponents() {
    return Object.keys(ASSEMBLY_DEFINITIONS).map(key => ({
        id: key,
        name: ASSEMBLY_DEFINITIONS[key].name,
        difficulty: ASSEMBLY_DEFINITIONS[key].difficulty,
        estimatedTime: ASSEMBLY_DEFINITIONS[key].estimatedTime,
        pieceCount: ASSEMBLY_DEFINITIONS[key].pieces.length
    }));
}
