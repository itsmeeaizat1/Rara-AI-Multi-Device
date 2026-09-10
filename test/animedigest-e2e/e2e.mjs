// E2E digest anime TERBARU/HANGAT per-anime card (request owner 10 Sep 2026:
// "notif anime gak ada deskripsi — cuma list doang, thumbnail + info + deskripsi gak muncul").
// Jalankan dari cwd DIR KOSONG (state terisolasi) dengan loader axios-mock:
//   mkdir -p /tmp/animedigest-e2e/src/data && cd /tmp/animedigest-e2e && \
//   node --experimental-loader <repo>/test/anime-card-mock/loader.mjs <repo>/test/animedigest-e2e/e2e.mjs
import {
  formatDigestCard, dispatchDigest, buildDigest,
  setKitsuHttp, resetKitsuHttp, setSock, getListMode, setListMode,
} from "../../src/lib/nova-auto-anime-notifier.js";

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok) => { w((ok ? "  ✅" : "  ❌") + " " + name); ok ? pass++ : fail++; };
const READMORE = "\u200E".repeat(4001);

// ── fixture Kitsu: 6 anime, sinopsis panjang ──
const SYN = "Seorang anak muda menemukan pedang pusaka di gudang kakeknya dan terjaga ke dunia iblis yang penuh konspirasi kerajaan, sekolah sihir tersembunyi, dan perang antar klan yang berlangsung seribu tahun.";
const kitsuItem = (n) => ({
  title: "Fixture Anime " + n,
  startDate: "2026-09-0" + n,
  episodeCount: 12,
  subtype: "TV",
  rating: (7 + n / 10).toFixed(1) + "/10",
  userCount: 10000 * n,
  synopsis: SYN,
  poster: "https://img.test/anime-" + n + ".jpg",
  url: "https://kitsu.app/anime/900" + n,
});
const FIXTURE_ITEMS = [1, 2, 3, 4, 5, 6].map(kitsuItem);
const kitsuResp = (url) => ({
  data: FIXTURE_ITEMS.map((a, i) => ({ id: 900 + i + 1, attributes: null, __raw: a })).length ? { data: [] } : { data: [] },
});
// seam menerima (url) dan harus balikin bentuk { data: [...] } — buildDigest map via mapKitsuAnime,
// jadi kita inject di level hasil: balikin struktur Kitsu asli dari fixture mentah
const RAW = FIXTURE_ITEMS.map((a, i) => ({
  id: 901 + i,
  attributes: {
    canonicalTitle: a.title,
    startDate: a.startDate,
    episodeCount: a.episodeCount,
    subtype: "tv",
    averageRating: String(a.rating.replace("/10", "") * 10),
    userCount: a.userCount,
    synopsis: a.synopsis,
    posterImage: { large: a.poster, medium: a.poster, small: a.poster },
  },
}));

// ── 1. formatDigestCard ──
w("\n— formatDigestCard —");
{
  const c = formatDigestCard(kitsuItem(1), "terbaru", { index: 2, total: 6 });
  check("terbaru: header", c.includes("🆕 INFO ANIME TERBARU!"));
  check("terbaru: judul bold", c.includes("*Fixture Anime 1*"));
  check("terbaru: mulai tayang", c.includes("Mulai tayang: 2026-09-01"));
  check("terbaru: tipe + eps + rating", c.includes("TV | 12 eps | ⭐ 7.1/10"));
  check("terbaru: link kitsu", c.includes("https://kitsu.app/anime/9001"));
  check("terbaru: READMORE di posisi deskripsi", c.includes("📖 Deskripsi:" + READMORE));
  check("terbaru: SINOPSIS PENUH bukan 90 char", c.includes(SYN) && !c.slice(c.indexOf("Deskripsi:")).includes("..."));
  check("terbaru: footer index/total", c.includes("Info anime terbaru 2/6 — Kitsu"));
  const h = formatDigestCard(kitsuItem(3), "hangat", { index: 1, total: 6 });
  check("hangat: header beda", h.includes("🔥 ANIME HANGAT MUSIM INI!"));
  check("hangat: baris peminat", h.includes("👥 30.000 peminat"));
  check("hangat: footer beda", h.includes("Anime hangat 1/6 — Kitsu"));
  check("item null → null", formatDigestCard(null) === null);
  const noSyn = formatDigestCard({ title: "X", startDate: "?", subtype: "TV", rating: "N/A" }, "terbaru", {});
  check("sinopsis kosong → placeholder", noSyn.includes("Sinopsis belum tersedia"));
}

// ── 2. buildDigest bawa items (via seam Kitsu) ──
w("\n— buildDigest via setKitsuHttp —");
{
  setKitsuHttp(async () => ({ data: RAW }));
  const dig = await buildDigest("terbaru", 10);
  check("terbaru: items kebawa (6)", Array.isArray(dig.items) && dig.items.length === 6);
  check("terbaru: item ada synopsis + poster", dig.items[0].synopsis === SYN && dig.items[0].poster?.includes("img.test"));
  const dig2 = await buildDigest("hangat", 10);
  check("hangat: items kebawa", Array.isArray(dig2.items) && dig2.items.length === 6);
  check("hangat: userCount ter-map", dig2.items[5].userCount === 60000);
  resetKitsuHttp();
}

// ── 3. dispatchDigest: card per-anime ──
w("\n— dispatchDigest per-anime —");
{
  const sent = [];
  const mockSock = { sendMessage: async (chatId, msg) => { sent.push({ chatId, msg }); return { key: { id: String(sent.length) } }; } };
  setSock(mockSock);
  const dig = { items: FIXTURE_ITEMS, text: "teks lama", thumb: null, sourceUrl: "https://kitsu.app/anime/9001", tagline: "Info anime terbaru" };

  // ── MODE LIST (request owner 10 Sep): default OFF = cuma 1 card terbaru ──
  setListMode(false);
  check("default: listMode OFF", getListMode() === false);
  let n = await dispatchDigest("terbaru", dig, ["chatA@g.us"]);
  check("mode list OFF: cuma 1 kirim (1 card, gak ada rangkuman)", n === 1 && sent.length === 1 && !!sent[0].msg.image);
  check("mode list OFF: card = anime TERBARU (item pertama)", sent[0].msg.caption.includes("*Fixture Anime 1*"));

  // ── list ON → perilaku lama (4 card + rangkuman) ──
  setListMode(true);
  check("setListMode(true): ON", getListMode() === true);
  sent.length = 0;
  n = await dispatchDigest("terbaru", dig, ["chatA@g.us"]);
  // cap 4: 4 card gambar + 1 rangkuman sisa (2 judul)
  check("terbaru: 4 card + 1 rangkusan = 5 kirim", n === 5 && sent.length === 5);
  const imgMsgs = sent.filter((s) => s.msg.image);
  check("terbaru: 4 pesan bertipe IMAGE (poster asli)", imgMsgs.length === 4);
  check("terbaru: caption card 1 = sinopsis penuh", imgMsgs[0].msg.caption.includes(SYN));
  check("terbaru: caption ada READMORE", imgMsgs[0].msg.caption.includes(READMORE));
  check("terbaru: banner renderLarger + thumbnail buffer",
    imgMsgs[0].msg.contextInfo.externalAdReply.renderLargerThumbnail === true && !!imgMsgs[0].msg.contextInfo.externalAdReply.thumbnail);
  check("terbaru: banner sourceUrl = kitsu url", imgMsgs[0].msg.contextInfo.externalAdReply.sourceUrl.includes("kitsu.app/anime/90"));
  check("terbaru: banner body = TV • mulai", imgMsgs[0].msg.contextInfo.externalAdReply.body.includes("mulai"));
  const sisaMsg = sent.find((s) => s.msg.text?.includes("anime lainya"));
  check("terbaru: rangkusan sisa 2 judul", sisaMsg?.msg.text.includes("Fixture Anime 5") && sisaMsg.msg.text.includes("Fixture Anime 6"));

  // hangat: body banner = peminat
  sent.length = 0;
  await dispatchDigest("hangat", { ...dig, tagline: "Anime hangat musim ini" }, ["chatA@g.us"]);
  const hangatImg = sent.find((s) => s.msg.image);
  check("hangat: caption header hangat", hangatImg?.msg.caption.includes("ANIME HANGAT MUSIM INI!"));
  check("hangat: banner body peminat", hangatImg?.msg.contextInfo.externalAdReply.body.includes("peminat"));
  check("hangat: caption baris peminat", hangatImg?.msg.caption.includes("peminat"));

  // force (`.animenotify now`): cap 6 → semua card, tanpa rangkuman
  sent.length = 0;
  n = await dispatchDigest("terbaru", dig, ["chatA@g.us"], { force: true });
  check("force: cap 6 → 6 card tanpa rangkuman", n === 6 && sent.length === 6 && sent.every((s) => s.msg.image));

  // multi-target: 2 chat → dobel
  sent.length = 0;
  await dispatchDigest("terbaru", dig, ["chatA@g.us", "chatB@g.us"]);
  check("multi-target: 5+5 kirim", sent.length === 10);

  // berita: tetap satu pesan teks (gak berubah)
  sent.length = 0;
  n = await dispatchDigest("berita", { text: "📰 BERITA", thumb: null, sourceUrl: "https://myanimelist.net/news", tagline: "Berita" }, ["chatA@g.us"]);
  check("berita: tetap 1 pesan teks (bukan card)", n === 1 && sent.length === 1 && !!sent[0].msg.text && !sent[0].msg.image);

  // tanpa items → fallback teks lama
  sent.length = 0;
  n = await dispatchDigest("terbaru", { text: "list lama", thumb: null, sourceUrl: null, tagline: null }, ["chatA@g.us"]);
  check("tanpa items → fallback teks list", n === 1 && sent[0].msg.text === "list lama");

  check("targets kosong → 0", await dispatchDigest("terbaru", dig, []) === 0);
  setSock(null);
}

w(`\n${pass} PASS / ${fail} FAIL`);
setTimeout(() => process.exit(fail ? 1 : 0), 300);
