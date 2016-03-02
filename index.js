var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Promise = require("bluebird");
var _ = require("lodash");
var hwrestart = require("hwrestart");
var Providers = require("mobile-providers");
var Wpamanager = require("wpasupplicant-manager");
var hostapdswitch = require("hostapd_switch");
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
    var apswitch = new hostapdswitch(confhapds);
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
                var apswitch = new hostapdswitch({
                    interface: dev,
                    wpasupplicant_path: config.wpasupplicant_path,
                    hostapd: this.hostapd
                });
            }
            else {
                var apswitch = new hostapdswitch({
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
                        var apswitch = new hostapdswitch({
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
            if (mode == "mobile-auto") {
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
                            var apswitch = new hostapdswitch(confhapds, true);
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
                        else if (wifi_exist) {
                            verb(wifi_exist, "info", "Wlan interface founded");
                            var apswitch = new hostapdswitch(confhapds, true);
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
                        console.log(err);
                        throw Error("OOOH");
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
})();
;
module.exports = LiNetwork;

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluZGV4LnRzIl0sIm5hbWVzIjpbImdldGludGVyZmEiLCJyZWNvdmVyeV9tb2RlIiwiTGlOZXR3b3JrIiwiTGlOZXR3b3JrLmNvbnN0cnVjdG9yIiwiTGlOZXR3b3JrLm1vYmlsZWNvbm5lY3QiLCJMaU5ldHdvcmsubmV0d29ya3MiLCJMaU5ldHdvcmsud3BhbWFuYWdlciIsIkxpTmV0d29yay5tb2JpbGVwcm92aWRlcnMiLCJMaU5ldHdvcmsud2lmaV9zd2l0Y2giLCJMaU5ldHdvcmsuY29ubmVjdGlvbiIsIkxpTmV0d29yay5yZWNvdmVyeSJdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBQSxJQUFZLE9BQU8sV0FBTSxVQUFVLENBQUMsQ0FBQTtBQUVwQyxJQUFZLENBQUMsV0FBTSxRQUFRLENBQUMsQ0FBQTtBQUM1QixJQUFJLFNBQVMsR0FBRyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7QUFDckMsSUFBTyxTQUFTLFdBQVcsa0JBQWtCLENBQUMsQ0FBQztBQUMvQyxJQUFPLFVBQVUsV0FBVyx1QkFBdUIsQ0FBQyxDQUFDO0FBQ3JELElBQU8sYUFBYSxXQUFXLGdCQUFnQixDQUFDLENBQUM7QUFFakQsSUFBTyxLQUFLLFdBQVcsVUFBVSxDQUFDLENBQUM7QUFDbkMsSUFBTyxNQUFNLFdBQVcsVUFBVSxDQUFDLENBQUM7QUFLcEMsSUFBSSxJQUFJLEdBQVMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ2pDLElBQUksSUFBSSxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztBQTJDNUIsb0JBQW9CLE1BQWU7SUFFL0JBLE1BQU1BLENBQUNBLElBQUlBLE9BQU9BLENBQVVBLFVBQVNBLE9BQU9BLEVBQUVBLE1BQU1BO1FBQ2hELElBQUksVUFBVSxHQUFRLEtBQUssQ0FBQztRQUM1QixJQUFJLElBQWEsQ0FBQztRQUNsQixJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBUyxRQUFRO1lBRXpCLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLFVB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RyxDQUFDLEdBQUcsQ0FBQyxDQUFBO3dCQUNoQixNQUFNLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQTtvQkFDdkIsQ0FBQztnQkFFTCxDQUFDLENBQUMsQ0FBQztZQUVQLENBQUM7UUFHTCxDQUFDLENBQUNBLENBQUNBO0lBQ1BBLENBQUNBOztJQUVEUCw0QkFBUUEsR0FBUkEsVUFBU0EsSUFBYUE7UUFDbEJRLElBQUlBLE1BQU1BLEdBQUdBLElBQUlBLENBQUNBLFFBQVFBLENBQUNBO1FBRTNCQSxNQUFNQSxDQUFDQSxJQUFJQSxPQUFPQSxDQUFDQSxVQUFTQSxPQUFPQSxFQUFFQSxNQUFNQTtZQUN2QyxVQUFVLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFTLE1BQWU7Z0JBQzNELElBQUksVUFBVSxHQUFXLE1BQU0sQ0FBQyxTQUFTLENBQUM7Z0JBQzFDLGFBQWEsQ0FBQyxNQUFNLEVBQUUsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFTLE1BQU07b0JBQ3hELE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDcEIsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVMsR0FBRztvQkFDakIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUNoQixDQUFDLENBQUMsQ0FBQztZQUNQLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFTLEdBQUc7Z0JBQ2pCLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNoQixDQUFDLENBQUMsQ0FBQztRQUNQLENBQUMsQ0FBQ0EsQ0FBQ0E7SUFDUEEsQ0FBQ0E7O0lBRUxSLGdCQUFDQTtBQUFEQSxDQW5WQSxBQW1WQ0EsSUFBQTtBQUFBLENBQUM7QUFNRixpQkFBUyxTQUFTLENBQUMiLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBQcm9taXNlIGZyb20gXCJibHVlYmlyZFwiO1xuaW1wb3J0ICogYXMgZnMgZnJvbSBcImZzXCI7XG5pbXBvcnQgKiBhcyBfIGZyb20gXCJsb2Rhc2hcIjtcbmxldCBod3Jlc3RhcnQgPSByZXF1aXJlKFwiaHdyZXN0YXJ0XCIpO1xuaW1wb3J0IFByb3ZpZGVycyA9IHJlcXVpcmUoXCJtb2JpbGUtcHJvdmlkZXJzXCIpO1xuaW1wb3J0IFdwYW1hbmFnZXIgPSByZXF1aXJlKFwid3Bhc3VwcGxpY2FudC1tYW5hZ2VyXCIpO1xuaW1wb3J0IGhvc3RhcGRzd2l0Y2ggPSByZXF1aXJlKFwiaG9zdGFwZF9zd2l0Y2hcIik7XG5pbXBvcnQgdGVzdGludGVybmV0ID0gcmVxdWlyZShcInByb21pc2UtdGVzdC1jb25uZWN0aW9uXCIpO1xuaW1wb3J0IG1lcmdlID0gcmVxdWlyZShcImpzb24tYWRkXCIpO1xuaW1wb3J0IFd2ZGlhbCA9IHJlcXVpcmUoXCJ3dmRpYWxqc1wiKTtcblxuXG5cblxubGV0IG5ldHc6IG5ldHcgPSByZXF1aXJlKFwibmV0d1wiKTtcbmxldCB2ZXJiID0gcmVxdWlyZShcInZlcmJvXCIpO1xuXG5cbmludGVyZmFjZSBuZXR3IHtcbiAgICAoKTogUHJvbWlzZTxOZXR3b3JrW10+XG59XG5cbmludGVyZmFjZSBTY2FuIHtcbiAgICBlc3NpZDogc3RyaW5nO1xuICAgIG1hYzogc3RyaW5nO1xuICAgIHNpZ25hbDogc3RyaW5nO1xufVxuXG5pbnRlcmZhY2UgTmV0d29yayB7XG4gICAgdHlwZTogc3RyaW5nO1xuICAgIG1hYzogc3RyaW5nO1xuICAgIGludGVyZmFjZTogc3RyaW5nO1xuICAgIGVzc2lkPzogc3RyaW5nO1xuICAgIHNjYW4/OiBTY2FuW107XG4gICAgaXA/OiBzdHJpbmc7XG4gICAgZ2F0ZXdheT86IHN0cmluZztcbn1cblxuXG5cblxuaW50ZXJmYWNlIElQcm92aWRlciB7XG5cbiAgICBsYWJlbD86IHN0cmluZztcbiAgICBhcG46IHN0cmluZztcbiAgICBwaG9uZT86IHN0cmluZ1xuICAgIHVzZXJuYW1lPzogc3RyaW5nO1xuICAgIHBhc3N3b3JkPzogc3RyaW5nO1xuXG59XG5cbmludGVyZmFjZSBJR2xvYmFsUHJvdmlkZXJzIHtcblxuICAgIGNvdW50cnk6IHN0cmluZztcbiAgICBwcm92aWRlcnM6IElQcm92aWRlcltdO1xufVxuXG5cbmZ1bmN0aW9uIGdldGludGVyZmEoc2V0dGVkPzogc3RyaW5nKSB7XG5cbiAgICByZXR1cm4gbmV3IFByb21pc2U8SURldmljZT4oZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIGxldCB3aWZpX2V4aXN0OiBhbnkgPSBmYWxzZTtcbiAgICAgICAgbGV0IGRldmk6IElEZXZpY2U7XG4gICAgICAgIG5ldHcoKS50aGVuKGZ1bmN0aW9uKG5ldHdvcmtzKSB7XG5cbiAgICAgICAgICAgIF8ubWFwKG5ldHdvcmtzLCBmdW5jdGlvbihkZXZpY2U6IElEZXZpY2UpIHtcblxuICAgICAgICAgICAgICAgIGlmIChkZXZpY2UudHlwZSA9PSBcIndpZmlcIiAmJiAoIXNldHRlZCB8fCBzZXR0ZWQgPT0gXCJhdXRvXCIgfHwgc2V0dGVkID09IGRldmljZS5pbnRlcmZhY2UpKSB7XG4gICAgICAgICAgICAgICAgICAgIHdpZmlfZXhpc3QgPSBkZXZpY2UuaW50ZXJmYWNlO1xuICAgICAgICAgICAgICAgICAgICBkZXZpID0gZGV2aWNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBpZiAod2lmaV9leGlzdCkge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoZGV2aSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlamVjdCh7IGVycm9yOiBcImRldmljZSBub3QgZm91bmRlZFwiIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uKGVycikge1xuICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgIH0pO1xuXG4gICAgfSk7XG5cbn1cblxuXG5mdW5jdGlvbiByZWNvdmVyeV9tb2RlKGNvbmZpZzogSUxpTmV0d29ya0NvbmYsIGRldjogc3RyaW5nLCBtb2RlPzogc3RyaW5nKSB7XG4gICAgbGV0IG06IHN0cmluZztcblxuICAgIGlmIChtb2RlKSB7XG4gICAgICAgIG0gPSBtb2RlO1xuXG4gICAgfSBlbHNlIHtcbiAgICAgICAgbSA9IFwiaG9zdFwiO1xuICAgIH1cblxuICAgIGxldCBjb25maGFwZHMgPSB7XG4gICAgICAgIGludGVyZmFjZTogZGV2LFxuICAgICAgICB3cGFzdXBwbGljYW50X3BhdGg6IGNvbmZpZy53cGFzdXBwbGljYW50X3BhdGgsXG4gICAgICAgIGhvc3RhcGQ6IGNvbmZpZy5ob3N0YXBkXG4gICAgfTtcblxuICAgIGxldCBhcHN3aXRjaCA9IG5ldyBob3N0YXBkc3dpdGNoKGNvbmZoYXBkcyk7XG5cbiAgICByZXR1cm4gbmV3IFByb21pc2U8Ym9vbGVhbj4oZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIGFwc3dpdGNoW21dKCkudGhlbihmdW5jdGlvbihhbnN3ZXIpIHtcbiAgICAgICAgICAgIHZlcmIoYW5zd2VyLCBcIndhcm5cIiwgXCJsaW5ldHdvcmsgcmVjb3ZlcnkgbW9kZVwiKTtcbiAgICAgICAgICAgIHJlc29sdmUodHJ1ZSk7XG4gICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uKGVycikge1xuICAgICAgICAgICAgdmVyYihlcnIsIFwiZXJyb3JcIiwgXCJsaW5ldHdvcmsgcmVjb3ZlcnkgbW9kZSBmYWlsZWRcIik7XG4gICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG59XG5cblxuaW50ZXJmYWNlIElEZXZpY2Uge1xuICAgIHR5cGU6IHN0cmluZztcbiAgICBpbnRlcmZhY2U6IHN0cmluZztcbn1cblxuaW50ZXJmYWNlIENsYXNzT3B0IHtcbiAgICB3aWZpX2ludGVyZmFjZT86IHN0cmluZztcbiAgICBtb2JpbGU/OiBJTW9iaWxlO1xuICAgIGhvc3RhcGQ/OiBJSG9zdGFwZGNmO1xuICAgIHdwYXN1cHBsaWNhbnRfcGF0aD86IHN0cmluZztcbn1cbmludGVyZmFjZSBJTW9iaWxlIHtcbiAgICBwcm92aWRlcjogSVByb3ZpZGVyO1xuICAgIGRldmljZT86IGFueTtcbiAgICBjb25maWdGaWxlUGF0aD86IHN0cmluZztcblxufVxuaW50ZXJmYWNlIElMaU5ldHdvcmtDb25mIHtcbiAgICB3aWZpX2ludGVyZmFjZTogc3RyaW5nO1xuICAgIG1vYmlsZT86IElNb2JpbGU7XG4gICAgaG9zdGFwZDogSUhvc3RhcGQ7XG4gICAgd3Bhc3VwcGxpY2FudF9wYXRoPzogc3RyaW5nO1xufVxuaW50ZXJmYWNlIElIb3N0YXBkIHtcbiAgICBkcml2ZXI6IHN0cmluZztcbiAgICBzc2lkOiBzdHJpbmc7XG4gICAgd3BhX3Bhc3NwaHJhc2U6IGFueTtcbn07XG5pbnRlcmZhY2UgSUhvc3RhcGRjZiB7XG4gICAgZHJpdmVyPzogc3RyaW5nO1xuICAgIHNzaWQ6IHN0cmluZztcbiAgICB3cGFfcGFzc3BocmFzZTogYW55O1xufTtcbmludGVyZmFjZSBJRG5zbWFzcSB7XG4gICAgaW50ZXJmYWNlOiBzdHJpbmc7XG59O1xuXG5pbnRlcmZhY2UgSUhDb25mIHtcbiAgICBpbnRlcmZhY2U6IHN0cmluZztcbiAgICB3cGFzdXBwbGljYW50X3BhdGg6IHN0cmluZztcbiAgICBob3N0YXBkOiBJSG9zdGFwZDtcbiAgICBkbnNtYXNxOiBJRG5zbWFzcTtcbiAgICByZWRpcmVjdDogYm9vbGVhbjtcbn07XG5cbmludGVyZmFjZSBJQ29ubmVjdGlvbiB7XG5cbiAgICBsaW5rVHlwZTogc3RyaW5nO1xuICAgIGludGVyZmFjZTogc3RyaW5nO1xuICAgIGlwPzogc3RyaW5nO1xuICAgIGdhdGV3YXk/OiBzdHJpbmc7XG5cbn1cblxuaW50ZXJmYWNlIElJbml0IHtcbiAgICBjb25lY3Rpb246IGJvb2xlYW47XG4gICAgcmVjb3Zlcnk6IGJvb2xlYW47XG4gICAgZGV0YWlscz86IElDb25uZWN0aW9uO1xufVxuXG5sZXQgY29uZmlnOiBJTGlOZXR3b3JrQ29uZiA9IHtcbiAgICBob3N0YXBkOiB7XG4gICAgICAgIGRyaXZlcjogXCJubDgwMjExXCIsXG4gICAgICAgIHNzaWQ6IFwidGVzdHR0YXBcIixcbiAgICAgICAgd3BhX3Bhc3NwaHJhc2U6IFwidGVzdHBhc3NcIlxuICAgIH0sXG4gICAgd2lmaV9pbnRlcmZhY2U6IFwiYXV0b1wiLFxuICAgIHdwYXN1cHBsaWNhbnRfcGF0aDogXCIvZXRjL3dwYV9zdXBwbGljYW50L3dwYV9zdXBwbGljYW50LmNvbmZcIlxufTtcblxuXG5jbGFzcyBMaU5ldHdvcmsge1xuICAgIGxpY29uZmlnOiBJTGlOZXR3b3JrQ29uZjtcbiAgICBob3N0YXBkOiBJSENvbmY7XG4gICAgbW9iaWxlO1xuICAgIG1vZGU6IHN0cmluZztcblxuXG4gICAgY29uc3RydWN0b3IoZGF0YSkge1xuXG4gICAgICAgIG1lcmdlKGNvbmZpZywgZGF0YSk7XG5cblxuICAgICAgICB0aGlzLmxpY29uZmlnID0gY29uZmlnO1xuXG5cbiAgICAgICAgaWYgKHRoaXMubGljb25maWcubW9iaWxlKSB7XG4gICAgICAgICAgICBpZiAoIXRoaXMubGljb25maWcubW9iaWxlLmNvbmZpZ0ZpbGVQYXRoKSB0aGlzLmxpY29uZmlnLm1vYmlsZS5jb25maWdGaWxlUGF0aCA9IFwiL2V0Yy93dmRpYWwuY29uZlwiO1xuICAgICAgICAgICAgbGV0IFd2ID0gbmV3IFd2ZGlhbCh0aGlzLmxpY29uZmlnLm1vYmlsZSlcbiAgICAgICAgICAgIHRoaXMubW9iaWxlID0gV3ZcbiAgICAgICAgfVxuXG5cblxuXG5cblxuICAgIH1cbiAgICBtb2JpbGVjb25uZWN0KGJvb2wpIHtcbiAgICAgICAgbGV0IFd2ID0gdGhpcy5tb2JpbGU7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTxib29sZWFuPihmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgIFd2LmNvbmZpZ3VyZShib29sKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIFd2LmNvbm5lY3QodHJ1ZSkudGhlbihmdW5jdGlvbigpIHtcblxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIm1vZGVtIHN0YXJ0ZWRcIik7XG5cbiAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJtb2RlbSBlcnJvclwiKTtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG5cblxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSlcblxuXG5cblxuICAgICAgICB9KTtcblxuICAgIH07XG4gICAgbmV0d29ya3MoKSB7XG5cbiAgICAgICAgcmV0dXJuIG5ldHcoKTtcblxuICAgIH1cblxuICAgIHdwYW1hbmFnZXIoKSB7XG4gICAgICAgIGxldCBwYXRoID0gdGhpcy5saWNvbmZpZy53cGFzdXBwbGljYW50X3BhdGg7XG4gICAgICAgIHJldHVybiBuZXcgV3BhbWFuYWdlcihwYXRoKTtcblxuICAgIH1cblxuXG4gICAgbW9iaWxlcHJvdmlkZXJzKCkge1xuXG4gICAgICAgIHJldHVybiBuZXcgUHJvdmlkZXJzKClcblxuICAgIH1cblxuICAgIHdpZmlfc3dpdGNoKG1vZGU6IHN0cmluZywgZGV2Pzogc3RyaW5nKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKG1vZGUsIGRldik7XG4gICAgICAgIGlmIChkZXYgfHwgdGhpcy5saWNvbmZpZy53aWZpX2ludGVyZmFjZSAhPSBcImF1dG9cIikge1xuICAgICAgICAgICAgaWYgKGRldikge1xuICAgICAgICAgICAgICAgIHZhciBhcHN3aXRjaCA9IG5ldyBob3N0YXBkc3dpdGNoKFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbnRlcmZhY2U6IGRldixcbiAgICAgICAgICAgICAgICAgICAgICAgIHdwYXN1cHBsaWNhbnRfcGF0aDogY29uZmlnLndwYXN1cHBsaWNhbnRfcGF0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGhvc3RhcGQ6IHRoaXMuaG9zdGFwZFxuXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YXIgYXBzd2l0Y2ggPSBuZXcgaG9zdGFwZHN3aXRjaChcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgaW50ZXJmYWNlOiB0aGlzLmxpY29uZmlnLndpZmlfaW50ZXJmYWNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgd3Bhc3VwcGxpY2FudF9wYXRoOiBjb25maWcud3Bhc3VwcGxpY2FudF9wYXRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgaG9zdGFwZDogdGhpcy5ob3N0YXBkXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJkZXYgbW9kZVwiKTtcbiAgICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTxib29sZWFuPihmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKG1vZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcImFwXCI6XG4gICAgICAgICAgICAgICAgICAgICAgICBhcHN3aXRjaC5hcCgpLnRoZW4oZnVuY3Rpb24oYW5zd2VyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgICAgICBjYXNlIFwiaG9zdFwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgYXBzd2l0Y2guaG9zdCgpLnRoZW4oZnVuY3Rpb24oYW5zd2VyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgICAgICBjYXNlIFwiY2xpZW50XCI6XG4gICAgICAgICAgICAgICAgICAgICAgICBhcHN3aXRjaC5jbGllbnQoKS50aGVuKGZ1bmN0aW9uKGFuc3dlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJhdXRvIG1vZGVcIik7XG4gICAgICAgICAgICB2YXIgY29uZmlnID0gdGhpcy5saWNvbmZpZztcbiAgICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgICAgICBuZXR3KCkudGhlbihmdW5jdGlvbihuZXR3b3Jrcykge1xuXG4gICAgICAgICAgICAgICAgICAgIF8ubWFwKG5ldHdvcmtzLCBmdW5jdGlvbihkZXZpY2U6IElEZXZpY2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkZXZpY2UudHlwZSA9PSBcIndpZmlcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRldiA9IGRldmljZS5pbnRlcmZhY2U7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZGV2KSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBhcHN3aXRjaCA9IG5ldyBob3N0YXBkc3dpdGNoKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW50ZXJmYWNlOiBkZXYsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhvc3RhcGQ6IGNvbmZpZy5ob3N0YXBkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3cGFzdXBwbGljYW50X3BhdGg6IGNvbmZpZy53cGFzdXBwbGljYW50X3BhdGhcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhhcHN3aXRjaCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHN3aXRjaCAobW9kZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgXCJhcFwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcHN3aXRjaC5hcCgpLnRoZW4oZnVuY3Rpb24oYW5zd2VyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFwiaG9zdFwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcHN3aXRjaC5ob3N0KCkudGhlbihmdW5jdGlvbihhbnN3ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgXCJjbGllbnRcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXBzd2l0Y2guY2xpZW50KCkudGhlbihmdW5jdGlvbihhbnN3ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KHsgZXJyb3I6IFwibm8gZGV2XCIgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG5cblxuICAgIGNvbm5lY3Rpb24ocmVjb3Zlcnk/OiBib29sZWFuKSB7XG4gICAgICAgIGxldCBtb2RlID0gdGhpcy5tb2RlO1xuICAgICAgICBsZXQgY29uZmlnID0gdGhpcy5saWNvbmZpZztcbiAgICAgICAgbGV0IFd2ID0gdGhpcy5tb2JpbGU7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTxJSW5pdD4oZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICB2ZXJiKGNvbmZpZywgXCJkZWJ1Z1wiLCBcIlRyeW5nIHRvIGNvbm5lY3RcIik7XG5cbiAgICAgICAgICAgIGlmIChtb2RlID09IFwibW9iaWxlLWF1dG9cIikge1xuICAgICAgICAgICAgICAgIHJlamVjdChcImF1dG8gbW9kZVwiKVxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwid3YgcnVubmluZywgbm90aGluZyB0byBkb1wiKVxuICAgICAgICAgICAgfSBlbHNlIHtcblxuXG5cblxuICAgICAgICAgICAgICAgIGdldGludGVyZmEoY29uZmlnLndpZmlfaW50ZXJmYWNlKS50aGVuKGZ1bmN0aW9uKGludGVyZjogSURldmljZSkge1xuXG4gICAgICAgICAgICAgICAgICAgIGxldCB3aWZpX2V4aXN0OiBzdHJpbmcgPSBpbnRlcmYuaW50ZXJmYWNlO1xuXG4gICAgICAgICAgICAgICAgICAgIGxldCBjb25maGFwZHMgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbnRlcmZhY2U6IHdpZmlfZXhpc3QsXG4gICAgICAgICAgICAgICAgICAgICAgICB3cGFzdXBwbGljYW50X3BhdGg6IGNvbmZpZy53cGFzdXBwbGljYW50X3BhdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICBob3N0YXBkOiBjb25maWcuaG9zdGFwZFxuICAgICAgICAgICAgICAgICAgICB9O1xuXG5cblxuICAgICAgICAgICAgICAgICAgICBpZiAoY29uZmlnLm1vYmlsZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlY292ZXJ5ICYmIHdpZmlfZXhpc3QpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcInJlY292ZXJpbmdcIilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWNvdmVyeV9tb2RlKGNvbmZpZywgd2lmaV9leGlzdClcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAod2lmaV9leGlzdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBhcHN3aXRjaCA9IG5ldyBob3N0YXBkc3dpdGNoKGNvbmZoYXBkcywgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXBzd2l0Y2guY2xpZW50KHRydWUpLnRoZW4oZnVuY3Rpb24oYW5zd2VyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwid2lmaWNsaWVudCBjb25uZWN0ZWQgXCIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24oZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwid2lmaWNsaWVudCBubyBjb25uZWN0aW9uXCIgKyBlcnIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFd2LmNvbmZpZ3VyZSgpLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1vZGUgPSBcIm1vYmlsZS1hdXRvXCI7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwibW9kZW0gc3RhcnRlZFwiKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBXdi5jb25uZWN0KHRydWUpLnRoZW4oZnVuY3Rpb24oYSkge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBod3Jlc3RhcnQoXCJ1bnBsdWdcIilcblxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJtb2RlbSBlcnJvclwiKVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBod3Jlc3RhcnQoXCJ1bnBsdWdcIilcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGUpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwibW9kZW0gZXJyb3JcIilcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBod3Jlc3RhcnQoXCJ1bnBsdWdcIilcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG5cblxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICh3aWZpX2V4aXN0KSB7XG5cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZlcmIod2lmaV9leGlzdCwgXCJpbmZvXCIsIFwiV2xhbiBpbnRlcmZhY2UgZm91bmRlZFwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgYXBzd2l0Y2ggPSBuZXcgaG9zdGFwZHN3aXRjaChjb25maGFwZHMsIHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFwc3dpdGNoLmNsaWVudCh0cnVlKS50aGVuKGZ1bmN0aW9uKGFuc3dlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHsgY29uZWN0aW9uOiB0cnVlLCByZWNvdmVyeTogZmFsc2UgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24oZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZWNvdmVyeSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVjb3ZlcnlfbW9kZShjb25maWcsIHdpZmlfZXhpc3QpLnRoZW4oZnVuY3Rpb24oYW5zd2VyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmVyYihhbnN3ZXIsIFwiaW5mb1wiLCBcIko1IHJlY292ZXJ5IG1vZGUgc3RhcnRcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2ZXJiKGVyciwgXCJlcnJvclwiLCBcIko1IHJlY292ZXJ5IG1vZGUgc3RhcnRcIik7XG5cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcblxuXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgfVxuXG5cblxuICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uKGVycikge1xuXG4gICAgICAgICAgICAgICAgICAgIHZlcmIoXCJubyB3aWZpXCIsIFwid2FyblwiLCBcIm5ldHdvcmtlclwiKTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoY29uZmlnLm1vYmlsZSkge1xuXG5cblxuICAgICAgICAgICAgICAgICAgICAgICAgV3YuY29uZmlndXJlKCkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtb2RlID0gXCJtb2JpbGUtYXV0b1wiO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFd2LmNvbm5lY3QodHJ1ZSkudGhlbihmdW5jdGlvbihhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGEpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGh3cmVzdGFydChcInVucGx1Z1wiKVxuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGUpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwibW9kZW0gZXJyb3JcIilcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBod3Jlc3RhcnQoXCJ1bnBsdWdcIilcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGUpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJtb2RlbSBlcnJvclwiKVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaHdyZXN0YXJ0KFwidW5wbHVnXCIpXG5cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG5cblxuXG5cblxuXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpXG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBFcnJvcihcIk9PT0hcIilcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIH1cblxuXG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICByZWNvdmVyeShtb2RlPzogc3RyaW5nKSB7XG4gICAgICAgIGxldCBjb25maWcgPSB0aGlzLmxpY29uZmlnO1xuXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgIGdldGludGVyZmEoY29uZmlnLndpZmlfaW50ZXJmYWNlKS50aGVuKGZ1bmN0aW9uKGludGVyZjogSURldmljZSkge1xuICAgICAgICAgICAgICAgIGxldCB3aWZpX2V4aXN0OiBzdHJpbmcgPSBpbnRlcmYuaW50ZXJmYWNlO1xuICAgICAgICAgICAgICAgIHJlY292ZXJ5X21vZGUoY29uZmlnLCB3aWZpX2V4aXN0LCBtb2RlKS50aGVuKGZ1bmN0aW9uKGFuc3dlcikge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGFuc3dlcik7XG4gICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24oZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24oZXJyKSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxufTtcblxuXG5cblxuXG5leHBvcnQgPSBMaU5ldHdvcms7Il0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
