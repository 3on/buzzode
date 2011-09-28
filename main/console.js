var colors  = require('colors')
var _       = require('underscore')
var sys     = require('sys')
var color
var colors  = {
   sql      : function(str) { return str.grey }
  ,nonos    : function(str) { return str.rainbow }
  ,fade     : function(str) { return str.grey }
  ,error    : function(str) { return str.red }
  ,warning  : function(str) { return str.yellow }
  ,invert   : function(str) { return str.inverse }
  ,visible  : function(str) { return str.invert }
  ,ok       : function(str) { return str.green }
  ,ko       : function(str) { return str.red }
  ,default  : function(str) { return str.cyan }
}

var styles = {
      //styles
      'bold'      : ['\033[1m',  '\033[22m'],
      'italic'    : ['\033[3m',  '\033[23m'],
      'underline' : ['\033[4m',  '\033[24m'],
      'inverse'   : ['\033[7m',  '\033[27m'],
      //grayscale
      'white'     : ['\033[37m', '\033[39m'],
      'grey'      : ['\033[90m', '\033[39m'],
      'black'     : ['\033[30m', '\033[39m'],
      //colors
      'blue'      : ['\033[34m', '\033[39m'],
      'cyan'      : ['\033[36m', '\033[39m'],
      'green'     : ['\033[32m', '\033[39m'],
      'magenta'   : ['\033[35m', '\033[39m'],
      'red'       : ['\033[31m', '\033[39m'],
      'yellow'    : ['\033[33m', '\033[39m']
    }; // object stolen from colors


console.sql = function() {
  var args = _.toArray(arguments)
  
  args.unshift(styles.grey[0])
  args.push(styles.grey[1])
   
  console.error.apply(console, args)
}

console.debug = function() {
  var args = _.toArray(arguments)
  
  args.unshift(styles.red[0])
  args.push(styles.red[1])
   
  console.log.apply(console, args)
}