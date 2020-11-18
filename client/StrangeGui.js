'use strict';

import * as THREE from './build/three.module.js';
import { TestPrograms } from './TestPrograms.js';
import { STLLoader } from './build/STLLoader.js';

class StrangeGui {

    constructor(kinematics) {
        if (kinematics === undefined) {
            console.error('Need kinematics to inflate the GUI');
        }
        this.kinematics = kinematics;
        this.modelContainerDom = document.getElementById('model-container');
        this.renderModelPane = this.__inflateModelContainerDom();
        this.makeLoadStlPromise('./pikachu.stl');
        this.renderModelPane();
    }

    __inflateModelContainerDom() {
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
        // scene.controlMode = 'translate';
        // let controls = new THREE.OrbitControls(camera, domElement);
        // scene.orbitControls = controls;

        let mcRenderer = new THREE.WebGLRenderer({ antialias: true });
        const {left, right, top, bottom, width, height} =
            this.modelContainerDom.getBoundingClientRect();
        mcRenderer.setPixelRatio(window.devicePixelRatio);
        mcRenderer.setSize(width - 2, height - 2);
        domElement.appendChild(mcRenderer.domElement);

        this.modelScene = scene;
        this.modelCamera = camera;

        let renderModelPane = () => {
            mcRenderer.render(scene, camera);
        };
        return renderModelPane;
    }

    loadMachineFromListItemDom(listItemDom) {
        // TODO: use ids not names for machine identifiers
        let highlightClassName = 'current-machine-highlight';
        let gcDom = document.getElementById('gc-container-1');
        let machineName = listItemDom.innerText.toLowerCase();
        let newText;
        if (machineName === 'axidraw') {
            newText = TestPrograms.axidrawMachine;
        }
        if (machineName === 'prusa') {
            newText = TestPrograms.prusaMachine;
        }
        if (machineName === '(new machine)') {
            newText = TestPrograms.newMachine;
        }
        gcDom.innerText = newText;
        let oldHighlightedListItemDom = document
            .getElementsByClassName(highlightClassName)[0];
        oldHighlightedListItemDom.classList.remove(highlightClassName);
        listItemDom.classList.add(highlightClassName);
        this.__inflateSceneFromGCText();
    }

    __inflateSceneFromGCText() {
        let gcDom = document.getElementById('gc-container-1');
        let gcText = gcDom.innerText;
        window.strangeScene.machine.clearMachineFromScene();
        window.compiler.decompileIntoScene(window.strangeScene,
            gcText);
    }

    makeLoadStlPromise = (filepath) => {
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
                this.modelScene.add(stlMesh);
                this.renderModelPane();
                resolve(stlMesh);
            }, undefined, (errorMsg) => {
                console.log(errorMsg);
            });
        });
        return loadPromise;
    };
}

export { StrangeGui };

