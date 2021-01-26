'use strict';

class Workflow {
    constructor(progText) {
        this.progText = progText;
        this.statements = this.splitProgTextIntoStatements(progText);
    }

    splitProgTextIntoStatements(progText) {
        let lines = progText.split(';')
                        .map(line => line.trim())
                        .filter(line => line.length > 0);
        return lines;
    }

    testCurry() {
    }
}

export { Workflow };
