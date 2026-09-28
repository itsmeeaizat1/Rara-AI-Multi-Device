// E2E hirovoip — engine VOIP port HIROBOT + plugin (call flow nyata cuma bisa di VPS live)
let pass = 0, total = 0;
function ok(name, cond, detail = "") {
  total++;
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else console.log(`  ✗ ${name} ${detail}`);
}
console.log("─── HIROVOIP e2e ───");

const mod = await import("../../src/lib/hirovoip/index.js");
ok("engine Voip ke-import", typeof mod.default === "function");
const voip = new mod.default({ user: { id: "b@s.whatsapp.net" } });
ok("instance Voip jalan", typeof voip.call === "function" && typeof voip.end === "function");

const resolver = await import("../../src/lib/hirovoip/shim/baileys-resolve.js");
ok("resolver: kandidat utama 'nova'", (await resolver.resolveBaileysModule()).jidDecode != null);

const plugin = await import("../../plugins/owner/voipcall.js");
ok("plugin config & handler ter-ekspor", !!plugin.config?.name && typeof plugin.handler === "function");
ok("cmd voipcall/voip (gak bentrok call/aicall)", plugin.config.name === "voipcall" && !["call", "aicall"].includes(plugin.config.name));
ok("owner-only (anti penyalahgunaan)", plugin.config.isOwner === true);

// handler: usage tanpa argumen → guide (gak nelpon)
let replied = null;
const fakeM = { text: ".voipcall", chat: "x@s.whatsapp.net", sender: "x@s.whatsapp.net", isOwner: true,
  react: async () => {}, reply: async (t) => { replied = t; return { key: { id: "K" } }; }, quoted: null };
const res = await plugin.handler(fakeM, { sock: { user: { id: "b@s.whatsapp.net" }, sendMessage: async () => ({}) }, config: { command: { prefix: "." } } });
ok("handler: usage → novaGuide (gak nelpon)", res?.handled === true && /voipcall|Cara Pakai|cara pakai/i.test(String(replied)));

console.log(`─── hasil: ${pass}/${total} ${pass === total ? "PASSED ✓" : "ADA YANG GAGAL ✗"} ───`);
process.exit(pass === total ? 0 : 1);
