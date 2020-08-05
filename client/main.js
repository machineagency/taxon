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
        this.components = [];
        this.connections = [];
        parentScene.machine = this;
    }

    // TODO: make this.components a THREE.Group for repositioning
    addComponent(component) {
        this.components.push(component);
    }

    renderRulerForComponent(component) {
        this.ruler.displayInSceneForComponent(this, component)
    }

    hideAllComponents() {
        this.components.forEach((component) => {
            component.hide();
        });
    }

    showAllComponents() {
        this.components.forEach((component) => {
            component.unhide();
        });
    }

    removeCurrentComponents() {
        this.components.forEach((component, index) => {
            component.removeMeshGroupFromScene();
        });
        this.components = [];
    }

    /**
     * Connects two components such that the center point on a face of some
     * componentB becomes fixed to the center of the face of componentA.
     * For now, we only support center connections, but later will support
     * connections at either end.
     *
     * connectionObj should be of the form:
     * {
     *      componentA: Component,
     *      faceA: String in { '+x', '-x', '+y', ... , '-z' },
     *      componentB: Component,
     *      faceB: String in { '+x', '-x', '+y', ... , '-z' }
     * }
     */
    setConnection(connectionObj) {
        let { componentA, faceA, componentB, faceB, end } = connectionObj;
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
                if (axisA === 'x' && axisB === 'y' ||
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
                return new THREE.Vector3(0, 0, 1);
            }
            if (axisA === 'x' && axisB === 'z'
                || axisA === 'z' && axisB === 'x') {
                return new THREE.Vector3(0, 1, 0);
            }
            if (axisA === 'y' && axisB === 'z'
                || axisA === 'z' && axisB === 'y') {
                return new THREE.Vector3(1, 0, 0);
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
            let transDist = signA * (componentA[dimA] + componentB[dimB]);
            if (axisA === 'x') {
                return new THREE.Vector3(transDist, 0, 0).multiplyScalar(0.5);
            }
            if (axisA === 'y') {
                return new THREE.Vector3(0, transDist, 0).multiplyScalar(0.5);
            }
            if (axisA === 'z') {
                return new THREE.Vector3(0, 0, transDist).multiplyScalar(0.5);
            }
        };
        // FIXME: generalize offset for any rotation
        let endOffsets = {
            '+' : new THREE.Vector3(0, 0, +(componentA.length - componentB.width))
                            .multiplyScalar(0.5),
            '-' : new THREE.Vector3(0, 0, -(componentA.length - componentB.width))
                            .multiplyScalar(0.5),
            '0' : new THREE.Vector3(0, 0, 0),
        };
        let fStr = [faceA, faceB].join();

        // Rotate translation vector to match ComponentA's quaternion
        // FIXME: try instead just setting componentB to A's pos and quat first
        let translationVector = facePairsToTranslationVectorFn(fStr);
        translationVector.applyQuaternion(componentA.quaternion);

        // Rotate translation vector according to table
        let rotationAxis = facePairsToRotationAxis(fStr);
        let connectRotationRadians = facePairsToRadians(fStr);
        translationVector.applyAxisAngle(rotationAxis, connectRotationRadians);
        let newBPos = (new THREE.Vector3()).copy(componentA.position);
        newBPos.add(translationVector);

        // Apply end offset, itself rotated to match ComponentA's quaternion
        let endOffset = endOffsets[end];
        endOffset.applyQuaternion(componentA.quaternion);
        newBPos.add(endOffset);

        componentB.quaternion = componentA.quaternion;
        componentB.rotateOverAxis(rotationAxis, connectRotationRadians);
        componentB.position = newBPos;
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
            let tool = new Tool(this, {
                type: 'pen',
                height: 50,
                radius: 5
            });
            let toolAssembly = new ToolAssembly(this, {});
            let stageTop = new LinearStage(this, {
                length: 250
            });
            let stageBottom = new LinearStage(this, {
                length: 250
            });
            we.placeOnComponent(be);
            we.movePosition(-100, 0, 0);
            stageBottom.placeOnComponent(be);
            stageTop.movePosition(0, 76.5, 0);
            stageTop.rotateOverXYPlane();
            stageTop.rotateOverXYPlane();
            stageTop.rotateOnXYPlane();
            tool.movePosition(-131, -76.5, 0)
            toolAssembly.movePosition(-131, -73.5, 0)
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
                componentA: s0,
                faceA: '+x',
                componentB: s1,
                faceB: '-z',
                end: '0'
            });
            this.setConnection({
                componentA: s1,
                faceA: '+y',
                componentB: s2,
                faceB: '+z',
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
        toolAssembly: (dimensions) => new THREE.BoxBufferGeometry(12.5, 25, 50, 2, 2, 2),
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

    constructor(name, parentMachine, dimensions) {
        this.name = name;
        this._dimensions = dimensions;
        this.geometries = [];
        this.meshGroup = new THREE.Group();
        this.rotatedToPlane = false;
        this.parentMachine = parentMachine;
        this.parentMachine.addComponent(this);
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
        let componentBbox = component.computeComponentBoundingBox();
        let bmax = componentBbox.max;
        let bmin = componentBbox.min;
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

class Lego extends StrangeComponent {
    // TODO
}

class Tool extends Lego {
    static color = 0xe44242;
    static defaultPosition = new THREE.Vector3(0, 150, 0);
    constructor(parentMachine, dimensions) {
        name = 'Tool';
        super(name, parentMachine, dimensions);
        this.renderDimensions();
    }

    renderDimensions() {
        this.removeMeshGroupFromScene();
        let geom = BuildEnvironment.geometryFactories.tool(this.dimensions);
        let material = new THREE.MeshLambertMaterial({
            color : Tool.color,
            transparent : true,
            opacity : 0.5
        });
        this.mesh = new THREE.Mesh(geom, material);
        this.meshGroup = new THREE.Group();
        this.meshGroup.add(this.mesh);
        this.geometries = [geom];
        this.setPositionToDefault();
        this.addMeshGroupToScene();
    }

    setPositionToDefault() {
        this.meshGroup.position.set(Tool.defaultPosition.x,
                               Tool.defaultPosition.y,
                               Tool.defaultPosition.z)
    }
}

class ToolAssembly extends Lego {
    static color = 0xf36f6f;
    static defaultPosition = new THREE.Vector3(0, 150, 0);
    constructor(parentMachine, dimensions) {
        name = 'ToolAssembly';
        super(name, parentMachine, dimensions);
        this.renderDimensions();
    }

    renderDimensions() {
        this.removeMeshGroupFromScene();
        let geom = BuildEnvironment.geometryFactories
                                   .toolAssembly(this.dimensions);
        let material = new THREE.MeshLambertMaterial({
            color : Tool.color
        });
        this.mesh = new THREE.Mesh(geom, material);
        this.meshGroup = new THREE.Group();
        this.meshGroup.add(this.mesh);
        this.geometries = [geom];
        this.setPositionToDefault();
        this.addMeshGroupToScene();
    }

    setPositionToDefault() {
        this.meshGroup.position.set(Tool.defaultPosition.x,
                               Tool.defaultPosition.y,
                               Tool.defaultPosition.z)
    }
}

class LinearStage extends Lego {
    static caseColor = 0xffed90;
    static platformColor = 0xf99292;
    constructor(parentMachine, dimensions) {
        name = 'LinearStage';
        super(name, parentMachine, dimensions);
        this.renderDimensions();
    }

    renderDimensions() {
        this.removeMeshGroupFromScene();
        this.caseGeom = BuildEnvironment.geometryFactories
                                .stageCase(this.dimensions);
        this.platformGeom = BuildEnvironment.geometryFactories
                                .stagePlatform();
        this.caseMaterial = new THREE.MeshLambertMaterial({
            color : LinearStage.caseColor
        });
        this.platformMaterial = new THREE.MeshLambertMaterial({
            color : LinearStage.platformColor
        });
        this.caseMesh = new THREE.Mesh(this.caseGeom, this.caseMaterial);
        this.platformMesh = new THREE.Mesh(this.platformGeom,
                                           this.platformMaterial);
        this.meshGroup = new THREE.Group();
        this.meshGroup.add(this.caseMesh);
        this.meshGroup.add(this.platformMesh);
        this.platformMesh.position.setY(25);
        this.geometries = [this.caseGeom, this.platformGeom]
        this.addMeshGroupToScene();
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
    let machine = new Machine('MyPlotter', ss);
    machine.presetLoaders.connectionSandbox();
    let animate = () => {
        let maxFramerate = 20;
        setTimeout(() => {
            requestAnimationFrame(animate);
        }, 1000 / maxFramerate);
        ss.renderScene();
    };
    animate();
    return ss;
}

window.strangeScene = main();

