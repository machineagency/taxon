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
            dbFilters = { $and : [
                dbFilterWorkEnvelope, dbFilterDriveMechanism
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

    app.listen(port, () => {
        console.log("Running on port: " + port);
        exports = module.exports = app;
    });
}

// extras ===========================================
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
                    console.log(fullFilename);
                    let machineObj = JSON.parse(data);
                    db.collection('machines').insertOne(machineObj)
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

