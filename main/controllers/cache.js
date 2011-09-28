var request = require('request')
var jsdom = require('jsdom')
var fs = require('fs')

function favExists (dns) {
  var s = fs.statSync('../cache/favicon/' + dns)
  
}



exports.favicon = function(req, res) {
  var dns = req.params.dns
  
  if( false ) {
    //res.sendfile()
  }
  else {
    
  }
};

