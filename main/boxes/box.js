var _ = require('underscore');
var fs = require('fs');
var request = require('request');
var fields = JSON.parse(fs.readFileSync('./boxes/fields.json'))
//var console = require('../console').kind('warning')

function torrentLength(data) {
    if (data.info.files) { // Multiple files
        var result = 0;
        for (var files = data.info.files, i = files.length -1; i >= 0; i--) {
            result += files[i].length;
        }
        return result;
    } else { // Single file
        return data.info.length;
    }
}

function Box (initValues) {
  // attributes
  this.id = ''
  this.name = ''
  this.url = ''
  this.satelliteUrl = '';
  this.credentials = ''
  this.whiteListed = true

  var that = this;
  var maxTorrents = 0;
  var minFreeSpace = null;

  // contrustor
  function init(i) {
    that.id = i.id
    that.name = i.name
    that.url = i.url
    that.satelliteUrl = i.satelliteUrl;
    that.credentials = "Basic " + i.credentials
    that.trSessionId = i.trSessionId
    request({
        url : i.satelliteUrl + '/infos?boxId=' + i.id,
        method : 'GET'
    }, function(err, res, body) {
        if (err) {
          console.log("-- init box: " + that.name + "(" + that.satelliteUrl + ")");
          console.log(err);
        }
        else {
            var values = JSON.parse(body);
            maxTorrents = values['max-torrents'];
            minFreeSpace = values['min-free-space'];
        }
    });
    
    // Call transmission to request daemon's infos
    call({method: 'session-get'}, function(resp){
      that['rpc-version'] = resp.arguments['rpc-version']
    })
  }
  
  function call(message, callback) {
    //console.log("Transmission message sent:" + JSON.stringify(message))
    var timeout = 3
    var options = {
      url : that.url,
      method : 'POST',
      body : JSON.stringify(message),
      headers : {
        "Content-type": "application/json",
        'x-transmission-session-id' : that.trSessionId
      }
    }
    if(!that.whiteListed)
      options.headers.Authorization = that.credentials
    
    var transmissionCallback = function(error, response, body){
      if(response.statusCode == 401 && timeout--) { // Authentification needed
        options.headers.Authorization = that.credentials
        that.whiteListed = false
        request(options, transmissionCallback);
      }
      else if(response.statusCode == 409 && timeout--) { // session id needed
        options.headers['x-transmission-session-id'] = response.headers['x-transmission-session-id'];
        that.trSessionId = response.headers['x-transmission-session-id'];
        request(options, transmissionCallback);
      } 
      else
      {
        if(!timeout)
          console.log('ERROR TRANSMISSION: wrong transmission session id')
        else {
          //console.log(response.body);
          callback(JSON.parse(response.body));
        }
      }
    }
    request(options, transmissionCallback)
  }
  
  // methods
  /**
    the method 'torrent' can be used for both getting and setting
    a or multiple torrent's attributes.
    examples:
    box.torrents({ids: "*", fields : "*"}, function(torrents){}) -> get all torrents
    box.torrents({ids: "*", "priority-low":[]}, function(torrents){}) -> set all files from all torrent to low priority
  **/
  this.torrents = function(args, callback) {
    /* making id an Array */
    if (args.ids == undefined)
      delete args.ids
    else if (args.ids == "*")
      delete args.ids
    else if (args.ids.length == undefined)
      args.ids = [args.ids]
    else if (args.ids.length < 1)
      delete args.ids
        
    /* making an array of fields */
    if (args.fields == "*")
      args.fields = fields.all
    else if (args.fields == "details")
      args.fields = fields.details
    else if (args.fields == "short")
      args.fields = fields.short
    
    
    var message = {
      method: "torrent-get",
      arguments: args
    }
    /* no fields asked -> setter mode */
    if(args.fields == undefined) {
     message.method = "torrent-set"
    }
    
    call(message, function(resp) {
      callback(resp.arguments.torrents)
    })
  }
  
  function makeMeAmessage(i, method) {
    var r = {arguments: {}}
    if(i == "*") // wildcard
      r.arguments = {}
    else if(!isNaN(i)) // number
      r.arguments.ids = [i]
    else if(i.length < 1) // empty array
      r.arguments = {}
    else // it better be an array
      r.arguments.ids = i
    
    r.method = method
    
    return r
  }
  
  this.stop = function(ids, callback) {
    var message = makeMeAmessage(ids, "torrent-stop")
    call(message, callback)
  }
  
  this.start = function(ids, callback) {
    var message = makeMeAmessage(ids, "torrent-start") // WTF is torrent-start-now
    call(message, callback)
  }
  
  this.verify = function(ids, callback) {
    var message = makeMeAmessage(ids, "torrent-verify")
    call(message, callback)
  }
  
  this.reannounce = function(ids, callback) {
    var message = makeMeAmessage(ids, "torrent-reannounce")
    call(message, callback)
  }
  
  this.add = function(torrent, callback) {
    var message = {
      method: "torrent-add",
      arguments: torrent
    }
    call(message, callback)
  }
  
  this.canAdd = function(data, cb) {
    if (minFreeSpace !== null) {
        request({ url : that.satelliteUrl + '/df', method : 'GET' },
            function(err, res, body) {
                if (err) { console.log(err); cb(false); } else {
                    var available = JSON.parse(body).available;
                    console.log('Available space: ', available, '\nTorrent length: ', torrentLength(data));
                    cb(available * 1024 - torrentLength(data) > 
                            minFreeSpace * 1024 * 1024);
                }
            });
    } else {
        cb(false);
    }
  }
  
  this.remove = function(ids, callback) {
    var message = makeMeAmessage(ids, "torrent-remove")
    message.arguments["delete-local-data"] = true
    call(message, callback)
  }
  
  
  /*
    sync transmission's ids and MySQL's ids according to hashString
  */
  this.sync = function(db) {
    var message = {
        method : "torrent-get",
        arguments: {
            fields : ["id", "name", "hashString"]
        }
    };

    var callback = function(trTorrents) {
        trTorrents = trTorrents.arguments.torrents;
        db.torrents.list(function(err, dbTorrents) {
            if (err) {
                console.log(err);
                return;
            }
            for (var i = dbTorrents.length - 1; i >= 0; i--) {
                var dbTorrent = dbTorrents[i];
                for (var j = trTorrents.length - 1; j >= 0; j--) {
                    var trTorrent = trTorrents[j];
                    if (dbTorrent.hash == trTorrent.hashString) {
                        if (dbTorrent.trId != trTorrent.id) {
                            dbTorrent.updateAttributes({
                                trId : trTorrent.id
                            });
                        }
                        break;
                    }
                }
            }
            console.log('Sync done.');
        });
    };
    call(message, callback);
  }
  
  this.initTableTorrentsFromTransmission = function(db) {
    var message = {
        method : "torrent-get",
        arguments : { fields : ["id", "name", "hashString"] }
    };

    call(message, function(resp) {
        var data = resp.arguments.torrents;
        for (var i = data.length - 1; i >= 0; i--) {
            var torrent = {
                trId : data[i].id,
                hash : data[i].hashString,
                name : data[i].name,
                BoxId : that.id,
                UserId : 1
            };
            db.torrents.add(torrent, function(err) {
                if (err) {
                    console.log("-- initTableTorrentsFromTransmission")
                    console.log(err);
                }
            });
        }
    });
  }
  
  // pretending to do OOP
  init(initValues);
}

module.exports = Box;
