var Driver = require('../webdriver')
    , By = Driver.By
    , Until = Driver.Until
    , Tools = require('../tools')
    , driver = Driver.createWebDriver({device: 'Apple iPhone 5'})
    , serachContent = 'test';

driver.get('http://www.baidu.com').then(function (){
    var searchArea = driver.findElement(By.id('index-kw'));
    searchArea.clear();
    searchArea.sendKeys(serachContent);
    Driver.tap(By.id('index-bn'));
    return driver.wait(Until.titleContains(serachContent));
}).then(function() {
    Tools.log(serachContent + ' was searched.');
    Driver.stopWebDriver();
});
