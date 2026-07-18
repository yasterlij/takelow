const { createProxyMiddleware } = require('http-proxy-middleware');
const express = require('express');

const identity = 'http://localhost:3001';
const auctionEngine = 'http://localhost:3002';
const queryService = 'http://localhost:3003';

const identityProxy = createProxyMiddleware({ target: identity, changeOrigin: true });
const auctionProxy = createProxyMiddleware({ target: auctionEngine, changeOrigin: true });
const queryProxy = createProxyMiddleware({ target: queryService, changeOrigin: true });
const wsProxy = createProxyMiddleware({ target: auctionEngine, changeOrigin: true, ws: true });

const app = express();
const PORT = 3333;

app.use('/socket.io', wsProxy);

app.use('/api/v1/auth', identityProxy);
app.use('/api/v1/wallet', identityProxy);

app.use('/api/v1/admin/auction', auctionProxy);
app.use('/api/v1/admin/product', auctionProxy);
app.use('/api/v1/admin', queryProxy);

app.use('/api/v1/auctions/:id/bid', (req, res, next) => {
  if (req.method === 'POST') return auctionProxy(req, res, next);
  next();
});

app.use('/api/v1/auctions', queryProxy);
app.use('/api/v1/products', queryProxy);
app.use('/api/v1/favorites', queryProxy);
app.use('/api', queryProxy);

app.listen(PORT, () => {
  console.log(`\n  ⚡ Dev proxy running on http://localhost:${PORT}`);
  console.log(`  → Identity: ${identity}`);
  console.log(`  → Auction:  ${auctionEngine}`);
  console.log(`  → Query:    ${queryService}\n`);
});
