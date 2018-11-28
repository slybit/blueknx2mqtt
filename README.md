# blueknx2mqtt

A node.js application that bridges KNX and MQTT.

It connects to a KNX IP gateway (including knxd) and a MQTT broker. It forwards messages both ways.

It follows the design guidelines specified here: https://github.com/mqtt-smarthome/mqtt-smarthome/blob/master/Architecture.md 

## ETS export

KNX messages themselves do not contain any information on what 'type' of data they are carrying. The actual meaning of the binary data transferred in a KNX message depends on the Datapoint Type (DPT) associated with the destination Group Address (DSTGAD).

These Datapoint Types can be set in ETS for each Group Address and exported.

This tool relies on the ETS export to perform the correct translation from the binary data in a KNX message to meaningful values in the MQTT messages and vice versa.

If no Datapoint Type is provided for a certain Group Address, then the *raw* binary data is put in an MQTT message as a hexadecimal string.

Next to the Datapoint Types, also the Group Address structure and corresponding names for the 'main', 'middle' and 'sub' levels are taken from the ETS export.

This tool expects a '3-level' hierarchy.

## Message formats

### From KNX to MQTT

### topic:

`blueknx2mqtt` publishes messages to MQTT on two topics:

1. `<topicPrefix>/status/0/1/2` 
2. `<topicPrefix>/status/main/middle/sub` 

The `topicPrefix` is by default 'knx', but it can be configured if required.

The second topic uses the 'main', 'middle' and 'sub' names taken from the ETS export if provided. Otherwise not messages are published on this topic.

### message:

The message published by `blueknx2mqtt` is a JSON string with the following fields:

Field name          |   Contents
-----------------   |   -----------
srcphy              |   Physical address of the KNX device that emitted the message
dstgad              |   Destination Group Address (e.g., "0/1/2")
ts                  |   Timestamp when the value was obtained
lc                  |   Timestamp when the value last *changed*




let payload = {
        'srcphy': src,
        'dstgad': dst
    };payload.lc = this.updatePrev(payload, apdu);
    payload.ts = (new Date).getTime();
    // value
    let info = this.map.GAToname.get(payload.dstgad);
    if (info === undefined) {
        payload.value = '0x'+apdu.toString('hex');
        payload.raw = true; // indication that payload is raw binary value
    } else {
        payload.dpt = info.dpt;
        payload.main = info.main;
        payload.middle = info.middle;
        payload.sub = info.sub;