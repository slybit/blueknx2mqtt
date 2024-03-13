const DPTLib = require('knx/src/dptlib');
const { logger, logToES } = require('./standardlogger.js');
const { logKNXToES } = require('./knxESlogger.js');

function KnxHandler(config, map, mqttClient) {

    if (!(this instanceof KnxHandler)) {
        return new KnxHandler(config, map, mqttClient);
    }

    this.config = config;
    this.map = map;
    this.mqttClient = mqttClient;
};



KnxHandler.prototype.handleKNXEvent = function (evt, src, dst, value) {
    logger.debug("onKnxEvent %s, %s, %j", evt, dst, value);
    logToES("debug", { evt, dst, value }, "onKnxEvent");

    let payload = {
        'evt': evt,
        'srcphy': src,
        'dstgad': dst
    };
    let info = this.map.GAToname.get(payload.dstgad);
    // add the basic info from the map
    if (info) {
        payload.dpt = info.dpt;
        payload.main = info.main;
        payload.middle = info.middle;
        payload.sub = info.sub;
    }

    if (evt === 'GroupValue_Write' || evt === 'GroupValue_Response') {
        this.translateValue(payload, value, info);
        if (payload.raw) {
            logger.warn("KNX->MQTT: Unknown DPT for evt: %s, src: %s, dst: %s, value: %s", evt, src, dst, payload.hex);
            logToES("debug", { payload }, "KNX->MQTT: Unknown DPT");
        }
    }



    //if (evt === 'GroupValue_Response') payload.response = true;
    // Only create an MQTT 'status' message for either Write's or Response's
    if (evt === 'GroupValue_Write' || evt === 'GroupValue_Response') {


        let mqttMessage = JSON.stringify(payload);
        this.mqttClient.publish(this.config.mqtt.topicPrefix + "/status/" + dst, mqttMessage, { 'retain': true });
        logger.debug("KNX->MQTT: Published to %s, msg: %s", this.config.mqtt.topicPrefix + "/status/" + dst, mqttMessage);
        logToES("debug", { topic: this.config.mqtt.topicPrefix + "/status/" + dst, mqttMessage }, "KNX->MQTT: Published");
        if (payload.sub) {
            let topic = this.config.mqtt.topicPrefix + "/status/" + payload.main + "/" + payload.middle + "/" + payload.sub;
            this.mqttClient.publish(topic, mqttMessage, { 'retain': true });
            logger.debug("KNX->MQTT: Published to %s, msg: %s", topic, mqttMessage);
            logToES("debug", { topic, mqttMessage }, "KNX->MQTT: Published");
        }
    }

    // Publish to ES
    logKNXToES("info", payload, "knx");
}

KnxHandler.prototype.updatePrev = function (payload, apdu) {
    let info = this.map.GAToPrev.get(payload.dstgad);

    if (info === undefined) {
        info = { 'prev': undefined, 'lastChange': undefined };
        this.map.GAToPrev.set(payload.dstgad, info);
    }

    if ((info.prev === undefined) || (info.prev !== undefined && !info.prev.equals(apdu))) {
        info.lastChange = (new Date).getTime();
        info.prev = apdu;
    }
    return info.lastChange;
}

KnxHandler.prototype.translateValue = function (payload, apdu, info) {
    // time stamps
    payload.lc = this.updatePrev(payload, apdu, info);
    payload.ts = (new Date).getTime();

    // value
    if (info === undefined) {
        payload.hex = '0x' + apdu.toString('hex');
        payload.raw = true; // indication that payload is raw binary value
    } else {
        payload.dpt = info.dpt;
        try {
            var dpt = DPTLib.resolve(info.dpt);
            if (dpt.subtype) {
                payload.unit = dpt.subtype.unit;
            }
            payload.val = DPTLib.fromBuffer(apdu, dpt);
            // do some postprocessing on the val
            if (payload.val instanceof Date) {
                payload.val = payload.val.toLocaleDateString();
            }
        } catch (err) {
            //console.log(err);
            payload.hex = '0x' + apdu.toString('hex');
            payload.raw = true;
        }
        // replace true/false with 1/0
        if (payload.val === true)
            payload.val = 1;
        else if (payload.val === false)
            payload.val = 0;
    }
}

module.exports = KnxHandler;