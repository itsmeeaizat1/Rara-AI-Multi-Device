// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// builder/apk/receiver/server.js — HTTP API BUILD (dipakai bot Rara & script/API eksternal)
// Build jalan di SUBPROCESS → /status tetap bisa di-poll selama build.
// Endpoint:
//   GET  /health    → {ok, state}
//   GET  /status    → {state, since, type, seconds, apks:[{name,size}], logTail, error}
//   GET  /download/<n> → stream apk ke-n
//   POST /build    → 3 bentuk:
//     - Content-Type application/zip   : body = ZIP project (script/gradle/flutter/html)
//     - Content-Type application/json   : {repo:"https://github.com/u/r"}
//     - Content-Type application/json   : {url:"https://web.com", name:"Nama", icon:"<base64 png>"}
// Header opsional X-Build-Token: di-set via env BUILD_TOKEN; kosong = terbuka (port cuma internal VPS).
const http = require("node:http");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFile, spawn } = require("node:child_process");

const PORT = parseInt(process.env.SERVER_PORT || "8080", 10);
const WS = path.join(os.homedir(), "workspace");
const MAX_ZIP = 200 * 1024 * 1024; // 200 MB
const RESULT = path.join(WS, "build-result.json");
const LOG = path.join(WS, "builder.log");

const state = { state: "idle", since: Date.now(), type: null, seconds: 0, apks: [], logTail: "", error: null };
let child = null;

fs.mkdirSync(WS, { recursive: true });
const log = (s) => { fs.appendFileSync(LOG, s + "\n"); console.log(s); };
fs.writeFileSync(LOG, "");

function tailLog() {
  try { state.logTail = fs.readFileSync(LOG, "utf8").slice(-8192); } catch { state.logTail = ""; }
  return state.logTail;
}

function startBuild() {
  state.state = "building"; state.since = Date.now(); state.error = null; state.apks = [];
  try { fs.rmSync(RESULT); } catch {}
  child = spawn("node", ["/opt/receiver/app/run-build.js", WS, RESULT], { stdio: ["ignore", fs.openSync(LOG, "a"), "inherit"] });
  log("[receiver] build mulai pid=" + child.pid);
  child.on("exit", (code) => {
    child = null;
    tailLog();
    let res = null;
    try { res = JSON.parse(fs.readFileSync(RESULT, "utf8")); } catch {}
    if (res && res.ok) {
      state.type = res.type; state.seconds = res.seconds; state.apks = res.apks; state.state = "done";
    } else {
      state.error = (res && res.error) || "exit code " + code; state.state = "error";
    }
  });
}

function prepareDir() {
  fs.rmSync(path.join(WS, "project"), { recursive: true, force: true });
  fs.mkdirSync(path.join(WS, "project"), { recursive: true });
  return path.join(WS, "project");
}

function prepZip(body) { // sinkron: cepat
  const pdir = prepareDir();
  const zp = path.join(WS, "src.zip");
  fs.writeFileSync(zp, body);
  execFile("unzip", ["-q", zp, "-d", pdir], { sync: true });
  return pdir;
}

function prepRepo(repo) {
  if (!/^https:\/\/(github\.com|gitlab\.com)\/[\w.\-/]+/.test(repo)) throw new Error("Repo harus https URL github/gitlab");
  const pdir = prepareDir();
  return new Promise((ok, no) => {
    execFile("git", ["clone", "--depth", "1", repo, pdir], { timeout: 180000, maxBuffer: 65536 }, (e) => {
      if (e) no(new Error("git clone gagal: " + String(e.message).slice(0, 300)));
      else ok(pdir);
    });
  });
}

function prepWeb({ url, name, icon }) {
  if (!/^https?:\/\//.test(url)) throw new Error("URL harus http(s)://");
  const pdir = prepareDir();
  fs.writeFileSync(path.join(pdir, "index.html"),
    "<!doctype html><title>App</title><meta http-equiv=refresh content='0;url=" + url + "'><script>location.replace('" + url + "')</script>");
  if (name) fs.writeFileSync(path.join(pdir, ".app-name"), String(name).slice(0, 48));
  if (icon) fs.writeFileSync(path.join(pdir, "icon.png"), Buffer.from(String(icon).replace(/^data:.*?,/, "").replace(/^data:.*?base64,/, ""), "base64"));
  return pdir;
}

const server = http.createServer((req, res) => {
  const send = (code, obj, headers) => {
    res.writeHead(code, Object.assign({ "Content-Type": "application/json" }, headers || {}));
    res.end(typeof obj === "string" ? obj : JSON.stringify(obj));
  };
  if (process.env.BUILD_TOKEN && req.headers["x-build-token"] !== process.env.BUILD_TOKEN) return send(401, { error: "token salah" });

  if (req.method === "GET" && req.url === "/health") return send(200, { ok: true, state: state.state });
  if (req.method === "GET" && req.url === "/status") { tailLog(); return send(200, state); }

  if (req.method === "GET" && req.url.startsWith("/download/")) {
    const n = parseInt((req.url.split("/")[2] || "0"), 10);
    const apk = state.apks[n];
    if (!apk) return send(404, { error: "apk tidak ada — /status dulu" });
    res.writeHead(200, { "Content-Type": "application/vnd.android.package-archive", "Content-Length": apk.size, "Content-Disposition": 'attachment; filename="' + apk.name + '"' });
    return fs.createReadStream(apk.path).pipe(res);
  }

  if (req.method === "POST" && req.url === "/build") {
    if (state.state === "building") return send(409, { error: "builder sibuk — ada job lain jalan. .buildapk status buat pantau." });
    const chunks = []; let size = 0; let tooBig = false;
    req.on("data", (c) => { size += c.length; if (size > MAX_ZIP) tooBig = true; else chunks.push(c); });
    req.on("end", () => {
      try {
        if (tooBig) return send(413, { error: "project kegedean (max 200 MB)" });
        const body = Buffer.concat(chunks);
        const ct = (req.headers["content-type"] || "").split(";")[0].trim();
        if (["application/zip", "application/octet-stream", "application/x-zip-compressed"].includes(ct)) {
          prepZip(body); startBuild();
          return send(202, { ok: true, state: "building" });
        }
        if (ct === "application/json") {
          const j = JSON.parse(body.toString("utf8") || "{}");
          if (j.repo) {
            prepRepo(j.repo).then(() => { startBuild(); }).catch((e) => send(400, { error: String(e.message).slice(0, 400) }));
            return; // jawab via callback
          }
          if (j.url) { prepWeb(j); startBuild(); return send(202, { ok: true, state: "building" }); }
          return send(400, { error: "json harus punya repo atau url" });
        }
        return send(400, { error: "Content-Type harus application/zip atau application/json" });
      } catch (e) {
        state.state = "error"; state.error = String(e.message || e).slice(0, 400);
        return send(400, { error: state.error });
      }
    });
    return;
  }
  send(404, { error: "endpoint gak ada" });
});

server.listen(PORT, "0.0.0.0", () => log("[receiver] listening on :" + PORT));
