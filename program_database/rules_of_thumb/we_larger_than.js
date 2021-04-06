(machine, depValue) => {
    try {
        // Assuming dependent value is a string in the form
        // "[width, height, length]"
        let dimArray = JSON.parse(depValue);
        let [minWidth, minHeight, minLength] = dimArray;
        let we = machine.metrics.workEnvelope;
        return we.width >= minWidth
            && we.height >= minHeight
            && we.length >= minLength;
    }
    catch (e) {
        return false;
    }
};
