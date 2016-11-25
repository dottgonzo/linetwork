"use strict";
var Promise = require("bluebird");
var _ = require("lodash");
var Providers = require("mobile-providers");
var wpasupplicant_manager_1 = require("wpasupplicant-manager");
var hostapd_switch_1 = require("hostapd_switch");
var json_add_1 = require("json-add");
var wvdialjs_1 = require("wvdialjs");
var netw_1 = require("netw");
var verb = require("verbo");
var hwrestart = require("hwrestart");
function getinterfa(setted) {
    return new Promise(function (resolve, reject) {
        var wifi_exist = false;
        var devi;
        netw_1.default().then(function (networks) {
            _.map(networks, function (device) {
                if (device.type === "wifi" && (!setted || setted === "auto" || setted === device.interface)) {
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
        json_add_1.default(config, data);
        this.liconfig = config;
        if (this.liconfig.mobile) {
            if (!this.liconfig.mobile.configFilePath)
                this.liconfig.mobile.configFilePath = "/etc/wvdial.conf";
            var Wv = new wvdialjs_1.default(this.liconfig.mobile);
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
        return netw_1.default();
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
        if (dev || this.liconfig.wifi_interface !== "auto") {
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
                netw_1.default().then(function (networks) {
                    _.map(networks, function (device) {
                        if (device.type === "wifi") {
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QyxDQUFBO0FBQUEsQ0FBQyIsImZpbGUiOiJpbmRleC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIFByb21pc2UgZnJvbSBcImJsdWViaXJkXCI7XG5pbXBvcnQgKiBhcyBmcyBmcm9tIFwiZnNcIjtcbmltcG9ydCAqIGFzIF8gZnJvbSBcImxvZGFzaFwiO1xuaW1wb3J0IFByb3ZpZGVycyA9IHJlcXVpcmUoXCJtb2JpbGUtcHJvdmlkZXJzXCIpO1xuaW1wb3J0IFdwYW1hbmFnZXIgZnJvbSBcIndwYXN1cHBsaWNhbnQtbWFuYWdlclwiO1xuaW1wb3J0IGhvc3RhcGRzd2l0Y2ggZnJvbSBcImhvc3RhcGRfc3dpdGNoXCI7XG5pbXBvcnQgdGVzdGludGVybmV0ID0gcmVxdWlyZShcInByb21pc2UtdGVzdC1jb25uZWN0aW9uXCIpO1xuaW1wb3J0IG1lcmdlIGZyb20gXCJqc29uLWFkZFwiO1xuaW1wb3J0IFd2ZGlhbCBmcm9tIFwid3ZkaWFsanNcIjtcblxuXG5pbXBvcnQgbmV0dyBmcm9tIFwibmV0d1wiO1xuY29uc3QgdmVyYiA9IHJlcXVpcmUoXCJ2ZXJib1wiKTtcbmNvbnN0IGh3cmVzdGFydCA9IHJlcXVpcmUoXCJod3Jlc3RhcnRcIik7XG5cblxuaW50ZXJmYWNlIG5ldHcge1xuICAgICgpOiBQcm9taXNlPE5ldHdvcmtbXT5cbn1cblxuaW50ZXJmYWNlIFNjYW4ge1xuICAgIGVzc2lkOiBzdHJpbmc7XG4gICAgbWFjOiBzdHJpbmc7XG4gICAgc2lnbmFsOiBzdHJpbmc7XG59XG5cbmludGVyZmFjZSBOZXR3b3JrIHtcbiAgICB0eXBlOiBzdHJpbmc7XG4gICAgbWFjOiBzdHJpbmc7XG4gICAgaW50ZXJmYWNlOiBzdHJpbmc7XG4gICAgZXNzaWQ/OiBzdHJpbmc7XG4gICAgc2Nhbj86IFNjYW5bXTtcbiAgICBpcD86IHN0cmluZztcbiAgICBnYXRld2F5Pzogc3RyaW5nO1xufVxuXG5cblxuXG5pbnRlcmZhY2UgSVByb3ZpZGVyIHtcblxuICAgIGxhYmVsPzogc3RyaW5nO1xuICAgIGFwbjogc3RyaW5nO1xuICAgIHBob25lPzogc3RyaW5nXG4gICAgdXNlcm5hbWU/OiBzdHJpbmc7XG4gICAgcGFzc3dvcmQ/OiBzdHJpbmc7XG5cbn1cblxuaW50ZXJmYWNlIElHbG9iYWxQcm92aWRlcnMge1xuXG4gICAgY291bnRyeTogc3RyaW5nO1xuICAgIHByb3ZpZGVyczogSVByb3ZpZGVyW107XG59XG5cblxuZnVuY3Rpb24gZ2V0aW50ZXJmYShzZXR0ZWQ/OiBzdHJpbmcpIHtcblxuICAgIHJldHVybiBuZXcgUHJvbWlzZTxJRGV2aWNlPihmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIGxldCB3aWZpX2V4aXN0OiBhbnkgPSBmYWxzZTtcbiAgICAgICAgbGV0IGRldmk6IElEZXZpY2U7XG4gICAgICAgIG5ldHcoKS50aGVuKGZ1bmN0aW9uIChuZXR3b3Jrcykge1xuXG4gICAgICAgICAgICBfLm1hcChuZXR3b3JrcywgZnVuY3Rpb24gKGRldmljZTogSURldmljZSkge1xuXG4gICAgICAgICAgICAgICAgaWYgKGRldmljZS50eXBlID09PSBcIndpZmlcIiAmJiAoIXNldHRlZCB8fCBzZXR0ZWQgPT09IFwiYXV0b1wiIHx8IHNldHRlZCA9PT0gZGV2aWNlLmludGVyZmFjZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgd2lmaV9leGlzdCA9IGRldmljZS5pbnRlcmZhY2U7XG4gICAgICAgICAgICAgICAgICAgIGRldmkgPSBkZXZpY2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGlmICh3aWZpX2V4aXN0KSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShkZXZpKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KHsgZXJyb3I6IFwiZGV2aWNlIG5vdCBmb3VuZGVkXCIgfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgIH0pO1xuXG4gICAgfSk7XG5cbn1cblxuXG5mdW5jdGlvbiByZWNvdmVyeV9tb2RlKGNvbmZpZzogSUxpTmV0d29ya0NvbmYsIGRldjogc3RyaW5nLCBtb2RlPzogc3RyaW5nKSB7XG4gICAgbGV0IG06IHN0cmluZztcblxuICAgIGlmIChtb2RlKSB7XG4gICAgICAgIG0gPSBtb2RlO1xuXG4gICAgfSBlbHNlIHtcbiAgICAgICAgbSA9IFwiaG9zdFwiO1xuICAgIH1cblxuICAgIGxldCBjb25maGFwZHMgPSB7XG4gICAgICAgIGludGVyZmFjZTogZGV2LFxuICAgICAgICB3cGFzdXBwbGljYW50X3BhdGg6IGNvbmZpZy53cGFzdXBwbGljYW50X3BhdGgsXG4gICAgICAgIGhvc3RhcGQ6IGNvbmZpZy5ob3N0YXBkXG4gICAgfTtcblxuICAgIGxldCBhcHN3aXRjaCA9IG5ldyBob3N0YXBkc3dpdGNoKGNvbmZoYXBkcyk7XG5cbiAgICByZXR1cm4gbmV3IFByb21pc2U8Ym9vbGVhbj4oZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICBhcHN3aXRjaFttXSgpLnRoZW4oZnVuY3Rpb24gKGFuc3dlcikge1xuICAgICAgICAgICAgdmVyYihhbnN3ZXIsIFwid2FyblwiLCBcImxpbmV0d29yayByZWNvdmVyeSBtb2RlXCIpO1xuICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKTtcbiAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgdmVyYihlcnIsIFwiZXJyb3JcIiwgXCJsaW5ldHdvcmsgcmVjb3ZlcnkgbW9kZSBmYWlsZWRcIik7XG4gICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG59XG5cblxuaW50ZXJmYWNlIElEZXZpY2Uge1xuICAgIHR5cGU6IHN0cmluZztcbiAgICBpbnRlcmZhY2U6IHN0cmluZztcbn1cblxuaW50ZXJmYWNlIENsYXNzT3B0IHtcbiAgICB3aWZpX2ludGVyZmFjZT86IHN0cmluZztcbiAgICBtb2JpbGU/OiBJTW9iaWxlO1xuICAgIGhvc3RhcGQ/OiBJSG9zdGFwZGNmO1xuICAgIHdwYXN1cHBsaWNhbnRfcGF0aD86IHN0cmluZztcbn1cbmludGVyZmFjZSBJTW9iaWxlIHtcbiAgICBwcm92aWRlcjogSVByb3ZpZGVyO1xuICAgIGRldmljZT86IGFueTtcbiAgICBjb25maWdGaWxlUGF0aD86IHN0cmluZztcblxufVxuaW50ZXJmYWNlIElMaU5ldHdvcmtDb25mIHtcbiAgICB3aWZpX2ludGVyZmFjZTogc3RyaW5nO1xuICAgIG1vYmlsZT86IElNb2JpbGU7XG4gICAgaG9zdGFwZDogSUhvc3RhcGQ7XG4gICAgd3Bhc3VwcGxpY2FudF9wYXRoPzogc3RyaW5nO1xufVxuaW50ZXJmYWNlIElIb3N0YXBkIHtcbiAgICBkcml2ZXI6IHN0cmluZztcbiAgICBzc2lkOiBzdHJpbmc7XG4gICAgd3BhX3Bhc3NwaHJhc2U6IGFueTtcbn07XG5pbnRlcmZhY2UgSUhvc3RhcGRjZiB7XG4gICAgZHJpdmVyPzogc3RyaW5nO1xuICAgIHNzaWQ6IHN0cmluZztcbiAgICB3cGFfcGFzc3BocmFzZTogYW55O1xufTtcbmludGVyZmFjZSBJRG5zbWFzcSB7XG4gICAgaW50ZXJmYWNlOiBzdHJpbmc7XG59O1xuXG5pbnRlcmZhY2UgSUhDb25mIHtcbiAgICBpbnRlcmZhY2U6IHN0cmluZztcbiAgICB3cGFzdXBwbGljYW50X3BhdGg6IHN0cmluZztcbiAgICBob3N0YXBkOiBJSG9zdGFwZDtcbiAgICBkbnNtYXNxOiBJRG5zbWFzcTtcbiAgICByZWRpcmVjdDogYm9vbGVhbjtcbn07XG5cbmludGVyZmFjZSBJQ29ubmVjdGlvbiB7XG5cbiAgICBsaW5rVHlwZTogc3RyaW5nO1xuICAgIGludGVyZmFjZTogc3RyaW5nO1xuICAgIGlwPzogc3RyaW5nO1xuICAgIGdhdGV3YXk/OiBzdHJpbmc7XG5cbn1cblxuaW50ZXJmYWNlIElJbml0IHtcbiAgICBjb25lY3Rpb246IGJvb2xlYW47XG4gICAgcmVjb3Zlcnk6IGJvb2xlYW47XG4gICAgZGV0YWlscz86IElDb25uZWN0aW9uO1xufVxuXG5sZXQgY29uZmlnOiBJTGlOZXR3b3JrQ29uZiA9IHtcbiAgICBob3N0YXBkOiB7XG4gICAgICAgIGRyaXZlcjogXCJubDgwMjExXCIsXG4gICAgICAgIHNzaWQ6IFwidGVzdHR0YXBcIixcbiAgICAgICAgd3BhX3Bhc3NwaHJhc2U6IFwidGVzdHBhc3NcIlxuICAgIH0sXG4gICAgd2lmaV9pbnRlcmZhY2U6IFwiYXV0b1wiLFxuICAgIHdwYXN1cHBsaWNhbnRfcGF0aDogXCIvZXRjL3dwYV9zdXBwbGljYW50L3dwYV9zdXBwbGljYW50LmNvbmZcIlxufTtcblxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBMaU5ldHdvcmsge1xuICAgIGxpY29uZmlnOiBJTGlOZXR3b3JrQ29uZjtcbiAgICBob3N0YXBkOiBJSENvbmY7XG4gICAgbW9iaWxlO1xuICAgIG1vZGU6IHN0cmluZztcblxuXG4gICAgY29uc3RydWN0b3IoZGF0YSkge1xuXG4gICAgICAgIG1lcmdlKGNvbmZpZywgZGF0YSk7XG5cblxuICAgICAgICB0aGlzLmxpY29uZmlnID0gY29uZmlnO1xuXG5cbiAgICAgICAgaWYgKHRoaXMubGljb25maWcubW9iaWxlKSB7XG4gICAgICAgICAgICBpZiAoIXRoaXMubGljb25maWcubW9iaWxlLmNvbmZpZ0ZpbGVQYXRoKSB0aGlzLmxpY29uZmlnLm1vYmlsZS5jb25maWdGaWxlUGF0aCA9IFwiL2V0Yy93dmRpYWwuY29uZlwiO1xuICAgICAgICAgICAgbGV0IFd2ID0gbmV3IFd2ZGlhbCh0aGlzLmxpY29uZmlnLm1vYmlsZSlcbiAgICAgICAgICAgIHRoaXMubW9iaWxlID0gV3ZcbiAgICAgICAgfVxuXG5cblxuXG5cblxuICAgIH1cbiAgICBtb2JpbGVjb25uZWN0KGJvb2wpIHtcbiAgICAgICAgbGV0IFd2ID0gdGhpcy5tb2JpbGU7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTxib29sZWFuPihmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICBXdi5jb25maWd1cmUoYm9vbCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgV3YuY29ubmVjdCh0cnVlKS50aGVuKGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIm1vZGVtIHN0YXJ0ZWRcIik7XG5cbiAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwibW9kZW0gZXJyb3JcIik7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuXG5cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pXG5cblxuXG5cbiAgICAgICAgfSk7XG5cbiAgICB9O1xuICAgIG5ldHdvcmtzKCkge1xuXG4gICAgICAgIHJldHVybiBuZXR3KCk7XG5cbiAgICB9XG5cbiAgICB3cGFtYW5hZ2VyKCkge1xuICAgICAgICBsZXQgcGF0aCA9IHRoaXMubGljb25maWcud3Bhc3VwcGxpY2FudF9wYXRoO1xuICAgICAgICByZXR1cm4gbmV3IFdwYW1hbmFnZXIocGF0aCk7XG5cbiAgICB9XG5cblxuICAgIG1vYmlsZXByb3ZpZGVycygpIHtcblxuICAgICAgICByZXR1cm4gbmV3IFByb3ZpZGVycygpXG5cbiAgICB9XG5cbiAgICB3aWZpX3N3aXRjaChtb2RlOiBzdHJpbmcsIGRldj86IHN0cmluZykge1xuICAgICAgICBjb25zb2xlLmxvZyhtb2RlLCBkZXYpO1xuICAgICAgICBpZiAoZGV2IHx8IHRoaXMubGljb25maWcud2lmaV9pbnRlcmZhY2UgIT09IFwiYXV0b1wiKSB7XG4gICAgICAgICAgICBpZiAoZGV2KSB7XG4gICAgICAgICAgICAgICAgdmFyIGFwc3dpdGNoID0gbmV3IGhvc3RhcGRzd2l0Y2goXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGludGVyZmFjZTogZGV2LFxuICAgICAgICAgICAgICAgICAgICAgICAgd3Bhc3VwcGxpY2FudF9wYXRoOiBjb25maWcud3Bhc3VwcGxpY2FudF9wYXRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgaG9zdGFwZDogdGhpcy5ob3N0YXBkXG5cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhciBhcHN3aXRjaCA9IG5ldyBob3N0YXBkc3dpdGNoKFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbnRlcmZhY2U6IHRoaXMubGljb25maWcud2lmaV9pbnRlcmZhY2UsXG4gICAgICAgICAgICAgICAgICAgICAgICB3cGFzdXBwbGljYW50X3BhdGg6IGNvbmZpZy53cGFzdXBwbGljYW50X3BhdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICBob3N0YXBkOiB0aGlzLmhvc3RhcGRcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImRldiBtb2RlXCIpO1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPGJvb2xlYW4+KGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKG1vZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcImFwXCI6XG4gICAgICAgICAgICAgICAgICAgICAgICBhcHN3aXRjaC5hcCgpLnRoZW4oZnVuY3Rpb24gKGFuc3dlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJob3N0XCI6XG4gICAgICAgICAgICAgICAgICAgICAgICBhcHN3aXRjaC5ob3N0KCkudGhlbihmdW5jdGlvbiAoYW5zd2VyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcImNsaWVudFwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgYXBzd2l0Y2guY2xpZW50KCkudGhlbihmdW5jdGlvbiAoYW5zd2VyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJhdXRvIG1vZGVcIik7XG4gICAgICAgICAgICB2YXIgY29uZmlnID0gdGhpcy5saWNvbmZpZztcbiAgICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICAgICAgbmV0dygpLnRoZW4oZnVuY3Rpb24gKG5ldHdvcmtzKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgXy5tYXAobmV0d29ya3MsIGZ1bmN0aW9uIChkZXZpY2U6IElEZXZpY2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkZXZpY2UudHlwZSA9PT0gXCJ3aWZpXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXYgPSBkZXZpY2UuaW50ZXJmYWNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRldikge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgYXBzd2l0Y2ggPSBuZXcgaG9zdGFwZHN3aXRjaChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGludGVyZmFjZTogZGV2LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBob3N0YXBkOiBjb25maWcuaG9zdGFwZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd3Bhc3VwcGxpY2FudF9wYXRoOiBjb25maWcud3Bhc3VwcGxpY2FudF9wYXRoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYXBzd2l0Y2gpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKG1vZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFwiYXBcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXBzd2l0Y2guYXAoKS50aGVuKGZ1bmN0aW9uIChhbnN3ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFwiaG9zdFwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcHN3aXRjaC5ob3N0KCkudGhlbihmdW5jdGlvbiAoYW5zd2VyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBcImNsaWVudFwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcHN3aXRjaC5jbGllbnQoKS50aGVuKGZ1bmN0aW9uIChhbnN3ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdCh7IGVycm9yOiBcIm5vIGRldlwiIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfTtcblxuXG4gICAgY29ubmVjdGlvbihyZWNvdmVyeT86IGJvb2xlYW4pIHtcbiAgICAgICAgbGV0IG1vZGUgPSB0aGlzLm1vZGU7XG4gICAgICAgIGxldCBjb25maWcgPSB0aGlzLmxpY29uZmlnO1xuICAgICAgICBsZXQgV3YgPSB0aGlzLm1vYmlsZTtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPElJbml0PihmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICB2ZXJiKGNvbmZpZywgXCJkZWJ1Z1wiLCBcIlRyeW5nIHRvIGNvbm5lY3RcIik7XG5cbiAgICAgICAgICAgIGlmIChtb2RlID09PSBcIm1vYmlsZS1hdXRvXCIpIHtcbiAgICAgICAgICAgICAgICByZWplY3QoXCJhdXRvIG1vZGVcIilcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcInd2IHJ1bm5pbmcsIG5vdGhpbmcgdG8gZG9cIilcbiAgICAgICAgICAgIH0gZWxzZSB7XG5cblxuXG5cbiAgICAgICAgICAgICAgICBnZXRpbnRlcmZhKGNvbmZpZy53aWZpX2ludGVyZmFjZSkudGhlbihmdW5jdGlvbiAoaW50ZXJmOiBJRGV2aWNlKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgbGV0IHdpZmlfZXhpc3Q6IHN0cmluZyA9IGludGVyZi5pbnRlcmZhY2U7XG5cbiAgICAgICAgICAgICAgICAgICAgbGV0IGNvbmZoYXBkcyA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGludGVyZmFjZTogd2lmaV9leGlzdCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHdwYXN1cHBsaWNhbnRfcGF0aDogY29uZmlnLndwYXN1cHBsaWNhbnRfcGF0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGhvc3RhcGQ6IGNvbmZpZy5ob3N0YXBkXG4gICAgICAgICAgICAgICAgICAgIH07XG5cblxuXG4gICAgICAgICAgICAgICAgICAgIGlmIChjb25maWcubW9iaWxlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVjb3ZlcnkgJiYgd2lmaV9leGlzdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwicmVjb3ZlcmluZ1wiKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlY292ZXJ5X21vZGUoY29uZmlnLCB3aWZpX2V4aXN0KVxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICh3aWZpX2V4aXN0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGFwc3dpdGNoID0gbmV3IGhvc3RhcGRzd2l0Y2goY29uZmhhcGRzLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcHN3aXRjaC5jbGllbnQodHJ1ZSkudGhlbihmdW5jdGlvbiAoYW5zd2VyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwid2lmaWNsaWVudCBjb25uZWN0ZWQgXCIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIndpZmljbGllbnQgbm8gY29ubmVjdGlvblwiICsgZXJyKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBXdi5jb25maWd1cmUoKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbW9kZSA9IFwibW9iaWxlLWF1dG9cIjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJtb2RlbSBzdGFydGVkXCIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFd2LmNvbm5lY3QodHJ1ZSkudGhlbihmdW5jdGlvbiAoYSkge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBod3Jlc3RhcnQoXCJ1bnBsdWdcIilcblxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwibW9kZW0gZXJyb3JcIilcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaHdyZXN0YXJ0KFwidW5wbHVnXCIpXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJtb2RlbSBlcnJvclwiKVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGh3cmVzdGFydChcInVucGx1Z1wiKVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cblxuXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAod2lmaV9leGlzdCkge1xuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHZlcmIod2lmaV9leGlzdCwgXCJpbmZvXCIsIFwiV2xhbiBpbnRlcmZhY2UgZm91bmRlZFwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBhcHN3aXRjaCA9IG5ldyBob3N0YXBkc3dpdGNoKGNvbmZoYXBkcywgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBhcHN3aXRjaC5jbGllbnQodHJ1ZSkudGhlbihmdW5jdGlvbiAoYW5zd2VyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7IGNvbmVjdGlvbjogdHJ1ZSwgcmVjb3Zlcnk6IGZhbHNlIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZWNvdmVyeSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWNvdmVyeV9tb2RlKGNvbmZpZywgd2lmaV9leGlzdCkudGhlbihmdW5jdGlvbiAoYW5zd2VyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2ZXJiKGFuc3dlciwgXCJpbmZvXCIsIFwiSjUgcmVjb3ZlcnkgbW9kZSBzdGFydFwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmVyYihlcnIsIFwiZXJyb3JcIiwgXCJKNSByZWNvdmVyeSBtb2RlIHN0YXJ0XCIpO1xuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG5cblxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cblxuXG5cbiAgICAgICAgICAgICAgICAgICAgfVxuXG5cblxuICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcblxuICAgICAgICAgICAgICAgICAgICB2ZXJiKFwibm8gd2lmaVwiLCBcIndhcm5cIiwgXCJuZXR3b3JrZXJcIik7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGNvbmZpZy5tb2JpbGUpIHtcblxuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgIFd2LmNvbmZpZ3VyZSgpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1vZGUgPSBcIm1vYmlsZS1hdXRvXCI7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgV3YuY29ubmVjdCh0cnVlKS50aGVuKGZ1bmN0aW9uIChhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGEpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGh3cmVzdGFydChcInVucGx1Z1wiKVxuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIm1vZGVtIGVycm9yXCIpXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaHdyZXN0YXJ0KFwidW5wbHVnXCIpXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIm1vZGVtIGVycm9yXCIpXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBod3Jlc3RhcnQoXCJ1bnBsdWdcIilcblxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cblxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJubyB3aWZpISE/Pz9cIilcbiAgICAgICAgICAgICAgICAgICAgICAgIGh3cmVzdGFydChcInVucGx1Z1wiKVxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgfVxuXG5cbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIHJlY292ZXJ5KG1vZGU/OiBzdHJpbmcpIHtcbiAgICAgICAgbGV0IGNvbmZpZyA9IHRoaXMubGljb25maWc7XG5cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgIGdldGludGVyZmEoY29uZmlnLndpZmlfaW50ZXJmYWNlKS50aGVuKGZ1bmN0aW9uIChpbnRlcmY6IElEZXZpY2UpIHtcbiAgICAgICAgICAgICAgICBsZXQgd2lmaV9leGlzdDogc3RyaW5nID0gaW50ZXJmLmludGVyZmFjZTtcbiAgICAgICAgICAgICAgICByZWNvdmVyeV9tb2RlKGNvbmZpZywgd2lmaV9leGlzdCwgbW9kZSkudGhlbihmdW5jdGlvbiAoYW5zd2VyKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoYW5zd2VyKTtcbiAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbn07XG5cblxuXG5cblxuXG4iXX0=
