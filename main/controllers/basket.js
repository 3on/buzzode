exports.list = function(req, res) {
    var clearChain = req.db.chainer();
    for (var i = req.basket.length - 1; i >= 0; i--) {
        res.write(req.basket[i].urlList + '\n');
    }
    res.end();
    req.db.basket.empty(req.session.user.id, function(err) {
        if (err) console.log('Failed to empty basket: ', err);
    });
}

exports.add = function(req, res) {
    var list = (req.body.urls instanceof Array) ? req.body.urls.join('\n') :
        req.body.urls;
    req.db.basket.add({
            TorrentId : req.params.torId,
            UserId : req.session.user.id,
            urlList : list
        }, 
        function(err) {
            if (err) {
                res.send({ status : 'FAILURE', error : err });
            } else {
                res.send({ status : 'SUCCESS' });
            }
        });
}

exports.remove = function(req, res) {
    req.db.basket.remove(req.params.id, req.session.user.id, function(err) {
        if (err) {
            res.send({ status : 'FAILURE', error : err });
        } else {
            res.send({ status : 'SUCCESS' });
        }
    });
}

exports.empty = function(req, res) {
    req.db.basket.empty(req.session.user.id, function(err) {
        if (err) console.log('Failed to empty basket: ', err);
        res.redirect('/basket/view');
    });
}

exports.render = function(req, res) {
    res.render('basket/list', {
        list : req.basket,
        title : 'My Basket'
    });
}
