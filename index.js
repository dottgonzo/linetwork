"use strict";
var Promise = require("bluebird");
var child_process = require("child_process");
var _ = require("lodash");
var async = require("async");
var Providers = require("mobile-providers");
var wpasupplicant_manager_1 = require("wpasupplicant-manager");
var hostapd_switch_1 = require("hostapd_switch");
var promise_test_connection_1 = require("promise-test-connection");
var json_add_1 = require("json-add");
var wvdialjs_1 = require("wvdialjs");
var netw_1 = require("netw");
var verb = require("verbo");
var hwrestart = require("hwrestart");
;
;
;
;
;
;
function getwifiinterfa(setted) {
    return new Promise(function (resolve, reject) {
        var wifi_exist = false;
        var devi;
        netw_1.default().then(function (networks) {
            _.map(networks, function (device) {
                if (device.type === "wifi" && !wifi_exist && (!setted || setted === "auto" || setted === device.interface)) {
                    wifi_exist = true;
                    devi = device;
                }
            });
            if (wifi_exist) {
                resolve(devi);
            }
            else {
                reject({ error: "device not founded" });
            }
        }).catch(function (err) {
            reject(err);
        });
    });
}
function recovery_mode(apswitch, mode) {
    return new Promise(function (resolve, reject) {
        if (!mode || mode === 'host') {
            apswitch.host().then(function (answer) {
                verb(answer, "warn", "linetwork recovery mode ");
                resolve('host');
            }).catch(function (err) {
                verb(err, "error", "linetwork recovery mode failed");
                reject(err);
            });
        }
        else if (mode === 'ap') {
            apswitch.ap().then(function (answer) {
                verb(answer, "warn", "linetwork recovery mode ");
                resolve('host');
            }).catch(function (err) {
                verb(err, "error", "linetwork recovery mode failed");
                reject(err);
            });
        }
    });
}
function recoverycheck(config) {
    return new Promise(function (resolve, reject) {
        var somenetwork_exists = false;
        var wlan_exists = false;
        var devi;
        netw_1.default().then(function (networks) {
            _.map(networks, function (device) {
                if (device.scan && device.type === "wifi" && !somenetwork_exists && (!config.wifi_interface || config.wifi_interface === "auto" || config.wifi_interface === device.interface)) {
                    var WM_1 = new wpasupplicant_manager_1.default(config.wpasupplicant_path);
                    _.map(device.scan, function (netscan) {
                        _.map(WM_1.listwpa, function (wpaitem) {
                            if (wpaitem.ssid === netscan.essid) {
                                somenetwork_exists = true;
                            }
                        });
                    });
                }
                if (!wlan_exists && device.type === "wifi" && (!config.wifi_interface || config.wifi_interface === "auto" || config.wifi_interface === device.interface)) {
                    wlan_exists = true;
                    devi = device;
                }
            });
            if (!somenetwork_exists && wlan_exists) {
                resolve({ device: devi, known_networks: false });
            }
            else if (wlan_exists) {
                resolve({ device: devi, known_networks: true });
            }
            else {
                reject('no interface');
            }
        }).catch(function (err) {
            reject({ error: err, description: 'netw err' });
        });
    });
}
var LiNetwork = (function () {
    function LiNetwork(data) {
        var config = {
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
            recovery: true
        };
        json_add_1.default(config, data);
        this.mode = 'unmanaged';
        this.liconfig = config;
        if (this.liconfig.mobile) {
            if (!this.liconfig.mobile.configFilePath)
                this.liconfig.mobile.configFilePath = "/etc/wvdial.conf";
            this.mobile = new wvdialjs_1.default(this.liconfig.mobile);
        }
    }
    LiNetwork.prototype.ethernetconnect = function (devicename) {
        var that = this;
        return new Promise(function (resolve, reject) {
            if (that.liconfig.ethernet) {
                var connectiondevicesarray_1 = [];
                var deviceexists_1 = false;
                var device_1;
                netw_1.default().then(function (a) {
                    _.map(a, function (net) {
                        _.map(that.liconfig.ethernet, function (netinterfaceconfigured) {
                            if (net.type === 'wired' && ((!devicename && net.interface === netinterfaceconfigured.interface) || devicename === net.interface)) {
                                deviceexists_1 = true;
                                device_1 = net;
                                connectiondevicesarray_1.push(net);
                            }
                        });
                    });
                    if (deviceexists_1) {
                        var connected_1 = false;
                        async.eachSeries(connectiondevicesarray_1, function (device, cb) {
                            if (!connected_1) {
                                child_process.exec('ifconfig ' + device.interface + ' down && ifconfig ' + device.interface + ' up', function (err, stdout, stderr) {
                                    if (err) {
                                        cb();
                                    }
                                    else {
                                        that.testinternet().then(function () {
                                            connected_1 = true;
                                            cb();
                                        });
                                    }
                                });
                            }
                            else {
                                cb();
                            }
                        }, function (err) {
                            if (!connected_1) {
                                reject('no connection by a ethernet device');
                            }
                            else {
                                resolve(true);
                            }
                        });
                    }
                    else {
                        reject('no ethernet device');
                    }
                });
            }
            else {
                reject('invalid ethernet conf');
            }
        });
    };
    LiNetwork.prototype.ethernetreconnect = function (device) {
        var that = this;
    };
    LiNetwork.prototype.mobileconnect = function (reset) {
        var that = this;
        that.mobile.configure(reset).then(function () {
            that.mode = "wv";
            that.mobile.connect(true).then(function (a) {
                console.log(a);
                hwrestart("unplug");
            }).catch(function (e) {
                console.log(e);
                console.log("modem error");
                hwrestart("unplug");
            });
        }).catch(function (e) {
            console.log(e);
            console.log("modem error");
            hwrestart("unplug");
        });
    };
    ;
    LiNetwork.prototype.wifiavailables = function () {
        var that = this;
        return new Promise(function (resolve, reject) {
            var availablenets = [];
            that.networks().then(function (nets) {
                _.map(nets, function (net) {
                    if (net.type === "wifi" && net.scan) {
                        _.map(net.scan, function (scannedone) {
                            availablenets.push(scannedone);
                        });
                    }
                });
                resolve(availablenets);
            }).catch(function (err) {
                reject(err);
            });
        });
    };
    LiNetwork.prototype.wificonnectables = function () {
        var that = this;
        return new Promise(function (resolve, reject) {
            var connectables = [];
            var WM = that.wpamanager();
            that.wifiavailables().then(function (scans) {
                _.map(scans, function (scannedone) {
                    _.map(WM.listwpa, function (wpa) {
                        if (wpa.ssid === scannedone.essid) {
                            connectables.push(scannedone);
                        }
                    });
                });
                resolve(connectables);
            }).catch(function (err) {
                reject(err);
            });
        });
    };
    LiNetwork.prototype.networks = function () {
        return new Promise(function (resolve, reject) {
            netw_1.default().then(function (a) {
                resolve(a);
            }).catch(function (err) {
                reject(err);
            });
        });
    };
    LiNetwork.prototype.network = function (devicename) {
        var that = this;
        var netexists = false;
        var networkinterface;
        return new Promise(function (resolve, reject) {
            that.networks().then(function (a) {
                _.map(a, function (net) {
                    if (!netexists && net.interface === devicename) {
                        netexists = true;
                        networkinterface = net;
                    }
                });
                if (netexists) {
                    resolve(networkinterface);
                }
                else {
                    reject('no network');
                }
            }).catch(function (err) {
                reject(err);
            });
        });
    };
    LiNetwork.prototype.testinternet = function () {
        return new Promise(function (resolve, reject) {
            promise_test_connection_1.default().then(function (a) {
                resolve(a);
            }).catch(function (err) {
                reject(err);
            });
        });
    };
    LiNetwork.prototype.hostapdconf = function (hconfig) {
        var that = this;
        if (!hconfig) {
            throw Error('no config provided to configure hostapdconf');
        }
        else {
            that.hostapd = new hostapd_switch_1.default(hconfig, true);
        }
    };
    LiNetwork.prototype.wpamanager = function () {
        var path = this.liconfig.wpasupplicant_path;
        return new wpasupplicant_manager_1.default(this.liconfig.wpasupplicant_path);
    };
    LiNetwork.prototype.mobileproviders = function () {
        return new Providers();
    };
    LiNetwork.prototype.wifi_switch = function (mode, dev) {
        console.log(mode, dev);
        var that = this;
        var config = that.liconfig;
        if (dev || this.liconfig.wifi_interface !== "auto") {
            return new Promise(function (resolve, reject) {
                if (!dev) {
                    dev = config.wifi_interface;
                }
                console.log("dev mode");
                that.hostapdconf({
                    interface: dev,
                    wpasupplicant_path: config.wpasupplicant_path,
                    hostapd: config.hostapd
                });
                switch (mode) {
                    case "ap":
                        that.hostapd.ap().then(function (answer) {
                            that.mode = 'ap';
                            resolve(true);
                        }).catch(function (err) {
                            reject(err);
                        });
                        break;
                    case "host":
                        that.hostapd.host().then(function (answer) {
                            that.mode = 'host';
                            resolve(true);
                        }).catch(function (err) {
                            reject(err);
                        });
                        break;
                    case "client":
                        that.hostapd.client().then(function (answer) {
                            that.mode = 'client';
                            resolve(true);
                        }).catch(function (err) {
                            reject(err);
                        });
                        break;
                }
                ;
            });
        }
        else {
            console.log("auto mode");
            var config_1 = this.liconfig;
            return new Promise(function (resolve, reject) {
                netw_1.default().then(function (networks) {
                    _.map(networks, function (device) {
                        if (device.type === "wifi") {
                            dev = device.interface;
                        }
                    });
                    if (dev) {
                        that.hostapdconf({
                            interface: dev,
                            hostapd: config_1.hostapd,
                            wpasupplicant_path: config_1.wpasupplicant_path
                        });
                        console.log(that.hostapd);
                        switch (mode) {
                            case "ap":
                                that.hostapd.ap().then(function (answer) {
                                    that.mode = 'ap';
                                    resolve(true);
                                }).catch(function (err) {
                                    reject(err);
                                });
                                break;
                            case "host":
                                that.hostapd.host().then(function (answer) {
                                    that.mode = 'host';
                                    resolve(true);
                                }).catch(function (err) {
                                    reject(err);
                                });
                                break;
                            case "client":
                                that.hostapd.client().then(function (answer) {
                                    that.mode = 'client';
                                    resolve(true);
                                }).catch(function (err) {
                                    reject(err);
                                });
                                break;
                        }
                    }
                    else {
                        reject({ error: "no dev" });
                    }
                }).catch(function (err) {
                    reject(err);
                });
            });
        }
    };
    ;
    LiNetwork.prototype.listwificlients = function () {
        var that = this;
        return new Promise(function (resolve, reject) {
            that.hostapd.listwificlients().then(function (a) {
                resolve(a);
            }).catch(function (err) {
                console.log(err);
                reject(err);
            });
        });
    };
    LiNetwork.prototype.connection = function () {
        var that = this;
        var recovery = that.liconfig.recovery;
        return new Promise(function (resolve, reject) {
            verb(that.liconfig, "debug", "Tryng to connect");
            if (that.mode === "wv") {
                reject("auto mode");
                console.log("wv running, nothing to do");
            }
            else {
                that.testinternet().then(function () {
                    resolve(true);
                }).catch(function (err) {
                    that.ethernetconnect().then(function () {
                        console.log('connected by ethernet');
                        resolve(true);
                    }).catch(function () {
                        getwifiinterfa(that.liconfig.wifi_interface).then(function (interf) {
                            var wifi_exist = interf.interface;
                            var confhapds = {
                                interface: wifi_exist,
                                wpasupplicant_path: that.liconfig.wpasupplicant_path,
                                hostapd: that.liconfig.hostapd
                            };
                            if (wifi_exist) {
                                verb(wifi_exist, "info", "Wlan interface founded");
                                that.hostapdconf(confhapds);
                                that.hostapd.client(true).then(function (answer) {
                                    that.mode = 'client';
                                    resolve({ conection: true });
                                }).catch(function (err) {
                                    if (recovery && wifi_exist) {
                                        that.recovery(true).then(function (answer) {
                                            verb(answer, "info", "LINETWORKING recovery mode start");
                                            if (that.liconfig.mobile) {
                                                that.mobileconnect(true);
                                            }
                                            var scannet = setInterval(function () {
                                                console.log('check for availables networks');
                                                that.wificonnectables().then(function (nets) {
                                                    if (nets.length > 0 && !that.liconfig.mobile) {
                                                        that.hostapd.client(true).then(function (answer) {
                                                            that.mode = 'client';
                                                            clearInterval(scannet);
                                                            console.log('connected');
                                                            resolve({ conection: true, recovery: false });
                                                        }).catch(function (err) {
                                                            console.log('no working networks for now');
                                                            that.recovery(true);
                                                        });
                                                    }
                                                    else {
                                                        if (that.liconfig.mobile) {
                                                            console.log('stayng on mobile');
                                                        }
                                                        else {
                                                            console.log('no knwown wlan available, waiting for networks');
                                                        }
                                                    }
                                                }).catch(function (err) {
                                                    console.log('list known networks error', err);
                                                });
                                            }, 120000);
                                        }).catch(function (err) {
                                            verb(err, "error", "LINETWORKING recovery mode error");
                                            reject('recovery mode error');
                                            if (that.liconfig.mobile) {
                                                that.mobileconnect(true);
                                            }
                                        });
                                    }
                                    else {
                                        if (that.liconfig.mobile) {
                                            that.mobileconnect(true);
                                        }
                                        else {
                                            console.log('not connected');
                                            reject('not connected');
                                        }
                                    }
                                });
                            }
                        }).catch(function (err) {
                            verb("no wifi", "warn", "networker");
                            if (that.liconfig.mobile) {
                                that.mobileconnect(true);
                            }
                            else {
                                console.log("no wifi!!???");
                                hwrestart("unplug");
                            }
                        });
                    });
                });
            }
        });
    };
    ;
    LiNetwork.prototype.recovery = function (force) {
        var config = this.liconfig;
        var that = this;
        return new Promise(function (resolve, reject) {
            recoverycheck(config).then(function (a) {
                var interf = a.device;
                if (force || !a.known_networks) {
                    that.hostapdconf({
                        interface: a.device.interface,
                        wpasupplicant_path: that.liconfig.wpasupplicant_path,
                        hostapd: that.liconfig.hostapd
                    });
                    var themode = void 0;
                    if (that.mode === 'wv') {
                        themode = 'ap';
                    }
                    else {
                        themode = 'host';
                    }
                    console.log('recoveryng ' + a.device.interface + ' with mode ' + themode);
                    recovery_mode(that.hostapd, themode).then(function (answer) {
                        that.mode = answer;
                        resolve(answer);
                    }).catch(function (err) {
                        reject(err);
                    });
                }
                else {
                    reject('try client or force');
                }
            }).catch(function (err) {
                reject('recoverycheck error' + err);
            });
        });
    };
    ;
    return LiNetwork;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = LiNetwork;
;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxJQUFZLE9BQU8sV0FBTSxVQUFVLENBQUMsQ0FBQTtBQUVwQyxJQUFZLGFBQWEsV0FBTSxlQUFlLENBQUMsQ0FBQTtBQUMvQyxJQUFZLENBQUMsV0FBTSxRQUFRLENBQUMsQ0FBQTtBQUM1QixJQUFZLEtBQUssV0FBTSxPQUFPLENBQUMsQ0FBQTtBQUMvQixJQUFPLFNBQVMsV0FBVyxrQkFBa0IsQ0FBQyxDQUFDO0FBQy9DLHNDQUF1Qix1QkFBdUIsQ0FBQyxDQUFBO0FBQy9DLCtCQUEwQixnQkFBZ0IsQ0FBQyxDQUFBO0FBQzNDLHdDQUF5Qix5QkFBeUIsQ0FBQyxDQUFBO0FBQ25ELHlCQUFrQixVQUFVLENBQUMsQ0FBQTtBQUM3Qix5QkFBbUIsVUFBVSxDQUFDLENBQUE7QUFJOUIscUJBQWlCLE1BQU0sQ0FBQyxDQUFBO0FBQ3hCLElBQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUM5QixJQUFNLFNBQVMsR0FBRyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7QUFxR3RDLENBQUM7QUFLRCxDQUFDO0FBTUQsQ0FBQztBQUlELENBQUM7QUFHRCxDQUFDO0FBT0QsQ0FBQztBQW9CRix3QkFBd0IsTUFBZTtJQUVuQyxNQUFNLENBQUMsSUFBSSxPQUFPLENBQVcsVUFBVSxPQUFPLEVBQUUsTUFBTTtRQUNsRCxJQUFJLFVBQVUsR0FBWSxLQUFLLENBQUM7UUFDaEMsSUFBSSxJQUFjLENBQUM7UUFDbkIsY0FBSSxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQVUsUUFBUTtZQUUxQixDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxVQUFVLE1BQU07Z0JBRTVCLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssTUFBTSxJQUFJLENBQUMsVUFBVSxJQUFJLENBQUMsQ0FBQyxNQUFNLElBQUksTUFBTSxLQUFLLE1BQU0sSUFBSSxNQUFNLEtBQUssTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDekcsVUFBVSxHQUFHLElBQUksQ0FBQztvQkFDbEIsSUFBSSxHQUFHLE1BQU0sQ0FBQztnQkFDbEIsQ0FBQztZQUNMLENBQUMsQ0FBQyxDQUFDO1lBRUgsRUFBRSxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztnQkFDYixPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDbEIsQ0FBQztZQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNKLE1BQU0sQ0FBQyxFQUFFLEtBQUssRUFBRSxvQkFBb0IsRUFBRSxDQUFDLENBQUM7WUFDNUMsQ0FBQztRQUVMLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUc7WUFDbEIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ2hCLENBQUMsQ0FBQyxDQUFDO0lBRVAsQ0FBQyxDQUFDLENBQUM7QUFFUCxDQUFDO0FBR0QsdUJBQXVCLFFBQXVCLEVBQUUsSUFBWTtJQUd4RCxNQUFNLENBQUMsSUFBSSxPQUFPLENBQVEsVUFBVSxPQUFPLEVBQUUsTUFBTTtRQUMvQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksSUFBSSxJQUFJLEtBQUssTUFBTSxDQUFDLENBQUMsQ0FBQztZQUMzQixRQUFRLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQVUsTUFBTTtnQkFDakMsSUFBSSxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsMEJBQTBCLENBQUMsQ0FBQztnQkFDakQsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3BCLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUc7Z0JBQ2xCLElBQUksQ0FBQyxHQUFHLEVBQUUsT0FBTyxFQUFFLGdDQUFnQyxDQUFDLENBQUM7Z0JBQ3JELE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNoQixDQUFDLENBQUMsQ0FBQztRQUNQLENBQUM7UUFBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDdkIsUUFBUSxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxVQUFVLE1BQU07Z0JBQy9CLElBQUksQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLDBCQUEwQixDQUFDLENBQUM7Z0JBQ2pELE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNwQixDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHO2dCQUNsQixJQUFJLENBQUMsR0FBRyxFQUFFLE9BQU8sRUFBRSxnQ0FBZ0MsQ0FBQyxDQUFDO2dCQUNyRCxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDaEIsQ0FBQyxDQUFDLENBQUM7UUFDUCxDQUFDO0lBRUwsQ0FBQyxDQUFDLENBQUM7QUFDUCxDQUFDO0FBR0QsdUJBQXVCLE1BQXNCO0lBRXpDLE1BQU0sQ0FBQyxJQUFJLE9BQU8sQ0FBZ0QsVUFBVSxPQUFPLEVBQUUsTUFBTTtRQUV2RixJQUFJLGtCQUFrQixHQUFZLEtBQUssQ0FBQztRQUN4QyxJQUFJLFdBQVcsR0FBWSxLQUFLLENBQUM7UUFFakMsSUFBSSxJQUFjLENBQUM7UUFFbkIsY0FBSSxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQVUsUUFBUTtZQUUxQixDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxVQUFVLE1BQU07Z0JBRTVCLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLElBQUksTUFBTSxDQUFDLElBQUksS0FBSyxNQUFNLElBQUksQ0FBQyxrQkFBa0IsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLGNBQWMsSUFBSSxNQUFNLENBQUMsY0FBYyxLQUFLLE1BQU0sSUFBSSxNQUFNLENBQUMsY0FBYyxLQUFLLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBRTdLLElBQU0sSUFBRSxHQUFHLElBQUksK0JBQVUsQ0FBQyxNQUFNLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtvQkFFcEQsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLFVBQVUsT0FBYzt3QkFFdkMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFFLENBQUMsT0FBTyxFQUFFLFVBQVUsT0FBTzs0QkFDL0IsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksS0FBSyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztnQ0FDakMsa0JBQWtCLEdBQUcsSUFBSSxDQUFDOzRCQUU5QixDQUFDO3dCQUNMLENBQUMsQ0FBQyxDQUFBO29CQUNOLENBQUMsQ0FBQyxDQUFBO2dCQUNOLENBQUM7Z0JBQ0QsRUFBRSxDQUFDLENBQUMsQ0FBQyxXQUFXLElBQUksTUFBTSxDQUFDLElBQUksS0FBSyxNQUFNLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxjQUFjLElBQUksTUFBTSxDQUFDLGNBQWMsS0FBSyxNQUFNLElBQUksTUFBTSxDQUFDLGNBQWMsS0FBSyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUN2SixXQUFXLEdBQUcsSUFBSSxDQUFDO29CQUNuQixJQUFJLEdBQUcsTUFBTSxDQUFDO2dCQUNsQixDQUFDO1lBQ0wsQ0FBQyxDQUFDLENBQUM7WUFFSCxFQUFFLENBQUMsQ0FBQyxDQUFDLGtCQUFrQixJQUFJLFdBQVcsQ0FBQyxDQUFDLENBQUM7Z0JBQ3JDLE9BQU8sQ0FBQyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7WUFDckQsQ0FBQztZQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO2dCQUNyQixPQUFPLENBQUMsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1lBQ3BELENBQUM7WUFBQyxJQUFJLENBQUMsQ0FBQztnQkFDSixNQUFNLENBQUMsY0FBYyxDQUFDLENBQUE7WUFDMUIsQ0FBQztRQUVMLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUc7WUFDbEIsTUFBTSxDQUFDLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxXQUFXLEVBQUUsVUFBVSxFQUFFLENBQUMsQ0FBQztRQUNwRCxDQUFDLENBQUMsQ0FBQztJQUVQLENBQUMsQ0FBQyxDQUFDO0FBR1AsQ0FBQztBQUlEO0lBUUksbUJBQVksSUFBMEI7UUFHbEMsSUFBTSxNQUFNLEdBQW1CO1lBQzNCLE9BQU8sRUFBRTtnQkFDTCxNQUFNLEVBQUUsU0FBUztnQkFDakIsSUFBSSxFQUFFLFVBQVU7Z0JBQ2hCLGNBQWMsRUFBRSxVQUFVO2FBQzdCO1lBQ0QsY0FBYyxFQUFFLE1BQU07WUFDdEIsa0JBQWtCLEVBQUUseUNBQXlDO1lBQzdELFFBQVEsRUFBRSxDQUFDO29CQUNQLFNBQVMsRUFBRSxNQUFNO2lCQUNwQixDQUFDO1lBQ0YsUUFBUSxFQUFFLElBQUk7U0FDakIsQ0FBQztRQUVGLGtCQUFLLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3BCLElBQUksQ0FBQyxJQUFJLEdBQUcsV0FBVyxDQUFBO1FBRXZCLElBQUksQ0FBQyxRQUFRLEdBQUcsTUFBTSxDQUFDO1FBR3ZCLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztZQUN2QixFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQztnQkFBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxjQUFjLEdBQUcsa0JBQWtCLENBQUM7WUFFbkcsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLGtCQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNsRCxDQUFDO0lBR0wsQ0FBQztJQUlELG1DQUFlLEdBQWYsVUFBZ0IsVUFBbUI7UUFDL0IsSUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFBO1FBQ2pCLE1BQU0sQ0FBQyxJQUFJLE9BQU8sQ0FBVSxVQUFVLE9BQU8sRUFBRSxNQUFNO1lBQ2pELEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztnQkFFekIsSUFBTSx3QkFBc0IsR0FBZSxFQUFFLENBQUM7Z0JBRTlDLElBQUksY0FBWSxHQUFZLEtBQUssQ0FBQTtnQkFDakMsSUFBSSxRQUFnQixDQUFDO2dCQUVyQixjQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBQyxDQUFDO29CQUNWLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLFVBQUMsR0FBRzt3QkFDVCxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLFVBQUMsc0JBQXNCOzRCQUVqRCxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxLQUFLLE9BQU8sSUFBSSxDQUFDLENBQUMsQ0FBQyxVQUFVLElBQUksR0FBRyxDQUFDLFNBQVMsS0FBSyxzQkFBc0IsQ0FBQyxTQUFTLENBQUMsSUFBSSxVQUFVLEtBQUssR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQ0FDaEksY0FBWSxHQUFHLElBQUksQ0FBQTtnQ0FDbkIsUUFBTSxHQUFHLEdBQUcsQ0FBQTtnQ0FDWix3QkFBc0IsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7NEJBQ3BDLENBQUM7d0JBRUwsQ0FBQyxDQUFDLENBQUE7b0JBQ04sQ0FBQyxDQUFDLENBQUE7b0JBRUYsRUFBRSxDQUFDLENBQUMsY0FBWSxDQUFDLENBQUMsQ0FBQzt3QkFFZixJQUFJLFdBQVMsR0FBWSxLQUFLLENBQUM7d0JBRS9CLEtBQUssQ0FBQyxVQUFVLENBQUMsd0JBQXNCLEVBQUUsVUFBQyxNQUFNLEVBQUUsRUFBRTs0QkFDaEQsRUFBRSxDQUFDLENBQUMsQ0FBQyxXQUFTLENBQUMsQ0FBQyxDQUFDO2dDQUNiLGFBQWEsQ0FBQyxJQUFJLENBQUMsV0FBVyxHQUFHLE1BQU0sQ0FBQyxTQUFTLEdBQUcsb0JBQW9CLEdBQUcsTUFBTSxDQUFDLFNBQVMsR0FBRyxLQUFLLEVBQUUsVUFBQyxHQUFHLEVBQUUsTUFBTSxFQUFFLE1BQU07b0NBQ3JILEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7d0NBQ04sRUFBRSxFQUFFLENBQUE7b0NBQ1IsQ0FBQztvQ0FBQyxJQUFJLENBQUMsQ0FBQzt3Q0FDSixJQUFJLENBQUMsWUFBWSxFQUFFLENBQUMsSUFBSSxDQUFDOzRDQUNyQixXQUFTLEdBQUcsSUFBSSxDQUFBOzRDQUVoQixFQUFFLEVBQUUsQ0FBQTt3Q0FDUixDQUFDLENBQUMsQ0FBQTtvQ0FFTixDQUFDO2dDQUNMLENBQUMsQ0FBQyxDQUFBOzRCQUNOLENBQUM7NEJBQUMsSUFBSSxDQUFDLENBQUM7Z0NBQ0osRUFBRSxFQUFFLENBQUE7NEJBQ1IsQ0FBQzt3QkFFTCxDQUFDLEVBQUUsVUFBQyxHQUFHOzRCQUNILEVBQUUsQ0FBQyxDQUFDLENBQUMsV0FBUyxDQUFDLENBQUMsQ0FBQztnQ0FDYixNQUFNLENBQUMsb0NBQW9DLENBQUMsQ0FBQTs0QkFFaEQsQ0FBQzs0QkFBQyxJQUFJLENBQUMsQ0FBQztnQ0FDSixPQUFPLENBQUMsSUFBSSxDQUFDLENBQUE7NEJBRWpCLENBQUM7d0JBQ0wsQ0FBQyxDQUFDLENBQUE7b0JBR04sQ0FBQztvQkFBQyxJQUFJLENBQUMsQ0FBQzt3QkFDSixNQUFNLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtvQkFDaEMsQ0FBQztnQkFHTCxDQUFDLENBQUMsQ0FBQTtZQUtOLENBQUM7WUFBQyxJQUFJLENBQUMsQ0FBQztnQkFDSixNQUFNLENBQUMsdUJBQXVCLENBQUMsQ0FBQTtZQUVuQyxDQUFDO1FBQ0wsQ0FBQyxDQUFDLENBQUM7SUFHUCxDQUFDO0lBRUQscUNBQWlCLEdBQWpCLFVBQWtCLE1BQVk7UUFDMUIsSUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFBO0lBRXJCLENBQUM7SUFFRCxpQ0FBYSxHQUFiLFVBQWMsS0FBWTtRQUN0QixJQUFNLElBQUksR0FBRyxJQUFJLENBQUE7UUFDakIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDO1lBQzlCLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO1lBQ2pCLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUM7Z0JBQ3RDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7Z0JBQ2QsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBR3ZCLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUM7Z0JBQ2hCLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7Z0JBQ2QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQTtnQkFFMUIsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBRXZCLENBQUMsQ0FBQyxDQUFDO1FBQ1AsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQztZQUNoQixPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ2QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQTtZQUUxQixTQUFTLENBQUMsUUFBUSxDQUFDLENBQUE7UUFFdkIsQ0FBQyxDQUFDLENBQUM7SUFDUCxDQUFDOztJQUNELGtDQUFjLEdBQWQ7UUFDSSxJQUFNLElBQUksR0FBRyxJQUFJLENBQUM7UUFFbEIsTUFBTSxDQUFDLElBQUksT0FBTyxDQUFVLFVBQVUsT0FBTyxFQUFFLE1BQU07WUFDakQsSUFBTSxhQUFhLEdBQUcsRUFBRSxDQUFBO1lBQ3hCLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBQyxJQUFJO2dCQUN0QixDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxVQUFDLEdBQUc7b0JBQ1osRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksS0FBSyxNQUFNLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7d0JBQ2xDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxVQUFDLFVBQVU7NEJBQ3ZCLGFBQWEsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUE7d0JBQ2xDLENBQUMsQ0FBQyxDQUFBO29CQUVOLENBQUM7Z0JBRUwsQ0FBQyxDQUFDLENBQUE7Z0JBQ0YsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFBO1lBRTFCLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFDLEdBQUc7Z0JBQ1QsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ2YsQ0FBQyxDQUFDLENBQUE7UUFHTixDQUFDLENBQUMsQ0FBQTtJQUVOLENBQUM7SUFFRCxvQ0FBZ0IsR0FBaEI7UUFDSSxJQUFNLElBQUksR0FBRyxJQUFJLENBQUM7UUFFbEIsTUFBTSxDQUFDLElBQUksT0FBTyxDQUFVLFVBQVUsT0FBTyxFQUFFLE1BQU07WUFDakQsSUFBTSxZQUFZLEdBQUcsRUFBRSxDQUFBO1lBQ3ZCLElBQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQTtZQUU1QixJQUFJLENBQUMsY0FBYyxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQUMsS0FBSztnQkFDN0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsVUFBQyxVQUFVO29CQUNwQixDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsVUFBQyxHQUFHO3dCQUVsQixFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxLQUFLLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDOzRCQUNoQyxZQUFZLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFBO3dCQUNqQyxDQUFDO29CQUNMLENBQUMsQ0FBQyxDQUFBO2dCQUVOLENBQUMsQ0FBQyxDQUFBO2dCQUNGLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQTtZQUN6QixDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBQyxHQUFHO2dCQUNULE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUNmLENBQUMsQ0FBQyxDQUFBO1FBQ04sQ0FBQyxDQUFDLENBQUE7SUFFTixDQUFDO0lBSUQsNEJBQVEsR0FBUjtRQUNJLE1BQU0sQ0FBQyxJQUFJLE9BQU8sQ0FBYSxVQUFVLE9BQU8sRUFBRSxNQUFNO1lBRXBELGNBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUM7Z0JBQ25CLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNkLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUc7Z0JBQ2xCLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUNmLENBQUMsQ0FBQyxDQUFBO1FBQ04sQ0FBQyxDQUFDLENBQUE7SUFDTixDQUFDO0lBQ0QsMkJBQU8sR0FBUCxVQUFRLFVBQWtCO1FBQ3RCLElBQU0sSUFBSSxHQUFHLElBQUksQ0FBQztRQUNsQixJQUFJLFNBQVMsR0FBWSxLQUFLLENBQUE7UUFDOUIsSUFBSSxnQkFBMEIsQ0FBQztRQUMvQixNQUFNLENBQUMsSUFBSSxPQUFPLENBQVcsVUFBVSxPQUFPLEVBQUUsTUFBTTtZQUVsRCxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQztnQkFDNUIsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsVUFBQyxHQUFHO29CQUNULEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxJQUFJLEdBQUcsQ0FBQyxTQUFTLEtBQUssVUFBVSxDQUFDLENBQUMsQ0FBQzt3QkFDN0MsU0FBUyxHQUFHLElBQUksQ0FBQTt3QkFDaEIsZ0JBQWdCLEdBQUcsR0FBRyxDQUFBO29CQUMxQixDQUFDO2dCQUNMLENBQUMsQ0FBQyxDQUFBO2dCQUNGLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7b0JBQ1osT0FBTyxDQUFDLGdCQUFnQixDQUFDLENBQUE7Z0JBQzdCLENBQUM7Z0JBQUMsSUFBSSxDQUFDLENBQUM7b0JBQ0osTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFBO2dCQUN4QixDQUFDO1lBQ0wsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRztnQkFDbEIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ2YsQ0FBQyxDQUFDLENBQUE7UUFDTixDQUFDLENBQUMsQ0FBQTtJQUNOLENBQUM7SUFFRCxnQ0FBWSxHQUFaO1FBQ0ksTUFBTSxDQUFDLElBQUksT0FBTyxDQUFDLFVBQVUsT0FBTyxFQUFFLE1BQU07WUFFeEMsaUNBQVksRUFBRSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUM7Z0JBQzNCLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNkLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUc7Z0JBQ2xCLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUNmLENBQUMsQ0FBQyxDQUFDO1FBQ1AsQ0FBQyxDQUFDLENBQUM7SUFDUCxDQUFDO0lBRUQsK0JBQVcsR0FBWCxVQUFZLE9BQWU7UUFDdkIsSUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFBO1FBQ2pCLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUNYLE1BQU0sS0FBSyxDQUFDLDZDQUE2QyxDQUFDLENBQUE7UUFHOUQsQ0FBQztRQUFDLElBQUksQ0FBQyxDQUFDO1lBRUosSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLHdCQUFhLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBR3BELENBQUM7SUFFTCxDQUFDO0lBRUQsOEJBQVUsR0FBVjtRQUNJLElBQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsa0JBQWtCLENBQUM7UUFDOUMsTUFBTSxDQUFDLElBQUksK0JBQVUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLGtCQUFrQixDQUFDLENBQUM7SUFDNUQsQ0FBQztJQUdELG1DQUFlLEdBQWY7UUFFSSxNQUFNLENBQUMsSUFBSSxTQUFTLEVBQUUsQ0FBQTtJQUUxQixDQUFDO0lBRUQsK0JBQVcsR0FBWCxVQUFZLElBQVksRUFBRSxHQUFZO1FBQ2xDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ3ZCLElBQU0sSUFBSSxHQUFHLElBQUksQ0FBQztRQUNsQixJQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDO1FBRTdCLEVBQUUsQ0FBQyxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLGNBQWMsS0FBSyxNQUFNLENBQUMsQ0FBQyxDQUFDO1lBRWpELE1BQU0sQ0FBQyxJQUFJLE9BQU8sQ0FBVSxVQUFVLE9BQU8sRUFBRSxNQUFNO2dCQUdqRCxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7b0JBQ1AsR0FBRyxHQUFHLE1BQU0sQ0FBQyxjQUFjLENBQUM7Z0JBQ2hDLENBQUM7Z0JBRUQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztnQkFDeEIsSUFBSSxDQUFDLFdBQVcsQ0FBQztvQkFDYixTQUFTLEVBQUUsR0FBRztvQkFDZCxrQkFBa0IsRUFBRSxNQUFNLENBQUMsa0JBQWtCO29CQUM3QyxPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU87aUJBQzFCLENBQUMsQ0FBQTtnQkFFRixNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO29CQUNYLEtBQUssSUFBSTt3QkFDTCxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxVQUFVLE1BQU07NEJBQ25DLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFBOzRCQUNoQixPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7d0JBQ2xCLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUc7NEJBQ2xCLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQzt3QkFDaEIsQ0FBQyxDQUFDLENBQUM7d0JBQ0gsS0FBSyxDQUFDO29CQUVWLEtBQUssTUFBTTt3QkFDUCxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxVQUFVLE1BQU07NEJBQ3JDLElBQUksQ0FBQyxJQUFJLEdBQUcsTUFBTSxDQUFBOzRCQUNsQixPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7d0JBQ2xCLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUc7NEJBQ2xCLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQzt3QkFDaEIsQ0FBQyxDQUFDLENBQUM7d0JBQ0gsS0FBSyxDQUFDO29CQUVWLEtBQUssUUFBUTt3QkFDVCxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLElBQUksQ0FBQyxVQUFVLE1BQU07NEJBQ3ZDLElBQUksQ0FBQyxJQUFJLEdBQUcsUUFBUSxDQUFBOzRCQUNwQixPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7d0JBQ2xCLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUc7NEJBQ2xCLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQzt3QkFDaEIsQ0FBQyxDQUFDLENBQUM7d0JBQ0gsS0FBSyxDQUFDO2dCQUVkLENBQUM7Z0JBQUEsQ0FBQztZQUVOLENBQUMsQ0FBQyxDQUFDO1FBRVAsQ0FBQztRQUFDLElBQUksQ0FBQyxDQUFDO1lBQ0osT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUN6QixJQUFNLFFBQU0sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDO1lBQzdCLE1BQU0sQ0FBQyxJQUFJLE9BQU8sQ0FBQyxVQUFVLE9BQU8sRUFBRSxNQUFNO2dCQUN4QyxjQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBVSxRQUFRO29CQUUxQixDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxVQUFVLE1BQU07d0JBQzVCLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssTUFBTSxDQUFDLENBQUMsQ0FBQzs0QkFDekIsR0FBRyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUM7d0JBQzNCLENBQUM7b0JBQ0wsQ0FBQyxDQUFDLENBQUM7b0JBQ0gsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQzt3QkFFTixJQUFJLENBQUMsV0FBVyxDQUFDOzRCQUNiLFNBQVMsRUFBRSxHQUFHOzRCQUNkLE9BQU8sRUFBRSxRQUFNLENBQUMsT0FBTzs0QkFDdkIsa0JBQWtCLEVBQUUsUUFBTSxDQUFDLGtCQUFrQjt5QkFDaEQsQ0FBQyxDQUFBO3dCQUVGLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO3dCQUUxQixNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDOzRCQUNYLEtBQUssSUFBSTtnQ0FDTCxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxVQUFVLE1BQU07b0NBQ25DLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFBO29DQUNoQixPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7Z0NBQ2xCLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUc7b0NBQ2xCLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztnQ0FDaEIsQ0FBQyxDQUFDLENBQUM7Z0NBQ0gsS0FBSyxDQUFDOzRCQUVWLEtBQUssTUFBTTtnQ0FDUCxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxVQUFVLE1BQU07b0NBQ3JDLElBQUksQ0FBQyxJQUFJLEdBQUcsTUFBTSxDQUFBO29DQUNsQixPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7Z0NBQ2xCLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUc7b0NBQ2xCLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztnQ0FDaEIsQ0FBQyxDQUFDLENBQUM7Z0NBQ0gsS0FBSyxDQUFDOzRCQUVWLEtBQUssUUFBUTtnQ0FDVCxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLElBQUksQ0FBQyxVQUFVLE1BQU07b0NBQ3ZDLElBQUksQ0FBQyxJQUFJLEdBQUcsUUFBUSxDQUFBO29DQUNwQixPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7Z0NBQ2xCLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUc7b0NBQ2xCLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztnQ0FDaEIsQ0FBQyxDQUFDLENBQUM7Z0NBQ0gsS0FBSyxDQUFDO3dCQUNkLENBQUM7b0JBRUwsQ0FBQztvQkFBQyxJQUFJLENBQUMsQ0FBQzt3QkFDSixNQUFNLENBQUMsRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQztvQkFDaEMsQ0FBQztnQkFDTCxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHO29CQUNsQixNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ2hCLENBQUMsQ0FBQyxDQUFDO1lBQ1AsQ0FBQyxDQUFDLENBQUM7UUFDUCxDQUFDO0lBQ0wsQ0FBQzs7SUFHRCxtQ0FBZSxHQUFmO1FBQ0ksSUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFBO1FBQ2pCLE1BQU0sQ0FBQyxJQUFJLE9BQU8sQ0FBZ0IsVUFBVSxPQUFPLEVBQUUsTUFBTTtZQUV2RCxJQUFJLENBQUMsT0FBTyxDQUFDLGVBQWUsRUFBRSxDQUFDLElBQUksQ0FBQyxVQUFDLENBQUM7Z0JBQ2xDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNkLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFDLEdBQUc7Z0JBQ1QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQTtnQkFDaEIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ2YsQ0FBQyxDQUFDLENBQUE7UUFFTixDQUFDLENBQUMsQ0FBQTtJQUNOLENBQUM7SUFHRCw4QkFBVSxHQUFWO1FBQ0ksSUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDO1FBQ2xCLElBQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFBO1FBRXZDLE1BQU0sQ0FBQyxJQUFJLE9BQU8sQ0FBQyxVQUFVLE9BQU8sRUFBRSxNQUFNO1lBQ3hDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLE9BQU8sRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO1lBRWpELEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFDckIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFBO2dCQUNuQixPQUFPLENBQUMsR0FBRyxDQUFDLDJCQUEyQixDQUFDLENBQUE7WUFDNUMsQ0FBQztZQUFDLElBQUksQ0FBQyxDQUFDO2dCQUdKLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQyxJQUFJLENBQUM7b0JBQ3JCLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQTtnQkFDakIsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQUMsR0FBRztvQkFHVCxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUMsSUFBSSxDQUFDO3dCQUN4QixPQUFPLENBQUMsR0FBRyxDQUFDLHVCQUF1QixDQUFDLENBQUE7d0JBQ3BDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQTtvQkFFakIsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO3dCQUVMLGNBQWMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLE1BQU07NEJBRTlELElBQU0sVUFBVSxHQUFXLE1BQU0sQ0FBQyxTQUFTLENBQUM7NEJBRTVDLElBQU0sU0FBUyxHQUFHO2dDQUNkLFNBQVMsRUFBRSxVQUFVO2dDQUNyQixrQkFBa0IsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLGtCQUFrQjtnQ0FDcEQsT0FBTyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTzs2QkFDakMsQ0FBQzs0QkFFRixFQUFFLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO2dDQUdiLElBQUksQ0FBQyxVQUFVLEVBQUUsTUFBTSxFQUFFLHdCQUF3QixDQUFDLENBQUM7Z0NBRW5ELElBQUksQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUE7Z0NBRzNCLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLE1BQU07b0NBQzNDLElBQUksQ0FBQyxJQUFJLEdBQUcsUUFBUSxDQUFBO29DQUNwQixPQUFPLENBQUMsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztnQ0FDakMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRztvQ0FLbEIsRUFBRSxDQUFDLENBQUMsUUFBUSxJQUFJLFVBQVUsQ0FBQyxDQUFDLENBQUM7d0NBQ3pCLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsTUFBTTs0Q0FDckMsSUFBSSxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsa0NBQWtDLENBQUMsQ0FBQzs0Q0FFekQsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO2dEQUN2QixJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFBOzRDQUM1QixDQUFDOzRDQUdELElBQU0sT0FBTyxHQUFHLFdBQVcsQ0FBQztnREFDeEIsT0FBTyxDQUFDLEdBQUcsQ0FBQywrQkFBK0IsQ0FBQyxDQUFBO2dEQUM1QyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBQyxJQUFJO29EQUM5QixFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQzt3REFFM0MsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsTUFBTTs0REFDM0MsSUFBSSxDQUFDLElBQUksR0FBRyxRQUFRLENBQUE7NERBQ3BCLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQTs0REFDdEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQTs0REFFeEIsT0FBTyxDQUFDLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQzt3REFDbEQsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQUMsR0FBRzs0REFDVCxPQUFPLENBQUMsR0FBRyxDQUFDLDZCQUE2QixDQUFDLENBQUE7NERBQzFDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUE7d0RBQ3ZCLENBQUMsQ0FBQyxDQUFBO29EQUNOLENBQUM7b0RBQUMsSUFBSSxDQUFDLENBQUM7d0RBU0osRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDOzREQUN2QixPQUFPLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUE7d0RBQ25DLENBQUM7d0RBQUMsSUFBSSxDQUFDLENBQUM7NERBQ0osT0FBTyxDQUFDLEdBQUcsQ0FBQyxnREFBZ0QsQ0FBQyxDQUFBO3dEQUVqRSxDQUFDO29EQUNMLENBQUM7Z0RBQ0wsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQUMsR0FBRztvREFDVCxPQUFPLENBQUMsR0FBRyxDQUFDLDJCQUEyQixFQUFFLEdBQUcsQ0FBQyxDQUFBO2dEQUNqRCxDQUFDLENBQUMsQ0FBQTs0Q0FFTixDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUE7d0NBSWQsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRzs0Q0FDbEIsSUFBSSxDQUFDLEdBQUcsRUFBRSxPQUFPLEVBQUUsa0NBQWtDLENBQUMsQ0FBQzs0Q0FDdkQsTUFBTSxDQUFDLHFCQUFxQixDQUFDLENBQUE7NENBRTdCLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztnREFDdkIsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQTs0Q0FDNUIsQ0FBQzt3Q0FFTCxDQUFDLENBQUMsQ0FBQztvQ0FDUCxDQUFDO29DQUFDLElBQUksQ0FBQyxDQUFDO3dDQUdKLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQzs0Q0FDdkIsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQTt3Q0FDNUIsQ0FBQzt3Q0FBQyxJQUFJLENBQUMsQ0FBQzs0Q0FFSixPQUFPLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFBOzRDQUM1QixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUE7d0NBQzNCLENBQUM7b0NBSUwsQ0FBQztnQ0FDTCxDQUFDLENBQUMsQ0FBQzs0QkFDUCxDQUFDO3dCQUVMLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUc7NEJBRWxCLElBQUksQ0FBQyxTQUFTLEVBQUUsTUFBTSxFQUFFLFdBQVcsQ0FBQyxDQUFDOzRCQUVyQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7Z0NBRXZCLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUE7NEJBRTVCLENBQUM7NEJBQUMsSUFBSSxDQUFDLENBQUM7Z0NBQ0osT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQTtnQ0FDM0IsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFBOzRCQUN2QixDQUFDO3dCQUVMLENBQUMsQ0FBQyxDQUFDO29CQUlQLENBQUMsQ0FBQyxDQUFBO2dCQU1OLENBQUMsQ0FBQyxDQUFBO1lBUU4sQ0FBQztRQUdMLENBQUMsQ0FBQyxDQUFDO0lBQ1AsQ0FBQzs7SUFFRCw0QkFBUSxHQUFSLFVBQVMsS0FBWTtRQUNqQixJQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDO1FBQzdCLElBQU0sSUFBSSxHQUFHLElBQUksQ0FBQztRQUVsQixNQUFNLENBQUMsSUFBSSxPQUFPLENBQUMsVUFBVSxPQUFPLEVBQUUsTUFBTTtZQUN4QyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQztnQkFFbEMsSUFBTSxNQUFNLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQTtnQkFDdkIsRUFBRSxDQUFDLENBQUMsS0FBSyxJQUFJLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUM7b0JBRzdCLElBQUksQ0FBQyxXQUFXLENBQUM7d0JBQ2IsU0FBUyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsU0FBUzt3QkFDN0Isa0JBQWtCLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxrQkFBa0I7d0JBQ3BELE9BQU8sRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU87cUJBQ2pDLENBQUMsQ0FBQTtvQkFFRixJQUFJLE9BQU8sU0FBQSxDQUFDO29CQUNaLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQzt3QkFDckIsT0FBTyxHQUFHLElBQUksQ0FBQTtvQkFDbEIsQ0FBQztvQkFBQyxJQUFJLENBQUMsQ0FBQzt3QkFDSixPQUFPLEdBQUcsTUFBTSxDQUFBO29CQUNwQixDQUFDO29CQUVELE9BQU8sQ0FBQyxHQUFHLENBQUMsYUFBYSxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsU0FBUyxHQUFDLGFBQWEsR0FBQyxPQUFPLENBQUMsQ0FBQTtvQkFFckUsYUFBYSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsTUFBTTt3QkFDdEQsSUFBSSxDQUFDLElBQUksR0FBRyxNQUFNLENBQUM7d0JBQ25CLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztvQkFDcEIsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRzt3QkFDbEIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUNoQixDQUFDLENBQUMsQ0FBQztnQkFFUCxDQUFDO2dCQUFDLElBQUksQ0FBQyxDQUFDO29CQUNKLE1BQU0sQ0FBQyxxQkFBcUIsQ0FBQyxDQUFBO2dCQUNqQyxDQUFDO1lBRUwsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRztnQkFDbEIsTUFBTSxDQUFDLHFCQUFxQixHQUFHLEdBQUcsQ0FBQyxDQUFDO1lBQ3hDLENBQUMsQ0FBQyxDQUFDO1FBQ1AsQ0FBQyxDQUFDLENBQUM7SUFDUCxDQUFDOztJQUVMLGdCQUFDO0FBQUQsQ0E1bEJBLEFBNGxCQyxJQUFBO0FBNWxCRDsyQkE0bEJDLENBQUE7QUFBQSxDQUFDIiwiZmlsZSI6ImluZGV4LmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgUHJvbWlzZSBmcm9tIFwiYmx1ZWJpcmRcIjtcbmltcG9ydCAqIGFzIGZzIGZyb20gXCJmc1wiO1xuaW1wb3J0ICogYXMgY2hpbGRfcHJvY2VzcyBmcm9tIFwiY2hpbGRfcHJvY2Vzc1wiO1xuaW1wb3J0ICogYXMgXyBmcm9tIFwibG9kYXNoXCI7XG5pbXBvcnQgKiBhcyBhc3luYyBmcm9tIFwiYXN5bmNcIjtcbmltcG9ydCBQcm92aWRlcnMgPSByZXF1aXJlKFwibW9iaWxlLXByb3ZpZGVyc1wiKTtcbmltcG9ydCBXcGFtYW5hZ2VyIGZyb20gXCJ3cGFzdXBwbGljYW50LW1hbmFnZXJcIjtcbmltcG9ydCBob3N0YXBkc3dpdGNoIGZyb20gXCJob3N0YXBkX3N3aXRjaFwiO1xuaW1wb3J0IHRlc3RpbnRlcm5ldCBmcm9tIFwicHJvbWlzZS10ZXN0LWNvbm5lY3Rpb25cIjtcbmltcG9ydCBtZXJnZSBmcm9tIFwianNvbi1hZGRcIjtcbmltcG9ydCBXdmRpYWwgZnJvbSBcInd2ZGlhbGpzXCI7XG5cblxuXG5pbXBvcnQgbmV0dyBmcm9tIFwibmV0d1wiO1xuY29uc3QgdmVyYiA9IHJlcXVpcmUoXCJ2ZXJib1wiKTtcbmNvbnN0IGh3cmVzdGFydCA9IHJlcXVpcmUoXCJod3Jlc3RhcnRcIik7XG5cblxuaW50ZXJmYWNlIElXaWZpQ2xpZW50IHtcbiAgICBtYWM6IHN0cmluZztcbiAgICBzaWduYWw6IHN0cmluZztcbiAgICBzaWduYWxNaW4/OiBzdHJpbmc7XG4gICAgc2lnbmFsTWF4Pzogc3RyaW5nO1xuXG59XG5cbmludGVyZmFjZSBJUHJvdmlkZXIge1xuXG4gICAgbGFiZWw/OiBzdHJpbmc7XG4gICAgYXBuOiBzdHJpbmc7XG4gICAgcGhvbmU/OiBzdHJpbmdcbiAgICB1c2VybmFtZT86IHN0cmluZztcbiAgICBwYXNzd29yZD86IHN0cmluZztcblxufVxuXG5pbnRlcmZhY2UgSUdsb2JhbFByb3ZpZGVycyB7XG5cbiAgICBjb3VudHJ5OiBzdHJpbmc7XG4gICAgcHJvdmlkZXJzOiBJUHJvdmlkZXJbXTtcbn1cblxuXG50eXBlIEltb2RlID0gJ2FwJyB8ICdob3N0JyB8ICdjbGllbnQnIHwgJ3VubWFuYWdlZCcgfCAnd3YnIHwgJ2V0aGVybmV0J1xuXG5cbmludGVyZmFjZSBJU2NhbiB7XG4gICAgZXNzaWQ6IHN0cmluZztcbiAgICBtYWM6IHN0cmluZztcbiAgICBzaWduYWw6IHN0cmluZztcbn1cblxudHlwZSBJTmV0d29ya1R5cGUgPSAnd2lmaScgfCAnd2lyZWQnXG5cbmludGVyZmFjZSBJTmV0d29yayB7XG4gICAgdHlwZTogSU5ldHdvcmtUeXBlO1xuICAgIG1hYzogc3RyaW5nO1xuICAgIGludGVyZmFjZTogc3RyaW5nO1xuICAgIGVzc2lkPzogc3RyaW5nO1xuICAgIHNjYW4/OiBJU2NhbltdO1xuICAgIGlwPzogc3RyaW5nO1xuICAgIGdhdGV3YXk/OiBzdHJpbmc7XG59XG5cbmludGVyZmFjZSBDbGFzc09wdCB7XG4gICAgd2lmaV9pbnRlcmZhY2U/OiBzdHJpbmc7XG4gICAgbW9iaWxlPzogSU1vYmlsZTtcbiAgICBob3N0YXBkPzogSUhvc3RhcGRjZjtcbiAgICB3cGFzdXBwbGljYW50X3BhdGg/OiBzdHJpbmc7XG59XG5pbnRlcmZhY2UgSU1vYmlsZSB7XG4gICAgcHJvdmlkZXI6IElQcm92aWRlcjtcbiAgICBkZXZpY2U/OiBhbnk7XG4gICAgY29uZmlnRmlsZVBhdGg/OiBzdHJpbmc7XG5cbn1cblxuaW50ZXJmYWNlIElFdGhlcm5ldCB7XG4gICAgaW50ZXJmYWNlOiBzdHJpbmc7XG4gICAgZGhjcD86IHtcbiAgICAgICAgaXA/OiBzdHJpbmc7XG4gICAgICAgIGdhdGV3YXk/OiBzdHJpbmc7XG4gICAgICAgIG5ldG1hc2s/OiBzdHJpbmc7XG4gICAgICAgIGJjYXN0Pzogc3RyaW5nO1xuICAgIH1cbn1cblxuaW50ZXJmYWNlIElMaU5ldHdvcmtDb25mIHtcbiAgICB3aWZpX2ludGVyZmFjZTogc3RyaW5nO1xuICAgIG1vYmlsZT86IElNb2JpbGU7XG4gICAgaG9zdGFwZDogSUhvc3RhcGQ7XG4gICAgd3Bhc3VwcGxpY2FudF9wYXRoPzogc3RyaW5nO1xuICAgIGV0aGVybmV0PzogSUV0aGVybmV0W10sXG4gICAgcmVjb3Zlcnk6IGJvb2xlYW5cbn1cbmludGVyZmFjZSBJTGlOZXR3b3JrQ29uZlBhcmFtcyB7XG4gICAgd2lmaV9pbnRlcmZhY2U/OiBzdHJpbmc7XG4gICAgbW9iaWxlPzogSU1vYmlsZTtcbiAgICBob3N0YXBkPzogSUhvc3RhcGQ7XG4gICAgd3Bhc3VwcGxpY2FudF9wYXRoPzogc3RyaW5nO1xuICAgIGV0aGVybmV0Pzoge1xuICAgICAgICBpbnRlcmZhY2U6IHN0cmluZztcbiAgICAgICAgZGhjcD86IHtcbiAgICAgICAgICAgIGlwPzogc3RyaW5nO1xuICAgICAgICAgICAgZ2F0ZXdheT86IHN0cmluZztcbiAgICAgICAgICAgIG5ldG1hc2s/OiBzdHJpbmc7XG4gICAgICAgICAgICBiY2FzdD86IHN0cmluZztcbiAgICAgICAgfVxuICAgIH0sXG4gICAgcmVjb3Zlcnk/OiB0cnVlXG59XG5cbmludGVyZmFjZSBJSG9zdGFwZCB7XG4gICAgZHJpdmVyOiBzdHJpbmc7XG4gICAgc3NpZDogc3RyaW5nO1xuICAgIHdwYV9wYXNzcGhyYXNlOiBhbnk7XG59O1xuaW50ZXJmYWNlIElIb3N0YXBkY2Yge1xuICAgIGRyaXZlcj86IHN0cmluZztcbiAgICBzc2lkOiBzdHJpbmc7XG4gICAgd3BhX3Bhc3NwaHJhc2U6IGFueTtcbn07XG5cbmludGVyZmFjZSBJSG9zdGFwZENmIHtcbiAgICBkcml2ZXI/OiBzdHJpbmc7XG4gICAgc3NpZD86IHN0cmluZztcbiAgICB3cGFfcGFzc3BocmFzZT86IHN0cmluZztcbn07XG5cbmludGVyZmFjZSBJRG5zbWFzcSB7XG4gICAgaW50ZXJmYWNlOiBzdHJpbmc7XG59O1xuaW50ZXJmYWNlIElEbnNtYXNxQ2Yge1xuICAgIGludGVyZmFjZT86IHN0cmluZztcbn07XG5pbnRlcmZhY2UgSUhDb25mIHtcbiAgICBpbnRlcmZhY2U/OiBzdHJpbmc7XG4gICAgd3Bhc3VwcGxpY2FudF9wYXRoPzogc3RyaW5nO1xuICAgIGhvc3RhcGQ/OiBJSG9zdGFwZENmO1xuICAgIHJlZGlyZWN0PzogYm9vbGVhbjtcbiAgICBkbnNtYXNxPzogSURuc21hc3FDZjtcbn07XG5cbmludGVyZmFjZSBJQ29ubmVjdGlvbiB7XG5cbiAgICBsaW5rVHlwZTogc3RyaW5nO1xuICAgIGludGVyZmFjZTogc3RyaW5nO1xuICAgIGlwPzogc3RyaW5nO1xuICAgIGdhdGV3YXk/OiBzdHJpbmc7XG5cbn1cblxuaW50ZXJmYWNlIElJbml0IHtcbiAgICBjb25lY3Rpb246IGJvb2xlYW47XG4gICAgcmVjb3Zlcnk6IGJvb2xlYW47XG4gICAgZGV0YWlscz86IElDb25uZWN0aW9uO1xufVxuXG5cblxuXG5mdW5jdGlvbiBnZXR3aWZpaW50ZXJmYShzZXR0ZWQ/OiBzdHJpbmcpOiBQcm9taXNlPElOZXR3b3JrPiB7XG5cbiAgICByZXR1cm4gbmV3IFByb21pc2U8SU5ldHdvcms+KGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgbGV0IHdpZmlfZXhpc3Q6IGJvb2xlYW4gPSBmYWxzZTtcbiAgICAgICAgbGV0IGRldmk6IElOZXR3b3JrO1xuICAgICAgICBuZXR3KCkudGhlbihmdW5jdGlvbiAobmV0d29ya3MpIHtcblxuICAgICAgICAgICAgXy5tYXAobmV0d29ya3MsIGZ1bmN0aW9uIChkZXZpY2UpIHtcblxuICAgICAgICAgICAgICAgIGlmIChkZXZpY2UudHlwZSA9PT0gXCJ3aWZpXCIgJiYgIXdpZmlfZXhpc3QgJiYgKCFzZXR0ZWQgfHwgc2V0dGVkID09PSBcImF1dG9cIiB8fCBzZXR0ZWQgPT09IGRldmljZS5pbnRlcmZhY2UpKSB7XG4gICAgICAgICAgICAgICAgICAgIHdpZmlfZXhpc3QgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBkZXZpID0gZGV2aWNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBpZiAod2lmaV9leGlzdCkge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoZGV2aSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlamVjdCh7IGVycm9yOiBcImRldmljZSBub3QgZm91bmRlZFwiIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICB9KTtcblxuICAgIH0pO1xuXG59XG5cblxuZnVuY3Rpb24gcmVjb3ZlcnlfbW9kZShhcHN3aXRjaDogaG9zdGFwZHN3aXRjaCwgbW9kZT86IEltb2RlKTogUHJvbWlzZTxJbW9kZT4ge1xuXG5cbiAgICByZXR1cm4gbmV3IFByb21pc2U8SW1vZGU+KGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgaWYgKCFtb2RlIHx8IG1vZGUgPT09ICdob3N0Jykge1xuICAgICAgICAgICAgYXBzd2l0Y2guaG9zdCgpLnRoZW4oZnVuY3Rpb24gKGFuc3dlcikge1xuICAgICAgICAgICAgICAgIHZlcmIoYW5zd2VyLCBcIndhcm5cIiwgXCJsaW5ldHdvcmsgcmVjb3ZlcnkgbW9kZSBcIik7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSgnaG9zdCcpO1xuICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgIHZlcmIoZXJyLCBcImVycm9yXCIsIFwibGluZXR3b3JrIHJlY292ZXJ5IG1vZGUgZmFpbGVkXCIpO1xuICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSBpZiAobW9kZSA9PT0gJ2FwJykge1xuICAgICAgICAgICAgYXBzd2l0Y2guYXAoKS50aGVuKGZ1bmN0aW9uIChhbnN3ZXIpIHtcbiAgICAgICAgICAgICAgICB2ZXJiKGFuc3dlciwgXCJ3YXJuXCIsIFwibGluZXR3b3JrIHJlY292ZXJ5IG1vZGUgXCIpO1xuICAgICAgICAgICAgICAgIHJlc29sdmUoJ2hvc3QnKTtcbiAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICB2ZXJiKGVyciwgXCJlcnJvclwiLCBcImxpbmV0d29yayByZWNvdmVyeSBtb2RlIGZhaWxlZFwiKTtcbiAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICB9KTtcbn1cblxuXG5mdW5jdGlvbiByZWNvdmVyeWNoZWNrKGNvbmZpZzogSUxpTmV0d29ya0NvbmYpOiBQcm9taXNlPHsgZGV2aWNlOiBJTmV0d29yaywga25vd25fbmV0d29ya3M6IGJvb2xlYW4gfT4ge1xuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlPHsgZGV2aWNlOiBJTmV0d29yaywga25vd25fbmV0d29ya3M6IGJvb2xlYW4gfT4oZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuXG4gICAgICAgIGxldCBzb21lbmV0d29ya19leGlzdHM6IGJvb2xlYW4gPSBmYWxzZTtcbiAgICAgICAgbGV0IHdsYW5fZXhpc3RzOiBib29sZWFuID0gZmFsc2U7XG5cbiAgICAgICAgbGV0IGRldmk6IElOZXR3b3JrO1xuXG4gICAgICAgIG5ldHcoKS50aGVuKGZ1bmN0aW9uIChuZXR3b3Jrcykge1xuXG4gICAgICAgICAgICBfLm1hcChuZXR3b3JrcywgZnVuY3Rpb24gKGRldmljZSkge1xuXG4gICAgICAgICAgICAgICAgaWYgKGRldmljZS5zY2FuICYmIGRldmljZS50eXBlID09PSBcIndpZmlcIiAmJiAhc29tZW5ldHdvcmtfZXhpc3RzICYmICghY29uZmlnLndpZmlfaW50ZXJmYWNlIHx8IGNvbmZpZy53aWZpX2ludGVyZmFjZSA9PT0gXCJhdXRvXCIgfHwgY29uZmlnLndpZmlfaW50ZXJmYWNlID09PSBkZXZpY2UuaW50ZXJmYWNlKSkge1xuXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IFdNID0gbmV3IFdwYW1hbmFnZXIoY29uZmlnLndwYXN1cHBsaWNhbnRfcGF0aClcblxuICAgICAgICAgICAgICAgICAgICBfLm1hcChkZXZpY2Uuc2NhbiwgZnVuY3Rpb24gKG5ldHNjYW46IElTY2FuKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIF8ubWFwKFdNLmxpc3R3cGEsIGZ1bmN0aW9uICh3cGFpdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHdwYWl0ZW0uc3NpZCA9PT0gbmV0c2Nhbi5lc3NpZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzb21lbmV0d29ya19leGlzdHMgPSB0cnVlO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKCF3bGFuX2V4aXN0cyAmJiBkZXZpY2UudHlwZSA9PT0gXCJ3aWZpXCIgJiYgKCFjb25maWcud2lmaV9pbnRlcmZhY2UgfHwgY29uZmlnLndpZmlfaW50ZXJmYWNlID09PSBcImF1dG9cIiB8fCBjb25maWcud2lmaV9pbnRlcmZhY2UgPT09IGRldmljZS5pbnRlcmZhY2UpKSB7XG4gICAgICAgICAgICAgICAgICAgIHdsYW5fZXhpc3RzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgZGV2aSA9IGRldmljZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgaWYgKCFzb21lbmV0d29ya19leGlzdHMgJiYgd2xhbl9leGlzdHMpIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHsgZGV2aWNlOiBkZXZpLCBrbm93bl9uZXR3b3JrczogZmFsc2UgfSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHdsYW5fZXhpc3RzKSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7IGRldmljZTogZGV2aSwga25vd25fbmV0d29ya3M6IHRydWUgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlamVjdCgnbm8gaW50ZXJmYWNlJylcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICByZWplY3QoeyBlcnJvcjogZXJyLCBkZXNjcmlwdGlvbjogJ25ldHcgZXJyJyB9KTtcbiAgICAgICAgfSk7XG5cbiAgICB9KTtcblxuXG59XG5cblxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBMaU5ldHdvcmsge1xuICAgIGxpY29uZmlnOiBJTGlOZXR3b3JrQ29uZjtcbiAgICBob3N0YXBkOiBob3N0YXBkc3dpdGNoO1xuICAgIG1vYmlsZTogV3ZkaWFsO1xuICAgIG1vZGU6IEltb2RlO1xuICAgIGlzQ29ubmVjdGVkOiBib29sZWFuO1xuXG5cbiAgICBjb25zdHJ1Y3RvcihkYXRhOiBJTGlOZXR3b3JrQ29uZlBhcmFtcykge1xuXG5cbiAgICAgICAgY29uc3QgY29uZmlnOiBJTGlOZXR3b3JrQ29uZiA9IHtcbiAgICAgICAgICAgIGhvc3RhcGQ6IHtcbiAgICAgICAgICAgICAgICBkcml2ZXI6IFwibmw4MDIxMVwiLFxuICAgICAgICAgICAgICAgIHNzaWQ6IFwidGVzdHR0YXBcIixcbiAgICAgICAgICAgICAgICB3cGFfcGFzc3BocmFzZTogXCJ0ZXN0cGFzc1wiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgd2lmaV9pbnRlcmZhY2U6IFwiYXV0b1wiLFxuICAgICAgICAgICAgd3Bhc3VwcGxpY2FudF9wYXRoOiBcIi9ldGMvd3BhX3N1cHBsaWNhbnQvd3BhX3N1cHBsaWNhbnQuY29uZlwiLFxuICAgICAgICAgICAgZXRoZXJuZXQ6IFt7XG4gICAgICAgICAgICAgICAgaW50ZXJmYWNlOiAnZXRoMCdcbiAgICAgICAgICAgIH1dLFxuICAgICAgICAgICAgcmVjb3Zlcnk6IHRydWVcbiAgICAgICAgfTtcblxuICAgICAgICBtZXJnZShjb25maWcsIGRhdGEpOyAvLyBjb21iaW5lIGRlZmF1bHQgc2V0dGluZ3Mgd2l0aCBuZXcgcGFyYW1ldGVycyBmcm9tIGRhdGFcbiAgICAgICAgdGhpcy5tb2RlID0gJ3VubWFuYWdlZCdcblxuICAgICAgICB0aGlzLmxpY29uZmlnID0gY29uZmlnO1xuXG5cbiAgICAgICAgaWYgKHRoaXMubGljb25maWcubW9iaWxlKSB7XG4gICAgICAgICAgICBpZiAoIXRoaXMubGljb25maWcubW9iaWxlLmNvbmZpZ0ZpbGVQYXRoKSB0aGlzLmxpY29uZmlnLm1vYmlsZS5jb25maWdGaWxlUGF0aCA9IFwiL2V0Yy93dmRpYWwuY29uZlwiO1xuXG4gICAgICAgICAgICB0aGlzLm1vYmlsZSA9IG5ldyBXdmRpYWwodGhpcy5saWNvbmZpZy5tb2JpbGUpXG4gICAgICAgIH1cblxuXG4gICAgfVxuXG5cblxuICAgIGV0aGVybmV0Y29ubmVjdChkZXZpY2VuYW1lPzogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgICAgIGNvbnN0IHRoYXQgPSB0aGlzXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTxib29sZWFuPihmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICBpZiAodGhhdC5saWNvbmZpZy5ldGhlcm5ldCkge1xuXG4gICAgICAgICAgICAgICAgY29uc3QgY29ubmVjdGlvbmRldmljZXNhcnJheTogSU5ldHdvcmtbXSA9IFtdO1xuXG4gICAgICAgICAgICAgICAgbGV0IGRldmljZWV4aXN0czogYm9vbGVhbiA9IGZhbHNlXG4gICAgICAgICAgICAgICAgbGV0IGRldmljZTogSU5ldHdvcms7XG4gICAgICAgICAgICAgICAgLy8gY2hlZWNrIGNvbmZpZ3VyYXRpb25cbiAgICAgICAgICAgICAgICBuZXR3KCkudGhlbigoYSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBfLm1hcChhLCAobmV0KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBfLm1hcCh0aGF0LmxpY29uZmlnLmV0aGVybmV0LCAobmV0aW50ZXJmYWNlY29uZmlndXJlZCkgPT4ge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5ldC50eXBlID09PSAnd2lyZWQnICYmICgoIWRldmljZW5hbWUgJiYgbmV0LmludGVyZmFjZSA9PT0gbmV0aW50ZXJmYWNlY29uZmlndXJlZC5pbnRlcmZhY2UpIHx8IGRldmljZW5hbWUgPT09IG5ldC5pbnRlcmZhY2UpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRldmljZWV4aXN0cyA9IHRydWVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGV2aWNlID0gbmV0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbm5lY3Rpb25kZXZpY2VzYXJyYXkucHVzaChuZXQpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICAgICAgICAgIGlmIChkZXZpY2VleGlzdHMpIHtcblxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGNvbm5lY3RlZDogYm9vbGVhbiA9IGZhbHNlO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBhc3luYy5lYWNoU2VyaWVzKGNvbm5lY3Rpb25kZXZpY2VzYXJyYXksIChkZXZpY2UsIGNiKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFjb25uZWN0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hpbGRfcHJvY2Vzcy5leGVjKCdpZmNvbmZpZyAnICsgZGV2aWNlLmludGVyZmFjZSArICcgZG93biAmJiBpZmNvbmZpZyAnICsgZGV2aWNlLmludGVyZmFjZSArICcgdXAnLCAoZXJyLCBzdGRvdXQsIHN0ZGVycikgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNiKClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC50ZXN0aW50ZXJuZXQoKS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29ubmVjdGVkID0gdHJ1ZVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNiKClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2IoKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgfSwgKGVycikgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghY29ubmVjdGVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdCgnbm8gY29ubmVjdGlvbiBieSBhIGV0aGVybmV0IGRldmljZScpXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHRydWUpXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gbmVlZCBhc3luYyB0byBwcm9jZXNzIGV2ZXJ5b25lXG5cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdCgnbm8gZXRoZXJuZXQgZGV2aWNlJylcbiAgICAgICAgICAgICAgICAgICAgfVxuXG5cbiAgICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICAgICAgLy8gY2hlY2sgaWYgaXQgaXMganVzdCBjb25uZWN0ZWQgYnkgZXRoMFxuICAgICAgICAgICAgICAgIC8vIGlmIGlzIGNvbm5lY3RlZCBhbGwgb2suXG4gICAgICAgICAgICAgICAgLy8gZWxzZSB0aGF0LmV0aGVybmV0cmVjb25uZWN0KGRldmljZSlcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KCdpbnZhbGlkIGV0aGVybmV0IGNvbmYnKVxuXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG5cbiAgICB9XG5cbiAgICBldGhlcm5ldHJlY29ubmVjdChkZXZpY2U/OiBhbnkpIHtcbiAgICAgICAgY29uc3QgdGhhdCA9IHRoaXNcblxuICAgIH1cblxuICAgIG1vYmlsZWNvbm5lY3QocmVzZXQ/OiB0cnVlKSB7XG4gICAgICAgIGNvbnN0IHRoYXQgPSB0aGlzXG4gICAgICAgIHRoYXQubW9iaWxlLmNvbmZpZ3VyZShyZXNldCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGF0Lm1vZGUgPSBcInd2XCI7XG4gICAgICAgICAgICB0aGF0Lm1vYmlsZS5jb25uZWN0KHRydWUpLnRoZW4oZnVuY3Rpb24gKGEpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhhKVxuICAgICAgICAgICAgICAgIGh3cmVzdGFydChcInVucGx1Z1wiKVxuXG5cbiAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZSlcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIm1vZGVtIGVycm9yXCIpXG5cbiAgICAgICAgICAgICAgICBod3Jlc3RhcnQoXCJ1bnBsdWdcIilcblxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhlKVxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJtb2RlbSBlcnJvclwiKVxuXG4gICAgICAgICAgICBod3Jlc3RhcnQoXCJ1bnBsdWdcIilcblxuICAgICAgICB9KTtcbiAgICB9O1xuICAgIHdpZmlhdmFpbGFibGVzKCk6IFByb21pc2U8SVNjYW5bXT4ge1xuICAgICAgICBjb25zdCB0aGF0ID0gdGhpcztcblxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8SVNjYW5bXT4oZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgICAgY29uc3QgYXZhaWxhYmxlbmV0cyA9IFtdXG4gICAgICAgICAgICB0aGF0Lm5ldHdvcmtzKCkudGhlbigobmV0cykgPT4ge1xuICAgICAgICAgICAgICAgIF8ubWFwKG5ldHMsIChuZXQpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5ldC50eXBlID09PSBcIndpZmlcIiAmJiBuZXQuc2Nhbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgXy5tYXAobmV0LnNjYW4sIChzY2FubmVkb25lKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXZhaWxhYmxlbmV0cy5wdXNoKHNjYW5uZWRvbmUpXG4gICAgICAgICAgICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgcmVzb2x2ZShhdmFpbGFibGVuZXRzKVxuXG4gICAgICAgICAgICB9KS5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KGVycilcbiAgICAgICAgICAgIH0pXG5cblxuICAgICAgICB9KVxuXG4gICAgfVxuXG4gICAgd2lmaWNvbm5lY3RhYmxlcygpOiBQcm9taXNlPElTY2FuW10+IHtcbiAgICAgICAgY29uc3QgdGhhdCA9IHRoaXM7XG5cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPElTY2FuW10+KGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgIGNvbnN0IGNvbm5lY3RhYmxlcyA9IFtdXG4gICAgICAgICAgICBjb25zdCBXTSA9IHRoYXQud3BhbWFuYWdlcigpXG5cbiAgICAgICAgICAgIHRoYXQud2lmaWF2YWlsYWJsZXMoKS50aGVuKChzY2FucykgPT4ge1xuICAgICAgICAgICAgICAgIF8ubWFwKHNjYW5zLCAoc2Nhbm5lZG9uZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBfLm1hcChXTS5saXN0d3BhLCAod3BhKSA9PiB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh3cGEuc3NpZCA9PT0gc2Nhbm5lZG9uZS5lc3NpZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbm5lY3RhYmxlcy5wdXNoKHNjYW5uZWRvbmUpXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pXG5cbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIHJlc29sdmUoY29ubmVjdGFibGVzKVxuICAgICAgICAgICAgfSkuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICAgICAgICAgIHJlamVjdChlcnIpXG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuXG4gICAgfVxuXG5cblxuICAgIG5ldHdvcmtzKCk6IFByb21pc2U8SU5ldHdvcmtbXT4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8SU5ldHdvcmtbXT4oZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuXG4gICAgICAgICAgICBuZXR3KCkudGhlbihmdW5jdGlvbiAoYSkge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoYSlcbiAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICByZWplY3QoZXJyKVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICB9XG4gICAgbmV0d29yayhkZXZpY2VuYW1lOiBzdHJpbmcpOiBQcm9taXNlPElOZXR3b3JrPiB7XG4gICAgICAgIGNvbnN0IHRoYXQgPSB0aGlzO1xuICAgICAgICBsZXQgbmV0ZXhpc3RzOiBib29sZWFuID0gZmFsc2VcbiAgICAgICAgbGV0IG5ldHdvcmtpbnRlcmZhY2U6IElOZXR3b3JrO1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8SU5ldHdvcms+KGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcblxuICAgICAgICAgICAgdGhhdC5uZXR3b3JrcygpLnRoZW4oZnVuY3Rpb24gKGEpIHtcbiAgICAgICAgICAgICAgICBfLm1hcChhLCAobmV0KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghbmV0ZXhpc3RzICYmIG5ldC5pbnRlcmZhY2UgPT09IGRldmljZW5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ldGV4aXN0cyA9IHRydWVcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ldHdvcmtpbnRlcmZhY2UgPSBuZXRcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgaWYgKG5ldGV4aXN0cykge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKG5ldHdvcmtpbnRlcmZhY2UpXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KCdubyBuZXR3b3JrJylcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KGVycilcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgdGVzdGludGVybmV0KCkge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuXG4gICAgICAgICAgICB0ZXN0aW50ZXJuZXQoKS50aGVuKGZ1bmN0aW9uIChhKSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShhKVxuICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgIHJlamVjdChlcnIpXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgaG9zdGFwZGNvbmYoaGNvbmZpZzogSUhDb25mKSB7IC8vIHJlY29uZiBpcyBleHBlcmltZW50YWxcbiAgICAgICAgY29uc3QgdGhhdCA9IHRoaXNcbiAgICAgICAgaWYgKCFoY29uZmlnKSB7XG4gICAgICAgICAgICB0aHJvdyBFcnJvcignbm8gY29uZmlnIHByb3ZpZGVkIHRvIGNvbmZpZ3VyZSBob3N0YXBkY29uZicpXG5cblxuICAgICAgICB9IGVsc2Uge1xuXG4gICAgICAgICAgICB0aGF0Lmhvc3RhcGQgPSBuZXcgaG9zdGFwZHN3aXRjaChoY29uZmlnLCB0cnVlKTtcblxuXG4gICAgICAgIH1cblxuICAgIH1cblxuICAgIHdwYW1hbmFnZXIoKSB7XG4gICAgICAgIGNvbnN0IHBhdGggPSB0aGlzLmxpY29uZmlnLndwYXN1cHBsaWNhbnRfcGF0aDtcbiAgICAgICAgcmV0dXJuIG5ldyBXcGFtYW5hZ2VyKHRoaXMubGljb25maWcud3Bhc3VwcGxpY2FudF9wYXRoKTtcbiAgICB9XG5cblxuICAgIG1vYmlsZXByb3ZpZGVycygpIHtcblxuICAgICAgICByZXR1cm4gbmV3IFByb3ZpZGVycygpXG5cbiAgICB9XG5cbiAgICB3aWZpX3N3aXRjaChtb2RlOiBzdHJpbmcsIGRldj86IHN0cmluZykge1xuICAgICAgICBjb25zb2xlLmxvZyhtb2RlLCBkZXYpO1xuICAgICAgICBjb25zdCB0aGF0ID0gdGhpcztcbiAgICAgICAgY29uc3QgY29uZmlnID0gdGhhdC5saWNvbmZpZztcblxuICAgICAgICBpZiAoZGV2IHx8IHRoaXMubGljb25maWcud2lmaV9pbnRlcmZhY2UgIT09IFwiYXV0b1wiKSB7XG5cbiAgICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTxib29sZWFuPihmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG5cblxuICAgICAgICAgICAgICAgIGlmICghZGV2KSB7XG4gICAgICAgICAgICAgICAgICAgIGRldiA9IGNvbmZpZy53aWZpX2ludGVyZmFjZTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImRldiBtb2RlXCIpO1xuICAgICAgICAgICAgICAgIHRoYXQuaG9zdGFwZGNvbmYoe1xuICAgICAgICAgICAgICAgICAgICBpbnRlcmZhY2U6IGRldixcbiAgICAgICAgICAgICAgICAgICAgd3Bhc3VwcGxpY2FudF9wYXRoOiBjb25maWcud3Bhc3VwcGxpY2FudF9wYXRoLFxuICAgICAgICAgICAgICAgICAgICBob3N0YXBkOiBjb25maWcuaG9zdGFwZFxuICAgICAgICAgICAgICAgIH0pXG5cbiAgICAgICAgICAgICAgICBzd2l0Y2ggKG1vZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcImFwXCI6XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lmhvc3RhcGQuYXAoKS50aGVuKGZ1bmN0aW9uIChhbnN3ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lm1vZGUgPSAnYXAnXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcImhvc3RcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuaG9zdGFwZC5ob3N0KCkudGhlbihmdW5jdGlvbiAoYW5zd2VyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5tb2RlID0gJ2hvc3QnXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcImNsaWVudFwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5ob3N0YXBkLmNsaWVudCgpLnRoZW4oZnVuY3Rpb24gKGFuc3dlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQubW9kZSA9ICdjbGllbnQnXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJhdXRvIG1vZGVcIik7XG4gICAgICAgICAgICBjb25zdCBjb25maWcgPSB0aGlzLmxpY29uZmlnO1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgICAgICBuZXR3KCkudGhlbihmdW5jdGlvbiAobmV0d29ya3MpIHtcblxuICAgICAgICAgICAgICAgICAgICBfLm1hcChuZXR3b3JrcywgZnVuY3Rpb24gKGRldmljZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRldmljZS50eXBlID09PSBcIndpZmlcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRldiA9IGRldmljZS5pbnRlcmZhY2U7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZGV2KSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuaG9zdGFwZGNvbmYoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGludGVyZmFjZTogZGV2LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhvc3RhcGQ6IGNvbmZpZy5ob3N0YXBkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdwYXN1cHBsaWNhbnRfcGF0aDogY29uZmlnLndwYXN1cHBsaWNhbnRfcGF0aFxuICAgICAgICAgICAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2codGhhdC5ob3N0YXBkKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgc3dpdGNoIChtb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBcImFwXCI6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuaG9zdGFwZC5hcCgpLnRoZW4oZnVuY3Rpb24gKGFuc3dlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5tb2RlID0gJ2FwJ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgXCJob3N0XCI6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuaG9zdGFwZC5ob3N0KCkudGhlbihmdW5jdGlvbiAoYW5zd2VyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lm1vZGUgPSAnaG9zdCdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFwiY2xpZW50XCI6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuaG9zdGFwZC5jbGllbnQoKS50aGVuKGZ1bmN0aW9uIChhbnN3ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQubW9kZSA9ICdjbGllbnQnXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoeyBlcnJvcjogXCJubyBkZXZcIiB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG5cblxuICAgIGxpc3R3aWZpY2xpZW50cygpOiBQcm9taXNlPElXaWZpQ2xpZW50W10+IHtcbiAgICAgICAgY29uc3QgdGhhdCA9IHRoaXNcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPElXaWZpQ2xpZW50W10+KGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcblxuICAgICAgICAgICAgdGhhdC5ob3N0YXBkLmxpc3R3aWZpY2xpZW50cygpLnRoZW4oKGEpID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKGEpXG4gICAgICAgICAgICB9KS5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKVxuICAgICAgICAgICAgICAgIHJlamVjdChlcnIpXG4gICAgICAgICAgICB9KVxuXG4gICAgICAgIH0pXG4gICAgfVxuXG5cbiAgICBjb25uZWN0aW9uKCkge1xuICAgICAgICBjb25zdCB0aGF0ID0gdGhpcztcbiAgICAgICAgY29uc3QgcmVjb3ZlcnkgPSB0aGF0LmxpY29uZmlnLnJlY292ZXJ5XG5cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgIHZlcmIodGhhdC5saWNvbmZpZywgXCJkZWJ1Z1wiLCBcIlRyeW5nIHRvIGNvbm5lY3RcIik7XG5cbiAgICAgICAgICAgIGlmICh0aGF0Lm1vZGUgPT09IFwid3ZcIikge1xuICAgICAgICAgICAgICAgIHJlamVjdChcImF1dG8gbW9kZVwiKVxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwid3YgcnVubmluZywgbm90aGluZyB0byBkb1wiKVxuICAgICAgICAgICAgfSBlbHNlIHtcblxuXG4gICAgICAgICAgICAgICAgdGhhdC50ZXN0aW50ZXJuZXQoKS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKVxuICAgICAgICAgICAgICAgIH0pLmNhdGNoKChlcnIpID0+IHtcblxuXG4gICAgICAgICAgICAgICAgICAgIHRoYXQuZXRoZXJuZXRjb25uZWN0KCkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnY29ubmVjdGVkIGJ5IGV0aGVybmV0JylcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSlcblxuICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaCgoKSA9PiB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGdldHdpZmlpbnRlcmZhKHRoYXQubGljb25maWcud2lmaV9pbnRlcmZhY2UpLnRoZW4oZnVuY3Rpb24gKGludGVyZikge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgd2lmaV9leGlzdDogc3RyaW5nID0gaW50ZXJmLmludGVyZmFjZTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbmZoYXBkcyA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW50ZXJmYWNlOiB3aWZpX2V4aXN0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3cGFzdXBwbGljYW50X3BhdGg6IHRoYXQubGljb25maWcud3Bhc3VwcGxpY2FudF9wYXRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBob3N0YXBkOiB0aGF0LmxpY29uZmlnLmhvc3RhcGRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHdpZmlfZXhpc3QpIHtcblxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZlcmIod2lmaV9leGlzdCwgXCJpbmZvXCIsIFwiV2xhbiBpbnRlcmZhY2UgZm91bmRlZFwiKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lmhvc3RhcGRjb25mKGNvbmZoYXBkcylcblxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuaG9zdGFwZC5jbGllbnQodHJ1ZSkudGhlbihmdW5jdGlvbiAoYW5zd2VyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lm1vZGUgPSAnY2xpZW50J1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7IGNvbmVjdGlvbjogdHJ1ZSB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuXG5cblxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVjb3ZlcnkgJiYgd2lmaV9leGlzdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQucmVjb3ZlcnkodHJ1ZSkudGhlbihmdW5jdGlvbiAoYW5zd2VyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZlcmIoYW5zd2VyLCBcImluZm9cIiwgXCJMSU5FVFdPUktJTkcgcmVjb3ZlcnkgbW9kZSBzdGFydFwiKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhhdC5saWNvbmZpZy5tb2JpbGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQubW9iaWxlY29ubmVjdCh0cnVlKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzY2FubmV0ID0gc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2NoZWNrIGZvciBhdmFpbGFibGVzIG5ldHdvcmtzJylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQud2lmaWNvbm5lY3RhYmxlcygpLnRoZW4oKG5ldHMpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobmV0cy5sZW5ndGggPiAwICYmICF0aGF0LmxpY29uZmlnLm1vYmlsZSkge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuaG9zdGFwZC5jbGllbnQodHJ1ZSkudGhlbihmdW5jdGlvbiAoYW5zd2VyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lm1vZGUgPSAnY2xpZW50J1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xlYXJJbnRlcnZhbChzY2FubmV0KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2Nvbm5lY3RlZCcpXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoeyBjb25lY3Rpb246IHRydWUsIHJlY292ZXJ5OiBmYWxzZSB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ25vIHdvcmtpbmcgbmV0d29ya3MgZm9yIG5vdycpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnJlY292ZXJ5KHRydWUpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gICB0aGF0Lmhvc3RhcGQubGlzdHdpZmljbGllbnRzKCkudGhlbigoYSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgICBpZiAoYS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gICAgICAgICAgIHRoYXQucmVjb3ZlcnkodHJ1ZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAgIH0pLmNhdGNoKChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gICAgICAgY29uc29sZS5sb2coJ2xpc3Qga25vd24gbmV0d29ya3MgZXJyb3InLCBlcnIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgICAgIGNvbnNvbGUubG9nKGVycilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhhdC5saWNvbmZpZy5tb2JpbGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzdGF5bmcgb24gbW9iaWxlJylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdubyBrbndvd24gd2xhbiBhdmFpbGFibGUsIHdhaXRpbmcgZm9yIG5ldHdvcmtzJylcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdsaXN0IGtub3duIG5ldHdvcmtzIGVycm9yJywgZXJyKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LCAxMjAwMDApXG5cblxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2ZXJiKGVyciwgXCJlcnJvclwiLCBcIkxJTkVUV09SS0lORyByZWNvdmVyeSBtb2RlIGVycm9yXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoJ3JlY292ZXJ5IG1vZGUgZXJyb3InKVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGF0LmxpY29uZmlnLm1vYmlsZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5tb2JpbGVjb25uZWN0KHRydWUpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcblxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoYXQubGljb25maWcubW9iaWxlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQubW9iaWxlY29ubmVjdCh0cnVlKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ25vdCBjb25uZWN0ZWQnKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoJ25vdCBjb25uZWN0ZWQnKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2ZXJiKFwibm8gd2lmaVwiLCBcIndhcm5cIiwgXCJuZXR3b3JrZXJcIik7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhhdC5saWNvbmZpZy5tb2JpbGUpIHtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lm1vYmlsZWNvbm5lY3QodHJ1ZSlcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwibm8gd2lmaSEhPz8/XCIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGh3cmVzdGFydChcInVucGx1Z1wiKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cblxuXG4gICAgICAgICAgICAgICAgICAgIH0pXG5cblxuXG5cblxuICAgICAgICAgICAgICAgIH0pXG5cblxuXG5cblxuXG5cbiAgICAgICAgICAgIH1cblxuXG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICByZWNvdmVyeShmb3JjZT86IHRydWUpIHtcbiAgICAgICAgY29uc3QgY29uZmlnID0gdGhpcy5saWNvbmZpZztcbiAgICAgICAgY29uc3QgdGhhdCA9IHRoaXM7XG5cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgIHJlY292ZXJ5Y2hlY2soY29uZmlnKS50aGVuKGZ1bmN0aW9uIChhKSB7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBpbnRlcmYgPSBhLmRldmljZVxuICAgICAgICAgICAgICAgIGlmIChmb3JjZSB8fCAhYS5rbm93bl9uZXR3b3Jrcykge1xuXG5cbiAgICAgICAgICAgICAgICAgICAgdGhhdC5ob3N0YXBkY29uZih7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbnRlcmZhY2U6IGEuZGV2aWNlLmludGVyZmFjZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHdwYXN1cHBsaWNhbnRfcGF0aDogdGhhdC5saWNvbmZpZy53cGFzdXBwbGljYW50X3BhdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICBob3N0YXBkOiB0aGF0LmxpY29uZmlnLmhvc3RhcGRcbiAgICAgICAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgICAgICAgICBsZXQgdGhlbW9kZTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoYXQubW9kZSA9PT0gJ3d2Jykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhlbW9kZSA9ICdhcCdcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoZW1vZGUgPSAnaG9zdCdcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdyZWNvdmVyeW5nICcgKyBhLmRldmljZS5pbnRlcmZhY2UrJyB3aXRoIG1vZGUgJyt0aGVtb2RlKVxuXG4gICAgICAgICAgICAgICAgICAgIHJlY292ZXJ5X21vZGUodGhhdC5ob3N0YXBkLCB0aGVtb2RlKS50aGVuKGZ1bmN0aW9uIChhbnN3ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQubW9kZSA9IGFuc3dlcjtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoYW5zd2VyKTtcbiAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KCd0cnkgY2xpZW50IG9yIGZvcmNlJylcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICByZWplY3QoJ3JlY292ZXJ5Y2hlY2sgZXJyb3InICsgZXJyKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG59O1xuXG5cblxuXG5cblxuIl19
