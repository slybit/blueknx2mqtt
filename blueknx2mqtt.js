'use strict'

const knx = require('knx');
const { createLogger, format, transports } = require('winston');
const config = require('./config.js').parse();
const mqtt = require('mqtt');
const KnxHandler = require('./knxhandler');
const MqttHandler = require('./mqtthandler');

// Initate the logger
const logger = createLogger({
    level: config.loglevel,
    format: format.combine(
      format.colorize(),
      format.splat(),
      format.simple(),
    ),
    transports: [new transports.Console()]
});



// Parse the ETS export
const map = require('./etsimport.js').parse(config.knx.etsExport, logger);

let mqttClient = mqtt.connect(config.mqtt.url, config.mqtt.options);

let knxConnection = knx.Connection(Object.assign({
    handlers: {
        connected: function() {
            logger.info('KNX connected');
            mqttClient.publish(config.mqtt.topicPrefix + "/connected", "2", {'retain' : true});
        },
        event: function (evt, src, dst, value) {
            knxHandler.handleKNXEvent(evt, src, dst, value);
        },
        error: function(msg) {
            logger.warn('KNX disconnected');
            mqttClient.publish(config.mqtt.topicPrefix + "/connected", "1", {'retain' : true});
        }
  }}, config.knx.options))

let knxHandler = new KnxHandler(config, map, mqttClient, logger);
let mqttHandler = new MqttHandler(config, map, knxConnection, logger);



mqttClient.on('connect', function () {
    logger.info('MQTT connected');
    mqttClient.subscribe(config.mqtt.topicPrefix + '/write/+/+/+');
    mqttClient.subscribe(config.mqtt.topicPrefix + '/read/+/+/+');
    mqttClient.subscribe(config.mqtt.topicPrefix + '/get/+/+/+');
    mqttClient.subscribe(config.mqtt.topicPrefix + '/set/+/+/+');
    mqttClient.subscribe(config.mqtt.topicPrefix + '/toggle/+/+/+');
});

mqttClient.on('close', function () {
    logger.info('MQTT disconnected');
});

mqttClient.on('reconnect', function () {
    logger.info('MQTT trying to reconnect');
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




