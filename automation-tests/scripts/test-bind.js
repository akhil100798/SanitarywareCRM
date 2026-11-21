const http = require('http');
const s = http.createServer();
s.listen(8081, '127.0.0.1', () => {
  console.log('SUCCESS: Listening on 127.0.0.1:8081');
  s.close();
});
s.on('error', e => {
  console.log('FAILED:', e.message);
});
