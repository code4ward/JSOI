#!/usr/bin/env node
'use strict';

var promises = require('fs/promises');
var path = require('path');

//---------------------------------------------------------------------------------------------------------------------
//
// Base class for a generic parser like an Abstract Syntax Tree or any simple parser requiring simple character scanning
//
//---------------------------------------------------------------------------------------------------------------------
class BaseAST {
    //-----------------------------------------------------------------------------------------------------------------
    //
    //-----------------------------------------------------------------------------------------------------------------
    static isWhitespace(char) { return /\s/.test(char); }
    static isOpen(char) { return char === '('; }
    static isClose(char) { return char === ')'; }
    static isCurlyOpen(char) { return char === '{'; }
    static isCurlyClose(char) { return char === '}'; }
    static isArgSeparate(char) { return char === ','; }
    static isSquareOpen(char) { return char === '['; }
    static isSquareClose(char) { return char === ']'; }
    static isGroupTokenBegin(char) { return (char === "'") || (char === '"') || (char === '[') || (char === '{'); }
    static isMatchingGroupTokenEnd(beginChar, char) {
        if(beginChar === "'")
            return char === "'";
        else if(beginChar === '"')
            return char === '"';
        else if(beginChar === '[')
            return char === ']';
        else if(beginChar === '{')
            return char === '}';
    }

    //-----------------------------------------------------------------------------------------------------------------
    //
    //-----------------------------------------------------------------------------------------------------------------
    constructor(expression) {
        this._expression = expression;
        this._index = 0;
    }
    //-----------------------------------------------------------------------------------------------------------------
    //
    //-----------------------------------------------------------------------------------------------------------------
    notifyParseStart() { this._index = 0; }
    notifyParseComplete(parseResult) {}

    //-----------------------------------------------------------------------------------------------------------------
    // Basic character functions - non consuming
    //-----------------------------------------------------------------------------------------------------------------
    getI() { return this._index; }
    getExpr() { return this._expression; }
    cAtI(n = 0) { return this.getExpr()[this._index + n]; }
    cAtIIsWhite() { return BaseAST.isWhitespace(this.cAtI()); }
    skip(n=1) { return this._index += n; }
    hasChars(nChars = 1) { return (this.getExpr().length - this._index) >= nChars; }

    //-----------------------------------------------------------------------------------------------------------------
    // Useful character functions for specific cases
    //-----------------------------------------------------------------------------------------------------------------
    cAtIisCurlyOpen() { return BaseAST.isCurlyOpen(this.cAtI()); }
    cAtIisCurlyClose() { return BaseAST.isCurlyClose(this.cAtI()); }
    cAtIOIsOpen() { return BaseAST.isOpen(this.cAtI()); }
    cAtIOIsClose() { return BaseAST.isClose(this.cAtI()); }
    cAtIIsArgSeporator() { return BaseAST.isArgSeparate(this.cAtI())}
    cAtIIsGroupTokenEnd(beginChar) { return BaseAST.isMatchingGroupTokenEnd(beginChar, this.cAtI()); }
    cAtIIsTag(tag) {
        let hasTag = false;
        const tagLen = tag.length;
        if(this.hasChars(tagLen)) {
            let nFoundSymbols = 0;
            for(let i = 0; i < tag.length; i++) {
                if(this.cAtI(i) === tag[i])
                    nFoundSymbols++;
            }
            hasTag = (nFoundSymbols === tagLen);
        }
        return hasTag;

    }
    //-----------------------------------------------------------------------------------------------------------------
    // Consuming
    //-----------------------------------------------------------------------------------------------------------------
    skipWhitespace() {
        while (this.hasChars() && this.cAtIIsWhite())
            this.skip();
    }
}

//---------------------------------------------------------------------------------------------------------------------
//
//
//
//---------------------------------------------------------------------------------------------------------------------
class TagParser extends BaseAST {

    //-----------------------------------------------------------------------------------------------------------------
    //
    //-----------------------------------------------------------------------------------------------------------------
    constructor(expression, options = {}) {
        super(expression);

        this._options = options;
        this._startTag = "{{";
        this._endTag = "}}";
        this._ignoreEnclosed = { Opens: ["{"], Closes: ["}"] };
        this._curlyBracketStack = [];
        this._replacementEdits = [];
        this._options.TrackCurlyBrackets = this._options.TrackCurlyBrackets !== undefined ?
            this._options.TrackCurlyBrackets : false;
    }
    getTrackCurlyBrackets() { return this._options.TrackCurlyBrackets; }
    //-----------------------------------------------------------------------------------------------------------------
    //
    //-----------------------------------------------------------------------------------------------------------------
    createTemplateKey(key) { return `${this._startTag}${key}${this._endTag}`; }
    cAtIIsBeginTag() { return this.cAtIIsTag(this._startTag); }
    cAtIIsEndTag() {
        let isTag = false;
        if(this._curlyBracketStack.length === 0)
            isTag = this.cAtIIsTag(this._endTag);
        return isTag;

    }
    //-----------------------------------------------------------------------------------------------------------------
    //
    //-----------------------------------------------------------------------------------------------------------------
    cAtIisOpen() {
        let closing = undefined;
        const indexOfOpen = this._ignoreEnclosed.Opens.indexOf(this.cAtI());
        if(indexOfOpen !== -1)
            closing = this._ignoreEnclosed.Closes[indexOfOpen];


        return closing;
    }
    //-----------------------------------------------------------------------------------------------------------------
    //
    //-----------------------------------------------------------------------------------------------------------------
    cAtIisClosing() {
        let matchedClosing = false;
        if(this._curlyBracketStack.length > 0) {
            const lastClosing = this._curlyBracketStack[this._curlyBracketStack.length - 1];
            if(this.cAtI() === lastClosing)
                matchedClosing = true;
        }
        return matchedClosing;
    }
    //-----------------------------------------------------------------------------------------------------------------
    //
    //-----------------------------------------------------------------------------------------------------------------
    trackEnclosedChars() {
        // In the cases where we have not identified a start or end token, track curly brackets.
        if(this.getTrackCurlyBrackets()) {
            const closingChar = this.cAtIisOpen();
            if (closingChar !== undefined)
                this._curlyBracketStack.push(closingChar);
            else if (this.cAtIisClosing()) {
                this._curlyBracketStack.pop();
            }
        }
    }
    //-----------------------------------------------------------------------------------------------------------------
    //
    //-----------------------------------------------------------------------------------------------------------------
    parseToken() {
        // {{A  {{B}} }}
        let token = undefined;
        let start = -1; let end = -1;
        let iStartToken = -1; let iEndToken = -1;
        while (this.hasChars()) {
            if (this.cAtIIsBeginTag()) {
                iStartToken = this.getI();
                this.skip(this._startTag.length);
                start = this.getI();
            }
            else if ((start !== -1) && this.cAtIIsEndTag()) {
                end = this.getI();
                iEndToken = end +  this._endTag.length;

                // slice out our token
                token = this.getExpr().slice(start, end);

                this.skip(this._endTag.length);
                break;
            }
            else {
                this.trackEnclosedChars();
                this.skip();
            }
        }
        return token !== undefined ? {
            Match: this.createTemplateKey(token),
            Key: token,
            IStartToken: iStartToken,
            IEndToken: iEndToken
        } : undefined;
    }

    //-----------------------------------------------------------------------------------------------------------------
    //
    //-----------------------------------------------------------------------------------------------------------------
    applyReplacementEdits() {
        return SinglePassTagReplacer.customStringReplacer(this.getExpr(), this._replacementEdits);
    }
}


//---------------------------------------------------------------------------------------------------------------------
//
//
//
//---------------------------------------------------------------------------------------------------------------------
class SinglePassTagReplacer extends TagParser {
    //-----------------------------------------------------------------------------------------------------------------
    //
    //-----------------------------------------------------------------------------------------------------------------
    static customStringReplacer(expression, replacementEdits) {
        // Note: edits are already sorted from left to right

        // Iterate over the replacementEdits
        let result = '';
        let lastIndex = 0;

        for (let i = 0; i < replacementEdits.length; i++) {
            const { ReplaceWith, IStartToken, IEndToken } = replacementEdits[i];

            // Add the existing part of the string before the start token
            result += expression.slice(lastIndex, IStartToken);

            // Add the new string (key)
            result += ReplaceWith;

            // Update the lastIndex to be after the end token
            lastIndex = IEndToken;
        }

        // Add any remaining part of the original string after the last change
        result += expression.slice(lastIndex);

        return result;
    }

    //-----------------------------------------------------------------------------------------------------------------
    //
    //-----------------------------------------------------------------------------------------------------------------
    constructor(expression, cb, options = {}) {
        super(expression, options);
        this._cb = cb;
    }
    //-----------------------------------------------------------------------------------------------------------------
    //
    //-----------------------------------------------------------------------------------------------------------------
    notifyParseResult(matchResultObj) {
        const match = matchResultObj.Match;
        const key = matchResultObj.Key;
        const offset = matchResultObj.IStartToken;

        matchResultObj.ReplaceWith = this._cb(this, match, key, offset, this.getExpr());
        this._replacementEdits.push(matchResultObj);
    }
    //-----------------------------------------------------------------------------------------------------------------
    //
    //-----------------------------------------------------------------------------------------------------------------
    applyReplacementEdits() {
        return SinglePassTagReplacer.customStringReplacer(this.getExpr(), this._replacementEdits);
    }
    //-----------------------------------------------------------------------------------------------------------------
    //
    //-----------------------------------------------------------------------------------------------------------------
    replace() {
        this.notifyParseStart();
        let matchResultObj = this.parseToken();
        while(matchResultObj !== undefined) {
            this.notifyParseResult(matchResultObj);
            matchResultObj = this.parseToken();
        }
        if(this._curlyBracketStack.length > 0)
            throw new Error(`Match Error - unbalanced symbols missing: ${this._curlyBracketStack.join(',')}`);
        this.notifyParseComplete(matchResultObj);
        return this.applyReplacementEdits();
    }
}

//---------------------------------------------------------------------------------------------------------------------
//
//
//---------------------------------------------------------------------------------------------------------------------
class PromisesHandler {
    static isPromise(p) {
        let result = false;
        if ((p !== null) && (typeof p === 'object') && typeof p.then === 'function')
            result = true;
        return result;
    }
    //-----------------------------------------------------------------------------------------------------------------
    //
    //-----------------------------------------------------------------------------------------------------------------
    constructor() {
        this._promises = [];
        this._promiseKeys = [];
        this._matchedOn = [];

        this._nextKeyId = 0;
    }
    //-----------------------------------------------------------------------------------------------------------------
    //
    //-----------------------------------------------------------------------------------------------------------------
    hasPromises() { return this._promises.length > 0; }
    allSettled() { return Promise.allSettled(this._promises); }
    //-----------------------------------------------------------------------------------------------------------------
    //
    //-----------------------------------------------------------------------------------------------------------------
    async processPromises() {
        let replaceKeys = undefined;
        if (this.hasPromises()) {
            replaceKeys = {NResolved: 0, NRejected: 0};
            const results = await this.allSettled();
            for (let i = 0; i < results.length; i++) {
                const promiseKey = this._promiseKeys[i];
                const pResult = results[i];
                if(pResult.status === 'fulfilled') {
                    replaceKeys[promiseKey] = pResult.value;
                    replaceKeys.NResolved++;
                }
                else if(pResult.status === 'rejected') {
                    replaceKeys[promiseKey] = this._matchedOn[i];
                    replaceKeys.NRejected++;
                }
            }
        }
        return replaceKeys;
    }
    //-----------------------------------------------------------------------------------------------------------------
    //
    //-----------------------------------------------------------------------------------------------------------------
    getNextPromiseKey() {
        const key  = `${this._nextKeyId}__@uniquePKey@__${this._nextKeyId}`;
        this._nextKeyId++;
        return key;
    }
    //-----------------------------------------------------------------------------------------------------------------
    //
    //-----------------------------------------------------------------------------------------------------------------
    add(matchedOn, pCandidate) {
        let addedKey = undefined;
        if(PromisesHandler.isPromise(pCandidate)) {
            this._matchedOn.push(matchedOn);
            this._promises.push(pCandidate);
            addedKey = this.getNextPromiseKey();
            this._promiseKeys.push(addedKey);
        }
        return addedKey;
    }
}
const defaultOptions = Object.freeze({
    CovertValueToType: true,
});

//---------------------------------------------------------------------------------------------------------------------
//
// Context for key values allows lookup by simple key.  This is the Base Interface for getting a value based on a key
//
//---------------------------------------------------------------------------------------------------------------------
class KeyValueContextI {
    constructor(keyValues) {
        this._keyValues = keyValues;
    }
    getKeyValues() { return this._keyValues; }
    get(key) { return this._keyValues[key]; }
}

//---------------------------------------------------------------------------------------------------------------------
//
//
//
//---------------------------------------------------------------------------------------------------------------------
class StringInterpolator {

    //-----------------------------------------------------------------------------------------------------------------
    //
    //-----------------------------------------------------------------------------------------------------------------
    constructor(templateStr, keyValuesI, options = {}) {
        this._templateStr = templateStr;

        this._keyValuesI = (keyValuesI instanceof KeyValueContextI) ?
            keyValuesI : new KeyValueContextI(keyValuesI);

        this._options = options;

        this._options.CovertValueToType = this._options.CovertValueToType === undefined ?
            defaultOptions.CovertValueToType : this._options.CovertValueToType;

        this._options.ReplaceNotFoundHandler =
            this._options.ReplaceNotFoundHandler !== undefined ? this._options.ReplaceNotFoundHandler : (templateVar, key) => { return templateVar };
    }
    //-----------------------------------------------------------------------------------------------------------------
    //
    //-----------------------------------------------------------------------------------------------------------------
    getOptionConvertType() { return this._options.CovertValueToType; }
    getOptionReplaceNotFoundHandler() { return this._options.ReplaceNotFoundHandler; }

    //-----------------------------------------------------------------------------------------------------------------
    //
    //-----------------------------------------------------------------------------------------------------------------
    getValueInMap(key) { return this._keyValuesI.get(key); }
    //-----------------------------------------------------------------------------------------------------------------
    //
    //-----------------------------------------------------------------------------------------------------------------
    async doReplaces(templateStr, options) {
        let simpleReplace = undefined;
        const promisesHandler = new PromisesHandler();
        const replace = (new SinglePassTagReplacer(templateStr,
            (sender, match, key, offset, string) => {

                let replaceCandidate = options.getValueInMap(key.trim());
                if((replaceCandidate === undefined) && options.canInvokeNotFoundHandler())
                    replaceCandidate = this.getOptionReplaceNotFoundHandler()(match, key);

                // If there are promises to resolve, replace the token with our promise key
                const promiseKey = promisesHandler.add(match, replaceCandidate);
                if(promiseKey !== undefined)
                    replaceCandidate = sender.createTemplateKey(promiseKey);
                else if(this.getOptionConvertType() && (match === string))
                    simpleReplace = replaceCandidate;
                else {
                    if((replaceCandidate !== null) && (typeof replaceCandidate === 'object'))
                        replaceCandidate = JSON.stringify(replaceCandidate);
                }

                return replaceCandidate;

        }, this._options)).replace();
        let resultingS = undefined;
        const promiseReplaceKeys = await promisesHandler.processPromises();
        if(promiseReplaceKeys !== undefined) {
            resultingS = await this.doReplaces(replace, {
                getValueInMap: (key) =>  promiseReplaceKeys[key],
                canInvokeNotFoundHandler: () => false
            });
        }

        resultingS = resultingS || (simpleReplace !== undefined ? simpleReplace : replace);
        return resultingS;
    }
    //-----------------------------------------------------------------------------------------------------------------
    //
    //-----------------------------------------------------------------------------------------------------------------
    async sInterpolate() {
        let resultingS = this._templateStr;

        if (typeof resultingS === 'string') {
            resultingS = await this.doReplaces(resultingS, {
                getValueInMap: (key) =>  this.getValueInMap(key),
                canInvokeNotFoundHandler: () => true
            });
        }

        return resultingS;
    }
}

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
            const templateString = await promises.readFile(this._templateFileName, 'utf8');

            // Step 4: Interpolate with provided params
            const si = new StringInterpolator(templateString, this._replaceParams,
                {TrackCurlyBrackets: false});
            const resultingOutput = await si.sInterpolate();

            // Step 5: Write the interpolated content to the output file
            await promises.writeFile(this._outputFileName, resultingOutput, 'utf8');

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
//# sourceMappingURL=interpolation_file_template.cjs.js.map
