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

class ModelAnalyzer {

    constructor() {
        this.modelContainerDom = document.getElementById('model-container');
        this.drawingContainerDom = document.getElementById('drawing-container');
        this.modelScene = this.__makeModelScene();
        this.drawingScene = this.__makeDrawingScene();
        this.makeLoadStlPromise('./pikachu.stl', this.modelScene);
        this.makeLoadStlPromise('./pikachu.stl', this.drawingScene);
    }

    makeLoadStlPromise = (filepath, scene) => {
        let loadPromise = new Promise(resolve => {
            let loader = new STLLoader();
            let stlMesh;
            return loader.load(filepath, (stlGeom) => {
                let material = new THREE.MeshBasicMaterial({
                    color: 0xffffff,
                    wireframe: true
                });
                stlMesh = new THREE.Mesh(stlGeom, material);
                stlMesh.scale.set(10, 10, 10);
                stlMesh.isLoadedStl = true;
                scene.add(stlMesh);
                scene.render();
                resolve(stlMesh);
            }, undefined, (errorMsg) => {
                console.log(errorMsg);
            });
        });
        return loadPromise;
    };

    __makeModelScene() {
        let domElement = this.modelContainerDom;
        let scene = new THREE.Scene();
        let aspect = domElement.offsetWidth / domElement.offsetHeight;
        let viewSize = 50;
        let camera = new THREE.OrthographicCamera(-viewSize * aspect, viewSize * aspect,
            viewSize, -viewSize, -1000, 10000);
        camera.zoom = 0.1;
        camera.updateProjectionMatrix();
        camera.frustumCulled = false;
        camera.position.set(500, 500, 500); // I don't know why this works
        camera.lookAt(scene.position);
        scene.add(camera);
        scene.background = new THREE.Color(0x000000);
        let gridHelper = new THREE.GridHelper(2000, 50, 0xe5e6e8, 0x444444);
        scene.add(gridHelper);
        let controls = new OrbitControls(camera, domElement);
        controls.rotateSpeed = 1.0;
        controls.zoomSpeed = 0.8;
        controls.panSpeed = 0.8;
        controls.keys = [65, 83, 68];
        scene.orbitControls = controls;

        let mcRenderer = new THREE.WebGLRenderer({ antialias: true });
        const {left, right, top, bottom, width, height} =
            this.modelContainerDom.getBoundingClientRect();
        mcRenderer.setPixelRatio(window.devicePixelRatio);
        mcRenderer.setSize(width - 2, height - 2);
        domElement.appendChild(mcRenderer.domElement);

        this.modelScene = scene;
        this.modelCamera = camera;
        this.modelControls = controls;

        let renderModelScene = () => {
            controls.update();
            mcRenderer.render(scene, camera);
        };
        scene.render = renderModelScene;
        return scene;
    }

    __makeDrawingScene() {
        let domElement = this.drawingContainerDom;
        let scene = new THREE.Scene();
        let aspect = domElement.offsetWidth / domElement.offsetHeight;
        let viewSize = 50;
        let camera = new THREE.OrthographicCamera(-viewSize * aspect, viewSize * aspect,
            viewSize, -viewSize, -1000, 10000);
        camera.zoom = 0.1;
        camera.updateProjectionMatrix();
        camera.frustumCulled = false;
        camera.position.set(500, 500, 500); // I don't know why this works
        camera.lookAt(scene.position);
        scene.add(camera);
        scene.background = new THREE.Color(0x000000);
        let gridHelper = new THREE.GridHelper(2000, 50, 0xe5e6e8, 0x444444);
        scene.add(gridHelper);
        let controls = new OrbitControls(camera, domElement);
        controls.rotateSpeed = 1.0;
        controls.zoomSpeed = 0.8;
        controls.panSpeed = 0.8;
        controls.keys = [65, 83, 68];
        scene.orbitControls = controls;

        let dRenderer = new THREE.WebGLRenderer({ antialias: true });
        const {left, right, top, bottom, width, height} =
            this.drawingContainerDom.getBoundingClientRect();
        dRenderer.setPixelRatio(window.devicePixelRatio);
        dRenderer.setSize(width - 2, height - 2);
        domElement.appendChild(dRenderer.domElement);

        this.drawingScene = scene;
        this.drawingCamera = camera;
        this.drawingControls = controls;

        let renderDrawingScene = () => {
            controls.update();
            dRenderer.render(scene, camera);
        };
        scene.render = renderDrawingScene;
        return scene;
    }
}

const main = () => {
    const ma = new ModelAnalyzer();
    console.log(ma);
    let animate = () => {
        let maxFramerate = 20;
        setTimeout(() => {
            requestAnimationFrame(animate);
        }, 1000 / maxFramerate);
        ma.modelScene.render();
    };
    ma.drawingScene.render();
    animate();
};

main();

