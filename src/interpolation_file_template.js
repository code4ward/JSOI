#!/usr/bin/env node
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { StringInterpolator } from "./interpolation_objects.js";

// --------------------------------------------------------------------------------------------------------------------
//
// main entry point for replace on file template
//
// --------------------------------------------------------------------------------------------------------------------
class Main {
    // ----------------------------------------------------------------------------------------------------------------
    //
    // ----------------------------------------------------------------------------------------------------------------
    static parseReplaceParams(paramString) {
        const replaceParams = {};
        paramString.split(';').forEach( (keyValuePair) => {
            const [key, value] = keyValuePair.split('=');
            if (key && value) {
                replaceParams[key.trim()] = value.trim();
            }
        });
        return replaceParams;
    }
    // ----------------------------------------------------------------------------------------------------------------
    //
    // ----------------------------------------------------------------------------------------------------------------
    static logUsageExit() {
        console.info(`Replace template parameters in a file:`);
        console.info(`  Usage: ${path.basename(process.argv[0])} ${path.basename(process.argv[1])} <templateFileName> <outputFileName> <Key1=value1; Key2=value2; ...>`);
        process.exit(1);
    }
    // ----------------------------------------------------------------------------------------------------------------
    //
    // ----------------------------------------------------------------------------------------------------------------
    constructor() {
        this._templateFileName = "";
        this._outputFileName = "";
        this._replaceParams = {};
        if (process.argv.length > 4) {
            // Step 1: Validate templateFileName
            this._templateFileName = process.argv[2];
            this._outputFileName = process.argv[3];

            // Step 2: Parse replacement parameters
            const paramString = process.argv.slice(4).join(' ');
            this._replaceParams = Main.parseReplaceParams(paramString);
        }
        else
            Main.logUsageExit();


    }
    // ----------------------------------------------------------------------------------------------------------------
    // Main entry point
    // ----------------------------------------------------------------------------------------------------------------
    async main() {
        try {
            // Step 3: Read template file content
            const templateString = await readFile(this._templateFileName, 'utf8');

            // Step 4: Interpolate with provided params
            const si = new StringInterpolator(templateString, this._replaceParams,
                {TrackCurlyBrackets: false});
            const resultingOutput = await si.sInterpolate();

            // Step 5: Write the interpolated content to the output file
            await writeFile(this._outputFileName, resultingOutput, 'utf8');

            console.log(`File content written successfully to: ${this._outputFileName}`);

        } catch (err) {
            console.error('Error processing the file:', err.message);
            Main.logUsageExit();
        }
    }
}

// --------------------------------------------------------------------------------------------------------------------
// Run main
// --------------------------------------------------------------------------------------------------------------------
( async () => { await (new Main()).main(); } )();

