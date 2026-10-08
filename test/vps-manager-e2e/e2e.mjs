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
t("8f user belum login → ditolak + arahan login", /BELUM LOGIN/.test(replies[replies.length - 1]) && replies[replies.length - 1].includes(".vps login"));
replies.length = 0;
out = await P.handler(mkM("user2@s", ".vps login 5.6.7.8|2222|root|PwUser2", false, false), { sock: mkSock() });
t("8g user login format 4 bagian → sukses mode USER", /LOGIN VPS BERHASIL/.test(replies[replies.length - 1]) && replies[replies.length - 1].includes("USER"));
t("8h creds user2 tersimpan", L.getCreds("user2@s")?.host === "5.6.7.8" && L.getCreds("user2@s")?.port === 2222);
replies.length = 0;
out = await P.handler(mkM("user2@s", ".vps status", false, false), { sock: mkSock() });
t("8i user2 status → jalan di VPS user2 (5.6.7.8)", calls.at(-1)?.host === "5.6.7.8" && /STATUS VPS/.test(replies[replies.length - 1]));
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
replies.length = 0;
L.saveCreds("owner@s", { host: "213.163.192.209", port: 22, user: "root", password: "x" });
await P.handler(mkM("owner@s", "status", true, false), { sock: mkSock() });
const card = replies[replies.length - 1];
t("12g kartu: tiap field sekali (anti numpuk)", (card.match(/Disk:/g) || []).length === 1 && (card.match(/RAM:/g) || []).length === 1 && (card.match(/CPU:/g) || []).length === 1 && (card.match(/nginx/g) || []).length === 1, card);
t("12h kartu: gak bocor penanda ===/APP_URL=/panel-terinstal", !/===|APP_URL=|panel-terinstal/.test(card), card);
t("12i kartu: layanan inactive merah, active hijau", card.includes("🟢 nginx") && card.includes("🔴 php8.1-fpm"), card);

L._resetSshForTest();
L._resetVpsStoreForTest();

console.log(`\n${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
EOF_MARKER_NEVER
