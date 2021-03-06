let rawRegExp = new RegExp('^(0x|0X)([a-fA-F0-9]+)(\\+(\\d+))?$');
let gadRexExp  = new RegExp('^(\\d+)\/(\\d+)\/(\\d+)$');


function MqttHandler(config, map, knxConnection, logger) {

    if (!(this instanceof MqttHandler)) {
      return new MqttHandler(config, map, knxConnection, logger);
    }

    this.config = config;
    this.map = map;
    this.knxConnection = knxConnection;
    this.logger = logger;
    this.knxRegExp = new RegExp(this.config.mqtt.topicPrefix + '\/(write|read|set|get|toggle)\/(.+)\/(.+)\/(.+)');
};



MqttHandler.prototype.handleMqttEvent = function(topic, message) {
    this.logger.silly('Received MQTT message on topic %s with value %s', topic, message);
    let match = this.knxRegExp.exec(topic);
    if (!match)
        return;
    let dst = match[2] + "/" + match[3] + "/" + match[4]; // either numeric or main/middle/sub
    let command = match[1];

    // first try to look up as "name=main/middle/sub"
    let gad = this.map.nameToGA.get(dst);

    if (gad === undefined) gad = dst;
    // check the gad that we have now
    if (!gadRexExp.exec(gad)) {
        this.logger.warn('MQQT in: do not understand the KNX group address [%s]', gad);
        return;
    }
    // now look up the info
    let info = this.map.GAToname.get(gad);

    switch (command.toLowerCase()) {

        case "write":
        case "set":
            // "raw" format gets priority
            let parts = rawRegExp.exec(message);
            if (parts) {
                let buffer = Buffer.from(parts[2], 'hex');
                let bitlength = parts[4] ? parts[4] : buffer.length * 8;
                this.knxConnection.writeRaw(gad, buffer, bitlength);
                this.logger.verbose("%s MQTT->KNX: Writing RAW message to KNX:  %s, value [%s]",
                    new Date().toISOString().replace(/T/, ' ').replace(/\..+/, ''),
                    gad, message);
                }
            else if(info && info.dpt) {
                this.knxConnection.write(gad, message, info.dpt);
                this.logger.verbose("%s MQTT->KNX: Writing message to KNX:  %s, value [%s]",
                    new Date().toISOString().replace(/T/, ' ').replace(/\..+/, ''),
                    gad, message);
            } else {
                this.logger.warn('MQQT in: unknown DPT for GAD \"%s\" and provided data is not in hex [%s]', gad, message);
                return;
            }
            break;
        case "read":
        case "get":
            this.knxConnection.read(gad);
            this.logger.verbose("%s MQTT->KNX: Reading from KNX:  %s",
                    new Date().toISOString().replace(/T/, ' ').replace(/\..+/, ''),
                    gad);
            break;
        case "toggle":
            // in case of toggle, the message is supposed to be the state Group Address
            if (!gadRexExp.exec(message)) {
                this.logger.warn('MQQT in: "toggle" command without valid state Group Address: %s', message);
                return;
            }
            let prev = this.map.GAToPrev.get(message).prev;
            let value = 0;
            if (!prev || prev.equals(new Buffer([0x00]))) value = 1;
            this.knxConnection.write(gad, value, "DPT1");
            this.logger.verbose("%s MQTT->KNX: Toggling KNX switch %s from [%d] to [%d]",
                    new Date().toISOString().replace(/T/, ' ').replace(/\..+/, ''),
                    gad, gad, value == 1 ? 0 : 1, value);
            break;
    }


}



module.exports = MqttHandler;