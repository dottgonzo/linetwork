import linet from '../index';
const verb=require('verbo');

const options=require('./conf.json')

const LINET=new linet(options);
console.log(LINET)
 LINET.wifi_switch('host').then(function(status){
  verb(status,'info','J5 init')
 }).catch(function(err){
   console.log('error')
  verb(err,'error','J5 init')
 })
