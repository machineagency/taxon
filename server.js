'use strict';

// modules =================================================
const express        = require('express');
const app            = express();
const bodyParser     = require('body-parser');
const path           = require('path');
const fs             = require('fs');
const mongoClient    = require('mongodb').MongoClient;

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
        db.collection('machines').find().toArray()
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
        // TODO: get machine that matches name? id?
    })

    app.put('/machine', (req, res) => {
        db.collection('machines').insertOne(req.body)
        .then(() => {
            res.status(200).json({
                message: 'success'
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

