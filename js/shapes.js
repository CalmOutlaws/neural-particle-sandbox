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

        } else if (type === 'torus') {
            const u = Math.random() * Math.PI * 2;
            const v = Math.random() * Math.PI * 2;
            const R = 6.5; 
            const r = 2.0; 
            points.push({
                x: (R + r * Math.cos(v)) * Math.cos(u),
                y: (R + r * Math.cos(v)) * Math.sin(u),
                z: r * Math.sin(v)
            });

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

        } else if (type === 'trefoil') {
            const t = (i / count) * Math.PI * 2 * 3; 
            points.push({
                x: (Math.sin(t) + 2 * Math.sin(2 * t)) * 2,
                y: (Math.cos(t) - 2 * Math.cos(2 * t)) * 2,
                z: -Math.sin(3 * t) * 2
            });

        } else if (type === 'pyramid') {
            const h = Math.random() * 8 - 4; 
            const pct = (h + 4) / 8; 
            const baseWidth = (1 - pct) * 6; 
            const edge = i % 4;
            let rx = 0, rz = 0;
            if (edge === 0) { rx = baseWidth; rz = (Math.random() * 2 - 1) * baseWidth; }
            else if (edge === 1) { rx = -baseWidth; rz = (Math.random() * 2 - 1) * baseWidth; }
            else if (edge === 2) { rz = baseWidth; rx = (Math.random() * 2 - 1) * baseWidth; }
            else { rz = -baseWidth; rx = (Math.random() * 2 - 1) * baseWidth; }
            points.push({ x: rx, y: h + 1, z: rz });

        } else if (type === 'infinity') {
            const t = (i / count) * Math.PI * 2;
            const scale = 8 / (3 - Math.cos(2 * t));
            points.push({
                x: scale * Math.cos(t),
                y: scale * Math.sin(2 * t) / 2,
                z: (Math.random() - 0.5) * 1.5
            });

        } else if (type === 'cylinder') {
            const angle = Math.random() * Math.PI * 2;
            const radius = 5;
            points.push({
                x: radius * Math.cos(angle),
                y: Math.random() * 12 - 6,
                z: radius * Math.sin(angle)
            });

        } else if (type === 'hourglass') {
            const y = Math.random() * 10 - 5;
            const radius = 2.5 * Math.sqrt(1 + (y * y) / 9);
            const angle = Math.random() * Math.PI * 2;
            points.push({
                x: radius * Math.cos(angle),
                y: y,
                z: radius * Math.sin(angle)
            });

        } else if (type === 'grid') {
            const size = Math.sqrt(count);
            const col = i % size;
            const row = Math.floor(i / size);
            points.push({
                x: ((col / size) * 14) - 7,
                y: ((row / size) * 14) - 7,
                z: 0
            });

        } else if (type === 'mobius') {
            const u = (i / count) * Math.PI * 2;
            const v = Math.random() * 2 - 1; 
            const rad = 6;
            points.push({
                x: (rad + v * 0.5 * Math.cos(u / 2)) * Math.cos(u),
                y: (rad + v * 0.5 * Math.cos(u / 2)) * Math.sin(u),
                z: v * 0.5 * Math.sin(u / 2)
            });

        } else if (type === 'cube') {
            const side = i % 3;
            let cx = Math.random() * 8 - 4;
            let cy = Math.random() * 8 - 4;
            let cz = Math.random() * 8 - 4;
            if (side === 0) cx = Math.random() > 0.5 ? 4 : -4;
            else if (side === 1) cy = Math.random() > 0.5 ? 4 : -4;
            else cz = Math.random() > 0.5 ? 4 : -4;
            points.push({ x: cx, y: cy, z: cz });

        // --- FIXED SHAPE 11: Fluid Simulation Template ---
        } else if (type === 'fluid') {
            // Fixed to provide a clean static mathematical matrix mesh base.
            // main.js will apply runtime sin/cos calculations on top of this array!
            const gridSize = Math.ceil(Math.sqrt(count));
            const col = i % gridSize;
            const row = Math.floor(i / gridSize);
            const x = (col / gridSize) * 14 - 7;
            const y = (row / gridSize) * 14 - 7;
            points.push({ x: x, y: y, z: 0 });

        // --- FIXED SHAPE 12: Intelligent Swarm ---
        } else if (type === 'swarm') {
            const clusterCount = 5;
            const clusterIndex = Math.floor((i / count) * clusterCount);
            const clusterAngle = (clusterIndex / clusterCount) * Math.PI * 2;
            const clusterRadius = 3 + Math.sin(i * 0.1) * 2;
            const offsetAngle = (i / count) * Math.PI * 10;
            const offsetRadius = 0.5 + Math.sin(i * 0.05) * 1;

            points.push({ 
                x: Math.cos(clusterAngle) * clusterRadius + Math.cos(offsetAngle) * offsetRadius, 
                y: Math.sin(clusterAngle) * clusterRadius + Math.sin(offsetAngle) * offsetRadius, 
                z: Math.sin(i * 0.07) * 2 
            });

        } else {
            points.push({ x: 0, y: 0, z: 0 });
        }
    }

    return points;
}