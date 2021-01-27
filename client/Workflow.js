'use strict';

class Workflow {

    static EndFunctionName = 'END_FUNCTION';

    constructor() {
        this.dom = document.getElementById('workflow-container');
        this.stepButtonDom = document.getElementById('step-button');
        this.progText = this.dom.innerText.trim();
        this.statements = this.__splitProgTextIntoStatements(this.progText);
        this.progOutermostFn = this.testCurry();
        this.profCurrFn = this.testCurry();
        this.__currLineNum = 0;
    }

    parseTextIntoProgram() {
    }

    step() {
        // TODO: UI step
        if (this.profCurrFn.name === Workflow.EndFunctionName) {
            console.warn('End of program.');
            return;
        }
        if (this.__currLineNum > 0) {
            console.log('here');
            this.profCurrFn = this.profCurrFn();
        }
        this.__stepHighlightLine();
    }

    reset() {
        // TODO: UI reset too
        const highlightId = 'workflow-highlight';
        this.profCurrFn = this.testCurry();
        this.__currLineNum = 0;
        let currHighlightedNode = document.getElementById(highlightId);
        if (currHighlightedNode !== null) {
            currHighlightedNode.id = '';
        }
        this.stepButtonDom.classList.remove('grayed');
    }

    __splitProgTextIntoStatements(progText) {
        let lines = progText.split(';')
                        .map(line => line.replace('<br>', '').trim())
                        .filter(line => line.length > 0);
        return lines;
    }

    __stepHighlightLine() {
        // TODO: make sep id
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

    testCurry() {
        let baseProg = "let v = 42; let mySum = v + 5; console.log(mySum)";
        let f0 = () => {
            let f1 = () => {
                let f2 = () => {
                    console.log(mySum);
                    let endFunction = () => {};
                    Reflect.defineProperty(endFunction, 'name', {
                        value: Workflow.EndFunctionName,
                        writeable: false
                    });
                    console.log('did logging');
                    return endFunction;
                };
                let mySum = v + 5;
                console.log('did v + 5');
                return f2;
            };
            let v = 42
            console.log('defined v');
            return f1;
        };
        return f0;
    }
}

export { Workflow };
