var fs = require("fs");
var tools = {};

var log = tools.log = function() {
    // npm --Logger=true test
    if (process.env.npm_config_Logger) {
        console.log.call(arguments);
    }
}

tools.deleteFolderRecursive = function(path) {
    var files = [];
    if (fs.existsSync(path)) {
        files = fs.readdirSync(path);
        files.forEach(function(file,index){
            var curPath = path + "/" + file;
            if (fs.statSync(curPath).isDirectory()) { // recurse
                deleteFolderRecursive(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
}

module.exports = tools;