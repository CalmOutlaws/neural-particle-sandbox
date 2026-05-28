/**
 * Holographic Coordinate Matrix Generator - Extended Portfolio Edition
 * Generates algorithmic layout data matching requested vertex allocations dynamically.
 */
export function getShapeData(type, count) {
    const points = [];

    for (let i = 0; i < count; i++) {
        if (type === 'sphere') {
            const u = Math.random();
            const v = Math.random();
            const theta = u * 2.0 * Math.PI;
            const phi = Math.acos(2.0 * v - 1.0);
            const radius = 6; 
            points.push({
                x: radius * Math.sin(phi) * Math.cos(theta),
                y: radius * Math.sin(phi) * Math.sin(theta),
                z: radius * Math.cos(phi)
            });

        } else if (type === 'heart') {
            const t = (i / count) * Math.PI * 2;
            const baseX = 16 * Math.pow(Math.sin(t), 3) * 0.35;
            const baseY = (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * 0.35;
            const baseZ = (Math.random() - 0.5) * 1.5; 
            points.push({ x: baseX, y: baseY, z: baseZ });

        // --- NEW SHAPE 1: Torus (Donut Ring) ---
        } else if (type === 'torus') {
            const u = Math.random() * Math.PI * 2;
            const v = Math.random() * Math.PI * 2;
            const R = 6.5; // Major radius
            const r = 2.0; // Minor radius
            points.push({
                x: (R + r * Math.cos(v)) * Math.cos(u),
                y: (R + r * Math.cos(v)) * Math.sin(u),
                z: r * Math.sin(v)
            });

        // --- NEW SHAPE 2: DNA Double Helix ---
        } else if (type === 'helix') {
            const pct = i / count;
            const turns = 4 * Math.PI * 2;
            const angle = pct * turns;
            const radius = 4;
            const height = 14;
            const isStrandB = i % 2 === 0;
            const strandAngle = angle + (isStrandB ? Math.PI : 0);
            points.push({
                x: radius * Math.cos(strandAngle),
                y: (pct * height) - (height / 2),
                z: radius * Math.sin(strandAngle)
            });

        // --- NEW SHAPE 3: Infinitely Looping Trefoil Knot ---
        } else if (type === 'trefoil') {
            const t = (i / count) * Math.PI * 2 * 3; 
            points.push({
                x: (Math.sin(t) + 2 * Math.sin(2 * t)) * 2,
                y: (Math.cos(t) - 2 * Math.cos(2 * t)) * 2,
                z: -Math.sin(3 * t) * 2
            });

        // --- NEW SHAPE 4: Cyber Pyramid (Square Base) ---
        } else if (type === 'pyramid') {
            const h = Math.random() * 8 - 4; // Height level
            const pct = (h + 4) / 8; // 0 at base, 1 at apex
            const baseWidth = (1 - pct) * 6; // Shrinks to point at top
            const edge = i % 4;
            let rx = 0, rz = 0;
            if (edge === 0) { rx = baseWidth; rz = (Math.random() * 2 - 1) * baseWidth; }
            else if (edge === 1) { rx = -baseWidth; rz = (Math.random() * 2 - 1) * baseWidth; }
            else if (edge === 2) { rz = baseWidth; rx = (Math.random() * 2 - 1) * baseWidth; }
            else { rz = -baseWidth; rx = (Math.random() * 2 - 1) * baseWidth; }
            points.push({ x: rx, y: h + 1, z: rz });

        // --- NEW SHAPE 5: Mathematical Infinity Ribbon (Lemniscate) ---
        } else if (type === 'infinity') {
            const t = (i / count) * Math.PI * 2;
            const scale = 8 / (3 - Math.cos(2 * t));
            points.push({
                x: scale * Math.cos(t),
                y: scale * Math.sin(2 * t) / 2,
                z: (Math.random() - 0.5) * 1.5
            });

        // --- NEW SHAPE 6: Cosmic Cylinder ---
        } else if (type === 'cylinder') {
            const angle = Math.random() * Math.PI * 2;
            const radius = 5;
            points.push({
                x: radius * Math.cos(angle),
                y: Math.random() * 12 - 6,
                z: radius * Math.sin(angle)
            });

        // --- NEW SHAPE 7: Hyperbolic Hourglass (Hyperboloid) ---
        } else if (type === 'hourglass') {
            const y = Math.random() * 10 - 5;
            const radius = 2.5 * Math.sqrt(1 + (y * y) / 9);
            const angle = Math.random() * Math.PI * 2;
            points.push({
                x: radius * Math.cos(angle),
                y: y,
                z: radius * Math.sin(angle)
            });

        // --- NEW SHAPE 8: Flat Data Matrix Mesh Grid ---
        } else if (type === 'grid') {
            const size = Math.sqrt(count);
            const col = i % size;
            const row = Math.floor(i / size);
            points.push({
                x: ((col / size) * 14) - 7,
                y: ((row / size) * 14) - 7,
                z: 0
            });

        // --- NEW SHAPE 9: Mobius Strip Loop ---
        } else if (type === 'mobius') {
            const u = (i / count) * Math.PI * 2;
            const v = Math.random() * 2 - 1; // Width factor
            const rad = 6;
            points.push({
                x: (rad + v * 0.5 * Math.cos(u / 2)) * Math.cos(u),
                y: (rad + v * 0.5 * Math.cos(u / 2)) * Math.sin(u),
                z: v * 0.5 * Math.sin(u / 2)
            });

        // --- NEW SHAPE 10: Cosmic Cube Frame ---
        } else if (type === 'cube') {
            const side = i % 3;
            let cx = Math.random() * 8 - 4;
            let cy = Math.random() * 8 - 4;
            let cz = Math.random() * 8 - 4;
            if (side === 0) cx = Math.random() > 0.5 ? 4 : -4;
            else if (side === 1) cy = Math.random() > 0.5 ? 4 : -4;
            else cz = Math.random() > 0.5 ? 4 : -4;
            points.push({ x: cx, y: cy, z: cz });

        } else {
            points.push({ x: 0, y: 0, z: 0 });
        }
    }

    return points;
}