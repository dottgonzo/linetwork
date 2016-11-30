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
var listwificlients_1 = require("listwificlients");
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
            getwifiinterfa(that.liconfig.wifi_interface).then(function (interf) {
                listwificlients_1.default(interf.interface).then(function (a) {
                    resolve(a);
                }).catch(function (err) {
                    reject(err);
                });
            }).catch(function (err) {
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
                                                            listwificlients_1.default(wifi_exist).then(function (a) {
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QUFJLENBQUMsQ0FBQztvQkFDSixNQUFNLENBQUMscUJBQXFCLENBQUMsQ0FBQTtnQkFDakMsQ0FBQztZQUVMLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUc7Z0JBQ2xCLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNoQixDQUFDLENBQUMsQ0FBQztRQUNQLENBQUMsQ0FBQyxDQUFDO0lBQ1AsQ0FBQzs7SUFFTCxnQkFBQztBQUFELENBeGtCQSxBQXdrQkMsSUFBQTtBQXhrQkQ7MkJBd2tCQyxDQUFBO0FBQUEsQ0FBQyIsImZpbGUiOiJpbmRleC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIFByb21pc2UgZnJvbSBcImJsdWViaXJkXCI7XG5pbXBvcnQgKiBhcyBmcyBmcm9tIFwiZnNcIjtcbmltcG9ydCAqIGFzIGNoaWxkX3Byb2Nlc3MgZnJvbSBcImNoaWxkX3Byb2Nlc3NcIjtcbmltcG9ydCAqIGFzIF8gZnJvbSBcImxvZGFzaFwiO1xuaW1wb3J0ICogYXMgYXN5bmMgZnJvbSBcImFzeW5jXCI7XG5pbXBvcnQgUHJvdmlkZXJzID0gcmVxdWlyZShcIm1vYmlsZS1wcm92aWRlcnNcIik7XG5pbXBvcnQgV3BhbWFuYWdlciBmcm9tIFwid3Bhc3VwcGxpY2FudC1tYW5hZ2VyXCI7XG5pbXBvcnQgaG9zdGFwZHN3aXRjaCBmcm9tIFwiaG9zdGFwZF9zd2l0Y2hcIjtcbmltcG9ydCB0ZXN0aW50ZXJuZXQgZnJvbSBcInByb21pc2UtdGVzdC1jb25uZWN0aW9uXCI7XG5pbXBvcnQgbWVyZ2UgZnJvbSBcImpzb24tYWRkXCI7XG5pbXBvcnQgV3ZkaWFsIGZyb20gXCJ3dmRpYWxqc1wiO1xuaW1wb3J0IGxpc3R3aWZpY2xpZW50cyBmcm9tIFwibGlzdHdpZmljbGllbnRzXCJcblxuXG5pbXBvcnQgbmV0dyBmcm9tIFwibmV0d1wiO1xuY29uc3QgdmVyYiA9IHJlcXVpcmUoXCJ2ZXJib1wiKTtcbmNvbnN0IGh3cmVzdGFydCA9IHJlcXVpcmUoXCJod3Jlc3RhcnRcIik7XG5cblxuXG5cbmludGVyZmFjZSBJUHJvdmlkZXIge1xuXG4gICAgbGFiZWw/OiBzdHJpbmc7XG4gICAgYXBuOiBzdHJpbmc7XG4gICAgcGhvbmU/OiBzdHJpbmdcbiAgICB1c2VybmFtZT86IHN0cmluZztcbiAgICBwYXNzd29yZD86IHN0cmluZztcblxufVxuXG5pbnRlcmZhY2UgSUdsb2JhbFByb3ZpZGVycyB7XG5cbiAgICBjb3VudHJ5OiBzdHJpbmc7XG4gICAgcHJvdmlkZXJzOiBJUHJvdmlkZXJbXTtcbn1cblxuXG50eXBlIEltb2RlID0gJ2FwJyB8ICdob3N0JyB8ICdjbGllbnQnIHwgJ3VubWFuYWdlZCcgfCAnd3YnIHwgJ2V0aGVybmV0J1xuXG5cbmludGVyZmFjZSBJU2NhbiB7XG4gICAgZXNzaWQ6IHN0cmluZztcbiAgICBtYWM6IHN0cmluZztcbiAgICBzaWduYWw6IHN0cmluZztcbn1cblxudHlwZSBJTmV0d29ya1R5cGUgPSAnd2lmaScgfCAnd2lyZWQnXG5cbmludGVyZmFjZSBJTmV0d29yayB7XG4gICAgdHlwZTogSU5ldHdvcmtUeXBlO1xuICAgIG1hYzogc3RyaW5nO1xuICAgIGludGVyZmFjZTogc3RyaW5nO1xuICAgIGVzc2lkPzogc3RyaW5nO1xuICAgIHNjYW4/OiBJU2NhbltdO1xuICAgIGlwPzogc3RyaW5nO1xuICAgIGdhdGV3YXk/OiBzdHJpbmc7XG59XG5cbmludGVyZmFjZSBDbGFzc09wdCB7XG4gICAgd2lmaV9pbnRlcmZhY2U/OiBzdHJpbmc7XG4gICAgbW9iaWxlPzogSU1vYmlsZTtcbiAgICBob3N0YXBkPzogSUhvc3RhcGRjZjtcbiAgICB3cGFzdXBwbGljYW50X3BhdGg/OiBzdHJpbmc7XG59XG5pbnRlcmZhY2UgSU1vYmlsZSB7XG4gICAgcHJvdmlkZXI6IElQcm92aWRlcjtcbiAgICBkZXZpY2U/OiBhbnk7XG4gICAgY29uZmlnRmlsZVBhdGg/OiBzdHJpbmc7XG5cbn1cblxuaW50ZXJmYWNlIElFdGhlcm5ldCB7XG4gICAgaW50ZXJmYWNlOiBzdHJpbmc7XG4gICAgZGhjcD86IHtcbiAgICAgICAgaXA/OiBzdHJpbmc7XG4gICAgICAgIGdhdGV3YXk/OiBzdHJpbmc7XG4gICAgICAgIG5ldG1hc2s/OiBzdHJpbmc7XG4gICAgICAgIGJjYXN0Pzogc3RyaW5nO1xuICAgIH1cbn1cblxuaW50ZXJmYWNlIElMaU5ldHdvcmtDb25mIHtcbiAgICB3aWZpX2ludGVyZmFjZTogc3RyaW5nO1xuICAgIG1vYmlsZT86IElNb2JpbGU7XG4gICAgaG9zdGFwZDogSUhvc3RhcGQ7XG4gICAgd3Bhc3VwcGxpY2FudF9wYXRoPzogc3RyaW5nO1xuICAgIGV0aGVybmV0PzogSUV0aGVybmV0W10sXG4gICAgcmVjb3Zlcnk6IGJvb2xlYW5cbn1cbmludGVyZmFjZSBJTGlOZXR3b3JrQ29uZlBhcmFtcyB7XG4gICAgd2lmaV9pbnRlcmZhY2U/OiBzdHJpbmc7XG4gICAgbW9iaWxlPzogSU1vYmlsZTtcbiAgICBob3N0YXBkPzogSUhvc3RhcGQ7XG4gICAgd3Bhc3VwcGxpY2FudF9wYXRoPzogc3RyaW5nO1xuICAgIGV0aGVybmV0Pzoge1xuICAgICAgICBpbnRlcmZhY2U6IHN0cmluZztcbiAgICAgICAgZGhjcD86IHtcbiAgICAgICAgICAgIGlwPzogc3RyaW5nO1xuICAgICAgICAgICAgZ2F0ZXdheT86IHN0cmluZztcbiAgICAgICAgICAgIG5ldG1hc2s/OiBzdHJpbmc7XG4gICAgICAgICAgICBiY2FzdD86IHN0cmluZztcbiAgICAgICAgfVxuICAgIH0sXG4gICAgcmVjb3Zlcnk/OiB0cnVlXG59XG5cbmludGVyZmFjZSBJSG9zdGFwZCB7XG4gICAgZHJpdmVyOiBzdHJpbmc7XG4gICAgc3NpZDogc3RyaW5nO1xuICAgIHdwYV9wYXNzcGhyYXNlOiBhbnk7XG59O1xuaW50ZXJmYWNlIElIb3N0YXBkY2Yge1xuICAgIGRyaXZlcj86IHN0cmluZztcbiAgICBzc2lkOiBzdHJpbmc7XG4gICAgd3BhX3Bhc3NwaHJhc2U6IGFueTtcbn07XG5cbmludGVyZmFjZSBJSG9zdGFwZENmIHtcbiAgICBkcml2ZXI/OiBzdHJpbmc7XG4gICAgc3NpZD86IHN0cmluZztcbiAgICB3cGFfcGFzc3BocmFzZT86IHN0cmluZztcbn07XG5cbmludGVyZmFjZSBJRG5zbWFzcSB7XG4gICAgaW50ZXJmYWNlOiBzdHJpbmc7XG59O1xuaW50ZXJmYWNlIElEbnNtYXNxQ2Yge1xuICAgIGludGVyZmFjZT86IHN0cmluZztcbn07XG5pbnRlcmZhY2UgSUhDb25mIHtcbiAgICBpbnRlcmZhY2U/OiBzdHJpbmc7XG4gICAgd3Bhc3VwcGxpY2FudF9wYXRoPzogc3RyaW5nO1xuICAgIGhvc3RhcGQ/OiBJSG9zdGFwZENmO1xuICAgIHJlZGlyZWN0PzogYm9vbGVhbjtcbiAgICBkbnNtYXNxPzogSURuc21hc3FDZjtcbn07XG5cbmludGVyZmFjZSBJQ29ubmVjdGlvbiB7XG5cbiAgICBsaW5rVHlwZTogc3RyaW5nO1xuICAgIGludGVyZmFjZTogc3RyaW5nO1xuICAgIGlwPzogc3RyaW5nO1xuICAgIGdhdGV3YXk/OiBzdHJpbmc7XG5cbn1cblxuaW50ZXJmYWNlIElJbml0IHtcbiAgICBjb25lY3Rpb246IGJvb2xlYW47XG4gICAgcmVjb3Zlcnk6IGJvb2xlYW47XG4gICAgZGV0YWlscz86IElDb25uZWN0aW9uO1xufVxuXG5cblxuXG5mdW5jdGlvbiBnZXR3aWZpaW50ZXJmYShzZXR0ZWQ/OiBzdHJpbmcpOiBQcm9taXNlPElOZXR3b3JrPiB7XG5cbiAgICByZXR1cm4gbmV3IFByb21pc2U8SU5ldHdvcms+KGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgbGV0IHdpZmlfZXhpc3Q6IGJvb2xlYW4gPSBmYWxzZTtcbiAgICAgICAgbGV0IGRldmk6IElOZXR3b3JrO1xuICAgICAgICBuZXR3KCkudGhlbihmdW5jdGlvbiAobmV0d29ya3MpIHtcblxuICAgICAgICAgICAgXy5tYXAobmV0d29ya3MsIGZ1bmN0aW9uIChkZXZpY2UpIHtcblxuICAgICAgICAgICAgICAgIGlmIChkZXZpY2UudHlwZSA9PT0gXCJ3aWZpXCIgJiYgIXdpZmlfZXhpc3QgJiYgKCFzZXR0ZWQgfHwgc2V0dGVkID09PSBcImF1dG9cIiB8fCBzZXR0ZWQgPT09IGRldmljZS5pbnRlcmZhY2UpKSB7XG4gICAgICAgICAgICAgICAgICAgIHdpZmlfZXhpc3QgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBkZXZpID0gZGV2aWNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBpZiAod2lmaV9leGlzdCkge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoZGV2aSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlamVjdCh7IGVycm9yOiBcImRldmljZSBub3QgZm91bmRlZFwiIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICB9KTtcblxuICAgIH0pO1xuXG59XG5cblxuZnVuY3Rpb24gcmVjb3ZlcnlfbW9kZShhcHN3aXRjaCk6IFByb21pc2U8SW1vZGU+IHtcblxuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlPEltb2RlPihmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG5cbiAgICAgICAgYXBzd2l0Y2guaG9zdCgpLnRoZW4oZnVuY3Rpb24gKGFuc3dlcikge1xuICAgICAgICAgICAgdmVyYihhbnN3ZXIsIFwid2FyblwiLCBcImxpbmV0d29yayByZWNvdmVyeSBtb2RlIFwiKTtcbiAgICAgICAgICAgIHJlc29sdmUoJ2hvc3QnKTtcbiAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgdmVyYihlcnIsIFwiZXJyb3JcIiwgXCJsaW5ldHdvcmsgcmVjb3ZlcnkgbW9kZSBmYWlsZWRcIik7XG4gICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG59XG5cblxuZnVuY3Rpb24gcmVjb3ZlcnljaGVjayhjb25maWc6IElMaU5ldHdvcmtDb25mKTogUHJvbWlzZTx7IGRldmljZTogSU5ldHdvcmssIGtub3duX25ldHdvcmtzOiBib29sZWFuIH0+IHtcblxuICAgIHJldHVybiBuZXcgUHJvbWlzZTx7IGRldmljZTogSU5ldHdvcmssIGtub3duX25ldHdvcmtzOiBib29sZWFuIH0+KGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcblxuICAgICAgICBsZXQgc29tZW5ldHdvcmtfZXhpc3RzOiBib29sZWFuID0gZmFsc2U7XG4gICAgICAgIGxldCB3bGFuX2V4aXN0czogYm9vbGVhbiA9IGZhbHNlO1xuXG4gICAgICAgIGxldCBkZXZpOiBJTmV0d29yaztcblxuICAgICAgICBuZXR3KCkudGhlbihmdW5jdGlvbiAobmV0d29ya3MpIHtcblxuICAgICAgICAgICAgXy5tYXAobmV0d29ya3MsIGZ1bmN0aW9uIChkZXZpY2UpIHtcblxuICAgICAgICAgICAgICAgIGlmIChkZXZpY2Uuc2NhbiAmJiBkZXZpY2UudHlwZSA9PT0gXCJ3aWZpXCIgJiYgIXNvbWVuZXR3b3JrX2V4aXN0cyAmJiAoIWNvbmZpZy53aWZpX2ludGVyZmFjZSB8fCBjb25maWcud2lmaV9pbnRlcmZhY2UgPT09IFwiYXV0b1wiIHx8IGNvbmZpZy53aWZpX2ludGVyZmFjZSA9PT0gZGV2aWNlLmludGVyZmFjZSkpIHtcblxuICAgICAgICAgICAgICAgICAgICBjb25zdCBXTSA9IG5ldyBXcGFtYW5hZ2VyKGNvbmZpZy53cGFzdXBwbGljYW50X3BhdGgpXG5cbiAgICAgICAgICAgICAgICAgICAgXy5tYXAoZGV2aWNlLnNjYW4sIGZ1bmN0aW9uIChuZXRzY2FuOiBJU2Nhbikge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBfLm1hcChXTS5saXN0d3BhLCBmdW5jdGlvbiAod3BhaXRlbSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh3cGFpdGVtLnNzaWQgPT09IG5ldHNjYW4uZXNzaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc29tZW5ldHdvcmtfZXhpc3RzID0gdHJ1ZTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICghd2xhbl9leGlzdHMgJiYgZGV2aWNlLnR5cGUgPT09IFwid2lmaVwiICYmICghY29uZmlnLndpZmlfaW50ZXJmYWNlIHx8IGNvbmZpZy53aWZpX2ludGVyZmFjZSA9PT0gXCJhdXRvXCIgfHwgY29uZmlnLndpZmlfaW50ZXJmYWNlID09PSBkZXZpY2UuaW50ZXJmYWNlKSkge1xuICAgICAgICAgICAgICAgICAgICB3bGFuX2V4aXN0cyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGRldmkgPSBkZXZpY2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGlmICghc29tZW5ldHdvcmtfZXhpc3RzICYmIHdsYW5fZXhpc3RzKSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7IGRldmljZTogZGV2aSwga25vd25fbmV0d29ya3M6IGZhbHNlIH0pO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh3bGFuX2V4aXN0cykge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoeyBkZXZpY2U6IGRldmksIGtub3duX25ldHdvcmtzOiB0cnVlIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZWplY3QoJ25vIGludGVyZmFjZScpXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgcmVqZWN0KHsgZXJyb3I6IGVyciwgZGVzY3JpcHRpb246ICduZXR3IGVycicgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgfSk7XG5cblxufVxuXG5cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTGlOZXR3b3JrIHtcbiAgICBsaWNvbmZpZzogSUxpTmV0d29ya0NvbmY7XG4gICAgaG9zdGFwZDogaG9zdGFwZHN3aXRjaDtcbiAgICBtb2JpbGU6IFd2ZGlhbDtcbiAgICBtb2RlOiBJbW9kZTtcbiAgICBpc0Nvbm5lY3RlZDogYm9vbGVhbjtcblxuXG4gICAgY29uc3RydWN0b3IoZGF0YTogSUxpTmV0d29ya0NvbmZQYXJhbXMpIHtcblxuXG4gICAgICAgIGNvbnN0IGNvbmZpZzogSUxpTmV0d29ya0NvbmYgPSB7XG4gICAgICAgICAgICBob3N0YXBkOiB7XG4gICAgICAgICAgICAgICAgZHJpdmVyOiBcIm5sODAyMTFcIixcbiAgICAgICAgICAgICAgICBzc2lkOiBcInRlc3R0dGFwXCIsXG4gICAgICAgICAgICAgICAgd3BhX3Bhc3NwaHJhc2U6IFwidGVzdHBhc3NcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHdpZmlfaW50ZXJmYWNlOiBcImF1dG9cIixcbiAgICAgICAgICAgIHdwYXN1cHBsaWNhbnRfcGF0aDogXCIvZXRjL3dwYV9zdXBwbGljYW50L3dwYV9zdXBwbGljYW50LmNvbmZcIixcbiAgICAgICAgICAgIGV0aGVybmV0OiBbe1xuICAgICAgICAgICAgICAgIGludGVyZmFjZTogJ2V0aDAnXG4gICAgICAgICAgICB9XSxcbiAgICAgICAgICAgIHJlY292ZXJ5OiB0cnVlXG4gICAgICAgIH07XG5cbiAgICAgICAgbWVyZ2UoY29uZmlnLCBkYXRhKTsgLy8gY29tYmluZSBkZWZhdWx0IHNldHRpbmdzIHdpdGggbmV3IHBhcmFtZXRlcnMgZnJvbSBkYXRhXG4gICAgICAgIHRoaXMubW9kZSA9ICd1bm1hbmFnZWQnXG5cbiAgICAgICAgdGhpcy5saWNvbmZpZyA9IGNvbmZpZztcblxuXG4gICAgICAgIGlmICh0aGlzLmxpY29uZmlnLm1vYmlsZSkge1xuICAgICAgICAgICAgaWYgKCF0aGlzLmxpY29uZmlnLm1vYmlsZS5jb25maWdGaWxlUGF0aCkgdGhpcy5saWNvbmZpZy5tb2JpbGUuY29uZmlnRmlsZVBhdGggPSBcIi9ldGMvd3ZkaWFsLmNvbmZcIjtcblxuICAgICAgICAgICAgdGhpcy5tb2JpbGUgPSBuZXcgV3ZkaWFsKHRoaXMubGljb25maWcubW9iaWxlKVxuICAgICAgICB9XG5cblxuICAgIH1cblxuXG5cbiAgICBldGhlcm5ldGNvbm5lY3QoZGV2aWNlbmFtZT86IHN0cmluZyk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgICAgICBjb25zdCB0aGF0ID0gdGhpc1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8Ym9vbGVhbj4oZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgICAgaWYgKHRoYXQubGljb25maWcuZXRoZXJuZXQpIHtcblxuICAgICAgICAgICAgICAgIGNvbnN0IGNvbm5lY3Rpb25kZXZpY2VzYXJyYXk6IElOZXR3b3JrW10gPSBbXTtcblxuICAgICAgICAgICAgICAgIGxldCBkZXZpY2VleGlzdHM6IGJvb2xlYW4gPSBmYWxzZVxuICAgICAgICAgICAgICAgIGxldCBkZXZpY2U6IElOZXR3b3JrO1xuICAgICAgICAgICAgICAgIC8vIGNoZWVjayBjb25maWd1cmF0aW9uXG4gICAgICAgICAgICAgICAgbmV0dygpLnRoZW4oKGEpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgXy5tYXAoYSwgKG5ldCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgXy5tYXAodGhhdC5saWNvbmZpZy5ldGhlcm5ldCwgKG5ldGludGVyZmFjZWNvbmZpZ3VyZWQpID0+IHtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuZXQudHlwZSA9PT0gJ3dpcmVkJyAmJiAoKCFkZXZpY2VuYW1lICYmIG5ldC5pbnRlcmZhY2UgPT09IG5ldGludGVyZmFjZWNvbmZpZ3VyZWQuaW50ZXJmYWNlKSB8fCBkZXZpY2VuYW1lID09PSBuZXQuaW50ZXJmYWNlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXZpY2VleGlzdHMgPSB0cnVlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRldmljZSA9IG5ldFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25uZWN0aW9uZGV2aWNlc2FycmF5LnB1c2gobmV0KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgICAgICAgICBpZiAoZGV2aWNlZXhpc3RzKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBjb25uZWN0ZWQ6IGJvb2xlYW4gPSBmYWxzZTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgYXN5bmMuZWFjaFNlcmllcyhjb25uZWN0aW9uZGV2aWNlc2FycmF5LCAoZGV2aWNlLCBjYikgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghY29ubmVjdGVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNoaWxkX3Byb2Nlc3MuZXhlYygnaWZjb25maWcgJyArIGRldmljZS5pbnRlcmZhY2UgKyAnIGRvd24gJiYgaWZjb25maWcgJyArIGRldmljZS5pbnRlcmZhY2UgKyAnIHVwJywgKGVyciwgc3Rkb3V0LCBzdGRlcnIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYigpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQudGVzdGludGVybmV0KCkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbm5lY3RlZCA9IHRydWVcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYigpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNiKClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIH0sIChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWNvbm5lY3RlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoJ25vIGNvbm5lY3Rpb24gYnkgYSBldGhlcm5ldCBkZXZpY2UnKVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIG5lZWQgYXN5bmMgdG8gcHJvY2VzcyBldmVyeW9uZVxuXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoJ25vIGV0aGVybmV0IGRldmljZScpXG4gICAgICAgICAgICAgICAgICAgIH1cblxuXG4gICAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgICAgIC8vIGNoZWNrIGlmIGl0IGlzIGp1c3QgY29ubmVjdGVkIGJ5IGV0aDBcbiAgICAgICAgICAgICAgICAvLyBpZiBpcyBjb25uZWN0ZWQgYWxsIG9rLlxuICAgICAgICAgICAgICAgIC8vIGVsc2UgdGhhdC5ldGhlcm5ldHJlY29ubmVjdChkZXZpY2UpXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlamVjdCgnaW52YWxpZCBldGhlcm5ldCBjb25mJylcblxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuXG4gICAgfVxuXG4gICAgZXRoZXJuZXRyZWNvbm5lY3QoZGV2aWNlPzogYW55KSB7XG4gICAgICAgIGNvbnN0IHRoYXQgPSB0aGlzXG5cbiAgICB9XG5cbiAgICBtb2JpbGVjb25uZWN0KHJlc2V0PzogYm9vbGVhbikge1xuICAgICAgICBjb25zdCB0aGF0ID0gdGhpc1xuICAgICAgICB0aGF0Lm1vYmlsZS5jb25maWd1cmUocmVzZXQpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhhdC5tb2RlID0gXCJ3dlwiO1xuICAgICAgICAgICAgdGhhdC5tb2JpbGUuY29ubmVjdCh0cnVlKS50aGVuKGZ1bmN0aW9uIChhKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYSlcbiAgICAgICAgICAgICAgICBod3Jlc3RhcnQoXCJ1bnBsdWdcIilcblxuXG4gICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGUpXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJtb2RlbSBlcnJvclwiKVxuXG4gICAgICAgICAgICAgICAgaHdyZXN0YXJ0KFwidW5wbHVnXCIpXG5cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coZSlcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwibW9kZW0gZXJyb3JcIilcblxuICAgICAgICAgICAgaHdyZXN0YXJ0KFwidW5wbHVnXCIpXG5cbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICB3aWZpYXZhaWxhYmxlcygpOiBQcm9taXNlPElTY2FuW10+IHtcbiAgICAgICAgY29uc3QgdGhhdCA9IHRoaXM7XG5cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPElTY2FuW10+KGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgIGNvbnN0IGF2YWlsYWJsZW5ldHMgPSBbXVxuICAgICAgICAgICAgdGhhdC5uZXR3b3JrcygpLnRoZW4oKG5ldHMpID0+IHtcbiAgICAgICAgICAgICAgICBfLm1hcChuZXRzLCAobmV0KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChuZXQudHlwZSA9PT0gXCJ3aWZpXCIgJiYgbmV0LnNjYW4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIF8ubWFwKG5ldC5zY2FuLCAoc2Nhbm5lZG9uZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF2YWlsYWJsZW5ldHMucHVzaChzY2FubmVkb25lKVxuICAgICAgICAgICAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIHJlc29sdmUoYXZhaWxhYmxlbmV0cylcblxuICAgICAgICAgICAgfSkuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICAgICAgICAgIHJlamVjdChlcnIpXG4gICAgICAgICAgICB9KVxuXG5cbiAgICAgICAgfSlcblxuICAgIH1cblxuICAgIHdpZmljb25uZWN0YWJsZXMoKTogUHJvbWlzZTxJU2NhbltdPiB7XG4gICAgICAgIGNvbnN0IHRoYXQgPSB0aGlzO1xuXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTxJU2NhbltdPihmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICBjb25zdCBjb25uZWN0YWJsZXMgPSBbXVxuICAgICAgICAgICAgY29uc3QgV00gPSB0aGF0LndwYW1hbmFnZXIoKVxuXG4gICAgICAgICAgICB0aGF0LndpZmlhdmFpbGFibGVzKCkudGhlbigoc2NhbnMpID0+IHtcbiAgICAgICAgICAgICAgICBfLm1hcChzY2FucywgKHNjYW5uZWRvbmUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgXy5tYXAoV00ubGlzdHdwYSwgKHdwYSkgPT4ge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAod3BhLnNzaWQgPT09IHNjYW5uZWRvbmUuZXNzaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25uZWN0YWJsZXMucHVzaChzY2FubmVkb25lKVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICByZXNvbHZlKGNvbm5lY3RhYmxlcylcbiAgICAgICAgICAgIH0pLmNhdGNoKChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICByZWplY3QoZXJyKVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcblxuICAgIH1cblxuXG5cbiAgICBuZXR3b3JrcygpOiBQcm9taXNlPElOZXR3b3JrW10+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPElOZXR3b3JrW10+KGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcblxuICAgICAgICAgICAgbmV0dygpLnRoZW4oZnVuY3Rpb24gKGEpIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKGEpXG4gICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KGVycilcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgfVxuICAgIG5ldHdvcmsoZGV2aWNlbmFtZTogc3RyaW5nKTogUHJvbWlzZTxJTmV0d29yaz4ge1xuICAgICAgICBjb25zdCB0aGF0ID0gdGhpcztcbiAgICAgICAgbGV0IG5ldGV4aXN0czogYm9vbGVhbiA9IGZhbHNlXG4gICAgICAgIGxldCBuZXR3b3JraW50ZXJmYWNlOiBJTmV0d29yaztcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPElOZXR3b3JrPihmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG5cbiAgICAgICAgICAgIHRoYXQubmV0d29ya3MoKS50aGVuKGZ1bmN0aW9uIChhKSB7XG4gICAgICAgICAgICAgICAgXy5tYXAoYSwgKG5ldCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIW5ldGV4aXN0cyAmJiBuZXQuaW50ZXJmYWNlID09PSBkZXZpY2VuYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBuZXRleGlzdHMgPSB0cnVlXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXR3b3JraW50ZXJmYWNlID0gbmV0XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIGlmIChuZXRleGlzdHMpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShuZXR3b3JraW50ZXJmYWNlKVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdCgnbm8gbmV0d29yaycpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgIHJlamVjdChlcnIpXG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgIH1cblxuICAgIHRlc3RpbnRlcm5ldCgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcblxuICAgICAgICAgICAgdGVzdGludGVybmV0KCkudGhlbihmdW5jdGlvbiAoYSkge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoYSlcbiAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICByZWplY3QoZXJyKVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGhvc3RhcGRjb25mKGhjb25maWc6IElIQ29uZikgeyAvLyByZWNvbmYgaXMgZXhwZXJpbWVudGFsXG4gICAgICAgIGNvbnN0IHRoYXQgPSB0aGlzXG4gICAgICAgIGlmICghaGNvbmZpZykge1xuICAgICAgICAgICAgdGhyb3cgRXJyb3IoJ25vIGNvbmZpZyBwcm92aWRlZCB0byBjb25maWd1cmUgaG9zdGFwZGNvbmYnKVxuXG5cbiAgICAgICAgfSBlbHNlIHtcblxuICAgICAgICAgICAgdGhhdC5ob3N0YXBkID0gbmV3IGhvc3RhcGRzd2l0Y2goaGNvbmZpZywgdHJ1ZSk7XG5cblxuICAgICAgICB9XG5cbiAgICB9XG5cbiAgICB3cGFtYW5hZ2VyKCkge1xuICAgICAgICBjb25zdCBwYXRoID0gdGhpcy5saWNvbmZpZy53cGFzdXBwbGljYW50X3BhdGg7XG4gICAgICAgIHJldHVybiBuZXcgV3BhbWFuYWdlcih0aGlzLmxpY29uZmlnLndwYXN1cHBsaWNhbnRfcGF0aCk7XG4gICAgfVxuXG5cbiAgICBtb2JpbGVwcm92aWRlcnMoKSB7XG5cbiAgICAgICAgcmV0dXJuIG5ldyBQcm92aWRlcnMoKVxuXG4gICAgfVxuXG4gICAgd2lmaV9zd2l0Y2gobW9kZTogc3RyaW5nLCBkZXY/OiBzdHJpbmcpIHtcbiAgICAgICAgY29uc29sZS5sb2cobW9kZSwgZGV2KTtcbiAgICAgICAgY29uc3QgdGhhdCA9IHRoaXM7XG4gICAgICAgIGNvbnN0IGNvbmZpZyA9IHRoYXQubGljb25maWc7XG5cbiAgICAgICAgaWYgKGRldiB8fCB0aGlzLmxpY29uZmlnLndpZmlfaW50ZXJmYWNlICE9PSBcImF1dG9cIikge1xuXG4gICAgICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8Ym9vbGVhbj4oZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuXG5cbiAgICAgICAgICAgICAgICBpZiAoIWRldikge1xuICAgICAgICAgICAgICAgICAgICBkZXYgPSBjb25maWcud2lmaV9pbnRlcmZhY2U7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJkZXYgbW9kZVwiKTtcbiAgICAgICAgICAgICAgICB0aGF0Lmhvc3RhcGRjb25mKHtcbiAgICAgICAgICAgICAgICAgICAgaW50ZXJmYWNlOiBkZXYsXG4gICAgICAgICAgICAgICAgICAgIHdwYXN1cHBsaWNhbnRfcGF0aDogY29uZmlnLndwYXN1cHBsaWNhbnRfcGF0aCxcbiAgICAgICAgICAgICAgICAgICAgaG9zdGFwZDogY29uZmlnLmhvc3RhcGRcbiAgICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICAgICAgc3dpdGNoIChtb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJhcFwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5ob3N0YXBkLmFwKCkudGhlbihmdW5jdGlvbiAoYW5zd2VyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5tb2RlID0gJ2FwJ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJob3N0XCI6XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lmhvc3RhcGQuaG9zdCgpLnRoZW4oZnVuY3Rpb24gKGFuc3dlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQubW9kZSA9ICdob3N0J1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJjbGllbnRcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuaG9zdGFwZC5jbGllbnQoKS50aGVuKGZ1bmN0aW9uIChhbnN3ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lm1vZGUgPSAnY2xpZW50J1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiYXV0byBtb2RlXCIpO1xuICAgICAgICAgICAgY29uc3QgY29uZmlnID0gdGhpcy5saWNvbmZpZztcbiAgICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICAgICAgbmV0dygpLnRoZW4oZnVuY3Rpb24gKG5ldHdvcmtzKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgXy5tYXAobmV0d29ya3MsIGZ1bmN0aW9uIChkZXZpY2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkZXZpY2UudHlwZSA9PT0gXCJ3aWZpXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXYgPSBkZXZpY2UuaW50ZXJmYWNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRldikge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lmhvc3RhcGRjb25mKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnRlcmZhY2U6IGRldixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBob3N0YXBkOiBjb25maWcuaG9zdGFwZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3cGFzdXBwbGljYW50X3BhdGg6IGNvbmZpZy53cGFzdXBwbGljYW50X3BhdGhcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHRoYXQuaG9zdGFwZCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHN3aXRjaCAobW9kZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgXCJhcFwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lmhvc3RhcGQuYXAoKS50aGVuKGZ1bmN0aW9uIChhbnN3ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQubW9kZSA9ICdhcCdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFwiaG9zdFwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lmhvc3RhcGQuaG9zdCgpLnRoZW4oZnVuY3Rpb24gKGFuc3dlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5tb2RlID0gJ2hvc3QnXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBcImNsaWVudFwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lmhvc3RhcGQuY2xpZW50KCkudGhlbihmdW5jdGlvbiAoYW5zd2VyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lm1vZGUgPSAnY2xpZW50J1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KHsgZXJyb3I6IFwibm8gZGV2XCIgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG5cbiAgICBsaXN0d2lmaWNsaWVudHMoKSB7XG4gICAgICAgIGNvbnN0IHRoYXQgPSB0aGlzXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG5cbiAgICAgICAgICAgIGdldHdpZmlpbnRlcmZhKHRoYXQubGljb25maWcud2lmaV9pbnRlcmZhY2UpLnRoZW4oZnVuY3Rpb24gKGludGVyZikge1xuXG4gICAgICAgICAgICAgICAgbGlzdHdpZmljbGllbnRzKGludGVyZi5pbnRlcmZhY2UpLnRoZW4oKGEpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShhKVxuICAgICAgICAgICAgICAgIH0pLmNhdGNoKChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycilcbiAgICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICB9KS5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KGVycilcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgfVxuXG5cbiAgICBjb25uZWN0aW9uKCkge1xuICAgICAgICBjb25zdCB0aGF0ID0gdGhpcztcbiAgICAgICAgY29uc3QgcmVjb3ZlcnkgPSB0aGF0LmxpY29uZmlnLnJlY292ZXJ5XG5cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgIHZlcmIodGhhdC5saWNvbmZpZywgXCJkZWJ1Z1wiLCBcIlRyeW5nIHRvIGNvbm5lY3RcIik7XG5cbiAgICAgICAgICAgIGlmICh0aGF0Lm1vZGUgPT09IFwid3ZcIikge1xuICAgICAgICAgICAgICAgIHJlamVjdChcImF1dG8gbW9kZVwiKVxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwid3YgcnVubmluZywgbm90aGluZyB0byBkb1wiKVxuICAgICAgICAgICAgfSBlbHNlIHtcblxuXG4gICAgICAgICAgICAgICAgdGhhdC50ZXN0aW50ZXJuZXQoKS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKVxuICAgICAgICAgICAgICAgIH0pLmNhdGNoKChlcnIpID0+IHtcblxuXG4gICAgICAgICAgICAgICAgICAgIHRoYXQuZXRoZXJuZXRjb25uZWN0KCkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnY29ubmVjdGVkIGJ5IGV0aGVybmV0JylcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSlcblxuICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaCgoKSA9PiB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGdldHdpZmlpbnRlcmZhKHRoYXQubGljb25maWcud2lmaV9pbnRlcmZhY2UpLnRoZW4oZnVuY3Rpb24gKGludGVyZikge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgd2lmaV9leGlzdDogc3RyaW5nID0gaW50ZXJmLmludGVyZmFjZTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbmZoYXBkcyA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW50ZXJmYWNlOiB3aWZpX2V4aXN0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3cGFzdXBwbGljYW50X3BhdGg6IHRoYXQubGljb25maWcud3Bhc3VwcGxpY2FudF9wYXRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBob3N0YXBkOiB0aGF0LmxpY29uZmlnLmhvc3RhcGRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHdpZmlfZXhpc3QpIHtcblxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZlcmIod2lmaV9leGlzdCwgXCJpbmZvXCIsIFwiV2xhbiBpbnRlcmZhY2UgZm91bmRlZFwiKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lmhvc3RhcGRjb25mKGNvbmZoYXBkcylcblxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuaG9zdGFwZC5jbGllbnQodHJ1ZSkudGhlbihmdW5jdGlvbiAoYW5zd2VyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lm1vZGUgPSAnY2xpZW50J1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7IGNvbmVjdGlvbjogdHJ1ZSB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGF0LmxpY29uZmlnLm1vYmlsZSkge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5tb2JpbGVjb25uZWN0KClcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZWNvdmVyeSAmJiB3aWZpX2V4aXN0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5yZWNvdmVyeSh0cnVlKS50aGVuKGZ1bmN0aW9uIChhbnN3ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmVyYihhbnN3ZXIsIFwiaW5mb1wiLCBcIkxJTkVUV09SS0lORyByZWNvdmVyeSBtb2RlIHN0YXJ0XCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXRoYXQubGljb25maWcubW9iaWxlKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHNjYW5uZXQgPSBzZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2NoZWNrIGZvciBhdmFpbGFibGVzIG5ldHdvcmtzJylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0LndpZmljb25uZWN0YWJsZXMoKS50aGVuKChuZXRzKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuZXRzLmxlbmd0aCA+IDApIHtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5ob3N0YXBkLmNsaWVudCh0cnVlKS50aGVuKGZ1bmN0aW9uIChhbnN3ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lm1vZGUgPSAnY2xpZW50J1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwoc2Nhbm5ldClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnY29ubmVjdGVkJylcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoeyBjb25lY3Rpb246IHRydWUsIHJlY292ZXJ5OiBmYWxzZSB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnbm8gd29ya2luZyBuZXR3b3JrcyBmb3Igbm93JylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnJlY292ZXJ5KHRydWUpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGlzdHdpZmljbGllbnRzKHdpZmlfZXhpc3QpLnRoZW4oKGEpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5yZWNvdmVyeSh0cnVlKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnbm8ga253b3duIHdsYW4gYXZhaWxhYmxlLCB3YWl0aW5nIGZvciBuZXR3b3JrcycpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LCAxMjAwMDApXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2ZXJiKGVyciwgXCJlcnJvclwiLCBcIkxJTkVUV09SS0lORyByZWNvdmVyeSBtb2RlIGVycm9yXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoJ3JlY292ZXJ5IG1vZGUgZXJyb3InKVxuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ25vdCBjb25uZWN0ZWQnKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdCgnbm90IGNvbm5lY3RlZCcpXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2ZXJiKFwibm8gd2lmaVwiLCBcIndhcm5cIiwgXCJuZXR3b3JrZXJcIik7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhhdC5saWNvbmZpZy5tb2JpbGUpIHtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lm1vYmlsZWNvbm5lY3QoKVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJubyB3aWZpISE/Pz9cIilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaHdyZXN0YXJ0KFwidW5wbHVnXCIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcblxuXG5cbiAgICAgICAgICAgICAgICAgICAgfSlcblxuXG5cblxuXG4gICAgICAgICAgICAgICAgfSlcblxuXG5cblxuXG5cblxuICAgICAgICAgICAgfVxuXG5cbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIHJlY292ZXJ5KGZvcmNlPzogdHJ1ZSkge1xuICAgICAgICBjb25zdCBjb25maWcgPSB0aGlzLmxpY29uZmlnO1xuICAgICAgICBjb25zdCB0aGF0ID0gdGhpcztcblxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgICAgcmVjb3ZlcnljaGVjayhjb25maWcpLnRoZW4oZnVuY3Rpb24gKGEpIHtcblxuICAgICAgICAgICAgICAgIGNvbnN0IGludGVyZiA9IGEuZGV2aWNlXG4gICAgICAgICAgICAgICAgaWYgKGZvcmNlIHx8ICFhLmtub3duX25ldHdvcmtzKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3JlY292ZXJ5bmcgJyArIGEuZGV2aWNlLmludGVyZmFjZSlcblxuICAgICAgICAgICAgICAgICAgICB0aGF0Lmhvc3RhcGRjb25mKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGludGVyZmFjZTogYS5kZXZpY2UuaW50ZXJmYWNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgd3Bhc3VwcGxpY2FudF9wYXRoOiB0aGF0LmxpY29uZmlnLndwYXN1cHBsaWNhbnRfcGF0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGhvc3RhcGQ6IHRoYXQubGljb25maWcuaG9zdGFwZFxuICAgICAgICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICAgICAgICAgIHJlY292ZXJ5X21vZGUodGhhdC5ob3N0YXBkKS50aGVuKGZ1bmN0aW9uIChhbnN3ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQubW9kZSA9IGFuc3dlcjtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoYW5zd2VyKTtcbiAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KCd0cnkgY2xpZW50IG9yIGZvcmNlJylcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG59O1xuXG5cblxuXG5cblxuIl19
