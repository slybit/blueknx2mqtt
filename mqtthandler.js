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
    this.knxRegExp = new RegExp(this.config.mqtt.topicPrefix + '\/(write|read)\/(.+)\/(.+)\/(.+)');
};
  
  

MqttHandler.prototype.handleMqttEvent = function(topic, message) {
    this.logger.silly('Received MQTT message on topic %s with value %s', topic, message);
    let match = this.knxRegExp.exec(topic);
    console.log(match);
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
    console.log(info);
    
    if (info && info.dpt) {                         
        //this.knxConnection.write(gad, message, info.dpt);
        this.logger.info("Writing to KNX: %s [%s]", gad, message);
    } else {
        let parts = rawRegExp.exec(message);
        if (!parts) {
            this.logger.warn('MQQT in: unknown DPT for GAD \"%s\" and provided data is not in hex [%s]', gad, message);
            return;
        } else {
            let buffer = Buffer.from(parts[2], 'hex');
            let bitlength = parts[4] ? parts[4] : buffer.length * 8;
            //this.knxConnection.writeRaw(gad, buffer, bitlength);
            this.logger.info("Writing RAW message to KNX: %s [%s]", gad, message)
        }
    }

    
    
}


  
module.exports = MqttHandler;