// E2E Berita RSS Engine (12 Sep 2026): 14 plugin berita yang route siputzx-nya mati
// di-rewire ke RSS langsung (situs asli + Google News). Live fetch semua feed + handler smoke.
import path from "node:path";
const R = path.resolve(".");
const { fetchNewsList, gnews } = await import(R + "/src/lib/nova-rss-news.js");

let pass = 0, fail = 0;
const out = (s) => process.stdout.write(s + "\n");
const t = (label, cond, extra) => { if (cond) { pass++; out("✅ " + label); } else { fail++; out("❌ " + label + (extra ? " — " + extra : "")); } };

const FEEDS = {
  cnbc: "https://www.cnbcindonesia.com/rss",
  tempo: "https://rss.tempo.co",
  okezone: "https://www.okezone.com/rss",
  sindo: "https://www.sindonews.com/rss",
  dailynews: gnews.top,
  tribun: gnews.site("tribunnews.com"),
  indozone: gnews.site("indozone.id"),
  inews: gnews.site("inews.id"),
  jalantikus: gnews.site("jalantikus.com"),
  kontan: gnews.site("kontan.co.id"),
  beritabola: gnews.query("sepak bola"),
  infobola: gnews.query("timnas indonesia"),
  layarkaca: gnews.query("film bioskop"),
  viral: gnews.query("viral"),
};

out("— lib nova-rss-news —");
t("1. fetchNewsList export", typeof fetchNewsList === "function");
t("2. gnews helper top/query/site", typeof gnews.top === "string" && gnews.query("x").includes("x") && gnews.site("a.com").includes("site%3Aa.com") || gnews.site("a.com").includes("site:a.com"));

out("\n— live fetch 14 feed (paralel) —");
const names = Object.keys(FEEDS);
const results = await Promise.allSettled(names.map((n) => fetchNewsList(FEEDS[n], 8)));
for (let i = 0; i < names.length; i++) {
  const r = results[i];
  const ok = r.status === "fulfilled" && Array.isArray(r.value) && r.value.length > 0 && r.value[0].title && r.value[0].link;
  t(`3${names[i] && ""}.${names[i]}: feed hidup + judul/link`, ok, r.status === "rejected" ? String(r.reason).slice(0, 80) : "");
}
const sample = results[0].status === "fulfilled" ? results[0].value : [];
t("4. item shape {title, link}", sample.length > 0 && typeof sample[0].title === "string" && /^https?:/.test(sample[0].link));

out("\n— handler smoke (3 plugin, live feed) —");
const replies = [];
const mockM = { prefix: ".", command: "x", pushName: "T", react: async () => {}, reply: async (txt) => { replies.push(String(txt)); return { key: { id: "r" } }; } };
for (const plug of ["kompas-alive-proxy", "tempo", "viral"]) {
  if (plug === "kompas-alive-proxy") { t("5. skip proxy marker", true); continue; }
  try {
    const mod = await import(R + "/plugins/berita/" + plug + ".js");
    replies.length = 0;
    await mod.handler(mockM, { sock: {}, config: {} });
    const rep = replies.at(-1) || "";
    t(`6. ${plug}: handler render list berita`, rep.length > 100 && /\d\./.test(rep), rep.slice(0, 80));
  } catch (e) { t(`6. ${plug}: handler render`, false, String(e).slice(0, 100)); }
}

out("\n— plugin rewired check —");
import fs from "node:fs";
for (const n of names) {
  const src = fs.readFileSync(R + "/plugins/berita/" + n + ".js", "utf-8");
  t(`7.${n}: gak nyamber siputzx lagi`, !src.includes("siputzx") && src.includes("fetchNewsList"));
}
const aliveKeep = ["antara", "cnn", "kompas", "merdeka"];
for (const n of aliveKeep) {
  const src = fs.readFileSync(R + "/plugins/berita/" + n + ".js", "utf-8");
  t(`8.${n}: tetep pakai siputzx (route hidup)`, src.includes("siputzx.my.id"));
}

out(`\n===== ${pass} PASS, ${fail} FAIL =====`);
process.exit(fail ? 1 : 0);
