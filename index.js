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
    LiNetwork.prototype.wifiavailable = function () {
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
            }).catch(function (err) {
                reject(err);
            });
        });
    };
    LiNetwork.prototype.wificonnectable = function () {
        var that = this;
        return new Promise(function (resolve, reject) {
            var connectables = [];
            var WM = that.wpamanager();
            that.wifiavailable().then(function (scans) {
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
    LiNetwork.prototype.hostapdconf = function (hconfig, reconf) {
        var that = this;
        if (!hconfig) {
            throw Error('no config provided to configure hostapdconf');
        }
        else if (!that.hostapd || reconf) {
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
                                            console.log(that.liconfig.mobile);
                                            if (!that.liconfig.mobile) {
                                                var scannet_1 = setInterval(function () {
                                                    that.wificonnectable().then(function (nets) {
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
                                                            console.log('waiting for networks');
                                                        }
                                                    }).catch(function (err) {
                                                        console.log('waiting for networks');
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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SUFBSSxHQUFHLE1BQU0sQ0FBQzt3QkFDbkIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO29CQUNwQixDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHO3dCQUNsQixNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBQ2hCLENBQUMsQ0FBQyxDQUFDO2dCQUVQLENBQUM7Z0JBQUMsSUFBSSxDQUFDLENBQUM7b0JBQ0osTUFBTSxDQUFDLHFCQUFxQixDQUFDLENBQUE7Z0JBQ2pDLENBQUM7WUFFTCxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHO2dCQUNsQixNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDaEIsQ0FBQyxDQUFDLENBQUM7UUFDUCxDQUFDLENBQUMsQ0FBQztJQUNQLENBQUM7O0lBRUwsZ0JBQUM7QUFBRCxDQTFsQkEsQUEwbEJDLElBQUE7QUExbEJEOzJCQTBsQkMsQ0FBQTtBQUFBLENBQUMiLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBQcm9taXNlIGZyb20gXCJibHVlYmlyZFwiO1xuaW1wb3J0ICogYXMgZnMgZnJvbSBcImZzXCI7XG5pbXBvcnQgKiBhcyBjaGlsZF9wcm9jZXNzIGZyb20gXCJjaGlsZF9wcm9jZXNzXCI7XG5pbXBvcnQgKiBhcyBfIGZyb20gXCJsb2Rhc2hcIjtcbmltcG9ydCAqIGFzIGFzeW5jIGZyb20gXCJhc3luY1wiO1xuaW1wb3J0IFByb3ZpZGVycyA9IHJlcXVpcmUoXCJtb2JpbGUtcHJvdmlkZXJzXCIpO1xuaW1wb3J0IFdwYW1hbmFnZXIgZnJvbSBcIndwYXN1cHBsaWNhbnQtbWFuYWdlclwiO1xuaW1wb3J0IGhvc3RhcGRzd2l0Y2ggZnJvbSBcImhvc3RhcGRfc3dpdGNoXCI7XG5pbXBvcnQgdGVzdGludGVybmV0IGZyb20gXCJwcm9taXNlLXRlc3QtY29ubmVjdGlvblwiO1xuaW1wb3J0IG1lcmdlIGZyb20gXCJqc29uLWFkZFwiO1xuaW1wb3J0IFd2ZGlhbCBmcm9tIFwid3ZkaWFsanNcIjtcblxuXG5pbXBvcnQgbmV0dyBmcm9tIFwibmV0d1wiO1xuY29uc3QgdmVyYiA9IHJlcXVpcmUoXCJ2ZXJib1wiKTtcbmNvbnN0IGh3cmVzdGFydCA9IHJlcXVpcmUoXCJod3Jlc3RhcnRcIik7XG5cblxuXG5cbmludGVyZmFjZSBJUHJvdmlkZXIge1xuXG4gICAgbGFiZWw/OiBzdHJpbmc7XG4gICAgYXBuOiBzdHJpbmc7XG4gICAgcGhvbmU/OiBzdHJpbmdcbiAgICB1c2VybmFtZT86IHN0cmluZztcbiAgICBwYXNzd29yZD86IHN0cmluZztcblxufVxuXG5pbnRlcmZhY2UgSUdsb2JhbFByb3ZpZGVycyB7XG5cbiAgICBjb3VudHJ5OiBzdHJpbmc7XG4gICAgcHJvdmlkZXJzOiBJUHJvdmlkZXJbXTtcbn1cblxuXG50eXBlIEltb2RlID0gJ2FwJyB8ICdob3N0JyB8ICdjbGllbnQnIHwgJ3VubWFuYWdlZCcgfCAnd3YnIHwgJ2V0aGVybmV0J1xuXG5cbmludGVyZmFjZSBJU2NhbiB7XG4gICAgZXNzaWQ6IHN0cmluZztcbiAgICBtYWM6IHN0cmluZztcbiAgICBzaWduYWw6IHN0cmluZztcbn1cblxudHlwZSBJTmV0d29ya1R5cGUgPSAnd2lmaScgfCAnd2lyZWQnXG5cbmludGVyZmFjZSBJTmV0d29yayB7XG4gICAgdHlwZTogSU5ldHdvcmtUeXBlO1xuICAgIG1hYzogc3RyaW5nO1xuICAgIGludGVyZmFjZTogc3RyaW5nO1xuICAgIGVzc2lkPzogc3RyaW5nO1xuICAgIHNjYW4/OiBJU2NhbltdO1xuICAgIGlwPzogc3RyaW5nO1xuICAgIGdhdGV3YXk/OiBzdHJpbmc7XG59XG5cbmludGVyZmFjZSBDbGFzc09wdCB7XG4gICAgd2lmaV9pbnRlcmZhY2U/OiBzdHJpbmc7XG4gICAgbW9iaWxlPzogSU1vYmlsZTtcbiAgICBob3N0YXBkPzogSUhvc3RhcGRjZjtcbiAgICB3cGFzdXBwbGljYW50X3BhdGg/OiBzdHJpbmc7XG59XG5pbnRlcmZhY2UgSU1vYmlsZSB7XG4gICAgcHJvdmlkZXI6IElQcm92aWRlcjtcbiAgICBkZXZpY2U/OiBhbnk7XG4gICAgY29uZmlnRmlsZVBhdGg/OiBzdHJpbmc7XG5cbn1cblxuaW50ZXJmYWNlIElFdGhlcm5ldCB7XG4gICAgaW50ZXJmYWNlOiBzdHJpbmc7XG4gICAgZGhjcD86IHtcbiAgICAgICAgaXA/OiBzdHJpbmc7XG4gICAgICAgIGdhdGV3YXk/OiBzdHJpbmc7XG4gICAgICAgIG5ldG1hc2s/OiBzdHJpbmc7XG4gICAgICAgIGJjYXN0Pzogc3RyaW5nO1xuICAgIH1cbn1cblxuaW50ZXJmYWNlIElMaU5ldHdvcmtDb25mIHtcbiAgICB3aWZpX2ludGVyZmFjZTogc3RyaW5nO1xuICAgIG1vYmlsZT86IElNb2JpbGU7XG4gICAgaG9zdGFwZDogSUhvc3RhcGQ7XG4gICAgd3Bhc3VwcGxpY2FudF9wYXRoPzogc3RyaW5nO1xuICAgIGV0aGVybmV0PzogSUV0aGVybmV0W10sXG4gICAgcmVjb3Zlcnk6IGJvb2xlYW5cbn1cbmludGVyZmFjZSBJTGlOZXR3b3JrQ29uZlBhcmFtcyB7XG4gICAgd2lmaV9pbnRlcmZhY2U/OiBzdHJpbmc7XG4gICAgbW9iaWxlPzogSU1vYmlsZTtcbiAgICBob3N0YXBkPzogSUhvc3RhcGQ7XG4gICAgd3Bhc3VwcGxpY2FudF9wYXRoPzogc3RyaW5nO1xuICAgIGV0aGVybmV0Pzoge1xuICAgICAgICBpbnRlcmZhY2U6IHN0cmluZztcbiAgICAgICAgZGhjcD86IHtcbiAgICAgICAgICAgIGlwPzogc3RyaW5nO1xuICAgICAgICAgICAgZ2F0ZXdheT86IHN0cmluZztcbiAgICAgICAgICAgIG5ldG1hc2s/OiBzdHJpbmc7XG4gICAgICAgICAgICBiY2FzdD86IHN0cmluZztcbiAgICAgICAgfVxuICAgIH0sXG4gICAgcmVjb3Zlcnk/OiB0cnVlXG59XG5cbmludGVyZmFjZSBJSG9zdGFwZCB7XG4gICAgZHJpdmVyOiBzdHJpbmc7XG4gICAgc3NpZDogc3RyaW5nO1xuICAgIHdwYV9wYXNzcGhyYXNlOiBhbnk7XG59O1xuaW50ZXJmYWNlIElIb3N0YXBkY2Yge1xuICAgIGRyaXZlcj86IHN0cmluZztcbiAgICBzc2lkOiBzdHJpbmc7XG4gICAgd3BhX3Bhc3NwaHJhc2U6IGFueTtcbn07XG5cbmludGVyZmFjZSBJSG9zdGFwZENmIHtcbiAgICBkcml2ZXI/OiBzdHJpbmc7XG4gICAgc3NpZD86IHN0cmluZztcbiAgICB3cGFfcGFzc3BocmFzZT86IHN0cmluZztcbn07XG5cbmludGVyZmFjZSBJRG5zbWFzcSB7XG4gICAgaW50ZXJmYWNlOiBzdHJpbmc7XG59O1xuaW50ZXJmYWNlIElEbnNtYXNxQ2Yge1xuICAgIGludGVyZmFjZT86IHN0cmluZztcbn07XG5pbnRlcmZhY2UgSUhDb25mIHtcbiAgICBpbnRlcmZhY2U/OiBzdHJpbmc7XG4gICAgd3Bhc3VwcGxpY2FudF9wYXRoPzogc3RyaW5nO1xuICAgIGhvc3RhcGQ/OiBJSG9zdGFwZENmO1xuICAgIHJlZGlyZWN0PzogYm9vbGVhbjtcbiAgICBkbnNtYXNxPzogSURuc21hc3FDZjtcbn07XG5cbmludGVyZmFjZSBJQ29ubmVjdGlvbiB7XG5cbiAgICBsaW5rVHlwZTogc3RyaW5nO1xuICAgIGludGVyZmFjZTogc3RyaW5nO1xuICAgIGlwPzogc3RyaW5nO1xuICAgIGdhdGV3YXk/OiBzdHJpbmc7XG5cbn1cblxuaW50ZXJmYWNlIElJbml0IHtcbiAgICBjb25lY3Rpb246IGJvb2xlYW47XG4gICAgcmVjb3Zlcnk6IGJvb2xlYW47XG4gICAgZGV0YWlscz86IElDb25uZWN0aW9uO1xufVxuXG5cblxuXG5mdW5jdGlvbiBnZXR3aWZpaW50ZXJmYShzZXR0ZWQ/OiBzdHJpbmcpOiBQcm9taXNlPElOZXR3b3JrPiB7XG5cbiAgICByZXR1cm4gbmV3IFByb21pc2U8SU5ldHdvcms+KGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgbGV0IHdpZmlfZXhpc3Q6IGJvb2xlYW4gPSBmYWxzZTtcbiAgICAgICAgbGV0IGRldmk6IElOZXR3b3JrO1xuICAgICAgICBuZXR3KCkudGhlbihmdW5jdGlvbiAobmV0d29ya3MpIHtcblxuICAgICAgICAgICAgXy5tYXAobmV0d29ya3MsIGZ1bmN0aW9uIChkZXZpY2UpIHtcblxuICAgICAgICAgICAgICAgIGlmIChkZXZpY2UudHlwZSA9PT0gXCJ3aWZpXCIgJiYgIXdpZmlfZXhpc3QgJiYgKCFzZXR0ZWQgfHwgc2V0dGVkID09PSBcImF1dG9cIiB8fCBzZXR0ZWQgPT09IGRldmljZS5pbnRlcmZhY2UpKSB7XG4gICAgICAgICAgICAgICAgICAgIHdpZmlfZXhpc3QgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBkZXZpID0gZGV2aWNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBpZiAod2lmaV9leGlzdCkge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoZGV2aSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlamVjdCh7IGVycm9yOiBcImRldmljZSBub3QgZm91bmRlZFwiIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICB9KTtcblxuICAgIH0pO1xuXG59XG5cblxuZnVuY3Rpb24gcmVjb3ZlcnlfbW9kZShhcHN3aXRjaCk6IFByb21pc2U8SW1vZGU+IHtcblxuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlPEltb2RlPihmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG5cblxuXG5cbiAgICAgICAgYXBzd2l0Y2guaG9zdCgpLnRoZW4oZnVuY3Rpb24gKGFuc3dlcikge1xuICAgICAgICAgICAgdmVyYihhbnN3ZXIsIFwid2FyblwiLCBcImxpbmV0d29yayByZWNvdmVyeSBtb2RlIFwiKTtcbiAgICAgICAgICAgIHJlc29sdmUoJ2hvc3QnKTtcbiAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgdmVyYihlcnIsIFwiZXJyb3JcIiwgXCJsaW5ldHdvcmsgcmVjb3ZlcnkgbW9kZSBmYWlsZWRcIik7XG4gICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG59XG5cblxuZnVuY3Rpb24gcmVjb3ZlcnljaGVjayhjb25maWc6IElMaU5ldHdvcmtDb25mKTogUHJvbWlzZTx7IGRldmljZTogSU5ldHdvcmssIGtub3duX25ldHdvcmtzOiBib29sZWFuIH0+IHtcblxuICAgIHJldHVybiBuZXcgUHJvbWlzZTx7IGRldmljZTogSU5ldHdvcmssIGtub3duX25ldHdvcmtzOiBib29sZWFuIH0+KGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcblxuICAgICAgICBsZXQgc29tZW5ldHdvcmtfZXhpc3RzOiBib29sZWFuID0gZmFsc2U7XG4gICAgICAgIGxldCB3bGFuX2V4aXN0czogYm9vbGVhbiA9IGZhbHNlO1xuXG4gICAgICAgIGxldCBkZXZpOiBJTmV0d29yaztcblxuICAgICAgICBuZXR3KCkudGhlbihmdW5jdGlvbiAobmV0d29ya3MpIHtcblxuICAgICAgICAgICAgXy5tYXAobmV0d29ya3MsIGZ1bmN0aW9uIChkZXZpY2UpIHtcblxuICAgICAgICAgICAgICAgIGlmIChkZXZpY2Uuc2NhbiAmJiBkZXZpY2UudHlwZSA9PT0gXCJ3aWZpXCIgJiYgIXNvbWVuZXR3b3JrX2V4aXN0cyAmJiAoIWNvbmZpZy53aWZpX2ludGVyZmFjZSB8fCBjb25maWcud2lmaV9pbnRlcmZhY2UgPT09IFwiYXV0b1wiIHx8IGNvbmZpZy53aWZpX2ludGVyZmFjZSA9PT0gZGV2aWNlLmludGVyZmFjZSkpIHtcblxuICAgICAgICAgICAgICAgICAgICBjb25zdCBXTSA9IG5ldyBXcGFtYW5hZ2VyKGNvbmZpZy53cGFzdXBwbGljYW50X3BhdGgpXG5cbiAgICAgICAgICAgICAgICAgICAgXy5tYXAoZGV2aWNlLnNjYW4sIGZ1bmN0aW9uIChuZXRzY2FuOiBJU2Nhbikge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBfLm1hcChXTS5saXN0d3BhLCBmdW5jdGlvbiAod3BhaXRlbSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh3cGFpdGVtLnNzaWQgPT09IG5ldHNjYW4uZXNzaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc29tZW5ldHdvcmtfZXhpc3RzID0gdHJ1ZTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICghd2xhbl9leGlzdHMgJiYgZGV2aWNlLnR5cGUgPT09IFwid2lmaVwiICYmICghY29uZmlnLndpZmlfaW50ZXJmYWNlIHx8IGNvbmZpZy53aWZpX2ludGVyZmFjZSA9PT0gXCJhdXRvXCIgfHwgY29uZmlnLndpZmlfaW50ZXJmYWNlID09PSBkZXZpY2UuaW50ZXJmYWNlKSkge1xuICAgICAgICAgICAgICAgICAgICB3bGFuX2V4aXN0cyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGRldmkgPSBkZXZpY2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGlmICghc29tZW5ldHdvcmtfZXhpc3RzICYmIHdsYW5fZXhpc3RzKSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7IGRldmljZTogZGV2aSwga25vd25fbmV0d29ya3M6IGZhbHNlIH0pO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh3bGFuX2V4aXN0cykge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoeyBkZXZpY2U6IGRldmksIGtub3duX25ldHdvcmtzOiB0cnVlIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZWplY3QoJ25vIGludGVyZmFjZScpXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgcmVqZWN0KHsgZXJyb3I6IGVyciwgZGVzY3JpcHRpb246ICduZXR3IGVycicgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgfSk7XG5cblxufVxuXG5cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTGlOZXR3b3JrIHtcbiAgICBsaWNvbmZpZzogSUxpTmV0d29ya0NvbmY7XG4gICAgaG9zdGFwZDogaG9zdGFwZHN3aXRjaDtcbiAgICBtb2JpbGU6IFd2ZGlhbDtcbiAgICBtb2RlOiBJbW9kZTtcbiAgICBpc0Nvbm5lY3RlZDogYm9vbGVhbjtcblxuXG4gICAgY29uc3RydWN0b3IoZGF0YTogSUxpTmV0d29ya0NvbmZQYXJhbXMpIHtcblxuXG4gICAgICAgIGNvbnN0IGNvbmZpZzogSUxpTmV0d29ya0NvbmYgPSB7XG4gICAgICAgICAgICBob3N0YXBkOiB7XG4gICAgICAgICAgICAgICAgZHJpdmVyOiBcIm5sODAyMTFcIixcbiAgICAgICAgICAgICAgICBzc2lkOiBcInRlc3R0dGFwXCIsXG4gICAgICAgICAgICAgICAgd3BhX3Bhc3NwaHJhc2U6IFwidGVzdHBhc3NcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHdpZmlfaW50ZXJmYWNlOiBcImF1dG9cIixcbiAgICAgICAgICAgIHdwYXN1cHBsaWNhbnRfcGF0aDogXCIvZXRjL3dwYV9zdXBwbGljYW50L3dwYV9zdXBwbGljYW50LmNvbmZcIixcbiAgICAgICAgICAgIGV0aGVybmV0OiBbe1xuICAgICAgICAgICAgICAgIGludGVyZmFjZTogJ2V0aDAnXG4gICAgICAgICAgICB9XSxcbiAgICAgICAgICAgIHJlY292ZXJ5OiBmYWxzZVxuICAgICAgICB9O1xuXG4gICAgICAgIG1lcmdlKGNvbmZpZywgZGF0YSk7IC8vIGNvbWJpbmUgZGVmYXVsdCBzZXR0aW5ncyB3aXRoIG5ldyBwYXJhbWV0ZXJzIGZyb20gZGF0YVxuICAgICAgICB0aGlzLm1vZGUgPSAndW5tYW5hZ2VkJ1xuXG4gICAgICAgIHRoaXMubGljb25maWcgPSBjb25maWc7XG5cblxuICAgICAgICBpZiAodGhpcy5saWNvbmZpZy5tb2JpbGUpIHtcbiAgICAgICAgICAgIGlmICghdGhpcy5saWNvbmZpZy5tb2JpbGUuY29uZmlnRmlsZVBhdGgpIHRoaXMubGljb25maWcubW9iaWxlLmNvbmZpZ0ZpbGVQYXRoID0gXCIvZXRjL3d2ZGlhbC5jb25mXCI7XG5cbiAgICAgICAgICAgIHRoaXMubW9iaWxlID0gbmV3IFd2ZGlhbCh0aGlzLmxpY29uZmlnLm1vYmlsZSlcbiAgICAgICAgfVxuXG5cbiAgICB9XG5cblxuXG4gICAgZXRoZXJuZXRjb25uZWN0KGRldmljZW5hbWU/OiBzdHJpbmcpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICAgICAgY29uc3QgdGhhdCA9IHRoaXNcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPGJvb2xlYW4+KGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgIGlmICh0aGF0LmxpY29uZmlnLmV0aGVybmV0KSB7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBjb25uZWN0aW9uZGV2aWNlc2FycmF5OiBJTmV0d29ya1tdID0gW107XG5cbiAgICAgICAgICAgICAgICBsZXQgZGV2aWNlZXhpc3RzOiBib29sZWFuID0gZmFsc2VcbiAgICAgICAgICAgICAgICBsZXQgZGV2aWNlOiBJTmV0d29yaztcbiAgICAgICAgICAgICAgICAvLyBjaGVlY2sgY29uZmlndXJhdGlvblxuICAgICAgICAgICAgICAgIG5ldHcoKS50aGVuKChhKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIF8ubWFwKGEsIChuZXQpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIF8ubWFwKHRoYXQubGljb25maWcuZXRoZXJuZXQsIChuZXRpbnRlcmZhY2Vjb25maWd1cmVkKSA9PiB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobmV0LnR5cGUgPT09ICd3aXJlZCcgJiYgKCghZGV2aWNlbmFtZSAmJiBuZXQuaW50ZXJmYWNlID09PSBuZXRpbnRlcmZhY2Vjb25maWd1cmVkLmludGVyZmFjZSkgfHwgZGV2aWNlbmFtZSA9PT0gbmV0LmludGVyZmFjZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGV2aWNlZXhpc3RzID0gdHJ1ZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXZpY2UgPSBuZXRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29ubmVjdGlvbmRldmljZXNhcnJheS5wdXNoKG5ldClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIH0pXG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGRldmljZWV4aXN0cykge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgY29ubmVjdGVkOiBib29sZWFuID0gZmFsc2U7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGFzeW5jLmVhY2hTZXJpZXMoY29ubmVjdGlvbmRldmljZXNhcnJheSwgKGRldmljZSwgY2IpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWNvbm5lY3RlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaGlsZF9wcm9jZXNzLmV4ZWMoJ2lmY29uZmlnICcgKyBkZXZpY2UuaW50ZXJmYWNlICsgJyBkb3duICYmIGlmY29uZmlnICcgKyBkZXZpY2UuaW50ZXJmYWNlICsgJyB1cCAmJiBkaGNsaWVudCAnICsgZGV2aWNlLmludGVyZmFjZSwgKGVyciwgc3Rkb3V0LCBzdGRlcnIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYigpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQudGVzdGludGVybmV0KCkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbm5lY3RlZCA9IHRydWVcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYigpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNiKClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIH0sIChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWNvbm5lY3RlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoJ25vIGNvbm5lY3Rpb24gYnkgYSBldGhlcm5ldCBkZXZpY2UnKVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIG5lZWQgYXN5bmMgdG8gcHJvY2VzcyBldmVyeW9uZVxuXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoJ25vIGV0aGVybmV0IGRldmljZScpXG4gICAgICAgICAgICAgICAgICAgIH1cblxuXG4gICAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgICAgIC8vIGNoZWNrIGlmIGl0IGlzIGp1c3QgY29ubmVjdGVkIGJ5IGV0aDBcbiAgICAgICAgICAgICAgICAvLyBpZiBpcyBjb25uZWN0ZWQgYWxsIG9rLlxuICAgICAgICAgICAgICAgIC8vIGVsc2UgdGhhdC5ldGhlcm5ldHJlY29ubmVjdChkZXZpY2UpXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlamVjdCgnaW52YWxpZCBldGhlcm5ldCBjb25mJylcblxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuXG4gICAgfVxuXG4gICAgZXRoZXJuZXRyZWNvbm5lY3QoZGV2aWNlPzogYW55KSB7XG4gICAgICAgIGNvbnN0IHRoYXQgPSB0aGlzXG5cbiAgICB9XG5cbiAgICBtb2JpbGVjb25uZWN0KGJvb2w6IGJvb2xlYW4pIHtcbiAgICAgICAgY29uc3QgdGhhdCA9IHRoaXM7XG5cbiAgICAgICAgY29uc3QgV3YgPSB0aGF0Lm1vYmlsZTtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPGJvb2xlYW4+KGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgIFd2LmNvbmZpZ3VyZShib29sKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBXdi5jb25uZWN0KHRydWUpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICB0aGF0Lm1vZGUgPSAnd3YnXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwibW9kZW0gc3RhcnRlZFwiKTtcblxuICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJtb2RlbSBlcnJvclwiKTtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG5cblxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSlcblxuXG5cblxuICAgICAgICB9KTtcblxuICAgIH07XG4gICAgd2lmaWF2YWlsYWJsZSgpOiBQcm9taXNlPElTY2FuW10+IHtcbiAgICAgICAgY29uc3QgdGhhdCA9IHRoaXM7XG5cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPElTY2FuW10+KGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgIGNvbnN0IGF2YWlsYWJsZW5ldHMgPSBbXVxuICAgICAgICAgICAgdGhhdC5uZXR3b3JrcygpLnRoZW4oKG5ldHMpID0+IHtcbiAgICAgICAgICAgICAgICBfLm1hcChuZXRzLCAobmV0KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChuZXQudHlwZSA9PT0gXCJ3aWZpXCIgJiYgbmV0LnNjYW4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIF8ubWFwKG5ldC5zY2FuLCAoc2Nhbm5lZG9uZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF2YWlsYWJsZW5ldHMucHVzaChzY2FubmVkb25lKVxuICAgICAgICAgICAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfSkuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICAgICAgICAgIHJlamVjdChlcnIpXG4gICAgICAgICAgICB9KVxuXG5cbiAgICAgICAgfSlcblxuICAgIH1cblxuICAgIHdpZmljb25uZWN0YWJsZSgpOiBQcm9taXNlPElTY2FuW10+IHtcbiAgICAgICAgY29uc3QgdGhhdCA9IHRoaXM7XG5cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPElTY2FuW10+KGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgIGNvbnN0IGNvbm5lY3RhYmxlcyA9IFtdXG4gICAgICAgICAgICBjb25zdCBXTSA9IHRoYXQud3BhbWFuYWdlcigpXG5cbiAgICAgICAgICAgIHRoYXQud2lmaWF2YWlsYWJsZSgpLnRoZW4oKHNjYW5zKSA9PiB7XG4gICAgICAgICAgICAgICAgXy5tYXAoc2NhbnMsIChzY2FubmVkb25lKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIF8ubWFwKFdNLmxpc3R3cGEsICh3cGEpID0+IHtcblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHdwYS5zc2lkID09PSBzY2FubmVkb25lLmVzc2lkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29ubmVjdGFibGVzLnB1c2goc2Nhbm5lZG9uZSlcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgcmVzb2x2ZShjb25uZWN0YWJsZXMpXG4gICAgICAgICAgICB9KS5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KGVycilcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pXG5cbiAgICB9XG5cblxuXG4gICAgbmV0d29ya3MoKTogUHJvbWlzZTxJTmV0d29ya1tdPiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTxJTmV0d29ya1tdPihmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG5cbiAgICAgICAgICAgIG5ldHcoKS50aGVuKGZ1bmN0aW9uIChhKSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShhKVxuICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgIHJlamVjdChlcnIpXG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgIH1cbiAgICBuZXR3b3JrKGRldmljZW5hbWU6IHN0cmluZyk6IFByb21pc2U8SU5ldHdvcms+IHtcbiAgICAgICAgY29uc3QgdGhhdCA9IHRoaXM7XG4gICAgICAgIGxldCBuZXRleGlzdHM6IGJvb2xlYW4gPSBmYWxzZVxuICAgICAgICBsZXQgbmV0d29ya2ludGVyZmFjZTogSU5ldHdvcms7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTxJTmV0d29yaz4oZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuXG4gICAgICAgICAgICB0aGF0Lm5ldHdvcmtzKCkudGhlbihmdW5jdGlvbiAoYSkge1xuICAgICAgICAgICAgICAgIF8ubWFwKGEsIChuZXQpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFuZXRleGlzdHMgJiYgbmV0LmludGVyZmFjZSA9PT0gZGV2aWNlbmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV0ZXhpc3RzID0gdHJ1ZVxuICAgICAgICAgICAgICAgICAgICAgICAgbmV0d29ya2ludGVyZmFjZSA9IG5ldFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICBpZiAobmV0ZXhpc3RzKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUobmV0d29ya2ludGVyZmFjZSlcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZWplY3QoJ25vIG5ldHdvcmsnKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICByZWplY3QoZXJyKVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICB0ZXN0aW50ZXJuZXQoKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG5cbiAgICAgICAgICAgIHRlc3RpbnRlcm5ldCgpLnRoZW4oZnVuY3Rpb24gKGEpIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKGEpXG4gICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KGVycilcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBob3N0YXBkY29uZihoY29uZmlnOiBJSENvbmYsIHJlY29uZj86IHRydWUpIHsgLy8gcmVjb25mIGlzIGV4cGVyaW1lbnRhbFxuICAgICAgICBjb25zdCB0aGF0ID0gdGhpc1xuICAgICAgICBpZiAoIWhjb25maWcpIHtcbiAgICAgICAgICAgIHRocm93IEVycm9yKCdubyBjb25maWcgcHJvdmlkZWQgdG8gY29uZmlndXJlIGhvc3RhcGRjb25mJylcbiAgICAgICAgfSBlbHNlIGlmICghdGhhdC5ob3N0YXBkIHx8IHJlY29uZikge1xuICAgICAgICAgICAgdGhhdC5ob3N0YXBkID0gbmV3IGhvc3RhcGRzd2l0Y2goaGNvbmZpZywgdHJ1ZSk7XG4gICAgICAgIH1cblxuICAgIH1cblxuICAgIHdwYW1hbmFnZXIoKSB7XG4gICAgICAgIGNvbnN0IHBhdGggPSB0aGlzLmxpY29uZmlnLndwYXN1cHBsaWNhbnRfcGF0aDtcbiAgICAgICAgcmV0dXJuIG5ldyBXcGFtYW5hZ2VyKHRoaXMubGljb25maWcud3Bhc3VwcGxpY2FudF9wYXRoKTtcbiAgICB9XG5cblxuICAgIG1vYmlsZXByb3ZpZGVycygpIHtcblxuICAgICAgICByZXR1cm4gbmV3IFByb3ZpZGVycygpXG5cbiAgICB9XG5cbiAgICB3aWZpX3N3aXRjaChtb2RlOiBzdHJpbmcsIGRldj86IHN0cmluZykge1xuICAgICAgICBjb25zb2xlLmxvZyhtb2RlLCBkZXYpO1xuICAgICAgICBjb25zdCB0aGF0ID0gdGhpcztcbiAgICAgICAgY29uc3QgY29uZmlnID0gdGhhdC5saWNvbmZpZztcblxuICAgICAgICBpZiAoZGV2IHx8IHRoaXMubGljb25maWcud2lmaV9pbnRlcmZhY2UgIT09IFwiYXV0b1wiKSB7XG5cbiAgICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTxib29sZWFuPihmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG5cblxuICAgICAgICAgICAgICAgIGlmICghZGV2KSB7XG4gICAgICAgICAgICAgICAgICAgIGRldiA9IGNvbmZpZy53aWZpX2ludGVyZmFjZTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImRldiBtb2RlXCIpO1xuICAgICAgICAgICAgICAgIHRoYXQuaG9zdGFwZGNvbmYoe1xuICAgICAgICAgICAgICAgICAgICBpbnRlcmZhY2U6IGRldixcbiAgICAgICAgICAgICAgICAgICAgd3Bhc3VwcGxpY2FudF9wYXRoOiBjb25maWcud3Bhc3VwcGxpY2FudF9wYXRoLFxuICAgICAgICAgICAgICAgICAgICBob3N0YXBkOiBjb25maWcuaG9zdGFwZFxuICAgICAgICAgICAgICAgIH0pXG5cbiAgICAgICAgICAgICAgICBzd2l0Y2ggKG1vZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcImFwXCI6XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lmhvc3RhcGQuYXAoKS50aGVuKGZ1bmN0aW9uIChhbnN3ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lm1vZGUgPSAnYXAnXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcImhvc3RcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuaG9zdGFwZC5ob3N0KCkudGhlbihmdW5jdGlvbiAoYW5zd2VyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5tb2RlID0gJ2hvc3QnXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcImNsaWVudFwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5ob3N0YXBkLmNsaWVudCgpLnRoZW4oZnVuY3Rpb24gKGFuc3dlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQubW9kZSA9ICdjbGllbnQnXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJhdXRvIG1vZGVcIik7XG4gICAgICAgICAgICBjb25zdCBjb25maWcgPSB0aGlzLmxpY29uZmlnO1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgICAgICBuZXR3KCkudGhlbihmdW5jdGlvbiAobmV0d29ya3MpIHtcblxuICAgICAgICAgICAgICAgICAgICBfLm1hcChuZXR3b3JrcywgZnVuY3Rpb24gKGRldmljZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRldmljZS50eXBlID09PSBcIndpZmlcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRldiA9IGRldmljZS5pbnRlcmZhY2U7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZGV2KSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuaG9zdGFwZGNvbmYoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGludGVyZmFjZTogZGV2LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhvc3RhcGQ6IGNvbmZpZy5ob3N0YXBkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdwYXN1cHBsaWNhbnRfcGF0aDogY29uZmlnLndwYXN1cHBsaWNhbnRfcGF0aFxuICAgICAgICAgICAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2codGhhdC5ob3N0YXBkKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgc3dpdGNoIChtb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBcImFwXCI6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuaG9zdGFwZC5hcCgpLnRoZW4oZnVuY3Rpb24gKGFuc3dlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5tb2RlID0gJ2FwJ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgXCJob3N0XCI6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuaG9zdGFwZC5ob3N0KCkudGhlbihmdW5jdGlvbiAoYW5zd2VyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lm1vZGUgPSAnaG9zdCdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFwiY2xpZW50XCI6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuaG9zdGFwZC5jbGllbnQoKS50aGVuKGZ1bmN0aW9uIChhbnN3ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQubW9kZSA9ICdjbGllbnQnXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoeyBlcnJvcjogXCJubyBkZXZcIiB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG5cblxuXG5cblxuICAgIGNvbm5lY3Rpb24oKSB7XG4gICAgICAgIGNvbnN0IHRoYXQgPSB0aGlzO1xuICAgICAgICBjb25zdCByZWNvdmVyeSA9IHRoYXQubGljb25maWcucmVjb3ZlcnlcblxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgICAgdmVyYih0aGF0LmxpY29uZmlnLCBcImRlYnVnXCIsIFwiVHJ5bmcgdG8gY29ubmVjdFwiKTtcblxuICAgICAgICAgICAgaWYgKHRoYXQubW9kZSA9PT0gXCJ3dlwiKSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KFwiYXV0byBtb2RlXCIpXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJ3diBydW5uaW5nLCBub3RoaW5nIHRvIGRvXCIpXG4gICAgICAgICAgICB9IGVsc2Uge1xuXG5cbiAgICAgICAgICAgICAgICB0aGF0LnRlc3RpbnRlcm5ldCgpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHRydWUpXG4gICAgICAgICAgICAgICAgfSkuY2F0Y2goKGVycikgPT4ge1xuXG5cbiAgICAgICAgICAgICAgICAgICAgdGhhdC5ldGhlcm5ldGNvbm5lY3QoKS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdjb25uZWN0ZWQgYnkgZXRoZXJuZXQnKVxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKVxuXG4gICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKCgpID0+IHtcblxuICAgICAgICAgICAgICAgICAgICAgICAgZ2V0d2lmaWludGVyZmEodGhhdC5saWNvbmZpZy53aWZpX2ludGVyZmFjZSkudGhlbihmdW5jdGlvbiAoaW50ZXJmKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB3aWZpX2V4aXN0OiBzdHJpbmcgPSBpbnRlcmYuaW50ZXJmYWNlO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY29uZmhhcGRzID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnRlcmZhY2U6IHdpZmlfZXhpc3QsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdwYXN1cHBsaWNhbnRfcGF0aDogdGhhdC5saWNvbmZpZy53cGFzdXBwbGljYW50X3BhdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhvc3RhcGQ6IHRoYXQubGljb25maWcuaG9zdGFwZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAod2lmaV9leGlzdCkge1xuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmVyYih3aWZpX2V4aXN0LCBcImluZm9cIiwgXCJXbGFuIGludGVyZmFjZSBmb3VuZGVkXCIpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuaG9zdGFwZGNvbmYoY29uZmhhcGRzKVxuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5ob3N0YXBkLmNsaWVudCh0cnVlKS50aGVuKGZ1bmN0aW9uIChhbnN3ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQubW9kZSA9ICdjbGllbnQnXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHsgY29uZWN0aW9uOiB0cnVlLCByZWNvdmVyeTogZmFsc2UgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcblxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhhdC5saWNvbmZpZy5tb2JpbGUpIHtcblxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5tb2JpbGUuY29uZmlndXJlKCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQubW9kZSA9IFwid3ZcIjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJtb2RlbSBzdGFydGVkXCIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQubW9iaWxlLmNvbm5lY3QodHJ1ZSkudGhlbihmdW5jdGlvbiAoYSkge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBod3Jlc3RhcnQoXCJ1bnBsdWdcIilcblxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwibW9kZW0gZXJyb3JcIilcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaHdyZXN0YXJ0KFwidW5wbHVnXCIpXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJtb2RlbSBlcnJvclwiKVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGh3cmVzdGFydChcInVucGx1Z1wiKVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cblxuXG5cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZWNvdmVyeSAmJiB3aWZpX2V4aXN0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5yZWNvdmVyeSh0cnVlKS50aGVuKGZ1bmN0aW9uIChhbnN3ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmVyYihhbnN3ZXIsIFwiaW5mb1wiLCBcIkxJTkVUV09SS0lORyByZWNvdmVyeSBtb2RlIHN0YXJ0XCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyh0aGF0LmxpY29uZmlnLm1vYmlsZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGF0LmxpY29uZmlnLm1vYmlsZSkge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzY2FubmV0ID0gc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQud2lmaWNvbm5lY3RhYmxlKCkudGhlbigobmV0cykgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobmV0cy5sZW5ndGggPiAwKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuaG9zdGFwZC5jbGllbnQodHJ1ZSkudGhlbihmdW5jdGlvbiAoYW5zd2VyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5tb2RlID0gJ2NsaWVudCdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGVhckludGVydmFsKHNjYW5uZXQpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2Nvbm5lY3RlZCcpXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHsgY29uZWN0aW9uOiB0cnVlLCByZWNvdmVyeTogZmFsc2UgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ25vIHdvcmtpbmcgbmV0d29ya3MgZm9yIG5vdycpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5yZWNvdmVyeSh0cnVlKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCd3YWl0aW5nIGZvciBuZXR3b3JrcycpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCd3YWl0aW5nIGZvciBuZXR3b3JrcycpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSwgOTAwMDApXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2ZXJiKGVyciwgXCJlcnJvclwiLCBcIkxJTkVUV09SS0lORyByZWNvdmVyeSBtb2RlIGVycm9yXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoJ3JlY292ZXJ5IG1vZGUgZXJyb3InKVxuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ25vdCBjb25uZWN0ZWQnKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdCgnbm90IGNvbm5lY3RlZCcpXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG5cblxuICAgICAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmVyYihcIm5vIHdpZmlcIiwgXCJ3YXJuXCIsIFwibmV0d29ya2VyXCIpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoYXQubGljb25maWcubW9iaWxlKSB7XG5cblxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQubW9iaWxlLmNvbmZpZ3VyZSgpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5tb2RlID0gXCJ3dlwiO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5tb2JpbGUuY29ubmVjdCh0cnVlKS50aGVuKGZ1bmN0aW9uIChhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBod3Jlc3RhcnQoXCJ1bnBsdWdcIilcblxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGUpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJtb2RlbSBlcnJvclwiKVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaHdyZXN0YXJ0KFwidW5wbHVnXCIpXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwibW9kZW0gZXJyb3JcIilcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaHdyZXN0YXJ0KFwidW5wbHVnXCIpXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwibm8gd2lmaSEhPz8/XCIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGh3cmVzdGFydChcInVucGx1Z1wiKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cblxuXG4gICAgICAgICAgICAgICAgICAgIH0pXG5cblxuXG5cblxuICAgICAgICAgICAgICAgIH0pXG5cblxuXG5cblxuXG5cbiAgICAgICAgICAgIH1cblxuXG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICByZWNvdmVyeShmb3JjZT86IHRydWUpIHtcbiAgICAgICAgY29uc3QgY29uZmlnID0gdGhpcy5saWNvbmZpZztcbiAgICAgICAgY29uc3QgdGhhdCA9IHRoaXM7XG5cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgIHJlY292ZXJ5Y2hlY2soY29uZmlnKS50aGVuKGZ1bmN0aW9uIChhKSB7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBpbnRlcmYgPSBhLmRldmljZVxuICAgICAgICAgICAgICAgIGlmIChmb3JjZSB8fCAhYS5rbm93bl9uZXR3b3Jrcykge1xuXG5cbiAgICAgICAgICAgICAgICAgICAgdGhhdC5ob3N0YXBkY29uZih7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbnRlcmZhY2U6IGEuZGV2aWNlLmludGVyZmFjZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHdwYXN1cHBsaWNhbnRfcGF0aDogdGhhdC5saWNvbmZpZy53cGFzdXBwbGljYW50X3BhdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICBob3N0YXBkOiB0aGF0LmxpY29uZmlnLmhvc3RhcGRcbiAgICAgICAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgICAgICAgICByZWNvdmVyeV9tb2RlKHRoYXQuaG9zdGFwZCkudGhlbihmdW5jdGlvbiAoYW5zd2VyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lm1vZGUgPSBhbnN3ZXI7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGFuc3dlcik7XG4gICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdCgndHJ5IGNsaWVudCBvciBmb3JjZScpXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxufTtcblxuXG5cblxuXG5cbiJdfQ==
