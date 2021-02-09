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
console.log('Looking for MongoDB instance...');
const url = 'mongodb://127.0.0.1:27017/strange-machine';
mongoClient.connect(url, { useUnifiedTopology: true })
    .then(client => {
        console.log('...connected to the database.');
        const db = client.db('strange-machine');
        if (DO_SEED_DATABASE) {
            console.log('Seeding the database.');
            seedDatabase(db);
        }
        attachRoutesWithDBAndStart(db);
    })
    .catch(error => console.error(error));

// routes and start ========================================

let attachRoutesWithDBAndStart = (db) => {

    app.get('/machines', (req, res) => {
        // CASE: queries exist -> search RoTs for machineIds
        //       -> query machines with Ids
        if (Object.keys(req.query).length > 0) {
            let heuristicSetFilter;
            try {
                heuristicSetFilter = makeFilterFromQuery(req.query);
            }
            catch (exceptionText) {
                res.status(400).json({
                    message: exceptionText
                });
                return;
            }
            db.collection('heuristicSets').find(heuristicSetFilter)
            .toArray()
            .then((heuristicSetResults) => {
                let machineIds = heuristicSetResults.map(heuristicSet => heuristicSet.machineDbId);
                let machineFilter = {
                    '_id': { $in : machineIds }
                };
                db.collection('machines').find(machineFilter)
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
        }
        // CASE: no queries -> list all machines without searching RoTs
        else {
            db.collection('machines').find()
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
        }
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

    app.get('/heuristicSets', (req, res) => {
        let filter = makeFilterFromQuery(req.query);
        db.collection('heuristicSets').find(filter)
        .sort({ name: 1 })
        .toArray()
        .then((results) => {
            res.status(200).json({
                heuristicSets: results
            });
        })
        .catch((error) => {
            res.status(500).json({
                message: error
            })
        });
    });

    app.get('/heuristicSet', (req, res) => {
        const machineId = ObjectID(req.query.id);
        db.collection('heuristicSets').find({
            'machineDbId': machineId
        })
        .toArray()
        .then((results) => {
            let statusCode = results.length === 0 ? 404 : 200;
            res.status(statusCode).json({
                heuristicSet: results
            });
        })
        .catch((error) => {
            res.status(500).json({
                message: error
            })
        });
    });

    app.get('/heuristicNames', (req, res) => {
        res.status(200).json({
            heuristicNames: Constants.heuristicNames
        });
    });

    app.listen(port, () => {
        console.log("Running on port: " + port);
        exports = module.exports = app;
    });
}

// extras ===========================================

class Constants {

    static heuristicNames = [
        'manufacturingStrategies',
        'acceptableMaterials',
        'workEnvelopeDimensions',
        'xStats',
        'yStats',
        'zStats',
        'structuralLoopLength',
        'goodForMilling'
    ];

    static speedScores = {
        'leadscrew': -1,
        'timingBelt': 1,
        'rackAndPinion': 0
    };
    static rigidityScores = {
        'leadscrew': 1,
        'timingBelt': -1,
        'rackAndPinion': 1
    };
    static toolTypeToManufacturingStrategies = {
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
    let manufacturingStrategies = machine.tools.map((t) => {
        return Constants.toolTypeToManufacturingStrategies[t.toolType];
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
    let heuristicSet = {
        manufacturingStrategies: manufacturingStrategies,
        acceptableMaterials: acceptableMaterials,
        workEnvelopeDimensions: {
            width: machine.workEnvelope.width,
            height: machine.workEnvelope.height,
            length: machine.workEnvelope.length,
        },
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
    return heuristicSet;
};

let makeFilterFromQuery = (queryObj) => {
    let filter;
    let constraints = [];
    if (Object.keys(queryObj).length > 0) {
        const comparatorRegEx = /[<>=]|(has)/;
        const operatorToDbSymbol = {
            '<': '$lt',
            '>': '$gt',
            '=': '$eq',
        };
        try {
            Object.entries(queryObj).forEach((paramConstraintPair) => {
                let constraintStr = paramConstraintPair[1];
                let operator = constraintStr.match(comparatorRegEx)[0].trim();
                console.assert(operator !== null, constraintStr);
                let operands = constraintStr.split(operator).map(op => op.trim());
                let constraint;
                if (operator === 'has') {
                    constraint = {
                        [operands[0]] : { $elemMatch : { $eq: operands[1] } }
                    };
                }
                else {
                    let dbSymbol = operatorToDbSymbol[operator];
                    constraint = {
                        [operands[0]] : { [dbSymbol] : parseInt(operands[1]) }
                    };
                }
                constraints.push(constraint);
           });
            filter = { $and : constraints };
        }
        catch (e) {
            console.log(`Could not process filter query:`);
            console.log(queryObj);
            throw `Invalid filter query: ${Object.entries(queryObj)}`;
        }
    }
    else {
        filter = {};
    }
    return filter;
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
                    console.log(`Loading and computing heuristicSet for ${fullFilename}.`);
                    let machineObj = JSON.parse(data);
                    db.collection('machines').insertOne(machineObj)
                    .then((result) => {
                        let machineDbId = result.insertedId;
                        let heuristicSetObj = calculateRotFromMachine(machineObj);
                        heuristicSetObj.machineDbId = machineDbId;
                        db.collection('heuristicSets').insertOne(heuristicSetObj)
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

