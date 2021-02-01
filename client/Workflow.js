'use strict';

class Workflow {

    static EndFunctionName = 'END_FUNCTION';

    constructor(parentGui) {
        this.parentGui = parentGui;
        this.dom = document.getElementById('workflow-container');
        this.stepButtonDom = document.getElementById('step-button');
        this.consoleDom = document.getElementById('workflow-console');
        this.progText = this.dom.innerText.trim();
        this.statements = this.__splitProgTextIntoStatements(this.progText);
        this.progOutermostFn = this.testCurry();
        this.profCurrFn = this.testCurry();
        this.__currLineNum = 0;
        this.injectTestProgTextNodes();
    }

    parseTextIntoProgram() {
        // TODO: parse raw text into statements -> curried FN
    }

    addLine(lineText) {
        // TODO: parse text and e.g. if it's a block add block constructor
        let node = document.createElement('div');
        node.innerText = lineText;
        this.dom.appendChild(node);
    }

    step() {
        if (this.profCurrFn.name === Workflow.EndFunctionName) {
            console.warn('End of program.');
            return;
        }
        if (this.__currLineNum > 0) {
            this.profCurrFn = this.profCurrFn();
        }
        this.__stepHighlightLine();
    }

    reset() {
        const highlightId = 'workflow-highlight';
        this.profCurrFn = this.testCurry();
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
        let statements = [
            'loadChosenMachine();',
            'selectMaterial(\'PLA\');',
            'uploadModel();',
            'positionModel();',
            'sliceModel();',
            'run();'
        ];
        statements.forEach((stat, idx) => {
            this.addLine(statements[idx]);
        });
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
}

export { Workflow };

