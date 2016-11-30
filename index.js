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
                                    if (that.liconfig.mobile) {
                                        that.mobileconnect();
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
                                                            that.hostapd.listwificlients().then(function (a) {
                                                                if (a.length === 0) {
                                                                    that.recovery(true);
                                                                }
                                                            }).catch(function (err) {
                                                                console.log(err);
                                                            });
                                                            console.log('no knwown wlan available, waiting for networks');
                                                        }
                                                    }).catch(function (err) {
                                                        console.log(err);
                                                    });
                                                }, 120000);
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
                                that.mobileconnect();
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QyxDQUFDO1FBQ1AsQ0FBQyxDQUFDLENBQUM7SUFDUCxDQUFDOztJQUVMLGdCQUFDO0FBQUQsQ0Fwa0JBLEFBb2tCQyxJQUFBO0FBcGtCRDsyQkFva0JDLENBQUE7QUFBQSxDQUFDIiwiZmlsZSI6ImluZGV4LmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgUHJvbWlzZSBmcm9tIFwiYmx1ZWJpcmRcIjtcbmltcG9ydCAqIGFzIGZzIGZyb20gXCJmc1wiO1xuaW1wb3J0ICogYXMgY2hpbGRfcHJvY2VzcyBmcm9tIFwiY2hpbGRfcHJvY2Vzc1wiO1xuaW1wb3J0ICogYXMgXyBmcm9tIFwibG9kYXNoXCI7XG5pbXBvcnQgKiBhcyBhc3luYyBmcm9tIFwiYXN5bmNcIjtcbmltcG9ydCBQcm92aWRlcnMgPSByZXF1aXJlKFwibW9iaWxlLXByb3ZpZGVyc1wiKTtcbmltcG9ydCBXcGFtYW5hZ2VyIGZyb20gXCJ3cGFzdXBwbGljYW50LW1hbmFnZXJcIjtcbmltcG9ydCBob3N0YXBkc3dpdGNoIGZyb20gXCJob3N0YXBkX3N3aXRjaFwiO1xuaW1wb3J0IHRlc3RpbnRlcm5ldCBmcm9tIFwicHJvbWlzZS10ZXN0LWNvbm5lY3Rpb25cIjtcbmltcG9ydCBtZXJnZSBmcm9tIFwianNvbi1hZGRcIjtcbmltcG9ydCBXdmRpYWwgZnJvbSBcInd2ZGlhbGpzXCI7XG5cblxuXG5pbXBvcnQgbmV0dyBmcm9tIFwibmV0d1wiO1xuY29uc3QgdmVyYiA9IHJlcXVpcmUoXCJ2ZXJib1wiKTtcbmNvbnN0IGh3cmVzdGFydCA9IHJlcXVpcmUoXCJod3Jlc3RhcnRcIik7XG5cblxuaW50ZXJmYWNlIElXaWZpQ2xpZW50IHtcbiAgICBtYWM6IHN0cmluZztcbiAgICBzaWduYWw6IHN0cmluZztcbiAgICBzaWduYWxNaW4/OiBzdHJpbmc7XG4gICAgc2lnbmFsTWF4Pzogc3RyaW5nO1xuXG59XG5cbmludGVyZmFjZSBJUHJvdmlkZXIge1xuXG4gICAgbGFiZWw/OiBzdHJpbmc7XG4gICAgYXBuOiBzdHJpbmc7XG4gICAgcGhvbmU/OiBzdHJpbmdcbiAgICB1c2VybmFtZT86IHN0cmluZztcbiAgICBwYXNzd29yZD86IHN0cmluZztcblxufVxuXG5pbnRlcmZhY2UgSUdsb2JhbFByb3ZpZGVycyB7XG5cbiAgICBjb3VudHJ5OiBzdHJpbmc7XG4gICAgcHJvdmlkZXJzOiBJUHJvdmlkZXJbXTtcbn1cblxuXG50eXBlIEltb2RlID0gJ2FwJyB8ICdob3N0JyB8ICdjbGllbnQnIHwgJ3VubWFuYWdlZCcgfCAnd3YnIHwgJ2V0aGVybmV0J1xuXG5cbmludGVyZmFjZSBJU2NhbiB7XG4gICAgZXNzaWQ6IHN0cmluZztcbiAgICBtYWM6IHN0cmluZztcbiAgICBzaWduYWw6IHN0cmluZztcbn1cblxudHlwZSBJTmV0d29ya1R5cGUgPSAnd2lmaScgfCAnd2lyZWQnXG5cbmludGVyZmFjZSBJTmV0d29yayB7XG4gICAgdHlwZTogSU5ldHdvcmtUeXBlO1xuICAgIG1hYzogc3RyaW5nO1xuICAgIGludGVyZmFjZTogc3RyaW5nO1xuICAgIGVzc2lkPzogc3RyaW5nO1xuICAgIHNjYW4/OiBJU2NhbltdO1xuICAgIGlwPzogc3RyaW5nO1xuICAgIGdhdGV3YXk/OiBzdHJpbmc7XG59XG5cbmludGVyZmFjZSBDbGFzc09wdCB7XG4gICAgd2lmaV9pbnRlcmZhY2U/OiBzdHJpbmc7XG4gICAgbW9iaWxlPzogSU1vYmlsZTtcbiAgICBob3N0YXBkPzogSUhvc3RhcGRjZjtcbiAgICB3cGFzdXBwbGljYW50X3BhdGg/OiBzdHJpbmc7XG59XG5pbnRlcmZhY2UgSU1vYmlsZSB7XG4gICAgcHJvdmlkZXI6IElQcm92aWRlcjtcbiAgICBkZXZpY2U/OiBhbnk7XG4gICAgY29uZmlnRmlsZVBhdGg/OiBzdHJpbmc7XG5cbn1cblxuaW50ZXJmYWNlIElFdGhlcm5ldCB7XG4gICAgaW50ZXJmYWNlOiBzdHJpbmc7XG4gICAgZGhjcD86IHtcbiAgICAgICAgaXA/OiBzdHJpbmc7XG4gICAgICAgIGdhdGV3YXk/OiBzdHJpbmc7XG4gICAgICAgIG5ldG1hc2s/OiBzdHJpbmc7XG4gICAgICAgIGJjYXN0Pzogc3RyaW5nO1xuICAgIH1cbn1cblxuaW50ZXJmYWNlIElMaU5ldHdvcmtDb25mIHtcbiAgICB3aWZpX2ludGVyZmFjZTogc3RyaW5nO1xuICAgIG1vYmlsZT86IElNb2JpbGU7XG4gICAgaG9zdGFwZDogSUhvc3RhcGQ7XG4gICAgd3Bhc3VwcGxpY2FudF9wYXRoPzogc3RyaW5nO1xuICAgIGV0aGVybmV0PzogSUV0aGVybmV0W10sXG4gICAgcmVjb3Zlcnk6IGJvb2xlYW5cbn1cbmludGVyZmFjZSBJTGlOZXR3b3JrQ29uZlBhcmFtcyB7XG4gICAgd2lmaV9pbnRlcmZhY2U/OiBzdHJpbmc7XG4gICAgbW9iaWxlPzogSU1vYmlsZTtcbiAgICBob3N0YXBkPzogSUhvc3RhcGQ7XG4gICAgd3Bhc3VwcGxpY2FudF9wYXRoPzogc3RyaW5nO1xuICAgIGV0aGVybmV0Pzoge1xuICAgICAgICBpbnRlcmZhY2U6IHN0cmluZztcbiAgICAgICAgZGhjcD86IHtcbiAgICAgICAgICAgIGlwPzogc3RyaW5nO1xuICAgICAgICAgICAgZ2F0ZXdheT86IHN0cmluZztcbiAgICAgICAgICAgIG5ldG1hc2s/OiBzdHJpbmc7XG4gICAgICAgICAgICBiY2FzdD86IHN0cmluZztcbiAgICAgICAgfVxuICAgIH0sXG4gICAgcmVjb3Zlcnk/OiB0cnVlXG59XG5cbmludGVyZmFjZSBJSG9zdGFwZCB7XG4gICAgZHJpdmVyOiBzdHJpbmc7XG4gICAgc3NpZDogc3RyaW5nO1xuICAgIHdwYV9wYXNzcGhyYXNlOiBhbnk7XG59O1xuaW50ZXJmYWNlIElIb3N0YXBkY2Yge1xuICAgIGRyaXZlcj86IHN0cmluZztcbiAgICBzc2lkOiBzdHJpbmc7XG4gICAgd3BhX3Bhc3NwaHJhc2U6IGFueTtcbn07XG5cbmludGVyZmFjZSBJSG9zdGFwZENmIHtcbiAgICBkcml2ZXI/OiBzdHJpbmc7XG4gICAgc3NpZD86IHN0cmluZztcbiAgICB3cGFfcGFzc3BocmFzZT86IHN0cmluZztcbn07XG5cbmludGVyZmFjZSBJRG5zbWFzcSB7XG4gICAgaW50ZXJmYWNlOiBzdHJpbmc7XG59O1xuaW50ZXJmYWNlIElEbnNtYXNxQ2Yge1xuICAgIGludGVyZmFjZT86IHN0cmluZztcbn07XG5pbnRlcmZhY2UgSUhDb25mIHtcbiAgICBpbnRlcmZhY2U/OiBzdHJpbmc7XG4gICAgd3Bhc3VwcGxpY2FudF9wYXRoPzogc3RyaW5nO1xuICAgIGhvc3RhcGQ/OiBJSG9zdGFwZENmO1xuICAgIHJlZGlyZWN0PzogYm9vbGVhbjtcbiAgICBkbnNtYXNxPzogSURuc21hc3FDZjtcbn07XG5cbmludGVyZmFjZSBJQ29ubmVjdGlvbiB7XG5cbiAgICBsaW5rVHlwZTogc3RyaW5nO1xuICAgIGludGVyZmFjZTogc3RyaW5nO1xuICAgIGlwPzogc3RyaW5nO1xuICAgIGdhdGV3YXk/OiBzdHJpbmc7XG5cbn1cblxuaW50ZXJmYWNlIElJbml0IHtcbiAgICBjb25lY3Rpb246IGJvb2xlYW47XG4gICAgcmVjb3Zlcnk6IGJvb2xlYW47XG4gICAgZGV0YWlscz86IElDb25uZWN0aW9uO1xufVxuXG5cblxuXG5mdW5jdGlvbiBnZXR3aWZpaW50ZXJmYShzZXR0ZWQ/OiBzdHJpbmcpOiBQcm9taXNlPElOZXR3b3JrPiB7XG5cbiAgICByZXR1cm4gbmV3IFByb21pc2U8SU5ldHdvcms+KGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgbGV0IHdpZmlfZXhpc3Q6IGJvb2xlYW4gPSBmYWxzZTtcbiAgICAgICAgbGV0IGRldmk6IElOZXR3b3JrO1xuICAgICAgICBuZXR3KCkudGhlbihmdW5jdGlvbiAobmV0d29ya3MpIHtcblxuICAgICAgICAgICAgXy5tYXAobmV0d29ya3MsIGZ1bmN0aW9uIChkZXZpY2UpIHtcblxuICAgICAgICAgICAgICAgIGlmIChkZXZpY2UudHlwZSA9PT0gXCJ3aWZpXCIgJiYgIXdpZmlfZXhpc3QgJiYgKCFzZXR0ZWQgfHwgc2V0dGVkID09PSBcImF1dG9cIiB8fCBzZXR0ZWQgPT09IGRldmljZS5pbnRlcmZhY2UpKSB7XG4gICAgICAgICAgICAgICAgICAgIHdpZmlfZXhpc3QgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBkZXZpID0gZGV2aWNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBpZiAod2lmaV9leGlzdCkge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoZGV2aSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlamVjdCh7IGVycm9yOiBcImRldmljZSBub3QgZm91bmRlZFwiIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICB9KTtcblxuICAgIH0pO1xuXG59XG5cblxuZnVuY3Rpb24gcmVjb3ZlcnlfbW9kZShhcHN3aXRjaCk6IFByb21pc2U8SW1vZGU+IHtcblxuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlPEltb2RlPihmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG5cbiAgICAgICAgYXBzd2l0Y2guaG9zdCgpLnRoZW4oZnVuY3Rpb24gKGFuc3dlcikge1xuICAgICAgICAgICAgdmVyYihhbnN3ZXIsIFwid2FyblwiLCBcImxpbmV0d29yayByZWNvdmVyeSBtb2RlIFwiKTtcbiAgICAgICAgICAgIHJlc29sdmUoJ2hvc3QnKTtcbiAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgdmVyYihlcnIsIFwiZXJyb3JcIiwgXCJsaW5ldHdvcmsgcmVjb3ZlcnkgbW9kZSBmYWlsZWRcIik7XG4gICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG59XG5cblxuZnVuY3Rpb24gcmVjb3ZlcnljaGVjayhjb25maWc6IElMaU5ldHdvcmtDb25mKTogUHJvbWlzZTx7IGRldmljZTogSU5ldHdvcmssIGtub3duX25ldHdvcmtzOiBib29sZWFuIH0+IHtcblxuICAgIHJldHVybiBuZXcgUHJvbWlzZTx7IGRldmljZTogSU5ldHdvcmssIGtub3duX25ldHdvcmtzOiBib29sZWFuIH0+KGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcblxuICAgICAgICBsZXQgc29tZW5ldHdvcmtfZXhpc3RzOiBib29sZWFuID0gZmFsc2U7XG4gICAgICAgIGxldCB3bGFuX2V4aXN0czogYm9vbGVhbiA9IGZhbHNlO1xuXG4gICAgICAgIGxldCBkZXZpOiBJTmV0d29yaztcblxuICAgICAgICBuZXR3KCkudGhlbihmdW5jdGlvbiAobmV0d29ya3MpIHtcblxuICAgICAgICAgICAgXy5tYXAobmV0d29ya3MsIGZ1bmN0aW9uIChkZXZpY2UpIHtcblxuICAgICAgICAgICAgICAgIGlmIChkZXZpY2Uuc2NhbiAmJiBkZXZpY2UudHlwZSA9PT0gXCJ3aWZpXCIgJiYgIXNvbWVuZXR3b3JrX2V4aXN0cyAmJiAoIWNvbmZpZy53aWZpX2ludGVyZmFjZSB8fCBjb25maWcud2lmaV9pbnRlcmZhY2UgPT09IFwiYXV0b1wiIHx8IGNvbmZpZy53aWZpX2ludGVyZmFjZSA9PT0gZGV2aWNlLmludGVyZmFjZSkpIHtcblxuICAgICAgICAgICAgICAgICAgICBjb25zdCBXTSA9IG5ldyBXcGFtYW5hZ2VyKGNvbmZpZy53cGFzdXBwbGljYW50X3BhdGgpXG5cbiAgICAgICAgICAgICAgICAgICAgXy5tYXAoZGV2aWNlLnNjYW4sIGZ1bmN0aW9uIChuZXRzY2FuOiBJU2Nhbikge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBfLm1hcChXTS5saXN0d3BhLCBmdW5jdGlvbiAod3BhaXRlbSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh3cGFpdGVtLnNzaWQgPT09IG5ldHNjYW4uZXNzaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc29tZW5ldHdvcmtfZXhpc3RzID0gdHJ1ZTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICghd2xhbl9leGlzdHMgJiYgZGV2aWNlLnR5cGUgPT09IFwid2lmaVwiICYmICghY29uZmlnLndpZmlfaW50ZXJmYWNlIHx8IGNvbmZpZy53aWZpX2ludGVyZmFjZSA9PT0gXCJhdXRvXCIgfHwgY29uZmlnLndpZmlfaW50ZXJmYWNlID09PSBkZXZpY2UuaW50ZXJmYWNlKSkge1xuICAgICAgICAgICAgICAgICAgICB3bGFuX2V4aXN0cyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGRldmkgPSBkZXZpY2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGlmICghc29tZW5ldHdvcmtfZXhpc3RzICYmIHdsYW5fZXhpc3RzKSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7IGRldmljZTogZGV2aSwga25vd25fbmV0d29ya3M6IGZhbHNlIH0pO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh3bGFuX2V4aXN0cykge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoeyBkZXZpY2U6IGRldmksIGtub3duX25ldHdvcmtzOiB0cnVlIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZWplY3QoJ25vIGludGVyZmFjZScpXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgcmVqZWN0KHsgZXJyb3I6IGVyciwgZGVzY3JpcHRpb246ICduZXR3IGVycicgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgfSk7XG5cblxufVxuXG5cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTGlOZXR3b3JrIHtcbiAgICBsaWNvbmZpZzogSUxpTmV0d29ya0NvbmY7XG4gICAgaG9zdGFwZDogaG9zdGFwZHN3aXRjaDtcbiAgICBtb2JpbGU6IFd2ZGlhbDtcbiAgICBtb2RlOiBJbW9kZTtcbiAgICBpc0Nvbm5lY3RlZDogYm9vbGVhbjtcblxuXG4gICAgY29uc3RydWN0b3IoZGF0YTogSUxpTmV0d29ya0NvbmZQYXJhbXMpIHtcblxuXG4gICAgICAgIGNvbnN0IGNvbmZpZzogSUxpTmV0d29ya0NvbmYgPSB7XG4gICAgICAgICAgICBob3N0YXBkOiB7XG4gICAgICAgICAgICAgICAgZHJpdmVyOiBcIm5sODAyMTFcIixcbiAgICAgICAgICAgICAgICBzc2lkOiBcInRlc3R0dGFwXCIsXG4gICAgICAgICAgICAgICAgd3BhX3Bhc3NwaHJhc2U6IFwidGVzdHBhc3NcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHdpZmlfaW50ZXJmYWNlOiBcImF1dG9cIixcbiAgICAgICAgICAgIHdwYXN1cHBsaWNhbnRfcGF0aDogXCIvZXRjL3dwYV9zdXBwbGljYW50L3dwYV9zdXBwbGljYW50LmNvbmZcIixcbiAgICAgICAgICAgIGV0aGVybmV0OiBbe1xuICAgICAgICAgICAgICAgIGludGVyZmFjZTogJ2V0aDAnXG4gICAgICAgICAgICB9XSxcbiAgICAgICAgICAgIHJlY292ZXJ5OiB0cnVlXG4gICAgICAgIH07XG5cbiAgICAgICAgbWVyZ2UoY29uZmlnLCBkYXRhKTsgLy8gY29tYmluZSBkZWZhdWx0IHNldHRpbmdzIHdpdGggbmV3IHBhcmFtZXRlcnMgZnJvbSBkYXRhXG4gICAgICAgIHRoaXMubW9kZSA9ICd1bm1hbmFnZWQnXG5cbiAgICAgICAgdGhpcy5saWNvbmZpZyA9IGNvbmZpZztcblxuXG4gICAgICAgIGlmICh0aGlzLmxpY29uZmlnLm1vYmlsZSkge1xuICAgICAgICAgICAgaWYgKCF0aGlzLmxpY29uZmlnLm1vYmlsZS5jb25maWdGaWxlUGF0aCkgdGhpcy5saWNvbmZpZy5tb2JpbGUuY29uZmlnRmlsZVBhdGggPSBcIi9ldGMvd3ZkaWFsLmNvbmZcIjtcblxuICAgICAgICAgICAgdGhpcy5tb2JpbGUgPSBuZXcgV3ZkaWFsKHRoaXMubGljb25maWcubW9iaWxlKVxuICAgICAgICB9XG5cblxuICAgIH1cblxuXG5cbiAgICBldGhlcm5ldGNvbm5lY3QoZGV2aWNlbmFtZT86IHN0cmluZyk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgICAgICBjb25zdCB0aGF0ID0gdGhpc1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8Ym9vbGVhbj4oZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgICAgaWYgKHRoYXQubGljb25maWcuZXRoZXJuZXQpIHtcblxuICAgICAgICAgICAgICAgIGNvbnN0IGNvbm5lY3Rpb25kZXZpY2VzYXJyYXk6IElOZXR3b3JrW10gPSBbXTtcblxuICAgICAgICAgICAgICAgIGxldCBkZXZpY2VleGlzdHM6IGJvb2xlYW4gPSBmYWxzZVxuICAgICAgICAgICAgICAgIGxldCBkZXZpY2U6IElOZXR3b3JrO1xuICAgICAgICAgICAgICAgIC8vIGNoZWVjayBjb25maWd1cmF0aW9uXG4gICAgICAgICAgICAgICAgbmV0dygpLnRoZW4oKGEpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgXy5tYXAoYSwgKG5ldCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgXy5tYXAodGhhdC5saWNvbmZpZy5ldGhlcm5ldCwgKG5ldGludGVyZmFjZWNvbmZpZ3VyZWQpID0+IHtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuZXQudHlwZSA9PT0gJ3dpcmVkJyAmJiAoKCFkZXZpY2VuYW1lICYmIG5ldC5pbnRlcmZhY2UgPT09IG5ldGludGVyZmFjZWNvbmZpZ3VyZWQuaW50ZXJmYWNlKSB8fCBkZXZpY2VuYW1lID09PSBuZXQuaW50ZXJmYWNlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXZpY2VleGlzdHMgPSB0cnVlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRldmljZSA9IG5ldFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25uZWN0aW9uZGV2aWNlc2FycmF5LnB1c2gobmV0KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgICAgICAgICBpZiAoZGV2aWNlZXhpc3RzKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBjb25uZWN0ZWQ6IGJvb2xlYW4gPSBmYWxzZTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgYXN5bmMuZWFjaFNlcmllcyhjb25uZWN0aW9uZGV2aWNlc2FycmF5LCAoZGV2aWNlLCBjYikgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghY29ubmVjdGVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNoaWxkX3Byb2Nlc3MuZXhlYygnaWZjb25maWcgJyArIGRldmljZS5pbnRlcmZhY2UgKyAnIGRvd24gJiYgaWZjb25maWcgJyArIGRldmljZS5pbnRlcmZhY2UgKyAnIHVwJywgKGVyciwgc3Rkb3V0LCBzdGRlcnIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYigpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQudGVzdGludGVybmV0KCkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbm5lY3RlZCA9IHRydWVcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYigpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNiKClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIH0sIChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWNvbm5lY3RlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoJ25vIGNvbm5lY3Rpb24gYnkgYSBldGhlcm5ldCBkZXZpY2UnKVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIG5lZWQgYXN5bmMgdG8gcHJvY2VzcyBldmVyeW9uZVxuXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoJ25vIGV0aGVybmV0IGRldmljZScpXG4gICAgICAgICAgICAgICAgICAgIH1cblxuXG4gICAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgICAgIC8vIGNoZWNrIGlmIGl0IGlzIGp1c3QgY29ubmVjdGVkIGJ5IGV0aDBcbiAgICAgICAgICAgICAgICAvLyBpZiBpcyBjb25uZWN0ZWQgYWxsIG9rLlxuICAgICAgICAgICAgICAgIC8vIGVsc2UgdGhhdC5ldGhlcm5ldHJlY29ubmVjdChkZXZpY2UpXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlamVjdCgnaW52YWxpZCBldGhlcm5ldCBjb25mJylcblxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuXG4gICAgfVxuXG4gICAgZXRoZXJuZXRyZWNvbm5lY3QoZGV2aWNlPzogYW55KSB7XG4gICAgICAgIGNvbnN0IHRoYXQgPSB0aGlzXG5cbiAgICB9XG5cbiAgICBtb2JpbGVjb25uZWN0KHJlc2V0PzogYm9vbGVhbikge1xuICAgICAgICBjb25zdCB0aGF0ID0gdGhpc1xuICAgICAgICB0aGF0Lm1vYmlsZS5jb25maWd1cmUocmVzZXQpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhhdC5tb2RlID0gXCJ3dlwiO1xuICAgICAgICAgICAgdGhhdC5tb2JpbGUuY29ubmVjdCh0cnVlKS50aGVuKGZ1bmN0aW9uIChhKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYSlcbiAgICAgICAgICAgICAgICBod3Jlc3RhcnQoXCJ1bnBsdWdcIilcblxuXG4gICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGUpXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJtb2RlbSBlcnJvclwiKVxuXG4gICAgICAgICAgICAgICAgaHdyZXN0YXJ0KFwidW5wbHVnXCIpXG5cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coZSlcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwibW9kZW0gZXJyb3JcIilcblxuICAgICAgICAgICAgaHdyZXN0YXJ0KFwidW5wbHVnXCIpXG5cbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICB3aWZpYXZhaWxhYmxlcygpOiBQcm9taXNlPElTY2FuW10+IHtcbiAgICAgICAgY29uc3QgdGhhdCA9IHRoaXM7XG5cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPElTY2FuW10+KGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgIGNvbnN0IGF2YWlsYWJsZW5ldHMgPSBbXVxuICAgICAgICAgICAgdGhhdC5uZXR3b3JrcygpLnRoZW4oKG5ldHMpID0+IHtcbiAgICAgICAgICAgICAgICBfLm1hcChuZXRzLCAobmV0KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChuZXQudHlwZSA9PT0gXCJ3aWZpXCIgJiYgbmV0LnNjYW4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIF8ubWFwKG5ldC5zY2FuLCAoc2Nhbm5lZG9uZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF2YWlsYWJsZW5ldHMucHVzaChzY2FubmVkb25lKVxuICAgICAgICAgICAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIHJlc29sdmUoYXZhaWxhYmxlbmV0cylcblxuICAgICAgICAgICAgfSkuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICAgICAgICAgIHJlamVjdChlcnIpXG4gICAgICAgICAgICB9KVxuXG5cbiAgICAgICAgfSlcblxuICAgIH1cblxuICAgIHdpZmljb25uZWN0YWJsZXMoKTogUHJvbWlzZTxJU2NhbltdPiB7XG4gICAgICAgIGNvbnN0IHRoYXQgPSB0aGlzO1xuXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTxJU2NhbltdPihmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICBjb25zdCBjb25uZWN0YWJsZXMgPSBbXVxuICAgICAgICAgICAgY29uc3QgV00gPSB0aGF0LndwYW1hbmFnZXIoKVxuXG4gICAgICAgICAgICB0aGF0LndpZmlhdmFpbGFibGVzKCkudGhlbigoc2NhbnMpID0+IHtcbiAgICAgICAgICAgICAgICBfLm1hcChzY2FucywgKHNjYW5uZWRvbmUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgXy5tYXAoV00ubGlzdHdwYSwgKHdwYSkgPT4ge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAod3BhLnNzaWQgPT09IHNjYW5uZWRvbmUuZXNzaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25uZWN0YWJsZXMucHVzaChzY2FubmVkb25lKVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICByZXNvbHZlKGNvbm5lY3RhYmxlcylcbiAgICAgICAgICAgIH0pLmNhdGNoKChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICByZWplY3QoZXJyKVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcblxuICAgIH1cblxuXG5cbiAgICBuZXR3b3JrcygpOiBQcm9taXNlPElOZXR3b3JrW10+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPElOZXR3b3JrW10+KGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcblxuICAgICAgICAgICAgbmV0dygpLnRoZW4oZnVuY3Rpb24gKGEpIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKGEpXG4gICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KGVycilcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgfVxuICAgIG5ldHdvcmsoZGV2aWNlbmFtZTogc3RyaW5nKTogUHJvbWlzZTxJTmV0d29yaz4ge1xuICAgICAgICBjb25zdCB0aGF0ID0gdGhpcztcbiAgICAgICAgbGV0IG5ldGV4aXN0czogYm9vbGVhbiA9IGZhbHNlXG4gICAgICAgIGxldCBuZXR3b3JraW50ZXJmYWNlOiBJTmV0d29yaztcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPElOZXR3b3JrPihmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG5cbiAgICAgICAgICAgIHRoYXQubmV0d29ya3MoKS50aGVuKGZ1bmN0aW9uIChhKSB7XG4gICAgICAgICAgICAgICAgXy5tYXAoYSwgKG5ldCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIW5ldGV4aXN0cyAmJiBuZXQuaW50ZXJmYWNlID09PSBkZXZpY2VuYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBuZXRleGlzdHMgPSB0cnVlXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXR3b3JraW50ZXJmYWNlID0gbmV0XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIGlmIChuZXRleGlzdHMpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShuZXR3b3JraW50ZXJmYWNlKVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdCgnbm8gbmV0d29yaycpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgIHJlamVjdChlcnIpXG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgIH1cblxuICAgIHRlc3RpbnRlcm5ldCgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcblxuICAgICAgICAgICAgdGVzdGludGVybmV0KCkudGhlbihmdW5jdGlvbiAoYSkge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoYSlcbiAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICByZWplY3QoZXJyKVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGhvc3RhcGRjb25mKGhjb25maWc6IElIQ29uZikgeyAvLyByZWNvbmYgaXMgZXhwZXJpbWVudGFsXG4gICAgICAgIGNvbnN0IHRoYXQgPSB0aGlzXG4gICAgICAgIGlmICghaGNvbmZpZykge1xuICAgICAgICAgICAgdGhyb3cgRXJyb3IoJ25vIGNvbmZpZyBwcm92aWRlZCB0byBjb25maWd1cmUgaG9zdGFwZGNvbmYnKVxuXG5cbiAgICAgICAgfSBlbHNlIHtcblxuICAgICAgICAgICAgdGhhdC5ob3N0YXBkID0gbmV3IGhvc3RhcGRzd2l0Y2goaGNvbmZpZywgdHJ1ZSk7XG5cblxuICAgICAgICB9XG5cbiAgICB9XG5cbiAgICB3cGFtYW5hZ2VyKCkge1xuICAgICAgICBjb25zdCBwYXRoID0gdGhpcy5saWNvbmZpZy53cGFzdXBwbGljYW50X3BhdGg7XG4gICAgICAgIHJldHVybiBuZXcgV3BhbWFuYWdlcih0aGlzLmxpY29uZmlnLndwYXN1cHBsaWNhbnRfcGF0aCk7XG4gICAgfVxuXG5cbiAgICBtb2JpbGVwcm92aWRlcnMoKSB7XG5cbiAgICAgICAgcmV0dXJuIG5ldyBQcm92aWRlcnMoKVxuXG4gICAgfVxuXG4gICAgd2lmaV9zd2l0Y2gobW9kZTogc3RyaW5nLCBkZXY/OiBzdHJpbmcpIHtcbiAgICAgICAgY29uc29sZS5sb2cobW9kZSwgZGV2KTtcbiAgICAgICAgY29uc3QgdGhhdCA9IHRoaXM7XG4gICAgICAgIGNvbnN0IGNvbmZpZyA9IHRoYXQubGljb25maWc7XG5cbiAgICAgICAgaWYgKGRldiB8fCB0aGlzLmxpY29uZmlnLndpZmlfaW50ZXJmYWNlICE9PSBcImF1dG9cIikge1xuXG4gICAgICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8Ym9vbGVhbj4oZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuXG5cbiAgICAgICAgICAgICAgICBpZiAoIWRldikge1xuICAgICAgICAgICAgICAgICAgICBkZXYgPSBjb25maWcud2lmaV9pbnRlcmZhY2U7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJkZXYgbW9kZVwiKTtcbiAgICAgICAgICAgICAgICB0aGF0Lmhvc3RhcGRjb25mKHtcbiAgICAgICAgICAgICAgICAgICAgaW50ZXJmYWNlOiBkZXYsXG4gICAgICAgICAgICAgICAgICAgIHdwYXN1cHBsaWNhbnRfcGF0aDogY29uZmlnLndwYXN1cHBsaWNhbnRfcGF0aCxcbiAgICAgICAgICAgICAgICAgICAgaG9zdGFwZDogY29uZmlnLmhvc3RhcGRcbiAgICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICAgICAgc3dpdGNoIChtb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJhcFwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5ob3N0YXBkLmFwKCkudGhlbihmdW5jdGlvbiAoYW5zd2VyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5tb2RlID0gJ2FwJ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJob3N0XCI6XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lmhvc3RhcGQuaG9zdCgpLnRoZW4oZnVuY3Rpb24gKGFuc3dlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQubW9kZSA9ICdob3N0J1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJjbGllbnRcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuaG9zdGFwZC5jbGllbnQoKS50aGVuKGZ1bmN0aW9uIChhbnN3ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lm1vZGUgPSAnY2xpZW50J1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiYXV0byBtb2RlXCIpO1xuICAgICAgICAgICAgY29uc3QgY29uZmlnID0gdGhpcy5saWNvbmZpZztcbiAgICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICAgICAgbmV0dygpLnRoZW4oZnVuY3Rpb24gKG5ldHdvcmtzKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgXy5tYXAobmV0d29ya3MsIGZ1bmN0aW9uIChkZXZpY2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkZXZpY2UudHlwZSA9PT0gXCJ3aWZpXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXYgPSBkZXZpY2UuaW50ZXJmYWNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRldikge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lmhvc3RhcGRjb25mKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnRlcmZhY2U6IGRldixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBob3N0YXBkOiBjb25maWcuaG9zdGFwZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3cGFzdXBwbGljYW50X3BhdGg6IGNvbmZpZy53cGFzdXBwbGljYW50X3BhdGhcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHRoYXQuaG9zdGFwZCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHN3aXRjaCAobW9kZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgXCJhcFwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lmhvc3RhcGQuYXAoKS50aGVuKGZ1bmN0aW9uIChhbnN3ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQubW9kZSA9ICdhcCdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFwiaG9zdFwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lmhvc3RhcGQuaG9zdCgpLnRoZW4oZnVuY3Rpb24gKGFuc3dlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5tb2RlID0gJ2hvc3QnXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBcImNsaWVudFwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lmhvc3RhcGQuY2xpZW50KCkudGhlbihmdW5jdGlvbiAoYW5zd2VyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lm1vZGUgPSAnY2xpZW50J1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KHsgZXJyb3I6IFwibm8gZGV2XCIgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG5cbiAgICBsaXN0d2lmaWNsaWVudHMoKTogUHJvbWlzZTxJV2lmaUNsaWVudFtdPiB7XG4gICAgICAgIGNvbnN0IHRoYXQgPSB0aGlzXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTxJV2lmaUNsaWVudFtdPihmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG5cbiAgICAgICAgICAgIHRoYXQuaG9zdGFwZC5saXN0d2lmaWNsaWVudHMoKS50aGVuKChhKSA9PiB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShhKVxuICAgICAgICAgICAgfSkuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycilcbiAgICAgICAgICAgICAgICByZWplY3QoZXJyKVxuICAgICAgICAgICAgfSlcblxuICAgICAgICB9KVxuICAgIH1cblxuXG4gICAgY29ubmVjdGlvbigpIHtcbiAgICAgICAgY29uc3QgdGhhdCA9IHRoaXM7XG4gICAgICAgIGNvbnN0IHJlY292ZXJ5ID0gdGhhdC5saWNvbmZpZy5yZWNvdmVyeVxuXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICB2ZXJiKHRoYXQubGljb25maWcsIFwiZGVidWdcIiwgXCJUcnluZyB0byBjb25uZWN0XCIpO1xuXG4gICAgICAgICAgICBpZiAodGhhdC5tb2RlID09PSBcInd2XCIpIHtcbiAgICAgICAgICAgICAgICByZWplY3QoXCJhdXRvIG1vZGVcIilcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcInd2IHJ1bm5pbmcsIG5vdGhpbmcgdG8gZG9cIilcbiAgICAgICAgICAgIH0gZWxzZSB7XG5cblxuICAgICAgICAgICAgICAgIHRoYXQudGVzdGludGVybmV0KCkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSlcbiAgICAgICAgICAgICAgICB9KS5jYXRjaCgoZXJyKSA9PiB7XG5cblxuICAgICAgICAgICAgICAgICAgICB0aGF0LmV0aGVybmV0Y29ubmVjdCgpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2Nvbm5lY3RlZCBieSBldGhlcm5ldCcpXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHRydWUpXG5cbiAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goKCkgPT4ge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBnZXR3aWZpaW50ZXJmYSh0aGF0LmxpY29uZmlnLndpZmlfaW50ZXJmYWNlKS50aGVuKGZ1bmN0aW9uIChpbnRlcmYpIHtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHdpZmlfZXhpc3Q6IHN0cmluZyA9IGludGVyZi5pbnRlcmZhY2U7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjb25maGFwZHMgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGludGVyZmFjZTogd2lmaV9leGlzdCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd3Bhc3VwcGxpY2FudF9wYXRoOiB0aGF0LmxpY29uZmlnLndwYXN1cHBsaWNhbnRfcGF0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaG9zdGFwZDogdGhhdC5saWNvbmZpZy5ob3N0YXBkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh3aWZpX2V4aXN0KSB7XG5cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2ZXJiKHdpZmlfZXhpc3QsIFwiaW5mb1wiLCBcIldsYW4gaW50ZXJmYWNlIGZvdW5kZWRcIik7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5ob3N0YXBkY29uZihjb25maGFwZHMpXG5cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lmhvc3RhcGQuY2xpZW50KHRydWUpLnRoZW4oZnVuY3Rpb24gKGFuc3dlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5tb2RlID0gJ2NsaWVudCdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoeyBjb25lY3Rpb246IHRydWUgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcblxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhhdC5saWNvbmZpZy5tb2JpbGUpIHtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQubW9iaWxlY29ubmVjdCgpXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVjb3ZlcnkgJiYgd2lmaV9leGlzdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQucmVjb3ZlcnkodHJ1ZSkudGhlbihmdW5jdGlvbiAoYW5zd2VyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZlcmIoYW5zd2VyLCBcImluZm9cIiwgXCJMSU5FVFdPUktJTkcgcmVjb3ZlcnkgbW9kZSBzdGFydFwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGF0LmxpY29uZmlnLm1vYmlsZSkge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzY2FubmV0ID0gc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdjaGVjayBmb3IgYXZhaWxhYmxlcyBuZXR3b3JrcycpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC53aWZpY29ubmVjdGFibGVzKCkudGhlbigobmV0cykgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobmV0cy5sZW5ndGggPiAwKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuaG9zdGFwZC5jbGllbnQodHJ1ZSkudGhlbihmdW5jdGlvbiAoYW5zd2VyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5tb2RlID0gJ2NsaWVudCdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGVhckludGVydmFsKHNjYW5uZXQpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2Nvbm5lY3RlZCcpXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHsgY29uZWN0aW9uOiB0cnVlLCByZWNvdmVyeTogZmFsc2UgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ25vIHdvcmtpbmcgbmV0d29ya3MgZm9yIG5vdycpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5yZWNvdmVyeSh0cnVlKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuaG9zdGFwZC5saXN0d2lmaWNsaWVudHMoKS50aGVuKChhKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGEubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQucmVjb3ZlcnkodHJ1ZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ25vIGtud293biB3bGFuIGF2YWlsYWJsZSwgd2FpdGluZyBmb3IgbmV0d29ya3MnKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSwgMTIwMDAwKVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmVyYihlcnIsIFwiZXJyb3JcIiwgXCJMSU5FVFdPUktJTkcgcmVjb3ZlcnkgbW9kZSBlcnJvclwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KCdyZWNvdmVyeSBtb2RlIGVycm9yJylcblxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdub3QgY29ubmVjdGVkJylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoJ25vdCBjb25uZWN0ZWQnKVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmVyYihcIm5vIHdpZmlcIiwgXCJ3YXJuXCIsIFwibmV0d29ya2VyXCIpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoYXQubGljb25maWcubW9iaWxlKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5tb2JpbGVjb25uZWN0KClcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwibm8gd2lmaSEhPz8/XCIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGh3cmVzdGFydChcInVucGx1Z1wiKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cblxuXG4gICAgICAgICAgICAgICAgICAgIH0pXG5cblxuXG5cblxuICAgICAgICAgICAgICAgIH0pXG5cblxuXG5cblxuXG5cbiAgICAgICAgICAgIH1cblxuXG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICByZWNvdmVyeShmb3JjZT86IHRydWUpIHtcbiAgICAgICAgY29uc3QgY29uZmlnID0gdGhpcy5saWNvbmZpZztcbiAgICAgICAgY29uc3QgdGhhdCA9IHRoaXM7XG5cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgIHJlY292ZXJ5Y2hlY2soY29uZmlnKS50aGVuKGZ1bmN0aW9uIChhKSB7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBpbnRlcmYgPSBhLmRldmljZVxuICAgICAgICAgICAgICAgIGlmIChmb3JjZSB8fCAhYS5rbm93bl9uZXR3b3Jrcykge1xuXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdyZWNvdmVyeW5nICcgKyBhLmRldmljZS5pbnRlcmZhY2UpXG5cbiAgICAgICAgICAgICAgICAgICAgdGhhdC5ob3N0YXBkY29uZih7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbnRlcmZhY2U6IGEuZGV2aWNlLmludGVyZmFjZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHdwYXN1cHBsaWNhbnRfcGF0aDogdGhhdC5saWNvbmZpZy53cGFzdXBwbGljYW50X3BhdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICBob3N0YXBkOiB0aGF0LmxpY29uZmlnLmhvc3RhcGRcbiAgICAgICAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgICAgICAgICByZWNvdmVyeV9tb2RlKHRoYXQuaG9zdGFwZCkudGhlbihmdW5jdGlvbiAoYW5zd2VyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lm1vZGUgPSBhbnN3ZXI7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGFuc3dlcik7XG4gICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdCgndHJ5IGNsaWVudCBvciBmb3JjZScpXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxufTtcblxuXG5cblxuXG5cbiJdfQ==
