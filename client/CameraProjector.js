'use strict';

import * as THREE from './build/three.module.js';

class CameraProjector {
    static baseUrl = 'http://localhost:3000/rpc/';

    constructor() {
    }

    async choosePoint() {
        // TODO: pass work envelope dimensions
        let rpcUrl = CameraProjector.baseUrl.concat('choosePoint');
        console.log(rpcUrl);
        let response = await fetch(rpcUrl, {
            method: 'GET'
        });
        if (response.ok) {
            let json = await response.json();
            let pointObj = json.results;
            console.log(pointObj);
        }
        else {
            console.error(response.text);
        }
    }

    loadFromFile(fileName) {
    }

    connectToCamera() {
    }

    renderBitmapToScene(strangeScene) {
    }
}

export { CameraProjector };

