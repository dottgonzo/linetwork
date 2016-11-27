import linet from '../index';
const verb=require('verbo');

const options=require('./conf.json')

options.wpasupplicant_path=__dirname+'/wpa_supplicant.conf'

const LINET=new linet(options);
 LINET.recovery(true).then(function(status){
  verb(status,'info','LINETWORKING init')
 }).catch(function(err){
   console.log('error')
  verb(err,'error','LINETWORKING init')
 })