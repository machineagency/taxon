'use strict';

class StrangeScene {
    constructor() {
        this.domContainer = document.getElementById('container');
        this.scene = this.initScene();
        this.camera = this.initCamera(this.scene, false);
        this.renderer = this.initRenderer();
        this.controls = this.initControls(this.camera, this.renderer);
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
        this.scene.add(component.mesh);
    }

}

class StrangeComponent {
    static geometryFactories = {
        stageCase: () => new THREE.BoxBufferGeometry(200, 100, 1000, 2, 2, 2),
        stagePlatform: () => new THREE.BoxBufferGeometry(200, 150, 200, 2, 2, 2),
        rotaryStageCase: () => new THREE.BoxBufferGeometry(150, 50, 150, 2, 2, 2),
        rotaryStagePlatform: () => new THREE.CylinderBufferGeometry(50, 50, 80, 10),
        angledTool: () => new THREE.CylinderBufferGeometry(10, 10, 80, 10),
        straightTool: () => new THREE.CylinderBufferGeometry(10, 10, 80, 10),
        connectionHandle: () => new THREE.SphereBufferGeometry(25, 32, 32),
        buildEnvironment: () => new THREE.BoxBufferGeometry(500, 25, 500, 2, 2, 2),
        workEnvelope: () => new THREE.PlaneBufferGeometry(250, 250)
    };
    constructor(name) {
        this.name = name;
    }
}

class BuildEnvironment extends StrangeComponent {
    static color = 0xfefefe;
    constructor(name) {
        if (name === undefined) {
            name = 'Build Environment';
        }
        super(name);
        this.geom = BuildEnvironment.geometryFactories.buildEnvironment();
        this.material = new THREE.MeshLambertMaterial({
            color : BuildEnvironment.color
        });
        this.mesh = new THREE.Mesh(this.geom, this.material);
    }
}

class WorkEnvelope extends StrangeComponent {
    static color = 0x9d8dff;
    constructor(name) {
        if (name === undefined) {
            name = 'WorkEnvelope';
        }
        super(name);
        this.geom = WorkEnvelope.geometryFactories.workEnvelope();
        this.material = new THREE.MeshLambertMaterial({
            color : WorkEnvelope.color,
            transparent : true,
            opacity : 0.5
        });
        this.mesh = new THREE.Mesh(this.geom, this.material);
    }

    placeOnComponent(component) {
        // TODO
    }
}

class Lego extends StrangeComponent {
    // TODO
}

function main() {
    let ss = new StrangeScene();
    let be = new BuildEnvironment();
    let we = new WorkEnvelope();
    // ss.addComponent(be);
    ss.addComponent(we);
    let animate = () => {
        requestAnimationFrame(animate);
        ss.renderScene();
    };
    animate();
}

main();

