var utils = require("../utils.js");
var mail = require('../lib/mail.js');

function registerValid(form) {
    if(form.pass.length < 1)
        return {ok:false, error:"username too short"}
    if(form.pass.length < 6)
        return {ok:false, error:"password too short"}
    if(form.pass !== form.verif)
        return {ok:false, error:"password dont match"}
    if(!form.email.match(/[^@]+@[^.]+\.\w+/i))
        return {ok:false, error:"email not valid"}
    
    return {ok:true, error:""}
}

function genPassword() {
    var pwd = [];
    for (var i = 0; i < 8; i++) {
        switch(Math.floor(Math.random() * 3)) {
            case 0:
                pwd.push(65 + Math.floor(Math.random() * 26));
                break;
            case 1:
                pwd.push(97 + Math.floor(Math.random() * 26));
                break;
            case 2:
                pwd.push(48 + Math.floor(Math.random() * 10));
                break;
        }
    }
    return String.fromCharCode.apply(String, pwd);
}

exports.registerPOST  = function(req, res) {
    var u = {
        username: req.body.username,
        password: utils.hash(req.body.pass),
        email: req.body.email,
        valid: 0
    };
    
    var validation = registerValid(req.body)
    if(!validation.ok) {
       req.body.error = validation.error
       return res.render('user/register', {
           title: 'Registration',
           form: req.body,
           disabledChat : true
       }) 
    }

    req.db.users.create(u, function(err) {
        if (err) {
            console.log(err);
            res.render('user/register', {
                title : 'Registration',
                form : req.body,
                disabledChat: true
            });
        } else {
            var id = this.lastID;
            req.db.users.admins(null, function(err, admins) {
                if (err) { console.error(err); return; }
                mail.registered(u.username, u.email, id, admins);
            });
            res.redirect('/');
        }
    });
}

exports.register = function(req, res) {
   res.render('user/register', {
        title: 'Registration',
        form: {},
        disabledChat : true
    }); 
}

exports.list = function(req, res) {
    req.db.users.list(function(err, users) {
        if (err) {
            console.log(err);
        }
        res.render('user/list', {
            title : 'User activation',
            users : users || []
        });
    });
}

exports.activate = function(req, res) {
    req.db.users.activate(req.params.id, function(err) {
        if (err) {
            console.log(err);
        }
        req.db.users.get(req.params.id, function(err, user) {
            if (err) { console.error(err); return; }
            mail.activated(user.username, user.email);
        });
        res.redirect('/users');
    });
}

exports.desactivate = function(req, res) {
    req.db.users.desactivate(req.params.id, function(err) {
        if (err) {
            console.log(err);
        }
        res.redirect('/users');
    });
}

exports.lost = function(req, res) {
  res.render('user/lost', {
    title: "I'm lost",
    form: {},
    disabledChat : true,
    info : null
  })
}

exports.lostPOST = function(req, res) {
    req.db.users.withMail(req.body.email, function(err, user) {
        if (err) {
            console.error(err);
            res.render('user/lost', {
                title : "I'm lost",
                form : req.body,
                disabledChat : true,
                info : 'Internal error'
            });
        } else if (user) {
            var newPassword = genPassword();
            mail.resetPassword(user, newPassword);
            req.db.sql.updateById('Users', user.id, 
                { password : utils.hash(newPassword) }, function(err) {
                    if (err) console.error(err);
                });
            res.render('user/lost', {
                title : "I'm lost",
                form : {},
                disabledChat : true,
                info : 'Your new password has been sent to your e-mail address.'
            });
        } else {
            res.render('user/lost', {
                title : "I'm lost",
                form : {},
                disabledChat : true,
                info : 'No user with this address.'
            });
        }
    });
}
