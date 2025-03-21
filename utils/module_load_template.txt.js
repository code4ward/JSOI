//---------------------------------------------------------------------------------------------------------------------
//
// Module loader template used to create a module loader js file, which can be used to load all exported values into
// the browsers global scope.
// Run interpolation on the file to replace moduleName, with module file.
//
//---------------------------------------------------------------------------------------------------------------------

(function (globalScope) {
    // Placeholder for the module file name that needs to be replaced during the build process
    const moduleName = '{{ModuleJSFileName}}'; // Replace this with the actual module name during the interpolation step

    // Validate if `moduleName` has been replaced during the build process
    if (!moduleName || moduleName === '{{ModuleJSFileName}}') {
        throw new Error('moduleName has not been replaced with the actual module file name. Check your build process.');
    }

    /**
     * Dynamically loads an ESM module for the browser and attaches its exports to the global scope.
     * @param {HTMLScriptElement} script - The <script> element that loaded this code.
     */
    async function loadModuleGS(script) {
        // Check if the script tag has a `src` attribute
        const thisPath = script.getAttribute('src');
        if (thisPath) {

            // Dynamically build the module path based on the script's `src` attribute
            const modulePath = thisPath.replace(/[^/]+$/, moduleName); // Resolves full path dynamically

            try {
                // Use dynamic import to load the module
                const module = await import(modulePath);

                // Attach module exports to the global scope if running in a browser environment
                if (typeof globalScope !== 'undefined' && globalScope.window) {
                    Object.keys(module).forEach((exportName) => {
                        globalScope[exportName] = module[exportName];
                    });
                }
            } catch (error) {
                console.error('Failed to dynamically load the module:', error);
            }
        }
        else
            console.error('Cannot get script element - are you loading this as a module?');

    }

    // Detect the environment (CommonJS, browser/global scope, or leave ESM untouched)
    if (typeof module !== 'undefined' && module.exports) {
        // Node.js/CommonJS-specific branch
        try {
            const moduleExports = require('./' + moduleName); // Load the module with require()
            Object.assign(module.exports, moduleExports); // Attach all exports to module.exports
        } catch (error) {
            console.error('Failed to load CommonJS module:', error);
        }
    } else if (typeof globalScope !== 'undefined' && globalScope.window && typeof document !== 'undefined') {
        // Browser-specific branch
        // Use document.currentScript or fallback to the last <script> tag if currentScript is not available
        const script = document.currentScript || Array.from(document.getElementsByTagName('script')).pop();
        if (script) {
            loadModuleGS(script); // Dynamically import and attach exports to the global scope
        } else {
            console.error('Cannot determine the current script element. Ensure the script is being loaded correctly.');
        }
    } else {
        console.warn(
            'This module is being used as ESM. Ensure you are importing it properly in an environment that supports ESM.'
        );
    }

// Detect the global scope (works for browsers, Node.js, and other environments like Web Workers)
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : global));
