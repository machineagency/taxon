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
        this.jobLogDom = document.getElementById('job-log');
        this.modelCheckDom = document.getElementById('model-check-container');
        this.filterDom = document.getElementById('filter-container');
        this.filterDom.onkeypress = (event) => {
            if (event.keyCode === 13) {
                try {
                    event.preventDefault();
                    this.fetchAndRenderMachineNames();
                }
                catch (e) {
                    // TODO: handle bad constraints
                }
            }
        };
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

    writeMessageToModelCheck(stringToWrite) {
        this.modelCheckDom.innerText = stringToWrite;
    }

    writeMessageToJobLog(stringToWrite) {
        this.jobLogDom.innerText = stringToWrite;
        this.jobLogDom.classList.remove('red-border');
        this.jobLogDom.classList.remove('red-text');
    }

    writeErrorToJobLog(stringToWrite) {
        this.jobLogDom.innerText = stringToWrite;
        this.jobLogDom.classList.add('red-border');
        this.jobLogDom.classList.add('red-text');
    }

    clearJobLog() {
        this.jobLogDom.innerText = 'No messages yet.';
        this.jobLogDom.classList.remove('red-border');
        this.jobLogDom.classList.remove('red-text');
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

    buildFetchMachineUrl() {
        const encodeParams = (paramObj) => {
            return Object.entries(paramObj).map((kv) => {
                return kv.map(encodeURIComponent).join("=");
            }).join("&");
        }
        const baseUrl = StrangeGui.serverURL + '/machines';
        const urlParams = {};
        const filterText = this.filterDom.innerText;
        const filterStrings = filterText.split(',')
                                .map(fString => fString.trim())
                                .filter(fString => fString.length > 0);
        filterStrings.forEach((fString, idx) => {
            urlParams[`param${idx}`] = filterStrings[idx];
        });
        return baseUrl + '?' + encodeParams(urlParams);
    }

    fetchAndRenderMachineNames() {
        let url = this.buildFetchMachineUrl();
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
            else {
                const errorHighlightLengthMS = 2000;
                this.filterDom.classList.add('red-border');
                setTimeout(() => {
                    this.filterDom.classList.remove('red-border');
                }, errorHighlightLengthMS);
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

    uploadModel(modelFile) {
        let modelURL = URL.createObjectURL(modelFile);
        this.strangeScene.loadStl(modelURL)
        .then((_) => {
            this.fetchAndRenderMachineNames();
        });
    }

    async uploadNewMachine(machineFile) {
        let fileReader = new FileReader();
        fileReader.addEventListener('load', async (event) => {
            let fileText = event.target.result;
            let url = StrangeGui.serverURL + '/machine';
            let postMachineRes = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json;charset=utf-8'
                },
                body: fileText
            });
            if (postMachineRes.ok) {
                this.fetchAndRenderMachineNames();
            }
            else {
                console.error(postMachineRes.statusText);
            }
        });
        fileReader.readAsText(machineFile);
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

    async loadRotForSceneMachine() {
        let rotDom = document.getElementById('rot-container');
        let machineDbId = window.strangeScene.machine.dbId;
        console.assert(machineDbId !== undefined);
        let url = StrangeGui.serverURL + `/rot?id=${machineDbId}`;
        let response = await fetch(url, {
            method: 'GET'
        });
        let rotText;
        if (response.ok) {
            let outerJson = await response.json();
            let rotJson = outerJson.rot[0];
            let indentSpaces = 2
            rotText = JSON.stringify(rotJson, undefined, indentSpaces);
        }
        else {
            console.error('Could not find RoT.');
            return;
        }
        rotDom.innerText = rotText;
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

        // Gather DOM elements for click logic
        let highlightPreviewClassName = 'preview-machine-highlight';
        let highlightClassName = 'current-machine-highlight';
        let oldHighlightedPreviewListItemDom = document
            .getElementsByClassName(highlightPreviewClassName)[0];
        let gcDom = document.getElementById('gc-container-1');
        let oldHighlightedListItemDom = document
            .getElementsByClassName(highlightClassName)[0];

        // CASE: shift click to load or clear machine preview
        if (event.shiftKey) {
            // CASE: click on existing preview removes it. This means we need
            // to re-render the current machine in original colors
            if (oldHighlightedPreviewListItemDom === listItemDom) {
                oldHighlightedPreviewListItemDom.classList
                    .remove(highlightPreviewClassName);
                window.strangeScene.previewMachine.clearMachineFromScene();
                window.strangeScene.machine.clearMachineFromScene();
                this.__inflateSceneFromGCText(true);
            }
            // CASE: click on new machine as preview (including curr machine)
            // Load the preview machine in green and destructively recolor
            // the current machine in red
            else {
                listItemDom.classList.add(highlightPreviewClassName);
                if (oldHighlightedPreviewListItemDom !== undefined) {
                    oldHighlightedPreviewListItemDom.classList
                        .remove(highlightPreviewClassName);
                }
                this.__inflateAsPreview(newText, 'green');
                window.strangeScene.machine
                      .recolorAndMoveMachineForPreviewing('red');
            }
        }
        // CASE: bare click swaps current machine and removes preview
        else {
            gcDom.innerText = newText;
            if (oldHighlightedListItemDom !== undefined) {
                oldHighlightedListItemDom.classList.remove(highlightClassName);
            }
            listItemDom.classList.add(highlightClassName);
            gcDom.setAttribute('contenteditable', false);
            gcDom.classList.remove('red-border');
            this.__inflateSceneFromGCText(true);
            this.strangeScene.positionModelOnWorkEnvelope();
            this.loadRotForSceneMachine();

            if (window.strangeScene.previewMachine !== undefined) {
                oldHighlightedPreviewListItemDom.classList
                    .remove(highlightPreviewClassName);
                window.strangeScene.previewMachine.clearMachineFromScene();
            }
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

