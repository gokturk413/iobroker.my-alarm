//const MyAlarm = require("iobroker.my-alarm/main");
const sqlite3 = require('sqlite3').verbose();
const fs =      require('fs');
const jsonfile = require('jsonfile');
const cors = require('cors');
const allowMethods = require('allow-methods');
const path = require('path');

/**
 * Web extension example
 *
 * @class
 * @param {object} server http or https node.js object
 * @param {object} webSettings settings of the web server, like <pre><code>{secure: settings.secure, port: settings.port}</code></pre>
 * @param {object} adapter web adapter object
 * @param {object} instanceSettings instance object with common and native
 * @param {object} app express application
 * @return {object} class instance
 */
function MyAlarmWebExtension(server, webSettings, adapter, instanceSettings, app) {
    this.app         = app;
    this.server = server;
    this.config      = instanceSettings ? instanceSettings.native : {};
    const that       = this;
    let jsondataforalarmcreater;
    // instanceSettings and this.config contain instance config (not web adapter, but this one with web-extension)
    //this.config.route = this.config.route || 'demo';

    /*this.unload = function () {
        return new Promise(resolve => {
            adapter.log.debug('Demo extension unloaded!');
            
            // unload app path
            const middlewareIndex = app._router.stack.findIndex(layer => 
                layer && layer.route === '/' + that.config.route);
                
            if (middlewareIndex !== -1) {
                // Remove the matched middleware
                app._router.stack.splice(middlewareIndex, 1);
            }
            
            resolve(middlewareIndex);
        });
    };*/

    // Optional: deliver to web the link to Web interface
    /*this.welcomePage = () => {
        return {
            link: 'example/',
            name: 'Example',
            img: 'admin/staticsfilefolder.png',
            color: '#157c00',
            order: 10,
            pro: false
        };
    }*/

    // Optional. Say to web instance to wait till this instance is initialized
    // Used if initalisation lasts some time
    this.readyCallback = null; 
    this.waitForReady = cb => {
        this.readyCallback = cb;
    }

    // self invoke constructor
    (function __constructor () {
        adapter.log.info('Install extension on / myalarm');
        
        //that.app.use('/' + that.config.route, express.static(that.config.dirname), serveIndex(that.config.dirname, {'icons': true}));
        that.app.get('/alarms/add', function (req, res) {
            const tagname= req.query.TagName;
            const alarmtype = req.query.AlarmType;
            const alarmdescription = req.query.AlarmDescription;
            //var limittype = req.query.LimitType;
            const lowlimit = req.query.LowLimit;
            const lowlimitmessage = req.query.LowLimitMessage;
            const lowalarmsound = req.query.LowAlarmSound;
            //var lowreftagname = req.query.LowRefTagName;
            const highlimit = req.query.HighLimit;
            const highlimitmessage = req.query.HighLimitMessage;
            //var highreftagname = req.query.HighRefTagName;
            const highalarmsound = req.query.HighAlarmSound;
            const alarmactive = req.query.AlarmActive;
            dbAddAlarm(tagname,alarmtype,alarmdescription,lowlimit,lowlimitmessage,lowalarmsound,highlimit,highlimitmessage,highalarmsound,alarmactive);

            res.format({
                'text/plain': function(){
                    res.send('1');
                }
            });
        });


       that.app.get('/alarms/update', function (req, res) {
            const alarmid = req.query.AlarmID;
            const tagname= req.query.TagName;
            const alarmtype = req.query.AlarmType;
            const alarmdescription = req.query.AlarmDescription;
            //var limittype = req.query.LimitType;
            const lowlimit = req.query.LowLimit;
            const lowlimitmessage = req.query.LowLimitMessage;
            const lowalarmsound = req.query.LowAlarmSound;
            //var lowreftagname = req.query.LowRefTagName;
            const highlimit = req.query.HighLimit;
            const highlimitmessage = req.query.HighLimitMessage;
            //var highreftagname = req.query.HighRefTagName;
            const highalarmsound = req.query.HighAlarmSound;
            const alarmactive = req.query.AlarmActive;
            dbUpdateAlarm(tagname,alarmtype,alarmdescription,lowlimit,lowlimitmessage,lowalarmsound,highlimit,highlimitmessage,highalarmsound,alarmactive,alarmid);

            res.format({
                'text/plain': function(){
                    res.send('1');
                }
            });
        });

        that.app.get('/alarms/delete', function (req, res) {
            const alarmid = req.query.AlarmID;
            const tagname = req.query.TagName;
            adapter.log.info("bu tagnamedir "+tagname);
           dbDeleteAlarm(alarmid,tagname);

            res.format({
                'text/plain': function(){
                    res.send('1');
                }
            });
        });

  

        that.app.get('/alarms/Getalarms', function (req, res) {
            const dttype = req.query.pq_datatype;
            const curpage = req.query.pq_curpage;
            const rpp= req.query.pq_rpp;
            const x= req.query._;
            let dbjson;
            dbgetAlarm(function(err, all) {
                dbjson = all;
                res.format({
                    'text/plain': function(){
                        const dbdatatojson='{"data":'+JSON.stringify(dbjson)+'}';
                        res.status(200).send(dbdatatojson);
                    }
                });
            });
    
        });









        that.app.get('/alarms/getSoundsName', function (req, res) {
            const sounds = getSoundsName();
            res.format({
                'text/plain': function(){
                    //var dbdatatojson="{\"data\":"+JSON.stringify(dbjson)+"}";
                    res.send(sounds);
                }
            });
        });

        that.app.post('/alarms/SoundFilesToVis', function (req, res) {
            res.format({
                'text/plain': function(){
                    copysoundfilestovis(settings.AlarmSoundUrl);
                }
            });
            genjs();
        });

        that.app.post('/alarms/genjs', function (req, res) {
            res.format({
                'text/plain': function(){
                    res.send('1');
                }
            });
            genjs();
        });

        that.app.use('/myalarm',  (req, res) => {
               getListOfAllAdapters(function (err, data) {
                    if (err) {
                        res.status(500).send('500. Error' + e);
                    } else {
                        res
                            .set('Content-Type', 'text/html')
                            .status(200)
                            .send(data);
                    }
                });
                return;
        });

        
        that.readyCallback && that.readyCallback(that);
    })
    ();

    
    function getListOfAllAdapters(callback) {
        try {
            // read all instances
            adapter.getObjectView('system', 'instance', {}, function (err, instances) {
                indexHtml = /*indexHtml || */fs.readFileSync(path.join(__dirname, '..', 'admin', 'Table.html')/*__dirname + '/admin/Table.html'*/);
                //let text = 'systemLang = "' + lang + '";\n';
                // text += 'list = ' + JSON.stringify(list, null, 2) + ';\n';
                // if login
                //text += 'var authEnabled = ' + this.config.auth + ';\n';
                callback(null, indexHtml/*.replace('// -- PLACE THE LIST HERE --', text)*/);
            });
        } catch (e) {
            callback(e);
        }
    }

    function dbgetAlarmFULL (callback) {
        let jsondb;
        const db = new sqlite3.Database(__dirname + '/alarms/alarm.db', (err) => {
            const sql = 'select AlarmID, TagName, AlarmType, AlarmDescription, LowLimit, LowLimitMessage, LowAlarmSound, LowRefTagName, HighLimit, HighLimitMessage, HighRefTagName, HighAlarmSound, AlarmActive from alarm';
            db.all(sql, (err, row) =>
            {
                if (err)
                {
                    //throw err;
                    return console.error(err.message);
                }
                jsondb=JSON.stringify(row);
                callback(err, row);
            });
            db.close();
        });
    }


   function dbgetAlarm (callback) {
        let jsondb;
        const db = new sqlite3.Database(__dirname + '/alarms/alarm.db', (err) => {
            const sql = 'select AlarmID, TagName, AlarmType, AlarmDescription, LowLimit, LowLimitMessage, LowAlarmSound, HighLimit, HighLimitMessage, HighAlarmSound, AlarmActive from alarm';
            //let playlistId = 1;
            db.all(sql, (err, row) =>
            {
                if (err)
                {
                    //throw err;
                    return console.error(err.message);
                }
                jsondb=JSON.stringify(row);
                callback(err, row);
            });
            db.close();
        });
    }


    function dbAddAlarm(tagname, alarmtype, alarmdescription,lowlimit,lowlimitmessage,lowalarmsound,highlimit,highlimitmessage,highalarmsound,alarmactive) {
        let jsondb;
        const db = new sqlite3.Database(__dirname + '/alarms/alarm.db');//, (err) => {
        // open the database connection
        const sql = 'INSERT INTO alarm( TagName, AlarmType, AlarmDescription, LowLimit, LowLimitMessage, LowAlarmSound, LowRefTagName, HighLimit, HighLimitMessage ,HighRefTagName, HighAlarmSound ,AlarmActive) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)';
        // output the INSERT statement
        const lowreftag  = tagname.split('.').join('_') +'_Low';
        const highreftag = tagname.split('.').join('_') +'_High';
        //var low
        db.run(sql, [tagname,alarmtype,alarmdescription,lowlimit,lowlimitmessage,lowalarmsound,lowreftag,highlimit,highlimitmessage,highreftag,highalarmsound,alarmactive], function(err) {
            if (err) {
                return console.error(err.message);
            }
            console.log(`Rows inserted ${this.changes}`);
            genjs();
        });
        // close the database connection
        db.close();
    }


    function dbUpdateAlarm(tagname,alarmtype,alarmdescription,lowlimit,lowlimitmessage,lowalarmsound,highlimit,highlimitmessage,highalarmsound,alarmactive,alarmid) {
        let jsondb;
        const db = new sqlite3.Database(__dirname + '/alarms/alarm.db');
        const lowreftag  = tagname.split('.').join('_') +'_Low';
        const highreftag = tagname.split('.').join('_') +'_High';
        const data = [tagname,alarmtype,alarmdescription,lowlimit,lowlimitmessage,lowalarmsound,lowreftag,highlimit,highlimitmessage,highreftag,highalarmsound,alarmactive,alarmid];
        // open the database connection
        const sql = 'UPDATE alarm SET  TagName=?, AlarmType=?, AlarmDescription=?, LowLimit=?, LowLimitMessage=?, LowAlarmSound=?, LowRefTagName=?, HighLimit=?, HighLimitMessage=?,HighRefTagName=? ,HighAlarmSound=?, AlarmActive=? WHERE AlarmID = ?';
        // output the INSERT statement
        db.run(sql,data, function(err) {
            if (err) {
                return console.error(err.message);
            }
            console.log(`Rows inserted ${this.changes}`);
            genjs();
        });
        // close the database connection
        db.close();
    }

    function dbDeleteAlarm(alarmid,tagname) {
        adapter.log.info("bu tagnamedir "+tagname);
        var hightname = 'my-alarm.0.'+tagname.split('.').join('_')+'_High';
        var lowtname = 'my-alarm.0.'+tagname.split('.').join('_')+'_Low';
        let jsondb;
        const db = new sqlite3.Database(__dirname + '/alarms/alarm.db');//, (err) => {
        // open the database connection
        const sql = 'Delete from alarm where AlarmID =?';
        // output the INSERT statement
        db.run(sql, [alarmid], function(err) {
            if (err) {
                return console.error(err.message);
            }
            adapter.delForeignObject(hightname, function(callback){
                
            });
            adapter.delForeignObject(lowtname, function(callback){
                
            });
            genjs();
        });
        // close the database connection
        db.close();
    }


   function SetObjectFromJson(element)
    {
        if (element.HighRefTagName != null) {

            adapter.setForeignObject('my-alarm.0.'+element.HighRefTagName, {
                type: 'state',
                common: {
                    name: element.HighRefTagName,
                    type: 'string',
                    role: 'value'
                },
                native: {}
            });
            adapter.setForeignState('my-alarm.0.'+element.HighRefTagName, {val: '', ack: true});
        }
        if (element.LowRefTagName != null) {
            adapter.setForeignObject('my-alarm.0.'+element.LowRefTagName, {
                type: 'state',
                common: {
                    name: element.LowRefTagName,
                    type: 'string',
                    role: 'value'
                },
                native: {}
            });
            adapter.setForeignState('my-alarm.0.'+element.LowRefTagName, {val: '', ack: true});
        }  
    }




   function createStatesFromJson(data) {
        data.forEach(function(element) {
            SetObjectFromJson(element);
        });
    }

    function writeForFile(fileName,data,callback)
    {
        fs.writeFile(fileName, data, function (err, data)
        {
            callback();
        });
    }
    //generate json file and set createstates from json
   function genjs() {
        let dbjson;
        dbgetAlarmFULL(function (err, all) {
            dbjson =JSON.stringify(all);

            writeForFile(__dirname +'/alarms/alarm.json',dbjson,function()
            {
            //It is now safe to write/read to alarm.json
                const file = __dirname +'/alarms/alarm.json';
                jsonfile.readFile(file, function(err, obj) {
                    createStatesFromJson(obj);
                    const readJson= jsonfile.readFileSync(__dirname +'/alarms/alarm.json');
                    jsondataforalarmcreater=readJson;
                });
            });
        });
    }

    async function  copysoundfilestovis (url) {
        const path = require('path');
        const srcPath = path.join(__dirname,'..','admin','sounds');;
        const destPath = url +'\\sounds'; //Any destination folder
        const fs = require('fs-extra');
        try {
            await fs.copy(srcPath, destPath);
            console.log('success!');
        } catch (err) {
            console.error(err);
        }
    }

   function getSoundsName() {

        let element = {},sounds =[];
        const soundsfolder = path.join(__dirname,'..','admin','sounds');//__dirname + '/admin/sounds/';
        const fs = require('fs');
        fs.readdirSync(soundsfolder).forEach(file => {
        //console.log(file);
            element = {};
            element.value = '';
            element.text = file;
            sounds.push(element);
        });
        const jsonvalue = JSON.stringify(sounds);
        return jsonvalue;
    }
}

module.exports = MyAlarmWebExtension;