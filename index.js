"use strict";
var Promise = require("bluebird");
var _ = require("lodash");
var hwrestart = require("hwrestart");
var Providers = require("mobile-providers");
var wpasupplicant_manager_1 = require("wpasupplicant-manager");
var hostapd_switch_1 = require("hostapd_switch");
var merge = require("json-add");
var Wvdial = require("wvdialjs");
var netw = require("netw");
var verb = require("verbo");
function getinterfa(setted) {
    return new Promise(function (resolve, reject) {
        var wifi_exist = false;
        var devi;
        netw().then(function (networks) {
            _.map(networks, function (device) {
                if (device.type == "wifi" && (!setted || setted == "auto" || setted == device.interface)) {
                    wifi_exist = device.interface;
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
function recovery_mode(config, dev, mode) {
    var m;
    if (mode) {
        m = mode;
    }
    else {
        m = "host";
    }
    var confhapds = {
        interface: dev,
        wpasupplicant_path: config.wpasupplicant_path,
        hostapd: config.hostapd
    };
    var apswitch = new hostapd_switch_1.default(confhapds);
    return new Promise(function (resolve, reject) {
        apswitch[m]().then(function (answer) {
            verb(answer, "warn", "linetwork recovery mode");
            resolve(true);
        }).catch(function (err) {
            verb(err, "error", "linetwork recovery mode failed");
            reject(err);
        });
    });
}
;
;
;
;
var config = {
    hostapd: {
        driver: "nl80211",
        ssid: "testttap",
        wpa_passphrase: "testpass"
    },
    wifi_interface: "auto",
    wpasupplicant_path: "/etc/wpa_supplicant/wpa_supplicant.conf"
};
var LiNetwork = (function () {
    function LiNetwork(data) {
        merge(config, data);
        this.liconfig = config;
        if (this.liconfig.mobile) {
            if (!this.liconfig.mobile.configFilePath)
                this.liconfig.mobile.configFilePath = "/etc/wvdial.conf";
            var Wv = new Wvdial(this.liconfig.mobile);
            this.mobile = Wv;
        }
    }
    LiNetwork.prototype.mobileconnect = function (bool) {
        var Wv = this.mobile;
        return new Promise(function (resolve, reject) {
            Wv.configure(bool).then(function () {
                Wv.connect(true).then(function () {
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
        return netw();
    };
    LiNetwork.prototype.wpamanager = function () {
        var path = this.liconfig.wpasupplicant_path;
        return new wpasupplicant_manager_1.default(path);
    };
    LiNetwork.prototype.mobileproviders = function () {
        return new Providers();
    };
    LiNetwork.prototype.wifi_switch = function (mode, dev) {
        console.log(mode, dev);
        if (dev || this.liconfig.wifi_interface != "auto") {
            if (dev) {
                var apswitch = new hostapd_switch_1.default({
                    interface: dev,
                    wpasupplicant_path: config.wpasupplicant_path,
                    hostapd: this.hostapd
                });
            }
            else {
                var apswitch = new hostapd_switch_1.default({
                    interface: this.liconfig.wifi_interface,
                    wpasupplicant_path: config.wpasupplicant_path,
                    hostapd: this.hostapd
                });
            }
            console.log("dev mode");
            return new Promise(function (resolve, reject) {
                switch (mode) {
                    case "ap":
                        apswitch.ap().then(function (answer) {
                            resolve(true);
                        }).catch(function (err) {
                            reject(err);
                        });
                        break;
                    case "host":
                        apswitch.host().then(function (answer) {
                            resolve(true);
                        }).catch(function (err) {
                            reject(err);
                        });
                        break;
                    case "client":
                        apswitch.client().then(function (answer) {
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
            var config = this.liconfig;
            return new Promise(function (resolve, reject) {
                netw().then(function (networks) {
                    _.map(networks, function (device) {
                        if (device.type == "wifi") {
                            dev = device.interface;
                        }
                    });
                    if (dev) {
                        var apswitch = new hostapd_switch_1.default({
                            interface: dev,
                            hostapd: config.hostapd,
                            wpasupplicant_path: config.wpasupplicant_path
                        });
                        console.log(apswitch);
                        switch (mode) {
                            case "ap":
                                apswitch.ap().then(function (answer) {
                                    resolve(true);
                                }).catch(function (err) {
                                    reject(err);
                                });
                                break;
                            case "host":
                                apswitch.host().then(function (answer) {
                                    resolve(true);
                                }).catch(function (err) {
                                    reject(err);
                                });
                                break;
                            case "client":
                                apswitch.client().then(function (answer) {
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
    LiNetwork.prototype.connection = function (recovery) {
        var mode = this.mode;
        var config = this.liconfig;
        var Wv = this.mobile;
        return new Promise(function (resolve, reject) {
            verb(config, "debug", "Tryng to connect");
            if (mode === "mobile-auto") {
                reject("auto mode");
                console.log("wv running, nothing to do");
            }
            else {
                getinterfa(config.wifi_interface).then(function (interf) {
                    var wifi_exist = interf.interface;
                    var confhapds = {
                        interface: wifi_exist,
                        wpasupplicant_path: config.wpasupplicant_path,
                        hostapd: config.hostapd
                    };
                    if (config.mobile) {
                        if (recovery && wifi_exist) {
                            console.log("recovering");
                            recovery_mode(config, wifi_exist);
                        }
                        else if (wifi_exist) {
                            var apswitch = new hostapd_switch_1.default(confhapds, true);
                            apswitch.client(true).then(function (answer) {
                                console.log("wificlient connected ");
                            }).catch(function (err) {
                                console.log("wificlient no connection" + err);
                            });
                            Wv.configure().then(function () {
                                mode = "mobile-auto";
                                console.log("modem started");
                                Wv.connect(true).then(function (a) {
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
                    }
                    else if (wifi_exist) {
                        verb(wifi_exist, "info", "Wlan interface founded");
                        var apswitch = new hostapd_switch_1.default(confhapds, true);
                        apswitch.client(true).then(function (answer) {
                            resolve({ conection: true, recovery: false });
                        }).catch(function (err) {
                            if (recovery) {
                                recovery_mode(config, wifi_exist).then(function (answer) {
                                    verb(answer, "info", "J5 recovery mode start");
                                }).catch(function (err) {
                                    verb(err, "error", "J5 recovery mode start");
                                });
                            }
                        });
                    }
                }).catch(function (err) {
                    verb("no wifi", "warn", "networker");
                    if (config.mobile) {
                        Wv.configure().then(function () {
                            mode = "mobile-auto";
                            Wv.connect(true).then(function (a) {
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
            }
        });
    };
    ;
    LiNetwork.prototype.recovery = function (mode) {
        var config = this.liconfig;
        return new Promise(function (resolve, reject) {
            getinterfa(config.wifi_interface).then(function (interf) {
                var wifi_exist = interf.interface;
                recovery_mode(config, wifi_exist, mode).then(function (answer) {
                    resolve(answer);
                }).catch(function (err) {
                    reject(err);
                });
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QUFELENBL1VBLEFBK1VDLElBQUE7QUEvVUQ7MkJBK1VDLENBQUE7QUFBQSxDQUFDIiwiZmlsZSI6ImluZGV4LmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgUHJvbWlzZSBmcm9tIFwiYmx1ZWJpcmRcIjtcbmltcG9ydCAqIGFzIGZzIGZyb20gXCJmc1wiO1xuaW1wb3J0ICogYXMgXyBmcm9tIFwibG9kYXNoXCI7XG5sZXQgaHdyZXN0YXJ0ID0gcmVxdWlyZShcImh3cmVzdGFydFwiKTtcbmltcG9ydCBQcm92aWRlcnMgPSByZXF1aXJlKFwibW9iaWxlLXByb3ZpZGVyc1wiKTtcbmltcG9ydCBXcGFtYW5hZ2VyIGZyb20gXCJ3cGFzdXBwbGljYW50LW1hbmFnZXJcIjtcbmltcG9ydCBob3N0YXBkc3dpdGNoIGZyb20gXCJob3N0YXBkX3N3aXRjaFwiO1xuaW1wb3J0IHRlc3RpbnRlcm5ldCA9IHJlcXVpcmUoXCJwcm9taXNlLXRlc3QtY29ubmVjdGlvblwiKTtcbmltcG9ydCBtZXJnZSA9IHJlcXVpcmUoXCJqc29uLWFkZFwiKTtcbmltcG9ydCBXdmRpYWwgPSByZXF1aXJlKFwid3ZkaWFsanNcIik7XG5cblxuXG5cbmxldCBuZXR3OiBuZXR3ID0gcmVxdWlyZShcIm5ldHdcIik7XG5sZXQgdmVyYiA9IHJlcXVpcmUoXCJ2ZXJib1wiKTtcblxuXG5pbnRlcmZhY2UgbmV0dyB7XG4gICAgKCk6IFByb21pc2U8TmV0d29ya1tdPlxufVxuXG5pbnRlcmZhY2UgU2NhbiB7XG4gICAgZXNzaWQ6IHN0cmluZztcbiAgICBtYWM6IHN0cmluZztcbiAgICBzaWduYWw6IHN0cmluZztcbn1cblxuaW50ZXJmYWNlIE5ldHdvcmsge1xuICAgIHR5cGU6IHN0cmluZztcbiAgICBtYWM6IHN0cmluZztcbiAgICBpbnRlcmZhY2U6IHN0cmluZztcbiAgICBlc3NpZD86IHN0cmluZztcbiAgICBzY2FuPzogU2NhbltdO1xuICAgIGlwPzogc3RyaW5nO1xuICAgIGdhdGV3YXk/OiBzdHJpbmc7XG59XG5cblxuXG5cbmludGVyZmFjZSBJUHJvdmlkZXIge1xuXG4gICAgbGFiZWw/OiBzdHJpbmc7XG4gICAgYXBuOiBzdHJpbmc7XG4gICAgcGhvbmU/OiBzdHJpbmdcbiAgICB1c2VybmFtZT86IHN0cmluZztcbiAgICBwYXNzd29yZD86IHN0cmluZztcblxufVxuXG5pbnRlcmZhY2UgSUdsb2JhbFByb3ZpZGVycyB7XG5cbiAgICBjb3VudHJ5OiBzdHJpbmc7XG4gICAgcHJvdmlkZXJzOiBJUHJvdmlkZXJbXTtcbn1cblxuXG5mdW5jdGlvbiBnZXRpbnRlcmZhKHNldHRlZD86IHN0cmluZykge1xuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlPElEZXZpY2U+KGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgbGV0IHdpZmlfZXhpc3Q6IGFueSA9IGZhbHNlO1xuICAgICAgICBsZXQgZGV2aTogSURldmljZTtcbiAgICAgICAgbmV0dygpLnRoZW4oZnVuY3Rpb24gKG5ldHdvcmtzKSB7XG5cbiAgICAgICAgICAgIF8ubWFwKG5ldHdvcmtzLCBmdW5jdGlvbiAoZGV2aWNlOiBJRGV2aWNlKSB7XG5cbiAgICAgICAgICAgICAgICBpZiAoZGV2aWNlLnR5cGUgPT0gXCJ3aWZpXCIgJiYgKCFzZXR0ZWQgfHwgc2V0dGVkID09IFwiYXV0b1wiIHx8IHNldHRlZCA9PSBkZXZpY2UuaW50ZXJmYWNlKSkge1xuICAgICAgICAgICAgICAgICAgICB3aWZpX2V4aXN0ID0gZGV2aWNlLmludGVyZmFjZTtcbiAgICAgICAgICAgICAgICAgICAgZGV2aSA9IGRldmljZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgaWYgKHdpZmlfZXhpc3QpIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKGRldmkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZWplY3QoeyBlcnJvcjogXCJkZXZpY2Ugbm90IGZvdW5kZWRcIiB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgfSk7XG5cbiAgICB9KTtcblxufVxuXG5cbmZ1bmN0aW9uIHJlY292ZXJ5X21vZGUoY29uZmlnOiBJTGlOZXR3b3JrQ29uZiwgZGV2OiBzdHJpbmcsIG1vZGU/OiBzdHJpbmcpIHtcbiAgICBsZXQgbTogc3RyaW5nO1xuXG4gICAgaWYgKG1vZGUpIHtcbiAgICAgICAgbSA9IG1vZGU7XG5cbiAgICB9IGVsc2Uge1xuICAgICAgICBtID0gXCJob3N0XCI7XG4gICAgfVxuXG4gICAgbGV0IGNvbmZoYXBkcyA9IHtcbiAgICAgICAgaW50ZXJmYWNlOiBkZXYsXG4gICAgICAgIHdwYXN1cHBsaWNhbnRfcGF0aDogY29uZmlnLndwYXN1cHBsaWNhbnRfcGF0aCxcbiAgICAgICAgaG9zdGFwZDogY29uZmlnLmhvc3RhcGRcbiAgICB9O1xuXG4gICAgbGV0IGFwc3dpdGNoID0gbmV3IGhvc3RhcGRzd2l0Y2goY29uZmhhcGRzKTtcblxuICAgIHJldHVybiBuZXcgUHJvbWlzZTxib29sZWFuPihmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIGFwc3dpdGNoW21dKCkudGhlbihmdW5jdGlvbiAoYW5zd2VyKSB7XG4gICAgICAgICAgICB2ZXJiKGFuc3dlciwgXCJ3YXJuXCIsIFwibGluZXR3b3JrIHJlY292ZXJ5IG1vZGVcIik7XG4gICAgICAgICAgICByZXNvbHZlKHRydWUpO1xuICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICB2ZXJiKGVyciwgXCJlcnJvclwiLCBcImxpbmV0d29yayByZWNvdmVyeSBtb2RlIGZhaWxlZFwiKTtcbiAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICB9KTtcbiAgICB9KTtcbn1cblxuXG5pbnRlcmZhY2UgSURldmljZSB7XG4gICAgdHlwZTogc3RyaW5nO1xuICAgIGludGVyZmFjZTogc3RyaW5nO1xufVxuXG5pbnRlcmZhY2UgQ2xhc3NPcHQge1xuICAgIHdpZmlfaW50ZXJmYWNlPzogc3RyaW5nO1xuICAgIG1vYmlsZT86IElNb2JpbGU7XG4gICAgaG9zdGFwZD86IElIb3N0YXBkY2Y7XG4gICAgd3Bhc3VwcGxpY2FudF9wYXRoPzogc3RyaW5nO1xufVxuaW50ZXJmYWNlIElNb2JpbGUge1xuICAgIHByb3ZpZGVyOiBJUHJvdmlkZXI7XG4gICAgZGV2aWNlPzogYW55O1xuICAgIGNvbmZpZ0ZpbGVQYXRoPzogc3RyaW5nO1xuXG59XG5pbnRlcmZhY2UgSUxpTmV0d29ya0NvbmYge1xuICAgIHdpZmlfaW50ZXJmYWNlOiBzdHJpbmc7XG4gICAgbW9iaWxlPzogSU1vYmlsZTtcbiAgICBob3N0YXBkOiBJSG9zdGFwZDtcbiAgICB3cGFzdXBwbGljYW50X3BhdGg/OiBzdHJpbmc7XG59XG5pbnRlcmZhY2UgSUhvc3RhcGQge1xuICAgIGRyaXZlcjogc3RyaW5nO1xuICAgIHNzaWQ6IHN0cmluZztcbiAgICB3cGFfcGFzc3BocmFzZTogYW55O1xufTtcbmludGVyZmFjZSBJSG9zdGFwZGNmIHtcbiAgICBkcml2ZXI/OiBzdHJpbmc7XG4gICAgc3NpZDogc3RyaW5nO1xuICAgIHdwYV9wYXNzcGhyYXNlOiBhbnk7XG59O1xuaW50ZXJmYWNlIElEbnNtYXNxIHtcbiAgICBpbnRlcmZhY2U6IHN0cmluZztcbn07XG5cbmludGVyZmFjZSBJSENvbmYge1xuICAgIGludGVyZmFjZTogc3RyaW5nO1xuICAgIHdwYXN1cHBsaWNhbnRfcGF0aDogc3RyaW5nO1xuICAgIGhvc3RhcGQ6IElIb3N0YXBkO1xuICAgIGRuc21hc3E6IElEbnNtYXNxO1xuICAgIHJlZGlyZWN0OiBib29sZWFuO1xufTtcblxuaW50ZXJmYWNlIElDb25uZWN0aW9uIHtcblxuICAgIGxpbmtUeXBlOiBzdHJpbmc7XG4gICAgaW50ZXJmYWNlOiBzdHJpbmc7XG4gICAgaXA/OiBzdHJpbmc7XG4gICAgZ2F0ZXdheT86IHN0cmluZztcblxufVxuXG5pbnRlcmZhY2UgSUluaXQge1xuICAgIGNvbmVjdGlvbjogYm9vbGVhbjtcbiAgICByZWNvdmVyeTogYm9vbGVhbjtcbiAgICBkZXRhaWxzPzogSUNvbm5lY3Rpb247XG59XG5cbmxldCBjb25maWc6IElMaU5ldHdvcmtDb25mID0ge1xuICAgIGhvc3RhcGQ6IHtcbiAgICAgICAgZHJpdmVyOiBcIm5sODAyMTFcIixcbiAgICAgICAgc3NpZDogXCJ0ZXN0dHRhcFwiLFxuICAgICAgICB3cGFfcGFzc3BocmFzZTogXCJ0ZXN0cGFzc1wiXG4gICAgfSxcbiAgICB3aWZpX2ludGVyZmFjZTogXCJhdXRvXCIsXG4gICAgd3Bhc3VwcGxpY2FudF9wYXRoOiBcIi9ldGMvd3BhX3N1cHBsaWNhbnQvd3BhX3N1cHBsaWNhbnQuY29uZlwiXG59O1xuXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIExpTmV0d29yayB7XG4gICAgbGljb25maWc6IElMaU5ldHdvcmtDb25mO1xuICAgIGhvc3RhcGQ6IElIQ29uZjtcbiAgICBtb2JpbGU7XG4gICAgbW9kZTogc3RyaW5nO1xuXG5cbiAgICBjb25zdHJ1Y3RvcihkYXRhKSB7XG5cbiAgICAgICAgbWVyZ2UoY29uZmlnLCBkYXRhKTtcblxuXG4gICAgICAgIHRoaXMubGljb25maWcgPSBjb25maWc7XG5cblxuICAgICAgICBpZiAodGhpcy5saWNvbmZpZy5tb2JpbGUpIHtcbiAgICAgICAgICAgIGlmICghdGhpcy5saWNvbmZpZy5tb2JpbGUuY29uZmlnRmlsZVBhdGgpIHRoaXMubGljb25maWcubW9iaWxlLmNvbmZpZ0ZpbGVQYXRoID0gXCIvZXRjL3d2ZGlhbC5jb25mXCI7XG4gICAgICAgICAgICBsZXQgV3YgPSBuZXcgV3ZkaWFsKHRoaXMubGljb25maWcubW9iaWxlKVxuICAgICAgICAgICAgdGhpcy5tb2JpbGUgPSBXdlxuICAgICAgICB9XG5cblxuXG5cblxuXG4gICAgfVxuICAgIG1vYmlsZWNvbm5lY3QoYm9vbCkge1xuICAgICAgICBsZXQgV3YgPSB0aGlzLm1vYmlsZTtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPGJvb2xlYW4+KGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgIFd2LmNvbmZpZ3VyZShib29sKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBXdi5jb25uZWN0KHRydWUpLnRoZW4oZnVuY3Rpb24gKCkge1xuXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwibW9kZW0gc3RhcnRlZFwiKTtcblxuICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJtb2RlbSBlcnJvclwiKTtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG5cblxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSlcblxuXG5cblxuICAgICAgICB9KTtcblxuICAgIH07XG4gICAgbmV0d29ya3MoKSB7XG5cbiAgICAgICAgcmV0dXJuIG5ldHcoKTtcblxuICAgIH1cblxuICAgIHdwYW1hbmFnZXIoKSB7XG4gICAgICAgIGxldCBwYXRoID0gdGhpcy5saWNvbmZpZy53cGFzdXBwbGljYW50X3BhdGg7XG4gICAgICAgIHJldHVybiBuZXcgV3BhbWFuYWdlcihwYXRoKTtcblxuICAgIH1cblxuXG4gICAgbW9iaWxlcHJvdmlkZXJzKCkge1xuXG4gICAgICAgIHJldHVybiBuZXcgUHJvdmlkZXJzKClcblxuICAgIH1cblxuICAgIHdpZmlfc3dpdGNoKG1vZGU6IHN0cmluZywgZGV2Pzogc3RyaW5nKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKG1vZGUsIGRldik7XG4gICAgICAgIGlmIChkZXYgfHwgdGhpcy5saWNvbmZpZy53aWZpX2ludGVyZmFjZSAhPSBcImF1dG9cIikge1xuICAgICAgICAgICAgaWYgKGRldikge1xuICAgICAgICAgICAgICAgIHZhciBhcHN3aXRjaCA9IG5ldyBob3N0YXBkc3dpdGNoKFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbnRlcmZhY2U6IGRldixcbiAgICAgICAgICAgICAgICAgICAgICAgIHdwYXN1cHBsaWNhbnRfcGF0aDogY29uZmlnLndwYXN1cHBsaWNhbnRfcGF0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGhvc3RhcGQ6IHRoaXMuaG9zdGFwZFxuXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YXIgYXBzd2l0Y2ggPSBuZXcgaG9zdGFwZHN3aXRjaChcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgaW50ZXJmYWNlOiB0aGlzLmxpY29uZmlnLndpZmlfaW50ZXJmYWNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgd3Bhc3VwcGxpY2FudF9wYXRoOiBjb25maWcud3Bhc3VwcGxpY2FudF9wYXRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgaG9zdGFwZDogdGhpcy5ob3N0YXBkXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJkZXYgbW9kZVwiKTtcbiAgICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTxib29sZWFuPihmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICAgICAgc3dpdGNoIChtb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJhcFwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgYXBzd2l0Y2guYXAoKS50aGVuKGZ1bmN0aW9uIChhbnN3ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgICAgICBjYXNlIFwiaG9zdFwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgYXBzd2l0Y2guaG9zdCgpLnRoZW4oZnVuY3Rpb24gKGFuc3dlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJjbGllbnRcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgIGFwc3dpdGNoLmNsaWVudCgpLnRoZW4oZnVuY3Rpb24gKGFuc3dlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiYXV0byBtb2RlXCIpO1xuICAgICAgICAgICAgdmFyIGNvbmZpZyA9IHRoaXMubGljb25maWc7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgICAgICAgIG5ldHcoKS50aGVuKGZ1bmN0aW9uIChuZXR3b3Jrcykge1xuXG4gICAgICAgICAgICAgICAgICAgIF8ubWFwKG5ldHdvcmtzLCBmdW5jdGlvbiAoZGV2aWNlOiBJRGV2aWNlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGV2aWNlLnR5cGUgPT0gXCJ3aWZpXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXYgPSBkZXZpY2UuaW50ZXJmYWNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRldikge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgYXBzd2l0Y2ggPSBuZXcgaG9zdGFwZHN3aXRjaChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGludGVyZmFjZTogZGV2LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBob3N0YXBkOiBjb25maWcuaG9zdGFwZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd3Bhc3VwcGxpY2FudF9wYXRoOiBjb25maWcud3Bhc3VwcGxpY2FudF9wYXRoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYXBzd2l0Y2gpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKG1vZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFwiYXBcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXBzd2l0Y2guYXAoKS50aGVuKGZ1bmN0aW9uIChhbnN3ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFwiaG9zdFwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcHN3aXRjaC5ob3N0KCkudGhlbihmdW5jdGlvbiAoYW5zd2VyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBcImNsaWVudFwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcHN3aXRjaC5jbGllbnQoKS50aGVuKGZ1bmN0aW9uIChhbnN3ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdCh7IGVycm9yOiBcIm5vIGRldlwiIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfTtcblxuXG4gICAgY29ubmVjdGlvbihyZWNvdmVyeT86IGJvb2xlYW4pIHtcbiAgICAgICAgbGV0IG1vZGUgPSB0aGlzLm1vZGU7XG4gICAgICAgIGxldCBjb25maWcgPSB0aGlzLmxpY29uZmlnO1xuICAgICAgICBsZXQgV3YgPSB0aGlzLm1vYmlsZTtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPElJbml0PihmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICB2ZXJiKGNvbmZpZywgXCJkZWJ1Z1wiLCBcIlRyeW5nIHRvIGNvbm5lY3RcIik7XG5cbiAgICAgICAgICAgIGlmIChtb2RlID09PSBcIm1vYmlsZS1hdXRvXCIpIHtcbiAgICAgICAgICAgICAgICByZWplY3QoXCJhdXRvIG1vZGVcIilcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcInd2IHJ1bm5pbmcsIG5vdGhpbmcgdG8gZG9cIilcbiAgICAgICAgICAgIH0gZWxzZSB7XG5cblxuXG5cbiAgICAgICAgICAgICAgICBnZXRpbnRlcmZhKGNvbmZpZy53aWZpX2ludGVyZmFjZSkudGhlbihmdW5jdGlvbiAoaW50ZXJmOiBJRGV2aWNlKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgbGV0IHdpZmlfZXhpc3Q6IHN0cmluZyA9IGludGVyZi5pbnRlcmZhY2U7XG5cbiAgICAgICAgICAgICAgICAgICAgbGV0IGNvbmZoYXBkcyA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGludGVyZmFjZTogd2lmaV9leGlzdCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHdwYXN1cHBsaWNhbnRfcGF0aDogY29uZmlnLndwYXN1cHBsaWNhbnRfcGF0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGhvc3RhcGQ6IGNvbmZpZy5ob3N0YXBkXG4gICAgICAgICAgICAgICAgICAgIH07XG5cblxuXG4gICAgICAgICAgICAgICAgICAgIGlmIChjb25maWcubW9iaWxlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVjb3ZlcnkgJiYgd2lmaV9leGlzdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwicmVjb3ZlcmluZ1wiKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlY292ZXJ5X21vZGUoY29uZmlnLCB3aWZpX2V4aXN0KVxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICh3aWZpX2V4aXN0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGFwc3dpdGNoID0gbmV3IGhvc3RhcGRzd2l0Y2goY29uZmhhcGRzLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcHN3aXRjaC5jbGllbnQodHJ1ZSkudGhlbihmdW5jdGlvbiAoYW5zd2VyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwid2lmaWNsaWVudCBjb25uZWN0ZWQgXCIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIndpZmljbGllbnQgbm8gY29ubmVjdGlvblwiICsgZXJyKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBXdi5jb25maWd1cmUoKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbW9kZSA9IFwibW9iaWxlLWF1dG9cIjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJtb2RlbSBzdGFydGVkXCIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFd2LmNvbm5lY3QodHJ1ZSkudGhlbihmdW5jdGlvbiAoYSkge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBod3Jlc3RhcnQoXCJ1bnBsdWdcIilcblxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwibW9kZW0gZXJyb3JcIilcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaHdyZXN0YXJ0KFwidW5wbHVnXCIpXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJtb2RlbSBlcnJvclwiKVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGh3cmVzdGFydChcInVucGx1Z1wiKVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cblxuXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAod2lmaV9leGlzdCkge1xuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHZlcmIod2lmaV9leGlzdCwgXCJpbmZvXCIsIFwiV2xhbiBpbnRlcmZhY2UgZm91bmRlZFwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBhcHN3aXRjaCA9IG5ldyBob3N0YXBkc3dpdGNoKGNvbmZoYXBkcywgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBhcHN3aXRjaC5jbGllbnQodHJ1ZSkudGhlbihmdW5jdGlvbiAoYW5zd2VyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7IGNvbmVjdGlvbjogdHJ1ZSwgcmVjb3Zlcnk6IGZhbHNlIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZWNvdmVyeSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWNvdmVyeV9tb2RlKGNvbmZpZywgd2lmaV9leGlzdCkudGhlbihmdW5jdGlvbiAoYW5zd2VyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2ZXJiKGFuc3dlciwgXCJpbmZvXCIsIFwiSjUgcmVjb3ZlcnkgbW9kZSBzdGFydFwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmVyYihlcnIsIFwiZXJyb3JcIiwgXCJKNSByZWNvdmVyeSBtb2RlIHN0YXJ0XCIpO1xuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG5cblxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cblxuXG5cbiAgICAgICAgICAgICAgICAgICAgfVxuXG5cblxuICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcblxuICAgICAgICAgICAgICAgICAgICB2ZXJiKFwibm8gd2lmaVwiLCBcIndhcm5cIiwgXCJuZXR3b3JrZXJcIik7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGNvbmZpZy5tb2JpbGUpIHtcblxuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgIFd2LmNvbmZpZ3VyZSgpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1vZGUgPSBcIm1vYmlsZS1hdXRvXCI7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgV3YuY29ubmVjdCh0cnVlKS50aGVuKGZ1bmN0aW9uIChhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGEpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGh3cmVzdGFydChcInVucGx1Z1wiKVxuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIm1vZGVtIGVycm9yXCIpXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaHdyZXN0YXJ0KFwidW5wbHVnXCIpXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIm1vZGVtIGVycm9yXCIpXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBod3Jlc3RhcnQoXCJ1bnBsdWdcIilcblxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cblxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJubyB3aWZpISE/Pz9cIilcbiAgICAgICAgICAgICAgICAgICAgICAgIGh3cmVzdGFydChcInVucGx1Z1wiKVxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgfVxuXG5cbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIHJlY292ZXJ5KG1vZGU/OiBzdHJpbmcpIHtcbiAgICAgICAgbGV0IGNvbmZpZyA9IHRoaXMubGljb25maWc7XG5cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgIGdldGludGVyZmEoY29uZmlnLndpZmlfaW50ZXJmYWNlKS50aGVuKGZ1bmN0aW9uIChpbnRlcmY6IElEZXZpY2UpIHtcbiAgICAgICAgICAgICAgICBsZXQgd2lmaV9leGlzdDogc3RyaW5nID0gaW50ZXJmLmludGVyZmFjZTtcbiAgICAgICAgICAgICAgICByZWNvdmVyeV9tb2RlKGNvbmZpZywgd2lmaV9leGlzdCwgbW9kZSkudGhlbihmdW5jdGlvbiAoYW5zd2VyKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoYW5zd2VyKTtcbiAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbn07XG5cblxuXG5cblxuXG4iXX0=
