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

// connect to db ===========================================
const url = 'mongodb://127.0.0.1:27017/strange-machine';
mongoClient.connect(url, { useUnifiedTopology: true })
    .then(client => {
        console.log('Connected to Database');
        const db = client.db('strange-machine');
        attachRoutesWithDBAndStart(db);
    })
    .catch(error => console.error(error));

// routes and start ========================================

let attachRoutesWithDBAndStart = (db) => {
    app.get('/machines', (req, res) => {
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
    });

    app.put('/machines', (req, res) => {
        // TODO: insert array of machines
    });

    app.get('/machine', (req, res) => {
        const idOfMachineToFind = ObjectID(req.body['_id']);
        console.log(idOfMachineToFind);
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
        const idOfMachineToFind = ObjectID(req.body['_id']);
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

