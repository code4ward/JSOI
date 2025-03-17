import { performance } from 'perf_hooks'
import {wait} from "./utils.js"
import {
    ObjectInterpolator,
    StringInterpolator,
    ReplaceObjectAction,
    SinglePassTagReplacer,
    SimpleTagParser,
    QueryObjKeyValueContextI,
    ObjectInterpolatorBase
} from "../src/interpolation_objects.js";
function test() {
    const abv = "Abc";
    const fetchData = {
                PResponses: [],
                Indexes: [],
                Remove: [],
                DataProcessor: async function () {
                    console.log(this.PResponses);
                    console.log(this.Indexes);
                    console.log(abv);
                }
            };
    fetchData.DataProcessor();
}
describe('Test template Var', () => {
    it("Contains template Var", async () => {
        const testString = "{{ABC}}";
        expect( ObjectInterpolatorBase.containsTemplateVar(testString)).toBe(true);

    });
    it("Does not Contains template Var", async () => {
        const testString = "ABC";
        expect( ObjectInterpolatorBase.containsTemplateVar(testString)).toBe(false);

    });
    it("Contains complex template Var", async () => {
        const testString = "Junk {{ {{ ABC}} }}";
        expect( ObjectInterpolatorBase.containsTemplateVar(testString)).toBe(true);

    });

});

describe('Simple Interpolation tests', () => {
    test();
    it("Basic Types Interpolation Test", async () => {
        const obj = {
            One: "{{One}}",
            Two: "{{Two}}",
            Three: "{{Three}}",
            String: "{{String}}",
            Number: "{{Number}}",
            Bool: "{{Bool}}",
            Null: "{{Null}}",
            Array: "{{Array}}",
            Obj: "{{Obj}}",
            WeirdKey1: "{{-Key-}}",
            WeirdKey2: "{{ @Key }}"
        }
        const oi = new ObjectInterpolator(obj, {
            One: 1,
            Two: 2,
            Three: 3,
            String: "this is a simple string",
            Number: 43,
            Bool: true,
            Null: null,
            Array: ['1','2','3','4', 5, 6],
            Obj: {Test:"A", B: "B"},
            "-Key-": "this is a test1",
            "@Key": "this is a test2"
        },{})
        const iResult = await oi.interpolate();
        expect(iResult.nReplacedKeys).toBe(11);
        expect(obj).toMatchObject({
            One: 1,
            Two: 2,
            Three: 3,
            String: "this is a simple string",
            Number: 43,
            Bool: true,
            Null: null,
            Array: ['1','2','3','4', 5, 6],
            Obj: {Test:"A", B: "B"},
            WeirdKey1: "this is a test1",
            WeirdKey2: "this is a test2"
        });
    });

    it("Cascading Multi keyed interpolation Test", async () => {
        // note object key order is important here, to handle out of order keys would require a second pass as in below
        const obj = {
            AllNumbers: "{{ FirstN }} {{SecondN}} {{ThirdN}}",
            AllNumbersAndSomething: "{{AllNumbers}} and {{Something}}",
            AllNumbersAndSomethingAndNothing: "{{AllNumbersAndSomething}} and {{Nothing}}"
        }
        const oi = new ObjectInterpolator(obj, {
            FirstN: 1,
            SecondN: 2,
            ThirdN: 3,
            Something: "Something",
            Nothing: "Nothing",
        }, {});
        const iResult = await oi.interpolate();

        expect(iResult.nReplacedKeys).toBe(3);
        expect(obj).toMatchObject({
            AllNumbers: "1 2 3",
            AllNumbersAndSomething: "1 2 3 and Something",
            AllNumbersAndSomethingAndNothing: "1 2 3 and Something and Nothing"
        });
    });
    it("Cascading Multi keyed interpolation Test out of order", async () => {
        // note object key order is important here, to handle out of order keys would require a second pass as in below
        const obj = {
            AllNumbersAndSomethingAndNothing: "{{AllNumbersAndSomething}} and {{Nothing}}",
            AllNumbersAndSomething: "{{AllNumbers}} and {{Something}}",
            AllNumbers: "{{ FirstN }} {{SecondN}} {{ThirdN}}",
            NoMatch: "{{NoMatch}}",
        }
        const oi = new ObjectInterpolator(obj, {
            FirstN: 1,
            SecondN: 2,
            ThirdN: 3,
            Something: "Something",
            Nothing: "Nothing",
        }, {});


        let nReplacedKeys = 0;
        let nIterations = 0;
        do {
            nReplacedKeys = (await oi.interpolate()).nReplacedKeys;
            nIterations++;
        } while(nReplacedKeys > 0);
        expect(nIterations).toBe(4);
        expect(obj).toMatchObject({
            AllNumbers: "1 2 3",
            AllNumbersAndSomething: "1 2 3 and Something",
            AllNumbersAndSomethingAndNothing: "1 2 3 and Something and Nothing",
            NoMatch: "{{NoMatch}}",
        });
    });

    it("Cascading Nested Multi keyed interpolation Test",  async () => {
        const obj = {
            Nested1: {
                AllNumbers: "{{ FirstN }} {{SecondN}} {{ThirdN}}",
                AllNumbersAndSomething: "{{AllNumbers}} and {{Something}}",
                UseMeLater: "Don't use this later - higher level variables not currently copied into keyValues",
                Nested2: {
                    UseMeLater: "Use this one",
                    UseMe: "{{UseMeLater}}"
                }
            }
        }
        const oi = new ObjectInterpolator(obj, {
            FirstN: 1,
            SecondN: 2,
            ThirdN: 3,
            Something: "Something",
            Nothing: "Nothing",
        }, {});
        const iResult = await oi.interpolate();
        expect(iResult.nReplacedKeys).toBe(3);
        expect(obj).toMatchObject({
            Nested1: {
                AllNumbers: "1 2 3",
                AllNumbersAndSomething: "1 2 3 and Something",
                UseMeLater: "Don't use this later - higher level variables not currently copied into keyValues",
                Nested2: {
                    UseMeLater: "Use this one",
                    UseMe: "Use this one"
                }

            }
        });
    });

    it("Unmatched Test template vars remains",  async () => {
        const obj = {
            FirstN: "{{FirstN}}",
            Another: "{{Unmatched}}",
        }

        const oi = new ObjectInterpolator(obj, {
                FirstN: 1,
        }, {});
        const iResult = await oi.interpolate();
        expect(iResult.nReplacedKeys).toBe(1);
        expect(obj).toMatchObject({
            FirstN: 1,
            Another: "{{Unmatched}}",
        });

    });
    it("Nested Unmatched Test template vars remains",  async () => {
        const obj = {
            FirstN: "{{ {{FirstN}} }}",
            Another: "{{ {{Unmatched}} }}",
        }

        const oi = new ObjectInterpolator(obj, {
                FirstN: "Junk",
                Unmatched: "Fun"
        }, {});
        const iResult = await oi.interpolate();
        expect(iResult.nReplacedKeys).toBe(2);
        expect(obj).toMatchObject({
            FirstN: "{{ Junk }}",
            Another: "{{ Fun }}",
        });

    });

    it("Unmatched Test template vars set to empty string",  async () => {
        const obj = {
            FirstN: "{{FirstN}}",
            Another: "{{Unmatched}}",
        }

        const oi = new ObjectInterpolator(obj, {
                FirstN: 1,
        }, {}, {
            ReplaceNotFoundHandler: (templateVar, key) => ''
        });
        const iResult = await oi.interpolate();
        expect(iResult.nReplacedKeys).toBe(2);
        expect(obj).toMatchObject({
            FirstN: 1,
            Another: "",
        });

    });
    it("Unmatched Test template vars delete",  async () => {
        const obj = {
            FirstN: "{{FirstN}}",
            Another: "{{Unmatched}}",
        }

        const oi = new ObjectInterpolator(obj, {
                FirstN: 1,
        }, {}, {
            ReplaceNotFoundHandler: (templateVar, key) => ReplaceObjectAction.ACTION_DELETE
        });
        const iResult = await oi.interpolate();
        expect(iResult.nReplacedKeys).toBe(1);
        expect(obj).toMatchObject({
            FirstN: 1,
        });

    });
    it("Nested Interpolation Case A - 2 deep",  async () => {
        const obj = {
            NestedValue: "{{{{Start}}Value1}}",
        }

        const oi = new ObjectInterpolator(obj, {
                Start: "Begin",
                BeginValue1: 1,
        }, {});
        const iResult = await oi.interpolate();
        expect(iResult.nReplacedKeys).toBe(2);
        expect(obj).toMatchObject({
            NestedValue: 1
        });
    });
    it("Nested Interpolation Case B - 2 deep middle",  async () => {
        const obj = {
            Nested: "{{The{{Mid}}Value}}",
        }
        const oi = new ObjectInterpolator(obj, {
                Mid: "Center",
                TheCenterValue: 5,
        }, {});
        const iResult = await oi.interpolate();
        expect(iResult.nReplacedKeys).toBe(2);
        expect(obj).toMatchObject({
            Nested: 5
        });
    });
    it("Nested Interpolation Outer not found",  async () => {
        const obj = {
            Nested: "{{{{Start}}Value1}}",
        }
        const oi = new ObjectInterpolator(obj, {
                Start: "Begin",
                BeginValue2: 1,
        }, {});
        const iResult = await oi.interpolate();
        expect(iResult.nReplacedKeys).toBe(1);
        expect(obj).toMatchObject({
            Nested: "{{BeginValue1}}"
        });
    });
    it("Should copy object then interpolate", async () => {
        const obj = {
            One: "{{One}}",
            Two: "{{Two}}",
            Three: "{{Three}}",
            String: "{{String}}",
            Number: "{{Number}}",
            Bool: "{{Bool}}",
            Null: "{{Null}}",
            Array: "{{Array}}",
            Obj: "{{Obj}}"
        }
        const oi = new ObjectInterpolator(obj, {
            One: 1,
            Two: 2,
            Three: 3,
            String: "this is a simple string",
            Number: 43,
            Bool: true,
            Null: null,
            Array: ['1','2','3','4', 5, 6],
            Obj: {Test:"A", B: "B"}
        },{}, {CopyObj: true});
        const { obj: objCpy, nReplacedKeys} = await oi.interpolate();
        expect(nReplacedKeys).toBe(9);
        expect(objCpy).toMatchObject({
            One: 1,
            Two: 2,
            Three: 3,
            String: "this is a simple string",
            Number: 43,
            Bool: true,
            Null: null,
            Array: ['1','2','3','4', 5, 6],
            Obj: {Test:"A", B: "B"}
        });
        expect(obj).toMatchObject({
            One: "{{One}}",
            Two: "{{Two}}",
            Three: "{{Three}}",
            String: "{{String}}",
            Number: "{{Number}}",
            Bool: "{{Bool}}",
            Null: "{{Null}}",
            Array: "{{Array}}",
            Obj: "{{Obj}}"
        });
    });

});
describe('Object array tests and loading structured data', () => {
    it("Simple Object Array",  async () => {
        const obj = [
            {
                AllNumbers: "{{ FirstN }} {{SecondN}} {{ThirdN}}",
            },
            {
                Plus1: 1,
                AllNumbers: "{{ FirstN }} {{SecondN}} {{ThirdN}} {{Plus1}}",
            }
        ]
        const oi = new ObjectInterpolator(obj, {
            FirstN: 1,
            SecondN: 2,
            ThirdN: 3,

        }, {});
        const iResult = await oi.interpolate();
        expect(iResult.nReplacedKeys).toBe(2);
        expect(obj).toMatchObject([
            {
                AllNumbers: "1 2 3"
            },
            {
                AllNumbers: "1 2 3 1"
            }
        ]);
    });
    it("Load Structured object",  async () => {
        const obj = [
            {
                Obj: '{{->loadObj({{FirstN}})}}'
            },
            {
                Obj: '{{->loadObj({{SecondN}})}}'
            }
        ]
        const oi = new ObjectInterpolator(obj, {
            FirstN: 10,
            SecondN: 11
        }, { loadObj: (sender, n) => { return {A:n, B:"2", C:{D:"Yes"}}; } });
        const iResult = await oi.interpolate();
        expect(iResult.nReplacedKeys).toBe(4);
        expect(obj).toMatchObject([
            {
                Obj: {A:10, B:"2", C:{D:"Yes"}}
            },
            {
                Obj: {A:11, B:"2", C:{D:"Yes"}}
            }
        ]);
    });
    it("Load Structured object into object",  async () => {
        const obj = [
            {
                "<-": '{{->loadObj({{FirstN}})}}'
            },
            {
                "<-": '{{->loadObj({{SecondN}})}}'
            }
        ]
        const oi = new ObjectInterpolator(obj, {
            FirstN: 10,
            SecondN: 11
        }, { loadObj: (sender, n) => { return {A:n, B:"2", C:{D:"Yes"}}; } });
        const iResult = await oi.interpolate();
        expect(iResult.nReplacedKeys).toBe(4);
        expect(obj).toMatchObject([
            {A:10, B:"2", C:{D:"Yes"}},
            {A:11, B:"2", C:{D:"Yes"}}
        ]);
    });

    it("Interpolate on keys - with function",  async () => {
        const obj = {
            a: {
                "<--": "{{->loadObj({{Key}}, SELLER_LN1)}}"
            }
        }

        const oi = new ObjectInterpolator(obj, {
            Key: "SellerData.LastName1",

        },  { loadObj: (sender, key, value) => { return {[key]: value }; }});
        const iResult = await oi.interpolate();
        expect(iResult.nReplacedKeys).toBe(2);
        expect(obj).toMatchObject({
            "SellerData.LastName1": "SELLER_LN1"
        });
    });
    it("Interpolate on keys - normal",  async () => {
        const obj = {

            "{{ Key }}": "SELLER_LN1"
        }

        const oi = new ObjectInterpolator(obj, {
            Key: "SellerData.LastName1",

        },  { });
        const iResult = await oi.interpolate();
        expect(iResult.nReplacedKeys).toBe(1);
        expect(obj).toMatchObject({
            "SellerData.LastName1": "SELLER_LN1"
        });
    });

    it("Load Structured object conditional into array, empty not loaded object removed",  async () => {
        const obj = [
            {
                "<-{{ShouldLoadFirst}}": '{{->loadObj({{FirstN}})}}'
            },
            {
                "<-{{ShouldLoadSecond}}": '{{->loadObj({{SecondN}})}}'
            }
        ]
        const oi = new ObjectInterpolator(obj, {
            ShouldLoadFirst: false,
            ShouldLoadSecond: true,
            FirstN: 10,
            SecondN: 11
        }, { loadObj: (sender, n) => { return {A:n, B:"2", C:{D:"Yes"}}; } });
        const iResult = await oi.interpolate();
        expect(iResult.nReplacedKeys).toBe(4);
        expect(obj).toMatchObject([
            {A:11, B:"2", C:{D:"Yes"}}
        ]);
    });
    it("Load Structured object conditional into array, non empty object remains",  async () => {
        const obj = [
            {
                "<-{{ShouldLoadFirst}}": '{{->loadObj({{FirstN}})}}',
                Data: "Keep this object around"
            },
            {
                "<-{{ShouldLoadSecond}}": '{{->loadObj({{SecondN}})}}'
            }
        ]
        const oi = new ObjectInterpolator(obj, {
            ShouldLoadFirst: false,
            ShouldLoadSecond: true,
            FirstN: 10,
            SecondN: 11
        }, { loadObj: (sender, n) => { return {A:n, B:"2", C:{D:"Yes"}}; } });
        const iResult = await oi.interpolate();
        expect(iResult.nReplacedKeys).toBe(4);
        expect(obj).toMatchObject([
            {Data: "Keep this object around"},
            {A:11, B:"2", C:{D:"Yes"}}
        ]);
    });
    it("Load Structured object conditional 'false' into object - root",  async () => {
        const obj = {
            "<-{{ShouldLoadFirst}}": '{{->loadObj({{FirstN}})}}',
        };
        const oi = new ObjectInterpolator(obj, {
            ShouldLoadFirst: false,
            FirstN: 10,
            SecondN: 11
        }, { loadObj: (sender, n) => { return {A:n, B:"2", C:{D:"Yes"}}; } });
        const iResult = await oi.interpolate();
        expect(iResult.nReplacedKeys).toBe(1);
        expect(obj).toMatchObject({});
    });

    it("Load Structured object conditional 'true' into object - root",  async () => {
        const obj = {
            "<-{{ShouldLoadFirst}}": '{{->loadObj({{FirstN}})}}',
        };
        const oi = new ObjectInterpolator(obj, {
            ShouldLoadFirst: true,
            FirstN: 10,
            SecondN: 11
        }, { loadObj: (sender, n) => { return {A:n, B:"2", C:{D:"Yes"}}; } });
        const iResult = await oi.interpolate();
        expect(iResult.nReplacedKeys).toBe(3);
        expect(obj).toMatchObject({A:10, B:"2", C:{D:"Yes"}});
    });
    it("Load Structured object conditional 'false' object - not root (with object empty)",  async () => {
        const obj = {
            Test: {"<-{{ShouldLoadFirst}}": '{{->loadObj({{FirstN}})}}'},
        };
        const oi = new ObjectInterpolator(obj, {
            ShouldLoadFirst: false,
            FirstN: 10,
            SecondN: 11
        }, { loadObj: (sender, n) => { return {A:n, B:"2", C:{D:"Yes"}}; } });
        const iResult = await oi.interpolate();
        expect(iResult.nReplacedKeys).toBe(1);
        expect(obj).toMatchObject({});
    });
    it("Load Structured object conditional 'false' object - not root (with object not empty)",  async () => {
        const obj = {
            Test: {"<-{{ShouldLoadFirst}}": '{{->loadObj({{FirstN}})}}', Int: 1},
        };
        const oi = new ObjectInterpolator(obj, {
            ShouldLoadFirst: false,
            FirstN: 10,
            SecondN: 11
        }, { loadObj: (sender, n) => { return {A:n, B:"2", C:{D:"Yes"}}; } });
        const iResult = await oi.interpolate();
        expect(iResult.nReplacedKeys).toBe(1);
        expect(obj).toMatchObject({Test:{Int:1}});
    });
    it("Load Many Structured object conditional 'true' and 'false' object - not root",  async () => {
        const obj = {
            Test1: {"<-true": '{{->loadObj({{FirstN}})}}', "<-false": '{{->loadObj({{FirstN}})}}'},
            Test2: {"<-false": '{{->loadObj({{FirstN}})}}'},
            Test3: {"<-true": '{{->loadObj({{FirstN}})}}'},

        };
        const oi = new ObjectInterpolator(obj, {
            ShouldLoadFirst: true,
            FirstN: 10,
            SecondN: 11
        }, { loadObj: async (sender, n) => {await wait(1000); return {A:n, B:"2", C:{D:"Yes"}}; } });

        const iResult = await oi.interpolate();
        expect(iResult.nReplacedKeys).toBe(4);
        expect(obj).toMatchObject({
            Test1: {A:10, B:"2", C:{D:"Yes"}},
            Test3: {A:10, B:"2", C:{D:"Yes"}}
        });
    });
});
describe('More object loading', () => {

    it("Load Array merge into parent array",  async () => {
        const obj = [
            {
                "<--": '{{->loadObj(1)}}'
            },
            {
            "Obj" : {Key: "This is an object not loaded 3"}
            }
        ];

        const oi = new ObjectInterpolator(obj, {
            ShouldLoadFirst: true,
            FirstN: 10,
            SecondN: 11
        }, {
                loadObj: async (sender, n) => {
                    return [
                        {Obj: {Key: "This is an object loaded 1"}}, {Obj: {Key: "This is an object loaded 2"}}
                    ];}
        });

        const iResult = await oi.interpolate();
        expect(iResult.nReplacedKeys).toBe(1);
        expect(obj).toMatchObject([
            { Obj: {Key: "This is an object loaded 1"}},
            { Obj: {Key: "This is an object loaded 2"}},
            { Obj :{Key: "This is an object not loaded 3"}}
        ]);
    });
    it("Load Array merge into parent array - conditional",  async () => {
        const obj = [
            {
                "<--{{ShouldLoadFirst}}": '{{->loadObj(1)}}',
                "<--{{ShouldLoadSecond}}": '{{->loadObj(2)}}'
            },
            {
            "Obj" : {Key: "This is an object not loaded 3"}
            }
        ];

        const oi = new ObjectInterpolator(obj, {
            ShouldLoadFirst: false,
            ShouldLoadSecond: true,
            FirstN: 10,
            SecondN: 11
        }, {
                loadObj: async (sender, n) => {
                    return [
                        {N: n, Obj: {Key: "This is an object loaded 1"}}, {Obj: {Key: "This is an object loaded 2"}}
                    ];}
        });

        const iResult = await oi.interpolate();
        expect(iResult.nReplacedKeys).toBe(3);
        expect(obj).toMatchObject([
            { N: 2, Obj: {Key: "This is an object loaded 1"}},
            { Obj: {Key: "This is an object loaded 2"}},
            { Obj : {Key: "This is an object not loaded 3"}}
        ]);
    });
    it("**Load Multiple Array merge into parent array - conditional",  async () => {
        const obj = [
            {
                "<--{{ShouldLoadFirst}}": '{{->loadObj(1)}}',
                "<--{{ShouldLoadSecond}}": '{{->loadObj(2)}}',
                "<--{{ShouldLoadThird}}": '{{->loadObj(3)}}'
            },
            {
                "Obj" : { Key: "This is an object not loaded 3" },
                "<-{{ShouldLoadFourth}}": '{{->loadAnother(4)}}'
            }
        ];

        const oi = new ObjectInterpolator(obj, {
            ShouldLoadFirst: true,
            ShouldLoadSecond: false,
            ShouldLoadThird: true,
            ShouldLoadFourth: true,
            FirstN: 10,
            SecondN: 11
        }, {
                loadObj: async (sender, n) => {
                    return [
                        {N: n, Obj: {Key: "This is an object loaded 1"}}, {Obj: {Key: "This is an object loaded 2"}}
                    ];},
                loadAnother: async (sender, n) => { return {N1: n}; }
        });

        const iResult = await oi.interpolate();
        expect(iResult.nReplacedKeys).toBe(7);
        expect(obj).toMatchObject([
            {N: 1, Obj: {Key: "This is an object loaded 1"}}, {Obj: {Key: "This is an object loaded 2"}},
            {N: 3, Obj: {Key: "This is an object loaded 1"}}, {Obj: {Key: "This is an object loaded 2"}},
            { N1: 4, Obj : {Key: "This is an object not loaded 3"}  }
        ]);
    });

    it("Load object set into parent array at position",  async () => {
        const obj = [
            {
                "<--": '{{->loadObj(1)}}'
            },
            {
            "Obj" : {Key: "This is an object not loaded 2"}
            }
        ];

        const oi = new ObjectInterpolator(obj, {
            ShouldLoadFirst: true,
            FirstN: 10,
            SecondN: 11
        }, {
                loadObj: async (sender, n) => {
                    return {Obj: {Key: "This is an object loaded 1"}};
        }});

        const iResult = await oi.interpolate();
        expect(iResult.nReplacedKeys).toBe(1);
        expect(obj).toMatchObject([
            {Obj: {Key: "This is an object loaded 1"}},
            { Obj :{Key: "This is an object not loaded 2"}}
        ]);
    });

    it("Nested load",  async () => {
        const obj = [
            {
                NestedArray: [1,2,{"<--": '{{->loadObj(3)}}'}]
            }
        ];

        const oi = new ObjectInterpolator(obj, {
            ShouldLoadFirst: true,
            FirstN: 10,
            SecondN: 11
        }, {
                loadObj: async (sender, n) => {
                    return [n, n+1, n+2];
        }});

        const iResult = await oi.interpolate();
        expect(iResult.nReplacedKeys).toBe(1);
        expect(obj).toMatchObject([
            {
                NestedArray: [1,2,3,4,5]
            }
        ]);
    });

    it("More Nested loaded",  async () => {
        const obj = [
            {
                NestedArray: [1,2,{"<--": '{{->loadObj(3)}}', "<--true": '{{->loadObj(6)}}'}, {"<--": '{{->loadObj(9)}}', "<--true": '{{->loadObj(12)}}'}],
            },
            { Another: {
                Hello: [1,2,{"<--": '{{->loadObj(3)}}', "<--true": '{{->loadObj(6)}}'}, {"<--": '{{->loadObj(9)}}', "<--true": '{{->loadObj(12)}}'},15,{
                    "<--": '{{->loadObj(16)}}', "<--true": '{{->loadObj(19)}}'
                }],
            }}
        ];

        const oi = new ObjectInterpolator(obj, {
            ShouldLoadFirst: true,
            FirstN: 10,
            SecondN: 11
        }, {
                loadObj: async (sender, n) => {
                    return [n, n+1, n+2];
        }});

        const iResult = await oi.interpolate();
        expect(iResult.nReplacedKeys).toBe(10);
        expect(obj).toMatchObject([
            {
                NestedArray: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
            },
            {
                Another: {
                    Hello: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15, 16,17,18,19,20,21]
                }
            }
        ]);
    });
    it("Load object into object",  async () => {
        const obj = {
            "<-{{LA}}": '{{->loadObj("A")}}',
            "<-{{LB}}": '{{->loadObj("B")}}',
        };

        const oi = new ObjectInterpolator(obj, {
            LA: true,
            LB: true
        }, {
                loadObj: async (sender, key) => {
                    return {[key]: `This is a key: ${key}`};
        }});

        const iResult = await oi.interpolate();
        expect(iResult.nReplacedKeys).toBe(4);
        expect(obj).toMatchObject({
            A: "This is a key: A",
            B: "This is a key: B",
        });
    });
    it("Load object into parent object source object deletes",  async () => {
        const obj = {
            A: {
                "<--{{LA}}": '{{->loadObj("C")}}',
                "<--{{LB}}": '{{->loadObj("D")}}',
            }
        };

        const oi = new ObjectInterpolator(obj, {
            LA: true,
            LB: true
        }, {
                loadObj: async (sender, key) => {
                    return {[key]: `This is a key: ${key}`};
        }});

        const iResult = await oi.interpolate();
        expect(iResult.nReplacedKeys).toBe(4);
        expect(obj).toMatchObject({
            C: "This is a key: C",
            D: "This is a key: D",

        });
    });

    it("Load object into parent object source object remains",  async () => {
        const obj = {
            A: {
                "<--{{LA}}": '{{->loadObj("C")}}',
                "<--{{LB}}": '{{->loadObj("D")}}',
                j: 10
            }
        };

        const oi = new ObjectInterpolator(obj, {
            LA: true,
            LB: true
        }, {
                loadObj: async (sender, key) => {
                    return {[key]: `This is a key: ${key}`};
        }});

        const iResult = await oi.interpolate();
        expect(iResult.nReplacedKeys).toBe(4);
        expect(obj).toMatchObject({
            C: "This is a key: C",
            D: "This is a key: D",
            A: {
                j: 10
            }
        });
    });

});
describe('Simple interpolation over strings - with empty string replace', () => {
    it("Some get replaced with empty string",  async () => {
        const si = new StringInterpolator("Hello {{HOW}} {{ARE}} {{YOU}}?", {
            ARE: "are",
            YOU: "you"
        },{ ReplaceNotFoundHandler: (templateVar, key) => { return ''; }});
        const name = await si.sInterpolate();
        expect(name).toBe("Hello  are you?");
    });
    it("Some get replaced, correct missing not found key",  async () => {
        const si = new StringInterpolator("Hello {{HOW}} {{ARE}} {{YOU}}?", {
            ARE: "are",
            YOU: "you"
        },{ ReplaceNotFoundHandler: (templateVar, key) => { return 'how'; }});
        const name = await si.sInterpolate();
        expect(name).toBe("Hello how are you?");
    });
    it("Multi line breaks",  async () => {
        const si = new StringInterpolator("This is a test {{COMMENT1}}\n\n.  Supporting:\r{{COMMENT2}}\n", {
            COMMENT1: "of a multi line template",
            COMMENT2: "line breaks."
        },{ ReplaceNotFoundHandler: (templateVar, key) => { return 'how'; }});
        const name = await si.sInterpolate();
        expect(name).toBe("This is a test of a multi line template\n\n.  Supporting:\rline breaks.\n");
    });
});

describe('Function Interpolation tests', () => {
    it("No argument function call",  async () => {

        const parseFContext = {
          getVar: (sender) => "NewVar"
        };
        const obj = {
            Value: "{{{{->getVar()}}}}",
        }
        const oi = new ObjectInterpolator(obj, {
            NewVar: "Indirect variable lookup is fun!"
        }, parseFContext);
        const iResult = await oi.interpolate();
        expect(iResult.nReplacedKeys).toBe(2);
        expect(obj).toMatchObject({
            Value: "Indirect variable lookup is fun!",
        });
    });

    it("Empty String Interpolation Test",  async () => {

        const parseFContext = {
          returnString: (sender, a) => a,
        };
        const obj = {
            Value: "{{ ->returnString ( '{{Empty}}' ) }}",
        }
        const oi = new ObjectInterpolator(obj, {
            Empty: "",
        }, parseFContext);
        const iResult = await oi.interpolate();
        expect(iResult.nReplacedKeys).toBe(2);
        expect(obj).toMatchObject({
            Value: "",
        });
    });

    it("Replace with null",  async () => {

        const parseFContext = {
          returnTrueIfNull: (sender, a) => a === null,
        };
        const obj = {
            Value: "{{->returnTrueIfNull ( {{Null}} ) }}",
        }
        const oi = new ObjectInterpolator(obj, {
            Null: null,
        }, parseFContext);
        const iResult = await oi.interpolate();
        expect(iResult.nReplacedKeys).toBe(2);
        expect(obj).toMatchObject({
            Value: true,
        });
    });

    it("Not found function Interpolation Test",  async () => {

        const parseFContext = {
          returnStringA: (sender, a) => a,
        };
        const obj = {
            Value: "{{ ->returnString ( '{{Empty}}' ) }}",
        }
        const oi = new ObjectInterpolator(obj, {
            Empty: "",
        }, parseFContext);
        expect(async () => await oi.interpolate()).rejects.toThrow(/Function returnString is not defined in the context/);
    });

    it("String Interpolation Test",  async () => {

        const parseFContext = {
          concatString: (sender, a, b) => a.concat(b),
        };
        const obj = {
            Value: "{{->concatString  (  '{{First}}', '{{Second}}'  )}}",
        }
        const oi = new ObjectInterpolator(obj, {
            First: "ABC,",
            Second: "DEF"
        }, parseFContext);
        const iResult = await oi.interpolate();
        expect(iResult.nReplacedKeys).toBe(2);
        expect(obj).toMatchObject({
            Value: "ABC,DEF",
        });
    });

    it("Array Interpolation Basic Test - A1",  async () => {

        const parseFContext = {
          REDUCE: (sender, a) => a.reduce((accumulator, currentValue) => accumulator + currentValue, 0)
        };
        const obj = {
            Value: "{{->REDUCE({{ARRAY}})}}",
        }
        const oi = new ObjectInterpolator(obj, {
            ARRAY: [1,2,3,4]
        }, parseFContext);
        const iResult = await oi.interpolate();
        expect(iResult.nReplacedKeys).toBe(2);
        expect(obj).toMatchObject({
            Value: 10
        });
    });
    it("Array Interpolation Basic Test - A2",  async () => {
        const parseFContext = {
          REDUCE: (sender, a) => a.reduce((accumulator, currentValue) => accumulator + currentValue, 0)
        };
        const obj = {
            Value: "{{->REDUCE({{ARRAY}})}}",
        }
        const oi = new ObjectInterpolator(obj, {
            ARRAY: [1,2,3,4]
        }, parseFContext);
        const iResult = await oi.interpolate();
        expect(iResult.nReplacedKeys).toBe(2);
        expect(obj).toMatchObject({
            Value: 10
        });
    });
    it("Array Interpolation array Test - B",  async () => {

        const parseFContext = {
          REDUCE: (sender, a) => {
              const startValue = "";
              const value = a.reduce((accumulator, currentValue) => accumulator + currentValue, startValue);
              return value;
          }
        };
        const obj = {
            Value: "{{->REDUCE({{ARRAY}})}}",
        }
        const oi = new ObjectInterpolator(obj, {
            ARRAY: ["A","B","C"]
        }, parseFContext);
        const iResult = await oi.interpolate();
        expect(iResult.nReplacedKeys).toBe(2);
        expect(obj).toMatchObject({
            Value: "ABC"
        });
    });
    it("Array Interpolation array Test - B2",  async () => {

        const parseFContext = {
          REDUCE: (sender, a) => {
              const startValue = "";
              const value = a.reduce((accumulator, currentValue) => accumulator + currentValue, startValue);
              return value;
          }
        };
        const obj = {
            Value: "{{->REDUCE({{ARRAY}})}}",
        }
        const oi = new ObjectInterpolator(obj, {
            ARRAY: ["A","B","C"]
        }, parseFContext);
        const iResult = await oi.interpolate();
        expect(iResult.nReplacedKeys).toBe(2);
        expect(obj).toMatchObject({
            Value: "ABC"
        });
    });

     it("Array Interpolation with mismatch quote - C",  async () => {

        const parseFContext = {
          REDUCE: (sender, a) => a.reduce((accumulator, currentValue) => accumulator + currentValue, "")
        };
        const obj = {
            Value: "{{->REDUCE({{ARRAY}})}}",
        }
        const oi = new ObjectInterpolator(obj, {
            ARRAY: '["A,"B","C"]'
        }, parseFContext);
        expect(async () => await oi.interpolate().rejects.toThrow(/Parse error - mismatch on some ending symbols/));
    });
    it("Array Interpolation with missing end bracket - D",  async () => {
        const parseFContext = {
          REDUCE: (sender, a) => a.reduce((accumulator, currentValue) => accumulator + currentValue, "")
        };
        const obj = {
            Value: "{{->REDUCE({{ARRAY}})}}",
        }
        const oi = new ObjectInterpolator(obj, {
            ARRAY: '["A","B","C"'
        }, parseFContext);
        expect(async () => await oi.interpolate().rejects.toThrow(/Parse error - mismatch on some ending symbols/));
    });

    it("bool Interpolation Test - with whitespace",  async () => {

        const parseFContext = {
          not: (sender, a) => a === true ? false : (a === false) ? true : undefined
        };
        const obj = {
            Value: "{{->not   (  {{ TRUE }}   )    }}",
        }
        const oi = new ObjectInterpolator(obj, {
            TRUE: true,
        }, parseFContext);
        const iResult = await oi.interpolate();
        expect(iResult.nReplacedKeys).toBe(2);
        expect(obj).toMatchObject({
            Value: false
        });
    });
    it("Basic Math deeply nested Interpolation Test",  async () => {
        const parseFContext = {
          add: (sender, a, b) => a + b,
          mul: (sender, x, y) => x * y,
          sub: (sender, a, b) => a - b,
          div: (sender, a, b) => a / b
        };
        const obj = {
            Value: "{{->add(mul(sub(1,2),3),div(4,5))}}",
            ValueCpy: "{{Value}}",
        }
        const oi = new ObjectInterpolator(obj, {}, parseFContext);
        const iResult = await oi.interpolate();
        expect(iResult.nReplacedKeys).toBe(2);
        expect(obj).toMatchObject({
            Value: -2.2,
            ValueCpy: -2.2,
        });
    });
    it("Embedded long string",  async () => {
        const parseFContext = {
          _: (sender, a) => a,
        };
        const obj = {
            Value: "{{ Name }}: {{->_('{{ Name }} Boy, this is a test(and only a test) mostly for fun')}}",
            ValueCpy: "{{Value}}",
        }
        const oi = new ObjectInterpolator(obj, {Name: "John"}, parseFContext);
        const iResult = await oi.interpolate();
        expect(iResult.nReplacedKeys).toBe(3);
        expect(obj).toMatchObject({
            Value: "John: John Boy, this is a test(and only a test) mostly for fun",
            ValueCpy: "John: John Boy, this is a test(and only a test) mostly for fun",
        });
    });
});
describe('Function Interpolation tests - with objects', () => {
    it("Object Interpolation Basic Test",  async () => {

        const parseFContext = {
          Echo: (sender, a) => a
        };
        const obj = {
            Value: "{{->Echo( {{Obj}} )}}",
        }
        const oi = new ObjectInterpolator(obj, {
            Obj: {
                A: "This is a test",
                B: {
                    C: 5, D:4, E: "Inner Object"
                }
            }
        }, parseFContext);
        const iResult = await oi.interpolate();
        expect(iResult.nReplacedKeys).toBe(2);
        expect(obj).toMatchObject({
            Value: {
                A:"This is a test",
                B: {
                    C: 5, D:4, E:"Inner Object"
                }
            }
        });
    });
    it("Object Interpolation function add to context Test",  async () => {
        const obj = {
            Value: "{{->BreakCase( {{FieldName}} )}}{{C}}{{B}}{{A}}",
        }
        const keyValues = { FieldName: "RoomLevel1" };
        const parseFContext = {
          BreakCase: (sender, value) => {
            function breakCase(str) { return str.split(/(?=[A-Z])|(?=[-])|(?=[\d])/); }
            function getNextLetter(char) { if (char.length !== 1 || !char.match(/[a-zA-Z]/)) { throw new Error("Input must be a single alphabetic character"); } const isUpperCase = char === char.toUpperCase(); const nextCharCode = char.charCodeAt(0) + 1; if (char.toLowerCase() === 'z') { return isUpperCase ? 'A' : 'a'; } return String.fromCharCode(nextCharCode); }
            const data = breakCase(value);
            let nextKey = "A";
            data.forEach( (part) => {
                keyValues[nextKey] = part;
                nextKey = getNextLetter(nextKey);
            })
            return '';
          }
        };
        {
            const oi = new ObjectInterpolator(obj, keyValues, parseFContext);
            await oi.interpolate();
        }
        {
            const oi = new ObjectInterpolator(obj, keyValues, parseFContext);
            await oi.interpolate();
        }
        expect(obj).toMatchObject({
            Value: "1LevelRoom"
        });
    });
    it("Object Interpolation - bracket in string",  async () => {

        const parseFContext = {
          Echo: (sender, a) => a
        };
        const obj = {
            Value1: "{{->Echo( {{Obj}} )}}",
            Value2: "{{Value1}}"

        }
        const oi = new ObjectInterpolator(obj, {
            Obj: {
                A: "This is a test}}",
                B: {
                    C: 5, D:4, E: "Inner Object"
                }
            },
            Junk: "123"

        }, parseFContext);
        const iResult = await oi.interpolate();
        expect(iResult.nReplacedKeys).toBe(3);
        expect(obj).toMatchObject({
            Value1: {
                A:"This is a test}}",
                B: {
                    C: 5, D:4, E:"Inner Object"
                }
            },
            Value2: {
                A:"This is a test}}",
                B: {
                    C: 5, D:4, E:"Inner Object"
                }
            }
        });
    });
});

describe('Promise based Interpolation tests', () => {
    it("Function calls are promises - Normal Resolves",  async () => {
        const parseFContext = {
            fPromise: async (sender, waitMs, returnValue) => { await wait(waitMs); return returnValue; }
        }
        const obj = {
            WaitATotal1000Msg: "{{->fPromise( {{Wait1000}}, 'Parallel waits' )}} {{->fPromise( {{Wait1000}}, 'on single value.' )}}",
            WaitBTotal250Msg: "{{->fPromise( {{Wait250}}, 'More')}} {{->fPromise( {{Wait250}}, '{{WaitATotal1000Msg}}')}}",
            WaitCTotal250Msg: "{{->fPromise( {{Wait250}}, 'But all object waits')}} {{->fPromise( {{Wait250}}, 'will add up together.')}}",
        }
        const threshold = [1000, 250, 250].reduce((sum,n)=>sum + n, 0) + 100;
        const oi = new ObjectInterpolator(obj, {
            Wait1000: 1000,
            Wait250: 250,
        },parseFContext)

        let iResult;
        const start = performance.now();
        {
            iResult = await oi.interpolate();
        }
        const end = performance.now();

        const executionTime = end - start;
        expect(executionTime).toBeLessThan(threshold);
        expect(iResult.nReplacedKeys).toBe(6);
        expect(obj).toMatchObject({
            WaitATotal1000Msg: "Parallel waits on single value.",
            WaitBTotal250Msg: "More Parallel waits on single value.",
            WaitCTotal250Msg: "But all object waits will add up together.",
        });
    });
    it("Function calls are promises - Some reject",  async () => {
        const parseFContext = {
            fPromise: async (sender, waitMs, resolveFlag) => {
                await wait(waitMs);
                if(resolveFlag)
                    return "This promise was resolved";
                else
                    throw new Error("This promise was rejected");
            }
        }
        const obj = {
            HelloHowAreYouToday: "{{->fPromise( {{Wait541}}, false )}}{{->fPromise( {{Wait541}}, true )}}",
            Two: "{{->fPromise( {{Wait239}}, true)}}",
            Three: "{{->fPromise( {{Wait541}}, false)}}",
            Four: "{{->fPromise( {{Wait101}}, true)}}"
        }
        const oi = new ObjectInterpolator(obj, {
            Wait239: 239,
            Wait317: 317,
            Wait541: 541,
            Wait101: 101
        },parseFContext)
        const iResult = await oi.interpolate();
        expect(iResult.nReplacedKeys).toBe(7);
        expect(obj).toMatchObject({
            HelloHowAreYouToday: '{{->fPromise( 541, false )}}This promise was resolved',
            Two: 'This promise was resolved',
            Three: '{{->fPromise( 541, false)}}',
            Four: 'This promise was resolved',
        });
    });

});
describe('Malformed', () => {
    it("Malformed - Embedded long string - missing end quote",  async () => {
        const parseFContext = {
          _: (sender, a) => a,
        };
        const obj = {
            Value: "{{ Name }}: {{->_('{{ Name }} Boy, this is a test(and only a test) mostly for fun)}}",
        }
        const oi = new ObjectInterpolator(obj, {Name: "John"}, parseFContext);
        expect(async () => await oi.interpolate().rejects.toThrow(/Parse error - mismatch on some ending symbols/));
    });

    it("Malformed - missing end bracket",  async () => {
        const parseFContext = {
          _: (sender, a) => a,
        };
        const obj = {
            Value: "{{->_('{{ Name }}'}}",
        }
        const oi = new ObjectInterpolator(obj, {Name: "John"}, parseFContext);
        expect(async () => {
            await oi.interpolate();
        }).rejects.toThrow(/Parse error - Expected '\(' after function name _/);

    });
    it("Malformed - missing function name",  async () => {
        const parseFContext = {
          _: (sender, a) => a,
        };
        const obj = {
            Value: "{{->('{{ Name }}'}}",
        }
        const oi = new ObjectInterpolator(obj, {Name: "John"}, parseFContext);
        expect(async () => {
            await oi.interpolate();
        }).rejects.toThrow(/Parse error - Unexpected '\(' or '\)' missing function name/);

    });
});

describe('Tag Checker', () => {

    it("Basic Test",  async () => {
        const keys = {ABC:"*1", DEF:"*2"};
        const templateStr = "{{ABC}} and {{DEF}}";
        const hasTag = (new SimpleTagParser(templateStr)).has();
        expect(hasTag).toBe(true);
    });
    it("Nested Test",  async () => {
        const keys = {ABC:"*1", DEF:"*2"};
        const templateStr = "{{ {{ABC}} and {{DEF}} }}";
        const hasTag = (new SimpleTagParser(templateStr)).has();
        expect(hasTag).toBe(true);
    });


});
describe('Single pass tag replacer', () => {

    it("Basic Test",  async () => {
        const keys = {ABC:"*1", DEF:"*2"};
        const templateStr = "{{ABC}} and {{DEF}}";
        const replace = (new SinglePassTagReplacer(templateStr,
            (sender, match, key, offset, string) => keys[key])).replace();
        expect(replace).toBe("*1 and *2");
    });

    it("Ignore embedded symbol -  case 1",  async () => {
        const keys = {ABC:"*1", DEF:"*2"};
        const templateStr = "{{ABC}} { Anything in here will be ignored like this: {{ABC}} } and this: {} {{DEF}}";
        const replace = (new SinglePassTagReplacer(templateStr,
            (sender, match, key, offset, string) => keys[key], {TrackCurlyBrackets: true})).replace();
        expect(replace).toBe("*1 { Anything in here will be ignored like this: {{ABC}} } and this: {} *2");
    });
    it("Do not Ignore embedded symbol -  case 1",  async () => {
        const keys = {ABC:"*1", DEF:"*2"};
        const templateStr = "{{ABC}} { Anything in here will be ignored like this: {{ABC}} } and this: {} {{DEF}}";
        const replace = (new SinglePassTagReplacer(templateStr,
            (sender, match, key, offset, string) => keys[key], {TrackCurlyBrackets: false}) ).replace();
        expect(replace).toBe("*1 { Anything in here will be ignored like this: *1 } and this: {} *2");
    });
    it("Ignore embedded symbol case - 2",  async () => {
        const keys = {ABC:"*1", DEF:"*2"};
        const templateStr = "{{ABC}} { { and } } {{DEF}}";
        const replace = (new SinglePassTagReplacer(templateStr,
            (sender, match, key, offset, string) => keys[key])).replace();
        expect(replace).toBe("*1 { { and } } *2");
    });
    it("Unbalanced tag symbols - tag does not get parsed",  async () => {
        const keys = {ABC:"*1", DEF:"*2"};
        const templateStr = "{{ABC}}  { {{DEF}}";
        const replace = (new SinglePassTagReplacer(templateStr,
            (sender, match, key, offset, string) => keys[key], {TrackCurlyBrackets: true})).replace();
        expect(replace).toBe("*1  { {{DEF}}");
    });
    it("Unbalanced tag symbols - throws case 1",  async () => {
        const keys = {ABC:"*1", DEF:"*2"};
        const templateStr = "{{ABC}}  {";
        expect(async () => {
        const replace = (new SinglePassTagReplacer(templateStr,
            (sender, match, key, offset, string) => keys[key], {TrackCurlyBrackets: true})).replace();
        }).rejects.toThrow(/Match Error - unbalanced symbols missing: }/);
    });

});

describe('Expression Interpolation tests', () => {
    it("Basic expression test",  async () => {

        const parseFContext = {
          Echo: (sender, a) => a
        };
        const obj = {
            Value: "{{->ƒ( '(1 + 2) == 3' )}}",
        }
        const oi = new ObjectInterpolator(obj, {
            Answer: 3
        });
        const iResult = await oi.interpolate();
        expect(iResult.nReplacedKeys).toBe(1);
        expect(obj).toMatchObject({
            Value: true
        });
    });
    it("Simple Ternary test with interpolation - true case",  async () => {

        const obj = {
            Value: "{{->ƒ( '({{ WaterFrontStatus }}) ? 9 : 0' ) }}" ,
        }
        const oi = new ObjectInterpolator(obj, {
            WaterFrontStatus: true,
        });
        const iResult = await oi.interpolate();

        expect(obj).toMatchObject({
            Value: 9,
        });
    });
    it("Multiple Ternary test with interpolation - true case",  async () => {


        const v ="has water front {{WaterFrontType}}, {{->ƒ( '({{WaterFrontName}}) ? \"{{KnownAsWaterFrontName}}\" : \"test\"' ) }} with a length of {{WaterFrontage}}";
        const obj = {
            Value: "has water front on the {{WaterFrontType}}, {{->ƒ( '({{WaterFrontStatus}}) ? \"{{KnownAsWaterFrontName}}\" : \"\"' ) }} with a length of 200 ft",
        }
        const oi = new ObjectInterpolator(obj, {
            WaterFrontStatus: "true",
            WaterFrontType: 'on the Ocean',
            WaterFrontName: 'Bay of Fundy',
            WaterFrontage: '200 ft',
            KnownAsWaterFrontName: 'known as the {{WaterFrontName}}'
        });
        let nReplacedKeys = 0;
        do {
            nReplacedKeys = (await oi.interpolate()).nReplacedKeys;

        } while(nReplacedKeys > 0);

        const iResult = await oi.interpolate();

        expect(obj).toMatchObject({
            Value: "has water front on the on the Ocean, known as the Bay of Fundy with a length of 200 ft",
        });
    });

    it("Expression Ternary test with interpolation - false case",  async () => {

        const obj = {
            Value: "{{->ƒ( '(({{ Count }} + {{Increment}}) > {{ Threshold }}) ? 10 : 3' ) }}",
            IsEnabled: "{{->ƒ( '{{Value}} == 3' ) }}"
        }
        const oi = new ObjectInterpolator(obj, {
            Count: 1,
            Increment: 2,
            Threshold: 3
        });
        const iResult = await oi.interpolate();
        expect(iResult.nReplacedKeys).toBe(4);
        expect(obj).toMatchObject({
            Value: 3,
            IsEnabled: true,
        });
    });
    it("Expression test with interpolation - true case",  async () => {

        const obj = {
            Value: "{{->ƒ( '(({{ Count }} + {{Increment}}) == {{ Threshold }}) ? 10 : 3' ) }}",
            IsEnabled: "{{->ƒ( '{{Value}} == 3' ) }}"
        }
        const oi = new ObjectInterpolator(obj, {
            Count: 1,
            Increment: 2,
            Threshold: 3
        });
        const iResult = await oi.interpolate();
        expect(iResult.nReplacedKeys).toBe(4);
        expect(obj).toMatchObject({
            Value: 10,
            IsEnabled: false
        });
    });
    it("Expression test with string with interpolation - true case",  async () => {

        const obj = {
            s: "'abc'",
            Value: '{{->ƒ( "(true == true) ? {{ s }} : 3" ) }}',
        }
        const oi = new ObjectInterpolator(obj, {


        });
        const iResult = await oi.interpolate();
        expect(iResult.nReplacedKeys).toBe(2);
        expect(obj).toMatchObject({
            s: "'abc'",
            Value: "abc"
        });


    });
    it("Expression test with empty string with interpolation - true case",  async () => {

        const obj = {

            Value: '{{->ƒ( "({{ T }} == {{EmptyString}}) ? {{ s }} : 3" ) }}',
        }
        const oi = new ObjectInterpolator(obj, {
            s: "'abc'",
            EmptyString: "''",
            T: "''",

        });
        const iResult = await oi.interpolate();
        expect(iResult.nReplacedKeys).toBe(2);
        expect(obj).toMatchObject({
            Value: "abc"
        });


    });

    it("Expression test logical with interpolation",  async () => {

        const obj = {

            AllPeopleHaveCars: "{{->ƒ( '{{NumPeopleWithCars}} == {{NumPeople}}' ) }}",
            AllPeopleOwnerCarsAndSomeHaveJunkCars: "{{->ƒ( '{{AllPeopleHaveCars}} && ({{NumPeopleWithJunkyCars}} < {{NumPeopleWithCars}})' ) }}",
        }
        const oi = new ObjectInterpolator(obj, {
            NumPeopleWithJunkyCars: 1,
            NumPeopleWithCars: 3,
            NumPeople: 3,
        });
        const iResult = await oi.interpolate();
        expect(iResult.nReplacedKeys).toBe(4);
        expect(obj).toMatchObject({
            AllPeopleHaveCars: true,
            AllPeopleOwnerCarsAndSomeHaveJunkCars: true
        });
    });

    it("Convert type to string", async () => {
        const obj = {
            S: "{{->_({{ NothingButABC }}) }}",
            AllNumbers: "{{->_({{ FirstN }}) }}",
            NULL: "{{->_({{ NULL }}) }}",
            A: "{{->_({{ ArrayV }}) }}",
            B: "{{->_({{ BooleanV }}) }}",

        }
        const oi = new ObjectInterpolator(obj, {
            FirstN: 1.12,
            NULL: null,
            ArrayV: [1,2,3],
            BooleanV: true,
            NothingButABC: "ABC",
        }, {});
        const iResult = await oi.interpolate();
        expect(iResult.nReplacedKeys).toBe(10);
        expect(obj).toMatchObject({
            S: "ABC",
            AllNumbers: "1.12",
            NULL: "null",
            A: "[1,2,3]",
            B: "true",

        });
    });

});

describe('query dot notation', () => {
    it("Basic Test",  async () => {

        const parseFContext = {
          Echo: (sender, a) => a
        };
        const obj = {
            RealValue: "{{Junk value}}",
            FindValue: "{{ Test¤Fun¤UseThisKey }}",
            FindFunObj: "{{ Test¤noValue }}",
            NotFound: "{{ Test¤jnoValue }}"
        }
        const oi = new ObjectInterpolator(obj,
            {
                "Junk value": "abc",
                Test: {
                    Fun: {
                        UseThisKey: "This is the value"
                    },
                    noValue: null
                }
            },
            {}, {ActionOnNotFound: ReplaceObjectAction.ACTION_DELETE, KeyValueContextI: QueryObjKeyValueContextI, KeyValueContextSeparator: "¤" });

        await oi.interpolate();
        expect(obj).toMatchObject({
            FindValue: "This is the value",
            FindFunObj: null
        }
        );
    });
    it("Another Basic Test",  async () => {

        const parseFContext = {
          Echo: (sender, a) => a
        };
        const message = {
            "Construct": "Complete",
            "Key": "GarageInformation-DataSink",
            "Message": "{{GaragePresence}} {{Details}}",
            "MarketingRatingValue": "{{MarketingValue}}"
        };
        const mappedObj = {
            "GarageExistence": {
                "Garage Yes": "",
                "No Garage": "No Garage"
            },
            "Garage Details": "",
            "GaragePresence": "The property does not include a garage.",
            "MarketingValue": 0
        }
        const oi = new ObjectInterpolator(message, mappedObj, {},
                            {ReplaceNotFoundHandler: (templateVar, key) => '',
                                KeyValueContextI: QueryObjKeyValueContextI, KeyValueContextSeparator: "¤" });

        await oi.interpolate();
        expect(message).toMatchObject({
            "Construct": "Complete",
            "Key": "GarageInformation-DataSink",
            "Message": "The property does not include a garage. ",
            "MarketingRatingValue": 0
        });
    });
});
