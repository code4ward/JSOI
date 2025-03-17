//---------------------------------------------------------------------------------------------------------------------
//
// Module loader template used to create a module loader js file, which can be used to load all exported values into
// the browsers global scope.
// Run interpolation on the file to replace moduleName, with module file.
//
//---------------------------------------------------------------------------------------------------------------------
(function(globalScope) {
    const moduleName = 'interpolation_objects.js';
    const script = document.currentScript; // Get the current script element
    if(script) {
        const thisPath = script.getAttribute('src');
        const modulePath =  thisPath.replace(/[^/]+$/, moduleName);
        (async function () {
            try {
                const module = await import(modulePath);

                // Check if running in a browser environment
                if (typeof globalScope !== 'undefined' && globalScope.window) {
                    const moduleExports = Object.keys(module);
                    moduleExports.forEach( (exportName) => {
                        globalScope[exportName] = module[exportName];
                    });
                }
            } catch (error) {
                console.error('Failed to load module:', error);
            }
        })();
    }
    else
        console.error('Cannot get script element - are you loading this as a module?');
// eslint-disable-next-line no-undef
})(typeof globalThis !== "undefined" ? globalThis : (typeof window !== "undefined" ? window : global));
