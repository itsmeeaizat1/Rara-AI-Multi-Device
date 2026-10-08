// RARA AI - MULTI DEVICE — E2E: VPS Manager (.vps, 2 mode login) (8 Okt 2026)
// Cakupan: store kredensial per-user (isolasi owner vs user), mask, 2 mode
// (owner pakai VPS login sendiri, user ditolak sampai login sendiri),
// plugin DM-gate, parsing subcommand, lib (testConnection, status, panel fix,
// uninstall confirm, tema, sshport, rootpw base64, wings, script url) — SSH dimock.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(R);
let pass = 0, fail = 0;
function t(name, cond, info) {
  if (cond) { pass++; console.log("  ✅ " + name); }
  else { fail++; console.error("  ❌ " + name, info !== undefined ? JSON.stringify(info)?.slice(0, 260) : ""); }
}
const section = (x) => console.log("\n— " + x + " —");

const L = await import(R + "/src/lib/rara-vps-manager.js");
const store = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "vps-")), "vps.json");
L._setVpsStoreForTest(store);

// ── 1. store per-user + isolasi ──
section("1. kredensial per user & isolasi");
t("1a awalnya kosong", L.getCreds("owner@s") === null && L.getCreds("user1@s") === null);
L.saveCreds("owner@s", { host: "1.2.3.4", port: 22, user: "root", password: "RahasiaOwner" });
L.saveCreds("user1@s", { host: "5.6.7.8", port: 2222, user: "root", password: "PwUser1" });
t("1b owner & user beda VPS", L.getCreds("owner@s").host === "1.2.3.4" && L.getCreds("user1@s").host === "5.6.7.8");
t("1c user1 gak lihat login owner", L.getCreds("user1@s").password === "PwUser1" && L.getCreds("user1@s").host !== "1.2.3.4");
const m1 = L.maskCreds(L.getCreds("owner@s"));
t("1d mask password", m1.password.startsWith("R") && !m1.password.includes("ahasiaOwner"));
t("1e persist di file", JSON.parse(fs.readFileSync(store, "utf8")).users["owner@s"].host === "1.2.3.4");
t("1f clearCreds", L.clearCreds("user1@s") === true && L.getCreds("user1@s") === null && L.getCreds("owner@s") !== null);

// ── 2. SSH mock: testConnection + error mapping ──
section("2. ssh mock");
const calls = [];
L._setSshForTest(async (creds, cmd) => {
  calls.push({ host: creds.host, cmd });
  if (creds.password === "salah") { const e = new Error("All configured authentication methods failed"); e.code = "EAUTH"; throw Object.assign(e, {}); }
  if (/hostname &&/.test(cmd)) return { code: 0, stdout: "vpsku\nUbuntu 22.04 LTS\nup 3 days" };
  if (/===DISK/.test(cmd)) return { code: 0, stdout: "===DISK\n/dev/vda1 60G 30G 30G 50% /\n===MEM\n7900 MB total, 2100 MB dipakai\n===CPU\n4\nload: 0.10, 0.20, 0.30\n===SVC\nnginx=active\nmariadb=active\nphp8.1-fpm=active\nredis-server=active\ndocker=active\nwings=active\npteroq=active\nphp8.2-fpm=-\n===PTERO\npanel-terinstal\n===THEME\nnebula.blueprint\n===PANELURL\nAPP_URL=http://panel.ku.com\n" };
  if (/systemctl restart wings/.test(cmd)) return { code: 0, stdout: "active\nwings siap" };
  if (/daemonListen/.test(cmd)) return { code: 0, stdout: "  port: 443\nactive" };
  if (/nginx -t 2>&1/.test(cmd) && /curl/.test(cmd)) return { code: 0, stdout: "syntax is ok\n200" };
  if (/chpasswd/.test(cmd)) return { code: 0, stdout: "PW_CHANGED" };
  if (/sshd_config/.test(cmd)) return { code: 0, stdout: "PORT_CHANGED" };
  if (/BP_READY|blueprintrc/.test(cmd)) return { code: 0, stdout: "BP_READY" };
  if (/blueprint/.test(cmd) && /-install/.test(cmd)) return { code: 0, stdout: "Installing nebula... done" };
  if (/blueprint -remove/.test(cmd) || /blueprint.sh -remove/.test(cmd)) return { code: 0, stdout: "Removing nebula... done" };
  if (/\.blueprint 2>\/dev\/null/.test(cmd) || /xargs -n1 basename/.test(cmd)) return { code: 0, stdout: "nebula.blueprint" };
  if (/DROP DATABASE/.test(cmd)) return { code: 0, stdout: "UNINSTALL_DONE" };
  if (/mysqldump/.test(cmd)) return { code: 0, stdout: "-rw-r--r-- 1 root root 90M backup" };
  if (/systemctl stop pteroq/.test(cmd)) return { code: 0, stdout: "ok" };
  if (/\[ -d \/var\/www\/pterodactyl \]/.test(cmd)) return { code: 0, stdout: "ADA" };
  if (/bash <\(curl/.test(cmd)) return { code: 0, stdout: "script jalan" };
  return { code: 1, stdout: "unexpected: " + cmd.slice(0, 60) };
});
const info = await L.testConnection(L.getCreds("owner@s"));
t("2a testConnection parse", info.hostname === "vpsku" && info.os === "Ubuntu 22.04 LTS" && info.uptime === "up 3 days");
t("2b sshErr mapping auth", /Autentikasi gagal/.test(await L.testConnection({ host: "1.2.3.4", password: "salah" }).catch((e) => e.message)));

// ── 3. status ──
section("3. hostStatus");
const st = await L.hostStatus(L.getCreds("owner@s"));
t("3a disk/mem/cpu keparse", st.disk.includes("30G") && st.disk.includes("60G") && st.mem.includes("7900") && st.cpu.includes("4 core"), st);
t("3b services map", st.services.nginx === "active" && st.services.wings === "active" && st.services["php8.2-fpm"] === "-");
t("3c panel + tema + url", st.panelInstalled === true && st.themes.includes("nebula") && st.panelUrl === "http://panel.ku.com", st);

// ── 4. panel fix + uninstall confirm ──
section("4. panel fix & uninstall");
const fx = await L.panelService(L.getCreds("owner@s"), "fix");
t("4a fix → httpCode + nginxTest", fx.httpCode === "200" && /syntax is ok/.test(fx.nginxTest));
let threw = null;
try { await L.panelUninstall(L.getCreds("owner@s"), { confirm: "salah-kata" }); } catch (e) { threw = e.message; }
t("4b uninstall tanpa confirm ditolak", /Konfirmasi gak valid/.test(threw));
let upg = await L.panelUninstall(L.getCreds("owner@s"), { confirm: "hapus-panel" }, () => {});
t("4c uninstall jalan + note backup+wings aman", upg.note.includes("Backup") && upg.note.includes("Wings"));
t("4d command uninstall bawa DROP + crontab clean", calls.some((c) => /DROP DATABASE/.test(c.cmd) && /crontab/.test(c.cmd)));

// ── 5. tema ──
section("5. tema (blueprint)");
let temaErr = null;
try { await L.themeInstall(L.getCreds("owner@s"), "tema-ngaco"); } catch (e) { temaErr = e.message; }
t("5a nama tema gak dikenal ditolak + daftar preset", /gak dikenal/.test(temaErr) && temaErr.includes("nebula"));
const ti = await L.themeInstall(L.getCreds("owner@s"), "nebula");
t("5b instal preset nebula", ti.nama === "nebula" && /done/.test(ti.log));
const tu = await L.themeUninstall(L.getCreds("owner@s"), "nebula");
t("5c uninstall tema → tema bawaan", /done/.test(tu.log) && tu.note.includes("tema bawaan"));
t("5d nama tema injeksi shell ditolak", await L.themeUninstall(L.getCreds("owner@s"), "a;rm").then(() => false).catch((e) => /gak valid/.test(e.message)));

// ── 6. ganti port ssh / root pw ──
section("6. sshport & rootpw");
const cp = await L.changeSshPort(L.getCreds("owner@s"), 2222);
t("6a sshport valid → port", cp.port === 2222);
t("6b sshport non-angka ditolak", await L.changeSshPort(L.getCreds("owner@s"), "abc").then(() => false).catch((e) => /angka/.test(e.message)));
await L.changeRootPw(L.getCreds("owner@s"), "PwBaru789!", () => {});
t("6c rootpw via base64 (karakter khusus aman)", calls.some((c) => /base64 -d/.test(c.cmd) && !c.cmd.includes("PwBaru789!")));
t("6d rootpw kependekan ditolak", await L.changeRootPw(L.getCreds("owner@s"), "12").then(() => false).catch((e) => /minimal 6/.test(e.message)));

// ── 7. wings + script ──
section("7. wings & script url");
t("7a wingsRestart", /wings siap/.test(await L.wingsRestart(L.getCreds("owner@s"))));
const wp = await L.wingsSetPort(L.getCreds("owner@s"), 443);
t("7b wingsSetPort → daemonListen + restart", wp.includes("active"));
t("7c script url http ditolak", await L.runScriptUrl(L.getCreds("owner@s"), "http://jelek.sh").then(() => false).catch((e) => /https/.test(e.message)));
t("7d script https jalan", (await L.runScriptUrl(L.getCreds("owner@s"), "https://ok.sh")).includes("script jalan"));

// ── 8. plugin: 2 mode + DM gate ──
section("8. plugin .vps — 2 mode");
const P = await import(R + "/plugins/panel/vps.js");
t("8a config", P.config.name === "vps" && P.config.category === "panel" && P.config.isPrivate === true && P.config.isOwner === false);
const src = fs.readFileSync(path.join(R, "plugins/panel/vps.js"), "utf8");
t("8b DM gate grup ditolak", src.includes("m.isGroup") && src.includes("Khusus DM"));
t("8c mode owner vs user", src.includes('MODE(m.isOwner)') && src.includes("OWNER") && src.includes("USER"));
t("8d user ditolak sampai login sendiri", src.includes("akun root VPS-mu sendiri") || src.includes("VPS-mu sendiri"));
t("8e semua fitur: panel install/uninstall/fix, tema, sshport, rootpw, wings, script",
  ["panel install", "panel uninstall confirm hapus-panel", "tema install", "tema uninstall", "sshport", "rootpw", "wings", "script"].every((k) => src.includes(k)));

// simulasi handler: user belum login → ditolak
const replies = [];
const mkM = (sender, text, isOwner, isGroup) => ({
  sender, isOwner, isGroup, text, prefix: ".",
  reply: async (x) => { replies.push(x); return x; },
});
const mkSock = () => ({ sendMessage: async (a, b) => replies.push(b) });
let out = await P.handler(mkM("user2@s", ".vps status", false, false), { sock: mkSock() });
t("8f user non-owner .vps status → DITOLAK KHUSUS OWNER (revisi 8 Okt)", /KHUSUS OWNER/.test(replies[replies.length - 1]) && !replies[replies.length - 1].includes("BELUM LOGIN"));
replies.length = 0;
out = await P.handler(mkM("user2@s", ".vps login 5.6.7.8|2222|root|PwUser2", false, false), { sock: mkSock() });
t("8g user login format 4 bagian → sukses mode USER", /LOGIN VPS BERHASIL/.test(replies[replies.length - 1]) && replies[replies.length - 1].includes("USER"));
t("8h creds user2 tersimpan", L.getCreds("user2@s")?.host === "5.6.7.8" && L.getCreds("user2@s")?.port === 2222);
replies.length = 0;
const callsBefore8i = calls.length;
out = await P.handler(mkM("user2@s", ".vps status", false, false), { sock: mkSock() });
t("8i user2 status → DITOLAK KHUSUS OWNER walau sudah login, SSH gak pernah dipanggil", /KHUSUS OWNER/.test(replies[replies.length - 1]) && !replies[replies.length - 1].includes("STATUS VPS") && calls.length === callsBefore8i);
replies.length = 0;
out = await P.handler(mkM("user2@s", ".vps status", false, true), { sock: mkSock() });
t("8j dipakai di grup → ditolak DM only", /Khusus DM/.test(replies[replies.length - 1]));
replies.length = 0;
out = await P.handler(mkM("owner@s", ".vps status", true, false), { sock: mkSock() });
t("8k owner pakai VPS login owner sendiri (mode OWNER)", /STATUS VPS/.test(replies[replies.length - 1]) && replies[replies.length - 1].includes("OWNER") && calls.at(-1)?.host === "1.2.3.4");
replies.length = 0;
out = await P.handler(mkM("owner@s", ".vps me", true, false), { sock: mkSock() });
t("8l .vps me mask password", replies[replies.length - 1].includes("R***") && !replies[replies.length - 1].includes("RahasiaOwner"));
replies.length = 0;
out = await P.handler(mkM("owner@s", ".vps logout", true, false), { sock: mkSock() });
t("8m logout hapus", /dihapus/.test(replies[replies.length - 1]) && L.getCreds("owner@s") === null);


// ── 9. protect panel ──
section("9. protect panel (fail2ban + rate limit + whitelist admin)");
const pmockCalls = [];
const pmock = async (creds, cmd) => { pmockCalls.push({ host: creds.host, cmd }); return pmockImpl(creds, cmd); };
const pmockImpl = async (creds, cmd) => {
  if (/hostname &&/.test(cmd)) return { code: 0, stdout: "vpsprotect\nUbuntu 22.04\nup 1 day" };
  if (/echo SITE=/.test(cmd)) return { code: 0, stdout: "SITE=ada\nSNIPPET=ada\nF2B=active\nBANNED=2\nWHITELIST=203.0.113.77\nSSHD_BANNED=1" };
  if (/apt-get install -y -qq fail2ban/.test(cmd) || /\[ -f \/var\/www\/pterodactyl\/artisan \]/.test(cmd)) return { code: 0, stdout: "ok" };
  if (/activity_log_events/.test(cmd)) return { code: 0, stdout: "203.0.113.77" };
  if (/ptero-protect.conf/.test(cmd) || /ptero-protect-locations.conf/.test(cmd) || /server_name/.test(cmd)) return { code: 0, stdout: "syntax is ok\nNGINX_OK" };
  if (/ptero-auth.conf/.test(cmd) || /jail.d\/ptero.local/.test(cmd)) return { code: 0, stdout: "F2B_OK" };
  if (/echo SITE=/.test(cmd)) return { code: 0, stdout: "SITE=ada\nSNIPPET=ada\nF2B=active\nBANNED=2\nWHITELIST=203.0.113.77\nSSHD_BANNED=1" };
  if (/fail2ban-client get ptero-auth banned/.test(cmd)) return { code: 0, stdout: "PANEL:\n1.2.3.4\nSSHD:\n5.6.7.8" };
  if (/lepas proteksi/.test(cmd) || /sed -i '\/ptero-protect-locations.conf\/d'/.test(cmd)) return { code: 0, stdout: "UNPROTECT_OK" };
  return { code: 1, stdout: "unexpected-protect: " + cmd.slice(0, 50) };
};
L._setSshForTest(pmock);
let protectErr = null;
try { await L.protectInstall(L.getCreds("user2@s"), { adminId: "abc" }); } catch (e) { protectErr = e.message; }
t("9a admin ID non-angka ditolak", /harus angka/.test(protectErr));
let pi = await L.protectInstall(L.getCreds("user2@s"), { adminId: 1 }, () => {});
t("9b whitelist IP diambil dari activity_log (actor_id)", pi.adminIp === "203.0.113.77");
t("9c command whitelist IP masuk geo + ignoreip", pmockCalls.some((c) => c.cmd.includes("203.0.113.77") && c.cmd.includes("ignoreip")));
const pst = await L.protectStatus(L.getCreds("user2@s"));
t("9d status parse", pst.SNIPPET === "ada" && pst.WHITELIST === "203.0.113.77" && pst.BANNED === "2");
t("9e banned list", (await L.protectBanned(L.getCreds("user2@s"))).includes("1.2.3.4"));
const pu = await L.protectUninstall(L.getCreds("user2@s"), () => {});
t("9f uninstall hapus snippet + jail + include line", pu.ok === true);

// ── 10. plugin .vps protect ──
section("10. plugin .vps protect");
const srcvps = fs.readFileSync(path.join(R, "plugins/panel/vps.js"), "utf8");
t("10a sub protect ada di plugin", srcvps.includes("protect install") && srcvps.includes("protect uninstall"));
replies.length = 0;
out = await P.handler(mkM("user2@s", ".vps protect install 1.2.3.4|pwvps123|1", false, false), { sock: mkSock() });
t("10b format inline ip|pw|adminId → PROTECT AKTIF + whitelist", /PROTECT PANEL AKTIF/.test(replies[replies.length - 1]) && /Whitelist admin: 203.0.113.77/.test(replies[replies.length - 1]));
replies.length = 0;
out = await P.handler(mkM("user2@s", ".vps protect status", false, false), { sock: mkSock() });
t("10c protect status → whitelist + banned tampil", /Whitelist admin: 203.0.113.77/.test(replies[replies.length - 1]) && /Terbanned/.test(replies[replies.length - 1]));
replies.length = 0;
out = await P.handler(mkM("user2@s", ".vps protect banned", false, false), { sock: mkSock() });
t("10d daftar banned IP", replies[replies.length - 1].includes("1.2.3.4"));
replies.length = 0;
out = await P.handler(mkM("user2@s", ".vps protect uninstall", false, false), { sock: mkSock() });
t("10e protect uninstall lepas proteksi", /dilepas/.test(replies[replies.length - 1]));
replies.length = 0;
out = await P.handler(mkM("user2@s", ".vps protect install 99", false, false), { sock: mkSock() });
t("10f format adminId saja (pakai login tersimpan)", /PROTECT PANEL AKTIF/.test(replies[replies.length - 1]));


// ── 11. bentuk produksi: m.text = isi SETELAH command ──
section("11. m.text produksi (args-only) + password karakter khusus");
L._setSshForTest(async (creds, cmd) => {
  if (/hostname &&/.test(cmd)) return { code: 0, stdout: "vpsprod\nUbuntu 22.04\nup 2 days" };
  return { code: 0, stdout: "ok" };
});
replies.length = 0;
await P.handler(mkM("owner@s", "login 213.163.192.209|Aizat123#*", true, false), { sock: mkSock() });
t("11a args-only 'login ip|pw#*' → LOGIN BERHASIL mode OWNER", /LOGIN VPS BERHASIL/.test(replies[replies.length - 1]) && replies[replies.length - 1].includes("OWNER"), replies[replies.length - 1]);
t("11b password # * tersimpan utuh", L.getCreds("owner@s")?.password === "Aizat123#*" && L.getCreds("owner@s")?.host === "213.163.192.209");
replies.length = 0;
await P.handler(mkM("owner@s", "status", true, false), { sock: mkSock() });
t("11c args-only 'status' setelah login → jalan, bukan BELUM LOGIN", !/BELUM LOGIN/.test(replies[replies.length - 1]));
replies.length = 0;
await P.handler(mkM("owner@s", ".vps me", true, false), { sock: mkSock() });
t("11d bentuk lengkap '.vps me' masih jalan", /DATA LOGIN VPS-MU/.test(replies[replies.length - 1]));
replies.length = 0;
await P.handler(mkM("owner@s", "", true, false), { sock: mkSock() });
t("11e kosong → kartu panduan", /VPS & PANEL MANAGER/.test(replies[replies.length - 1]));
replies.length = 0;
await P.handler(mkM("owner@s", "protect status", true, false), { sock: mkSock() });
t("11f args-only 'protect status' dikenali", !/Sub protect gak dikenal|VPS & PANEL MANAGER/.test(replies[replies.length - 1]) || /PROTECT/.test(replies[replies.length - 1]));


// ── 12. status: output nyata VPS owner (regresi 'acak-acakan' 8 Okt) ──
section("12. hostStatus output nyata (tanpa numpuk)");
L._setSshForTest(async () => ({ code: 0, stdout: [
  "===DISK", "/dev/vda2        80G   27G   51G  35% /",
  "===MEM", "7900 MB total, 1520 MB dipakai",
  "===CPU", "4", "load: 0.15, 0.08, 0.02",
  "===SVC", "nginx=active", "mariadb=active", "redis-server=active", "docker=active", "wings=active", "pteroq=active", "php8.1-fpm=inactive", "php8.2-fpm=active", "php8.3-fpm=inactive",
  "===PTERO", "panel-terinstal",
  "===THEME", "nebula.blueprint",
  "===PANELURL", "APP_URL=http://aizatstore.pteroqdactyl.my.id",
].join("\n") }));
const rs = await L.hostStatus({ host: "x", password: "y" });
t("12a disk satu baris rapi", rs.disk === "27G dipakai / 80G (35%)", rs.disk);
t("12b mem cuma isi MEM (gak nelan section lain)", rs.mem === "7900 MB total, 1520 MB dipakai", rs.mem);
t("12c cpu core + load rapi", rs.cpu === "4 core, load 0.15, 0.08, 0.02", rs.cpu);
t("12d services 9 entri bersih", Object.keys(rs.services).length === 9 && rs.services.nginx === "active" && rs.services["php8.1-fpm"] === "inactive");
t("12e panelUrl tanpa prefix APP_URL=", rs.panelUrl === "http://aizatstore.pteroqdactyl.my.id", rs.panelUrl);
t("12f tema tanpa .blueprint", rs.themes.length === 1 && rs.themes[0] === "nebula", rs.themes);

// ── 13. kartu status VPS baru (revisi owner 8 Okt: emoji server, dipakai dulu, arti warna) ──
section("13. kartu .vps status baru + .statuspanel");
const VPS_OUT = [
  "===HOST", "buyer", "===OS", "Ubuntu 22.04.5 LTS", "5.15.0-160-generic", "===UP", "up 2 days, 6 hours, 52 minutes", "===IP", "213.163.192.209",
  "===RAM", "1645 7900", "300 2047", "===DISK", "/dev/vda2 50G 27G 21G 57% /",
  "===CPU", "4", "0.06 0.05 0.00", " Intel Xeon", "===SSH", "22", "===PHPUSED", "8.2",
  "===SVC", "nginx=active", "mariadb=active", "redis-server=active", "docker=active", "wings=active", "pteroq=inactive", "fail2ban=inactive", "php8.1-fpm=inactive", "php8.2-fpm=active", "php8.3-fpm=inactive",
  "===PTERO", "panel-terinstal", "===THEME", "nebula.blueprint", "===PANELURL", "APP_URL=http://aizatstore.pteroqdactyl.my.id", "===PROT", "mati",
].join("\n");
L._setSshForTest(async () => ({ code: 0, stdout: VPS_OUT }));
L.saveCreds("owner@s", { host: "213.163.192.209", port: 22, user: "root", password: "Aizat123#*" });
replies.length = 0;
await P.handler(mkM("owner@s", "status", true, false), { sock: mkSock() });
const vc = replies[replies.length - 1];
t("13a emoji server 📡 (bukan dinosaurus) di judul/server", vc.includes("📡 *Server*") && vc.includes("🖧 *STATUS VPS*"), vc.slice(0, 200));
t("13b dinosaurus cuma buat blok Panel (bukan 'server')", !vc.includes("🦖 *Server*"));
t("13c RAM dipakai dulu baru total (1.6 GB / 7.7 GB)", /RAM : 1\.6 GB \/ 7\.7 GB \(21%\)/.test(vc), vc);
t("13d Disk dipakai dulu baru total", vc.includes("Disk: 27G dipakai / 50G (57%)"), vc);
t("13e swap dipakai dulu baru total", vc.includes("Swap: 300 MB dipakai / 2.0 GB"), vc);
t("13f pteroq merah + alasan MATI", vc.includes("🔴 pteroq — MATI — perlu dihidupkan"), vc);
t("13g php nonaktif normal = ⚪ BUKAN merah", vc.includes("⚪ php8.1-fpm") && vc.includes("⚪ php8.3-fpm") && vc.includes("🟢 php8.2-fpm") && !vc.includes("🔴 php8.1-fpm"), vc);
t("13h peringatan layanan penting mati menyebut pteroq", /1 layanan penting mati: pteroq/.test(vc), vc);
t("13i TANPA blok Arti warna & Fungsi layanan (revisi owner 8 Okt)", !vc.includes("Arti warna") && !vc.includes("Fungsi layanan") && !vc.includes("jalan normal"), vc);
t("13i2 daftar layanan per-baris lengkap (nginx/mariadb/redis/docker/wings/pteroq)", ["nginx", "mariadb", "redis-server", "docker", "wings", "pteroq"].every((n) => vc.includes(n)), vc);
// regresi produksi: php -r tanpa newline -> penanda ===SVC nempel di baris PHP ("8.2===SVC")
const GLUED = VPS_OUT.replace("8.2\n===SVC", "8.2===SVC");
t("13i3 fixture nempel beneran ada", GLUED.includes("8.2===SVC"));
L._setSshForTest(async () => ({ code: 0, stdout: GLUED }));
replies.length = 0;
await P.handler(mkM("owner@s", "status", true, false), { sock: mkSock() });
const vg = replies[replies.length - 1];
t("13i4 penanda nempel: RAM tetap kebaca (bukan 0 MB)", /RAM : 1\.6 GB \/ 7\.7 GB/.test(vg) && !vg.includes("0 MB / 0 MB"), vg);
t("13i5 penanda nempel: PHP bersih '8.2' (tanpa ===SVC)", /PHP\s*: 8\.2\n/.test(vg) && !vg.includes("===SVC"), vg);
t("13i6 penanda nempel: daftar layanan tetap tampil", vg.includes("nginx") && vg.includes("mariadb") && vg.includes("redis-server") && vg.includes("🔴 pteroq"), vg);
L._setSshForTest(async () => ({ code: 0, stdout: VPS_OUT }));
t("13j penjelasan fungsi layanan TIDAK ikut di kartu status (dibuang)", !vc.includes("worker antrian"), vc);
t("13k info akses login: host/port/user/pass masked", vc.includes("Host : 213.163.192.209") && vc.includes("User : root") && /Pass : A•{8}\*/.test(vc) && !vc.includes("Aizat123#*"), vc);
t("13l info server: hostname/OS/kernel/uptime/IP", vc.includes("Hostname : buyer") && vc.includes("Ubuntu 22.04.5") && vc.includes("5.15.0-160") && vc.includes("2 days"), vc);
t("13m status protect panel belum dipasang", vc.includes("Protect: ⚠️ belum dipasang"), vc);
t("13n anti-numpuk: tiap field 1x", (vc.match(/RAM :/g) || []).length === 1 && (vc.match(/🟢 nginx/g) || []).length === 1);

// ── panelStatus + kartu .statuspanel ──
const PS_OUT = [
  "===ADMINS", "1\taizat\taizat@mail.com\tadmin\t0", "2\tmira\tmira@mail.com\tadmin\t1",
  "===USERCOUNT", "5", "===USERS", "9\tbudi\tbudi@mail.com", "8\tsiti\tsiti@mail.com",
  "===SRVCOUNT", "3", "===SERVERS", "3\trara-bot\tbudi\t5120\t10240\taktif", "2\ttest\tsiti\t1024\t2048\taktif",
  "===NODES", "1\tAuto Node\taizatstore.pteroqdactyl.my.id\t443\t7900\t50000",
  "===EGGS", "12", "===LASTLOGIN", "1\taizat\t114.5.6.7\t2026-10-08 09:10:11",
  "===VER", "Pterodactyl 1.11.10", "===ENV", "APP_URL=http://aizatstore.pteroqdactyl.my.id", "APP_ENV=production", "APP_DEBUG=false", "DB_DATABASE=panel", "DB_USERNAME=pterodactyl",
  "===QUEUE", "inactive", "===FAILED", "2", "===PROT", "mati", "===F2B", "inactive", "===BANNED", "", "===WL", "", "===BACKUP", "",
].join("\n");
L._setSshForTest(async () => ({ code: 0, stdout: PS_OUT }));
const ps = await L.panelStatus(L.getCreds("owner@s"));
t("13o panelStatus parse admin banyak + 2FA", ps.installed && ps.admins.length === 2 && ps.admins[1].username === "mira" && ps.admins[1].twofa === true && ps.admins[0].twofa === false, ps.admins);
t("13p panelStatus: user/server/node/egg/versi", ps.userCount === 5 && ps.users.length === 2 && ps.serverCount === 3 && ps.servers[0].name === "rara-bot" && ps.servers[0].memory === 5120 && ps.nodes[0].port === "443" && ps.eggCount === 12 && ps.version.includes("1.11.10"), ps);
const PSM = await import(path.join(R, "plugins/panel/panelstatus.js"));
replies.length = 0;
await PSM.handler(mkM("owner@s", "", true, false), { sock: mkSock() });
const pc = replies[replies.length - 1];
t("13q kartu panel: admin berderet (2 admin) + email + 2FA", pc.includes("1. aizat (#1)") && pc.includes("2. mira (#2)") && pc.includes("2FA: aktif") && pc.includes("mira@mail.com"), pc);
t("13r kartu panel: user & server berderet", pc.includes("budi (#9) — budi@mail.com") && pc.includes("siti (#8)") && pc.includes("rara-bot (#3) — budi — 5.0 GB RAM / 10.0 GB disk") && pc.includes("test (#2) — siti"), pc.split("\n").filter((l) => /budi|rara-bot|siti/.test(l)).join(" | "));
t("13s kartu panel: info host/port/user/pass VPS masked", pc.includes("Host VPS: 213.163.192.209:22 (root)") && /Pass VPS: A•{8}\*/.test(pc) && !pc.includes("Aizat123#*"), pc);
t("13t kartu panel: node + login terakhir admin", pc.includes("Auto Node") && pc.includes("114.5.6.7"), pc);
t("13u kartu panel: protect BELUM terpasang + arahan install", pc.includes("BELUM TERPASANG") && pc.includes("vps protect install"), pc);
t("13v kartu panel: pteroq mati + job gagal + arahan fixqueue", pc.includes("🔴 pteroq MATI") && pc.includes("2 job antrian gagal") && pc.includes("statuspanel fixqueue"), pc);

// protect aktif
L._setSshForTest(async () => ({ code: 0, stdout: PS_OUT.replace("===PROT\nmati", "===PROT\naktif").replace("===F2B\ninactive", "===F2B\nactive").replace("===BANNED\n", "===BANNED\n4\n").replace("===WL\n", "===WL\n203.0.113.7\n").replace("===QUEUE\ninactive", "===QUEUE\nactive") }));
replies.length = 0;
await PSM.handler(mkM("owner@s", "status", true, false), { sock: mkSock() });
const pc2 = replies[replies.length - 1];
t("13w protect aktif → AKTIF + whitelist + banned", pc2.includes("AKTIF") && pc2.includes("203.0.113.7") && pc2.includes("IP terbanned: 4"), pc2);
t("13x pteroq jalan → hijau", pc2.includes("🟢 pteroq jalan"), pc2);

// gate: grup & belum login
replies.length = 0;
await PSM.handler(mkM("owner@s", "", true, true), { sock: mkSock() });
t("13y di grup → DM only", /Khusus DM/.test(replies[replies.length - 1]));
replies.length = 0;
await PSM.handler(mkM("user9@s", "", false, false), { sock: mkSock() });
t("13z user non-owner .statuspanel → DITOLAK KHUSUS OWNER (walau belum login)", /KHUSUS OWNER/.test(replies[replies.length - 1]));
// user sudah login pun tetap ditolak untuk status panel
L.saveCreds("user9@s", { host: "5.6.7.9", port: 22, user: "root", password: "PwUser9" });
replies.length = 0;
await PSM.handler(mkM("user9@s", "status", false, false), { sock: mkSock() });
t("13z2 user9 login sendiri pun .statuspanel status → KHUSUS OWNER", /KHUSUS OWNER/.test(replies[replies.length - 1]));

// fixqueue + .vps pteroq
L._setSshForTest(async (c, cmd) => ({ code: 0, stdout: "UNIT_DIBUAT\nSTATE=active" }));
replies.length = 0;
await PSM.handler(mkM("owner@s", "fixqueue", true, false), { sock: mkSock() });
t("13aa fixqueue → pteroq JALAN + unit dibuat", /pteroq JALAN/.test(replies[replies.length - 1]) && replies[replies.length - 1].includes("unit systemd dibuat"));
replies.length = 0;
await P.handler(mkM("owner@s", "pteroq", true, false), { sock: mkSock() });
t("13ab .vps pteroq juga jalan", /pteroq JALAN/.test(replies[replies.length - 1]));

// panel belum terpasang
L._setSshForTest(async () => ({ code: 0, stdout: "NOPANEL" }));
replies.length = 0;
await PSM.handler(mkM("owner@s", "", true, false), { sock: mkSock() });
t("13ac panel belum ada → pesan pasang", /belum terpasang/.test(replies[replies.length - 1]));

// ── pencegat .panel status di cpanel.js ──
const CP = await import(path.join(R, "plugins/panel/cpanel.js"));
L._setSshForTest(async () => ({ code: 0, stdout: PS_OUT }));
replies.length = 0;
const mp = mkM("owner@s", "status", true, false); mp.command = "panel"; mp.args = ["status"];
await CP.handler(mp, { sock: mkSock() });
t("13ad .panel status → dicegat ke info panel VPS", replies.some((r) => r.includes("STATUS PANEL")), replies);
replies.length = 0;
const mp2 = mkM("owner@s", "status rara-bot 1", true, false); mp2.command = "panel"; mp2.args = ["status", "rara-bot", "1"];
try { await CP.handler(mp2, { sock: mkSock() }); } catch {}
t("13ae .panel status <server> <id> TIDAK dicegat (jalur status server game utuh)", !replies.some((r) => r.includes("STATUS PANEL")), replies);
t("13af plugin statuspanel terdaftar di kategori panel", PSM.config.category === "panel" && PSM.config.name === "statuspanel" && PSM.config.alias.includes("infopanel"));

L._resetSshForTest();
L._resetVpsStoreForTest();

console.log(`\n${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
EOF_MARKER_NEVER
