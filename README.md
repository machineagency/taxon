# taxon

A grammar of digital fabrication machines.

## About

The code for taxon comprises server and client code to run the Taxon interface in a web browser.
Client-side code renders the interface and also compiles Taxon programs to simulations (center of interface) and heuristics.
Client-side code also allows you to script machine actions as _procedures_ in the tool.

## Installation

Installation consists of three parts: running a MongoDB instance which is required by the server, then installing and running the server itself.

### Running MongoDB

Follow instructions [here](https://docs.mongodb.com/manual/installation/) to install MongoDb.
Then, run a MongoDB instance e.g. on a Mac with: `mongod --dbpath=~/data`, which uses your home directory as the data directory.

### Running the server

1. Clone the repository.
2. Run `npm install`.
3. Run `node server`.
4. Navigate to `localhost:3000` in your favorite browser.

## Short Description of the Grammar

Taxon programs (examples can be found in `machine_programs/`) take the following form at the top level:

```
{
  "name": ...,
  "motors": [ ... ],
  "blocks": [ ... ],
  "tools": [ ... ],
  "connections": [ ... ],
}
```

More to be described later.
