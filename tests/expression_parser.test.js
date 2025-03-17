import { ExpressionParser } from "../src/expression_parser.js";


function evaluateExpression(expression) {
    const exp = new ExpressionParser(expression);
    return exp.evaluate();
}
describe('Operand Tests', () => {
    it("Should convert", async () => {
        expect(evaluateExpression('1')).toEqual(1);
        expect(evaluateExpression('Infinity')).toEqual(Infinity);
        expect(evaluateExpression('-Infinity')).toEqual(-Infinity);
        expect(evaluateExpression('true')).toEqual(true);
        expect(evaluateExpression('false')).toEqual(false);
    });
});
describe('Equality Logical Equal Tests', () => {
    it("Should apply correct operation", async () => {
        expect(evaluateExpression('true == true')).toEqual(true);
        expect(evaluateExpression('true == false')).toEqual(false);
        expect(evaluateExpression('false == true')).toEqual(false);
        expect(evaluateExpression('false == false')).toEqual(true);
        expect(evaluateExpression('!true')).toEqual(false);
        expect(evaluateExpression('!false')).toEqual(true);
        expect(evaluateExpression('!!true')).toEqual(true);
        expect(evaluateExpression('!!false')).toEqual(false);
    });
});
describe('Equality Logical Not Equal Tests', () => {
    it("Should apply correct operation", async () => {
        expect(evaluateExpression('true != true')).toEqual(false);
        expect(evaluateExpression('true != false')).toEqual(true);
        expect(evaluateExpression('false != true')).toEqual(true);
        expect(evaluateExpression('false != false')).toEqual(false);
    });
});
describe('Equality Numerical Equal Tests', () => {
    it("Should apply correct operation", async () => {
        expect(evaluateExpression('1.1 == 1.1')).toEqual(true);
        expect(evaluateExpression('1.1 == 0')).toEqual(false);
        expect(evaluateExpression('0 == 1.1')).toEqual(false);
        expect(evaluateExpression('0 == 0')).toEqual(true);
    });
});
describe('Equality Numerical Not Equal Tests', () => {
    it("Should apply correct operation", async () => {
        expect(evaluateExpression('1.1 != 1.1')).toEqual(false);
        expect(evaluateExpression('1.1 != 0')).toEqual(true);
        expect(evaluateExpression('0 != 1.1')).toEqual(true);
        expect(evaluateExpression('0 != 0')).toEqual(false);
    });
});
describe('Equality Numerical greater & less', () => {
    it("Should apply correct operation", async () => {
        expect(evaluateExpression('1.1 <= 1.1')).toEqual(true);
        expect(evaluateExpression('1.1 >= 1.1')).toEqual(true);
        expect(evaluateExpression('5.2 > 1.1')).toEqual(true);
        expect(evaluateExpression('1.5 < 9')).toEqual(true);
    });
});
describe('math', () => {
    it("Can do basic math", async () => {
        expect(evaluateExpression('1 - -2 + 4 / 6 * (1.7 + 200) - 3 /2')).toBeCloseTo(135.966666666);
        expect(evaluateExpression('-100 - -6 - (-2 - -4)')).toEqual(-96);
        expect(evaluateExpression('(-100 - -6 - (-2 - -4) - 4) * -1')).toEqual(100);
    });
    it("Can do math with inequality", async () => {
        expect(evaluateExpression('((1 - -2 + 4 / 6 * (1.7 + 200) - 3 /2) - (2/3) - 0.3) == 134.99999999999997')).toEqual(true);
        expect(evaluateExpression('(-100 - -6 - (-2 - -4)) == -96')).toEqual(true);
        expect(evaluateExpression('(-100 - -6 - (-2 - -4) - 4) * -1 == 100')).toEqual(true);
    });
    it("Should do handle Infinity", async () => {
        expect(evaluateExpression('(4 / 0 == Infinity)')).toEqual(true);
        expect(evaluateExpression('(-4 / 0 == -Infinity)')).toEqual(true);
    });
});

describe("Logical operators", () => {
    it("Math is reasonable", async () => {
        expect(evaluateExpression('((4 * -1) == -4) && (-1 != -1)')).toEqual(false);
        expect(evaluateExpression('(4 < 2) || (2 < 4)')).toEqual(true);
        expect(evaluateExpression('(2 < 4) || 4 < 2')).toEqual(true);
        expect(evaluateExpression('(4 < 2) && (2 < 4)')).toEqual(false);
        expect(evaluateExpression('((4 * -1) == -4) && (-1 == -1)')).toEqual(true);
        expect(evaluateExpression('((4 * -1) == -4) && (1 * -1) == -1')).toEqual(true);
        expect(evaluateExpression('((4 * -1) == -4) && (1 * -1) != -1')).toEqual(false);
        expect(evaluateExpression('((4 * -1) == -4) || (1 * -1) != -1')).toEqual(true);
    });
    it("Math is not reasonable", async () => {
        expect(evaluateExpression('!(((4 * -1) == -4) && (-1 != -1))')).toEqual(true);
        expect(evaluateExpression('!((4 < 2) || (2 < 4))')).toEqual(false);
        expect(evaluateExpression('!((2 < 4) || 4 < 2)')).toEqual(false);
        expect(evaluateExpression('!((4 < 2) && (2 < 4))')).toEqual(true);
        expect(evaluateExpression('!(((4 * -1) == -4) && (-1 == -1))')).toEqual(false);
        expect(evaluateExpression('!(((4 * -1) == -4) && (1 * -1) == -1)')).toEqual(false);
        expect(evaluateExpression('!(((4 * -1) == -4) && (1 * -1) != -1)')).toEqual(true);
        expect(evaluateExpression('!(((4 * -1) == -4) || (1 * -1) != -1)')).toEqual(false);
    });

});
describe("Ternary", () => {
    it("Simple Ternary", async () => {
        expect(evaluateExpression('true ? 4 : 5')).toEqual(4);
        expect(evaluateExpression('false ? 4 : 5')).toEqual(5);
        expect(evaluateExpression('false ? 4 : 2 * 10')).toEqual(20);

    });
    it("Complex Ternary", async () => {
        expect(evaluateExpression('true ? ((-100 - -6 - (-2 - -4) - 4) * -1) : 10')).toEqual(100);
        expect(evaluateExpression('false ? 4 : (-100 - -6 - (-2 - -4) - 4) * -1')).toEqual(100);

        expect(evaluateExpression('(5 == 5) ? ((2 == 2) ? true : false) : 0')).toEqual(true);
        expect(evaluateExpression('(5 == 1) ? ((2 == 2) ? true : false) : 0')).toEqual(0);
    });
});

describe("Strings", () => {
    it("Should handle strings", async () => {
        expect(evaluateExpression("false ? 'abc' : '5'")).toEqual("5");
        expect(evaluateExpression("true ? 'abc' : 'def'")).toEqual("abc");
        expect(evaluateExpression("'abc' == 'abc'")).toEqual(true);
        expect(evaluateExpression("'abc' != 'cabc'")).toEqual(true);

        expect(evaluateExpression("false ? 'abc' : 'def'")).toEqual("def");
        expect(evaluateExpression('false ? "abc" : "def"')).toEqual("def");
    });

});