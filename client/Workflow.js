'use strict';

class Workflow {

    static EndFunctionName = 'END_FUNCTION';

    constructor(parentGui, kinematics) {
        this.parentGui = parentGui;
        this.kinematics = kinematics;
        this.dom = document.getElementById('workflow-container');
        this.stepButtonDom = document.getElementById('step-button');
        this.consoleDom = document.getElementById('workflow-console');
        this.injectTestProgTextNodes();
        this.progCurrFn = this.parseStatementsIntoCurriedFn();
        this.__currLineNum = 0;
    }

    get progText() {
        return this.dom.innerText.trim();
    }

    get statements() {
        return this.__splitProgTextIntoStatements(this.progText);
    }

    addLine(lineText) {
        let node = document.createElement('div');
        node.innerText = lineText;
        this.dom.appendChild(node);
    }

    step() {
        // TODO: block step until animations are done
        if (this.progCurrFn.name === Workflow.EndFunctionName) {
            console.warn('End of program.');
            return;
        }
        if (this.__currLineNum > 0) {
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
        let statements = [
            '$b(\'carriage\').wiggle();',
            '$machine().zero();',
            '$machine().moveTo(50, 50, 50);',
            '$model().slice();',
        ];
        statements.forEach((stat, idx) => {
            this.addLine(statements[idx]);
        });
    }

    parseStatementsIntoCurriedFn() {
        const consoleHandler = {
            apply: (target, thisArg, argList) => {
                let msg = argList[0];
                this.consoleDom.innerText = msg;
                return target(msg);
            }
        };
        const CLASS_HIDDEN = 'hidden';
        const mUploadDom = document.getElementById('widget-upload-model');
        const mPositionDom = document.getElementById('widget-position-model');
        const runDom = document.getElementById('widget-run');
        // FIXME: cannot unbind this uh oh
        console.log = new Proxy(console.log, consoleHandler);
        let curriedWorkflow = this.__generateCurriedWorkflow();
        return curriedWorkflow;
    }

    __generateCurriedWorkflow() {
        // Bindings!
        let $m = this.generateMSelector();
        let $b = this.generateBSelector();
        let $t = this.generateTSelector();
        let $machine = this.generateMachineSelector();
        let $model = this.generateModelSelector();
        let $material = this.generateMaterialSelector();

        // Curry magic
        const lines = [...this.statements];
        const generateInnerFn = (lineIdx) => {
            if (lineIdx === lines.length) {
                const endFunction = () => {};
                Reflect.defineProperty(endFunction, 'name', {
                    value: Workflow.EndFunctionName,
                    writeable: false
                });
                return endFunction;
            }
            else {
                let outerFn = () => {
                    let innerFn = generateInnerFn(lineIdx + 1);
                    let currLine = lines[lineIdx];
                    // Eval seems unavoidable here
                    eval(currLine);
                    return innerFn;
                };
                return outerFn;
            }
        };
        return generateInnerFn(0);
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
            return {
                wiggle: () => {
                    const wiggleSteps = 20;
                    const epsSec = 0.01;
                    const delay = (kinematics.strangeAnimator.ANIM_SECONDS +
                                    epsSec) * 1000;
                    let drivingMotors = block.drivingMotors;
                    if (block.kinematics === 'directDrive') {
                        let singleMotorName = drivingMotors[0].name;
                        kinematics.turnMotors({
                            [singleMotorName]: wiggleSteps
                        });
                        setTimeout(() => {
                            kinematics.turnMotors({
                                [singleMotorName]: -wiggleSteps
                            });
                        }, delay);
                    }
                }
            };
        };
    }

    generateTSelector() {
        const kinematics = this.kinematics;
        return (toolName) => {
        };
    }

    generateMachineSelector() {
        const kinematics = this.kinematics;
        return () => {
            return {
                zero: () => {
                    kinematics.zeroAtCurrentPosition();
                },
                stepMotors: (motorStepPairs) => {
                    kinematics.turnMotors(motorStepPairs);
                },
                moveTo: (x, y, z) => {
                    const axisToCoord = { x, y, z };
                    console.log(axisToCoord);
                    kinematics.moveTool(axisToCoord);
                }
            };
        };
    }

    generateMaterialSelector() {
        return (materialName) => {
            // If materialName is undefined, help me pick one
        };
    }

    generateModelSelector() {
        // TODO: bring back da sliceah
        // Tue todo
        // 1. models and slicing
        // 2. materials basic
        // 3. checking infrastructure
        // 4. (reach) rules of thumb
        return (modelName) => {
            // If modelName is undefined, help me pick one
        };
    }

}

export { Workflow };

