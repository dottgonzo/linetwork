var J5=require('../index'),
verb=require('verbo');
var options={
  port:4000,
  hostapd:{
    driver:'rtl871xdrv',
    ssid:'testttap',
    wpa_passphrase:'testpass'
  },
  mobile:{
    {
      "label":"Tre Ricaricabile","apn":"tre.it","phone":"*99#","username":"tre","password":"tre"
    },
    {
      retry:false
    }
  }
};
var gionni=new J5(options);
console.log(gionni)
// gionni.init().then(function(status){
//  verb(status,'info','J5 init')
// }).catch(function(err){
//  verb(err,'error','J5 init')
// })
