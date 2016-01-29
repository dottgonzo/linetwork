import hostapdswitch = require("hostapd_switch");
import * as Promise from "bluebird";
import * as fs from "fs";
import * as _ from "lodash";
import testinternet = require("promise-test-connection");
import merge = require("json-add");
let netw = require("netw");
let LMC = require("linux-mobile-connection");
let mobileconnect = require("linux-mobile-connection");
let verb = require("verbo");


function getinterfa(setted?: string) {

    return new Promise(function(resolve, reject) {
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
        hostapd: config.hostapd
    };

    let apswitch = new hostapdswitch(confhapds);

    return new Promise(function(resolve, reject) {
        apswitch[m]().then(function(answer) {
            verb(answer, "warn", "linetwork recovery mode");
            resolve(answer);
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
    recovery?: boolean;
    port?: number;
    recovery_interface?: string;
}
interface IMobile {
    provider?: {

    };
    options?: {
    };
}
interface ILiNetworkConf {
    recovery: boolean;
    port: number;
    recovery_interface: string;
    mobile?: IMobile;
    hostapd: {
        driver: string,
        ssid: string,
        wpa_passphrase: string,
    };
}

let config: ILiNetworkConf = {
    recovery: true,
    port: 4000, // in modalità regular setta la porta per il manager
    // wpa_supplicant_path:'/etc/wpa_supplicant/wpa_supplicant.conf',
    hostapd: {
        driver: "nl80211",
        ssid: "testttap",
        wpa_passphrase: "testpass"
    },
    recovery_interface: "auto"
};


export =class LiNetwork {
    config: ILiNetworkConf;
    constructor(public data?: ClassOpt) {
        merge(config, data);
        this.config = config;
    }
    mobileconnect = function() {

        return new Promise(function(resolve, reject) {
            if (this.config.mobile) {

                LMC(this.config.mobile.provider, this.config.mobile.options).then(function(answer) {
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

    wifi_switch = function(mode: string, dev?: string) {
        console.log(mode, dev);
        if (dev || this.config.recovery_interface != "auto") {
            if (dev) {
                var apswitch = new hostapdswitch(
                    {
                        interface: dev,
                        hostapd: this.hostapd
                    }
                );
            } else {
                var apswitch = new hostapdswitch(
                    {
                        interface: this.config.recovery_interface,
                        hostapd: this.hostapd
                    }
                );
            }
            console.log("dev mode");
            return new Promise(function(resolve, reject) {
                switch (mode) {
                    case "ap":
                        apswitch.ap().then(function(answer) {
                            resolve(answer);
                        }).catch(function(err) {
                            reject(err);
                        });
                        break;

                    case "host":
                        apswitch.host().then(function(answer) {
                            resolve(answer);
                        }).catch(function(err) {
                            reject(err);
                        });
                        break;

                    case "client":
                        apswitch.client().then(function(answer) {
                            resolve(answer);
                        }).catch(function(err) {
                            reject(err);
                        });
                        break;

                };

            });

        } else {
            console.log("auto mode");
            var config = this.config;
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
                                hostapd: config.hostapd
                            }
                        );

                        console.log(apswitch);

                        switch (mode) {
                            case "ap":
                                apswitch.ap().then(function(answer) {
                                    resolve(answer);
                                }).catch(function(err) {
                                    reject(err);
                                });
                                break;

                            case "host":
                                apswitch.host().then(function(answer) {
                                    resolve(answer);
                                }).catch(function(err) {
                                    reject(err);
                                });
                                break;

                            case "client":
                                apswitch.client().then(function(answer) {
                                    resolve(answer);
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

    mproviders = function() {
        return JSON.parse(fs.readFileSync(__dirname + "/node_modules/linux-mobile-connection/node_modules/wvdialjs/providers.json", "utf-8"));
    };

    init = function() {
        let config: ILiNetworkConf = this.config;
        return new Promise(function(resolve, reject) {
            verb(config, "debug", "Tryng to connect");


            testinternet().then(function() {
                resolve({ connected: true });
            }).catch(function() {


                getinterfa(config.recovery_interface).then(function(interf: IDevice) {

                    let wifi_exist: string = interf.interface;

                    let confhapds = {
                        interface: wifi_exist,
                        hostapd: config.hostapd
                    };

                    verb(wifi_exist, "info", "Wlan interface founded");
                    let apswitch = new hostapdswitch(confhapds);
                    apswitch.client(true, true).then(function(answer) {
                        resolve(answer);
                    }).catch(function(err) {
                        if (config.mobile) {
                            LMC(config.mobile.provider, config.mobile.options).then(function(answer) {
                                resolve(answer);
                            }).catch(function() {
                                if (config.recovery) {
                                    recovery_mode(config, wifi_exist).then(function(answer) {
                                        resolve(answer);
                                    }).catch(function(err) {
                                        verb(err, "error", "J5 recovery mode start");
                                        reject(err);
                                    });
                                } else {
                                    reject("no wlan host available");
                                }
                            });
                        } else if (config.recovery) {
                            recovery_mode(config, wifi_exist).then(function(answer) {
                                resolve(answer);
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
                            resolve(answer);
                        }).catch(function(err) {
                            verb(err, "error", "J5 linuxmobile");
                            reject(err);
                        });
                    }

                });

            });

        });
    };

    recovery = function(mode?: string) {
        let config = this.config;

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





