/**
 * benchmark.js
 * Handles graphics profiling and performance testing for Dungeon Break.
 * This module is designed to be decoupled from the main game logic,
 * receiving a function to test performance rather than directly manipulating the scene.
 */

export const PROFILES = {
    potato: {
        name: "Potato (Minimum)",
        settings: {
            shadows: false,
            bloom: false,
            tiltShift: false,
            graphics: true,
            lod: { near: 6, far: 12 }, // Very aggressive LOD
            pixelRatio: 0.75
        },
    },
    low: {
        name: "Low",
        settings: {
            shadows: false,
            bloom: false,
            tiltShift: false,
            graphics: true,
            lod: { near: 15, far: 30 },
            pixelRatio: 1.0
        },
    },
    medium: {
        name: "Medium",
        settings: {
            shadows: 'low', // 512px
            bloom: true,
            tiltShift: true,
            graphics: true,
            lod: { near: 25, far: 50 },
            pixelRatio: 1.25
        },
    },
    high: {
        name: "High (Enhanced)",
        settings: {
            shadows: 'medium', // 1024px
            bloom: false,
            tiltShift: true,
            graphics: true,
            lod: { near: 40, far: 80 },
            pixelRatio: 1.5
        },
    },
    ultra: {
        name: "Ultra (Enhanced + FX)",
        settings: {
            shadows: 'high', // 2048px
            bloom: true,
            tiltShift: true,
            graphics: true,
            lod: { near: 60, far: 120 }, // Very far LOD
            pixelRatio: Math.min(window.devicePixelRatio, 2.0) // Capped at 2x
        },
    }
};

/**
 * Runs a multi-stage benchmark to find the best graphics profile.
 * @param {Function} testProfile - An async function that takes a profile name, applies it, and returns the measured FPS.
 * @returns {Promise<{profile: string, fps: number}>} The best profile and its corresponding FPS.
 */
export async function runSmartBenchmark(testProfile) {
    console.log("🚀 Starting Smart Benchmark...");

    const potatoFps = await testProfile('potato');
    console.log(`  -> Potato Profile FPS: ${potatoFps}`);
    if (potatoFps < 30) return { profile: 'potato', fps: potatoFps };

    const lowFps = await testProfile('low');
    console.log(`  -> Low Profile FPS: ${lowFps}`);
    if (lowFps < 30) return { profile: 'potato', fps: potatoFps };

    const medFps = await testProfile('medium');
    console.log(`  -> Medium Profile FPS: ${medFps}`);
    if (medFps < 45) return { profile: 'low', fps: lowFps };

    const highFps = await testProfile('high');
    console.log(`  -> High Profile FPS: ${highFps}`);
    if (highFps < 45) return { profile: 'medium', fps: medFps };

    const ultraFps = await testProfile('ultra');
    console.log(`  -> Ultra Profile FPS: ${ultraFps}`);
    if (ultraFps < 45) return { profile: 'high', fps: highFps };

    return { profile: 'ultra', fps: ultraFps };
}
