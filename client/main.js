'use strict';

class StrangeScene {
    constructor() {
        this.domContainer = document.getElementById('container');
        this.scene = this.initScene();
        this.camera = this.initCamera(this.scene, false);
        this.renderer = this.initRenderer();
        this.controls = this.initControls(this.camera, this.renderer);
        this.components = [];
    }

    initScene() {
        let scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf5f6f8);
        let topDirectionalLight = new THREE.DirectionalLight(0xffffff, 1.00);
        let leftDirectionalLight = new THREE.DirectionalLight(0xffffff, 0.75);
        let rightDirectionalLight = new THREE.DirectionalLight(0xffffff, 0.50);
        leftDirectionalLight.position.set(-1.0, 0.0, 0.0);
        rightDirectionalLight.position.set(0.0, 0.0, 1.0);
        scene.add(topDirectionalLight);
        scene.add(leftDirectionalLight);
        scene.add(rightDirectionalLight);
        scene.add(new THREE.GridHelper(2000, 100, 'red', 0x444444));
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
        let controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.rotateSpeed = 1.0;
        controls.zoomSpeed = 0.8;
        controls.panSpeed = 0.8;
        controls.keys = [65, 83, 68];
        return controls;
    }

    renderScene() {
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    addComponent(component) {
        this.scene.add(component.meshGroup);
        this.components.push(component);
    }

}

class StrangeComponent {
    static geometryFactories = {
        stageCase: () => new THREE.BoxBufferGeometry(50, 25, 250, 2, 2, 2),
        stagePlatform: () => new THREE.BoxBufferGeometry(50, 25, 50, 2, 2, 2),
        rotaryStageCase: () => new THREE.BoxBufferGeometry(150, 50, 150, 2, 2, 2),
        rotaryStagePlatform: () => new THREE.CylinderBufferGeometry(50, 50, 80, 10),
        angledTool: () => new THREE.CylinderBufferGeometry(10, 10, 80, 10),
        straightTool: () => new THREE.CylinderBufferGeometry(5, 5, 50, 10),
        connectionHandle: () => new THREE.SphereBufferGeometry(25, 32, 32),
        buildEnvironment: () => new THREE.BoxBufferGeometry(500, 500, 25, 2, 2, 2),
        workEnvelope: (shape) => {
            if (shape === 'rectangle' || shape === undefined) {
                return new THREE.PlaneBufferGeometry(250, 250);
            }
            if (shape === 'cube') {
                return new THREE.BoxBufferGeometry(250, 250, 250, 2, 2, 2);
            }
            if (shape === 'cylinder') {
                return new THREE.CylinderBufferGeometry(125, 125, 250, 64);
            }
        }
    };
    constructor(name) {
        this.name = name;
        this.geometries = [];
        this.meshGroup = new THREE.Group();
        this.rotatedToPlane = false;
    }

    get position() {
        return this.meshGroup.position;
    }

    set position(newPos) {
        this.meshGroup.position.set(newPos.x, newPos.y, newPos.z);
    }

    rotateToXYPlane() {
        let rotateQuaternion = new THREE.Quaternion();
        rotateQuaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0),
                                          -Math.PI / 2);
        this.mesh.quaternion.copy(rotateQuaternion);
        // FIXME: remove this variable and just read the quaternion
        this.rotatedToPlane = true;
    }

    hide() {
        this.meshGroup.visible = false;
    }

    unhide() {
        this.meshGroup.visible = true;
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
        // this.position = centerPt;
        this.meshGroup.position.set(centerPt.x, centerPt.y, centerPt.z);
    }
}

class BuildEnvironment extends StrangeComponent {
    static color = 0xfefefe;
    constructor() {
        name = 'BuildEnvironment';
        super(name);
        let geom = BuildEnvironment.geometryFactories.buildEnvironment();
        let material = new THREE.MeshLambertMaterial({
            color : BuildEnvironment.color
        });
        this.mesh = new THREE.Mesh(geom, material);
        this.meshGroup = new THREE.Group();
        this.meshGroup.add(this.mesh);
        this.geometries = [geom];
        this.rotateToXYPlane();
    }
}

class WorkEnvelope extends StrangeComponent {
    static color = 0x9d8dff;
    static shapeNames = ['rectangle', 'cube', 'cylinder']

    constructor(shapeName) {
        if (!WorkEnvelope.shapeNames.includes(shapeName)) {
            console.error(`Invalid shape ${shapeName}, defaulting to recangle.`);
            shapeName = 'rectangle';
        }
        name = 'WorkEnvelope';
        super(name);
        let geom = WorkEnvelope.geometryFactories.workEnvelope(shapeName);
        let material = new THREE.MeshLambertMaterial({
            color : WorkEnvelope.color,
            transparent : true,
            opacity : 0.5
        });
        this.mesh = new THREE.Mesh(geom, material);
        this.meshGroup = new THREE.Group();
        this.meshGroup.add(this.mesh);
        this.geometries = [geom];
        if (shapeName === 'rectangle') {
            this.rotateToXYPlane();
        }
    }
}

class Lego extends StrangeComponent {
    // TODO
}

class Tool extends Lego {
    static color = 0xe44242;
    static defaultPosition = new THREE.Vector3(0, 150, 0);
    constructor() {
        name = 'Tool';
        super(name);
        let geom = BuildEnvironment.geometryFactories.straightTool();
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
    }
    setPositionToDefault() {
        this.mesh.position.set(Tool.defaultPosition.x,
                               Tool.defaultPosition.y,
                               Tool.defaultPosition.z)
    }
}

class LinearStage extends Lego {
    static caseColor = 0xe44242;
    static platformColor = 0xe44242;
    constructor() {
        name = 'LinearStage';
        super(name);
        this.caseGeom = BuildEnvironment.geometryFactories.stageCase();
        this.platformGeom = BuildEnvironment.geometryFactories.stagePlatform();
        this.caseMaterial = new THREE.MeshLambertMaterial({
            color : LinearStage.caseColor
        });
        this.platformMaterial = new THREE.MeshLambertMaterial({
            color : LinearStage.platformColor
        });
        this.caseMesh = new THREE.Mesh(this.caseGeom, this.caseMaterial);
        this.platformMesh = new THREE.Mesh(this.platformGeom, this.platformMaterial);
        this.meshGroup = new THREE.Group();
        this.meshGroup.add(this.caseMesh);
        this.meshGroup.add(this.platformMesh);
        this.platformMesh.position.setY(25);
        this.geometries = [this.caseGeom, this.platformGeom]
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

var myStl;

function main() {
    let ss = new StrangeScene();
    let be = new BuildEnvironment();
    let we = new WorkEnvelope('rectangle');
    let tool = new Tool();
    let stage = new LinearStage();
    ss.addComponent(be);
    ss.addComponent(we);
    ss.addComponent(tool);
    ss.addComponent(stage);
    we.placeOnComponent(be);
    stage.placeOnComponent(be);
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

