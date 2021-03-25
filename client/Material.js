'use strict';

import * as THREE from './build/three.module.js';
import { STLLoader } from './build/STLLoader.js';
import { StrangeGui } from './StrangeGui.js';

class Material {
    static additiveColor = 0xe44242;
    static subtractiveColor = 0x2ecc71;
    /**
     * Note that the dimensions of the material depends on attribute.materialClass.
     * This can be "additive", where the material represents a linear extrusion
     * of material, so dimensions contains a start and end point. For "subtractive,"
     * the dimensions are of the material's bounding box.
     */
    constructor(name, parentScene, attributes, dimensions) {
        console.assert(attributes.materialClass === 'additive'
            || attributes.materialClass === 'subtractive',
            'Must specify material class: additive or subtractive');
        this.parentScene = parentScene;
        this.meshGroup = new THREE.Group();
        this.meshGroup.type = 'material';
        this.attributes = attributes;
        this.dimensions = dimensions;
        parentScene.addSceneObjectDirectly(this.meshGroup);
    }

    get width() {
        if (this.attributes.materialClass === 'additive') {
            console.warn('Additive material has no width');
        }
        return this.dimensions.width;
    }

    get height() {
        if (this.attributes.materialClass === 'additive') {
            console.warn('Additive material has no height');
        }
        return this.dimensions.height;
    }

    get length() {
        if (this.attributes.materialClass === 'additive') {
            console.warn('Additive material has no length');
        }
        return this.dimensions.length;
    }

    derender() {
        this.parentScene.remove(this.meshGroup);
        this.meshGroup = new THREE.Group();
        this.meshGroup.type = 'material';
    }

    render() {
        if (this.attributes.materialClass === 'additive') {
            // TODO
            console.error('NYI');
        }
        else {
            this.__renderSubtractive();
        }
    }

    __renderAdditive() {
    }

    __renderSubtractive() {
        this.derender();
        let geom = new THREE.BoxBufferGeometry(this.width, this.height,
            this.length, 2, 2, 2)
        let material = new THREE.MeshLambertMaterial({
            color : Material.subtractiveColor,
            transparent: true,
            opacity: 0.5
        });
        this.mesh = new THREE.Mesh(geom, material);
        this.meshGroup.add(this.mesh);
        this.geometries = [geom];
        this.rotateToXYPlane();
        this.addMeshGroupToScene();
    }
}

export { Material };

