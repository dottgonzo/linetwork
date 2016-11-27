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
                            if (wpaitem.essid === netscan.essid) {
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
                    }).catch(function () {
                        getwifiinterfa(that.liconfig.wifi_interface).then(function (interf) {
                            var wifi_exist = interf.interface;
                            var confhapds = {
                                interface: wifi_exist,
                                wpasupplicant_path: that.liconfig.wpasupplicant_path,
                                hostapd: that.liconfig.hostapd
                            };
                            if (that.liconfig.mobile) {
                                if (recovery && wifi_exist) {
                                    console.log("recovering");
                                    that.hostapdconf(confhapds);
                                    that.recovery(true);
                                }
                                else if (wifi_exist) {
                                    that.hostapdconf(confhapds);
                                    that.hostapd.client(true).then(function (answer) {
                                        console.log("wificlient connected ");
                                    }).catch(function (err) {
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
                                    });
                                }
                            }
                            else if (wifi_exist) {
                                verb(wifi_exist, "info", "Wlan interface founded");
                                that.hostapdconf(confhapds);
                                that.hostapd.client(true).then(function (answer) {
                                    that.mode = 'client';
                                    resolve({ conection: true, recovery: false });
                                }).catch(function (err) {
                                    if (recovery) {
                                        that.recovery(true).then(function (answer) {
                                            verb(answer, "info", "LINETWORKING recovery mode start");
                                        }).catch(function (err) {
                                            verb(err, "error", "LINETWORKING recovery mode start");
                                        });
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QUFDLENBQUM7b0JBQ3BCLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUc7d0JBQ2xCLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztvQkFDaEIsQ0FBQyxDQUFDLENBQUM7Z0JBRVAsQ0FBQztZQUVMLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUc7Z0JBQ2xCLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNoQixDQUFDLENBQUMsQ0FBQztRQUNQLENBQUMsQ0FBQyxDQUFDO0lBQ1AsQ0FBQzs7SUFFTCxnQkFBQztBQUFELENBL2dCQSxBQStnQkMsSUFBQTtBQS9nQkQ7MkJBK2dCQyxDQUFBO0FBQUEsQ0FBQyIsImZpbGUiOiJpbmRleC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIFByb21pc2UgZnJvbSBcImJsdWViaXJkXCI7XG5pbXBvcnQgKiBhcyBmcyBmcm9tIFwiZnNcIjtcbmltcG9ydCAqIGFzIGNoaWxkX3Byb2Nlc3MgZnJvbSBcImNoaWxkX3Byb2Nlc3NcIjtcbmltcG9ydCAqIGFzIF8gZnJvbSBcImxvZGFzaFwiO1xuaW1wb3J0ICogYXMgYXN5bmMgZnJvbSBcImFzeW5jXCI7XG5pbXBvcnQgUHJvdmlkZXJzID0gcmVxdWlyZShcIm1vYmlsZS1wcm92aWRlcnNcIik7XG5pbXBvcnQgV3BhbWFuYWdlciBmcm9tIFwid3Bhc3VwcGxpY2FudC1tYW5hZ2VyXCI7XG5pbXBvcnQgaG9zdGFwZHN3aXRjaCBmcm9tIFwiaG9zdGFwZF9zd2l0Y2hcIjtcbmltcG9ydCB0ZXN0aW50ZXJuZXQgZnJvbSBcInByb21pc2UtdGVzdC1jb25uZWN0aW9uXCI7XG5pbXBvcnQgbWVyZ2UgZnJvbSBcImpzb24tYWRkXCI7XG5pbXBvcnQgV3ZkaWFsIGZyb20gXCJ3dmRpYWxqc1wiO1xuXG5cbmltcG9ydCBuZXR3IGZyb20gXCJuZXR3XCI7XG5jb25zdCB2ZXJiID0gcmVxdWlyZShcInZlcmJvXCIpO1xuY29uc3QgaHdyZXN0YXJ0ID0gcmVxdWlyZShcImh3cmVzdGFydFwiKTtcblxuXG5cblxuaW50ZXJmYWNlIElQcm92aWRlciB7XG5cbiAgICBsYWJlbD86IHN0cmluZztcbiAgICBhcG46IHN0cmluZztcbiAgICBwaG9uZT86IHN0cmluZ1xuICAgIHVzZXJuYW1lPzogc3RyaW5nO1xuICAgIHBhc3N3b3JkPzogc3RyaW5nO1xuXG59XG5cbmludGVyZmFjZSBJR2xvYmFsUHJvdmlkZXJzIHtcblxuICAgIGNvdW50cnk6IHN0cmluZztcbiAgICBwcm92aWRlcnM6IElQcm92aWRlcltdO1xufVxuXG5cbnR5cGUgSW1vZGUgPSAnYXAnIHwgJ2hvc3QnIHwgJ2NsaWVudCcgfCAndW5tYW5hZ2VkJyB8ICd3dicgfCAnZXRoZXJuZXQnXG5cblxuaW50ZXJmYWNlIElTY2FuIHtcbiAgICBlc3NpZDogc3RyaW5nO1xuICAgIG1hYzogc3RyaW5nO1xuICAgIHNpZ25hbDogc3RyaW5nO1xufVxuXG50eXBlIElOZXR3b3JrVHlwZSA9ICd3aWZpJyB8ICd3aXJlZCdcblxuaW50ZXJmYWNlIElOZXR3b3JrIHtcbiAgICB0eXBlOiBJTmV0d29ya1R5cGU7XG4gICAgbWFjOiBzdHJpbmc7XG4gICAgaW50ZXJmYWNlOiBzdHJpbmc7XG4gICAgZXNzaWQ/OiBzdHJpbmc7XG4gICAgc2Nhbj86IElTY2FuW107XG4gICAgaXA/OiBzdHJpbmc7XG4gICAgZ2F0ZXdheT86IHN0cmluZztcbn1cblxuaW50ZXJmYWNlIENsYXNzT3B0IHtcbiAgICB3aWZpX2ludGVyZmFjZT86IHN0cmluZztcbiAgICBtb2JpbGU/OiBJTW9iaWxlO1xuICAgIGhvc3RhcGQ/OiBJSG9zdGFwZGNmO1xuICAgIHdwYXN1cHBsaWNhbnRfcGF0aD86IHN0cmluZztcbn1cbmludGVyZmFjZSBJTW9iaWxlIHtcbiAgICBwcm92aWRlcjogSVByb3ZpZGVyO1xuICAgIGRldmljZT86IGFueTtcbiAgICBjb25maWdGaWxlUGF0aD86IHN0cmluZztcblxufVxuXG5pbnRlcmZhY2UgSUV0aGVybmV0IHtcbiAgICBpbnRlcmZhY2U6IHN0cmluZztcbiAgICBkaGNwPzoge1xuICAgICAgICBpcD86IHN0cmluZztcbiAgICAgICAgZ2F0ZXdheT86IHN0cmluZztcbiAgICAgICAgbmV0bWFzaz86IHN0cmluZztcbiAgICAgICAgYmNhc3Q/OiBzdHJpbmc7XG4gICAgfVxufVxuXG5pbnRlcmZhY2UgSUxpTmV0d29ya0NvbmYge1xuICAgIHdpZmlfaW50ZXJmYWNlOiBzdHJpbmc7XG4gICAgbW9iaWxlPzogSU1vYmlsZTtcbiAgICBob3N0YXBkOiBJSG9zdGFwZDtcbiAgICB3cGFzdXBwbGljYW50X3BhdGg/OiBzdHJpbmc7XG4gICAgZXRoZXJuZXQ/OiBJRXRoZXJuZXRbXSxcbiAgICByZWNvdmVyeTogYm9vbGVhblxufVxuaW50ZXJmYWNlIElMaU5ldHdvcmtDb25mUGFyYW1zIHtcbiAgICB3aWZpX2ludGVyZmFjZT86IHN0cmluZztcbiAgICBtb2JpbGU/OiBJTW9iaWxlO1xuICAgIGhvc3RhcGQ/OiBJSG9zdGFwZDtcbiAgICB3cGFzdXBwbGljYW50X3BhdGg/OiBzdHJpbmc7XG4gICAgZXRoZXJuZXQ/OiB7XG4gICAgICAgIGludGVyZmFjZTogc3RyaW5nO1xuICAgICAgICBkaGNwPzoge1xuICAgICAgICAgICAgaXA/OiBzdHJpbmc7XG4gICAgICAgICAgICBnYXRld2F5Pzogc3RyaW5nO1xuICAgICAgICAgICAgbmV0bWFzaz86IHN0cmluZztcbiAgICAgICAgICAgIGJjYXN0Pzogc3RyaW5nO1xuICAgICAgICB9XG4gICAgfSxcbiAgICByZWNvdmVyeT86IHRydWVcbn1cblxuaW50ZXJmYWNlIElIb3N0YXBkIHtcbiAgICBkcml2ZXI6IHN0cmluZztcbiAgICBzc2lkOiBzdHJpbmc7XG4gICAgd3BhX3Bhc3NwaHJhc2U6IGFueTtcbn07XG5pbnRlcmZhY2UgSUhvc3RhcGRjZiB7XG4gICAgZHJpdmVyPzogc3RyaW5nO1xuICAgIHNzaWQ6IHN0cmluZztcbiAgICB3cGFfcGFzc3BocmFzZTogYW55O1xufTtcblxuaW50ZXJmYWNlIElIb3N0YXBkQ2Yge1xuICAgIGRyaXZlcj86IHN0cmluZztcbiAgICBzc2lkPzogc3RyaW5nO1xuICAgIHdwYV9wYXNzcGhyYXNlPzogc3RyaW5nO1xufTtcblxuaW50ZXJmYWNlIElEbnNtYXNxIHtcbiAgICBpbnRlcmZhY2U6IHN0cmluZztcbn07XG5pbnRlcmZhY2UgSURuc21hc3FDZiB7XG4gICAgaW50ZXJmYWNlPzogc3RyaW5nO1xufTtcbmludGVyZmFjZSBJSENvbmYge1xuICAgIGludGVyZmFjZT86IHN0cmluZztcbiAgICB3cGFzdXBwbGljYW50X3BhdGg/OiBzdHJpbmc7XG4gICAgaG9zdGFwZD86IElIb3N0YXBkQ2Y7XG4gICAgcmVkaXJlY3Q/OiBib29sZWFuO1xuICAgIGRuc21hc3E/OiBJRG5zbWFzcUNmO1xufTtcblxuaW50ZXJmYWNlIElDb25uZWN0aW9uIHtcblxuICAgIGxpbmtUeXBlOiBzdHJpbmc7XG4gICAgaW50ZXJmYWNlOiBzdHJpbmc7XG4gICAgaXA/OiBzdHJpbmc7XG4gICAgZ2F0ZXdheT86IHN0cmluZztcblxufVxuXG5pbnRlcmZhY2UgSUluaXQge1xuICAgIGNvbmVjdGlvbjogYm9vbGVhbjtcbiAgICByZWNvdmVyeTogYm9vbGVhbjtcbiAgICBkZXRhaWxzPzogSUNvbm5lY3Rpb247XG59XG5cblxuXG5cbmZ1bmN0aW9uIGdldHdpZmlpbnRlcmZhKHNldHRlZD86IHN0cmluZyk6IFByb21pc2U8SU5ldHdvcms+IHtcblxuICAgIHJldHVybiBuZXcgUHJvbWlzZTxJTmV0d29yaz4oZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICBsZXQgd2lmaV9leGlzdDogYm9vbGVhbiA9IGZhbHNlO1xuICAgICAgICBsZXQgZGV2aTogSU5ldHdvcms7XG4gICAgICAgIG5ldHcoKS50aGVuKGZ1bmN0aW9uIChuZXR3b3Jrcykge1xuXG4gICAgICAgICAgICBfLm1hcChuZXR3b3JrcywgZnVuY3Rpb24gKGRldmljZSkge1xuXG4gICAgICAgICAgICAgICAgaWYgKGRldmljZS50eXBlID09PSBcIndpZmlcIiAmJiAhd2lmaV9leGlzdCAmJiAoIXNldHRlZCB8fCBzZXR0ZWQgPT09IFwiYXV0b1wiIHx8IHNldHRlZCA9PT0gZGV2aWNlLmludGVyZmFjZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgd2lmaV9leGlzdCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGRldmkgPSBkZXZpY2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGlmICh3aWZpX2V4aXN0KSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShkZXZpKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KHsgZXJyb3I6IFwiZGV2aWNlIG5vdCBmb3VuZGVkXCIgfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgIH0pO1xuXG4gICAgfSk7XG5cbn1cblxuXG5mdW5jdGlvbiByZWNvdmVyeV9tb2RlKGFwc3dpdGNoKTogUHJvbWlzZTxJbW9kZT4ge1xuXG5cbiAgICByZXR1cm4gbmV3IFByb21pc2U8SW1vZGU+KGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcblxuXG5cblxuICAgICAgICBhcHN3aXRjaC5ob3N0KCkudGhlbihmdW5jdGlvbiAoYW5zd2VyKSB7XG4gICAgICAgICAgICB2ZXJiKGFuc3dlciwgXCJ3YXJuXCIsIFwibGluZXR3b3JrIHJlY292ZXJ5IG1vZGUgXCIpO1xuICAgICAgICAgICAgcmVzb2x2ZSgnaG9zdCcpO1xuICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICB2ZXJiKGVyciwgXCJlcnJvclwiLCBcImxpbmV0d29yayByZWNvdmVyeSBtb2RlIGZhaWxlZFwiKTtcbiAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICB9KTtcbiAgICB9KTtcbn1cblxuXG5mdW5jdGlvbiByZWNvdmVyeWNoZWNrKGNvbmZpZzogSUxpTmV0d29ya0NvbmYpOiBQcm9taXNlPHsgZGV2aWNlOiBJTmV0d29yaywga25vd25fbmV0d29ya3M6IGJvb2xlYW4gfT4ge1xuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlPHsgZGV2aWNlOiBJTmV0d29yaywga25vd25fbmV0d29ya3M6IGJvb2xlYW4gfT4oZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuXG4gICAgICAgIGxldCBzb21lbmV0d29ya19leGlzdHM6IGJvb2xlYW4gPSBmYWxzZTtcbiAgICAgICAgbGV0IHdsYW5fZXhpc3RzOiBib29sZWFuID0gZmFsc2U7XG5cbiAgICAgICAgbGV0IGRldmk6IElOZXR3b3JrO1xuXG4gICAgICAgIG5ldHcoKS50aGVuKGZ1bmN0aW9uIChuZXR3b3Jrcykge1xuXG4gICAgICAgICAgICBfLm1hcChuZXR3b3JrcywgZnVuY3Rpb24gKGRldmljZSkge1xuXG4gICAgICAgICAgICAgICAgaWYgKGRldmljZS5zY2FuICYmIGRldmljZS50eXBlID09PSBcIndpZmlcIiAmJiAhc29tZW5ldHdvcmtfZXhpc3RzICYmICghY29uZmlnLndpZmlfaW50ZXJmYWNlIHx8IGNvbmZpZy53aWZpX2ludGVyZmFjZSA9PT0gXCJhdXRvXCIgfHwgY29uZmlnLndpZmlfaW50ZXJmYWNlID09PSBkZXZpY2UuaW50ZXJmYWNlKSkge1xuXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IFdNID0gbmV3IFdwYW1hbmFnZXIoY29uZmlnLndwYXN1cHBsaWNhbnRfcGF0aClcblxuICAgICAgICAgICAgICAgICAgICBfLm1hcChkZXZpY2Uuc2NhbiwgZnVuY3Rpb24gKG5ldHNjYW46IElTY2FuKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIF8ubWFwKFdNLmxpc3R3cGEsIGZ1bmN0aW9uICh3cGFpdGVtOiBJU2Nhbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh3cGFpdGVtLmVzc2lkID09PSBuZXRzY2FuLmVzc2lkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNvbWVuZXR3b3JrX2V4aXN0cyA9IHRydWU7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoIXdsYW5fZXhpc3RzICYmIGRldmljZS50eXBlID09PSBcIndpZmlcIiAmJiAoIWNvbmZpZy53aWZpX2ludGVyZmFjZSB8fCBjb25maWcud2lmaV9pbnRlcmZhY2UgPT09IFwiYXV0b1wiIHx8IGNvbmZpZy53aWZpX2ludGVyZmFjZSA9PT0gZGV2aWNlLmludGVyZmFjZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgd2xhbl9leGlzdHMgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBkZXZpID0gZGV2aWNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBpZiAoIXNvbWVuZXR3b3JrX2V4aXN0cyAmJiB3bGFuX2V4aXN0cykge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoeyBkZXZpY2U6IGRldmksIGtub3duX25ldHdvcmtzOiBmYWxzZSB9KTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAod2xhbl9leGlzdHMpIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHsgZGV2aWNlOiBkZXZpLCBrbm93bl9uZXR3b3JrczogdHJ1ZSB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KCdubyBpbnRlcmZhY2UnKVxuICAgICAgICAgICAgfVxuXG4gICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIHJlamVjdCh7IGVycm9yOiBlcnIsIGRlc2NyaXB0aW9uOiAnbmV0dyBlcnInIH0pO1xuICAgICAgICB9KTtcblxuICAgIH0pO1xuXG5cbn1cblxuXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIExpTmV0d29yayB7XG4gICAgbGljb25maWc6IElMaU5ldHdvcmtDb25mO1xuICAgIGhvc3RhcGQ6IGhvc3RhcGRzd2l0Y2g7XG4gICAgbW9iaWxlOiBXdmRpYWw7XG4gICAgbW9kZTogSW1vZGU7XG4gICAgaXNDb25uZWN0ZWQ6IGJvb2xlYW47XG5cblxuICAgIGNvbnN0cnVjdG9yKGRhdGE6IElMaU5ldHdvcmtDb25mUGFyYW1zKSB7XG5cblxuICAgICAgICBjb25zdCBjb25maWc6IElMaU5ldHdvcmtDb25mID0ge1xuICAgICAgICAgICAgaG9zdGFwZDoge1xuICAgICAgICAgICAgICAgIGRyaXZlcjogXCJubDgwMjExXCIsXG4gICAgICAgICAgICAgICAgc3NpZDogXCJ0ZXN0dHRhcFwiLFxuICAgICAgICAgICAgICAgIHdwYV9wYXNzcGhyYXNlOiBcInRlc3RwYXNzXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB3aWZpX2ludGVyZmFjZTogXCJhdXRvXCIsXG4gICAgICAgICAgICB3cGFzdXBwbGljYW50X3BhdGg6IFwiL2V0Yy93cGFfc3VwcGxpY2FudC93cGFfc3VwcGxpY2FudC5jb25mXCIsXG4gICAgICAgICAgICBldGhlcm5ldDogW3tcbiAgICAgICAgICAgICAgICBpbnRlcmZhY2U6ICdldGgwJ1xuICAgICAgICAgICAgfV0sXG4gICAgICAgICAgICByZWNvdmVyeTogZmFsc2VcbiAgICAgICAgfTtcblxuICAgICAgICBtZXJnZShjb25maWcsIGRhdGEpOyAvLyBjb21iaW5lIGRlZmF1bHQgc2V0dGluZ3Mgd2l0aCBuZXcgcGFyYW1ldGVycyBmcm9tIGRhdGFcbiAgICAgICAgdGhpcy5tb2RlID0gJ3VubWFuYWdlZCdcblxuICAgICAgICB0aGlzLmxpY29uZmlnID0gY29uZmlnO1xuXG5cbiAgICAgICAgaWYgKHRoaXMubGljb25maWcubW9iaWxlKSB7XG4gICAgICAgICAgICBpZiAoIXRoaXMubGljb25maWcubW9iaWxlLmNvbmZpZ0ZpbGVQYXRoKSB0aGlzLmxpY29uZmlnLm1vYmlsZS5jb25maWdGaWxlUGF0aCA9IFwiL2V0Yy93dmRpYWwuY29uZlwiO1xuXG4gICAgICAgICAgICB0aGlzLm1vYmlsZSA9IG5ldyBXdmRpYWwodGhpcy5saWNvbmZpZy5tb2JpbGUpXG4gICAgICAgIH1cblxuXG4gICAgfVxuXG5cblxuICAgIGV0aGVybmV0Y29ubmVjdChkZXZpY2VuYW1lPzogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgICAgIGNvbnN0IHRoYXQgPSB0aGlzXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTxib29sZWFuPihmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICBpZiAodGhhdC5saWNvbmZpZy5ldGhlcm5ldCkge1xuXG4gICAgICAgICAgICAgICAgY29uc3QgY29ubmVjdGlvbmRldmljZXNhcnJheTogSU5ldHdvcmtbXSA9IFtdO1xuXG4gICAgICAgICAgICAgICAgbGV0IGRldmljZWV4aXN0czogYm9vbGVhbiA9IGZhbHNlXG4gICAgICAgICAgICAgICAgbGV0IGRldmljZTogSU5ldHdvcms7XG4gICAgICAgICAgICAgICAgLy8gY2hlZWNrIGNvbmZpZ3VyYXRpb25cbiAgICAgICAgICAgICAgICBuZXR3KCkudGhlbigoYSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBfLm1hcChhLCAobmV0KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBfLm1hcCh0aGF0LmxpY29uZmlnLmV0aGVybmV0LCAobmV0aW50ZXJmYWNlY29uZmlndXJlZCkgPT4ge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5ldC50eXBlID09PSAnd2lyZWQnICYmICgoIWRldmljZW5hbWUgJiYgbmV0LmludGVyZmFjZSA9PT0gbmV0aW50ZXJmYWNlY29uZmlndXJlZC5pbnRlcmZhY2UpIHx8IGRldmljZW5hbWUgPT09IG5ldC5pbnRlcmZhY2UpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRldmljZWV4aXN0cyA9IHRydWVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGV2aWNlID0gbmV0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbm5lY3Rpb25kZXZpY2VzYXJyYXkucHVzaChuZXQpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICAgICAgICAgIGlmIChkZXZpY2VleGlzdHMpIHtcblxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGNvbm5lY3RlZDogYm9vbGVhbiA9IGZhbHNlO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBhc3luYy5lYWNoU2VyaWVzKGNvbm5lY3Rpb25kZXZpY2VzYXJyYXksIChkZXZpY2UsIGNiKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFjb25uZWN0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hpbGRfcHJvY2Vzcy5leGVjKCdpZmNvbmZpZyAnICsgZGV2aWNlLmludGVyZmFjZSArICcgZG93biAmJiBpZmNvbmZpZyAnICsgZGV2aWNlLmludGVyZmFjZSArICcgdXAgJiYgZGhjbGllbnQgJyArIGRldmljZS5pbnRlcmZhY2UsIChlcnIsIHN0ZG91dCwgc3RkZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2IoKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnRlc3RpbnRlcm5ldCgpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25uZWN0ZWQgPSB0cnVlXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2IoKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYigpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICB9LCAoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFjb25uZWN0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KCdubyBjb25uZWN0aW9uIGJ5IGEgZXRoZXJuZXQgZGV2aWNlJylcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSlcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBuZWVkIGFzeW5jIHRvIHByb2Nlc3MgZXZlcnlvbmVcblxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KCdubyBldGhlcm5ldCBkZXZpY2UnKVxuICAgICAgICAgICAgICAgICAgICB9XG5cblxuICAgICAgICAgICAgICAgIH0pXG5cbiAgICAgICAgICAgICAgICAvLyBjaGVjayBpZiBpdCBpcyBqdXN0IGNvbm5lY3RlZCBieSBldGgwXG4gICAgICAgICAgICAgICAgLy8gaWYgaXMgY29ubmVjdGVkIGFsbCBvay5cbiAgICAgICAgICAgICAgICAvLyBlbHNlIHRoYXQuZXRoZXJuZXRyZWNvbm5lY3QoZGV2aWNlKVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZWplY3QoJ2ludmFsaWQgZXRoZXJuZXQgY29uZicpXG5cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cblxuICAgIH1cblxuICAgIGV0aGVybmV0cmVjb25uZWN0KGRldmljZT86IGFueSkge1xuICAgICAgICBjb25zdCB0aGF0ID0gdGhpc1xuXG4gICAgfVxuXG4gICAgbW9iaWxlY29ubmVjdChib29sOiBib29sZWFuKSB7XG4gICAgICAgIGNvbnN0IHRoYXQgPSB0aGlzO1xuXG4gICAgICAgIGNvbnN0IFd2ID0gdGhhdC5tb2JpbGU7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTxib29sZWFuPihmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICBXdi5jb25maWd1cmUoYm9vbCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgV3YuY29ubmVjdCh0cnVlKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5tb2RlID0gJ3d2J1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIm1vZGVtIHN0YXJ0ZWRcIik7XG5cbiAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwibW9kZW0gZXJyb3JcIik7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuXG5cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pXG5cblxuXG5cbiAgICAgICAgfSk7XG5cbiAgICB9O1xuICAgIG5ldHdvcmtzKCk6IFByb21pc2U8SU5ldHdvcmtbXT4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8SU5ldHdvcmtbXT4oZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuXG4gICAgICAgICAgICBuZXR3KCkudGhlbihmdW5jdGlvbiAoYSkge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoYSlcbiAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICByZWplY3QoZXJyKVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICB9XG4gICAgbmV0d29yayhkZXZpY2VuYW1lOiBzdHJpbmcpOiBQcm9taXNlPElOZXR3b3JrPiB7XG4gICAgICAgIGNvbnN0IHRoYXQgPSB0aGlzO1xuICAgICAgICBsZXQgbmV0ZXhpc3RzOiBib29sZWFuID0gZmFsc2VcbiAgICAgICAgbGV0IG5ldHdvcmtpbnRlcmZhY2U6IElOZXR3b3JrO1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8SU5ldHdvcms+KGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcblxuICAgICAgICAgICAgdGhhdC5uZXR3b3JrcygpLnRoZW4oZnVuY3Rpb24gKGEpIHtcbiAgICAgICAgICAgICAgICBfLm1hcChhLCAobmV0KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghbmV0ZXhpc3RzICYmIG5ldC5pbnRlcmZhY2UgPT09IGRldmljZW5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ldGV4aXN0cyA9IHRydWVcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ldHdvcmtpbnRlcmZhY2UgPSBuZXRcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgaWYgKG5ldGV4aXN0cykge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKG5ldHdvcmtpbnRlcmZhY2UpXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KCdubyBuZXR3b3JrJylcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KGVycilcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgdGVzdGludGVybmV0KCkge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuXG4gICAgICAgICAgICB0ZXN0aW50ZXJuZXQoKS50aGVuKGZ1bmN0aW9uIChhKSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShhKVxuICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgIHJlamVjdChlcnIpXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgaG9zdGFwZGNvbmYoaGNvbmZpZzogSUhDb25mLCByZWNvbmY/OiB0cnVlKSB7IC8vIHJlY29uZiBpcyBleHBlcmltZW50YWxcbiAgICAgICAgY29uc3QgdGhhdCA9IHRoaXNcbiAgICAgICAgaWYgKCFoY29uZmlnKSB7XG4gICAgICAgICAgICB0aHJvdyBFcnJvcignbm8gY29uZmlnIHByb3ZpZGVkIHRvIGNvbmZpZ3VyZSBob3N0YXBkY29uZicpXG4gICAgICAgIH0gZWxzZSBpZiAoIXRoYXQuaG9zdGFwZCB8fCByZWNvbmYpIHtcbiAgICAgICAgICAgIHRoYXQuaG9zdGFwZCA9IG5ldyBob3N0YXBkc3dpdGNoKGhjb25maWcsIHRydWUpO1xuICAgICAgICB9XG5cbiAgICB9XG5cbiAgICB3cGFtYW5hZ2VyKCkge1xuICAgICAgICBjb25zdCBwYXRoID0gdGhpcy5saWNvbmZpZy53cGFzdXBwbGljYW50X3BhdGg7XG4gICAgICAgIHJldHVybiBuZXcgV3BhbWFuYWdlcih0aGlzLmxpY29uZmlnLndwYXN1cHBsaWNhbnRfcGF0aCk7XG4gICAgfVxuXG5cbiAgICBtb2JpbGVwcm92aWRlcnMoKSB7XG5cbiAgICAgICAgcmV0dXJuIG5ldyBQcm92aWRlcnMoKVxuXG4gICAgfVxuXG4gICAgd2lmaV9zd2l0Y2gobW9kZTogc3RyaW5nLCBkZXY/OiBzdHJpbmcpIHtcbiAgICAgICAgY29uc29sZS5sb2cobW9kZSwgZGV2KTtcbiAgICAgICAgY29uc3QgdGhhdCA9IHRoaXM7XG4gICAgICAgIGNvbnN0IGNvbmZpZyA9IHRoYXQubGljb25maWc7XG5cbiAgICAgICAgaWYgKGRldiB8fCB0aGlzLmxpY29uZmlnLndpZmlfaW50ZXJmYWNlICE9PSBcImF1dG9cIikge1xuXG4gICAgICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8Ym9vbGVhbj4oZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuXG5cbiAgICAgICAgICAgICAgICBpZiAoIWRldikge1xuICAgICAgICAgICAgICAgICAgICBkZXYgPSBjb25maWcud2lmaV9pbnRlcmZhY2U7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJkZXYgbW9kZVwiKTtcbiAgICAgICAgICAgICAgICB0aGF0Lmhvc3RhcGRjb25mKHtcbiAgICAgICAgICAgICAgICAgICAgaW50ZXJmYWNlOiBkZXYsXG4gICAgICAgICAgICAgICAgICAgIHdwYXN1cHBsaWNhbnRfcGF0aDogY29uZmlnLndwYXN1cHBsaWNhbnRfcGF0aCxcbiAgICAgICAgICAgICAgICAgICAgaG9zdGFwZDogY29uZmlnLmhvc3RhcGRcbiAgICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICAgICAgc3dpdGNoIChtb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJhcFwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5ob3N0YXBkLmFwKCkudGhlbihmdW5jdGlvbiAoYW5zd2VyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5tb2RlID0gJ2FwJ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJob3N0XCI6XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lmhvc3RhcGQuaG9zdCgpLnRoZW4oZnVuY3Rpb24gKGFuc3dlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQubW9kZSA9ICdob3N0J1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJjbGllbnRcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuaG9zdGFwZC5jbGllbnQoKS50aGVuKGZ1bmN0aW9uIChhbnN3ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lm1vZGUgPSAnY2xpZW50J1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiYXV0byBtb2RlXCIpO1xuICAgICAgICAgICAgY29uc3QgY29uZmlnID0gdGhpcy5saWNvbmZpZztcbiAgICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICAgICAgbmV0dygpLnRoZW4oZnVuY3Rpb24gKG5ldHdvcmtzKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgXy5tYXAobmV0d29ya3MsIGZ1bmN0aW9uIChkZXZpY2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkZXZpY2UudHlwZSA9PT0gXCJ3aWZpXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXYgPSBkZXZpY2UuaW50ZXJmYWNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRldikge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lmhvc3RhcGRjb25mKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnRlcmZhY2U6IGRldixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBob3N0YXBkOiBjb25maWcuaG9zdGFwZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3cGFzdXBwbGljYW50X3BhdGg6IGNvbmZpZy53cGFzdXBwbGljYW50X3BhdGhcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHRoYXQuaG9zdGFwZCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHN3aXRjaCAobW9kZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgXCJhcFwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lmhvc3RhcGQuYXAoKS50aGVuKGZ1bmN0aW9uIChhbnN3ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQubW9kZSA9ICdhcCdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFwiaG9zdFwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lmhvc3RhcGQuaG9zdCgpLnRoZW4oZnVuY3Rpb24gKGFuc3dlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5tb2RlID0gJ2hvc3QnXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBcImNsaWVudFwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lmhvc3RhcGQuY2xpZW50KCkudGhlbihmdW5jdGlvbiAoYW5zd2VyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lm1vZGUgPSAnY2xpZW50J1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KHsgZXJyb3I6IFwibm8gZGV2XCIgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG5cblxuXG5cbiAgICBjb25uZWN0aW9uKCkge1xuICAgICAgICBjb25zdCB0aGF0ID0gdGhpcztcbiAgICAgICAgY29uc3QgcmVjb3ZlcnkgPSB0aGF0LmxpY29uZmlnLnJlY292ZXJ5XG5cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgIHZlcmIodGhhdC5saWNvbmZpZywgXCJkZWJ1Z1wiLCBcIlRyeW5nIHRvIGNvbm5lY3RcIik7XG5cbiAgICAgICAgICAgIGlmICh0aGF0Lm1vZGUgPT09IFwid3ZcIikge1xuICAgICAgICAgICAgICAgIHJlamVjdChcImF1dG8gbW9kZVwiKVxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwid3YgcnVubmluZywgbm90aGluZyB0byBkb1wiKVxuICAgICAgICAgICAgfSBlbHNlIHtcblxuXG4gICAgICAgICAgICAgICAgdGhhdC50ZXN0aW50ZXJuZXQoKS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKVxuICAgICAgICAgICAgICAgIH0pLmNhdGNoKChlcnIpID0+IHtcblxuXG4gICAgICAgICAgICAgICAgICAgIHRoYXQuZXRoZXJuZXRjb25uZWN0KCkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnY29ubmVjdGVkIGJ5IGV0aGVybmV0JylcblxuICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaCgoKSA9PiB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGdldHdpZmlpbnRlcmZhKHRoYXQubGljb25maWcud2lmaV9pbnRlcmZhY2UpLnRoZW4oZnVuY3Rpb24gKGludGVyZikge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgd2lmaV9leGlzdDogc3RyaW5nID0gaW50ZXJmLmludGVyZmFjZTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbmZoYXBkcyA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW50ZXJmYWNlOiB3aWZpX2V4aXN0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3cGFzdXBwbGljYW50X3BhdGg6IHRoYXQubGljb25maWcud3Bhc3VwcGxpY2FudF9wYXRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBob3N0YXBkOiB0aGF0LmxpY29uZmlnLmhvc3RhcGRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoYXQubGljb25maWcubW9iaWxlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZWNvdmVyeSAmJiB3aWZpX2V4aXN0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcInJlY292ZXJpbmdcIilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuaG9zdGFwZGNvbmYoY29uZmhhcGRzKVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnJlY292ZXJ5KHRydWUpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAod2lmaV9leGlzdCkge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lmhvc3RhcGRjb25mKGNvbmZoYXBkcylcblxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lmhvc3RhcGQuY2xpZW50KHRydWUpLnRoZW4oZnVuY3Rpb24gKGFuc3dlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwid2lmaWNsaWVudCBjb25uZWN0ZWQgXCIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG5cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQubW9iaWxlLmNvbmZpZ3VyZSgpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lm1vZGUgPSBcInd2XCI7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwibW9kZW0gc3RhcnRlZFwiKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lm1vYmlsZS5jb25uZWN0KHRydWUpLnRoZW4oZnVuY3Rpb24gKGEpIHtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaHdyZXN0YXJ0KFwidW5wbHVnXCIpXG5cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIm1vZGVtIGVycm9yXCIpXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGh3cmVzdGFydChcInVucGx1Z1wiKVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGUpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwibW9kZW0gZXJyb3JcIilcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBod3Jlc3RhcnQoXCJ1bnBsdWdcIilcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG5cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cblxuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAod2lmaV9leGlzdCkge1xuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmVyYih3aWZpX2V4aXN0LCBcImluZm9cIiwgXCJXbGFuIGludGVyZmFjZSBmb3VuZGVkXCIpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuaG9zdGFwZGNvbmYoY29uZmhhcGRzKVxuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5ob3N0YXBkLmNsaWVudCh0cnVlKS50aGVuKGZ1bmN0aW9uIChhbnN3ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQubW9kZSA9ICdjbGllbnQnXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHsgY29uZWN0aW9uOiB0cnVlLCByZWNvdmVyeTogZmFsc2UgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZWNvdmVyeSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQucmVjb3ZlcnkodHJ1ZSkudGhlbihmdW5jdGlvbiAoYW5zd2VyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZlcmIoYW5zd2VyLCBcImluZm9cIiwgXCJMSU5FVFdPUktJTkcgcmVjb3ZlcnkgbW9kZSBzdGFydFwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZlcmIoZXJyLCBcImVycm9yXCIsIFwiTElORVRXT1JLSU5HIHJlY292ZXJ5IG1vZGUgc3RhcnRcIik7XG5cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cblxuXG4gICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2ZXJiKFwibm8gd2lmaVwiLCBcIndhcm5cIiwgXCJuZXR3b3JrZXJcIik7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhhdC5saWNvbmZpZy5tb2JpbGUpIHtcblxuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5tb2JpbGUuY29uZmlndXJlKCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lm1vZGUgPSBcInd2XCI7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lm1vYmlsZS5jb25uZWN0KHRydWUpLnRoZW4oZnVuY3Rpb24gKGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhhKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGh3cmVzdGFydChcInVucGx1Z1wiKVxuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIm1vZGVtIGVycm9yXCIpXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBod3Jlc3RhcnQoXCJ1bnBsdWdcIilcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJtb2RlbSBlcnJvclwiKVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBod3Jlc3RhcnQoXCJ1bnBsdWdcIilcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcblxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJubyB3aWZpISE/Pz9cIilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaHdyZXN0YXJ0KFwidW5wbHVnXCIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcblxuXG5cbiAgICAgICAgICAgICAgICAgICAgfSlcblxuXG5cblxuXG4gICAgICAgICAgICAgICAgfSlcblxuXG5cblxuXG5cblxuICAgICAgICAgICAgfVxuXG5cbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIHJlY292ZXJ5KGZvcmNlPzogdHJ1ZSkge1xuICAgICAgICBjb25zdCBjb25maWcgPSB0aGlzLmxpY29uZmlnO1xuICAgICAgICBjb25zdCB0aGF0ID0gdGhpcztcblxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgICAgcmVjb3ZlcnljaGVjayhjb25maWcpLnRoZW4oZnVuY3Rpb24gKGEpIHtcblxuICAgICAgICAgICAgICAgIGNvbnN0IGludGVyZiA9IGEuZGV2aWNlXG4gICAgICAgICAgICAgICAgaWYgKGZvcmNlIHx8ICFhLmtub3duX25ldHdvcmtzKSB7XG5cblxuICAgICAgICAgICAgICAgICAgICB0aGF0Lmhvc3RhcGRjb25mKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGludGVyZmFjZTogYS5kZXZpY2UuaW50ZXJmYWNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgd3Bhc3VwcGxpY2FudF9wYXRoOiB0aGF0LmxpY29uZmlnLndwYXN1cHBsaWNhbnRfcGF0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGhvc3RhcGQ6IHRoYXQubGljb25maWcuaG9zdGFwZFxuICAgICAgICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICAgICAgICAgIHJlY292ZXJ5X21vZGUodGhhdC5ob3N0YXBkKS50aGVuKGZ1bmN0aW9uIChhbnN3ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQubW9kZSA9IGFuc3dlcjtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoYW5zd2VyKTtcbiAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxufTtcblxuXG5cblxuXG5cbiJdfQ==
