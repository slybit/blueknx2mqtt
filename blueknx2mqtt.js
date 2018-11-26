'use strict'

const knx = require('knx');
const { createLogger, format, transports } = require('winston');
const DPTLib = require('knx/src/dptlib');
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

let knxHandler = new KnxHandler(config, map, mqttClient, logger);
let mqttHandler = new MqttHandler(config, map, undefined, logger);



mqttClient.on('connect', function () {
    logger.info('MQTT connected');
    mqttClient.subscribe(config.mqtt.topicPrefix + '/write/+/+/+');
    mqttClient.subscribe(config.mqtt.topicPrefix + '/read/+/+/+');
});

mqttClient.on('close', function () {
    logger.info('MQTT disconnected');
});

mqttClient.on('reconnect', function () {
    logger.info('MQTT trying to reconnect');
});

mqttClient.on('message', function (topic, message) {
    logger.silly('Received MQTT message on topic %s with value %s', topic, message);
});

setTimeout(function() {
    //knxHandler.handleKNXEvent('GroupValue_Write', "1.1.1", "0/0/108", Buffer.from('01', 'hex'));
    mqttHandler.handleMqttEvent('knx/write/0/0/1080', "0x01+1");
    //mqttHandler.handleMqttEvent('knx/write/verlichting/Aan_uit/Bureau_-_plafond_(U24)', 1);
}, 1000);


setTimeout(function() {
    //knxHandler.handleKNXEvent('GroupValue_Write', "1.1.1", "0/0/108", Buffer.from('00', 'hex'));
}, 3000);



/*
let knxConnection = knx.Connection(Object.assign({
    handlers: {
        connected: function() {
            logger.info('KNX connected');
        },
        event: function (evt, src, dst, value) {
            logger.silly("onKnxEvent %s, %s, %j", evt, dst, value);
            handleKNXEvent(evt, src, dst, value);
        }
  }}, config.knx.options))
*/