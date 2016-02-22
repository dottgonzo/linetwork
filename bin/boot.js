var linet = require('../index');
var verb = require('verbo');
var options = {
    port: 4000,
    wpasupplicant_path: "dd",
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
        options: {
            retry: false
        }
    }
};
var gionni = new linet(options);
console.log(gionni);
gionni.connection(true).then(function (status) {
    verb(status, 'info', 'J5 init');
}).catch(function (err) {
    console.log('error');
    verb(err, 'error', 'J5 init');
});

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImJpbi9ib290LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLElBQU8sS0FBSyxXQUFTLFVBQVUsQ0FBQyxDQUFDO0FBQ2pDLElBQUksSUFBSSxHQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUMxQixJQUFJLE9BQU8sR0FBQztJQUNWLElBQUksRUFBQyxJQUFJO0lBQ1Qsa0JBQWtCLEVBQUMsSUFBSTtJQUN2QixPQUFPLEVBQUM7UUFDTixNQUFNLEVBQUMsWUFBWTtRQUNuQixJQUFJLEVBQUMsVUFBVTtRQUNmLGNBQWMsRUFBQyxVQUFVO0tBQzFCO0lBQ0QsTUFBTSxFQUFDO1FBQ0wsUUFBUSxFQUFDO1lBQ1AsS0FBSyxFQUFDLGtCQUFrQjtZQUN4QixHQUFHLEVBQUMsUUFBUTtZQUNaLEtBQUssRUFBQyxNQUFNO1lBQ1osUUFBUSxFQUFDLEtBQUs7WUFDZCxRQUFRLEVBQUMsS0FBSztTQUNmO1FBQ0QsT0FBTyxFQUFDO1lBQ04sS0FBSyxFQUFDLEtBQUs7U0FDWjtLQUNGO0NBQ0YsQ0FBQztBQUVGLElBQUksTUFBTSxHQUFDLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQzlCLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUE7QUFDbEIsTUFBTSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBUyxNQUFNO0lBQzNDLElBQUksQ0FBQyxNQUFNLEVBQUMsTUFBTSxFQUFDLFNBQVMsQ0FBQyxDQUFBO0FBQzlCLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFTLEdBQUc7SUFDbkIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQTtJQUNyQixJQUFJLENBQUMsR0FBRyxFQUFDLE9BQU8sRUFBQyxTQUFTLENBQUMsQ0FBQTtBQUM1QixDQUFDLENBQUMsQ0FBQSIsImZpbGUiOiJiaW4vYm9vdC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBsaW5ldD1yZXF1aXJlKCcuLi9pbmRleCcpO1xubGV0IHZlcmI9cmVxdWlyZSgndmVyYm8nKTtcbmxldCBvcHRpb25zPXtcbiAgcG9ydDo0MDAwLFxuICB3cGFzdXBwbGljYW50X3BhdGg6XCJkZFwiLFxuICBob3N0YXBkOntcbiAgICBkcml2ZXI6J3J0bDg3MXhkcnYnLFxuICAgIHNzaWQ6J3Rlc3R0dGFwJyxcbiAgICB3cGFfcGFzc3BocmFzZTondGVzdHBhc3MnXG4gIH0sXG4gIG1vYmlsZTp7XG4gICAgcHJvdmlkZXI6e1xuICAgICAgbGFiZWw6XCJUcmUgUmljYXJpY2FiaWxlXCIsXG4gICAgICBhcG46XCJ0cmUuaXRcIixcbiAgICAgIHBob25lOlwiKjk5I1wiLFxuICAgICAgdXNlcm5hbWU6XCJ0cmVcIixcbiAgICAgIHBhc3N3b3JkOlwidHJlXCJcbiAgICB9LFxuICAgIG9wdGlvbnM6e1xuICAgICAgcmV0cnk6ZmFsc2VcbiAgICB9XG4gIH1cbn07XG5cbmxldCBnaW9ubmk9bmV3IGxpbmV0KG9wdGlvbnMpO1xuY29uc29sZS5sb2coZ2lvbm5pKVxuIGdpb25uaS5jb25uZWN0aW9uKHRydWUpLnRoZW4oZnVuY3Rpb24oc3RhdHVzKXtcbiAgdmVyYihzdGF0dXMsJ2luZm8nLCdKNSBpbml0JylcbiB9KS5jYXRjaChmdW5jdGlvbihlcnIpe1xuICAgY29uc29sZS5sb2coJ2Vycm9yJylcbiAgdmVyYihlcnIsJ2Vycm9yJywnSjUgaW5pdCcpXG4gfSlcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
