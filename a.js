var minInterest = 13.5;
var minAmount = 10;
var config = require('./config.json');

var webdriver = require('selenium-webdriver');
var Until = webdriver.until;
var By = webdriver.By;
var ajaxRequest = require('request');
var cheerio = require('cheerio')

var driver = new webdriver.Builder().
withCapabilities(webdriver.Capabilities.chrome()).
build();

var timeouts = (new webdriver.WebDriver.Timeouts(driver))
// timeouts.setScriptTimeout(10000);

var _ = function(locator) {
    return driver.findElement(locator);
}

var $ = function(css) {
    return _(By.css(css));
}

var _click = function(webElement) {
    return driver.actions().mouseMove(webElement).click().perform();
}

var path = {
    login: {
        loginBox: 'div#loginBox',
        user: 'input#j_username',
        passwd: 'input#J_pass_input',
        loginBtn: 'input.login-btn'
    },
    user: {
        // user info
        infoBox: 'div.main-section div.user-info-box',
        // 
        avilableBalance: 'li.acc-tab-li[data-name="balance"]>span.num-family'
    }
}

var gAvailableBalance = 0;
var newTransfers = [];
var nextTransferId;
var loopCheckIntervalLong = 500;
var loopCheckIntervalShort = 200;
var gStartBuying = false;
var gFinishBuyingTime = 0;

var login = function() {
    return driver.wait(Until.elementLocated(By.css(path.login.loginBox))).then(function() {
        $(path.login.user).sendKeys(config._u);
        $(path.login.passwd).sendKeys(config._p);
        return $(path.login.loginBtn).submit().then(function() {
            return driver.wait(Until.elementIsVisible($(path.user.infoBox)));
        });
    });
}

var updateBalance =function() {
    driver.get('https://www.we.com/account/index.action');
    return $(path.user.avilableBalance).getText().then(function(fund) {
        fund = fund.replace(",", "");
        gAvailableBalance = parseInt(fund);
        // gAvailableBalance = 1000;
        console.log("updateBalance", gAvailableBalance)
    });
}

driver.get('https://www.we.com/loginPage.action').then(function() {
    login().then(function() {
        setInterval(function() {
            driver.get('http://www.we.com/transfer/transferList.action');
            console.log("sessionHeartBeat:", nextTransferId, gAvailableBalance, new Date().toLocaleTimeString())
            updateBalance();
        }, 300000);
        return updateBalance();
    }).then(function() {
        longBehindChecking(function(tid) {
            //driver.sleep(1000);
            loopCheckingNext(loopCheckIntervalShort)
        });
    });
});


function longBehindChecking(callback) {
    ajaxRequest({
            uri: "http://www.we.com/transfer/transferList!json.action",
            timeout: 10000
        },
        function(error, response, body) {
            if (!error && response.statusCode == 200) {
                var json = JSON.parse(body);
                var products = json.data.transferList;
                products.sort(function(p1, p2) {
                    var p1id = Number(p1.id);
                    var p2id = Number(p2.id);
                    if (p1id > p2id) return -1;
                    else if (p1id < p2id) return 1;
                    else return 0;
                });
                nextTransferId = 1 + Number(products[0].id);
            }
            callback(nextTransferId);
        });
}


driver.wait(function() {
    if (newTransfers.length === 0) return false;
    if (gStartBuying) return false;
    if ((new Date() - gFinishBuyingTime) > 3000) {
        var productToBuy = newTransfers[newTransfers.length - 1];
        newTransfers.length = 0;

        gStartBuying = true;
        var startBuyingTime = new Date();
        console.log("\nstart:", productToBuy.transferId, new Date().toLocaleTimeString());
        var creditLevel, prefix = "start----------------" + productToBuy.transferId + "----";
        driver.get('http://www.we.com/transfer/loanTransferDetail.action?transferId=' + productToBuy.transferId)
            .then(function() {
                console.log(prefix, "loaded detail", new Date().toLocaleTimeString());
                driver.wait(Until.elementLocated(By.xpath("//input[@class='ui-term-input ui-input ui-input-text']")), 1500, prefix+'timeout').then(function() {
                    console.log(prefix, 'get creditLevel');
                    _(By.xpath("//div[@id='loan-tab-content']//em[contains(@title, '信用分数')]")).then(function(el) {
                        if (!(el && el.getAttribute)) {
                            return buyErrorHandle(prefix, "error occured - > get creditLevel - > el", creditLevel);
                        }
                        el.getAttribute('title').then(function(text) {
                            creditLevel = parseInt(text.replace(/[^0-9]/ig,""));
                            console.log(prefix, 'creditLevel: ', creditLevel)
                            // driver.sleep(100);
                            if (creditLevel < 100) {
                                return buyErrorHandle(prefix, "Too low credit level:", creditLevel);
                            } else {
                                $('#max-shares').then(function(el) {
                                    
                                    if(!(el && el.getAttribute)) {
                                        return buyErrorHandle(prefix, 'error occured - > input -> el');
                                    }
                                    el.getAttribute("data-shares").then(function(shares) {
                                        console.log(prefix, "shares:", creditLevel, productToBuy.transferId, shares + " * " + productToBuy.pricePerShare)
                                        shares = adjuestShareNumber(shares, productToBuy.pricePerShare);
                                        if(shares === 0) {
                                            return buyErrorHandle(prefix, "No enough shares.");
                                        }
                                       

                                        if (new Date() - startBuyingTime < 1000) driver.sleep(1000 - (new Date() - startBuyingTime));

                                        // shares = 1;

                                        _(By.xpath("//input[@class='ui-term-input ui-input ui-input-text']")).then(function(el) {
                                            if (!(el && el.sendKeys)) {
                                                return buyErrorHandle(prefix, 'error occured - > input -> el');
                                            }
                                            el.sendKeys(shares);

                                            // gFinishBuyingTime = 0;
                                            // gStartBuying = false;
                                            // console.log('test over');
                                            // return;

                                            _click($('#invest-submit')).then(function() {
                                                console.log(prefix, "before final click:", productToBuy.transferId, "To Buy:", shares+"*"+ productToBuy.pricePerShare, new Date().toLocaleTimeString(), (new Date() - startBuyingTime));
                                            //     return driver.wait(Until.elementLocated(By.xpath(
                                            //         "//form[@action='/transfer/buyLoanTransfer.action']")));
                                            // }).then(function() {
                                                console.log(prefix, 'click confirm button');
                                                return _click(_(By.xpath(
                                                    "//form[@action='/transfer/buyLoanTransfer.action']//div[contains(@class,'ui-confirm-submit-box')]//button[@type='submit']")));
                                            }).then(function() {
                                                console.log(prefix, 'waiting result');
                                                return driver.wait(Until.elementLocated(By.xpath("//div[@class='ui-dialog']//p[contains(@class,'j-result-text')]")));
                                            }).then(function() {
                                                return _(By.xpath("//div[@class='ui-dialog']//p[contains(@class,'j-result-text')]")).getText(); 
                                            }).then(function(text){
                                                var prefix = 'end***********************' + productToBuy.transferId + '****';
                                                if (0===text.indexOf("您已成功投资")) {
                                                    console.log(prefix, "Finish!", productToBuy.transferId, new Date().toLocaleTimeString(), (new Date() - startBuyingTime),
                                                    "("+gAvailableBalance + "-" + (shares * productToBuy.pricePerShare)+")", "\n", productToBuy, "\n");
                                                    gFinishBuyingTime = new Date();
                                                    updateBalance();
                                                } else if (0===text.indexOf("该债权不能购买")) {
                                                    gFinishBuyingTime = 0;
                                                    console.log(prefix, "Failed: can not buy it", new Date().toLocaleTimeString());
                                                } else if (0===text.indexOf("购买此债权的人数过多")){
                                                    gFinishBuyingTime = 0;
                                                    console.log(prefix, "Failed: not enough", new Date().toLocaleTimeString());
                                                } else if (0 === text.indexOf('份额不足，请重新购买')) {
                                                    gFinishBuyingTime = 0;
                                                    console.log(prefix, "Failed: not enough", new Date().toLocaleTimeString());
                                                } else {
                                                    gFinishBuyingTime = 0;
                                                    console.log(prefix, "Failed: others");
                                                }
                                                
                                                gStartBuying = false;
                                            });
                                        }).thenCatch(function() {
                                            return buyErrorHandle(prefix, "page refresh-> input");
                                        });
                                    });
                                }).thenCatch(function() {
                                    return buyErrorHandle(prefix, 'page refresh-> max-shares');
                                });
                            }
                        });           
                    }).thenCatch(function() {
                        return buyErrorHandle(prefix, "error occured - > get creditLevel");
                    });
                }).thenCatch(function() {
                    return buyErrorHandle(prefix, "Too late", productToBuy.transferId, new Date().toLocaleTimeString());
                });
            });
        
        return false;
    }

}, Infinity);

var requestingNewTransfer = false;

function loopCheckingNext(interval) {
    //console.log("\nloopCheckingNext--------------", interval, requestingNewTransfer)
    var intervalObj = setInterval(function() {

        if (requestingNewTransfer) return;
        requestingNewTransfer = true;

        detectNewTransfer(nextTransferId, function(tid, obj) {
            requestingNewTransfer = false;
            // console.log("setInterval", tid, obj==null, nextTransferId, interval, new Date().toLocaleTimeString())
            if (obj) {
                nextTransferId++;
                var sh = adjuestShareNumber(obj.shares, obj.pricePerShare);
                console.log(newTransfers.length, gStartBuying, new Date() - gFinishBuyingTime, obj.interest >= minInterest, sh);

                if (obj.interest >= minInterest && sh > 0) {
                    newTransfers.push(obj);
                    console.log('push to newTransfers to redectect');
                };
                console.log("next id:", nextTransferId, obj.transferId, obj.timestemp.toLocaleTimeString(), newTransfers.length, gStartBuying);

                if (interval === loopCheckIntervalLong) {
                    console.log("->", nextTransferId, new Date().toLocaleTimeString())
                    clearInterval(intervalObj);
                    longBehindChecking(function(tid) {
                        loopCheckingNext(loopCheckIntervalShort)
                    });
                }
            } else {
                if (interval === loopCheckIntervalShort) {
                    console.log("-|", nextTransferId, new Date().toLocaleTimeString(), gStartBuying)
                    clearInterval(intervalObj);
                    longBehindChecking(function(tid) {
                        loopCheckingNext(loopCheckIntervalShort)
                    });
                }
            }

        })
    }, interval);

}

function adjuestShareNumber(shares, pricePerShare) {
    var shr = Math.floor((shares > 50 ? 0.5 : 0.8) * Number(shares));
    var price = shr * pricePerShare;
    if (price > gAvailableBalance) {
        shr = Math.floor(gAvailableBalance / pricePerShare);
    } else if (price < minAmount) {
        shr = 0;
    }
    console.log('balance: ', gAvailableBalance, ' pricePerShare: ', pricePerShare, 'canbuy: ', shr, shares);
    return shr;
}

function detectNewTransfer(tid, callback) {
    ajaxRequest({
            uri: "http://www.we.com/transfer/loanTransferDetail.action?transferId=" + tid,
            timeout: 1000
        },
        function(error, response, body) {
            if (error) {
                console.log("timeout loanTransferDetail", nextTransferId, gStartBuying)
                callback(tid, null);
                return null;
            } else if (response.statusCode == 200) {
                var errorcode = getValueFromBody('<div style="display: none;">', '</div>', body);
                if (errorcode === "500") {
                    //no new item.
                    console.log('nextTransferId ' + tid + ' does not exist.');
                    callback(tid, null);
                } else {
                    console.log('nextTransferId ' + tid + ' exists.');
                    var $body = cheerio.load(body);
                    var sharesAvailable = $body('#max-shares').attr('data-shares');
                    var interest = Number($body('.text-xxxl.num-family.color-dark-text').text());
                    var price = Number($body('#amount-per-share').text());
                    var callbackObj = null;
                    if (sharesAvailable) {
                        callbackObj = {
                            transferId: tid,
                            interest: interest,
                            shares: sharesAvailable,
                            pricePerShare: price,
                            timestemp: new Date()
                        };
                        console.dir(callbackObj)
                    } 
                    callback(tid, callbackObj);
                }
            } else {
                console.log("??????????????????????????????", response.statusCode)
                callback(tid, null);
            }

        });
}

function getValueFromBody(preStr, postStr, body) {
    var startIdx = body.indexOf(preStr);
    if (startIdx < 0) return null;
    var endIdx = body.indexOf(postStr, startIdx);
    if (endIdx < 0) return null;

    var str = body.substring(startIdx + preStr.length, endIdx);
    return str;
}

function buyErrorHandle() {
    console.log.call(arguments);
    gFinishBuyingTime = 0;
    gStartBuying = false;
    return;
}


