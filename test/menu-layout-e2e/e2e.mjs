// E2E: nova-menu-style novaMenuLayout — hapus baris nama bot dobel di body
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
const { novaMenuLayout } = await import(pathToFileURL(path.join(REPO, "src/lib/nova-menu-style.js")).href);
const { fromSC } = await import(pathToFileURL(path.join(REPO, "src/lib/styler.js")).href);

const txt = novaMenuLayout({
  intro: "Halo kak!",
  introTitle: "Nova",
  info: ["Info", { label: "Nama", value: "Budi" }],
  categories: [{ name: "Menu", commands: ["menu", "allmenu"] }],
  prefix: ".",
  footerName: "Nova AI Whatsapp Bot",
});
const plain = fromSC(txt);

t("1a. footerName param diterima tanpa error (backward-compat)", typeof txt === "string" && txt.length > 0);
t("1b. body TIDAK ADA baris 'Nova AI Whatsapp Bot' sendiri (dobel sama footer kartu)",
  !plain.includes("Nova AI Whatsapp Bot"), plain.slice(-80));
t("1c. body tetap ada command list (fitur inti gak ke-strip)", txt.includes(".menu") && txt.includes(".allmenu"));
t("1d. tanpa footerName pun tetap normal (opsional)", (() => {
  const t2 = novaMenuLayout({ categories: [{ name: "Menu", commands: ["menu"] }], prefix: "." });
  return t2.includes(".menu");
})());

out("===== " + pass + " PASS, " + fail + " FAIL =====");
process.exit(fail ? 1 : 0);
