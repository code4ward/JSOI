import {ExpressionParser} from "./expression_parser.js"
//---------------------------------------------------------------------------------------------------------------------
//---------------------------------------------------------------------------------------------------------------------
const REGX = Object.freeze({
    FUNCTION_TAG: '^\\s*->\\s*(.*)',
    CMD_KEY_QUEUE_DEL_CHILD_OBJ_IF_EMPTY: '^(<-\\s*false\\s*)|(<--\\s*false\\s*)$',
    CMD_KEY_COPY_INTO_OBJ: '^(<-\\s*true\\s*)|(<-\\s*)$',
    CMD_KEY_COPY_INTO_PARENT_OBJ: '^(<--\\s*true\\s*)|(<--\\s*)$',

});

//---------------------------------------------------------------------------------------------------------------------
// Exceptions
//---------------------------------------------------------------------------------------------------------------------
class InterpolationValueNotFoundError extends Error { constructor(){ super("Interpolation value not Found"); } }

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
            hasTag = (nFoundSymbols === tagLen)
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
        this._endTag = "}}"
        this._ignoreEnclosed = { Opens: ["{"], Closes: ["}"] }
        this._curlyBracketStack = [];
        this._replacementEdits = []
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
class SimpleTagParser extends TagParser {

    //-----------------------------------------------------------------------------------------------------------------
    //
    //-----------------------------------------------------------------------------------------------------------------
    constructor(expression, options = {}) {
        super(expression, options);
    }
    //-----------------------------------------------------------------------------------------------------------------
    //
    //-----------------------------------------------------------------------------------------------------------------
    has() {
        let found = false;
        this.notifyParseStart();
        let matchResultObj = this.parseToken();
        this.notifyParseComplete(matchResultObj);
        return matchResultObj !== undefined;
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
        this._matchedOn = []

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
// Context for key values allows lookup by a query string.
//
//---------------------------------------------------------------------------------------------------------------------
class QueryObjKeyValueContextI extends KeyValueContextI {
    constructor(keyValues, useSeparator = ".") {
        super(keyValues);
        this._useSeparator = useSeparator;
    }
    get(q) {
         function arr_deref(o, ref, i) {
            const key = ref.slice(0, i ? -1 : ref.length);
            return !ref ? o : (o[key]);
        }
        function dot_deref(o, ref) {
            return !ref ? o : ref.split('[').reduce(arr_deref, o);
        }
        try {
            return q.split(this._useSeparator).reduce(dot_deref, this.getKeyValues());
        }
        catch(err) { return undefined; }
    }
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

        // Replace string with found key
        let nReplaces = 0;
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
                        replaceCandidate = JSON.stringify(replaceCandidate)
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

//---------------------------------------------------------------------------------------------------------------------
//---------------------------------------------------------------------------------------------------------------------
const ReplaceObjectAction = Object.freeze({
    ACTION_NONE: Symbol("ACTION_NONE"),
    ACTION_DELETE: Symbol("ACTION_DELETE"),
    ACTION_THROW: Symbol("ACTION_THROW"),
    isValidAction: function (action) {
        let isValid = false;
        if(action)
            isValid = (action === ReplaceObjectAction.ACTION_NONE) ||
                (action === ReplaceObjectAction.ACTION_DELETE) ||
                (action === ReplaceObjectAction.ACTION_THROW);
        return isValid;
    }
});

//---------------------------------------------------------------------------------------------------------------------
//
//
//---------------------------------------------------------------------------------------------------------------------
class ActionI {
    constructor() {
        this._action = ReplaceObjectAction.ACTION_NONE;
    }

    //-----------------------------------------------------------------------------------------------------------------
    //
    //-----------------------------------------------------------------------------------------------------------------
    getAction() { return this._action; }
    setAction(newActionValue) {
        let actionSet = false;
        if(ReplaceObjectAction.isValidAction(newActionValue)) {
            this._action = newActionValue;

            actionSet = true;
        }

        return actionSet;
    }
}

//---------------------------------------------------------------------------------------------------------------------
//
//
//---------------------------------------------------------------------------------------------------------------------
const KeyCommands = Object.freeze({
    KeyCmdNone: 0,
    KeyCmdCopyIntoObject: 1,
    KeyCmdCopyIntoParentObject: 2,
    KeyCmdDelKey: 3,
    KeyCmdQueueDelChildObjectIfEmpty: 4
});

class ObjectInterpolatorBase  {
    static isKeyCmd(key, cmd) { return key.search(new RegExp(cmd)) !== -1; }
    //-----------------------------------------------------------------------------------------------------------------
    //
    //-----------------------------------------------------------------------------------------------------------------
    static containsTemplateVar(templateString) {
        return (templateString && typeof templateString === 'string') ?
            ((new SimpleTagParser(templateString)).has()) : false;
    }
    //-----------------------------------------------------------------------------------------------------------------
    //
    //-----------------------------------------------------------------------------------------------------------------
    static dupWithoutVars(childObj) {
        const obj = {...childObj};
        for (const [key, value] of Object.entries(childObj)) {
            // we should remove any variable which has a template variable
            if (ObjectInterpolatorBase.containsTemplateVar(value))
                delete obj[key];
        }
        return obj;
    }
    static mergeInto(target, source) {
        if(Array.isArray(target) && Array.isArray((source))) {
            target.splice(0, target.length, ...source);
        }
        else {
            Object.assign(target, source);
        }
    }
    //-----------------------------------------------------------------------------------------------------------------
    // {A:{a:1,b:2, c:{d:4}}
    //-----------------------------------------------------------------------------------------------------------------
    static *iterateObjStrings(obj, keys = [], objs= []) {
        let isRoot = false;
        if(obj) {

            // push the root object
            if(objs.length === 0) { objs.push(obj); isRoot = true; }


            const useKeys = Array.isArray(obj.__ProcessKeys__) ? obj.__ProcessKeys__ : Object.keys(obj);
            for(let i = 0; i < useKeys.length; i++) {
                const key = useKeys[i]; const value = obj[key];

                if ((typeof value === 'object') && (value !== null)) {
                    keys.push(key); objs.push(value);
                    yield* ObjectInterpolatorBase.iterateObjStrings(value, keys, objs );
                    keys.pop();  objs.pop();
                }
                else if (typeof value === 'string') {
                    yield [obj, key, value.trim(), keys, objs];
                    const regex = /^__DEBUG__\d*$/;
                    const isDebugPrint = !!key.match(regex);
                    if (isDebugPrint) {
                        console.log(obj[key]);
                        delete obj[key];
                    }
                }
            }

            // pop the root object
            if(isRoot) { objs.pop(); }
        }
    }
    //-----------------------------------------------------------------------------------------------------------------
    //
    //-----------------------------------------------------------------------------------------------------------------
    static createPathDotNotation(keys, key) { return keys.length > 0 ? keys.join("¤") + "¤" + key : key; }
    static createObjectPath(pathDotNotation) { return pathDotNotation.split("¤"); }
    static dup(obj) { return JSON.parse(JSON.stringify(obj)); }

    //-----------------------------------------------------------------------------------------------------------------
    //
    //-----------------------------------------------------------------------------------------------------------------
    constructor(obj, keyValues, options = {}) {
        this._options = options;
        this._options.CopyObj = this._options.CopyObj !== undefined ? this._options.CopyObj : false

        this._obj = this.getCopyObj() ? ObjectInterpolatorBase.dup(obj) : obj;
        this._keyValues = keyValues;

        this._options.ActionOnNotFound = ReplaceObjectAction.isValidAction(this._options.ActionOnNotFound) ?
            this._options.ActionOnNotFound : ReplaceObjectAction.ACTION_NONE;

        this._options.KeyValueContextI = this._options.KeyValueContextI !== undefined ?
            this._options.KeyValueContextI : KeyValueContextI;

        this._nPass = 2;
    }
    //-----------------------------------------------------------------------------------------------------------------
    //
    //-----------------------------------------------------------------------------------------------------------------
    getObj() { return this._obj; }
    getOptions() { return this._options; }
    getActionOnNotFound() { return this._options.ActionOnNotFound; }
    getOptionKeyValueContextI() { return this._options.KeyValueContextI; }
    getOptionKeyValueContextSeparator() { return this._options.KeyValueContextSeparator || "."; }
    getCopyObj() { return this._options.CopyObj; }

    //-----------------------------------------------------------------------------------------------------------------
    // There are two possible return values, either:
    // 1. The not found template var, as in "{{var}}".
    // 2. The value returned by the handler (as long as the return value is not an action to delete the key).
    //-----------------------------------------------------------------------------------------------------------------
    notifyReplaceNotFound(keyValueContext, templateVar, key, parentReplaceNotFoundHandler, setActionI) {
        let useValue = templateVar;
        if(parentReplaceNotFoundHandler) {
            // If the value returned by the handler is not an action, we can use the value the handler has sent us
            const actionOrValue = parentReplaceNotFoundHandler(templateVar, key);
            if(!setActionI(actionOrValue))
                useValue = actionOrValue;
        }
        else
            setActionI(this.getActionOnNotFound());

        return useValue;

    }
    //-----------------------------------------------------------------------------------------------------------------
    // Keys can hold replacement parameters, which act as commands
    //-----------------------------------------------------------------------------------------------------------------
    async doInterpolateKey(replaceKeyValues, childObj, key, value){
        let nReplacedKeys = 0;
        let useValue = key;

        for(let i = 0; i < this._nPass; i++) {
            const stringInterpolator = new StringInterpolator(useValue, replaceKeyValues, {
                TrackCurlyBrackets: true, ...this._options,
                ReplaceNotFoundHandler:  (templateVar, key) => {
                    // Return the value to be used as the replace parameter.  Note the caller may set the action,
                    // which may result in this key being deleted on the object (see code below, where we test the
                    // action against the delete value
                    return this.notifyReplaceNotFound(replaceKeyValues, templateVar, key, null,
                        (newActionValue) => undefined);
                }
            });

            const nextReplace = await stringInterpolator.sInterpolate();
            if (nextReplace !== useValue) {
                nReplacedKeys++;
                useValue = nextReplace;
            } else
                break;
        }

        return { nReplacedKeys: nReplacedKeys, key: useValue };

    }
    //-----------------------------------------------------------------------------------------------------------------
    //
    //-----------------------------------------------------------------------------------------------------------------
    async doInterpolateObj(replaceKeyValues, childObj, key, value){
        let nReplacedKeys = 0;
        let useValue = value;
        const parentReplaceNotFoundHandler = this._options.ReplaceNotFoundHandler;
        for(let i = 0; i < this._nPass; i++) {

            // 'action' interface for setting local variable 'action'.  This code is kind of confusing, but,
            // there is a reason for the complexity.  When we call interpolation on the string, the
            // 'StringInterpolator' object, may invoke our handler to inform us it is not able to find a key.
            // There are essentially three possible actions:
            //   1. Do nothing, that is keep the un-replaced templateVar (we do this by returning the templateVar)
            //   2. Return something that we do want to use, a common use case is to return an empty string (for example).
            //   3. Delete the key from the object.  For this action, the client may return a special value to indicate
            //      that we should delete the key.  The problem is we process this return value inside the handler.
            //      To make this work, we check the value in our handler and set the action, which will be used,
            //      later when the handler returns.
            const actionI = new ActionI();

            const stringInterpolator = new StringInterpolator(useValue, replaceKeyValues, {
                TrackCurlyBrackets: true, ...this._options,
                ReplaceNotFoundHandler:  (templateVar, key) => {
                    // Return the value to be used as the replace parameter.  Note the caller may set the action,
                    // which may result in this key being deleted on the object (see code below, where we test the
                    // action against the delete value
                    return this.notifyReplaceNotFound(replaceKeyValues, templateVar, key, parentReplaceNotFoundHandler,
                        (newActionValue) => actionI.setAction(newActionValue));
                }
            });

            let replace = await stringInterpolator.sInterpolate();
            if(actionI.getAction() === ReplaceObjectAction.ACTION_NONE) {
                if (useValue!== replace) {
                    childObj[key] = replace;
                    nReplacedKeys++;
                    useValue = replace;
                } else
                    break;
            }
            else if(actionI.getAction() === ReplaceObjectAction.ACTION_DELETE) {
                delete childObj[key];
                break;
            }
            else if(actionI.getAction() === ReplaceObjectAction.ACTION_THROW) {
                throw new InterpolationValueNotFoundError();
            }
        }

        return nReplacedKeys;
    }
    //-----------------------------------------------------------------------------------------------------------------
    //
    //-----------------------------------------------------------------------------------------------------------------
    getCmdInKey(key) {
        let cmd = KeyCommands.KeyCmdNone;
        if(ObjectInterpolatorBase.isKeyCmd(key, REGX.CMD_KEY_QUEUE_DEL_CHILD_OBJ_IF_EMPTY))
            cmd = KeyCommands.KeyCmdQueueDelChildObjectIfEmpty
        else if(ObjectInterpolatorBase.isKeyCmd(key, REGX.CMD_KEY_COPY_INTO_OBJ))
            cmd = KeyCommands.KeyCmdCopyIntoObject;
        else if(ObjectInterpolatorBase.isKeyCmd(key, REGX.CMD_KEY_COPY_INTO_PARENT_OBJ))
            cmd = KeyCommands.KeyCmdCopyIntoParentObject;

        return cmd;
    }
    //-----------------------------------------------------------------------------------------------------------------
    //
    //-----------------------------------------------------------------------------------------------------------------
    processDeletes(queuedDeletes) {
        queuedDeletes.forEach( (pathDotNotation) => {
            const path = ObjectInterpolatorBase.createObjectPath(pathDotNotation);
            let itObj = this._obj;
            let ownerObj = null;
            let parentKey = "";
            let parentObj = null;
            let childKey = "";
            for(let i = 0; i < path.length; i++) {
                if(i === path.length - 1) {
                    parentKey = childKey;
                    ownerObj = parentObj;
                }
                childKey = path[i];
                parentObj = itObj;
                itObj = itObj[childKey];

            }
            if(parentObj && typeof parentObj === 'object') {
                if(childKey)
                    delete parentObj[childKey];
            }
            if(ownerObj && typeof ownerObj === 'object') {
                if(parentKey && Object.keys(ownerObj[parentKey]).length === 0) {
                    if(Array.isArray(ownerObj))
                        ownerObj.splice(parentKey, 1);
                    else
                        delete ownerObj[parentKey];
                }

            }

        });
    }
    addFlattenPaths(flattenPaths, keys) {
        let currentObj = this._obj;
        let flattenObjs = [];
        if(Array.isArray(currentObj))
                flattenObjs.push(currentObj);
        for(let i = 0; i < keys.length; i++) {
            const key = keys[i];
            currentObj = currentObj[key];
            if(Array.isArray(currentObj))
                flattenObjs.push(currentObj);
            else
                flattenObjs = [];

        }
        for(let i = flattenObjs.length - 1; i >= 0; i--) {
            const flattenObj = flattenObjs[i];
            if(!flattenPaths.has(flattenObj))
                flattenPaths.add(flattenObj);
        }
    }

    //-----------------------------------------------------------------------------------------------------------------
    // return the interface which knows how to index into our object
    //-----------------------------------------------------------------------------------------------------------------
    createKeyValueContextI(keyValues) { return new (this.getOptionKeyValueContextI())(keyValues, this.getOptionKeyValueContextSeparator()); }
    //-----------------------------------------------------------------------------------------------------------------
    //
    //-----------------------------------------------------------------------------------------------------------------
    async interpolate() {
        let nReplacedKeys = 0;

        const queuedDeletes = [];
        let flattenRoot = false;
        const trackParentSetObjects = new Set();
        const flattenPaths = new Set();
        for (const [childObj, key, value, keys, objs] of ObjectInterpolatorBase.iterateObjStrings(this._obj)) {

            // Imagine a nested object - where we may have parameters to replace and where the childObj has some keys
            // which may be used as replacement parameters
            const replaceKeyValues =
                this.createKeyValueContextI({ ...this._keyValues, ...ObjectInterpolatorBase.dupWithoutVars(childObj) });

            const keyReplaceResult = await this.doInterpolateKey(replaceKeyValues, childObj, key, value);
            nReplacedKeys += keyReplaceResult.nReplacedKeys;
            const cmd = this.getCmdInKey(keyReplaceResult.key);
            if((cmd === KeyCommands.KeyCmdNone) ||
                    (cmd === KeyCommands.KeyCmdCopyIntoObject) ||
                    (cmd === KeyCommands.KeyCmdCopyIntoParentObject)) {

                nReplacedKeys += await this.doInterpolateObj(replaceKeyValues, childObj, key, value);

                if (cmd === KeyCommands.KeyCmdCopyIntoObject) {
                    const objCandidate = childObj[key];
                    if ((typeof objCandidate === 'object') && (objCandidate !== null)) {
                        Object.assign(childObj, objCandidate);
                        delete childObj[key];
                    }
                }
                else if(cmd === KeyCommands.KeyCmdCopyIntoParentObject) {
                    // The parent object and the parent key can be found by looking at the objs/keys
                    // (which tracks all iterated objects)
                    const parentObj = objs.length > 1 ? objs[objs.length - 2] : null;
                    const parentKey = keys.length > 0 ? keys[keys.length - 1] : "";

                    if(parentObj && parentKey) {
                        let wasSetOn = false;
                        const objCandidate = childObj[key];
                        if ((typeof objCandidate === 'object') && (objCandidate !== null)) {

                            // Consider the case where we want to load multiple objects to the same element position on
                            // the parent.  (reference Test case **).  This case is when the parentObj is an array
                            const wasPreviouslySetOn = trackParentSetObjects.has(parentObj[parentKey]);
                            if(wasPreviouslySetOn && Array.isArray(objCandidate))
                                parentObj[parentKey].push(...objCandidate);
                            else {
                                if(Array.isArray(parentObj)) {
                                    parentObj[parentKey] = objCandidate;
                                    if(Array.isArray(objCandidate))
                                        trackParentSetObjects.add(parentObj[parentKey]);
                                }
                                else {
                                    ObjectInterpolatorBase.mergeInto(parentObj, objCandidate)
                                    queuedDeletes.push(ObjectInterpolatorBase.createPathDotNotation(keys, key));
                                }
                            }

                            if(Array.isArray(parentObj)) {
                                this.addFlattenPaths(flattenPaths, keys);
                            }

                        }
                    }
                    else
                        throw new Error("No parent object to merge");
                }
                else if(keyReplaceResult.nReplacedKeys > 0) {
                    childObj[keyReplaceResult.key] = childObj[key];
                    delete childObj[key];
                }

            }
            else if(cmd === KeyCommands.KeyCmdQueueDelChildObjectIfEmpty) {
                queuedDeletes.push(ObjectInterpolatorBase.createPathDotNotation(keys, key));
            }
        }
        for(const flattenObj of flattenPaths)
             ObjectInterpolatorBase.mergeInto(flattenObj, flattenObj.flat());

        this.processDeletes(queuedDeletes);

        return { obj: this.getObj(), nReplacedKeys: nReplacedKeys };
    }
}


//---------------------------------------------------------------------------------------------------------------------
//
// Takes a function expression with arguments and returns abstract syntax tree
//
//---------------------------------------------------------------------------------------------------------------------
class ParseFunctionCalls extends BaseAST {
    //-----------------------------------------------------------------------------------------------------------------
    //
    //-----------------------------------------------------------------------------------------------------------------
    constructor(expression, options) {
        super(expression);
        this._options = options;
        this._options.OptionStringArgQuoted = this._options.OptionStringArgQuoted !== undefined ?
            this._options.OptionStringArgQuoted : false;
    }
    getOptionStringArgQuoted() { return this._options.OptionStringArgQuoted; }
    //-----------------------------------------------------------------------------------------------------------------
    // We need to pass over any group of characters enclosed in single quotes, double quotes or array brackets as in:
    //  * 'skip this stuff'
    //  * "skip this stuff"
    //  * [skip this stuff]
    //-----------------------------------------------------------------------------------------------------------------
    skipGroupedChars() {
        let beginChar = this.cAtI();

        // Special token which indicates the start of a group, one of: ' " [
        if(BaseAST.isGroupTokenBegin(beginChar)) {
            let inTokens = [];
            inTokens.push(beginChar);

            // We need to scan ahead until we find the matching end token
            while(this.hasChars() && inTokens.length > 0) {

                // Use the last group token pushed - and skip it
                beginChar = inTokens[inTokens.length - 1];
                this.skip();

                // It is possible that we could have nested group tokens, consider: ["4", "1"]
                while (this.hasChars()) {

                    // 1st - check if we have a matching token to our current beginChar, one of: ' " ]
                    if(this.cAtIIsGroupTokenEnd(beginChar)) {
                        inTokens.pop();
                        break;
                    }
                    else {
                        // 2nd - we can consider that we may have a nested group token, if we do, we will work with this
                        // one until we find its matching end token
                        const newBeginChar = this.cAtI();
                        if (BaseAST.isGroupTokenBegin(newBeginChar)) {
                            beginChar = newBeginChar;
                            inTokens.push(newBeginChar);
                            break;
                        }
                    }
                    // If we got here, we are happily moving along, consuming characters between our start group token
                    // while we attempt to find a matching end to our group
                    this.skip();
                }
            }
            // if we have unmatched ending tokens we should raise and exception
            if(inTokens.length > 0)
                throw new Error(`Parse error - mismatch on some ending symbols: [${inTokens.map((symbol) => `'${symbol}'`).join(",")}]`);
        }
    }
    //-----------------------------------------------------------------------------------------------------------------
    //
    //-----------------------------------------------------------------------------------------------------------------
    skipNonSpecialChars() {
        while (this.hasChars() && !this.cAtIIsWhite() && !this.cAtIOIsOpen() && !this.cAtIOIsClose() && !this.cAtIIsArgSeporator()) {
            this.skip();
        }
    }
    //-----------------------------------------------------------------------------------------------------------------
    //
    //-----------------------------------------------------------------------------------------------------------------
    readToken() {
        this.skipWhitespace();

        let token;
        if (!this.cAtIOIsOpen() && !this.cAtIOIsClose()) {

            // our token should start at this index
            const start = this.getI();

            this.skipGroupedChars();
            this.skipNonSpecialChars();

            // our token should end at this index
            const end = this.getI();

            // slice out our token
            token = this.getExpr().slice(start, end);
        }
        else
            throw new Error(`Parse error - Unexpected '(' or ')' missing function name`);

        return token;
    }
    //-----------------------------------------------------------------------------------------------------------------
    //
    //-----------------------------------------------------------------------------------------------------------------
    parseArguments() {
        let args = [];
        while (this.hasChars() && !this.cAtIOIsClose()) {
            args.push(this.parseExpression());
            this.skipWhitespace();

            if (this.cAtIIsArgSeporator())
                this.skip();  // Skip comma
        }
        return args;
    }
    //-----------------------------------------------------------------------------------------------------------------
    //
    //-----------------------------------------------------------------------------------------------------------------
    parseExpression() {
        let token = this.readToken();

        if (/^true|false$/.test(token)) {
            /* literal true or false */
        }
        else if(/^null$/.test(token)) {
            /* literal null */
        }
        else if (/^[a-zA-Z_ƒ][\w]*$/.test(token)) {
            this.skipWhitespace();

            // make sure we have an open bracket '(' - and skip it
            if (this.cAtIOIsOpen()) {
                /* function name */
                let funcName = token;

                this.skip(); // Skip

                // parse the arguments
                let args = this.parseArguments();

                // make sure we have an open bracket '(' - and skip it
                this.skipWhitespace();
                if (!this.cAtIOIsClose())
                    throw new Error(`Parse error - Expected '(' after function name ${funcName}`);
                this.skip(); // Skip ')'

                return {
                    type: 'FunctionCall',
                    name: funcName,
                    arguments: args
                };
            }
            else if(this.getOptionStringArgQuoted())
                throw new Error(`Parse error - Expected '(' after function name ${token}`);
            else {
                // getting here implies that the token is a string parameter and not a function call, it also means
                // we are missing single quotes around the param.  However, we should have single quotes around
                // string params.  Let's add them
               token = `'${token}'`;
            }
        }

        return {
          type: 'Literal',
          value: token
        };
    }

    //-----------------------------------------------------------------------------------------------------------------
    //
    //-----------------------------------------------------------------------------------------------------------------
    parse() {
        this.notifyParseStart();

        // create the abstract syntax tree
        const asTree =  this.parseExpression();

        this.notifyParseComplete(asTree);

        return asTree;
    }

}

//---------------------------------------------------------------------------------------------------------------------
//
// Derived class handles evaluation of abstract syntax tree
//
//---------------------------------------------------------------------------------------------------------------------
class EvaluateFunctions extends ParseFunctionCalls {
    //-----------------------------------------------------------------------------------------------------------------
    //
    //-----------------------------------------------------------------------------------------------------------------
    static convertNum(value) {
        let result = undefined;
        if((typeof value === 'string') && (value !== '')) {
            const num = Number(value);
            if (!isNaN(num))
                result = num;
        }

        return result;
    }
    //-----------------------------------------------------------------------------------------------------------------
    //
    //-----------------------------------------------------------------------------------------------------------------
    static convertString(value) {
        let result = undefined;
        const matched = value.match(/^['"](.*)['"]$/)
        if(Array.isArray(matched) && (matched.length === 2))
            result = matched[1];
        return result;
    }
    //-----------------------------------------------------------------------------------------------------------------
    //
    //-----------------------------------------------------------------------------------------------------------------
    static convertBool(value) {
        let result = undefined;
        const matched = value.match(/^(true|false)$/)
        if(Array.isArray(matched) && (matched.length === 2))
            result = matched[1] === 'true';
        return result;
    }
    //-----------------------------------------------------------------------------------------------------------------
    //
    //-----------------------------------------------------------------------------------------------------------------
    static convertNull(value) {
        let result = undefined;
        const matched = value.match(/^(null)$/)
        if(Array.isArray(matched) && (matched.length === 2))
            result = matched[1] === 'null' ? null : undefined;
        return result;
    }
    //-----------------------------------------------------------------------------------------------------------------
    //
    //-----------------------------------------------------------------------------------------------------------------
    static convertObj(value) {
        let result = undefined;
        try {
            result = JSON.parse(value);
        }
        catch(er) { throw new Error('Failed to convert value to Json object'); }
        return result;
    }
    //-----------------------------------------------------------------------------------------------------------------
    //
    //-----------------------------------------------------------------------------------------------------------------
    static convertToLiteral(value) {
        let result = value;
        const num = EvaluateFunctions.convertNum(value);
        if(num !== undefined)
            result = num;
        else
        {
            const str = EvaluateFunctions.convertString(value);
            if(str !== undefined)
                result = str;
            else
            {
                const bool = EvaluateFunctions.convertBool(value);
                if(bool !== undefined)
                    result = bool;
                else
                {
                    const nullValue = EvaluateFunctions.convertNull(value);
                    if(nullValue !== undefined)
                        result = nullValue
                    else
                    {
                        try {
                            const obj = EvaluateFunctions.convertObj(value);
                            if (obj !== undefined)
                                result = obj;
                        }
                        catch(er) {
                            if(typeof value === 'string')
                                return value;
                            else
                                throw new Error('Invalid type in convertToLiteral');
                        }
                    }
                }
            }
        }
        return result;
    }
    //-----------------------------------------------------------------------------------------------------------------
    //
    //-----------------------------------------------------------------------------------------------------------------
    static invokeParsedFunction(sender, asTree, context) {

        // If it's a literal, return the value directly
        if (asTree.type === 'Literal')
            return EvaluateFunctions.convertToLiteral(asTree.value);
        else if (asTree.type === 'FunctionCall') {
            const func = context[asTree.name];
            if (typeof func !== 'function')
                throw new Error(`Function ${asTree.name} is not defined in the context`);

            // Recursively evaluate and collect arguments
            const args = asTree.arguments.map(arg => EvaluateFunctions.invokeParsedFunction(sender, arg, context));

            // Invoke the function with the evaluated arguments
            return func(sender, ...args);
        } else {
            throw new Error("Unknown AST node type");
        }
    }

    //-----------------------------------------------------------------------------------------------------------------
    //
    //-----------------------------------------------------------------------------------------------------------------
    constructor(parent, expression, keyValueContext, fContext, options = {}) {
        super(expression, options);
        this._parent = parent;
        this._keyValueContext = keyValueContext;
        this._fContext = fContext;
        this._asTree = null;
    }
    getParent() { return this._parent; }
    getKeyValueContext() { return this._keyValueContext; }

    //-----------------------------------------------------------------------------------------------------------------
    //
    //-----------------------------------------------------------------------------------------------------------------
    parse() {
        this._asTree = super.parse();
        const evaluation =  EvaluateFunctions.invokeParsedFunction(this, this._asTree, this._fContext);
        return evaluation;
    }

}

//---------------------------------------------------------------------------------------------------------------------
//
// Attempts to resolve undefined parameters as embedded function calls, during interpolation.  Any key prepended with
// "->", will be parsed as a function.  For example, interpolation parameters like:
//   {{->Add(1,2)}}
//  Will be parsed as function Add(1,2).  As long as "Add" function exists in provided context, the function will be
//  invoked.  The resulting value will be used as the replacement parameter
//
//---------------------------------------------------------------------------------------------------------------------

class ObjectInterpolator extends ObjectInterpolatorBase {
    static convertToString(value) {
        let result = value;
        if((typeof value === 'number') || (typeof value === 'bigint') ||(typeof value === 'boolean') || (typeof value === 'string'))
            result = value.toString();
        else if(value === null)
            result = 'null';
        else if(value === undefined)
            result = undefined;
        else if(Array.isArray(value))
            result = JSON.stringify(value);
        else
            console.error('Failed to convert to primitive type');

        return result;
    }

    static processExpression(expression) {
        const e = new ExpressionParser(expression);
        return e.evaluate();
    }
    //-----------------------------------------------------------------------------------------------------------------
    //
    //-----------------------------------------------------------------------------------------------------------------
    static getFunctionExpression(expression) {
        let result = "";
        if(expression) {
            const regX = new RegExp(REGX.FUNCTION_TAG)
            const match = regX.exec(expression);
            if(Array.isArray(match) && (match.length === 2))
                result = match[1];
        }

        return result;
    }
    //-----------------------------------------------------------------------------------------------------------------
    //
    //-----------------------------------------------------------------------------------------------------------------
    constructor(obj, keyValues, parseFContext, options = {}) {
        super(obj, keyValues, options);
        this._parseFContext = parseFContext ? parseFContext : {};
        this._buildInFContext = {
            'ƒ': (sender, expression) => ObjectInterpolator.processExpression(expression),
            'Exp': (sender, expression) => ObjectInterpolator.processExpression(expression),
            '_': (sender, value) => ObjectInterpolator.convertToString(value)
        };
    }

    //-----------------------------------------------------------------------------------------------------------------
    //
    //-----------------------------------------------------------------------------------------------------------------
    notifyReplaceNotFound(keyValueContext, templateVar, key, parentReplaceNotFoundHandler, setActionI) {
        const functionExpression = ObjectInterpolator.getFunctionExpression(key);
        if(this._parseFContext && functionExpression) {
            const evaluateF = new EvaluateFunctions(this, functionExpression, keyValueContext,
                {...this._parseFContext, ...this._buildInFContext });
            return evaluateF.parse();
        }
        else {
            return super.notifyReplaceNotFound(keyValueContext, templateVar, key, parentReplaceNotFoundHandler, setActionI);
        }
    }
}

export { ObjectInterpolator, StringInterpolator, ObjectInterpolatorBase, SinglePassTagReplacer, SimpleTagParser,
    InterpolationValueNotFoundError, ReplaceObjectAction, KeyValueContextI, QueryObjKeyValueContextI};

