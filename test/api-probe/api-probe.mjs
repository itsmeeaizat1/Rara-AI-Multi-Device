#!/usr/bin/env node
// PROBE API — test endpoint free (TANPA KEY / TANPA CREDIT) dari docs/list api.md
// Jalankan: node api-probe.mjs (dari folder mana aja)
// Fokus: endpoint yang DIPAKAI bot + endpoint Wilz (param bener per docs)
const TIMEOUT = 12000;

async function probe(name, url, opts = {}) {
  const t0 = Date.now();
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT);
    const res = await fetch(url, { signal: ctrl.signal, headers: opts.headers || {} });
    clearTimeout(timer);
    const ms = Date.now() - t0;
    let body = '';
    let kind = 'text';
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('json')) {
      const j = await res.json();
      kind = 'json';
      // deteksi struktur respon umum
      const status = j.status ?? j.success ?? null;
      const msg = j.message ?? j.error ?? '';
      const hasData = !!(j.result ?? j.data ?? j.response ?? j.results);
      body = `status=${status} msg="${String(msg).slice(0, 50)}" data=${hasData} keys=[${Object.keys(j).slice(0, 6).join(',')}]`;
    } else if (ct.includes('image') || ct.includes('video')) {
      const buf = await res.arrayBuffer();
      kind = ct;
      body = `buffer ${(buf.byteLength / 1024).toFixed(0)}KB`;
    } else {
      const txt = await res.text();
      body = String(txt).slice(0, 80).replace(/\n/g, ' ');
    }
    return { name, ok: res.ok, code: res.status, ms, kind, body };
  } catch (e) {
    return { name, ok: false, code: 'ERR', ms: Date.now() - t0, kind: 'error', body: e.name === 'TimeoutError' || e.name === 'AbortError' ? 'TIMEOUT' : e.message.slice(0, 60) };
  }
}

const WILZ = 'https://www.wilz.web.id/api';

// ===== WILZ — param BENAR per docs =====
const wilzTests = [
  ['wilz ai/evernight', `${WILZ}/ai/evernight?q=halo`],
  ['wilz dl/spotify', `${WILZ}/download/spotify?url=https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPJq0`],
  ['wilz dl/ig', `${WILZ}/download/instagram?url=https://www.instagram.com/reel/C8xJ7NJv1rD/`],
  ['wilz dl/capcut', `${WILZ}/download/capcut?url=https://www.capcut.com/template-detail/7385327741984364545`],
  ['wilz dl/tiktok', `${WILZ}/download/tiktok?url=https://www.tiktok.com/@tiktok/video/7106594312292453675`],
  ['wilz dl/fb', `${WILZ}/download/facebook?url=https://www.facebook.com/watch/?v=10153231379946729`],
  ['wilz dl/yt', `${WILZ}/download/youtube?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ`],
  ['wilz search/tiktok', `${WILZ}/search/tiktok?q=kucing&count=3`],
  ['wilz search/tiktokv2', `${WILZ}/search/tiktokv2?q=kucing`],
  ['wilz search/yts', `${WILZ}/search/yts?q=faded alan walker`],
  ['wilz search/pinterest', `${WILZ}/search/pinterest?q=kucing`],
  ['wilz search/capcut', `${WILZ}/search/capcut?q=transisi`],
  ['wilz search/npm', `${WILZ}/search/npm?q=baileys`],
  ['wilz tools/lirik', `${WILZ}/tools/lirik?q=faded alan walker`],
  ['wilz tools/shorturl', `${WILZ}/tools/shorturl?url=https://example.com`],
  ['wilz tools/gmail', `${WILZ}/tools/gmail`],
  ['wilz tools/netflix', `${WILZ}/tools/netflix?url=https://www.netflix.com/title/81161626`],
  ['wilz tools/fake-swap', `${WILZ}/tools/fake-swap?text=halo`],
  ['wilz tools/remove-watermark', `${WILZ}/tools/remove-watermark?url=https://example.com/video.mp4`],
  ['wilz tools/react-ch', `${WILZ}/tools/react-ch?url=https://v.douyin.com/xxxx`],
  ['wilz tools/react-chv2', `${WILZ}/tools/react-chv2?url=https://v.douyin.com/xxxx`],
  ['wilz tools/alightmotion', `${WILZ}/tools/alightmotion?url=https://example.com`],
  ['wilz maker/brat', `${WILZ}/maker/brat?text=rara`],
  ['wilz maker/remove-bg', `${WILZ}/maker/remove-bg?url=https://picsum.photos/200`],
  ['wilz maker/ssweb', `${WILZ}/maker/ssweb?url=https://example.com`],
  ['wilz maker/upscaler', `${WILZ}/maker/upscaler?url=https://picsum.photos/200`],
  ['wilz maker/imggen23', `${WILZ}/maker/imggen23?prompt=kucing astronot`],
  ['wilz random/blue_archive', `${WILZ}/random/blue_archive`],
  ['wilz random/freefire', `${WILZ}/random/freefire?q=1`],
  ['wilz random/temp-mail', `${WILZ}/random/temp-mail?email=1`],
  ['wilz random/cuaca', `${WILZ}/random/cuaca?q=jakarta`],
];

// ===== PROVIDER FREE LAIN yang dipakai bot =====
const otherTests = [
  // backbone AI rantai
  ['ikyyxd gemini (chain)', `https://api.ikyyxd.my.id/ai/gemini?text=halo&apikey=kyzz`],
  ['ikyyxd gpt5mini (chain)', `https://api.ikyyxd.my.id/ai/gpt-5-mini?question=halo&apikey=kyzz`],
  ['haidar chat (backbone)', `https://api.haidarxd.my.id/ai/gpt-4o?query=halo`],
  ['xemoz (backbone)', `https://api-xemoz-official.my.id/gpt-5.3?query=halo`],
  ['agatics (tools chain)', `https://api.agatz.xyz/api/gpt4?query=halo`],
  // search/download yang dipakai
  ['fastdl', `https://api-wh.fastdl.app/api/td?url=https://www.tiktok.com/@tiktok/video/7106594312292453675`],
  ['tikwm (fallback playtiktok)', `https://www.tikwm.com/api/feed/search?keywords=kucing`],
  ['siputzx', `https://api.siputzx.my.id/api/ffstalk?query=123456789`],
  ['velyn (ffstalk)', `https://velyn.mom/api/ffstalk?uid=123456789`],
  ['zennxz', `https://api.zenzxz.my.id/api/search/yts?query=faded`],
  ['nyxs', `https://api.nyxs.my.id/`],
  ['nexray', `https://api.nexray.web.id/`],
  ['siputzx brat', `https://api.siputzx.my.id/api/brat?text=nova`],
  // stalker / islamic / news
  ['myanimelist (via jikan)', `https://api.jikan.moe/v4/anime?q=naruto&limit=1`],
  ['kitsu (anime notif)', `https://kitsu.io/api/edge/anime?page[limit]=1`],
  ['usgs earthquake', `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&limit=1&minmagnitude=4.5`],
  ['bmkg autogempa', `https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json`],
  ['open-meteo', `https://api.open-meteo.com/v1/forecast?latitude=-6.2&longitude=106.8&current_weather=true`],
  ['met.no (weather)', `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=-6.2&lon=106.8`, { headers: { 'User-Agent': 'rara-bot/1.0 contact@example.com' } }],
  ['alquran (equran)', `https://equran.id/api/v2/surat`],
  ['rss mal news', `https://www.myanimelist.net/rss/news.xml`],
  ['mangadex', `https://api.mangadex.org/manga?limit=1&title=naruto`],
  ['lrclib (lirikspotify)', `https://lrclib.net/api/search?track_name=komang&artist_name=raisa`],
  ['spotidown', `https://spotidown.app/en6`],
  ['min1ai (BACKBONE qwen free)', `POST`, null], // khusus — handled manual
];

// ===== RUN =====
const results = [];
console.log('── PROBE 1: Wilz (param per docs) ──');
for (const [name, url] of wilzTests) {
  results.push(await probe(name, url));
}

console.log('── PROBE 2: Provider free lain ──');
for (const [name, url, opts] of otherTests) {
  if (url === 'POST') continue;
  results.push(await probe(name, url, opts));
}

// min1ai — POST manual (1 request hemat, free qwen3-8b)
try {
  const t0 = Date.now();
  const res = await fetch('https://api.1min.ai/api/chat-with-ai', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'API-KEY': process.env.MIN1AI_KEY || '',
    },
    body: JSON.stringify({ model: 'qwen3-8b', prompt: 'balas satu kata: ok' }),
    signal: AbortSignal.timeout(20000),
  });
  const j = await res.json();
  results.push({ name: 'min1ai qwen3-8b', ok: res.ok, code: res.status, ms: Date.now() - t0, kind: 'json', body: JSON.stringify(j).slice(0, 100) });
} catch (e) {
  results.push({ name: 'min1ai qwen3-8b', ok: false, code: 'ERR', ms: 0, kind: 'error', body: e.message.slice(0, 60) });
}

// ===== REPORT =====
console.log('\n═══════════ HASIL PROBE ═══════════');
let okN = 0, failN = 0;
for (const r of results) {
  const icon = r.ok ? '✅' : '❌';
  if (r.ok) okN++; else failN++;
  console.log(`${icon} [${r.code}] ${r.ms}ms ${r.name}`);
  if (!r.ok || r.code !== 200) console.log(`      ↳ ${r.kind}: ${r.body}`);
}
console.log(`\nTOTAL: ${okN} OK / ${failN} FAIL dari ${results.length}`);
