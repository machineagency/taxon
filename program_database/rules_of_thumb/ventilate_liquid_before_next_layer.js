(action, store) => {
    // todo fix bnased on new syntax
    try {
        let methods = getMethods(action);
        if (getMethodName(methods[0]) === 'fanOn') {
            store['highestLayerWet'] = false;
        }
        console.log(getMethodArgs(methods[0]));
        if (getMethodName(methods[0]) === 'moveTo'
            && getMethodArgs(methods[0])[1] !== undefined) {
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
        console.log(e);
        return true;
    }
}
