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

var providers=json.mproviders()


describe('Providers Data Array', function() {
  describe('check provider data', function () {
    it('data exists', function(){
      assert.ok(providers, 'Status is an object');

    })
    it('data is an array', function(){
      assert.isArray(providers, 'Status is an object');

    })
  })
})
