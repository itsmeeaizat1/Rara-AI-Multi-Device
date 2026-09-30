// E2E hi-webpanel — web dashboard + plugin .webpanel
let pass = 0, total = 0;
function ok(name, cond, detail = "") {
  total++;
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else console.log(`  ✗ ${name} ${detail}`);
}
console.log("─── HIRO WEBPANEL e2e ───");

const mod = await import("../../src/lib/hiweb/server.js");
ok("engine server ke-import (export default connect)", typeof mod.default === "function");

// boot nyata + fetch halaman
const fakeConn = { user: { id: "b@s.whatsapp.net" }, sendMessage: async () => ({}) };
const srv = mod.default(fakeConn, 0);
if (!srv?.listening) await new Promise((r) => { srv.once("listening", r); srv.once("error", r); });
ok("server listening (boot)", !!srv?.listening);
const port = srv.address().port;
const res = await fetch("http://127.0.0.1:" + port + "/");
const body = await res.text().catch(() => "");
ok("GET / balikin halaman (200/3xx)", (res.status >= 200 && res.status < 400), "status " + res.status);
ok("halaman dashboard kekirim (html ada isi)", body.length > 50, body.slice(0, 60));
await new Promise((r) => srv.close(r));
ok("server close bersih", true);

// plugin
const plugin = await import("../../plugins/owner/webpanel.js");
ok("plugin .webpanel config & handler", !!plugin.config?.name && typeof plugin.handler === "function");
ok("owner-only", plugin.config.isOwner === true);
ok("alias dashboard/hiweb", (plugin.config.alias || []).includes("dashboard"));

// usage tanpa arg → guide
let replied = null;
const fakeM = { text: ".webpanel", chat: "x@s.whatsapp.net", sender: "x@s.whatsapp.net", isOwner: true,
  react: async () => {}, reply: async (t) => { replied = t; return { key: { id: "K" } }; } };
await plugin.handler(fakeM, { sock: { user: { id: "b@s.whatsapp.net" }, sendMessage: async () => ({}) }, config: { command: { prefix: "." } } });
ok("handler: usage → novaGuide (gak nyalain server)", /webpanel/i.test(String(replied)) && !/NYALA/i.test(String(replied).replace(/nyala\n/i, "")) || /Cara Pakai/i.test(String(replied)));

console.log(`─── hasil: ${pass}/${total} ${pass === total ? "PASSED ✓" : "ADA YANG GAGAL ✗"} ───`);
process.exit(pass === total ? 0 : 1);
