import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';


export default [
    //
    // Build for - interpolation_objects.js
    //

    // ESM Build
    {
        input: 'src/interpolation_objects.js',
        output: [
            { file: 'dist/interpolation_objects.mjs', format: 'esm', strict: false }, // Non-minimized ESM
            { file: 'dist/interpolation_objects.min.mjs', format: 'esm', strict: false, sourcemap: true, plugins: [terser()] } // Minimized ESM
        ],
        plugins: [resolve(), commonjs()]
    },
    // CommonJS Build
    {
        input: 'src/interpolation_objects.js',
        output: [
            { file: 'dist/interpolation_objects.cjs', format: 'cjs', strict: false,  }, // Non-minimized CommonJS
            { file: 'dist/interpolation_objects.min.cjs', format: 'cjs', strict: false, sourcemap: true, plugins: [terser()] } // Minimized CommonJS
        ],
        plugins: [resolve(), commonjs()]
    },
    // Browser Global Scope
    {
        input: 'src/interpolation_objects.js',
        output: [
            { file: 'dist/interpolation_objects.gs.js', name: "JSOI", format: 'iife' }, // Non-minimized CommonJS
            { file: 'dist/interpolation_objects.gs.min.js', name: "JSOI", format: 'iife', sourcemap: true, plugins: [terser()] } // Minimized CommonJS
        ],
        plugins: [resolve(), commonjs()]
    }
];

