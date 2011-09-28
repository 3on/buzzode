var fs = require('fs')


var controllers = []

var files = fs.readdirSync(__dirname + "/controllers")
for (var i = files.length - 1; i >= 0; i--){
    if(files[i].match(/\.js$/i)) {
       controllers[controllers.length] = files[i]
    }
}

for (i = controllers.length - 1; i >= 0; i--) {
    var name = controllers[i].slice(0,controllers[i].lastIndexOf('.'))
    exports[name] = require("./controllers/"+controllers[i])
}
