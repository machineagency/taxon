'use strict';

import * as THREE from './build/three.module.js';
import { STLLoader } from './build/STLLoader.js';
import { OrbitControls } from './build/OrbitControls.js';
import { TransformControls } from './build/TransformControls.js';
import { Line2 } from './build/lines/Line2.js';
import { LineGeometry } from './build/lines/LineGeometry.js';
import { LineMaterial } from './build/lines/LineMaterial.js';

import { StrangeGui } from './StrangeGui.js';
import { TestPrograms } from './TestPrograms.js';

class StrangeScene {
    static modelBoxHelperColor = 0xe44242;
    constructor() {
        this.scene = this.initScene();
        this.camera = this.initCamera(this.scene, true);
        this.renderer = this.initRenderer();
        this.clock = new THREE.Clock();
        this.mixers = [];
        this.controls = this.initControls(this.camera, this.renderer);
        this.instructionQueue = new InstructionQueue();
    }

    initScene() {
        let scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf5f6f8);
        let topDirectionalLight = new THREE.DirectionalLight(0xffffff, 0.75);
        let leftDirectionalLight = new THREE.DirectionalLight(0xffffff, 0.50);
        let rightDirectionalLight = new THREE.DirectionalLight(0xffffff, 0.25);
        let ambientLight = new THREE.AmbientLight(0x404040);
        leftDirectionalLight.position.set(-1.0, 0.0, 0.0);
        rightDirectionalLight.position.set(0.0, 0.0, 1.0);
        scene.add(topDirectionalLight);
        scene.add(leftDirectionalLight);
        scene.add(rightDirectionalLight);
        scene.add(ambientLight);
        this.materialMarks = new THREE.Group();
        this.toolpaths = new THREE.Group();
        scene.add(this.materialMarks);
        scene.add(this.toolpaths);
        return scene;
    }

    initCamera(scene, isOrtho) {
        let camera;
        let aspect = window.innerWidth / window.innerHeight;
        let viewSize = 150;
        if (isOrtho) {
            camera = new THREE.OrthographicCamera(-viewSize * aspect,
                viewSize * aspect,
                viewSize, -viewSize, -1000, 10000);
            camera.zoom = 0.35;
            camera.updateProjectionMatrix();
            camera.frustumCulled = false;
            camera.position.set(-500, 500, 500); // I don't know why this works
            camera.lookAt(scene.position);
            camera.position.set(-400, 500, 800); // Pan away to move machine to left
        }
        else {
            let fov = 50;
            camera = new THREE.PerspectiveCamera(fov, aspect, 0.01, 30000);
            camera.lookAt(scene.position);
            camera.position.set(-500, 500, 500);
            camera.updateProjectionMatrix();
        }
        return camera;
    }

    initRenderer() {
        let renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        container.appendChild(renderer.domElement);
        return renderer;
    }

    initControls(camera, renderer) {
        let controls = new OrbitControls(camera, renderer.domElement);
        controls.rotateSpeed = 1.0;
        controls.zoomSpeed = 0.8;
        controls.panSpeed = 0.8;
        controls.keys = [65, 83, 68];
        return controls;
    }

    addSceneObjectDirectly(sceneObj) {
        this.scene.add(sceneObj);
    }

    removeFromScene(sceneObj) {
        this.scene.remove(sceneObj);
    }

    addToolpath(toolpath) {
        this.toolpaths.add(toolpath);
    }

    removeMaterialMarks() {
        this.scene.remove(this.materialMarks);
        this.materialMarks = new THREE.Group();
    }

    renderScene() {
        this.controls.update();
        let deltaSeconds = this.clock.getDelta();
        this.mixers.forEach((mixer) => {
            mixer.update(deltaSeconds);
        });
        this.renderer.render(this.scene, this.camera);
    }

    getClickedObjectsFromClickEvent(event) {
        if (this.machine === undefined) {
            return [];
        }
        let vector = new THREE.Vector3();
        let raycaster = new THREE.Raycaster();
        let dir = new THREE.Vector3();
        let candidates = this.machine.blocks;
        let candidateMeshes = candidates.map(c => c.meshGroup);

        vector.set((event.clientX / window.innerWidth) * 2 - 1,
            -(event.clientY / window.innerHeight) * 2 + 1, -1); // z = - 1 important!
        vector.unproject(this.camera);
        dir.set(0, 0, -1).transformDirection(this.camera.matrixWorld);
        raycaster.set(vector, dir);

        let searchRecursively = true;
        let isectMeshes = raycaster.intersectObjects(candidateMeshes,
                            searchRecursively);
        if (isectMeshes.length === 0) {
            return [];
        }
        let meshGroupNames = isectMeshes.map(m => m.object.parent.blockName);
        return meshGroupNames;
    }

    loadModel(filepath) {
        if (this.machine === undefined) {
            const e = 'Please pick a machine before uploading a model.';
            window.strangeGui.writeErrorToJobLog(e);
            return Promise.reject(new Error('Need to pick machine first'));
        }
        if (this.model !== undefined) {
            this.clearModelFromScene();
        }
        let loadPromise = new Promise(resolve => {
            let loader = new STLLoader();
            let stlMesh;
            return loader.load(filepath, (stlGeom) => {
                let material = new THREE.MeshLambertMaterial({
                    color : BuildEnvironment.color,
                    // Do not cull triangles with inward-pointing normals
                    side: THREE.DoubleSide
                });
                // stlGeom.center();
                stlMesh = new THREE.Mesh(stlGeom, material);
                stlMesh.isLoadedStl = true;
                this.model = stlMesh;
                this.modelGeom = stlGeom;
                this.modelBoxHelper = new THREE.BoxHelper(stlMesh,
                                        StrangeScene.modelBoxHelperColor);
                this.modelBox3 = new THREE.Box3();
                // NOTE: for some reason, we need to call Box3.setFromObject
                // before calling it after positioning the model in the
                // work envelope as well, otherwise we get an internal
                // threejs error
                this.modelBox3.setFromObject(this.model);
                this.scene.add(this.model);
                this.scene.add(this.modelBoxHelper);
                this.positionModelOnWorkEnvelope();
                this.modelBox3.setFromObject(this.model);
                this.checkModelFitsInWorkEnvelope();
                let modelStats = this.calculateModelStats();
                let m = JSON.stringify(modelStats, undefined, 2);
                window.strangeGui.writeMessageToModelCheck(m);
                resolve(stlMesh);
            }, undefined, (errorMsg) => {
                console.log(errorMsg);
            });
        });
        return loadPromise;
    };

    calculateModelStats() {
        let stats = {
            modelFileName : '',
            fitsInWorkEnvelope : false,
            materialMatches : false
        };
        let modelFileInputDom = document.getElementById('new-model-input');
        let fileNameTokens = modelFileInputDom.value.split('\\');
        stats.modelFileName = fileNameTokens[fileNameTokens.length - 1];
        stats.fitsInWorkEnvelope = this.checkModelFitsInWorkEnvelope();
        return stats;
    }

    positionModelOnWorkEnvelope() {
        if (this.model === undefined) {
            return;
        }
        let wePos = this.machine.workEnvelope.position.clone();
        let xOff = (this.modelBox3.max.x - this.modelBox3.min.x) / 2;
        let yOff = (this.modelBox3.max.y - this.modelBox3.min.y);
        let zOff = (this.modelBox3.max.z - this.modelBox3.min.z) / 2;
        // FIXME: the y axis is messed up, idk how to get the correct
        // number in practice
        let offVect = new THREE.Vector3(xOff, 0, zOff);
        wePos.sub(offVect);
        this.model.position.copy(wePos);
        this.modelBoxHelper.update();
    }

    rotateModelOverAxis(axis) {
        // NOTE: doesn't rotate around center of model, but rather
        // the origin which is at a corner of the bounding box. This
        // is not ideal behavior, but I'm not sure what I can do to
        // fix this.
        if (this.machine === undefined || this.model === undefined) {
            const m = 'Please pick a machine and model first.';
            window.strangeGui.writeMessageToModelCheck(m);
            return;
        }
        let rotQ = new THREE.Quaternion();
        let eulerAngle
        if (axis === 'x') {
            eulerAngle = new THREE.Euler(Math.PI / 2, 0, 0);
        }
        else if (axis === 'y') {
            eulerAngle = new THREE.Euler(0, 0, Math.PI / 2);
        }
        else if (axis === 'z') {
            eulerAngle = new THREE.Euler(0, Math.PI / 2, 0);
        }
        else {
            console.error('Must specify rotation axis');
            return;
        }
        rotQ.setFromEuler(eulerAngle);
        this.model.quaternion.multiply(rotQ);
        this.modelBoxHelper.update();
        this.modelBox3.setFromObject(this.model);
        let modelStats = this.calculateModelStats();
        let m = JSON.stringify(modelStats, undefined, 2);
        window.strangeGui.writeMessageToModelCheck(m);
    }

    checkModelFitsInWorkEnvelope() {
        console.assert(this.machine !== undefined, this);
        console.assert(this.model !== undefined, this);
        let origin = this.machine.workEnvelope.position.clone();
        let we = this.machine.workEnvelope;
        let weSizeVect = new THREE.Vector3(we.width, we.height, we.length);
        let weBox = new THREE.Box3();
        weBox.setFromCenterAndSize(origin, weSizeVect);
        let fitResult = weBox.containsBox(this.modelBox3);
        return fitResult;
    }

    clearModelFromScene() {
        this.scene.remove(this.model);
        this.scene.remove(this.modelBox3);
        this.scene.remove(this.modelBoxHelper);
        this.model = undefined;
        this.modelBox3 = undefined;
        this.modelBoxHelper = undefined;
    }

}

class InstructionQueue {

    // NOTE: instantiate only one InstructionQueue and do so as
    // StrangeScene.InstructionQueue
    constructor() {
        this.arr = [];
        this.unsetMotorsBusy();
        this.currInstIdx = -1;
    }

    get length() {
        return this.arr.length;
    }

    get isEmpty() {
        return this.length === 0;
    }

    setMotorsBusy() {
        this.motorsBusy = true;
    }

    unsetMotorsBusy() {
        this.motorsBusy = false;
    }

    setKinematics(kinematics) {
        this.kinematics = kinematics;
    }

    setJobFile(jobFile) {
        this.jobFile = jobFile;
    }

    enqueueInstruction(instruction) {
        return this.arr.push(instruction);
    }

    setQueueFromArray(instArray) {
        this.arr = instArray.slice();
    }

    peekNext() {
        return this.arr[0];
    }

    instIsComment(inst) {
        return inst[0] === ';';
    }

    instIsMCode(inst) {
        return inst[0] === 'M';
    }

    executeNextInstruction() {
        if (this.kinematics === undefined) {
            console.error('No kinematics set for instruction queue.');
            return;
        }
        if (this.jobFile === undefined) {
            // Moves that don't involve pre-loaded files
            return;
        }
        if (this.isEmpty) {
            let m = 'No more instructions to execute.';
            window.strangeGui.writeMessageToJobLog(m);
            this.currInstIdx = -1;
            let zeroGrid = this.kinematics.zeroGrid;
            this.kinematics.strangeScene.removeFromScene(zeroGrid);
            jobFile.removeDomHighlight();
            window.strangeScene.removeMaterialMarks();
            return;
        }
        if (this.motorsBusy) {
            console.warn(`Motors are busy. Next instruction: ${this.peekNext()}.`);
            return;
        }
        this.currInstIdx += 1;
        let nextInst = this.arr.splice(0, 1)[0];
        this.__executeInst(nextInst);
    }

    doDryRunInstructions() {
        return this.__dryExecuteInstWithIndex(0);
    }

    __executeInst(inst) {
        if (this.instIsComment(inst) || this.instIsMCode(inst)) {
            // Set timeout for next instruction after a comment because
            // we don't want to call the next instruction on this current
            // stack frame—let this frame return and call next EPS_MS later.
            let epsMs = 10;
            setTimeout(() => this.executeNextInstruction(), epsMs);
            return;
        }
        console.log(`Executing: ${inst}`);
        jobFile.setDomHighlightToInstIdx(this.currInstIdx);
        this.setMotorsBusy();
        let tokens = inst.split(' ');
        let opcode = tokens[0];
        if (opcode === 'G0' || opcode === 'G1') {
            this.__handleG0(tokens);
        }
        if (opcode === 'G92') {
            this.__handleG92(tokens);
        }
    }

    __dryExecuteInstWithIndex(instIdx) {
        // TODO: static checking recursively
        if (this.arr[instIdx] === undefined) {
            return;
        }
        if (this.instIsComment(inst)) {
            // Assuming tail call optimization
            return this.__dryExecuteInstWithIndex(instIdx + 1);
        }
        console.log(`Checking: ${inst}`);
        let tokens = inst.split(' ');
        let opcode = tokens[0];
        if (opcode === 'G0' || opcode === 'G1') {
            // Run absolute -> relative, then static check
        }
        if (opcode === 'G92') {
            // Have to set zero actually and undo it later, or
            // save to a separate zero?
        }
        return this.__dryExecuteInstWithIndex(instIdx + 1);
    }

    __handleG0(tokens) {
        let xCoord = parseInt(tokens[1].substring(1));
        let yCoord = parseInt(tokens[2].substring(1));
        let zCoord = parseInt(tokens[3].substring(1));
        let axesToCoords = {
            x: xCoord,
            y: yCoord,
            z: zCoord
        };
        // This call eventually sets a callback that calls
        // executeInstruction in a THREE.js mixer in StrangeScene
        let moveSuccessResult = this.kinematics.moveTool(axesToCoords);
        if (!moveSuccessResult) {
            this.unsetMotorsBusy();
            this.jobFile.highlightCurrInstAsError();
            let zeroGrid = this.kinematics.zeroGrid;
            this.kinematics.strangeScene.removeFromScene(zeroGrid);
            this.currInstIdx = -1;
        }
    }

    __handleG92(tokens) {
        this.kinematics.zeroAtCurrentPosition();
        this.unsetMotorsBusy();
        this.executeNextInstruction();
    }
}

class Machine {
    constructor(name, parentScene, isPreview=false) {
        this.name = name;
        this.parentScene = parentScene;
        this.isPreview = isPreview;
        this.rootMeshGroup = new THREE.Group();
        this.parentScene.scene.add(this.rootMeshGroup);
        this.buildEnvironment = undefined;
        this.workEnvelope = undefined;
        this.mechanisms = [];
        this.tools = [];
        this.motors = [];
        this.connections = [];
        // Eagerly store paired motors, whereas parallel motors are
        // inferred lazily later on.
        this.pairedMotors = [];
        this.axisToDim = {
            'x': 'width',
            'y': 'height',
            'z': 'length'
        };
        if (this.isPreview) {
            parentScene.previewMachine = this;
        }
        else {
            parentScene.machine = this;
        }
    }

    get blocks() {
        return this.mechanisms.concat(this.tools)
                .concat(this.motors);
    }

    recolorAndMoveMachineForPreviewing(recolorName) {
        const color = recolorName === 'green' ? 0x2ecc71 : 0xe44242;
        let previewMaterialWorkEnvelope = new THREE.MeshLambertMaterial({
            color: color,
            transparent: true,
            opacity: 0.75
        });
        let previewMaterialWire = new THREE.LineBasicMaterial({
            color: color
        });
        this.rootMeshGroup.traverse((child) => {
            if (child.isWorkEnvelopeMesh) {
                child.material = previewMaterialWorkEnvelope;
            }
            else if (child instanceof THREE.LineSegments) {
                child.material = previewMaterialWire;
            }
            else if (child instanceof THREE.Mesh
                        || child instanceof THREE.ArrowHelper) {
                child.visible = false;
            }
        });
    }

    findParallelBlockGroups() {
        let blocksByAddId = {};
        this.connections.forEach((connection) => {
            let addId = connection.addBlock.id;
            if (blocksByAddId[addId] === undefined) {
                blocksByAddId[addId] = [connection.baseBlock];
            }
            else {
                blocksByAddId[addId].push(connection.baseBlock);
            }
        });
        let parallelBlockGroups = [];
        Object.keys(blocksByAddId).forEach((addId) => {
            if (blocksByAddId[addId].length > 1) {
                parallelBlockGroups.push(blocksByAddId[addId]);
            }
        });
        return parallelBlockGroups
    }

    __calcBlockDimVectorFromAxis(block, axis) {
        if (axis === 'center') {
            return new THREE.Vector3(0, 0, 0);
        }
        let sign = axis[0] === '+' ? 1 : -1;
        if (axis[1] === 'x') {
            return new THREE.Vector3(sign * block.width, 0, 0);
        }
        if (axis[1] === 'y') {
            return new THREE.Vector3(0, sign * block.height, 0);
        }
        if (axis[1] === 'z') {
            return new THREE.Vector3(0, 0, sign * block.length);
        }
        else {
            console.error(`Invalid axis: ${axis}`);
        }
    }

    addMechanism(mechanism) {
        this.mechanisms.push(mechanism);
    }

    addTool(tool) {
        this.tools.push(tool);
    }

    addMotor(motor) {
        this.motors.push(motor);
    }

    findBlockWithName(name) {
        let block = this.blocks.find(block => block.name === name);
        if (block === undefined) {
            console.trace(`Couldn't find block named: ${name}.`);
        }
        return block;
    }

    getTool() {
        // TODO: toolswitching
        return this.tools[0];
    }

    getPlatform() {
        return this.blocks.find((b) => b.componentType === 'Platform');
    }

    hide() {
        this.rootMeshGroup.visible = false;
    }

    show() {
        this.rootMeshGroup.visible = true;
    }

    clearMachineFromScene() {
        if (this.buildEnvironment !== undefined) {
            this.buildEnvironment.removeMeshGroupFromScene();
            this.buildEnvironment = undefined;
        }
        if (this.workEnvelope !== undefined) {
            this.workEnvelope.removeMeshGroupFromScene();
            this.workEnvelope = undefined;
        }
        let blocksMotorsTools = this.blocks
                                    .concat(this.motors)
                                    .concat(this.tools);
        blocksMotorsTools.forEach((block, index) => {
            block.removeMeshGroupFromScene();
        });
        this.blocks = [];
        this.tools = [];
        this.motors = [];
        if (this.isPreview) {
            this.parentScene.previewMachine = undefined;
        }
        else {
            this.parentScene.machine = undefined;
        }
    }

    /**
     * Connects two components such that the center point on a face of some
     * addBlock becomes fixed to the center of the face of baseBlock.
     * For now, we only support center connections, but later will support
     * connections at either end.
     *
     * connectionObj should be of the form:
     * {
     *      baseBlock: Component,
     *      baseBlockFace: String in { '+x', '-x', '+y', ... , '-z' },
     *      addBlock: Component,
     *      addBlockFace: String in { '+x', '-x', '+y', ... , '-z' }
     * }
     */
    setConnection(connectionObj) {
        let { baseBlock, baseBlockFace, baseBlockEnd, addBlock, addBlockFace,
                addBlockEnd } = connectionObj;
        let facePairsToRadians = (fStr) => {
            let signA = fStr[0] === '-' ? -1 : +1;
            let signB = fStr[3] === '-' ? -1 : +1;
            let axisA = fStr[1];
            let axisB = fStr[4];
            if (axisA === axisB) {
                if (signA === signB) {
                    return Math.PI;
                }
                else {
                    return 0;
                }
            }
            else {
                // FIXME: are these the ones we want? Check geometric intuition
                if (axisA === 'y' && axisB === 'x' ||
                    axisA === 'x' && axisB === 'z' ||
                    axisA === 'y' && axisB === 'z') {
                    return signA * signB * Math.PI / 2;
                }
                else {
                    return -(signA * signB * Math.PI / 2);
                }
            }
        };
        let facePairsToRotationAxis = (fStr) => {
            let axisA = fStr[1];
            let axisB = fStr[4];
            if (axisA === 'x' && axisB === 'y'
                || axisA === 'y' && axisB === 'x') {
                return new THREE.Vector3(1, 0, 0);
            }
            if (axisA === 'x' && axisB === 'z'
                || axisA === 'z' && axisB === 'x') {
                return new THREE.Vector3(0, 1, 0);
            }
            if (axisA === 'y' && axisB === 'z'
                || axisA === 'z' && axisB === 'y') {
                return new THREE.Vector3(0, 0, 1);
            }
            if (axisA === 'x' && axisB === 'x') {
                return new THREE.Vector3(0, 1, 0);
            }
            if (axisA === 'y' && axisB === 'y') {
                return new THREE.Vector3(1, 0, 0);
            }
            if (axisA === 'z' && axisB === 'z') {
                return new THREE.Vector3(0, 1, 0);
            }
        };
        let facePairsToTranslationVectorFn = (fStr) => {
            // Translation dimension is dim(A)
            // Distance is sign(A) * (cA.dim(A) + cB.dim(B))
            let signA = fStr[0] === '-' ? -1 : +1;
            let axisA = fStr[1];
            let axisB = fStr[4];
            let dimA = this.axisToDim[axisA];
            let dimB = this.axisToDim[axisB];
            // NOTE: see reversal note below
            let transDist = signA * (baseBlock[dimB] + addBlock[dimA]) / 2;
            if (axisA === 'x') {
                return new THREE.Vector3(transDist, 0, 0);
            }
            if (axisA === 'y') {
                return new THREE.Vector3(0, transDist, 0);
            }
            if (axisA === 'z') {
                return new THREE.Vector3(0, 0, transDist);
            }
        };
        let calcOffsetOnRefBlock = (refBlock, moveBlock, endAxis) => {
            let point = (new THREE.Vector3());
            if (endAxis === 'center') {
                return point;
            }
            let refOffset = this.__calcBlockDimVectorFromAxis(refBlock, endAxis);
            let moveOffset = this.__calcBlockDimVectorFromAxis(moveBlock, endAxis);
            point.add(refOffset.multiplyScalar(0.5));
            point.add(moveOffset.multiplyScalar(-0.5));
            return point;
        };

        // NOTE: reverse order faces otherwise connections are in backwards
        // configuration for some reason
        let fStr = [addBlockFace, baseBlockFace].join();

        // Rotate translation vector to match baseBlock's quaternion
        let translationVector = facePairsToTranslationVectorFn(fStr);
        translationVector.applyQuaternion(baseBlock.quaternion);

        // Rotate translation vector according to table
        let rotationAxis = facePairsToRotationAxis(fStr);
        let connectRotationRadians = facePairsToRadians(fStr);
        translationVector.applyAxisAngle(rotationAxis, connectRotationRadians);
        let newBPos = (new THREE.Vector3()).copy(baseBlock.position);
        newBPos.add(translationVector);

        // Apply rotation and translation (except for offset)
        addBlock.quaternion = baseBlock.quaternion;
        addBlock.rotateOverAxis(rotationAxis, connectRotationRadians);
        addBlock.position = newBPos;

        // Apply end offset, itself rotated to match addBlock's quaternion
        // FIXME: apply this to all children of the addBlock
        let offsetAlongBase = calcOffsetOnRefBlock(baseBlock, addBlock,
                                addBlockEnd);
        let offsetAlongAdd = calcOffsetOnRefBlock(addBlock, baseBlock,
                                baseBlockEnd);
        offsetAlongBase.applyQuaternion(baseBlock.quaternion);
        offsetAlongAdd.applyQuaternion(addBlock.quaternion);
        addBlock.position = addBlock.position.add(offsetAlongBase.negate());
        addBlock.position = addBlock.position.add(offsetAlongAdd.negate());

        addBlock.baseBlock = false;
        this.connections.push(connectionObj);
        return this;
    }

    presetLoaders = {
        xyPlotter: () => {
            this.clearMachineFromScene();
            let be = new BuildEnvironment(this, {
                length: 500,
                width: 500
            });
            let tool = new Tool(this, {
                type: 'pen',
                height: 50,
                radius: 5
            });
            let stageA = new LinearStage(this, {
                length: 250
            });
            let stageB = new LinearStage(this, {
                length: 250
            });
            let stageC = new LinearStage(this, {
                length: 300
            });
            stageA.placeOnComponent(be);
            stageB.placeOnComponent(be);
            stageA.movePosition(-125, 0, 0);
            stageB.movePosition(125, 0, 0);
            stageC.movePosition(0, 75, 0);
            stageC.rotateOnXYPlane();
            stageC.rotateToXYPlane();
            stageC.rotateToXYPlane();
            tool.movePosition(0, -125, 0);
            return this;
        },
        axidraw: () => {
            this.clearMachineFromScene();
            let be = new BuildEnvironment(this, {
                length: 500,
                width: 500
            });
            let tool = new Tool('Sharpie', this, {
                width: 10,
                height: 50,
                length: 10
            }, { toolType : 'pen' });
            let toolAssembly = new ToolAssembly('Servo', this, {
                width: 12.5,
                height: 25,
                length: 50
            });
            let stageTop = new LinearStage('Top', this, {
                width: 250,
                height: 25,
                length: 50
            });
            let stageBottom = new LinearStage('Bottom', this, {
                width: 50,
                height: 50,
                length: 250
            });
            let motorA = new Motor('MotorA', this, {
                width: 50,
                height: 50,
                length: 50
            }, 'hBot');
            let motorB = new Motor('MotorB', this, {
                width: 50,
                height: 50,
                length: 50
            }, 'hBot');
            stageBottom.placeOnComponent(be);
            stageBottom.movePosition(50, 0, 0);
            this.setConnection({
                baseBlock: stageBottom,
                baseBlockFace: '-y',
                baseBlockEnd: 'center',
                addBlock: stageTop,
                addBlockFace: '+y',
                addBlockEnd: 'center'
            });
            this.setConnection({
                baseBlock: stageTop,
                baseBlockFace: '+x',
                baseBlockEnd: 'center',
                addBlock: toolAssembly,
                addBlockFace: '-x',
                addBlockEnd: 'center'
            });
            this.setConnection({
                baseBlock: stageBottom,
                baseBlockFace: '+z',
                baseBlockEnd: 'center',
                addBlock: motorA,
                addBlockFace: '-z',
                addBlockEnd: 'center'
            });
            this.setConnection({
                baseBlock: stageBottom,
                baseBlockFace: '-z',
                baseBlockEnd: 'center',
                addBlock: motorB,
                addBlockFace: '+z',
                addBlockEnd: 'center'
            });
            this.setConnection({
                baseBlock: toolAssembly,
                baseBlockFace: '+x',
                baseBlockEnd: 'center',
                addBlock: tool,
                addBlockFace: '-x',
                addBlockEnd: 'center'
            });
            stageBottom.setAttributes({
                driveType: 'timingBelt',
                stepDisplacementRatio: '0.7'
            });
            stageTop.setAttributes({
                driveType: 'timingBelt',
                stepDisplacementRatio: '0.7'
            });
            this.setPairABMotors(motorA, motorB);
            stageBottom.setDrivingMotors([motorA, motorB]);
            stageTop.setDrivingMotors([motorA, motorB]);
            return this;
        },
        prusa: () => {
            this.clearMachineFromScene();
            let be = new BuildEnvironment(this, {
                length: 500,
                width: 500
            });
            let platform = new Platform('build plate', this, {
                length: 200 - 35 * 2,
                width: 200 - 35 * 2
            });
            let platformBelt = new LinearStage('platform belt', this, {
                width: 200 - 35,
                height: 25,
                length: 25
            }, {
                driveType: 'timingBelt',
                stepDisplacementRatio: 0.7
            });
            let carriageBelt = new LinearStage('carriage belt', this, {
                width: 12.5,
                height: 25,
                length: 210
            }, {
                driveType: 'timingBelt',
                stepDisplacementRatio: 0.5
            });
            let lsA = new LinearStage('z leadscrew a', this, {
                width: 10,
                height: 150,
                length: 10
            }, {
                driveType: 'leadscrew',
                stepDisplacementRatio: 0.5
            });
            let lsB = new LinearStage('z leadscrew b', this, {
                width: 10,
                height: 150,
                length: 10
            }, {
                driveType: 'leadscrew',
                stepDisplacementRatio: 0.5
            });
            let lsMotorA = new Motor('leadscrew motor a', this, {
                width: 25,
                height: 25,
                length: 25
            });
            let lsMotorB = new Motor('leadscrew motor b', this, {
                width: 25,
                height: 25,
                length: 25
            });
            let platformMotor = new Motor('platform belt motor', this, {
                width: 25,
                height: 25,
                length: 25
            });
            let carriageMotor = new Motor('carriage belt motor', this, {
                width: 25,
                height: 25,
                length: 25
            });
            platformBelt.placeOnComponent(be);
            lsMotorA.placeOnComponent(be);
            lsMotorB.placeOnComponent(be);
            lsMotorA.movePosition(35, 0, -100);
            lsMotorB.movePosition(35, 0, +100);
            this.setConnection({
                baseBlock: lsMotorA,
                baseBlockFace: '-y',
                baseBlockEnd: 'center',
                addBlock: lsA,
                addBlockFace: '+y',
                addBlockEnd: 'center'
            });
            this.setConnection({
                baseBlock: lsMotorB,
                baseBlockFace: '-y',
                baseBlockEnd: 'center',
                addBlock: lsB,
                addBlockFace: '+y',
                addBlockEnd: 'center'
            });
            this.setConnection({
                baseBlock: platformBelt,
                baseBlockFace: '+x',
                baseBlockEnd: 'center',
                addBlock: platformMotor,
                addBlockFace: '-x',
                addBlockEnd: 'center'
            });
            carriageBelt.placeOnComponent(be);
            this.setConnection({
                baseBlock: platformBelt,
                baseBlockFace: '-y',
                baseBlockEnd: 'center',
                addBlock: platform,
                addBlockFace: '+y',
                addBlockEnd: 'center'
            });
            this.setConnection({
                baseBlock: lsA,
                baseBlockFace: '+x',
                baseBlockEnd: 'center',
                addBlock: carriageBelt,
                addBlockFace: '-x',
                addBlockEnd: '+z'
            });
            this.setConnection({
                baseBlock: lsB,
                baseBlockFace: '+x',
                baseBlockEnd: 'center',
                addBlock: carriageBelt,
                addBlockFace: '-x',
                addBlockEnd: '-z'
            });
            this.setConnection({
                baseBlock: carriageBelt,
                baseBlockFace: '+z',
                baseBlockEnd: 'center',
                addBlock: carriageMotor,
                addBlockFace: '-x',
                addBlockEnd: '+x'
            });
            let toolAssembly = new ToolAssembly('hotend', this, {
                width: 12.5,
                height: 25,
                length: 25
            });
            this.setConnection({
                baseBlock: carriageBelt,
                baseBlockFace: '+x',
                baseBlockEnd: 'center',
                addBlock: toolAssembly,
                addBlockFace: '-x',
                addBlockEnd: 'center'
            });
            let tool = new Tool('extruder', this, {
                width: 10,
                height: 25,
                length: 10
            }, { toolType: 'extruder' });
            this.setConnection({
                baseBlock: toolAssembly,
                baseBlockFace: '+x',
                baseBlockEnd: 'center',
                addBlock: tool,
                addBlockFace: '-x',
                addBlockEnd: 'center'
            });
            platformBelt.setDrivingMotors([platformMotor]);
            carriageBelt.setDrivingMotors([carriageMotor]);
            lsA.setDrivingMotors([lsMotorA]);
            lsB.setDrivingMotors([lsMotorB]);
            platformMotor.setInvertSteps();
            return this;
        },
        connectionSandbox: () => {
            this.clearMachineFromScene();
            let be = new BuildEnvironment(this, {
                length: 500,
                width: 500
            });
            let s0 = new LinearStage(this, {
                width: 50,
                height: 25,
                length: 250
            });
            let s1 = new LinearStage(this, {
                width: 50,
                height: 25,
                length: 200
            });
            let s2 = new LinearStage(this, {
                width: 50,
                height: 25,
                length: 150
            });
            s0.placeOnComponent(be);
            s1.placeOnComponent(be);
            this.setConnection({
                baseBlock: s0,
                baseBlockFace: '-z',
                addBlock: s1,
                addBlockFace: '+x',
                addBlockEnd: '+'
            });
            this.setConnection({
                baseBlock: s1,
                baseBlockFace: '+y',
                addBlock: s2,
                addBlockFace: '-z',
                addBlockEnd: 'center'
            });
            return this;
        }
    };
}

class StrangeComponent {
    static geometryFactories = {
        stageCase: (d) =>
            new THREE.BoxBufferGeometry(d.width, d.height, d.length, 2, 2, 2),
        stagePlatform: () => new THREE.BoxBufferGeometry(50, 25, 50, 2, 2, 2),
        rotaryStageCase: () => new THREE.BoxBufferGeometry(150, 50, 150, 2, 2, 2),
        rotaryStagePlatform: () => new THREE.CylinderBufferGeometry(50, 50, 80, 10),
        tool: (dimensions) => {
            let radius = dimensions.width / 2;
            let height = dimensions.height;
            let numSegments = 10;
            return new THREE.CylinderBufferGeometry(radius, radius, height,
                                                    numSegments);
        },
        toolAssembly: (d) => new THREE.BoxBufferGeometry(d.width, d.height,
                                    d.length, 2, 2, 2),
        connectionHandle: () => new THREE.SphereBufferGeometry(25, 32, 32),
        buildEnvironment: (dimensions) => new THREE.BoxBufferGeometry(
                                             dimensions.width,
                                             dimensions.length, 25, 2, 2, 2),
        workEnvelope: (dimensions) => {
            if (dimensions.shape === undefined) {
                return new THREE.PlaneBufferGeometry(250, 250);
            }
            if (dimensions.shape === 'rectangle') {
                return new THREE.PlaneBufferGeometry(dimensions.length,
                                                     dimensions.width);
            }
            if (dimensions.shape === 'box') {
                return new THREE.BoxBufferGeometry(dimensions.width,
                    dimensions.height, dimensions.length, 2, 2, 2);
            }
            if (dimensions.shape === 'cylinder') {
                return new THREE.CylinderBufferGeometry(dimensions.radius,
                    dimensions.radius, dimensions.height, 64);
            }
        }
    };

    constructor(name, parentMachine, dimensions) {
        this.name = name;
        this._dimensions = dimensions;
        this.geometries = [];
        this.meshGroup = new THREE.Group();
        this.rotatedToPlane = false;
        this.parentMachine = parentMachine;
    }

    get position() {
        return this.meshGroup.position;
    }

    get quaternion() {
        return this.meshGroup.quaternion;
    }

    set position(xyzObj) {
        this.meshGroup.position.set(xyzObj.x, xyzObj.y, xyzObj.z);
    }

    set quaternion(newQuat) {
        this.meshGroup.quaternion.set(newQuat.x, newQuat.y, newQuat.z, newQuat.w);
    }

    get dimensions() {
        return this._dimensions;
    }

    set dimensions(newDims) {
        this._dimensions = newDims;
        this.renderDimensions();
    }

    get width() {
        return this._dimensions.width;
    }

    get height() {
        return this._dimensions.height;
    }

    get length() {
        return this._dimensions.length;
    }

    movePosition(deltaX, deltaY, deltaZ) {
        let currPos = this.position;
        currPos.setX(currPos.x + deltaX);
        currPos.setY(currPos.y + deltaY);
        currPos.setZ(currPos.z + deltaZ);
    }

    rotateToXYPlane() {
        let rotateQuaternion = new THREE.Quaternion();
        rotateQuaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0),
                                          -Math.PI / 2);
        this.meshGroup.applyQuaternion(rotateQuaternion);
        // FIXME: remove this variable and just read the quaternion
        this.rotatedToPlane = true;
    }

    rotateOnXYPlane() {
        let rotateQuaternion = new THREE.Quaternion();
        rotateQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0),
                                          -Math.PI / 2);
        this.meshGroup.applyQuaternion(rotateQuaternion);
        // FIXME: remove this variable and just read the quaternion
        this.rotatedToPlane = true;
    }

    rotateOverXYPlane() {
        let rotateQuaternion = new THREE.Quaternion();
        rotateQuaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1),
                                          -Math.PI / 2);
        this.meshGroup.applyQuaternion(rotateQuaternion);
        // FIXME: remove this variable and just read the quaternion
        this.rotatedToPlane = true;
    }

    rotateOverAxis(axis, radians) {
        let rotateQuaternion = new THREE.Quaternion();
        rotateQuaternion.setFromAxisAngle(axis, radians);
        this.meshGroup.applyQuaternion(rotateQuaternion);
    }

    hide() {
        this.meshGroup.visible = false;
    }

    unhide() {
        this.meshGroup.visible = true;
    }

    addMeshGroupToScene(asPreview=false) {
        this.parentMachine.rootMeshGroup.add(this.meshGroup);
    }

    removeMeshGroupFromScene() {
        if (this.parentMachine !== undefined) {
            this.parentMachine.rootMeshGroup.remove(this.meshGroup);
        }
        else if (this.parentScene !== undefined) {
            console.warn('Hm, we probably shouldn\'t be here...');
            this.parentScene.removeFromScene(this.meshGroup);
        }
    }

    computeComponentBoundingBox() {
        let minPoint = new THREE.Vector3();
        let maxPoint = new THREE.Vector3();
        let minNormSoFar = 0;
        let maxNormSoFar = 0;
        this.geometries.forEach((geom, idx) => {
            if (geom.boundingBox === null) {
                geom.computeBoundingBox();
            }
            if (geom.boundingBox.min.length() > minNormSoFar) {
                minPoint = geom.boundingBox.min;
                minNormSoFar = geom.boundingBox.min.length();
            }
            if (geom.boundingBox.min.length() > maxNormSoFar) {
                maxPoint = geom.boundingBox.max;
                maxNormSoFar = geom.boundingBox.max.length();
            }
        });
        let box = new THREE.Box3(minPoint, maxPoint);
        this.boundingBox = box;
        return box;
    }

    placeOnComponent(component) {
        let newPos = (new THREE.Vector3).copy(component.position);
        newPos.y += component.height / 2;
        if (this.height !== undefined) {
            newPos.y += this.height / 2;
        }
        let eps = 0.1;
        newPos.y += eps;
        this.position = newPos;
        return newPos;
    }
}

class BuildEnvironment extends StrangeComponent {
    static color = 0xfefefe;
    constructor(parentMachine, dimensions) {
        name = 'BuildEnvironment';
        super(name, parentMachine, dimensions);
        this.componentType = 'BuildEnvironment';
        parentMachine.buildEnvironment = this;
        this.renderDimensions();
    }

    get height() {
        return 25;
    }

    renderDimensions() {
        this.removeMeshGroupFromScene();
        let geom = BuildEnvironment.geometryFactories
                    .buildEnvironment(this.dimensions);
        let material = new THREE.MeshLambertMaterial({
            color : BuildEnvironment.color,
            transparent: true,
            opacity: 0.5
        });
        this.mesh = new THREE.Mesh(geom, material);
        this.mesh.isBuildEnvironmentMesh = true;
        this.meshGroup = new THREE.Group();
        this.meshGroup.blockName = this.name;
        this.meshGroup.add(this.mesh);
        this.geometries = [geom];
        this.rotateToXYPlane();
        this.addMeshGroupToScene();
    }
}

class WorkEnvelope extends StrangeComponent {
    static color = 0x9d8dff;
    static shapes = ['rectangle', 'box', 'cylinder'];

    constructor(parentMachine, dimensions) {
        if (!WorkEnvelope.shapes.includes(dimensions.shape)) {
            console.error(`Invalid shape ${dimensions.shape}, defaulting to rectangle.`);
            dimensions.shape = 'rectangle';
        }
        name = 'WorkEnvelope';
        super(name, parentMachine, dimensions);
        this.componentType = 'WorkEnvelope';
        parentMachine.workEnvelope = this;
        this.renderDimensions();
    }

    get shape() {
        return this.dimensions.shape;
    }

    set shape(newShape) {
        if (!WorkEnvelope.shapes.includes(newShape)) {
            console.error(`Invalid shape ${newShape}.`);
        }
        else {
            this.dimensions.shape = newShape;
        }
    }

    renderDimensions() {
        this.removeMeshGroupFromScene();
        let geom = WorkEnvelope.geometryFactories.workEnvelope(this.dimensions);
        let material = new THREE.MeshLambertMaterial({
            color : WorkEnvelope.color,
            transparent : true,
            opacity : 0.25
        });
        this.mesh = new THREE.Mesh(geom, material);
        this.mesh.isWorkEnvelopeMesh = true;
        this.meshGroup = new THREE.Group();
        this.meshGroup.blockName = this.name;
        this.meshGroup.add(this.mesh);
        this.geometries = [geom];
        if (this.dimensions.shape === 'rectangle') {
            this.rotateToXYPlane();
        }
        this.addMeshGroupToScene();
    }
}

class Block extends StrangeComponent {
    constructor(name, parentMachine, dimensions) {
        super(name, parentMachine, dimensions);
        this.connections = [];
    }

    get descendents() {
        let helper = (block) => {
            if (block.connections === undefined) {
                return [];
            }
            let childBlocks = block.connections.map((connection) => {
                return this.parentMachine.findBlockWithName(connection.child);
            });
            let beyondChildBlocks = childBlocks.map((childBlock) => {
                return helper(childBlock);
            }).flat();
            return childBlocks.concat(beyondChildBlocks);
        };
        return helper(this);
    }
}

class Tool extends Block {
    static color = 0xe44242;
    static defaultPosition = new THREE.Vector3(0, 150, 0);
    constructor(name, parentMachine, dimensions, toolType, attributes) {
        super(name, parentMachine, dimensions);
        this.componentType = 'Tool';
        // NOTE: Tool objects are not base blocks because they are assumed
        // to be "floating" and machine-independent for simulation purposes
        this.baseBlock = false;
        this.endBlock = true;
        console.assert(attributes !== undefined, 'attributes needed at Tool instantation.');
        console.assert(toolType !== undefined, 'toolType needed at Tool instantiation.');
        this.toolType = toolType;
        this.attributes = attributes;
        parentMachine.addTool(this);
        this.renderDimensions();
    }

    __loadToolStl() {
        let filepath;
        if (this.toolType === 'print3dFDM') {
            filepath = './block_models/hotend.stl';
        }
        else {
            return new Promise(resolve => {
                let geom = BuildEnvironment.geometryFactories.tool(this.dimensions);
                let material = new THREE.MeshLambertMaterial({
                    color : Tool.color
                });
                let placeHolderMesh = new THREE.Mesh(geom, material);
                resolve(placeHolderMesh);
            });
        }
        let loadPromise = new Promise(resolve => {
            let loader = new STLLoader();
            let stlMesh;
            return loader.load(filepath, (stlGeom) => {
                let material = new THREE.MeshLambertMaterial({
                    color : Tool.color,
                    // Do not cull triangles with inward-pointing normals
                    side: THREE.DoubleSide
                });
                stlGeom.center();
                stlMesh = new THREE.Mesh(stlGeom, material);
                stlMesh.scale.set(2, 2, 2);
                stlMesh.isLoadedStl = true;
                resolve(stlMesh);
            }, undefined, (errorMsg) => {
                console.log(errorMsg);
            });
        });
        return loadPromise;
    }

    renderDimensions() {
        this.removeMeshGroupFromScene();
        let geom = BuildEnvironment.geometryFactories.tool(this.dimensions);
        geom.computeBoundingBox();
        let bbox = geom.boundingBox;
        let bboxGeom = BuildEnvironment.geometryFactories.stageCase({
            width: bbox.max.x - bbox.min.x,
            height: bbox.max.y - bbox.min.y,
            length: bbox.max.z - bbox.min.z
        });
        let edgesGeom = new THREE.EdgesGeometry(bboxGeom);
        let material = new THREE.MeshLambertMaterial({
            color : Tool.color
        });
        let edgesMaterial = new THREE.LineBasicMaterial({
            color: 0x222222
        });
        this.mesh = new THREE.Mesh(geom, material);
        this.wireSegments = new THREE.LineSegments(edgesGeom, edgesMaterial);
        this.meshGroup = new THREE.Group();
        // this.meshGroup.add(this.mesh);
        this.meshGroup.add(this.wireSegments);
        this.meshGroup.blockName = this.name;
        this.geometries = [geom, edgesGeom];
        this.setPositionToDefault();
        this.addMeshGroupToScene();
        this.__loadToolStl().then((toolMesh) => {
            this.meshGroup.add(toolMesh);
        });
    }

    setPositionToDefault() {
        this.meshGroup.position.set(Tool.defaultPosition.x,
                               Tool.defaultPosition.y,
                               Tool.defaultPosition.z);
    }
}

class ToolAssembly extends Block {
    static color = 0xf36f6f;
    static defaultPosition = new THREE.Vector3(0, 150, 0);
    constructor(name, parentMachine, dimensions) {
        super(name, parentMachine, dimensions);
        this.componentType = 'ToolAssembly';
        this.baseBlock = true;
        parentMachine.addMechanism(this);
        this.renderDimensions();
    }

    renderDimensions() {
        this.removeMeshGroupFromScene();
        this.geom = BuildEnvironment.geometryFactories
                                   .toolAssembly(this.dimensions);
        this.edgesGeom = new THREE.EdgesGeometry(this.geom);
        this.material = new THREE.MeshLambertMaterial({
            color : Tool.color,
            transparent: true,
            opacity: 0.25
        });
        this.edgesMaterial = new THREE.LineBasicMaterial({
            color: 0x222222
        });
        this.mesh = new THREE.Mesh(this.geom, this.material);
        this.wireSegments = new THREE.LineSegments(this.edgesGeom,
                                this.edgesMaterial);
        this.meshGroup = new THREE.Group();
        this.meshGroup.add(this.mesh);
        this.meshGroup.add(this.wireSegments);
        this.meshGroup.blockName = this.name;
        this.geometries = [this.geom, this.edgesGeom];
        this.setPositionToDefault();
        this.addMeshGroupToScene();
    }

    setPositionToDefault() {
        this.meshGroup.position.set(Tool.defaultPosition.x,
                               Tool.defaultPosition.y,
                               Tool.defaultPosition.z)
    }
}

class Platform extends Block {
    static caseColor = 0x222222;
    constructor(name, parentMachine, dimensions) {
        dimensions['height'] = 10;
        super(name, parentMachine, dimensions);
        this.componentType = 'Platform';
        this.baseBlock = true;
        this.endBlock = true;
        parentMachine.addMechanism(this);
        this.renderDimensions();
    }

    renderDimensions() {
        this.removeMeshGroupFromScene();
        this.geom = BuildEnvironment.geometryFactories
                                   .toolAssembly(this.dimensions);
        this.edgesGeom = new THREE.EdgesGeometry(this.geom);
        this.material = new THREE.MeshLambertMaterial({
            color : Platform.caseColor,
            transparent: true,
            opacity: 0.05
        });
        this.edgesMaterial = new THREE.LineBasicMaterial({
            color: 0x222222
        });
        this.mesh = new THREE.Mesh(this.geom, this.material);
        this.wireSegments = new THREE.LineSegments(this.edgesGeom,
                                this.edgesMaterial);
        this.meshGroup = new THREE.Group();
        this.meshGroup.add(this.mesh);
        this.meshGroup.add(this.wireSegments);
        this.meshGroup.blockName = this.name;
        this.geometries = [this.geom, this.edgesGeom];
        this.addMeshGroupToScene();
    }
}

class Stage extends Block {
    static arrowPosColor = 0xe44242;
    static arrowNegColor = 0x4478ff;
    static caseColor = 0x222222;
    static validKinematicsNames = [ 'directDrive', 'hBot', 'coreXY' ];
    constructor(name, parentMachine, dimensions, attributes) {
        super(name, parentMachine, dimensions);
        if (this.constructor === Stage) {
            throw new Error('Can\'t instantiate abstract class Stage.');
        }
        console.assert(attributes.driveType !== undefined, attributes);
        this.attributes = attributes;
        this.loadDriveMechanismStl();
        this.axes = [];
        this.drivingMotors = [];
        this.baseBlock = true;
        parentMachine.addMechanism(this);
    }

    loadDriveMechanismStl() {
        let filepath;
        if (this.attributes.driveType === 'leadscrew') {
            filepath = './block_models/leadscrew.stl';
        }
        else if (this.attributes.driveType === 'timingBelt') {
            filepath = './block_models/timing_belt.stl';
        }
        else {
            return;
        }
        let loadPromise = new Promise(resolve => {
            let loader = new STLLoader();
            let stlMesh;
            return loader.load(filepath, (stlGeom) => {
                let material = new THREE.MeshLambertMaterial({
                    color : BuildEnvironment.color,
                    // Do not cull triangles with inward-pointing normals
                    side: THREE.DoubleSide
                });
                stlGeom.center();
                stlMesh = new THREE.Mesh(stlGeom, material);
                stlMesh.scale.set(2, 2, 2);
                stlMesh.isLoadedStl = true;
                if (this.axes[0] === 'y') {
                    stlMesh.rotateZ(Math.PI / 2);
                }
                else if (this.axes[0] === 'z') {
                    stlMesh.rotateY(Math.PI / 2);
                }
                this.meshGroup.add(stlMesh);
                resolve(stlMesh);
            }, undefined, (errorMsg) => {
                console.log(errorMsg);
            });
        });
        return loadPromise;
    }

    setActuationAxes(actuationAxes) {
        this.actuationAxes = actuationAxes;
    }

    setKinematics(kinematicsName) {
        const childValidKinematicsNames = this.constructor.validKinematicsNames;
        if (childValidKinematicsNames.indexOf(kinematicsName) === -1) {
            console.error(`Invalid kinematics ${kinematicsName} for ${this.name}`);
            return;
        }
        this.kinematics = kinematicsName;
    }

    setDrivingMotors(motors) {
        this.drivingMotors = motors;
        motors.forEach((motor) => {
            motor.addDrivenStage(this);
        });
    }

    setAttributes(newAttributes) {
        console.warn('This function will be deprecated');
        let newDriveMechanism = newAttributes.driveType || '';
        let newStepDisplacementRatio = newAttributes.stepDisplacementRatio || 0;
        this.attributes.driveType = newDriveMechanism;
        this.attributes.stepDisplacementRatio = newStepDisplacementRatio;
        this.loadDriveMechanismStl();
    }
}

class LinearStage extends Stage {
    static caseColor = 0x222222;
    static validKinematicsNames = [ 'directDrive' ];

    constructor(name, parentMachine, dimensions, attributes = {}) {
        super(name, parentMachine, dimensions, attributes);
        this.componentType = 'LinearStage';
        this.kinematics = 'directDrive';
        this.renderDimensions();
    }

    renderDimensions() {
        this.removeMeshGroupFromScene();
        this.caseGeom = BuildEnvironment.geometryFactories
                                .stageCase(this.dimensions);
        this.edgesGeom = new THREE.EdgesGeometry(this.caseGeom);
        this.caseMaterial = new THREE.MeshLambertMaterial({
            color : LinearStage.caseColor,
            transparent: true,
            opacity: 0.05
        });
        this.edgesMaterial = new THREE.LineBasicMaterial({
            color: 0x222222
        });
        this.caseMesh = new THREE.Mesh(this.caseGeom, this.caseMaterial);
        this.wireSegments = new THREE.LineSegments(this.edgesGeom,
                                this.edgesMaterial);
        this.meshGroup = new THREE.Group();
        this.meshGroup.add(this.caseMesh);
        this.meshGroup.add(this.wireSegments);
        this.meshGroup.blockName = this.name;
        this.geometries = [this.caseGeom, this.edgesGeom]
        this.addMeshGroupToScene();
    }

    renderArrows() {
        if (this.axes.length === 1) {
            let axis = this.axes[0];
            let axisToDim = {
                'x': 'width',
                'y': 'height',
                'z': 'length'
            };
            let dim = axisToDim[axis];
            let arrowLen = this.dimensions[dim] / 4;
            let dir;
            if (axis === 'x') {
                dir = new THREE.Vector3(1, 0, 0);
            }
            if (axis === 'y') {
                dir = new THREE.Vector3(0, 1, 0);
            }
            if (axis === 'z') {
                dir = new THREE.Vector3(0, 0, 1);
            }
            let negDir = dir.clone().negate();
            let posArrow = new THREE.ArrowHelper(dir, this.position,
                                arrowLen, Stage.arrowPosColor);
            let negArrow = new THREE.ArrowHelper(negDir, this.position,
                                arrowLen, Stage.arrowNegColor);
            this.meshGroup.add(posArrow);
            this.meshGroup.add(negArrow);
        }
    }
}

class RotaryStage {
    // TODO
}

class ParallelStage extends Stage {
    static caseColor = 0x222222;
    static validKinematicsNames = [ 'directDrive' ];
    constructor(name, parentMachine, dimensions, attributes = {}) {
        super(name, parentMachine, dimensions, attributes);
        this.componentType = 'ParallelStage';
        this.kinematics = 'directDrive';
        this.renderDimensions();
    }

    renderDimensions() {
        this.removeMeshGroupFromScene();
        this.caseGeom = BuildEnvironment.geometryFactories
                                .stageCase(this.dimensions);
        this.edgesGeom = new THREE.EdgesGeometry(this.caseGeom);
        this.caseMaterial = new THREE.MeshLambertMaterial({
            color : CrossStage.caseColor,
            transparent: true,
            opacity: 0.05
        });
        this.edgesMaterial = new THREE.LineBasicMaterial({
            color: 0x222222
        });
        this.caseMesh = new THREE.Mesh(this.caseGeom, this.caseMaterial);
        this.wireSegments = new THREE.LineSegments(this.edgesGeom,
                                this.edgesMaterial);
        this.meshGroup = new THREE.Group();
        this.meshGroup.add(this.caseMesh);
        this.meshGroup.add(this.wireSegments);
        this.meshGroup.blockName = this.name;
        this.geometries = [this.caseGeom, this.edgesGeom]
        this.addMeshGroupToScene();
    }

    renderArrows() {
        const arrowLen = 50;
        if (this.axes.length === 1) {
            let axis = this.axes[0];
            let axisToDim = {
                'x': 'width',
                'y': 'height',
                'z': 'length'
            };
            let dim = axisToDim[axis];
            let arrowLen = this.dimensions[dim] / 4;
            let dir;
            if (axis === 'x') {
                dir = new THREE.Vector3(1, 0, 0);
            }
            if (axis === 'y') {
                dir = new THREE.Vector3(0, 1, 0);
            }
            if (axis === 'z') {
                dir = new THREE.Vector3(0, 0, 1);
            }
            let negDir = dir.clone().negate();
            let posArrow = new THREE.ArrowHelper(dir, this.position,
                                arrowLen, Stage.arrowPosColor);
            let negArrow = new THREE.ArrowHelper(negDir, this.position,
                                arrowLen, Stage.arrowNegColor);
            this.meshGroup.add(posArrow);
            this.meshGroup.add(negArrow);
        }
    }
}

class CrossStage extends Stage {
    static caseColor = 0x222222;
    static validKinematicsNames = [ 'hBot', 'coreXY' ];
    constructor(name, parentMachine, dimensions, attributes = {}) {
        super(name, parentMachine, dimensions, attributes);
        this.componentType = 'CrossStage';
        this.kinematics = 'hBot';
        this.renderDimensions();
    }

    renderDimensions() {
        this.removeMeshGroupFromScene();
        this.caseGeom = BuildEnvironment.geometryFactories
                                .stageCase(this.dimensions);
        this.edgesGeom = new THREE.EdgesGeometry(this.caseGeom);
        this.caseMaterial = new THREE.MeshLambertMaterial({
            color : CrossStage.caseColor,
            transparent: true,
            opacity: 0.05
        });
        this.edgesMaterial = new THREE.LineBasicMaterial({
            color: 0x222222
        });
        this.caseMesh = new THREE.Mesh(this.caseGeom, this.caseMaterial);
        this.wireSegments = new THREE.LineSegments(this.edgesGeom,
                                this.edgesMaterial);
        this.meshGroup = new THREE.Group();
        this.meshGroup.add(this.caseMesh);
        this.meshGroup.add(this.wireSegments);
        this.meshGroup.blockName = this.name;
        this.geometries = [this.caseGeom, this.edgesGeom]
        this.addMeshGroupToScene();
    }

    renderArrows() {
        const arrowLen = 50;
        this.axes.forEach((axis) => {
            let axisToDim = {
                'x': 'width',
                'y': 'height',
                'z': 'length'
            };
            let dim = axisToDim[axis];
            let arrowLen = this.dimensions[dim] / 4;
            let dir;
            if (axis === 'x') {
                dir = new THREE.Vector3(1, 0, 0);
            }
            if (axis === 'y') {
                dir = new THREE.Vector3(0, 1, 0);
            }
            if (axis === 'z') {
                dir = new THREE.Vector3(0, 0, 1);
            }
            let negDir = dir.clone().negate();
            let posArrow = new THREE.ArrowHelper(dir, this.position,
                                arrowLen, Stage.arrowPosColor);
            let negArrow = new THREE.ArrowHelper(negDir, this.position,
                                arrowLen, Stage.arrowNegColor);
            this.meshGroup.add(posArrow);
            this.meshGroup.add(negArrow);
        });
    }
}

class Motor extends Block {
    static color = 0xffed90;
    constructor(name, parentMachine, dimensions, kinematics = 'directDrive') {
        super(name, parentMachine, dimensions);
        this.componentType = 'Motor';
        this.kinematics = kinematics;
        this.baseBlock = true;
        this.invertSteps = false;
        this.drivenStages = [];
        parentMachine.addMotor(this);
        this.renderDimensions();
    }

    addDrivenStage(stage) {
        this.drivenStages.push(stage);
    }

    setInvertSteps() {
        this.invertSteps = true;
    }

    renderDimensions() {
        this.removeMeshGroupFromScene();
        this.caseGeom = BuildEnvironment.geometryFactories
                                .stageCase(this.dimensions);
        this.edgesGeom = new THREE.EdgesGeometry(this.caseGeom);
        this.caseMaterial = new THREE.MeshLambertMaterial({
            color : Motor.color,
            transparent: true,
            opacity: 0.5
        });
        this.edgesMaterial = new THREE.LineBasicMaterial({
            color: 0x222222
        });
        this.caseMesh = new THREE.Mesh(this.caseGeom, this.caseMaterial);
        this.wireSegments = new THREE.LineSegments(this.edgesGeom,
                                this.edgesMaterial);
        this.meshGroup = new THREE.Group();
        this.meshGroup.add(this.caseMesh);
        this.meshGroup.add(this.wireSegments);
        this.meshGroup.blockName = this.name;
        this.geometries = [this.caseGeom, this.edgesGeom]
        this.addMeshGroupToScene();
    }
}

class Kinematics {

    constructor(strangeScene) {
        this.rootKNodes = [];
        this.strangeScene = strangeScene;
        this.strangeAnimator = new StrangeAnimator(strangeScene);
        if (this.strangeScene.machine !== undefined) {
            this.machine = this.strangeScene.machine;
            this.__buildTreeForMachine(this.machine);
        }
    }

    reinitializeForMachine(newMachine) {
        this.rootKNodes = [];
        this.machine = newMachine;
        this.__buildTreeForMachine(this.machine);
    }

    zeroAtCurrentPosition() {
        this.zeroPosition = this.getWorldPosition();
        // NOTE: we may want to move this to a UI class
        let we = this.strangeScene.machine.workEnvelope;
        let sizeMultiplier = 1.2;
        let gridSize = sizeMultiplier * Math.max(we.width, we.height, we.length);
        let divisions = Math.floor(gridSize / 10);
        this.zeroGrid = new THREE.GridHelper(gridSize, divisions);
        this.strangeScene.addSceneObjectDirectly(this.zeroGrid);
        this.zeroGrid.position.copy(this.zeroPosition);
    }

    getWorldPosition() {
        // TODO: do for 2-axis machines
        let worldPosition = new THREE.Vector3();
        let tool = this.machine.getTool();
        let halfToolHeightVect = new THREE.Vector3(0, -tool.height / 2, 0);
        let bottomOfToolPoint = tool.position.clone().add(halfToolHeightVect);
        worldPosition.copy(bottomOfToolPoint);
        let maybePlatform = this.machine.getPlatform();
        if (maybePlatform !== undefined) {
            // TODO: make a Platform method that has user set motionAxis
            let platformMotionAxis = 'x';
            worldPosition.setX(-maybePlatform.position.x);
        }
        if (this.machine.workEnvelope.shape === 'rectangle') {
            let wePos = this.machine.workEnvelope.position;
            worldPosition.setY(wePos.y);
        }
        return worldPosition;
    }

    getZeroedPosition() {
        // World coordinates -> control coordinates
        let zeroedPosition = new THREE.Vector3();
        if (this.zeroPosition === undefined) {
            console.error('Machine has not yet been zeroed.');
            return THREE.Vector3();
        }
        zeroedPosition.copy(this.getWorldPosition());
        return zeroedPosition.sub(this.zeroPosition);
    }

    unzeroPoint(point) {
        // Control coordinates -> world coordinates
        if (this.zeroPosition === undefined) {
            console.error('Machine has not yet been zeroed.');
            return THREE.Vector3();
        }
        let unzeroedPoint = new THREE.Vector3();
        unzeroedPoint.copy(point);
        return unzeroedPoint.add(this.zeroPosition);
    }


    __buildTreeForMachine(machine) {
        let toolBlock = machine.getTool();
        if (toolBlock === undefined) {
            console.error(`Can't find tool for machine ${machine.name}`);
            return;
        }
        let blocksAndTool = machine.blocks.concat(toolBlock);
        let rootBlocks = blocksAndTool.filter((block) => block.endBlock);
        rootBlocks.forEach((block) => {
            let rootNode = new KNode(block);
            this.__buildSubtree(rootNode);
            this.rootKNodes.push(rootNode);
        });
    }

    __buildSubtree(currKNode) {
        currKNode.block.visited = true;
        let currAddBlockName = currKNode.block.name;
        let baseBlockConnections = this.machine.connections.filter((conn) => {
            return conn.addBlock.name=== currAddBlockName;
        });
        let baseBlocks = baseBlockConnections.map((conn) => {
            return this.machine.findBlockWithName(conn.baseBlock.name);
        });
        let baseBlockNodes = baseBlocks.map((block) => {
            return new KNode(block, currKNode);
        });
        if (baseBlockNodes.length > 1) {
            baseBlockNodes.forEach((baseBlockNode) => {
                let parallels = baseBlockNodes.filter((node) => {
                    return node.block.id !== baseBlockNode.block.id;
                });
                baseBlockNode.addParallelNodes(parallels);
            });
        }

        currKNode.addChildNodes(baseBlockNodes);
        baseBlockNodes.forEach((baseNode) => {
            this.__buildSubtree(baseNode);
        });

        // Deal with any orphan blocks, but do not recurse on them
        let orphans = this.machine.connections.filter((conn) => {
            return conn.baseBlock.name === currAddBlockName
                    && !conn.addBlock.visited;
        });
        let orphanBlocks = orphans.map((conn) => {
            return this.machine.findBlockWithName(conn.addBlock.name);
        });
        let orphanBlockNodes = orphanBlocks.map((block) => {
            return new KNode(block);
        });
        currKNode.addOrphanNodes(orphanBlockNodes);
    }

    findNodeWithBlockName(blockName) {
        let dfs = (currNode, targetName) => {
            if (currNode.block.name === targetName) {
                return currNode;
            }
            let maybeMatchingOrphan = currNode.orphanNodes.find((oNode) => {
                return oNode.block.name === blockName;
            });
            if (maybeMatchingOrphan !== undefined) {
                return maybeMatchingOrphan;
            }
            let maybeResults = currNode.childNodes.map((childNode) => {
                return dfs(childNode, targetName);
            });
            return maybeResults.find((result) => result !== undefined);
        };
        let rootResults = this.rootKNodes.map((rootKNode) => {
            return dfs(rootKNode, blockName);
        });
        let result = rootResults.find((result) => result !== undefined);
        if (result === undefined) {
            console.warn(`Cannot find block in kinematic tree: ${blockName}`);
        }
        return result;
    }

    pathFromNodeToRoot(node) {
        let traverse = (currNode, pathSoFar) => {
            if (currNode.parentNode === undefined) {
                return pathSoFar.concat(currNode);
            }
            return traverse(currNode.parentNode, pathSoFar.concat(currNode))
        };
        return traverse(node, []);
    }

    pathsFromNodeToLeaves(node) {
        let traverse = (currNode, pathSoFarList) => {
            if (currNode.childNodes.length === 0) {
                let terminatedPaths = pathSoFarList.map((pathSoFar) => {
                    return pathSoFar.concat(currNode);
                });
                return terminatedPaths;
            }
            // Invariant: on the descent, PSFL.length === 1 ie one path
            let pathWithCurrNodeCopy = pathSoFarList[0].concat(currNode);
            let newPathSoFarList = currNode.childNodes.map((childNode) => {
                return traverse(childNode, [pathWithCurrNodeCopy]);
            }).flat();
            return newPathSoFarList;
        };
        return traverse(node, [[]]);
    }

    determineMachineAxes() {
        let stages = this.machine.mechanisms.filter((mechanism) => mechanism.axes !== undefined);
        let allAxes = stages.map((mechanism) => mechanism.axes).flat();
        let uniqueAxes = allAxes.filter((axis, idx) => {
            return allAxes.indexOf(axis) === idx;
        });
        let axisToStageLists = {};
        uniqueAxes.forEach((axis) => {
            axisToStageLists[axis] = stages.filter((stage) => {
                return stage.axes.indexOf(axis) !== -1;
            });
        });
        return axisToStageLists;
    }

    determineMovingBlocks() {
        // TODO: add rom info as calculated below
        return this.rootKNodes.map((kNode) => kNode.block);
    }

    verifyMoveInWorkEnvelope(axesToCoords) {
        if (this.machine.workEnvelope === undefined) {
            this.determineWorkEnvelope();
        }
        let toolGoalPosition = new THREE.Vector3(axesToCoords['x'],
                                                 axesToCoords['y'],
                                                 axesToCoords['z']);
        let containResult = this.checkContainsPoint(toolGoalPosition);
        if (!containResult) {
            let e = `Move to ${axesToCoords.x} ${axesToCoords.y} ${axesToCoords.z} is outside work envelope.`;
            window.strangeGui.writeErrorToJobLog(e);
        }
        return containResult;
    }

    checkContainsPoint(point) {
        let we = this.machine.workEnvelope;
        let unzeroedPoint = this.unzeroPoint(point);
        let center = we.position;
        let bbox = new THREE.Box3();
        let size = new THREE.Vector3(we.width, we.height, we.length);
        bbox.setFromCenterAndSize(center, size);
        return bbox.containsPoint(unzeroedPoint);
    }

    moveTool(axesToCoords) {
        // TODO
        // NOTE: distinction between coords (zero applied) and position
        // matters here, as well is in verifyMoveInWorkEnvelope, but not
        // in the rest of moveToolRelative
        let axesToCoordsAdjusted = {};
        let currentPositionMachineCoords = this.getZeroedPosition();
        let adjustedPoint = new THREE.Vector3(axesToCoords.x,
                                              axesToCoords.y,
                                              axesToCoords.z);
        adjustedPoint.sub(currentPositionMachineCoords);
        axesToCoordsAdjusted = {
            x: adjustedPoint.x,
            y: adjustedPoint.y,
            z: adjustedPoint.z,
        };
        return this.moveToolRelative(axesToCoordsAdjusted);
    }

    moveToolRelative(axesToCoords) {
        let validMove = this.verifyMoveInWorkEnvelope(axesToCoords);
        if (validMove) {
            let machine = this.strangeScene.machine;
            let motorNameToSteps = {};
            // TODO: make these return subobjects
            this.__addDirectDriveIK(axesToCoords, motorNameToSteps);
            this.__addHBotIK(axesToCoords, motorNameToSteps);
            this.turnMotors(motorNameToSteps);
        }
        return validMove;
    }

    __addDirectDriveIK(axesToCoords, motorNameToSteps) {
        let axisToStageLists = this.determineMachineAxes();
        let directDriveStages = this.machine.blocks.filter((block) => {
            return block.kinematics === 'directDrive';
        });
        directDriveStages.forEach((stage) => {
            console.assert(stage.axes.length === 1, stage);
            stage.drivingMotors.forEach((motor) => {
                let invert = motor.invertSteps ? -1 : 1;
                let axis = stage.axes[0];
                let steps = axesToCoords[axis];
                motorNameToSteps[motor.name] = steps * invert;
            });
        });
    }

    __addHBotIK(axesToCoords, motorNameToSteps) {
        let axisToStageLists = this.determineMachineAxes()
        let crossStages = this.machine.blocks.filter((block) => {
            return block instanceof CrossStage;
        });
        crossStages.forEach((crossStage) => {
            console.assert(crossStage.drivingMotors.length === 2, crossStage);
            let motorA = crossStage.drivingMotors[0];
            let motorB = crossStage.drivingMotors[1];
            let axisASteps = axesToCoords[crossStage.axes[0]];
            let axisBSteps = axesToCoords[crossStage.axes[1]];
            motorNameToSteps[motorA.name] = axisASteps + axisBSteps;
            motorNameToSteps[motorB.name] = axisASteps - axisBSteps;
        });
    }

    turnMotors(motorNameToSteps) {
        Object.keys(motorNameToSteps).forEach((motorName) => {
            let motor = this.strangeScene.machine.findBlockWithName(motorName);
            let steps = motorNameToSteps[motorName];
            this.__turnMotorSteps(motor, steps);
        });
        this.strangeAnimator.animateToBlockEndPositions();
    }

    __turnMotorSteps(motor, steps) {
        // TODO: have step -> displacement conversion assigned in motor,
        // for now assume 1-to-1
        // Invariants: drivenStages.length === 1
        let displacement = steps;
        let stage = motor.drivenStages[0];
        let drivenStageNode = this.findNodeWithBlockName(stage.name);
        let path = this.pathFromNodeToRoot(drivenStageNode).slice(1);
        let pathBlocks = path.map((node) => {
            let orphanBlocks = node.orphanNodes.map((node) => node.block);
            return [node.block].concat(orphanBlocks);
        }).flat();
        let pathBlockNames = pathBlocks.map((block) => block.name);
        if (stage.kinematics === 'hBot' || stage.kinematics === 'coreXY') {
            // Invariants: stage.drivingMotors.length === 2, same with axes
            console.assert(stage.drivingMotors.length === 2, stage);
            console.assert(stage.axes.length === 2, stage);
            let motorIndexInPair = stage.drivingMotors.indexOf(motor);
            if (motorIndexInPair === 0) {
                let axis0displacement = 0.5 * displacement;
                let axis1displacement = 0.5 * displacement;
                this.strangeAnimator.setMoveBlocksOnAxisName(pathBlocks,
                    stage.axes[0], axis0displacement);
                this.strangeAnimator.setMoveBlocksOnAxisName(pathBlocks,
                    stage.axes[1], axis1displacement);
            }
            else {
                let axis0displacement = 0.5 * displacement;
                let axis1displacement = -0.5 * displacement;
                this.strangeAnimator.setMoveBlocksOnAxisName(pathBlocks,
                    stage.axes[0], axis0displacement);
                this.strangeAnimator.setMoveBlocksOnAxisName(pathBlocks,
                    stage.axes[1], axis1displacement);
            }
        }
        if (stage.kinematics === 'directDrive') {
            // Invariants: axes.length === 1
            let axisName = stage.axes[0];
            // NOTE: we divide displacement by parallel stages by the number
            // of motors to stop the stage from actuating too far. This is a
            // bit of a kludge, but it is simpler than passing stage info
            // into the animator.
            if (stage instanceof ParallelStage) {
                displacement /= stage.drivingMotors.length;
            }
            this.strangeAnimator.setMoveBlocksOnAxisName(pathBlocks, axisName,
                                                         displacement);
        }
    }
}

class KNode {

    constructor(block, parentNode) {
        this.block = block;
        this.parentNode = parentNode;
        this.childNodes = [];
        this.parallelNodes = [];
        this.orphanNodes = [];
    }

    addChildNodes(childNodes) {
        this.childNodes = this.childNodes.concat(childNodes);
    }

    addParallelNodes(parallelNodes) {
        this.parallelNodes = this.parallelNodes.concat(parallelNodes);
    }

    addOrphanNodes(orphanNodes) {
        this.orphanNodes = this.orphanNodes.concat(orphanNodes);
    }

    /**
     * Returns ROM unnormalized for position in the form:
     * { romAxis: x, rom: 200 }
     */
    calcNodeRangeOfMotion(kinematics) {
        if (kinematics === undefined) {
            console.error('Please pass in kinematics.');
            return;
        }
        if (this.block.componentType !== 'LinearStage') {
            return { romAxis : 'center', rom : 0 };
        }
        let romAxis, rom;
        let axisToDim = {
            'x': 'width',
            'y': 'height',
            'z': 'length'
        };
        romAxis = kinematics.determineAxisNameForBlock(this.block);
        rom = this.block[axisToDim[romAxis]];
        return { romAxis : romAxis, rom : rom };
    }

}

class StrangeAnimator {

    constructor(strangeScene) {
        // Number of seconds for animation for each move
        this.ANIM_SECONDS = 1.0;
        this.strangeScene = strangeScene;
        this.blockNameEndPositions = {};
        // Note that mixers must stay in StrangeScene for rendering
    }

    animateToBlockEndPositions() {
        let actions = Object.keys(this.blockNameEndPositions).map((blockName) => {
            let block = this.strangeScene.machine.findBlockWithName(blockName);
            let endPos = this.blockNameEndPositions[block.name];
            let mixerClipPair = this.makeMoveMixerClipPair(block, endPos);
            let mixer = mixerClipPair[0];
            this.strangeScene.mixers.push(mixer);
            let clip = mixerClipPair[1];
            let action = mixer.clipAction(clip);
            action.loop = THREE.LoopOnce;
            action.clampWhenFinished = true;
            // TODO: better design for turning this on and off
            if (false && block.componentType === 'Tool') {
                let materialMCPair = this.makeMaterialMixerClipMair(block, endPos);
                let mixer = materialMCPair[0];
                let clip = materialMCPair[1];
                this.strangeScene.mixers.push(mixer);
                let materialAction = mixer.clipAction(clip)
                materialAction.loop = THREE.LoopOnce;
                materialAction.clampWhenFinished = true;
                return [action, materialAction];
            }
            else if (block.componentType === 'Platform') {
                // TODO: compute offset and make another tube
                return action;
            }
            else {
                return action;
            }
        }).flat();
        actions.forEach((action) => {
            action.play();
        });
        this.blockNameEndPositions = {};
    }

    setMoveBlocksOnAxisName(blocks, axisName, displacement) {
        let currEndPos;
        blocks.forEach((block) => {
            if (this.blockNameEndPositions[block.name] === undefined) {
                currEndPos = (new THREE.Vector3()).copy(block.position);
            }
            else {
                currEndPos = this.blockNameEndPositions[block.name];
            }

            currEndPos[axisName] += displacement;
            this.blockNameEndPositions[block.name] = currEndPos;
        });
    }

    makeMoveMixerClipPair(obj, newPos) {
        let mixer = new THREE.AnimationMixer(obj);
        mixer.addEventListener('finished', (event) => {
            mixer.stopAllAction();
            let idx = this.strangeScene.mixers.indexOf(mixer);
            if (idx !== -1) {
                this.strangeScene.mixers.splice(idx, 1);
            }
            obj.position.set(newPos.x, newPos.y, newPos.z);
            if (this.strangeScene.mixers.length === 0) {
                this.strangeScene.instructionQueue.unsetMotorsBusy();
                this.strangeScene.instructionQueue.executeNextInstruction();
            }
        });
        let currPos = obj.position;
        let positionKF = new THREE.VectorKeyframeTrack('.position',
                            [0, this.ANIM_SECONDS],
                            [currPos.x, currPos.y, currPos.z,
                             newPos.x, newPos.y, newPos.z],
                            THREE.InterpolateSmooth);
        let clip = new THREE.AnimationClip('Action',
                        this.ANIM_SECONDS, [ positionKF ]);
        return [mixer, clip];
    };

    makeMaterialMixerClipMair(obj, newPos) {
        const numTubeSegs = obj.position.distanceTo(newPos);
        const radius = 1;
        const radialSegs = 4;
        const isClosed = false;

        // Make material mesh
        let heightOffset = new THREE.Vector3(0, obj.height / 2, 0);
        let points = [
            obj.position.clone().sub(heightOffset),
            newPos.clone().sub(heightOffset)
        ];
        let path = new THREE.CatmullRomCurve3(points);
        let geom = new THREE.TubeBufferGeometry(path, numTubeSegs, radius,
                        radialSegs, isClosed);
        geom.setDrawRange(0, 0);
        let mat = new THREE.MeshLambertMaterial({
            color: Tool.color
        });
        let mesh = new THREE.Mesh(geom, mat);
        this.strangeScene.materialMarks.add(mesh);

        // Set up animation
        const nMax = 3 * radialSegs * numTubeSegs * 2;
        let mixer = new THREE.AnimationMixer(mesh);
        mixer.addEventListener('finished', (event) => {
            mixer.stopAllAction();
            let idx = this.strangeScene.mixers.indexOf(mixer);
            if (idx !== -1) {
                this.strangeScene.mixers.splice(idx, 1);
            }
            geom.setDrawRange(0, nMax);
            if (this.strangeScene.mixers.length === 0) {
                this.strangeScene.instructionQueue.unsetMotorsBusy();
                this.strangeScene.instructionQueue.executeNextInstruction();
            }
        });
        let positionKF = new THREE.NumberKeyframeTrack('.geometry[drawRange].count',
                            [0, this.ANIM_SECONDS],
                            [0, nMax],
                            THREE.InterpolateSmooth);
        let clip = new THREE.AnimationClip('Action',
                        this.ANIM_SECONDS, [ positionKF ]);
        return [mixer, clip];
    }
}

class JobFile {
    constructor(strangeScene) {
        if (strangeScene === undefined) {
            console.error('Need to instantiate JobFile with a StrangeScene.');
        }
        this.strangeScene = strangeScene;
        this.inputDom = document.getElementById('job-file-input');
        this.jobContainerDom = document.getElementById('job-container');
        this.text = '';
        this.gcodes = [];
    }

    setKinematics(kinematics) {
        this.kinematics = kinematics;
    }

    renderToDom() {
        this.jobContainerDom.innerHTML = '';
        this.gcodes.forEach((gcode, idx) => {
            let gcodeDiv = document.createElement('div');
            gcodeDiv.innerText = gcode;
            this.jobContainerDom.appendChild(gcodeDiv);
        });
    }

    setDomHighlightToInstIdx(idx) {
        const highlightId = 'gcode-highlight';
        let oldGcodeDom = document.getElementById(highlightId);
        if (oldGcodeDom !== null) {
            oldGcodeDom.classList = [];
            oldGcodeDom.id = '';
        }
        let gcodeDom = this.jobContainerDom.children[idx];
        gcodeDom.id = highlightId;
    }

    highlightCurrInstAsError() {
        const highlightId = 'gcode-highlight';
        let oldGcodeDom = document.getElementById(highlightId);
        if (oldGcodeDom !== null) {
            oldGcodeDom.classList = [];
            oldGcodeDom.classList.add('error-highlight');
        }
    }

    removeDomHighlight() {
        const highlightId = 'gcode-highlight';
        let oldGcodeDom = document.getElementById(highlightId);
        if (oldGcodeDom !== null) {
            oldGcodeDom.id = '';
            oldGcodeDom.classList = [];
        }
    }

    loadFromString(jobString) {
        this.text = jobString;
        let gcodes = jobString.split('\n').filter((gcode) => {
            return gcode !== '';
        });
        this.gcodes = gcodes;
        this.renderToDom();
        console.log('Successfully loaded GCode file.');
    }

    loadFromInputDom() {
        let file = this.inputDom.files[0];
        if (file === undefined) {
            console.error('Cannot find a file to load.');
            return;
        }
        let fileReader = new FileReader();
        let promise = new Promise((resolve, reject) => {
            fileReader.addEventListener('loadend', (event) => {
                this.text = fileReader.result;
                try {
                    let gcodes = this.text.split('\n').filter((gcode) => {
                        return gcode !== '';
                    });
                    this.gcodes = gcodes;
                    this.renderToDom();
                    console.log('Successfully loaded GCode file.');
                    resolve(gcodes);
                }
                catch (error) {
                    console.error('Error while loading GCode file:');
                    console.error(error);
                }
            });
            fileReader.readAsText(file, 'utf-8');
        });
        return promise;
    }

    runStaticAnalysis() {
        if (this.kinematics === undefined) {
            console.error('Cannot analyze job without setting kinematics first.');
        }
        console.log('Statically analyzing GCode file...');
        let iq = this.strangeScene.instructionQueue;
        iq.setKinematics(this.kinematics);
        iq.setQueueFromArray(this.gcodes);
        iq.doDryRunInstructions();
    }

    runJob() {
        if (this.kinematics === undefined) {
            console.error('Cannot run job without setting kinematics first.');
            return;
        }
        if (this.kinematics.machine === undefined) {
            let e = 'Please pick a machine first, then try again.';
            window.strangeGui.writeErrorToJobLog(e);
            return;
        }
        window.strangeGui.clearJobLog();
        window.strangeGui.writeMessageToJobLog('Running GCode file...');
        let iq = this.strangeScene.instructionQueue;
        iq.setKinematics(this.kinematics);
        iq.setJobFile(this);
        iq.setQueueFromArray(this.gcodes);
        iq.executeNextInstruction();
    }

    loadAndRunExample(exampleShape) {
        let jobText;
        if (exampleShape === 'box') {
            jobText = TestPrograms.testDrawJob;
        }
        if (exampleShape === 'cube') {
            jobText = TestPrograms.testPrintJob;
        }
        this.loadFromString(jobText);
        this.runJob();
    }
}

class Compiler {

    constructor() {
    }

    compileMachine(machine) {
        let progObj = {};
        let progBuildEnvironment = {
            shape: machine.buildEnvironment.shape,
            width: machine.buildEnvironment.width,
            length: machine.buildEnvironment.length
        };
        let progWorkEnvelope;
        if (machine.workEnvelope === undefined) {
            progWorkEnvelope = {};
        }
        else {
            progWorkEnvelope = {
                shape: machine.workEnvelope.shape,
                width: machine.workEnvelope.width || 0,
                height: machine.workEnvelope.height || 0,
                length: machine.workEnvelope.length || 0,
                position: {
                    x: machine.workEnvelope.position.x,
                    y: machine.workEnvelope.position.y,
                    z: machine.workEnvelope.position.z
                }
            };
        }

        let progBlocks = machine.blocks.map((block) => {
            let progBlock = {
                name: block.name,
                componentType: block.componentType,
                dimensions: block.dimensions
            }
            if (block instanceof Stage) {
                progBlock.axes = block.axes;
                progBlock.drivingMotors = block.drivingMotors.map((motor) => {
                    return motor.name;
                });
                progBlock.setKinematics(block.kinematics);
                progBlock.setAttributes(block.attributes);
            }
            if (block.baseBlock) {
                progBlock.position = {
                    x: block.position.x,
                    y: block.position.y,
                    z: block.position.z
                };
            }
            return progBlock;
        });
        let progMotors = machine.motors.map((motor) => {
            let progMotor = {
                name: motor.name,
                componentType: motor.componentType,
                dimensions: motor.dimensions,
                invertSteps: motor.invertSteps
            }
            progMotor.drivenStages = motor.drivenStages.map((stage) => {
                return stage.name;
            });
            if (motor.baseBlock) {
                progMotor.position = {
                    x: motor.position.x,
                    y: motor.position.y,
                    z: motor.position.z
                };
            }
            return progMotor;
        });
        let progTools = matchin.tools.map((tool) => {
            let progTool = {
                name: tool.name,
                componentType: tool.componentType,
                dimensions: tool.dimensions,
                toolType: tool.toolType,
                attributes: tool.attributes
            };
            return progTool;
        });
        let progConnections = machine.connections.map((connection) => {
            return {
                baseBlockName: connection.baseBlock.name,
                baseBlockFace: connection.baseBlockFace,
                baseBlockEnd: connection.baseBlockEnd,
                addBlockName: connection.addBlock.name,
                addBlockFace: connection.addBlockFace,
                addBlockEnd: connection.addBlockEnd
            }
        });

        progObj['name'] = machine['name'];
        progObj['machineType'] = machine['machineType'];
        progObj['price'] = machine['price'];
        progObj['buildEnvironment'] = progBuildEnvironment;
        progObj['workEnvelope'] = progWorkEnvelope;
        progObj['motors'] = progMotors;
        progObj['blocks'] = progBlocks;
        progObj['tools'] = progTools;
        progObj['connections'] = progConnections;

        let indentSpaces = 2;
        return JSON.stringify(progObj, undefined, indentSpaces);
    }

    decompileAsPreview(strangeScene, machineProg) {
        if (strangeScene.previewMachine !== undefined) {
            strangeScene.previewMachine.clearMachineFromScene();
        }
        let machine = new Machine('', strangeScene, true);
        this.decompileIntoMachineObjFromProg(machine, machineProg);
        machine.recolorAndMoveMachineForPreviewing('green');
        return machine;
    }

    decompileIntoScene(strangeScene, machineProg) {
        if (strangeScene.machine !== undefined) {
            strangeScene.machine.clearMachineFromScene();
        }
        let machine = new Machine('', strangeScene, false);
        this.decompileIntoMachineObjFromProg(machine, machineProg);
        return machine;
    }

    decompileIntoMachineObjFromProg(machine, machineProg) {
        let progObj = JSON.parse(machineProg);
        if (progObj._id !== undefined) {
            machine.dbId = progObj._id;
        }
        machine.name = progObj.name;
        machine.machineType = progObj.machineType;
        machine.price = progObj.price;
        const defaultBEdimension = 500;
        let be = new BuildEnvironment(machine, {
            width: defaultBEdimension,
            length: defaultBEdimension
        });
        let we = new WorkEnvelope(machine, {
            shape: progObj.workEnvelope.shape,
            width: progObj.workEnvelope.dimensions.width,
            length: progObj.workEnvelope.dimensions.length,
            height: progObj.workEnvelope.dimensions.height,
        });
        let wePosition = new THREE.Vector3(
            progObj.workEnvelope.position.x,
            progObj.workEnvelope.position.y,
            progObj.workEnvelope.position.z
        );
        we.position.copy(wePosition);
        progObj.motors.forEach((motorData) => {
            let motor = new Motor(motorData.name, machine, {
                width: motorData.dimensions.width,
                height: motorData.dimensions.height,
                length: motorData.dimensions.length,
            });
                motor.invertSteps = motorData.invertSteps;
            if (motor.connections !== undefined) {
                motor.connections = motorData.connections;
            }
            if (motorData.position !== undefined) {
                let position = new THREE.Vector3(motorData.position.x,
                                            motorData.position.y,
                                            motorData.position.z);
                motor.position = position;
            }
        });
        progObj.mechanisms.forEach((mechanismData) => {
            let CurrentBlockConstructor;
            if (mechanismData.mechanismType === 'nonActuating') {
                if (mechanismData.attributes.isToolAssembly) {
                    CurrentBlockConstructor = ToolAssembly;
                }
                if (mechanismData.attributes.isPlatform) {
                    CurrentBlockConstructor = Platform;
                }
            }
            if (mechanismData.mechanismType === 'linear') {
                CurrentBlockConstructor = LinearStage;
            }
            if (mechanismData.mechanismType === 'parallel') {
                CurrentBlockConstructor = ParallelStage;
            }
            if (mechanismData.mechanismType === 'cross') {
                CurrentBlockConstructor = CrossStage;
            }
            let mechanism = new CurrentBlockConstructor(mechanismData.name, machine, {
                width: mechanismData.dimensions.width,
                height: mechanismData.dimensions.height,
                length: mechanismData.dimensions.length,
            }, mechanismData.attributes);
            if (mechanism.connections !== undefined) {
                mechanism.connections = mechanismData.connections;
            }
            if (mechanismData.position !== undefined) {
                let position = new THREE.Vector3(mechanismData.position.x,
                                            mechanismData.position.y,
                                            mechanismData.position.z);
                mechanism.position = position;
            }
            if (mechanism instanceof Stage) {
                mechanism.setActuationAxes(mechanismData.actuationAxes);
                // mechanism.setAttributes(mechanismData.attributes);
                // mechanism.setKinematics(mechanismData.kinematics);
                mechanism.renderArrows();
            }
        });
        progObj.tools.forEach((toolData) => {
            let tool = new Tool(toolData.name, machine, toolData.dimensions,
                                toolData.toolType, toolData.attributes);
            if (toolData.position !== undefined) {
                let position = new THREE.Vector3(toolData.position.x,
                                            toolData.position.y,
                                            toolData.position.z);
                tool.position = position;
            }
            if (toolData.connections !== undefined) {
                tool.connections = toolData.connections;
            }
        });
        // TODO: second pass through blocks to set connections
        // progObj.connections.forEach((connectionData) => {
        //     machine.setConnection({
        //         baseBlock: machine.findBlockWithName(connectionData.baseBlockName),
        //         baseBlockFace: connectionData.baseBlockFace,
        //         baseBlockEnd: connectionData.baseBlockEnd,
        //         addBlock: machine.findBlockWithName(connectionData.addBlockName),
        //         addBlockFace: connectionData.addBlockFace,
        //         addBlockEnd: connectionData.addBlockEnd
        //     });
        // });
        const progObjBlocks = progObj.motors.concat(progObj.mechanisms)
                                            .concat(progObj.tools);
        progObjBlocks.forEach((progBlock) => {
            if (progBlock.connections !== undefined) {
                progBlock.connections.forEach((connection) => {
                    let baseBlock, baseBlockFace, baseBlockEnd,
                        addBlock, addBlockFace, addBlockEnd;
                    baseBlock = machine.findBlockWithName(progBlock.name);
                    addBlock = machine.findBlockWithName(connection.child);
                    [baseBlockFace, baseBlockEnd] = connection.parentPoint.split('.');
                    [addBlockFace, addBlockEnd] = connection.childPoint.split('.');
                    machine.setConnection({
                        baseBlock, baseBlockFace, baseBlockEnd,
                        addBlock, addBlockFace, addBlockEnd
                    });
                });
            }
        });
        // Once we have Blocks and Motors instantiated, set their pointers:
        // Paired motors, driven stages, driving motors
        progObj.mechanisms.forEach((mechanismData) => {
            let mechanism = machine.findBlockWithName(mechanismData.name)
            if (mechanism instanceof Stage) {
                mechanism.drivingMotors = mechanismData.drivingMotors
                                        .map((motorName) => {
                    return machine.findBlockWithName(motorName);
                });
            }
        });
        progObj.motors.forEach((motorData) => {
            let motor = machine.findBlockWithName(motorData.name)
            motor.drivenStages = machine.mechanisms.filter((mechanism) => {
                return mechanism.drivingMotors !== undefined
                        && mechanism.drivingMotors.includes(motorData.name);
            });
        });

        return machine;
    }
}

function main() {
    let ss = new StrangeScene();
    let compiler = new Compiler();
    let kinematics = new Kinematics(ss);
    ss.instructionQueue = new InstructionQueue();
    ss.instructionQueue.setKinematics(kinematics);
    let jobFile = new JobFile(ss);
    jobFile.setKinematics(kinematics);
    window.strangeScene = ss;
    window.kinematics = kinematics;
    window.compiler = compiler;
    window.jobFile = jobFile;
    window.strangeGui = new StrangeGui(ss, kinematics);
    window.testPrograms = TestPrograms;

    let animate = () => {
        let maxFramerate = 20;
        setTimeout(() => {
            requestAnimationFrame(animate);
        }, 1000 / maxFramerate);
        ss.renderScene();
    };
    animate();
}

window.testTooltip = () => {
    console.log(window.strangeGui);
    let someComponent = window.strangeScene.machine.blocks[2];
    let tooltip = window.strangeGui.addTooltipForComponent(someComponent);
    tooltip.show();
    return tooltip;
};

window.testMotor = () => {
    let machine = window.strangeScene.machine;
    let motors = machine.motors;
    let motorA = motors.find((motor) => {
        return motor.name === 'MotorA';
    });
    let motorB = motors.find((motor) => {
        return motor.name === 'MotorB';
    });
    let lsMotorA = motors.find((motor) => {
        return motor.name === 'leadscrew motor a';
    });
    let lsMotorB = motors.find((motor) => {
        return motor.name === 'leadscrew motor b';
    });
    let platformMotor = motors.find((motor) => {
        return motor.name === 'platform belt motor';
    });
    window.jobFile.loadFromInputDom().then((result) => {
        window.jobFile.runJob();
    }, (error) => {
        console.error(error);
    });
};

main();

