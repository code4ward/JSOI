# JSOI distribution
This branch holds JOSI distribution files and can be found online at: [https://code4ward.github.io/JSOI/](https://code4ward.github.io/JSOI/).  JSOI is designed specifically for templating javascript objects. 
It is designed to aid in building dynamic and conditional configuration objects while preserving types in output 
if possible.

## REPO
The JSOI repo can be found here:  [JSOI Repo](https://github.com/code4ward/jsoi); along with documentation and example use cases.

## JSOI Distribution
There are multiple ways to get JSOI. You can either grab the prebuilt files or install it via npm. Prebuilt distribution files come 
in both minimized (`*.min.js`) and non-minimized (`*.js`) versions, with support for ES Modules, CommonJS (Node.js), and 
global scope (browser-side). Below are examples for importing and simple use.


<picture>
 <img alt="icon" src="icon.png" width="150">
</picture>

<!-- TOC -->
* [JSOI distribution](#jsoi-distribution)
  * [REPO](#repo)
  * [JSOI Distribution](#jsoi-distribution-1)
    * [Add to package.json file](#add-to-packagejson-file)
    * [For Module Import](#for-module-import)
      * [Minimized](#minimized)
      * [Non-Minimized](#non-minimized)
        * [Using as module import in node](#using-as-module-import-in-node)
    * [For CommonJS for Node.js](#for-commonjs-for-nodejs)
      * [Minimized](#minimized-1)
      * [Non-Minimized](#non-minimized-1)
        * [Using as require in node](#using-as-require-in-node)
    * [For Browser global scope](#for-browser-global-scope)
      * [Minimized](#minimized-2)
      * [Non-Minimized](#non-minimized-2)
        * [Using as require in node](#using-as-require-in-node-1)
<!-- TOC -->

### Add to package.json file
```json
{
  "dependencies": {
    "jsoi": "github:code4ward/jsoi"
  }
}
```


### For Module Import
For ES Module usage, include one of the following files in your project, depending on your preference for minimized or non-minimized builds. These are ideal for modern environments that support `import/export`.

#### Minimized
* [interpolation_objects.min.mjs](./interpolation_objects.min.mjs)

#### Non-Minimized
* [interpolation_objects.mjs](./interpolation_objects.mjs)

##### Using as module import in node

> Example below shows node import.  Note package.json should have ```"type": "module"```.


```javascript
import { ObjectInterpolator } from "jsoi";

( async () => {

    const obj = {
        A: `{% raw %}{{ One }}{% endraw %}`
    };

    const oi = new ObjectInterpolator(obj, {
        One: 1
    }, {});
    await oi.interpolate();
    console.log(obj);
    
})();
```
> Output:
> 
```log
{
  "A": 1,
}
```

### For CommonJS for Node.js
For ES Module usage, include one of the following files in your project, depending on your preference for minimized or non-minimized builds. These are ideal for modern environments that support `import/export`.

#### Minimized
* [interpolation_objects.min.cjs](./interpolation_objects.min.cjs)

#### Non-Minimized
* [interpolation_objects.cjs](./interpolation_objects.cjs)

##### Using as require in node

> Example below shows node import.

```javascript
const { ObjectInterpolator } = require("jsoi");

(async () => {
    const obj = {
        A: `{% raw %}{{ One }}{% endraw %}`
    };

    const oi = new ObjectInterpolator(obj, {
        One: 1
    }, {});
    await oi.interpolate();
    console.log(obj);
})();
```

### For Browser global scope
For browser namespace ```JSOI``` should be used.

#### Minimized
* [interpolation_objects.gs.min.js](./interpolation_objects.gs.min.js)

#### Non-Minimized
* [interpolation_objects.gs.js](./interpolation_objects.gs.js)

##### Using as require in node

> Example below shows browser load with script tag.  The example is also online:  [jsoi_example_gs](https://code4ward.github.io/JSOI/jsoi_example_gs.html)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Global Scope Example</title>
</head>
<body>
  <h1>JSOI Global Scope Example (Open Debug Console for result)</h1>
  <script src="interpolation_objects.gs.js"></script>

  <script>
    (async () => {
        const obj = {
            A: `{% raw %}{{ One }}{% endraw %}`
        };

        // Use the global `ObjectInterpolator` from the included script
        const oi = new JSOI.ObjectInterpolator(obj, {
            One: 1
        }, {});
        await oi.interpolate();
        console.log(obj);
    })();
  </script>
</body>
</html>
```


**Note:** In django you will need to wrap the code above in verbatim, required so tags are not confused
```html
{% raw %}
{% verbatim %}
...
{% endverbatim %}
{% endraw %}

```
 