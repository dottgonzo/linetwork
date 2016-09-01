"use strict";
var Promise = require("bluebird");
var _ = require("lodash");
var hwrestart = require("hwrestart");
var Providers = require("mobile-providers");
var Wpamanager = require("wpasupplicant-manager");
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
        return new Wpamanager(path);
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

//# sourceMappingURL=data:application/json;base64,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Z0JBQUM7QUFBRCxDQS9VQSxBQStVQyxJQUFBO0FBL1VEOzJCQStVQyxDQUFBO0FBQUEsQ0FBQyIsImZpbGUiOiJpbmRleC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIFByb21pc2UgZnJvbSBcImJsdWViaXJkXCI7XG5pbXBvcnQgKiBhcyBmcyBmcm9tIFwiZnNcIjtcbmltcG9ydCAqIGFzIF8gZnJvbSBcImxvZGFzaFwiO1xubGV0IGh3cmVzdGFydCA9IHJlcXVpcmUoXCJod3Jlc3RhcnRcIik7XG5pbXBvcnQgUHJvdmlkZXJzID0gcmVxdWlyZShcIm1vYmlsZS1wcm92aWRlcnNcIik7XG5pbXBvcnQgV3BhbWFuYWdlciA9IHJlcXVpcmUoXCJ3cGFzdXBwbGljYW50LW1hbmFnZXJcIik7XG5pbXBvcnQgaG9zdGFwZHN3aXRjaCBmcm9tIFwiaG9zdGFwZF9zd2l0Y2hcIjtcbmltcG9ydCB0ZXN0aW50ZXJuZXQgPSByZXF1aXJlKFwicHJvbWlzZS10ZXN0LWNvbm5lY3Rpb25cIik7XG5pbXBvcnQgbWVyZ2UgPSByZXF1aXJlKFwianNvbi1hZGRcIik7XG5pbXBvcnQgV3ZkaWFsID0gcmVxdWlyZShcInd2ZGlhbGpzXCIpO1xuXG5cblxuXG5sZXQgbmV0dzogbmV0dyA9IHJlcXVpcmUoXCJuZXR3XCIpO1xubGV0IHZlcmIgPSByZXF1aXJlKFwidmVyYm9cIik7XG5cblxuaW50ZXJmYWNlIG5ldHcge1xuICAgICgpOiBQcm9taXNlPE5ldHdvcmtbXT5cbn1cblxuaW50ZXJmYWNlIFNjYW4ge1xuICAgIGVzc2lkOiBzdHJpbmc7XG4gICAgbWFjOiBzdHJpbmc7XG4gICAgc2lnbmFsOiBzdHJpbmc7XG59XG5cbmludGVyZmFjZSBOZXR3b3JrIHtcbiAgICB0eXBlOiBzdHJpbmc7XG4gICAgbWFjOiBzdHJpbmc7XG4gICAgaW50ZXJmYWNlOiBzdHJpbmc7XG4gICAgZXNzaWQ/OiBzdHJpbmc7XG4gICAgc2Nhbj86IFNjYW5bXTtcbiAgICBpcD86IHN0cmluZztcbiAgICBnYXRld2F5Pzogc3RyaW5nO1xufVxuXG5cblxuXG5pbnRlcmZhY2UgSVByb3ZpZGVyIHtcblxuICAgIGxhYmVsPzogc3RyaW5nO1xuICAgIGFwbjogc3RyaW5nO1xuICAgIHBob25lPzogc3RyaW5nXG4gICAgdXNlcm5hbWU/OiBzdHJpbmc7XG4gICAgcGFzc3dvcmQ/OiBzdHJpbmc7XG5cbn1cblxuaW50ZXJmYWNlIElHbG9iYWxQcm92aWRlcnMge1xuXG4gICAgY291bnRyeTogc3RyaW5nO1xuICAgIHByb3ZpZGVyczogSVByb3ZpZGVyW107XG59XG5cblxuZnVuY3Rpb24gZ2V0aW50ZXJmYShzZXR0ZWQ/OiBzdHJpbmcpIHtcblxuICAgIHJldHVybiBuZXcgUHJvbWlzZTxJRGV2aWNlPihmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIGxldCB3aWZpX2V4aXN0OiBhbnkgPSBmYWxzZTtcbiAgICAgICAgbGV0IGRldmk6IElEZXZpY2U7XG4gICAgICAgIG5ldHcoKS50aGVuKGZ1bmN0aW9uIChuZXR3b3Jrcykge1xuXG4gICAgICAgICAgICBfLm1hcChuZXR3b3JrcywgZnVuY3Rpb24gKGRldmljZTogSURldmljZSkge1xuXG4gICAgICAgICAgICAgICAgaWYgKGRldmljZS50eXBlID09IFwid2lmaVwiICYmICghc2V0dGVkIHx8IHNldHRlZCA9PSBcImF1dG9cIiB8fCBzZXR0ZWQgPT0gZGV2aWNlLmludGVyZmFjZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgd2lmaV9leGlzdCA9IGRldmljZS5pbnRlcmZhY2U7XG4gICAgICAgICAgICAgICAgICAgIGRldmkgPSBkZXZpY2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGlmICh3aWZpX2V4aXN0KSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShkZXZpKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KHsgZXJyb3I6IFwiZGV2aWNlIG5vdCBmb3VuZGVkXCIgfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgIH0pO1xuXG4gICAgfSk7XG5cbn1cblxuXG5mdW5jdGlvbiByZWNvdmVyeV9tb2RlKGNvbmZpZzogSUxpTmV0d29ya0NvbmYsIGRldjogc3RyaW5nLCBtb2RlPzogc3RyaW5nKSB7XG4gICAgbGV0IG06IHN0cmluZztcblxuICAgIGlmIChtb2RlKSB7XG4gICAgICAgIG0gPSBtb2RlO1xuXG4gICAgfSBlbHNlIHtcbiAgICAgICAgbSA9IFwiaG9zdFwiO1xuICAgIH1cblxuICAgIGxldCBjb25maGFwZHMgPSB7XG4gICAgICAgIGludGVyZmFjZTogZGV2LFxuICAgICAgICB3cGFzdXBwbGljYW50X3BhdGg6IGNvbmZpZy53cGFzdXBwbGljYW50X3BhdGgsXG4gICAgICAgIGhvc3RhcGQ6IGNvbmZpZy5ob3N0YXBkXG4gICAgfTtcblxuICAgIGxldCBhcHN3aXRjaCA9IG5ldyBob3N0YXBkc3dpdGNoKGNvbmZoYXBkcyk7XG5cbiAgICByZXR1cm4gbmV3IFByb21pc2U8Ym9vbGVhbj4oZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICBhcHN3aXRjaFttXSgpLnRoZW4oZnVuY3Rpb24gKGFuc3dlcikge1xuICAgICAgICAgICAgdmVyYihhbnN3ZXIsIFwid2FyblwiLCBcImxpbmV0d29yayByZWNvdmVyeSBtb2RlXCIpO1xuICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKTtcbiAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgdmVyYihlcnIsIFwiZXJyb3JcIiwgXCJsaW5ldHdvcmsgcmVjb3ZlcnkgbW9kZSBmYWlsZWRcIik7XG4gICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG59XG5cblxuaW50ZXJmYWNlIElEZXZpY2Uge1xuICAgIHR5cGU6IHN0cmluZztcbiAgICBpbnRlcmZhY2U6IHN0cmluZztcbn1cblxuaW50ZXJmYWNlIENsYXNzT3B0IHtcbiAgICB3aWZpX2ludGVyZmFjZT86IHN0cmluZztcbiAgICBtb2JpbGU/OiBJTW9iaWxlO1xuICAgIGhvc3RhcGQ/OiBJSG9zdGFwZGNmO1xuICAgIHdwYXN1cHBsaWNhbnRfcGF0aD86IHN0cmluZztcbn1cbmludGVyZmFjZSBJTW9iaWxlIHtcbiAgICBwcm92aWRlcjogSVByb3ZpZGVyO1xuICAgIGRldmljZT86IGFueTtcbiAgICBjb25maWdGaWxlUGF0aD86IHN0cmluZztcblxufVxuaW50ZXJmYWNlIElMaU5ldHdvcmtDb25mIHtcbiAgICB3aWZpX2ludGVyZmFjZTogc3RyaW5nO1xuICAgIG1vYmlsZT86IElNb2JpbGU7XG4gICAgaG9zdGFwZDogSUhvc3RhcGQ7XG4gICAgd3Bhc3VwcGxpY2FudF9wYXRoPzogc3RyaW5nO1xufVxuaW50ZXJmYWNlIElIb3N0YXBkIHtcbiAgICBkcml2ZXI6IHN0cmluZztcbiAgICBzc2lkOiBzdHJpbmc7XG4gICAgd3BhX3Bhc3NwaHJhc2U6IGFueTtcbn07XG5pbnRlcmZhY2UgSUhvc3RhcGRjZiB7XG4gICAgZHJpdmVyPzogc3RyaW5nO1xuICAgIHNzaWQ6IHN0cmluZztcbiAgICB3cGFfcGFzc3BocmFzZTogYW55O1xufTtcbmludGVyZmFjZSBJRG5zbWFzcSB7XG4gICAgaW50ZXJmYWNlOiBzdHJpbmc7XG59O1xuXG5pbnRlcmZhY2UgSUhDb25mIHtcbiAgICBpbnRlcmZhY2U6IHN0cmluZztcbiAgICB3cGFzdXBwbGljYW50X3BhdGg6IHN0cmluZztcbiAgICBob3N0YXBkOiBJSG9zdGFwZDtcbiAgICBkbnNtYXNxOiBJRG5zbWFzcTtcbiAgICByZWRpcmVjdDogYm9vbGVhbjtcbn07XG5cbmludGVyZmFjZSBJQ29ubmVjdGlvbiB7XG5cbiAgICBsaW5rVHlwZTogc3RyaW5nO1xuICAgIGludGVyZmFjZTogc3RyaW5nO1xuICAgIGlwPzogc3RyaW5nO1xuICAgIGdhdGV3YXk/OiBzdHJpbmc7XG5cbn1cblxuaW50ZXJmYWNlIElJbml0IHtcbiAgICBjb25lY3Rpb246IGJvb2xlYW47XG4gICAgcmVjb3Zlcnk6IGJvb2xlYW47XG4gICAgZGV0YWlscz86IElDb25uZWN0aW9uO1xufVxuXG5sZXQgY29uZmlnOiBJTGlOZXR3b3JrQ29uZiA9IHtcbiAgICBob3N0YXBkOiB7XG4gICAgICAgIGRyaXZlcjogXCJubDgwMjExXCIsXG4gICAgICAgIHNzaWQ6IFwidGVzdHR0YXBcIixcbiAgICAgICAgd3BhX3Bhc3NwaHJhc2U6IFwidGVzdHBhc3NcIlxuICAgIH0sXG4gICAgd2lmaV9pbnRlcmZhY2U6IFwiYXV0b1wiLFxuICAgIHdwYXN1cHBsaWNhbnRfcGF0aDogXCIvZXRjL3dwYV9zdXBwbGljYW50L3dwYV9zdXBwbGljYW50LmNvbmZcIlxufTtcblxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBMaU5ldHdvcmsge1xuICAgIGxpY29uZmlnOiBJTGlOZXR3b3JrQ29uZjtcbiAgICBob3N0YXBkOiBJSENvbmY7XG4gICAgbW9iaWxlO1xuICAgIG1vZGU6IHN0cmluZztcblxuXG4gICAgY29uc3RydWN0b3IoZGF0YSkge1xuXG4gICAgICAgIG1lcmdlKGNvbmZpZywgZGF0YSk7XG5cblxuICAgICAgICB0aGlzLmxpY29uZmlnID0gY29uZmlnO1xuXG5cbiAgICAgICAgaWYgKHRoaXMubGljb25maWcubW9iaWxlKSB7XG4gICAgICAgICAgICBpZiAoIXRoaXMubGljb25maWcubW9iaWxlLmNvbmZpZ0ZpbGVQYXRoKSB0aGlzLmxpY29uZmlnLm1vYmlsZS5jb25maWdGaWxlUGF0aCA9IFwiL2V0Yy93dmRpYWwuY29uZlwiO1xuICAgICAgICAgICAgbGV0IFd2ID0gbmV3IFd2ZGlhbCh0aGlzLmxpY29uZmlnLm1vYmlsZSlcbiAgICAgICAgICAgIHRoaXMubW9iaWxlID0gV3ZcbiAgICAgICAgfVxuXG5cblxuXG5cblxuICAgIH1cbiAgICBtb2JpbGVjb25uZWN0KGJvb2wpIHtcbiAgICAgICAgbGV0IFd2ID0gdGhpcy5tb2JpbGU7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTxib29sZWFuPihmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICBXdi5jb25maWd1cmUoYm9vbCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgV3YuY29ubmVjdCh0cnVlKS50aGVuKGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIm1vZGVtIHN0YXJ0ZWRcIik7XG5cbiAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwibW9kZW0gZXJyb3JcIik7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuXG5cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pXG5cblxuXG5cbiAgICAgICAgfSk7XG5cbiAgICB9O1xuICAgIG5ldHdvcmtzKCkge1xuXG4gICAgICAgIHJldHVybiBuZXR3KCk7XG5cbiAgICB9XG5cbiAgICB3cGFtYW5hZ2VyKCkge1xuICAgICAgICBsZXQgcGF0aCA9IHRoaXMubGljb25maWcud3Bhc3VwcGxpY2FudF9wYXRoO1xuICAgICAgICByZXR1cm4gbmV3IFdwYW1hbmFnZXIocGF0aCk7XG5cbiAgICB9XG5cblxuICAgIG1vYmlsZXByb3ZpZGVycygpIHtcblxuICAgICAgICByZXR1cm4gbmV3IFByb3ZpZGVycygpXG5cbiAgICB9XG5cbiAgICB3aWZpX3N3aXRjaChtb2RlOiBzdHJpbmcsIGRldj86IHN0cmluZykge1xuICAgICAgICBjb25zb2xlLmxvZyhtb2RlLCBkZXYpO1xuICAgICAgICBpZiAoZGV2IHx8IHRoaXMubGljb25maWcud2lmaV9pbnRlcmZhY2UgIT0gXCJhdXRvXCIpIHtcbiAgICAgICAgICAgIGlmIChkZXYpIHtcbiAgICAgICAgICAgICAgICB2YXIgYXBzd2l0Y2ggPSBuZXcgaG9zdGFwZHN3aXRjaChcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgaW50ZXJmYWNlOiBkZXYsXG4gICAgICAgICAgICAgICAgICAgICAgICB3cGFzdXBwbGljYW50X3BhdGg6IGNvbmZpZy53cGFzdXBwbGljYW50X3BhdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICBob3N0YXBkOiB0aGlzLmhvc3RhcGRcblxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFyIGFwc3dpdGNoID0gbmV3IGhvc3RhcGRzd2l0Y2goXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGludGVyZmFjZTogdGhpcy5saWNvbmZpZy53aWZpX2ludGVyZmFjZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHdwYXN1cHBsaWNhbnRfcGF0aDogY29uZmlnLndwYXN1cHBsaWNhbnRfcGF0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGhvc3RhcGQ6IHRoaXMuaG9zdGFwZFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZGV2IG1vZGVcIik7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8Ym9vbGVhbj4oZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgICAgICAgIHN3aXRjaCAobW9kZSkge1xuICAgICAgICAgICAgICAgICAgICBjYXNlIFwiYXBcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgIGFwc3dpdGNoLmFwKCkudGhlbihmdW5jdGlvbiAoYW5zd2VyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcImhvc3RcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgIGFwc3dpdGNoLmhvc3QoKS50aGVuKGZ1bmN0aW9uIChhbnN3ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgICAgICBjYXNlIFwiY2xpZW50XCI6XG4gICAgICAgICAgICAgICAgICAgICAgICBhcHN3aXRjaC5jbGllbnQoKS50aGVuKGZ1bmN0aW9uIChhbnN3ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImF1dG8gbW9kZVwiKTtcbiAgICAgICAgICAgIHZhciBjb25maWcgPSB0aGlzLmxpY29uZmlnO1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgICAgICBuZXR3KCkudGhlbihmdW5jdGlvbiAobmV0d29ya3MpIHtcblxuICAgICAgICAgICAgICAgICAgICBfLm1hcChuZXR3b3JrcywgZnVuY3Rpb24gKGRldmljZTogSURldmljZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRldmljZS50eXBlID09IFwid2lmaVwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGV2ID0gZGV2aWNlLmludGVyZmFjZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChkZXYpIHtcblxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGFwc3dpdGNoID0gbmV3IGhvc3RhcGRzd2l0Y2goXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnRlcmZhY2U6IGRldixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaG9zdGFwZDogY29uZmlnLmhvc3RhcGQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdwYXN1cHBsaWNhbnRfcGF0aDogY29uZmlnLndwYXN1cHBsaWNhbnRfcGF0aFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGFwc3dpdGNoKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgc3dpdGNoIChtb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBcImFwXCI6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFwc3dpdGNoLmFwKCkudGhlbihmdW5jdGlvbiAoYW5zd2VyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBcImhvc3RcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXBzd2l0Y2guaG9zdCgpLnRoZW4oZnVuY3Rpb24gKGFuc3dlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgXCJjbGllbnRcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXBzd2l0Y2guY2xpZW50KCkudGhlbihmdW5jdGlvbiAoYW5zd2VyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoeyBlcnJvcjogXCJubyBkZXZcIiB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG5cblxuICAgIGNvbm5lY3Rpb24ocmVjb3Zlcnk/OiBib29sZWFuKSB7XG4gICAgICAgIGxldCBtb2RlID0gdGhpcy5tb2RlO1xuICAgICAgICBsZXQgY29uZmlnID0gdGhpcy5saWNvbmZpZztcbiAgICAgICAgbGV0IFd2ID0gdGhpcy5tb2JpbGU7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTxJSW5pdD4oZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgICAgdmVyYihjb25maWcsIFwiZGVidWdcIiwgXCJUcnluZyB0byBjb25uZWN0XCIpO1xuXG4gICAgICAgICAgICBpZiAobW9kZSA9PT0gXCJtb2JpbGUtYXV0b1wiKSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KFwiYXV0byBtb2RlXCIpXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJ3diBydW5uaW5nLCBub3RoaW5nIHRvIGRvXCIpXG4gICAgICAgICAgICB9IGVsc2Uge1xuXG5cblxuXG4gICAgICAgICAgICAgICAgZ2V0aW50ZXJmYShjb25maWcud2lmaV9pbnRlcmZhY2UpLnRoZW4oZnVuY3Rpb24gKGludGVyZjogSURldmljZSkge1xuXG4gICAgICAgICAgICAgICAgICAgIGxldCB3aWZpX2V4aXN0OiBzdHJpbmcgPSBpbnRlcmYuaW50ZXJmYWNlO1xuXG4gICAgICAgICAgICAgICAgICAgIGxldCBjb25maGFwZHMgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbnRlcmZhY2U6IHdpZmlfZXhpc3QsXG4gICAgICAgICAgICAgICAgICAgICAgICB3cGFzdXBwbGljYW50X3BhdGg6IGNvbmZpZy53cGFzdXBwbGljYW50X3BhdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICBob3N0YXBkOiBjb25maWcuaG9zdGFwZFxuICAgICAgICAgICAgICAgICAgICB9O1xuXG5cblxuICAgICAgICAgICAgICAgICAgICBpZiAoY29uZmlnLm1vYmlsZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlY292ZXJ5ICYmIHdpZmlfZXhpc3QpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcInJlY292ZXJpbmdcIilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWNvdmVyeV9tb2RlKGNvbmZpZywgd2lmaV9leGlzdClcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAod2lmaV9leGlzdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBhcHN3aXRjaCA9IG5ldyBob3N0YXBkc3dpdGNoKGNvbmZoYXBkcywgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXBzd2l0Y2guY2xpZW50KHRydWUpLnRoZW4oZnVuY3Rpb24gKGFuc3dlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIndpZmljbGllbnQgY29ubmVjdGVkIFwiKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJ3aWZpY2xpZW50IG5vIGNvbm5lY3Rpb25cIiArIGVycilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcblxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgV3YuY29uZmlndXJlKCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1vZGUgPSBcIm1vYmlsZS1hdXRvXCI7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwibW9kZW0gc3RhcnRlZFwiKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBXdi5jb25uZWN0KHRydWUpLnRoZW4oZnVuY3Rpb24gKGEpIHtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaHdyZXN0YXJ0KFwidW5wbHVnXCIpXG5cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIm1vZGVtIGVycm9yXCIpXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGh3cmVzdGFydChcInVucGx1Z1wiKVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGUpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwibW9kZW0gZXJyb3JcIilcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBod3Jlc3RhcnQoXCJ1bnBsdWdcIilcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG5cblxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHdpZmlfZXhpc3QpIHtcblxuXG4gICAgICAgICAgICAgICAgICAgICAgICB2ZXJiKHdpZmlfZXhpc3QsIFwiaW5mb1wiLCBcIldsYW4gaW50ZXJmYWNlIGZvdW5kZWRcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgYXBzd2l0Y2ggPSBuZXcgaG9zdGFwZHN3aXRjaChjb25maGFwZHMsIHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYXBzd2l0Y2guY2xpZW50KHRydWUpLnRoZW4oZnVuY3Rpb24gKGFuc3dlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoeyBjb25lY3Rpb246IHRydWUsIHJlY292ZXJ5OiBmYWxzZSB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVjb3ZlcnkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVjb3ZlcnlfbW9kZShjb25maWcsIHdpZmlfZXhpc3QpLnRoZW4oZnVuY3Rpb24gKGFuc3dlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmVyYihhbnN3ZXIsIFwiaW5mb1wiLCBcIko1IHJlY292ZXJ5IG1vZGUgc3RhcnRcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZlcmIoZXJyLCBcImVycm9yXCIsIFwiSjUgcmVjb3ZlcnkgbW9kZSBzdGFydFwiKTtcblxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG5cblxuXG4gICAgICAgICAgICAgICAgICAgIH1cblxuXG5cbiAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgdmVyYihcIm5vIHdpZmlcIiwgXCJ3YXJuXCIsIFwibmV0d29ya2VyXCIpO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChjb25maWcubW9iaWxlKSB7XG5cblxuXG4gICAgICAgICAgICAgICAgICAgICAgICBXdi5jb25maWd1cmUoKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtb2RlID0gXCJtb2JpbGUtYXV0b1wiO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFd2LmNvbm5lY3QodHJ1ZSkudGhlbihmdW5jdGlvbiAoYSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhhKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBod3Jlc3RhcnQoXCJ1bnBsdWdcIilcblxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJtb2RlbSBlcnJvclwiKVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGh3cmVzdGFydChcInVucGx1Z1wiKVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGUpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJtb2RlbSBlcnJvclwiKVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaHdyZXN0YXJ0KFwidW5wbHVnXCIpXG5cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG5cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwibm8gd2lmaSEhPz8/XCIpXG4gICAgICAgICAgICAgICAgICAgICAgICBod3Jlc3RhcnQoXCJ1bnBsdWdcIilcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIH1cblxuXG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICByZWNvdmVyeShtb2RlPzogc3RyaW5nKSB7XG4gICAgICAgIGxldCBjb25maWcgPSB0aGlzLmxpY29uZmlnO1xuXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICBnZXRpbnRlcmZhKGNvbmZpZy53aWZpX2ludGVyZmFjZSkudGhlbihmdW5jdGlvbiAoaW50ZXJmOiBJRGV2aWNlKSB7XG4gICAgICAgICAgICAgICAgbGV0IHdpZmlfZXhpc3Q6IHN0cmluZyA9IGludGVyZi5pbnRlcmZhY2U7XG4gICAgICAgICAgICAgICAgcmVjb3ZlcnlfbW9kZShjb25maWcsIHdpZmlfZXhpc3QsIG1vZGUpLnRoZW4oZnVuY3Rpb24gKGFuc3dlcikge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGFuc3dlcik7XG4gICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG59O1xuXG5cblxuXG5cblxuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
