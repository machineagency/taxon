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

## Writing Taxon Programs

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

At the time of writing, whenever you run `node server`, the server code will look at every `.json` file (Taxon program) in `machine_programs/` and parse every file and add it to the database.
If there are any syntax errors in any of the files, the server will print a humongous error message.
To add a new Taxon program, I recommend making a new file with the top-level structure as indicated above.
Then, copy and paste blocks, motors, etc. from an existing file into the new file, and restart the server and load the new machine in the browser to see the results.
It's unfortunately not at all the fastest way to write programs right now, and if it's a real problem, please let me know.
