"use strict";
var chai_1 = require("chai");
var index_1 = require("../index");
var options = {
    port: 4000,
    hostapd: {
        driver: 'rtl871xdrv',
        ssid: 'testttap',
        wpa_passphrase: 'testpass'
    },
    mobile: {
        provider: {
            "label": "Tre Ricaricabile", "apn": "tre.it", "phone": "*99#", "username": "tre", "password": "tre"
        },
        options: {
            retry: false
        }
    },
    ethernet: []
};
var json = new index_1.default(options);
describe('Status Object', function () {
    describe('check json', function () {
        it('exist ', function () {
            chai_1.assert.ok(json, 'Status is an object');
            chai_1.assert.isObject(json, 'Status is an object');
            chai_1.assert.isObject(json.liconfig, 'Status is an object');
        });
        it('has minimum options ', function () {
            chai_1.assert.isObject(json.liconfig, 'Config object');
            chai_1.assert.isString(json.liconfig.wpasupplicant_path, 'Status is an object');
        });
    });
});

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInRlc3QvY29uZmlnLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxxQkFBcUIsTUFFckIsQ0FBQyxDQUYwQjtBQUUzQixzQkFBbUIsVUFJbkIsQ0FBQyxDQUo0QjtBQUk3QixJQUFNLE9BQU8sR0FBQztJQUNaLElBQUksRUFBQyxJQUFJO0lBQ1QsT0FBTyxFQUFDO1FBQ04sTUFBTSxFQUFDLFlBQVk7UUFDbkIsSUFBSSxFQUFDLFVBQVU7UUFDZixjQUFjLEVBQUMsVUFBVTtLQUMxQjtJQUNELE1BQU0sRUFBQztRQUNMLFFBQVEsRUFBQztZQUNQLE9BQU8sRUFBQyxrQkFBa0IsRUFBQyxLQUFLLEVBQUMsUUFBUSxFQUFDLE9BQU8sRUFBQyxNQUFNLEVBQUMsVUFBVSxFQUFDLEtBQUssRUFBQyxVQUFVLEVBQUMsS0FBSztTQUMzRjtRQUNELE9BQU8sRUFBQztZQUNOLEtBQUssRUFBQyxLQUFLO1NBQ1o7S0FDRjtJQUNELFFBQVEsRUFBQyxFQUFFO0NBQ1osQ0FBQztBQUdGLElBQU0sSUFBSSxHQUFDLElBQUksZUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBSS9CLFFBQVEsQ0FBQyxlQUFlLEVBQUU7SUFDeEIsUUFBUSxDQUFDLFlBQVksRUFBRTtRQUNyQixFQUFFLENBQUMsUUFBUSxFQUFFO1lBQ1gsYUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUscUJBQXFCLENBQUMsQ0FBQztZQUV2QyxhQUFNLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxxQkFBcUIsQ0FBQyxDQUFDO1lBQzdDLGFBQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxxQkFBcUIsQ0FBQyxDQUFDO1FBRXhELENBQUMsQ0FBQyxDQUFBO1FBQ0YsRUFBRSxDQUFDLHNCQUFzQixFQUFFO1lBQ3pCLGFBQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxlQUFlLENBQUMsQ0FBQztZQUNoRCxhQUFNLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsa0JBQWtCLEVBQUUscUJBQXFCLENBQUMsQ0FBQztRQUUzRSxDQUFDLENBQUMsQ0FBQTtJQUNKLENBQUMsQ0FBQyxDQUFBO0FBQ0osQ0FBQyxDQUFDLENBQUEiLCJmaWxlIjoidGVzdC9jb25maWcuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge2Fzc2VydH0gZnJvbSBcImNoYWlcIlxuXG5pbXBvcnQgbGluZXR3IGZyb20gXCIuLi9pbmRleFwiXG5cblxuXG5jb25zdCBvcHRpb25zPXtcbiAgcG9ydDo0MDAwLFxuICBob3N0YXBkOntcbiAgICBkcml2ZXI6J3J0bDg3MXhkcnYnLFxuICAgIHNzaWQ6J3Rlc3R0dGFwJyxcbiAgICB3cGFfcGFzc3BocmFzZTondGVzdHBhc3MnXG4gIH0sXG4gIG1vYmlsZTp7XG4gICAgcHJvdmlkZXI6e1xuICAgICAgXCJsYWJlbFwiOlwiVHJlIFJpY2FyaWNhYmlsZVwiLFwiYXBuXCI6XCJ0cmUuaXRcIixcInBob25lXCI6XCIqOTkjXCIsXCJ1c2VybmFtZVwiOlwidHJlXCIsXCJwYXNzd29yZFwiOlwidHJlXCJcbiAgICB9LFxuICAgIG9wdGlvbnM6e1xuICAgICAgcmV0cnk6ZmFsc2VcbiAgICB9XG4gIH0sXG4gIGV0aGVybmV0OltdXG59O1xuXG5cbmNvbnN0IGpzb249bmV3IGxpbmV0dyhvcHRpb25zKTtcblxuXG5cbmRlc2NyaWJlKCdTdGF0dXMgT2JqZWN0JywgZnVuY3Rpb24oKSB7XG4gIGRlc2NyaWJlKCdjaGVjayBqc29uJywgZnVuY3Rpb24gKCkge1xuICAgIGl0KCdleGlzdCAnLCBmdW5jdGlvbigpe1xuICAgICAgYXNzZXJ0Lm9rKGpzb24sICdTdGF0dXMgaXMgYW4gb2JqZWN0Jyk7XG5cbiAgICAgIGFzc2VydC5pc09iamVjdChqc29uLCAnU3RhdHVzIGlzIGFuIG9iamVjdCcpO1xuICAgICAgYXNzZXJ0LmlzT2JqZWN0KGpzb24ubGljb25maWcsICdTdGF0dXMgaXMgYW4gb2JqZWN0Jyk7XG5cbiAgICB9KVxuICAgIGl0KCdoYXMgbWluaW11bSBvcHRpb25zICcsIGZ1bmN0aW9uKCl7XG4gICAgICBhc3NlcnQuaXNPYmplY3QoanNvbi5saWNvbmZpZywgJ0NvbmZpZyBvYmplY3QnKTtcbiAgICAgIGFzc2VydC5pc1N0cmluZyhqc29uLmxpY29uZmlnLndwYXN1cHBsaWNhbnRfcGF0aCwgJ1N0YXR1cyBpcyBhbiBvYmplY3QnKTtcblxuICAgIH0pXG4gIH0pXG59KVxuIl19
