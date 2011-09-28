var crypto = require('crypto')
var http = require('http');

Array.prototype.each = function(f, callback) {
    for (var i = 0, l = this.length; i < l; i++) {
        f(this[i]);
    }
    if (callback) callback();
}

Array.prototype.asyncEach = function(f, callback, i) {
    i = i || 0;
    var l = this.length, that = this;
    function next() {
        that.asyncEach(f, callback, ++i);
    }
    i < l ? f(this[i], next) : callback();
}

String.prototype.beginsWith = function(str) {
    return this.indexOf(str) === 0;
}

String.prototype.endsWith = function(str) {
    return this.substr(this.length - str.length) === str;
}

exports.hash = function(str) {
    var sha = crypto.createHash('sha256')
    sha.update(str)
    return sha.digest('base64')
}
