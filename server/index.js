const express = require("express");
const path = require('path');
const { WebSocketServer } = require('ws')
const WebSocket = require('ws')

const PORT = process.env.PORT || 3001;

const app = express();
const websockets = new Map();
const wss = new WebSocketServer({ port: 443 });

wss.on('connection', (ws, req) => {
  ws.isAlive = true;
  const parts = req.url?.split('/');
  if (parts.length !== 2) {
    ws.terminate();
  }

  const [_, overlayId] = parts;
  ws.overlayId = overlayId;

  ws.on('error', console.error);

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', (data, isBinary) => {
    console.log(JSON.parse(data.toString()));
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

app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
