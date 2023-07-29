const express = require("express");
const path = require('path');
const { WebSocketServer } = require('ws')
const WebSocket = require('ws')
const { createServer } = require('http');

const PORT = process.env.PORT || 3001;
const WEBSOCKET_PORT = process.env.PORT || 443;

const app = express();
const websockets = new Map();


app.use(express.static(path.resolve(__dirname, '../client/build')));

app.get("/check-availability/:overlayId", (req, res) => {
  return res.json({ available: !websockets.has(req.params.overlayId) });
});


app.get("/admin/:overlayId", (req, res) => {
  return res.sendFile(path.resolve(__dirname, '../client/build/index.html'));
})


app.get("/overlay/:overlayId", (req, res) => {
  return res.sendFile(path.resolve(__dirname, '../client/build/index.html'));
})


const server = createServer(app);
let config;
let msg;
if (WEBSOCKET_PORT === 443) {
  config = {port: WEBSOCKET_PORT};
  msg = 'Local dev, Sockets on 443'
} else {
  config = {server};
  msg = "production, sockets on " + WEBSOCKET_PORT;
}

const wss = new WebSocket.Server(config);
console.log(msg);


wss.on('connection', (ws, req) => {
  console.log('aaaaaa');
  ws.isAlive = true;
  const parts = req.url?.split('/');
  console.log('aaaa' ,parts);
  if (parts.length !== 2) {
    ws.terminate();
  }

  const [_, overlayId] = parts;
  ws.overlayId = overlayId;

  console.log('New Connection for ', overlayId)

  ws.on('error', console.error);

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', (data, isBinary) => {
    console.log('New message for ', ws.overlayId);
    wss.clients.forEach(function each(client) {
      if (client !== ws && ws.overlayId === client.overlayId && client.readyState === WebSocket.OPEN) {
        client.send(data, { binary: isBinary });
      }
    });
  });
});

const interval = setInterval(function ping() {
  wss.clients.forEach(function each(ws) {
    if (ws.isAlive === false) {
      console.log('killing')
      return ws.terminate();
    }

    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', () => {
  clearInterval(interval);
});

server.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
