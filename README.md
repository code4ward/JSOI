# JSOI 
You have found the JSOI distribution files.  JSOI is designed specifically for templating javascript objects. 
It is designed to aid in building dynamic and conditional configuration objects while preserving types in output 
if possible.

## REPO
The JSOI repo can be found here:  [JSOI Repo](https://github.com/code4ward/jsoi)

## JSOI Distribution
There are multiple ways to get JSOI.  You can just grab the prebuilt files or install with npm.  In either case,
distribution files come in two flavors minimized and non minimized. With support for ES Modules and global scope 
import (on the browser side).  Examples below cover common use cases 


<picture>
 <img alt="icon" src="icon.png" width="150">
</picture>

<!-- TOC -->
* [JSOI](#jsoi-)
  * [REPO](#repo)
  * [JSOI Distribution](#jsoi-distribution)
    * [Add to package.json file](#add-to-packagejson-file)
    * [For module import](#for-module-import)
      * [Minimized](#minimized)
      * [Non Minimized](#non-minimized)
        * [Using as module import in node](#using-as-module-import-in-node)
    * [Non module browser global scope](#non-module-browser-global-scope)
      * [Minimized (files needed)](#minimized-files-needed)
      * [Non Minimized (files needed)](#non-minimized-files-needed)
        * [Using in browser global scope](#using-in-browser-global-scope)
    * [Note on CommonJS import in Node](#note-on-commonjs-import-in-node)
<!-- TOC -->

### Add to package.json file
```json
{
  "dependencies": {
    "jsoi": "github:code4ward/jsoi"
  }
}
```


### For module import
For module import you need only 1 file, either the minimized or non minimized version:
#### Minimized
* [interpolation_objects_min.js](interpolation_objects_min.js)

#### Non Minimized
* [interpolation_objects.js](interpolation_objects.js)

##### Using as module import in node

> Example below shows node import.  Note package.json should have ```"type": "module"```.


```javascript


import { ObjectInterpolatorFunction } from "./interpolation_objects.js";

async function test() {
    const obj = {
        A: `{{ ->ƒ( '({{One}} == {{One}}) ? (2 * 5.{{One}}) : (4 / 3)' ) }}`,
    };

    const oi = new ObjectInterpolatorFunction(obj, {
        One: 1
    }, {});

    const matched = await oi.interpolate();
    console.log(obj);
}

test();

```


### Non module browser global scope
For non module import on the browser side you will need two files and these files should be in the same source
location in your script folder.  However, you will only link to the gs file in your html

#### Minimized (files needed)
* [interpolation_objects_gs_min.js](interpolation_objects_gs_min.js)
* [interpolation_objects_min.js](interpolation_objects_min.js)
#### Non Minimized (files needed)
* [interpolation_objects_gs.js](interpolation_objects_gs.js)
* [interpolation_objects.js](interpolation_objects.js)


##### Using in browser global scope
> Example below shows use in global scope browser side.  Note, make use of one of the files ending with: _ gs _.
```html

<script src="interpolation_objects_gs_min.js"></script>
<script>
  
( async () => {
    const obj = {
      A: "{{ ->ƒ( '({{One}} == {{One}}) ? (2 * 5.{{One}}) : (4 / 3)' ) }}",
      B: "{{ ->ƒ( '10.5 + -2 - 4' ) }}",
      C: "{{ ->ƒ( '({{One}} / 4) * 4' ) }}",
      D: "{{ ->ƒ( '(({{One}} / 4) * 4) == 4' ) }}",
      E: "{{ ->ƒ( '(({{One}} / 4) * 4) >= 4' ) }}",
      F: "{{ ->ƒ( '(({{One}} / 4) * 4) < 4' ) }}",
      G: "{{ ->ƒ( '!((({{One}} / 4) * 4) == 4)' ) }}",
      H: "{{ ->ƒ( '({{One}} == 2) && ({{One}} == {{One}})' ) }}",
      I: "{{ ->ƒ( '({{One}} == 2) || ({{One}} == {{One}})' ) }}",
    };

      
    const oi = new ObjectInterpolatorFunction(obj, {
        One: 1
    }, {});

    await oi.interpolate();
    console.log(obj);

})()
  
</script>

```

**Note:** In django you will need to wrap the code above in verbatim, required so tags are not confused
```html
{% raw %}
{% verbatim %}
...
{% endverbatim %}
{% endraw %}

```

### Note on CommonJS import in Node
Not currently supported.  I didn't see a need at this point to support this directly, since module imports have been 
defined in node for some time.
 