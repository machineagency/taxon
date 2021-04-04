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
const MACHINE_DIR = './program_database/';

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
        // CASE: there is a request property ID -> just search for
        //       a single machine by id and do not filter
        if (req.query.id) {
            const idOfMachineToFind = ObjectID(req.query.id);
            db.collection('machines').find({
                '_id': idOfMachineToFind
            })
            .toArray()
            .then((results) => {
                let statusCode = results.length === 0 ? 404 : 200;
                res.status(statusCode).json({
                    results: results
                });
            })
            .catch((error) => {
                res.status(500).json({
                    message: error
                })
            });
        }
        // CASE: ROT id array is provided -> search for the ROTs in the database
        //       -> get full list of machines -> run ROT as a JS filter over
        //       the list, ANDing the results -> respond with remaining list
        else if (req.query.rotIds) {
            const rotArrRaw = req.query.rotIds.split(',');
            const rotIds = rotArrRaw.map(rid => ObjectID(rid));
            db.collection('rots').find({
                _id: {
                    $in: rotIds
                },
                type: 'filtering'
            })
            .toArray()
            .then((rots) => {
                if (!rots || rots.length === 0) {
                    throw 'Could not find rules of thumb.';
                }
                db.collection('machines').find()
                .sort({ name: 1 })
                .toArray()
                .then((machineList) => {
                    let rotCodes = rots.map(rot => rot.code);
                    let rotFns = rotCodes.map(code => eval(code));
                    let totalFilter = (machine) => {
                        let resultBooleans = rotFns.map(rotFn => rotFn(machine));
                        return resultBooleans.reduce((acc, currEl) => {
                            return acc && currEl;
                        }, true);
                    }
                    let filteredMachines = machineList.filter(totalFilter);
                    res.status(200).json({
                        results: filteredMachines
                    });
                });
            })
            .catch((error) => {
                res.status(500).json({
                    message: error
                })
            });
        }
        // CASE: no queries -> list all machines without searching RoTs
        else {
            db.collection('machines').find()
            .sort({ name: 1 })
            .toArray()
            .then((results) => {
                res.status(200).json({
                    results: results
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

    app.post('/machines', (req, res) => {
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

    app.delete('/machines', (req, res) => {
        const idOfMachineToFind = ObjectID(req.query.id);
        db.collection('machines').deleteOne({
            '_id': idOfMachineToFind
        })
        .then((results) => {
            let statusCode = results.length === 0 ? 404 : 200;
            res.status(statusCode).json({
                results: results
            });
        })
        .catch((error) => {
            res.status(500).json({
                message: error
            })
        });
    });

    app.get('/metricsPrograms', (req, res) => {
        // CASE: there is a request property ID -> just search for
        //       a single metrics program
        if (req.query.id) {
            const metricsId = ObjectID(req.query.id);
            db.collection('metricsPrograms').find({
                '_id': metricsId
            })
            .toArray()
            .then((results) => {
                let statusCode = results.length === 0 ? 404 : 200;
                res.status(statusCode).json({
                    results: results
                });
            })
            .catch((error) => {
                res.status(500).json({
                    message: error
                })
            });
        }
        // CASE: there are filter params -> filter and return all
        //       possible metrics programs
        else {
            let filter = makeFilterFromQuery(req.query);
            db.collection('metricsPrograms').find(filter)
            .sort({ name: 1 })
            .toArray()
            .then((results) => {
                res.status(200).json({
                    results: results
                });
            })
            .catch((error) => {
                res.status(500).json({
                    message: error
                })
            });
        }
    });

    app.get('/partsPrograms', (req, res) => {
        db.collection('partsPrograms').find()
        .sort({ name: 1 })
        .toArray()
        .then((results) => {
            res.status(200).json({
                results: results
            });
        })
        .catch((error) => {
            res.status(500).json({
                message: error
            })
        });
    });

    app.get('/partsProgram', (req, res) => {
        const progId = ObjectID(req.query.id);
        db.collection('partsPrograms').find({
            '_id': progId
        })
        .toArray()
        .then((results) => {
            let statusCode = results.length === 0 ? 404 : 200;
            res.status(statusCode).json({
                results: results
            });
        })
        .catch((error) => {
            res.status(500).json({
                message: error
            })
        });
    });

    app.get('/workflows', (req, res) => {
        const filter = req.query.id ? { '_id': ObjectID(req.query.id) } : {};
        db.collection('workflows').find(filter)
        .sort({ name: 1 })
        .toArray()
        .then((results) => {
            let statusCode = results.length === 0 ? 404 : 200;
            res.status(statusCode).json({
                results: results
            });
        })
        .catch((error) => {
            res.status(500).json({
                message: error
            })
        });
    });

    app.get('/rots', (req, res) => {
        let filter;
        if (req.query.ids) {
            const rotArrRaw = req.query.ids.split(',');
            const rotIds = rotArrRaw.map(rid => ObjectID(rid));
            filter = {
                _id: {
                    $in: rotIds
                },
                type: 'filtering'
            };
        }
        else {
            filter = {};
        }
        db.collection('rots').find(filter)
        .sort({ name: 1 })
        .toArray()
        .then((results) => {
            let statusCode = results.length === 0 ? 404 : 200;
            res.status(statusCode).json({
                results: results
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
    let stages = machine.blocks.filter(b => b.axes !== undefined);
    let allAxes = stages.map(b => b.axes).flat();
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
    let tools = machine.blocks.filter(b => b.isTool);
    let manufacturingStrategies = tools.map((t) => {
        return Constants.toolTypeToManufacturingStrategies[t.attributes.toolType];
    });
    let acceptableMaterials = tools.map((t) => {
        return Constants.toolTypeToMaterials[t.attributes.toolType];
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
    const plansDir = MACHINE_DIR + 'machine_plans/';
    const workflowsDir = MACHINE_DIR + 'workflows/';
    const rotsDir = MACHINE_DIR + 'rules_of_thumb/';
    db.dropDatabase()
    .then((_) => {
        fs.readdir(plansDir, (err, files) => {
            if (err) {
                throw err;
            }
            files.forEach((filename) => {
                if (filename[0] === '.') {
                    return;
                }
                let fullFilename = plansDir + filename;
                fs.readFile(fullFilename, (err, data) => {
                    if (err) {
                        throw err;
                    }
                    console.log(`Loading machine plan: ${filename}.`);
                    let machineObj = JSON.parse(data);
                    db.collection('machines').insertOne(machineObj);
                });
            });
        });
    })
    .then((_) => {
        fs.readdir(workflowsDir, (err, files) => {
            if (err) {
                throw err;
            }
            files.forEach((filename) => {
                if (filename[0] === '.') {
                    return;
                }
                let fullFilename = workflowsDir + filename;
                fs.readFile(fullFilename, (err, data) => {
                    if (err) {
                        throw err;
                    }
                    console.log(`Loading workflow: ${filename}.`);
                    let workflowObj = JSON.parse(data);
                    db.collection('workflows').insertOne(workflowObj);
                });
            });
        });
    })
    .then((_) => {
        fs.readdir(rotsDir, (err, files) => {
            if (err) {
                throw err;
            }
            files.forEach((filename) => {
                if (filename[0] === '.') {
                    return;
                }
                let fullFilename = rotsDir + filename;
                fs.readFile(fullFilename, (err, data) => {
                    if (err) {
                        throw err;
                    }
                    console.log(`Loading rule of thumb: ${filename}.`);
                    let rotObj = JSON.parse(data);
                    db.collection('rots').insertOne(rotObj);
                });
            });
        });
    })
    .catch((error) => {
        throw error;
    });
};

