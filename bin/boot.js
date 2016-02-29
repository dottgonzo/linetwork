var linet = require('../index');
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
var gionni = new linet(options);
console.log(gionni);
gionni.connection().then(function (status) {
    verb(status, 'info', 'J5 init');
}).catch(function (err) {
    console.log('error');
    verb(err, 'error', 'J5 init');
});

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImJpbi9ib290LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLElBQU8sS0FBSyxXQUFTLFVBQVUsQ0FBQyxDQUFDO0FBQ2pDLElBQUksSUFBSSxHQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUMxQixJQUFJLE9BQU8sR0FBQztJQUNWLElBQUksRUFBQyxJQUFJO0lBQ1Qsa0JBQWtCLEVBQUMseUNBQXlDO0lBQzVELE9BQU8sRUFBQztRQUNOLE1BQU0sRUFBQyxZQUFZO1FBQ25CLElBQUksRUFBQyxVQUFVO1FBQ2YsY0FBYyxFQUFDLFVBQVU7S0FDMUI7SUFDRCxNQUFNLEVBQUM7UUFDTCxRQUFRLEVBQUM7WUFDUCxLQUFLLEVBQUMsa0JBQWtCO1lBQ3hCLEdBQUcsRUFBQyxRQUFRO1lBQ1osS0FBSyxFQUFDLE1BQU07WUFDWixRQUFRLEVBQUMsS0FBSztZQUNkLFFBQVEsRUFBQyxLQUFLO1NBQ2Y7UUFDRCxRQUFRLEVBQUMsT0FBTztLQUNqQjtDQUNGLENBQUM7QUFFRixJQUFJLE1BQU0sR0FBQyxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUM5QixPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFBO0FBQ2xCLE1BQU0sQ0FBQyxVQUFVLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBUyxNQUFNO0lBQ3ZDLElBQUksQ0FBQyxNQUFNLEVBQUMsTUFBTSxFQUFDLFNBQVMsQ0FBQyxDQUFBO0FBQzlCLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFTLEdBQUc7SUFDbkIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQTtJQUNyQixJQUFJLENBQUMsR0FBRyxFQUFDLE9BQU8sRUFBQyxTQUFTLENBQUMsQ0FBQTtBQUM1QixDQUFDLENBQUMsQ0FBQSIsImZpbGUiOiJiaW4vYm9vdC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBsaW5ldD1yZXF1aXJlKCcuLi9pbmRleCcpO1xubGV0IHZlcmI9cmVxdWlyZSgndmVyYm8nKTtcbmxldCBvcHRpb25zPXtcbiAgcG9ydDo0MDAwLFxuICB3cGFzdXBwbGljYW50X3BhdGg6XCIvZXRjL3dwYV9zdXBwbGljYW50L3dwYV9zdXBwbGljYW50LmNvbmZcIixcbiAgaG9zdGFwZDp7XG4gICAgZHJpdmVyOidydGw4NzF4ZHJ2JyxcbiAgICBzc2lkOid0ZXN0dHRhcCcsXG4gICAgd3BhX3Bhc3NwaHJhc2U6J3Rlc3RwYXNzJ1xuICB9LFxuICBtb2JpbGU6e1xuICAgIHByb3ZpZGVyOntcbiAgICAgIGxhYmVsOlwiVHJlIFJpY2FyaWNhYmlsZVwiLFxuICAgICAgYXBuOlwidHJlLml0XCIsXG4gICAgICBwaG9uZTpcIio5OSNcIixcbiAgICAgIHVzZXJuYW1lOlwidHJlXCIsXG4gICAgICBwYXNzd29yZDpcInRyZVwiXG4gICAgfSxcbiAgICBcImRldmljZVwiOlwiMS0xLjRcIlxuICB9XG59O1xuXG5sZXQgZ2lvbm5pPW5ldyBsaW5ldChvcHRpb25zKTtcbmNvbnNvbGUubG9nKGdpb25uaSlcbiBnaW9ubmkuY29ubmVjdGlvbigpLnRoZW4oZnVuY3Rpb24oc3RhdHVzKXtcbiAgdmVyYihzdGF0dXMsJ2luZm8nLCdKNSBpbml0JylcbiB9KS5jYXRjaChmdW5jdGlvbihlcnIpe1xuICAgY29uc29sZS5sb2coJ2Vycm9yJylcbiAgdmVyYihlcnIsJ2Vycm9yJywnSjUgaW5pdCcpXG4gfSlcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
