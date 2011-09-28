var request = require('request')
var opt = {}

function base64(str) {
  return (new Buffer(str)).toString('base64')
}

exports.init = function(o){
  opt = o
  opt.credentials = "Basic " + base64(opt.user + ":" + opt.password)
  opt.trSessionId = ''
  opt.whiteListed = true
}

function call(message, callback) {
  //console.log("Transmission message sent:" + JSON.stringify(message))
  var timeout = 3
  var options = {
    url : opt.url,
    method : 'POST',
    body : JSON.stringify(message),
    headers : {
      "Content-type": "application/json",
      'x-transmission-session-id' : opt.trSessionId
    }
  }
  if(!opt.whiteListed)
    options.headers.Authorization = opt.credentials

  var transmissionCallback = function(error, response, body){
    if(response.statusCode == 401 && timeout--) {
      options.headers.Authorization = opt.credentials
      opt.whiteListed = false
      request(options, transmissionCallback);
    }
    else if(response.statusCode == 409 && timeout--) {
      options.headers['x-transmission-session-id'] = response.headers['x-transmission-session-id'];
      opt.trSessionId = response.headers['x-transmission-session-id'];
      request(options, transmissionCallback);
    }
    else
    {
      if(!timeout)
        console.log('ERROR TRANSMISSION: wrong transmission session id')
      else {
        //console.log(response.body);
        callback(JSON.parse(response.body));
      }
    }
  }
  request(options, transmissionCallback)
}

exports.torrentFiles = function(id, callback){
  var message = {
      method: "torrent-get"
    , arguments:
      {
         ids    : [id]
        ,fields : ["files"]
      }
  }
  call(message, callback)
}