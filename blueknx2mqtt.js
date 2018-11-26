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

let handleKNXEvent = function(evt, src, dst, value) {
    logger.silly("onKnxEvent %s, %s, %j", evt, dst, value);
    if (evt !== 'GroupValue_Write' && evt !== 'GroupValue_Response') {
        return;
    }
    let payload = {
        'srcphy': src,
        'dstgad': dst
    };
    enrichPayload(payload, value);
    console.log(payload);
    if (evt === 'GroupValue_Response') payload.response = true;
    let mqttMessage = JSON.stringify(payload);
    logger.verbose("%s **** KNX EVENT: %s, dst: %s, value: %j",
      new Date().toISOString().replace(/T/, ' ').replace(/\..+/, ''),
      evt, dst, mqttMessage);

}

let enrichPayload = function(payload, apdu) {
    if (map.GAToname.size === 0) return;
    let info = map.GAToname.get(payload.dstgad);
    console.log(info);
    if (info === undefined) {
        payload.value = ""; // todo: store hex value
        payload.raw = true; // indication that payload is raw binary value
    } else {
        // assigns name and dpt
        payload.dpt = info.dpt;
        payload.main = info.main;
        payload.middle = info.middle;
        payload.sub = info.sub;
        var dpt = DPTLib.resolve(info.dpt);
        if (dpt.subtype) {
            payload.unit = dpt.subtype.unit;
        }
        payload.value = DPTLib.fromBuffer(apdu, dpt);
    }
    // TODO: add error catches that will store the data as HEX and puts raw flag
}


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
