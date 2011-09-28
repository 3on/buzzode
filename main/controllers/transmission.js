/*
  Single torrent actions
*/
exports.stop = function(req, res) {
  
  req.db.torrents.get(req.params.torId,
    function(err, torrent) {
        if (err) {
            console.log(err);
            res.send({ err : err });
            return;
        }
        var box = req.tr.getBoxById(torrent.BoxId);
        box.stop(torrent.trId, function(tres) {
            res.send(tres);
        });
    });
}

exports.start = function(req, res) {
  req.db.torrents.get(req.params.torId,
    function(err, torrent) {
        if (err) {
            console.log(err);
            res.send({ err : err });
            return;
        }
        var box = req.tr.getBoxById(torrent.BoxId);
        box.start(torrent.trId, function(tres){
            res.send(tres);
        });
    });
}

exports.verify = function(req, res) {
  req.db.torrents.get(req.params.torId,
    function(err, torrent) {
        if (err) {
            console.log(err);
            res.send({ err : err });
            return;
        }
        var box = req.tr.getBoxById(torrent.BoxId);
        box.verify(torrent.trId, function(tres){
            res.send(tres);
        });
    });

}

exports.reannounce = function(req, res) {
  req.db.torrents.get(req.params.torId,
    function(err, torrent) {
        if (err) {
            console.log(err);
            res.send({ err : err });
            return;
        }
        var box = req.tr.getBoxById(torrent.BoxId);
        box.reannounce(torrent.trId, function(tres){
            res.send(tres);
        });
    });

}

exports.remove = function(req, res) {
  req.db.torrents.get(req.params.torId,
    function(err, torrent) {
        if (err) {
            console.log(err);
            res.send({ err : err });
            return;
        }
        var box = req.tr.getBoxById(torrent.BoxId);
        box.remove(torrent.trId, function(tres){
            res.send(tres);
        });
    });

}

/*
   Multiple torrent actions
   {
    box:{boxId:[torId, ...], ...}
   }
*/

function multiClause(idList) {
    var res = '';
    for (var i = idList.length - 1; i >= 0; i--) {
        res += 'id = ?' + (i == 0 ? '' : ' or ');
    }
    return res;
}

exports.stopPOST = function(req, res) {
  var query = JSON.parse(req.body);
  req.db.torrents.multi(query.ids, function(err, torrents) {
    if (err) {
        console.log(err);
        res.send({ status : 'Error' });
        return;
    }
    for (var i = torrents.length - 1; i >= 0; i--) {
        req.tr.getBoxById(torrents[i].BoxId).stop(torrents[i].id);
    }
    res.send({ status : 'Done' });
  });
}

exports.startPOST = function(req, res) {
  var query = JSON.parse(req.body);
  req.db.torrents.multi(query.ids, function(err, torrents) {
    if (err) {
        console.log(err);
        res.send({ status : 'Error' });
        return;
    }
    for (var i = torrents.length - 1; i >= 0; i--) {
        req.tr.getBoxById(torrents[i].BoxId).start(torrents[i].id);
    }
    res.send({ status : 'Done' });
  });
}

exports.verifyPOST = function(req, res) {
  var query = JSON.parse(req.body);
    req.db.torrents.multi(query.ids, function(err, torrents) {
    if (err) {
        console.log(err);
        res.send({ status : 'Error' });
        return;
    }
    for (var i = torrents.length - 1; i >= 0; i--) {
        req.tr.getBoxById(torrents[i].BoxId).verify(torrents[i].id);
    }
    res.send({ status : 'Done' });
  });
}

exports.reannouncePOST = function(req, res) {
  var query = JSON.parse(req.body);
  req.db.torrents.multi(query.ids, function(err, torrents) {
    if (err) {
        console.log(err);
        res.send({ status : 'Error' });
        return;
    }
    for (var i = torrents.length - 1; i >= 0; i--) {
        req.tr.getBoxById(torrents[i].BoxId).reannounce(torrents[i].id);
    }
    res.send({ status : 'Done' });
  });
}

exports.removePOST = function(req, res) {
  var query = JSON.parse(req.body);
    req.db.torrents.multi(query.ids, function(err, torrents) {
    if (err) {
        console.log(err);
        res.send({ status : 'Error' });
        return;
    }
    for (var i = torrents.length - 1; i >= 0; i--) {
        req.tr.getBoxById(torrents[i].BoxId).remove(torrents[i].id);
    }
    res.send({ status : 'Done' });
  });
}
