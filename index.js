var hostapdswitch=require('hostapd_switch'),
Promise=require('promise'),
testinternet=require('promise-test-connection'),
netw=require('netw'),
LMC=require('linux-mobile-connection'),
mobileconnect=require('linux-mobile-connection'),
merge=require('json-add'),
fs=require('fs'),
_=require('lodash'),
verb=require('verbo');


function recovery_mode(config,dev){

            var confhapds={
              interface:dev,
              hostapd:config.hostapd
            }

  var apswitch=new hostapdswitch(confhapds);
  return new Promise(function(resolve,reject){
    apswitch.ap().then(function(answer){
      verb(err,'warn','linetwork recovery mode')
      resolve(answer)
    }).catch(function(err){
      verb(err,'error','linetwork recovery mode failed')
      reject(err)
    })
  })
}


function LNetwork(data) {


  var config={
    recovery:true,
    port:4000, // in modalità regular setta la porta per il manager
    // wpa_supplicant_path:'/etc/wpa_supplicant/wpa_supplicant.conf',
    recovery_interface:'auto'
  }

  if(data){
    merge(config,data)
  }

  this.config=config
};


LNetwork.prototype.wifi_switch=function(mode,dev){
console.log(mode,dev);
  if(dev||this.config.recovery_interface!='auto'){
    if (dev){
      var apswitch=new hostapdswitch(
        {
          interface:dev,
          hostapd:this.hostapd
        }
      );
    }else{
      var apswitch=new hostapdswitch(
        {
          interface:this.config.recovery_interface,
          hostapd:this.hostapd
        }
      );
    }
console.log('dev mode')
    return apswitch.mode(mode)
  }else{
    console.log('auto mode')
var config=this.config;
    return new Promise(function(resolve,reject){
      netw().then(function(data){
        console.log(data)
        _.map(data.networks,function(device){
          if(device.interfaceType=='wifi'){
            dev=device.interface
          }
        })
        if(dev){
          var apswitch=new hostapdswitch(
            {
              interface:dev,
              hostapd:config.hostapd
            }
          );

          console.log(apswitch)

          switch(mode){
            case 'ap':
              apswitch.ap().then(function(answer){
                resolve(answer)
              }).catch(function(err){
                reject(err)
              })
              break;

            case 'host':
              apswitch.host().then(function(answer){
                resolve(answer)
              }).catch(function(err){
                reject(err)
              })
              break;

            case 'client':
              apswitch.client().then(function(answer){
                resolve(answer)
              }).catch(function(err){
                reject(err)
              })
              break;

          }





        }else{
          reject({error:'no dev'})
        }
      }).catch(function(err){
        reject(err)
      })
    })
  }
},
LNetwork.prototype.mproviders=function(){
  return JSON.parse(fs.readFileSync(__dirname+'/node_modules/linux-mobile-connection/node_modules/wvdialjs/providers.json'))
},

LNetwork.prototype.init=function(){
  var config=this.config;
  return new Promise(function(resolve,reject){
    verb(config,'debug','Tryng to connect')

    testinternet().then(function(){
      resolve({connected:true})
    }).catch(function(){
      verb(err,'info','Tryng to connect')
      var wifi_exist=false
      netw().then(function(data){
        console.log(data)
        // _.map(data.networks,function(device){
        //  if(device.interfaceType=='wifi' && (!config.recovery_interface || (config.recovery_interface && config.recovery_interface == device.interface) )){
        //
        //   wifi_exist=device.interface
        //   }
        // })
        if(wifi_exist){

          var confhapds={
            interface:wifi_exist,
            hostapd:config.hostapd
          }

          verb(wifi_exist,'info','Wlan interface founded');
          // var apswitch=new hostapdswitch(confhapds);
          // apswitch.client().then(function(answer){
          //   resolve(answer)
          // }).catch(function(err){
          //   if(config.mobile){
          //     var linuxmobile=new LMC(config.mobile.provider,config.mobile.options)
          //     linuxmobile.connect().then(function(){
          //       resolve(answer)
          //     }).catch(function(){
          //       if(options.recovery){
          //         recovery_mode(config,dev).then(function(answer){
          //           resolve(answer)
          //         }).catch(function(err){
          //           verb(err,'error','J5 recovery mode start')
          //           reject(err)
          //         })
          //       } else{
          //         reject('no wlan host available')
          //       }
          //     })
          //   } else if(options.recovery){
          //       recovery_mode(config,dev).then(function(answer){
          //         resolve(answer)
          //       }).catch(function(err){
          //         verb(err,'error','J5 recovery mode start')
          //         reject(err)
          //       })
          //   }
          // })
        } else{
          verb('no wifi','warn','networker')

          // if(config.mobile){
          //   var linuxmobile=new LMC(config.mobile.provider,config.mobile.options)
          //   linuxmobile.connect().then(function(){
          //     resolve(answer)
          //   }).catch(function(err){
          //     verb(err,'error','J5 linuxmobile')
          //     reject(err)
          //   })
          // }
        }
      }).catch(function(err){
        verb(err,'error','J5 NETW ERROR!!')
        reject(err)
      })
    })
  })
},

LNetwork.prototype.recovery=function(dev){
  return recovery_mode(this.config,dev)
};



module.exports=LNetwork
