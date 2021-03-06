const DPTLib = require('knx/src/dptlib');

function KnxHandler(config, map, mqttClient, logger) {

    if (!(this instanceof KnxHandler)) {
      return new KnxHandler(config, map, mqttClient, logger);
    }

    this.config = config;
    this.map = map;
    this.mqttClient = mqttClient;
    this.logger = logger;
};



KnxHandler.prototype.handleKNXEvent = function(evt, src, dst, value) {
    this.logger.silly("onKnxEvent %s, %s, %j", evt, dst, value);
    if (evt !== 'GroupValue_Write' && evt !== 'GroupValue_Response') {
        return;
    }
    let payload = {
        'srcphy': src,
        'dstgad': dst
    };
    this.enrichPayload(payload, value);
    if (evt === 'GroupValue_Response') payload.response = true;

    this.logger.verbose("%s KNX->MQTT: %s, dst: %s, value: %j",
      new Date().toISOString().replace(/T/, ' ').replace(/\..+/, ''),
      evt, dst, payload);

    let mqttMessage = JSON.stringify(payload);
    this.mqttClient.publish(this.config.mqtt.topicPrefix + "/status/" + dst, mqttMessage, {'retain' : true});
    if (payload.sub) {
        let topic = this.config.mqtt.topicPrefix + "/status/" + payload.main + "/" + payload.middle + "/" + payload.sub;
        this.mqttClient.publish(topic, mqttMessage, {'retain' : true});
    }
}

KnxHandler.prototype.updatePrev = function(payload, apdu) {
    let info = this.map.GAToPrev.get(payload.dstgad);

    if (info === undefined) {
        info = {'prev': undefined, 'lastChange': undefined};
        this.map.GAToPrev.set(payload.dstgad, info);
    }

    if ((info.prev === undefined) || (info.prev !== undefined && !info.prev.equals(apdu))) {
        info.lastChange = (new Date).getTime();
        info.prev = apdu;
    }
    return info.lastChange;
}

KnxHandler.prototype.enrichPayload = function(payload, apdu) {
    // time stamps
    payload.lc = this.updatePrev(payload, apdu);
    payload.ts = (new Date).getTime();

    // value
    let info = this.map.GAToname.get(payload.dstgad);
    if (info === undefined) {
        payload.val = '0x'+apdu.toString('hex');
        payload.raw = true; // indication that payload is raw binary value
    } else {
        payload.dpt = info.dpt;
        payload.main = info.main;
        payload.middle = info.middle;
        payload.sub = info.sub;
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
            console.log(err);
            payload.val = '0x'+apdu.toString('hex');
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