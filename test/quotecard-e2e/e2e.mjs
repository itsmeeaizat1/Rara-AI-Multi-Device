// E2E — QUOTES PLAIN TEXT (24 Sep 2026)
// Revisi owner 24 Sep: "fitur kata kata quotes yg generate lewat kanvas ubah jadi
// plain text jangan generate canvas" — keluarga .quotes* KIRIM TEKS DOANG,
// kartu canvas (VERSI KARTU) dihapus. Suite lama (13 Sep, kartu PNG) diganti.
// Anti-regresi: pastikan tidak ada lagi import renderQuoteCard di plugins/quotes/.
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(R);

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok, extra) => { w((ok ? "  ✅" : "  ❌") + " " + name + (ok || !extra ? "" : " — " + extra)); ok ? pass++ : fail++; };

// ═══════════════════════════════════════════════════════════════
w("\n— anti-regresi: gak ada lagi canvas di plugins/quotes/ —");
{
  const files = fs.readdirSync(R + "/plugins/quotes").filter((f) => f.endsWith(".js"));
  for (const f of files) {
    const c = fs.readFileSync(R + "/plugins/quotes/" + f, "utf8");
    check(f + ": gak import renderQuoteCard", !c.includes("renderQuoteCard"));
    check(f + ": gak kirim image", !/image:\s*_card|VERSI KARTU/i.test(c) && !c.includes("ᴠᴇʀꜱɪ ᴋᴀʀᴛᴜ"));
  }
  check("6 plugin quotes lengkap", files.length === 6, files.join(","));
}

// ═══════════════════════════════════════════════════════════════
w("\n— handler .quotes* → teks doang, tanpa kartu —");
function mockSock() {
  const sent = [];
  return {
    sent,
    sendMessage: async (chat, payload, opts) => {
      sent.push({ chat, payload, opts });
      return { key: { id: "k" + sent.length } };
    },
  };
}
const PLUGINS = ["quotesbijak", "quotesbucin", "quotesgombal", "quotechat", "quotesgalau"];
for (const cmd of PLUGINS) {
  const { config, handler } = await import(R + "/plugins/quotes/" + cmd + ".js");
  const sock = mockSock();
  const m = { key: { remoteJid: "t@g.us" }, reply: async () => ({}) };
  await handler(m, { sock });
  const texts = sock.sent.filter((s) => s.payload?.text && !s.payload?.react);
  const imgs = sock.sent.filter((s) => s.payload?.image || s.payload?.document || s.payload?.sticker);
  check(cmd + ": SATU pesan teks", texts.length === 1, texts.length + " teks");
  check(cmd + ": gak ada gambar/kartu", imgs.length === 0, imgs.length + " media");
  const kutipOk = cmd === "quotechat" ? true : String(texts[0]?.payload?.text || "").includes('"');
  check(cmd + ": teks quote format bener", kutipOk, String(texts[0]?.payload?.text || "").slice(0, 40));
  check(cmd + ": react 🕒 lalu 🐣 (gak ada react error)", sock.sent.filter((s) => s.payload?.react?.text === "🕒").length === 1 && sock.sent.filter((s) => s.payload?.react?.text === "🐣").length === 1);
  check(cmd + ": config tetap utuh (name/alias)", config?.name === cmd || (config?.alias || []).includes(cmd), config?.name);
}

// quotesanime: quote + karakter (anime) — network, jadi pakai mock axios? file panggil axios langsung:
// cek lewat handler error path aja (react ❌ tanpa image) biar gak bergantung jaringan.
{
  const { config, handler } = await import(R + "/plugins/quotes/quotesanime.js");
  const sock = mockSock();
  const m = { key: { remoteJid: "t@g.us" }, reply: async (t) => ({ text: String(t) }) };
  await handler(m, { sock });
  const imgs = sock.sent.filter((s) => s.payload?.image);
  check("quotesanime: gak kirim kartu apapun hasilnya", imgs.length === 0, imgs.length + " media");
  const errReact = sock.sent.filter((s) => s.payload?.react?.text === "❌").length;
  check("quotesanime: tetep 1 path (teks via axios at react error)", sock.sent.length >= 2, "sent=" + sock.sent.length);
}

w(`\n— summary —\nPASS ${pass} / FAIL ${fail}`);
process.exit(fail ? 1 : 0);
