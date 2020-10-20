'use strict';

import * as THREE from './build/three.module.js';
import { OrbitControls } from './build/OrbitControls.js';
import { TransformControls } from './build/TransformControls.js';
import { Line2 } from './build/lines/Line2.js';
import { LineGeometry } from './build/lines/LineGeometry.js';
import { LineMaterial } from './build/lines/LineMaterial.js';

class StrangeScene {
    constructor() {
        this.domContainer = document.getElementById('container');
        this.scene = this.initScene();
        this.camera = this.initCamera(this.scene, true);
        this.renderer = this.initRenderer();
        this.clock = new THREE.Clock();
        this.mixers = [];
        this.controls = this.initControls(this.camera, this.renderer);
        this.ruler = new Ruler();
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

    renderScene() {
        this.controls.update();
        let deltaSeconds = this.clock.getDelta();
        this.mixers.forEach((mixer) => {
            mixer.update(deltaSeconds);
        });
        this.renderer.render(this.scene, this.camera);
    }
}

class InstructionQueue {
    constructor() {
        this.arr = [];
        this.unsetMotorsBusy();
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

    enqueueInstruction(instruction) {
        return this.arr.push(instruction);
    }

    peekNext() {
        return this.arr[0];
    }

    executeNextInstruction() {
        if (this.kinematics === undefined) {
            console.error('No kinematics set for instruction queue.');
            return;
        }
        if (this.isEmpty) {
            return;
        }
        if (this.motorsBusy) {
            console.warn(`Motors are busy. Next instruction: ${this.peekNext()}.`);
            return;
        }
        let nextInst = this.arr.splice(0, 1)[0];
        console.log(`Executing: ${nextInst}`);
        this.__executeInst(nextInst);
    }

    __executeInst(inst) {
        let tokens = inst.split(' ');
        let opcode = tokens[0];
        if (opcode === 'G0' || opcode === 'G1') {
            this.__handleG0(tokens);
        }
        if (opcode === 'G92') {
            this.__handleG92(tokens);
        }
    }

    __handleG0(tokens) {
        let xCoord = parseInt(tokens[1].substring(1));
        let yCoord = parseInt(tokens[2].substring(1));
        let axesToCoords = {
            x: xCoord,
            y: yCoord,
        };
        if (tokens.length === 4) {
            let zCoord = parseInt(tokens[3].substring(1));
            axesToCoords.z = zCoord;
        }
        // This call eventually sets a callback that calls
        // executeInstruction in a THREE.js mixer in StrangeScene
        this.kinematics.moveTool(axesToCoords);
    }

    __handleG92(tokens) {
        this.kinematics.zeroAtCurrentPosition();
        this.executeNextInstruction();
    }
}

class Machine {
    constructor(name, parentScene) {
        this.name = name;
        this.parentScene = parentScene;
        this.buildEnvironment = undefined;
        this.workEnvelope = undefined;
        this.blocks = [];
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
        parentScene.machine = this;
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
        if (axis === '0') {
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

    // TODO: make this.components a THREE.Group for repositioning
    addBlock(component) {
        this.blocks.push(component);
    }

    addMotor(motor) {
        this.motors.push(motor);
    }

    findBlockWithId(id) {
        let motorsAndOtherBlocks = this.motors.concat(this.blocks);
        let block = motorsAndOtherBlocks.find(block => block.id === id);
        if (block === undefined) {
            console.warn(`Couldn't find block with ID: ${id}.`);
        }
        return block;
    }

    getTool() {
        return this.blocks.find((b) => b.componentType === 'Tool');
    }

    getPlatform() {
        return this.blocks.find((b) => b.componentType === 'Platform');
    }

    renderRulerForComponent(component) {
        this.ruler.displayInSceneForComponent(this, component)
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
        this.blocks.forEach((block, index) => {
            block.removeMeshGroupFromScene();
        });
        this.motors.forEach((motor, index) => {
            motor.removeMeshGroupFromScene();
        });
        this.blocks = [];
        this.motors = [];
    }

    setPairABMotors(motorA, motorB) {
        if (motorA.kinematics === 'directDrive'
            || motorB.kinematics === 'directDrive') {
            console.warn('Cannot set direct drive motors as pairs.');
        }
        else {
            motorA.pairMotorType = 'a';
            motorA.pairMotor = motorB;
            motorB.pairMotorType = 'b';
            motorB.pairMotor = motorA;
        }
        this.pairedMotors.push([motorA, motorB]);
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
            if (endAxis === '0') {
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
                baseBlockEnd: '0',
                addBlock: stageTop,
                addBlockFace: '+y',
                addBlockEnd: '0'
            });
            this.setConnection({
                baseBlock: stageTop,
                baseBlockFace: '+x',
                baseBlockEnd: '0',
                addBlock: toolAssembly,
                addBlockFace: '-x',
                addBlockEnd: '0'
            });
            this.setConnection({
                baseBlock: stageBottom,
                baseBlockFace: '+z',
                baseBlockEnd: '0',
                addBlock: motorA,
                addBlockFace: '-z',
                addBlockEnd: '0'
            });
            this.setConnection({
                baseBlock: stageBottom,
                baseBlockFace: '-z',
                baseBlockEnd: '0',
                addBlock: motorB,
                addBlockFace: '+z',
                addBlockEnd: '0'
            });
            this.setConnection({
                baseBlock: toolAssembly,
                baseBlockFace: '+x',
                baseBlockEnd: '0',
                addBlock: tool,
                addBlockFace: '-x',
                addBlockEnd: '0'
            });
            stageBottom.setAttributes({
                driveMechanism: 'timingBelt',
                stepDisplacementRatio: '0.7'
            });
            stageTop.setAttributes({
                driveMechanism: 'timingBelt',
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
                driveMechanism: 'timingBelt',
                stepDisplacementRatio: 0.7
            });
            let carriageBelt = new LinearStage('carriage belt', this, {
                width: 12.5,
                height: 25,
                length: 210
            }, {
                driveMechanism: 'timingBelt',
                stepDisplacementRatio: 0.5
            });
            let lsA = new LinearStage('z leadscrew a', this, {
                width: 10,
                height: 150,
                length: 10
            }, {
                driveMechanism: 'leadscrew',
                stepDisplacementRatio: 0.5
            });
            let lsB = new LinearStage('z leadscrew b', this, {
                width: 10,
                height: 150,
                length: 10
            }, {
                driveMechanism: 'leadscrew',
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
                baseBlockEnd: '0',
                addBlock: lsA,
                addBlockFace: '+y',
                addBlockEnd: '0'
            });
            this.setConnection({
                baseBlock: lsMotorB,
                baseBlockFace: '-y',
                baseBlockEnd: '0',
                addBlock: lsB,
                addBlockFace: '+y',
                addBlockEnd: '0'
            });
            this.setConnection({
                baseBlock: platformBelt,
                baseBlockFace: '+x',
                baseBlockEnd: '0',
                addBlock: platformMotor,
                addBlockFace: '-x',
                addBlockEnd: '0'
            });
            carriageBelt.placeOnComponent(be);
            this.setConnection({
                baseBlock: platformBelt,
                baseBlockFace: '-y',
                baseBlockEnd: '0',
                addBlock: platform,
                addBlockFace: '+y',
                addBlockEnd: '0'
            });
            this.setConnection({
                baseBlock: lsA,
                baseBlockFace: '+x',
                baseBlockEnd: '0',
                addBlock: carriageBelt,
                addBlockFace: '-x',
                addBlockEnd: '+z'
            });
            this.setConnection({
                baseBlock: lsB,
                baseBlockFace: '+x',
                baseBlockEnd: '0',
                addBlock: carriageBelt,
                addBlockFace: '-x',
                addBlockEnd: '-z'
            });
            this.setConnection({
                baseBlock: carriageBelt,
                baseBlockFace: '+z',
                baseBlockEnd: '0',
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
                baseBlockEnd: '0',
                addBlock: toolAssembly,
                addBlockFace: '-x',
                addBlockEnd: '0'
            });
            let tool = new Tool('extruder', this, {
                width: 10,
                height: 25,
                length: 10
            }, { toolType: 'extruder' });
            this.setConnection({
                baseBlock: toolAssembly,
                baseBlockFace: '+x',
                baseBlockEnd: '0',
                addBlock: tool,
                addBlockFace: '-x',
                addBlockEnd: '0'
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
                addBlockEnd: '0'
            });
            return this;
        }
    };
}

class Ruler {
    static lineMaterial = new LineMaterial({
        color: 0x4478ff,
        linewidth: 0.0025
    });

    constructor() {
        this.geometries = [];
        this.lines = [];
        this.numbers = [];
    }

    displayInSceneForComponent(strangeScene, component) {
        if (component instanceof LinearStage) {
            this._displayForLinearStage(strangeScene, component);
        }
    }

    _displayForLinearStage(strangeScene, stage) {
        let offset = 10;
        let bbox = stage.computeComponentBoundingBox();
        let xLength = bbox.max.x - bbox.min.x;
        let yLength = bbox.max.y - bbox.min.y;
        let zLength = bbox.max.z - bbox.min.z;
        let xLineGeom = new LineGeometry();
        let yLineGeom = new LineGeometry();
        let zLineGeom = new LineGeometry();
        xLineGeom.setPositions([-xLength / 2, 0, 0, xLength / 2, 0, 0]);
        yLineGeom.setPositions([0, -yLength / 2, 0, 0, yLength / 2, 0]);
        zLineGeom.setPositions([0, 0, -zLength / 2, 0, 0, zLength / 2]);
        let xLine = new Line2(xLineGeom, Ruler.lineMaterial);
        let yLine = new Line2(yLineGeom, Ruler.lineMaterial);
        let zLine = new Line2(zLineGeom, Ruler.lineMaterial);
        this.geometries.push(xLineGeom);
        this.geometries.push(yLineGeom);
        this.geometries.push(zLineGeom);
        this.lines.push(xLine);
        this.lines.push(yLine);
        this.lines.push(zLine);
        let lineGroup = new THREE.Group([xLine, yLine, zLine]);
        lineGroup.add(xLine);
        lineGroup.add(yLine);
        lineGroup.add(zLine);
        lineGroup.applyQuaternion(stage.meshGroup.quaternion);
        strangeScene.scene.add(lineGroup);
        xLine.position.setZ(xLine.position.z + zLength / 2 + offset);
        zLine.position.setX(zLine.position.x - xLength / 2 - offset);
        yLine.position.setZ(yLine.position.z + zLength / 2);
        yLine.position.setX(yLine.position.x - xLength / 2 - offset);
        yLine.position.setY(yLine.position.y + yLength / 2);
        lineGroup.position.set(stage.position.x,
                               stage.position.y - yLength / 2,
                               stage.position.z);
        let fontLoader = new THREE.FontLoader();
        // TODO: put this in own function
        fontLoader.load('build/fonts/inter_medium.json', (font) => {
            let yToXQuat = new THREE.Quaternion();
            let xToZQuat = new THREE.Quaternion();
            yToXQuat.setFromAxisAngle(new THREE.Vector3(1, 0, 0),
                                      -Math.PI / 2);
            xToZQuat.setFromAxisAngle(new THREE.Vector3(0, 1, 0),
                                      -Math.PI / 2);
            let fontMaterial = new THREE.MeshBasicMaterial({
                color: Ruler.lineMaterial.color
            });
            let fontProps = {
                font: font,
                size: 12,
                height: 0
            };
            let xLengthFontGeom = new THREE.TextGeometry(`${xLength}`, fontProps);
            let zLengthFontGeom = new THREE.TextGeometry(`${zLength}`, fontProps);
            let yLengthFontGeom = new THREE.TextGeometry(`${yLength}`, fontProps);
            let xFontMesh = new THREE.Mesh(xLengthFontGeom, fontMaterial);
            let zFontMesh = new THREE.Mesh(zLengthFontGeom, fontMaterial);
            let yFontMesh = new THREE.Mesh(yLengthFontGeom, fontMaterial);
            let fontMeshGroup = new THREE.Group();
            fontMeshGroup.add(xFontMesh);
            fontMeshGroup.add(zFontMesh);
            fontMeshGroup.add(yFontMesh);
            xFontMesh.applyQuaternion(yToXQuat);
            zFontMesh.applyQuaternion(yToXQuat);
            zFontMesh.applyQuaternion(xToZQuat);
            yFontMesh.applyQuaternion(xToZQuat);
            zFontMesh.position.set(zLine.position.x - offset * 2,
                                   zLine.position.y,
                                   zLine.position.z);
            xFontMesh.position.set(xLine.position.x,
                                   xLine.position.y,
                                   xLine.position.z + offset * 2);
            yFontMesh.position.set(yLine.position.x,
                                   yLine.position.y + offset,
                                   yLine.position.z + offset);
            // TODO: make accessor method for quaternion
            fontMeshGroup.applyQuaternion(stage.meshGroup.quaternion);
            fontMeshGroup.applyQuaternion(stage.meshGroup.quaternion);
            strangeScene.scene.add(fontMeshGroup);
        });
    }

    clearDisplay() {
    }
}

class StrangeComponent {
    static geometryFactories = {
        stageCase: (d) =>
            new THREE.BoxBufferGeometry(d.width, d.height, d.length, 2, 2, 2),
        stagePlatform: () => new THREE.BoxBufferGeometry(50, 25, 50, 2, 2, 2),
        rotaryStageCase: () => new THREE.BoxBufferGeometry(150, 50, 150, 2, 2, 2),
        rotaryStagePlatform: () => new THREE.CylinderBufferGeometry(50, 50, 80, 10),
        tool: (dimensions) => {
            if (dimensions.type === undefined) {
                return new THREE.CylinderBufferGeometry(5, 5, 50, 10)
            }
            if (dimensions.type === 'pen') {
                let radius = dimensions.width / 2;
                let height = dimensions.height;
                let numSegments = 10;
                return new THREE.CylinderBufferGeometry(radius, radius, height,
                                                        numSegments);
            }
        },
        toolAssembly: (d) => new THREE.BoxBufferGeometry(d.width, d.height,
                                    d.length, 2, 2, 2),
        connectionHandle: () => new THREE.SphereBufferGeometry(25, 32, 32),
        buildEnvironment: (dimensions) => new THREE.BoxBufferGeometry(
                                             dimensions.length,
                                             dimensions.width, 25, 2, 2, 2),
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

    static makeId() {
        return '_' + Math.random().toString(36).substr(2, 9);
    }

    constructor(name, parentMachine, dimensions) {
        this.id = StrangeComponent.makeId();
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

    addMeshGroupToScene() {
        this.parentMachine.parentScene.scene.add(this.meshGroup);
    }

    removeMeshGroupFromScene() {
        if (this.parentMachine !== undefined) {
            this.parentMachine.parentScene.removeFromScene(this.meshGroup);
        }
        else if (this.parentScene !== undefined) {
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
            color : BuildEnvironment.color
        });
        this.mesh = new THREE.Mesh(geom, material);
        this.meshGroup = new THREE.Group();
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
        // FIXME: come back to generating work envelope, hide for now.
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
            opacity : 0.5
        });
        this.mesh = new THREE.Mesh(geom, material);
        this.meshGroup = new THREE.Group();
        this.meshGroup.add(this.mesh);
        this.geometries = [geom];
        if (this.dimensions.shape === 'rectangle') {
            this.rotateToXYPlane();
        }
        this.addMeshGroupToScene();
    }
}

class Block extends StrangeComponent {
    // TODO
}

class Tool extends Block {
    static color = 0xe44242;
    static defaultPosition = new THREE.Vector3(0, 150, 0);
    constructor(name, parentMachine, dimensions, attributes = {}) {
        super(name, parentMachine, dimensions);
        this.componentType = 'Tool';
        // NOTE: Tool objects are not base blocks because they are assumed
        // to be "floating" and machine-independent for simulation purposes
        this.baseBlock = false;
        this.endBlock = true;
        this.attributes = {
            toolType : attributes.toolType || '',
            // If we want to specify radius explicitly, then we need to change
            // the mesh instantiation in the geometry factory.
            radius : dimensions.width / 2
        };
        parentMachine.addBlock(this);
        this.renderDimensions();
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
        this.meshGroup.add(this.mesh);
        this.meshGroup.add(this.wireSegments);
        this.geometries = [geom, edgesGeom];
        this.setPositionToDefault();
        this.addMeshGroupToScene();
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
        parentMachine.addBlock(this);
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
        parentMachine.addBlock(this);
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
        this.geometries = [this.geom, this.edgesGeom];
        this.addMeshGroupToScene();
    }
}

class LinearStage extends Block {
    static caseColor = 0x222222;
    constructor(name, parentMachine, dimensions, attributes = {}) {
        super(name, parentMachine, dimensions);
        this.componentType = 'LinearStage';
        this.attributes = {
            driveMechanism: attributes.driveMechanism || '',
            stepDisplacementRatio: attributes.stepDisplacementRatio || 0
        };
        this.drivingMotors = [];
        this.baseBlock = true;
        parentMachine.addBlock(this);
        this.renderDimensions();
    }

    setDrivingMotors(motors) {
        this.drivingMotors = motors;
        motors.forEach((motor) => {
            motor.addDrivenStage(this);
        });
    }

    setAttributes(newAttributes) {
        let newDriveMechanism = newAttributes.driveMechanism || '';
        let newStepDisplacementRatio = newAttributes.stepDisplacementRatio || 0;
        this.attributes.driveMechanism = newDriveMechanism;
        this.attributes.stepDisplacementRatio = newStepDisplacementRatio;
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
        this.geometries = [this.caseGeom, this.edgesGeom]
        this.addMeshGroupToScene();
    }
}

class RotaryStage {
    // TODO
}

class CompoundStage {
    // TODO
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
        this.geometries = [this.caseGeom, this.edgesGeom]
        this.addMeshGroupToScene();
    }
}

class Kinematics {

    constructor(strangeScene) {
        this.rootKNodes = [];
        this.strangeScene = strangeScene;
        this.strangeAnimator = new StrangeAnimator(strangeScene);
    }

    zeroAtCurrentPosition() {
        this.zeroPosition = this.getWorldPosition();
    }

    getWorldPosition() {
        // TODO: do for 2-axis machines
        let worldPosition = new THREE.Vector3();
        let tool = this.machine.getTool();
        worldPosition.copy(tool.position);
        let maybePlatform = this.machine.getPlatform();
        if (maybePlatform !== undefined) {
            // TODO: make a Platform method that has user set motionAxis
            let platformMotionAxis = 'x';
            worldPosition.setX(-maybePlatform.position.x);
        }
        return worldPosition;
    }

    getZeroedPosition() {
        // World coordinates -> control coordinates
        let zeroedPosition = new THREE.Vector3();
        zeroedPosition.copy(this.getWorldPosition());
        return zeroedPosition.sub(this.zeroPosition);
    }

    unzeroPoint(point) {
        // Control coordinates -> world coordinates
        let unzeroedPoint = new THREE.Vector3();
        unzeroedPoint.copy(point);
        return unzeroedPoint.add(this.zeroPosition);
    }


    buildTreeForMachine(machine) {
        let toolBlock = machine.blocks.find((block) => {
            return block.componentType === 'Tool'
        });
        if (toolBlock === undefined) {
            console.error(`Can't find tool for machine ${machine.name}`);
            return;
        }
        this.machine = machine;
        let rootBlocks = machine.blocks.filter((block) => block.endBlock);
        rootBlocks.forEach((block) => {
            let rootNode = new KNode(block);
            this.__buildSubtree(rootNode);
            this.rootKNodes.push(rootNode);
        });
    }

    __buildSubtree(currKNode) {
        currKNode.block.visited = true;
        let currAddBlockId = currKNode.block.id;
        let baseBlockConnections = this.machine.connections.filter((conn) => {
            return conn.addBlock.id === currAddBlockId;
        });
        let baseBlocks = baseBlockConnections.map((conn) => {
            return this.machine.findBlockWithId(conn.baseBlock.id);
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
            return conn.baseBlock.id === currAddBlockId
                    && !conn.addBlock.visited;
        });
        let orphanBlocks = orphans.map((conn) => {
            return this.machine.findBlockWithId(conn.addBlock.id);
        });
        let orphanBlockNodes = orphanBlocks.map((block) => {
            return new KNode(block);
        });
        currKNode.addOrphanNodes(orphanBlockNodes);
    }

    findNodeWithBlockId(blockId) {
        let dfs = (currNode, targetId) => {
            if (currNode.block.id === targetId) {
                return currNode;
            }
            let maybeMatchingOrphan = currNode.orphanNodes.find((oNode) => {
                return oNode.block.id === blockId;
            });
            if (maybeMatchingOrphan !== undefined) {
                return maybeMatchingOrphan;
            }
            let maybeResults = currNode.childNodes.map((childNode) => {
                return dfs(childNode, targetId);
            });
            return maybeResults.find((result) => result !== undefined);
        };
        let rootResults = this.rootKNodes.map((rootKNode) => {
            return dfs(rootKNode, blockId);
        });
        let result = rootResults.find((result) => result !== undefined);
        if (result === undefined) {
            console.warn(`Cannot find block in kinematic tree with id ${blockId}`);
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

    determineAxisNameForBlock(block) {
        let dims;
        if (block.componentType === 'Tool'
                || block.componentType === 'ToolAssembly'
                || block.componentType === 'Motor') {
            return '0';
        }
        if (block.quaternion.w !== 1) {
            console.warn(`Determining axis for rotated block: ${block.name}.`);
            let rotatedDimVect = new THREE.Vector3(block.dimensions.width,
                                                   block.dimensions.height,
                                                   block.dimensions.length)
                                    .applyQuaternion(block.quaternion);
            dims = {
                width : rotatedDimVect.x,
                height : rotatedDimVect.y,
                length : rotatedDimVect.z,
            };
        }
        else {
            dims = block.dimensions;
        }
        let dimKeys = Object.keys(dims);
        let dimValues = Object.values(dims);
        let maxIdx = dimValues.reduce((maxIdxSoFar, val, currIdx, arr) => {
            return val > arr[maxIdxSoFar] ? currIdx : maxIdxSoFar;
        }, 0);
        let maxDim = dimKeys[maxIdx];
        let dimToAxisName = {
            'width' : 'x',
            'height' : 'y',
            'length' : 'z'
        };
        return dimToAxisName[maxDim];
    }

    determineMachineAxes() {
        let axisBlockPairs = this.machine.blocks.map((block) => {
            return [this.determineAxisNameForBlock(block), block];
        }).filter((axisBlockPair) => {
            let axisName = axisBlockPair[0];
            let block = axisBlockPair[1]
            return (block.componentType === 'LinearStage'
                    || block.componentType === 'RotaryStage')
                    && axisName !== '0';
        });
        let axisToBlock = {};
        axisBlockPairs.forEach((axisBlockPair) => {
            let axisName = axisBlockPair[0];
            let block = axisBlockPair[1];
            if (axisToBlock[axisName] === undefined) {
                axisToBlock[axisName] = [block];
            }
            else {
                axisToBlock[axisName].push(block);
            }
        });
        return axisToBlock;
    }

    determineWorkEnvelopeAlternate() {
        // Work in progreses, more robust way of calculating
        // work envelopes
        let toolPosition = this.machine.getTool().position;
        let stages = this.machine.blocks.filter((block) => {
            return block.componentType === 'LinearStage'
                    || block.componentType === 'RotaryStage';
        });
        let boundingBoxes = stages.map((stage) => {
            return stage.computeComponentBoundingBox();
        });
        let points = boundingBoxes.map((box) => {
            return [box.min, box.max];
        }).flat();
        let xBoxCoords = points.map((point) => point.x)
                            .concat(toolPosition.x)
                            .sort();
        let yBoxCoords = points.map((point) => point.y)
                            .concat(toolPosition.y)
                            .sort();
        let zBoxCoords = points.map((point) => point.z)
                            .concat(toolPosition.z)
                            .sort();
        this.oldDetermineWorkEnvelope();

    }

    determineWorkEnvelope() {
        // Assumptions: there is only one stage per axis that we care about
        // NOTE: this is an approximation of the work envelope, it's
        // not always accurate in non-common cases but it will do for now.
        let axesToStages = this.determineMachineAxes();
        let xDim = axesToStages['x'] ? axesToStages['x'][0].width : 0;
        let yDim = axesToStages['y'] ? axesToStages['y'][0].height : 0;
        let zDim = axesToStages['z'] ? axesToStages['z'][0].length : 0;
        let shape = Object.keys(axesToStages).length === 3 ? 'box' : 'rectangle';
        let we = new WorkEnvelope(this.machine, {
            shape: shape,
            width: xDim,
            height: yDim,
            length: zDim
        });
        let toolPosition = this.machine.getTool().position;
        if (shape === 'rectangle') {
            we.placeOnComponent(this.machine.buildEnvironment);
            we.position.setX(toolPosition.x);
            we.position.setZ(toolPosition.z);
        }
        else {
            we.position = toolPosition;
        }
        return we;
    }

    verifyMoveInWorkEnvelope(axesToCoords) {
        if (this.machine.workEnvelope === undefined) {
            this.determineWorkEnvelope();
        }
        let toolGoalPosition;
        if (this.machine.workEnvelope === 'rectangle') {
            toolGoalPosition = new THREE.Vector2(axesToCoords['x'],
                                                 axesToCoords['z']);
        }
        else {
            toolGoalPosition = new THREE.Vector3(axesToCoords['x'],
                                                 axesToCoords['y'],
                                                 axesToCoords['z']);
        }
        let containResult = this.checkContainsPoint(toolGoalPosition);
        if (!containResult) {
            console.error(`Move to ${axesToCoords.x} ${axesToCoords.y} ${axesToCoords.z} is outside work envelope.`);
        }
        return containResult;
    }

    checkContainsPoint(point) {
        let we = this.machine.workEnvelope;
        let unzeroedPoint = this.unzeroPoint(point);
        let center = we.position;
        if (we.dimensions.shape === 'rectangle') {
            let bbox = new THREE.Box2();
            let size = new THREE.Vector2(we.width, we.length);
            bbox.setFromCenterAndSize(center, size);
            return bbox.containsPoint(unzeroedPoint);
        }
        else {
            let bbox = new THREE.Box3();
            let size = new THREE.Vector3(we.width, we.height, we.length);
            bbox.setFromCenterAndSize(center, size);
            return bbox.containsPoint(unzeroedPoint);
        }
    }


    verifyParallelMotorSteps(motorIdToSteps) {
        let verificationPassed = true;
        Object.keys(motorIdToSteps).forEach((motorId) => {
            let motorSteps = motorIdToSteps[motorId];
            let motor = this.machine.findBlockWithId(motorId);
            if (motor.kinematics !== 'directDrive') {
                return;
            }
            let drivenStages = motor.drivenStages;
            let drivenStageNodes = drivenStages.map((stage) => {
                return this.findNodeWithBlockId(stage.id);
            });
            let drivenStageParallelNodes = drivenStageNodes.map((node) => {
                return node.parallelNodes;
            }).flat();
            drivenStageParallelNodes.forEach((parallelStageNode) => {
                // A stage is driven by only one motor in direct drive case
                let parallelMotor = parallelStageNode.block.drivingMotors[0];
                let parallelSteps = motorIdToSteps[parallelMotor.id];
                if (parallelSteps === undefined
                    || parallelSteps !== motorSteps) {
                    let mt = motor.name;
                    let mp = parallelMotor.name;
                    console.error(`Parallel step mismatch with ${mt} and ${mp}:\
                                    ${motorSteps} versus ${parallelSteps}`);
                    verificationPassed = false;
                }
            });
        });
        return verificationPassed;
    }

    moveTool(axesToCoords) {
        // TODO
        // NOTE: distinction between coords (zero applied) and position
        // matters here, as well is in verifyMoveInWorkEnvelope, but not
        // in the rest of moveToolRelative
        let axesToCoordsAdjusted = {};
        let currentPositionMachineCoords = this.getZeroedPosition();
        if (Object.keys(axesToCoords).length === 2) {
            let adjustedPoint = new THREE.Vector2(axesToCoords.x,
                                                  axesToCoords.y);
            adjustedPoint.sub(currentPositionMachineCoords);
            axesToCoordsAdjusted = {
                x: adjustedPoint.x,
                y: adjustedPoint.y
            };
        }
        if (Object.keys(axesToCoords).length === 3) {
            let adjustedPoint = new THREE.Vector3(axesToCoords.x,
                                                  axesToCoords.y,
                                                  axesToCoords.z);
            adjustedPoint.sub(currentPositionMachineCoords);
            axesToCoordsAdjusted = {
                x: adjustedPoint.x,
                y: adjustedPoint.y,
                z: adjustedPoint.z,
            };
        }
        this.moveToolRelative(axesToCoordsAdjusted);
    }

    moveToolRelative(axesToCoords) {
        let validMove = this.verifyMoveInWorkEnvelope(axesToCoords);
        if (validMove) {
            let machine = this.strangeScene.machine;
            let motorIdToSteps = {};
            // TODO: make these return subobjects
            this.__addDirectDriveIK(axesToCoords, motorIdToSteps);
            this.__addHBotIK(axesToCoords, motorIdToSteps);
            this.turnMotors(motorIdToSteps);
        }
    }

    __addDirectDriveIK(axesToCoords, motorIdToSteps) {
        let axisToStageLists = this.determineMachineAxes();
        Object.keys(axisToStageLists).forEach((axisName) => {
            let stages = axisToStageLists[axisName];
            let axisMotors = stages.map((stage) => stage.drivingMotors).flat();
            let axisMotorIds = axisMotors.map((motor) => motor.id);
            let steps = axesToCoords[axisName] || 0;
            axisMotorIds.forEach((motorId, motorIdx) => {
                let motor = axisMotors[motorIdx];
                if (motor.kinematics === 'directDrive') {
                    let invert = motor.invertSteps ? -1 : 1;
                    motorIdToSteps[motorId] = steps * invert;
                }
            });
        });
    }

    __addHBotIK(axesToCoords, motorIdToSteps) {
        let axisToStageLists = this.determineMachineAxes();
        let pairedMotors = this.pairedMotors;
        this.machine.pairedMotors.forEach((motorPair) => {
            let motorA = motorPair[0];
            let motorB = motorPair[1];
            // FIXME: good luck unhardcoding this one
            let motorAAxis = 'x';
            let motorBAxis = 'z';
            let axisASteps = axesToCoords[motorAAxis];
            let axisBSteps = axesToCoords[motorBAxis];
            motorIdToSteps[motorA.id] = axisASteps + axisBSteps;
            motorIdToSteps[motorB.id] = axisASteps - axisBSteps;
        });
    }

    turnMotors(motorIdToSteps) {
        let validMotorTurn = this.verifyParallelMotorSteps(motorIdToSteps);
        if (validMotorTurn) {
            Object.keys(motorIdToSteps).forEach((motorId) => {
                let motor = this.strangeScene.machine.findBlockWithId(motorId);
                let steps = motorIdToSteps[motorId];
                this.__turnMotorSteps(motor, steps);
            });
            this.strangeAnimator.animateToBlockEndPositions();
        }
    }

    __turnMotorSteps(motor, steps) {
        // TODO: have step -> displacement conversion assigned in motor,
        // for now assume 1-to-1
        let displacement = steps;
        let drivenStages = motor.drivenStages;
        if (motor.kinematics === 'hBot') {
            // This motor must have two drivenStages, a relative base
            // (SB) and a relative add (SA). SB and SA must have the
            // complementary motor (MA or MB) as a drivingMotor.

            // Given displacement operator d on a stage's native axis:
            //     dSB = 0.5(dMA + dMB)
            //     dSA = 0.5(dMA - dMB)
            // For a single motor call, one of dMA or dMB will just be zero,
            // but that will be handled in the subsequent motor call, which
            // is the responsibility of the caller, although we can warn
            // about this possibly.
            // From there on, we can handle all child nodes of SB and SA
            // as we do in the direct drive case.
            let baseStage, addStage;
            let plausibleMotorConfig = this.machine.connections.find((conn) => {
                return conn.baseBlock.id === motor.drivenStages[0].id
                    && conn.addBlock.id === motor.drivenStages[1].id;
            });
            if (plausibleMotorConfig !== undefined) {
                baseStage = motor.drivenStages[0];
                addStage = motor.drivenStages[1];
            }
            else {
                baseStage = motor.drivenStages[1];
                addStage = motor.drivenStages[0];
            }
            let baseAxisName = this.determineAxisNameForBlock(baseStage);
            let addAxisName = this.determineAxisNameForBlock(addStage);
            let addStageNode = this.findNodeWithBlockId(addStage.id);
            let path = this.pathFromNodeToRoot(addStageNode).slice(1);
            let pathBlocks = path.map((node) => {
                let orphanBlocks = node.orphanNodes.map((node) => node.block);
                return [node.block].concat(orphanBlocks);
            }).flat();
            pathBlocks = [addStage].concat(pathBlocks);
            if (motor.pairMotorType === 'a') {
                this.strangeAnimator
                    .setMoveBlocksOnAxisName(pathBlocks, baseAxisName,
                                             0.5 * displacement, true);
                this.strangeAnimator
                    .setMoveBlocksOnAxisName(pathBlocks, addAxisName,
                                             0.5 * displacement, true);
            }
            else if (motor.pairMotorType === 'b') {
                this.strangeAnimator
                    .setMoveBlocksOnAxisName(pathBlocks, baseAxisName,
                                             0.5 * displacement, true);
                this.strangeAnimator
                    .setMoveBlocksOnAxisName(pathBlocks, addAxisName,
                                             -0.5 * displacement, true);
            }
            else {
                console.warn(`Invalid pair motor type ${motor.pairMotorType}`);
            }
        }
        if (motor.kinematics === 'coreXy') {
            // Same kinematics as HBot, but different pointer logistics
            // For getting motors and stages (should have a compound stage).
        }
        if (motor.kinematics === 'directDrive') {
            let stage = drivenStages[0];
            let drivenStageNode = this.findNodeWithBlockId(stage.id);
            let path = this.pathFromNodeToRoot(drivenStageNode).slice(1);
            let pathBlocks = path.map((node) => {
                let orphanBlocks = node.orphanNodes.map((node) => node.block);
                return [node.block].concat(orphanBlocks);
            }).flat();
            let pathBlockNames = pathBlocks.map((block) => block.name);
            let parallelBlockNames = drivenStageNode.parallelNodes
                                        .map((node) => node.block.name);
            let axisName = this.determineAxisNameForBlock(stage);
            // console.log(`Turning motor "${motor.name}" by ${steps} steps actuates ${stage.name} ${displacement}mm in the ${axisName} direction, also: and chain [${pathBlockNames}]. [${parallelBlockNames}] should have their driving motors turning.`);
            // FIXME: Prevent parallel motors for compounding displacement!
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

}

class StrangeAnimator {

    constructor(strangeScene) {
        this.strangeScene = strangeScene;
        this.blockIdEndPositions = {};
        // Note that mixers must stay in StrangeScene for rendering
    }

    animateToBlockEndPositions() {
        let actions = Object.keys(this.blockIdEndPositions).map((blockId) => {
            let block = this.strangeScene.machine.findBlockWithId(blockId);
            let endPos = this.blockIdEndPositions[block.id];
            let mixerClipPair = this.makeMoveMixerClipPair(block, endPos);
            let mixer = mixerClipPair[0];
            this.strangeScene.mixers.push(mixer);
            let clip = mixerClipPair[1];
            let action = mixer.clipAction(clip);
            action.loop = THREE.LoopOnce;
            action.clampWhenFinished = true;
            return action;
        });
        this.strangeScene.instructionQueue.setMotorsBusy();
        actions.forEach((action) => {
            action.play();
        });
        this.blockIdEndPositions = {};
    }

    setMoveBlocksOnAxisName(blocks, axisName, displacement) {
        let currEndPos;
        blocks.forEach((block) => {
            if (this.blockIdEndPositions[block.id] !== undefined) {
                currEndPos = this.blockIdEndPositions[block.id];
            }
            else {
                currEndPos = (new THREE.Vector3()).copy(block.position);
            }

            currEndPos[axisName] += displacement;
            this.blockIdEndPositions[block.id] = currEndPos;
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
            // If no mixers in scene, pull another instruction off queue, if
            // such an instruction exists
            this.strangeScene.instructionQueue.unsetMotorsBusy();
            this.strangeScene.instructionQueue.executeNextInstruction();
        });
        let currPos = obj.position;
        let positionKF = new THREE.VectorKeyframeTrack('.position', [1,2],
                            [currPos.x, currPos.y, currPos.z,
                             newPos.x, newPos.y, newPos.z],
                            THREE.InterpolateLinear);
        let clip = new THREE.AnimationClip('Action', 2, [ positionKF ]);
        return [mixer, clip];
    };
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
        let progBlocks = machine.blocks.map((block) => {
            let progBlock = {
                id: block.id,
                name: block.name,
                componentType: block.componentType,
                dimensions: block.dimensions
            }
            if (block.componentType === 'LinearStage') {
                progBlock.drivingMotors = block.drivingMotors.map((motor) => {
                    return {
                        id: motor.id,
                        name: name.id
                    };
                });
                progBlock.attributes = block.attributes;
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
                id: motor.id,
                name: motor.name,
                componentType: motor.componentType,
                dimensions: motor.dimensions,
                kinematics: motor.kinematics,
                invertSteps: motor.invertSteps
            }
            progMotor.drivenStages = motor.drivenStages.map((stage) => {
                return {
                    id: stage.id,
                    name: stage.name
                };
            });
            if (motor.baseBlock) {
                progMotor.position = {
                    x: motor.position.x,
                    y: motor.position.y,
                    z: motor.position.z
                };
            }
            if (motor.pairMotor !== undefined) {
                progMotor.pairMotorId = motor.pairMotor.id;
                progMotor.pairMotorType = motor.pairMotor.pairMotorType;
            }
            return progMotor;
        });
        let progConnections = machine.connections.map((connection) => {
            return {
                baseBlock: connection.baseBlock.id,
                baseBlockName: connection.baseBlock.name,
                baseBlockFace: connection.baseBlockFace,
                baseBlockEnd: connection.baseBlockEnd,
                addBlock: connection.addBlock.id,
                addBlockName: connection.addBlock.name,
                addBlockFace: connection.addBlockFace,
                addBlockEnd: connection.addBlockEnd
            }
        });

        // NOTE: extras are for the reader's enjoyment only, as they are
        // Generated from the "driving" properties. As a result, they don't
        // need to be decompiled
        let references = {};
        references['parallelBlockGroups'] = machine.findParallelBlockGroups()
                                        .map((blockGroupArr) => {
            return blockGroupArr.map((block) => {
                return {
                    id: block.id,
                    name: block.name
                }
            });
        });
        references['pairedMotorGroups'] = machine.pairedMotors.map((group) => {
            return group.map((motor) => {
                return {
                    id: motor.id,
                    name: motor.name,
                    kinematics: motor.kinematics
                }
            });
        });

        let kinematics = new Kinematics();
        kinematics.buildTreeForMachine(machine);
        let axisBlockGroups = kinematics.determineMachineAxes();
        let axisBlockGroupsReduced = {};
        Object.keys(axisBlockGroups).forEach((axisName) => {
            let blockGroup = axisBlockGroups[axisName];
            let blockGroupReduced = blockGroup.map((block) => {
                return {
                    id: block.id,
                    name: block.name
                };
            });
            axisBlockGroupsReduced[axisName] = blockGroupReduced;
        });
        references['axes'] = axisBlockGroupsReduced;

        if (machine.workEnvelope === undefined) {
            kinematics.determineWorkEnvelope();
        }
        let progWorkEnvelope = {
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
        references['workEnvelope'] = progWorkEnvelope;

        progObj['name'] = machine['name'];
        progObj['buildEnvironment'] = progBuildEnvironment;
        progObj['workEnvelope'] = progWorkEnvelope;
        progObj['motors'] = progMotors;
        progObj['blocks'] = progBlocks;
        progObj['connections'] = progConnections;
        progObj['references'] = references;
        return JSON.stringify(progObj);
    }

    decompileIntoScene(strangeScene, machineProg) {
        if (strangeScene.machine !== undefined) {
            strangeScene.machine.clearMachineFromScene();
        }
        let progObj = JSON.parse(machineProg);
        let machine = new Machine(progObj.name, strangeScene);
        let be = new BuildEnvironment(machine, {
            width: progObj.buildEnvironment.width,
            length: progObj.buildEnvironment.length
        });
        be.id = progObj.buildEnvironment.id;
        let we = new WorkEnvelope(machine, {
            shape: progObj.workEnvelope.shape,
            width: progObj.workEnvelope.width,
            height: progObj.workEnvelope.height,
            length: progObj.workEnvelope.length
        });
        we.id = progObj.workEnvelope.id;
        we.position = new THREE.Vector3(progObj.workEnvelope.position.x,
                                        progObj.workEnvelope.position.y,
                                        progObj.workEnvelope.position.z);
        progObj.motors.forEach((motorData) => {
            let motor = new Motor(motorData.name, machine, {
                width: motorData.dimensions.width,
                height: motorData.dimensions.height,
                length: motorData.dimensions.length,
            });
            motor.id = motorData.id;
            motor.kinematics = motorData.kinematics;
            motor.invertSteps = motorData.invertSteps;
            if (motorData.position !== undefined) {
                let position = new THREE.Vector3(motorData.position.x,
                                            motorData.position.y,
                                            motorData.position.z);
                motor.position = position;
            }
        });
        progObj.blocks.forEach((blockData) => {
            let CurrentBlockConstructor;
            if (blockData.componentType === 'Tool') {
                CurrentBlockConstructor = Tool;
            }
            if (blockData.componentType === 'ToolAssembly') {
                CurrentBlockConstructor = ToolAssembly;
            }
            if (blockData.componentType === 'LinearStage') {
                CurrentBlockConstructor = LinearStage;
            }
            if (blockData.componentType === 'Platform') {
                CurrentBlockConstructor = Platform;
            }
            let block = new CurrentBlockConstructor(blockData.name, machine, {
                width: blockData.dimensions.width,
                height: blockData.dimensions.height,
                length: blockData.dimensions.length,
            });
            block.id = blockData.id;
            if (blockData.position !== undefined) {
                let position = new THREE.Vector3(blockData.position.x,
                                            blockData.position.y,
                                            blockData.position.z);
                block.position = position;
            }
            if (block.type === 'LinearStage' || block.type === 'Tool') {
                block.setAtrributes(blockData.attributes);
            }
        });
        progObj.connections.forEach((connectionData) => {
            machine.setConnection({
                baseBlock: machine.findBlockWithId(connectionData.baseBlock),
                baseBlockFace: connectionData.baseBlockFace,
                baseBlockEnd: connectionData.baseBlockEnd,
                addBlock: machine.findBlockWithId(connectionData.addBlock),
                addBlockFace: connectionData.addBlockFace,
                addBlockEnd: connectionData.addBlockEnd
            });
        });
        // Once we have Blocks and Motors instantiated, set their pointers:
        // Paired motors, driven stages, driving motors
        let motorPairs = [];
        let pairedMotorIds = [];
        progObj.motors.forEach((motorData) => {
            let motor = machine.findBlockWithId(motorData.id)
            motor.drivenStages = motorData.drivenStages.map((stageData) => {
                return machine.findBlockWithId(stageData.id);
            });
            if (motorData.pairMotorId !== undefined) {
                motor.pairMotorType = motorData.pairMotorType;
                // If this is the first of a pair, operate on both for pairing
                if (!pairedMotorIds.includes(motorData.id)
                    && !pairedMotorIds.includes(motorData.pairMotorId)) {
                    let pairMotor = machine.
                                        findBlockWithId(motorData.pairMotorId);
                    motor.pairMotor = pairMotor;
                    pairMotor.pairMotor = motor;
                    motorPairs.push([motor, pairMotor]);
                    pairedMotorIds.push(motorData.id);
                    pairedMotorIds.push(motorData.pairMotorId);
                }
            }
        });
        progObj.blocks.forEach((blockData) => {
            if (blockData.componentType === 'LinearStage') {
                let block = machine.findBlockWithId(blockData.id)
                block.drivingMotors = blockData.drivingMotors
                                        .map((motorData) => {
                    return machine.findBlockWithId(motorData.id);
                });
            }
        });
        machine.pairedMotors = motorPairs;

        return machine;
    }
}

let makeLoadStlPromise = (filepath, strangeScene) => {
    let loadPromise = new Promise(resolve => {
        let loader = new THREE.STLLoader();
        let stlMesh;
        return loader.load(filepath, (stlGeom) => {
            let material = new THREE.MeshLambertMaterial({
                color : BuildEnvironment.color
            });
            stlMesh = new THREE.Mesh(stlGeom, material);
            stlMesh.scale.set(10, 10, 10);
            stlMesh.isLoadedStl = true;
            strangeScene.scene.add(stlMesh);
            resolve(stlMesh);
        }, undefined, (errorMsg) => {
            console.log(errorMsg);
        });
    });
    return loadPromise;
};

function main() {
    let ss = new StrangeScene();
    let compiler = new Compiler();
    window.compiler = compiler;
    let axidrawProg = '{"name":"axidraw","buildEnvironment":{"width":500,"length":500},"workEnvelope":{"shape":"rectangle","width":250,"height":0,"length":250,"position":{"x":-92.5,"y":12.6,"z":0}},"motors":[{"id":"_gtgpe5ykk","name":"MotorA","componentType":"Motor","dimensions":{"width":50,"height":50,"length":50},"kinematics":"hBot","invertSteps":false,"drivenStages":[{"id":"_ug8gzod3z","name":"Bottom"},{"id":"_nyqtmejvb","name":"Top"}],"pairMotorId":"_yro6inmwg","pairMotorType":"b"},{"id":"_yro6inmwg","name":"MotorB","componentType":"Motor","dimensions":{"width":50,"height":50,"length":50},"kinematics":"hBot","invertSteps":false,"drivenStages":[{"id":"_ug8gzod3z","name":"Bottom"},{"id":"_nyqtmejvb","name":"Top"}],"pairMotorId":"_gtgpe5ykk","pairMotorType":"a"}],"blocks":[{"id":"_rru0rtooz","name":"Sharpie","componentType":"Tool","dimensions":{"width":10,"height":50,"length":10}},{"id":"_um530fh8t","name":"Servo","componentType":"ToolAssembly","dimensions":{"width":12.5,"height":25,"length":50}},{"id":"_nyqtmejvb","name":"Top","componentType":"LinearStage","dimensions":{"width":250,"height":25,"length":50},"drivingMotors":[{"id":"_gtgpe5ykk"},{"id":"_yro6inmwg"}],"attributes":{"driveMechanism":"timingBelt","stepDisplacementRatio":"0.7"}},{"id":"_ug8gzod3z","name":"Bottom","componentType":"LinearStage","dimensions":{"width":50,"height":50,"length":250},"drivingMotors":[{"id":"_gtgpe5ykk"},{"id":"_yro6inmwg"}],"attributes":{"driveMechanism":"timingBelt","stepDisplacementRatio":"0.7"},"position":{"x":50,"y":37.6,"z":0}}],"connections":[{"baseBlock":"_ug8gzod3z","baseBlockName":"Bottom","baseBlockFace":"-y","baseBlockEnd":"0","addBlock":"_nyqtmejvb","addBlockName":"Top","addBlockFace":"+y","addBlockEnd":"0"},{"baseBlock":"_nyqtmejvb","baseBlockName":"Top","baseBlockFace":"+x","baseBlockEnd":"0","addBlock":"_um530fh8t","addBlockName":"Servo","addBlockFace":"-x","addBlockEnd":"0"},{"baseBlock":"_ug8gzod3z","baseBlockName":"Bottom","baseBlockFace":"+z","baseBlockEnd":"0","addBlock":"_gtgpe5ykk","addBlockName":"MotorA","addBlockFace":"-z","addBlockEnd":"0"},{"baseBlock":"_ug8gzod3z","baseBlockName":"Bottom","baseBlockFace":"-z","baseBlockEnd":"0","addBlock":"_yro6inmwg","addBlockName":"MotorB","addBlockFace":"+z","addBlockEnd":"0"},{"baseBlock":"_um530fh8t","baseBlockName":"Servo","baseBlockFace":"+x","baseBlockEnd":"0","addBlock":"_rru0rtooz","addBlockName":"Sharpie","addBlockFace":"-x","addBlockEnd":"0"}],"references":{"parallelBlockGroups":[],"pairedMotorGroups":[[{"id":"_gtgpe5ykk","name":"MotorA","kinematics":"hBot"},{"id":"_yro6inmwg","name":"MotorB","kinematics":"hBot"}]],"axes":{"x":[{"id":"_nyqtmejvb","name":"Top"}],"z":[{"id":"_ug8gzod3z","name":"Bottom"}]},"workEnvelope":{"shape":"rectangle","width":250,"height":0,"length":250,"position":{"x":-92.5,"y":12.6,"z":0}}}}';
    let prusaProg = '{"name":"prusa","buildEnvironment":{"width":500,"length":500},"workEnvelope":{"shape":"box","width":165,"height":150,"length":210,"position":{"x":0,"y":87.6,"z":0}},"motors":[{"id":"_wspzkqtt4","name":"leadscrew motor a","componentType":"Motor","dimensions":{"width":25,"height":25,"length":25},"kinematics":"directDrive","invertSteps":false,"drivenStages":[{"id":"_xqtko21l8","name":"z leadscrew a"}],"position":{"x":35,"y":25.1,"z":-100}},{"id":"_76jz1l8m3","name":"leadscrew motor b","componentType":"Motor","dimensions":{"width":25,"height":25,"length":25},"kinematics":"directDrive","invertSteps":false,"drivenStages":[{"id":"_c1nf4uf24","name":"z leadscrew b"}],"position":{"x":35,"y":25.1,"z":100}},{"id":"_3dg6fxkhj","name":"platform belt motor","componentType":"Motor","dimensions":{"width":25,"height":25,"length":25},"kinematics":"directDrive","invertSteps":false,"drivenStages":[{"id":"_4jqi7hfnt","name":"platform belt"}]},{"id":"_1ixp2wekj","name":"carriage belt motor","componentType":"Motor","dimensions":{"width":25,"height":25,"length":25},"kinematics":"directDrive","invertSteps":false,"drivenStages":[{"id":"_mop0u2z1w","name":"carriage belt"}]}],"blocks":[{"id":"_bccb07fca","name":"build plate","componentType":"Platform","dimensions":{"length":130,"width":130,"height":10}},{"id":"_4jqi7hfnt","name":"platform belt","componentType":"LinearStage","dimensions":{"width":165,"height":25,"length":25},"drivingMotors":[{"id":"_3dg6fxkhj"}],"attributes":{"driveMechanism":"timingBelt","stepDisplacementRatio":0.7},"position":{"x":0,"y":25.1,"z":0}},{"id":"_mop0u2z1w","name":"carriage belt","componentType":"LinearStage","dimensions":{"width":12.5,"height":25,"length":210},"drivingMotors":[{"id":"_1ixp2wekj"}],"attributes":{"driveMechanism":"timingBelt","stepDisplacementRatio":0.5}},{"id":"_xqtko21l8","name":"z leadscrew a","componentType":"LinearStage","dimensions":{"width":10,"height":150,"length":10},"drivingMotors":[{"id":"_wspzkqtt4"}],"attributes":{"driveMechanism":"leadscrew","stepDisplacementRatio":0.5}},{"id":"_c1nf4uf24","name":"z leadscrew b","componentType":"LinearStage","dimensions":{"width":10,"height":150,"length":10},"drivingMotors":[{"id":"_76jz1l8m3"}],"attributes":{"driveMechanism":"leadscrew","stepDisplacementRatio":0.5}},{"id":"_qbpp87ejx","name":"hotend","componentType":"ToolAssembly","dimensions":{"width":12.5,"height":25,"length":25}},{"id":"_9j7xrk6xl","name":"extruder","componentType":"Tool","dimensions":{"width":10,"height":25,"length":10}}],"connections":[{"baseBlock":"_wspzkqtt4","baseBlockName":"leadscrew motor a","baseBlockFace":"-y","baseBlockEnd":"0","addBlock":"_xqtko21l8","addBlockName":"z leadscrew a","addBlockFace":"+y","addBlockEnd":"0"},{"baseBlock":"_76jz1l8m3","baseBlockName":"leadscrew motor b","baseBlockFace":"-y","baseBlockEnd":"0","addBlock":"_c1nf4uf24","addBlockName":"z leadscrew b","addBlockFace":"+y","addBlockEnd":"0"},{"baseBlock":"_4jqi7hfnt","baseBlockName":"platform belt","baseBlockFace":"+x","baseBlockEnd":"0","addBlock":"_3dg6fxkhj","addBlockName":"platform belt motor","addBlockFace":"-x","addBlockEnd":"0"},{"baseBlock":"_4jqi7hfnt","baseBlockName":"platform belt","baseBlockFace":"-y","baseBlockEnd":"0","addBlock":"_bccb07fca","addBlockName":"build plate","addBlockFace":"+y","addBlockEnd":"0"},{"baseBlock":"_xqtko21l8","baseBlockName":"z leadscrew a","baseBlockFace":"+x","baseBlockEnd":"0","addBlock":"_mop0u2z1w","addBlockName":"carriage belt","addBlockFace":"-x","addBlockEnd":"+z"},{"baseBlock":"_c1nf4uf24","baseBlockName":"z leadscrew b","baseBlockFace":"+x","baseBlockEnd":"0","addBlock":"_mop0u2z1w","addBlockName":"carriage belt","addBlockFace":"-x","addBlockEnd":"-z"},{"baseBlock":"_mop0u2z1w","baseBlockName":"carriage belt","baseBlockFace":"+z","baseBlockEnd":"0","addBlock":"_1ixp2wekj","addBlockName":"carriage belt motor","addBlockFace":"-x","addBlockEnd":"+x"},{"baseBlock":"_mop0u2z1w","baseBlockName":"carriage belt","baseBlockFace":"+x","baseBlockEnd":"0","addBlock":"_qbpp87ejx","addBlockName":"hotend","addBlockFace":"-x","addBlockEnd":"0"},{"baseBlock":"_qbpp87ejx","baseBlockName":"hotend","baseBlockFace":"+x","baseBlockEnd":"0","addBlock":"_9j7xrk6xl","addBlockName":"extruder","addBlockFace":"-x","addBlockEnd":"0"}],"references":{"parallelBlockGroups":[[{"id":"_xqtko21l8","name":"z leadscrew a"},{"id":"_c1nf4uf24","name":"z leadscrew b"}]],"pairedMotorGroups":[],"axes":{"x":[{"id":"_4jqi7hfnt","name":"platform belt"}],"z":[{"id":"_mop0u2z1w","name":"carriage belt"}],"y":[{"id":"_xqtko21l8","name":"z leadscrew a"},{"id":"_c1nf4uf24","name":"z leadscrew b"}]},"workEnvelope":{"shape":"box","width":165,"height":150,"length":210,"position":{"x":0,"y":87.6,"z":0}}}}';
    // let machine = compiler.decompileIntoScene(ss, prusaProg);
    let machine = new Machine('prusa', ss);
    machine.presetLoaders.prusa();
    let kinematics = new Kinematics(ss);
    window.kinematics = kinematics;
    kinematics.buildTreeForMachine(machine);
    ss.instructionQueue = new InstructionQueue();
    ss.instructionQueue.setKinematics(window.kinematics);
    let animate = () => {
        let maxFramerate = 20;
        setTimeout(() => {
            requestAnimationFrame(animate);
        }, 1000 / maxFramerate);
        ss.renderScene();
    };
    console.log(compiler.compileMachine(ss.machine));
    animate();
    return ss;
}

window.strangeScene = main();
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
    if (machine.name === 'axidraw') {
        // window.kinematics.turnMotors({
        //     [motorA.id] : 100,
        //     [motorB.id] : -100
        // });
        window.kinematics.moveToolRelative({
            x: 100,
            z: 0
        });
    }
    if (machine.name === 'prusa') {
        // window.kinematics.turnMotors({
        //     [lsMotorA.id] : -50,
        //     [lsMotorB.id] : -50,
        //     [platformMotor.id] : 50
        // });
        // window.kinematics.moveToolRelative({
        //     x: 50,
        //     y: 0,
        //     z: 100
        // });
        let iq = window.strangeScene.instructionQueue;
        iq.enqueueInstruction('G92 X0 Y0 Z0');
        iq.enqueueInstruction('G0 X20 Y0 Z0');
        iq.enqueueInstruction('G0 X0 Y0 Z0');
        iq.executeNextInstruction();
    }
};

