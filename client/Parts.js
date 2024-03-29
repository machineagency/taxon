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
        return part;
    }

    addJointForParent(joint, parentPart) {
        this.joints.push(joint);
        parentPart.joint = parentPart;
        let calcFaceOffset = (face, parentPart, childPart) => {
            if (joint.face === 'center') {
                return new THREE.Vector3();
            }
            let axisToDim = {
                x: 'width',
                y: 'height',
                z: 'length'
            }
            let sign = face[0] === '-' ? -1 : 1;
            let letter = face[1];
            console.assert(letter === 'x' || letter === 'y'
                                          || letter === 'z');
            let parentOffset = parentPart.dimensions[axisToDim[letter]];
            let childOffset = childPart.dimensions[axisToDim[letter]];
            let offset = new THREE.Vector3();
            offset[letter] = sign * (parentOffset + childOffset) / 2;
            return offset;

        }
        let calcDescendants = (part) => {
            let helper = (currPart, listSoFar) => {
                listSoFar.push(currPart);
                if (currPart.joint) {
                    let childPart = this.findPartWithName(child);
                    console.assert(childPart);
                    return helper(childPart, listSoFar);
                }
                return listSoFar;
            };
            let descendants = [];
            helper(part, descendants);
            return descendants;
        }
        let childPart = this.findPartWithName(joint.child);
        console.assert(parentPart && childPart);
        let mainTranslation = parentPart.position.clone()
                                .sub(childPart.position);
        let offsetTranslation = calcFaceOffset(joint.face, parentPart, childPart);
        let descendants = calcDescendants(childPart);
        descendants.forEach(part => {
            part.position.add(mainTranslation).add(offsetTranslation);
        });
    }

    findPartWithName(name) {
        return this.parts.find(p => p.name === name);
    }

    clearFromScene() {
        this.parentScene.scene.remove(this.rootMeshGroup);
        this.rootMeshGroup = new THREE.Group();
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
        this.rootMeshGroup.add(meshGroup);
    }
}

class Part {
    static DefaultColor = 0x222222;
    static TerminalColor = 0xe44242;
    static MotorColor = 0xffed90;

    constructor(partProgObj, partsAssembly) {
        this.partsAssembly = partsAssembly;
        this.name = partProgObj.name;
        this.type = partProgObj.type;
        this.mechanismData = partProgObj.mechanismData;
        this.modelMeshFilepath = partProgObj.modelMeshFilepath;
        this.meshGroup = new THREE.Group();
        this.partsAssembly.rootMeshGroup.add(this.meshGroup);
        // TODO: read dimensions/position from implementation or explicit
        if (partProgObj.position) {
            this.meshGroup.position.setX(partProgObj.position.x);
            this.meshGroup.position.setY(partProgObj.position.y);
            this.meshGroup.position.setZ(partProgObj.position.z);
        }
        if (partProgObj.dimensions) {
            this.dimensions = partProgObj.dimensions;
        }
        else {
            this.dimensions = {
                width: 25,
                height: 25,
                length: 25
            }
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
        if (this.type === 'motor') {
            meshColor = Part.MotorColor;
        }
        else if (this.type === 'terminal') {
            meshColor = Part.TerminalColor;
        }
        else {
            meshColor = Part.DefaultColor;
        }
        let meshMaterial = new THREE.MeshLambertMaterial({
            transparent: true,
            opacity: 0.10,
            color: meshColor
        });
        let mesh = new THREE.Mesh(geom, meshMaterial);
        let wireSegments = new THREE.LineSegments(edgesGeom, edgesMaterial);
        this.meshGroup.add(wireSegments);
        this.meshGroup.add(mesh);
        this.meshGroup.name = this.name;
        let geometries = [geom, edgesGeom];
        this.meshGroup.position.copy(this.position);
        if (this.modelMeshFilepath) {
            this.loadImplementationStl();
        }
    }

    removeFromScene() {
        if (this.meshGroup) {
            this.partsAssembly.strangeScene.scene.remove(this.meshGroup);
        }
    }

    loadImplementationStl() {
        const meshColor = 0xfefefe;
        let loadPromise = new Promise(resolve => {
            let loader = new STLLoader();
            let stlMesh;
            return loader.load(this.modelMeshFilepath, (stlGeom) => {
                let material = new THREE.MeshLambertMaterial({
                    color : meshColor,
                    // Do not cull triangles with inward-pointing normals
                    side: THREE.DoubleSide
                });
                stlGeom.center();
                stlMesh = new THREE.Mesh(stlGeom, material);
                stlMesh.isLoadedStl = true;
                // if (this.axes[0] === 'y') {
                //     stlMesh.rotateZ(Math.PI / 2);
                // }
                // else if (this.axes[0] === 'z') {
                //     stlMesh.rotateY(Math.PI / 2);
                // }
                this.meshGroup.add(stlMesh);
                resolve(stlMesh);
            }, undefined, (errorMsg) => {
                console.log(errorMsg);
            });
        });
        return loadPromise;
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
        pObj.parts.forEach(partProg => {
            let part = pa.addPart(new Part(partProg, pa));
        });
        pObj.parts.forEach(partProg => {
            let parentPart = pa.findPartWithName(partProg.name);
            let joint = partProg.joint;
            if (joint) {
                pa.addJointForParent(joint, parentPart);
            }
        });
        return prog;
    }
}

export { PartsCompiler };

