import linet from '../index';
const verb=require('verbo');

const options=require('./conf.json')
options.wpasupplicant_path=__dirname+'/wpa_supplicant.conf'

const LINET=new linet(options);
console.log(LINET)
 LINET.wifi_switch('ap').then(function(status){
  verb(status,'info','LINETWORKING AP')
 }).catch(function(err){
   console.log('error')
  verb(err,'error','LINETWORKING init')
 })
