// ── OWNER MEDIA INFO E2E (5 Okt 2026) ────────────────────────────────────────
// Kartu info media kategori owner: 17/225 sender berkartu (208 teks-only skip
// wajar). 3 keluarga: VN/audio otomatis (aiautointeractionvn/autosholat/
// autotranslatevn/predictivenudge/ptvch), broadcast & kontak (bcgc/bcpc/
// pushkontak/savekontak/clone), backup/export/upload (backupsc/dbexport/
// getplugin/get/statuspost/autosmartwelcome/upch). Audio VN → kartu teks
// setelah VN. Dokumen/gambar/video → kartu gabung caption.

import { readFile } from "node:fs/promises";
import { readdirSync } from "node:fs";

const LIB = await import(new URL("../../src/lib/rara-media-result.js", import.meta.url).href)
  .catch((e) => { console.error("IMPORT GAGAL:", e.message); process.exit(1); });
const { mediaResultCard, probeBuffer } = LIB;

let pass = 0, fail = 0;
const check = (name, cond) => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}`); }
};
const src = (f) => readFile(new URL("../../" + f, import.meta.url), "utf-8");

const PATTERNS = [
  /(?<![.\w])sock\.sendMedia\b|(?<![.\w])conn\.sendMedia\b/,
  /sendImage|sendVideo|sendAudio|sendDocument|sendFile/,
  /\.sendMessage\([\s\S]{0,400}?\bimage\s*:/,
  /\.sendMessage\([\s\S]{0,400}?\bvideo\s*:/,
  /\.sendMessage\([\s\S]{0,400}?\baudio\s*:/,
  /\.sendMessage\([\s\S]{0,400}?\bdocument\s*:/,
  /sendImageAsSticker|sendVideoAsSticker/,
  /\.sendMessage\([\s\S]{0,400}?\bsticker\s*:/,
];

console.log("── 1. rescan: SEMUA pengirim media owner berkartu ──");
const all = readdirSync(new URL("../../plugins/owner", import.meta.url)).filter((f) => f.endsWith(".js"));
const senders = [];
for (const f of all) {
  const s = await src(`plugins/owner/${f}`);
  if (PATTERNS.some((re) => re.test(s))) senders.push(f);
}
for (const f of senders) {
  const s = await src(`plugins/owner/${f}`);
  check(`${f} → mediaResultCard`, s.includes("mediaResultCard"));
}
check(`rescan menemukan ${senders.length} sender (ekspetasi 17)`, senders.length === 17);

console.log("── 2. Engine + FIELD UNIK per fitur ──");
const SPEC = {
  "aiautointeractionvn.js": { engine: "Rara AI Voice", fields: ["Konteks", "Sumber"] },
  "autosholat.js": { engine: "Audio Adzan", fields: ["Sholat", "Kota"] },
  "autotranslatevn.js": { engine: "Rara AI Voice (Translate)", fields: ["Konteks"] },
  "predictivenudge.js": { engine: "Rara AI Voice (Nudge)", fields: ["Konteks"] },
  "ptvch.js": { engine: "PTV Channel", fields: ["Saluran", "Tipe"] },
  "bcgc.js": { engine: "Broadcast Grup", fields: ["Tipe"] },
  "bcpc.js": { engine: "Broadcast Kontak", fields: ["Tipe"] },
  "pushkontak.js": { engine: "VCF Kontak", fields: ["Total", "Grup"] },
  "savekontak.js": { engine: "VCF Kontak", fields: ["Total", "Base"] },
  "clone.js": { engine: "WhatsApp CDN", fields: ["Konteks", "Target"] },
  "backupsc.js": { engine: "Zip Backup Script", fields: ["Nama File", "Ukuran"] },
  "dbexport.js": { engine: "XLSX Export Database", fields: ["Pemain RPG", "Nama File"] },
  "getplugin.js": { engine: "Source Plugin", fields: ["File"] },
  "get.js": { engine: "HTTP Response", fields: ["Kategori"] },
  "statuspost.js": { engine: "WhatsApp Status", fields: ["Tipe"] },
  "autosmartwelcome.js": { engine: "Canvas Welcome Auto", fields: ["Member", "Grup", "Total Member"] },
  "upch.js": { engine: "Upload Saluran", fields: ["Tipe", "Saluran"] },
};
for (const [f, spec] of Object.entries(SPEC)) {
  const s = await src(`plugins/owner/${f}`);
  const cardLines = s.split("\n").filter((l) => l.includes("dlCard(") && !l.includes("async function"));
  const allTxt = cardLines.join("\n");
  const okEngine = s.includes(`"${spec.engine}"`);
  const okFields = spec.fields.every((k) => allTxt.includes(`["${k}"`));
  check(`${f}: Engine "${spec.engine}" + ${spec.fields.length} field unik`, okEngine && okFields);
}
{
  const shapes = new Set(Object.entries(SPEC).map(([f, sp]) => sp.engine + "|" + sp.fields.join(",")));
  check(`${shapes.size}/17 variasi Engine+field (bukan boilerplate)`, shapes.size >= 13);
}

console.log("── 3. aturan audio VN (kartu teks setelah) ──");
{
  const f1 = await src("plugins/owner/aiautointeractionvn.js");
  check("aiautointeractionvn: kartu teks setelah VN", /audio: ogg[\s\S]{0,500}?text: card/.test(f1));
  const f2 = await src("plugins/owner/autosholat.js");
  check("autosholat: kartu teks setelah adzan", /AUDIO_ADZAN[\s\S]{0,600}?text: card/.test(f2));
  const f3 = await src("plugins/owner/autotranslatevn.js");
  check("autotranslatevn: 2 titik kartu setelah VN (ogg+mp3)", (f3.match(/VN Diterjemah/g) || []).length === 2);
  const f4 = await src("plugins/owner/predictivenudge.js");
  check("predictivenudge: 2 titik kartu setelah VN", (f4.match(/Rara AI Voice \(Nudge\)/g) || []).length === 2);
  const f5 = await src("plugins/owner/ptvch.js");
  check("ptvch: kartu ke owner (m.reply), bukan ke channel", /ptv: true[\s\S]{0,400}?m\.reply\(card\)/.test(f5));
}

console.log("── 4. cabang broadcast lengkap ──");
{
  const bc = await src("plugins/owner/bcgc.js");
  check("bcgc: 4 cabang ter-kartu (stiker/audio/dokumen/gambar-video)", ["stiker", "audio", "dokumen"].every((t) => bc.includes(`dlCard("${t}"`)) && bc.includes('mediaType === "video" ? "video"'));
  const bp = await src("plugins/owner/bcpc.js");
  check("bcpc: kartu dihitung sekali sebelum loop (bcCard)", bp.includes("const bcCard = ") && bp.includes("${broadcastText}\\n\\n${bcCard}"));
  const up = await src("plugins/owner/upch.js");
  check("upch: 3 titik (gambar icard/video vcard/audio acard ke owner)", up.includes("const icard") && up.includes("const vcard") && up.includes("const acard"));
  const gt = await src("plugins/owner/get.js");
  check("get: 3 cabang berkartu (HTTP Response + Kategori)", ["video", "gambar", "dokumen"].every((t) => gt.includes(`dlCard("${t}"`)) && (gt.match(/HTTP Response/g) || []).length === 3);
}

console.log("── 5. helper anti-throw + fallback ──");
for (const f of senders) {
  const s = await src(`plugins/owner/${f}`);
  check(`${f}: dlCard best-effort (catch → null)`, s.includes("} catch { return null; }"));
}
{
  const st = await src("plugins/owner/statuspost.js");
  check("statuspost: fallback caption asli", st.includes("(teks || \"\")"));
  const gs = await src("plugins/owner/get.js");
  check("get: fallback caption header", gs.includes(": header"));
}

console.log("── 6. engine kartu hidup ──");
{
  const png = Buffer.from("89504e470d0a1a0a0000000d4948445200000001000000010806000000", "hex");
  const info = await probeBuffer(png, { mime: "image/png" });
  const card = mediaResultCard({
    header: "bcgc", type: "gambar",
    request: [["Engine", "Broadcast Grup"], ["Tipe", "Gambar"]],
    size: info?.size, mime: info?.mime, width: info?.width, height: info?.height,
  });
  check("kartu owner ter-render + field Tipe", typeof card === "string" && card.includes("BCGC") && card.includes("Broadcast Grup"));
}

console.log("\n──────────────────────────────────────────────");
console.log(`TOTAL: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
