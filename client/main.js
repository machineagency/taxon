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
        this.controls = this.initControls(this.camera, this.renderer);
        this.ruler = new Ruler();
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
        this.renderer.render(this.scene, this.camera);
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
        return motorsAndOtherBlocks.find(block => block.id === id);
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
            let we = new WorkEnvelope(this, {
                shape: 'rectangle',
                length: 250,
                width: 250
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
            we.placeOnComponent(be);
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
            let we = new WorkEnvelope(this, {
                shape: 'rectangle',
                length: 250,
                width: 250
            });
            let tool = new Tool('Sharpie', this, {
                type: 'pen',
                height: 50,
                radius: 5
            });
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
            });
            let motorB = new Motor('MotorB', this, {
                width: 50,
                height: 50,
                length: 50
            });
            we.placeOnComponent(be);
            we.movePosition(-100, 0, 0);
            stageBottom.placeOnComponent(be);
            stageBottom.movePosition(50, 0, 0);
            this.setConnection({
                baseBlock: stageBottom,
                baseBlockFace: '-y',
                baseBlockEnd: '-x',
                addBlock: stageTop,
                addBlockFace: '+y',
                addBlockEnd: '+z'
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
            return this;
        },
        prusa: () => {
            this.clearMachineFromScene();
            let be = new BuildEnvironment(this, {
                length: 500,
                width: 500
            });
            let we = new WorkEnvelope(this, {
                shape: 'rectangle',
                length: 200 - 35,
                width: 200 - 35
            });
            let platformBelt = new LinearStage('platform belt', this, {
                width: 200 - 35,
                height: 25,
                length: 25
            });
            let carriageBelt = new LinearStage('carriage belt', this, {
                width: 12.5,
                height: 25,
                length: 210
            });
            let lsA = new LinearStage('z leadscrew a', this, {
                width: 10,
                height: 150,
                length: 10
            });
            let lsB = new LinearStage('z leadscrew b', this, {
                width: 10,
                height: 150,
                length: 10
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
            we.placeOnComponent(platformBelt);
            lsMotorA.placeOnComponent(be);
            lsMotorB.placeOnComponent(be);
            lsMotorA.movePosition(100, 0, -100);
            lsMotorB.movePosition(100, 0, +100);
            this.setConnection({
                baseBlock: lsMotorA,
                baseBlockFace: '-y',
                baseBlockEnd: '0',
                addBlock: lsA,
                addBlockFace: '-y',
                addBlockEnd: '0'
            });
            this.setConnection({
                baseBlock: lsMotorB,
                baseBlockFace: '-y',
                baseBlockEnd: '0',
                addBlock: lsB,
                addBlockFace: '-y',
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
            // carriageBelt.movePosition(100 - 12.5/2 - 10/2, 50, 0);
            // TODO: current approach is to set two connections and
            // infer that there is a parallel connection
            this.setConnection({
                baseBlock: lsA,
                baseBlockFace: '+x',
                baseBlockEnd: '0',
                addBlock: carriageBelt,
                addBlockFace: '-x',
                addBlockEnd: '-z'
            });
            this.setConnection({
                baseBlock: lsB,
                baseBlockFace: '+x',
                baseBlockEnd: '0',
                addBlock: carriageBelt,
                addBlockFace: '-x',
                addBlockEnd: '+z'
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
                type: 'pen',
                height: 25,
                radius: 5
            });
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
                return new THREE.CylinderBufferGeometry(dimensions.radius,
                        dimensions.radius, dimensions.height, 10)
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
            if (dimensions.shape === 'cube') {
                return new THREE.BoxBufferGeometry(dimensions.length,
                    dimensions.width, dimensions.height, 2, 2, 2);
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
    static shapes = ['rectangle', 'cube', 'cylinder'];

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
    constructor(name, parentMachine, dimensions) {
        super(name, parentMachine, dimensions);
        this.componentType = 'Tool';
        // NOTE: Tool objects are not base blocks because they are assumed
        // to be "floating" and machine-independent for simulation purposes
        this.baseBlock = false;
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
                               Tool.defaultPosition.z)
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

class LinearStage extends Block {
    static caseColor = 0x222222;
    constructor(name, parentMachine, dimensions) {
        super(name, parentMachine, dimensions);
        this.componentType = 'LinearStage';
        this.baseBlock = true;
        parentMachine.addBlock(this);
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
        this.geometries = [this.caseGeom, this.edgesGeom]
        this.addMeshGroupToScene();
    }
}

class Motor extends Block {
    static color = 0xffed90;
    constructor(name, parentMachine, dimensions) {
        super(name, parentMachine, dimensions);
        this.componentType = 'Motor';
        this.baseBlock = true;
        parentMachine.addMotor(this);
        this.renderDimensions();
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
        let progWorkEnvelope = {
            shape: machine.workEnvelope.shape,
            width: machine.workEnvelope.width,
            length: machine.workEnvelope.length,
            position: {
                x: machine.workEnvelope.position.x,
                y: machine.workEnvelope.position.y,
                z: machine.workEnvelope.position.z
            }
        };
        let progBlocks = machine.blocks.map((block) => {
            let progBlock = {
                id: block.id,
                name: block.name,
                componentType: block.componentType,
                dimensions: block.dimensions
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
            // TODO: kinematics, motor designations, etc.
            let kinematics = machine.name === 'Axidraw' ? 'hBot' : 'directDrive';
            let progMotor = {
                id: motor.id,
                name: motor.name,
                componentType: motor.componentType,
                dimensions: motor.dimensions,
                kinematics: kinematics
            }
            if (motor.baseBlock) {
                progMotor.position = {
                    x: motor.position.x,
                    y: motor.position.y,
                    z: motor.position.z
                };
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

        progObj['name'] = machine['name'];
        progObj['buildEnvironment'] = progBuildEnvironment;
        progObj['workEnvelope'] = progWorkEnvelope;
        progObj['motors'] = progMotors;
        progObj['blocks'] = progBlocks;
        progObj['connections'] = progConnections;
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
    let axidrawProg = '{"name":"Axidraw","buildEnvironment":{"width":500,"length":500},"workEnvelope":{"shape":"rectangle","width":250,"length":250,"position":{"x":-100,"y":14,"z":0}},"motors":[{"id":"_8u1etwnzu","name":"MotorA","componentType":"Motor","dimensions":{"width":50,"height":50,"length":50},"kinematics":"hBot"},{"id":"_l8ie2ir94","name":"MotorB","componentType":"Motor","dimensions":{"width":50,"height":50,"length":50},"kinematics":"hBot"}],"blocks":[{"id":"_88emu97v2","name":"Sharpie","componentType":"Tool","dimensions":{"type":"pen","height":50,"radius":5}},{"id":"_b79dmf0u1","name":"Servo","componentType":"ToolAssembly","dimensions":{"width":12.5,"height":25,"length":50}},{"id":"_pl4vtjbkv","name":"Top","componentType":"LinearStage","dimensions":{"width":250,"height":25,"length":50}},{"id":"_ezquxn891","name":"Bottom","componentType":"LinearStage","dimensions":{"width":50,"height":50,"length":250},"position":{"x":50,"y":39,"z":0}}],"connections":[{"baseBlock":"_ezquxn891","baseBlockName":"Bottom","baseBlockFace":"-y","addBlock":"_pl4vtjbkv","addBlockName":"Top","addBlockFace":"+y","addBlockEnd":"0"},{"baseBlock":"_pl4vtjbkv","baseBlockName":"Top","baseBlockFace":"+x","addBlock":"_b79dmf0u1","addBlockName":"Servo","addBlockFace":"-x","addBlockEnd":"0"},{"baseBlock":"_ezquxn891","baseBlockName":"Bottom","baseBlockFace":"+z","addBlock":"_8u1etwnzu","addBlockName":"MotorA","addBlockFace":"-z","addBlockEnd":"0"},{"baseBlock":"_ezquxn891","baseBlockName":"Bottom","baseBlockFace":"-z","addBlock":"_l8ie2ir94","addBlockName":"MotorB","addBlockFace":"+z","addBlockEnd":"0"}]}';
    let prusaProg = '{"name":"Prusa","buildEnvironment":{"width":500,"length":500},"workEnvelope":{"shape":"rectangle","width":165,"length":165,"position":{"x":0,"y":37.7,"z":0}},"motors":[{"id":"_9i4dkku69","name":"leadscrew motor a","componentType":"Motor","dimensions":{"width":25,"height":25,"length":25},"kinematics":"directDrive","position":{"x":100,"y":25.1,"z":-100}},{"id":"_ojk1v6pqe","name":"leadscrew motor b","componentType":"Motor","dimensions":{"width":25,"height":25,"length":25},"kinematics":"directDrive","position":{"x":100,"y":25.1,"z":100}},{"id":"_4voygo4cz","name":"platform belt motor","componentType":"Motor","dimensions":{"width":25,"height":25,"length":25},"kinematics":"directDrive"},{"id":"_d90cj6s4o","name":"carriage belt motor","componentType":"Motor","dimensions":{"width":25,"height":25,"length":25},"kinematics":"directDrive"}],"blocks":[{"id":"_5727moa5h","name":"platform belt","componentType":"LinearStage","dimensions":{"width":165,"height":25,"length":25},"position":{"x":0,"y":25.1,"z":0}},{"id":"_1hhx18qbr","name":"carriage belt","componentType":"LinearStage","dimensions":{"width":12.5,"height":25,"length":210},"position":{"x":88.75,"y":75.1,"z":0}},{"id":"_ohjvuvl0s","name":"z leadscrew a","componentType":"LinearStage","dimensions":{"width":10,"height":150,"length":10}},{"id":"_n476hx9vz","name":"z leadscrew b","componentType":"LinearStage","dimensions":{"width":10,"height":150,"length":10}},{"id":"_flbuxdy66","name":"hotend","componentType":"ToolAssembly","dimensions":{"width":12.5,"height":25,"length":25}},{"id":"_yey0kq0l5","name":"extruder","componentType":"Tool","dimensions":{"type":"pen","height":25,"radius":5}}],"connections":[{"baseBlock":"_9i4dkku69","baseBlockName":"leadscrew motor a","baseBlockFace":"-y","addBlock":"_ohjvuvl0s","addBlockName":"z leadscrew a","addBlockFace":"-y","addBlockEnd":"0"},{"baseBlock":"_ojk1v6pqe","baseBlockName":"leadscrew motor b","baseBlockFace":"-y","addBlock":"_n476hx9vz","addBlockName":"z leadscrew b","addBlockFace":"-y","addBlockEnd":"0"},{"baseBlock":"_5727moa5h","baseBlockName":"platform belt","baseBlockFace":"+x","addBlock":"_4voygo4cz","addBlockName":"platform belt motor","addBlockFace":"-x","addBlockEnd":"0"},{"baseBlock":"_1hhx18qbr","baseBlockName":"carriage belt","baseBlockFace":"+z","addBlock":"_d90cj6s4o","addBlockName":"carriage belt motor","addBlockFace":"-x","addBlockEnd":"0"},{"baseBlock":"_1hhx18qbr","baseBlockName":"carriage belt","baseBlockFace":"+x","addBlock":"_flbuxdy66","addBlockName":"hotend","addBlockFace":"-x","addBlockEnd":"0"}]}';
    // let decompMachineProg = compiler.decompileIntoScene(ss, prusaProg);
    let machine = new Machine('prusa', ss);
    machine.presetLoaders.prusa();
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

