'use strict';

/* Rules of thumb */

let materialMustMatchMachine = MATERIAL.onUse((material) => {
    let acceptableMaterials = MACHINE.getMetrics().acceptableMaterials;
    if (acceptableMaterials && acceptableMaterials.includes(material)) {
        throw Error(`${MACHINE} can't work with ${material}.`);
    };
});

let modelMustFitInEnvelope = MODEL.onLoad((model) => {
    let we = MACHINE.getMetrics().workEnvelopeDimensions;
    if (we) {
        if (model.width > we.width
            || model.height > we.height
            || model.width > we.width) {
            throw Error(`${model.name} is too large for this machine.`);
        }
    }
});

let machineMustHandleTallFeatures = MACHINE.onSelect(() => {
    
});

/* Metric spec */

let calculateRigidityScores = () => {

};

