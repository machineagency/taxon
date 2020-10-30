'use strict';

class TestPrograms {
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
      "id": "_702tqu61d",
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
          "id": "_1mkon5w30",
          "name": "Bottom"
        },
        {
          "id": "_rauctizr7",
          "name": "Top"
        }
      ],
      "pairMotorId": "_ru5vlo0fl",
      "pairMotorType": "a"
    },
    {
      "id": "_ru5vlo0fl",
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
          "id": "_1mkon5w30",
          "name": "Bottom"
        },
        {
          "id": "_rauctizr7",
          "name": "Top"
        }
      ],
      "pairMotorId": "_702tqu61d",
      "pairMotorType": "b"
    }
  ],
  "blocks": [
    {
      "id": "_u9cjbuxqg",
      "name": "Sharpie",
      "componentType": "Tool",
      "dimensions": {
        "width": 10,
        "height": 50,
        "length": 10
      }
    },
    {
      "id": "_pqnrqcs3z",
      "name": "Servo",
      "componentType": "ToolAssembly",
      "dimensions": {
        "width": 12.5,
        "height": 25,
        "length": 50
      }
    },
    {
      "id": "_rauctizr7",
      "name": "Top",
      "componentType": "LinearStage",
      "dimensions": {
        "width": 250,
        "height": 25,
        "length": 50
      },
      "drivingMotors": [
        {
          "id": "_702tqu61d"
        },
        {
          "id": "_ru5vlo0fl"
        }
      ],
      "attributes": {
        "driveMechanism": "timingBelt",
        "stepDisplacementRatio": "0.7"
      }
    },
    {
      "id": "_1mkon5w30",
      "name": "Bottom",
      "componentType": "LinearStage",
      "dimensions": {
        "width": 50,
        "height": 50,
        "length": 250
      },
      "drivingMotors": [
        {
          "id": "_702tqu61d"
        },
        {
          "id": "_ru5vlo0fl"
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
      "baseBlock": "_1mkon5w30",
      "baseBlockName": "Bottom",
      "baseBlockFace": "-y",
      "baseBlockEnd": "0",
      "addBlock": "_rauctizr7",
      "addBlockName": "Top",
      "addBlockFace": "+y",
      "addBlockEnd": "0"
    },
    {
      "baseBlock": "_rauctizr7",
      "baseBlockName": "Top",
      "baseBlockFace": "+x",
      "baseBlockEnd": "0",
      "addBlock": "_pqnrqcs3z",
      "addBlockName": "Servo",
      "addBlockFace": "-x",
      "addBlockEnd": "0"
    },
    {
      "baseBlock": "_1mkon5w30",
      "baseBlockName": "Bottom",
      "baseBlockFace": "+z",
      "baseBlockEnd": "0",
      "addBlock": "_702tqu61d",
      "addBlockName": "MotorA",
      "addBlockFace": "-z",
      "addBlockEnd": "0"
    },
    {
      "baseBlock": "_1mkon5w30",
      "baseBlockName": "Bottom",
      "baseBlockFace": "-z",
      "baseBlockEnd": "0",
      "addBlock": "_ru5vlo0fl",
      "addBlockName": "MotorB",
      "addBlockFace": "+z",
      "addBlockEnd": "0"
    },
    {
      "baseBlock": "_pqnrqcs3z",
      "baseBlockName": "Servo",
      "baseBlockFace": "+x",
      "baseBlockEnd": "0",
      "addBlock": "_u9cjbuxqg",
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
          "id": "_702tqu61d",
          "name": "MotorA",
          "kinematics": "hBot"
        },
        {
          "id": "_ru5vlo0fl",
          "name": "MotorB",
          "kinematics": "hBot"
        }
      ]
    ],
    "axes": {
      "x": [
        {
          "id": "_rauctizr7",
          "name": "Top"
        }
      ],
      "z": [
        {
          "id": "_1mkon5w30",
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
    static prusaMachine = `{
    "name": "prusa",
    "buildEnvironment": {
        "width": 500,
        "length": 500
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

}

export { TestPrograms };
