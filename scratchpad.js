'use strict';

/* Rules of thumb */

const $machine, $material, $model;

let materialMustMatchMachine = $(material).addListener('select', () => {
    let acceptableMaterials = $(machine).metrics.acceptableMaterials;
    if (acceptableMaterials && acceptableMaterials.includes(material)) {
        throw Error(`${$(machine)} cannot work with ${$(material).name}.`);
    };
});

let modelMustFitInEnvelope = $(model).addListener('placeAt', (x, y, z) => {
    let we = $(machine).getMetrics().workEnvelopeDimensions;
    if (we && $(model).width > we.width
        || $(model).height > we.height
        || $(model).length > we.length) {
        throw Error(`${$(model).name} is too large for this machine.`);
    }
});

let machineMustHandleTallFeatures = $(machine).onLoad(() => {
    /* We say a machine can handle tall features if
     * - it does not use a platform that moves on the XZ plane
     * - it uses a gantry style mechanism for its XZ movements, which
     *   is represented in the Description as "mechanismType" : "cross" */
    let hasXZPlatform = $(machine).metrics.hasXZPlatform;
    let maybeXZGantry = $(machine).mechanisms.find((mechanism) => {
        let isGantry = mechanism.mechanismType === 'cross';
        let onXZPlane = mechanism.actuationAxes.includes('x')
                        && mechanism.actuationAxes.includes('z');
        return isGantry && onXZPlane;
    });
    if (hasXZPlatform) {
        throw Error('XZ platforms cause too much wobbling for tall features.');
    }
    if (!maybeXZGantry) {
        throw Error('We need an XZ gantry to handle tall features.');
    }
});

/* Metric spec */

let calculateRigidityScores = () => {

};

