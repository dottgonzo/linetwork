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
function recovery_mode(apswitch) {
    return new Promise(function (resolve, reject) {
        apswitch.host().then(function (answer) {
            verb(answer, "warn", "linetwork recovery mode ");
            resolve('host');
        }).catch(function (err) {
            verb(err, "error", "linetwork recovery mode failed");
            reject(err);
        });
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
            recovery: false
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
                                child_process.exec('ifconfig ' + device.interface + ' down && ifconfig ' + device.interface + ' up && dhclient ' + device.interface, function (err, stdout, stderr) {
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
    LiNetwork.prototype.mobileconnect = function (bool) {
        var that = this;
        var Wv = that.mobile;
        return new Promise(function (resolve, reject) {
            Wv.configure(bool).then(function () {
                Wv.connect(true).then(function () {
                    that.mode = 'wv';
                    console.log("modem started");
                }).catch(function (err) {
                    console.log("modem error");
                    reject(err);
                });
            });
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
                                    resolve({ conection: true, recovery: false });
                                }).catch(function (err) {
                                    if (that.liconfig.mobile) {
                                        that.mobile.configure().then(function () {
                                            that.mode = "wv";
                                            console.log("modem started");
                                            that.mobile.connect(true).then(function (a) {
                                                hwrestart("unplug");
                                            }).catch(function () {
                                                console.log("modem error");
                                                hwrestart("unplug");
                                            });
                                        }).catch(function (e) {
                                            console.log(e);
                                            console.log("modem error");
                                            hwrestart("unplug");
                                        });
                                    }
                                    if (recovery && wifi_exist) {
                                        that.recovery(true).then(function (answer) {
                                            verb(answer, "info", "LINETWORKING recovery mode start");
                                            if (!that.liconfig.mobile) {
                                                var scannet_1 = setInterval(function () {
                                                    console.log('check for availables networks');
                                                    that.wificonnectables().then(function (nets) {
                                                        if (nets.length > 0) {
                                                            that.hostapd.client(true).then(function (answer) {
                                                                that.mode = 'client';
                                                                clearInterval(scannet_1);
                                                                console.log('connected');
                                                                resolve({ conection: true, recovery: false });
                                                            }).catch(function (err) {
                                                                console.log('no working networks for now');
                                                                that.recovery(true);
                                                            });
                                                        }
                                                        else {
                                                            console.log('no knwown wlan available, waiting for networks');
                                                        }
                                                    }).catch(function (err) {
                                                        console.log(err);
                                                    });
                                                }, 90000);
                                            }
                                        }).catch(function (err) {
                                            verb(err, "error", "LINETWORKING recovery mode error");
                                            reject('recovery mode error');
                                        });
                                    }
                                    else {
                                        console.log('not connected');
                                        reject('not connected');
                                    }
                                });
                            }
                        }).catch(function (err) {
                            verb("no wifi", "warn", "networker");
                            if (that.liconfig.mobile) {
                                that.mobile.configure().then(function () {
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
                    console.log('recoveryng ' + a.device.interface);
                    that.hostapdconf({
                        interface: a.device.interface,
                        wpasupplicant_path: that.liconfig.wpasupplicant_path,
                        hostapd: that.liconfig.hostapd
                    });
                    recovery_mode(that.hostapd).then(function (answer) {
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
                reject(err);
            });
        });
    };
    ;
    return LiNetwork;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = LiNetwork;
;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxJQUFZLE9BQU8sV0FBTSxVQUFVLENBQUMsQ0FBQTtBQUVwQyxJQUFZLGFBQWEsV0FBTSxlQUFlLENBQUMsQ0FBQTtBQUMvQyxJQUFZLENBQUMsV0FBTSxRQUFRLENBQUMsQ0FBQTtBQUM1QixJQUFZLEtBQUssV0FBTSxPQUFPLENBQUMsQ0FBQTtBQUMvQixJQUFPLFNBQVMsV0FBVyxrQkFBa0IsQ0FBQyxDQUFDO0FBQy9DLHNDQUF1Qix1QkFBdUIsQ0FBQyxDQUFBO0FBQy9DLCtCQUEwQixnQkFBZ0IsQ0FBQyxDQUFBO0FBQzNDLHdDQUF5Qix5QkFBeUIsQ0FBQyxDQUFBO0FBQ25ELHlCQUFrQixVQUFVLENBQUMsQ0FBQTtBQUM3Qix5QkFBbUIsVUFBVSxDQUFDLENBQUE7QUFHOUIscUJBQWlCLE1BQU0sQ0FBQyxDQUFBO0FBQ3hCLElBQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUM5QixJQUFNLFNBQVMsR0FBRyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7QUErRnRDLENBQUM7QUFLRCxDQUFDO0FBTUQsQ0FBQztBQUlELENBQUM7QUFHRCxDQUFDO0FBT0QsQ0FBQztBQW9CRix3QkFBd0IsTUFBZTtJQUVuQyxNQUFNLENBQUMsSUFBSSxPQUFPLENBQVcsVUFBVSxPQUFPLEVBQUUsTUFBTTtRQUNsRCxJQUFJLFVBQVUsR0FBWSxLQUFLLENBQUM7UUFDaEMsSUFBSSxJQUFjLENBQUM7UUFDbkIsY0FBSSxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQVUsUUFBUTtZQUUxQixDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxVQUFVLE1BQU07Z0JBRTVCLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssTUFBTSxJQUFJLENBQUMsVUFBVSxJQUFJLENBQUMsQ0FBQyxNQUFNLElBQUksTUFBTSxLQUFLLE1BQU0sSUFBSSxNQUFNLEtBQUssTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDekcsVUFBVSxHQUFHLElBQUksQ0FBQztvQkFDbEIsSUFBSSxHQUFHLE1BQU0sQ0FBQztnQkFDbEIsQ0FBQztZQUNMLENBQUMsQ0FBQyxDQUFDO1lBRUgsRUFBRSxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztnQkFDYixPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDbEIsQ0FBQztZQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNKLE1BQU0sQ0FBQyxFQUFFLEtBQUssRUFBRSxvQkFBb0IsRUFBRSxDQUFDLENBQUM7WUFDNUMsQ0FBQztRQUVMLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUc7WUFDbEIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ2hCLENBQUMsQ0FBQyxDQUFDO0lBRVAsQ0FBQyxDQUFDLENBQUM7QUFFUCxDQUFDO0FBR0QsdUJBQXVCLFFBQVE7SUFHM0IsTUFBTSxDQUFDLElBQUksT0FBTyxDQUFRLFVBQVUsT0FBTyxFQUFFLE1BQU07UUFFL0MsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxVQUFVLE1BQU07WUFDakMsSUFBSSxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsMEJBQTBCLENBQUMsQ0FBQztZQUNqRCxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDcEIsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRztZQUNsQixJQUFJLENBQUMsR0FBRyxFQUFFLE9BQU8sRUFBRSxnQ0FBZ0MsQ0FBQyxDQUFDO1lBQ3JELE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNoQixDQUFDLENBQUMsQ0FBQztJQUNQLENBQUMsQ0FBQyxDQUFDO0FBQ1AsQ0FBQztBQUdELHVCQUF1QixNQUFzQjtJQUV6QyxNQUFNLENBQUMsSUFBSSxPQUFPLENBQWdELFVBQVUsT0FBTyxFQUFFLE1BQU07UUFFdkYsSUFBSSxrQkFBa0IsR0FBWSxLQUFLLENBQUM7UUFDeEMsSUFBSSxXQUFXLEdBQVksS0FBSyxDQUFDO1FBRWpDLElBQUksSUFBYyxDQUFDO1FBRW5CLGNBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxVQUFVLFFBQVE7WUFFMUIsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsVUFBVSxNQUFNO2dCQUU1QixFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxJQUFJLE1BQU0sQ0FBQyxJQUFJLEtBQUssTUFBTSxJQUFJLENBQUMsa0JBQWtCLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxjQUFjLElBQUksTUFBTSxDQUFDLGNBQWMsS0FBSyxNQUFNLElBQUksTUFBTSxDQUFDLGNBQWMsS0FBSyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUU3SyxJQUFNLElBQUUsR0FBRyxJQUFJLCtCQUFVLENBQUMsTUFBTSxDQUFDLGtCQUFrQixDQUFDLENBQUE7b0JBRXBELENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxVQUFVLE9BQWM7d0JBRXZDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBRSxDQUFDLE9BQU8sRUFBRSxVQUFVLE9BQU87NEJBQy9CLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEtBQUssT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7Z0NBQ2pDLGtCQUFrQixHQUFHLElBQUksQ0FBQzs0QkFFOUIsQ0FBQzt3QkFDTCxDQUFDLENBQUMsQ0FBQTtvQkFDTixDQUFDLENBQUMsQ0FBQTtnQkFDTixDQUFDO2dCQUNELEVBQUUsQ0FBQyxDQUFDLENBQUMsV0FBVyxJQUFJLE1BQU0sQ0FBQyxJQUFJLEtBQUssTUFBTSxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsY0FBYyxJQUFJLE1BQU0sQ0FBQyxjQUFjLEtBQUssTUFBTSxJQUFJLE1BQU0sQ0FBQyxjQUFjLEtBQUssTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDdkosV0FBVyxHQUFHLElBQUksQ0FBQztvQkFDbkIsSUFBSSxHQUFHLE1BQU0sQ0FBQztnQkFDbEIsQ0FBQztZQUNMLENBQUMsQ0FBQyxDQUFDO1lBRUgsRUFBRSxDQUFDLENBQUMsQ0FBQyxrQkFBa0IsSUFBSSxXQUFXLENBQUMsQ0FBQyxDQUFDO2dCQUNyQyxPQUFPLENBQUMsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1lBQ3JELENBQUM7WUFBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztnQkFDckIsT0FBTyxDQUFDLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxjQUFjLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztZQUNwRCxDQUFDO1lBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ0osTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFBO1lBQzFCLENBQUM7UUFFTCxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHO1lBQ2xCLE1BQU0sQ0FBQyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsV0FBVyxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQUM7UUFDcEQsQ0FBQyxDQUFDLENBQUM7SUFFUCxDQUFDLENBQUMsQ0FBQztBQUdQLENBQUM7QUFJRDtJQVFJLG1CQUFZLElBQTBCO1FBR2xDLElBQU0sTUFBTSxHQUFtQjtZQUMzQixPQUFPLEVBQUU7Z0JBQ0wsTUFBTSxFQUFFLFNBQVM7Z0JBQ2pCLElBQUksRUFBRSxVQUFVO2dCQUNoQixjQUFjLEVBQUUsVUFBVTthQUM3QjtZQUNELGNBQWMsRUFBRSxNQUFNO1lBQ3RCLGtCQUFrQixFQUFFLHlDQUF5QztZQUM3RCxRQUFRLEVBQUUsQ0FBQztvQkFDUCxTQUFTLEVBQUUsTUFBTTtpQkFDcEIsQ0FBQztZQUNGLFFBQVEsRUFBRSxLQUFLO1NBQ2xCLENBQUM7UUFFRixrQkFBSyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNwQixJQUFJLENBQUMsSUFBSSxHQUFHLFdBQVcsQ0FBQTtRQUV2QixJQUFJLENBQUMsUUFBUSxHQUFHLE1BQU0sQ0FBQztRQUd2QixFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7WUFDdkIsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUM7Z0JBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsY0FBYyxHQUFHLGtCQUFrQixDQUFDO1lBRW5HLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxrQkFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDbEQsQ0FBQztJQUdMLENBQUM7SUFJRCxtQ0FBZSxHQUFmLFVBQWdCLFVBQW1CO1FBQy9CLElBQU0sSUFBSSxHQUFHLElBQUksQ0FBQTtRQUNqQixNQUFNLENBQUMsSUFBSSxPQUFPLENBQVUsVUFBVSxPQUFPLEVBQUUsTUFBTTtZQUNqRCxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7Z0JBRXpCLElBQU0sd0JBQXNCLEdBQWUsRUFBRSxDQUFDO2dCQUU5QyxJQUFJLGNBQVksR0FBWSxLQUFLLENBQUE7Z0JBQ2pDLElBQUksUUFBZ0IsQ0FBQztnQkFFckIsY0FBSSxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQUMsQ0FBQztvQkFDVixDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxVQUFDLEdBQUc7d0JBQ1QsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxVQUFDLHNCQUFzQjs0QkFFakQsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksS0FBSyxPQUFPLElBQUksQ0FBQyxDQUFDLENBQUMsVUFBVSxJQUFJLEdBQUcsQ0FBQyxTQUFTLEtBQUssc0JBQXNCLENBQUMsU0FBUyxDQUFDLElBQUksVUFBVSxLQUFLLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0NBQ2hJLGNBQVksR0FBRyxJQUFJLENBQUE7Z0NBQ25CLFFBQU0sR0FBRyxHQUFHLENBQUE7Z0NBQ1osd0JBQXNCLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBOzRCQUNwQyxDQUFDO3dCQUVMLENBQUMsQ0FBQyxDQUFBO29CQUNOLENBQUMsQ0FBQyxDQUFBO29CQUVGLEVBQUUsQ0FBQyxDQUFDLGNBQVksQ0FBQyxDQUFDLENBQUM7d0JBRWYsSUFBSSxXQUFTLEdBQVksS0FBSyxDQUFDO3dCQUUvQixLQUFLLENBQUMsVUFBVSxDQUFDLHdCQUFzQixFQUFFLFVBQUMsTUFBTSxFQUFFLEVBQUU7NEJBQ2hELEVBQUUsQ0FBQyxDQUFDLENBQUMsV0FBUyxDQUFDLENBQUMsQ0FBQztnQ0FDYixhQUFhLENBQUMsSUFBSSxDQUFDLFdBQVcsR0FBRyxNQUFNLENBQUMsU0FBUyxHQUFHLG9CQUFvQixHQUFHLE1BQU0sQ0FBQyxTQUFTLEdBQUcsa0JBQWtCLEdBQUcsTUFBTSxDQUFDLFNBQVMsRUFBRSxVQUFDLEdBQUcsRUFBRSxNQUFNLEVBQUUsTUFBTTtvQ0FDckosRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQzt3Q0FDTixFQUFFLEVBQUUsQ0FBQTtvQ0FDUixDQUFDO29DQUFDLElBQUksQ0FBQyxDQUFDO3dDQUNKLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQyxJQUFJLENBQUM7NENBQ3JCLFdBQVMsR0FBRyxJQUFJLENBQUE7NENBRWhCLEVBQUUsRUFBRSxDQUFBO3dDQUNSLENBQUMsQ0FBQyxDQUFBO29DQUVOLENBQUM7Z0NBQ0wsQ0FBQyxDQUFDLENBQUE7NEJBQ04sQ0FBQzs0QkFBQyxJQUFJLENBQUMsQ0FBQztnQ0FDSixFQUFFLEVBQUUsQ0FBQTs0QkFDUixDQUFDO3dCQUVMLENBQUMsRUFBRSxVQUFDLEdBQUc7NEJBQ0gsRUFBRSxDQUFDLENBQUMsQ0FBQyxXQUFTLENBQUMsQ0FBQyxDQUFDO2dDQUNiLE1BQU0sQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFBOzRCQUVoRCxDQUFDOzRCQUFDLElBQUksQ0FBQyxDQUFDO2dDQUNKLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQTs0QkFFakIsQ0FBQzt3QkFDTCxDQUFDLENBQUMsQ0FBQTtvQkFHTixDQUFDO29CQUFDLElBQUksQ0FBQyxDQUFDO3dCQUNKLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO29CQUNoQyxDQUFDO2dCQUdMLENBQUMsQ0FBQyxDQUFBO1lBS04sQ0FBQztZQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNKLE1BQU0sQ0FBQyx1QkFBdUIsQ0FBQyxDQUFBO1lBRW5DLENBQUM7UUFDTCxDQUFDLENBQUMsQ0FBQztJQUdQLENBQUM7SUFFRCxxQ0FBaUIsR0FBakIsVUFBa0IsTUFBWTtRQUMxQixJQUFNLElBQUksR0FBRyxJQUFJLENBQUE7SUFFckIsQ0FBQztJQUVELGlDQUFhLEdBQWIsVUFBYyxJQUFhO1FBQ3ZCLElBQU0sSUFBSSxHQUFHLElBQUksQ0FBQztRQUVsQixJQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDO1FBQ3ZCLE1BQU0sQ0FBQyxJQUFJLE9BQU8sQ0FBVSxVQUFVLE9BQU8sRUFBRSxNQUFNO1lBQ2pELEVBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDO2dCQUNwQixFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQztvQkFDbEIsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUE7b0JBQ2hCLE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUM7Z0JBRWpDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUc7b0JBQ2xCLE9BQU8sQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUM7b0JBQzNCLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFHaEIsQ0FBQyxDQUFDLENBQUM7WUFDUCxDQUFDLENBQUMsQ0FBQTtRQUtOLENBQUMsQ0FBQyxDQUFDO0lBRVAsQ0FBQzs7SUFDRCxrQ0FBYyxHQUFkO1FBQ0ksSUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDO1FBRWxCLE1BQU0sQ0FBQyxJQUFJLE9BQU8sQ0FBVSxVQUFVLE9BQU8sRUFBRSxNQUFNO1lBQ2pELElBQU0sYUFBYSxHQUFHLEVBQUUsQ0FBQTtZQUN4QixJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQUMsSUFBSTtnQkFDdEIsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsVUFBQyxHQUFHO29CQUNaLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEtBQUssTUFBTSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO3dCQUNsQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsVUFBQyxVQUFVOzRCQUN2QixhQUFhLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFBO3dCQUNsQyxDQUFDLENBQUMsQ0FBQTtvQkFFTixDQUFDO2dCQUVMLENBQUMsQ0FBQyxDQUFBO2dCQUNGLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQTtZQUUxQixDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBQyxHQUFHO2dCQUNULE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUNmLENBQUMsQ0FBQyxDQUFBO1FBR04sQ0FBQyxDQUFDLENBQUE7SUFFTixDQUFDO0lBRUQsb0NBQWdCLEdBQWhCO1FBQ0ksSUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDO1FBRWxCLE1BQU0sQ0FBQyxJQUFJLE9BQU8sQ0FBVSxVQUFVLE9BQU8sRUFBRSxNQUFNO1lBQ2pELElBQU0sWUFBWSxHQUFHLEVBQUUsQ0FBQTtZQUN2QixJQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUE7WUFFNUIsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDLElBQUksQ0FBQyxVQUFDLEtBQUs7Z0JBQzdCLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLFVBQUMsVUFBVTtvQkFDcEIsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLFVBQUMsR0FBRzt3QkFFbEIsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksS0FBSyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQzs0QkFDaEMsWUFBWSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQTt3QkFDakMsQ0FBQztvQkFDTCxDQUFDLENBQUMsQ0FBQTtnQkFFTixDQUFDLENBQUMsQ0FBQTtnQkFDRixPQUFPLENBQUMsWUFBWSxDQUFDLENBQUE7WUFDekIsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQUMsR0FBRztnQkFDVCxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDZixDQUFDLENBQUMsQ0FBQTtRQUNOLENBQUMsQ0FBQyxDQUFBO0lBRU4sQ0FBQztJQUlELDRCQUFRLEdBQVI7UUFDSSxNQUFNLENBQUMsSUFBSSxPQUFPLENBQWEsVUFBVSxPQUFPLEVBQUUsTUFBTTtZQUVwRCxjQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDO2dCQUNuQixPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDZCxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHO2dCQUNsQixNQUFNLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDZixDQUFDLENBQUMsQ0FBQTtRQUNOLENBQUMsQ0FBQyxDQUFBO0lBQ04sQ0FBQztJQUNELDJCQUFPLEdBQVAsVUFBUSxVQUFrQjtRQUN0QixJQUFNLElBQUksR0FBRyxJQUFJLENBQUM7UUFDbEIsSUFBSSxTQUFTLEdBQVksS0FBSyxDQUFBO1FBQzlCLElBQUksZ0JBQTBCLENBQUM7UUFDL0IsTUFBTSxDQUFDLElBQUksT0FBTyxDQUFXLFVBQVUsT0FBTyxFQUFFLE1BQU07WUFFbEQsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUM7Z0JBQzVCLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLFVBQUMsR0FBRztvQkFDVCxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsSUFBSSxHQUFHLENBQUMsU0FBUyxLQUFLLFVBQVUsQ0FBQyxDQUFDLENBQUM7d0JBQzdDLFNBQVMsR0FBRyxJQUFJLENBQUE7d0JBQ2hCLGdCQUFnQixHQUFHLEdBQUcsQ0FBQTtvQkFDMUIsQ0FBQztnQkFDTCxDQUFDLENBQUMsQ0FBQTtnQkFDRixFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO29CQUNaLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO2dCQUM3QixDQUFDO2dCQUFDLElBQUksQ0FBQyxDQUFDO29CQUNKLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQTtnQkFDeEIsQ0FBQztZQUNMLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUc7Z0JBQ2xCLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUNmLENBQUMsQ0FBQyxDQUFBO1FBQ04sQ0FBQyxDQUFDLENBQUE7SUFDTixDQUFDO0lBRUQsZ0NBQVksR0FBWjtRQUNJLE1BQU0sQ0FBQyxJQUFJLE9BQU8sQ0FBQyxVQUFVLE9BQU8sRUFBRSxNQUFNO1lBRXhDLGlDQUFZLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDO2dCQUMzQixPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDZCxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHO2dCQUNsQixNQUFNLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDZixDQUFDLENBQUMsQ0FBQztRQUNQLENBQUMsQ0FBQyxDQUFDO0lBQ1AsQ0FBQztJQUVELCtCQUFXLEdBQVgsVUFBWSxPQUFlO1FBQ3ZCLElBQU0sSUFBSSxHQUFHLElBQUksQ0FBQTtRQUNqQixFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7WUFDWCxNQUFNLEtBQUssQ0FBQyw2Q0FBNkMsQ0FBQyxDQUFBO1FBRzlELENBQUM7UUFBQyxJQUFJLENBQUMsQ0FBQztZQUVKLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSx3QkFBYSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQztRQUdwRCxDQUFDO0lBRUwsQ0FBQztJQUVELDhCQUFVLEdBQVY7UUFDSSxJQUFNLElBQUksR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGtCQUFrQixDQUFDO1FBQzlDLE1BQU0sQ0FBQyxJQUFJLCtCQUFVLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0lBQzVELENBQUM7SUFHRCxtQ0FBZSxHQUFmO1FBRUksTUFBTSxDQUFDLElBQUksU0FBUyxFQUFFLENBQUE7SUFFMUIsQ0FBQztJQUVELCtCQUFXLEdBQVgsVUFBWSxJQUFZLEVBQUUsR0FBWTtRQUNsQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztRQUN2QixJQUFNLElBQUksR0FBRyxJQUFJLENBQUM7UUFDbEIsSUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQztRQUU3QixFQUFFLENBQUMsQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxjQUFjLEtBQUssTUFBTSxDQUFDLENBQUMsQ0FBQztZQUVqRCxNQUFNLENBQUMsSUFBSSxPQUFPLENBQVUsVUFBVSxPQUFPLEVBQUUsTUFBTTtnQkFHakQsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO29CQUNQLEdBQUcsR0FBRyxNQUFNLENBQUMsY0FBYyxDQUFDO2dCQUNoQyxDQUFDO2dCQUVELE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7Z0JBQ3hCLElBQUksQ0FBQyxXQUFXLENBQUM7b0JBQ2IsU0FBUyxFQUFFLEdBQUc7b0JBQ2Qsa0JBQWtCLEVBQUUsTUFBTSxDQUFDLGtCQUFrQjtvQkFDN0MsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPO2lCQUMxQixDQUFDLENBQUE7Z0JBRUYsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztvQkFDWCxLQUFLLElBQUk7d0JBQ0wsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBVSxNQUFNOzRCQUNuQyxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQTs0QkFDaEIsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO3dCQUNsQixDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHOzRCQUNsQixNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7d0JBQ2hCLENBQUMsQ0FBQyxDQUFDO3dCQUNILEtBQUssQ0FBQztvQkFFVixLQUFLLE1BQU07d0JBQ1AsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBVSxNQUFNOzRCQUNyQyxJQUFJLENBQUMsSUFBSSxHQUFHLE1BQU0sQ0FBQTs0QkFDbEIsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO3dCQUNsQixDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHOzRCQUNsQixNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7d0JBQ2hCLENBQUMsQ0FBQyxDQUFDO3dCQUNILEtBQUssQ0FBQztvQkFFVixLQUFLLFFBQVE7d0JBQ1QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBVSxNQUFNOzRCQUN2QyxJQUFJLENBQUMsSUFBSSxHQUFHLFFBQVEsQ0FBQTs0QkFDcEIsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO3dCQUNsQixDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHOzRCQUNsQixNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7d0JBQ2hCLENBQUMsQ0FBQyxDQUFDO3dCQUNILEtBQUssQ0FBQztnQkFFZCxDQUFDO2dCQUFBLENBQUM7WUFFTixDQUFDLENBQUMsQ0FBQztRQUVQLENBQUM7UUFBQyxJQUFJLENBQUMsQ0FBQztZQUNKLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDekIsSUFBTSxRQUFNLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQztZQUM3QixNQUFNLENBQUMsSUFBSSxPQUFPLENBQUMsVUFBVSxPQUFPLEVBQUUsTUFBTTtnQkFDeEMsY0FBSSxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQVUsUUFBUTtvQkFFMUIsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsVUFBVSxNQUFNO3dCQUM1QixFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxLQUFLLE1BQU0sQ0FBQyxDQUFDLENBQUM7NEJBQ3pCLEdBQUcsR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDO3dCQUMzQixDQUFDO29CQUNMLENBQUMsQ0FBQyxDQUFDO29CQUNILEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7d0JBRU4sSUFBSSxDQUFDLFdBQVcsQ0FBQzs0QkFDYixTQUFTLEVBQUUsR0FBRzs0QkFDZCxPQUFPLEVBQUUsUUFBTSxDQUFDLE9BQU87NEJBQ3ZCLGtCQUFrQixFQUFFLFFBQU0sQ0FBQyxrQkFBa0I7eUJBQ2hELENBQUMsQ0FBQTt3QkFFRixPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQzt3QkFFMUIsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQzs0QkFDWCxLQUFLLElBQUk7Z0NBQ0wsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBVSxNQUFNO29DQUNuQyxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQTtvQ0FDaEIsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO2dDQUNsQixDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHO29DQUNsQixNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7Z0NBQ2hCLENBQUMsQ0FBQyxDQUFDO2dDQUNILEtBQUssQ0FBQzs0QkFFVixLQUFLLE1BQU07Z0NBQ1AsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBVSxNQUFNO29DQUNyQyxJQUFJLENBQUMsSUFBSSxHQUFHLE1BQU0sQ0FBQTtvQ0FDbEIsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO2dDQUNsQixDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHO29DQUNsQixNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7Z0NBQ2hCLENBQUMsQ0FBQyxDQUFDO2dDQUNILEtBQUssQ0FBQzs0QkFFVixLQUFLLFFBQVE7Z0NBQ1QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBVSxNQUFNO29DQUN2QyxJQUFJLENBQUMsSUFBSSxHQUFHLFFBQVEsQ0FBQTtvQ0FDcEIsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO2dDQUNsQixDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHO29DQUNsQixNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7Z0NBQ2hCLENBQUMsQ0FBQyxDQUFDO2dDQUNILEtBQUssQ0FBQzt3QkFDZCxDQUFDO29CQUVMLENBQUM7b0JBQUMsSUFBSSxDQUFDLENBQUM7d0JBQ0osTUFBTSxDQUFDLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUM7b0JBQ2hDLENBQUM7Z0JBQ0wsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRztvQkFDbEIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUNoQixDQUFDLENBQUMsQ0FBQztZQUNQLENBQUMsQ0FBQyxDQUFDO1FBQ1AsQ0FBQztJQUNMLENBQUM7O0lBTUQsOEJBQVUsR0FBVjtRQUNJLElBQU0sSUFBSSxHQUFHLElBQUksQ0FBQztRQUNsQixJQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQTtRQUV2QyxNQUFNLENBQUMsSUFBSSxPQUFPLENBQUMsVUFBVSxPQUFPLEVBQUUsTUFBTTtZQUN4QyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxPQUFPLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztZQUVqRCxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUM7Z0JBQ3JCLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQTtnQkFDbkIsT0FBTyxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsQ0FBQyxDQUFBO1lBQzVDLENBQUM7WUFBQyxJQUFJLENBQUMsQ0FBQztnQkFHSixJQUFJLENBQUMsWUFBWSxFQUFFLENBQUMsSUFBSSxDQUFDO29CQUNyQixPQUFPLENBQUMsSUFBSSxDQUFDLENBQUE7Z0JBQ2pCLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFDLEdBQUc7b0JBR1QsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDLElBQUksQ0FBQzt3QkFDeEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFBO3dCQUNwQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUE7b0JBRWpCLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQzt3QkFFTCxjQUFjLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxNQUFNOzRCQUU5RCxJQUFNLFVBQVUsR0FBVyxNQUFNLENBQUMsU0FBUyxDQUFDOzRCQUU1QyxJQUFNLFNBQVMsR0FBRztnQ0FDZCxTQUFTLEVBQUUsVUFBVTtnQ0FDckIsa0JBQWtCLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxrQkFBa0I7Z0NBQ3BELE9BQU8sRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU87NkJBQ2pDLENBQUM7NEJBRUYsRUFBRSxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztnQ0FHYixJQUFJLENBQUMsVUFBVSxFQUFFLE1BQU0sRUFBRSx3QkFBd0IsQ0FBQyxDQUFDO2dDQUVuRCxJQUFJLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFBO2dDQUczQixJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxNQUFNO29DQUMzQyxJQUFJLENBQUMsSUFBSSxHQUFHLFFBQVEsQ0FBQTtvQ0FDcEIsT0FBTyxDQUFDLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztnQ0FDbEQsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRztvQ0FHbEIsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO3dDQUd2QixJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDLElBQUksQ0FBQzs0Q0FDekIsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7NENBQ2pCLE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUE7NENBQzVCLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUM7Z0RBRXRDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQTs0Q0FHdkIsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO2dEQUNMLE9BQU8sQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUE7Z0RBRTFCLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQTs0Q0FFdkIsQ0FBQyxDQUFDLENBQUM7d0NBQ1AsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQzs0Q0FDaEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQTs0Q0FDZCxPQUFPLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFBOzRDQUUxQixTQUFTLENBQUMsUUFBUSxDQUFDLENBQUE7d0NBRXZCLENBQUMsQ0FBQyxDQUFDO29DQU1QLENBQUM7b0NBR0QsRUFBRSxDQUFDLENBQUMsUUFBUSxJQUFJLFVBQVUsQ0FBQyxDQUFDLENBQUM7d0NBQ3pCLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsTUFBTTs0Q0FDckMsSUFBSSxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsa0NBQWtDLENBQUMsQ0FBQzs0Q0FDekQsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7Z0RBRXhCLElBQU0sU0FBTyxHQUFHLFdBQVcsQ0FBQztvREFDeEIsT0FBTyxDQUFDLEdBQUcsQ0FBQywrQkFBK0IsQ0FBQyxDQUFBO29EQUM1QyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBQyxJQUFJO3dEQUM5QixFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7NERBRWxCLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLE1BQU07Z0VBQzNDLElBQUksQ0FBQyxJQUFJLEdBQUcsUUFBUSxDQUFBO2dFQUNwQixhQUFhLENBQUMsU0FBTyxDQUFDLENBQUE7Z0VBQ3RCLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUE7Z0VBRXhCLE9BQU8sQ0FBQyxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7NERBQ2xELENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFDLEdBQUc7Z0VBQ1QsT0FBTyxDQUFDLEdBQUcsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFBO2dFQUMxQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFBOzREQUN2QixDQUFDLENBQUMsQ0FBQTt3REFDTixDQUFDO3dEQUFDLElBQUksQ0FBQyxDQUFDOzREQUNKLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0RBQWdELENBQUMsQ0FBQTt3REFDakUsQ0FBQztvREFDTCxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBQyxHQUFHO3dEQUNULE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUE7b0RBQ3BCLENBQUMsQ0FBQyxDQUFBO2dEQUVOLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTs0Q0FFYixDQUFDO3dDQUVMLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUc7NENBQ2xCLElBQUksQ0FBQyxHQUFHLEVBQUUsT0FBTyxFQUFFLGtDQUFrQyxDQUFDLENBQUM7NENBQ3ZELE1BQU0sQ0FBQyxxQkFBcUIsQ0FBQyxDQUFBO3dDQUdqQyxDQUFDLENBQUMsQ0FBQztvQ0FDUCxDQUFDO29DQUFDLElBQUksQ0FBQyxDQUFDO3dDQUNKLE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUE7d0NBQzVCLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQTtvQ0FFM0IsQ0FBQztnQ0FDTCxDQUFDLENBQUMsQ0FBQzs0QkFDUCxDQUFDO3dCQUlMLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUc7NEJBRWxCLElBQUksQ0FBQyxTQUFTLEVBQUUsTUFBTSxFQUFFLFdBQVcsQ0FBQyxDQUFDOzRCQUVyQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7Z0NBSXZCLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUMsSUFBSSxDQUFDO29DQUN6QixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztvQ0FDakIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQzt3Q0FDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQTt3Q0FDZCxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUE7b0NBR3ZCLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUM7d0NBQ2hCLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7d0NBQ2QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQTt3Q0FFMUIsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFBO29DQUV2QixDQUFDLENBQUMsQ0FBQztnQ0FDUCxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDO29DQUNoQixPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBO29DQUNkLE9BQU8sQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUE7b0NBRTFCLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQTtnQ0FFdkIsQ0FBQyxDQUFDLENBQUM7NEJBR1AsQ0FBQzs0QkFBQyxJQUFJLENBQUMsQ0FBQztnQ0FDSixPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFBO2dDQUMzQixTQUFTLENBQUMsUUFBUSxDQUFDLENBQUE7NEJBQ3ZCLENBQUM7d0JBRUwsQ0FBQyxDQUFDLENBQUM7b0JBSVAsQ0FBQyxDQUFDLENBQUE7Z0JBTU4sQ0FBQyxDQUFDLENBQUE7WUFRTixDQUFDO1FBR0wsQ0FBQyxDQUFDLENBQUM7SUFDUCxDQUFDOztJQUVELDRCQUFRLEdBQVIsVUFBUyxLQUFZO1FBQ2pCLElBQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUM7UUFDN0IsSUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDO1FBRWxCLE1BQU0sQ0FBQyxJQUFJLE9BQU8sQ0FBQyxVQUFVLE9BQU8sRUFBRSxNQUFNO1lBQ3hDLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDO2dCQUVsQyxJQUFNLE1BQU0sR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFBO2dCQUN2QixFQUFFLENBQUMsQ0FBQyxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQztvQkFFN0IsT0FBTyxDQUFDLEdBQUcsQ0FBQyxhQUFhLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQTtvQkFFL0MsSUFBSSxDQUFDLFdBQVcsQ0FBQzt3QkFDYixTQUFTLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxTQUFTO3dCQUM3QixrQkFBa0IsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLGtCQUFrQjt3QkFDcEQsT0FBTyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTztxQkFDakMsQ0FBQyxDQUFBO29CQUVGLGFBQWEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsTUFBTTt3QkFDN0MsSUFBSSxDQUFDLElBQUksR0FBRyxNQUFNLENBQUM7d0JBQ25CLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztvQkFDcEIsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRzt3QkFDbEIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUNoQixDQUFDLENBQUMsQ0FBQztnQkFFUCxDQUFDO2dCQUFDLElBQUksQ0FBQyxDQUFDO29CQUNKLE1BQU0sQ0FBQyxxQkFBcUIsQ0FBQyxDQUFBO2dCQUNqQyxDQUFDO1lBRUwsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRztnQkFDbEIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ2hCLENBQUMsQ0FBQyxDQUFDO1FBQ1AsQ0FBQyxDQUFDLENBQUM7SUFDUCxDQUFDOztJQUVMLGdCQUFDO0FBQUQsQ0FsbUJBLEFBa21CQyxJQUFBO0FBbG1CRDsyQkFrbUJDLENBQUE7QUFBQSxDQUFDIiwiZmlsZSI6ImluZGV4LmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgUHJvbWlzZSBmcm9tIFwiYmx1ZWJpcmRcIjtcbmltcG9ydCAqIGFzIGZzIGZyb20gXCJmc1wiO1xuaW1wb3J0ICogYXMgY2hpbGRfcHJvY2VzcyBmcm9tIFwiY2hpbGRfcHJvY2Vzc1wiO1xuaW1wb3J0ICogYXMgXyBmcm9tIFwibG9kYXNoXCI7XG5pbXBvcnQgKiBhcyBhc3luYyBmcm9tIFwiYXN5bmNcIjtcbmltcG9ydCBQcm92aWRlcnMgPSByZXF1aXJlKFwibW9iaWxlLXByb3ZpZGVyc1wiKTtcbmltcG9ydCBXcGFtYW5hZ2VyIGZyb20gXCJ3cGFzdXBwbGljYW50LW1hbmFnZXJcIjtcbmltcG9ydCBob3N0YXBkc3dpdGNoIGZyb20gXCJob3N0YXBkX3N3aXRjaFwiO1xuaW1wb3J0IHRlc3RpbnRlcm5ldCBmcm9tIFwicHJvbWlzZS10ZXN0LWNvbm5lY3Rpb25cIjtcbmltcG9ydCBtZXJnZSBmcm9tIFwianNvbi1hZGRcIjtcbmltcG9ydCBXdmRpYWwgZnJvbSBcInd2ZGlhbGpzXCI7XG5cblxuaW1wb3J0IG5ldHcgZnJvbSBcIm5ldHdcIjtcbmNvbnN0IHZlcmIgPSByZXF1aXJlKFwidmVyYm9cIik7XG5jb25zdCBod3Jlc3RhcnQgPSByZXF1aXJlKFwiaHdyZXN0YXJ0XCIpO1xuXG5cblxuXG5pbnRlcmZhY2UgSVByb3ZpZGVyIHtcblxuICAgIGxhYmVsPzogc3RyaW5nO1xuICAgIGFwbjogc3RyaW5nO1xuICAgIHBob25lPzogc3RyaW5nXG4gICAgdXNlcm5hbWU/OiBzdHJpbmc7XG4gICAgcGFzc3dvcmQ/OiBzdHJpbmc7XG5cbn1cblxuaW50ZXJmYWNlIElHbG9iYWxQcm92aWRlcnMge1xuXG4gICAgY291bnRyeTogc3RyaW5nO1xuICAgIHByb3ZpZGVyczogSVByb3ZpZGVyW107XG59XG5cblxudHlwZSBJbW9kZSA9ICdhcCcgfCAnaG9zdCcgfCAnY2xpZW50JyB8ICd1bm1hbmFnZWQnIHwgJ3d2JyB8ICdldGhlcm5ldCdcblxuXG5pbnRlcmZhY2UgSVNjYW4ge1xuICAgIGVzc2lkOiBzdHJpbmc7XG4gICAgbWFjOiBzdHJpbmc7XG4gICAgc2lnbmFsOiBzdHJpbmc7XG59XG5cbnR5cGUgSU5ldHdvcmtUeXBlID0gJ3dpZmknIHwgJ3dpcmVkJ1xuXG5pbnRlcmZhY2UgSU5ldHdvcmsge1xuICAgIHR5cGU6IElOZXR3b3JrVHlwZTtcbiAgICBtYWM6IHN0cmluZztcbiAgICBpbnRlcmZhY2U6IHN0cmluZztcbiAgICBlc3NpZD86IHN0cmluZztcbiAgICBzY2FuPzogSVNjYW5bXTtcbiAgICBpcD86IHN0cmluZztcbiAgICBnYXRld2F5Pzogc3RyaW5nO1xufVxuXG5pbnRlcmZhY2UgQ2xhc3NPcHQge1xuICAgIHdpZmlfaW50ZXJmYWNlPzogc3RyaW5nO1xuICAgIG1vYmlsZT86IElNb2JpbGU7XG4gICAgaG9zdGFwZD86IElIb3N0YXBkY2Y7XG4gICAgd3Bhc3VwcGxpY2FudF9wYXRoPzogc3RyaW5nO1xufVxuaW50ZXJmYWNlIElNb2JpbGUge1xuICAgIHByb3ZpZGVyOiBJUHJvdmlkZXI7XG4gICAgZGV2aWNlPzogYW55O1xuICAgIGNvbmZpZ0ZpbGVQYXRoPzogc3RyaW5nO1xuXG59XG5cbmludGVyZmFjZSBJRXRoZXJuZXQge1xuICAgIGludGVyZmFjZTogc3RyaW5nO1xuICAgIGRoY3A/OiB7XG4gICAgICAgIGlwPzogc3RyaW5nO1xuICAgICAgICBnYXRld2F5Pzogc3RyaW5nO1xuICAgICAgICBuZXRtYXNrPzogc3RyaW5nO1xuICAgICAgICBiY2FzdD86IHN0cmluZztcbiAgICB9XG59XG5cbmludGVyZmFjZSBJTGlOZXR3b3JrQ29uZiB7XG4gICAgd2lmaV9pbnRlcmZhY2U6IHN0cmluZztcbiAgICBtb2JpbGU/OiBJTW9iaWxlO1xuICAgIGhvc3RhcGQ6IElIb3N0YXBkO1xuICAgIHdwYXN1cHBsaWNhbnRfcGF0aD86IHN0cmluZztcbiAgICBldGhlcm5ldD86IElFdGhlcm5ldFtdLFxuICAgIHJlY292ZXJ5OiBib29sZWFuXG59XG5pbnRlcmZhY2UgSUxpTmV0d29ya0NvbmZQYXJhbXMge1xuICAgIHdpZmlfaW50ZXJmYWNlPzogc3RyaW5nO1xuICAgIG1vYmlsZT86IElNb2JpbGU7XG4gICAgaG9zdGFwZD86IElIb3N0YXBkO1xuICAgIHdwYXN1cHBsaWNhbnRfcGF0aD86IHN0cmluZztcbiAgICBldGhlcm5ldD86IHtcbiAgICAgICAgaW50ZXJmYWNlOiBzdHJpbmc7XG4gICAgICAgIGRoY3A/OiB7XG4gICAgICAgICAgICBpcD86IHN0cmluZztcbiAgICAgICAgICAgIGdhdGV3YXk/OiBzdHJpbmc7XG4gICAgICAgICAgICBuZXRtYXNrPzogc3RyaW5nO1xuICAgICAgICAgICAgYmNhc3Q/OiBzdHJpbmc7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIHJlY292ZXJ5PzogdHJ1ZVxufVxuXG5pbnRlcmZhY2UgSUhvc3RhcGQge1xuICAgIGRyaXZlcjogc3RyaW5nO1xuICAgIHNzaWQ6IHN0cmluZztcbiAgICB3cGFfcGFzc3BocmFzZTogYW55O1xufTtcbmludGVyZmFjZSBJSG9zdGFwZGNmIHtcbiAgICBkcml2ZXI/OiBzdHJpbmc7XG4gICAgc3NpZDogc3RyaW5nO1xuICAgIHdwYV9wYXNzcGhyYXNlOiBhbnk7XG59O1xuXG5pbnRlcmZhY2UgSUhvc3RhcGRDZiB7XG4gICAgZHJpdmVyPzogc3RyaW5nO1xuICAgIHNzaWQ/OiBzdHJpbmc7XG4gICAgd3BhX3Bhc3NwaHJhc2U/OiBzdHJpbmc7XG59O1xuXG5pbnRlcmZhY2UgSURuc21hc3Ege1xuICAgIGludGVyZmFjZTogc3RyaW5nO1xufTtcbmludGVyZmFjZSBJRG5zbWFzcUNmIHtcbiAgICBpbnRlcmZhY2U/OiBzdHJpbmc7XG59O1xuaW50ZXJmYWNlIElIQ29uZiB7XG4gICAgaW50ZXJmYWNlPzogc3RyaW5nO1xuICAgIHdwYXN1cHBsaWNhbnRfcGF0aD86IHN0cmluZztcbiAgICBob3N0YXBkPzogSUhvc3RhcGRDZjtcbiAgICByZWRpcmVjdD86IGJvb2xlYW47XG4gICAgZG5zbWFzcT86IElEbnNtYXNxQ2Y7XG59O1xuXG5pbnRlcmZhY2UgSUNvbm5lY3Rpb24ge1xuXG4gICAgbGlua1R5cGU6IHN0cmluZztcbiAgICBpbnRlcmZhY2U6IHN0cmluZztcbiAgICBpcD86IHN0cmluZztcbiAgICBnYXRld2F5Pzogc3RyaW5nO1xuXG59XG5cbmludGVyZmFjZSBJSW5pdCB7XG4gICAgY29uZWN0aW9uOiBib29sZWFuO1xuICAgIHJlY292ZXJ5OiBib29sZWFuO1xuICAgIGRldGFpbHM/OiBJQ29ubmVjdGlvbjtcbn1cblxuXG5cblxuZnVuY3Rpb24gZ2V0d2lmaWludGVyZmEoc2V0dGVkPzogc3RyaW5nKTogUHJvbWlzZTxJTmV0d29yaz4ge1xuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlPElOZXR3b3JrPihmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIGxldCB3aWZpX2V4aXN0OiBib29sZWFuID0gZmFsc2U7XG4gICAgICAgIGxldCBkZXZpOiBJTmV0d29yaztcbiAgICAgICAgbmV0dygpLnRoZW4oZnVuY3Rpb24gKG5ldHdvcmtzKSB7XG5cbiAgICAgICAgICAgIF8ubWFwKG5ldHdvcmtzLCBmdW5jdGlvbiAoZGV2aWNlKSB7XG5cbiAgICAgICAgICAgICAgICBpZiAoZGV2aWNlLnR5cGUgPT09IFwid2lmaVwiICYmICF3aWZpX2V4aXN0ICYmICghc2V0dGVkIHx8IHNldHRlZCA9PT0gXCJhdXRvXCIgfHwgc2V0dGVkID09PSBkZXZpY2UuaW50ZXJmYWNlKSkge1xuICAgICAgICAgICAgICAgICAgICB3aWZpX2V4aXN0ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgZGV2aSA9IGRldmljZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgaWYgKHdpZmlfZXhpc3QpIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKGRldmkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZWplY3QoeyBlcnJvcjogXCJkZXZpY2Ugbm90IGZvdW5kZWRcIiB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgfSk7XG5cbiAgICB9KTtcblxufVxuXG5cbmZ1bmN0aW9uIHJlY292ZXJ5X21vZGUoYXBzd2l0Y2gpOiBQcm9taXNlPEltb2RlPiB7XG5cblxuICAgIHJldHVybiBuZXcgUHJvbWlzZTxJbW9kZT4oZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuXG4gICAgICAgIGFwc3dpdGNoLmhvc3QoKS50aGVuKGZ1bmN0aW9uIChhbnN3ZXIpIHtcbiAgICAgICAgICAgIHZlcmIoYW5zd2VyLCBcIndhcm5cIiwgXCJsaW5ldHdvcmsgcmVjb3ZlcnkgbW9kZSBcIik7XG4gICAgICAgICAgICByZXNvbHZlKCdob3N0Jyk7XG4gICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIHZlcmIoZXJyLCBcImVycm9yXCIsIFwibGluZXR3b3JrIHJlY292ZXJ5IG1vZGUgZmFpbGVkXCIpO1xuICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgIH0pO1xuICAgIH0pO1xufVxuXG5cbmZ1bmN0aW9uIHJlY292ZXJ5Y2hlY2soY29uZmlnOiBJTGlOZXR3b3JrQ29uZik6IFByb21pc2U8eyBkZXZpY2U6IElOZXR3b3JrLCBrbm93bl9uZXR3b3JrczogYm9vbGVhbiB9PiB7XG5cbiAgICByZXR1cm4gbmV3IFByb21pc2U8eyBkZXZpY2U6IElOZXR3b3JrLCBrbm93bl9uZXR3b3JrczogYm9vbGVhbiB9PihmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG5cbiAgICAgICAgbGV0IHNvbWVuZXR3b3JrX2V4aXN0czogYm9vbGVhbiA9IGZhbHNlO1xuICAgICAgICBsZXQgd2xhbl9leGlzdHM6IGJvb2xlYW4gPSBmYWxzZTtcblxuICAgICAgICBsZXQgZGV2aTogSU5ldHdvcms7XG5cbiAgICAgICAgbmV0dygpLnRoZW4oZnVuY3Rpb24gKG5ldHdvcmtzKSB7XG5cbiAgICAgICAgICAgIF8ubWFwKG5ldHdvcmtzLCBmdW5jdGlvbiAoZGV2aWNlKSB7XG5cbiAgICAgICAgICAgICAgICBpZiAoZGV2aWNlLnNjYW4gJiYgZGV2aWNlLnR5cGUgPT09IFwid2lmaVwiICYmICFzb21lbmV0d29ya19leGlzdHMgJiYgKCFjb25maWcud2lmaV9pbnRlcmZhY2UgfHwgY29uZmlnLndpZmlfaW50ZXJmYWNlID09PSBcImF1dG9cIiB8fCBjb25maWcud2lmaV9pbnRlcmZhY2UgPT09IGRldmljZS5pbnRlcmZhY2UpKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgV00gPSBuZXcgV3BhbWFuYWdlcihjb25maWcud3Bhc3VwcGxpY2FudF9wYXRoKVxuXG4gICAgICAgICAgICAgICAgICAgIF8ubWFwKGRldmljZS5zY2FuLCBmdW5jdGlvbiAobmV0c2NhbjogSVNjYW4pIHtcblxuICAgICAgICAgICAgICAgICAgICAgICAgXy5tYXAoV00ubGlzdHdwYSwgZnVuY3Rpb24gKHdwYWl0ZW0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAod3BhaXRlbS5zc2lkID09PSBuZXRzY2FuLmVzc2lkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNvbWVuZXR3b3JrX2V4aXN0cyA9IHRydWU7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoIXdsYW5fZXhpc3RzICYmIGRldmljZS50eXBlID09PSBcIndpZmlcIiAmJiAoIWNvbmZpZy53aWZpX2ludGVyZmFjZSB8fCBjb25maWcud2lmaV9pbnRlcmZhY2UgPT09IFwiYXV0b1wiIHx8IGNvbmZpZy53aWZpX2ludGVyZmFjZSA9PT0gZGV2aWNlLmludGVyZmFjZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgd2xhbl9leGlzdHMgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBkZXZpID0gZGV2aWNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBpZiAoIXNvbWVuZXR3b3JrX2V4aXN0cyAmJiB3bGFuX2V4aXN0cykge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoeyBkZXZpY2U6IGRldmksIGtub3duX25ldHdvcmtzOiBmYWxzZSB9KTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAod2xhbl9leGlzdHMpIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHsgZGV2aWNlOiBkZXZpLCBrbm93bl9uZXR3b3JrczogdHJ1ZSB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KCdubyBpbnRlcmZhY2UnKVxuICAgICAgICAgICAgfVxuXG4gICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIHJlamVjdCh7IGVycm9yOiBlcnIsIGRlc2NyaXB0aW9uOiAnbmV0dyBlcnInIH0pO1xuICAgICAgICB9KTtcblxuICAgIH0pO1xuXG5cbn1cblxuXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIExpTmV0d29yayB7XG4gICAgbGljb25maWc6IElMaU5ldHdvcmtDb25mO1xuICAgIGhvc3RhcGQ6IGhvc3RhcGRzd2l0Y2g7XG4gICAgbW9iaWxlOiBXdmRpYWw7XG4gICAgbW9kZTogSW1vZGU7XG4gICAgaXNDb25uZWN0ZWQ6IGJvb2xlYW47XG5cblxuICAgIGNvbnN0cnVjdG9yKGRhdGE6IElMaU5ldHdvcmtDb25mUGFyYW1zKSB7XG5cblxuICAgICAgICBjb25zdCBjb25maWc6IElMaU5ldHdvcmtDb25mID0ge1xuICAgICAgICAgICAgaG9zdGFwZDoge1xuICAgICAgICAgICAgICAgIGRyaXZlcjogXCJubDgwMjExXCIsXG4gICAgICAgICAgICAgICAgc3NpZDogXCJ0ZXN0dHRhcFwiLFxuICAgICAgICAgICAgICAgIHdwYV9wYXNzcGhyYXNlOiBcInRlc3RwYXNzXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB3aWZpX2ludGVyZmFjZTogXCJhdXRvXCIsXG4gICAgICAgICAgICB3cGFzdXBwbGljYW50X3BhdGg6IFwiL2V0Yy93cGFfc3VwcGxpY2FudC93cGFfc3VwcGxpY2FudC5jb25mXCIsXG4gICAgICAgICAgICBldGhlcm5ldDogW3tcbiAgICAgICAgICAgICAgICBpbnRlcmZhY2U6ICdldGgwJ1xuICAgICAgICAgICAgfV0sXG4gICAgICAgICAgICByZWNvdmVyeTogZmFsc2VcbiAgICAgICAgfTtcblxuICAgICAgICBtZXJnZShjb25maWcsIGRhdGEpOyAvLyBjb21iaW5lIGRlZmF1bHQgc2V0dGluZ3Mgd2l0aCBuZXcgcGFyYW1ldGVycyBmcm9tIGRhdGFcbiAgICAgICAgdGhpcy5tb2RlID0gJ3VubWFuYWdlZCdcblxuICAgICAgICB0aGlzLmxpY29uZmlnID0gY29uZmlnO1xuXG5cbiAgICAgICAgaWYgKHRoaXMubGljb25maWcubW9iaWxlKSB7XG4gICAgICAgICAgICBpZiAoIXRoaXMubGljb25maWcubW9iaWxlLmNvbmZpZ0ZpbGVQYXRoKSB0aGlzLmxpY29uZmlnLm1vYmlsZS5jb25maWdGaWxlUGF0aCA9IFwiL2V0Yy93dmRpYWwuY29uZlwiO1xuXG4gICAgICAgICAgICB0aGlzLm1vYmlsZSA9IG5ldyBXdmRpYWwodGhpcy5saWNvbmZpZy5tb2JpbGUpXG4gICAgICAgIH1cblxuXG4gICAgfVxuXG5cblxuICAgIGV0aGVybmV0Y29ubmVjdChkZXZpY2VuYW1lPzogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgICAgIGNvbnN0IHRoYXQgPSB0aGlzXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTxib29sZWFuPihmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICBpZiAodGhhdC5saWNvbmZpZy5ldGhlcm5ldCkge1xuXG4gICAgICAgICAgICAgICAgY29uc3QgY29ubmVjdGlvbmRldmljZXNhcnJheTogSU5ldHdvcmtbXSA9IFtdO1xuXG4gICAgICAgICAgICAgICAgbGV0IGRldmljZWV4aXN0czogYm9vbGVhbiA9IGZhbHNlXG4gICAgICAgICAgICAgICAgbGV0IGRldmljZTogSU5ldHdvcms7XG4gICAgICAgICAgICAgICAgLy8gY2hlZWNrIGNvbmZpZ3VyYXRpb25cbiAgICAgICAgICAgICAgICBuZXR3KCkudGhlbigoYSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBfLm1hcChhLCAobmV0KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBfLm1hcCh0aGF0LmxpY29uZmlnLmV0aGVybmV0LCAobmV0aW50ZXJmYWNlY29uZmlndXJlZCkgPT4ge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5ldC50eXBlID09PSAnd2lyZWQnICYmICgoIWRldmljZW5hbWUgJiYgbmV0LmludGVyZmFjZSA9PT0gbmV0aW50ZXJmYWNlY29uZmlndXJlZC5pbnRlcmZhY2UpIHx8IGRldmljZW5hbWUgPT09IG5ldC5pbnRlcmZhY2UpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRldmljZWV4aXN0cyA9IHRydWVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGV2aWNlID0gbmV0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbm5lY3Rpb25kZXZpY2VzYXJyYXkucHVzaChuZXQpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICAgICAgICAgIGlmIChkZXZpY2VleGlzdHMpIHtcblxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGNvbm5lY3RlZDogYm9vbGVhbiA9IGZhbHNlO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBhc3luYy5lYWNoU2VyaWVzKGNvbm5lY3Rpb25kZXZpY2VzYXJyYXksIChkZXZpY2UsIGNiKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFjb25uZWN0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hpbGRfcHJvY2Vzcy5leGVjKCdpZmNvbmZpZyAnICsgZGV2aWNlLmludGVyZmFjZSArICcgZG93biAmJiBpZmNvbmZpZyAnICsgZGV2aWNlLmludGVyZmFjZSArICcgdXAgJiYgZGhjbGllbnQgJyArIGRldmljZS5pbnRlcmZhY2UsIChlcnIsIHN0ZG91dCwgc3RkZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2IoKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnRlc3RpbnRlcm5ldCgpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25uZWN0ZWQgPSB0cnVlXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2IoKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYigpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICB9LCAoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFjb25uZWN0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KCdubyBjb25uZWN0aW9uIGJ5IGEgZXRoZXJuZXQgZGV2aWNlJylcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSlcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBuZWVkIGFzeW5jIHRvIHByb2Nlc3MgZXZlcnlvbmVcblxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KCdubyBldGhlcm5ldCBkZXZpY2UnKVxuICAgICAgICAgICAgICAgICAgICB9XG5cblxuICAgICAgICAgICAgICAgIH0pXG5cbiAgICAgICAgICAgICAgICAvLyBjaGVjayBpZiBpdCBpcyBqdXN0IGNvbm5lY3RlZCBieSBldGgwXG4gICAgICAgICAgICAgICAgLy8gaWYgaXMgY29ubmVjdGVkIGFsbCBvay5cbiAgICAgICAgICAgICAgICAvLyBlbHNlIHRoYXQuZXRoZXJuZXRyZWNvbm5lY3QoZGV2aWNlKVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZWplY3QoJ2ludmFsaWQgZXRoZXJuZXQgY29uZicpXG5cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cblxuICAgIH1cblxuICAgIGV0aGVybmV0cmVjb25uZWN0KGRldmljZT86IGFueSkge1xuICAgICAgICBjb25zdCB0aGF0ID0gdGhpc1xuXG4gICAgfVxuXG4gICAgbW9iaWxlY29ubmVjdChib29sOiBib29sZWFuKSB7XG4gICAgICAgIGNvbnN0IHRoYXQgPSB0aGlzO1xuXG4gICAgICAgIGNvbnN0IFd2ID0gdGhhdC5tb2JpbGU7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTxib29sZWFuPihmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICBXdi5jb25maWd1cmUoYm9vbCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgV3YuY29ubmVjdCh0cnVlKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5tb2RlID0gJ3d2J1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIm1vZGVtIHN0YXJ0ZWRcIik7XG5cbiAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwibW9kZW0gZXJyb3JcIik7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuXG5cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pXG5cblxuXG5cbiAgICAgICAgfSk7XG5cbiAgICB9O1xuICAgIHdpZmlhdmFpbGFibGVzKCk6IFByb21pc2U8SVNjYW5bXT4ge1xuICAgICAgICBjb25zdCB0aGF0ID0gdGhpcztcblxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8SVNjYW5bXT4oZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgICAgY29uc3QgYXZhaWxhYmxlbmV0cyA9IFtdXG4gICAgICAgICAgICB0aGF0Lm5ldHdvcmtzKCkudGhlbigobmV0cykgPT4ge1xuICAgICAgICAgICAgICAgIF8ubWFwKG5ldHMsIChuZXQpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5ldC50eXBlID09PSBcIndpZmlcIiAmJiBuZXQuc2Nhbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgXy5tYXAobmV0LnNjYW4sIChzY2FubmVkb25lKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXZhaWxhYmxlbmV0cy5wdXNoKHNjYW5uZWRvbmUpXG4gICAgICAgICAgICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgcmVzb2x2ZShhdmFpbGFibGVuZXRzKVxuXG4gICAgICAgICAgICB9KS5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KGVycilcbiAgICAgICAgICAgIH0pXG5cblxuICAgICAgICB9KVxuXG4gICAgfVxuXG4gICAgd2lmaWNvbm5lY3RhYmxlcygpOiBQcm9taXNlPElTY2FuW10+IHtcbiAgICAgICAgY29uc3QgdGhhdCA9IHRoaXM7XG5cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPElTY2FuW10+KGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgIGNvbnN0IGNvbm5lY3RhYmxlcyA9IFtdXG4gICAgICAgICAgICBjb25zdCBXTSA9IHRoYXQud3BhbWFuYWdlcigpXG5cbiAgICAgICAgICAgIHRoYXQud2lmaWF2YWlsYWJsZXMoKS50aGVuKChzY2FucykgPT4ge1xuICAgICAgICAgICAgICAgIF8ubWFwKHNjYW5zLCAoc2Nhbm5lZG9uZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBfLm1hcChXTS5saXN0d3BhLCAod3BhKSA9PiB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh3cGEuc3NpZCA9PT0gc2Nhbm5lZG9uZS5lc3NpZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbm5lY3RhYmxlcy5wdXNoKHNjYW5uZWRvbmUpXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pXG5cbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIHJlc29sdmUoY29ubmVjdGFibGVzKVxuICAgICAgICAgICAgfSkuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICAgICAgICAgIHJlamVjdChlcnIpXG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuXG4gICAgfVxuXG5cblxuICAgIG5ldHdvcmtzKCk6IFByb21pc2U8SU5ldHdvcmtbXT4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8SU5ldHdvcmtbXT4oZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuXG4gICAgICAgICAgICBuZXR3KCkudGhlbihmdW5jdGlvbiAoYSkge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoYSlcbiAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICByZWplY3QoZXJyKVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICB9XG4gICAgbmV0d29yayhkZXZpY2VuYW1lOiBzdHJpbmcpOiBQcm9taXNlPElOZXR3b3JrPiB7XG4gICAgICAgIGNvbnN0IHRoYXQgPSB0aGlzO1xuICAgICAgICBsZXQgbmV0ZXhpc3RzOiBib29sZWFuID0gZmFsc2VcbiAgICAgICAgbGV0IG5ldHdvcmtpbnRlcmZhY2U6IElOZXR3b3JrO1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8SU5ldHdvcms+KGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcblxuICAgICAgICAgICAgdGhhdC5uZXR3b3JrcygpLnRoZW4oZnVuY3Rpb24gKGEpIHtcbiAgICAgICAgICAgICAgICBfLm1hcChhLCAobmV0KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghbmV0ZXhpc3RzICYmIG5ldC5pbnRlcmZhY2UgPT09IGRldmljZW5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ldGV4aXN0cyA9IHRydWVcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ldHdvcmtpbnRlcmZhY2UgPSBuZXRcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgaWYgKG5ldGV4aXN0cykge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKG5ldHdvcmtpbnRlcmZhY2UpXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KCdubyBuZXR3b3JrJylcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KGVycilcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgdGVzdGludGVybmV0KCkge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuXG4gICAgICAgICAgICB0ZXN0aW50ZXJuZXQoKS50aGVuKGZ1bmN0aW9uIChhKSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShhKVxuICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgIHJlamVjdChlcnIpXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgaG9zdGFwZGNvbmYoaGNvbmZpZzogSUhDb25mKSB7IC8vIHJlY29uZiBpcyBleHBlcmltZW50YWxcbiAgICAgICAgY29uc3QgdGhhdCA9IHRoaXNcbiAgICAgICAgaWYgKCFoY29uZmlnKSB7XG4gICAgICAgICAgICB0aHJvdyBFcnJvcignbm8gY29uZmlnIHByb3ZpZGVkIHRvIGNvbmZpZ3VyZSBob3N0YXBkY29uZicpXG5cblxuICAgICAgICB9IGVsc2Uge1xuXG4gICAgICAgICAgICB0aGF0Lmhvc3RhcGQgPSBuZXcgaG9zdGFwZHN3aXRjaChoY29uZmlnLCB0cnVlKTtcblxuXG4gICAgICAgIH1cblxuICAgIH1cblxuICAgIHdwYW1hbmFnZXIoKSB7XG4gICAgICAgIGNvbnN0IHBhdGggPSB0aGlzLmxpY29uZmlnLndwYXN1cHBsaWNhbnRfcGF0aDtcbiAgICAgICAgcmV0dXJuIG5ldyBXcGFtYW5hZ2VyKHRoaXMubGljb25maWcud3Bhc3VwcGxpY2FudF9wYXRoKTtcbiAgICB9XG5cblxuICAgIG1vYmlsZXByb3ZpZGVycygpIHtcblxuICAgICAgICByZXR1cm4gbmV3IFByb3ZpZGVycygpXG5cbiAgICB9XG5cbiAgICB3aWZpX3N3aXRjaChtb2RlOiBzdHJpbmcsIGRldj86IHN0cmluZykge1xuICAgICAgICBjb25zb2xlLmxvZyhtb2RlLCBkZXYpO1xuICAgICAgICBjb25zdCB0aGF0ID0gdGhpcztcbiAgICAgICAgY29uc3QgY29uZmlnID0gdGhhdC5saWNvbmZpZztcblxuICAgICAgICBpZiAoZGV2IHx8IHRoaXMubGljb25maWcud2lmaV9pbnRlcmZhY2UgIT09IFwiYXV0b1wiKSB7XG5cbiAgICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTxib29sZWFuPihmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG5cblxuICAgICAgICAgICAgICAgIGlmICghZGV2KSB7XG4gICAgICAgICAgICAgICAgICAgIGRldiA9IGNvbmZpZy53aWZpX2ludGVyZmFjZTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImRldiBtb2RlXCIpO1xuICAgICAgICAgICAgICAgIHRoYXQuaG9zdGFwZGNvbmYoe1xuICAgICAgICAgICAgICAgICAgICBpbnRlcmZhY2U6IGRldixcbiAgICAgICAgICAgICAgICAgICAgd3Bhc3VwcGxpY2FudF9wYXRoOiBjb25maWcud3Bhc3VwcGxpY2FudF9wYXRoLFxuICAgICAgICAgICAgICAgICAgICBob3N0YXBkOiBjb25maWcuaG9zdGFwZFxuICAgICAgICAgICAgICAgIH0pXG5cbiAgICAgICAgICAgICAgICBzd2l0Y2ggKG1vZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcImFwXCI6XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lmhvc3RhcGQuYXAoKS50aGVuKGZ1bmN0aW9uIChhbnN3ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lm1vZGUgPSAnYXAnXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcImhvc3RcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuaG9zdGFwZC5ob3N0KCkudGhlbihmdW5jdGlvbiAoYW5zd2VyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5tb2RlID0gJ2hvc3QnXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcImNsaWVudFwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5ob3N0YXBkLmNsaWVudCgpLnRoZW4oZnVuY3Rpb24gKGFuc3dlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQubW9kZSA9ICdjbGllbnQnXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJhdXRvIG1vZGVcIik7XG4gICAgICAgICAgICBjb25zdCBjb25maWcgPSB0aGlzLmxpY29uZmlnO1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgICAgICBuZXR3KCkudGhlbihmdW5jdGlvbiAobmV0d29ya3MpIHtcblxuICAgICAgICAgICAgICAgICAgICBfLm1hcChuZXR3b3JrcywgZnVuY3Rpb24gKGRldmljZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRldmljZS50eXBlID09PSBcIndpZmlcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRldiA9IGRldmljZS5pbnRlcmZhY2U7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZGV2KSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuaG9zdGFwZGNvbmYoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGludGVyZmFjZTogZGV2LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhvc3RhcGQ6IGNvbmZpZy5ob3N0YXBkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdwYXN1cHBsaWNhbnRfcGF0aDogY29uZmlnLndwYXN1cHBsaWNhbnRfcGF0aFxuICAgICAgICAgICAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2codGhhdC5ob3N0YXBkKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgc3dpdGNoIChtb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBcImFwXCI6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuaG9zdGFwZC5hcCgpLnRoZW4oZnVuY3Rpb24gKGFuc3dlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5tb2RlID0gJ2FwJ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgXCJob3N0XCI6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuaG9zdGFwZC5ob3N0KCkudGhlbihmdW5jdGlvbiAoYW5zd2VyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lm1vZGUgPSAnaG9zdCdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFwiY2xpZW50XCI6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuaG9zdGFwZC5jbGllbnQoKS50aGVuKGZ1bmN0aW9uIChhbnN3ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQubW9kZSA9ICdjbGllbnQnXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoeyBlcnJvcjogXCJubyBkZXZcIiB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG5cblxuXG5cblxuICAgIGNvbm5lY3Rpb24oKSB7XG4gICAgICAgIGNvbnN0IHRoYXQgPSB0aGlzO1xuICAgICAgICBjb25zdCByZWNvdmVyeSA9IHRoYXQubGljb25maWcucmVjb3ZlcnlcblxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgICAgdmVyYih0aGF0LmxpY29uZmlnLCBcImRlYnVnXCIsIFwiVHJ5bmcgdG8gY29ubmVjdFwiKTtcblxuICAgICAgICAgICAgaWYgKHRoYXQubW9kZSA9PT0gXCJ3dlwiKSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KFwiYXV0byBtb2RlXCIpXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJ3diBydW5uaW5nLCBub3RoaW5nIHRvIGRvXCIpXG4gICAgICAgICAgICB9IGVsc2Uge1xuXG5cbiAgICAgICAgICAgICAgICB0aGF0LnRlc3RpbnRlcm5ldCgpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHRydWUpXG4gICAgICAgICAgICAgICAgfSkuY2F0Y2goKGVycikgPT4ge1xuXG5cbiAgICAgICAgICAgICAgICAgICAgdGhhdC5ldGhlcm5ldGNvbm5lY3QoKS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdjb25uZWN0ZWQgYnkgZXRoZXJuZXQnKVxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKVxuXG4gICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKCgpID0+IHtcblxuICAgICAgICAgICAgICAgICAgICAgICAgZ2V0d2lmaWludGVyZmEodGhhdC5saWNvbmZpZy53aWZpX2ludGVyZmFjZSkudGhlbihmdW5jdGlvbiAoaW50ZXJmKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB3aWZpX2V4aXN0OiBzdHJpbmcgPSBpbnRlcmYuaW50ZXJmYWNlO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY29uZmhhcGRzID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnRlcmZhY2U6IHdpZmlfZXhpc3QsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdwYXN1cHBsaWNhbnRfcGF0aDogdGhhdC5saWNvbmZpZy53cGFzdXBwbGljYW50X3BhdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhvc3RhcGQ6IHRoYXQubGljb25maWcuaG9zdGFwZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAod2lmaV9leGlzdCkge1xuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmVyYih3aWZpX2V4aXN0LCBcImluZm9cIiwgXCJXbGFuIGludGVyZmFjZSBmb3VuZGVkXCIpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuaG9zdGFwZGNvbmYoY29uZmhhcGRzKVxuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5ob3N0YXBkLmNsaWVudCh0cnVlKS50aGVuKGZ1bmN0aW9uIChhbnN3ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQubW9kZSA9ICdjbGllbnQnXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHsgY29uZWN0aW9uOiB0cnVlLCByZWNvdmVyeTogZmFsc2UgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcblxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhhdC5saWNvbmZpZy5tb2JpbGUpIHtcblxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5tb2JpbGUuY29uZmlndXJlKCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQubW9kZSA9IFwid3ZcIjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJtb2RlbSBzdGFydGVkXCIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQubW9iaWxlLmNvbm5lY3QodHJ1ZSkudGhlbihmdW5jdGlvbiAoYSkge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBod3Jlc3RhcnQoXCJ1bnBsdWdcIilcblxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwibW9kZW0gZXJyb3JcIilcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaHdyZXN0YXJ0KFwidW5wbHVnXCIpXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJtb2RlbSBlcnJvclwiKVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGh3cmVzdGFydChcInVucGx1Z1wiKVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cblxuXG5cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZWNvdmVyeSAmJiB3aWZpX2V4aXN0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5yZWNvdmVyeSh0cnVlKS50aGVuKGZ1bmN0aW9uIChhbnN3ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmVyYihhbnN3ZXIsIFwiaW5mb1wiLCBcIkxJTkVUV09SS0lORyByZWNvdmVyeSBtb2RlIHN0YXJ0XCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXRoYXQubGljb25maWcubW9iaWxlKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHNjYW5uZXQgPSBzZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2NoZWNrIGZvciBhdmFpbGFibGVzIG5ldHdvcmtzJylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0LndpZmljb25uZWN0YWJsZXMoKS50aGVuKChuZXRzKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuZXRzLmxlbmd0aCA+IDApIHtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5ob3N0YXBkLmNsaWVudCh0cnVlKS50aGVuKGZ1bmN0aW9uIChhbnN3ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lm1vZGUgPSAnY2xpZW50J1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwoc2Nhbm5ldClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnY29ubmVjdGVkJylcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoeyBjb25lY3Rpb246IHRydWUsIHJlY292ZXJ5OiBmYWxzZSB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnbm8gd29ya2luZyBuZXR3b3JrcyBmb3Igbm93JylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnJlY292ZXJ5KHRydWUpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ25vIGtud293biB3bGFuIGF2YWlsYWJsZSwgd2FpdGluZyBmb3IgbmV0d29ya3MnKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSwgOTAwMDApXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2ZXJiKGVyciwgXCJlcnJvclwiLCBcIkxJTkVUV09SS0lORyByZWNvdmVyeSBtb2RlIGVycm9yXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoJ3JlY292ZXJ5IG1vZGUgZXJyb3InKVxuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ25vdCBjb25uZWN0ZWQnKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdCgnbm90IGNvbm5lY3RlZCcpXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG5cblxuICAgICAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmVyYihcIm5vIHdpZmlcIiwgXCJ3YXJuXCIsIFwibmV0d29ya2VyXCIpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoYXQubGljb25maWcubW9iaWxlKSB7XG5cblxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQubW9iaWxlLmNvbmZpZ3VyZSgpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5tb2RlID0gXCJ3dlwiO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5tb2JpbGUuY29ubmVjdCh0cnVlKS50aGVuKGZ1bmN0aW9uIChhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBod3Jlc3RhcnQoXCJ1bnBsdWdcIilcblxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGUpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJtb2RlbSBlcnJvclwiKVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaHdyZXN0YXJ0KFwidW5wbHVnXCIpXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwibW9kZW0gZXJyb3JcIilcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaHdyZXN0YXJ0KFwidW5wbHVnXCIpXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwibm8gd2lmaSEhPz8/XCIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGh3cmVzdGFydChcInVucGx1Z1wiKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cblxuXG4gICAgICAgICAgICAgICAgICAgIH0pXG5cblxuXG5cblxuICAgICAgICAgICAgICAgIH0pXG5cblxuXG5cblxuXG5cbiAgICAgICAgICAgIH1cblxuXG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICByZWNvdmVyeShmb3JjZT86IHRydWUpIHtcbiAgICAgICAgY29uc3QgY29uZmlnID0gdGhpcy5saWNvbmZpZztcbiAgICAgICAgY29uc3QgdGhhdCA9IHRoaXM7XG5cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgIHJlY292ZXJ5Y2hlY2soY29uZmlnKS50aGVuKGZ1bmN0aW9uIChhKSB7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBpbnRlcmYgPSBhLmRldmljZVxuICAgICAgICAgICAgICAgIGlmIChmb3JjZSB8fCAhYS5rbm93bl9uZXR3b3Jrcykge1xuXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdyZWNvdmVyeW5nICcgKyBhLmRldmljZS5pbnRlcmZhY2UpXG5cbiAgICAgICAgICAgICAgICAgICAgdGhhdC5ob3N0YXBkY29uZih7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbnRlcmZhY2U6IGEuZGV2aWNlLmludGVyZmFjZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHdwYXN1cHBsaWNhbnRfcGF0aDogdGhhdC5saWNvbmZpZy53cGFzdXBwbGljYW50X3BhdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICBob3N0YXBkOiB0aGF0LmxpY29uZmlnLmhvc3RhcGRcbiAgICAgICAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgICAgICAgICByZWNvdmVyeV9tb2RlKHRoYXQuaG9zdGFwZCkudGhlbihmdW5jdGlvbiAoYW5zd2VyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lm1vZGUgPSBhbnN3ZXI7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGFuc3dlcik7XG4gICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdCgndHJ5IGNsaWVudCBvciBmb3JjZScpXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxufTtcblxuXG5cblxuXG5cbiJdfQ==
