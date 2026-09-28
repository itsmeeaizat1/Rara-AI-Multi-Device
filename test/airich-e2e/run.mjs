// E2E airich — engine kartu AI rich (port HIROBOT) + parser plugin
// Jalankan dari ROOT repo: node test/airich-e2e/run.mjs
import { AIRich, extractIE, sendAIRich } from "../../src/lib/nova-airich-hiro.js";

let pass = 0, total = 0;
function ok(name, cond, detail = "") {
  total++;
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else console.log(`  ✗ ${name} ${detail}`);
}

console.log("─── AIRich e2e ───");

// 1. extractIE: hyperlink [teks](url)
{
  const { text, inline_entities } = extractIE("lihat [situs](https://x.com) ya");
  const link = (inline_entities || []).find((e) => e.key?.startsWith("_HYPERLINK_"));
  ok("extractIE hyperlink terdeteksi", !!link, JSON.stringify(inline_entities));
  ok("extractIE hyperlink url bener", link?.metadata?.url === "https://x.com");
  ok("extractIE hyperlink GenAIInlineLinkItem", link?.metadata?.__typename === "GenAIInlineLinkItem");
}

// 2. extractIE: latex format [expr]<url> (bukan $..$)
{
  const { inline_entities } = extractIE("rumus [x^2]<https://r.example/v1/render> nih");
  const latex = (inline_entities || []).find((e) => e.key?.startsWith("_LATEX_"));
  ok("extractIE latex [expr]<url> terdeteksi", !!latex, JSON.stringify(inline_entities));
  ok("extractIE latex GenAILatexItem", latex?.metadata?.__typename === "GenAILatexItem");
  ok("extractIE latex expression bener", latex?.metadata?.latex_expression === "x^2");
}

// 3. extractIE: teks polos tanpa entity
{
  const { text, inline_entities } = extractIE("teks biasa doang");
  ok("extractIE teks polos gak ada entity", (inline_entities || []).length === 0);
  ok("extractIE teks polos tetep utuh", text === "teks biasa doang");
}

// 4. build(): struktur pesan rich — teks masuk sections (view_model.primitive), kode masuk submessages
{
  const rich = new AIRich({ relayMessage: async () => ({}) });
  rich.setTitle("Judul Tes");
  rich.addText("Halo **semua**");
  rich.addCode("python", "print('hai')");
  const msg = await rich.build({});
  ok("build: botMetadata.messageDisclaimerText = judul", msg.messageContextInfo?.botMetadata?.messageDisclaimerText === "Judul Tes");
  ok("build: botForwardedMessage ada", !!msg.botForwardedMessage?.message?.richResponseMessage);
  const rrm = msg.botForwardedMessage.message.richResponseMessage;
  ok("build: messageType 1", rrm.messageType === 1);
  ok("build: submessages ada (teks+kode)", Array.isArray(rrm.submessages) && rrm.submessages.length === 2, `len=${rrm.submessages?.length}`);
  ok("build: submessage teks messageType 2", rrm.submessages[0]?.messageType === 2);
  ok("build: submessage kode messageType 5", rrm.submessages[1]?.messageType === 5);
  ok("build: codeMetadata bahasa bener", rrm.submessages[1]?.codeMetadata?.codeLanguage === "python");
  const decoded = JSON.parse(Buffer.from(rrm.unifiedResponse.data, "base64").toString());
  ok("build: unifiedResponse base64 ke-decode", Array.isArray(decoded.sections) && decoded.sections.length === 1, `len=${decoded.sections?.length}`);
  ok("build: section GenAIMarkdownTextUXPrimitive", decoded.sections[0]?.view_model?.primitive?.__typename === "GenAIMarkdownTextUXPrimitive");
  ok("build: layout GenAISingleLayoutViewModel", decoded.sections[0]?.view_model?.__typename === "GenAISingleLayoutViewModel");
}

// 5. build(): footer jadi GenAIMetadataTextPrimitive (nested view_model.primitive)
{
  const rich = new AIRich({ relayMessage: async () => ({}) });
  rich.addText("isi");
  rich.setFooter("kaki kartu");
  const msg = await rich.build({});
  const decoded = JSON.parse(Buffer.from(msg.botForwardedMessage.message.richResponseMessage.unifiedResponse.data, "base64").toString());
  ok("build: footer GenAIMetadataTextPrimitive", decoded.sections.some((s) => s.view_model?.primitive?.__typename === "GenAIMetadataTextPrimitive"));
}

// 6. send(): relayMessage ke-manggil dengan jid & msg bener
{
  let captured = null;
  const fakeSock = { relayMessage: async (jid, msg, opts) => { captured = { jid, msg, opts }; return { key: { id: "X" } }; } };
  const rich = new AIRich(fakeSock);
  rich.setTitle("Kirim Tes");
  rich.addText("isi kiriman");
  await rich.send("6281234567890@s.whatsapp.net", {});
  ok("send: relayMessage ke-panggil", !!captured);
  ok("send: jid bener", captured?.jid === "6281234567890@s.whatsapp.net");
  ok("send: pesan richResponseMessage ter-relay", !!captured?.msg?.botForwardedMessage?.message?.richResponseMessage);
}

// 7. sendAIRich helper
{
  let captured = null;
  const fakeSock = { relayMessage: async (jid, msg, opts) => { captured = { jid, msg, opts }; return {}; } };
  const sent = await sendAIRich(fakeSock, "X@s.whatsapp.net", (r) => r.setTitle("H").addText("t"));
  ok("sendAIRich helper jalan", !!captured && !!sent === !!sent);
}

// 8. builder API chaining + validasi input
{
  const rich = new AIRich({ relayMessage: async () => ({}) });
  const chained = rich.setTitle("A").setFooter("B");
  ok("setTitle/setFooter chainable", chained === rich);
  let threw = false;
  try { new AIRich({ relayMessage: async () => ({}) }).setTitle(123); } catch (e) { threw = e instanceof TypeError; }
  ok("setTitle bukan string → TypeError", threw);
  let threw2 = false;
  try { new AIRich({ relayMessage: async () => ({}) }).addCode("js", 123); } catch (e) { threw2 = e instanceof TypeError; }
  ok("addCode bukan string → TypeError", threw2);
}

// 9. relayMessage gagal → send ikut gagal (plugin tangkap di catch, jujur gagal)
{
  let threw = false;
  const badSock = { relayMessage: async () => { throw new Error("relay down"); } };
  const rich = new AIRich(badSock);
  rich.addText("x");
  try { await rich.send("j@s.whatsapp.net", {}); } catch { threw = true; }
  ok("send: error relay diteruskan", threw);
}

// 10. parser plugin (parseToRich via import plugin)
{
  const mod = await import("../../plugins/ai/aicard.js");
  ok("plugin: config & handler ter-ekspor", !!mod.config?.name && typeof mod.handler === "function");
  ok("plugin: nama airich + alias", mod.config.name === "aicard" && Array.isArray(mod.config.alias));
}

console.log(`─── hasil: ${pass}/${total} ${pass === total ? "PASSED ✓" : "ADA YANG GAGAL ✗"} ───`);
process.exit(pass === total ? 0 : 1);
