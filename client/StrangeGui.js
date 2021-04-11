'use strict';

import * as THREE from './build/three.module.js';
import { Workflow } from './Workflow.js';
import { MetricsCompiler } from './Metrics.js';
import { PartsCompiler } from './Parts.js';
import { TestPrograms } from './TestPrograms.js';
import { STLLoader } from './build/STLLoader.js';

class StrangeGui {

    static serverURL = 'http://localhost:3000';


    constructor(strangeScene) {
        this.strangeScene = strangeScene;
        this.tooltips = [];
        this.heuristicNames = [];
        this.fetchHeuristicNames();
        this.gcDom = document.getElementById('gc-container-1');
        this.programPadDom = document.getElementById('program-pad');
        this.jobPad = document.getElementById('job-pad')
        this.modelContainerDom = document.getElementById('model-container');
        this.jobLogDom = document.getElementById('job-log');
        this.modelCheckDom = document.getElementById('model-check-container');
        this.autocompleteDom = document.getElementById('filter-autocomplete');
        this.machineValueDom = document.getElementById('machine-value');
        this.modelValueDom = document.getElementById('model-value');
        this.materialValueDom = document.getElementById('material-value');
        this.filterDom = document.getElementById('filter-container');
        this.metricsProgramListDom = document.getElementById('metrics-list');
        this.metricsProgramDom = document.getElementById('metrics-container');
        this.partsProgramListDom = document.getElementById('parts-list');
        this.partsProgramDom = document.getElementById('parts-container');
        this.workflowListDom = document.getElementById('workflow-list');
        this.workflowDom = document.getElementById('workflow-container');
        this.consoleDom = document.getElementById('workflow-console');
        this.rotListDom = document.getElementById('rot-container');
        this.modalDom = document.getElementById('modal-container');
        this.modalDom.addEventListener('click', (event) => {
            this.hideModal();
        });
        this.workflowDom.addEventListener('input', (event) => {
            this.workflow.grayStepButton();
        });
        this.filterDom.addEventListener('keydown', (event) => {
            if (event.keyCode === 13) {
                // Enter
                try {
                    event.preventDefault();
                    this.fetchAndRenderMachineNames();
                }
                catch (e) {
                    // TODO: handle bad constraints
                }
            }
            else if (event.keyCode === 27 || event.keyCode === 32) {
                // Escape
                this.autocompleteDom.classList.add('hidden');
            }
            else if (event.keyCode === 9) {
                // Tab
                event.preventDefault();
                let acHighlightDom = document.getElementById('ac-highlight');
                if (acHighlightDom === null) {
                    let maybeFirstChild = this.autocompleteDom.childNodes[0];
                    if (maybeFirstChild !== undefined) {
                        maybeFirstChild.id = 'ac-highlight';
                        this.filterDom.dataset.origText = this.filterDom.innerText;
                        this.filterDom.innerText = maybeFirstChild.innerText;
                    }
                }
                else {
                    let maybeNextSibling = acHighlightDom.nextSibling;
                    if (maybeNextSibling !== null) {
                        acHighlightDom.id = '';
                        maybeNextSibling.id = 'ac-highlight';
                        this.filterDom.innerText = maybeNextSibling.innerText;
                    }
                    else {
                        acHighlightDom.id = '';
                        this.filterDom.innerText = this.filterDom.dataset.origText;
                    }
                }
            }
            else if (event.keyCode >= 65 && event.keyCode <= 90) {
                this.runAutoComplete();
            }
        });
        this.workflow = new Workflow(this);
        this.fetchAndRenderMachineNames();
        this.fetchAndRenderWorkflowNames();
        this.fetchAndRenderRotNames();
        this.gcDom.addEventListener('dblclick', (event) => {
            let programPadClicked = this.programPadDom.contains(event.target);
            let jobPadClicked = this.programPadDom.contains(event.target);
            if (!programPadClicked && !jobPadClicked) {
                let cObjs = this.strangeScene.getClickedObjectsFromClickEvent(event);
                let primaryName = cObjs[0];
                if (event.shiftKey) {
                    this.workflow.addLine(primaryName);
                }
                else {
                    this.scrollProgramToBlockName(primaryName);
                }
            }
        }, false);
    }

    get kinematics() {
        return this.strangeScene.machine.kinematics;
    }

    async fetchHeuristicNames() {
        let url = StrangeGui.serverURL + '/heuristicNames';
        fetch(url, {
            method: 'GET'
        })
        .then((response) => {
            if (response.ok) {
                response.json()
                .then((responseJson) => {
                    this.heuristicNames = responseJson.heuristicNames;
                });
            }
        });
    }

    showModal() {
        this.modalDom.classList.remove('hidden');
    }

    hideModal() {
        this.modalDom.classList.add('hidden');
    }

    async runAutoComplete() {
        // TODO: lots of stuff
        const filterText = this.filterDom.innerText.trim();
        this.autocompleteDom.classList.remove('hidden');
        this.autocompleteDom.innerHTML = '';
        this.heuristicNames.forEach((name, idx) => {
            let nameLower = name.toLowerCase();
            let filterLower = filterText.toLowerCase();
            if (nameLower.includes(filterLower)) {
                let node = document.createElement('div');
                node.innerText = name;
                this.autocompleteDom.appendChild(node);
            }
        });
    }

    setConsoleErrorColor() {
        this.consoleDom.classList.add('red-border');
        this.consoleDom.classList.add('red-text');
    }

    removeConsoleErrorColor() {
        this.consoleDom.classList.remove('red-border');
        this.consoleDom.classList.remove('red-text');
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

    scrollProgramToBlockName(blockName) {
        const delay = 3000;
        this.gcDom.childNodes.forEach((el, idx) => {
            let nameLine = `\"name\": \"${blockName}\"`;
            if (el.innerText.includes(nameLine)) {
                let priorNode = this.gcDom.childNodes[idx - 1];
                priorNode.scrollIntoView({ behavior: 'smooth' });
                el.id = 'gc-highlight';
                setTimeout(() => {
                    el.id = '';
                }, delay);
            }
        });
    }

    loadTextIntoDomForResource(text, resourceName) {
        let textDom;
        if (resourceName === 'machines') {
            textDom = this.gcDom;
        }
        else if (resourceName === 'metricsPrograms') {
            textDom = this.metricsProgramDom;
        }
        else if (resourceName === 'partsPrograms') {
            textDom = this.partsProgramDom;
        }
        else if (resourceName === 'workflows') {
            textDom = this.workflowDom;
        }
        textDom.innerHTML = '';
        let lines = text.split('\n');
        lines.forEach((lineText, lineNum) => {
            let node = document.createElement('div');
            node.innerText = lineText;
            // FIXME: won't work if there is a newline after "name"
            if (resourceName === 'machines' && lineText.includes('"name"')) {
                let blockName = lineText.split(':')[1]
                                    .replace('"', '')
                                    .replace('"', '')
                                    .replace(',', '')
                                    .trim();
                node.addEventListener('dblclick', (event) => {
                    let blockMeshGroup = this.strangeScene.machine
                                            .findBlockWithName(blockName)
                                            .meshGroup;
                    blockMeshGroup.children.forEach((maybeMesh) => {
                        const delay = 3000;
                        if (maybeMesh.material === undefined) {
                            return;
                        }
                        let origHex = maybeMesh.material.color.getHex();
                        let origOpacity = maybeMesh.material.opacity;
                        maybeMesh.material.color.setHex(0x2ecc71);
                        maybeMesh.material.opacity = 0.75;
                        setTimeout(() => {
                            maybeMesh.material.color.setHex(origHex);
                            maybeMesh.material.opacity = origOpacity;
                        }, delay);
                    });
                }, false);
            }
            textDom.appendChild(node);
        });
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

    buildFetchUrl(resourceName, urlParams = {}) {
        console.assert(resourceName === 'machines'
                    || resourceName === 'workflows'
                    || resourceName === 'rots'
                    || resourceName === 'partsPrograms'
                    || resourceName === 'metricsPrograms');
        const encodeParams = (paramObj) => {
            return Object.entries(paramObj).map((kv) => {
                return kv.map(encodeURIComponent).join("=");
            }).join("&");
        }
        const baseUrl = StrangeGui.serverURL + '/' + resourceName;
        return baseUrl + '?' + encodeParams(urlParams);
    }

    // TODO: make the following 3 functions one function

    fetchAndRenderMachineNames() {
        let url = this.buildFetchUrl('machines');
        fetch(url, {
            method: 'GET'
        })
        .then((response) => {
            if (response.ok) {
                response.json()
                .then((responseJson) => {
                    let machineList = responseJson.results;
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
                                .loadResourceFromListItemDom('machines', mLi, event);
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

    fetchAndRenderWorkflowNames() {
        let url = this.buildFetchUrl('workflows');
        fetch(url, {
            method: 'GET'
        })
        .then((response) => {
            if (response.ok) {
                response.json()
                .then((responseJson) => {
                    let workflowList = responseJson.results;
                    let workflowNames = workflowList.map(m => m.name);
                    let workflowIds = workflowList.map(m => m._id);
                    this.workflowListDom.innerHTML = '';
                    workflowNames.forEach((mName, idx) => {
                        let mLi = document.createElement('li');
                        mLi.innerText = mName;
                        mLi.setAttribute('data-server-id', workflowIds[idx]);
                        mLi.onclick = () => {
                            window.strangeGui
                                .loadResourceFromListItemDom('workflows', mLi, event);
                        };
                        this.workflowListDom.appendChild(mLi);
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

    fetchAndRenderRotNames() {
        let url = this.buildFetchUrl('rots');
        fetch(url, {
            method: 'GET'
        })
        .then((response) => {
            if (response.ok) {
                response.json()
                .then((responseJson) => {
                    // Why don't you just iterate over rots agh
                    let rotList = responseJson.results;
                    let rotNames = rotList.map(r => r.name);
                    let rotDescs = rotList.map(r => r.description);
                    let rotTypes = rotList.map(r => r.type);
                    let rotCodes = rotList.map(r => r.code);
                    let rotIds = rotList.map(r => r._id);
                    let rotIsDependents = rotList.map(r => r.isDependent);
                    this.rotListDom.innerHTML = '';
                    rotNames.forEach((mName, idx) => {
                        let rotDiv = document.createElement('div');
                        rotDiv.classList.add('rot-item');
                        rotDiv.setAttribute('data-server-id', rotIds[idx]);
                        rotDiv.setAttribute('data-rot-type', rotTypes[idx]);
                        this.rotListDom.appendChild(rotDiv);
                        let checkbox = document.createElement('input');
                        checkbox.type = 'checkbox';
                        checkbox.addEventListener('change', (event) => {
                            if (rotTypes[idx] === 'filtering') {
                                this.updateRotFilters();
                            }
                            else if (rotTypes[idx] === 'action') {
                                this.updateRotActions();
                            }
                        });
                        rotDiv.appendChild(checkbox);
                        let descDiv = document.createElement('div');
                        let prefix = rotTypes[idx] === 'filtering'
                                        ? '(f) '
                                        : '(a) ';
                        descDiv.classList.add('rot-description');
                        descDiv.innerText = prefix + rotDescs[idx];
                        rotDiv.appendChild(descDiv);
                        if (rotIsDependents[idx]) {
                            const defaultVal = '[0, 0, 0]';
                            let depValDiv = document.createElement('div');
                            depValDiv.setAttribute('contenteditable', true);
                            depValDiv.classList.add('dep-val-box');
                            depValDiv.innerText = defaultVal;
                            depValDiv.addEventListener('keypress', (event) => {
                                if (event.code === 'Enter') {
                                    this.updateRotFilters();
                                }
                            });
                            rotDiv.appendChild(depValDiv);
                        }
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

    updateRotFilters() {
        let urlParams = {};
        let depVals = [];
        let checkedFilteringRoTIds = [];
        Array.from(this.rotListDom.children)
            .filter(rDom => {
                return rDom.children[0].checked
                        && rDom.dataset.rotType === 'filtering';
            })
            .forEach((rDom) => {
                let rotServerId = rDom.dataset.serverId;
                checkedFilteringRoTIds.push(rotServerId);
                let maybeDepValDom = Array.from(rDom.children)
                                    .find(c => c.className === 'dep-val-box');
                if (maybeDepValDom) {
                    urlParams[rotServerId] = maybeDepValDom.innerText.trim();
                }
            });
        urlParams['rotIds'] = checkedFilteringRoTIds;
        let url = this.buildFetchUrl('machines', urlParams);
        fetch(url, {
            method: 'GET'
        })
        .then((response) => {
            response.json()
            .then((responseJson) => {
                let machineList = responseJson.results;
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
                            .loadResourceFromListItemDom('machines', mLi, event);
                    };
                    mListDom.appendChild(mLi);
                });
            });
        })
        .catch((error) => {
            console.error(error);
        });
    }

    updateRotActions() {
        let checkedActionRoTIds = Array.from(this.rotListDom.children)
            .filter(rDom => {
                return rDom.children[0].checked
                        && rDom.dataset.rotType === 'action';
            })
            .map(rDom => rDom.dataset.serverId);
        let url = this.buildFetchUrl('rots', { 'ids' : checkedActionRoTIds });
        fetch(url, {
            method: 'GET'
        })
        .then((response) => {
            if (response.ok) {
                response.json()
                .then((responseJson) => {
                    let rotList = responseJson.results;
                    let rotCodes = rotList.map(rot => rot.code);
                    this.workflow.setActionRotCodes(rotCodes);
                })
            }
            else {
                throw response.statusText;
            }
        })
        .catch((error) => {
            console.error(error);
        });
    }

    fetchAndRenderPartsNames() {
        let url = this.buildFetchUrl('partsPrograms');
        fetch(url, {
            method: 'GET'
        })
        .then((response) => {
            if (response.ok) {
                response.json()
                .then((responseJson) => {
                    let partsProgramList = responseJson.results;
                    let partsProgramNames = partsProgramList.map(m => m.name);
                    let partsProgramIds = partsProgramList.map(m => m._id);
                    this.partsProgramListDom.innerHTML = '';
                    partsProgramNames.forEach((mName, idx) => {
                        let mLi = document.createElement('li');
                        mLi.innerText = mName;
                        mLi.setAttribute('data-server-id', partsProgramIds[idx]);
                        mLi.onclick = () => {
                            window.strangeGui
                                .loadResourceFromListItemDom('partsPrograms', mLi, event);
                        };
                        this.partsProgramListDom.appendChild(mLi);
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
        let machine = window.strangeScene.compiler
            .decompileIntoScene(window.strangeScene, gcText);
        window.kinematics.reinitializeForMachine(machine);
    }

    uploadModel(modelFile) {
        this.modelValueDom.innerText = modelFile.name;
        let modelURL = URL.createObjectURL(modelFile);
        this.strangeScene.loadModel(modelURL)
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

    async loadHeuristicSetForSceneMachine() {
        let heuristicSetDom = document.getElementById('heuristic-set-container');
        let machineDbId = window.strangeScene.machine.dbId;
        console.assert(machineDbId !== undefined);
        let url = StrangeGui.serverURL + `/heuristicSet?id=${machineDbId}`;
        let response = await fetch(url, {
            method: 'GET'
        });
        let heuristicSetText;
        if (response.ok) {
            let outerJson = await response.json();
            let heuristicSetJson = outerJson.heuristicSet[0];
            let indentSpaces = 2
            heuristicSetText = JSON.stringify(heuristicSetJson, undefined, indentSpaces);
        }
        else {
            console.error('Could not find RoT.');
            return;
        }
        heuristicSetDom.innerText = heuristicSetText;
    }

    async loadResourceFromListItemDom(resourceName, listItemDom, event) {
        console.assert(resourceName === 'machines'
                    || resourceName === 'workflows'
                    || resourceName === 'partsPrograms'
                    || resourceName === 'metricsPrograms');
        let itemName = listItemDom.innerText.toLowerCase();
        let itemId = listItemDom.dataset.serverId;
        let url = StrangeGui.serverURL + `/${resourceName}?id=${itemId}`;
        let response = await fetch(url, {
            method: 'GET'
        });
        let newText;
        if (response.ok) {
            let outerJson = await response.json();
            let resultsJson = outerJson.results[0];
            let indentSpaces = 2
            if (resourceName === 'workflows') {
                newText = resultsJson.actions.join('\n');
            }
            else {
                newText = JSON.stringify(resultsJson, undefined, indentSpaces);
            }
        }
        else {
            console.error('Could not find machine.');
            return;
        }

        // Remove old machine or PA from scene
        if (resourceName === 'machines' && this.strangeScene.machine) {
            this.strangeScene.removeMaterialMarks();
            this.strangeScene.removeMaterials();
            this.strangeScene.metrics.clearFromScene();
            this.strangeScene.machine.clearMachineFromScene();
        }

        // Load new one
        if (resourceName === 'machines') {
            this.__modifyGUIForMachineListClick(event, newText, listItemDom);
            this.updateRotActions();
        }
        else if (resourceName === 'workflows') {
            this.__modifyGUIForWorkflowListClick(event, newText, listItemDom);
        }
        else if (resourceName === 'partsPrograms') {
            this.__modifyGUIForPartsListClick(event, newText, listItemDom);
        }
    }

    __modifyGUIForMachineListClick(event, newText, listItemDom) {
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
            this.loadTextIntoDomForResource(newText, 'machines');
            if (oldHighlightedListItemDom !== undefined) {
                oldHighlightedListItemDom.classList.remove(highlightClassName);
            }
            listItemDom.classList.add(highlightClassName);
            gcDom.setAttribute('contenteditable', false);
            gcDom.classList.remove('red-border');
            this.__inflateSceneFromGCText(true);
            this.strangeScene.positionModelOnWorkEnvelope();

            if (window.strangeScene.previewMachine !== undefined) {
                oldHighlightedPreviewListItemDom.classList
                    .remove(highlightPreviewClassName);
                window.strangeScene.previewMachine.clearMachineFromScene();
            }

            if (this.jobPad.classList.contains('hidden')) {
                this.jobPad.classList.remove('hidden');
            }
            this.machineValueDom.innerText = window.strangeScene.machine.name;
        }
    }

    __modifyGUIForWorkflowListClick(event, newText, listItemDom) {
        // Load text
        this.loadTextIntoDomForResource(newText, 'workflows');
    }

    __modifyGUIForPartsListClick(event, newText, listItemDom) {
        // Gather DOM elements for click logic
        let highlightPreviewClassName = 'preview-machine-highlight';
        let highlightClassName = 'current-machine-highlight';
        let oldHighlightedPreviewListItemDom = document
            .getElementsByClassName(highlightPreviewClassName)[0];
        let gcDom = document.getElementById('gc-container-1');
        let oldHighlightedListItemDom = document
            .getElementsByClassName(highlightClassName)[0];

        // UI edits
        if (oldHighlightedListItemDom !== undefined) {
            oldHighlightedListItemDom.classList.remove(highlightClassName);
        }
        listItemDom.classList.add(highlightClassName);
        gcDom.setAttribute('contenteditable', false);
        gcDom.classList.remove('red-border');

        // Load text and inflate parts
        this.loadTextIntoDomForResource(newText, 'partsPrograms');
        let partsCompiler = new PartsCompiler();
        let partsObj = partsCompiler.compile(newText);
        // this.__inflateSceneFromGCText(true);
        // this.strangeScene.positionModelOnWorkEnvelope();

    }

    __inflateAsPreview(newText) {
        window.compiler.decompileAsPreview(window.strangeScene, newText);
    }

    __inflateSceneFromGCText() {
        let gcDom = document.getElementById('gc-container-1');
        let gcText = gcDom.innerText;
        let newMachine = window.strangeScene.
            compiler.decompileIntoScene(window
            .strangeScene,
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

