'use strict';

import * as THREE from './build/three.module.js';
import { STLLoader } from './build/STLLoader.js';
import { OrbitControls } from './build/OrbitControls.js';
import { TransformControls } from './build/TransformControls.js';
import { StrangeGui } from './StrangeGui.js';

class PartsAssembly {

    static boundsColor = 0x222222;

    constructor(parentScene, bounds) {
        this.parentScene = parentScene;
        this.rootMeshGroup = new THREE.Group();
        this.bounds = bounds;
        this.renderBounds();
    }

    addMeshGroupToScene(group) {
        this.parentScene.addSceneObjectDirectly(group);
    }

    renderBounds() {
        const triPerFace = 2;
        let geom = new THREE.BoxBufferGeometry(this.bounds.width, this.bounds.height,
                        this.bounds.length, triPerFace, triPerFace, triPerFace);
        let edgesGeom = new THREE.EdgesGeometry(geom);
        let edgesMaterial = new THREE.LineBasicMaterial({
            color: PartsAssembly.boundsColor
        });
        let wireSegments = new THREE.LineSegments(edgesGeom, edgesMaterial);
        let meshGroup = new THREE.Group();
        meshGroup.add(wireSegments);
        meshGroup.name = 'bounds';
        let geometries = [geom, edgesGeom];
        this.addMeshGroupToScene(meshGroup);
    }
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
        let pObj = JSON.parse(prog);
        let bounds = pObj.bounds
        let pa = new PartsAssembly(window.strangeScene, bounds);
        return prog;
    }
}

export { PartsCompiler };

