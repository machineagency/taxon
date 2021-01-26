'use strict';

class Workflow {

    static EndFunctionName = 'END_FUNCTION';

    constructor(progText) {
        this.progText = progText;
        this.statements = this.__splitProgTextIntoStatements(progText);
        this.progOutermostFn = this.testCurry();
        this.profCurrFn = this.testCurry();
    }

    initializeProgram() {
    }

    step() {
        // TODO: UI step
        if (this.profCurrFn.name === Workflow.EndFunctionName) {
            console.warn('End of program.');
            return;
        }
        this.profCurrFn = this.profCurrFn();
    }

    reset() {
        // TODO: UI reset too
        this.profCurrFn = this.testCurry();
    }

    __splitProgTextIntoStatements(progText) {
        let lines = progText.split(';')
                        .map(line => line.trim())
                        .filter(line => line.length > 0);
        return lines;
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
