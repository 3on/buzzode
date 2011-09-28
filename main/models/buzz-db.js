var sql = require('./sqlite-wrapper.js').init('buzzode.db');
var fs = require('fs');
var model = require('./model.js');
var _ = require('underscore');
var step = require('step');

function placeholder(num) {
    var res = '';
    for (var j = num - 1; j >= 0; j--) {
        res += '?' + (j == 0 ? '' : ',');
    }
    return res;
}

exports.tables = function(cb) {
    cb = _.after(_.size(model.tableModel), cb);
    for (var table in model.tableModel) {
        sql.createTable(table, model.tableModel[table], function(err) {
            if (err) {
                console.log(err);
            }
            cb();
        });
    }
}

/**
 * Heavy artillery. Sorry for the entanglement. Just be happy it works.
 */
exports.defaults = function(callback) {
    var cb = function(err) { if (err) console.log(err.stack); }
    step(
        function() {
            for (var i = model.accesses.length - 1; i >= 0; i--) {
                sql.insert('Accesses', { name: model.accesses[i] },
                    this.parallel());
            }
            for (i = model.users.length - 1; i >= 0; i--) {
                sql.insert('Users', model.users[i], this.parallel());
            }
            for (i = model.boxes.length - 1; i >= 0; i--) {
                sql.insert('Boxes', model.boxes[i], this.parallel());
            }
        },
        function(errors) {
            if (errors && errors instanceof Array) {
                _.each(errors, console.log);
                return;
            } else if (errors) {
                console.log(errors);
                return;
            }
            var nextStep = _.after(model.roles.length, this);
            for (i = model.roles.length - 1; i >= 0; i--) {
                var roleName = model.roles[i].name;
                step(
                    function() {
                        this.roleName = roleName;
                        sql.select('Accesses', null, { id : null }, 'name IN (' +
                                placeholder(model.roles[i].accesses.length) + ')', 
                            model.roles[i].accesses, this);
                    },
                    function(err, results) {
                        var cbk = _.after(results.length, nextStep);
                        if (err) {
                            console.log(err);
                        } else {
                            var postInsert = function(err) {
                                if (err) {
                                    console.log(err);
                                } else {
                                    for (var j = results.length - 1; j >= 0; j--) {
                                        sql.insert('RolesAccesses', {
                                            RoleId : this.lastID,
                                            AccessId : results[j].id
                                        }, cbk);
                                    }
                                }
                            }
                            sql.insert('Roles', { name : this.roleName }, 
                                postInsert);
                        }
                    });
            }
        },
        function(error) {
            var nextStep = _.after(model.rights.length, callback);
            for (i = model.rights.length -1; i >= 0; i--) {
                var right = model.rights[i];
                sql.selectOne('Roles', null, { id: null }, 'name=?', [right.role],
                    function(err, result) {
                        if (err) {
                            console.log(err)
                        } else {
                            sql.insert('Rights', {
                                UserId : right.UserId,
                                BoxId : right.BoxId,
                                RoleId : result.id
                            }, nextStep);
                        }
                    });
            }
        });
}

/**
 * User-related functions : 
 * activate(id, cb), create(userObject, cb), desactivate(id, cb), list(cb),
 * auth(user, hashedPassword, cb), get(id, cb).
 */
exports.users = {
    activate : function(id, cb) {
        sql.updateById('Users', id, { valid : 1 }, cb);
    },
    desactivate : function(id, cb) {
        sql.updateById('Users', id, { valid : 0 }, cb);
    },
    auth : function(user, hashedPassword, cb) {
        sql.selectOne('Users', null, null, 'username=? AND password=?',
            [user, hashedPassword], cb);
    },
    create : function(obj, cb) {
        sql.insert('Users', obj, function(err) {
            var uid = this.lastID;
            if (err) {
                console.log(err);
                cb('Could not create user in database! ' + err);
            } else {
                sql.selectOne('Roles', null, { id : null }, 'name=?', ['user'],
                    function(err, role) {
                        if (err) {
                            console.log(err);
                            cb('Could not find user role in database! ' + err);
                        } else {
                            sql.insert('Rights', { BoxId : null, 
                                UserId : uid, RoleId : role.id }, cb);
                        }
                    });
            }
        });
    },
    list : function(cb) {
        sql.list('Users', cb);
    },
    get : function(id, cb) {
        sql.find('Users', id, cb);
    },
    admins : function(boxId, cb) {
        sql.select('Users', 
            { 'Rights' : 'Rights.UserId=Users.id', 
                'Roles' : 'Rights.RoleId=Roles.id' },
            { username : null, email : null },
            'Roles.name=? AND Users.valid=?', ['admin', 1], cb);
    },
    withMail : function(email, cb) {
        sql.selectOne('Users', null, null, 'Users.email=?', [email], cb);
    },
    getMID : function(req, res, next) {
        exports.users.get(req.params.id, function(err, user) {
            if (err) {
                console.log(err);
            }
            req.user = user;
            next();
        });
    }
}

/**
 * Basket-related methods : 
 * add(basketObj, cb), empty(userId, cb), get(id, cb), list(userId, cb),
 * remove(id, userId, cb).
 */
exports.basket = {
    add : function(obj, cb) {
        sql.insert('Baskets', obj, cb);
    },
    get : function(id, cb) {
        sql.find('Baskets', id, cb);
    },
    remove : function(id, userId, cb) {
        sql.remove('Baskets', 'id=? AND UserId=?', [id, userId], cb);
    },
    empty : function(userId, cb) {
        sql.remove('Baskets', 'UserId=?', [userId], cb);
    },
    list : function(userId, cb) {
        sql.select('Baskets', null, null, 'UserId=?', [userId], cb);
    },
    listMID : function(req, res, next) {
        exports.basket.list(req.session.user.id, function(err, basket) {
            if (err) console.log(err);
            req.basket = basket;
            next();
        });
    }
}

/**
 * Access- and rights-related methods: 
 * accesses(userId, cb), addRight(userId, roleId, boxId, cb), removeRight(id, cb),
 * rights(userId, cb)
 */
exports.access = {
    accesses : function(userId, cb) {
        sql.select('Users', {
            'Rights' : 'Rights.UserId=Users.id',
            'Roles' : 'Roles.id=Rights.RoleId',
            'RolesAccesses' : 'Roles.id=RolesAccesses.RoleId',
            'Accesses' : 'RolesAccesses.AccessId=Accesses.id'
        }, {
            'Rights.BoxId' : 'BoxId',
            'Accesses.name' : 'name'
        }, 'Users.id=?', [userId], cb);
    },
    rights : function(userId, cb) {
        sql.select('Rights', { 'Roles': 'Roles.id=Rights.RoleId' }, {
            'Rights.id' : 'id',
            'Roles.id' : 'roleId',
            'Roles.name' : null,
            'Rights.BoxId' : null,
            'Rights.UserId' : null,
        }, 'Rights.UserId=?', [userId], cb);
    },
    addRight : function(userId, roleId, boxId, cb) {
        sql.insert('Rights', { UserId : userId, RoleId : roleId, BoxId : boxId }, 
            cb);
    },
    removeRight : function(id, cb) {
        sql.removeById('Rights', id, cb);
    },
    rolesMID : function(req, res, next) {
        sql.list('Roles', function(err, roles) {
            if (err) console.log(err);
            req.roles = roles;
            next();
        });
    }
}

/**
 * Chat related methods:
 * add(messageObj, cb), latest(sinceId, cb), lastN(number, cb)
 */
exports.chat = {
    add : function(obj, cb) {
        sql.insert('Chats', obj, cb);
    },
    latest : function(since, cb) {
        sql.select('Chats', null, null, 'id > ?', [since], cb, 'id DESC');
    },
    lastN : function(num, cb) {
        sql.select('Chats', null, null, '1', [], cb, 'id DESC', num);
    }
}

/**
 * Requests related methods:
 * list(cb), add(obj, cb), answer(id, cb), unanswer(id, cb)
 */
exports.requests = {
    list : function(cb) {
        sql.select('Requests', null, null, '1', [], cb, 'createdAt DESC');
    },
    add : function(obj, cb) {
        sql.insert('Requests', obj, cb);
    },
    answer : function(id, cb) {
        sql.updateById('Requests', id, { answered : 1 }, cb);
    },
    unanswer : function(id, cb) {
        sql.updateById('Requests', id, { answered : 0 }, cb);
    }
}

/**
 * Torrents related methods (database only!)
 * list(cb), get(id, cb), multi(ids, cb), add(torrentObj, cb)
 */
exports.torrents = {
    list : function(cb) {
        sql.list('Torrents', cb);
    },
    get : function(id, cb) {
        sql.find('Torrents', id, cb);
    },
    multi : function(ids, cb) {
        sql.select('Torrents', null, null, 
            'id IN (' + placeHolder(ids.length) + ')', ids, cb);
    },
    add : function(obj, cb) {
        sql.insert('Torrents', obj, cb);
    }
}

/**
 * Boxes related methods:
 * list(cb)
 */
exports.boxes = {
    list : function(cb) {
        sql.list('Boxes', cb);
    },
    listMID : function(req, res, next) {
        exports.boxes.list(function(err, boxes) {
            if (err) {
                console.log(err);
            }
            req.boxes = boxes;
            next();
        });
    }
}

/**
 * Delete database and create it all over again.
 */
exports.resync = function(cb) {
    step(
        function() {
            sql.close(this);
        },
        function(err) {
            if (err) console.log(err);
            fs.unlink('buzzode.db', this);
        },
        function(err) {
            if (err) {
                console.log(err);
            } else {
                sql = sql.init('buzzode.db');
                exports.tables(this);
            }
        },
        function(err) {
            if (err) {
                console.log(err);
            } else {
                exports.defaults(cb || function() {});
            }
        }
    );
}

exports.sql = sql;
