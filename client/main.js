'use strict';

class MomScene {
    constructor() {
        this.domContainer = document.getElementById('container');
        console.log(this.domContainer);
        this.scene = this.initScene();
        this.camera = this.initCamera(this.scene);
        this.renderer = this.initRenderer();
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
        scene.add(new THREE.GridHelper(2000, 100, 0x444444, 0xe5e6e8));
        return scene;
    }

    initCamera(scene) {
        let aspect = window.innerWidth / window.innerHeight;
        let viewSize = 150;
        let camera = new THREE.OrthographicCamera(-viewSize * aspect,
            viewSize * aspect,
            viewSize, -viewSize, -1000, 10000);
        camera.zoom = 0.35;
        camera.updateProjectionMatrix();
        camera.frustumCulled = false;
        camera.position.set(-500, 500, 500); // I don't know why this works
        camera.lookAt(scene.position);
        camera.position.set(-400, 500, 800); // Pan away to move machine to left
        return camera;
    }

    initRenderer() {
        let renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        container.appendChild(renderer.domElement);
        return renderer;
    }

    renderScene() {
        this.renderer.render(this.scene, this.camera);
    }

}

function main() {
    let ms = new MomScene();
    let animate = () => {
        requestAnimationFrame(animate);
        ms.renderScene();
    };
    animate();
}

main();

