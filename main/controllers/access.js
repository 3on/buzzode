require('../utils');

function store(userId, obj, db, cb) {
    obj.accesses = {};
    db.access.accesses(userId, function(err, accesses) {
        for (var i = accesses.length - 1; i >= 0; i--) {
            var box = accesses[i].BoxId || 'all';
            obj.accesses[box] = obj.accesses[box] || [];
            obj.accesses[box].push(accesses[i].name);
        }
        cb();
    });
}

function checkHasAccess(accessList, accessType, cb, boxId) {
    if (boxId) {
        cb(accessList['all'].indexOf(accessType) >= 0 || 
            accessList[boxId].indexOf(accessType) >= 0);
    } else {
        cb(accessList['all'].indexOf(accessType) >= 0);
    }
}

function checkAccessMiddleware(accessType, failureCallback) {
    failureCallback = failureCallback || function(req, res) {
        res.send(403);
    }

    return function(req, res, next) {
        checkHasAccess(req.session.accesses, accessType, function(success) {
            success ? next() : failureCallback(req, res);
        });
    }
}

function deleteRight(req, res) {
    req.db.access.removeRight(req.params.id, function(err) {
        if (err) {
            console.log('Could not remove right with ID: ' + req.params.id, err);
        }
        res.redirect('/user/' + req.params.userId + '/rights');
    });
}

function authFromSatellite(req, res) {
    console.log('Auth request from satellite: ', req.body);
    var body = req.body;
    req.db.users.auth(body.user, body.password, function(err, u) {
        if (err) {
            console.log('Error while trying to auth from satellite', err);
            res.send(err.toString(), 500);
        } else if (u == null) {
            res.send({ status : 'KO', 
                err : 'User does not exist or password does not match' });
        } else if (u && !u.valid) {
            res.send({ status : 'KO', err : 'Account not yet activated.' });
        } else {
            store(u.id, req, req.db, function() {
                checkHasAccess(req.accesses, 'can_see_torrent', function(allowed) {
                    if (allowed) {
                        res.send({ status : 'OK' });
                    } else {
                        res.send({ status : 'KO', 
                            err : 'You can\'t download from this box.' });
                    }
                }, body.boxId);
            });
        }
    });
}

function listUserRights(req, res) {
    req.db.access.rights(req.user.id, function(err, rights) {
        res.render('rights/list', {
            user : req.user,
            rights : rights,
            title : req.user.username + '\'s rights',
            boxes : req.boxes,
            roles : req.roles
        });
    });
}

function addRight(req, res) {
    req.db.access.addRight(req.user.id, req.body.role,
        (req.body.box == 0 ? null : req.body.box), 
        function(err) {
            if (err) 
                console.log('Could not add right for user ' + req.user.id, err);
            res.redirect('/user/' + req.user.id + '/rights');
        });
}

exports.checkAccessMiddleware = checkAccessMiddleware;
exports.listUserRights = listUserRights;
exports.deleteRight = deleteRight;
exports.addRight = addRight;
exports.store = store;
exports.authPOST = authFromSatellite;
