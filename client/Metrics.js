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
        this.materialCompatibility = metricsProg.materialCompatibility;
        this.rootMeshGroup = new THREE.Group();
        this.workEnvelope = new WorkEnvelope(this, this.workEnvelope);
        if (metricsProg.envelopeRegions) {
            this.envelopeRegions = Object.entries(metricsProg.envelopeRegions)
                                         .map((kvPair) => {
                let erName = kvPair[0];
                let erProg = kvPair[1];
                let er = new EnvelopeRegion(this, erProg);
                er.name = erName;
                return er;
            });
        }
        this.parentScene.scene.add(this.rootMeshGroup);
    }

    clearFromScene() {
        if (this.workEnvelope) {
            this.parentScene.removeFromScene(this.workEnvelope.meshGroup);
        }
        if (this.envelopeRegions) {
            this.envelopeRegions.forEach((er) => {
                this.parentScene.removeFromScene(er.meshGroup);
            });
        }
    }
}

class Region {
    //static color = 0x9d8dff;
    static color = 0x4e467f;
    static shapes = ['rectangle', 'box', 'cylinder'];

    constructor(parentMetrics, weProg) {
        this.parentMetrics = parentMetrics;
        this.dimensions = weProg.dimensions;
        this.shape = weProg.shape;
        this.name = 'Region';
        this.componentType = 'Region';
        this.meshGroup = new THREE.Group();
        this.renderDimensions();
        this.parentMetrics.parentScene.scene.add(this.meshGroup);
        this.position = new THREE.Vector3(weProg.position.x, weProg.position.y,
                                         weProg.position.z);
        if (this.shape === 'rectangle') {
            if (!this.width) {
                this.flatAxis = 'x';
            }
            if (!this.height) {
                this.flatAxis = 'y';
            }
            if (!this.length) {
                this.flatAxis = 'z';
            }
        }
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

    get radius() {
        return this.dimensions.radius;
    }

    containsPoint(pt) {
        let largeNumber = 9000;
        let center = this.position;
        let size = new THREE.Vector3(this.width, this.height, this.length);
        // This region's bounding box if it's a rectangle is "infinite" on
        // the flat axis
        if (this.shape === 'rectangle') {
            size[this.flatAxis] = largeNumber;
        }
        let thisBox = new THREE.Box3().setFromCenterAndSize(center, size);
        return thisBox.containsPoint(pt);
    }

    intersectsBox(box) {
        let largeNumber = 9000;
        let center = this.position;
        let size = new THREE.Vector3(this.width, this.height, this.length);
        // This region's bounding box if it's a rectangle is "infinite" on
        // the flat axis
        if (this.shape === 'rectangle') {
            size[this.flatAxis] = largeNumber;
        }
        let thisBox = new THREE.Box3().setFromCenterAndSize(center, size);
        return thisBox.intersectsBox(box);
    }

    renderDimensions() {
        let geom = this.calcGeometry(this.dimensions);
        let edgesGeom = new THREE.EdgesGeometry(geom);
        let material = new THREE.LineDashedMaterial({
            color : WorkEnvelope.color,
            linewidth: 1,
            scale: 1,
            dashSize: 3,
            gapSize: 2
        });
        this.mesh = new THREE.LineSegments(edgesGeom, material);
        this.mesh.computeLineDistances();
        this.mesh.isWorkEnvelopeMesh = true;
        this.meshGroup.blockName = this.name;
        this.meshGroup.add(this.mesh);
        this.geometries = [geom];
    }

    clearFromScene() {
        this.parentMetrics.parentScene.scene.remove(this.meshGroup);
        this.meshGroup = new THREE.Group();
    }

    calcGeometry(dimensions) {
        if (this.shape === 'rectangle') {
            let geom;
            if (!this.height) {
                geom = new THREE.PlaneBufferGeometry(dimensions.width,
                                                     dimensions.length);
                geom.rotateX(Math.PI / 2);
                return geom;
            }
            else if (!this.width) {
                geom = new THREE.PlaneBufferGeometry(dimensions.height,
                                                     dimensions.length);
                geom.rotateY(Math.PI / 2);
                return geom;
            }
            else {
                geom = new THREE.PlaneBufferGeometry(dimensions.width,
                                                     dimensions.height);
                return geom;
            }
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

class WorkEnvelope extends Region {
    constructor(parentMetrics, weProg) {
        super(parentMetrics, weProg);
        this.name = 'WorkEnvelope';
        this.componentType = 'WorkEnvelope';
    }
}

class EnvelopeRegion extends Region {
    constructor(parentMetrics, weProg) {
        super(parentMetrics, weProg);
        this.name = 'EnvelopeRegion';
        this.componentType = 'EnvelopeRegion';
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
    }
}

class MetricsCompiler {
    constructor() {
    }

    compile(prog) {
        let mObj = JSON.parse(prog);
        let metrics = new Metrics(window.strangeScene, mObj);
        return metrics;
    }
}

export { MetricsCompiler };
