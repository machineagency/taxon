'use strict';

import * as dat from '/build/dat.gui.module.js';

class StrangeGui {

    constructor(kinematics) {
        if (kinematics === undefined) {
            console.error('Need kinematics to inflate the GUI');
        }
        this.kinematics = kinematics;
        this.datGui = new dat.GUI();
        // TODO
        this.archTree = null;
        this.initializeDatGui();
    }

    initializeDatGui() {
        this.__addBlocksToDatGui();
        this.__addMotorsToDatGui();
    }

    __addBlocksToDatGui() {
        this.blocksFolder = this.datGui.addFolder('Blocks');
        this.kinematics.machine.blocks.forEach((block) => {
            let blockFolder = this.blocksFolder.addFolder(block.name);
            blockFolder.add(block, 'componentType');
            blockFolder.add(block.position, 'x');
            blockFolder.add(block.position, 'y');
            blockFolder.add(block.position, 'z');
            blockFolder.add(block, 'width');
            blockFolder.add(block, 'height');
            blockFolder.add(block, 'length');
            if (block.attributes !== undefined) {
                if (block.attributes.driveMechanism !== undefined) {
                    blockFolder.add(block.attributes, 'driveMechanism');
                }
                if (block.attributes.stepDisplacementRatio !== undefined) {
                    blockFolder.add(block.attributes, 'stepDisplacementRatio');
                }
            }
        });
    }

    __addMotorsToDatGui() {
        this.blocksFolder = this.datGui.addFolder('Motors');
        this.kinematics.machine.motors.forEach((motor) => {
            this.blocksFolder.add(motor, 'name');
        });
    }
}

export { StrangeGui };
