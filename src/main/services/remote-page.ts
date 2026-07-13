// Self-contained mobile remote page served to phones on the LAN.
// No external assets so it works fully offline on the local network.
export const REMOTE_PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<meta name="theme-color" content="#0b0d12" />
<title>Hearth Remote</title>
<style>
  :root { --bg:#0b0d12; --panel:#161a23; --panel2:#1f2530; --accent:#7c5cff; --text:#eef1f6; --muted:#8b93a7; }
  * { box-sizing:border-box; -webkit-tap-highlight-color:transparent; user-select:none; }
  html,body { margin:0; height:100%; background:var(--bg); color:var(--text);
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; }
  .wrap { max-width:440px; margin:0 auto; padding:18px 18px 40px; display:flex; flex-direction:column; gap:18px; }
  h1 { font-size:18px; font-weight:600; text-align:center; margin:8px 0 0; letter-spacing:.3px; }
  .status { text-align:center; font-size:12px; color:var(--muted); }
  .dot { display:inline-block; width:8px; height:8px; border-radius:50%; background:#e0524a; margin-right:6px; vertical-align:middle; }
  .dot.on { background:#38d17a; }
  .dpad { position:relative; width:240px; height:240px; margin:6px auto; }
  .dpad button { position:absolute; background:var(--panel); border:none; color:var(--text); font-size:26px; }
  .dpad .up { top:0; left:80px; width:80px; height:80px; border-radius:16px 16px 0 0; }
  .dpad .down { bottom:0; left:80px; width:80px; height:80px; border-radius:0 0 16px 16px; }
  .dpad .left { left:0; top:80px; width:80px; height:80px; border-radius:16px 0 0 16px; }
  .dpad .right { right:0; top:80px; width:80px; height:80px; border-radius:0 16px 16px 0; }
  .dpad .ok { left:80px; top:80px; width:80px; height:80px; background:var(--accent); font-weight:700; font-size:18px; }
  .row { display:flex; gap:12px; }
  .row button { flex:1; padding:16px 0; font-size:15px; border:none; border-radius:14px; background:var(--panel); color:var(--text); }
  .row button.wide { font-size:22px; }
  .accent { background:var(--panel2) !important; }
  .search { display:flex; gap:8px; }
  .search input { flex:1; padding:14px; border-radius:14px; border:1px solid #2a3140; background:var(--panel); color:var(--text); font-size:16px; }
  .search button { padding:0 18px; border:none; border-radius:14px; background:var(--accent); color:#fff; font-weight:600; }
  button:active { filter:brightness(1.4); }
  .label { font-size:11px; text-transform:uppercase; letter-spacing:1px; color:var(--muted); margin-bottom:-8px; }
</style>
</head>
<body>
<div class="wrap">
  <h1>Hearth Remote</h1>
  <div class="status"><span id="dot" class="dot"></span><span id="stat">connecting…</span></div>

  <div class="search">
    <input id="text" type="text" placeholder="Search films & shows…" autocomplete="off" />
    <button id="send">Search</button>
  </div>

  <div class="dpad">
    <button class="up" data-nav="up">▲</button>
    <button class="left" data-nav="left">◀</button>
    <button class="ok" data-enter>OK</button>
    <button class="right" data-nav="right">▶</button>
    <button class="down" data-nav="down">▼</button>
  </div>

  <div class="row">
    <button data-cmd="back">‹ Back</button>
    <button data-cmd="home">⌂ Home</button>
  </div>

  <div class="label">Playback</div>
  <div class="row">
    <button data-seek="-30">« 30s</button>
    <button class="wide accent" data-cmd="playpause">⏯</button>
    <button data-seek="30">30s »</button>
  </div>
  <div class="row">
    <button data-vol="-5">🔉 Vol −</button>
    <button data-vol="5">🔊 Vol +</button>
  </div>
</div>
<script>
  var ws, connected = false;
  var dot = document.getElementById('dot'), stat = document.getElementById('stat');
  function connect() {
    ws = new WebSocket('ws://' + location.host);
    ws.onopen = function(){ connected = true; dot.classList.add('on'); stat.textContent = 'connected'; };
    ws.onclose = function(){ connected = false; dot.classList.remove('on'); stat.textContent = 'reconnecting…'; setTimeout(connect, 1000); };
  }
  function send(obj){ if (connected) ws.send(JSON.stringify(obj)); if (navigator.vibrate) navigator.vibrate(8); }
  connect();

  document.querySelectorAll('[data-nav]').forEach(function(b){ b.onclick = function(){ send({type:'nav', dir:b.dataset.nav}); }; });
  document.querySelectorAll('[data-cmd]').forEach(function(b){ b.onclick = function(){ send({type:b.dataset.cmd}); }; });
  document.querySelectorAll('[data-seek]').forEach(function(b){ b.onclick = function(){ send({type:'seek', delta:Number(b.dataset.seek)}); }; });
  document.querySelectorAll('[data-vol]').forEach(function(b){ b.onclick = function(){ send({type:'volume', delta:Number(b.dataset.vol)}); }; });
  document.querySelector('[data-enter]').onclick = function(){ send({type:'enter'}); };

  var text = document.getElementById('text');
  document.getElementById('send').onclick = function(){
    if (text.value.trim()){ send({type:'goto', screen:'discover'}); send({type:'text', value:text.value.trim()}); }
  };
  text.addEventListener('keydown', function(e){ if (e.key === 'Enter') document.getElementById('send').click(); });
</script>
</body>
</html>`
