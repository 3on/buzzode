var formidable = require('formidable')
var _ = require('underscore')
var fs = require('fs')
var http = require('http')
var urlParse = require('url')
var geoip = require('geoip')
var city = new geoip.City('./GeoLiteCity.dat')
var country6 = new geoip.Country6('./GeoIPv6.dat')
var url = require('url')

function render(res, err, info) {
    res.render('torrent/add', {
        title : 'BuZzOde - Add Torrent',
        error : !!err,
        info : info
    });
}

function getBinary(url, cb) {
    var parsed = urlParse.parse(url);
    http.get({
        host : parsed.hostname,
        path : parsed.pathname,
        port : parsed.port || 80
    }, function(res) {
        var data = [];
        res.on('data', function(d) {
            data.push(d);
        });
        res.on('end', function() {
            for (var i = data.length - 1, l = 0; i >= 0; i--) {
                l += data[i].length;
            }
            var buf = new Buffer(l);
            for (var j = 0, i = 0, l = data.length; i < l; i++) {
                data[i].copy(buf, j);
                j += data[i].length;
            }
            cb(null, buf);
        });
    });
}

function addToClient(type, uri, tr, callback) {
    function readCb(err, data) {
        if (err) {
            console.log(err);
            callback(null);
        } else {
            tr.add(data, callback);
        }
    }

    if (type == 'local') {
        fs.readFile(uri, readCb);
    } else { // http
        getBinary(uri, readCb);
    }
}

function addToDb(req, data) {
    if (data.result != 'duplicate torrent') {
        var d = data.arguments['torrent-added'];
        req.db.torrents.add({
            trId : d.id, 
            hash : d.hashString, 
            name : d.name,
            BoxId : data.boxId,
            UserId : req.session.user.id
        }, function(err) {
            if (err) console.log(err);
        });
    }
}

exports.add = function(req, res) {
    render(res);
}

exports.addPOST = function(req, res) {
    var form = new formidable.IncomingForm();

    function trCallback(data) {
        if (!data) {
            render(res, true, 'No space available');
        } else {
            addToDb(req, data);
            render(res, false, 'Torrent successfully added');
        }
    }

    form.parse(req, function(err, fields, files) {
        if (err) {
            render(res, true, err);
        } else {
            if (fields.feedType == 'upload') {
                var file = files.upload;
                if (file.type == 'application/x-bittorrent' || 
                        file.type == 'application/octet-stream') {
                    addToClient('local', file.path, req.tr, trCallback);
                } else {
                    render(res, true, 'Uploaded file is not a torrent file.');
                }
            } else {
                addToClient('http', fields.url, req.tr, trCallback);
            }
        }
    });
}


function filterAndSort (tr, session) {
  var sortName = (!session.torrents || !session.torrents.sort)? 'date' : session.torrents.sort
  var order = (!session.torrents)? true : session.torrents.order == true
  var filterNames = (!session.torrents || !session.torrents.filters)? ['all'] : session.torrents.filters
  
  var sort = (order)? tr.sorts[sortName] : tr.sortsReverse[sortName]
  var filters =  _.map(filterNames, function(filter){
    
    // special filters: search & tracker
    if( _.include(['search', 'tracker'], filter) ) {
      if( filter == 'search' )
        return tr.filters[filter](session.torrents.search)
        
      if( filter == 'tracker')
        return tr.filters[filter](session.torrents.tracker)
    }
    else
      return tr.filters[filter]
  })
  
  var filter    = function (e) { return _.reduce(filters, function(all, c){ return all && c(e)}, true)}
  
  return function(torrents){
    return _.sortBy(_.select(torrents, filter), sort)
  }
  
}

function trackerTracking (t) {
  var res = []
  _.each(t, function(tracker, k) {
    if( tracker.announce ) { // FIXME should use t.tier ???
      var urlInfo= url.parse(tracker.announce, true)
      var dns = urlInfo.hostname
      var deDotted = dns.split('.')
      if(deDotted.length > 2) {
        dns = deDotted[deDotted.length - 2] + "." + deDotted[deDotted.length - 1]
      }
      res.push(dns)
    }
  })
  return res
}

exports.all = function(req, res) {
  req.tr.torrents({ids: "*", fields: "short"}, function(torrents) {
    req.db.torrents.list(function(err, dbTorrents) {
        if (err) {
            console.log(err);
            res.render('torrent/all', {
                title : 'All torrents',
                torrents : [],
                filters: _.keys(req.tr.filters),
                sorts: _.keys(req.tr.sorts)
            });
            return;
        }
        var trackers = []
        for (var i = torrents.length - 1; i >= 0; i--) {
            for (var j = dbTorrents.length - 1; j >= 0; j--) {
                if (dbTorrents[j].trId == torrents[i].id) {
                    torrents[i].id = dbTorrents[j].id;
                    
                    // let's keep track of trackers :D
                    var torrentTrackers = trackerTracking(torrents[i].trackers)
                    if(torrentTrackers[0]) {
                      trackers = _.union(trackers, torrentTrackers[0])
                      torrents[i].trackerDNS = torrentTrackers[0]
                    }
                      
                    break;
                }
            }
            if (j < 0)
                torrents.splice(i, 1)
        }
        var fas = filterAndSort(req.tr ,req.session)
        torrents = fas(torrents)
        
        res.render('torrent/all', {
            title: "All torrents",
            torrents: torrents,
            filters: _.keys(req.tr.filters),
            trackers: _.sortBy(trackers, _.identity),
            sorts: _.keys(req.tr.sorts)
        });
    });
  });

}

function shortify(str) {
  var i = str.lastIndexOf('/') + 1
  return str.slice(i, str.length)
}

exports.view = function(req, res) {
  //req.db.Torrents
  req.db.torrents.get(req.params.id, function(err, torrent) {
        if (err) {
            console.log(err);
            res.redirect('/');
            return;
        }
        var box = req.tr.getBoxById(torrent.BoxId);
        box.torrents({ ids : torrent.trId, fields : 'details' },
            function(torrents) {
                var trTorrent = torrents[0];

                _.each(trTorrent.files, function(f) {
                    f.nameShort = shortify(f.name)
                });
                res.render('torrent/view', {
                  title : trTorrent.name,
                  torrent : trTorrent,
                  box: box,
                  dbId : req.params.id,
                  user : req.session.user
                });
            });
    });
}



exports.hadopi = function(req, res) {
  req.db.torrents.get(req.params.id, function(err, torrent) {
    var box = req.tr.getBoxById(torrent.BoxId)
    box.torrents({ ids : torrent.trId, fields : 'details' }, 
        function(torrents){
          var trTorrent = torrents[0];
          trTorrent.id = req.params.id
          // loop on torrents
          _.each(trTorrent.files, function(f) {
            f.nameShort = shortify(f.name)
          })

          function closeTheDeal() {
            trTorrent.peers = _.sortBy(trTorrent.peers,
              //function(e) { return e.address} )
              function(e) { return - e.rateToPeer + e.rateToClient } );

            res.render('torrent/hadopi', {
              title : trTorrent.name,
              torrent : trTorrent,
              box: box
            });
          }

          var callback = _.after(trTorrent.peers.length, closeTheDeal)
          // loop on peers
          _.each(trTorrent.peers, function(peer, i) {
            city.lookup(peer.address, function(err, data) {
              if(err)
                trTorrent.peers[i].geoip = 
                    country6.lookupSync(peer.address) // FIXME could be a bad thing
              else
                trTorrent.peers[i].geoip = data
              // is it over ?
              callback() 
            });
          });
        });
    });
}
