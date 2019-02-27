'use strict'

var fs = require('fs')
var vm = require('vm')
var argv = require('yargs').argv

//test advertisements
const testRawAdvertisements = [
    {
        uuid: "aabbccddee00",
        rssi: -50,
        advertisement: {
            localName: "test0",
            manufacturerData: [11, 22, 33, 44, 55, 66]
        }
    },
    {
        uuid: "aabbccddee01",
        rssi: -51,
        advertisement: {
            localName: "test1"
        }
    },
    {
        uuid: "aabbccddee02",
        rssi: -52,
    }
]

const testParsedAdvertisements = [
    {
        "macAddress": "ac233f24499f",
        "rssi": -74,
        "detectedAt": 1540588568557,
        "beacon": {
            "mfgId": 76,
            "uuid": "12345678123412341234123456789abc",
            "major": 0,
            "minor": 0,
            "txPower": 0
        }
    },
    {
        "macAddress": "ebc0dcd2a9a8",
        "rssi": -74,
        "ruuvi": {
            "humidity": 9.5,
            "temperature": 0.01,
            "pressure": 87482,
            "accelerationX": 3002,
            "accelerationY": 5120,
            "accelerationZ": 14,
            "battery": 35246,
            "dataFormat": 3
        },
        "detectedAt": 1540588568586,
        "beacon": {
            "mfgId": 76,
            "uuid": "ce400000c5a3f393c0a9c50e24ccca9c",
            "major": 1,
            "minor": 1,
            "txPower": -45
        }
    },
    {
        "macAddress": "df34c35d6cfc",
        "rssi": -80,
        "eddystone": {
            "url": {
                "txPower": -18,
                "url": "https://metrics.rigado.io",
                "distance": 11.220184543019636
            },
            "tlm": {
                "version": 0,
                "vbatt": 3033,
                "temp": 19.25,
                "advCnt": 4322807,
                "secCnt": 38822568
            }
        },
        "detectedAt": 1540588567240
    },
    {
        "macAddress": "4ab3bed79f0a",
        "rssi": -84,
        "detectedAt": 1540588565473
    },
    {
        "macAddress": "61bf5202bcaa",
        "rssi": -64,
        "detectedAt": 1540588567037,
        "manufacturerData": [0xff, 0xee, 0xdd, 0xcc, 0xbb, 0xaa]
    },
    {
        "macAddress": "aa2335129f0a",
        "rssi": -71,
        "detectedAt": 1540588565451,
        "name": "testDevice"
    }
]

//test report
const testReport = {
    tags: testParsedAdvertisements,
    location: "45.0,-123.0",
    detectedAt: 1540588580000,
    detectedBy: "testServer"
}

var errors = 0

function help() {
    console.log("function formatter")
    console.log("usage: node functionFormatter.js --file [FILE] --type [device|formatter] ...")
    console.log("\t--force - ignore potential errors")
}

function makeFunctionString(filepath) {
    var func = ""

    //read the file
    try {
        func = fs.readFileSync(filepath).toString()
    } catch (e) {
        console.log("error reading file: %s", e)
        return null
    }

    //remove comment lines
    var tmp = func.replace(/\/\/.*/g, "")

    //trim whitespace
    tmp = tmp.trim()

    //using functionFormatter.js
    console.log("\nWARNING: This script will provide invalid output if input has:\n- more than one top-level function\n- declarations outside of the top-level function\n")

    //show some warnings to help the user
    const reList = [
        {
            regex: /{[\s\S]*\Winput\W+[\s\S]*}/,
            desc: "uses 'input'",
        },
        {
            regex: /{[\s\S]*\Woutput\W+[\s\S]*}/,
            desc: "uses 'output'",
        },
        {
            regex: /{[\s\S]*;[\s\S]*}/,
            desc: "uses semicolons",
        }
    ]

    console.log("checking input function...")
    reList.forEach((o) => {
        var result = "PASS"
        if (tmp.search(o.regex) == -1) {
            result = "FAIL"
            errors++
        }

        console.log("- %s: %s", o.desc, result)
    })
    console.log("%d potential errors", errors)

    //double->single quotes
    tmp = tmp.replace(/"/g, "'")

    //flatten
    tmp = tmp.replace(/[\s]+/g, " ")

    //trim function name
    tmp = tmp.match(/\{[\s\S*]*\}/g)

    if (tmp == -1) {
        console.log("error, formatting failed!")
        return null
    } else {
        return tmp[0]
    }
}

function runFunctionString(code, obj, timeout = 5000) {
    if (code == null || typeof code != 'string' || code.length == 0 || obj == null) {
        return null
    }

    //run in the sandbox
    // function expects an `input` object and will return results on `output` object
    const sandbox = { input: obj, output: {} }
    vm.createContext(sandbox)
    vm.runInContext(code, sandbox, { timeout: timeout })

    //fail
    return sandbox.output
}

function runTest(fnStr, type) {
    try {
        console.log("\nrunning function on test data...")
        if (type == "device") {
            //test device parser
            testRawAdvertisements.forEach((adv) => {
                var out = runFunctionString(fnStr, adv)
                console.log("input: %s", JSON.stringify(adv, null, 2))
                console.log("output: %s", JSON.stringify(out, null, 2))
            })
        } else {
            var out = runFunctionString(fnStr, testReport)
            console.log("input: %s", JSON.stringify(testReport, null, 2))
            console.log("output: %s", JSON.stringify(out, null, 2))
        }

        return true
    } catch (e) {
        console.log("error running function: %s", e)
        return false
    }
}

if (argv.h) {
    help()
    process.exit(0)
}

if (!argv.file ||
    !(argv.type == "device" || argv.type == "formatter")) {
    console.log("error: invalid arguments\n")
    help()
    process.exit(1)
}

var fnString = makeFunctionString(argv.file)

//error!
if (!fnString) {
    console.log("makeFunctionString: FAIL")
    process.exit(1)
}

//exit on potential error
if(errors && !argv.force) {
    console.log("makeFunctionString: potential errors found, run with --force to ignore")
    process.exit(1)
}

//run on test data
if (runTest(fnString, argv.type)) {
    var o  = {}
    if(argv.type == "device") {
        o.customDeviceParser = fnString
    } else {
        o.customFormatter = fnString
    }

    console.log("\nrunTest PASS\n")
    console.log(JSON.stringify(o))
    process.exit(0)
}

console.log("runTest: FAIL")
process.exit(1)

