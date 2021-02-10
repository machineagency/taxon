'use strict';

class Slicer {
    constructor(kvs) {
        const defaultLayerHeight = 0.2;
        this._layerHeight = kvs.layerHeight || defaultLayerHeight;
        this._infill = kvs.infill;
    }

    get layerHeight() {
        return this._layerHeight;
    }

    get infill() {
        return this.infill;
    }

    /**
     * Generates an array of la
     *
     * @param THREE.Mesh - The mesh object to be sliced.
     * @param THREE.Geometry nonBufferGeometry - The geometry associated with
     *        the mesh.
     *
     * @return {Vector3[][]} contours - An array of layers, where each layer is
     *                                 an array of Vector3 points.
     */
    slice(mesh, nonBufferGeometry) {
        /* Returns intersection point, or undefined if no intersection */
        let segmentPlaneIntersect = (v0, v1, plane) => {
            let v0_dist_to_plane = plane.distanceToPoint(v0);
            let v1_dist_to_plane = plane.distanceToPoint(v1);
            if (v0_dist_to_plane * v1_dist_to_plane < 0) {
                // NOTE: isect = v0 + t * (v1 - v0)
                let t = v0_dist_to_plane / (v0_dist_to_plane - v1_dist_to_plane);
                let isect = new THREE.Vector3().copy(v0);
                let rest = new THREE.Vector3().copy(v1).sub(v0).multiplyScalar(t);
                return isect.add(rest);
            }
        };
        let calcSegmentsForPlane = (plane) => {
            let isectSegments = [];
            nonBufferGeometry.faces.forEach((face) => {
                let v0 = mesh.localToWorld(nonBufferGeometry.vertices[face.a]);
                let v1 = mesh.localToWorld(nonBufferGeometry.vertices[face.b]);
                let v2 = mesh.localToWorld(nonBufferGeometry.vertices[face.c]);
                let isect01 = segmentPlaneIntersect(v0, v1, xzPlane);
                let isect12 = segmentPlaneIntersect(v1, v2, xzPlane);
                let isect20 = segmentPlaneIntersect(v2, v0, xzPlane);
                if (isect01 !== undefined && isect12 !== undefined) {
                    isectSegments.push([isect01, isect12])
                }
                if (isect01 !== undefined && isect20 !== undefined) {
                    isectSegments.push([isect01, isect20])
                }
                if (isect12 !== undefined && isect20 !== undefined) {
                    isectSegments.push([isect12, isect20])
                }
            });
            return isectSegments;
        };
        let calcContoursForLayerSegment = (segments, segIdx) => {
            if (segments.length === 0) {
                return [];
            }
            let contours = [];
            // NOTE: define a contour as an ordered list of points
            let currContour = [];
            let unvisitedSegments = segments.slice();
            let currSegment = unvisitedSegments[0];
            let pointToPush = currSegment[0];
            let pointForFindingNextSeg = currSegment[1];
            while (unvisitedSegments.length > 0) {
                currContour.push(pointToPush);
                unvisitedSegments.splice(unvisitedSegments.indexOf(currSegment), 1);
                let foundNextSegment = unvisitedSegments.some((potentialSegment) => {
                    if (potentialSegment[0].approxEqual(pointForFindingNextSeg)) {
                        currSegment = potentialSegment;
                        pointToPush = potentialSegment[0];
                        pointForFindingNextSeg = potentialSegment[1];
                        return true;
                    }
                    if (potentialSegment[1].approxEqual(pointForFindingNextSeg)) {
                        currSegment = potentialSegment;
                        pointToPush = potentialSegment[1];
                        pointForFindingNextSeg = potentialSegment[0];
                        return true;
                    }
                });
                if (!foundNextSegment) {
                    contours.push(currContour.slice());
                    currContour = [];
                    if (unvisitedSegments.length > 0) {
                        currSegment = unvisitedSegments[0];
                        pointToPush = currSegment[0];
                        pointForFindingNextSeg = currSegment[1];
                    }
                }
            }
            return contours;
        };
        nonBufferGeometry.computeBoundingBox();
        let planeHeight = nonBufferGeometry.boundingBox.min.y;
        let maxHeight = nonBufferGeometry.boundingBox.max.y;
        let xzPlane, segments, layerContours;
        let contoursPerLayer = [];
        while (planeHeight <= maxHeight) {
            // NOTE: constant should be negative because plane -> origin distance
            // is downward
            xzPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -planeHeight);
            segments = calcSegmentsForPlane(xzPlane);
            layerContours = calcContoursForLayerSegment(segments);
            contoursPerLayer.push(layerContours);
            planeHeight += this.layerHeight;
        }
        return contoursPerLayer;
    };

    /**
     * Creates a new pane and draws contours.
     *
     * @param {Vector3[][]} contours - An array of layers, where each layer is
     *                                 an array of Vector3 points.
     * @return {void}
     */
    visualizeContours(contours) {
        addPaneDomWithType('blank3d');
        let layerHeightShapesPairs = contours.map((contours) => {
            let sliceHeight = contours[0] && contours[0][0].y;
            let shapes = contours.map((contour) => {
                let pts2d = contour.map((vec3) => new THREE.Vector2(vec3.x, vec3.z));
                let shape = new THREE.Shape(pts2d);
                return shape;
            });
            return [sliceHeight, shapes];
        });
        layerHeightShapesPairs.forEach((heightShapePair) => {
            let height = heightShapePair[0];
            let shapes = heightShapePair[1];
            let geometries = shapes.map((shape) => new THREE.ShapeGeometry(shape));
            let edgeGeometries = geometries.map((geom) => new THREE.EdgesGeometry(geom))
            let lines = edgeGeometries.map((geom) => new THREE.LineSegments(geom, LINE_MATERIAL));
            lines.forEach((line) => {
                line.translateZ(height);
                scenes[activePaneIndex].add(line);
            });
        });
        return layerHeightShapesPairs;
    };

}

export { Slicer };

