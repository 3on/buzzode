var email   = require('emailjs')
var fs      = require('fs')
var jade    = require('jade')

var settings = JSON.parse(fs.readFileSync('./settings.json'));
var server = email.server.connect({
    user : settings.mail.user,
    password : settings.mail.password,
    host : settings.mail.host,
    ssl : settings.mail.ssl,
    tls : settings.mail.tls
});

var templates = {
    'activated' : __dirname + '/../views/mail/activated.jade',
    'new-user' : __dirname + '/../views/mail/newuser.jade',
    'reset-pwd' : __dirname + '/../views/mail/reset.jade'
}
var compiledTemplates = {}

function ccList(arr) {
    var result = '';
    for (var i = arr.length - 1; i >= 0; i--) {
        result += arr[i].username + ' <' + arr[i].email + '>, ';
    }
    return result;
}

function send(headers, html, cb) {
    var message = email.message.create(headers);
    message.attach_alternative(html);
    server.send(message, cb);
}

function headers(from, to, cc, subject) {
    return {
        to : to,
        from : from,
        cc : cc,
        subject : subject
    }
}

function prepare(headers, message, template, tmplProperties, callback) {
    headers.message = message;
    if (!compiledTemplates[template]) {
        fs.readFile(template, function(err, str) {
            if (err) {
                console.error('Failed to read file ' + template, err);
                callback(err);
            } else {
                compiledTemplates[template] = jade.compile(str);
                callback(null, headers, compiledTemplates[template](tmplProperties));
            }
        });
    } else {
        callback(null, headers, compiledTemplates[template](tmplProperties));
    }
}

exports.send = function(headers, message, template, tmplProperties) {
    prepare(headers, message, template, tmplProperties, 
        function(err, headers, html) {
            if (err) { return; }
            send(headers, html, function(err, message) {
                if (err) {
                    console.error('Failed to send mail', err);
                } else {
                    console.log('Mail successfully sent');
                }
            });
        });
}

exports.headers = headers;

exports.activated = function(name, email) {
    var headers = this.headers(settings.mail.sender, name + ' <' + email + '>', 
        null, 'Account activated!');
    this.send(headers, 'Your BuZz account has been activated', 
        templates['activated'], { name : name });
}

exports.registered = function(name, email, id, admins) {
    if (admins.length <= 0) {
        console.error('No admins. Can not send "new user" email');
        return;
    }
    var firstAdmin = admins[0];
    admins.shift();
    var headers = this.headers(settings.mail.sender, 
        firstAdmin.username + ' <' + firstAdmin.email + '>', ccList(admins), 
        'New user registered!');
    this.send(headers, 'A new BuZz user has registered', templates['new-user'],
        { name : name, email : email, id : id, url : settings.general.siteUrl });
}

exports.resetPassword = function(user, newPwd) {
    var headers = this.headers(settings.mail.sender, user.username + ' <' + 
            user.email + '>', null, 'Password reset request');
    this.send(headers, 'Your password has been reset: ' + newPwd, 
        templates['reset-pwd'], { user : user, password : newPwd });
}
