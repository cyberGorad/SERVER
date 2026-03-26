// server.js
const express = require('express');
const http = require('http');
const path = require('path');
const WebSocket = require('ws');

const app = express();

// Servir les fichiers statiques (HTML/JS/CSS)
app.use(express.static(path.join(__dirname, 'public')));

// Créer serveur HTTP
const server = http.createServer(app);

// WebSocket server
const wss = new WebSocket.Server({ server });

// Gérer les connexions WebSocket
wss.on('connection', (ws, req) => {
  console.log('[+] Client connecté');

  // Réception de message
  ws.on('message', (msg) => {
    console.log('[<] Message reçu:', msg.toString());

    // Echo à tous les clients connectés
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(`Server dit : ${msg}`);
      }
    });
  });

  ws.on('close', () => {
    console.log('[-] Client déconnecté');
  });
});

// Endpoint test
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from server!' });
});

// Render fournit le port via process.env.PORT
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Serveur HTTP + WebSocket en ligne sur le port ${PORT}`);
});
