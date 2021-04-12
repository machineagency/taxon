# taxon

A grammar of digital fabrication machines.

## About

The code for taxon comprises server and client code to run the Taxon interface in a web browser.
Client-side code renders the interface and also compiles Taxon programs to simulations (center of interface) and heuristics.
Client-side code also allows you to script machine actions as _procedures_ in the tool.

## Installation

Installation consists of three parts: running a MongoDB instance which is required by the server, then installing and running the server itself.

### Running MongoDB

**You must run a MongoDB instance locally to use Taxon.**
Cloud-based instances are not yet available (sorry!).
Follow instructions [here](https://docs.mongodb.com/manual/installation/) to install MongoDb.
Then, run a MongoDB instance e.g. on a Mac with: `mongod --dbpath=~/data`, which uses your home directory as the data directory.
Make sure line the server URL line in `server.js` matches the current MongoDB instance, e.g.

```
const url = 'mongodb://127.0.0.1:27017/';
```

You may have to edit the address to port to match your instance.

### Setting Up

1. Clone the repository.
2. Run `npm install`.

### Running the Server

1. Ensure that you have a MongoDB instance running!
2. Run `node server`.
3. Navigate to `localhost:3000` in your favorite browser.

## Writing Taxon Programs

Taxon programs (examples can be found in `program_database/`), with several subdirectories:

- `machine_plans/` JSON files containing the metrics and blocks of each machine.
- `workflows/` JSON files containing arrays of actions as strings.
- `rules_of_thumb/` each rule of thumb has a JSON metadata file and a JS file of the same name that contains the Javascript implementation.
- `parts/`: part of future work, do not use it right now.

Whenever you run `node server`, the server code will drop the current database, look at every `.json` file (Taxon program) in `machine_programs/` and parse every file and add it to the database.
If you want to turn this behavior off, set the line in `server.js`

```
const DO_SEED_DATABASE = true;
```

to false.

If there are any syntax errors in any of the JSON files, the server will print a humongous error message.
To add a new Taxon program, I recommend making a new file with the top-level structure as indicated above.
Then, copy and paste blocks, motors, etc. from an existing file into the new file, and restart the server and load the new machine in the browser to see the results.
It's unfortunately not at all the fastest way to write programs right now, but futher composition tools and error checking for wellformedness of Taxon programs is forthcoming.

## Known Issues

- Currently, kinematics calculation for machines with moving platforms is not currently working correctly when
it comes to extruding material. We were not able to fix this before the deadline. If you want to use a workflow that extrudes material (second argument of `$machine.moveTo(coords, extrude)` is not empty) after having used a machine with a moving platform, then you need to refresh the page first.
- If you get an error message in the console that looks like a Javascript error message, open up the web browser console to investigate what the issue is.

