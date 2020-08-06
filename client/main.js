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
        this.buildEnvironment = null;
        this.workEnvelope = null;
        this.blocks = [];
        this.motors = [];
        this.connections = [];
        parentScene.machine = this;
    }

    // TODO: make this.components a THREE.Group for repositioning
    addBlock(component) {
        this.blocks.push(component);
    }

    addMotor(motor) {
        this.motors.push(motor);
    }

    renderRulerForComponent(component) {
        this.ruler.displayInSceneForComponent(this, component)
    }

    removeCurrentComponents() {
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
     *      faceA: String in { '+x', '-x', '+y', ... , '-z' },
     *      addBlock: Component,
     *      faceB: String in { '+x', '-x', '+y', ... , '-z' }
     * }
     */
    setConnection(connectionObj) {
        let { baseBlock, faceA, addBlock, faceB, end } = connectionObj;
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
            let axisToDim = {
                'x': 'width',
                'y': 'height',
                'z': 'length'
            };
            let dimA = axisToDim[axisA];
            let dimB = axisToDim[axisB];
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
        // FIXME: generalize offset for any rotation
        let endOffsets = {
            '+' : new THREE.Vector3(0, 0, +(baseBlock.length / 2 - addBlock.width)),
            '-' : new THREE.Vector3(0, 0, -(baseBlock.length / 2 - addBlock.width)),
            '0' : new THREE.Vector3(0, 0, 0),
        };
        // NOTE: reverse order faces otherwise connections are in backwards
        // configuration for some reason
        let fStr = [faceB, faceA].join();

        // Rotate translation vector to match ComponentA's quaternion
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

        // Apply end offset, itself rotated to match ComponentB's quaternion
        let endOffset = endOffsets[end];
        endOffset.applyQuaternion(addBlock.quaternion);
        addBlock.position = addBlock.position.add(endOffset);

        addBlock.baseBlock = false;
        this.connections.push(connectionObj);
        return this;
    }

    presetLoaders = {
        xyPlotter: () => {
            this.removeCurrentComponents();
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
            this.removeCurrentComponents();
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
                faceA: '-y',
                addBlock: stageTop,
                faceB: '+y',
                end: '0'
            });
            this.setConnection({
                baseBlock: stageTop,
                faceA: '+x',
                addBlock: toolAssembly,
                faceB: '-x',
                end: '0'
            });
            this.setConnection({
                baseBlock: stageBottom,
                faceA: '+z',
                addBlock: motorA,
                faceB: '-z',
                end: '0'
            });
            this.setConnection({
                baseBlock: stageBottom,
                faceA: '-z',
                addBlock: motorB,
                faceB: '+z',
                end: '0'
            });
            return this;
        },
        connectionSandbox: () => {
            this.removeCurrentComponents();
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
                faceA: '-z',
                addBlock: s1,
                faceB: '+x',
                end: '+'
            });
            this.setConnection({
                baseBlock: s1,
                faceA: '+y',
                addBlock: s2,
                faceB: '-z',
                end: '0'
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
        let thisBbox = this.computeComponentBoundingBox();
        let thisHeight;
        if (this.rotatedToPlane) {
            thisHeight = thisBbox.max.z - thisBbox.min.z;
        }
        else {
            thisHeight = thisBbox.max.y - thisBbox.min.y;
        }
        let addBlockbox = component.computeComponentBoundingBox();
        let bmax = addBlockbox.max;
        let bmin = addBlockbox.min;
        let eps = 1.5;
        let topPlanePts = [
            new THREE.Vector3(bmax.x, bmax.y, bmax.z),
            new THREE.Vector3(bmax.x, bmax.y - bmin.y, bmax.z),
            new THREE.Vector3(bmax.x - bmin.y, bmax.y - bmin.y, bmax.z),
            new THREE.Vector3(bmax.x - bmin.y, bmax.y, bmax.z)
        ];
        // NOTE: +y is up in world coordinates, but +z is up in bbox coords
        let centerPt = new THREE.Vector3();
        centerPt.x = (bmax.x + bmin.x) / 2
        centerPt.z = (bmax.y + bmin.y) / 2
        centerPt.y = bmax.z + thisHeight / 2 + eps;
        this.meshGroup.position.set(centerPt.x, centerPt.y, centerPt.z);
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
            console.error(`Invalid shape ${shapeName}, defaulting to rectangle.`);
            dimensions.shape = 'rectangle';
        }
        name = 'WorkEnvelope';
        super(name, parentMachine, dimensions);
        this.componentType = 'WorkEnvelope';
        parentMachine.workEnvelope = this;
        this.renderDimensions();
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
            color : Tool.color,
            transparent : true,
            opacity : 0.5
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
        this.baseBlock = false;
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
            let progMotor = {
                id: motor.id,
                name: motor.name,
                componentType: motor.componentType,
                dimensions: motor.dimensions,
                // TODO: kinematics, motor designations, etc.
                kinematics: 'hBot'
            }
            return progMotor;
        });
        let progConnections = machine.connections.map((connection) => {
            return {
                baseBlock: connection.baseBlock.id,
                baseBlockName: connection.baseBlock.name,
                baseBlockFace: connection.faceA,
                addBlock: connection.addBlock.id,
                addBlockName: connection.addBlock.name,
                addBlockFace: connection.faceB,
                addBlockEnd: connection.end
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
    let machine = new Machine('Axidraw', ss);
    machine.presetLoaders.axidraw();
    let animate = () => {
        let maxFramerate = 20;
        setTimeout(() => {
            requestAnimationFrame(animate);
        }, 1000 / maxFramerate);
        ss.renderScene();
    };
    animate();
    let compiler = new Compiler();
    let machineProg = compiler.compileMachine(machine);
    console.log(machineProg);
    return ss;
}

window.strangeScene = main();

