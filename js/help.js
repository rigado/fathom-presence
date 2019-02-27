'use strict'

function ShowHelp() {
    console.log("\nusage: node scanner.js [options ...]")
    console.log("options:")

    //loadconfig?
    console.log("\t--config\t\t\tuse settings in config file (ignores all other args except --test/-h)")

    //scanners
    console.log("\t--noble\t\t\t\tUse noble to scan (default=noble)")
    console.log("\t--edgeconnect\t\t\tUse edge-connect to scan (default=noble)")

    //endpoint: http(s)
    console.log("\t--url=[URL]\t\t\tHTTP(s) endpoint url")
    console.log("\t--method=[METHOD]\t\tHTTP(s) request method, METHOD=[PUT,POST], default POST")

    //endpoint: socket
    console.log("\t--sockaddr [ADDR]\t\tSocket Address")
    console.log("\t--sockport [PORT]\t\tSocket Port")

    //endpoint: mqtt
    console.log("\t--mqurl [URL]\t\t\tMQTT Broker, URL=mqtt://[BROKER]")
    console.log("\t--mqtopic [PORT]\t\tMQTT Topic")

    //todo: mqtt certs
    //todo: awsiot
    //todo: azureiot

    //publish behavior
    console.log("\t--publishinterval [TIMEOUT]\tSet publish interval in seconds, TIMEOUT>0")
    console.log("\t--publishalways\t\t\tPublish every interval")
    console.log("\t--publishsingle\t\t\tPublish single report")
    console.log("\t--publishdeparted\t\tPublish when a device departs")

    //tag type enable
    console.log("\t--kontakt\t\t\tScan/parse kontakt")
    console.log("\t--globalstar\t\t\tScan/parse globalstar")
    console.log("\t--ruuvi\t\t\t\tScan/parse ruuvi")
    console.log("\t--ibeacon [FILTER]\t\tScan/parse iBeacon, optionally specify FILTER=regex (e.g. '^123abc' matches UUIDs starting with '123abc')")
    console.log("\t--eddystone\t\t\tScan/parse Eddystone")
    console.log("\t--basicble\t\t\tScan/parse all BLE advertisements (basic)")
    console.log("\t--all\t\t\t\tScan/parse all available types")

    //filters
    console.log("\t--rssi [RSSI]\t\t\tRSSI threshold, RSSI=(0,-128)")
    console.log("\t--mac [FILTER]\t\t\tSet a MAC address filter, FILTER=regex (e.g. '^abc.*f$' matches MACs starting with 'abc' and end with 'f')")

    //gps
    console.log("\t--gps\t\t\t\tEnable GPS tagging in report")

    //debug data
    console.log("\t--dumpadv\t\t\tDump advertisements")
    console.log("\t--dumppublish\t\t\tDump published json")
    console.log("\t--dumpgps\t\t\tDump gps data")
    
    console.log("\t--unsafetls\t\t\tAllow unauthorized server certificates (for mqtt, https)")
    console.log("\t--test [MSG]\t\t\tPublish a test message to all configured endpoints, then exit")

    //help
    console.log("\t-h\t\t\t\tShow help")
}

module.exports.ShowHelp = ShowHelp
