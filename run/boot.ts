import linet from '../index';
const verb=require('verbo');

const options=require('./conf.json')

options.wpasupplicant_path=__dirname+'/wpa_supplicant.conf'

let LINET=new linet(options);
console.log(LINET)
 LINET.connection().then(function(status){
  verb(status,'info','LINETWORKING init')
 }).catch(function(err){
   console.log('error')
  verb(err,'error','LINETWORKING init')
 })
