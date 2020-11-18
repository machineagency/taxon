'use strict';

class TestPrograms {

    static newMachine = `{
  "name": "newMachine",
  "buildEnvironment": {
    "width": 500,
    "length": 500
  },
  "motors": [ ],
  "blocks": [ ],
  "connections": [ ],
  "references": { }
}`;

    static prusaMachine = `{
  "name": "prusa",
  "buildEnvironment": {
    "width": 500,
    "length": 500
  },
  "motors": [
    {
      "id": "_wspzkqtt4",
      "name": "leadscrew motor a",
      "componentType": "Motor",
      "dimensions": {
        "width": 25,
        "height": 25,
        "length": 25
      },
      "kinematics": "directDrive",
      "invertSteps": false,
      "drivenStages": [
        {
          "id": "_xqtko21l8",
          "name": "z leadscrew a"
        }
      ],
      "position": {
        "x": 35,
        "y": 25.1,
        "z": -100
      }
    },
    {
      "id": "_76jz1l8m3",
      "name": "leadscrew motor b",
      "componentType": "Motor",
      "dimensions": {
        "width": 25,
        "height": 25,
        "length": 25
      },
      "kinematics": "directDrive",
      "invertSteps": false,
      "drivenStages": [
        {
          "id": "_c1nf4uf24",
          "name": "z leadscrew b"
        }
      ],
      "position": {
        "x": 35,
        "y": 25.1,
        "z": 100
      }
    },
    {
      "id": "_3dg6fxkhj",
      "name": "platform belt motor",
      "componentType": "Motor",
      "dimensions": {
        "width": 25,
        "height": 25,
        "length": 25
      },
      "kinematics": "directDrive",
      "invertSteps": true,
      "drivenStages": [
        {
          "id": "_4jqi7hfnt",
          "name": "platform belt"
        }
      ]
    },
    {
      "id": "_1ixp2wekj",
      "name": "carriage belt motor",
      "componentType": "Motor",
      "dimensions": {
        "width": 25,
        "height": 25,
        "length": 25
      },
      "kinematics": "directDrive",
      "invertSteps": false,
      "drivenStages": [
        {
          "id": "_mop0u2z1w",
          "name": "carriage belt"
        }
      ]
    }
  ],
  "blocks": [
    {
      "id": "_bccb07fca",
      "name": "build plate",
      "componentType": "Platform",
      "dimensions": {
        "length": 130,
        "width": 130,
        "height": 10
      }
    },
    {
      "id": "_4jqi7hfnt",
      "name": "platform belt",
      "componentType": "LinearStage",
      "dimensions": {
        "width": 165,
        "height": 25,
        "length": 25
      },
      "drivingMotors": [
        {
          "id": "_3dg6fxkhj"
        }
      ],
      "attributes": {
        "driveMechanism": "timingBelt",
        "stepDisplacementRatio": 0.7
      },
      "position": {
        "x": 0,
        "y": 25.1,
        "z": 0
      }
    },
    {
      "id": "_mop0u2z1w",
      "name": "carriage belt",
      "componentType": "LinearStage",
      "dimensions": {
        "width": 12.5,
        "height": 25,
        "length": 210
      },
      "drivingMotors": [
        {
          "id": "_1ixp2wekj"
        }
      ],
      "attributes": {
        "driveMechanism": "timingBelt",
        "stepDisplacementRatio": 0.5
      }
    },
    {
      "id": "_xqtko21l8",
      "name": "z leadscrew a",
      "componentType": "LinearStage",
      "dimensions": {
        "width": 10,
        "height": 150,
        "length": 10
      },
      "drivingMotors": [
        {
          "id": "_wspzkqtt4"
        }
      ],
      "attributes": {
        "driveMechanism": "leadscrew",
        "stepDisplacementRatio": 0.5
      }
    },
    {
      "id": "_c1nf4uf24",
      "name": "z leadscrew b",
      "componentType": "LinearStage",
      "dimensions": {
        "width": 10,
        "height": 150,
        "length": 10
      },
      "drivingMotors": [
        {
          "id": "_76jz1l8m3"
        }
      ],
      "attributes": {
        "driveMechanism": "leadscrew",
        "stepDisplacementRatio": 0.5
      }
    },
    {
      "id": "_qbpp87ejx",
      "name": "hotend",
      "componentType": "ToolAssembly",
      "dimensions": {
        "width": 12.5,
        "height": 25,
        "length": 25
      }
    },
    {
      "id": "_9j7xrk6xl",
      "name": "extruder",
      "componentType": "Tool",
      "dimensions": {
        "width": 10,
        "height": 25,
        "length": 10
      }
    }
  ],
  "connections": [
    {
      "baseBlock": "_wspzkqtt4",
      "baseBlockName": "leadscrew motor a",
      "baseBlockFace": "-y",
      "baseBlockEnd": "0",
      "addBlock": "_xqtko21l8",
      "addBlockName": "z leadscrew a",
      "addBlockFace": "+y",
      "addBlockEnd": "0"
    },
    {
      "baseBlock": "_76jz1l8m3",
      "baseBlockName": "leadscrew motor b",
      "baseBlockFace": "-y",
      "baseBlockEnd": "0",
      "addBlock": "_c1nf4uf24",
      "addBlockName": "z leadscrew b",
      "addBlockFace": "+y",
      "addBlockEnd": "0"
    },
    {
      "baseBlock": "_4jqi7hfnt",
      "baseBlockName": "platform belt",
      "baseBlockFace": "+x",
      "baseBlockEnd": "0",
      "addBlock": "_3dg6fxkhj",
      "addBlockName": "platform belt motor",
      "addBlockFace": "-x",
      "addBlockEnd": "0"
    },
    {
      "baseBlock": "_4jqi7hfnt",
      "baseBlockName": "platform belt",
      "baseBlockFace": "-y",
      "baseBlockEnd": "0",
      "addBlock": "_bccb07fca",
      "addBlockName": "build plate",
      "addBlockFace": "+y",
      "addBlockEnd": "0"
    },
    {
      "baseBlock": "_xqtko21l8",
      "baseBlockName": "z leadscrew a",
      "baseBlockFace": "+x",
      "baseBlockEnd": "0",
      "addBlock": "_mop0u2z1w",
      "addBlockName": "carriage belt",
      "addBlockFace": "-x",
      "addBlockEnd": "+z"
    },
    {
      "baseBlock": "_c1nf4uf24",
      "baseBlockName": "z leadscrew b",
      "baseBlockFace": "+x",
      "baseBlockEnd": "0",
      "addBlock": "_mop0u2z1w",
      "addBlockName": "carriage belt",
      "addBlockFace": "-x",
      "addBlockEnd": "-z"
    },
    {
      "baseBlock": "_mop0u2z1w",
      "baseBlockName": "carriage belt",
      "baseBlockFace": "+z",
      "baseBlockEnd": "0",
      "addBlock": "_1ixp2wekj",
      "addBlockName": "carriage belt motor",
      "addBlockFace": "-x",
      "addBlockEnd": "+x"
    },
    {
      "baseBlock": "_mop0u2z1w",
      "baseBlockName": "carriage belt",
      "baseBlockFace": "+x",
      "baseBlockEnd": "0",
      "addBlock": "_qbpp87ejx",
      "addBlockName": "hotend",
      "addBlockFace": "-x",
      "addBlockEnd": "0"
    },
    {
      "baseBlock": "_qbpp87ejx",
      "baseBlockName": "hotend",
      "baseBlockFace": "+x",
      "baseBlockEnd": "0",
      "addBlock": "_9j7xrk6xl",
      "addBlockName": "extruder",
      "addBlockFace": "-x",
      "addBlockEnd": "0"
    }
  ],
  "references": {
    "parallelBlockGroups": [
      [
        {
          "id": "_xqtko21l8",
          "name": "z leadscrew a"
        },
        {
          "id": "_c1nf4uf24",
          "name": "z leadscrew b"
        }
      ]
    ],
    "pairedMotorGroups": [],
    "axes": {
      "x": [
        {
          "id": "_4jqi7hfnt",
          "name": "platform belt"
        }
      ],
      "z": [
        {
          "id": "_mop0u2z1w",
          "name": "carriage belt"
        }
      ],
      "y": [
        {
          "id": "_xqtko21l8",
          "name": "z leadscrew a"
        },
        {
          "id": "_c1nf4uf24",
          "name": "z leadscrew b"
        }
      ]
    },
    "workEnvelope": {
      "shape": "box",
      "width": 165,
      "height": 150,
      "length": 210,
      "position": {
        "x": 0,
        "y": 87.6,
        "z": 0
      }
    }
  }
}`;

    static axidrawMachine = `{
    "name": "axidraw",
    "buildEnvironment": {
        "width": 500,
        "length": 500
    },
    "workEnvelope": {
        "shape": "rectangle",
        "width": 250,
        "height": 0,
        "length": 250,
        "position": {
            "x": -92.5,
            "y": 12.6,
            "z": 0
        }
    },
    "motors": [
        {
            "id": "_gtgpe5ykk",
            "name": "MotorA",
            "componentType": "Motor",
            "dimensions": {
                "width": 50,
                "height": 50,
                "length": 50
            },
            "kinematics": "hBot",
            "invertSteps": false,
            "drivenStages": [
                {
                    "id": "_ug8gzod3z",
                    "name": "Bottom"
                },
                {
                    "id": "_nyqtmejvb",
                    "name": "Top"
                }
            ],
            "pairMotorId": "_yro6inmwg",
            "pairMotorType": "a"
        },
        {
            "id": "_yro6inmwg",
            "name": "MotorB",
            "componentType": "Motor",
            "dimensions": {
                "width": 50,
                "height": 50,
                "length": 50
            },
            "kinematics": "hBot",
            "invertSteps": false,
            "drivenStages": [
                {
                    "id": "_ug8gzod3z",
                    "name": "Bottom"
                },
                {
                    "id": "_nyqtmejvb",
                    "name": "Top"
                }
            ],
            "pairMotorId": "_gtgpe5ykk",
            "pairMotorType": "b"
        }
    ],
    "blocks": [
        {
            "id": "_rru0rtooz",
            "name": "Sharpie",
            "componentType": "Tool",
            "dimensions": {
                "width": 10,
                "height": 50,
                "length": 10
            }
        },
        {
            "id": "_um530fh8t",
            "name": "Servo",
            "componentType": "ToolAssembly",
            "dimensions": {
                "width": 12.5,
                "height": 25,
                "length": 50
            }
        },
        {
            "id": "_nyqtmejvb",
            "name": "Top",
            "componentType": "LinearStage",
            "dimensions": {
                "width": 250,
                "height": 25,
                "length": 50
            },
            "drivingMotors": [
                {
                    "id": "_gtgpe5ykk"
                },
                {
                    "id": "_yro6inmwg"
                }
            ],
            "attributes": {
                "driveMechanism": "timingBelt",
                "stepDisplacementRatio": "0.7"
            }
        },
        {
            "id": "_ug8gzod3z",
            "name": "Bottom",
            "componentType": "LinearStage",
            "dimensions": {
                "width": 50,
                "height": 50,
                "length": 250
            },
            "drivingMotors": [
                {
                    "id": "_gtgpe5ykk"
                },
                {
                    "id": "_yro6inmwg"
                }
            ],
            "attributes": {
                "driveMechanism": "timingBelt",
                "stepDisplacementRatio": "0.7"
            },
            "position": {
                "x": 50,
                "y": 37.6,
                "z": 0
            }
        }
    ],
    "connections": [
        {
            "baseBlock": "_ug8gzod3z",
            "baseBlockName": "Bottom",
            "baseBlockFace": "-y",
            "baseBlockEnd": "0",
            "addBlock": "_nyqtmejvb",
            "addBlockName": "Top",
            "addBlockFace": "+y",
            "addBlockEnd": "0"
        },
        {
            "baseBlock": "_nyqtmejvb",
            "baseBlockName": "Top",
            "baseBlockFace": "+x",
            "baseBlockEnd": "0",
            "addBlock": "_um530fh8t",
            "addBlockName": "Servo",
            "addBlockFace": "-x",
            "addBlockEnd": "0"
        },
        {
            "baseBlock": "_ug8gzod3z",
            "baseBlockName": "Bottom",
            "baseBlockFace": "+z",
            "baseBlockEnd": "0",
            "addBlock": "_gtgpe5ykk",
            "addBlockName": "MotorA",
            "addBlockFace": "-z",
            "addBlockEnd": "0"
        },
        {
            "baseBlock": "_ug8gzod3z",
            "baseBlockName": "Bottom",
            "baseBlockFace": "-z",
            "baseBlockEnd": "0",
            "addBlock": "_yro6inmwg",
            "addBlockName": "MotorB",
            "addBlockFace": "+z",
            "addBlockEnd": "0"
        },
        {
            "baseBlock": "_um530fh8t",
            "baseBlockName": "Servo",
            "baseBlockFace": "+x",
            "baseBlockEnd": "0",
            "addBlock": "_rru0rtooz",
            "addBlockName": "Sharpie",
            "addBlockFace": "-x",
            "addBlockEnd": "0"
        }
    ],
    "references": {
        "parallelBlockGroups": [],
        "pairedMotorGroups": [
            [
                {
                    "id": "_gtgpe5ykk",
                    "name": "MotorA",
                    "kinematics": "hBot"
                },
                {
                    "id": "_yro6inmwg",
                    "name": "MotorB",
                    "kinematics": "hBot"
                }
            ]
        ],
        "axes": {
            "x": [
                {
                    "id": "_nyqtmejvb",
                    "name": "Top"
                }
            ],
            "z": [
                {
                    "id": "_ug8gzod3z",
                    "name": "Bottom"
                }
            ]
        },
        "workEnvelope": {
            "shape": "rectangle",
            "width": 250,
            "height": 0,
            "length": 250,
            "position": {
                "x": -92.5,
                "y": 12.6,
                "z": 0
            }
        }
    }
}`;

    static testDrawJob = `G92
G0 X0 Y0 Z0
G0 X0 Y0 Z20
G0 X20 Y0 Z20
G0 X20 Y0 Z0
G0 X0 Y0 Z0`;

    static testPrintJob = `G92
G0 X0 Y-20 Z0
G0 X0 Y-20 Z20
G0 X20 Y-20 Z20
G0 X20 Y-20 Z0
G0 X0 Y0 Z0`;

    static pikachuPrintStart =`
G92 E0
M109 S210
G0 F15000 X9 Y6 Z2
G280
G1 F1500 E-6.5
;LAYER_COUNT:295
;LAYER:0
M107
M204 S625
M205 X6 Y6
G0 F4285.7 X101.053 Y86.749 Z0.27
M204 S500
M205 X5 Y5
;TYPE:SKIRT
G1 F1500 E0
G1 F1200 X101.573 Y86.216 E0.01324
G1 X102.147 Y85.742 E0.02647
G1 X102.54 Y85.483 E0.03484
G1 X102.61 Y85.409 E0.03665
G1 X102.992 Y85.069 E0.04574
G1 X103.112 Y84.97 E0.0485
G1 X103.711 Y84.528 E0.06174
G1 X104.216 Y84.233 E0.07213
G1 X104.4 Y84.075 E0.07644
G1 X105.013 Y83.653 E0.08967
G1 X105.668 Y83.3 E0.1029
G1 X106.208 Y83.072 E0.11332
G1 X106.436 Y82.987 E0.11764
G1 X107.147 Y82.764 E0.13089
G1 X107.877 Y82.62 E0.14412
G1 X108.618 Y82.554 E0.15734
G1 X109.362 Y82.568 E0.17057
G1 X109.519 Y82.588 E0.17338
G1 X109.815 Y82.001 E0.18507
G1 X110.219 Y81.376 E0.1983
G1 X110.688 Y80.798 E0.21153
G1 X111.217 Y80.274 E0.22476
G1 X111.798 Y79.81 E0.23798
G1 X112.427 Y79.41 E0.25123
G1 X113.094 Y79.08 E0.26446
G1 X113.793 Y78.824 E0.27769
G1 X114.515 Y78.644 E0.29092
G1 X115.18 Y78.549 E0.30286
G1 X115.992 Y78.473 E0.31736
G1 X116.736 Y78.444 E0.33059
G1 X117.479 Y78.494 E0.34383
G1 X118.211 Y78.624 E0.35705
G1 X118.488 Y78.705 E0.36218
G1 X119.145 Y78.484 E0.3745
G1 X119.872 Y78.323 E0.38773
G1 X120.612 Y78.242 E0.40097
G1 X121.356 Y78.24 E0.41419
G1 X121.728 Y78.269 E0.42082
G1 X122.74 Y78.376 E0.43891
G1 X123.475 Y78.494 E0.45215
G1 X124.193 Y78.69 E0.46538
G1 X124.885 Y78.962 E0.47859
G1 X125.545 Y79.307 E0.49183
G1 X126.164 Y79.72 E0.50506
G1 X126.735 Y80.198 E0.5183
G1 X127.252 Y80.734 E0.53154
G1 X127.708 Y81.322 E0.54476
G1 X128.098 Y81.956 E0.55799
G1 X128.355 Y82.496 E0.56862
G1 X128.421 Y82.489 E0.5698
G1 X129.165 Y82.485 E0.58303
G1 X129.905 Y82.562 E0.59625
G1 X130.633 Y82.718 E0.60949
G1 X131.218 Y82.904 E0.6204
G1 X131.446 Y82.988 E0.62472
G1 X132.129 Y83.283 E0.63795
G1 X132.777 Y83.649 E0.65117
G1 X133.382 Y84.082 E0.6644
G1 X133.445 Y84.138 E0.6659
G1 X133.579 Y84.205 E0.66856
G1 X134.206 Y84.606 E0.68179
G1 X134.566 Y84.884 E0.68988
G1 X134.685 Y84.982 E0.69262
G1 X135.063 Y85.328 E0.70173
G1 X135.141 Y85.372 E0.70332
G1 X135.747 Y85.804 E0.71655
G1 X136.303 Y86.299 E0.72978
G1 X136.803 Y86.85 E0.74301
G1 X137.241 Y87.452 E0.75624
G1 X137.475 Y87.839 E0.76428
G1 X137.592 Y88.048 E0.76854
G1 X137.92 Y88.716 E0.78177
G1 X138.175 Y89.415 E0.79499
G1 X138.353 Y90.138 E0.80823
G1 X138.453 Y90.876 E0.82147
G1 X138.472 Y91.62 E0.8347
G1 X138.413 Y92.362 E0.84793
G1 X138.273 Y93.093 E0.86116
G1 X138.057 Y93.805 E0.87438
G1 X137.765 Y94.489 E0.8876
G1 X137.543 Y94.904 E0.89597
G1 X132.492 Y103.632 E1.07523
G1 X132.439 Y103.78 E1.07802
G1 X132.113 Y104.449 E1.09125
G1 X131.717 Y105.079 E1.10448
G1 X131.255 Y105.663 E1.11771
G1 X130.734 Y106.195 E1.13095
G1 X130.159 Y106.667 E1.14417
G1 X129.495 Y107.099 E1.15826
G1 X127.893 Y108.015 E1.19106
G1 X126.779 Y120.297 E1.41028
G1 X126.672 Y121.034 E1.42352
G1 X126.486 Y121.755 E1.43675
G1 X126.225 Y122.451 E1.44997
G1 X125.89 Y123.116 E1.4632
G1 X125.486 Y123.741 E1.47643
    `
}

export { TestPrograms };
