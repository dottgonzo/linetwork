import linet from '../index';
const verb=require('verbo');

const options=require('./conf.json')

options.wpasupplicant_path=__dirname+'/wpa_supplicant.conf'

const LINET=new linet(options);
 LINET.recovery().then(function(status){
  verb(status,'info','J5 init')
 }).catch(function(err){
   console.log('error')
  verb(err,'error','J5 init')
 })