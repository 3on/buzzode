/*

https://github.com/ericflo/node-jsonrpc

*/
/*

var rpc = require('jsonrpc')
var client = rpc.getClient(80,'tr.woody.3on.fr/transmission/web/')

client.call('session-get', function(res) {
  console.log(res)
})

/*
var http = require('http')

var options = {
  host: 'tr.woody.3on.fr',
  port: 80,
  path: '/transmission/rpc/',
  method: 'POST'
}

var req = http.request(options, function(res) {
  console.log('STATUS: ' + res.statusCode);
  console.log('HEADERS: ' + JSON.stringify(res.headers));
  res.setEncoding('utf8');
  res.on('data', function (chunk) {
    console.log('BODY: ' + chunk);
  });
});

req.end()
*/

var request = require('request')

r = request({method: 'POST'
  ,uri: 'http://tr.woody.3on.fr/transmission/rpc/'
  ,port: 80
  ,
})
