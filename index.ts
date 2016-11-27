import * as Promise from "bluebird";
import * as fs from "fs";
import * as child_process from "child_process";
import * as _ from "lodash";
import * as async from "async";
import Providers = require("mobile-providers");
import Wpamanager from "wpasupplicant-manager";
import hostapdswitch from "hostapd_switch";
import testinternet from "promise-test-connection";
import merge from "json-add";
import Wvdial from "wvdialjs";


import netw from "netw";
const verb = require("verbo");
const hwrestart = require("hwrestart");




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


type Imode = 'ap' | 'host' | 'client' | 'unmanaged' | 'wv' | 'ethernet'


interface IScan {
    essid: string;
    mac: string;
    signal: string;
}

type INetworkType = 'wifi' | 'wired'

interface INetwork {
    type: INetworkType;
    mac: string;
    interface: string;
    essid?: string;
    scan?: IScan[];
    ip?: string;
    gateway?: string;
}

interface ClassOpt {
    wifi_interface?: string;
    mobile?: IMobile;
    hostapd?: IHostapdcf;
    wpasupplicant_path?: string;
}
interface IMobile {
    provider: IProvider;
    device?: any;
    configFilePath?: string;

}

interface IEthernet {
    interface: string;
    dhcp?: {
        ip?: string;
        gateway?: string;
        netmask?: string;
        bcast?: string;
    }
}

interface ILiNetworkConf {
    wifi_interface: string;
    mobile?: IMobile;
    hostapd: IHostapd;
    wpasupplicant_path?: string;
    ethernet?: IEthernet[],
    recovery: boolean
}
interface ILiNetworkConfParams {
    wifi_interface?: string;
    mobile?: IMobile;
    hostapd?: IHostapd;
    wpasupplicant_path?: string;
    ethernet?: {
        interface: string;
        dhcp?: {
            ip?: string;
            gateway?: string;
            netmask?: string;
            bcast?: string;
        }
    },
    recovery?: true
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

interface IHostapdCf {
    driver?: string;
    ssid?: string;
    wpa_passphrase?: string;
};

interface IDnsmasq {
    interface: string;
};
interface IDnsmasqCf {
    interface?: string;
};
interface IHConf {
    interface?: string;
    wpasupplicant_path?: string;
    hostapd?: IHostapdCf;
    redirect?: boolean;
    dnsmasq?: IDnsmasqCf;
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




function getwifiinterfa(setted?: string): Promise<INetwork> {

    return new Promise<INetwork>(function (resolve, reject) {
        let wifi_exist: boolean = false;
        let devi: INetwork;
        netw().then(function (networks) {

            _.map(networks, function (device) {

                if (device.type === "wifi" && !wifi_exist && (!setted || setted === "auto" || setted === device.interface)) {
                    wifi_exist = true;
                    devi = device;
                }
            });

            if (wifi_exist) {
                resolve(devi);
            } else {
                reject({ error: "device not founded" });
            }

        }).catch(function (err) {
            reject(err);
        });

    });

}


function recovery_mode(apswitch): Promise<Imode> {


    return new Promise<Imode>(function (resolve, reject) {




        apswitch.host().then(function (answer) {
            verb(answer, "warn", "linetwork recovery mode ");
            resolve('host');
        }).catch(function (err) {
            verb(err, "error", "linetwork recovery mode failed");
            reject(err);
        });
    });
}


function recoverycheck(config: ILiNetworkConf): Promise<{ device: INetwork, known_networks: boolean }> {

    return new Promise<{ device: INetwork, known_networks: boolean }>(function (resolve, reject) {

        let somenetwork_exists: boolean = false;
        let wlan_exists: boolean = false;

        let devi: INetwork;

        netw().then(function (networks) {

            _.map(networks, function (device) {

                if (device.scan && device.type === "wifi" && !somenetwork_exists && (!config.wifi_interface || config.wifi_interface === "auto" || config.wifi_interface === device.interface)) {

                    const WM = new Wpamanager(config.wpasupplicant_path)

                    _.map(device.scan, function (netscan: IScan) {

                        _.map(WM.listwpa, function (wpaitem) {
                            if (wpaitem.ssid === netscan.essid) {
                                somenetwork_exists = true;

                            }
                        })
                    })
                }
                if (!wlan_exists && device.type === "wifi" && (!config.wifi_interface || config.wifi_interface === "auto" || config.wifi_interface === device.interface)) {
                    wlan_exists = true;
                    devi = device;
                }
            });

            if (!somenetwork_exists && wlan_exists) {
                resolve({ device: devi, known_networks: false });
            } else if (wlan_exists) {
                resolve({ device: devi, known_networks: true });
            } else {
                reject('no interface')
            }

        }).catch(function (err) {
            reject({ error: err, description: 'netw err' });
        });

    });


}



export default class LiNetwork {
    liconfig: ILiNetworkConf;
    hostapd: hostapdswitch;
    mobile: Wvdial;
    mode: Imode;
    isConnected: boolean;


    constructor(data: ILiNetworkConfParams) {


        const config: ILiNetworkConf = {
            hostapd: {
                driver: "nl80211",
                ssid: "testttap",
                wpa_passphrase: "testpass"
            },
            wifi_interface: "auto",
            wpasupplicant_path: "/etc/wpa_supplicant/wpa_supplicant.conf",
            ethernet: [{
                interface: 'eth0'
            }],
            recovery: false
        };

        merge(config, data); // combine default settings with new parameters from data
        this.mode = 'unmanaged'

        this.liconfig = config;


        if (this.liconfig.mobile) {
            if (!this.liconfig.mobile.configFilePath) this.liconfig.mobile.configFilePath = "/etc/wvdial.conf";

            this.mobile = new Wvdial(this.liconfig.mobile)
        }


    }



    ethernetconnect(devicename?: string): Promise<boolean> {
        const that = this
        return new Promise<boolean>(function (resolve, reject) {
            if (that.liconfig.ethernet) {

                const connectiondevicesarray: INetwork[] = [];

                let deviceexists: boolean = false
                let device: INetwork;
                // cheeck configuration
                netw().then((a) => {
                    _.map(a, (net) => {
                        _.map(that.liconfig.ethernet, (netinterfaceconfigured) => {

                            if (net.type === 'wired' && ((!devicename && net.interface === netinterfaceconfigured.interface) || devicename === net.interface)) {
                                deviceexists = true
                                device = net
                                connectiondevicesarray.push(net)
                            }

                        })
                    })

                    if (deviceexists) {

                        let connected: boolean = false;

                        async.eachSeries(connectiondevicesarray, (device, cb) => {
                            if (!connected) {
                                child_process.exec('ifconfig ' + device.interface + ' down && ifconfig ' + device.interface + ' up && dhclient ' + device.interface, (err, stdout, stderr) => {
                                    if (err) {
                                        cb()
                                    } else {
                                        that.testinternet().then(() => {
                                            connected = true

                                            cb()
                                        })

                                    }
                                })
                            } else {
                                cb()
                            }

                        }, (err) => {
                            if (!connected) {
                                reject('no connection by a ethernet device')

                            } else {
                                resolve(true)

                            }
                        })
                        // need async to process everyone

                    } else {
                        reject('no ethernet device')
                    }


                })

                // check if it is just connected by eth0
                // if is connected all ok.
                // else that.ethernetreconnect(device)
            } else {
                reject('invalid ethernet conf')

            }
        });


    }

    ethernetreconnect(device?: any) {
        const that = this

    }

    mobileconnect(bool: boolean) {
        const that = this;

        const Wv = that.mobile;
        return new Promise<boolean>(function (resolve, reject) {
            Wv.configure(bool).then(function () {
                Wv.connect(true).then(function () {
                    that.mode = 'wv'
                    console.log("modem started");

                }).catch(function (err) {
                    console.log("modem error");
                    reject(err);


                });
            })




        });

    };
    wifiavailable(): Promise<IScan[]> {
        const that = this;

        return new Promise<IScan[]>(function (resolve, reject) {
            const availablenets = []
            that.networks().then((nets) => {
                _.map(nets, (net) => {
                    if (net.type === "wifi" && net.scan) {
                        _.map(net.scan, (scannedone) => {
                            availablenets.push(scannedone)
                        })

                    }

                })
            }).catch((err) => {
                reject(err)
            })


        })

    }

    wificonnectable(): Promise<IScan[]> {
        const that = this;

        return new Promise<IScan[]>(function (resolve, reject) {
            const connectables = []
            const WM = that.wpamanager()

            that.wifiavailable().then((scans) => {
                _.map(scans, (scannedone) => {
                    _.map(WM.listwpa, (wpa) => {

                        if (wpa.ssid === scannedone.essid) {
                            connectables.push(scannedone)
                        }
                    })

                })
            }).catch((err) => {
                reject(err)
            })
        })

    }



    networks(): Promise<INetwork[]> {
        return new Promise<INetwork[]>(function (resolve, reject) {

            netw().then(function (a) {
                resolve(a)
            }).catch(function (err) {
                reject(err)
            })
        })
    }
    network(devicename: string): Promise<INetwork> {
        const that = this;
        let netexists: boolean = false
        let networkinterface: INetwork;
        return new Promise<INetwork>(function (resolve, reject) {

            that.networks().then(function (a) {
                _.map(a, (net) => {
                    if (!netexists && net.interface === devicename) {
                        netexists = true
                        networkinterface = net
                    }
                })
                if (netexists) {
                    resolve(networkinterface)
                } else {
                    reject('no network')
                }
            }).catch(function (err) {
                reject(err)
            })
        })
    }

    testinternet() {
        return new Promise(function (resolve, reject) {

            testinternet().then(function (a) {
                resolve(a)
            }).catch(function (err) {
                reject(err)
            });
        });
    }

    hostapdconf(hconfig: IHConf, reconf?: true) { // reconf is experimental
        const that = this
        if (!hconfig) {
            throw Error('no config provided to configure hostapdconf')
        } else if (!that.hostapd || reconf) {
            that.hostapd = new hostapdswitch(hconfig, true);
        }

    }

    wpamanager() {
        const path = this.liconfig.wpasupplicant_path;
        return new Wpamanager(this.liconfig.wpasupplicant_path);
    }


    mobileproviders() {

        return new Providers()

    }

    wifi_switch(mode: string, dev?: string) {
        console.log(mode, dev);
        const that = this;
        const config = that.liconfig;

        if (dev || this.liconfig.wifi_interface !== "auto") {

            return new Promise<boolean>(function (resolve, reject) {


                if (!dev) {
                    dev = config.wifi_interface;
                }

                console.log("dev mode");
                that.hostapdconf({
                    interface: dev,
                    wpasupplicant_path: config.wpasupplicant_path,
                    hostapd: config.hostapd
                })

                switch (mode) {
                    case "ap":
                        that.hostapd.ap().then(function (answer) {
                            that.mode = 'ap'
                            resolve(true);
                        }).catch(function (err) {
                            reject(err);
                        });
                        break;

                    case "host":
                        that.hostapd.host().then(function (answer) {
                            that.mode = 'host'
                            resolve(true);
                        }).catch(function (err) {
                            reject(err);
                        });
                        break;

                    case "client":
                        that.hostapd.client().then(function (answer) {
                            that.mode = 'client'
                            resolve(true);
                        }).catch(function (err) {
                            reject(err);
                        });
                        break;

                };

            });

        } else {
            console.log("auto mode");
            const config = this.liconfig;
            return new Promise(function (resolve, reject) {
                netw().then(function (networks) {

                    _.map(networks, function (device) {
                        if (device.type === "wifi") {
                            dev = device.interface;
                        }
                    });
                    if (dev) {

                        that.hostapdconf({
                            interface: dev,
                            hostapd: config.hostapd,
                            wpasupplicant_path: config.wpasupplicant_path
                        })

                        console.log(that.hostapd);

                        switch (mode) {
                            case "ap":
                                that.hostapd.ap().then(function (answer) {
                                    that.mode = 'ap'
                                    resolve(true);
                                }).catch(function (err) {
                                    reject(err);
                                });
                                break;

                            case "host":
                                that.hostapd.host().then(function (answer) {
                                    that.mode = 'host'
                                    resolve(true);
                                }).catch(function (err) {
                                    reject(err);
                                });
                                break;

                            case "client":
                                that.hostapd.client().then(function (answer) {
                                    that.mode = 'client'
                                    resolve(true);
                                }).catch(function (err) {
                                    reject(err);
                                });
                                break;
                        }

                    } else {
                        reject({ error: "no dev" });
                    }
                }).catch(function (err) {
                    reject(err);
                });
            });
        }
    };





    connection() {
        const that = this;
        const recovery = that.liconfig.recovery

        return new Promise(function (resolve, reject) {
            verb(that.liconfig, "debug", "Tryng to connect");

            if (that.mode === "wv") {
                reject("auto mode")
                console.log("wv running, nothing to do")
            } else {


                that.testinternet().then(() => {
                    resolve(true)
                }).catch((err) => {


                    that.ethernetconnect().then(() => {
                        console.log('connected by ethernet')
                        resolve(true)

                    }).catch(() => {

                        getwifiinterfa(that.liconfig.wifi_interface).then(function (interf) {

                            const wifi_exist: string = interf.interface;

                            const confhapds = {
                                interface: wifi_exist,
                                wpasupplicant_path: that.liconfig.wpasupplicant_path,
                                hostapd: that.liconfig.hostapd
                            };

                            if (wifi_exist) {


                                verb(wifi_exist, "info", "Wlan interface founded");

                                that.hostapdconf(confhapds)


                                that.hostapd.client(true).then(function (answer) {
                                    that.mode = 'client'
                                    resolve({ conection: true, recovery: false });
                                }).catch(function (err) {


                                    if (that.liconfig.mobile) {


                                        that.mobile.configure().then(function () {
                                            that.mode = "wv";
                                            console.log("modem started")
                                            that.mobile.connect(true).then(function (a) {

                                                hwrestart("unplug")


                                            }).catch(function () {
                                                console.log("modem error")

                                                hwrestart("unplug")

                                            });
                                        }).catch(function (e) {
                                            console.log(e)
                                            console.log("modem error")

                                            hwrestart("unplug")

                                        });





                                    }


                                    if (recovery && wifi_exist) {
                                        that.recovery(true).then(function (answer) {
                                            verb(answer, "info", "LINETWORKING recovery mode start");

                                            if (!that.liconfig.mobile) {
                                                
                                                const scannet = setInterval(() => {
                                                    that.wificonnectable().then((nets) => {
                                                        if (nets.length > 0) {
                                                            clearInterval(scannet)
                                                            that.connection()
                                                        }
                                                    })

                                                }, 90000)

                                            }

                                        }).catch(function (err) {
                                            verb(err, "error", "LINETWORKING recovery mode error");
                                            reject('recovery mode error')


                                        });
                                    } else {
                                        console.log('not connected')
                                        reject('not connected')

                                    }
                                });
                            }



                        }).catch(function (err) {

                            verb("no wifi", "warn", "networker");

                            if (that.liconfig.mobile) {



                                that.mobile.configure().then(function () {
                                    that.mode = "wv";
                                    that.mobile.connect(true).then(function (a) {
                                        console.log(a)
                                        hwrestart("unplug")


                                    }).catch(function (e) {
                                        console.log(e)
                                        console.log("modem error")

                                        hwrestart("unplug")

                                    });
                                }).catch(function (e) {
                                    console.log(e)
                                    console.log("modem error")

                                    hwrestart("unplug")

                                });


                            } else {
                                console.log("no wifi!!???")
                                hwrestart("unplug")
                            }

                        });



                    })





                })







            }


        });
    };

    recovery(force?: true) {
        const config = this.liconfig;
        const that = this;

        return new Promise(function (resolve, reject) {
            recoverycheck(config).then(function (a) {

                const interf = a.device
                if (force || !a.known_networks) {


                    that.hostapdconf({
                        interface: a.device.interface,
                        wpasupplicant_path: that.liconfig.wpasupplicant_path,
                        hostapd: that.liconfig.hostapd
                    })

                    recovery_mode(that.hostapd).then(function (answer) {
                        that.mode = answer;
                        resolve(answer);
                    }).catch(function (err) {
                        reject(err);
                    });

                } else {
                    reject('try client or force')
                }

            }).catch(function (err) {
                reject(err);
            });
        });
    };

};






