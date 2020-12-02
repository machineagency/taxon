'use strict';

import * as THREE from './build/three.module.js';
import { TestPrograms } from './TestPrograms.js';
import { STLLoader } from './build/STLLoader.js';

class StrangeGui {

    static serverURL = 'http://localhost:3000';


    constructor(strangeScene, kinematics) {
        if (strangeScene === undefined || kinematics === undefined) {
            console.error('Need strangeScene and kinematics to inflate the GUI');
        }
        this.strangeScene = strangeScene;
        this.kinematics = kinematics;
        this.tooltips = [];
        this.modelContainerDom = document.getElementById('model-container');
        this.renderModelPane = this.__inflateModelContainerDom();
        this.makeLoadStlPromise('./pikachu.stl');
        this.renderModelPane();
        this.fetchAndRenderMachineNames();
    }

    addTooltipForComponent(component) {
        let newTooltip = new Tooltip(component, this);
        this.tooltips.push(newTooltip);
        return newTooltip;
    }

    removeTooltipForComponent(component) {
        // TODO
    }

    __addToScene(threeObj) {
        this.strangeScene.addSceneObjectDirectly(threeObj);
    }

    __removeFromScene(threeObj) {
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

    drawKinematicPathToSceneForComponent(component) {
        let arrowColor = 0x000000;
        let maybeNode = this.kinematics.findNodeWithBlockName(component.name);
        if (maybeNode === undefined) {
            return;
        }
        let pathsList = this.kinematics.pathsFromNodeToLeaves(maybeNode);
        let pathsPositionsList = pathsList.map((path) => {
            return path.map(node => node.block.position);
        });
        let arrowChains = pathsPositionsList.map((pathPositions) => {
            return pathPositions.map((_, positionIdx) => {
                let basePos = pathPositions[positionIdx];
                if (positionIdx < pathPositions.length - 1) {
                    let endPos = pathPositions[positionIdx + 1];
                    let difference = endPos.clone().sub(basePos);
                    let length = difference.clone().length();
                    let dir = difference.clone().normalize();
                    let arrow = new THREE.ArrowHelper(dir, basePos, length,
                                        arrowColor);
                    return arrow;
                }
            });
        });
        let chainGroups = arrowChains.map((arrowChain) => {
            let group = new THREE.Group();
            console.log(arrowChain);
            arrowChain.forEach((arrow) => {
                if (arrow !== undefined) {
                    group.add(arrow);
                }
            });
            return group;
        });
        chainGroups.forEach((group) => {
            strangeScene.addSceneObjectDirectly(group);
        });
    }

    fetchAndRenderMachineNames() {
        const url = StrangeGui.serverURL + '/machines';
        fetch(url, {
            method: 'GET'
        })
        .then((response) => {
            if (response.ok) {
                response.json()
                .then((responseJson) => {
                    let machineList = responseJson.machines;
                    let machineNames = machineList.map(m => m.name);
                    let machineIds = machineList.map(m => m._id);
                    let mListDom = document.getElementById('load-machine-list');
                    mListDom.innerHTML = '';
                    machineNames.forEach((mName, idx) => {
                        let mLi = document.createElement('li');
                        mLi.innerText = mName;
                        mLi.setAttribute('data-server-id', machineIds[idx]);
                        mLi.onclick = () => {
                            window.strangeGui
                                .loadMachineFromListItemDom(mLi, event);
                        };
                        mListDom.appendChild(mLi);
                    });
                });
            }
        });
    }

    async saveGCToServer() {
        // TODO: static check that the machine compiles/is well-formed
        let gcDom = document.getElementById('gc-container-1');
        let gcText = gcDom.innerText;
        let url = StrangeGui.serverURL + '/machine';
        let postMachineRes = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: gcText
        });
        if (postMachineRes.ok) {
            this.fetchAndRenderMachineNames();
            let nmbbId = 'new-machine-button-bar';
            let newMachineButtonBar = document.getElementById(nmbbId);
            newMachineButtonBar.classList.add('hidden');
            gcDom.classList.remove('red-border');
            gcDom.innerHTML = '';
        }
    }

    async deleteGCFromServer() {
        let gcDom = document.getElementById('gc-container-1');
        let gcText = gcDom.innerText;
        let gcJson = JSON.parse(gcText);
        let gcId = gcJson._id;
        let gcName = gcJson.name;
        let userConfirmed = confirm(`Delete ${gcName}?`);
        if (!userConfirmed) {
            return;
        }
        let url = StrangeGui.serverURL + `/machine?id=${gcId}`;
        let deleteRes = await fetch(url, {
            method: 'DELETE'
        });
        if (deleteRes.ok) {
            this.fetchAndRenderMachineNames();
            let nmbbId = 'new-machine-button-bar';
            let newMachineButtonBar = document.getElementById(nmbbId);
            newMachineButtonBar.classList.add('hidden');
            gcDom.classList.remove('red-border');
            gcDom.innerHTML = '';
        }
    }

    decompileGCText() {
        let gcDom = document.getElementById('gc-container-1');
        let gcText = gcDom.innerText;
        let machine = window.compiler
            .decompileIntoScene(window.strangeScene, gcText);
        window.kinematics.reinitializeForMachine(machine);
    }

    setGCToNew() {
        let highlightClassName = 'current-machine-highlight';
        let gcDom = document.getElementById('gc-container-1');
        gcDom.innerText = TestPrograms.newMachine;
        let oldHighlightedListItemDom = document
            .getElementsByClassName(highlightClassName)[0];
        if (oldHighlightedListItemDom !== undefined) {
            oldHighlightedListItemDom.classList.remove(highlightClassName);
        }
        let nmbbId = 'new-machine-button-bar';
        let newMachineButtonBar = document.getElementById(nmbbId);
        gcDom.setAttribute('contenteditable', true);
        gcDom.classList.add('red-border');
        newMachineButtonBar.classList.remove('hidden');
        this.__inflateSceneFromGCText(false);
    }

    async loadMachineFromListItemDom(listItemDom, event) {
        // TODO: use ids not names for machine identifiers
        let machineName = listItemDom.innerText.toLowerCase();
        let machineId = listItemDom.dataset.serverId;
        let url = StrangeGui.serverURL + `/machine?id=${machineId}`;
        let response = await fetch(url, {
            method: 'GET'
        });
        let newText;
        if (response.ok) {
            let outerJson = await response.json();
            let machineJson = outerJson.machine[0];
            let indentSpaces = 2
            newText = JSON.stringify(machineJson, undefined, indentSpaces);
        }
        else {
            console.error('Could not find machine.');
            return;
        }

        // CASE: shift click to load or clear machine preview
        if (event.shiftKey) {
            let highlightPreviewClassName = 'preview-machine-highlight';
            let oldHighlightedListItemDom = document
                .getElementsByClassName(highlightPreviewClassName)[0];
            // CASE: click on existing preview removes it
            if (oldHighlightedListItemDom === listItemDom) {
                oldHighlightedListItemDom.classList
                    .remove(highlightPreviewClassName);
                window.strangeScene.previewMachine.clearMachineFromScene();
            }
            // CASE: click on new machine as preview (including curr machine)
            else {
                listItemDom.classList.add(highlightPreviewClassName);
                if (oldHighlightedListItemDom !== undefined) {
                    oldHighlightedListItemDom.classList
                        .remove(highlightPreviewClassName);
                }
                this.__inflateAsPreview(newText);
            }
        }
        // CASE: bare click swaps current machine
        else {
            let highlightClassName = 'current-machine-highlight';
            let gcDom = document.getElementById('gc-container-1');
            gcDom.innerText = newText;
            let oldHighlightedListItemDom = document
                .getElementsByClassName(highlightClassName)[0];
            if (oldHighlightedListItemDom !== undefined) {
                oldHighlightedListItemDom.classList.remove(highlightClassName);
            }
            listItemDom.classList.add(highlightClassName);
            gcDom.setAttribute('contenteditable', false);
            gcDom.classList.remove('red-border');
            let nmbbId = 'new-machine-button-bar';
            let newMachineButtonBar = document.getElementById(nmbbId);
            newMachineButtonBar.classList.add('hidden');
            this.__inflateSceneFromGCText(true);
        }
    }

    __inflateAsPreview(newText) {
        window.compiler.decompileAsPreview(window.strangeScene, newText);
    }

    __inflateSceneFromGCText(inflateWithKinematics) {
        let gcDom = document.getElementById('gc-container-1');
        let gcText = gcDom.innerText;
        let newMachine = window.compiler.decompileIntoScene(window
            .strangeScene,
            gcText);
        if (inflateWithKinematics) {
            window.kinematics.reinitializeForMachine(newMachine);
        }
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

