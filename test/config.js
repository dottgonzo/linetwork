var assert    = require("chai").assert,
linetw=require('../index'),
verb=require('verbo');

var options={
  port:4000,
  hostapd:{
    driver:'rtl871xdrv',
    ssid:'testttap',
    wpa_passphrase:'testpass'
  },
  mobile:{
    provider:{
      "label":"Tre Ricaricabile","apn":"tre.it","phone":"*99#","username":"tre","password":"tre"
    },
    options:{
      retry:false
    }
  }
};


var json=new linetw(options);



describe('Status Object', function() {
  describe('check json', function () {
    it('exist ', function(){
      assert.ok(json, 'Status is an object');

      assert.isObject(json, 'Status is an object');
      assert.isObject(json.config, 'Status is an object');

    })
    it('has minimum options ', function(){
      assert.isObject(json.config, 'Config object');
      assert.isNumber(json.config.port, 'Status is an object');

    })
  })
})
