import { rename, cp } from 'fs'
import * as path from "node:path";

if(process.argv.length === 5) {
    const cmd = process.argv[2].trim().toLowerCase();
    const oldFilePath = process.argv[3];
    const newFilePath = process.argv[4];
    if(cmd === "move") {
        rename(oldFilePath, newFilePath, (err) => {
            if (err) {
                console.error(err.message);
                process.exit(1);
            } else
                console.log(`Renamed ${oldFilePath} to ${newFilePath}`);
        });
    }
    else if(cmd === "copy") {
        cp(oldFilePath, newFilePath, {}, (err) => {
            if (err) {
                console.error(err.message);
                process.exit(1);
            } else
                console.log(`Copied ${oldFilePath} to ${newFilePath}`);
        });
    }
    else
        console.error(`Error invalid command: ${cmd}`);
}
else {
    console.error(`Incorrect number of parameters`);

    console.log(`Usage: ${path.basename(process.argv[0])} ${path.basename(process.argv[1])} <move | copy> [sourcePath/filename] [targetPath/filename]`);
    process.exit(1);
}


