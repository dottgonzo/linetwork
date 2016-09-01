import linet from '../index';
let verb=require('verbo');
let options={
  port:4000,
  wpasupplicant_path:"/etc/wpa_supplicant/wpa_supplicant.conf",
  hostapd:{
    driver:'rtl871xdrv',
    ssid:'testttap',
    wpa_passphrase:'testpass'
  },
  mobile:{
    provider:{
      label:"Tre Ricaricabile",
      apn:"tre.it",
      phone:"*99#",
      username:"tre",
      password:"tre"
    },
    "device":"1-1.4"
  }
};

let gionni=new linet(options);
console.log(gionni)
 gionni.connection(true).then(function(status){
  verb(status,'info','J5 init')
 }).catch(function(err){
   console.log('error')
  verb(err,'error','J5 init')
 })
