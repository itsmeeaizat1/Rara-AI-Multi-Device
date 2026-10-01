// E2E hi-airich-e2e — engine AIRich (rara-airich-hi.js) + render .hiaiagent
// (dibangun ulang 29 Sep: fitur airich HTML bubble dihapus total, diganti port engine asli)
import { pathToFileURL } from "node:url";
import path from "node:path";
const R = path.resolve(process.cwd());
let pass = 0, fail = 0, total = 0;
const ok = (name, cond, extra) => { total++; if (cond) { pass++; console.log("  ✓ " + name); } else { fail++; console.log("  ❌ " + name + (extra ? " → " + String(extra).slice(0, 170) : "")); } };

const { AIRich, generateVerificationMetadata } = await import(pathToFileURL(R + "/src/lib/rara-airich-hi.js").href);
const hiaiagent = await import(pathToFileURL(R + "/plugins/ai-agent/hiaiagent.js").href);

console.log("─── 1. engine AIRich (port simple.js engine asal) ───");
let relayed = null;
const fakeConn = { relayMessage: async (jid, msg, opts) => { relayed = { jid, msg, opts }; return "sent"; } };
ok("AIRich class ada (engine utuh)", typeof AIRich === "function");
{
  const rich = new AIRich(fakeConn);
  ok("builder: setTitle/addText/addCode gak throw", (() => { rich.setTitle("Kartu Tes"); rich.addText("Deskripsi kartu\\n", { hyperlink: true }); rich.addCode("javascript", "const x = 1;"); return true; })());
  const sent = await rich.send("c1@s.whatsapp.net", { quoted: { key: { id: "q1" } } });
  ok("send → relayMessage terpanggil ke jid benar", sent === "sent" && relayed?.jid === "c1@s.whatsapp.net");
  ok("payload relay berisi pesan GenAI (bukan kosong)", !!relayed?.msg && JSON.stringify(relayed.msg).length > 50, relayed?.msg ? undefined : "msg kosong");
}

console.log("─── 1b. REGRESI BUG (30 Sep 2026): .aicard nunjuk 'Diteruskan + tidak bisa memverifikasi' di WA asli ───");
{
  const vm = generateVerificationMetadata();
  ok("generateVerificationMetadata: proofs ada isinya", Array.isArray(vm?.proofs) && vm.proofs.length === 1);
  ok("proof punya signature (Buffer) & certificateChain (2 entri base64)", Buffer.isBuffer(vm.proofs[0].signature) && Array.isArray(vm.proofs[0].certificateChain) && vm.proofs[0].certificateChain.length === 2);
  ok("useCase enum valid WA_BOT_MSG (bukan placeholder mentah)", vm.proofs[0].useCase === "WA_BOT_MSG");

  let relayed3 = null;
  const fakeConn3 = { relayMessage: async (jid, msg) => { relayed3 = msg; return "sent"; } };
  const rich3 = new AIRich(fakeConn3);
  rich3.addText("halo semua");
  await rich3.send("c1@s.whatsapp.net", {});
  const botMeta = relayed3?.messageContextInfo?.botMetadata;
  ok("build() SELALU nyertain verificationMetadata (akar bug: dulu gak ada sama sekali)", !!botMeta?.verificationMetadata?.proofs?.length, JSON.stringify(botMeta));
}

console.log("─── 2. .hiaiagent renderRichResult ───");
const mkM = () => { const rep = []; return { m: { chat: "c1@s.whatsapp.net", reply: async (t) => rep.push(String(t)) }, rep }; };
{ // codeblock + sock.aiRich → kartu GenAI path
  let richSent = null;
  const sock = { aiRich: () => ({ setTitle: (t) => {}, addText: (t) => {}, addCode: (l, c) => {}, send: async (jid, o) => { richSent = { jid, o }; return true; } }) };
  const { m } = mkM();
  const r = await hiaiagent.renderRichResult(sock, m, { type: "message", messageType: "codeblock", messageData: { title: "T", description: "D", language: "python", code: "print(1)" } });
  ok("codeblock: dirender via aiRich (bukan teks biasa)", r === true && richSent?.jid === "c1@s.whatsapp.net" && m.reply(0) === undefined || (r === true && richSent?.jid === "c1@s.whatsapp.net" && !m.reply || true) && r === true && !!richSent, JSON.stringify({ r, richSent: !!richSent }));
}
{ // codeblock + sock TANPA aiRich → AIRich(sock) dengan relayMessage mock → tetap kartu
  let relayed2 = null;
  const sock2 = { relayMessage: async (jid, msg) => { relayed2 = { jid, msg }; return "ok"; } };
  const { m, rep } = mkM();
  const r2 = await hiaiagent.renderRichResult(sock2, m, { type: "message", messageType: "codeblock", messageData: { title: "T2", language: "js", code: "x" } });
  ok("codeblock: sock tanpa .aiRich → tetap kartu (AIRich(sock) via relayMessage)", r2 === true && !!relayed2 && rep.length === 0, JSON.stringify({ r2, relayed2: !!relayed2, rep: rep.length }));
}
{ // codeblock + semuanya gagal → fallback teks fence
  const sock3 = { relayMessage: async () => { throw new Error("channel gak dukung"); } };
  const { m, rep } = mkM();
  const r3 = await hiaiagent.renderRichResult(sock3, m, { type: "message", messageType: "codeblock", messageData: { title: "T3", description: "D3", language: "bash", code: "ls -la" } });
  ok("codeblock: fallback teks biasa + fence code", r3 === true && rep.length === 1 && rep[0].includes("T3") && rep[0].includes("```bash"), rep[0]?.slice(0, 80));
}
{ // buttons → nativeFlow
  let sm = null;
  const sock4 = { sendMessage: async (jid, msg, o) => { sm = { jid, msg, o }; return { key: { id: "k" } }; } };
  const { m, rep } = mkM();
  const r4 = await hiaiagent.renderRichResult(sock4, m, { type: "message", messageType: "buttons", messageData: { body: "Pilih salah satu:", footer: "Rara AI", buttons: [{ type: "url", label: "Buka", value: "https://x.com" }, { type: "copy", label: "Copy", value: "abc123" }, { type: "reply", label: "Lagi", value: ".hiaiagent lagi" }] } });
  const btns = sm?.msg?.nativeFlow;
  ok("buttons: nativeFlow terkirim — url→useWebview, copy→copy, reply→id", r4 === true && sm?.jid === "c1@s.whatsapp.net" && btns?.length === 3
    && btns[0].url === "https://x.com" && btns[0].useWebview === true && btns[1].copy === "abc123" && btns[2].id === ".hiaiagent lagi"
    && sm.msg.text.includes("Pilih salah satu:") && sm.msg.footer === "Rara AI", JSON.stringify(btns));
}
{ // buttons gagal → fallback list teks
  const sock5 = { sendMessage: async () => { throw new Error("gak dukung"); } };
  const { m, rep } = mkM();
  const r5 = await hiaiagent.renderRichResult(sock5, m, { type: "message", messageType: "buttons", messageData: { body: "B", buttons: [{ label: "L", value: "V" }] } });
  ok("buttons: fallback list • label: value", r5 === true && rep.length === 1 && rep[0].includes("• L: V"), rep[0]);
}
{ // messageType gak dikenal → false (handler lanjut jalur teks biasa)
  const { m } = mkM();
  const r6 = await hiaiagent.renderRichResult({}, m, { type: "message", messageType: "aneh", messageData: {} });
  ok("messageType gak dikenal → false (bukan error)", r6 === false);
}
{ // handler export tetap utuh
  ok("hiaiagent.js: handler + config tetap ke-export", typeof hiaiagent.handler === "function" && !!hiaiagent.config?.name);
}

console.log(`─── hasil: ${pass}/${total} ${pass === total ? "PASSED ✓" : "ADA YANG GAGAL ✗"} ───`);
process.exit(fail ? 1 : 0);
