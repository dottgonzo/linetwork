import linet=require('../index');
let verb=require('verbo');
let options={
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

let gionni=new linet(options);
console.log(gionni)
 gionni.init().then(function(status){
  verb(status,'info','J5 init')
 }).catch(function(err){
   console.log('error')
  verb(err,'error','J5 init')
 })
