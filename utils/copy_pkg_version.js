// --------------------------------------------------------------------------------------------------------------------
//
// Copies the version number assigned to the main branch package.json and copies it to dist/package
//
// --------------------------------------------------------------------------------------------------------------------
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

// --------------------------------------------------------------------------------------------------------------------
//
// --------------------------------------------------------------------------------------------------------------------
async function updateVersion() {
    let version = "";

    // Paths to the main and dist package.json files
    const mainPackageJsonPath = join("./", 'package.json');
    const distPackageJsonPath = join("./", 'dist', 'package.json');

    try {
        // Read and parse the main package.json
        const mainPackageStr = await readFile(mainPackageJsonPath, 'utf8');
        const mainPackageJson = JSON.parse(mainPackageStr);

        // Check if the version exists in the main package.json
        if (mainPackageJson.version) {
            version = mainPackageJson.version;;
            // Read and parse the dist package.json
            const distPackageStr = await readFile(distPackageJsonPath, 'utf8')
            const distPackageJson = JSON.parse(distPackageStr);

            // Update the version in dist package.json
            distPackageJson.version = version;

            // Write the updated dist package.json back to the file
            await writeFile(distPackageJsonPath, JSON.stringify(distPackageJson, null, 2), 'utf8');

            console.log(`Version updated to ${mainPackageJson.version} in dist/package.json`);
        }
        else {
            console.error('Version field not found in package.json!');
            process.exit(1);
        }
    } catch (error) {
        console.error('Error while updating the version:', error);
        process.exit(1);
    }
    return version;
}

// --------------------------------------------------------------------------------------------------------------------
//
// --------------------------------------------------------------------------------------------------------------------
( async () => {
    const newVersion = await updateVersion();
})();

