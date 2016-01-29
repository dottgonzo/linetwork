var linet = require('../index');
var verb = require('verbo');
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
    }
};
var gionni = new linet(options);
console.log(gionni);
gionni.wifi_switch('client').then(function (status) {
    verb(status, 'info', 'J5 wifi client');
}).catch(function (err) {
    console.log('error');
    verb(err, 'error', 'J5 init');
});

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImJpbi9zd2l0Y2hfY2xpZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLElBQU8sS0FBSyxXQUFTLFVBQVUsQ0FBQyxDQUFDO0FBQ2pDLElBQUksSUFBSSxHQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUMxQixJQUFJLE9BQU8sR0FBQztJQUNWLElBQUksRUFBQyxJQUFJO0lBQ1QsT0FBTyxFQUFDO1FBQ04sTUFBTSxFQUFDLFlBQVk7UUFDbkIsSUFBSSxFQUFDLFVBQVU7UUFDZixjQUFjLEVBQUMsVUFBVTtLQUMxQjtJQUNELE1BQU0sRUFBQztRQUNMLFFBQVEsRUFBQztZQUNQLE9BQU8sRUFBQyxrQkFBa0IsRUFBQyxLQUFLLEVBQUMsUUFBUSxFQUFDLE9BQU8sRUFBQyxNQUFNLEVBQUMsVUFBVSxFQUFDLEtBQUssRUFBQyxVQUFVLEVBQUMsS0FBSztTQUMzRjtRQUNELE9BQU8sRUFBQztZQUNOLEtBQUssRUFBQyxLQUFLO1NBQ1o7S0FDRjtDQUNGLENBQUM7QUFFRixJQUFJLE1BQU0sR0FBQyxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUM5QixPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFBO0FBQ2xCLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVMsTUFBTTtJQUNoRCxJQUFJLENBQUMsTUFBTSxFQUFDLE1BQU0sRUFBQyxnQkFBZ0IsQ0FBQyxDQUFBO0FBQ3JDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFTLEdBQUc7SUFDbkIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQTtJQUNyQixJQUFJLENBQUMsR0FBRyxFQUFDLE9BQU8sRUFBQyxTQUFTLENBQUMsQ0FBQTtBQUM1QixDQUFDLENBQUMsQ0FBQSIsImZpbGUiOiJiaW4vc3dpdGNoX2NsaWVudC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBsaW5ldD1yZXF1aXJlKCcuLi9pbmRleCcpO1xubGV0IHZlcmI9cmVxdWlyZSgndmVyYm8nKTtcbmxldCBvcHRpb25zPXtcbiAgcG9ydDo0MDAwLFxuICBob3N0YXBkOntcbiAgICBkcml2ZXI6J3J0bDg3MXhkcnYnLFxuICAgIHNzaWQ6J3Rlc3R0dGFwJyxcbiAgICB3cGFfcGFzc3BocmFzZTondGVzdHBhc3MnXG4gIH0sXG4gIG1vYmlsZTp7XG4gICAgcHJvdmlkZXI6e1xuICAgICAgXCJsYWJlbFwiOlwiVHJlIFJpY2FyaWNhYmlsZVwiLFwiYXBuXCI6XCJ0cmUuaXRcIixcInBob25lXCI6XCIqOTkjXCIsXCJ1c2VybmFtZVwiOlwidHJlXCIsXCJwYXNzd29yZFwiOlwidHJlXCJcbiAgICB9LFxuICAgIG9wdGlvbnM6e1xuICAgICAgcmV0cnk6ZmFsc2VcbiAgICB9XG4gIH1cbn07XG5cbmxldCBnaW9ubmk9bmV3IGxpbmV0KG9wdGlvbnMpO1xuY29uc29sZS5sb2coZ2lvbm5pKVxuIGdpb25uaS53aWZpX3N3aXRjaCgnY2xpZW50JykudGhlbihmdW5jdGlvbihzdGF0dXMpe1xuICB2ZXJiKHN0YXR1cywnaW5mbycsJ0o1IHdpZmkgY2xpZW50JylcbiB9KS5jYXRjaChmdW5jdGlvbihlcnIpe1xuICAgY29uc29sZS5sb2coJ2Vycm9yJylcbiAgdmVyYihlcnIsJ2Vycm9yJywnSjUgaW5pdCcpXG4gfSlcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==