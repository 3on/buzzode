/*
  Filters and Sort used for torrents
*/
var _ = require('underscore');

var statusOrder = [6,3,2,1,0,4,5]

exports.sorts   = {
    date        : function(t){ return - t.addedDate },
    size        : function(t){ return - t.sizeWhenDone },
    peers       : function(t){ return - t.peersConnected },
    ratio       : function(t){ return - t.uploadRatio },
    box         : function(t){ return   t.box.id },
    status      : function(t){ return   statusOrder[t.status] }
}

// exports.sortsReverse = _.map(exports.sorts, function(sort, name){ return function(t){ return - s(t) } })
exports.sortsReverse = {}

_.each(exports.sorts, function(fn, name){
  exports.sortsReverse[name] = function(t){ return - fn(t) }
})

exports.filters = {
    all         : function(t){ return true },
    private     : function(t){ return (t.isPrivate) },
    public      : function(t){ return (!t.isPrivate) },
    over        : function(t){ return (t.isFinished) },
    active      : function(t){ return (t.status > 0) },
    queued      : function(t){ return (t.status % 1) },
    stopped     : function(t){ return (t.status == 0) },
    downloading : function(t){ return (t.status == 4) },
    seeding     : function(t){ return (t.status == 6) },
    checking    : function(t){ return (t.status == 2) },
    search      : function(sentence){
      return function(t){
        var words = _.map(sentence.split(' '), function(w) { if(w != '') return w } )
        return _.any(words, function(w){
          var reg = new RegExp(w, 'i')
          return t.name.match(reg)
        })
      }
    },
    tracker     : function(dns){
      return function(t){
        return  _.any(t.trackers, function(tracker){
          return (tracker.announce.indexOf(dns) >= 0 )
        })
      }
    }
}