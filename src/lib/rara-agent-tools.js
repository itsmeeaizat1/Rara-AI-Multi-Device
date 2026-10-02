// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// ============================================================
// rara-agent-tools — DEKLARASI TOOL BAWAAN AGENT (3 Okt 2026)
// Semua tool didaftarkan SEKALI ke rara-agent-registry. Prompt planner,
// whitelist argumen, status "lagi ngapain", dan gate izin diturunkan
// otomatis dari sini — nambah tool = tambah satu blok defineTool().
//
// Tool LAMA (command, image, download, code, vision, ...) tetap memakai
// implementasi teruji di plugins/ai-agent/agent.js lewat `legacy(nama)`;
// tool BARU (screenshot, browse+screenshot, readfile, listfiles, editfile,
// writefile) ditulis langsung di sini di atas rara-agent-powers.
// ============================================================

import { defineTool, hasTool } from "./rara-agent-registry.js";
import {
  screenshotPage, readRepoFile, listRepoFiles, editRepoFile, writeRepoFile,
} from "./rara-agent-powers.js";

/**
 * Pasang tool bawaan. `legacy` = fungsi (nama, call, ctx) => hasil, yang
 * meneruskan ke executor lama buildExecutors(). Idempotent.
 */
export function installBuiltinTools() {
  if (hasTool("command")) return false; // sudah terpasang (deklarasi global, sekali)
  // PENTING: deklarasi tool itu GLOBAL dan dipasang sekali, sedangkan m/sock
  // milik tiap pengguna/chat. Executor lama DIBACA dari ctx (per-panggilan,
  // diisi buildExecutors), BUKAN ditangkap sebagai closure saat instalasi —
  // kalau ditangkap, tool lama akan terus memakai m/sock pengguna PERTAMA dan
  // mengirim hasil ke chat orang lain (bug terbukti lewat probe 3 Okt).
  const L = (name) => (call, ctx, runCtx) => {
    const fn = ctx?.legacy?.[name];
    if (typeof fn !== "function") return { ok: false, msg: `Tool ${name} gak tersedia di konteks ini` };
    return fn(call, runCtx);
  };

  // ───────────────────────── tool lama (dibungkus) ─────────────────────────
  defineTool({
    name: "command", order: 10, doing: "jalanin perintahnya",
    desc: "jalanin command bot lain (sticker, quotes, dll)",
    args: { cmd: { required: true, desc: "nama command TANPA titik", max: 40 }, args: { desc: "argumen command", max: 1500 } },
    example: { cmd: "sticker", args: "kucing" },
    run: L("command"),
  });
  defineTool({
    name: "image", order: 20, doing: "bikin gambarnya", topic: "gambar",
    desc: "generate gambar dari prompt (nano-banana)",
    args: { prompt: { required: true, desc: "deskripsi gambar", max: 1500 } },
    example: { prompt: "kucing astronot di bulan" },
    run: L("image"),
  });
  defineTool({
    name: "editimage", order: 25, doing: "ngedit gambarnya", topic: "edit gambar",
    desc: "EDIT gambar yang di-reply/attach: ganti baju, background, hapus objek, umur, rambut, gender",
    args: { prompt: { required: true, desc: "deskripsi edit", max: 1500 }, mode: { enum: ["clothes", "bg", "remove", "age", "hair", "gender", "faceswap"], desc: "jenis edit" } },
    example: { prompt: "formal", mode: "clothes" },
    run: L("editimage"),
  });
  defineTool({
    name: "vision", order: 30, doing: "ngeliat gambarnya",
    desc: "analisis gambar yang user reply/attach",
    args: { question: { desc: "pertanyaan soal gambar", max: 1000 } },
    example: { question: "apa yang ada di gambar ini?" },
    run: L("vision"),
  });
  defineTool({
    name: "activity", order: 40, doing: "ngecek aktivitas grup",
    desc: "statistik aktivitas grup",
    args: { query: { max: 300 } },
    example: { query: "siapa paling aktif" },
    run: L("activity"),
  });
  defineTool({
    name: "memory", order: 50, doing: "inget percakapan tadi",
    desc: "ingat riwayat percakapan agent di chat",
    args: { query: { max: 300 } },
    example: { query: "tadi nanya apa" },
    run: L("memory"),
  });
  defineTool({
    name: "download", order: 60, doing: "ngunduh filenya",
    desc: "UNDUH FILE dari link URL LANGSUNG (apk/zip/mp3/pdf) — link wajib langsung ke file, bukan halaman web",
    args: { url: { required: true, max: 2000 } },
    example: { url: "https://situs.com/app.apk" },
    run: L("download"),
  });
  defineTool({
    name: "code", order: 70, doing: "nulis kodenya",
    desc: "BIKIN KODE PROGRAM apa pun (html/css/js/python/php) — hasilnya FILE siap jalan, dilengkapi otomatis kalau kepotong",
    args: {
      spec: { required: true, desc: "detail lengkap seakan ngomong ke programmer", max: 4000 },
      lang: { desc: "bahasa pemrograman", max: 20 },
      name: { desc: "nama file singkat tanpa spasi", max: 24 },
    },
    example: { spec: "halaman html toko kue dengan kartu produk", lang: "html", name: "tokokue" },
    run: L("code"),
  });
  defineTool({
    name: "skill", order: 80, doing: "pakai skill-nya",
    desc: "PAKAI SKILL BUILT-IN (kbbi, gempa, lirik, kalkulator, translate, kurs, qr, wiki, cuaca) — nama persis dari TOOLBOX",
    args: { skill: { required: true, max: 40 }, args: { type: "any" } },
    example: { skill: "kbbi", args: "makan" },
    run: L("skill"),
  });
  defineTool({
    name: "mcp", order: 90, doing: "manggil tool MCP",
    desc: "PANGGIL TOOL SERVER MCP (dokumentasi library/repo/docs) — server + mcpTool persis dari TOOLBOX",
    args: { server: { required: true, max: 40 }, mcpTool: { required: true, max: 60 }, data: { type: "any", desc: "args objek" } },
    example: { server: "deepwiki", mcpTool: "ask_question", data: { repoName: "facebook/react", question: "apa itu React" } },
    run: L("mcp"),
  });
  defineTool({
    name: "createfile", order: 100, doing: "bikin filenya",
    desc: "BIKIN FILE TEKS (txt/md/json/csv) — isi PERSIS seperti final, jangan disingkat; KODE PROGRAM pakai tool code",
    args: { name: { required: true, max: 40 }, content: { required: true, max: 20000 } },
    example: { name: "catatan", content: "isi file persis yang diminta user" },
    run: L("createfile"),
  });
  defineTool({
    name: "ytsearch", order: 130, doing: "nyari videonya di youtube",
    desc: "CARI VIDEO YOUTUBE; download=true HANYA kalau user eksplisit minta unduh/putar",
    args: { query: { required: true, max: 200 }, download: { type: "boolean" } },
    example: { query: "bot alya md", download: false },
    run: L("ytsearch"),
  });
  defineTool({
    name: "create", order: 200, perm: "owner", doing: "bikin fitur barunya",
    desc: "BUAT FITUR/PLUGIN BARU + pasang otomatis tanpa restart",
    args: { name: { required: true, max: 20 }, spec: { required: true, desc: "deskripsi lengkap fitur", max: 1000 } },
    example: { name: "namafitur", spec: "deskripsi lengkap fitur baru yang diminta user" },
    run: L("create"),
  });

  // ───────────────────────── tool BARU ─────────────────────────
  defineTool({
    name: "browse", order: 110, doing: "buka halamannya",
    desc: "BUKA LINK & BACA halaman web lewat browser beneran, SELALU kirim SCREENSHOT halamannya",
    args: { url: { required: true, max: 2000 }, full: { type: "boolean", desc: "screenshot seluruh halaman" } },
    example: { url: "https://situs.com/artikel" },
    async run(call, ctx) {
      const { m, sock } = ctx;
      const page = await screenshotPage(call.url, { fullPage: !!call.full });
      let shot = false;
      if (page.screenshot) {
        try {
          await sock.sendMessage(m.chat, {
            image: page.screenshot,
            caption: "🌐 " + (page.title || call.url).slice(0, 120) + "\n" + call.url.slice(0, 200),
          }, { quoted: m });
          shot = true;
        } catch { /* kirim gagal → tetap balikin teks */ }
      }
      const body = String(page.text || "").trim();
      if (!body && !shot) return { ok: false, msg: "Halaman gak kebaca / kosong (mungkin butuh login atau diblokir)" };
      const head = page.title ? `Judul: ${page.title}${page.description ? "\n" + page.description : ""}\n\n` : "";
      return {
        ok: true,
        msg: `Halaman ${call.url} dibuka${shot ? " (screenshot terkirim)" : " (screenshot gagal, teks saja)"}`,
        evidence: `Isi halaman ${call.url}:\n` + (head + body).slice(0, 5000),
      };
    },
  });
  defineTool({
    name: "screenshot", order: 115, doing: "ngambil screenshot",
    desc: "AMBIL SCREENSHOT sebuah situs/halaman web dan kirim sebagai gambar",
    args: { url: { required: true, max: 2000 }, full: { type: "boolean", desc: "true = seluruh halaman (maks 6000px)" } },
    example: { url: "https://situs.com", full: false },
    async run(call, ctx) {
      const { m, sock } = ctx;
      const page = await screenshotPage(call.url, { fullPage: !!call.full });
      if (!page.screenshot) return { ok: false, msg: "Gagal ambil screenshot (halaman kosong/diblokir)" };
      await sock.sendMessage(m.chat, {
        image: page.screenshot,
        caption: "📸 " + (page.title || call.url).slice(0, 120) + "\n" + call.url.slice(0, 200),
      }, { quoted: m });
      return { ok: true, msg: `Screenshot ${call.url} terkirim`, evidence: page.text ? `Teks halaman ${call.url}:\n${page.text.slice(0, 2000)}` : undefined };
    },
  });
  defineTool({
    name: "listfiles", order: 140, perm: "owner", doing: "ngintip isi folder",
    desc: "LIHAT isi folder di repo bot (file & subfolder)",
    args: { path: { desc: "folder relatif, kosong = root", max: 200 } },
    example: { path: "plugins/ai-agent" },
    async run(call) {
      const r = listRepoFiles(call.path || ".");
      return { ok: true, msg: `Isi ${r.rel}: ${r.total} item`, evidence: `Isi folder ${r.rel} (${r.total} item${r.truncated ? ", dipotong" : ""}):\n` + r.items.join("\n") };
    },
  });
  defineTool({
    name: "readfile", order: 145, perm: "owner", doing: "baca filenya",
    desc: "BACA isi file di repo bot (kode/konfigurasi) dengan nomor baris — WAJIB sebelum editfile",
    args: { path: { required: true, max: 200 }, from: { type: "number", desc: "mulai baris" }, lines: { type: "number", desc: "jumlah baris, maks 2000" } },
    example: { path: "plugins/ai-agent/agent.js", from: 1, lines: 200 },
    async run(call) {
      const r = readRepoFile(call.path, { from: call.from, lines: call.lines });
      return { ok: true, msg: `${r.rel} dibaca (${r.totalLines} baris)`, evidence: `File ${r.rel} (${r.totalLines} baris total, mulai baris ${r.from}${r.truncated ? ", dipotong" : ""}):\n${r.text}` };
    },
  });
  defineTool({
    name: "editfile", order: 150, perm: "owner", danger: true, doing: "ngedit filenya",
    desc: "EDIT file di repo bot dengan ganti teks persis (find→replace); file .js dicek syntax & di-rollback kalau rusak, backup .bak otomatis. Baca dulu pakai readfile",
    args: {
      path: { required: true, max: 200 },
      find: { required: true, desc: "potongan teks PERSIS yang diganti, cukup unik", max: 8000 },
      replace: { desc: "teks pengganti (kosong = hapus)", max: 20000 },
      all: { type: "boolean", desc: "ganti semua kemunculan" },
    },
    example: { path: "src/lib/contoh.js", find: "const a = 1;", replace: "const a = 2;" },
    async run(call) {
      const r = editRepoFile(call.path, call.find, call.replace ?? "", { all: !!call.all });
      return { ok: true, msg: `${r.rel} diedit (${r.replaced} tempat${r.backup ? ", backup " + r.backup : ""})` };
    },
  });
  defineTool({
    name: "writefile", order: 155, perm: "owner", danger: true, doing: "nulis filenya",
    desc: "TULIS file baru di repo bot (js/json/md/dll); file .js dicek syntax. overwrite=true hanya kalau user eksplisit minta menimpa",
    args: {
      path: { required: true, max: 200 },
      content: { required: true, max: 400000 },
      overwrite: { type: "boolean" },
    },
    example: { path: "plugins/custom/halo.js", content: "export const x = 1;" },
    async run(call) {
      const r = writeRepoFile(call.path, call.content, { overwrite: !!call.overwrite });
      return { ok: true, msg: `${r.rel} ${r.created ? "dibuat" : "ditimpa"} (${r.bytes} byte${r.backup ? ", backup " + r.backup : ""})` };
    },
  });
  return true;
}
