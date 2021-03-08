'use strict';

import * as THREE from './build/three.module.js';
import { STLLoader } from './build/STLLoader.js';
import { OrbitControls } from './build/OrbitControls.js';
import { TransformControls } from './build/TransformControls.js';
import { StrangeGui } from './StrangeGui.js';

class PartAssembly {
}

class Part {
}

class Joint {
    constructor(parentPart, childPart, jointType, offset) {
    }
}

class Powertrain {
    constructor() {
    }
}

class PartsCompiler {
    constructor() {
    }

    compile(prog) {
        return prog;
    }
}

export { PartsCompiler };

