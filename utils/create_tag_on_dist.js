// --------------------------------------------------------------------------------------------------------------------
//
// Reads the dist/package.json version and adds the tag on the distribution branch gh_pages
//
// --------------------------------------------------------------------------------------------------------------------
import { readFile } from 'fs/promises';
import { join } from 'path';
import {exec} from 'child_process';
import {promisify} from 'util';

const execAsync = promisify(exec);
const distBranchName = 'gh-pages';
const mainBranchName = 'master';
// --------------------------------------------------------------------------------------------------------------------
//
// --------------------------------------------------------------------------------------------------------------------
async function createVersionTag() {
    try {
        const distPackageJsonPath = join("./", 'dist', 'package.json');
        const distPackageStr = await readFile(distPackageJsonPath, 'utf8')
        const distPackageJson = JSON.parse(distPackageStr);

        const version = distPackageJson.version;
        if(version) {
            console.log(`Starting to create tag ${version} on gh_pages branch`);

            await execAsync(`git fetch origin`);
            console.log(`git fetch origin.`);

            // Switch to gh_pages branch
            await execAsync(`git checkout ${distBranchName}`);
            console.log(`Switched to ${distBranchName} branch.`);

            await execAsync(`git pull origin ${distBranchName}`);
            console.log(`git pull origin ${distBranchName}.`);

            // Create a new tag with the provided version
            const tagName = `v${version}-dist`;
            await execAsync(`git tag -a ${tagName} -m "Version ${version}"`);
            console.log(`Tag ${tagName} created.`);

            // Push the tag and the changes
            await execAsync(`git push origin ${distBranchName} --tags`);
            console.log(`Tag ${tagName} pushed to remote.`);

            // Switch back to the master branch
            await execAsync(`git checkout ${mainBranchName}`);
            console.log(`Switched back to ${mainBranchName} branch.`);

            console.log('Version tag creation completed successfully.');
        }
        else {
            console.error('Error no version tag found on dist');
            process.exit(1);
        }
    } catch (error) {
        console.error('Error while creating version tag:', error);
        process.exit(1);
    }
}

// --------------------------------------------------------------------------------------------------------------------
//
// --------------------------------------------------------------------------------------------------------------------
(async () => {
    const version = await createVersionTag();
})();


