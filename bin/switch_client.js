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
console.log(gionni);
gionni.wifi_switch('client').then(function (status) {
    verb(status, 'info', 'J5 wifi client');
}).catch(function (err) {
    console.log('error');
    verb(err, 'error', 'J5 init');
});

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImJpbi9zd2l0Y2hfY2xpZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxzQkFBa0IsVUFBVSxDQUFDLENBQUE7QUFDN0IsSUFBSSxJQUFJLEdBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQzFCLElBQUksT0FBTyxHQUFDO0lBQ1YsSUFBSSxFQUFDLElBQUk7SUFDVCxPQUFPLEVBQUM7UUFDTixNQUFNLEVBQUMsWUFBWTtRQUNuQixJQUFJLEVBQUMsVUFBVTtRQUNmLGNBQWMsRUFBQyxVQUFVO0tBQzFCO0lBQ0QsTUFBTSxFQUFDO1FBQ0wsUUFBUSxFQUFDO1lBQ1AsT0FBTyxFQUFDLGtCQUFrQixFQUFDLEtBQUssRUFBQyxRQUFRLEVBQUMsT0FBTyxFQUFDLE1BQU0sRUFBQyxVQUFVLEVBQUMsS0FBSyxFQUFDLFVBQVUsRUFBQyxLQUFLO1NBQzNGO1FBQ0QsT0FBTyxFQUFDO1lBQ04sS0FBSyxFQUFDLEtBQUs7U0FDWjtLQUNGO0NBQ0YsQ0FBQztBQUVGLElBQUksTUFBTSxHQUFDLElBQUksZUFBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQzlCLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUE7QUFDbEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBUyxNQUFNO0lBQ2hELElBQUksQ0FBQyxNQUFNLEVBQUMsTUFBTSxFQUFDLGdCQUFnQixDQUFDLENBQUE7QUFDckMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVMsR0FBRztJQUNuQixPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFBO0lBQ3JCLElBQUksQ0FBQyxHQUFHLEVBQUMsT0FBTyxFQUFDLFNBQVMsQ0FBQyxDQUFBO0FBQzVCLENBQUMsQ0FBQyxDQUFBIiwiZmlsZSI6ImJpbi9zd2l0Y2hfY2xpZW50LmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGxpbmV0IGZyb20gJy4uL2luZGV4JztcbmxldCB2ZXJiPXJlcXVpcmUoJ3ZlcmJvJyk7XG5sZXQgb3B0aW9ucz17XG4gIHBvcnQ6NDAwMCxcbiAgaG9zdGFwZDp7XG4gICAgZHJpdmVyOidydGw4NzF4ZHJ2JyxcbiAgICBzc2lkOid0ZXN0dHRhcCcsXG4gICAgd3BhX3Bhc3NwaHJhc2U6J3Rlc3RwYXNzJ1xuICB9LFxuICBtb2JpbGU6e1xuICAgIHByb3ZpZGVyOntcbiAgICAgIFwibGFiZWxcIjpcIlRyZSBSaWNhcmljYWJpbGVcIixcImFwblwiOlwidHJlLml0XCIsXCJwaG9uZVwiOlwiKjk5I1wiLFwidXNlcm5hbWVcIjpcInRyZVwiLFwicGFzc3dvcmRcIjpcInRyZVwiXG4gICAgfSxcbiAgICBvcHRpb25zOntcbiAgICAgIHJldHJ5OmZhbHNlXG4gICAgfVxuICB9XG59O1xuXG5sZXQgZ2lvbm5pPW5ldyBsaW5ldChvcHRpb25zKTtcbmNvbnNvbGUubG9nKGdpb25uaSlcbiBnaW9ubmkud2lmaV9zd2l0Y2goJ2NsaWVudCcpLnRoZW4oZnVuY3Rpb24oc3RhdHVzKXtcbiAgdmVyYihzdGF0dXMsJ2luZm8nLCdKNSB3aWZpIGNsaWVudCcpXG4gfSkuY2F0Y2goZnVuY3Rpb24oZXJyKXtcbiAgIGNvbnNvbGUubG9nKCdlcnJvcicpXG4gIHZlcmIoZXJyLCdlcnJvcicsJ0o1IGluaXQnKVxuIH0pXG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
