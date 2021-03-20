'use strict';

import * as THREE from './build/three.module.js';
import { STLLoader } from './build/STLLoader.js';
import { OrbitControls } from './build/OrbitControls.js';
import { TransformControls } from './build/TransformControls.js';
import { StrangeGui } from './StrangeGui.js';

class Metrics {
    constructor(parentScene, metricsProg) {
        this.parentScene = parentScene;
        this.parentScene.metrics = this;
        this.workEnvelope = metricsProg.workEnvelope;
        this.manufacturingStrategies = metricsProg.manufacturingStrategies;
        this.rootMeshGroup = new THREE.Group();
        this.workEnvelope = new WorkEnvelope(this, this.workEnvelope);
        this.renderAbstractTool();
        this.parentScene.scene.add(this.rootMeshGroup);
    }

    renderAbstractTool() {
    }
}

class WorkEnvelope {
    static color = 0x9d8dff;
    static shapes = ['rectangle', 'box', 'cylinder'];

    constructor(parentMetrics, weProg) {
        this.parentMetrics = parentMetrics;
        this.dimensions = weProg.dimensions;
        this.shape = weProg.shape;
        this.name = 'WorkEnvelope';
        this.componentType = 'WorkEnvelope';
        this.meshGroup = new THREE.Group();
        this.renderDimensions();
        this.parentMetrics.parentScene.scene.add(this.meshGroup);
        this.position = new THREE.Vector3(weProg.position.x, weProg.position.y,
                                         weProg.position.z);
    }

    get position() {
        return this.meshGroup.position;
    }

    set position(newPos) {
        this.position.copy(newPos);
    }

    get width() {
        return this.dimensions.width;
    }

    get height() {
        return this.dimensions.height;
    }

    get length() {
        return this.dimensions.length;
    }

    renderDimensions() {
        let geom = this.calcGeometry(this.dimensions);
        let edgesGeom = new THREE.EdgesGeometry(geom);
        let material = new THREE.LineDashedMaterial({
            color : WorkEnvelope.color,
            linewidth: 1,
            scale: 1,
            dashSize: 3,
            gapSize: 3
        });
        this.mesh = new THREE.LineSegments(edgesGeom, material);
        this.mesh.computeLineDistances();
        this.mesh.isWorkEnvelopeMesh = true;
        this.meshGroup.blockName = this.name;
        this.meshGroup.add(this.mesh);
        this.geometries = [geom];
        if (this.shape === 'rectangle') {
            let rotateQuaternion = new THREE.Quaternion();
            rotateQuaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0),
                                              -Math.PI / 2);
            this.meshGroup.applyQuaternion(rotateQuaternion);
        }
    }

    clearFromScene() {
        this.parentMetrics.parentScene.scene.remove(this.meshGroup);
        this.meshGroup = new THREE.Group();
    }

    calcGeometry(dimensions) {
        if (this.shape === 'rectangle') {
            return new THREE.PlaneBufferGeometry(dimensions.length,
                                                 dimensions.width);
        }
        if (this.shape === 'box') {
            return new THREE.BoxBufferGeometry(dimensions.width,
                dimensions.height, dimensions.length, 2, 2, 2);
        }
        if (this.shape === 'cylinder') {
            return new THREE.CylinderBufferGeometry(dimensions.radius,
                dimensions.radius, dimensions.height, 64);
        }
    }
}


class MetricsCompiler {
    constructor() {
    }

    compile(prog) {
        let mObj = JSON.parse(prog);
        let metrics = new Metrics(window.strangeScene, mObj);
        window.strangeScene.metrics = metrics;
        return prog;
    }
}

export { MetricsCompiler };
