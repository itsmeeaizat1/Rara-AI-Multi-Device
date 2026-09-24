// E2E: SUMBER LOKER INDONESIA (v24.2.8).
// Owner: "cek fitur auto loker itu fiturnya beneran notif loker dr indonesia ga
// kyk lowongan kerja indonesia".
//
// Temuan: 4 portal lama (JobStreet/Glints/Kalibrr/Indeed) SEMUA memblokir
// scraping (500/404/403) → fetchAllIndonesiaJobs = 0 → notif isinya loker luar
// negeri (USA/Jerman dari Remotive/Arbeitnow). LinkedIn guest API masih terbuka
// dan mengembalikan LOKER INDONESIA asli → dijadikan sumber utama.
//
// Jalankan: node test/loker-id-e2e/e2e.mjs
const out = (s) => process.stdout.write(s + "\n");
let pass = 0, fail = 0;
const t = (label, ok, extra) => { if (ok) { pass++; out("✅ " + label); } else { fail++; out("❌ " + label + (extra ? " — " + extra : "")); } };

const R = process.cwd();
const { initDatabase } = await import(R + "/src/lib/nova-database.js");
await initDatabase("/tmp/loker-id-e2e/nova.json");
const L = await import(R + "/src/lib/nova-loker-id-sources.js");
const S = await import(R + "/src/lib/nova-loker-scheduler.js");

out("\n— 1. LinkedIn guest API (sumber utama) —");
const li = await L.fetchLinkedinID({ limit: 8 });
t("1a. fetchLinkedinID mengembalikan loker (>0)", li.length > 0, `dapat ${li.length}`);
const j0 = li[0] || {};
t("1b. field lengkap (id/title/company/location/url/source)",
  !!(j0.id && j0.title && j0.company && j0.location && j0.url && j0.source),
  JSON.stringify({ id: !!j0.id, title: !!j0.title, company: !!j0.company, loc: !!j0.location, url: !!j0.url }));
t("1c. source = 'LinkedIn ID'", j0.source === "LinkedIn ID", j0.source);
t("1d. link mengarah ke linkedin.com/jobs/view", /linkedin\.com\/jobs\/view\//.test(j0.url || ""), String(j0.url).slice(0, 70));
const locAll = li.map((j) => String(j.location || "").toLowerCase()).join(" | ");
t("1e. lokasi berisi kota Indonesia / tidak 'USA'/'Germany'",
  !/\b(usa|germany|türkiye|berlin)\b/.test(locAll), locAll.slice(0, 80));

out("\n— 2. fetchAllIndonesiaJobs (rantai portal ID) —");
const all = await L.fetchAllIndonesiaJobs({ sources: ["linkedin", "jobstreet", "glints", "kalibrr", "indeed"], limit: 6 });
t("2a. ada hasil (LinkedIn menyelamatkan rantai)", all.length > 0, `dapat ${all.length}`);
t("2b. sumber terisi 'LinkedIn ID'", all.every((j) => j.source === "LinkedIn ID"), [...new Set(all.map((j) => j.source))].join(","));
t("2c. dedup id unik", new Set(all.map((j) => j.id)).size === all.length);

out("\n— 3. fetchNewJobs + format notifikasi —");
const jobs = await S.fetchNewJobs({ sources: ["linkedin"], keywords: [], categories: [], limit: 3, sentIds: {} });
t("3a. fetchNewJobs dapat loker", jobs.length > 0, `dapat ${jobs.length}`);
const msg = S.formatLokerMessage(jobs.slice(0, 2), { label: "Pagi", keywords: [], source: "LinkedIn ID" });
t("3b. header INFO LOWONGAN KERJA", /INFO LOWONGAN KERJA/.test(msg));
t("3c. isi: Perusahaan + Lokasi + Link", /Perusahaan:/.test(msg) && /Lokasi:/.test(msg) && /Link:/.test(msg));
t("3d. ada link linkedin di pesan", /linkedin\.com\/jobs\/view\//.test(msg));

out("\n— 4. default sources mengutamakan Indonesia —");
const st = S.getLokerStatus?.();
const srcs = Array.isArray(st?.sources) ? st.sources : null;
t("4a. 'linkedin' ada di sumber default", !!srcs && srcs.includes("linkedin"), srcs ? srcs.join(",") : "(status tanpa sources)");

out(`\n${fail === 0 ? "🎉 SEMUA PASS" : "💥 ADA FAILURE"} — ${pass} pass, ${fail} fail`);
process.exit(fail === 0 ? 0 : 1);
