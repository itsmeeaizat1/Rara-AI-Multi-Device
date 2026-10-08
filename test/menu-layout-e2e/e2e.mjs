// E2E: rara-menu-style raraMenuLayout — hapus baris nama bot dobel di body
// (owner 20 Sep 2026: "nama bot disini dihapus aja soalnya udh ada nama bot
// di fotter akhir" — footer kartu sendMenuCard sudah nampilin nama bot).
// Jalankan: node test/menu-layout-e2e/e2e.mjs
import path from "node:path";
import { pathToFileURL } from "node:url";

const out = (s) => process.stdout.write(s + "\n");
let pass = 0, fail = 0;
function t(label, cond, extra) {
  if (cond) pass++;
  else { fail++; out("FAIL: " + label + " " + (extra || "")); }
}

const REPO = path.resolve(".");
const { raraMenuLayout } = await import(pathToFileURL(path.join(REPO, "src/lib/rara-menu-style.js")).href);
const { fromSC } = await import(pathToFileURL(path.join(REPO, "src/lib/styler.js")).href);

const txt = raraMenuLayout({
  intro: "Halo kak!",
  introTitle: "Rara",
  info: ["Info", { label: "Nama", value: "Budi" }],
  categories: [{ name: "Menu", commands: ["menu", "allmenu"] }],
  prefix: ".",
  footerName: "Rara AI - Multi Device",
});
const plain = fromSC(txt);

t("1a. footerName param diterima tanpa error (backward-compat)", typeof txt === "string" && txt.length > 0);
t("1b. body TIDAK ADA baris 'Rara AI - Multi Device' sendiri (dobel sama footer kartu)",
  !plain.includes("Rara AI - Multi Device"), plain.slice(-80));
t("1c. body tetap ada command list (fitur inti gak ke-strip)", txt.includes(".menu") && txt.includes(".allmenu"));
t("1d. tanpa footerName pun tetap normal (opsional)", (() => {
  const t2 = raraMenuLayout({ categories: [{ name: "Menu", commands: ["menu"] }], prefix: "." });
  return t2.includes(".menu");
})());

// ── GAYA BOX KATEGORI (owner 8 Okt 2026: "ubah gaya allmenu" — ╭『 』 / ᯓ / ╰—༓) ──
const box = raraMenuLayout({
  categories: [{ name: "Download", commands: [{ name: "play", symbols: "Ⓟ Ⓛ" }, "ytmp4"] }],
  prefix: ".",
  categoryBoxStyle: true,
});
t("2a. header kotak kategori ╭─────『 NAME 』", box.includes("╭─────『 ") && box.includes("DOWNLOAD 』"), box.split("\n").find((l) => l.includes("╭")));
t("2b. command bullet ᯓ + prefix", box.includes("    ᯓ .play Ⓟ Ⓛ") && box.includes("    ᯓ .ytmp4"));
t("2c. footer kotak ╰–––––––––––––––༓", box.includes("╰–––––––––––––––༓"));
t("2d. gaya default (tanpa categoryBoxStyle) tetap 「 ✦ 」 lama", (() => {
  const d = raraMenuLayout({ categories: [{ name: "Download", commands: ["play"] }], prefix: "." });
  return d.includes("「 ✦ DOWNLOAD ✦ 」") && d.includes(".play") && !d.includes("ᯓ");
})());
t("2e. lebih dari 1 kategori dipisah baris kosong (tiap kotak utuh)", (() => {
  const m = raraMenuLayout({
    categories: [
      { name: "A", commands: ["a1"] },
      { name: "B", commands: ["b1"] },
    ],
    prefix: ".",
    categoryBoxStyle: true,
  });
  const parts = m.split("╰–––––––––––––––༓").filter((x) => x.trim());
  return parts.length === 2 && (m.match(/╭─────『/g) || []).length === 2;
})());

out("===== " + pass + " PASS, " + fail + " FAIL =====");
process.exit(fail ? 1 : 0);
