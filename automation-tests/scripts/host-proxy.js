const http = require('http');

function createProxy(listenPort, targetPort) {
  const server = http.createServer((req, res) => {
    const options = {
      hostname: '127.0.0.1',
      port: targetPort,
      path: req.url,
      method: req.method,
      headers: { ...req.headers, host: `localhost:${targetPort}` }
    };
    const proxyReq = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });
    proxyReq.on('error', (err) => {
      res.writeHead(502, { 'Content-Type': 'text/plain' });
      res.end(`Proxy error: ${err.message}`);
    });
    req.pipe(proxyReq);
  });
  server.listen(listenPort, '0.0.0.0', () => {
    console.log(`Forwarding 0.0.0.0:${listenPort} -> 127.0.0.1:${targetPort}`);
  });
  return server;
}

createProxy(8081, 80);
createProxy(8888, 80);
