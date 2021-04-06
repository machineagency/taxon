(action, store) => {
    try {
        if (getMethodName(action) === 'moveTo') {
            let moveArgs = getMethodArgs(action);
            let movePt = moveArgs[0];
            let toolPos = $kinematics.coordsToWorldPosition(movePt);
            let equippedTool = $machine.getEquippedTool();
            $metrics.envelopeRegions.forEach((er) => {
                if (er.containsPoint(toolPos)) {
                    if (equippedTool.attributes.pcbSize !== er.name) {
                        console.error(`The ${er.name} needle must be equipped to enter this region`);
                        return false;
                    }
                }
            });
        }
        return true;
    }
    catch (e) {
        console.log('Cannot enforce "tool matches region."');
        console.log(e);
        return true;
    }
};
