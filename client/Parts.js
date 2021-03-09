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
        this.parts = [];
        this.rootMeshGroup = new THREE.Group();
        this.parentScene.scene.add(this.rootMeshGroup);
        this.parentScene.partsAssembly = this;
        this.bounds = bounds;
        this.renderBounds();
    }

    addPart(part) {
        console.assert(part.meshGroup !== undefined);
        this.rootMeshGroup.add(part.meshGroup);
        this.parts.push(part);
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
        this.parentScene.addSceneObjectDirectly(meshGroup);
        this.parentScene.camera.lookAt(meshGroup.position);
        this.parentScene.camera.zoom = 2;
        this.parentScene.camera.updateProjectionMatrix();
    }
}

class Part {
    static DefaultColor = 0x222222;
    static MotorColor = 0xffed90;

    constructor(partProgObj, partsAssembly) {
        this.partsAssembly = partsAssembly;
        this.name = partProgObj.name;
        this.isMotor = !!partProgObj.isMotor;
        // TODO: read dimensions/position from implementation or explicit
        this.position = new THREE.Vector3(partProgObj.position.x,
                                          partProgObj.position.y,
                                          partProgObj.position.z);
        this.dimensions = {
            width: 25,
            height: 25,
            length: 25
        }
        this.render();
        this.partsAssembly.addPart(this);
    }

    render() {
        const triPerFace = 2;
        let geom = new THREE.BoxBufferGeometry(this.dimensions.width,
                                               this.dimensions.height,
                                               this.dimensions.length,
                        triPerFace, triPerFace, triPerFace);
        let edgesGeom = new THREE.EdgesGeometry(geom);
        let edgesMaterial = new THREE.LineBasicMaterial({
            color: PartsAssembly.boundsColor
        });
        let meshColor;
        if (this.isMotor) {
            meshColor = Part.MotorColor;
        }
        else {
            meshColor = Part.DefaultColor;
        }
        let meshMaterial = new THREE.MeshLambertMaterial({
            transparent: true,
            opacity: 0.05,
            color: meshColor
        });
        let mesh = new THREE.Mesh(geom, meshMaterial);
        let wireSegments = new THREE.LineSegments(edgesGeom, edgesMaterial);
        this.meshGroup = new THREE.Group();
        this.meshGroup.add(wireSegments);
        this.meshGroup.add(mesh);
        this.meshGroup.name = this.name;
        let geometries = [geom, edgesGeom];
        this.meshGroup.position.copy(this.position);
    }

    removeFromScene() {
        if (this.meshGroup) {
            this.partsAssembly.strangeScene.scene.remove(this.meshGroup);
        }
    }

    loadDetailFromImplementation(implementationObj) {
    }
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
        let motors = pObj.parts.filter(p => p.isMotor);
        motors.forEach(m => new Part(m, pa));
        return prog;
    }
}

export { PartsCompiler };

