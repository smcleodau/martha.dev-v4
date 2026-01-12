const http = require('http');

const TARGET_PORT = 20000;
const PROXY_PORT = 21004;

const server = http.createServer((req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);

  const options = {
    hostname: 'localhost',
    port: TARGET_PORT,
    path: req.url,
    method: req.method,
    headers: req.headers
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error('Proxy error:', err.message);
    res.writeHead(502);
    res.end('Bad Gateway: Unable to reach backend service');
  });

  req.pipe(proxyReq);
});

server.listen(PROXY_PORT, () => {
  console.log(`Martha Proxy: ${PROXY_PORT} -> ${TARGET_PORT}`);
  console.log(`Forwarding https://martha.arch.ie requests to localhost:${TARGET_PORT}`);
});
