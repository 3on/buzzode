/**
 * BuZz in Node.JS
 */

var fs = require('fs')
var express = require('express')
var auth = require('connect-auth')
var coleredConsole = require('./console')

// Config
var config = JSON.parse(fs.readFileSync('settings.json'))


// Database
var db = require('./models/buzz-db.js')
//db.init(config.mysql)

// Transmission
var transmission = require('./boxes/transmission.js')
transmission.init(db)

// Tools
var utils = require('./utils.js') // FIXME

// conctrollers
var ctl = require("./controllers.js")

// Wall-e
//var Walle = require("../wall-e/wall-e.js")

var app = module.exports = express.createServer();

// Configuration
app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  //app.use(app.router); // cause authentification to fail
  app.use(express['static'](__dirname + '/public'));
  
  // sessions
  app.use(express.cookieParser());
  app.use(express.session({ secret: "BuZz is so awesome"}));
  
  // auth
  app.use(auth([auth.Basic({
    validatePassword : login,
    realm: 'BuZz'
    })]));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});

function login (username, password, successCallback, failureCallback){
  db.users.auth(username, utils.hash(password), function(err, user) {
    if (err) {
        console.log('Could not auth user: ' + err);
        failureCallback();
    } else if (user && user.valid) {
        successCallback({ id : user.id, username : user.username, password : user.password });
    } else {
        console.log('Invalid user!'); // FIXME
        failureCallback();
    }
  });
}

// middleware
function authenticate (req, res, next) {
    req.authenticate(['basic'], function (error, authenticated) {
        if (authenticated) {
            var user = req.getAuthDetails().user;
            if (!req.isAuthenticated()) {
                // Internal Error
                //res.send("Bad Token User ID:" + username);
                res.redirect('/lost') // FIXME
            }
            else {
                req.session.user = user;
                if (!req.session.accesses) {
                    ctl.access.store(user.id, req.session, db, next);
                    console.log(req.session.accesses);
                } else {
                    next();
                }
            }
        } else {

        }  
    });
}

function dbize(req, res, next) {
    req.db = db
    req.tr = transmission
    next()
}

var acl = ctl.access.checkAccessMiddleware;

// Routes

/* ---- Debug */ 
app.get('/mysql', function(req, res){
    db.resync();
    res.send("SQLite model has been updated");
});

app.get('/sync', function(req, res){
  transmission.sync()
  res.send("Torrents's table has been resynced with transmission")
})

app.get('/unrar', function(req, res){
  var rar = "/Users/jr/Desktop/Buzz/[ www.Speed.Cd ] - Awkward.S01E05.720p.HDTV.x264-IMMERSE/awkward.s01e05.720p.hdtv.x264-immerse.rar"
  res.attachment("awkward.s01e05.720p.hdtv.x264-immerse.mkv")
  res.sendfile()
})

app.get('/transmission', function(req, res) {
    var box = transmission.getBoxById(0);
    var torrent = fs.readFileSync("test-pants.torrent").toString('base64');
    box.add({metainfo: torrent}, function(r) { res.send(r); });
  /*
  transmission.torrents({ids:"*", fields: "name"}, function (r){
    res.send(r)
  })
  */
});

/* Debug ---- */


/* User actions */
app.get('/register', ctl.user.register);
app.post('/register', dbize, ctl.user.registerPOST);

app.get('/users', authenticate, dbize, acl('can_activate_user'), ctl.user.list);
app.get('/activate/:id', authenticate, dbize, acl('can_activate_user'), ctl.user.activate);
app.get('/desactivate/:id', authenticate, dbize, acl('can_ban_user'), ctl.user.desactivate);
app.get('/lost', ctl.user.lost); // FIXME
app.post('/lost', dbize, ctl.user.lostPOST);

app.post('/access/auth', dbize, ctl.access.authPOST)

/* Request */
app.get('/requests', authenticate, dbize, acl('can_use_requests'), 
    ctl.request.list);
app.get('/request/add', authenticate, dbize, acl('can_use_requests'), 
    ctl.request.add);
app.post('/request/add', authenticate, dbize, acl('can_use_requests'), 
    ctl.request.addPOST);
app.get('/request/:id/answered', authenticate, dbize, acl('can_use_requests'), 
    ctl.request.answered);
app.get('/request/:id/unanswered', authenticate, dbize, acl('can_use_requests'), 
    ctl.request.unanswered);

/* Rights, Roles, Access... */
app.get('/user/:id/rights', authenticate, dbize, db.boxes.listMID, db.users.getMID,
    db.access.rolesMID, acl('can_manage_rights'), ctl.access.listUserRights);

app.get('/user/:userId/rights/delete/:id', authenticate, dbize, 
    acl('can_manage_rights'), ctl.access.deleteRight);

app.post('/user/:id/rights/add', authenticate, dbize, db.users.getMID,
    acl('can_manage_rights'), ctl.access.addRight);

/* Chat */
app.post('/chat/send', authenticate, dbize, acl('can_chat'), ctl.chat.send);
app.get('/chat/latest/:since([0-9]+)', authenticate, dbize, acl('can_chat'),
    ctl.chat.latest);
    
/* Basket */
app.get('/basket', authenticate, dbize, acl('can_use_basket'), 
    db.basket.listMID, ctl.basket.list);
app.post('/basket/add/:torId', authenticate, dbize, acl('can_use_basket'), 
    ctl.basket.add);
app.post('/basket/remove/:id', authenticate, dbize, acl('can_use_basket'), 
    ctl.basket.remove);
app.get('/basket/view', authenticate, db.basket.listMID, acl('can_use_basket'), 
    ctl.basket.render);
app.get('/basket/empty', authenticate, dbize, acl('can_use_basket'), 
    ctl.basket.empty);

/* Torrents */
app.get('/torrent/add', authenticate, dbize, acl('can_create_torrent'),
    ctl.torrent.add);
app.post('/torrent/add', authenticate, dbize, acl('can_create_torrent'),
    ctl.torrent.addPOST);
app.get('/torrents', authenticate, dbize, acl('can_see_torrent'),
    ctl.torrent.all); 
app.get('/torrent/:id', authenticate, dbize, acl('can_see_torrent'),
    ctl.torrent.view);
app.get('/torrent/:id/hadopi', authenticate, dbize, acl('can_see_peers'),
    ctl.torrent.hadopi);

/* Home */
app.get('/', authenticate, function(req, res){
  res.render('index', {
    title: 'BuZzode, BuZz in Node',
    username: req.session.user.username,
    session: JSON.stringify(req.session)
  });
});

/* transmission */
app.get('/transmission/:torId/stop', authenticate, dbize, acl('can_stop_seed'),
    ctl.transmission.stop);
app.get('/transmission/:torId/start', authenticate, dbize, acl('can_start_seed'),
    ctl.transmission.start);
app.get('/transmission/:torId/verify', authenticate, dbize, acl('can_start_seed'),
    ctl.transmission.verify);
app.get('/transmission/:torId/reannounce', authenticate, dbize, 
    acl('can_start_seed'), ctl.transmission.reannounce);
app.get('/transmission/:torId/remove', authenticate, dbize,
    acl('can_delete_other_torrent'), ctl.transmission.remove);

app.post('/transmission/stop', authenticate, dbize, acl('can_stop_seed'), 
    ctl.transmission.stopPOST)
app.post('/transmission/start', authenticate, dbize, acl('can_start_seed'), 
    ctl.transmission.startPOST)
app.post('/transmission/verify', authenticate, dbize, acl('can_start_seed'), 
    ctl.transmission.verifyPOST)
app.post('/transmission/reannounce', authenticate, dbize, acl('can_start_seed'), 
    ctl.transmission.reannouncePOST)
app.post('/transmission/remove', authenticate, dbize, 
    acl('can_delete_other_torrent'), ctl.transmission.removePOST)

/* session */
app.post('/session/torrents/filters-and-sort', authenticate, dbize, ctl.session.filtersAndSort)


/* cache */
app.get('/cache/:dns/favicon', ctl.cache.favicon)

// TODO Delete when going to production : Debug / dev route
app.get('/init', dbize, function(req, res) {
    req.tr.getBoxById(1).initTableTorrentsFromTransmission(req.db);
    req.tr.getBoxById(2).initTableTorrentsFromTransmission(req.db);
    res.send('Done.');
});

// Walle
//setInterval(Walle.run, Walle.interval)

// Sync Transmission/MySQL
function syncTrDB() {
  transmission.sync(function(tr){
    
  })
}

app.listen(8000);
console.log("Express server listening on port %d", app.address().port);
