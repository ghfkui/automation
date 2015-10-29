var wd = require('selenium-webdriver')
    , By = wd.By
    , Until = wd.until
    , base = {Wd: wd, By: By, Until: Until};
 
base.createWebDriver = function (opt) {
    var opt = opt || {}
        , browser = (opt.browser && opt.toLowerCase()) || 'chrome'
        // remote server
        , server = opt.server
        // device in devtools, simulate mobile or tablet
        , device = opt.device || 'desktop'
        , browserOpt = opt.browserOpt
        , browserCfg = {}
        , cap, obj;

    if (base.driver) {
        return base.driver;
    }

    cap = wd.Capabilities[browser]();

    obj = browserCfg[browser + 'Options'] = {};

    if (browserOpt) {
        for (var key in browserOpt) {
            obj[key] = browserOpt[key];
        }
    }

    if ('desktop' !== device) {
       obj['mobileEmulation'] = {
            deviceName: device
        }
    }
    
    if (browserCfg) {
        cap.merge(browserCfg);
    }

    if (server) {
        base.driver = new wd.Builder()
            .forBrowser(browser)
            .usingServer(server)
            .withCapabilities(cap)
            .build();
    } else {
        base.driver = new wd.Builder()
            .forBrowser(browser)
            .withCapabilities(cap)
            .build();
    }
    
    return base.driver;
}

base.stopWebDriver = function () {
    if (base.driver) {
        return base.driver.close().then(function() {
            return base.driver.quit();
        }).thenFinally(function() {
            return base.driver = null;
        });
    }
}

base.sleep = function (ms) {
    return base.driver.sleep(ms);
}

base.hasElementDisplayed = function(elements) {
    return wd.promise.filter(elements, function(element) {
        return element.isDisplayed();
    }).then(function(visibleElements) {
        return visibleElements.length;
    });
}

base.tap = function(locator) {
    return base._tapAction(locator);
}

base._tapAction = function(locator) {
    var webElement = base.driver.findElement(locator);
    return base.driver.touchActions().tap(webElement).perform();
}

/**
 *  swipe action on touch
 *  @param WebElement element
 *  @param object offset {x: 0, y: 0}
 *  @param number start
 *  @param number end
 */
base.swipe = function(element, start, end, direction, offset) {
    offset = offset || {x: 20, y: 10};
    start = start || 50;
    end = end || 100;
    direction = direction || 'x';
    
    return element.getLocation().then(function(el) {
        var x = parseInt(el.x);
        var y = parseInt(el.y);
        return base.driver.touchActions().tapAndHold({
            x: x + offset.x, 
            y: y + offset.y
        }).move({
            x: x + offset.x + ('x' === direction ? start : 0), 
            y: y + offset.y + ('y' === direction ? start : 0)
        }).release({
            x: x + offset.x + ('x' === direction ? end : 0), 
            y: y + offset.y + ('y' === direction ? end : 0)
        }).perform();
    });
}

module.exports = base; 