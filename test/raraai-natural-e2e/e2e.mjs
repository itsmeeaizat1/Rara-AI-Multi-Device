// E2E — NOVAAGENT NGOMONG NATURAL (13 Sep 2026)
// Request owner: "bisa gak setelah aksi berhasil dia ngomong natural kyk AI,
// jangan teks template kaku" + lanjutan "jd kliatan agent itu hidup bgt kyk
// asisten sungguhan klo mau melakukan atau sdh dilakukan dia ngomong gt".
// FIX: (1) fase SEBELUM aksi — status natural via TOOL_NATURAL_DOING ("oke
// bentar ya, lagi nutup grupnya...") ganti status teknis "sedang
// mengeksekusi: closegc...". (2) fase SESUDAH aksi — decision.reply (AI,
// natural, variatif) dipakai DEFAULT, TAPI di-guard TOOL_TOPIC: kalau reply
// nyebut topik tool LAIN yang bukan yang beneran jalan (suspicious/
// halusinasi — bug asli 13 Sep pagi), fallback ke tool.done (natural juga,
// udah ditulis ulang gak kaku ALL CAPS template lagi).
import { TOOLS, TOOL_TOPIC, TOOL_NATURAL_DOING, sanitizeAiReply } from "../../src/lib/aiagent.js";

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok, extra) => { w((ok ? "  ✅" : "  ❌") + " " + name + (ok || !extra ? "" : " — " + extra)); ok ? pass++ : fail++; };

// simulasi logika confirmText persis kode plugin (raraai.js)
function pickConfirm(decisionTool, decisionReply, toolDone) {
  const naturalReply = decisionReply ? sanitizeAiReply(decisionReply) : "";
  const conflictTopic = Object.entries(TOOL_TOPIC).find(
    ([toolKey, topicWord]) => toolKey !== decisionTool && naturalReply.toLowerCase().includes(topicWord.toLowerCase())
  );
  return (naturalReply && !conflictTopic) ? naturalReply : (toolDone || naturalReply || "Selesai.");
}

w("\n— FASE SEBELUM AKSI: status natural (TOOL_NATURAL_DOING) —");
{
  check("closegc → 'nutup grupnya'", TOOL_NATURAL_DOING.closegc === "nutup grupnya");
  check("genimage → 'bikin gambarnya'", TOOL_NATURAL_DOING.genimage === "bikin gambarnya");
  check("kick → 'ngeluarin dia dari grup'", TOOL_NATURAL_DOING.kick === "ngeluarin dia dari grup");
  check("tool gak ada di map → fallback generik", (TOOL_NATURAL_DOING.someRandomTool || ("ngerjain someRandomTool-nya")) === "ngerjain someRandomTool-nya");
}

w("\n— FASE SESUDAH AKSI: reply natural AI dipakai kalau topiknya nyambung —");
{
  const c = pickConfirm("closegc", "Sip, grup udah aku tutup ya, sekarang cuma admin yang bisa chat.", TOOLS.closegc.done);
  check("closegc + reply natural relevan → dipakai APA ADANYA", c === "Sip, grup udah aku tutup ya, sekarang cuma admin yang bisa chat.", c);
}
{
  const c = pickConfirm("kick", "Oke beres, si Budi langsung aku keluarkan dari grup ya.", TOOLS.kick.done);
  check("kick + reply natural relevan → dipakai APA ADANYA", c.includes("keluarkan"), c);
}
{
  const c = pickConfirm("setdesc", "Sip, deskripsi grupnya udah aku ganti.", TOOLS.setdesc.done);
  check("setdesc + reply relevan → dipakai APA ADANYA", c === "Sip, deskripsi grupnya udah aku ganti.", c);
}

w("\n— GUARD ANTI HALUSINASI: reply nyebut topik tool LAIN → fallback tool.done —");
{
  // replay BUG ASLI 13 Sep pagi: tool yang jalan setdesc, tapi reply AI nyantol nyebut "gambar"
  const c = pickConfirm("setdesc", "Deskripsi grup berhasil diubah menjadi 'Grup Baru'. Gambar kucing juga sedang dibuat ya.", TOOLS.setdesc.done);
  check("setdesc + reply nyantol 'gambar' → DITOLAK, pakai tool.done", c === TOOLS.setdesc.done, c);
  check("tool.done setdesc SEKARANG natural (bukan ALL CAPS kaku)", TOOLS.setdesc.done === "✅ Oke, deskripsi grupnya udah aku ganti.", TOOLS.setdesc.done);
}
{
  // tool yang jalan genimage, tapi reply nyantol nyebut "deskripsi"
  const c = pickConfirm("genimage", "Gambarnya udah jadi. Deskripsi grup juga aku ubah ya.", TOOLS.genimage.done);
  check("genimage + reply nyantol 'deskripsi' → DITOLAK, pakai tool.done", c === TOOLS.genimage.done, c);
}
{
  // tool closegc, reply nyantol nyebut topik opengc ("dibuka")
  const c = pickConfirm("closegc", "Oke aku tutup, eh btw grup ini juga baru aja dibuka ya kemarin.", TOOLS.closegc.done);
  check("closegc + reply nyebut 'dibuka' (topik opengc) → DITOLAK, pakai tool.done", c === TOOLS.closegc.done, c);
}

w("\n— tool.done SEMUA SUDAH NATURAL (gak ada lagi template ALL CAPS/kaku) —");
{
  const kaku = ["Grup ditutup. Sekarang hanya admin yang bisa chat.", "User dikeluarkan dari grup.", "Nama grup diganti.", "Tag terkirim ke semua member."];
  const stillKaku = kaku.filter(s => Object.values(TOOLS).some(t => t.done === "✅ " + s));
  check("gak ada lagi done template kaku versi lama", stillKaku.length === 0, JSON.stringify(stillKaku));
}
{
  check("closegc.done natural (ada 'aku')", TOOLS.closegc.done.toLowerCase().includes("aku"), TOOLS.closegc.done);
  check("kick.done natural (ada 'aku')", TOOLS.kick.done.toLowerCase().includes("aku"), TOOLS.kick.done);
  check("setname.done natural (ada 'aku')", TOOLS.setname.done.toLowerCase().includes("aku"), TOOLS.setname.done);
}

w(`\n— summary —\nPASS ${pass} / FAIL ${fail}`);
process.exit(fail ? 1 : 0);
