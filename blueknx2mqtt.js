'use strict'

const knx = require('knx');
const { createLogger, format, transports } = require('winston');
const DPTLib = require('knx/src/dptlib');
const config = require('./config.js').parse();

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

let handleKNXEvent = function(evt, dst, value) {
    logger.silly("onKnxEvent %s, %s, %j", evt, dst, value);
    if (evt !== 'GroupValue_Write' && evt !== 'GroupValue_Response') {
        return;
    }

    let isResponse = evt === 'GroupValue_Response';
    let mqttMessage = value;
    if (messageType === c.MESSAGE_TYPE_VALUE_ONLY) {
        mqttMessage = !Buffer.isBuffer(value) ? "" + value : value
    } else if (messageType === c.MESSAGE_TYPE_FULL) {
        let mqttObject = {
            value: !Buffer.isBuffer(value) ? "" + value : value
        }
        if (gad !== undefined) {
            mqttObject.name = gad.name;
            mqttObject.unit = gad.unit;
        }
        if (isResponse) {
            mqttObject.response = true;
        }
        mqttMessage = JSON.stringify(mqttObject);
    } else {
        logger.error('Configured message type unknown. This should never happen and indicates a bug in the software.');
        return;
    }

    logger.verbose("%s **** KNX EVENT: %s, dst: %s, value: %j",
      new Date().toISOString().replace(/T/, ' ').replace(/\..+/, ''),
      evt, dst, mqttMessage);

}

/*
let knxConnection = knx.Connection(Object.assign({
    handlers: {
        connected: function() {
            logger.info('KNX connected');
        },
        event: function (evt, src, dst, value) {
            logger.silly("onKnxEvent %s, %s, %j", evt, dst, value);
            var dpt = DPTLib.resolve("9.001");
            var payload = {};
            if (dpt.subtype) {
                payload.unit = dpt.subtype.unit;
            }
            payload.value = DPTLib.fromBuffer(value, dpt);
            logger.info(payload.value);
        }
  }}, config.knx.options))
  */