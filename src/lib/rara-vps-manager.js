// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// src/lib/rara-vps-manager.js — .vps (8 Okt 2026)
// Manajemen VPS & panel Pterodactyl via SSH dari bot. PER-USER: tiap user login
// akun root VPS-nya sendiri (tersimpan privat, khusus DM). Fitur:
//   login/logout/test, status host, exec shell, instal & uninstal panel,
//   instal & uninstal tema (blueprint), fix/kill/restart panel, wings restart/port,
//   ganti host/port/pw credential + ganti SSH port & root password asli.
// Kredensial disimpan di data/vps-manager.json (per JID, terisolasi antar user).

import { Client } from "ssh2";
import fs from "node:fs";
import path from "node:path";

const DATA_PATH = path.join(process.cwd(), "data", "vps-manager.json");
const DEFAULT_PORT = 22;
const SSH_TIMEOUT_MS = 15000;
const LONG_TIMEOUT_MS = 15 * 60 * 1000; // instal panel

// ── store kredensial per user ──
let _storePathForTest = null;
export function _setVpsStoreForTest(p) { _storePathForTest = p; }
export function _resetVpsStoreForTest() { _storePathForTest = null; }
function storePath() { return _storePathForTest || DATA_PATH; }
function readAll() { try { return JSON.parse(fs.readFileSync(storePath(), "utf8")); } catch { return {}; } }
function writeAll(s) { fs.mkdirSync(path.dirname(storePath()), { recursive: true }); fs.writeFileSync(storePath(), JSON.stringify(s, null, 2)); }

export function getCreds(jid) { return readAll().users?.[jid] || null; }
export function saveCreds(jid, c) {
  const s = readAll(); s.users = s.users || {};
  s.users[jid] = { ...(s.users[jid] || {}), ...c, updatedAt: new Date().toISOString() };
  writeAll(s);
  return s.users[jid];
}
export function clearCreds(jid) {
  const s = readAll(); const had = !!s.users?.[jid];
  if (s.users) delete s.users[jid];
  writeAll(s);
  return had;
}
export function maskCreds(c) {
  if (!c) return null;
  const pw = c.password || "";
  return { host: c.host, port: c.port || DEFAULT_PORT, user: c.user || "root",
    password: pw ? pw[0] + "*".repeat(Math.max(pw.length - 1, 2)) : "" };
}

// ── seam SSH buat e2e: mock(jid, creds, cmd) → {code, stdout} ──
let _sshForTest = null;
export function _setSshForTest(fn) { _sshForTest = fn; }
export function _resetSshForTest() { _sshForTest = null; }

// eksekusi 1 command di host. Opts: {timeoutMs, onData}
export function sshExec(creds, cmd, opts = {}) {
  if (_sshForTest) return Promise.resolve(_sshForTest(creds, cmd, opts)).catch((e) => { throw new Error(sshErrMsg(e)); });
  return new Promise((resolve, reject) => {
    const conn = new Client();
    let stdout = ""; let stderr = ""; let code = null; let done = false;
    const timeoutMs = opts.timeoutMs || SSH_TIMEOUT_MS;
    const finish = (err, r) => {
      if (done) return; done = true;
      try { conn.end(); } catch {}
      if (err) reject(err); else resolve(r);
    };
    const timer = setTimeout(() => {
      if (code === null) finish(new Error(`SSH timeout ${Math.round(timeoutMs / 1000)}s — command gak kelar. Coba lagi / command kegedean.`));
    }, timeoutMs);
    conn.on("ready", () => {
      conn.exec(`bash -c '${cmd.replace(/'/g, `'\\''`)}'`, { pty: false }, (err, stream) => {
        if (err) { clearTimeout(timer); return finish(err); }
        stream.on("close", (c) => {
          clearTimeout(timer); code = c || 0;
          finish(null, { code, stdout: stdout.slice(-16384), stderr: stderr.slice(-8192) });
        });
        stream.on("data", (d) => { stdout += d.toString(); opts.onData?.(d.toString()); });
        stream.stderr.on("data", (d) => { stderr += d.toString(); });
      });
    }).on("error", (e) => { clearTimeout(timer); finish(new Error(sshErrMsg(e))); })
      .connect({
        host: creds.host, port: creds.port || DEFAULT_PORT, username: creds.user || "root",
        password: creds.password, readyTimeout: SSH_TIMEOUT_MS,
        tryKeyboard: true,
        keyboardInteractive: (name, instr, lang, prompts, fin) => {
          fin(prompts.map(() => creds.password));
        },
      });
  });
}

function sshErrMsg(e) {
  const m = String(e?.message || e);
  if (/ECONNREFUSED/.test(m)) return `Koneksi ditolak ${e?.host || ""} — port SSH salah / host mati.`;
  if (/ENOTFOUND|EAI_AGAIN/.test(m)) return "Host/IP gak ditemukan — cek ulang IP atau domain VPS.";
  if (/timed?\s?out/i.test(m)) return "Timeout koneksi — IP salah atau port keblok firewall.";
  if (/All configured authentication/.test(m)) return "Autentikasi gagal — user/password root salah.";
  return "SSH error: " + m;
}

export async function sshOk(creds, cmd, opts) {
  const r = await sshExec(creds, cmd, opts);
  if (r.code !== 0) throw new Error((r.stderr || r.stdout || `exit ${r.code}`).slice(-900));
  return r.stdout;
}

// ── test koneksi ──
export async function testConnection(creds) {
  const out = await sshOk(creds, "hostname && . /etc/os-release 2>/dev/null && echo $PRETTY_NAME; uptime -p", { timeoutMs: 12000 });
  const [hostname, os, up] = out.trim().split("\n");
  return { hostname, os: os || "-", uptime: up || "-" };
}

// ── status host + layanan panel ──
export async function hostStatus(creds) {
  const cmd = `echo "===DISK"; df -h / | tail -1; echo "===MEM"; free -m | awk 'NR==2{print $2" MB total, "$3" MB dipakai"}'; echo "===CPU"; nproc; uptime | awk -F'load average:' '{print "load:"$2}'; echo "===SVC"; for s in nginx mariadb redis-server docker wings pteroq php8.1-fpm php8.2-fpm php8.3-fpm; do printf "%s=%s\\n" "$s" "$(systemctl is-active $s 2>/dev/null || echo -)"; done; echo "===PTERO"; [ -d /var/www/pterodactyl ] && echo panel-terinstal || echo panel-tidak-ada; echo "===THEME"; ls /var/www/pterodactyl/*.blueprint 2>/dev/null | xargs -n1 basename 2>/dev/null || echo -; echo "===PANELURL"; grep -h '^APP_URL' /var/www/pterodactyl/.env 2>/dev/null || echo -`;
  const out = await sshOk(creds, cmd, { timeoutMs: 20000 });
  const sec = (k) => out.split("===" + k + "\n")[1]?.split("===\n")[0].trim() || "-";
  const svc = {};
  for (const l of sec("SVC").split("\n")) { const [n, v] = l.split("="); if (n && v) svc[n] = v; }
  return { disk: sec("DISK"), mem: sec("MEM"), cpu: sec("CPU"), services: svc,
    panelInstalled: sec("PTERO").includes("panel-terinstal"), themes: sec("THEME") === "-" ? [] : sec("THEME").split("\n"), panelUrl: sec("PANELURL") };
}

// ── panel: fix / kill / restart / start ──
const PANEL_SVCS = ["nginx", "php8.1-fpm", "php8.2-fpm", "php8.3-fpm", "mariadb", "redis-server", "pteroq"];

export async function panelService(creds, action) { // start|stop|restart|fix
  if (action === "fix") {
    const out = await sshOk(creds, `cd /var/www/pterodactyl || exit 9
chown -R www-data:www-data storage/* bootstrap/cache/ 2>/dev/null
php artisan cache:clear -q; php artisan config:clear -q; php artisan view:clear -q; php artisan migrate --seed --force -q || true
systemctl restart mariadb redis-server 2>/dev/null; systemctl restart php8.1-fpm php8.2-fpm php8.3-fpm 2>/dev/null; systemctl restart pteroq 2>/dev/null; systemctl restart nginx
sleep 2; nginx -t 2>&1 | tail -1; curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1 || echo -1`, { timeoutMs: 90000 });
    const lines = out.trim().split("\n");
    return { httpCode: lines[lines.length - 1], nginxTest: lines[lines.length - 2] || "-" };
  }
  await sshOk(creds, `systemctl ${action} nginx pteroq 2>/dev/null; systemctl ${action} php8.1-fpm php8.2-fpm php8.3-fpm 2>/dev/null; echo ok`, { timeoutMs: 60000 });
  return { action };
}

// ── instal panel (Ubuntu, flow resmi docs, non-interaktif) ──
export async function panelInstall(creds, { domain, email }, onProgress) {
  if (!/^[\w.-]+(\.[\w-]+)+$/.test(domain || "")) throw new Error("Domain/hostname gak valid — contoh: panel.domainku.com");
  const dbPw = cryptoPw();
  const cmds = [
    ["apt paket", "apt-get update -qq && apt-get install -y -qq software-properties-common curl apt-transport-https ca-certificates gnupg git unzip tar"],
    ["db + web + php", "apt-get install -y -qq mariadb-server redis-server nginx composer php php-gd php-mysql php-mbstring php-bcmath php-xml php-curl php-zip && systemctl enable --now mariadb redis-server nginx"],
    ["database", `mysql -e "CREATE DATABASE IF NOT EXISTS panel; CREATE USER IF NOT EXISTS 'pterodactyl'@'127.0.0.1' IDENTIFIED BY '${dbPw}'; GRANT ALL PRIVILEGES ON panel.* TO 'pterodactyl'@'127.0.0.1'; FLUSH PRIVILEGES;"`],
    ["unduh panel", `cd /var/www && curl -sSLo panel.tar.gz https://github.com/pterodactyl/panel/releases/latest/download/panel.tar.gz && mkdir -p pterodactyl && tar -xzf panel.tar.gz -C pterodactyl && rm panel.tar.gz && cd pterodactyl && chmod -R 755 storage/* bootstrap/cache/ && cp -n .env.example .env`],
    ["composer", "cd /var/www/pterodactyl && composer install --no-dev --optimize-autoloader --no-interaction 2>&1 | tail -2"],
    ["konfigurasi", `cd /var/www/pterodactyl && php artisan key:generate --force > /dev/null && sed -i "s|^APP_NAME=.*|APP_NAME=Pterodactyl|; s|^APP_URL=.*|APP_URL=http://${domain}|; s|^DB_HOST=.*|DB_HOST=127.0.0.1|; s|^DB_DATABASE=.*|DB_DATABASE=panel|; s|^DB_USERNAME=.*|DB_USERNAME=pterodactyl|; s|^DB_PASSWORD=.*|DB_PASSWORD=${dbPw}|" .env && php artisan migrate --seed --force -q && php artisan p:user:make --email ${email || "admin@" + domain} --username admin --name Admin --password ${cryptoPw()} 2>&1 | tail -3 || true`],
    ["cron + queue", `(crontab -l 2>/dev/null | grep -v artisan; echo "* * * * * php /var/www/pterodactyl/artisan schedule:run >> /dev/null 2>&1") | crontab -; cat > /etc/systemd/system/pteroq.service <<'UNIT'
[Unit]
Description=Pteroq Queue
After=redis-server.service mariadb.service
[Service]
User=www-data
Restart=always
ExecStart=/usr/bin/php /var/www/pterodactyl/artisan queue:work --queue=high,standard,low --sleep=3 --tries=3
[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload && systemctl enable --now pteroq`],
    ["nginx + hak akses", `PHPVER=$(ls /etc/php | head -1) && cat > /etc/nginx/sites-available/pterodactyl.conf <<'NGINX'
server {
    listen 80;
    server_name ${domain};
    root /var/www/pterodactyl/public;
    index index.html index.php;
    charset utf-8;
    client_max_body_size 32m;
    location / { try_files $uri $uri/ /index.php?$query_string; }
    location ~ \\.php$ { fastcgi_pass unix:/run/php/php-\${PHPVER}-fpm.sock; fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name; include fastcgi_params; fastcgi_hide_header X-Powered-By; }
}
NGINX
ln -sf /etc/nginx/sites-available/pterodactyl.conf /etc/nginx/sites-enabled/ && rm -f /etc/nginx/sites-enabled/default && nginx -t && systemctl reload nginx && chown -R www-data:www-data /var/www/pterodactyl && echo INSTALL_DONE`],
  ];
  for (const [label, c] of cmds) {
    onProgress?.("• " + label + "…");
    const r = await sshExec(creds, c, { timeoutMs: LONG_TIMEOUT_MS });
    if (r.code !== 0) throw new Error(`Gagal di langkah "${label}":\n${(r.stderr || r.stdout).slice(-700)}`);
  }
  return { url: `http://${domain}`, note: "Selesai — panel aktif. Buat admin manual kalau belum: php artisan p:user:make (di /var/www/pterodactyl)." };
}

// ── uninstal panel (backup dulu, confirm wajib) ──
export async function panelUninstall(creds, { confirm, backup = true }, onProgress) {
  if (confirm !== "hapus-panel") throw new Error("Konfirmasi gak valid — ketik: .vps panel uninstall confirm hapus-panel");
  onProgress?.("• cek panel…");
  const ada = await sshOk(creds, "[ -d /var/www/pterodactyl ] && echo ADA || echo TIDAK");
  if (!ada.includes("ADA")) throw new Error("Panel gak ketemu di host ini — gak ada yang di-uninstal.");
  if (backup) {
    onProgress?.("• backup panel + database… (bisa lama)");
    await sshOk(creds, `TS=$(date +%Y%m%d-%H%M) && mysqldump panel > /tmp/panel-$TS.sql 2>/dev/null; tar -czf /root/panel-backup-$TS.tar.gz -C /var/www pterodactyl --exclude='node_modules' 2>/dev/null; tar -czf /root/panel-db-$TS.sql.tar.gz -C /tmp panel-$TS.sql 2>/dev/null; rm -f /tmp/panel-$TS.sql; ls -lh /root/panel-backup-$TS.tar.gz`, { timeoutMs: 300000 });
  }
  onProgress?.("• matikan layanan…");
  await sshOk(creds, "systemctl stop pteroq 2>/dev/null; systemctl disable pteroq 2>/dev/null; rm -f /etc/systemd/system/pteroq.service; rm -f /etc/nginx/sites-enabled/pterodactyl.conf /etc/nginx/sites-available/pterodactyl.conf; nginx -t && systemctl reload nginx");
  onProgress?.("• hapus database + file panel…");
  await sshOk(creds, `mysql -e "DROP DATABASE IF EXISTS panel; DROP USER IF EXISTS 'pterodactyl'@'127.0.0.1';" && rm -rf /var/www/pterodactyl && crontab -l 2>/dev/null | grep -v pterodactyl/artisan | crontab - ; echo UNINSTALL_DONE`, { timeoutMs: 120000 });
  return { note: "Panel di-uninstal. Backup di /root/panel-backup-*.tar.gz (kalau backup aktif). Wings & server game gak disentuh." };
}

// ── tema (blueprint) ──
export const THEME_PRESETS = {
  nebula: "https://github.com/FikXzModzDeveloper/Nebula-Theme-pterodactyl/raw/main/nebula.blueprint",
};
// enigma/billing/stellar = autoinstaller script (menu interaktif) → jalur .vps script <url>

const CMD_BLUEPRINT_INSTALL = `cd /var/www/pterodactyl && if ! command -v blueprint &>/dev/null && [ ! -f blueprint.sh ]; then wget -q "$(curl -s https://api.github.com/repos/BlueprintFramework/framework/releases/latest | grep 'browser_download_url' | grep 'release.zip' | cut -d '"' -f 4)" -O release.zip && unzip -oq release.zip && rm release.zip && touch .blueprintrc && printf 'WEBUSER="www-data";\\nOWNERSHIP="www-data:www-data";\\nUSERSHELL="/bin/bash";\\n' > .blueprintrc && chmod +x blueprint.sh && bash blueprint.sh; fi && echo BP_READY`;

export async function themeInstall(creds, nameOrUrl, onProgress) {
  let url = THEME_PRESETS[nameOrUrl.toLowerCase()] || null;
  if (!url && /^https:\/\//.test(nameOrUrl)) url = nameOrUrl;
  if (!url) throw new Error(`Tema "${nameOrUrl}" gak dikenal. Preset: ${Object.keys(THEME_PRESETS).filter((k) => THEME_PRESETS[k]).join(", ")} — atau kirim URL file .blueprint.`);
  const nama = url.split("/").pop().replace(/\.blueprint$/, "");
  onProgress?.("• siapin blueprint framework…");
  await sshOk(creds, CMD_BLUEPRINT_INSTALL, { timeoutMs: 300000 });
  onProgress?.(`• instal tema ${nama}…`);
  const out = await sshOk(creds, `cd /var/www/pterodactyl && wget -q -O ${nama}.blueprint "${url}" && (printf "\\n\\n" | blueprint -install ${nama} 2>&1 || printf "\\n\\n" | bash blueprint.sh -install ${nama} 2>&1) | tail -6`, { timeoutMs: 300000 });
  return { nama, log: out.slice(-500) };
}

export async function themeUninstall(creds, nama) {
  if (!/^[\w-]+$/.test(nama)) throw new Error("Nama tema gak valid.");
  const out = await sshOk(creds, `cd /var/www/pterodactyl && (blueprint -remove ${nama} 2>&1 || bash blueprint.sh -remove ${nama} 2>&1) | tail -6 && rm -f ${nama}.blueprint`, { timeoutMs: 180000 });
  return { nama, log: out.slice(-500), note: "Panel balik ke tema bawaan. Kalau tampilan masih nyangkut: .vps panel fix." };
}

export async function themeList(creds) {
  const out = await sshOk(creds, "ls /var/www/pterodactyl/*.blueprint 2>/dev/null | xargs -n1 basename 2>/dev/null; echo ---; cd /var/www/pterodactyl 2>/dev/null && (blueprint -l 2>/dev/null || bash blueprint.sh -l 2>/dev/null) | head -20", { timeoutMs: 30000 });
  return out.trim() || "gak ada file .blueprint di panel";
}

// ── ganti host/port/pw ──
export async function changeSshPort(creds, port, onProgress) {
  if (!/^\d+$/.test(String(port)) || +port < 1 || +port > 65535) throw new Error("Port harus angka 1-65535.");
  onProgress?.("• ubah port SSH di host…");
  await sshOk(creds, `sed -i "s/^#\\?Port .*/Port ${port}/" /etc/ssh/sshd_config && systemctl restart sshd && echo PORT_CHANGED`, { timeoutMs: 30000 });
  return { port: +port };
}

export async function changeRootPw(creds, newPw, onProgress) {
  if (!newPw || newPw.length < 6) throw new Error("Password minimal 6 karakter.");
  onProgress?.("• ganti password root…");
  const b64 = Buffer.from(newPw, "utf8").toString("base64");
  await sshOk(creds, `printf 'root:%%s' "$(echo ${b64} | base64 -d)" | chpasswd && echo PW_CHANGED`, { timeoutMs: 20000 });
  return { ok: true };
}

export function cryptoPw() {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 16; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

// ── wings ──
export async function wingsRestart(creds) {
  const out = await sshOk(creds, "systemctl restart wings && sleep 2 && systemctl is-active wings && journalctl -u wings -n 3 --no-pager 2>/dev/null | tail -3", { timeoutMs: 60000 });
  return out.trim();
}

export async function wingsSetPort(creds, port, onProgress) {
  if (!/^\d+$/.test(String(port)) || +port < 1 || +port > 65535) throw new Error("Port harus angka 1-65535.");
  onProgress?.("• ganti port wings (config.yml + node daemonListen)…");
  const out = await sshOk(creds, `CUR=$(grep -m1 -oP 'port: \K[0-9]+' /etc/pterodactyl/config.yml) && sed -i "0,/port: $CUR/s//port: ${port}/" /etc/pterodactyl/config.yml && grep -m1 'port:' /etc/pterodactyl/config.yml && cd /var/www/pterodactyl && php artisan tinker --execute="Pterodactyl\\Models\\Node::query()->update(['daemonListen' => ${port}]);" > /dev/null 2>&1 || true && systemctl restart wings && sleep 2 && systemctl is-active wings`, { timeoutMs: 90000 });
  return out.trim();
}

// ── installer script generik (autoinstaller tema custom, dsb.) ──
export async function runScriptUrl(creds, url, onProgress) {
  if (!/^https:\/\/[\w.-]+/.test(url)) throw new Error("URL harus https://.");
  onProgress?.("• unduh + jalankan script… (timeout 10 menit)");
  const r = await sshExec(creds, `bash <(curl -sSL ${url}) 2>&1 | tail -20`, { timeoutMs: 10 * 60 * 1000 });
  if (r.code !== 0) throw new Error("Script gagal:\n" + (r.stdout || r.stderr).slice(-700));
  return r.stdout.slice(-800);
}
