// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Plugin .rag — ingat dokumen (PDF/DOCX/TXT), tanya apa aja isinya. BM25 lokal + AI, tanpa API key.
import { novaGuide, novaError, claraWrap } from "../../src/lib/nova-menu-style.js";
import { saveDoc, listDocs, getDoc, deleteDoc, countDocs, extractDocText, askRag, searchDocs, ragLimits } from "../../src/lib/nova-rag.js";

const pluginConfig = {
  name: "rag",
  alias: ["ragdoc", "docai", "tanyadokumen"],
  category: "ai",
  description: "Ingat dokumen (PDF/DOCX/TXT) lalu tanya isinya — RAG lokal tanpa API key",
  usage: ".rag add <nama> (reply dokumen) | .rag ask <pertanyaan> | .rag list | .rag del <id> | .rag info <id>",
  example: ".rag add modul-fisika (reply PDF)",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: true,
  cooldown: 8,
  energi: 0,
  limit: 1,
  isEnabled: true,
};

async function handler(m) {
  const rest = String(m.text || "").replace(/^\S+\s*/, "").trim();
  const first = rest.split(/\s+/)[0].toLowerCase();
  try {
    if (first === "add") {
      const q = m.quoted;
      if (!q) {
        await m.react("❌");
        await m.reply(claraWrap("RAG", "Reply ke dokumen (PDF/DOCX/TXT/MD/CSV/JSON) atau pesan teks yang mau diingat, lalu ketik .rag add <nama>"));
        return { handled: true };
      }
      const name = rest.replace(/^add\s*/i, "").trim() || ("dokumen-" + (countDocs(m.sender) + 1));
      if (countDocs(m.sender) >= ragLimits.MAX_DOCS_PER_USER) {
        await m.react("❌");
        await m.reply(claraWrap("RAG", "Kamu udah simpan " + ragLimits.MAX_DOCS_PER_USER + " dokumen (batas maksimal). Hapus dulu: .rag del <id>"));
        return { handled: true };
      }
      await m.react("🧠");
      let text = null, fname = "", info = "";
      const isDoc = !!(q.document || q.fileName || (q.msg && (q.msg.document || q.msg.documentMessage)));
      if (isDoc) {
        const buf = await q.download();
        fname = q.fileName || (q.msg && q.msg.fileName) || "dokumen";
        const ex = await extractDocText(fname, buf);
        if (!ex.ok) { await m.react("❌"); await m.reply(claraWrap("RAG", ex.error)); return { handled: true }; }
        text = ex.text; info = ex.info || "";
      } else {
        text = q.text || q.body || "";
        if (!text) { await m.react("❌"); await m.reply(claraWrap("RAG", "Reply-nya bukan dokumen atau teks. Reply dokumen PDF/DOCX/TXT atau pesan teks.")); return { handled: true }; }
      }
      const saved = saveDoc({ name, from: m.sender, text });
      if (!saved.ok) { await m.react("❌"); await m.reply(claraWrap("RAG", saved.error)); return { handled: true }; }
      await m.react("⚡");
      await m.reply(claraWrap("RAG", "✅ Dokumen \"" + saved.name + "\" diingat\nID: " + saved.id + "\nPotongan: " + saved.chunks + (info ? "\n" + info : "") + "\n\nSekarang tanya isinya: .rag ask <pertanyaan>"));
    } else if (first === "ask") {
      const question = rest.replace(/^ask\s*/i, "").trim();
      if (!question) { await m.reply(claraWrap("RAG", "Format: .rag ask <pertanyaan>")); return { handled: true }; }
      await m.react("🧠");
      const r = await askRag(question, m.sender);
      if (!r.ok) { await m.react("❌"); await m.reply(claraWrap("RAG", r.error)); return { handled: true }; }
      await m.react("⚡");
      await m.reply(claraWrap("RAG", (r.answer || "(AI gak jawab, coba lagi)") + "\n\n📎 Sumber: " + r.sources.join(", ")));
    } else if (first === "cari") {
      const question = rest.replace(/^cari\s*/i, "").trim();
      if (!question) { await m.reply(claraWrap("RAG", "Format: .rag cari <kata kunci>")); return { handled: true }; }
      const r = searchDocs(question, m.sender, 3);
      if (!r.ok) { await m.react("❌"); await m.reply(claraWrap("RAG", r.error)); return { handled: true }; }
      await m.react("⚡");
      await m.reply(claraWrap("RAG", r.results.map((x, i) => "【" + (i + 1) + "】 " + x.doc + " (bagian " + (x.idx + 1) + "):\n" + x.text.slice(0, 400) + "…").join("\n\n")));
    } else if (first === "list") {
      const docs = listDocs(m.sender);
      await m.react("🔍");
      await m.reply(claraWrap("RAG Dokumen", docs.length
        ? docs.map((d, i) => (i + 1) + ". " + d.name + "\n   ID: " + d.id + " · " + d.chunks + " potongan").join("\n")
        : "Belum ada dokumen. Tambahin: .rag add <nama> (reply dokumen)"));
    } else if (first === "del" || first === "delete") {
      const id = rest.replace(/^(del|delete)\s*/i, "").trim();
      if (!id) { await m.reply(claraWrap("RAG", "Format: .rag del <id> (cek id di .rag list)")); return { handled: true }; }
      const r = deleteDoc(id, m.sender);
      await m.react(r.ok ? "⚡" : "❌");
      await m.reply(claraWrap("RAG", r.ok ? "✅ \"" + r.name + "\" dihapus" : r.error));
    } else if (first === "info") {
      const id = rest.replace(/^info\s*/i, "").trim();
      const rec = getDoc(id, m.sender);
      await m.react(rec ? "🔍" : "❌");
      await m.reply(claraWrap("RAG", rec
        ? "Nama: " + rec.name + "\nDibuat: " + rec.created.slice(0, 19).replace("T", " ") + "\nPotongan: " + rec.chunks.length + "\nAwal isi:\n" + String(rec.chunks[0] || "").slice(0, 500)
        : "Dokumen gak ketemu (cek .rag list)"));
    } else {
      await m.react("🐣");
      await m.reply(novaGuide(
        "rag",
        "RAG dokumen: kirim PDF/DOCX/TXT ke bot untuk diingat, lalu tanya isinya pakai bahasa natural. Pencarian BM25 lokal — gratis, tanpa API key. Dokumen kamu privat, cuma kamu yang bisa akses.",
        ".rag add catatan (reply dokumen)",
        "Lalu tanya: .rag ask berapa harga di halaman 3? · Daftar: .rag list · Hapus: .rag del <id>. Batas " + ragLimits.MAX_DOCS_PER_USER + " dokumen per user."
      ));
    }
  } catch (error) {
    console.error("[rag]:", error.message);
    await m.react("❌");
    await m.reply(novaError("RAG", "Gagal: " + String(error.message).slice(0, 120)));
  }
  return { handled: true };
}

export { pluginConfig as config, handler };
