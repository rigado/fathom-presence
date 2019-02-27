"use strict"

var config = require('./config.js')
var help = require('./help.js')
var gps = require('./gps.js')
var publisher = require('./publisher.js')
var scanners = require('./scanners.js')
const argv = require('yargs').argv

var cleanupRequests = 0

function cleanup() {
    if (cleanupRequests == 0) {
        console.log("cleaning up...")
        publisher.Cleanup()
        scanners.Cleanup()

        //would be nice to detect that we have cleaned up properly
        console.log("exiting in 5s...")
        setTimeout(() => { process.exit(0) }, 5000)
    } else {
        console.log("cleanup already pending...")
    }
    cleanupRequests++
}

function attachExitHandler() {
    const signals = ["SIGINT", "SIGTERM", "uncaughtException"]
    signals.forEach((signal) => {
        process.once(signal, (err) => {
            console.log("got signal '%s'", signal)
            if (signal == "uncaughtException") {
                //bail out asap!
                if (err) {
                    console.log(err)
                }
                process.exitCode = 1
                process.abort()
            } else {
                //try and cleanup properly
                cleanup()
            }
        })
    })
}

//show help
if (argv.help || argv.h) {
    help.ShowHelp()
    process.exit(0)
}

//load and show the configuration
if (!config.Configure(argv)) {
    console.log("error: no valid configuration found")
    // exit(0) prevents systemd from restarting the application when running as a simple daemon in a snap
    process.exit(0)
}
config.PrintActiveConfig()

//attach exit handler to cleanup
attachExitHandler()

if (argv.test) {
    console.log("sending test message to all endpoints...")
    publisher.Test({ message: argv.test, time: new Date().toISOString() })
    setTimeout(() => { process.exit(0) }, 5000)
} else {
    gps.Init()
    scanners.Init()
    publisher.Init()
}