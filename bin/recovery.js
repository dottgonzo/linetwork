"use strict";
var index_1 = require('../index');
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
var gionni = new index_1.default(options);
gionni.recovery().then(function (status) {
    verb(status, 'info', 'J5 init');
}).catch(function (err) {
    console.log('error');
    verb(err, 'error', 'J5 init');
});

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImJpbi9yZWNvdmVyeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsc0JBQWtCLFVBQVUsQ0FBQyxDQUFBO0FBQzdCLElBQUksSUFBSSxHQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUMxQixJQUFJLE9BQU8sR0FBQztJQUNWLElBQUksRUFBQyxJQUFJO0lBQ1QsT0FBTyxFQUFDO1FBQ04sTUFBTSxFQUFDLFlBQVk7UUFDbkIsSUFBSSxFQUFDLFVBQVU7UUFDZixjQUFjLEVBQUMsVUFBVTtLQUMxQjtJQUNELE1BQU0sRUFBQztRQUNMLFFBQVEsRUFBQztZQUNQLE9BQU8sRUFBQyxrQkFBa0IsRUFBQyxLQUFLLEVBQUMsUUFBUSxFQUFDLE9BQU8sRUFBQyxNQUFNLEVBQUMsVUFBVSxFQUFDLEtBQUssRUFBQyxVQUFVLEVBQUMsS0FBSztTQUMzRjtRQUNELE9BQU8sRUFBQztZQUNOLEtBQUssRUFBQyxLQUFLO1NBQ1o7S0FDRjtDQUNGLENBQUM7QUFFRixJQUFJLE1BQU0sR0FBQyxJQUFJLGVBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUU3QixNQUFNLENBQUMsUUFBUSxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQVMsTUFBTTtJQUNyQyxJQUFJLENBQUMsTUFBTSxFQUFDLE1BQU0sRUFBQyxTQUFTLENBQUMsQ0FBQTtBQUM5QixDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBUyxHQUFHO0lBQ25CLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUE7SUFDckIsSUFBSSxDQUFDLEdBQUcsRUFBQyxPQUFPLEVBQUMsU0FBUyxDQUFDLENBQUE7QUFDNUIsQ0FBQyxDQUFDLENBQUEiLCJmaWxlIjoiYmluL3JlY292ZXJ5LmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGxpbmV0IGZyb20gJy4uL2luZGV4JztcbmxldCB2ZXJiPXJlcXVpcmUoJ3ZlcmJvJyk7XG5sZXQgb3B0aW9ucz17XG4gIHBvcnQ6NDAwMCxcbiAgaG9zdGFwZDp7XG4gICAgZHJpdmVyOidydGw4NzF4ZHJ2JyxcbiAgICBzc2lkOid0ZXN0dHRhcCcsXG4gICAgd3BhX3Bhc3NwaHJhc2U6J3Rlc3RwYXNzJ1xuICB9LFxuICBtb2JpbGU6e1xuICAgIHByb3ZpZGVyOntcbiAgICAgIFwibGFiZWxcIjpcIlRyZSBSaWNhcmljYWJpbGVcIixcImFwblwiOlwidHJlLml0XCIsXCJwaG9uZVwiOlwiKjk5I1wiLFwidXNlcm5hbWVcIjpcInRyZVwiLFwicGFzc3dvcmRcIjpcInRyZVwiXG4gICAgfSxcbiAgICBvcHRpb25zOntcbiAgICAgIHJldHJ5OmZhbHNlXG4gICAgfVxuICB9XG59O1xuXG5sZXQgZ2lvbm5pPW5ldyBsaW5ldChvcHRpb25zKTtcblxuIGdpb25uaS5yZWNvdmVyeSgpLnRoZW4oZnVuY3Rpb24oc3RhdHVzKXtcbiAgdmVyYihzdGF0dXMsJ2luZm8nLCdKNSBpbml0JylcbiB9KS5jYXRjaChmdW5jdGlvbihlcnIpe1xuICAgY29uc29sZS5sb2coJ2Vycm9yJylcbiAgdmVyYihlcnIsJ2Vycm9yJywnSjUgaW5pdCcpXG4gfSkiXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
