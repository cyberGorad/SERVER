const ws = new WebSocket("ws://192.168.88.18:3000");

const agents = {};

function renderAgents(agentID) {
  const agentList = document.getElementById('agentList');
  agentList.innerHTML = agentID;
  console.log("ID AGENT :" + agentID);
}


ws.onmessage = (event) => {
  try {
    const data = JSON.parse(event.data);

    switch (data.type) {

      case "register":
        console.log("NEW AGENT FOUND!");
        renderAgents(data.id);
        break;

      default:
        console.log("[RAW]", event.data);
    }

  } catch (e) {
    console.log("[ERROR PARSE]", event.data);
  }


  ws.onopen = () => {
    console.log('[+] Connected to server');
  
    // ⚡ IMPORTANT: register client
    ws.send(JSON.stringify({
      type: "register",
      id: id
    }));
  };
  
};