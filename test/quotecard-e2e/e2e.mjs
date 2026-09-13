// E2E — KARTU QUOTE ESTETIK (13 Sep 2026)
// Request owner: "fitur yg polos dicek trus di variasi agar menarik" batch 3 —
// keluarga .quotes* sekarang kirim KARTU GAMBAR canvas (nova-quote-card.js),
// fallback teks lama kalau render gagal.
import { mkdtempSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { fileURLToPath } from "url";
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(R);

const { renderQuoteCard } = await import(R + "/src/lib/nova-quote-card.js");

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok, extra) => { w((ok ? "  ✅" : "  ❌") + " " + name + (ok || !extra ? "" : " — " + extra)); ok ? pass++ : fail++; };
const isPng = (b) => Buffer.isBuffer(b) && b.length > 30000 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;

// ═══════════════════════════════════════════════════════════════
w("\n— renderQuoteCard: PNG valid semua kategori —");
for (const cat of ["bijak", "bucin", "galau", "gombal", "anime", "chat"]) {
  const buf = await renderQuoteCard({ quote: "Hidup itu seperti sepeda, agar tetap seimbang kamu harus terus bergerak.", category: cat });
  check(cat + ": PNG > 30KB", isPng(buf), buf.length + " bytes");
}
{
  const buf = await renderQuoteCard({ quote: "Aku cuma mau kamu bahagia, walaupun bahagiamu bukan bersamaku.", author: "Anonim", category: "bucin" });
  check("author dirender (gak throw)", isPng(buf), buf.length + " bytes");
}
{
  const long = "Kegagalan adalah kesempatan untuk mulai lagi dengan lebih bijak karena hidup itu seperti sepeda yang harus terus bergerak dan jangan pernah menunggu kesempatan datang tapi buatlah kesempatan itu sendiri dengan kerja keras yang konsisten ".repeat(4);
  const buf = await renderQuoteCard({ quote: long, category: "galau" });
  check("quote panjang → auto-shrink (gak throw)", isPng(buf), buf.length + " bytes");
}

// ═══════════════════════════════════════════════════════════════
w("\n— handler .quotes* → kirim kartu gambar —");
function mockSock(failImage = false) {
  const sent = [];
  return {
    sent,
    sendMessage: async (chat, payload, opts) => {
      if (failImage && payload?.image) throw new Error("image gagal");
      sent.push({ chat, payload, opts });
      return { key: { id: "k" + sent.length } };
    },
  };
}
for (const cmd of ["quotesbijak", "quotesbucin", "quotesgombal", "quotechat"]) {
  const { config, handler } = await import(R + "/plugins/quotes/" + cmd + ".js");
  const sock = mockSock();
  const m = {
    key: { remoteJid: "t@g.us" },
    reply: async () => ({}),
  };
  await handler(m, { sock });
  const textMsgs = sock.sent.filter((s) => s.payload?.text && !s.payload?.react);
  const img = sock.sent.find((s) => s.payload?.image);
  check(cmd + ": plain teks DI ATAS (sebelum gambar)", !!img && textMsgs.length >= 1 && sock.sent.indexOf(textMsgs[0]) < sock.sent.indexOf(img), textMsgs.length + " teks");
  check(cmd + ": kirim kartu PNG", !!img && isPng(img.payload.image), img ? img.payload.image.length + "b" : "gak ada image");
  check(cmd + ": kartu caption kecil (bukan dobel quote)", !!img && !String(img.payload.caption || "").includes('"'), img ? String(img.payload.caption).slice(0, 40) : "-");
  check(cmd + ": react 🕒 lalu 🐣", sock.sent.filter((s) => s.payload?.react?.text === "🕒").length === 1 && sock.sent.filter((s) => s.payload?.react?.text === "🐣").length === 1);
}
{
  // render gagal → fallback teks lama (behavior gak rusak)
  const { config, handler } = await import(R + "/plugins/quotes/quotesgalau.js");
  const sock = mockSock(true);
  const m = { key: { remoteJid: "t@g.us" }, reply: async () => ({}) };
  await handler(m, { sock });
  const txt = sock.sent.find((s) => s.payload?.text && !s.payload?.react);
  check("quotesgalau: image gagal → teks tetep terkirim, gak dobel", !!txt && String(txt.payload.text).includes(`"`) && sock.sent.filter((s) => s.payload?.text && !s.payload?.react).length === 1, txt ? String(txt.payload.text).slice(0, 40) : "-");
}

w(`\n— summary —\nPASS ${pass} / FAIL ${fail}`);
process.exit(fail ? 1 : 0);
