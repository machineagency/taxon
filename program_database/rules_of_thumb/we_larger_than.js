(machine, depValue) => {
    try {
        // Assuming dependent value is a string in the form
        // "[width, height, length]"
        let dimArray = JSON.parse(depValue);
        let [minWidth, minHeight, minLength] = dimArray;
        let we = machine.metrics.workEnvelope;
        return we.dimensions.width >= minWidth
            && we.dimensions.height >= minHeight
            && we.dimensions.length >= minLength;
    }
    catch (e) {
        return false;
    }
};
