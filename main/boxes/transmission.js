var _ = require('underscore')
var Box = require('./box.js')
var decoder = require('../lib/bdecode.js')
var fs = require('fs')
var torrentStatus = JSON.parse(fs.readFileSync('./boxes/status.json'))
var filtersAndSorts = require('./sortsAndFilters.js')
var human = require('../human')
//var console = require('../console').kind('warning')

exports.sorts = filtersAndSorts.sorts
exports.sortsReverse = filtersAndSorts.sortsReverse
exports.filters = filtersAndSorts.filters

var db = {};
var boxes = {};
var orderedIds = [];

function base64(str) {
  return (new Buffer(str)).toString('base64')
}

exports.add = function(data, cb) {
    var brk = false;
    var decoded = decoder.decodeSync(data);
    var trData = { 'metainfo' : data.toString('base64') };
    var addOnce = _.once(function(boxId) {
        boxes[boxId].add(trData, function(result) {
            result.boxId = boxId;
            console.log(result);
            cb(result);
        });
    });
    var no = _.after(orderedIds.length, function() {
        cb(null);
    });

    for (var i = 0, l = orderedIds.length; i < l; i++) {
        var key = orderedIds[i];
        boxes[key].canAdd(decoded, function(yes) {
            if (yes) {
                brk = true; addOnce(key);
            } else {
                no();
            }
        });
        if (brk) break;
    }
}

exports.getBoxByName = function(boxName) {
  boxName = boxName.toLowerCase();
  for (var b in boxes) {
    if (b.name.toLowerCase() == boxName) {
        return b;
    }
  }
}

exports.loadBoxes = function() {
  db.boxes.list(function(err, dbBoxes) {
    if (err) {
        console.log('Box list failed', err);
    } else {
        boxes = {};
        orderedIds = [];
        _.each(dbBoxes, function(box) {
            orderedIds.push(box.id);
            box.credentials = base64(box.user + ":" + box.password);
            box.trSessionId = "";
            boxes[box.id] = new Box(box);
        });
        console.log(dbBoxes.length + " box(es) loaded.")
    }
  });
}

exports.sync = function() {
  _.each(boxes, function(box, boxes) {
    console.log("sync box: " + box.name + "("+box.id+")");
    box.sync(db);
  });
}

exports.getBoxById = function(boxId) {
    return boxes[boxId];
}

/*
  Calls torrent on each box and merge the results
*/
exports.torrents = function(args, callback) {
  var mergedRes = []
  var i = 0;
  var cb = _.after(_.size(boxes), callback);
  // looping on all boxes
  _.each(boxes, function(box) {
    // fetching torrents on the box
    box.torrents(args, function(res) {
      // add some attributes
      _.each(res, function(t) {
        t.box = {id: box.id, name: box.name}
        t.pourcent = Math.ceil(((t.sizeWhenDone - t.leftUntilDone) / t.sizeWhenDone) * 100)
        // support for version before and after the revision 14
        if(boxes[box.id]['rpc-version'] < 14) {
          var conv = {
             1 : 1
            ,2 : 2
            ,4 : 4
            ,8 : 6
            ,16 : 0
          }
          t.status = conv[t.status]
        }
        // add human friendly attributes
        t.statusHuman = torrentStatus.en[t.status]
        t.addedDateHuman = human.timestamp(t.addedDate)
        t.sizeWhenDoneHuman = human.octets(t.sizeWhenDone)
        t.leftUntilDoneHuman = human.octets(t.leftUntilDone)
      })
      // adding the torrents to the resulting array
      mergedRes = mergedRes.concat(res)
      // if this is the last box, call the callback
      cb(mergedRes);
    })
  })
}
 
exports.init = function(database) {
  db = database;
  exports.loadBoxes();
}
