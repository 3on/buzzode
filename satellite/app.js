
/**
 * Module dependencies.
 */

var fs = require('fs')
var express = require('express');
var request = require('request')
var auth = require('connect-auth')
var df = require('./df.js')
var config = JSON.parse(fs.readFileSync('settings.json'))
var base64 = require('./base64.js')
var crypto = require('crypto')

var transmission = require('./transmission.js')
transmission.init(config.transmission)

var app = module.exports = express.createServer();

var BOX_ID = -1;

function hash (str) {
    var sha = crypto.createHash('sha256')
    sha.update(str)
    return sha.digest('base64')
}

// Configuration
app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
// sessions
  app.use(express.cookieParser());
  app.use(express.session({ secret: "BuZz is so awesome"}));
  //app.use(app.router);
  app.use(express['static'](__dirname + '/public'));
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

// middleware

// Auth
var authReq = function(user, pass, boxId) {
    return { method : 'POST',
        url : config.parameters["mothership-url"] + 'access/auth',
        json : { user : user, password : pass, box : boxId }
   }
}
// POST auth (Using personalized system)
function checkAccess(req, res, next) {
    request(authReq(req.body.user, req.body.password, BOX_ID),
        function(err, resp, body) {
            if (err) {
                res.send(err, 500);
            } else if (body.status == 'OK') {
                next();
            } else {
                res.send(body.err, 403);
            }
        });
}
// GET auth (using HTTP Basic)
function login(username, password, success, failure) {
    request(authReq(username, hash(password), BOX_ID), function(err, resp, body) {
        if (err) {
            failure(err);
        } else if (body.status == 'OK') {
            success();
        } else {
            failure(body.err);
        }
    });
}

function authMiddleware(req, res, next) {
  req.authenticate(['basic'], function (error, authenticated) {
    if (error) {
        res.send(error, 500);
    } else if (req.isAuthenticated()) {
        next();
    } else if (!!authenticated) { 
        next();
    } else if (authenticated === false) {
        res.send('Access denied', 403);
    } else {
        // Nothing to do...
    }
  });
}


// Routes

// - satellite's server infos
app.get('/test', authMiddleware, function(req, res) {
    res.send('Ok', 200);
});
app.get('/infos', function(req, res){
  res.send({
    "min-free-space"  : config.parameters["min-free-space"],
    "max-torrents"    : config.parameters["max-torrents"]
  });
  BOX_ID = req.query.boxId;
});

app.get('/df', function(req, res) {
    df.run([config.transmission['download-dir']], function(output) {
        res.send(output);
    });
});

// - browser download
app.post('/download/*', checkAccess, function(req, res){
    var id = parseInt(req.body.torrentId);
    var i = parseInt(req.body.fileId);
    transmission.torrentFiles(id, function(resp) {
        console.log(resp);
        var torrent = resp.arguments.torrents[0]
        if (torrent) {
            var file = config.transmission['download-dir'] + torrent.files[i].name;
            res.download(file);
        } else {
            res.send('This torrent doesn\'t exist!', 404);
        }
    });
})
// - wget download
app.get('/download/:torId/:fileId/?*', authMiddleware, function(req, res) {
    transmission.torrentFiles(req.params.torId, function(resp) {
        console.log(resp);
        var torrent = resp.arguments.torrents[0];
        if (torrent) {
            var file = config.transmission['download-dir'] + 
                torrent.files[req.params.fileId].name;
            res.download(file);
        } else {
            res.send('This torrent doesn\'t exist!', 404);
        }
    });
})
// - browser unrar
app.post('/unrar/*', function(req, res){
  res.send(501)
})
// - wget unrar
app.get('/unrar/*', function(req, res){
  res.send(501)
})

app.get('*', function(req, res){
  res.send(403)
});



app.listen(8008);
console.log("BuZzode satellite listening on port %d in %s mode", app.address().port, app.settings.env);
