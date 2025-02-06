// @ts-nocheck
'use strict';

/*
 * Created with @iobroker/create-adapter v2.5.0
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require('@iobroker/adapter-core');
const express = require('express');
const serveIndex = require('serve-index');
const sqlite3 = require('sqlite3').verbose();
const fs =      require('fs');
const jsonfile = require('jsonfile');
const cors = require('cors');
const allowMethods = require('allow-methods');
const path = require('path');

let myalarm;
let indexHtml;
let webServer   = null;
let jsondataforalarmcreater;
const obj = {
    table: []
};
let readJson="";
const lang = 'en';
let self;
// Load your modules here, e.g.:
// const fs = require("fs");

class MyAlarm extends utils.Adapter {

    /**
     * @param {Partial<utils.AdapterOptions>} [options={}]
     */
    constructor(options) {
        super({
            ...options,
            name: 'my-alarm',
        });

        this.on('ready', this.onReady.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
        // this.on('objectChange', this.onObjectChange.bind(this));
        this.on('message', this.onMessage.bind(this));
        this.on('unload', this.onUnload.bind(this));
    }

    /**
     * Is called when databases are connected and adapter received configuration.
     */
    async onReady() {
        // Initialize your adapter here
        self = this;
        // Reset the connection indicator during startup
        this.setState('info.connection', true, true);

        // The adapters config (in the instance object everything under the attribute "native") is accessible via
        // this.config:
        /*this.log.info('config option1: ' + this.config.option1);
        this.log.info('config option2: ' + this.config.option2);*/

        /*
        For every state in the system there has to be also an object of type state
        Because every adapter instance uses its own unique namespace variable names can't collide with other adapters variables
        */

        this.setObject('info.AlarmJson', {
            type: 'state',
            common: {
                name: 'AlarmJson',
                type: 'string',
                role: 'value'
            },
            native: {}
        });


        this.setObject('info.AlarmSound', {
            type: 'state',
            common: {
                name: 'AlarmSound',
                type: 'string',
                role: 'value'
            },
            native: {}
        });

        this.setObject('info.isAlarm', {
            type: 'state',
            common: {
                name: 'isAlarm',
                type: 'boolean',
                role: 'value'
            },
            native: {}
        });

        this.setObject('info.AlarmType', {
            type: 'state',
            common: {
                name: 'AlarmType',
                type: 'string',
                role: 'value'
            },
            native: {}
        });

        this.setObject('info.AcknowledgeId', {
            type: 'state',
            common: {
                name: 'AlarmType',
                type: 'number',
                role: 'value'
            },
            native: {}
        });

        this.setObject('info.AlarmMessage', {
            type: 'state',
            common: {
                name: 'AlarmType',
                type: 'string',
                role: 'value'
            },
            native: {}
        });
        // In order to get state updates, you need to subscribe to them. The following line adds a subscription for our variable we have created above.
        //this.subscribeStates('testVariable');
        // You can also add a subscription for multiple states. The following line watches all states starting with "lights."
        // this.subscribeStates('lights.*');
        // Or, if you really must, you can also watch all states. Don't do this if you don't need to. Otherwise this will cause a lot of unnecessary load on the system:
        //this.subscribeStates('my-alarm.'+this.instance+'.*');
        this.subscribeForeignStates('*');
        /*
            setState examples
            you will notice that each setState will cause the stateChange event to fire (because of above subscribeStates cmd)
        */
        // the variable testVariable is set to true as command (ack=false)
        //await this.setStateAsync('testVariable', true);

        // same thing, but the value is flagged "ack"
        // ack should be always set to true if the value is received from or acknowledged from the target system
        //await this.setStateAsync('testVariable', { val: true, ack: true });

        // same thing, but the state is deleted after 30s (getState will return null afterwards)
        //await this.setStateAsync('testVariable', { val: true, ack: true, expire: 30 });

        // examples for the checkPassword/checkGroup functions
        let result = await this.checkPasswordAsync('admin', 'iobroker');
        this.log.info('check user admin pw iobroker: ' + result);

        result = await this.checkGroupAsync('admin', 'admin');
        this.log.info('check group user admin group admin: ' + result);
        //webServer = this.initWebServer(this.config,this);
        this.Run();

        readJson= jsonfile.readFileSync(__dirname +'\\lib\\alarms\\alarm.json');
        jsondataforalarmcreater=readJson;
    }

    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     * @param {() => void} callback
     */
    onUnload(callback) {
        try {
            // Here you must clear all timeouts or intervals that may still be active
            // clearTimeout(timeout1);
            // clearTimeout(timeout2);
            // ...
            // clearInterval(interval1);

            callback();
        } catch (e) {
            callback();
        }
    }

    // If you need to react to object changes, uncomment the following block and the corresponding line in the constructor.
    // You also need to subscribe to the objects with `this.subscribeObjects`, similar to `this.subscribeStates`.
    // /**
    //  * Is called if a subscribed object changes
    //  * @param {string} id
    //  * @param {ioBroker.Object | null | undefined} obj
    //  */
    // onObjectChange(id, obj) {
    //     if (obj) {
    //         // The object was changed
    //         this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
    //     } else {
    //         // The object was deleted
    //         this.log.info(`object ${id} deleted`);
    //     }
    // }

    /**
     * Is called if a subscribed state changes
     * @param {string} id
     * @param {ioBroker.State | null | undefined} state
     */
    onStateChange(id, state) {
        if (state) {
            // The state was changed
            //this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
            if(jsondataforalarmcreater!=null)
            {
                if(id=='my-alarm.'+this.instance+'.info.AcknowledgeId')
                {
                    this.dbUpdateLogAlarmAck(state.val);
                }
                const arrayFound = jsondataforalarmcreater.findByValueOfObject('TagName', id);//jsondataforalarmcreater.filter(function(value){ return value.TagName==id;})
                if(arrayFound.length!=0)
                {
                    this.Setalarm(arrayFound,state.val);
                }
            }
        } else {
            // The state was deleted
            this.log.info(`state ${id} deleted`);
        }
    }

    // If you need to accept messages in your adapter, uncomment the following block and the corresponding line in the constructor.
    // /**
    //  * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
    //  * Using this method requires "common.messagebox" property to be set to true in io-package.json
    //  * @param {ioBroker.Message} obj
    //  */
     onMessage(obj) {
     if (typeof obj === 'object' && obj.message) {
             if (obj.command === 'getlog') {
                let alldata="";
                // e.g. send email or pushover or whatever
                 this.log.info('send command');
                 self.dbgetLogAlarmFull(obj.message.startdate,obj.message.enddate, function(err, all) {
                    alldata= all;
                    if (obj.callback) self.sendTo(obj.from, obj.command, all, obj.callback);
                });
                // Send response in callback if required
                
             }
         }
     }
    //----------------------------------------------------SQLITE DB Operations CRUD---------------------------------------------
    


    

    


   
    dbAddLogAlarm(tagname, alarmtype, alarmdescription, limit, limitmessage,highorlow, alarmtime, alarmvalue) {
        let jsondb;
        const db = new sqlite3.Database(__dirname + '/lib/alarms/alarm.db');//, (err) => {
        // open the database connection
        const sql = 'INSERT INTO alarmlog( Tagname, Alarmtype, Description, LimitValue, Limitmessage,HIGH_LOW, AlarmTime, AlarmValue,Acknowledge) VALUES(?,?,?,?,?,?,?,?,?)';

        db.run(sql, [tagname,alarmtype,alarmdescription,limit,limitmessage,highorlow, alarmtime, alarmvalue,'unack'], function(err) {
            if (err) {
                return console.error(err.message);
            }
            console.log(`Rows inserted ${this.changes}`);
        });
        // close the database connection
        db.close();
    }

    dbgetLogAlarm(callback) {
        let jsondb;
        const db = new sqlite3.Database(__dirname + '/lib/alarms/alarm.db', (err) => {
            const sql = 'SELECT id,Tagname,Alarmtype, datetime(AlarmTime/1000,\'unixepoch\',\'localtime\') as alarmtime, Description,LimitValue,Limitmessage,HIGH_LOW,AlarmTime,AlarmValue,Acknowledge, datetime(AcknowledgeTime/1000,\'unixepoch\',\'localtime\') as acknowledgetime  FROM alarmlog WHERE Acknowledge = "unack" ORDER BY alarmtime DESC LIMIT 5;';
            //let playlistId = 1;
            db.all(sql, (err, row) =>
            {
                if (err)
                {
                //throw err;
                    return console.error(err.message);
                }
                jsondb=JSON.stringify(row);
                callback(err, jsondb);
            });
            db.close();
        });
    }


    dbgetLogAlarmFull(startdate,enddate,callback) {
        let jsondb;
                   
        const sql='SELECT id,Tagname,Alarmtype, datetime(AlarmTime/1000,\'unixepoch\',\'localtime\') as alarmtimeconverted, date(AlarmTime/1000,\'unixepoch\',\'localtime\') as alarmdateconverted,Description,LimitValue,Limitmessage,HIGH_LOW,AlarmTime,AlarmValue,Acknowledge, datetime(AcknowledgeTime/1000,\'unixepoch\',\'localtime\') as acknowledgetime  FROM alarmlog WHERE alarmtimeconverted BETWEEN ? AND ?';
        const db = new sqlite3.Database(__dirname + '/lib/alarms/alarm.db', (err) => {
            db.all(sql,[ startdate, enddate ], (err, row) =>
            {
                if (err)
                {
                //throw err;
                    return console.error(err.message);
                }
                jsondb=JSON.stringify(row);
                callback(err, jsondb);
            });
            db.close();
        });
    }



    dbUpdateLogAlarmAck(alarmid) {
        const moment = require('moment');
        const formattedDate = moment().valueOf();
        const contondate = moment(formattedDate).format('LLL');

        let jsondb;
        const db = new sqlite3.Database(__dirname + '/lib/alarms/alarm.db');

        const data = [alarmid];
        // open the database connection
        const sql = 'UPDATE alarmlog SET  Acknowledge=\'ack\',AcknowledgeTime='+formattedDate+'  WHERE id = ?';
        // output the INSERT statement
        db.run(sql,data, function(err) {
            if (err) {
                return console.error(err.message);
            }
            console.log(`Rows inserted ${this.changes}`);
        });
        // close the database connection
        db.close();
    }


    //--------------------------------------END SQLITE DB Operations CRUD---------------------------------------------

    



   

    //get sound name to list


    copysoundfilestovisxxx()
    {
    /*var path = require('path');
    var ncp = require('ncp').ncp;

    ncp.limit = 16;

    var srcPath = __dirname +'\\www\\sounds'
    //path.dirname('www/sounds'); //current folder
    var myexchangepath = webServer.settings.AlarmSoundUrl.replace("/", "\'");
    var destPath = 'C:\\Users\\windows10\\Desktop\\iobroker\\iobroker-data\\files\\vis' //Any destination folder

    console.log('Copying files...');
    ncp(srcPath, destPath, function (err) {
        if (err) {
            return console.error(err);
        }
        console.log('Copying files complete.');
    });*/


    }

   



    //polling to AlarmJson
    getalarmforinterval() {
        this.dbgetLogAlarm(function(err, all) {
        //if(all!='[]') {
            self.setState('info.AlarmJson', {val: all, ack: true});
        //}
        });
    }

    //setInterval(getalarmforinterval, 3000);

    Run(){
        const self1 = this;
        self1.interval = setInterval(function() { self1.getalarmforinterval(); },3000);
    }




    Setalarm(element,value)
    {
        const moment = require('moment');
        const formattedDate = moment().valueOf();
        const contondate = moment(formattedDate).format('LLL');


        if (element[0].AlarmActive == 'true') {
            let limitmessage;
            let limit;
            this.getState(element[0].LowRefTagName, function (err, state)
            {

                if (state.val=='0' || state.val != 'ack')
                {
                    if(state.val=='' && state.val < element[0].LowLimit) 
                    {  
                    if (value <= element[0].LowLimit)
                    {
                        limitmessage = element[0].LowLimitMessage;
                        limit = element[0].LowLimit;
                        self.setState(element[0].LowRefTagName, {val: value, ack: true});
                        const jo = {
                            Tagname: element[0].TagName,
                            Alarmdescription: element[0].AlarmDescription,
                            limitmessage: limitmessage,
                            alarmvalue: value,
                            Limit: limit,
                            Alarmtype:element[0].AlarmType
                        };


                        self.dbgetLogAlarm(function(err, all) {
                            self.setState('info.AlarmJson', {val: all, ack: true});
                        });

                        self.setState('info.AlarmMessage', {val: element[0].LowLimitMessage, ack: true});
                        self.setState('info.AlarmSound', {val: element[0].LowAlarmSound, ack: true});
                        self.setState('info.isAlarm', {val: true, ack: true});
                        self.setState('info.AlarmType', {val: element[0].AlarmType, ack: true});
                        self.dbAddLogAlarm(element[0].TagName, element[0].AlarmType, element[0].AlarmDescription, element[0].LowLimit,element[0].LowLimitMessage,'low',formattedDate,value);
                    }
                }
                }
            });

            this.getState(element[0].HighRefTagName,function (err, state)
            {
                if (state.val=='0' || state.val != 'ack')
                {
                    if( state.val=='' && state.val < element[0].HighLimit)
                    {             
                    if (value >= element[0].HighLimit)
                    {
                        limitmessage = element[0].HighLimitMessage;
                        limit = element[0].HighLimit;
                        self.setState(element[0].HighRefTagName, {val: value, ack: true});
                        const jo = {
                            Tagname: element[0].TagName,
                            Alarmdescription: element[0].AlarmDescription,
                            limitmessage: limitmessage,
                            alarmvalue: value,
                            Limit: limit,
                            Alarmtype:element[0].AlarmType
                        };


                        self.dbgetLogAlarm(function(err, all) {
                            self.setState('info.AlarmJson', {val: all, ack: true});
                        });
                        self.setState('info.AlarmMessage', {val: element[0].HighLimitMessage, ack: true});
                        self.setState('info.AlarmSound', {val: element[0].HighAlarmSound, ack: true});
                        self.setState('info.isAlarm', {val: true, ack: true});
                        self.setState('info.AlarmType', {val: element[0].AlarmType, ack: true});
                        self.dbAddLogAlarm(element[0].TagName, element[0].AlarmType, element[0].AlarmDescription, element[0].HighLimit, element[0].HighLimitMessage,'high',formattedDate, value);
                    }
                    }
                }
            });


            //reset 0
            this.getState(element[0].TagName,function (err, state)
            {
                if (value < element[0].HighLimit && value > element[0].LowLimit)
                {
                    self.setState('info.AlarmMessage', {val: 0, ack: true});
                    self.setState(element[0].LowRefTagName, {val: '', ack: true});
                    self.setState(element[0].HighRefTagName, {val: '', ack: true});
                    self.setState('info.isAlarm', {val: false, ack: true});
                    self.setState('info.AlarmType', {val: '0', ack: true});
                    self.setState('info.AlarmSound', {val: '0', ack: true});
                }
            });
        }
    }



    //--------------------------------End Alarm Creater JSON CRUD-------------------------------------------
    //--------------------------------End Alarm Creater JSON CRUD-------------------------------------------
    //--------------------------------End Alarm Creater JSON CRUD-------------------------------------------
    //--------------------------------End Alarm Creater JSON CRUD-------------------------------------------



}

Array.prototype.findByValueOfObject = function(key, value) {
    return this.filter(function(item) {
        return (item[key] === value);
    });
};


if (require.main !== module) {
    // Export the constructor in compact mode
    /**
     * @param {Partial<utils.AdapterOptions>} [options={}]
     */
    module.exports = (options) => new MyAlarm(options);
    //exports.dbgetAlarm  = (options) =>new MyAlarm(options).dbgetAlarm;

} else {
    // otherwise start the instance directly
    new MyAlarm();
}