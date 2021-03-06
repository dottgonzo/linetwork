"use strict";
var index_1 = require('../index');
var verb = require('verbo');
var options = require('./conf.json');
options.wpasupplicant_path = __dirname + '/wpa_supplicant.conf';
var LINET = new index_1.default(options);
console.log(LINET);
LINET.wifi_switch('host').then(function (status) {
    verb(status, 'info', 'LINETWORKING HOST');
}).catch(function (err) {
    console.log('error');
    verb(err, 'error', 'LINETWORKING init');
});

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInJ1bi9zd2l0Y2hfaG9zdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsc0JBQWtCLFVBQVUsQ0FBQyxDQUFBO0FBQzdCLElBQU0sSUFBSSxHQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUU1QixJQUFNLE9BQU8sR0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUE7QUFDcEMsT0FBTyxDQUFDLGtCQUFrQixHQUFDLFNBQVMsR0FBQyxzQkFBc0IsQ0FBQTtBQUUzRCxJQUFNLEtBQUssR0FBQyxJQUFJLGVBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUMvQixPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFBO0FBQ2pCLEtBQUssQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVMsTUFBTTtJQUM3QyxJQUFJLENBQUMsTUFBTSxFQUFDLE1BQU0sRUFBQyxtQkFBbUIsQ0FBQyxDQUFBO0FBQ3hDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFTLEdBQUc7SUFDbkIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQTtJQUNyQixJQUFJLENBQUMsR0FBRyxFQUFDLE9BQU8sRUFBQyxtQkFBbUIsQ0FBQyxDQUFBO0FBQ3RDLENBQUMsQ0FBQyxDQUFBIiwiZmlsZSI6InJ1bi9zd2l0Y2hfaG9zdC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBsaW5ldCBmcm9tICcuLi9pbmRleCc7XG5jb25zdCB2ZXJiPXJlcXVpcmUoJ3ZlcmJvJyk7XG5cbmNvbnN0IG9wdGlvbnM9cmVxdWlyZSgnLi9jb25mLmpzb24nKVxub3B0aW9ucy53cGFzdXBwbGljYW50X3BhdGg9X19kaXJuYW1lKycvd3BhX3N1cHBsaWNhbnQuY29uZidcblxuY29uc3QgTElORVQ9bmV3IGxpbmV0KG9wdGlvbnMpO1xuY29uc29sZS5sb2coTElORVQpXG4gTElORVQud2lmaV9zd2l0Y2goJ2hvc3QnKS50aGVuKGZ1bmN0aW9uKHN0YXR1cyl7XG4gIHZlcmIoc3RhdHVzLCdpbmZvJywnTElORVRXT1JLSU5HIEhPU1QnKVxuIH0pLmNhdGNoKGZ1bmN0aW9uKGVycil7XG4gICBjb25zb2xlLmxvZygnZXJyb3InKVxuICB2ZXJiKGVyciwnZXJyb3InLCdMSU5FVFdPUktJTkcgaW5pdCcpXG4gfSlcbiJdfQ==
