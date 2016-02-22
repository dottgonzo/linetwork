import * as Promise from "bluebird";
import * as fs from "fs";
import * as _ from "lodash";

import Providers = require("mobile-providers");
import Wpamanager = require("wpasupplicant-manager");
import hostapdswitch = require("hostapd_switch");
import testinternet = require("promise-test-connection");
import merge = require("json-add");
import LMC = require("linux-mobile-connection");

let netw = require("netw");
let verb = require("verbo");





interface IProvider {

    label?: string;
    apn: string;
    phone?: string
    username?: string;
    password?: string;

}

interface IGlobalProviders {

    country: string;
    providers: IProvider[];
}


function getinterfa(setted?: string) {

    return new Promise<IDevice>(function(resolve, reject) {
        let wifi_exist: any = false;
        let devi: IDevice;
        netw().then(function(net) {

            _.map(net.networks, function(device: IDevice) {

                if (device.type == "wifi" && (!setted || setted == "auto" || setted == device.interface)) {
                    wifi_exist = device.interface;
                    devi = device;
                }
            });

            if (wifi_exist) {
                resolve(devi);
            } else {
                reject({ error: "device not founded" });
            }

        }).catch(function(err) {
            reject(err);
        });

    });

}


function recovery_mode(config: ILiNetworkConf, dev: string, mode?: string) {
    let m: string;

    if (mode) {
        m = mode;

    } else {
        m = "host";
    }

    let confhapds = {
        interface: dev,
        wpasupplicant_path: config.wpasupplicant_path,
        hostapd: config.hostapd
    };

    let apswitch = new hostapdswitch(confhapds);

    return new Promise<boolean>(function(resolve, reject) {
        apswitch[m]().then(function(answer) {
            verb(answer, "warn", "linetwork recovery mode");
            resolve(true);
        }).catch(function(err) {
            verb(err, "error", "linetwork recovery mode failed");
            reject(err);
        });
    });
}


interface IDevice {
    type: string;
    interface: string;
}

interface ClassOpt {
    port: number;
    recovery_interface?: string;
    mobile?: IMobile;
    hostapd?: IHostapdcf;
    wpasupplicant_path?: string;
}
interface IMobile {
    provider?: IProvider;
    options?: {
        verbose?: boolean;
        wvdialFile?: string;
        dev?: any;
        ifOffline?: boolean;
        retry?: boolean;
    };
}
interface ILiNetworkConf {
    port: number;
    recovery_interface: string;
    mobile?: IMobile;
    hostapd: IHostapd;
    wpasupplicant_path?: string;
}
interface IHostapd {
    driver: string;
    ssid: string;
    wpa_passphrase: any;
};
interface IHostapdcf {
    driver?: string;
    ssid: string;
    wpa_passphrase: any;
};
interface IDnsmasq {
    interface: string;
};

interface IHConf {
    interface: string;
    wpasupplicant_path: string;
    hostapd: IHostapd;
    dnsmasq: IDnsmasq;
    redirect: boolean;
};

interface IConnection {

    linkType: string;
    interface: string;
    ip?: string;
    gateway?: string;

}

interface IInit {
    conection: boolean;
    recovery: boolean;
    details?: IConnection;
}

let config: ILiNetworkConf = {
    port: 4000, // in modalità regular setta la porta per il manager
    // wpa_supplicant_path:'/etc/wpa_supplicant/wpa_supplicant.conf',
    hostapd: {
        driver: "nl80211",
        ssid: "testttap",
        wpa_passphrase: "testpass"
    },
    recovery_interface: "auto",
    wpasupplicant_path: "/etc/wpa_supplicant/wpa_supplicant.conf"
};


class LiNetwork {
    liconfig: ILiNetworkConf;
    hostapd: IHConf;
    constructor(data: ClassOpt) {

        merge(config, data);


        this.liconfig = config;
    }
    mobileconnect() {

        return new Promise<boolean>(function(resolve, reject) {
            if (this.liconfig.mobile) {

                LMC(this.liconfig.mobile.provider, this.liconfig.mobile.options).then(function(answer) {
                    resolve(answer);
                }).catch(function(err) {
                    verb(err, "error", "J5 linuxmobile");
                    reject(err);
                });

            } else {
                reject({ error: "no mobile configuration provided" });
            }


        });

    };
    
    wpamanager(){
        
        return new Wpamanager(this.liconfig.wpasupplicant_path)
        
    }

    mobileproviders(){
        
        return new Providers()
        
    }

    wifi_switch(mode: string, dev?: string) {
        console.log(mode, dev);
        if (dev || this.liconfig.recovery_interface != "auto") {
            if (dev) {
                var apswitch = new hostapdswitch(
                    {
                        interface: dev,
                        wpasupplicant_path: config.wpasupplicant_path,
                        hostapd: this.hostapd

                    }
                );
            } else {
                var apswitch = new hostapdswitch(
                    {
                        interface: this.liconfig.recovery_interface,
                        wpasupplicant_path: config.wpasupplicant_path,
                        hostapd: this.hostapd
                    }
                );
            }
            console.log("dev mode");
            return new Promise<boolean>(function(resolve, reject) {
                switch (mode) {
                    case "ap":
                        apswitch.ap().then(function(answer) {
                            resolve(true);
                        }).catch(function(err) {
                            reject(err);
                        });
                        break;

                    case "host":
                        apswitch.host().then(function(answer) {
                            resolve(true);
                        }).catch(function(err) {
                            reject(err);
                        });
                        break;

                    case "client":
                        apswitch.client().then(function(answer) {
                            resolve(true);
                        }).catch(function(err) {
                            reject(err);
                        });
                        break;

                };

            });

        } else {
            console.log("auto mode");
            var config = this.liconfig;
            return new Promise(function(resolve, reject) {
                netw().then(function(data) {
                    console.log(data);
                    _.map(data.networks, function(device: IDevice) {
                        if (device.type == "wifi") {
                            dev = device.interface;
                        }
                    });
                    if (dev) {

                        var apswitch = new hostapdswitch(
                            {
                                interface: dev,
                                hostapd: config.hostapd,
                                wpasupplicant_path: config.wpasupplicant_path
                            }
                        );

                        console.log(apswitch);

                        switch (mode) {
                            case "ap":
                                apswitch.ap().then(function(answer) {
                                    resolve(true);
                                }).catch(function(err) {
                                    reject(err);
                                });
                                break;

                            case "host":
                                apswitch.host().then(function(answer) {
                                    resolve(true);
                                }).catch(function(err) {
                                    reject(err);
                                });
                                break;

                            case "client":
                                apswitch.client().then(function(answer) {
                                    resolve(true);
                                }).catch(function(err) {
                                    reject(err);
                                });
                                break;
                        }

                    } else {
                        reject({ error: "no dev" });
                    }
                }).catch(function(err) {
                    reject(err);
                });
            });
        }
    };

    mproviders(): IGlobalProviders[] {
        return JSON.parse(fs.readFileSync(__dirname + "/node_modules/linux-mobile-connection/node_modules/wvdialjs/providers.json", "utf-8"));
    };

    connection(recovery?: boolean) {
        let config = this.liconfig;
        return new Promise<IInit>(function(resolve, reject) {
            verb(config, "debug", "Tryng to connect");


            testinternet().then(function() {
                resolve({ conection: true, recovery: false });
            }).catch(function() {


                getinterfa(config.recovery_interface).then(function(interf: IDevice) {

                    let wifi_exist: string = interf.interface;

                    let confhapds = {
                        interface: wifi_exist,
                        wpasupplicant_path: config.wpasupplicant_path,
                        hostapd: config.hostapd
                    };

                    verb(wifi_exist, "info", "Wlan interface founded");
                    let apswitch = new hostapdswitch(confhapds, true);
                    apswitch.client(true, true).then(function(answer) {
                        resolve({ conection: true, recovery: false });
                    }).catch(function(err) {
                        if (config.mobile) {
                            LMC(config.mobile.provider, config.mobile.options).then(function(answer) {
                                resolve({ conection: true, recovery: false });
                            }).catch(function() {
                                if (recovery) {
                                    recovery_mode(config, wifi_exist).then(function(answer) {
                                        resolve({ conection: false, recovery: true });
                                    }).catch(function(err) {
                                        verb(err, "error", "J5 recovery mode start");
                                        reject(err);
                                    });
                                } else {
                                    reject("no wlan host available");
                                }
                            });
                        } else if (recovery) {
                            recovery_mode(config, wifi_exist).then(function(answer) {
                                resolve({ conection: false, recovery: true });
                            }).catch(function(err) {
                                verb(err, "error", "J5 recovery mode start");
                                reject(err);
                            });
                        }
                    });
                }).catch(function(err) {

                    verb("no wifi", "warn", "networker");

                    if (config.mobile) {
                        LMC(config.mobile.provider, config.mobile.options).then(function(answer) {
                            resolve({ conection: true, recovery: false });
                        }).catch(function(err) {
                            verb(err, "error", "J5 linuxmobile");
                            reject(err);
                        });
                    }

                });

            });

        });
    };

    recovery(mode?: string) {
        let config = this.liconfig;

        return new Promise(function(resolve, reject) {
            getinterfa(config.recovery_interface).then(function(interf: IDevice) {
                let wifi_exist: string = interf.interface;
                recovery_mode(config, wifi_exist, mode).then(function(answer) {
                    resolve(answer);
                }).catch(function(err) {
                    reject(err);
                });
            }).catch(function(err) {
                reject(err);
            });
        });
    };

};





export = LiNetwork;