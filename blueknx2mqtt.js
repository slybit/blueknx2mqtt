'use strict'

const knx = require('knx');
const config = require('./config.js').parse();
const mqtt = require('mqtt');
const KnxHandler = require('./knxhandler');
const MqttHandler = require('./mqtthandler');
const { logger, logToES } = require('./standardlogger.js');



// Add last will to mqtt.options
if (!mqtt.options) mqtt.options = {};
mqtt.options.will = {topic: config.mqtt.topicPrefix + '/connected', payload: '0', retain: true};


// Parse the ETS export
const map = require('./etsimport.js').parse(config.knx.etsExport, logger);

let publishKnxState = function(state) {
    mqttClient.publish(config.mqtt.topicPrefix + "/connected", state, {'retain' : true});
    logger.info('published connected state: %s', state);
}

let mqttClient = mqtt.connect(config.mqtt.url, config.mqtt.options);

let knxConnection = knx.Connection(Object.assign({
    handlers: {
        connected: function() {
            logger.info('KNX connected');
            logToES('info', {}, 'KNX connected');
            knxConnection._state = "2";
            publishKnxState(knxConnection._state);
        },
        event: function (evt, src, dst, value) {
            knxHandler.handleKNXEvent(evt, src, dst, value);
        },
        error: function(msg) {
            logger.warn('KNX disconnected');
            logToES('warn', {}, 'KNX connected');
            knxConnection._state = "1";
            publishKnxState(knxConnection._state);
            knxConnection.transition('connecting');
        },
        disconnected: function() {
            logger.warn('KNX disconnected');
            logToES('warn', {}, 'KNX connected');
            knxConnection._state = "1";
            //publishKnxState(knxConnection._state);
            //knxConnection.transition('connecting');
        }
  }}, config.knx.options))

let knxHandler = new KnxHandler(config, map, mqttClient);
let mqttHandler = new MqttHandler(config, map, knxConnection);

mqttClient.on('connect', function () {
    logger.info('MQTT connected');
    logToES('info', {}, 'MQTT connected');
    mqttClient.subscribe(config.mqtt.topicPrefix + '/write/+/+/+');
    mqttClient.subscribe(config.mqtt.topicPrefix + '/read/+/+/+');
    mqttClient.subscribe(config.mqtt.topicPrefix + '/get/+/+/+');
    mqttClient.subscribe(config.mqtt.topicPrefix + '/set/+/+/+');
    mqttClient.subscribe(config.mqtt.topicPrefix + '/toggle/+/+/+');
    if (knxConnection._state !== undefined) {
        publishKnxState(knxConnection._state);
    }

});

mqttClient.on('close', function () {
    logger.warn('MQTT disconnected');
    logToES('warn', {}, 'MQTT disconnected');
});

mqttClient.on('reconnect', function () {
    logger.warn('MQTT trying to reconnect');
    logToES('warn', {}, 'MQTT trying to reconnect');
});

mqttClient.on('message', function (topic, message) {
    // message is a buffer
    message = message.toString();
    mqttHandler.handleMqttEvent(topic, message);
});

/*
setTimeout(function() {
    //knxHandler.handleKNXEvent('GroupValue_Write', "1.1.1", "0/0/108", Buffer.from('01', 'hex'));
    mqttHandler.handleMqttEvent('knx/write/0/0/1080', "0x01+1");
    //mqttHandler.handleMqttEvent('knx/write/verlichting/Aan_uit/Bureau_-_plafond_(U24)', 1);
}, 1000);


setTimeout(function() {
    //knxHandler.handleKNXEvent('GroupValue_Write', "1.1.1", "0/0/108", Buffer.from('00', 'hex'));
}, 3000);
*/



/*
 * Kind of hacky way to keep knx.js reconnecting. This will no longer be required once my pull request has been approved in the knx.js library.
 * Checks every 30 seconds if the knx.js is still connected. If not, it forces a reconnect attempt.
 *
 * REMOVED in version 0.5
 */
/*
var timerID = setInterval(function() {
    if (knxConnection.state === 'uninitialized')
        knxConnection.emit('disconnected');
}, 30000);
*/