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
    LiNetwork.prototype.hostapdconf = function (hconfig, reconf) {
        var that = this;
        if (!hconfig) {
            throw Error('no config provided to configure hostapdconf');
        }
        else if (!that.hostapd || reconf) {
            that.hostapd = new hostapd_switch_1.default(hconfig, true);
        }
        else {
            console.log('hostapd was just reconfigured');
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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SSxDQUFDLFFBQVEsQ0FBQyxrQkFBa0I7d0JBQ3BELE9BQU8sRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU87cUJBQ2pDLENBQUMsQ0FBQTtvQkFFRixhQUFhLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLE1BQU07d0JBQzdDLElBQUksQ0FBQyxJQUFJLEdBQUcsTUFBTSxDQUFDO3dCQUNuQixPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7b0JBQ3BCLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUc7d0JBQ2xCLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztvQkFDaEIsQ0FBQyxDQUFDLENBQUM7Z0JBRVAsQ0FBQztnQkFBQyxJQUFJLENBQUMsQ0FBQztvQkFDSixNQUFNLENBQUMscUJBQXFCLENBQUMsQ0FBQTtnQkFDakMsQ0FBQztZQUVMLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUc7Z0JBQ2xCLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNoQixDQUFDLENBQUMsQ0FBQztRQUNQLENBQUMsQ0FBQyxDQUFDO0lBQ1AsQ0FBQzs7SUFFTCxnQkFBQztBQUFELENBL2xCQSxBQStsQkMsSUFBQTtBQS9sQkQ7MkJBK2xCQyxDQUFBO0FBQUEsQ0FBQyIsImZpbGUiOiJpbmRleC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIFByb21pc2UgZnJvbSBcImJsdWViaXJkXCI7XG5pbXBvcnQgKiBhcyBmcyBmcm9tIFwiZnNcIjtcbmltcG9ydCAqIGFzIGNoaWxkX3Byb2Nlc3MgZnJvbSBcImNoaWxkX3Byb2Nlc3NcIjtcbmltcG9ydCAqIGFzIF8gZnJvbSBcImxvZGFzaFwiO1xuaW1wb3J0ICogYXMgYXN5bmMgZnJvbSBcImFzeW5jXCI7XG5pbXBvcnQgUHJvdmlkZXJzID0gcmVxdWlyZShcIm1vYmlsZS1wcm92aWRlcnNcIik7XG5pbXBvcnQgV3BhbWFuYWdlciBmcm9tIFwid3Bhc3VwcGxpY2FudC1tYW5hZ2VyXCI7XG5pbXBvcnQgaG9zdGFwZHN3aXRjaCBmcm9tIFwiaG9zdGFwZF9zd2l0Y2hcIjtcbmltcG9ydCB0ZXN0aW50ZXJuZXQgZnJvbSBcInByb21pc2UtdGVzdC1jb25uZWN0aW9uXCI7XG5pbXBvcnQgbWVyZ2UgZnJvbSBcImpzb24tYWRkXCI7XG5pbXBvcnQgV3ZkaWFsIGZyb20gXCJ3dmRpYWxqc1wiO1xuXG5cbmltcG9ydCBuZXR3IGZyb20gXCJuZXR3XCI7XG5jb25zdCB2ZXJiID0gcmVxdWlyZShcInZlcmJvXCIpO1xuY29uc3QgaHdyZXN0YXJ0ID0gcmVxdWlyZShcImh3cmVzdGFydFwiKTtcblxuXG5cblxuaW50ZXJmYWNlIElQcm92aWRlciB7XG5cbiAgICBsYWJlbD86IHN0cmluZztcbiAgICBhcG46IHN0cmluZztcbiAgICBwaG9uZT86IHN0cmluZ1xuICAgIHVzZXJuYW1lPzogc3RyaW5nO1xuICAgIHBhc3N3b3JkPzogc3RyaW5nO1xuXG59XG5cbmludGVyZmFjZSBJR2xvYmFsUHJvdmlkZXJzIHtcblxuICAgIGNvdW50cnk6IHN0cmluZztcbiAgICBwcm92aWRlcnM6IElQcm92aWRlcltdO1xufVxuXG5cbnR5cGUgSW1vZGUgPSAnYXAnIHwgJ2hvc3QnIHwgJ2NsaWVudCcgfCAndW5tYW5hZ2VkJyB8ICd3dicgfCAnZXRoZXJuZXQnXG5cblxuaW50ZXJmYWNlIElTY2FuIHtcbiAgICBlc3NpZDogc3RyaW5nO1xuICAgIG1hYzogc3RyaW5nO1xuICAgIHNpZ25hbDogc3RyaW5nO1xufVxuXG50eXBlIElOZXR3b3JrVHlwZSA9ICd3aWZpJyB8ICd3aXJlZCdcblxuaW50ZXJmYWNlIElOZXR3b3JrIHtcbiAgICB0eXBlOiBJTmV0d29ya1R5cGU7XG4gICAgbWFjOiBzdHJpbmc7XG4gICAgaW50ZXJmYWNlOiBzdHJpbmc7XG4gICAgZXNzaWQ/OiBzdHJpbmc7XG4gICAgc2Nhbj86IElTY2FuW107XG4gICAgaXA/OiBzdHJpbmc7XG4gICAgZ2F0ZXdheT86IHN0cmluZztcbn1cblxuaW50ZXJmYWNlIENsYXNzT3B0IHtcbiAgICB3aWZpX2ludGVyZmFjZT86IHN0cmluZztcbiAgICBtb2JpbGU/OiBJTW9iaWxlO1xuICAgIGhvc3RhcGQ/OiBJSG9zdGFwZGNmO1xuICAgIHdwYXN1cHBsaWNhbnRfcGF0aD86IHN0cmluZztcbn1cbmludGVyZmFjZSBJTW9iaWxlIHtcbiAgICBwcm92aWRlcjogSVByb3ZpZGVyO1xuICAgIGRldmljZT86IGFueTtcbiAgICBjb25maWdGaWxlUGF0aD86IHN0cmluZztcblxufVxuXG5pbnRlcmZhY2UgSUV0aGVybmV0IHtcbiAgICBpbnRlcmZhY2U6IHN0cmluZztcbiAgICBkaGNwPzoge1xuICAgICAgICBpcD86IHN0cmluZztcbiAgICAgICAgZ2F0ZXdheT86IHN0cmluZztcbiAgICAgICAgbmV0bWFzaz86IHN0cmluZztcbiAgICAgICAgYmNhc3Q/OiBzdHJpbmc7XG4gICAgfVxufVxuXG5pbnRlcmZhY2UgSUxpTmV0d29ya0NvbmYge1xuICAgIHdpZmlfaW50ZXJmYWNlOiBzdHJpbmc7XG4gICAgbW9iaWxlPzogSU1vYmlsZTtcbiAgICBob3N0YXBkOiBJSG9zdGFwZDtcbiAgICB3cGFzdXBwbGljYW50X3BhdGg/OiBzdHJpbmc7XG4gICAgZXRoZXJuZXQ/OiBJRXRoZXJuZXRbXSxcbiAgICByZWNvdmVyeTogYm9vbGVhblxufVxuaW50ZXJmYWNlIElMaU5ldHdvcmtDb25mUGFyYW1zIHtcbiAgICB3aWZpX2ludGVyZmFjZT86IHN0cmluZztcbiAgICBtb2JpbGU/OiBJTW9iaWxlO1xuICAgIGhvc3RhcGQ/OiBJSG9zdGFwZDtcbiAgICB3cGFzdXBwbGljYW50X3BhdGg/OiBzdHJpbmc7XG4gICAgZXRoZXJuZXQ/OiB7XG4gICAgICAgIGludGVyZmFjZTogc3RyaW5nO1xuICAgICAgICBkaGNwPzoge1xuICAgICAgICAgICAgaXA/OiBzdHJpbmc7XG4gICAgICAgICAgICBnYXRld2F5Pzogc3RyaW5nO1xuICAgICAgICAgICAgbmV0bWFzaz86IHN0cmluZztcbiAgICAgICAgICAgIGJjYXN0Pzogc3RyaW5nO1xuICAgICAgICB9XG4gICAgfSxcbiAgICByZWNvdmVyeT86IHRydWVcbn1cblxuaW50ZXJmYWNlIElIb3N0YXBkIHtcbiAgICBkcml2ZXI6IHN0cmluZztcbiAgICBzc2lkOiBzdHJpbmc7XG4gICAgd3BhX3Bhc3NwaHJhc2U6IGFueTtcbn07XG5pbnRlcmZhY2UgSUhvc3RhcGRjZiB7XG4gICAgZHJpdmVyPzogc3RyaW5nO1xuICAgIHNzaWQ6IHN0cmluZztcbiAgICB3cGFfcGFzc3BocmFzZTogYW55O1xufTtcblxuaW50ZXJmYWNlIElIb3N0YXBkQ2Yge1xuICAgIGRyaXZlcj86IHN0cmluZztcbiAgICBzc2lkPzogc3RyaW5nO1xuICAgIHdwYV9wYXNzcGhyYXNlPzogc3RyaW5nO1xufTtcblxuaW50ZXJmYWNlIElEbnNtYXNxIHtcbiAgICBpbnRlcmZhY2U6IHN0cmluZztcbn07XG5pbnRlcmZhY2UgSURuc21hc3FDZiB7XG4gICAgaW50ZXJmYWNlPzogc3RyaW5nO1xufTtcbmludGVyZmFjZSBJSENvbmYge1xuICAgIGludGVyZmFjZT86IHN0cmluZztcbiAgICB3cGFzdXBwbGljYW50X3BhdGg/OiBzdHJpbmc7XG4gICAgaG9zdGFwZD86IElIb3N0YXBkQ2Y7XG4gICAgcmVkaXJlY3Q/OiBib29sZWFuO1xuICAgIGRuc21hc3E/OiBJRG5zbWFzcUNmO1xufTtcblxuaW50ZXJmYWNlIElDb25uZWN0aW9uIHtcblxuICAgIGxpbmtUeXBlOiBzdHJpbmc7XG4gICAgaW50ZXJmYWNlOiBzdHJpbmc7XG4gICAgaXA/OiBzdHJpbmc7XG4gICAgZ2F0ZXdheT86IHN0cmluZztcblxufVxuXG5pbnRlcmZhY2UgSUluaXQge1xuICAgIGNvbmVjdGlvbjogYm9vbGVhbjtcbiAgICByZWNvdmVyeTogYm9vbGVhbjtcbiAgICBkZXRhaWxzPzogSUNvbm5lY3Rpb247XG59XG5cblxuXG5cbmZ1bmN0aW9uIGdldHdpZmlpbnRlcmZhKHNldHRlZD86IHN0cmluZyk6IFByb21pc2U8SU5ldHdvcms+IHtcblxuICAgIHJldHVybiBuZXcgUHJvbWlzZTxJTmV0d29yaz4oZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICBsZXQgd2lmaV9leGlzdDogYm9vbGVhbiA9IGZhbHNlO1xuICAgICAgICBsZXQgZGV2aTogSU5ldHdvcms7XG4gICAgICAgIG5ldHcoKS50aGVuKGZ1bmN0aW9uIChuZXR3b3Jrcykge1xuXG4gICAgICAgICAgICBfLm1hcChuZXR3b3JrcywgZnVuY3Rpb24gKGRldmljZSkge1xuXG4gICAgICAgICAgICAgICAgaWYgKGRldmljZS50eXBlID09PSBcIndpZmlcIiAmJiAhd2lmaV9leGlzdCAmJiAoIXNldHRlZCB8fCBzZXR0ZWQgPT09IFwiYXV0b1wiIHx8IHNldHRlZCA9PT0gZGV2aWNlLmludGVyZmFjZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgd2lmaV9leGlzdCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGRldmkgPSBkZXZpY2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGlmICh3aWZpX2V4aXN0KSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShkZXZpKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KHsgZXJyb3I6IFwiZGV2aWNlIG5vdCBmb3VuZGVkXCIgfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgIH0pO1xuXG4gICAgfSk7XG5cbn1cblxuXG5mdW5jdGlvbiByZWNvdmVyeV9tb2RlKGFwc3dpdGNoKTogUHJvbWlzZTxJbW9kZT4ge1xuXG5cbiAgICByZXR1cm4gbmV3IFByb21pc2U8SW1vZGU+KGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcblxuICAgICAgICBhcHN3aXRjaC5ob3N0KCkudGhlbihmdW5jdGlvbiAoYW5zd2VyKSB7XG4gICAgICAgICAgICB2ZXJiKGFuc3dlciwgXCJ3YXJuXCIsIFwibGluZXR3b3JrIHJlY292ZXJ5IG1vZGUgXCIpO1xuICAgICAgICAgICAgcmVzb2x2ZSgnaG9zdCcpO1xuICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICB2ZXJiKGVyciwgXCJlcnJvclwiLCBcImxpbmV0d29yayByZWNvdmVyeSBtb2RlIGZhaWxlZFwiKTtcbiAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICB9KTtcbiAgICB9KTtcbn1cblxuXG5mdW5jdGlvbiByZWNvdmVyeWNoZWNrKGNvbmZpZzogSUxpTmV0d29ya0NvbmYpOiBQcm9taXNlPHsgZGV2aWNlOiBJTmV0d29yaywga25vd25fbmV0d29ya3M6IGJvb2xlYW4gfT4ge1xuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlPHsgZGV2aWNlOiBJTmV0d29yaywga25vd25fbmV0d29ya3M6IGJvb2xlYW4gfT4oZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuXG4gICAgICAgIGxldCBzb21lbmV0d29ya19leGlzdHM6IGJvb2xlYW4gPSBmYWxzZTtcbiAgICAgICAgbGV0IHdsYW5fZXhpc3RzOiBib29sZWFuID0gZmFsc2U7XG5cbiAgICAgICAgbGV0IGRldmk6IElOZXR3b3JrO1xuXG4gICAgICAgIG5ldHcoKS50aGVuKGZ1bmN0aW9uIChuZXR3b3Jrcykge1xuXG4gICAgICAgICAgICBfLm1hcChuZXR3b3JrcywgZnVuY3Rpb24gKGRldmljZSkge1xuXG4gICAgICAgICAgICAgICAgaWYgKGRldmljZS5zY2FuICYmIGRldmljZS50eXBlID09PSBcIndpZmlcIiAmJiAhc29tZW5ldHdvcmtfZXhpc3RzICYmICghY29uZmlnLndpZmlfaW50ZXJmYWNlIHx8IGNvbmZpZy53aWZpX2ludGVyZmFjZSA9PT0gXCJhdXRvXCIgfHwgY29uZmlnLndpZmlfaW50ZXJmYWNlID09PSBkZXZpY2UuaW50ZXJmYWNlKSkge1xuXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IFdNID0gbmV3IFdwYW1hbmFnZXIoY29uZmlnLndwYXN1cHBsaWNhbnRfcGF0aClcblxuICAgICAgICAgICAgICAgICAgICBfLm1hcChkZXZpY2Uuc2NhbiwgZnVuY3Rpb24gKG5ldHNjYW46IElTY2FuKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIF8ubWFwKFdNLmxpc3R3cGEsIGZ1bmN0aW9uICh3cGFpdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHdwYWl0ZW0uc3NpZCA9PT0gbmV0c2Nhbi5lc3NpZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzb21lbmV0d29ya19leGlzdHMgPSB0cnVlO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKCF3bGFuX2V4aXN0cyAmJiBkZXZpY2UudHlwZSA9PT0gXCJ3aWZpXCIgJiYgKCFjb25maWcud2lmaV9pbnRlcmZhY2UgfHwgY29uZmlnLndpZmlfaW50ZXJmYWNlID09PSBcImF1dG9cIiB8fCBjb25maWcud2lmaV9pbnRlcmZhY2UgPT09IGRldmljZS5pbnRlcmZhY2UpKSB7XG4gICAgICAgICAgICAgICAgICAgIHdsYW5fZXhpc3RzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgZGV2aSA9IGRldmljZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgaWYgKCFzb21lbmV0d29ya19leGlzdHMgJiYgd2xhbl9leGlzdHMpIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHsgZGV2aWNlOiBkZXZpLCBrbm93bl9uZXR3b3JrczogZmFsc2UgfSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHdsYW5fZXhpc3RzKSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7IGRldmljZTogZGV2aSwga25vd25fbmV0d29ya3M6IHRydWUgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlamVjdCgnbm8gaW50ZXJmYWNlJylcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICByZWplY3QoeyBlcnJvcjogZXJyLCBkZXNjcmlwdGlvbjogJ25ldHcgZXJyJyB9KTtcbiAgICAgICAgfSk7XG5cbiAgICB9KTtcblxuXG59XG5cblxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBMaU5ldHdvcmsge1xuICAgIGxpY29uZmlnOiBJTGlOZXR3b3JrQ29uZjtcbiAgICBob3N0YXBkOiBob3N0YXBkc3dpdGNoO1xuICAgIG1vYmlsZTogV3ZkaWFsO1xuICAgIG1vZGU6IEltb2RlO1xuICAgIGlzQ29ubmVjdGVkOiBib29sZWFuO1xuXG5cbiAgICBjb25zdHJ1Y3RvcihkYXRhOiBJTGlOZXR3b3JrQ29uZlBhcmFtcykge1xuXG5cbiAgICAgICAgY29uc3QgY29uZmlnOiBJTGlOZXR3b3JrQ29uZiA9IHtcbiAgICAgICAgICAgIGhvc3RhcGQ6IHtcbiAgICAgICAgICAgICAgICBkcml2ZXI6IFwibmw4MDIxMVwiLFxuICAgICAgICAgICAgICAgIHNzaWQ6IFwidGVzdHR0YXBcIixcbiAgICAgICAgICAgICAgICB3cGFfcGFzc3BocmFzZTogXCJ0ZXN0cGFzc1wiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgd2lmaV9pbnRlcmZhY2U6IFwiYXV0b1wiLFxuICAgICAgICAgICAgd3Bhc3VwcGxpY2FudF9wYXRoOiBcIi9ldGMvd3BhX3N1cHBsaWNhbnQvd3BhX3N1cHBsaWNhbnQuY29uZlwiLFxuICAgICAgICAgICAgZXRoZXJuZXQ6IFt7XG4gICAgICAgICAgICAgICAgaW50ZXJmYWNlOiAnZXRoMCdcbiAgICAgICAgICAgIH1dLFxuICAgICAgICAgICAgcmVjb3Zlcnk6IGZhbHNlXG4gICAgICAgIH07XG5cbiAgICAgICAgbWVyZ2UoY29uZmlnLCBkYXRhKTsgLy8gY29tYmluZSBkZWZhdWx0IHNldHRpbmdzIHdpdGggbmV3IHBhcmFtZXRlcnMgZnJvbSBkYXRhXG4gICAgICAgIHRoaXMubW9kZSA9ICd1bm1hbmFnZWQnXG5cbiAgICAgICAgdGhpcy5saWNvbmZpZyA9IGNvbmZpZztcblxuXG4gICAgICAgIGlmICh0aGlzLmxpY29uZmlnLm1vYmlsZSkge1xuICAgICAgICAgICAgaWYgKCF0aGlzLmxpY29uZmlnLm1vYmlsZS5jb25maWdGaWxlUGF0aCkgdGhpcy5saWNvbmZpZy5tb2JpbGUuY29uZmlnRmlsZVBhdGggPSBcIi9ldGMvd3ZkaWFsLmNvbmZcIjtcblxuICAgICAgICAgICAgdGhpcy5tb2JpbGUgPSBuZXcgV3ZkaWFsKHRoaXMubGljb25maWcubW9iaWxlKVxuICAgICAgICB9XG5cblxuICAgIH1cblxuXG5cbiAgICBldGhlcm5ldGNvbm5lY3QoZGV2aWNlbmFtZT86IHN0cmluZyk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgICAgICBjb25zdCB0aGF0ID0gdGhpc1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8Ym9vbGVhbj4oZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgICAgaWYgKHRoYXQubGljb25maWcuZXRoZXJuZXQpIHtcblxuICAgICAgICAgICAgICAgIGNvbnN0IGNvbm5lY3Rpb25kZXZpY2VzYXJyYXk6IElOZXR3b3JrW10gPSBbXTtcblxuICAgICAgICAgICAgICAgIGxldCBkZXZpY2VleGlzdHM6IGJvb2xlYW4gPSBmYWxzZVxuICAgICAgICAgICAgICAgIGxldCBkZXZpY2U6IElOZXR3b3JrO1xuICAgICAgICAgICAgICAgIC8vIGNoZWVjayBjb25maWd1cmF0aW9uXG4gICAgICAgICAgICAgICAgbmV0dygpLnRoZW4oKGEpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgXy5tYXAoYSwgKG5ldCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgXy5tYXAodGhhdC5saWNvbmZpZy5ldGhlcm5ldCwgKG5ldGludGVyZmFjZWNvbmZpZ3VyZWQpID0+IHtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuZXQudHlwZSA9PT0gJ3dpcmVkJyAmJiAoKCFkZXZpY2VuYW1lICYmIG5ldC5pbnRlcmZhY2UgPT09IG5ldGludGVyZmFjZWNvbmZpZ3VyZWQuaW50ZXJmYWNlKSB8fCBkZXZpY2VuYW1lID09PSBuZXQuaW50ZXJmYWNlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXZpY2VleGlzdHMgPSB0cnVlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRldmljZSA9IG5ldFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25uZWN0aW9uZGV2aWNlc2FycmF5LnB1c2gobmV0KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgICAgICAgICBpZiAoZGV2aWNlZXhpc3RzKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBjb25uZWN0ZWQ6IGJvb2xlYW4gPSBmYWxzZTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgYXN5bmMuZWFjaFNlcmllcyhjb25uZWN0aW9uZGV2aWNlc2FycmF5LCAoZGV2aWNlLCBjYikgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghY29ubmVjdGVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNoaWxkX3Byb2Nlc3MuZXhlYygnaWZjb25maWcgJyArIGRldmljZS5pbnRlcmZhY2UgKyAnIGRvd24gJiYgaWZjb25maWcgJyArIGRldmljZS5pbnRlcmZhY2UgKyAnIHVwICYmIGRoY2xpZW50ICcgKyBkZXZpY2UuaW50ZXJmYWNlLCAoZXJyLCBzdGRvdXQsIHN0ZGVycikgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNiKClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC50ZXN0aW50ZXJuZXQoKS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29ubmVjdGVkID0gdHJ1ZVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNiKClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2IoKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgfSwgKGVycikgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghY29ubmVjdGVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdCgnbm8gY29ubmVjdGlvbiBieSBhIGV0aGVybmV0IGRldmljZScpXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHRydWUpXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gbmVlZCBhc3luYyB0byBwcm9jZXNzIGV2ZXJ5b25lXG5cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdCgnbm8gZXRoZXJuZXQgZGV2aWNlJylcbiAgICAgICAgICAgICAgICAgICAgfVxuXG5cbiAgICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICAgICAgLy8gY2hlY2sgaWYgaXQgaXMganVzdCBjb25uZWN0ZWQgYnkgZXRoMFxuICAgICAgICAgICAgICAgIC8vIGlmIGlzIGNvbm5lY3RlZCBhbGwgb2suXG4gICAgICAgICAgICAgICAgLy8gZWxzZSB0aGF0LmV0aGVybmV0cmVjb25uZWN0KGRldmljZSlcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KCdpbnZhbGlkIGV0aGVybmV0IGNvbmYnKVxuXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG5cbiAgICB9XG5cbiAgICBldGhlcm5ldHJlY29ubmVjdChkZXZpY2U/OiBhbnkpIHtcbiAgICAgICAgY29uc3QgdGhhdCA9IHRoaXNcblxuICAgIH1cblxuICAgIG1vYmlsZWNvbm5lY3QoYm9vbDogYm9vbGVhbikge1xuICAgICAgICBjb25zdCB0aGF0ID0gdGhpcztcblxuICAgICAgICBjb25zdCBXdiA9IHRoYXQubW9iaWxlO1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8Ym9vbGVhbj4oZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgICAgV3YuY29uZmlndXJlKGJvb2wpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIFd2LmNvbm5lY3QodHJ1ZSkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoYXQubW9kZSA9ICd3didcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJtb2RlbSBzdGFydGVkXCIpO1xuXG4gICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIm1vZGVtIGVycm9yXCIpO1xuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcblxuXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KVxuXG5cblxuXG4gICAgICAgIH0pO1xuXG4gICAgfTtcbiAgICB3aWZpYXZhaWxhYmxlcygpOiBQcm9taXNlPElTY2FuW10+IHtcbiAgICAgICAgY29uc3QgdGhhdCA9IHRoaXM7XG5cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPElTY2FuW10+KGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgIGNvbnN0IGF2YWlsYWJsZW5ldHMgPSBbXVxuICAgICAgICAgICAgdGhhdC5uZXR3b3JrcygpLnRoZW4oKG5ldHMpID0+IHtcbiAgICAgICAgICAgICAgICBfLm1hcChuZXRzLCAobmV0KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChuZXQudHlwZSA9PT0gXCJ3aWZpXCIgJiYgbmV0LnNjYW4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIF8ubWFwKG5ldC5zY2FuLCAoc2Nhbm5lZG9uZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF2YWlsYWJsZW5ldHMucHVzaChzY2FubmVkb25lKVxuICAgICAgICAgICAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIHJlc29sdmUoYXZhaWxhYmxlbmV0cylcblxuICAgICAgICAgICAgfSkuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICAgICAgICAgIHJlamVjdChlcnIpXG4gICAgICAgICAgICB9KVxuXG5cbiAgICAgICAgfSlcblxuICAgIH1cblxuICAgIHdpZmljb25uZWN0YWJsZXMoKTogUHJvbWlzZTxJU2NhbltdPiB7XG4gICAgICAgIGNvbnN0IHRoYXQgPSB0aGlzO1xuXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTxJU2NhbltdPihmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICBjb25zdCBjb25uZWN0YWJsZXMgPSBbXVxuICAgICAgICAgICAgY29uc3QgV00gPSB0aGF0LndwYW1hbmFnZXIoKVxuXG4gICAgICAgICAgICB0aGF0LndpZmlhdmFpbGFibGVzKCkudGhlbigoc2NhbnMpID0+IHtcbiAgICAgICAgICAgICAgICBfLm1hcChzY2FucywgKHNjYW5uZWRvbmUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgXy5tYXAoV00ubGlzdHdwYSwgKHdwYSkgPT4ge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAod3BhLnNzaWQgPT09IHNjYW5uZWRvbmUuZXNzaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25uZWN0YWJsZXMucHVzaChzY2FubmVkb25lKVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICByZXNvbHZlKGNvbm5lY3RhYmxlcylcbiAgICAgICAgICAgIH0pLmNhdGNoKChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICByZWplY3QoZXJyKVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcblxuICAgIH1cblxuXG5cbiAgICBuZXR3b3JrcygpOiBQcm9taXNlPElOZXR3b3JrW10+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPElOZXR3b3JrW10+KGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcblxuICAgICAgICAgICAgbmV0dygpLnRoZW4oZnVuY3Rpb24gKGEpIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKGEpXG4gICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KGVycilcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgfVxuICAgIG5ldHdvcmsoZGV2aWNlbmFtZTogc3RyaW5nKTogUHJvbWlzZTxJTmV0d29yaz4ge1xuICAgICAgICBjb25zdCB0aGF0ID0gdGhpcztcbiAgICAgICAgbGV0IG5ldGV4aXN0czogYm9vbGVhbiA9IGZhbHNlXG4gICAgICAgIGxldCBuZXR3b3JraW50ZXJmYWNlOiBJTmV0d29yaztcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPElOZXR3b3JrPihmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG5cbiAgICAgICAgICAgIHRoYXQubmV0d29ya3MoKS50aGVuKGZ1bmN0aW9uIChhKSB7XG4gICAgICAgICAgICAgICAgXy5tYXAoYSwgKG5ldCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIW5ldGV4aXN0cyAmJiBuZXQuaW50ZXJmYWNlID09PSBkZXZpY2VuYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBuZXRleGlzdHMgPSB0cnVlXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXR3b3JraW50ZXJmYWNlID0gbmV0XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIGlmIChuZXRleGlzdHMpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShuZXR3b3JraW50ZXJmYWNlKVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdCgnbm8gbmV0d29yaycpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgIHJlamVjdChlcnIpXG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgIH1cblxuICAgIHRlc3RpbnRlcm5ldCgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcblxuICAgICAgICAgICAgdGVzdGludGVybmV0KCkudGhlbihmdW5jdGlvbiAoYSkge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoYSlcbiAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICByZWplY3QoZXJyKVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGhvc3RhcGRjb25mKGhjb25maWc6IElIQ29uZiwgcmVjb25mPzogdHJ1ZSkgeyAvLyByZWNvbmYgaXMgZXhwZXJpbWVudGFsXG4gICAgICAgIGNvbnN0IHRoYXQgPSB0aGlzXG4gICAgICAgIGlmICghaGNvbmZpZykge1xuICAgICAgICAgICAgdGhyb3cgRXJyb3IoJ25vIGNvbmZpZyBwcm92aWRlZCB0byBjb25maWd1cmUgaG9zdGFwZGNvbmYnKVxuICAgICAgICB9IGVsc2UgaWYgKCF0aGF0Lmhvc3RhcGQgfHwgcmVjb25mKSB7XG4gICAgICAgICAgICB0aGF0Lmhvc3RhcGQgPSBuZXcgaG9zdGFwZHN3aXRjaChoY29uZmlnLCB0cnVlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdob3N0YXBkIHdhcyBqdXN0IHJlY29uZmlndXJlZCcpXG4gICAgICAgIH1cblxuICAgIH1cblxuICAgIHdwYW1hbmFnZXIoKSB7XG4gICAgICAgIGNvbnN0IHBhdGggPSB0aGlzLmxpY29uZmlnLndwYXN1cHBsaWNhbnRfcGF0aDtcbiAgICAgICAgcmV0dXJuIG5ldyBXcGFtYW5hZ2VyKHRoaXMubGljb25maWcud3Bhc3VwcGxpY2FudF9wYXRoKTtcbiAgICB9XG5cblxuICAgIG1vYmlsZXByb3ZpZGVycygpIHtcblxuICAgICAgICByZXR1cm4gbmV3IFByb3ZpZGVycygpXG5cbiAgICB9XG5cbiAgICB3aWZpX3N3aXRjaChtb2RlOiBzdHJpbmcsIGRldj86IHN0cmluZykge1xuICAgICAgICBjb25zb2xlLmxvZyhtb2RlLCBkZXYpO1xuICAgICAgICBjb25zdCB0aGF0ID0gdGhpcztcbiAgICAgICAgY29uc3QgY29uZmlnID0gdGhhdC5saWNvbmZpZztcblxuICAgICAgICBpZiAoZGV2IHx8IHRoaXMubGljb25maWcud2lmaV9pbnRlcmZhY2UgIT09IFwiYXV0b1wiKSB7XG5cbiAgICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTxib29sZWFuPihmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG5cblxuICAgICAgICAgICAgICAgIGlmICghZGV2KSB7XG4gICAgICAgICAgICAgICAgICAgIGRldiA9IGNvbmZpZy53aWZpX2ludGVyZmFjZTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImRldiBtb2RlXCIpO1xuICAgICAgICAgICAgICAgIHRoYXQuaG9zdGFwZGNvbmYoe1xuICAgICAgICAgICAgICAgICAgICBpbnRlcmZhY2U6IGRldixcbiAgICAgICAgICAgICAgICAgICAgd3Bhc3VwcGxpY2FudF9wYXRoOiBjb25maWcud3Bhc3VwcGxpY2FudF9wYXRoLFxuICAgICAgICAgICAgICAgICAgICBob3N0YXBkOiBjb25maWcuaG9zdGFwZFxuICAgICAgICAgICAgICAgIH0pXG5cbiAgICAgICAgICAgICAgICBzd2l0Y2ggKG1vZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcImFwXCI6XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lmhvc3RhcGQuYXAoKS50aGVuKGZ1bmN0aW9uIChhbnN3ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lm1vZGUgPSAnYXAnXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcImhvc3RcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuaG9zdGFwZC5ob3N0KCkudGhlbihmdW5jdGlvbiAoYW5zd2VyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5tb2RlID0gJ2hvc3QnXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcImNsaWVudFwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5ob3N0YXBkLmNsaWVudCgpLnRoZW4oZnVuY3Rpb24gKGFuc3dlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQubW9kZSA9ICdjbGllbnQnXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJhdXRvIG1vZGVcIik7XG4gICAgICAgICAgICBjb25zdCBjb25maWcgPSB0aGlzLmxpY29uZmlnO1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgICAgICBuZXR3KCkudGhlbihmdW5jdGlvbiAobmV0d29ya3MpIHtcblxuICAgICAgICAgICAgICAgICAgICBfLm1hcChuZXR3b3JrcywgZnVuY3Rpb24gKGRldmljZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRldmljZS50eXBlID09PSBcIndpZmlcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRldiA9IGRldmljZS5pbnRlcmZhY2U7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZGV2KSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuaG9zdGFwZGNvbmYoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGludGVyZmFjZTogZGV2LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhvc3RhcGQ6IGNvbmZpZy5ob3N0YXBkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdwYXN1cHBsaWNhbnRfcGF0aDogY29uZmlnLndwYXN1cHBsaWNhbnRfcGF0aFxuICAgICAgICAgICAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2codGhhdC5ob3N0YXBkKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgc3dpdGNoIChtb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBcImFwXCI6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuaG9zdGFwZC5hcCgpLnRoZW4oZnVuY3Rpb24gKGFuc3dlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5tb2RlID0gJ2FwJ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgXCJob3N0XCI6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuaG9zdGFwZC5ob3N0KCkudGhlbihmdW5jdGlvbiAoYW5zd2VyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lm1vZGUgPSAnaG9zdCdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFwiY2xpZW50XCI6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuaG9zdGFwZC5jbGllbnQoKS50aGVuKGZ1bmN0aW9uIChhbnN3ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQubW9kZSA9ICdjbGllbnQnXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoeyBlcnJvcjogXCJubyBkZXZcIiB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG5cblxuXG5cblxuICAgIGNvbm5lY3Rpb24oKSB7XG4gICAgICAgIGNvbnN0IHRoYXQgPSB0aGlzO1xuICAgICAgICBjb25zdCByZWNvdmVyeSA9IHRoYXQubGljb25maWcucmVjb3ZlcnlcblxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgICAgdmVyYih0aGF0LmxpY29uZmlnLCBcImRlYnVnXCIsIFwiVHJ5bmcgdG8gY29ubmVjdFwiKTtcblxuICAgICAgICAgICAgaWYgKHRoYXQubW9kZSA9PT0gXCJ3dlwiKSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KFwiYXV0byBtb2RlXCIpXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJ3diBydW5uaW5nLCBub3RoaW5nIHRvIGRvXCIpXG4gICAgICAgICAgICB9IGVsc2Uge1xuXG5cbiAgICAgICAgICAgICAgICB0aGF0LnRlc3RpbnRlcm5ldCgpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHRydWUpXG4gICAgICAgICAgICAgICAgfSkuY2F0Y2goKGVycikgPT4ge1xuXG5cbiAgICAgICAgICAgICAgICAgICAgdGhhdC5ldGhlcm5ldGNvbm5lY3QoKS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdjb25uZWN0ZWQgYnkgZXRoZXJuZXQnKVxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKVxuXG4gICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKCgpID0+IHtcblxuICAgICAgICAgICAgICAgICAgICAgICAgZ2V0d2lmaWludGVyZmEodGhhdC5saWNvbmZpZy53aWZpX2ludGVyZmFjZSkudGhlbihmdW5jdGlvbiAoaW50ZXJmKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB3aWZpX2V4aXN0OiBzdHJpbmcgPSBpbnRlcmYuaW50ZXJmYWNlO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY29uZmhhcGRzID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnRlcmZhY2U6IHdpZmlfZXhpc3QsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdwYXN1cHBsaWNhbnRfcGF0aDogdGhhdC5saWNvbmZpZy53cGFzdXBwbGljYW50X3BhdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhvc3RhcGQ6IHRoYXQubGljb25maWcuaG9zdGFwZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAod2lmaV9leGlzdCkge1xuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmVyYih3aWZpX2V4aXN0LCBcImluZm9cIiwgXCJXbGFuIGludGVyZmFjZSBmb3VuZGVkXCIpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuaG9zdGFwZGNvbmYoY29uZmhhcGRzKVxuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5ob3N0YXBkLmNsaWVudCh0cnVlKS50aGVuKGZ1bmN0aW9uIChhbnN3ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQubW9kZSA9ICdjbGllbnQnXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHsgY29uZWN0aW9uOiB0cnVlLCByZWNvdmVyeTogZmFsc2UgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcblxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhhdC5saWNvbmZpZy5tb2JpbGUpIHtcblxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5tb2JpbGUuY29uZmlndXJlKCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQubW9kZSA9IFwid3ZcIjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJtb2RlbSBzdGFydGVkXCIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQubW9iaWxlLmNvbm5lY3QodHJ1ZSkudGhlbihmdW5jdGlvbiAoYSkge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBod3Jlc3RhcnQoXCJ1bnBsdWdcIilcblxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwibW9kZW0gZXJyb3JcIilcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaHdyZXN0YXJ0KFwidW5wbHVnXCIpXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJtb2RlbSBlcnJvclwiKVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGh3cmVzdGFydChcInVucGx1Z1wiKVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cblxuXG5cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZWNvdmVyeSAmJiB3aWZpX2V4aXN0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5yZWNvdmVyeSh0cnVlKS50aGVuKGZ1bmN0aW9uIChhbnN3ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmVyYihhbnN3ZXIsIFwiaW5mb1wiLCBcIkxJTkVUV09SS0lORyByZWNvdmVyeSBtb2RlIHN0YXJ0XCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXRoYXQubGljb25maWcubW9iaWxlKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHNjYW5uZXQgPSBzZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2NoZWNrIGZvciBhdmFpbGFibGVzIG5ldHdvcmtzJylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0LndpZmljb25uZWN0YWJsZXMoKS50aGVuKChuZXRzKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuZXRzLmxlbmd0aCA+IDApIHtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5ob3N0YXBkLmNsaWVudCh0cnVlKS50aGVuKGZ1bmN0aW9uIChhbnN3ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lm1vZGUgPSAnY2xpZW50J1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwoc2Nhbm5ldClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnY29ubmVjdGVkJylcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoeyBjb25lY3Rpb246IHRydWUsIHJlY292ZXJ5OiBmYWxzZSB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnbm8gd29ya2luZyBuZXR3b3JrcyBmb3Igbm93JylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnJlY292ZXJ5KHRydWUpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ25vIGtud293biB3bGFuIGF2YWlsYWJsZSwgd2FpdGluZyBmb3IgbmV0d29ya3MnKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSwgOTAwMDApXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2ZXJiKGVyciwgXCJlcnJvclwiLCBcIkxJTkVUV09SS0lORyByZWNvdmVyeSBtb2RlIGVycm9yXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoJ3JlY292ZXJ5IG1vZGUgZXJyb3InKVxuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ25vdCBjb25uZWN0ZWQnKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdCgnbm90IGNvbm5lY3RlZCcpXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG5cblxuICAgICAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmVyYihcIm5vIHdpZmlcIiwgXCJ3YXJuXCIsIFwibmV0d29ya2VyXCIpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoYXQubGljb25maWcubW9iaWxlKSB7XG5cblxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQubW9iaWxlLmNvbmZpZ3VyZSgpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5tb2RlID0gXCJ3dlwiO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5tb2JpbGUuY29ubmVjdCh0cnVlKS50aGVuKGZ1bmN0aW9uIChhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBod3Jlc3RhcnQoXCJ1bnBsdWdcIilcblxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGUpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJtb2RlbSBlcnJvclwiKVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaHdyZXN0YXJ0KFwidW5wbHVnXCIpXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwibW9kZW0gZXJyb3JcIilcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaHdyZXN0YXJ0KFwidW5wbHVnXCIpXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwibm8gd2lmaSEhPz8/XCIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGh3cmVzdGFydChcInVucGx1Z1wiKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cblxuXG4gICAgICAgICAgICAgICAgICAgIH0pXG5cblxuXG5cblxuICAgICAgICAgICAgICAgIH0pXG5cblxuXG5cblxuXG5cbiAgICAgICAgICAgIH1cblxuXG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICByZWNvdmVyeShmb3JjZT86IHRydWUpIHtcbiAgICAgICAgY29uc3QgY29uZmlnID0gdGhpcy5saWNvbmZpZztcbiAgICAgICAgY29uc3QgdGhhdCA9IHRoaXM7XG5cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgIHJlY292ZXJ5Y2hlY2soY29uZmlnKS50aGVuKGZ1bmN0aW9uIChhKSB7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBpbnRlcmYgPSBhLmRldmljZVxuICAgICAgICAgICAgICAgIGlmIChmb3JjZSB8fCAhYS5rbm93bl9uZXR3b3Jrcykge1xuXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdyZWNvdmVyeW5nICcgKyBhLmRldmljZS5pbnRlcmZhY2UpXG5cbiAgICAgICAgICAgICAgICAgICAgdGhhdC5ob3N0YXBkY29uZih7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbnRlcmZhY2U6IGEuZGV2aWNlLmludGVyZmFjZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHdwYXN1cHBsaWNhbnRfcGF0aDogdGhhdC5saWNvbmZpZy53cGFzdXBwbGljYW50X3BhdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICBob3N0YXBkOiB0aGF0LmxpY29uZmlnLmhvc3RhcGRcbiAgICAgICAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgICAgICAgICByZWNvdmVyeV9tb2RlKHRoYXQuaG9zdGFwZCkudGhlbihmdW5jdGlvbiAoYW5zd2VyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lm1vZGUgPSBhbnN3ZXI7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGFuc3dlcik7XG4gICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdCgndHJ5IGNsaWVudCBvciBmb3JjZScpXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxufTtcblxuXG5cblxuXG5cbiJdfQ==
