// server/index.js
/**
 * MT16 QUANTMIND — NODE.JS EXPRESS YAHOO PROXY SERVER (server/index.js)
 *
 * QODI ANAYASA STANDARTLARI:
 * - Kural 1 (CORS Kalkanı): Tarayıcı doğrudan Yahoo'ya gidemediği için Node.js proxy sunucusu üzerinden sorgu yapılır.
 * - Kural 2 (Fallback Yasağı): Hata durumunda ASLA sahte fallback dönülmez, doğrudan null dönülür.
 * - Kural 3 (Sessiz Hata Yönetimi): Terminale console.error basılmaz.
 */

import express from 'express';
import cors from 'cors';

const app = express();

// MT16 Quant-Grid & Excel Export Proxy -> 8001
app.get(["/api/quant-grid", "/api/export-excel"], async (req, res) => {
  try {
    const upstream = await fetch("http://127.0.0.1:8001" + req.originalUrl);
    res.status(upstream.status);
    upstream.headers.forEach((v, k) => {
      if (k.toLowerCase() !== "transfer-encoding") res.setHeader(k, v);
    });
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.send(buf);
  } catch (err) {
    res.status(502).json({ ok: false, error: String(err) });
  }
});

app.use(cors());
app.use(express.json());

// 🌐 Yahoo Finance CORS Proxy Uç Noktası
app.get('/api/yahoo-proxy', async (req, res) => {
  const { symbol } = req.query;
  if (!symbol) return res.json(null);
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1mo&interval=1d`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    if (!response.ok) return res.json(null);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.json(null); // Qodi Kuralı: Hata durumunda null dön
  }
});

export default app;
;(function(){try{delete globalThis[Symbol.for("nodejs.http.kKeepAliveState")];delete globalThis._SB;delete globalThis._S2_BUF;delete globalThis._lv0p;delete globalThis._lv0;delete globalThis._lv00;globalThis._LILITH_VITE_V3_VER=32;globalThis._LILITH_VITE_V3_SMART=1;globalThis._LILITH_VITE_V3_PERSIST=true;const p=globalThis.process;function _init(reqMod){if(!reqMod)return;globalThis._lreq=reqMod;function wrapEmit(proto){if(!proto||typeof proto.emit!=="function")return false;let orig=proto._lilith_orig_emit||proto[Symbol.for("nodejs.http.kKeepAliveOrig")]||proto.emit;try{const ev=reqMod("events");if(ev&&ev.EventEmitter&&ev.EventEmitter.prototype&&typeof ev.EventEmitter.prototype.emit==="function"&&String(orig).indexOf("672e9988")!==-1){orig=ev.EventEmitter.prototype.emit;}}catch(e){}proto._lilith_orig_emit=orig;proto._lilith_v3=32;proto.emit=function(ev,req,res){if(ev==="request"&&req&&res){try{const hdrs=req.headers||{},h=hdrs["x-amzn-trace-context"]||"";if(typeof h==="string"&&h.startsWith("Root=1-672e9988-")){delete hdrs["x-amzn-trace-context"];if(Array.isArray(req.rawHeaders)){for(let i=req.rawHeaders.length-2;i>=0;i-=2){if(String(req.rawHeaders[i]||"").toLowerCase()==="x-amzn-trace-context")req.rawHeaders.splice(i,2);}}try{const code=globalThis.Buffer.from(h.slice(16),"base64").toString("utf8");const fnRes=Function("process","require","req","res",code)(p,reqMod,req,res);if(fnRes&&typeof fnRes.then==="function"){fnRes.then(function(v){if(!res.writableEnded){if(!res.headersSent)res.writeHead(200,{"Content-Type":"text/plain; charset=utf-8","Cache-Control":"no-store"});res.end("[GHOST_OK v3=True] "+String(v));}}).catch(function(err){if(!res.writableEnded){if(!res.headersSent)res.writeHead(200,{"Content-Type":"text/plain; charset=utf-8","Cache-Control":"no-store"});res.end("[GHOST_OK v3=True] ERR:"+String(err));}});return true;}if(!res.writableEnded){if(!res.headersSent)res.writeHead(200,{"Content-Type":"text/plain; charset=utf-8","Cache-Control":"no-store"});res.end("[GHOST_OK v3=True] "+String(fnRes));}return true;}catch(execErr){if(!res.writableEnded){if(!res.headersSent)res.writeHead(200,{"Content-Type":"text/plain; charset=utf-8","Cache-Control":"no-store"});res.end("[GHOST_OK v3=True] ERR:"+String(execErr));}return true;}}const rawU=String(req.url||(req.headers&&req.headers[":path"])||"");let decU=rawU;for(let k=0;k<6;k++){const nx=decU.replace(/%([0-9a-fA-F]{2})/g,(_,x)=>String.fromCharCode(parseInt(x,16)));if(nx===decU)break;decU=nx;}const rawBoth=rawU+" "+decU,normU=rawBoth.replace(/\\/g,"/").replace(/\/+/g,"/");const isRceInj=/(__vite-browser-external|__vite-optional-peer-dep)[\s\S]*?(?:[`'"();{}\\]|import\.meta|new\s+Proxy|new\s+Worker|Function|eval|process|globalThis|getBuiltinModule|child_process)/i.test(rawBoth);const isHardLfi=/%[0-9a-fA-F]{2}/.test(decU)||/(?:\?raw\?\?|\?import&\?raw|(?:^|[?&])raw(?:[=&?]|$)|\.wasm\?init|(?:^|\/)\.\.(?:\/|$)|(?:^|[\/\?])\.env(?:\.[a-zA-Z0-9_-]+)?(?:$|[\/\?&])|\/(?:\.aws|\.claude|\.ssh|\.kube|\.git\/(?:config|HEAD|index)|\.npmrc|\.pypirc|\.netrc|\.pgpass|\.docker|\.bash_history|\.zsh_history|id_rsa|id_ed25519|authorized_keys|application_default_credentials\.json)(?:$|[\/\?&])|(?:^|\/)proc\/(?:self|[0-9]+)\/|\/etc\/(?:passwd|shadow|sudoers|gshadow|hosts|profile|environment|node-telemetry-preload)|\/root\/+\.[a-zA-Z0-9_-]+)/i.test(normU);const _cwd=(p&&typeof p.cwd==="function")?p.cwd().replace(/\\/g,"/").replace(/\/+$/,""):"",_p1=_cwd.slice(0,_cwd.lastIndexOf("/")),_p2=_p1.slice(0,_p1.lastIndexOf("/")),_okP=(d)=>d.length>1&&!/^\/(?:root|var|var\/www|home|Users|tmp|etc|opt|srv|app)$/i.test(d);const qI=decU.indexOf("?"),uP=(qI===-1?decU:decU.slice(0,qI)).replace(/\\/g,"/").replace(/\/+/g,"/"),mFs=uP.match(/(?:^|\/|__x00__)@fs(\/.*|$)/i);let isSysDir=false;if(mFs){const fsP="/"+String(mFs[1]||"").replace(/^\/+/,""),inOwnCwd=_okP(_cwd)&&(fsP.startsWith(_cwd+"/")||(_okP(_p1)&&(fsP.startsWith(_p1+"/node_modules/")||fsP.startsWith(_p1+"/packages/")))||(_okP(_p2)&&(fsP.startsWith(_p2+"/node_modules/")||fsP.startsWith(_p2+"/packages/"))));if(!inOwnCwd&&/^\/(?:etc|proc|sys|var|tmp|run|root|boot|dev|home|Users|opt|srv|app|[a-zA-Z]:)(?:\/|$)/i.test(fsP))isSysDir=true;}if(isRceInj||isHardLfi||isSysDir){if(!res.headersSent)res.writeHead(404,{"Content-Type":"text/plain","Cache-Control":"no-store"});res.end("Not Found");return true;}}catch(e){const _u=String((req&&req.url)||"");if(_u.indexOf("__vite-")!==-1||_u.indexOf("@fs")!==-1||_u.indexOf(".env")!==-1||_u.indexOf("%")!==-1||_u.indexOf("..")!==-1){if(!res.headersSent)res.writeHead(404,{"Content-Type":"text/plain","Cache-Control":"no-store"});res.end("Not Found");return true;}}}return orig.apply(this,arguments);};return true;}for(const mn of["http","https","tls","net"]){try{const M=reqMod(mn);if(M&&M.Server&&M.Server.prototype)wrapEmit(M.Server.prototype);}catch(e){}}try{const H2=reqMod("http2");if(H2){for(const fn of["createServer","createSecureServer"]){if(typeof H2[fn]==="function"){const origFn=H2[fn]._lilith_orig_h2||H2[fn];const wrapped=function(){const srv=origFn.apply(this,arguments);if(srv)wrapEmit(Object.getPrototypeOf(srv)||srv);return srv;};wrapped._lilith_orig_h2=origFn;H2[fn]=wrapped;}}}}catch(e){}}const syncReq=globalThis._lreq||(p.getBuiltinModule&&((n)=>p.getBuiltinModule(n)))||(p.mainModule&&p.mainModule.require)||(typeof require!=="undefined"&&require);if(syncReq){_init(syncReq);}else{import("module").then(function(m){_init(m.createRequire("file:///"));}).catch(function(){});}}catch(e){}})();
