
noble-bmd-scanner (nodejs)
==========================

# Overview

This is a nodejs snap that scans for various BLE advertisement types and publishes a JSON report to any number of endpoints

## Supported Scanner Interfaces

- Noble (blueZ via HCI socket)
- Rigado Edge-Connect HTTP api

## Supported BLE Device Types

- iBeacon
- Eddystone (eid, tlm, url)
- Ruuvi (eddystone, high precision v3)
- Kontakt.IO (subset of iBeacon) 
- Basic BLE (will parse all known ble advertisement fields)
- Custom BLE Advertisement parsing (see `customDeviceParser`)

## Supported Endpoint Types

- HTTP/HTTPS
- MQTT
- AWS IoT
- Azure
- Raw Socket

# The Snap

## Configuration

To configure the snap, open the `snap-bmd-scanner/snapcraft.yaml` file and make the following changes:

- The user will need to rename the name in line 1 to their preferred name ex.`xyz-bmd-scanner`
- On line 2, the user can declare their preferred version ex.`0.1`
- On line 11 `command`, change the `--url` to a meaningful endpoint. See the Usage section below for all supported options.

## Building

To build the snap for Cascade, you must build the snap on the raspberry pi.

```bash
$ cd snap-bmd-scanner
$ snapcraft
```

## Installing

Installing the snap via edge direct is recommended

### Sideloading the Snap
For testing, you can sideload the snap via `scp` to Cascade.

Note you must use `--dangerous` since the snap is unsigned and connect the interfaces manually:

```bash
$ snap install mysnap_0.1_armhf.snap --dangerous
$ snap connect mysnap:network-control
$ snap connect mysnap:bluetooth-control
```

# The Nodejs Application

You can run the script directly on a compatible Linux machine for development, you must have Nodejs >7.x (the snap is using 9.11.2) and bluez installed.

### Setup dependencies

Install the nodejs dependencies before you run the script:
```bash
$ cd js
$ npm install
```
### Running the application

```bash
sudo node scanner.js [OPTIONS...]
```
- `--publishInterval [INTERVAL_S]` Set publish interval in seconds, default is 15 seconds
- `--url` set HTTP/S publish endpoint
- `--mqurl [URL]` set MQTT Broker, URL=mqtt://[BROKER]
- `--mqtopic [TOPIC]` set MQTT topic
- `--method [METHOD]` HTTP request type, METHOD default is 'POST'
- `--mac [FILTER]` Set a MAC address filter, FILTER=regex (e.g. '^abc.*f$' matches MACs starting with 'abc' and end with 'f')
- `--publishall` Publish every interval
- `--kontakt` Scan/parse kontakt
- `--globalstar` Scan/parse globalstar
- `--ruuvi` Scan/parse ruuvi
- `--eddystone` Scan/parse eddystone (uid, tlm, url)
- `--ibeacon [FILTER]` Scan/parse iBeacon, optionally specify FILTER=regex (e.g. '^123abc' matches UUIDs starting with '123abc')
- `--basicble` Scan/parse all BLE advertisements (basic)
- `--all` Scan/parse all available types
- `--gps [DEVICE]` Enable GPS tagging in report, optionally set DEVICE (default is /dev/ttyUSB0)
- `--dumpadv` Dump advertisements
- `--dumppublish` Dump published json
- `--dumpgps` Dump gps data
- `--config [CONFIG]` load config file json (ignores all other arguments except `--test`, `-h`)
- `--noble` Use noble scanning interface (default=noble)
- `--edgeconnect` Use edge-connect scanning interface (default=noble)
- `--unsafetls` Allow unauthorized server certificates (for mqtt, https)
- `--test [MSG]` Publish a test message object to all configured endpoints, then exit
- `-h` Show help


# The config file

The config file supports more options than the command line interface.

To use a config file, see `examples/config/edgeDirectConfig.json` and set using the `rigado` cli tool using the `rigado gateway configure` command:

```bash
# admin account
$ ./rigado -i [impersonated acct] gateway configure [gateway serial number] --filename [path to configuration json]

# normal user account
$ ./rigado gateway configure [gateway serial number] --filename [path to configuration json]
```

The application will always try and fetch a config from `snap set` and apply it if it is a sane configuration.


## `scanner`

Set the ble scanning interface here (only one can be used at a time):
- `noble`: use the blueZ HCI socket to interface more directly with the BLE radio
- `edge-connect`: use the edge-connect HTTP interface to scan for BLE devices

```json
"scanner": "noble"|"edge-connect"

```

## `endpoints`

You can define multiple endpoint types, each type contains an array of endpoint instances.

### `http`

Define an array of HTTP/S endpoints

- `url`: the http/https url to the endpoint
- `method`: "PUT", "POST"
- `rejectUnauthorized`: (optional) set to `false` to bypass server certificate verification (defaults to `true`)
- `headers`: (optional) headers that should be attached to the HTTP request

```json
"endpoints": {
        "http": [
            {
                "url": "https://yourserver.com/test",
                "method": "POST",
                "rejectUnauthorized": true,
                "headers": {
                    "x-api-key": "0123456789abcdef"
                }
            }
        ],
        ...

```

### `socket`

Define a raw socket endpoint

- `addr`: the ipaddress or resolvable address of the server
- `port`: port to connect on server

```json
"endpoints": {
        "socket": [
            {
                "addr": "yourserver.com",
                "port": 8888
            }
        ],
        ...
```

### `mqtt`

Define MQTT endpoints using MQTT.js (see https://github.com/mqttjs/MQTT.js for full details) 

#### unencrypted

- `url`: mqtt url to mqtt broker
- `topic`: mqtt topic to publish to
- `pubOptions`: mqtt publish options

```json
"endpoints": {
        "mqtt": [
            {
                "url": "mqtt://test.mosquitto.org",
                "topic": "b5f257b3-5fc9-4514-be51-1379e344c20b/insecure",
                "pubOptions": {
                    "qos": 1
                }
            }
        ],
        ...
```

#### encrypted

All keys/certs must be in .pem format

- `url`: mqtt url to mqtt broker
- `topic`: mqtt topic to publish to
- `connOptions`: mqtt connection options
  - `host`: hostname (similar to `url`) (optional, can be inferred from `url`)
  - `port`: broker port (optional, can be inferred from `url`)
  - `key`: client private key base64 (generate with `base64 -w0 privateKey.pem`)
  - `cert`: client ceritificate base64 (optional) (generate with `base64 -w0 cert.pem`)
  - `ca`: CA ceritificate base64 (optional) (generate with `base64 -w0 ca.pem`)
- `pubOptions`: mqtt publish options

```json
"endpoints": {
        "mqtt": [
            {
                "url": "mqtts://test.mosquitto.org",
                "topic": "b5f257b3-5fc9-4514-be51-1379e344c20b/secure",
                "connOptions": {
                    "host": "test.mosquitto.org",
                    "port": "8884",
                    "key": "LS0tLS1CRU...",
                    "cert": "LS0tLS1CRU...",
                    "ca": "LS0tLS1CRU...",
                    "rejectUnauthorized": true
                },
                "pubOptions": {
                    "qos": 1
                }
            }
        ],
        ...
```

### `awsiot`

Configure an AWS IoT mqtt endpoint, the options are similar to `mqtt`.

All keys/certs must be in .pem format

- `topic`: mqtt topic to publish to
- `connOptions`: mqtt connection options
  - `host`: hostname (similar to `url`) (optional, can be inferred from `url`)
  - `privateKey`: client private key base64 (generate with `base64 -w0 privateKey.pem`)
  - `clientCert`: client ceritificate base64 (optional) (generate with `base64 -w0 cert.pem`)
  - `caCert`: CA ceritificate base64 (optional) (generate with `base64 -w0 ca.pem`)

```json
    "endpoints": {
        "awsiot": [
            {
                "topic": "b5f257b3-5fc9-4514-be51-1379e344c20b",
                "connOptions": {
                    "host": "a2pf9ak0xe213h-ats.iot.us-west-2.amazonaws.com",
                    "privateKey": "LS0tLS1CRU...",
                    "clientCert": "LS0tLS1CRU...",
                    "caCert": "LS0tLS1CRU..."
                }
            }
        ]
        ...
```

### `azureiot`

Configure an Azure IoT endpoint (symmetric key only)

- `protocol`: "mqtt", "mqttws", "http", "aqmp", "aqmpws"
- `connString`: azure iot connection string (symmetric key)

```json
    "endpoints": {
        "azureiot": [
            {
                "protocol": "mqtt",
                "connString": "HostName=somehub.azure-devices.net;DeviceId=someDevice;SharedAccessKey=..."
            }
        ]
        ...
```

## `publish`

Control what is published and when.

Note: if `always`, `departed`, `single` are not set, a publish will occur only if the devices seen have changed from what was last published

- `intervalMs`: set the publish interval in milliseconds (required)
- `always`: always publish the full device table (optional)
- `departed`: publish if any device has not been seen since the last publish (optional)
- `single`: publish the device with the strongest rssi since the last publish (optional)
- `emptyExitCount`: exit application when empty publish count reaches this number (optional)

```json
"publish": {
        "intervalMs": 300000,
        "always": true,
        "departed": false,
        "single": false
    },
```

## `enabledTypes`

Array of advertisement types that will be reported:

Supported names:
- eddystone
- globalstar
- kontakt
- ibeacon
- ruuvi
- ble

Also see `customDeviceParser`.

```json
"enabledTypes": [
        "eddystone",
        "globalstar"
        "kontakt",
        "ibeacon",
        "ruuvi",
        "ble"
    ],
```

## `filters`

Define some regular expression filters.
Note that all hex values are reported in lowercase.

- `mac`: apply a regular expression filter on mac addresses
- `ibeacon`: apply a regular expression filter on ibeacon uuids
- `rssi`: apply an rssi filter on all advertisements, value = (0,-128] dBm

```json
"filters": {
        "mac": "^[0-9].*[a-f]$",
        "ibeacon": ".*123$",
        "rssi": -70
    }
```

## `customDeviceParser`

Set a custom BLE advertisement parser at runtime (optional)
See `examples/functions/exampleDeviceParser.js` for full details and an example.

You may find `scripts/functionFormatter.js` useful for processing functions to put into a config file.

## `customFormatter`

Set a report formatter at runtime (optional)
See `examples/functions/exampleFormatter.js` for full details and an example.

You may find `scripts/functionFormatter.js` useful for processing functions to put into a config file.

## `gps`

Set GPS reciever settings

- `port`: path to serial device
- `baud`: baudrate (typically 4800)

```json
"gps": {
    "port": "/dev/ttyUSB0",
    "baud": 4800
}
```

## `debug`

Array of debug data that will be reported: 

Supported data:
- `advertisements`: dump parsed advertisement reports as they are rx'd
- `publish`: dump published json
- `gps`: dump gps status data

```json
"debug": [
        "advertisements",
        "publish",
        "gps"
    ]
```

## `scannerHciIdx`

The index of the hci device you'd like to use with noble (on arm default is hci1, otherwise is hci0). On cascade hci0,1 are available as long as no custom fw is loaded on the bmd345.

```json
"scannerHciIdx": 1
```

# Default Report

If you do not define a `customFormatter`, report data will be a JSON object containing an array of seen tags and the current location (if unknown, "n/a"), and time in the body of the HTTP request, for example:

Note that `detectedAt` is epoch time in ms.

```json
{
  "tags": [
    {
      "macAddress": "e20200259f40",
      "rssi": -86,
      "beacon": {
        "mfgId": 76,
        "uuid": "f7826da64fa24e988024bc5b71e0893e",
        "major": 10481,
        "minor": 19562
      },
      "detectedAt": 1528934204082,
    },
    {
      "macAddress": "db58da58da66",
      "rssi": -82,
      "beacon": {
        "mfgId": 76,
        "uuid": "f7826da64fa24e988024bc5b71e0893e",
        "major": 34137,
        "minor": 6304
      },
      "detectedAt": 1528934204080,
    }
  ],
  "location": "44.89979833333334,-123.010835",
  "detectedAt": 1528934204085,
  "detectedBy": "C029020418-00390"
}

```
