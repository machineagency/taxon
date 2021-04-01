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
    constructor(name, parentScene, attributes) {
        console.assert(attributes.materialClass === 'additive'
            || attributes.materialClass === 'subtractive',
            'Must specify material class: additive or subtractive');
        this.parentScene = parentScene;
        this.meshGroup = new THREE.Group();
        this.attributes = attributes;
        parentScene.addSceneObjectDirectly(this.meshGroup);
        this.meshGroup.name = 'material';
    }

    makeBox(width, height, length) {
        this.dimensions = {
            width, height, length
        };
        this.render();
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
        this.parentScene.scene.remove(this.meshGroup);
        this.meshGroup = new THREE.Group();
        this.meshGroup.name = 'material';
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
        // this.derender();
        let geom = new THREE.BoxBufferGeometry(this.width, this.height,
            this.length, 2, 2, 2)
        let edgesGeom = new THREE.EdgesGeometry(geom);
        let material = new THREE.MeshLambertMaterial({
            color : Material.subtractiveColor,
            transparent: true,
            opacity: 0.5
        });
        let edgesMaterial = new THREE.LineBasicMaterial({
            color: 0x222222
        });
        let mesh = new THREE.Mesh(geom, material);
        let wires = new THREE.LineSegments(edgesGeom, edgesMaterial);
        this.meshGroup.add(mesh);
        this.meshGroup.add(wires);
        this.meshGroup.position.setY(this.height / 2);
    }
}

export { Material };

