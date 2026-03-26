const ws = new WebSocket(`ws://${window.location.host}`);

ws.onopen = () => {
  console.log('[+] Connecté au serveur WebSocket');
};

ws.onmessage = (event) => {
  const messages = document.getElementById('messages');
  const li = document.createElement('li');
  li.textContent = event.data;
  messages.appendChild(li);
};

function sendMsg() {
  const input = document.getElementById('msg');
  ws.send(input.value);
  input.value = '';
}
