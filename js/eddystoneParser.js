var urlDecode = require('eddystone-url-encoding').decode

const SERVICE_UUID = 'feaa'
const UID_FRAME_TYPE = 0x00
const URL_FRAME_TYPE = 0x10
const TLM_FRAME_TYPE = 0x20

function ParseEddystone(peripheral) {
    if (isEddystone(peripheral)) {
        return parseBeacon(peripheral)
    }

    return null
}

function isEddystone(peripheral) {
    var serviceData = peripheral.advertisement.serviceData

    // make sure service data is present, with the expected uuid and data length
    return (serviceData &&
        serviceData.length > 0 &&
        serviceData[0].uuid === SERVICE_UUID &&
        serviceData[0].data.length > 2
    )
}

function parseBeacon(peripheral) {
    
    if (!peripheral
        || !peripheral.advertisement.serviceData
        || !peripheral.advertisement.serviceData[0]
        || !peripheral.advertisement.serviceData[0].data
        || peripheral.advertisement.serviceData[0].data.length == 0
        || !peripheral.rssi) {
        return null
    }

    var data = peripheral.advertisement.serviceData[0].data
    var frameType = data.readUInt8(0)
    var rssi = peripheral.rssi

    var beacon = {}

    switch (frameType) {
        case UID_FRAME_TYPE:
            beacon.uid = parseUidData(data, rssi)
            break

        case URL_FRAME_TYPE:
            beacon.url = parseUrlData(data, rssi)
            break

        case TLM_FRAME_TYPE:
            beacon.tlm = parseTlmData(data)
            break

        default:
            return null
    }

    return beacon
}

function parseUidData(data, rssi) {

    if (data.length != 18) {
        return null
    }

    var txPower = data.readInt8(1)
    var distance = calculateDistance(txPower, rssi)

    return {
        txPower: txPower,
        namespace: data.slice(2, 12).toString('hex'),
        instance: data.slice(12, 18).toString('hex'),
        distance: distance
    }

}

function parseUrlData(data, rssi) {

    if (data.length < 2) {
        return null
    }

    var txPower = data.readInt8(1)
    var distance = calculateDistance(txPower, rssi)

    return {
        txPower: txPower,
        url: urlDecode(data.slice(2)),
        distance: distance
    }
}

function parseTlmData(data) {

    if (data.length != 14) {
        return null
    }

    return {
        version: data.readUInt8(1),
        vbatt: data.readUInt16BE(2),
        temp: data.readInt16BE(4) / 256,
        advCnt: data.readUInt32BE(6),
        secCnt: data.readUInt32BE(10)
    }
}

function calculateDistance(txPower, rssi) {
    return Math.pow(10, ((txPower - rssi) - 41) / 20.0)
}

module.exports.ParseEddystone = ParseEddystone