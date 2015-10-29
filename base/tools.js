var tools = {};

var log = tools.log = function() {
    // npm --Logger=true test
    if (process.env.npm_config_Logger) {
        console.log(arguments);
    }
}

module.exports = tools;