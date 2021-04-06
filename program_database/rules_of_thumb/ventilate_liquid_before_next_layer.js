(action, store) => {
    try {
        if (getMethodName(action) === 'fanOn') {
            store['highestLayerWet'] = false;
        }
        if (getMethodName(action) === 'moveTo'
            && getMethodArgs(action)[1] !== undefined) {
            if (store['highestLayerWet']) {
                console.error('Must dry the previous layer first.');
                return false;
            }
            store['highestLayerWet'] = true;
        }
        return true;
    }
    catch (e) {
        console.log('Cannot enforce "ventilate liquid before next layer."');
        // console.log(e);
        return true;
    }
}
