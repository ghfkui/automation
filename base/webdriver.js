var wd = require('selenium-webdriver')
    , By = wd.By
    , Until = wd.until
    , base = {Wd: wd, By: By, Until: Until};
 
/**
 * create webdriver
 * @param {object} opt {server: 'chrome', device: 'desktop', browserOpt: {}}
 */
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

/**
 * stop webdriver
 */
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

/**
 * click action on desktop device
 */
base.click = function(locator) {
    return base._click(locator);
}

base._click = function(locator) {
    return driver.actions().mouseMove(base._(locator)).click().perform();
}

/**
 * tap action on touch device
 */
base.tap = function(locator) {
    return base._tapAction(locator);
}

base._tapAction = function(locator) {
    return base.driver.touchActions().tap(base._(locator)).perform();
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

/**
 *  pull down action on touch
 *  @param WebElement element
 *  @param object offset {x: 0, y: 0}
 *  @param number speed
 */
base.flickElement = function(element, offset, speed) {
    offset = offset || {x: 0, y: 150};
    speed = speed || 200 ;
    
    return element.getLocation().then(function(el) {
        var x = parseInt(el.x);
        var y = parseInt(el.y);
        return base.driver.touchActions().flickElement(element, {
            x: x + offset.x, 
            y: y + offset.y
        }, speed).perform();
    });
}

/**
 * get WebElements by xpath selector
 */
base.$xx = function(xpath) {
    return base.__(By.xpath(xpath));
}

/**
 * get WebElement by xpath selector
 */
base.$x = function(xpath) {
    return base._(By.xpath(xpath));
}

/**
 * get WebElements by css selector
 */
base.$$ = function(css) {
    return base.__(By.css(css));
}

/**
 * get WebElement by css selector
 */
base.$ = function(css) {
    return base._(By.css(css));
}

/**
 * get WebElements by locator
 */
base.__ = function(locator) {
    return base.driver.findElements(locator);
}

/**
 * get WebElement by locator
 */
base._ = function(locator) {
    return base.driver.findElement(locator);
}

module.exports = base; 