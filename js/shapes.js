import * as THREE from 'three';

/**
 * Utility to shuffle arrays for more organic particle transitions
 */
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

/**
 * Main function to generate point data based on shape type
 * @param {string} type - The shape ID from the UI
 * @param {number} N - Number of particles
 */
export function getShapeData(type, N) {
    let positions = [];

    switch (type) {
        case 'heart':
            while (positions.length < N) {
                let x = (Math.random() - 0.5) * 3;
                let y = (Math.random() - 0.5) * 3;
                let z = (Math.random() - 0.5) * 3;
                // Heart Equation: (x^2 + 9/4y^2 + z^2 - 1)^3 - x^2z^3 - 9/80y^2z^3 <= 0
                let eq = Math.pow(x * x + 2.25 * y * y + z * z - 1, 3) - x * x * z * z * z - 0.1125 * y * y * z * z * z;
                if (eq <= 0) {
                    positions.push(new THREE.Vector3(x * 6, z * 6, y * 6));
                }
            }
            break;

        case 'flower':
            for (let i = 0; i < N; i++) {
                let angle = Math.random() * Math.PI * 2;
                let radius = 8 * Math.abs(Math.sin(angle * 2.5));
                let t = Math.random();
                let final_r = radius * Math.sqrt(t);
                let x = final_r * Math.cos(angle);
                let y = final_r * Math.sin(angle);
                let z = (Math.random() - 0.5) * 1.5;
                positions.push(new THREE.Vector3(x, z, -y));
            }
            break;

        case 'saturn':
            for (let i = 0; i < N; i++) {
                if (Math.random() < 0.25) { // Planet Core
                    let u = Math.random() * 2 * Math.PI;
                    let v = Math.acos(2 * Math.random() - 1);
                    let r = 4.5 * Math.cbrt(Math.random());
                    positions.push(new THREE.Vector3(r * Math.sin(v) * Math.cos(u), r * Math.sin(v) * Math.sin(u), r * Math.cos(v)));
                } else { // Rings
                    let angle = Math.random() * Math.PI * 2;
                    let r = 6.0 + Math.random() * 5.0;
                    let x = r * Math.cos(angle);
                    let z = r * Math.sin(angle);
                    let y = (Math.random() - 0.5) * 0.4;
                    let tilt = Math.PI / 8;
                    positions.push(new THREE.Vector3(x, y * Math.cos(tilt) - z * Math.sin(tilt), y * Math.sin(tilt) + z * Math.cos(tilt)));
                }
            }
            break;

        case 'buddha':
            // Layered composition for a silhouette effect
            while (positions.length < N) {
                let u = Math.random() * 2 * Math.PI;
                let v = Math.acos(2 * Math.random() - 1);
                let r = Math.cbrt(Math.random());
                let x, y, z;
                if (positions.length < N * 0.1) { // Head
                    x = r * Math.sin(v) * Math.cos(u) * 1.5;
                    y = (r * Math.sin(v) * Math.sin(u) + 4.5);
                    z = r * Math.cos(v) * 1.5;
                } else if (positions.length < N * 0.6) { // Torso
                    x = r * Math.sin(v) * Math.cos(u) * 3.5;
                    y = (r * Math.sin(v) * Math.sin(u) * 4.5);
                    z = r * Math.cos(v) * 2;
                } else { // Base
                    x = r * Math.sin(v) * Math.cos(u) * 5.5;
                    y = (r * Math.sin(v) * Math.sin(u) * 1.5 - 4);
                    z = r * Math.cos(v) * 4;
                }
                positions.push(new THREE.Vector3(x, y, z));
            }
            break;

        case 'firework':
            const shells = [3, 6, 9, 12];
            for (let i = 0; i < N; i++) {
                let u = Math.random() * 2 * Math.PI;
                let v = Math.acos(2 * Math.random() - 1);
                let baseR = shells[Math.floor(Math.random() * shells.length)];
                let r = baseR + (Math.random() - 0.5) * 0.5;
                positions.push(new THREE.Vector3(r * Math.sin(v) * Math.cos(u), r * Math.sin(v) * Math.sin(u), r * Math.cos(v)));
            }
            break;

        default: // Sphere fallback
            for (let i = 0; i < N; i++) {
                let u = Math.random() * 2 * Math.PI;
                let v = Math.acos(2 * Math.random() - 1);
                let r = 10;
                positions.push(new THREE.Vector3(r * Math.sin(v) * Math.cos(u), r * Math.sin(v) * Math.sin(u), r * Math.cos(v)));
            }
    }

    shuffle(positions);
    return positions;
}