var hostapdswitch = require("hostapd_switch");
var Promise = require("bluebird");
var fs = require("fs");
var _ = require("lodash");
var testinternet = require("promise-test-connection");
var merge = require("json-add");
var netw = require("netw");
var LMC = require("linux-mobile-connection");
var mobileconnect = require("linux-mobile-connection");
var verb = require("verbo");
function getinterfa(setted) {
    return new Promise(function (resolve, reject) {
        var wifi_exist = false;
        var devi;
        netw().then(function (net) {
            _.map(net.networks, function (device) {
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
        hostapd: config.hostapd
    };
    var apswitch = new hostapdswitch(confhapds);
    return new Promise(function (resolve, reject) {
        apswitch[m]().then(function (answer) {
            verb(answer, "warn", "linetwork recovery mode");
            resolve(answer);
        }).catch(function (err) {
            verb(err, "error", "linetwork recovery mode failed");
            reject(err);
        });
    });
}
var config = {
    recovery: true,
    port: 4000,
    hostapd: {
        driver: "nl80211",
        ssid: "testttap",
        wpa_passphrase: "testpass"
    },
    recovery_interface: "auto"
};
module.exports = (function () {
    function LiNetwork(data) {
        this.data = data;
        this.mobileconnect = function () {
            return new Promise(function (resolve, reject) {
                if (this.config.mobile) {
                    LMC(this.config.mobile.provider, this.config.mobile.options).then(function (answer) {
                        resolve(answer);
                    }).catch(function (err) {
                        verb(err, "error", "J5 linuxmobile");
                        reject(err);
                    });
                }
                else {
                    reject({ error: "no mobile configuration provided" });
                }
            });
        };
        this.wifi_switch = function (mode, dev) {
            console.log(mode, dev);
            if (dev || this.config.recovery_interface != "auto") {
                if (dev) {
                    var apswitch = new hostapdswitch({
                        interface: dev,
                        hostapd: this.hostapd
                    });
                }
                else {
                    var apswitch = new hostapdswitch({
                        interface: this.config.recovery_interface,
                        hostapd: this.hostapd
                    });
                }
                console.log("dev mode");
                return new Promise(function (resolve, reject) {
                    switch (mode) {
                        case "ap":
                            apswitch.ap().then(function (answer) {
                                resolve(answer);
                            }).catch(function (err) {
                                reject(err);
                            });
                            break;
                        case "host":
                            apswitch.host().then(function (answer) {
                                resolve(answer);
                            }).catch(function (err) {
                                reject(err);
                            });
                            break;
                        case "client":
                            apswitch.client().then(function (answer) {
                                resolve(answer);
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
                var config = this.config;
                return new Promise(function (resolve, reject) {
                    netw().then(function (data) {
                        console.log(data);
                        _.map(data.networks, function (device) {
                            if (device.type == "wifi") {
                                dev = device.interface;
                            }
                        });
                        if (dev) {
                            var apswitch = new hostapdswitch({
                                interface: dev,
                                hostapd: config.hostapd
                            });
                            console.log(apswitch);
                            switch (mode) {
                                case "ap":
                                    apswitch.ap().then(function (answer) {
                                        resolve(answer);
                                    }).catch(function (err) {
                                        reject(err);
                                    });
                                    break;
                                case "host":
                                    apswitch.host().then(function (answer) {
                                        resolve(answer);
                                    }).catch(function (err) {
                                        reject(err);
                                    });
                                    break;
                                case "client":
                                    apswitch.client().then(function (answer) {
                                        resolve(answer);
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
        this.mproviders = function () {
            return JSON.parse(fs.readFileSync(__dirname + "/node_modules/linux-mobile-connection/node_modules/wvdialjs/providers.json", "utf-8"));
        };
        this.init = function () {
            var config = this.config;
            return new Promise(function (resolve, reject) {
                verb(config, "debug", "Tryng to connect");
                testinternet().then(function () {
                    resolve({ connected: true });
                }).catch(function () {
                    getinterfa(config.recovery_interface).then(function (interf) {
                        var wifi_exist = interf.interface;
                        var confhapds = {
                            interface: wifi_exist,
                            hostapd: config.hostapd
                        };
                        verb(wifi_exist, "info", "Wlan interface founded");
                        var apswitch = new hostapdswitch(confhapds);
                        apswitch.client(true, true).then(function (answer) {
                            resolve(answer);
                        }).catch(function (err) {
                            if (config.mobile) {
                                LMC(config.mobile.provider, config.mobile.options).then(function (answer) {
                                    resolve(answer);
                                }).catch(function () {
                                    if (config.recovery) {
                                        recovery_mode(config, wifi_exist).then(function (answer) {
                                            resolve(answer);
                                        }).catch(function (err) {
                                            verb(err, "error", "J5 recovery mode start");
                                            reject(err);
                                        });
                                    }
                                    else {
                                        reject("no wlan host available");
                                    }
                                });
                            }
                            else if (config.recovery) {
                                recovery_mode(config, wifi_exist).then(function (answer) {
                                    resolve(answer);
                                }).catch(function (err) {
                                    verb(err, "error", "J5 recovery mode start");
                                    reject(err);
                                });
                            }
                        });
                    }).catch(function (err) {
                        verb("no wifi", "warn", "networker");
                        if (config.mobile) {
                            LMC(config.mobile.provider, config.mobile.options).then(function (answer) {
                                resolve(answer);
                            }).catch(function (err) {
                                verb(err, "error", "J5 linuxmobile");
                                reject(err);
                            });
                        }
                    });
                });
            });
        };
        this.recovery = function (mode) {
            var config = this.config;
            return new Promise(function (resolve, reject) {
                getinterfa(config.recovery_interface).then(function (interf) {
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
        merge(config, data);
        this.config = config;
    }
    return LiNetwork;
})();

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluZGV4LnRzIl0sIm5hbWVzIjpbImdldGludGVyZmEiLCJyZWNvdmVyeV9tb2RlIiwiY29uc3RydWN0b3IiXSwibWFwcGluZ3MiOiJBQUFBLElBQU8sYUFBYSxXQUFXLGdCQUFnQixDQUFDLENBQUM7QUFDakQsSUFBWSxPQUFPLFdBQU0sVUFBVSxDQUFDLENBQUE7QUFDcEMsSUFBWSxFQUFFLFdBQU0sSUFBSSxDQUFDLENBQUE7QUFDekIsSUFBWSxDQUFDLFdBQU0sUUFBUSxDQUFDLENBQUE7QUFDNUIsSUFBTyxZQUFZLFdBQVcseUJBQXlCLENBQUMsQ0FBQztBQUN6RCxJQUFPLEtBQUssV0FBVyxVQUFVLENBQUMsQ0FBQztBQUNuQyxJQUFJLElBQUksR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDM0IsSUFBSSxHQUFHLEdBQUcsT0FBTyxDQUFDLHlCQUF5QixDQUFDLENBQUM7QUFDN0MsSUFBSSxhQUFhLEdBQUcsT0FBTyxDQUFDLHlCQUF5QixDQUFDLENBQUM7QUFDdkQsSUFBSSxJQUFJLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBRzVCLG9CQUFvQixNQUFlO0lBRS9CQSxNQUFNQSxDQUFDQSxJQUFJQSxPQUFPQSxDQUFDQSxVQUFTQSxPQUFPQSxFQUFFQSxNQUFNQTtRQUN2QyxJQUFJLFVBQVUsR0FBUSxLQUFLLENBQUM7UUFDNUIsSUFBSSxJQUFhLENBQUM7UUFDbEIsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQVMsR0FBRztZQUVwQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsVUFBUyxNQUFlO2dCQUV4QyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxJQUFJLE1BQU0sSUFBSSxDQUFDLENBQUMsTUFBTSxJQUFJLE1BQU0sSUFBSSxNQUFNLElBQUksTUFBTSxJQUFJLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ3ZGLFVBQVUsR0FBRyxNQUFNLENBQUMs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SUFBSSxPQUFPLENBQUMsVUFBUyxPQUFPLEVBQUUsTUFBTTtnQkFDdkMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFTLE1BQWU7b0JBQy9ELElBQUksVUFBVSxHQUFXLE1BQU0sQ0FBQyxTQUFTLENBQUM7b0JBQzFDLGFBQWEsQ0FBQyxNQUFNLEVBQUUsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFTLE1BQU07d0JBQ3hELE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztvQkFDcEIsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVMsR0FBRzt3QkFDakIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUNoQixDQUFDLENBQUMsQ0FBQztnQkFDUCxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBUyxHQUFHO29CQUNqQixNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ2hCLENBQUMsQ0FBQyxDQUFDO1lBQ1AsQ0FBQyxDQUFDLENBQUM7UUFDUCxDQUFDLENBQUNBO1FBM05FQSxLQUFLQSxDQUFDQSxNQUFNQSxFQUFFQSxJQUFJQSxDQUFDQSxDQUFDQTtRQUNwQkEsSUFBSUEsQ0FBQ0EsTUFBTUEsR0FBR0EsTUFBTUEsQ0FBQ0E7SUFDekJBLENBQUNBO0lBMk5MLGdCQUFDO0FBQUQsQ0FoT1EsQUFnT1AsR0FBQSxDQUFDIiwiZmlsZSI6ImluZGV4LmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGhvc3RhcGRzd2l0Y2ggPSByZXF1aXJlKFwiaG9zdGFwZF9zd2l0Y2hcIik7XG5pbXBvcnQgKiBhcyBQcm9taXNlIGZyb20gXCJibHVlYmlyZFwiO1xuaW1wb3J0ICogYXMgZnMgZnJvbSBcImZzXCI7XG5pbXBvcnQgKiBhcyBfIGZyb20gXCJsb2Rhc2hcIjtcbmltcG9ydCB0ZXN0aW50ZXJuZXQgPSByZXF1aXJlKFwicHJvbWlzZS10ZXN0LWNvbm5lY3Rpb25cIik7XG5pbXBvcnQgbWVyZ2UgPSByZXF1aXJlKFwianNvbi1hZGRcIik7XG5sZXQgbmV0dyA9IHJlcXVpcmUoXCJuZXR3XCIpO1xubGV0IExNQyA9IHJlcXVpcmUoXCJsaW51eC1tb2JpbGUtY29ubmVjdGlvblwiKTtcbmxldCBtb2JpbGVjb25uZWN0ID0gcmVxdWlyZShcImxpbnV4LW1vYmlsZS1jb25uZWN0aW9uXCIpO1xubGV0IHZlcmIgPSByZXF1aXJlKFwidmVyYm9cIik7XG5cblxuZnVuY3Rpb24gZ2V0aW50ZXJmYShzZXR0ZWQ/OiBzdHJpbmcpIHtcblxuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgbGV0IHdpZmlfZXhpc3Q6IGFueSA9IGZhbHNlO1xuICAgICAgICBsZXQgZGV2aTogSURldmljZTtcbiAgICAgICAgbmV0dygpLnRoZW4oZnVuY3Rpb24obmV0KSB7XG5cbiAgICAgICAgICAgIF8ubWFwKG5ldC5uZXR3b3JrcywgZnVuY3Rpb24oZGV2aWNlOiBJRGV2aWNlKSB7XG5cbiAgICAgICAgICAgICAgICBpZiAoZGV2aWNlLnR5cGUgPT0gXCJ3aWZpXCIgJiYgKCFzZXR0ZWQgfHwgc2V0dGVkID09IFwiYXV0b1wiIHx8IHNldHRlZCA9PSBkZXZpY2UuaW50ZXJmYWNlKSkge1xuICAgICAgICAgICAgICAgICAgICB3aWZpX2V4aXN0ID0gZGV2aWNlLmludGVyZmFjZTtcbiAgICAgICAgICAgICAgICAgICAgZGV2aSA9IGRldmljZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgaWYgKHdpZmlfZXhpc3QpIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKGRldmkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZWplY3QoeyBlcnJvcjogXCJkZXZpY2Ugbm90IGZvdW5kZWRcIiB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9KS5jYXRjaChmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICB9KTtcblxuICAgIH0pO1xuXG59XG5cblxuZnVuY3Rpb24gcmVjb3ZlcnlfbW9kZShjb25maWc6IElMaU5ldHdvcmtDb25mLCBkZXY6IHN0cmluZywgbW9kZT86IHN0cmluZykge1xuICAgIGxldCBtOiBzdHJpbmc7XG5cbiAgICBpZiAobW9kZSkge1xuICAgICAgICBtID0gbW9kZTtcblxuICAgIH0gZWxzZSB7XG4gICAgICAgIG0gPSBcImhvc3RcIjtcbiAgICB9XG5cbiAgICBsZXQgY29uZmhhcGRzID0ge1xuICAgICAgICBpbnRlcmZhY2U6IGRldixcbiAgICAgICAgaG9zdGFwZDogY29uZmlnLmhvc3RhcGRcbiAgICB9O1xuXG4gICAgbGV0IGFwc3dpdGNoID0gbmV3IGhvc3RhcGRzd2l0Y2goY29uZmhhcGRzKTtcblxuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgYXBzd2l0Y2hbbV0oKS50aGVuKGZ1bmN0aW9uKGFuc3dlcikge1xuICAgICAgICAgICAgdmVyYihhbnN3ZXIsIFwid2FyblwiLCBcImxpbmV0d29yayByZWNvdmVyeSBtb2RlXCIpO1xuICAgICAgICAgICAgcmVzb2x2ZShhbnN3ZXIpO1xuICAgICAgICB9KS5jYXRjaChmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgICAgIHZlcmIoZXJyLCBcImVycm9yXCIsIFwibGluZXR3b3JrIHJlY292ZXJ5IG1vZGUgZmFpbGVkXCIpO1xuICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgIH0pO1xuICAgIH0pO1xufVxuXG5cbmludGVyZmFjZSBJRGV2aWNlIHtcbiAgICB0eXBlOiBzdHJpbmc7XG4gICAgaW50ZXJmYWNlOiBzdHJpbmc7XG59XG5cbmludGVyZmFjZSBDbGFzc09wdCB7XG4gICAgcmVjb3Zlcnk/OiBib29sZWFuO1xuICAgIHBvcnQ/OiBudW1iZXI7XG4gICAgcmVjb3ZlcnlfaW50ZXJmYWNlPzogc3RyaW5nO1xufVxuaW50ZXJmYWNlIElNb2JpbGUge1xuICAgIHByb3ZpZGVyPzoge1xuXG4gICAgfTtcbiAgICBvcHRpb25zPzoge1xuICAgIH07XG59XG5pbnRlcmZhY2UgSUxpTmV0d29ya0NvbmYge1xuICAgIHJlY292ZXJ5OiBib29sZWFuO1xuICAgIHBvcnQ6IG51bWJlcjtcbiAgICByZWNvdmVyeV9pbnRlcmZhY2U6IHN0cmluZztcbiAgICBtb2JpbGU/OiBJTW9iaWxlO1xuICAgIGhvc3RhcGQ6IHtcbiAgICAgICAgZHJpdmVyOiBzdHJpbmcsXG4gICAgICAgIHNzaWQ6IHN0cmluZyxcbiAgICAgICAgd3BhX3Bhc3NwaHJhc2U6IHN0cmluZyxcbiAgICB9O1xufVxuXG5sZXQgY29uZmlnOiBJTGlOZXR3b3JrQ29uZiA9IHtcbiAgICByZWNvdmVyeTogdHJ1ZSxcbiAgICBwb3J0OiA0MDAwLCAvLyBpbiBtb2RhbGl0w6AgcmVndWxhciBzZXR0YSBsYSBwb3J0YSBwZXIgaWwgbWFuYWdlclxuICAgIC8vIHdwYV9zdXBwbGljYW50X3BhdGg6Jy9ldGMvd3BhX3N1cHBsaWNhbnQvd3BhX3N1cHBsaWNhbnQuY29uZicsXG4gICAgaG9zdGFwZDoge1xuICAgICAgICBkcml2ZXI6IFwibmw4MDIxMVwiLFxuICAgICAgICBzc2lkOiBcInRlc3R0dGFwXCIsXG4gICAgICAgIHdwYV9wYXNzcGhyYXNlOiBcInRlc3RwYXNzXCJcbiAgICB9LFxuICAgIHJlY292ZXJ5X2ludGVyZmFjZTogXCJhdXRvXCJcbn07XG5cblxuZXhwb3J0ID1jbGFzcyBMaU5ldHdvcmsge1xuICAgIGNvbmZpZzogSUxpTmV0d29ya0NvbmY7XG4gICAgY29uc3RydWN0b3IocHVibGljIGRhdGE/OiBDbGFzc09wdCkge1xuICAgICAgICBtZXJnZShjb25maWcsIGRhdGEpO1xuICAgICAgICB0aGlzLmNvbmZpZyA9IGNvbmZpZztcbiAgICB9XG4gICAgbW9iaWxlY29ubmVjdCA9IGZ1bmN0aW9uKCkge1xuXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmNvbmZpZy5tb2JpbGUpIHtcblxuICAgICAgICAgICAgICAgIExNQyh0aGlzLmNvbmZpZy5tb2JpbGUucHJvdmlkZXIsIHRoaXMuY29uZmlnLm1vYmlsZS5vcHRpb25zKS50aGVuKGZ1bmN0aW9uKGFuc3dlcikge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGFuc3dlcik7XG4gICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24oZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIHZlcmIoZXJyLCBcImVycm9yXCIsIFwiSjUgbGludXhtb2JpbGVcIik7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlamVjdCh7IGVycm9yOiBcIm5vIG1vYmlsZSBjb25maWd1cmF0aW9uIHByb3ZpZGVkXCIgfSk7XG4gICAgICAgICAgICB9XG5cblxuICAgICAgICB9KTtcblxuICAgIH07XG5cbiAgICB3aWZpX3N3aXRjaCA9IGZ1bmN0aW9uKG1vZGU6IHN0cmluZywgZGV2Pzogc3RyaW5nKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKG1vZGUsIGRldik7XG4gICAgICAgIGlmIChkZXYgfHwgdGhpcy5jb25maWcucmVjb3ZlcnlfaW50ZXJmYWNlICE9IFwiYXV0b1wiKSB7XG4gICAgICAgICAgICBpZiAoZGV2KSB7XG4gICAgICAgICAgICAgICAgdmFyIGFwc3dpdGNoID0gbmV3IGhvc3RhcGRzd2l0Y2goXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGludGVyZmFjZTogZGV2LFxuICAgICAgICAgICAgICAgICAgICAgICAgaG9zdGFwZDogdGhpcy5ob3N0YXBkXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YXIgYXBzd2l0Y2ggPSBuZXcgaG9zdGFwZHN3aXRjaChcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgaW50ZXJmYWNlOiB0aGlzLmNvbmZpZy5yZWNvdmVyeV9pbnRlcmZhY2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBob3N0YXBkOiB0aGlzLmhvc3RhcGRcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImRldiBtb2RlXCIpO1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgICAgICAgIHN3aXRjaCAobW9kZSkge1xuICAgICAgICAgICAgICAgICAgICBjYXNlIFwiYXBcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgIGFwc3dpdGNoLmFwKCkudGhlbihmdW5jdGlvbihhbnN3ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGFuc3dlcik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcImhvc3RcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgIGFwc3dpdGNoLmhvc3QoKS50aGVuKGZ1bmN0aW9uKGFuc3dlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoYW5zd2VyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgICAgICBjYXNlIFwiY2xpZW50XCI6XG4gICAgICAgICAgICAgICAgICAgICAgICBhcHN3aXRjaC5jbGllbnQoKS50aGVuKGZ1bmN0aW9uKGFuc3dlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoYW5zd2VyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImF1dG8gbW9kZVwiKTtcbiAgICAgICAgICAgIHZhciBjb25maWcgPSB0aGlzLmNvbmZpZztcbiAgICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgICAgICBuZXR3KCkudGhlbihmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xuICAgICAgICAgICAgICAgICAgICBfLm1hcChkYXRhLm5ldHdvcmtzLCBmdW5jdGlvbihkZXZpY2U6IElEZXZpY2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkZXZpY2UudHlwZSA9PSBcIndpZmlcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRldiA9IGRldmljZS5pbnRlcmZhY2U7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZGV2KSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBhcHN3aXRjaCA9IG5ldyBob3N0YXBkc3dpdGNoKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW50ZXJmYWNlOiBkZXYsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhvc3RhcGQ6IGNvbmZpZy5ob3N0YXBkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYXBzd2l0Y2gpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKG1vZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFwiYXBcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXBzd2l0Y2guYXAoKS50aGVuKGZ1bmN0aW9uKGFuc3dlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShhbnN3ZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFwiaG9zdFwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcHN3aXRjaC5ob3N0KCkudGhlbihmdW5jdGlvbihhbnN3ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoYW5zd2VyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24oZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBcImNsaWVudFwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcHN3aXRjaC5jbGllbnQoKS50aGVuKGZ1bmN0aW9uKGFuc3dlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShhbnN3ZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdCh7IGVycm9yOiBcIm5vIGRldlwiIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24oZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgbXByb3ZpZGVycyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMoX19kaXJuYW1lICsgXCIvbm9kZV9tb2R1bGVzL2xpbnV4LW1vYmlsZS1jb25uZWN0aW9uL25vZGVfbW9kdWxlcy93dmRpYWxqcy9wcm92aWRlcnMuanNvblwiLCBcInV0Zi04XCIpKTtcbiAgICB9O1xuXG4gICAgaW5pdCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBsZXQgY29uZmlnOiBJTGlOZXR3b3JrQ29uZiA9IHRoaXMuY29uZmlnO1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICB2ZXJiKGNvbmZpZywgXCJkZWJ1Z1wiLCBcIlRyeW5nIHRvIGNvbm5lY3RcIik7XG5cblxuICAgICAgICAgICAgdGVzdGludGVybmV0KCkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHsgY29ubmVjdGVkOiB0cnVlIH0pO1xuICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24oKSB7XG5cblxuICAgICAgICAgICAgICAgIGdldGludGVyZmEoY29uZmlnLnJlY292ZXJ5X2ludGVyZmFjZSkudGhlbihmdW5jdGlvbihpbnRlcmY6IElEZXZpY2UpIHtcblxuICAgICAgICAgICAgICAgICAgICBsZXQgd2lmaV9leGlzdDogc3RyaW5nID0gaW50ZXJmLmludGVyZmFjZTtcblxuICAgICAgICAgICAgICAgICAgICBsZXQgY29uZmhhcGRzID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaW50ZXJmYWNlOiB3aWZpX2V4aXN0LFxuICAgICAgICAgICAgICAgICAgICAgICAgaG9zdGFwZDogY29uZmlnLmhvc3RhcGRcbiAgICAgICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgICAgICB2ZXJiKHdpZmlfZXhpc3QsIFwiaW5mb1wiLCBcIldsYW4gaW50ZXJmYWNlIGZvdW5kZWRcIik7XG4gICAgICAgICAgICAgICAgICAgIGxldCBhcHN3aXRjaCA9IG5ldyBob3N0YXBkc3dpdGNoKGNvbmZoYXBkcyk7XG4gICAgICAgICAgICAgICAgICAgIGFwc3dpdGNoLmNsaWVudCh0cnVlLCB0cnVlKS50aGVuKGZ1bmN0aW9uKGFuc3dlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShhbnN3ZXIpO1xuICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb25maWcubW9iaWxlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgTE1DKGNvbmZpZy5tb2JpbGUucHJvdmlkZXIsIGNvbmZpZy5tb2JpbGUub3B0aW9ucykudGhlbihmdW5jdGlvbihhbnN3ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShhbnN3ZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY29uZmlnLnJlY292ZXJ5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWNvdmVyeV9tb2RlKGNvbmZpZywgd2lmaV9leGlzdCkudGhlbihmdW5jdGlvbihhbnN3ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGFuc3dlcik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2ZXJiKGVyciwgXCJlcnJvclwiLCBcIko1IHJlY292ZXJ5IG1vZGUgc3RhcnRcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChcIm5vIHdsYW4gaG9zdCBhdmFpbGFibGVcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY29uZmlnLnJlY292ZXJ5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVjb3ZlcnlfbW9kZShjb25maWcsIHdpZmlfZXhpc3QpLnRoZW4oZnVuY3Rpb24oYW5zd2VyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoYW5zd2VyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmVyYihlcnIsIFwiZXJyb3JcIiwgXCJKNSByZWNvdmVyeSBtb2RlIHN0YXJ0XCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24oZXJyKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgdmVyYihcIm5vIHdpZmlcIiwgXCJ3YXJuXCIsIFwibmV0d29ya2VyXCIpO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChjb25maWcubW9iaWxlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBMTUMoY29uZmlnLm1vYmlsZS5wcm92aWRlciwgY29uZmlnLm1vYmlsZS5vcHRpb25zKS50aGVuKGZ1bmN0aW9uKGFuc3dlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoYW5zd2VyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZlcmIoZXJyLCBcImVycm9yXCIsIFwiSjUgbGludXhtb2JpbGVcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICByZWNvdmVyeSA9IGZ1bmN0aW9uKG1vZGU/OiBzdHJpbmcpIHtcbiAgICAgICAgbGV0IGNvbmZpZyA9IHRoaXMuY29uZmlnO1xuXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgIGdldGludGVyZmEoY29uZmlnLnJlY292ZXJ5X2ludGVyZmFjZSkudGhlbihmdW5jdGlvbihpbnRlcmY6IElEZXZpY2UpIHtcbiAgICAgICAgICAgICAgICBsZXQgd2lmaV9leGlzdDogc3RyaW5nID0gaW50ZXJmLmludGVyZmFjZTtcbiAgICAgICAgICAgICAgICByZWNvdmVyeV9tb2RlKGNvbmZpZywgd2lmaV9leGlzdCwgbW9kZSkudGhlbihmdW5jdGlvbihhbnN3ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShhbnN3ZXIpO1xuICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uKGVycikge1xuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uKGVycikge1xuICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbn07XG5cblxuXG5cblxuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
