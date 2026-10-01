// E2E: stripMarkdownTables — garis | / |- dari markdown table jawaban AI
// gak muncul lagi di awal baris (owner 20 Sep 2026).
// Jalankan: node test/md-table-e2e/e2e.mjs
import path from "node:path";
import { pathToFileURL } from "node:url";

const out = (s) => process.stdout.write(s + "\n");
let pass = 0, fail = 0;
function t(label, cond, extra) {
  if (cond) pass++;
  else { fail++; out("FAIL: " + label + " " + (extra || "")); }
}

const REPO = path.resolve(".");
const { stripMarkdownTables } = await import(pathToFileURL(path.join(REPO, "src/lib/rara-md-table.js")).href);

// ── case 1: table berita beneran (header + separator + rows) ──
{
  const input = `Berita terbaru hari ini:\n\n| Judul | Sumber | Tanggal |\n|-------|--------|---------|\n| Banjir Jakarta | Kompas | 20 Sep |\n| Gempa Cianjur | detik | 19 Sep |\n\nSemoga membantu!`;
  const r = stripMarkdownTables(input);
  t("1a. gak ada baris yang mulai dengan |", !r.split("\n").some((l) => l.trim().startsWith("|")), r);
  t("1b. gak ada baris |- (separator dibuang)", !r.split("\n").some((l) => l.trim().match(/^[|\s:\-]+$/) && l.includes("|")), r);
  t("1c. isi table jadi bullet rapi", r.includes("• Banjir Jakarta — Kompas — 20 Sep") && r.includes("• Gempa Cianjur — detik — 19 Sep"), r);
  t("1d. teks sebelum & sesudah table utuh", r.startsWith("Berita terbaru hari ini:") && r.includes("Semoga membantu!"));
}

// ── case 2: baris pipe tanpa separator → cukup buang pipe tepi ──
{
  const input = `| Judul berita pertama\n| Judul berita kedua`;
  const r = stripMarkdownTables(input);
  t("2a. pipe kiri dibuang, isi tetap", r.includes("Judul berita pertama") && !r.includes("| Judul"), r);
}

// ── case 3: sampah pipe sendirian (| dan |-) dibuang ──
{
  const r = stripMarkdownTables("Paragraf 1\n|\n|-\n|---|\nParagraf 2");
  t("3a. baris | , |- , |---| sendirian dibuang", !/\n\|/.test(r) && r.includes("Paragraf 1") && r.includes("Paragraf 2"), JSON.stringify(r));
}

// ── case 4: shell pipe di TENGAH baris & code fence gak disentuh ──
{
  const input = "Cara pakai:\nls | grep rara\n\n```bash\necho hai | cat\n| code | pipe |\n```";
  const r = stripMarkdownTables(input);
  t("4a. pipe shell tengah baris tetap", r.includes("ls | grep rara"), r);
  t("4b. isi code fence verbatim (| code | pipe | tetap)", r.includes("| code | pipe |"), r);
}

// ── case 5: terpasang di rara-agent.js (jawaban agent diparse) ──
{
  const src = path.join(REPO, "src/lib/rara-agent.js");
  const c = await import("node:fs").then((fs) => fs.readFileSync(src, "utf8"));
  t("5a. rara-agent.js import + parse di 4 mode", (c.match(/stripMarkdownTables/g) || []).length >= 5, c.match(/stripMarkdownTables/g)?.length);
}
// ── case 6: terpasang di rara-ai-service.js (AI satuan) ──
{
  const src = path.join(REPO, "src/lib/rara-ai-service.js");
  const c = await import("node:fs").then((fs) => fs.readFileSync(src, "utf8"));
  t("6a. rara-ai-service.js parse di 3 titik return", (c.match(/return stripMarkdownTables\(text\)/g) || []).length === 3, c.match(/return stripMarkdownTables\(text\)/g)?.length);
}

// ── case 7: teks tanpa pipe → gak diubah sama sekali ──
{
  const input = "Jawaban biasa tanpa table.\nBaris kedua.";
  t("7a. teks polos identik (idempotent)", stripMarkdownTables(input) === input);
}

out("===== " + pass + " PASS, " + fail + " FAIL =====");
process.exit(fail ? 1 : 0);
