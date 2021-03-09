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
        this.joints = [];
        this.rootMeshGroup = new THREE.Group();
        this.parentScene.scene.add(this.rootMeshGroup);
        this.parentScene.partsAssembly = this;
        this.bounds = bounds;
        this.renderBounds();
    }

    addPart(part) {
        this.parts.push(part);
    }

    addJointForParent(joint, parentPart) {
        this.joints.push(joint);
        let calcFaceOffsetForParent = (face, parentPart) => {
            let axisToDim = {
                x: 'width',
                y: 'height',
                z: 'length'
            }
            let sign = face[0] === '-' ? -1 : 1;
            let letter = face[1];
            console.assert(letter === 'x' || letter === 'y'
                                          || letter === 'z');
            let magnitude = parentPart.dimensions[axisToDim[letter]];
            let offset = new THREE.Vector3();
            offset[letter] = sign * magnitude;
            return offset;

        }
        let childPart = this.findPartWithName(joint.child);
        console.assert(parentPart && childPart);
        let mainTranslation = parentPart.position.clone()
                                .sub(childPart.position);
        let offsetTranslation = calcFaceOffsetForParent(joint.face, parentPart);
        childPart.position.add(mainTranslation)
                          .add(offsetTranslation);
    }

    findPartWithName(name) {
        return this.parts.find(p => p.name === name);
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
        this.meshGroup = new THREE.Group();
        this.partsAssembly.parentScene.scene.add(this.meshGroup);
        // TODO: read dimensions/position from implementation or explicit
        if (partProgObj.position) {
            this.meshGroup.position.setX(partProgObj.position.x);
            this.meshGroup.position.setY(partProgObj.position.y);
            this.meshGroup.position.setZ(partProgObj.position.z);
        }
        this.dimensions = {
            width: 25,
            height: 25,
            length: 25
        }
        this.render();
    }

    get position() {
        return this.meshGroup.position;
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
        pObj.parts.forEach(m => {
            pa.addPart(new Part(m, pa));
        });
        pObj.parts.forEach(partProg => {
            let joint = partProg.joint;
            if (joint) {
                let parentPart = pa.findPartWithName(partProg.name);
                pa.addJointForParent(joint, parentPart);
            }
        });
        return prog;
    }
}

export { PartsCompiler };

