(action, store) => {
    try {
        let constructor = getConstructor(action);
        if (constructor === '$material') {
            let query = getQuery(action);
            let materialInclusions = $metrics.materialCompatibility.include;
            if (!materialInclusions.includes(query)) {
                console.error(`${query} does not work with ${$machine.name}.`);
                return false;
            }
        }
        return true;
    }
    catch(e) {
        console.log('Cannot enforce material matches machine.');
        return true;
    }
};
