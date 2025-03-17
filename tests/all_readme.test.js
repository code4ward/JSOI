import {ObjectInterpolator, ReplaceObjectAction, StringInterpolator, InterpolationValueNotFoundError} from "../src/interpolation_objects.js";
import {wait} from "./utils.js"


describe('Documentation Samples', () => {
    it("Simple string interpolation",  async () => {
        const si = new StringInterpolator("Hello {{HOW}} {{ARE}} {{YOU}}?", {
            ARE: "are",
            YOU: "you"
        },{ ReplaceNotFoundHandler: (templateVar, key) => { return ''; }});
        const name = await si.sInterpolate();
        expect(name).toBe("Hello  are you?");
    });

    it("The Basics", async () => {
        const obj = {
            OuterObject: {
                InnerObject: {
                    One: "{{One}}",
                },
                AnotherObject: "{{Obj}}"
            }
        }
        const oi = new ObjectInterpolator(obj, {
            One: 1,
            Obj: {Test:"A", B: "B"}
        },{})
        const iResult = await oi.interpolate();
        expect(iResult.nReplacedKeys).toBe(2);
        expect(obj).toMatchObject({
            OuterObject: {
                InnerObject: {
                    One: 1,
                },
                AnotherObject: {Test:"A", B: "B"}
            }
        });
    });

    it("Primitive types", async () => {
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
        },{})
        const iResult = await oi.interpolate();
        expect(iResult.nReplacedKeys).toBe(9);
        expect(obj).toMatchObject({
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
    });

    it("Automatic type conversion (not supported)",  async () => {

        const obj = {
            Numbers: "{{Number1}}{{Number2}}{{Number3}}",
        }
        const oi = new ObjectInterpolator(obj, {
            Number1: 1,
            Number2: 2,
            Number3: 3
        });
        const iResult = await oi.interpolate();
        expect(iResult.nReplacedKeys).toBe(1);
        expect(obj).toMatchObject({
            Numbers: '123',
        });
    });
    it("Nested object interpolation",  async () => {

        const obj = {
            OuterObject: {
                InnerObject: {
                    One: "{{One}}",
                },
                AnotherObject: "{{A}}",
                Array:["{{Obj1}}", "{{Obj2}}", "{{Obj3}}"]
            }
        }
        const oi = new ObjectInterpolator(obj, {
            One: 1,
            A: {Test:"A", B: "B"},
            Obj1: {obj1:"1"},
            Obj2: {obj2:"2"},
            Obj3: {obj3:"3"}
        },{});

        const iResult = await oi.interpolate();
        expect(iResult.nReplacedKeys).toBe(5);
        expect(obj).toMatchObject({OuterObject: {
                InnerObject: {
                    One: 1
                },
                AnotherObject: {Test:"A", B: "B"},
                Array: [{obj1:"1"}, {obj2:"2"}, {obj3:"3"}]
        }});
    });

    it("Replacement with simple function calls",  async () => {

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
    it("Replacement with async function calls",  async () => {

        const data = {
            FirstName: "John",
            LastName: "Doe",
            HouseNo: "4",
            Street: "Wayward Pines",
        };
        const parseFContext = {
            simulateFetch: async (sender, addr) => {await wait(1000); return data[addr.Key]; },
        };

        const obj = {
            FullName: "{{->simulateFetch({{FirstName}})}} {{->simulateFetch({{LastName}})}}",
            Address: "{{->simulateFetch({{HouseNo}})}} {{->simulateFetch({{Street}})}}",
        };
        const oi = new ObjectInterpolator(obj, {
            FirstName: {Address: "http://localhost:8000/", Verb: "GET", Key: "FirstName"},
            LastName: {Address: "http://localhost:8000/", Verb: "GET", Key: "LastName"},
            HouseNo: {Address: "http://localhost:8000/", Verb: "GET", Key: "HouseNo"},
            Street: {Address: "http://localhost:8000/", Verb: "GET", Key: "Street"},
        }, parseFContext);
        const iResult = await oi.interpolate();
        expect(iResult.nReplacedKeys).toBe(4);
        expect(obj).toMatchObject({
            FullName: "John Doe",
            Address: "4 Wayward Pines",
        });
    });
    it("Nested function calls",  async () => {
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

    it("Dynamic variable construction",  async () => {

        const obj = {
            Test: "{{RunTest-{{TestNumber}}}}",
        }
        const oi = new ObjectInterpolator(obj, {
            "RunTest-1": "Run1stTests",
            "RunTest-2": "Run2ndTests",
            TestNumber: 2
        }, {});
        const iResult = await oi.interpolate();
        expect(iResult.nReplacedKeys).toBe(2);
        expect(obj).toMatchObject({
            Test: "Run2ndTests",
        });
    });
    it("Local variable override",  async () => {

        const obj = {
            UseTest1: "{{Test1}}",
            UseTest2: "{{UseTest1}}",
        }
        const oi = new ObjectInterpolator(obj, {
            "Test1": "Run1stTests",
            "UseTest2": "Run2ndTests",
            TestNumber: 2
        }, {});
        const iResult = await oi.interpolate();
        expect(iResult.nReplacedKeys).toBe(2);
        expect(obj).toMatchObject({
            UseTest1: "Run1stTests",
            UseTest2: "Run1stTests",
        });
    });
    it("Declare keys to process and processing order",  async () => {

        const obj = {
            UseTest2: "{{UseTest1}}",
            UseTest1: "{{Test1}}",
            __ProcessKeys__: ["UseTest1", "UseTest2"]
        }
        const oi = new ObjectInterpolator(obj, {
            "Test1": "Run1stTests",
            "UseTest2": "Run2ndTests",
            TestNumber: 2
        }, {});
        const iResult = await oi.interpolate();
        expect(iResult.nReplacedKeys).toBe(2);
        expect(obj).toMatchObject({
            UseTest1: "Run1stTests",
            UseTest2: "Run1stTests",
        });
    });

    it("Unconditional Loading",  async () => {
        const obj = {
            A: {
                "<--": '{{->loadObj("C")}}',
            }
        };

        const oi = new ObjectInterpolator(obj, {
        }, {
                loadObj: async (sender, key) => {
                    return {[key]: `This is a key: ${key}`};
        }});

        const iResult = await oi.interpolate();
        expect(iResult.nReplacedKeys).toBe(1);
        expect(obj).toMatchObject({
            C: "This is a key: C",
        });
    });

    it("Conditional loading",  async () => {
        const obj = {
            A: {
                "<--{{LA}}": '{{->loadObj("A")}}',
                "<--{{LB}}": '{{->loadObj("B")}}',
                "<--{{LC}}": '{{->loadObj("C")}}',
            }
        };

        const oi = new ObjectInterpolator(obj, {
            LA: true,
            LB: false,
            LC: true,
        }, {
                loadObj: async (sender, key) => {
                    return {[key]: `This is a key: ${key}`};
        }});

        const iResult = await oi.interpolate();
        expect(iResult.nReplacedKeys).toBe(5);
        expect(obj).toMatchObject({
            A: "This is a key: A",
            C: "This is a key: C",
        });
    });
    it("Conditional loading using arrays",  async () => {
        const obj = [
            {
                NestedArray: [1,2,{"<--": '{{->loadObj(3)}}'},6,7,8 ],
            },
        ];

        const oi = new ObjectInterpolator(obj, {}, {
                loadObj: async (sender, n) => {
                    return [n, n+1, n+2];
        }});

        const iResult = await oi.interpolate();
        expect(iResult.nReplacedKeys).toBe(1);
        expect(obj).toMatchObject([
            {
                NestedArray: [1, 2, 3, 4, 5, 6, 7, 8]
            }
        ]);
    });
    it("simple loading using arrays",  async () => {

        // This is currently not supported since the value is not a string
        const obj = [
            {
                "<--true": [1,2,3,4,5,6,7,8 ]
            }
        ];

        const oi = new ObjectInterpolator(obj, {Eight:8}, {});

        const iResult = await oi.interpolate();
        expect(iResult.nReplacedKeys).toBe(0);
        expect(obj).not.toMatchObject([
            1, 2, 3, 4, 5, 6, 7, 8
        ]);
    });

    it("Cascading loading using arrays",  async () => {
        // This is currently not supported since the value of the outer object is not a string
        const obj = [
            {
                "<--": [1,2,{"<--": '{{->loadObj(3)}}'},6,7,8 ],
            },
        ];

        const oi = new ObjectInterpolator(obj, {}, {
                loadObj: async (sender, n) => {
                    return [n, n+1, n+2];
        }});

        const iResult = await oi.interpolate();
        expect(iResult.nReplacedKeys).toBe(1);
        expect(obj).not.toMatchObject([
            1, 2, 3, 4, 5, 6, 7, 8
        ]);
    });
    it("Conditional loading with interpolation",  async () => {

        // This is currently not supported
        const obj = [
            {
                "<--true": '{{->loadObj()}}'
            }
        ];

        const oi = new ObjectInterpolator(obj, {
            Name:"ConfigName1",
        }, {
                loadObj: async (sender) => {
                    const loadedObj = {
                        ConfigName: "{{Name}}"
                    };
                    (new ObjectInterpolator(loadedObj, sender.getKeyValueContext())).interpolate();
                    return loadedObj
                }});

        const iResult = await oi.interpolate();
        expect(iResult.nReplacedKeys).toBe(1);
        expect(obj).not.toMatchObject([
            { Name: "ConfigName1" }
        ]);
    });

    it("Do Nothing on not found",  async () => {

        // This is currently not supported
        const obj = {
            ValueWillNotBeFound: "{{ThisValueDoesNotExist}}"
        };

        const oi = new ObjectInterpolator(obj, {}, {});
        const iResult = await oi.interpolate();
        expect(iResult.nReplacedKeys).toBe(0);
        expect(obj).toMatchObject({
            ValueWillNotBeFound: "{{ThisValueDoesNotExist}}"
        });
    });
    it("Do Delete on not found",  async () => {

        // This is currently not supported
        const obj = {
            ValueWillNotBeFound: "{{ThisValueDoesNotExist}}"
        };

        const oi = new ObjectInterpolator(obj, {}, {},
            {ActionOnNotFound: ReplaceObjectAction.ACTION_DELETE});
        const iResult = await oi.interpolate();
        expect(iResult.nReplacedKeys).toBe(0);
        expect(obj).toMatchObject({

        });
    });
    it("Do throw on not found",  async () => {

        // This is currently not supported
        const obj = {
            ValueWillNotBeFound: "{{ThisValueDoesNotExist}}"
        };

        const oi = new ObjectInterpolator(obj, {}, {},
            {ActionOnNotFound: ReplaceObjectAction.ACTION_THROW});

        await expect(oi.interpolate()).rejects.toThrow(InterpolationValueNotFoundError);
    });
    it("Custom handler on not found",  async () => {

        // This is currently not supported
        const obj = {
            ValueWillNotBeFound: "{{ThisValueDoesNotExist}}"
        };

        const oi = new ObjectInterpolator(obj, {}, {},
            {
                ReplaceNotFoundHandler: (templateVar, key) => {
                    expect(key).toBe("ThisValueDoesNotExist");
                    return 'NowITExists';
                }});

        const iResult = await oi.interpolate();
        expect(iResult.nReplacedKeys).toBe(1);
        expect(obj).toMatchObject({
            ValueWillNotBeFound: "NowITExists"
        });
    });
    it("Should parse expressions",  async () => {

        // This is currently not supported
        const obj = {
            A: `{{ ->ƒ( '({{One}} == {{One}}) ? (2 * 5.{{One}}) : (4 / 3)' ) }}`,
            B: "{{ ->ƒ( '10.5 + -2 - 4' ) }}",
            C: "{{ ->ƒ( '({{One}} / 4) * 4' ) }}",
            D: "{{ ->ƒ( '(({{One}} / 4) * 4) == 4' ) }}",
            E: "{{ ->ƒ( '(({{One}} / 4) * 4) >= 4' ) }}",
            F: "{{ ->ƒ( '(({{One}} / 4) * 4) < 4' ) }}",
            G: "{{ ->ƒ( '!((({{One}} / 4) * 4) == 4)' ) }}",
            H: "{{ ->ƒ( '({{One}} == 2) && ({{One}} == {{One}})' ) }}",
            I: "{{ ->ƒ( '({{One}} == 2) || ({{One}} == {{One}})' ) }}",
        };

        const oi = new ObjectInterpolator(obj, {
            One: 1
        }, {});

        const iResult = await oi.interpolate();
        expect(iResult.nReplacedKeys).toBe(17);
        expect(obj).toMatchObject({
          "A": 10.2,
          "B": 4.5,
          "C": 1,
          "D": false,
          "E": false,
          "F": true,
          "G": true,
          "H": false,
          "I": true
    });
    });

});
