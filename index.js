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
                resolve('ap');
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
            wifi_interface: "auto",
            wpasupplicant_path: "/etc/wpa_supplicant/wpa_supplicant.conf",
            ethernet: [{
                    interface: 'eth0'
                }],
            recovery: true
        };
        var hostapddefault = {
            driver: "nl80211",
            ssid: "testttap",
            wpa_passphrase: "testpass"
        };
        if (data && (data.wifi_interface || data.hostapd)) {
            config.hostapd = hostapddefault;
        }
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
                                        }).catch(function (e) {
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
                        if (that.liconfig.hostapd) {
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
                                        if (recovery) {
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
                                else {
                                    if (that.liconfig.mobile) {
                                        that.mobileconnect(true);
                                    }
                                    else {
                                        console.log('not connected');
                                        setTimeout(function () {
                                            reject('not connected');
                                        }, 5000);
                                    }
                                }
                            }).catch(function (err) {
                                verb("no wifi", "warn", "networker");
                                if (that.liconfig.mobile) {
                                    that.mobileconnect(true);
                                }
                                else {
                                    console.log("no wifi!!???");
                                    setTimeout(function () {
                                        reject('not connected');
                                    }, 5000);
                                }
                            });
                        }
                        else {
                            if (that.liconfig.mobile) {
                                that.mobileconnect(true);
                            }
                            else {
                                console.log('no network');
                                setTimeout(function () {
                                    reject('not connected');
                                }, 5000);
                            }
                        }
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
                    if (that.liconfig.mobile) {
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QTtBQUFBLENBQUMiLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBQcm9taXNlIGZyb20gXCJibHVlYmlyZFwiO1xuaW1wb3J0ICogYXMgZnMgZnJvbSBcImZzXCI7XG5pbXBvcnQgKiBhcyBjaGlsZF9wcm9jZXNzIGZyb20gXCJjaGlsZF9wcm9jZXNzXCI7XG5pbXBvcnQgKiBhcyBfIGZyb20gXCJsb2Rhc2hcIjtcbmltcG9ydCAqIGFzIGFzeW5jIGZyb20gXCJhc3luY1wiO1xuaW1wb3J0IFByb3ZpZGVycyA9IHJlcXVpcmUoXCJtb2JpbGUtcHJvdmlkZXJzXCIpO1xuaW1wb3J0IFdwYW1hbmFnZXIgZnJvbSBcIndwYXN1cHBsaWNhbnQtbWFuYWdlclwiO1xuaW1wb3J0IGhvc3RhcGRzd2l0Y2ggZnJvbSBcImhvc3RhcGRfc3dpdGNoXCI7XG5pbXBvcnQgdGVzdGludGVybmV0IGZyb20gXCJwcm9taXNlLXRlc3QtY29ubmVjdGlvblwiO1xuaW1wb3J0IG1lcmdlIGZyb20gXCJqc29uLWFkZFwiO1xuaW1wb3J0IFd2ZGlhbCBmcm9tIFwid3ZkaWFsanNcIjtcblxuXG5cbmltcG9ydCBuZXR3IGZyb20gXCJuZXR3XCI7XG5jb25zdCB2ZXJiID0gcmVxdWlyZShcInZlcmJvXCIpO1xuY29uc3QgaHdyZXN0YXJ0ID0gcmVxdWlyZShcImh3cmVzdGFydFwiKTtcblxuXG5pbnRlcmZhY2UgSVdpZmlDbGllbnQge1xuICAgIG1hYzogc3RyaW5nO1xuICAgIHNpZ25hbDogc3RyaW5nO1xuICAgIHNpZ25hbE1pbj86IHN0cmluZztcbiAgICBzaWduYWxNYXg/OiBzdHJpbmc7XG5cbn1cblxuaW50ZXJmYWNlIElQcm92aWRlciB7XG5cbiAgICBsYWJlbD86IHN0cmluZztcbiAgICBhcG46IHN0cmluZztcbiAgICBwaG9uZT86IHN0cmluZ1xuICAgIHVzZXJuYW1lPzogc3RyaW5nO1xuICAgIHBhc3N3b3JkPzogc3RyaW5nO1xuXG59XG5cbmludGVyZmFjZSBJR2xvYmFsUHJvdmlkZXJzIHtcblxuICAgIGNvdW50cnk6IHN0cmluZztcbiAgICBwcm92aWRlcnM6IElQcm92aWRlcltdO1xufVxuXG5cbnR5cGUgSW1vZGUgPSAnYXAnIHwgJ2hvc3QnIHwgJ2NsaWVudCcgfCAndW5tYW5hZ2VkJyB8ICd3dicgfCAnZXRoZXJuZXQnXG5cblxuaW50ZXJmYWNlIElTY2FuIHtcbiAgICBlc3NpZDogc3RyaW5nO1xuICAgIG1hYzogc3RyaW5nO1xuICAgIHNpZ25hbDogc3RyaW5nO1xufVxuXG50eXBlIElOZXR3b3JrVHlwZSA9ICd3aWZpJyB8ICd3aXJlZCdcblxuaW50ZXJmYWNlIElOZXR3b3JrIHtcbiAgICB0eXBlOiBJTmV0d29ya1R5cGU7XG4gICAgbWFjOiBzdHJpbmc7XG4gICAgaW50ZXJmYWNlOiBzdHJpbmc7XG4gICAgZXNzaWQ/OiBzdHJpbmc7XG4gICAgc2Nhbj86IElTY2FuW107XG4gICAgaXA/OiBzdHJpbmc7XG4gICAgZ2F0ZXdheT86IHN0cmluZztcbn1cblxuaW50ZXJmYWNlIENsYXNzT3B0IHtcbiAgICB3aWZpX2ludGVyZmFjZT86IHN0cmluZztcbiAgICBtb2JpbGU/OiBJTW9iaWxlO1xuICAgIGhvc3RhcGQ/OiBJSG9zdGFwZGNmO1xuICAgIHdwYXN1cHBsaWNhbnRfcGF0aD86IHN0cmluZztcbn1cbmludGVyZmFjZSBJTW9iaWxlIHtcbiAgICBwcm92aWRlcjogSVByb3ZpZGVyO1xuICAgIGRldmljZT86IGFueTtcbiAgICBjb25maWdGaWxlUGF0aD86IHN0cmluZztcblxufVxuXG5pbnRlcmZhY2UgSUV0aGVybmV0IHtcbiAgICBpbnRlcmZhY2U6IHN0cmluZztcbiAgICBkaGNwPzoge1xuICAgICAgICBpcD86IHN0cmluZztcbiAgICAgICAgZ2F0ZXdheT86IHN0cmluZztcbiAgICAgICAgbmV0bWFzaz86IHN0cmluZztcbiAgICAgICAgYmNhc3Q/OiBzdHJpbmc7XG4gICAgfVxufVxuXG5pbnRlcmZhY2UgSUxpTmV0d29ya0NvbmYge1xuICAgIHdpZmlfaW50ZXJmYWNlOiBzdHJpbmc7XG4gICAgbW9iaWxlPzogSU1vYmlsZTtcbiAgICBob3N0YXBkPzogSUhvc3RhcGQ7XG4gICAgd3Bhc3VwcGxpY2FudF9wYXRoPzogc3RyaW5nO1xuICAgIGV0aGVybmV0PzogSUV0aGVybmV0W10sXG4gICAgcmVjb3Zlcnk6IGJvb2xlYW5cbn1cbmludGVyZmFjZSBJTGlOZXR3b3JrQ29uZlBhcmFtcyB7XG4gICAgd2lmaV9pbnRlcmZhY2U/OiBzdHJpbmc7XG4gICAgbW9iaWxlPzogSU1vYmlsZTtcbiAgICBob3N0YXBkPzogSUhvc3RhcGQ7XG4gICAgd3Bhc3VwcGxpY2FudF9wYXRoPzogc3RyaW5nO1xuICAgIGV0aGVybmV0Pzoge1xuICAgICAgICBpbnRlcmZhY2U6IHN0cmluZztcbiAgICAgICAgZGhjcD86IHtcbiAgICAgICAgICAgIGlwPzogc3RyaW5nO1xuICAgICAgICAgICAgZ2F0ZXdheT86IHN0cmluZztcbiAgICAgICAgICAgIG5ldG1hc2s/OiBzdHJpbmc7XG4gICAgICAgICAgICBiY2FzdD86IHN0cmluZztcbiAgICAgICAgfVxuICAgIH0sXG4gICAgcmVjb3Zlcnk/OiB0cnVlXG59XG5cbmludGVyZmFjZSBJSG9zdGFwZCB7XG4gICAgZHJpdmVyOiBzdHJpbmc7XG4gICAgc3NpZDogc3RyaW5nO1xuICAgIHdwYV9wYXNzcGhyYXNlOiBhbnk7XG59O1xuaW50ZXJmYWNlIElIb3N0YXBkY2Yge1xuICAgIGRyaXZlcj86IHN0cmluZztcbiAgICBzc2lkOiBzdHJpbmc7XG4gICAgd3BhX3Bhc3NwaHJhc2U6IGFueTtcbn07XG5cbmludGVyZmFjZSBJSG9zdGFwZENmIHtcbiAgICBkcml2ZXI/OiBzdHJpbmc7XG4gICAgc3NpZD86IHN0cmluZztcbiAgICB3cGFfcGFzc3BocmFzZT86IHN0cmluZztcbn07XG5cbmludGVyZmFjZSBJRG5zbWFzcSB7XG4gICAgaW50ZXJmYWNlOiBzdHJpbmc7XG59O1xuaW50ZXJmYWNlIElEbnNtYXNxQ2Yge1xuICAgIGludGVyZmFjZT86IHN0cmluZztcbn07XG5pbnRlcmZhY2UgSUhDb25mIHtcbiAgICBpbnRlcmZhY2U/OiBzdHJpbmc7XG4gICAgd3Bhc3VwcGxpY2FudF9wYXRoPzogc3RyaW5nO1xuICAgIGhvc3RhcGQ/OiBJSG9zdGFwZENmO1xuICAgIHJlZGlyZWN0PzogYm9vbGVhbjtcbiAgICBkbnNtYXNxPzogSURuc21hc3FDZjtcbn07XG5cbmludGVyZmFjZSBJQ29ubmVjdGlvbiB7XG5cbiAgICBsaW5rVHlwZTogc3RyaW5nO1xuICAgIGludGVyZmFjZTogc3RyaW5nO1xuICAgIGlwPzogc3RyaW5nO1xuICAgIGdhdGV3YXk/OiBzdHJpbmc7XG5cbn1cblxuaW50ZXJmYWNlIElJbml0IHtcbiAgICBjb25lY3Rpb246IGJvb2xlYW47XG4gICAgcmVjb3Zlcnk6IGJvb2xlYW47XG4gICAgZGV0YWlscz86IElDb25uZWN0aW9uO1xufVxuXG5cblxuXG5mdW5jdGlvbiBnZXR3aWZpaW50ZXJmYShzZXR0ZWQ/OiBzdHJpbmcpOiBQcm9taXNlPElOZXR3b3JrPiB7XG5cbiAgICByZXR1cm4gbmV3IFByb21pc2U8SU5ldHdvcms+KGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgbGV0IHdpZmlfZXhpc3Q6IGJvb2xlYW4gPSBmYWxzZTtcbiAgICAgICAgbGV0IGRldmk6IElOZXR3b3JrO1xuICAgICAgICBuZXR3KCkudGhlbihmdW5jdGlvbiAobmV0d29ya3MpIHtcblxuICAgICAgICAgICAgXy5tYXAobmV0d29ya3MsIGZ1bmN0aW9uIChkZXZpY2UpIHtcblxuICAgICAgICAgICAgICAgIGlmIChkZXZpY2UudHlwZSA9PT0gXCJ3aWZpXCIgJiYgIXdpZmlfZXhpc3QgJiYgKCFzZXR0ZWQgfHwgc2V0dGVkID09PSBcImF1dG9cIiB8fCBzZXR0ZWQgPT09IGRldmljZS5pbnRlcmZhY2UpKSB7XG4gICAgICAgICAgICAgICAgICAgIHdpZmlfZXhpc3QgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBkZXZpID0gZGV2aWNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBpZiAod2lmaV9leGlzdCkge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoZGV2aSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlamVjdCh7IGVycm9yOiBcImRldmljZSBub3QgZm91bmRlZFwiIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICB9KTtcblxuICAgIH0pO1xuXG59XG5cblxuZnVuY3Rpb24gcmVjb3ZlcnlfbW9kZShhcHN3aXRjaDogaG9zdGFwZHN3aXRjaCwgbW9kZT86IEltb2RlKTogUHJvbWlzZTxJbW9kZT4ge1xuXG5cbiAgICByZXR1cm4gbmV3IFByb21pc2U8SW1vZGU+KGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgaWYgKCFtb2RlIHx8IG1vZGUgPT09ICdob3N0Jykge1xuICAgICAgICAgICAgYXBzd2l0Y2guaG9zdCgpLnRoZW4oZnVuY3Rpb24gKGFuc3dlcikge1xuICAgICAgICAgICAgICAgIHZlcmIoYW5zd2VyLCBcIndhcm5cIiwgXCJsaW5ldHdvcmsgcmVjb3ZlcnkgbW9kZSBcIik7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSgnaG9zdCcpO1xuICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgIHZlcmIoZXJyLCBcImVycm9yXCIsIFwibGluZXR3b3JrIHJlY292ZXJ5IG1vZGUgZmFpbGVkXCIpO1xuICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSBpZiAobW9kZSA9PT0gJ2FwJykge1xuICAgICAgICAgICAgYXBzd2l0Y2guYXAoKS50aGVuKGZ1bmN0aW9uIChhbnN3ZXIpIHtcbiAgICAgICAgICAgICAgICB2ZXJiKGFuc3dlciwgXCJ3YXJuXCIsIFwibGluZXR3b3JrIHJlY292ZXJ5IG1vZGUgXCIpO1xuICAgICAgICAgICAgICAgIHJlc29sdmUoJ2FwJyk7XG4gICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgdmVyYihlcnIsIFwiZXJyb3JcIiwgXCJsaW5ldHdvcmsgcmVjb3ZlcnkgbW9kZSBmYWlsZWRcIik7XG4gICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgfSk7XG59XG5cblxuZnVuY3Rpb24gcmVjb3ZlcnljaGVjayhjb25maWc6IElMaU5ldHdvcmtDb25mKTogUHJvbWlzZTx7IGRldmljZTogSU5ldHdvcmssIGtub3duX25ldHdvcmtzOiBib29sZWFuIH0+IHtcblxuICAgIHJldHVybiBuZXcgUHJvbWlzZTx7IGRldmljZTogSU5ldHdvcmssIGtub3duX25ldHdvcmtzOiBib29sZWFuIH0+KGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcblxuICAgICAgICBsZXQgc29tZW5ldHdvcmtfZXhpc3RzOiBib29sZWFuID0gZmFsc2U7XG4gICAgICAgIGxldCB3bGFuX2V4aXN0czogYm9vbGVhbiA9IGZhbHNlO1xuXG4gICAgICAgIGxldCBkZXZpOiBJTmV0d29yaztcblxuICAgICAgICBuZXR3KCkudGhlbihmdW5jdGlvbiAobmV0d29ya3MpIHtcblxuICAgICAgICAgICAgXy5tYXAobmV0d29ya3MsIGZ1bmN0aW9uIChkZXZpY2UpIHtcblxuICAgICAgICAgICAgICAgIGlmIChkZXZpY2Uuc2NhbiAmJiBkZXZpY2UudHlwZSA9PT0gXCJ3aWZpXCIgJiYgIXNvbWVuZXR3b3JrX2V4aXN0cyAmJiAoIWNvbmZpZy53aWZpX2ludGVyZmFjZSB8fCBjb25maWcud2lmaV9pbnRlcmZhY2UgPT09IFwiYXV0b1wiIHx8IGNvbmZpZy53aWZpX2ludGVyZmFjZSA9PT0gZGV2aWNlLmludGVyZmFjZSkpIHtcblxuICAgICAgICAgICAgICAgICAgICBjb25zdCBXTSA9IG5ldyBXcGFtYW5hZ2VyKGNvbmZpZy53cGFzdXBwbGljYW50X3BhdGgpXG5cbiAgICAgICAgICAgICAgICAgICAgXy5tYXAoZGV2aWNlLnNjYW4sIGZ1bmN0aW9uIChuZXRzY2FuOiBJU2Nhbikge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBfLm1hcChXTS5saXN0d3BhLCBmdW5jdGlvbiAod3BhaXRlbSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh3cGFpdGVtLnNzaWQgPT09IG5ldHNjYW4uZXNzaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc29tZW5ldHdvcmtfZXhpc3RzID0gdHJ1ZTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICghd2xhbl9leGlzdHMgJiYgZGV2aWNlLnR5cGUgPT09IFwid2lmaVwiICYmICghY29uZmlnLndpZmlfaW50ZXJmYWNlIHx8IGNvbmZpZy53aWZpX2ludGVyZmFjZSA9PT0gXCJhdXRvXCIgfHwgY29uZmlnLndpZmlfaW50ZXJmYWNlID09PSBkZXZpY2UuaW50ZXJmYWNlKSkge1xuICAgICAgICAgICAgICAgICAgICB3bGFuX2V4aXN0cyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGRldmkgPSBkZXZpY2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGlmICghc29tZW5ldHdvcmtfZXhpc3RzICYmIHdsYW5fZXhpc3RzKSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7IGRldmljZTogZGV2aSwga25vd25fbmV0d29ya3M6IGZhbHNlIH0pO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh3bGFuX2V4aXN0cykge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoeyBkZXZpY2U6IGRldmksIGtub3duX25ldHdvcmtzOiB0cnVlIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZWplY3QoJ25vIGludGVyZmFjZScpXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgcmVqZWN0KHsgZXJyb3I6IGVyciwgZGVzY3JpcHRpb246ICduZXR3IGVycicgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgfSk7XG5cblxufVxuXG5cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTGlOZXR3b3JrIHtcbiAgICBsaWNvbmZpZzogSUxpTmV0d29ya0NvbmY7XG4gICAgaG9zdGFwZDogaG9zdGFwZHN3aXRjaDtcbiAgICBtb2JpbGU6IFd2ZGlhbDtcbiAgICBtb2RlOiBJbW9kZTtcbiAgICBpc0Nvbm5lY3RlZDogYm9vbGVhbjtcblxuXG4gICAgY29uc3RydWN0b3IoZGF0YTogSUxpTmV0d29ya0NvbmZQYXJhbXMpIHtcblxuXG4gICAgICAgIGNvbnN0IGNvbmZpZzogSUxpTmV0d29ya0NvbmYgPSB7XG5cblxuICAgICAgICAgICAgd2lmaV9pbnRlcmZhY2U6IFwiYXV0b1wiLFxuICAgICAgICAgICAgd3Bhc3VwcGxpY2FudF9wYXRoOiBcIi9ldGMvd3BhX3N1cHBsaWNhbnQvd3BhX3N1cHBsaWNhbnQuY29uZlwiLFxuICAgICAgICAgICAgZXRoZXJuZXQ6IFt7XG4gICAgICAgICAgICAgICAgaW50ZXJmYWNlOiAnZXRoMCdcbiAgICAgICAgICAgIH1dLFxuICAgICAgICAgICAgcmVjb3Zlcnk6IHRydWVcbiAgICAgICAgfTtcblxuXG5cbiAgICAgICAgY29uc3QgaG9zdGFwZGRlZmF1bHQgPSB7XG4gICAgICAgICAgICBkcml2ZXI6IFwibmw4MDIxMVwiLFxuICAgICAgICAgICAgc3NpZDogXCJ0ZXN0dHRhcFwiLFxuICAgICAgICAgICAgd3BhX3Bhc3NwaHJhc2U6IFwidGVzdHBhc3NcIlxuICAgICAgICB9XG5cblxuICAgICAgICBpZiAoZGF0YSAmJiAoZGF0YS53aWZpX2ludGVyZmFjZSB8fCBkYXRhLmhvc3RhcGQpKSB7XG4gICAgICAgICAgICBjb25maWcuaG9zdGFwZCA9IGhvc3RhcGRkZWZhdWx0XG4gICAgICAgIH1cblxuICAgICAgICBtZXJnZShjb25maWcsIGRhdGEpOyAvLyBjb21iaW5lIGRlZmF1bHQgc2V0dGluZ3Mgd2l0aCBuZXcgcGFyYW1ldGVycyBmcm9tIGRhdGFcbiAgICAgICAgdGhpcy5tb2RlID0gJ3VubWFuYWdlZCdcblxuICAgICAgICB0aGlzLmxpY29uZmlnID0gY29uZmlnO1xuXG5cbiAgICAgICAgaWYgKHRoaXMubGljb25maWcubW9iaWxlKSB7XG4gICAgICAgICAgICBpZiAoIXRoaXMubGljb25maWcubW9iaWxlLmNvbmZpZ0ZpbGVQYXRoKSB0aGlzLmxpY29uZmlnLm1vYmlsZS5jb25maWdGaWxlUGF0aCA9IFwiL2V0Yy93dmRpYWwuY29uZlwiO1xuXG4gICAgICAgICAgICB0aGlzLm1vYmlsZSA9IG5ldyBXdmRpYWwodGhpcy5saWNvbmZpZy5tb2JpbGUpXG4gICAgICAgIH1cblxuXG4gICAgfVxuXG5cblxuICAgIGV0aGVybmV0Y29ubmVjdChkZXZpY2VuYW1lPzogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgICAgIGNvbnN0IHRoYXQgPSB0aGlzXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTxib29sZWFuPihmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICBpZiAodGhhdC5saWNvbmZpZy5ldGhlcm5ldCkge1xuXG4gICAgICAgICAgICAgICAgY29uc3QgY29ubmVjdGlvbmRldmljZXNhcnJheTogSU5ldHdvcmtbXSA9IFtdO1xuXG4gICAgICAgICAgICAgICAgbGV0IGRldmljZWV4aXN0czogYm9vbGVhbiA9IGZhbHNlXG4gICAgICAgICAgICAgICAgbGV0IGRldmljZTogSU5ldHdvcms7XG4gICAgICAgICAgICAgICAgLy8gY2hlZWNrIGNvbmZpZ3VyYXRpb25cbiAgICAgICAgICAgICAgICBuZXR3KCkudGhlbigoYSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBfLm1hcChhLCAobmV0KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBfLm1hcCh0aGF0LmxpY29uZmlnLmV0aGVybmV0LCAobmV0aW50ZXJmYWNlY29uZmlndXJlZCkgPT4ge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5ldC50eXBlID09PSAnd2lyZWQnICYmICgoIWRldmljZW5hbWUgJiYgbmV0LmludGVyZmFjZSA9PT0gbmV0aW50ZXJmYWNlY29uZmlndXJlZC5pbnRlcmZhY2UpIHx8IGRldmljZW5hbWUgPT09IG5ldC5pbnRlcmZhY2UpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRldmljZWV4aXN0cyA9IHRydWVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGV2aWNlID0gbmV0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbm5lY3Rpb25kZXZpY2VzYXJyYXkucHVzaChuZXQpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICAgICAgICAgIGlmIChkZXZpY2VleGlzdHMpIHtcblxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGNvbm5lY3RlZDogYm9vbGVhbiA9IGZhbHNlO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBhc3luYy5lYWNoU2VyaWVzKGNvbm5lY3Rpb25kZXZpY2VzYXJyYXksIChkZXZpY2UsIGNiKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFjb25uZWN0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hpbGRfcHJvY2Vzcy5leGVjKCdpZmNvbmZpZyAnICsgZGV2aWNlLmludGVyZmFjZSArICcgZG93biAmJiBpZmNvbmZpZyAnICsgZGV2aWNlLmludGVyZmFjZSArICcgdXAnLCAoZXJyLCBzdGRvdXQsIHN0ZGVycikgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNiKClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC50ZXN0aW50ZXJuZXQoKS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29ubmVjdGVkID0gdHJ1ZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYigpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2IoKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2IoKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgfSwgKGVycikgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghY29ubmVjdGVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdCgnbm8gY29ubmVjdGlvbiBieSBhIGV0aGVybmV0IGRldmljZScpXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHRydWUpXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gbmVlZCBhc3luYyB0byBwcm9jZXNzIGV2ZXJ5b25lXG5cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdCgnbm8gZXRoZXJuZXQgZGV2aWNlJylcbiAgICAgICAgICAgICAgICAgICAgfVxuXG5cbiAgICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICAgICAgLy8gY2hlY2sgaWYgaXQgaXMganVzdCBjb25uZWN0ZWQgYnkgZXRoMFxuICAgICAgICAgICAgICAgIC8vIGlmIGlzIGNvbm5lY3RlZCBhbGwgb2suXG4gICAgICAgICAgICAgICAgLy8gZWxzZSB0aGF0LmV0aGVybmV0cmVjb25uZWN0KGRldmljZSlcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KCdpbnZhbGlkIGV0aGVybmV0IGNvbmYnKVxuXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG5cbiAgICB9XG5cbiAgICBldGhlcm5ldHJlY29ubmVjdChkZXZpY2U/OiBhbnkpIHtcbiAgICAgICAgY29uc3QgdGhhdCA9IHRoaXNcblxuICAgIH1cblxuICAgIG1vYmlsZWNvbm5lY3QocmVzZXQ/OiB0cnVlKSB7XG4gICAgICAgIGNvbnN0IHRoYXQgPSB0aGlzXG4gICAgICAgIHRoYXQubW9iaWxlLmNvbmZpZ3VyZShyZXNldCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGF0Lm1vZGUgPSBcInd2XCI7XG4gICAgICAgICAgICB0aGF0Lm1vYmlsZS5jb25uZWN0KHRydWUpLnRoZW4oZnVuY3Rpb24gKGEpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhhKVxuICAgICAgICAgICAgICAgIGh3cmVzdGFydChcInVucGx1Z1wiKVxuXG5cbiAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZSlcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIm1vZGVtIGVycm9yXCIpXG5cbiAgICAgICAgICAgICAgICBod3Jlc3RhcnQoXCJ1bnBsdWdcIilcblxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhlKVxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJtb2RlbSBlcnJvclwiKVxuXG4gICAgICAgICAgICBod3Jlc3RhcnQoXCJ1bnBsdWdcIilcblxuICAgICAgICB9KTtcbiAgICB9O1xuICAgIHdpZmlhdmFpbGFibGVzKCk6IFByb21pc2U8SVNjYW5bXT4ge1xuICAgICAgICBjb25zdCB0aGF0ID0gdGhpcztcblxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8SVNjYW5bXT4oZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgICAgY29uc3QgYXZhaWxhYmxlbmV0cyA9IFtdXG4gICAgICAgICAgICB0aGF0Lm5ldHdvcmtzKCkudGhlbigobmV0cykgPT4ge1xuICAgICAgICAgICAgICAgIF8ubWFwKG5ldHMsIChuZXQpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5ldC50eXBlID09PSBcIndpZmlcIiAmJiBuZXQuc2Nhbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgXy5tYXAobmV0LnNjYW4sIChzY2FubmVkb25lKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXZhaWxhYmxlbmV0cy5wdXNoKHNjYW5uZWRvbmUpXG4gICAgICAgICAgICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgcmVzb2x2ZShhdmFpbGFibGVuZXRzKVxuXG4gICAgICAgICAgICB9KS5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KGVycilcbiAgICAgICAgICAgIH0pXG5cblxuICAgICAgICB9KVxuXG4gICAgfVxuXG4gICAgd2lmaWNvbm5lY3RhYmxlcygpOiBQcm9taXNlPElTY2FuW10+IHtcbiAgICAgICAgY29uc3QgdGhhdCA9IHRoaXM7XG5cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPElTY2FuW10+KGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgIGNvbnN0IGNvbm5lY3RhYmxlcyA9IFtdXG4gICAgICAgICAgICBjb25zdCBXTSA9IHRoYXQud3BhbWFuYWdlcigpXG5cbiAgICAgICAgICAgIHRoYXQud2lmaWF2YWlsYWJsZXMoKS50aGVuKChzY2FucykgPT4ge1xuICAgICAgICAgICAgICAgIF8ubWFwKHNjYW5zLCAoc2Nhbm5lZG9uZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBfLm1hcChXTS5saXN0d3BhLCAod3BhKSA9PiB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh3cGEuc3NpZCA9PT0gc2Nhbm5lZG9uZS5lc3NpZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbm5lY3RhYmxlcy5wdXNoKHNjYW5uZWRvbmUpXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pXG5cbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIHJlc29sdmUoY29ubmVjdGFibGVzKVxuICAgICAgICAgICAgfSkuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICAgICAgICAgIHJlamVjdChlcnIpXG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuXG4gICAgfVxuXG5cblxuICAgIG5ldHdvcmtzKCk6IFByb21pc2U8SU5ldHdvcmtbXT4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8SU5ldHdvcmtbXT4oZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuXG4gICAgICAgICAgICBuZXR3KCkudGhlbihmdW5jdGlvbiAoYSkge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoYSlcbiAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICByZWplY3QoZXJyKVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICB9XG4gICAgbmV0d29yayhkZXZpY2VuYW1lOiBzdHJpbmcpOiBQcm9taXNlPElOZXR3b3JrPiB7XG4gICAgICAgIGNvbnN0IHRoYXQgPSB0aGlzO1xuICAgICAgICBsZXQgbmV0ZXhpc3RzOiBib29sZWFuID0gZmFsc2VcbiAgICAgICAgbGV0IG5ldHdvcmtpbnRlcmZhY2U6IElOZXR3b3JrO1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8SU5ldHdvcms+KGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcblxuICAgICAgICAgICAgdGhhdC5uZXR3b3JrcygpLnRoZW4oZnVuY3Rpb24gKGEpIHtcbiAgICAgICAgICAgICAgICBfLm1hcChhLCAobmV0KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghbmV0ZXhpc3RzICYmIG5ldC5pbnRlcmZhY2UgPT09IGRldmljZW5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ldGV4aXN0cyA9IHRydWVcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ldHdvcmtpbnRlcmZhY2UgPSBuZXRcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgaWYgKG5ldGV4aXN0cykge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKG5ldHdvcmtpbnRlcmZhY2UpXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KCdubyBuZXR3b3JrJylcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KGVycilcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgdGVzdGludGVybmV0KCkge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuXG4gICAgICAgICAgICB0ZXN0aW50ZXJuZXQoKS50aGVuKGZ1bmN0aW9uIChhKSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShhKVxuICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgIHJlamVjdChlcnIpXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgaG9zdGFwZGNvbmYoaGNvbmZpZzogSUhDb25mKSB7IC8vIHJlY29uZiBpcyBleHBlcmltZW50YWxcbiAgICAgICAgY29uc3QgdGhhdCA9IHRoaXNcbiAgICAgICAgaWYgKCFoY29uZmlnKSB7XG4gICAgICAgICAgICB0aHJvdyBFcnJvcignbm8gY29uZmlnIHByb3ZpZGVkIHRvIGNvbmZpZ3VyZSBob3N0YXBkY29uZicpXG5cblxuICAgICAgICB9IGVsc2Uge1xuXG4gICAgICAgICAgICB0aGF0Lmhvc3RhcGQgPSBuZXcgaG9zdGFwZHN3aXRjaChoY29uZmlnLCB0cnVlKTtcblxuXG4gICAgICAgIH1cblxuICAgIH1cblxuICAgIHdwYW1hbmFnZXIoKSB7XG4gICAgICAgIGNvbnN0IHBhdGggPSB0aGlzLmxpY29uZmlnLndwYXN1cHBsaWNhbnRfcGF0aDtcbiAgICAgICAgcmV0dXJuIG5ldyBXcGFtYW5hZ2VyKHRoaXMubGljb25maWcud3Bhc3VwcGxpY2FudF9wYXRoKTtcbiAgICB9XG5cblxuICAgIG1vYmlsZXByb3ZpZGVycygpIHtcblxuICAgICAgICByZXR1cm4gbmV3IFByb3ZpZGVycygpXG5cbiAgICB9XG5cbiAgICB3aWZpX3N3aXRjaChtb2RlOiBzdHJpbmcsIGRldj86IHN0cmluZykge1xuICAgICAgICBjb25zb2xlLmxvZyhtb2RlLCBkZXYpO1xuICAgICAgICBjb25zdCB0aGF0ID0gdGhpcztcbiAgICAgICAgY29uc3QgY29uZmlnID0gdGhhdC5saWNvbmZpZztcblxuICAgICAgICBpZiAoZGV2IHx8IHRoaXMubGljb25maWcud2lmaV9pbnRlcmZhY2UgIT09IFwiYXV0b1wiKSB7XG5cbiAgICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTxib29sZWFuPihmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG5cblxuICAgICAgICAgICAgICAgIGlmICghZGV2KSB7XG4gICAgICAgICAgICAgICAgICAgIGRldiA9IGNvbmZpZy53aWZpX2ludGVyZmFjZTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImRldiBtb2RlXCIpO1xuICAgICAgICAgICAgICAgIHRoYXQuaG9zdGFwZGNvbmYoe1xuICAgICAgICAgICAgICAgICAgICBpbnRlcmZhY2U6IGRldixcbiAgICAgICAgICAgICAgICAgICAgd3Bhc3VwcGxpY2FudF9wYXRoOiBjb25maWcud3Bhc3VwcGxpY2FudF9wYXRoLFxuICAgICAgICAgICAgICAgICAgICBob3N0YXBkOiBjb25maWcuaG9zdGFwZFxuICAgICAgICAgICAgICAgIH0pXG5cbiAgICAgICAgICAgICAgICBzd2l0Y2ggKG1vZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcImFwXCI6XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lmhvc3RhcGQuYXAoKS50aGVuKGZ1bmN0aW9uIChhbnN3ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lm1vZGUgPSAnYXAnXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcImhvc3RcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuaG9zdGFwZC5ob3N0KCkudGhlbihmdW5jdGlvbiAoYW5zd2VyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5tb2RlID0gJ2hvc3QnXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcImNsaWVudFwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5ob3N0YXBkLmNsaWVudCgpLnRoZW4oZnVuY3Rpb24gKGFuc3dlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQubW9kZSA9ICdjbGllbnQnXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJhdXRvIG1vZGVcIik7XG4gICAgICAgICAgICBjb25zdCBjb25maWcgPSB0aGlzLmxpY29uZmlnO1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgICAgICBuZXR3KCkudGhlbihmdW5jdGlvbiAobmV0d29ya3MpIHtcblxuICAgICAgICAgICAgICAgICAgICBfLm1hcChuZXR3b3JrcywgZnVuY3Rpb24gKGRldmljZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRldmljZS50eXBlID09PSBcIndpZmlcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRldiA9IGRldmljZS5pbnRlcmZhY2U7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZGV2KSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuaG9zdGFwZGNvbmYoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGludGVyZmFjZTogZGV2LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhvc3RhcGQ6IGNvbmZpZy5ob3N0YXBkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdwYXN1cHBsaWNhbnRfcGF0aDogY29uZmlnLndwYXN1cHBsaWNhbnRfcGF0aFxuICAgICAgICAgICAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2codGhhdC5ob3N0YXBkKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgc3dpdGNoIChtb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBcImFwXCI6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuaG9zdGFwZC5hcCgpLnRoZW4oZnVuY3Rpb24gKGFuc3dlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5tb2RlID0gJ2FwJ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgXCJob3N0XCI6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuaG9zdGFwZC5ob3N0KCkudGhlbihmdW5jdGlvbiAoYW5zd2VyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lm1vZGUgPSAnaG9zdCdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFwiY2xpZW50XCI6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuaG9zdGFwZC5jbGllbnQoKS50aGVuKGZ1bmN0aW9uIChhbnN3ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQubW9kZSA9ICdjbGllbnQnXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoeyBlcnJvcjogXCJubyBkZXZcIiB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG5cblxuICAgIGxpc3R3aWZpY2xpZW50cygpOiBQcm9taXNlPElXaWZpQ2xpZW50W10+IHtcbiAgICAgICAgY29uc3QgdGhhdCA9IHRoaXNcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPElXaWZpQ2xpZW50W10+KGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcblxuICAgICAgICAgICAgdGhhdC5ob3N0YXBkLmxpc3R3aWZpY2xpZW50cygpLnRoZW4oKGEpID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKGEpXG4gICAgICAgICAgICB9KS5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKVxuICAgICAgICAgICAgICAgIHJlamVjdChlcnIpXG4gICAgICAgICAgICB9KVxuXG4gICAgICAgIH0pXG4gICAgfVxuXG5cbiAgICBjb25uZWN0aW9uKCkge1xuICAgICAgICBjb25zdCB0aGF0ID0gdGhpcztcbiAgICAgICAgY29uc3QgcmVjb3ZlcnkgPSB0aGF0LmxpY29uZmlnLnJlY292ZXJ5XG5cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgIHZlcmIodGhhdC5saWNvbmZpZywgXCJkZWJ1Z1wiLCBcIlRyeW5nIHRvIGNvbm5lY3RcIik7XG5cbiAgICAgICAgICAgIGlmICh0aGF0Lm1vZGUgPT09IFwid3ZcIikge1xuICAgICAgICAgICAgICAgIHJlamVjdChcImF1dG8gbW9kZVwiKVxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwid3YgcnVubmluZywgbm90aGluZyB0byBkb1wiKVxuICAgICAgICAgICAgfSBlbHNlIHtcblxuXG4gICAgICAgICAgICAgICAgdGhhdC50ZXN0aW50ZXJuZXQoKS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKVxuICAgICAgICAgICAgICAgIH0pLmNhdGNoKChlcnIpID0+IHtcblxuXG4gICAgICAgICAgICAgICAgICAgIHRoYXQuZXRoZXJuZXRjb25uZWN0KCkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnY29ubmVjdGVkIGJ5IGV0aGVybmV0JylcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSlcblxuICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaCgoKSA9PiB7XG5cblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoYXQubGljb25maWcuaG9zdGFwZCkge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2V0d2lmaWludGVyZmEodGhhdC5saWNvbmZpZy53aWZpX2ludGVyZmFjZSkudGhlbihmdW5jdGlvbiAoaW50ZXJmKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgd2lmaV9leGlzdDogc3RyaW5nID0gaW50ZXJmLmludGVyZmFjZTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjb25maGFwZHMgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnRlcmZhY2U6IHdpZmlfZXhpc3QsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3cGFzdXBwbGljYW50X3BhdGg6IHRoYXQubGljb25maWcud3Bhc3VwcGxpY2FudF9wYXRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaG9zdGFwZDogdGhhdC5saWNvbmZpZy5ob3N0YXBkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHdpZmlfZXhpc3QpIHtcblxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2ZXJiKHdpZmlfZXhpc3QsIFwiaW5mb1wiLCBcIldsYW4gaW50ZXJmYWNlIGZvdW5kZWRcIik7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuaG9zdGFwZGNvbmYoY29uZmhhcGRzKVxuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuaG9zdGFwZC5jbGllbnQodHJ1ZSkudGhlbihmdW5jdGlvbiAoYW5zd2VyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5tb2RlID0gJ2NsaWVudCdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHsgY29uZWN0aW9uOiB0cnVlIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuXG5cblxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlY292ZXJ5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQucmVjb3ZlcnkodHJ1ZSkudGhlbihmdW5jdGlvbiAoYW5zd2VyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2ZXJiKGFuc3dlciwgXCJpbmZvXCIsIFwiTElORVRXT1JLSU5HIHJlY292ZXJ5IG1vZGUgc3RhcnRcIik7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGF0LmxpY29uZmlnLm1vYmlsZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQubW9iaWxlY29ubmVjdCh0cnVlKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHNjYW5uZXQgPSBzZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2NoZWNrIGZvciBhdmFpbGFibGVzIG5ldHdvcmtzJylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0LndpZmljb25uZWN0YWJsZXMoKS50aGVuKChuZXRzKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuZXRzLmxlbmd0aCA+IDAgJiYgIXRoYXQubGljb25maWcubW9iaWxlKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuaG9zdGFwZC5jbGllbnQodHJ1ZSkudGhlbihmdW5jdGlvbiAoYW5zd2VyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5tb2RlID0gJ2NsaWVudCdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGVhckludGVydmFsKHNjYW5uZXQpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2Nvbm5lY3RlZCcpXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHsgY29uZWN0aW9uOiB0cnVlLCByZWNvdmVyeTogZmFsc2UgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ25vIHdvcmtpbmcgbmV0d29ya3MgZm9yIG5vdycpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5yZWNvdmVyeSh0cnVlKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgdGhhdC5ob3N0YXBkLmxpc3R3aWZpY2xpZW50cygpLnRoZW4oKGEpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgICAgIGlmIChhLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gICAgICAgICAgIHRoYXQucmVjb3ZlcnkodHJ1ZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgfSkuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gICAgICAgY29uc29sZS5sb2coJ2xpc3Qga25vd24gbmV0d29ya3MgZXJyb3InLCBlcnIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgICBjb25zb2xlLmxvZyhlcnIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhhdC5saWNvbmZpZy5tb2JpbGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnc3RheW5nIG9uIG1vYmlsZScpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdubyBrbndvd24gd2xhbiBhdmFpbGFibGUsIHdhaXRpbmcgZm9yIG5ldHdvcmtzJylcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnbGlzdCBrbm93biBuZXR3b3JrcyBlcnJvcicsIGVycilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LCAxMjAwMDApXG5cblxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZlcmIoZXJyLCBcImVycm9yXCIsIFwiTElORVRXT1JLSU5HIHJlY292ZXJ5IG1vZGUgZXJyb3JcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoJ3JlY292ZXJ5IG1vZGUgZXJyb3InKVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhhdC5saWNvbmZpZy5tb2JpbGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lm1vYmlsZWNvbm5lY3QodHJ1ZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoYXQubGljb25maWcubW9iaWxlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lm1vYmlsZWNvbm5lY3QodHJ1ZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ25vdCBjb25uZWN0ZWQnKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KCdub3QgY29ubmVjdGVkJylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG5cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoYXQubGljb25maWcubW9iaWxlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5tb2JpbGVjb25uZWN0KHRydWUpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ25vdCBjb25uZWN0ZWQnKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoJ25vdCBjb25uZWN0ZWQnKVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSwgNTAwMClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZlcmIoXCJubyB3aWZpXCIsIFwid2FyblwiLCBcIm5ldHdvcmtlclwiKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhhdC5saWNvbmZpZy5tb2JpbGUpIHtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5tb2JpbGVjb25uZWN0KHRydWUpXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwibm8gd2lmaSEhPz8/XCIpXG5cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KCdub3QgY29ubmVjdGVkJylcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSwgNTAwMClcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcblxuXG5cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGF0LmxpY29uZmlnLm1vYmlsZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lm1vYmlsZWNvbm5lY3QodHJ1ZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnbm8gbmV0d29yaycpXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoJ25vdCBjb25uZWN0ZWQnKVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sIDUwMDApXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cblxuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICB9KVxuXG5cblxuXG5cbiAgICAgICAgICAgICAgICB9KVxuXG5cblxuXG5cblxuXG4gICAgICAgICAgICB9XG5cblxuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgcmVjb3ZlcnkoZm9yY2U/OiB0cnVlKSB7XG4gICAgICAgIGNvbnN0IGNvbmZpZyA9IHRoaXMubGljb25maWc7XG4gICAgICAgIGNvbnN0IHRoYXQgPSB0aGlzO1xuXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICByZWNvdmVyeWNoZWNrKGNvbmZpZykudGhlbihmdW5jdGlvbiAoYSkge1xuXG4gICAgICAgICAgICAgICAgY29uc3QgaW50ZXJmID0gYS5kZXZpY2VcbiAgICAgICAgICAgICAgICBpZiAoZm9yY2UgfHwgIWEua25vd25fbmV0d29ya3MpIHtcblxuXG4gICAgICAgICAgICAgICAgICAgIHRoYXQuaG9zdGFwZGNvbmYoe1xuICAgICAgICAgICAgICAgICAgICAgICAgaW50ZXJmYWNlOiBhLmRldmljZS5pbnRlcmZhY2UsXG4gICAgICAgICAgICAgICAgICAgICAgICB3cGFzdXBwbGljYW50X3BhdGg6IHRoYXQubGljb25maWcud3Bhc3VwcGxpY2FudF9wYXRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgaG9zdGFwZDogdGhhdC5saWNvbmZpZy5ob3N0YXBkXG4gICAgICAgICAgICAgICAgICAgIH0pXG5cbiAgICAgICAgICAgICAgICAgICAgbGV0IHRoZW1vZGU7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGF0LmxpY29uZmlnLm1vYmlsZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhlbW9kZSA9ICdhcCdcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoZW1vZGUgPSAnaG9zdCdcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdyZWNvdmVyeW5nICcgKyBhLmRldmljZS5pbnRlcmZhY2UgKyAnIHdpdGggbW9kZSAnICsgdGhlbW9kZSlcblxuICAgICAgICAgICAgICAgICAgICByZWNvdmVyeV9tb2RlKHRoYXQuaG9zdGFwZCwgdGhlbW9kZSkudGhlbihmdW5jdGlvbiAoYW5zd2VyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lm1vZGUgPSBhbnN3ZXI7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGFuc3dlcik7XG4gICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdCgndHJ5IGNsaWVudCBvciBmb3JjZScpXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KCdyZWNvdmVyeWNoZWNrIGVycm9yJyArIGVycik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxufTtcblxuXG5cblxuXG5cbiJdfQ==
