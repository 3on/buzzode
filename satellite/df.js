var spawn = require('child_process').spawn

function parseDf (data) {
  var lines = data.split('\n')
  var temp = lines[1].split(' ')
  var infos = []
  
  for (var i in temp) {
    if(temp[i] != '' && temp[i] != ' ' && temp[i] != '')
      infos.push(temp[i])
  }
  var res = {
     size       : infos[1]
    ,used       : infos[2]
    ,available  : infos[3]
    ,capacity   : infos[4]
  }
  return res
}

exports.run = function (opt, callback) {
  var output = ""
  var df = spawn('df', opt)
  df.stdout.on('data', function (data) {
    output += data
  })
  df.on('exit', function(code) {
    callback(parseDf(output))
  })
}