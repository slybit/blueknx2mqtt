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

#### topic:

`blueknx2mqtt` publishes messages to MQTT on two topics:

1. `<topicPrefix>/status/0/1/2` 
2. `<topicPrefix>/status/main/middle/sub` 

The `topicPrefix` is by default 'knx', but it can be configured if required.

The second topic uses the 'main', 'middle' and 'sub' names taken from the ETS export if provided. Otherwise not messages are published on this topic.

#### message:

The message published by `blueknx2mqtt` is a JSON string with the following fields:

Field name          |   Contents
-----------------   |   -----------
srcphy              |   Physical address of the KNX device that emitted the message
dstgad              |   Destination Group Address (e.g., "0/1/2")
ts                  |   Timestamp when the value was obtained
lc                  |   Timestamp when the value last *changed*
main                |   Main level GA name if provided in ETS export, not present otherwise
middle              |   ...
sub                 |   ...
dpt                 |   Datapoint type of GA if provided in ETS export, not present otherwise
val                 |   Translated value of the KNX data (if DPT known through the ETS export), or
                    |   raw binary data as hex string (e.g., 0x07A4)
raw                 |   "true" if value is a raw hex string, not present otherwise   

**Important:** The "value" of binary data is translated to "1" or "0" for all Datapoint Types in the DPT1 category.

Example of message object in case the ETS export contains all information for the GA:
```javascript
{
    'srcphy'    :   '1.1.0',
    'dstgad'    :   '0/1/2',
    'ts'        :   1543434592311,
    'lc'        :   1543434590311,
    'main'      :   'Lights',
    'middle'    :   'Set',
    'sub'       :   'Bathroom',
    'dpt'       :   'DPT1.001',
    'val'       :   1
}
```

Example of message object in case the ETS export contains no information about the GA:
```javascript
{
    'srcphy'    :   '1.1.0',
    'dstgad'    :   '0/1/2',
    'ts'        :   1543434592311,
    'lc'        :   1543434590311,
    'val'       :   '0x01',
    'raw'       :   'true'
}
```

### From MQTT to KNX

#### topic:

`blueknx2mqtt` listens to the following MQTT topics:

1. `<topicPrefix>/<command>/0/1/2`
2. `<topicPrefix>/<command>/main/middle/sub`  

The following `commands` are supported:

Command             |   Meaning
----------          |   -----------
'write' or 'set'    |   Send a 'write request' message to KNX with the provided value (see below)
'read' or 'get'     |   Send a 'read request' message to KNX
'toggle'            |   Sends a 'write request' with the inverse of the latest, known value of the Group Address. Only works if the DPT is known and is of the DPT1 family.

The target Group Address for the KNX message is taken from the MQTT topic.

#### message:

The message contains the value that will be written to KNX. It is only used for 'write' or 'set' commands.

The message can have two formats:

Type        |   Example     |   Explanation
----        |   ----        |   -----------
**raw**     |   "0x01+1"    |   Binary data as hex string, together with the actual length, separated with '+'. This example sends a single bit to KNX with value '1'.
**raw**     |   "0x07A4+16" |   Sends a 16 bit value to KNX.
**raw**     |   "0x07"      |   If no bitlength is provided, the full byte value is sent. This example sends an 8 bit value to KNX. 
**simple**  |   "10.5"      |   Provided value is translated using the DPT from the ETS export. If no DPT is known, no message is sent.

**Important:** Raw hexadecimal strings must indicate a *byte* array, so number of hexadecimal characters must be *even*.