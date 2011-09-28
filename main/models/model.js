var fs = require('fs');
var boxes = JSON.parse(fs.readFileSync('./settings.json')).boxes;

var id = {
    primary : true,
    type : 'INTEGER'
};

var model = {
    'Accesses' : {
        id : id,
        name : {
            type : 'TEXT',
            notnull : true,
            unique : true
        }
    }, 'Baskets' : {
        id : id,
        UserId : {
            type : 'INTEGER',
            notnull : true
        },
        TorrentId : {
            type : 'INTEGER',
            notnull : true
        }, urlList : {
            type : 'TEXT',
            notnull : true
        }
    }, 'Boxes' : {
        id : id,
        name : {
            type : 'TEXT', 
            unique : true,
            notnull : true
        },
        url : {
            type : 'TEXT',
            notnull : true
        },
        satelliteUrl : {
            type : 'TEXT',
            notnull : true
        },
        affinity : {
            type : 'NUMBER',
            'default' : 100
        },
        user : {
            type : 'TEXT',
            notnull : true
        },
        password : {
            type : 'TEXT',
            notnull : true
        }
    }, 'Chats' : {
        id: id,
        author: {
            type: 'TEXT',
            notnull: true
        }, AuthorId : {
            type : 'INTEGER',
            notnull : true
        }, message: {
            type: 'TEXT',
            notnull: true
        }, date: {
            type: 'INTEGER', // See http://www.sqlite.org/datatype3.html#datetime
            notnull : true
        }
    }, 'Requests' : {
        id: id,
        UserId : {
            type : 'INTEGER',
            notnull : true
        }, name: {
            type: 'TEXT',
            unique: true,
            notnull: true
        }, language: {
            type: 'INTEGER'
        }, quality: {
            type: 'INTEGER'
        }, kind: {
            type: 'INTEGER'
        }, answered: {
            type: 'INTEGER',
            'default' : 0
        }, createdAt : {
            type : 'TEXT',
            'default' : 'CURRENT_TIMESTAMP'
        }
    }, 'Rights' : {
        id : id,
        BoxId : { type : 'INTEGER' },
        RoleId : { type : 'INTEGER', notnull : true },
        UserId : { type : 'INTEGER', notnull : true }
    }, 'Roles' : {
        id : id,
        name : {
            type : 'TEXT',
            unique : true,
            notnull : true
        }
    }, 'RolesAccesses' : { 
        RoleId : { type : 'INTEGER', notnull : true },
        AccessId : { type : 'INTEGER', notnull : true }
    },'Torrents' : {
        id : id, 
        trId : {
            type : 'INTEGER', 
            notnull : true
        }, hash : {
            type : 'TEXT', 
            unique : true,
            notnull : true
        }, name : {
            type : 'TEXT',
            notnull : true
        }, 
        BoxId : { type : 'INTEGER', notnull : true },
        UserId : { type : 'INTEGER', notnull : true }
    }, 'Users' : {
        id: id,
        username: {
            type: 'TEXT',
            unique: true,
            notnull: true
        },
        password: {
            type: 'TEXT',
            notnull: true
        },
        email: {
            type: 'TEXT',
            unique: true,
            notnull: true
        },
        valid: {
            type: 'INTEGER',
            'default': 0
        }
    }
};

exports.tableModel = model;
exports.accesses = [
    'can_create_torrent', // 0
    'can_activate_user', // 1
    'can_ban_user', // 2
    'can_delete_other_torrent', // 3
    'can_see_torrent', // 4
    'can_start_seed', // 5
    'can_stop_seed', // 6
    'can_manage_rights', // 7
    'can_chat', // 8
    'can_see_peers', // 9
    'can_use_basket', // 10
    'can_use_requests' // 11
];

exports.roles = [
    { name : 'user', accesses : [ exports.accesses[0], exports.accesses[4],
        exports.accesses[8], exports.accesses[10], exports.accesses[11] ]},
    { name : 'admin', accesses : exports.accesses }
]

exports.users = [ {
    username : 'root',
    password : 'SBNJTRN+FjG7owHVrKtue7eqdM4RhdRWVl71HXN2d7I=',
    email : 'root@localhost',
    valid : 1
} ]

exports.rights = [
    { UserId : 1, role : 'admin', BoxId : null }
]

exports.boxes = boxes;
