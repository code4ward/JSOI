// --------------------------------------------------------------------------------------------------------------------
//
// copy or move a file or move a npm pack to dist folder
//
// --------------------------------------------------------------------------------------------------------------------
import { rename, cp, existsSync, readdirSync, unlinkSync, mkdirSync } from 'fs'
import * as path from "node:path";
import {join} from "path";
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
    rename(oldFilePath, newFilePath, (err) => {
        if (err)
            fail(err.message);
        else
            console.log(`Renamed ${oldFilePath} to ${newFilePath}`);
    });
}
// --------------------------------------------------------------------------------------------------------------------
//
// --------------------------------------------------------------------------------------------------------------------
function copyFile(oldFilePath, newFilePath) {
    cp(oldFilePath, newFilePath, {}, (err) => {
        if (err)
            fail(err.message);
        else
            console.log(`Copied ${oldFilePath} to ${newFilePath}`);
    });
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
            const oldFilePath = process.argv[3];
            const newFilePath = process.argv[4];
            moveFile(oldFilePath, newFilePath);
        } else if ((cmd === "copy") && (process.argv.length === 5)) {
            const oldFilePath = process.argv[3];
            const newFilePath = process.argv[4];
            copyFile(oldFilePath, newFilePath);
        } else
            fail(`Usage: ${path.basename(process.argv[0])} ${path.basename(process.argv[1])} <move | copy> [sourcePath/filename] [targetPath/filename] | ${path.basename(process.argv[0])} ${path.basename(process.argv[1])} MovePkg`)

        console.log(`${cmd} complete!`);
    } catch (err) {
        fail(err.message);
    }
}

main();