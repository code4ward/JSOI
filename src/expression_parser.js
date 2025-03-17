
//---------------------------------------------------------------------------------------------------------------------
// Exceptions
//---------------------------------------------------------------------------------------------------------------------
class ExpressionParseError extends Error { constructor(reason){ super(reason); } }

const REGX = Object.freeze({
    OPERAND_NUMBERS: '-*\\d+(\\.\\d*)*',
    OPERAND_STRING: "(?:'|\")[^'\"]*(?:'|\")",
    OPERAND_LOGICAL_TRUE: 'true',
    OPERAND_LOGICAL_FALSE: 'false',
    OPERAND_POS_INFINITY: 'Infinity',
    OPERAND_NEG_INFINITY: '-Infinity',
    MATH_OPERATORS: '\\+|\\-|\\*|\\/|\\^|\\(|\\)',
    TERNARY_OPERATORS: '\\?|\\:',
    LOGICAL_OPERATORS: '\\|\\||&&|==|!=|!',
    EQUALITY_OPERATORS: '>=|<=|>|<'
});


// --------------------------------------------------------------------------------------------------------------------
//
// Stack implementation
//
// --------------------------------------------------------------------------------------------------------------------
class Stack {
    // ----------------------------------------------------------------------------------------------------------------
    //
    // ----------------------------------------------------------------------------------------------------------------
    constructor() { this._values = []; }

    // ----------------------------------------------------------------------------------------------------------------
    //
    // ----------------------------------------------------------------------------------------------------------------
    get size() { return this._values.length; }
    empty() { return this.size === 0; }
    peek() { return this.empty() ? undefined : this._values[this._values.length - 1]; }

    // ----------------------------------------------------------------------------------------------------------------
    //
    // ----------------------------------------------------------------------------------------------------------------
    push(value) { this._values.push(value); }
    pop() { return this.empty() ? undefined : this._values.pop(); }
    popN(n) {
        const result = [];
        if (this.size >= n) {
            for (let i = 0; i < n; i++)
                result.unshift(this.pop());
        }
        return result;
    }
}
//---------------------------------------------------------------------------------------------------------------------
//
// Working with operators
//
//---------------------------------------------------------------------------------------------------------------------

//---------------------------------------------------------------------------------------------------------------------
// To number
//---------------------------------------------------------------------------------------------------------------------
function toNum(s) {
    const result = parseFloat(s);
    if(!isNaN(result))
        return result;
    else
        throw new ExpressionParseError(`Failed to convert ${s} to number`);
}
//---------------------------------------------------------------------------------------------------------------------
// To boolean
//---------------------------------------------------------------------------------------------------------------------
function toBool(s) {
    if((s === 'true') || (s === true))
        return true;
    else if((s === 'false') || (s === false))
        return false;
    else
        throw new ExpressionParseError(`Failed to convert ${s} to boolean`);
}
//---------------------------------------------------------------------------------------------------------------------
// To number
//---------------------------------------------------------------------------------------------------------------------
function extractStrOperand(s) {
    return s.slice(1, s.length - 1)

}
function toStr(s) {
    function isQuote(char) { return (char === "'") || (char === '"'); }
    let result = s.trim();
    if(result.length > 1) {
        const firstChar = result[0];
        const lastChar = result[result.length - 1];
        if( !isQuote(firstChar) && !isQuote(lastChar))
            throw new ExpressionParseError(`String expression ${s} must be enclosed in single quotes`);
    }
    else
        throw new ExpressionParseError(`Failed to convert ${s} to number`);

    return result;
}
//---------------------------------------------------------------------------------------------------------------------
// To supported operand
//---------------------------------------------------------------------------------------------------------------------
function toOperand(s) {
    try {
        return toNum(s);
    }
    catch(er) {
        try {
            return toBool(s);
        }
        catch(er) {
            return toStr(s);
        }
    }
}

//---------------------------------------------------------------------------------------------------------------------
// Converts both a and b to expected types
//---------------------------------------------------------------------------------------------------------------------
function toTypePair(a, b) {
    const va = toOperand(a);
    const vb = toOperand(b)
    if(typeof va === typeof vb)
        return [va, vb];
    else
        throw new ExpressionParseError(`Cannot operate on parameters with different types ${a} <??> ${b}`);
}

//---------------------------------------------------------------------------------------------------------------------
//
// Information on all supported operators
//
//---------------------------------------------------------------------------------------------------------------------
const operatorData = {
    '?': { precedence: 0, associativity: 'R', NArgs: 0, f:function() { throw new ExpressionParseError('Ternary if mismatched'); } },
    ':': { precedence: 0, associativity: 'R', NArgs: 2, f:function() { throw new ExpressionParseError('Ternary else if mismatched'); } },
    '?:': { precedence: 1, associativity: 'R', NArgs: 3, f:function(a, b, c) { return toBool(a) ? toOperand(b) : toOperand(c); } },
    '^': { precedence: 2, associativity: 'R', NArgs: 2, f:function(a, b) { return toNum(a) ** toNum(b); } },
    '+': { precedence: 4, associativity: 'L', NArgs: 2, f:function(a, b) { return toNum(a) + toNum(b); } },
    '-': { precedence: 4, associativity: 'L', NArgs: 2, f:function(a, b) { return toNum(a) - toNum(b); } },
    '*': { precedence: 3, associativity: 'L', NArgs: 2, f:function(a, b) { return toNum(a) * toNum(b); } },
    '/': { precedence: 3, associativity: 'L', NArgs: 2, f:function(a, b) { return toNum(a) / toNum(b); } },

    '==': { precedence: 7, associativity: 'L', NArgs: 2, f:function(a, b) {
        const [va, vb] = toTypePair(a, b);
        return va === vb;
    } },
    '!=': { precedence: 7, associativity: 'L', NArgs: 2, f:function(a, b) {
        const [va, vb] = toTypePair(a, b);
        return va !== vb;
    } },
    '!': { precedence: 2, associativity: 'R', NArgs: 1, f:function(a) {
        return !toBool(a);
    } },
    '&&': { precedence: 11, associativity: 'L', NArgs: 2, f:function(a, b) { return toBool(a) && toBool(b); } },
    '||': { precedence: 12, associativity: 'L', NArgs: 2, f:function(a, b) { return toBool(a) || toBool(b); } },
    '>=': { precedence: 6, associativity: 'L', NArgs: 2, f:function(a, b) { return toNum(a) >= toNum(b); } },
    '<=': { precedence: 6, associativity: 'L', NArgs: 2, f:function(a, b) { return toNum(a) <= toNum(b); } },
    '>': { precedence: 6, associativity: 'L', NArgs: 2, f:function(a, b) { return toNum(a) > toNum(b); } },
    '<': { precedence: 6, associativity: 'L', NArgs: 2, f:function(a, b) { return toNum(a) < toNum(b); } },
};
const operatorKeys = Object.keys(operatorData);

//---------------------------------------------------------------------------------------------------------------------
//
// Implementation of Shunting Yard
//
//---------------------------------------------------------------------------------------------------------------------
class InfixNotationParser {
    // ----------------------------------------------------------------------------------------------------------------
    //
    // ----------------------------------------------------------------------------------------------------------------
    constructor(expression) {
        this._expression = expression;
        this._isOperand =
            new RegExp(`^${REGX.OPERAND_STRING}$|^${REGX.OPERAND_NUMBERS}$|^${REGX.OPERAND_LOGICAL_TRUE}$|^${REGX.OPERAND_LOGICAL_FALSE}$|^${REGX.OPERAND_POS_INFINITY}$|^${REGX.OPERAND_NEG_INFINITY}$`);

        this._regXParseExpression =
            new RegExp(`${REGX.OPERAND_STRING}|${REGX.OPERAND_LOGICAL_TRUE}|${REGX.OPERAND_LOGICAL_FALSE}|${REGX.OPERAND_POS_INFINITY}|${REGX.OPERAND_NEG_INFINITY}|${REGX.OPERAND_NUMBERS}|${REGX.MATH_OPERATORS}|${REGX.LOGICAL_OPERATORS}|${REGX.EQUALITY_OPERATORS}|${REGX.TERNARY_OPERATORS}`,'g');
    }
    // ----------------------------------------------------------------------------------------------------------------
    //
    // ----------------------------------------------------------------------------------------------------------------
    isOperator(token) { return operatorKeys.includes(token); }
    getOperator(token) { return operatorData[token]; }
    isAssociative(token, type) { return this.getOperator(token).associativity === type; }
    comparePrecedence(op1, op2) { return this.getOperator(op1).precedence - this.getOperator(op2).precedence; }
    hasHigherPrecedence(op1, op2) { return this.comparePrecedence(op1, op2) < 0; }
    hasLowerPrecedence(op1, op2) { return this.comparePrecedence(op1, op2) > 0; }
    hasSamePrecedence(op1, op2) { return this.comparePrecedence(op1, op2) === 0; }
    tokenize() { return this._expression.match(this._regXParseExpression); }
    isOperand(token) { return this._isOperand.test(token); }

    // ----------------------------------------------------------------------------------------------------------------
    //
    // ----------------------------------------------------------------------------------------------------------------
    toPostfix() {
        const outputQueue = [];
        const tokens = this.tokenize();

        if(Array.isArray(tokens)) {
            const operatorStack = new Stack();
            tokens.forEach(token => {
                // 1. If the incoming symbols is an operand - push to outputQueue
                if (this.isOperand(token)) {
                    outputQueue.push(token);
                }
                // 2. If the incoming symbol is a left parenthesis, push it on the stack.
                else if (token === '(') {
                    operatorStack.push(token);
                }
                // 3. If the incoming symbol is a right parenthesis: discard the right parenthesis, pop and print the stack
                //    symbols until you see a left parenthesis.
                else if (token === ')') {
                    while (operatorStack.size > 0 && operatorStack.peek() !== '(') {
                        outputQueue.push(operatorStack.pop());
                    }
                    // If there is a left parenthesis - discard it.
                    if ((operatorStack.size > 0) && (operatorStack.peek() === '('))
                        operatorStack.pop();
                    else
                        throw new ExpressionParseError(`Missing open parenthesis in expression`);
                }
                // If the incoming symbol is an operator...
                else if (this.isOperator(token)) {
                    let topOperatorStack = operatorStack.peek();

                    // 4. If the stack is empty or contains a left parenthesis on top or the incoming symbol is a ternary
                    //    begin if
                    if (operatorStack.empty() || (topOperatorStack === "(") || token === "?") {
                        operatorStack.push(token);
                    }
                    // 5. Handle possible ternary operator
                    else if(token === ':') {
                        // Both ternary if ("?") and else (":") will never appear in the output.  The goal is to reverse
                        // these symbols to RPN format: 'true a b ?:' or 'false a b ?:'.  The rule therefore is, when
                        // finding the else branch (":") of the ternary operator, we pop inclusively to the start if
                        // symbol ("?"), this goes to the output, then we follow this with the ending RPN ternary
                        // operator "?:"
                        // see also https://stackoverflow.com/questions/35609168/extending-the-shunting-yard-algorithm-to-support-the-conditional-ternary-operato
                        // which goes over this in an example:
                        // * "?" ternary-open-if
                        // * ":" ternary-else
                        // * "?:" ternary-closed-if (note this is a dummy symbol, could be anything).  If this symbol is needed in your expression you should
                        // update this parser and set it to a different unused symbol.
                        let poppedSymbol = null;
                        while(!operatorStack.empty()) {
                            poppedSymbol = operatorStack.pop();
                            if(poppedSymbol === '?') {
                                operatorStack.push('?:');
                                break;
                            }
                            else
                                outputQueue.push(poppedSymbol);
                        }
                        if(poppedSymbol !== "?")
                            throw new ExpressionParseError('Missing ternary ? symbol');
                    }
                    // 6. If the incoming operator has either higher precedence than the operator on the top of the stack,
                    //    or has the same precedence as the operator on the top of the stack and is right associative
                    else if ((this.hasHigherPrecedence(token, topOperatorStack)) ||
                        (this.hasSamePrecedence(token, topOperatorStack) && this.isAssociative(token, 'R'))) {
                        operatorStack.push(token);
                    } else {
                        // 7. If the incoming operator has either lower precedence than the operator on the top of the stack,
                        //    or has the same precedence as the operator on the top of the stack and is left associative
                        //      -- continue to pop the stack until this is not true. Then, push the incoming operator.
                        while (topOperatorStack && (topOperatorStack !== '(') && (this.hasLowerPrecedence(token, topOperatorStack) ||
                            (this.hasSamePrecedence(token, topOperatorStack) && this.isAssociative(token, 'L')))) {
                            outputQueue.push(operatorStack.pop());
                            topOperatorStack = operatorStack.peek();
                        }
                        operatorStack.push(token);
                    }
                }
            });

            // Last push any remaining symbols to the outputQueue
            while (operatorStack.size > 0) {
                const operator = operatorStack.pop()
                if (operator !== '(')
                    outputQueue.push(operator);
                else
                    throw new ExpressionParseError(`Missing closing parenthesis in expression`);
            }
        }
        else
            throw new ExpressionParseError('Parsing expression resulted in an empty parse');

        return outputQueue;
    }
}

//---------------------------------------------------------------------------------------------------------------------
//
// Parse and evaluate passed in expression
//
//---------------------------------------------------------------------------------------------------------------------
class ExpressionParser extends InfixNotationParser {
    // ----------------------------------------------------------------------------------------------------------------
    //
    // ----------------------------------------------------------------------------------------------------------------
    constructor(expression) {
        super(expression);
    }
    // ----------------------------------------------------------------------------------------------------------------
    //
    // ----------------------------------------------------------------------------------------------------------------
    evaluate() {
        const postFix = this.toPostfix();
        const stack = new Stack();
        for(let i = 0; i < postFix.length; i++) {
            const token = postFix[i];
            if(this.isOperator(token)) {
                const operator = this.getOperator(token);
                if(stack.size >= operator.NArgs) {
                    const args = stack.popN(operator.NArgs);
                    const result = operator.f(...args);
                    stack.push(result);
                }
                else
                    throw new ExpressionParseError(`Not enough args for operator ${token}`)
            }
            else
                stack.push(token);
        }
        if(stack.size === 1) {
            let result = toOperand(stack.pop());

            // If the type is a string remove single quotes
            if(typeof result === 'string')
                result = extractStrOperand(result);
            return result;

        }
        else
            throw new ExpressionParseError(`Resulting stack appears incorrect with size ${stack.size}`);
    }
}
export { ExpressionParser, ExpressionParseError};
