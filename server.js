'use strict';

// modules =================================================
const express        = require('express');
const app            = express();
const bodyParser     = require('body-parser');
const path           = require('path');
const fs             = require('fs');
const mongodb        = require('mongodb');
const mongoClient    = mongodb.MongoClient;
const ObjectID       = mongodb.ObjectID;

// configuration ===========================================
let port = process.env.PORT || 3000; // set our port
app.use(bodyParser.json()); // for parsing application/json
app.use(express.static(__dirname + '/client')); // set the static files location /public/img will be /img for users
const DO_SEED_DATABASE = true;
const MACHINE_DIR = './machine_programs/';

// connect to db ===========================================
const url = 'mongodb://127.0.0.1:27017/strange-machine';
mongoClient.connect(url, { useUnifiedTopology: true })
    .then(client => {
        console.log('Connected to Database');
        const db = client.db('strange-machine');
        if (DO_SEED_DATABASE) {
            console.log('Seeding the dabase');
            seedDatabase(db);
        }
        attachRoutesWithDBAndStart(db);
    })
    .catch(error => console.error(error));

// routes and start ========================================

let attachRoutesWithDBAndStart = (db) => {

    app.get('/machines', (req, res) => {
        let dbFilters, dbFilterWorkEnvelope, dbFilterDriveMechanism;
        if (req.query.filter === 'true') {
            const mWidth = parseInt((req.query.width || 0), 10);
            const mHeight = parseInt((req.query.height || 0), 10);
            const mLength = parseInt((req.query.length || 0), 10);
            const includeLeadscrew = req.query.leadscrew === 'true';
            const includeTimingBelt = req.query.timingBelt === 'true';
            const includeRackAndPinion = req.query.rackAndPinion === 'true';
            const includeXYPlatform = req.query.includeXYPlatform === 'true';
            // MACHINE TYPE
            // TODO: do machine type query, also make this entire thing another fn
            // WORK ENVELOPE
            dbFilterWorkEnvelope = {
                $and : [
                    { 'workEnvelope.width' : { $gte : mWidth } },
                    { 'workEnvelope.height' : { $gte : mHeight } },
                    { 'workEnvelope.length' : { $gte : mLength } }
                ]
            };
            // DRIVE MECHANISMS
            let queryLeadscrew = {
                'blocks' : { $elemMatch :
                    { 'attributes.driveMechanism' : 'leadscrew' }
                }
            };
            let queryTimingBelt = {
                'blocks' : { $elemMatch :
                    { 'attributes.driveMechanism' : 'timingBelt' }
                }
            };
            let queryRackAndPinion = {
                'blocks' : { $elemMatch :
                    { 'attributes.driveMechanism' : 'rackAndPinion' }
                }
            };
            let driveQueries = [];
            if (includeLeadscrew) driveQueries.push(queryLeadscrew);
            if (includeTimingBelt) driveQueries.push(queryTimingBelt);
            if (includeRackAndPinion) driveQueries.push(queryRackAndPinion);
            dbFilterDriveMechanism = { $and : driveQueries };
            // XY PLATFORM
            let dbIncludeXYPlatform = {
                'blocks' : { $elemMatch :
                    { 'componentType' : 'Platform' }
                }
            };
            // STRUCTURAL LOOP
            // TODO: SL above, also should we make everything exclude instead?
            dbFilters = { $and : [
                dbFilterWorkEnvelope,
                dbFilterDriveMechanism,
                dbIncludeXYPlatform
            ] };
        }
        else {
            dbFilters = {};
        }
        db.collection('machines').find(dbFilters)
        .sort({ name: 1 })
        .toArray()
        .then((results) => {
            res.status(200).json({
                machines: results
            });
        })
        .catch((error) => {
            res.status(500).json({
                message: error
            })
        });
    });

    app.put('/machines', (req, res) => {
        // TODO: insert array of machines
    });

    app.get('/machine', (req, res) => {
        const idOfMachineToFind = ObjectID(req.query.id);
        db.collection('machines').find({
            '_id': idOfMachineToFind
        })
        .toArray()
        .then((results) => {
            let statusCode = results.length === 0 ? 404 : 200;
            res.status(statusCode).json({
                machine: results
            });
        })
        .catch((error) => {
            res.status(500).json({
                message: error
            })
        });
    });

    app.put('/machine', (req, res) => {
        const idOfMachineToFind = ObjectID(req.body._id);
        db.collection('machines').replaceOne({
            '_id': idOfMachineToFind
        }, req.body)
        .then((results) => {
            res.status(200).json({
                message: results
            });
        })
        .catch((error) => {
            res.status(500).json({
                message: error
            })
        });
    });

    app.post('/machine', (req, res) => {
        console.log('Posting...');
        console.log(req.body);
        db.collection('machines').insertOne(req.body)
        .then((results) => {
            res.status(200).json({
                message: results
            });
        })
        .catch((error) => {
            res.status(500).json({
                message: error
            })
        });
    });

    app.delete('/machine', (req, res) => {
        const idOfMachineToFind = ObjectID(req.query.id);
        db.collection('machines').deleteOne({
            '_id': idOfMachineToFind
        })
        .then((results) => {
            let statusCode = results.length === 0 ? 404 : 200;
            res.status(statusCode).json({
                machine: results
            });
        })
        .catch((error) => {
            res.status(500).json({
                message: error
            })
        });
    });

    app.get('/rots', (req, res) => {
        db.collection('rots').find()
        .sort({ name: 1 })
        .toArray()
        .then((results) => {
            res.status(200).json({
                rots: results
            });
        })
        .catch((error) => {
            res.status(500).json({
                message: error
            })
        });
    });

    app.get('/rot', (req, res) => {
        const machineId = ObjectID(req.query.id);
        db.collection('rots').find({
            'machineDbId': machineId
        })
        .toArray()
        .then((results) => {
            let statusCode = results.length === 0 ? 404 : 200;
            res.status(statusCode).json({
                rot: results
            });
        })
        .catch((error) => {
            res.status(500).json({
                message: error
            })
        });
    });

    app.listen(port, () => {
        console.log("Running on port: " + port);
        exports = module.exports = app;
    });
}

// extras ===========================================

class Constants {

    static speedScores = {
        'leadscrew': -1,
        'timingBelt': 1,
        'rackAndPinion': 0
    };
    static rigidityScores = {
        'leadscrew': 1,
        'timingBelt': -1,
        'rackAndPinion': 0
    };
    static toolTypeToManufacturingStrategy = {
        'print3dFDM': 'additive',
        'print3dSLA': 'additive',
        'mill': 'subtractive',
        'blade': 'subtractive',
        'pen' : 'drawing',
        'gripper': 'formative',
        'camera': 'nonManufacturing',
        'blankTool': 'nonManufacturing'
    }
    static toolTypeToMaterials = {
        'print3dFDM': ['plastic'],
        'print3dSLA': ['plastic'],
        'mill': ['wood', 'metal'],
        'blade': ['paper'],
        'pen' : ['paper'],
        'gripper': ['plastic', 'wood', 'metal'],
        'camera': [],
        'blankTool': []
    }
}

let determineMachineAxes = (machine) => {
    let stages = machine.blocks.filter((block) => block.axes !== undefined);
    let allAxes = stages.map((block) => block.axes).flat();
    let uniqueAxes = allAxes.filter((axis, idx) => {
        return allAxes.indexOf(axis) === idx;
    });
    let axisToStageLists = {};
    uniqueAxes.forEach((axis) => {
        axisToStageLists[axis] = stages.filter((stage) => {
            return stage.axes.indexOf(axis) !== -1;
        });
    });
    return axisToStageLists;
}

let calculateRotFromMachine = (machine) => {
    let manufacturingStrategy = machine.tools.map((t) => {
        return Constants.toolTypeToManufacturingStrategy[t.toolType];
    });
    let acceptableMaterials = machine.tools.map((t) => {
        return Constants.toolTypeToMaterials[t.toolType];
    }).flat();
    let axisToBlocks = determineMachineAxes(machine);
    let axisToSpeedScores = {},
        axisToRigidityScores = {},
        axisToResolutions = {};
    Object.entries(axisToBlocks).forEach((entry) => {
        let axis = entry[0];
        let blocks = entry[1];
        let axisMechanisms = blocks.map(b => b.attributes.driveMechanism);
        let speedScores = axisMechanisms.map(m => Constants.speedScores[m]);
        let rigidityScores = axisMechanisms.map(m => Constants.rigidityScores[m]);
        let axisRatios = blocks.map(b => b.attributes.stepDisplacementRatio);
        let axisSpeedScore = speedScores.reduce((a, c) => a + c);
        let axisRigidityScore = rigidityScores.reduce((a, c) => a + c);
        let axisResolution = Math.max(...axisRatios);
        axisToSpeedScores[axis] = axisSpeedScore;
        axisToRigidityScores[axis] = axisRigidityScore;
        axisToResolutions[axis] = axisResolution;
    })
    let rot = {
        manufacturingStrategy: manufacturingStrategy,
        acceptableMaterials: acceptableMaterials,
        workEnvelopeDimensions: machine.workEnvelope.dimensions,
        xStats: {
            speed: axisToSpeedScores.x,
            rigidity: axisToRigidityScores.x,
            resolution: axisToResolutions.x
        },
        yStats: {
            speed: axisToSpeedScores.y,
            rigidity: axisToRigidityScores.y,
            resolution: axisToResolutions.y,
        },
        zStats: {
            speed: axisToSpeedScores.z,
            rigidity: axisToRigidityScores.z,
            resolution: axisToResolutions.z
        },
        structuralLoopLength: 9000,
        goodForMilling: false,
    };
    return rot;
};

let seedDatabase = (db) => {
    db.dropDatabase()
    .then((_) => {
        fs.readdir(MACHINE_DIR, (err, files) => {
            if (err) {
                throw err;
            }
            files.forEach((filename) => {
                if (filename[0] === '.') {
                    return;
                }
                let fullFilename = MACHINE_DIR + filename;
                fs.readFile(fullFilename, (err, data) => {
                    if (err) {
                        throw err;
                    }
                    console.log(`Loading and computing RoT for ${fullFilename}.`);
                    let machineObj = JSON.parse(data);
                    db.collection('machines').insertOne(machineObj)
                    .then((result) => {
                        let machineDbId = result.insertedId;
                        let rotObj = calculateRotFromMachine(machineObj);
                        rotObj.machineDbId = machineDbId;
                        db.collection('rots').insertOne(rotObj)
                        .catch((error) => {
                            throw error;
                        });
                    })
                    .catch((error) => {
                        throw error;
                    });
                });
            });
        });
    })
    .catch((error) => {
        throw error;
    });
};

