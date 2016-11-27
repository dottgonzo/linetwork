"use strict";
var index_1 = require('../index');
var verb = require('verbo');
var options = require('./conf.json');
var LINET = new index_1.default(options);
console.log(LINET);
LINET.wifi_switch('client').then(function (status) {
    verb(status, 'info', 'J5 wifi client');
}).catch(function (err) {
    console.log('error');
    verb(err, 'error', 'J5 init');
});

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInJ1bi9zd2l0Y2hfY2xpZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxzQkFBa0IsVUFBVSxDQUFDLENBQUE7QUFDN0IsSUFBTSxJQUFJLEdBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBRTVCLElBQU0sT0FBTyxHQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQTtBQUdwQyxJQUFNLEtBQUssR0FBQyxJQUFJLGVBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUMvQixPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFBO0FBQ2pCLEtBQUssQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVMsTUFBTTtJQUMvQyxJQUFJLENBQUMsTUFBTSxFQUFDLE1BQU0sRUFBQyxnQkFBZ0IsQ0FBQyxDQUFBO0FBQ3JDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFTLEdBQUc7SUFDbkIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQTtJQUNyQixJQUFJLENBQUMsR0FBRyxFQUFDLE9BQU8sRUFBQyxTQUFTLENBQUMsQ0FBQTtBQUM1QixDQUFDLENBQUMsQ0FBQSIsImZpbGUiOiJydW4vc3dpdGNoX2NsaWVudC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBsaW5ldCBmcm9tICcuLi9pbmRleCc7XG5jb25zdCB2ZXJiPXJlcXVpcmUoJ3ZlcmJvJyk7XG5cbmNvbnN0IG9wdGlvbnM9cmVxdWlyZSgnLi9jb25mLmpzb24nKVxuXG5cbmNvbnN0IExJTkVUPW5ldyBsaW5ldChvcHRpb25zKTtcbmNvbnNvbGUubG9nKExJTkVUKVxuIExJTkVULndpZmlfc3dpdGNoKCdjbGllbnQnKS50aGVuKGZ1bmN0aW9uKHN0YXR1cyl7XG4gIHZlcmIoc3RhdHVzLCdpbmZvJywnSjUgd2lmaSBjbGllbnQnKVxuIH0pLmNhdGNoKGZ1bmN0aW9uKGVycil7XG4gICBjb25zb2xlLmxvZygnZXJyb3InKVxuICB2ZXJiKGVyciwnZXJyb3InLCdKNSBpbml0JylcbiB9KVxuIl19
