'use strict';

import { Slicer } from './Slicer.js';
import { Material } from './Material.js';

class Workflow {

    static EndFunctionName = 'END_FUNCTION';

    constructor(parentGui) {
        this.parentGui = parentGui;
        this.dom = document.getElementById('workflow-container');
        this.stepButtonDom = document.getElementById('step-button');
        this.consoleDom = document.getElementById('workflow-console');
        // this.injectTestProgTextNodes();
        this.progCurrFn = undefined;
        this.actionRotFns = [];
        this.__currLineNum = 0;
        this.rotStore = { foo: 42 };

        const consoleHandler = {
            apply: (target, thisArg, argList) => {
                let msg = argList[0];
                this.consoleDom.innerText = msg;
                if (target.name === 'error') {
                    this.parentGui.setConsoleErrorColor();
                }
                return target(msg);
            }
        };
        // FIXME: cannot unbind this uh oh
        console.log = new Proxy(console.log, consoleHandler);
        console.error = new Proxy(console.error, consoleHandler);
    }

    get kinematics() {
        return this.parentGui.kinematics;
    }

    get progText() {
        return this.dom.innerText.trim();
    }

    get statements() {
        return this.__splitProgTextIntoStatements(this.progText);
    }

    grayStepButton() {
        this.stepButtonDom.classList.add('grayed');
    }

    setActionRotCodes(rotCodes) {
        // Define ROT utility functions
        let $machine = this.parentGui.strangeScene.machine;
        let $kinematics = this.parentGui.strangeScene.machine.kinematics;
        let $metrics = this.parentGui.strangeScene.metrics;
        let getConstructor = (line) => {
            let stat = esprima.parse(line).body[0];
            return stat.expression.callee.object.callee.name;
        };
        let getQuery = (line) => {
            let stat = esprima.parse(line).body[0];
            let argObj = expression.callee.object.arguments[0];
            return argObj.value;
        };
        let getMethodName = (line) => {
            let stat = esprima.parse(line).body[0];
            return stat.expression.callee.property.name;
        };
        let getMethodArgs = (line) => {
            let stat = esprima.parse(line).body[0];
            let argObjs = stat.expression.arguments;
            let argStrs = argObjs.map(ao => escodegen.generate(ao));
            // Ugly but the only way to handle non-JSON object literals
            let args = argStrs.map(as => eval('(' + as + ')'));
            return args;
        };
        // Because eval defines the RoT functions in this context, RoTs have
        // access to all the above functions
        this.actionRotFns = rotCodes.map(code => eval(code));
    }

    addLine(lineText) {
        let node = document.createElement('div');
        node.innerText = lineText;
        this.dom.appendChild(node);
    }

    step() {
        // TODO: block step until animations are done
        if (!this.parentGui.strangeScene.machine) {
            console.error('Please pick a machine first.');
            return;
        }
        if (this.progCurrFn === undefined) {
            this.progCurrFn = this.parseStatementsIntoCurriedFn();
        }
        if (this.progCurrFn.name === Workflow.EndFunctionName) {
            console.warn('End of program.');
            return;
        }
        if (this.__currLineNum > 0) {
            this.parentGui.removeConsoleErrorColor();
            this.progCurrFn = this.progCurrFn();
        }
        this.__stepHighlightLine();
    }

    reset() {
        // TODO: reset on edited text
        const highlightId = 'workflow-highlight';
        this.progCurrFn = this.parseStatementsIntoCurriedFn();
        this.__currLineNum = 0;
        let currHighlightedNode = document.getElementById(highlightId);
        if (currHighlightedNode !== null) {
            currHighlightedNode.id = '';
        }
        this.stepButtonDom.classList.remove('grayed');
        this.consoleDom.innerText = '';
        this.parentGui.removeConsoleErrorColor();
        let zg = this.kinematics.zeroGrid;
        if (zg) {
            this.parentGui.strangeScene.removeFromScene(zg);
        }
        this.parentGui.strangeScene.removeMaterialMarks();
        this.parentGui.strangeScene.removeMaterials();
        this.parentGui.strangeScene.recompileMachine();
        this.rotStore = {};
    }

    __splitProgTextIntoStatements(progText) {
        let lines = progText.split(';')
                        .map(line => line.replace('<br>', '').trim())
                        .filter(line => line.length > 0);
        return lines;
    }

    __stepHighlightLine() {
        const highlightId = 'workflow-highlight';
        let currHighlightedNode = document.getElementById(highlightId);
        if (currHighlightedNode !== null) {
            currHighlightedNode.id = '';
        }
        let childNodes = this.dom.childNodes;
        if (this.__currLineNum < childNodes.length) {
            childNodes[this.__currLineNum].id = highlightId;
            this.__currLineNum += 1;
        }
        else {
            this.stepButtonDom.classList.add('grayed');
        }
    }

    injectTestProgTextNodes() {
        // let statements = [
        //     'loadChosenMachine();',
        //     'selectMaterial(\'PLA\');',
        //     'uploadModel();',
        //     'positionModel();',
        //     'sliceModel();',
        //     'run();'
        // ];
        // let statements = [
        //     '$machine().zero();',
        //     '$machine().moveTo(0, 0, 50);',
        //     '$machine().moveTo(50, 0, 50);',
        //     '$machine().moveTo(50, 0, 0);',
        //     '$machine().moveTo(0, 0, 0);',
        //     '$machine().moveTo(0, 2, 0);',
        //     '$machine().moveTo(0, 2, 50);',
        //     '$machine().moveTo(50, 2, 50);',
        //     '$machine().moveTo(50, 2, 0);',
        //     '$machine().moveTo(0, 2, 0);',
        // ];
        let statements = [
            '$material(\'foam\').makeBox(100, 100, 100);',
            '$machine().zero();',
            '$machine().moveTo(-300, 25, 0);'
        ];
        statements.forEach((stat, idx) => {
            this.addLine(statements[idx]);
        });
    }

    parseStatementsIntoCurriedFn() {
        const CLASS_HIDDEN = 'hidden';
        const mUploadDom = document.getElementById('widget-upload-model');
        const mPositionDom = document.getElementById('widget-position-model');
        const runDom = document.getElementById('widget-run');
        let curriedWorkflow = this.__generateCurriedWorkflow();
        return curriedWorkflow;
    }

    __generateCurriedWorkflow() {
        const endFunction = () => {};
        Reflect.defineProperty(endFunction, 'name', {
            value: Workflow.EndFunctionName,
            writeable: false
        });

        // Bindings!
        // let $m = this.generateMSelector();
        let $b = this.generateBSelector();
        let $t = this.generateTSelector();
        let $machine = this.generateMachineSelector();
        let $model = this.generateModelSelector();
        let $material = this.generateMaterialSelector();

        // Curry magic
        const lines = [...this.statements];
        const generateInnerFn = (lineIdx) => {
            if (lineIdx === lines.length) {
                return endFunction;
            }
            else {
                let outerFn = () => {
                    let innerFn = generateInnerFn(lineIdx + 1);
                    let currLine = lines[lineIdx];
                    let checksPass = this.checkRotsForLine(currLine);
                    if (!checksPass) {
                        this.stepButtonDom.classList.add('grayed');
                        return endFunction;
                    }
                    else {
                        eval(currLine);
                        return innerFn;
                    }
                };
                return outerFn;
            }
        };
        return generateInnerFn(0);
    }

    checkRotsForLine(line) {
        let failedRotCheck = false;
        // Expose this Workflow's KV store for rots to keep state
        const store = this.rotStore;
        this.actionRotFns.forEach((rotFn) => {
            let success = rotFn(line, store);
            if (!success) {
                failedRotCheck = true;
            }
        });
        return !failedRotCheck;
    }

    testCurry() {
        const consoleHandler = {
            apply: (target, thisArg, argList) => {
                let msg = argList[0];
                this.consoleDom.innerText = msg;
                return target(msg);
            }
        };
        const endFunction = () => {};
        Reflect.defineProperty(endFunction, 'name', {
            value: Workflow.EndFunctionName,
            writeable: false
        });
        const CLASS_HIDDEN = 'hidden';
        const mUploadDom = document.getElementById('widget-upload-model');
        const mPositionDom = document.getElementById('widget-position-model');
        const runDom = document.getElementById('widget-run');
        // FIXME: cannot unbind this uh oh
        console.log = new Proxy(console.log, consoleHandler);
        let f0 = () => {
            let f1 = () => {
                let f2 = () => {
                    let f3 = () => {
                        let f4 = () => {
                            let f5 = () => {
                                runDom.classList.remove(CLASS_HIDDEN);
                                window.jobFile.loadAndRunExample('box');
                                return endFunction;
                            };
                            return f5;
                        };
                        mPositionDom.classList.add(CLASS_HIDDEN);
                        console.log('Sending to Cura for slicing...');
                        return f4;
                    };
                    mUploadDom.classList.add(CLASS_HIDDEN);
                    mPositionDom.classList.remove(CLASS_HIDDEN);
                    this.parentGui.renderModelPane = this.parentGui.__inflateModelContainerDom();
                    this.parentGui.makeLoadStlPromise('./pikachu.stl');
                    this.parentGui.renderModelPane();
                    console.log('Position model in envelope.');
                    return f3;
                }
                let material = {
                    name: 'PLA',
                    diameter: 0.7
                };
                console.log('Selected PLA.');
                console.log('Showing models for 3D printing.');
                mUploadDom.classList.remove(CLASS_HIDDEN);
                return f2;
            };
            if (window.strangeScene.machine === undefined) {
                console.log('Please load a machine into the scene.');
                return endFunction;
            }
            let machine = window.strangeScene.machine;
            console.log(`Captured machine: ${machine.name}`);
            return f1;
        };
        return f0;
    }

    // Lanaguage constructs

    generateMSelector() {
        // FIXME: do not use until we re-implement motors at the lowest level
        console.assert(false, 'NYI');
        const kinematics = this.kinematics;
        return (motorName) => {
            return {
                step: (numSteps) => {
                    kinematics.turnMotors({
                        [motorName]: numSteps
                    });
                }
            };
        };
    }

    generateBSelector() {
        const kinematics = this.kinematics;
        return (blockName) => {
            let block = kinematics.machine.findBlockWithName(blockName);
            console.assert(block !== undefined,
                            'Could not find a block with that name');
            let selector = {
                wiggle: () => {
                    const wiggleSteps = 20;
                    const epsSec = 0.01;
                    const delay = (kinematics.strangeAnimator.ANIM_SECONDS +
                                    epsSec) * 1000;
                    kinematics.actuateBlock(block, wiggleSteps);
                    setTimeout(() => {
                        kinematics.actuateBlock(block, -wiggleSteps);
                    }, delay);
                    return selector;
                }
            };
            return selector;
        };
    }

    generateTSelector() {
        const kinematics = this.kinematics;
        return (toolName) => {
            let tool = kinematics.machine.getTool(toolName);
            let selector = {
                activate: () => {
                    tool.activate();
                    return selector;
                },
                fanOn: () => {
                    tool.attributes.fanOn = true;
                    return selector;
                },
                fanOff: () => {
                    tool.attributes.fanOn = false;
                    return selector;
                },
                park: () => {
                    tool.attributes.equipped = false;
                    kinematics.disconnectRootNodeForBlock(tool);
                    return selector;
                },
                equip: () => {
                    tool.attributes.equipped = true;
                    kinematics.addNewBlockAsRoot(tool);
                    return selector;
                }
            };
            return selector;
        };
    }

    generateMachineSelector() {
        const kinematics = this.kinematics;
        return (toolName) => {
            let tool = kinematics.machine.getTool(toolName);
            let selector = {
                zero: () => {
                    kinematics.zeroAtCurrentPosition();
                    return selector;
                },
                stepMotors: (motorStepPairs) => {
                    kinematics.turnMotors(motorStepPairs);
                    return selector;
                },
                moveTo: (pt, extrudeMM) => {
                    let toolPos = kinematics.getZeroedPosition();
                    const axisToCoord = {
                        x: pt.x !== undefined ? pt.x : toolPos.x,
                        y: pt.y !== undefined ? pt.y : toolPos.y,
                        z: pt.z !== undefined ? pt.z : toolPos.z
                    };
                    kinematics.moveTool(axisToCoord, extrudeMM);
                    return selector;
                }
            };
            return selector;
        };
    }

    generateMaterialSelector() {
        const attributeDict = {
            'wood' : {
                'materialClass': 'subtractive'
            },
            'foam' : {
                'materialClass': 'subtractive'
            },
        };
        const defaultAttributes = {
            'materialClass': 'nonManufacturing'
        }
        return (materialName) => {
            let scene = this.kinematics.strangeScene;
            let attributes = attributeDict[materialName] || defaultAttributes;
            // Note: we do not create a mesh right away because the
            // user must call .makeBox which provides dimensions
            return new Material(materialName, scene, attributes);
        };
    }

    generateModelSelector() {
        // TODO: bring back da sliceah
        // Tue todo
        // 1. models and slicing
        // 2. materials basic
        // 3. checking infrastructure
        // 4. (reach) rules of thumb
        return () => {
            const strangeScene = this.kinematics.strangeScene;
            const modelMesh = strangeScene.model;
            const modelGeom = strangeScene.modelGeom;
            console.assert(modelMesh !== undefined, 'No model loaded.');
            return {
                slice: () => {
                    let slicer = new Slicer({
                        layerHeight: 0.2,
                        infill: 'none'
                    });
                    let contours = slicer.slice(modelMesh, modelGeom);
                    slicer.addContoursToStrangeScene(contours, strangeScene);
                }
            }
        };
    }

}

export { Workflow };

