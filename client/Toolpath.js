'use strict';

import { SVGLoader } from './build/SVGLoader.js';
import * as THREE from './build/three.module.js';

class Toolpath {

    constructor(fileName, scene, pathName) {
        this.name = pathName;
        this.group = new THREE.Group();
        this.group.type = 'toolpath';
        this.__parsePathFromSVG(fileName, scene, pathName)
        .then((path) => {
            this.__renderPathInScene(path, scene);
        });
    }

    __parsePathFromSVG (fileName, scene, pathName) {
        let loader = new SVGLoader();
        let promise = new Promise((resolve, reject) => {
            loader.load(fileName, (data) => {
                resolve(data.paths);
            }, undefined, (error) => {
                console.error(error);
            });
        });
        return promise;
    };

    __renderPathInScene (path, scene) {
        let material = new THREE.LineDashedMaterial({
            color : 0x4e467f,
            linewidth: 1,
            scale: 1,
            dashSize: 3,
            gapSize: 3
        });
        path.forEach((subpath) => {
            let shapes = SVGLoader.createShapes(subpath);
            shapes.forEach((shape) => {
                let geom = new THREE.ShapeBufferGeometry(shape);
                let edgesGeom = new THREE.EdgesGeometry(geom);
                let segments = new THREE.LineSegments(edgesGeom, material);
                this.group.add(segments);
            });
        });
        this.group.rotateX(Math.PI / 2);
        scene.addToolpath(this);
    };
}

export { Toolpath };
