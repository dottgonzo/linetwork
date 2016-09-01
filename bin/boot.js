"use strict";
var index_1 = require('../index');
var verb = require('verbo');
var options = {
    port: 4000,
    wpasupplicant_path: "/etc/wpa_supplicant/wpa_supplicant.conf",
    hostapd: {
        driver: 'rtl871xdrv',
        ssid: 'testttap',
        wpa_passphrase: 'testpass'
    },
    mobile: {
        provider: {
            label: "Tre Ricaricabile",
            apn: "tre.it",
            phone: "*99#",
            username: "tre",
            password: "tre"
        },
        "device": "1-1.4"
    }
};
var gionni = new index_1.default(options);
console.log(gionni);
gionni.connection(true).then(function (status) {
    verb(status, 'info', 'J5 init');
}).catch(function (err) {
    console.log('error');
    verb(err, 'error', 'J5 init');
});

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImJpbi9ib290LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxzQkFBa0IsVUFBVSxDQUFDLENBQUE7QUFDN0IsSUFBSSxJQUFJLEdBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQzFCLElBQUksT0FBTyxHQUFDO0lBQ1YsSUFBSSxFQUFDLElBQUk7SUFDVCxrQkFBa0IsRUFBQyx5Q0FBeUM7SUFDNUQsT0FBTyxFQUFDO1FBQ04sTUFBTSxFQUFDLFlBQVk7UUFDbkIsSUFBSSxFQUFDLFVBQVU7UUFDZixjQUFjLEVBQUMsVUFBVTtLQUMxQjtJQUNELE1BQU0sRUFBQztRQUNMLFFBQVEsRUFBQztZQUNQLEtBQUssRUFBQyxrQkFBa0I7WUFDeEIsR0FBRyxFQUFDLFFBQVE7WUFDWixLQUFLLEVBQUMsTUFBTTtZQUNaLFFBQVEsRUFBQyxLQUFLO1lBQ2QsUUFBUSxFQUFDLEtBQUs7U0FDZjtRQUNELFFBQVEsRUFBQyxPQUFPO0tBQ2pCO0NBQ0YsQ0FBQztBQUVGLElBQUksTUFBTSxHQUFDLElBQUksZUFBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQzlCLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUE7QUFDbEIsTUFBTSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBUyxNQUFNO0lBQzNDLElBQUksQ0FBQyxNQUFNLEVBQUMsTUFBTSxFQUFDLFNBQVMsQ0FBQyxDQUFBO0FBQzlCLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFTLEdBQUc7SUFDbkIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQTtJQUNyQixJQUFJLENBQUMsR0FBRyxFQUFDLE9BQU8sRUFBQyxTQUFTLENBQUMsQ0FBQTtBQUM1QixDQUFDLENBQUMsQ0FBQSIsImZpbGUiOiJiaW4vYm9vdC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBsaW5ldCBmcm9tICcuLi9pbmRleCc7XG5sZXQgdmVyYj1yZXF1aXJlKCd2ZXJibycpO1xubGV0IG9wdGlvbnM9e1xuICBwb3J0OjQwMDAsXG4gIHdwYXN1cHBsaWNhbnRfcGF0aDpcIi9ldGMvd3BhX3N1cHBsaWNhbnQvd3BhX3N1cHBsaWNhbnQuY29uZlwiLFxuICBob3N0YXBkOntcbiAgICBkcml2ZXI6J3J0bDg3MXhkcnYnLFxuICAgIHNzaWQ6J3Rlc3R0dGFwJyxcbiAgICB3cGFfcGFzc3BocmFzZTondGVzdHBhc3MnXG4gIH0sXG4gIG1vYmlsZTp7XG4gICAgcHJvdmlkZXI6e1xuICAgICAgbGFiZWw6XCJUcmUgUmljYXJpY2FiaWxlXCIsXG4gICAgICBhcG46XCJ0cmUuaXRcIixcbiAgICAgIHBob25lOlwiKjk5I1wiLFxuICAgICAgdXNlcm5hbWU6XCJ0cmVcIixcbiAgICAgIHBhc3N3b3JkOlwidHJlXCJcbiAgICB9LFxuICAgIFwiZGV2aWNlXCI6XCIxLTEuNFwiXG4gIH1cbn07XG5cbmxldCBnaW9ubmk9bmV3IGxpbmV0KG9wdGlvbnMpO1xuY29uc29sZS5sb2coZ2lvbm5pKVxuIGdpb25uaS5jb25uZWN0aW9uKHRydWUpLnRoZW4oZnVuY3Rpb24oc3RhdHVzKXtcbiAgdmVyYihzdGF0dXMsJ2luZm8nLCdKNSBpbml0JylcbiB9KS5jYXRjaChmdW5jdGlvbihlcnIpe1xuICAgY29uc29sZS5sb2coJ2Vycm9yJylcbiAgdmVyYihlcnIsJ2Vycm9yJywnSjUgaW5pdCcpXG4gfSlcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
