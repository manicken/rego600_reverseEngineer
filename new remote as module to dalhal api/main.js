// ── Theme ─────────────────────────────────────────────────────────────────────
let isDark = false;
function toggleTheme() {
  isDark = !isDark;
  document.body.className = isDark ? 'dark' : 'light';
  document.getElementById('theme-toggle').textContent = isDark ? '☀️ light' : '🌙 dark';
}

// ── WebSocket ─────────────────────────────────────────────────────────────────
let ws;
const RECONNECT_MS = 2000;
let chunks = [];
const decoder = new TextDecoder('utf-8');
const customParsers = [];

let location_host = location.host;
if (!location_host.endsWith(':82')) location_host += ':82';

function setWsStatus(connected, text) {
  const dot = document.getElementById('ws-indicator');
  dot.className = connected ? 'connected' : 'disconnected';
  document.getElementById('ws-status').textContent = text;
}

function connect() {
  ws = new WebSocket(`ws://${location_host}/ws`);
  ws.binaryType = 'arraybuffer';

  ws.onopen = () => {
    setWsStatus(true, `Connected to ws://${location_host}/ws`);
    logText('Connected\n');
    wsSend('help');
  };

  ws.onmessage = (evt) => {
    if (typeof evt.data === 'string') {
      let jsonData;
      try {
        jsonData = JSON.parse(evt.data);
        if (jsonData.type === 'start_chunked') {
          chunks = [];
        } else if (jsonData.type === 'end_chunked') {
          const total = chunks.reduce((s, c) => s + c.length, 0);
          const merged = new Uint8Array(total);
          let offset = 0;
          for (const c of chunks) { merged.set(c, offset); offset += c.length; }
          const text = decoder.decode(merged);
          if (jsonData.dataType === 'json') {
            try { 
              let parsedJson = JSON.parse(text);
              if (jsonData.tag == 'help') {
                helpTree = JSON.parse(text); // create copy

                renderAutoButtons(helpTree, document.getElementById('btn-container'), wsSend);
              }/* else if (jsonData.tag == 'wifi/scan') {
                WifiModal.receive(JSON.parse(text));
              }*/ else {
                for (let i=0;i<customParsers.length;i++) {
                   if (customParsers[i](jsonData.tag, text)) {
                    break;
                   }
                }
              }
              logCollapsible(parsedJson, jsonData.tag); 
              
            }
            catch(e) { console.log(e); logText('(chunk parse error)\n' + text); }
          } else {
            logText(text);
          }
        } else {
          logCollapsible(jsonData);
        }
      } catch(e) {
        logText(evt.data);
      }
    } else {
      chunks.push(new Uint8Array(evt.data));
    }
  };

  ws.onclose = () => {
    setWsStatus(false, `Disconnected — reconnecting in ${RECONNECT_MS/1000}s…`);
    logText('Disconnected, reconnecting…\n');
    setTimeout(connect, RECONNECT_MS);
  };

  ws.onerror = () => ws.close();
}

function wsSend(cmd) {
  const trimmed = cmd.trim().replace(/\/$/, '');
  if (!trimmed) return;
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(trimmed);
    termPrintLine('> ' + trimmed, 'line-prompt');
  } else {
    termPrintLine('Not connected', 'line-err');
  }
}



function collectRows(node, pathParts) {
  const rows = [];
  const siblings = [];
  for (const child of (node.children || [])) {
    const childPath = pathParts.concat(child.name);
    if (child.autogenbutton) {
      siblings.push({
        path: childPath.join('/'),
        name: child.name,
        danger: child.autogendanger,
        parent: pathParts[pathParts.length - 1] || null
      });
    }
    rows.push(...collectRows(child, childPath));
  }
  if (siblings.length > 0) {
    rows.unshift({ groupParent: pathParts[pathParts.length - 1] || 'root', buttons: siblings });
  }
  return rows;
}

function renderAutoButtons(tree, container, wsSend) {
  container.innerHTML = '';
  const rows = collectRows(tree.root, []);
  for (const row of rows) {
    const div = document.createElement('div');
    div.className = 'btn-row';
    for (const btn of row.buttons) {
      const b = document.createElement('button');
      b.className = 'cmd-btn' + (btn.danger ? ' danger' : '');
      b.textContent = btn.parent ? `${btn.parent}/${btn.name}` : btn.name;
      b.title = btn.path;  // full path as tooltip
      b.onclick = () => wsSend(btn.path);
      div.appendChild(b);
    }
    container.appendChild(div);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  
  connect();
});

const ext_toolbar = document.getElementById("extensions_toolbar");

function registerToolbarButton(text, onclick, id = "") {
    const btn = document.createElement("button");

    btn.textContent = text;

    if (id)
        btn.id = id;

    btn.onclick = onclick;

    ext_toolbar.appendChild(btn);

    return btn;
}
