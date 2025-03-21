// --------------------------------------------------------------------------------------------------------------------
//
// copy or move a file or move a npm pack to dist folder
//
// --------------------------------------------------------------------------------------------------------------------
import { rename, cp, existsSync, readdirSync, unlinkSync } from 'fs'
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
function cleanDistFolder(distPath) {

    if (existsSync(distPath)) {
        const files = readdirSync(distPath);
        files.forEach(file => {
            const filePath = join(distPath, file);

            unlinkSync(filePath);
        });
    }
    else
        fail('dist folder does not exist');
}

// --------------------------------------------------------------------------------------------------------------------
//
// --------------------------------------------------------------------------------------------------------------------

try {
    const cmd = process.argv[2].trim().toLowerCase();
    if ((cmd === "movepkg") && (process.argv.length === 3)) {
        const distPackageJsonPath = join("./", 'dist', 'package.json');
        const distPackageStr = readFile(distPackageJsonPath, 'utf8')
        const distPackageJson = JSON.parse(distPackageStr);

        const version = distPackageJson.version;
        if (version) {
            const packageName = `jsoi-${version}.tgz`;
            const newFilePath = join("./", 'dist', packageName);
            moveFile(packageName, newFilePath);
        } else
            fail('Cannot find version of built pack');
    }
    if ((cmd === "cleandist") && (process.argv.length === 3)) {
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
}
catch (err) {
    fail(err.message);
}

