// --------------------------------------------------------------------------------------------------------------------
//
// copy or move a file or move a npm pack to dist folder
//
// --------------------------------------------------------------------------------------------------------------------
import { rename, cp, existsSync, readdirSync, unlinkSync, mkdirSync, statSync } from 'fs'
import * as path from "node:path";
import {join, resolve, relative} from "path";
import {readFile} from "fs/promises";

// --------------------------------------------------------------------------------------------------------------------
//
// --------------------------------------------------------------------------------------------------------------------
function fail(msg) {
    console.error(msg);
    process.exit(1);
}

// --------------------------------------------------------------------------------------------------------------------
//
// --------------------------------------------------------------------------------------------------------------------
function isValidPath(filePath, validateFileExists) {
    const currentDir = resolve('./'); // Resolve current directory
    const resolvedPath = resolve(filePath); // Resolve input path to an absolute path
    const relativePath = relative(currentDir, resolvedPath); // Get the relative path from currentDir to resolvedPath

    // Check if the file exists and is a valid file
    const pathExists = existsSync(resolvedPath);
    const isFile = pathExists && statSync(resolvedPath).isFile();

    // Ensure the resolved path is within currentDir scope
    const isWithinCurrentDir = !relativePath.startsWith('..') && !relativePath.startsWith('/') && !path.isAbsolute(relativePath);

    // Return true only if the file exists, is a file, and is within the current directory scope
    return isWithinCurrentDir && (!validateFileExists || isFile);

}

// --------------------------------------------------------------------------------------------------------------------
//
// --------------------------------------------------------------------------------------------------------------------
function createFolderIfNotExists(folderPath) {
    if (!existsSync(folderPath)) {
        mkdirSync(folderPath, { recursive: true }); // Recursive for nested folder creation
        console.log(`Folder created at: ${folderPath}`);
    } else {
        console.log(`Folder already exists: ${folderPath}`);
    }
}

// --------------------------------------------------------------------------------------------------------------------
//
// --------------------------------------------------------------------------------------------------------------------
function moveFile(oldFilePath, newFilePath) {
     if(isValidPath(oldFilePath, true)) {
         if(isValidPath(newFilePath, false)) {
             rename(oldFilePath, newFilePath, (err) => {
                 if (err)
                     fail(err.message);
                 else
                     console.log(`Renamed ${oldFilePath} to ${newFilePath}`);
             });
         }
         else
             fail(`Invalid path: ${newFilePath}. Please provide a valid path to a target file.`);
     }
     else
         fail(`Invalid path: ${oldFilePath}. Please provide a valid path to a source file.`);

}
// --------------------------------------------------------------------------------------------------------------------
//
// --------------------------------------------------------------------------------------------------------------------
function copyFile(oldFilePath, newFilePath) {

    if (isValidPath(oldFilePath, true)) {
        if (isValidPath(newFilePath, false)) {
            cp(oldFilePath, newFilePath, {}, (err) => {
                if (err)
                    fail(err.message);
                else
                    console.log(`Copied ${oldFilePath} to ${newFilePath}`);
            });
        }
        else
            fail(`Invalid path: ${newFilePath}. Please provide a valid path to a target file.`);
    }
    else
        fail(`Invalid path: ${oldFilePath}. Please provide a valid path to source file.`);
}
// --------------------------------------------------------------------------------------------------------------------
//
// --------------------------------------------------------------------------------------------------------------------
function cleanDistFolder(distPath) {

    createFolderIfNotExists(distPath)
    const files = readdirSync(distPath);
    files.forEach(file => {
        const filePath = join(distPath, file);

        unlinkSync(filePath);
    });
}
// --------------------------------------------------------------------------------------------------------------------
//
// --------------------------------------------------------------------------------------------------------------------
async function getCurrentPackageVersion(folder) {
    const distPackageJsonPath = join("./", folder, 'package.json');
    const distPackageStr = await readFile(distPackageJsonPath, 'utf8')
    const distPackageJson = JSON.parse(distPackageStr);

    return distPackageJson.version;
}

// --------------------------------------------------------------------------------------------------------------------
//
// --------------------------------------------------------------------------------------------------------------------
async function main()
{
    try {
        const cmd = process.argv[2].trim().toLowerCase();
        if ((cmd === "renamepkgtolatest") && (process.argv.length === 3)) {
            const version = await getCurrentPackageVersion('dist');
            if (version) {
                const packageName = `jsoi-lib-${version}.tgz`;
                const newPackageName = `jsoi-lib-latest.tgz`;
                const oldFilePath = join("./", 'dist', packageName);
                const newFilePath = join("./", 'dist', newPackageName);
                moveFile(oldFilePath, newFilePath);
            } else
                fail('Cannot find version of built pack');
        }
        else if ((cmd === "movepkg") && (process.argv.length === 3)) {
            const version = await getCurrentPackageVersion('dist');
            if (version) {
                const packageName = `jsoi-${version}.tgz`;
                const newFilePath = join("./", 'dist', packageName);
                moveFile(packageName, newFilePath);
            } else
                fail('Cannot find version of built pack');
        }
        else if ((cmd === "cleandist") && (process.argv.length === 3)) {
            const distPackageJsonPath = join("./", 'dist');
            cleanDistFolder(distPackageJsonPath)
        } else if ((cmd === "move") && (process.argv.length === 5)) {
            const sourceFilePath = process.argv[3];
            const targetFilePath = process.argv[4];
            moveFile(sourceFilePath, targetFilePath);
        } else if ((cmd === "copy") && (process.argv.length === 5)) {
            const sourceFilePath = process.argv[3];
            const targetFilePath = process.argv[4];
            copyFile(sourceFilePath, targetFilePath);
        } else
            fail(`Usage: ${path.basename(process.argv[0])} ${path.basename(process.argv[1])} <move | copy> [sourcePath/filename] [targetPath/filename] | ${path.basename(process.argv[0])} ${path.basename(process.argv[1])} MovePkg`)

        console.log(`${cmd} complete!`);
    } catch (err) {
        fail(err.message);
    }
}

main();