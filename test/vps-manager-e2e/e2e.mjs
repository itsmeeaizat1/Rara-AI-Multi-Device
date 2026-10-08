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
t("3a disk/mem/cpu keparse", st.disk.includes("60G") && st.mem.includes("7900") && st.cpu.includes("4"));
t("3b services map", st.services.nginx === "active" && st.services.wings === "active" && st.services["php8.2-fpm"] === "-");
t("3c panel + tema + url", st.panelInstalled === true && st.themes.includes("nebula.blueprint") && st.panelUrl === "APP_URL=http://panel.ku.com");

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

L._resetSshForTest();
L._resetVpsStoreForTest();

console.log(`\n${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
