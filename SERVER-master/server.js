const express = require('express');
const http = require('http');
const path = require('path');
const WebSocket = require('ws');

const app = express();

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// agents map
const agents = new Map();

// broadcast helper
function broadcast(data) {
  const msg = JSON.stringify(data);

  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

wss.on('connection', (ws) => {
  console.log('[+] client connected');

  ws.on('message', (msg) => {
    try {
      const data = JSON.parse(msg.toString());

      // ⚡ REGISTER EVENT (IMPORTANT FIX)
      if (data.type === 'register') {
        const id = data.id || Date.now().toString();

        agents.set(id, ws);

        console.log('[+] new agent:', id);

        // send confirmation only to dashboard
        ws.send(JSON.stringify({
          type: 'register',
          id: id
        }));

        // notify all clients
        broadcast({
          type: 'register',
          id: id
        });
      }

    } catch (e) {
      console.log('[!] invalid message');
    }
  });

  ws.on('close', () => {
    console.log('[-] client disconnected');
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log('[+] server running on', PORT);
});