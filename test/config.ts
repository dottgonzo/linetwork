import {assert} from "chai"

import linetw from "../index"



const options={
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
  },
  ethernet:[]
};


const json=new linetw(options);



describe('Status Object', function() {
  describe('check json', function () {
    it('exist ', function(){
      assert.ok(json, 'Status is an object');

      assert.isObject(json, 'Status is an object');
      assert.isObject(json.liconfig, 'Status is an object');

    })
    it('has minimum options ', function(){
      assert.isObject(json.liconfig, 'Config object');
      assert.isString(json.liconfig.wpasupplicant_path, 'Status is an object');

    })
  })
})
