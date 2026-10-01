// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// ═════════════════════════════════════════════
// 🔹 rara-sapi-render.js — renderer PLAIN TEXT data searchapi.io
// 🔹 Prinsip owner 14 Sep 2026: hasil di chat HARUS plain text lengkap
//   (alamat, harga, rating, jam, dll) — gak perlu preview / klik link.
// 🔹 Semua renderer DEFENSIF: bentuk respon beda-beda per engine,
//   jangan pernah crash — kalau field gak ada, barisnya diskip.
// ═════════════════════════════════════════════

const num = (v) => {
  const n = Number(typeof v === "string" ? v.replace("%", "").replace(",", ".") : v);
  return Number.isFinite(n) ? n : null;
};
const str = (v) => (typeof v === "string" && v.trim() ? v.trim() : (v && typeof v !== "object" ? String(v).trim() : ""));
const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } };

/** Cari array of object terbesar di root data (fallback generic). */
function findMainArray(data) {
  let best = null, bestLen = 0;
  if (!data || typeof data !== "object") return null;
  for (const [k, v] of Object.entries(data)) {
    if (Array.isArray(v) && v.length > bestLen && v.some((x) => x && typeof x === "object")) {
      best = { key: k, items: v };
      bestLen = v.length;
    }
  }
  return best;
}

const RATING = (r, rc) => {
  const parts = [];
  const rn = num(r);
  if (rn !== null) parts.push(`⭐ ${rn}`);
  const rcn = num(rc);
  if (rcn !== null) parts.push(`(${rcn.toLocaleString("id-ID")} ulasan)`);
  return parts.length ? parts.join(" ") : "";
};

// ─────────────────────────────────────────────
// 🔹 MAPS — tempat: alamat, rating, jam buka, telepon, situs
// ─────────────────────────────────────────────
export function renderPlaces(data, max = 4) {
  const items = data?.local_results || data?.places || data?.results || [];
  const list = items.filter(Boolean).slice(0, max);
  if (!list.length) return null;
  return list.map((p, i) => {
    const lines = [];
    const title = str(p.title || p.name);
    if (title) lines.push(`📍 ${i + 1}. ${title}`);
    const addr = str(p.address);
    if (addr) lines.push(`📌 Alamat: ${addr}`);
    const rt = RATING(p.rating, p.reviews);
    if (rt) lines.push(`⭐ Penilaian: ${rt}`);
    // jam buka: operating_hours {monday: {open,close}} / hours array / open_state
    const opH = p.operating_hours || p.hours;
    if (opH && typeof opH === "object") {
      const today = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "Asia/Jakarta" }).format(new Date()).toLowerCase();
      const dayMap = { monday: "Senin", tuesday: "Selasa", wednesday: "Rabu", thursday: "Kamis", friday: "Jumat", saturday: "Sabtu", sunday: "Minggu" };
      const todayH = opH[today];
      const todayStr = todayH ? (Array.isArray(todayH) ? todayH.map((h) => str(h)).join(", ") : `${str(todayH.open)}–${str(todayH.close)}`) : "";
      if (todayStr) lines.push(`🕒 Hari ini (${dayMap[today] || today}): ${todayStr}`);
    }
    if (p.open_state) lines.push(`🚪 Status: ${p.open_state}`);
    const phone = str(p.phone);
    if (phone) lines.push(`📞 ${phone}`);
    const site = str(p.website);
    if (site) lines.push(`🌐 ${site}`);
    const types = Array.isArray(p.types) ? p.types.filter(Boolean).slice(0, 3).join(", ") : "";
    if (types) lines.push(`🏷️ ${types}`);
    if (!lines.length) return null;
    return lines.join("\n");
  }).filter(Boolean).join("\n\n");
}

export function renderReviews(data, max = 5) {
  const items = data?.reviews || data?.user_reviews || [];
  const list = items.filter(Boolean).slice(0, max);
  if (!list.length) return null;
  return list.map((r, i) => {
    const who = str(r.user?.name || r.username || r.author || `Ulasan ${i + 1}`);
    const rt = num(r.rating);
    const when = str(r.date || r.relative_time || r.snippet_date);
    const text = str(r.snippet || r.comment || r.text || r.description);
    const stars = rt !== null ? "⭐".repeat(Math.max(1, Math.min(5, Math.round(rt)))) : "";
    return `${i + 1}. ${who}${stars ? ` ${stars}` : ""}${when ? ` (${when})` : ""}\n💬 ${text.slice(0, 250)}`;
  }).join("\n\n");
}

// ─────────────────────────────────────────────
// 🔹 DIRECTIONS — rute: durasi, jarak, langkah-langkah
// ─────────────────────────────────────────────
export function renderDirections(data) {
  const lines = [];
  // bentuk asli searchapi: data.directions[] + places_info[]
  const dirs = data?.directions || [];
  const d = dirs[0];
  if (d) {
    const modeMap = { driving: "🚗 Mobil", walking: "🚶 Jalan kaki", cycling: "🚲 Sepeda", transit: "🚌 Transit", flying: "✈️ Pesawat" };
    const mode = modeMap[String(d.travel_mode || "").toLowerCase()] || d.travel_mode || "Rute";
    lines.push(`🧭 Mode: ${mode}`);
    // durasi/jarak: pakai formatted bila ada, fallback hitung dari angka mentah
    const dur = str(d.formatted_duration) || (() => { const s = num(d.duration); return s !== null ? `${Math.round(s / 60)} mnt` : ""; })();
    const dist = str(d.formatted_distance) || (() => {
      const m = num(d.distance);
      if (m === null) return "";
      return m >= 1000 ? `${(m / 1000).toFixed(1).replace(".", ",")} km` : `${m} m`;
    })();
    if (dur) lines.push(`⏱️ Durasi: ${dur}`);
    if (dist) lines.push(`📏 Jarak: ${dist}`);
    const via = str(d.via);
    if (via) lines.push(`🛤️ Via: ${via}`);
    // langkah-langkah: instructions[0].details[].action
    const details = (d.instructions || []).flatMap((ins) => ins?.details || []);
    const stepTexts = details.map((x, i2) => {
      const action = str(x.action || x.instruction || x.text);
      if (!action) return null;
      const dd = str(x.formatted_duration);
      const ds = str(x.formatted_distance);
      return `${i2 + 1}. ${action}${(ds || dd) ? ` (${[ds, dd].filter(Boolean).join(", ")})` : ""}`;
    }).filter(Boolean).slice(0, 15);
    if (stepTexts.length) lines.push(`\n🗺️ *LANGKAH-LANGKAH:*\n${stepTexts.join("\n")}`);
    return lines.join("\n") || null;
  }
  // fallback bentuk lama: routes[]
  const routes = data?.routes || (data?.best_route ? [data.best_route] : []) || [];
  const route = routes[0] || null;
  if (!route) return null;
  const dur = str(route.duration_text || route.duration || route.travel_time);
  const dist = str(route.distance_text || route.distance);
  if (dur) lines.push(`⏱️ Durasi: ${dur}`);
  if (dist) lines.push(`📏 Jarak: ${dist}`);
  let steps = route.steps || route.legs?.[0]?.steps || [];
  if (!Array.isArray(steps)) steps = [];
  const stepTexts = steps.map((s) => {
    const ins = str(s.instruction || s.text || s.html_instructions || s.maneuver);
    if (!ins) return null;
    const clean = ins.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const sdTxt = str(s.duration_text);
    return `• ${clean}${sdTxt ? ` (${sdTxt})` : ""}`;
  }).filter(Boolean).slice(0, 15);
  if (stepTexts.length) lines.push(`\n🗺️ *LANGKAH-LANGKAH:*\n${stepTexts.join("\n")}`);
  return lines.join("\n") || null;
}

// ─────────────────────────────────────────────
// 🔹 FLIGHTS — tiket: harga, rute, durasi, airline
// ─────────────────────────────────────────────
export function renderFlights(data, max = 4) {
  const all = [...(data?.best_flights || []), ...(data?.other_flights || []), ...(data?.flights || [])];
  const list = all.filter(Boolean).slice(0, max);
  if (!list.length) return null;
  return list.map((f, i) => {
    const lines = [];
    const rawPrice = f.price ?? f.formatted_price;
    const priceN = num(rawPrice);
    const price = priceN !== null && String(rawPrice).replace(/\D/g, "").length >= 4
      ? `Rp ${priceN.toLocaleString("id-ID")}`
      : str(rawPrice);
    const dur = num(f.total_duration);
    const durTxt = f.total_duration_text || (dur !== null ? `${Math.floor(dur / 60)}j ${dur % 60}m` : "");
    const head = `${i + 1}. ${price ? `💰 *${price}*` : ""}${durTxt ? `${price ? " — " : ""}⏱️ ${durTxt}` : ""}`.trim();
    if (head) lines.push(head);
    const segs = f.flights || f.segments || [];
    segs.forEach((s, j) => {
      const dep = s?.departure_airport;
      const arr = s?.arrival_airport;
      const depT = str(dep?.time).replace(/\+\d+$/, "");
      const arrT = str(arr?.time).replace(/\+\d+$/, "");
      const airline = str(s?.airline);
      const flightNo = str(s?.flight_number);
      const legDur = num(s?.duration);
      const legDurTxt = legDur !== null ? `${Math.floor(legDur / 60)}j${legDur % 60 ? ` ${legDur % 60}m` : ""}` : "";
      lines.push(`${j > 0 ? "↳" : "✈️"} ${str(dep?.name || dep?.id)} (${depT}) → ${str(arr?.name || arr?.id)} (${arrT})` +
        `${airline ? ` — ${airline}${flightNo ? ` ${flightNo}` : ""}` : ""}${legDurTxt ? ` [${legDurTxt}]` : ""}`);
    });
    const layovers = f.layovers || [];
    if (layovers.length) {
      lines.push(`🔁 Transit: ${layovers.map((l) => str(l.name || l.id)).filter(Boolean).join(", ") || `${layovers.length}x transit`}`);
    } else {
      lines.push(segs.length > 1 ? `🔁 Transit: langsung` : `🔁 Langsung (nonstop)`);
    }
    if (f.type) lines.push(`🏷️ ${f.type}`);
    return lines.filter(Boolean).join("\n");
  }).filter(Boolean).join("\n\n");
}

// ─────────────────────────────────────────────
// 🔹 HOTELS — nama, harga, rating, lokasi
// ─────────────────────────────────────────────
export function renderHotels(data, max = 5) {
  const items = data?.hotels || data?.properties || data?.hotel_results || [];
  const list = items.filter(Boolean).slice(0, max);
  if (!list.length) return null;
  return list.map((h, i) => {
    const lines = [];
    const title = str(h.title || h.name);
    if (title) lines.push(`${i + 1}. 🏨 ${title}`);
    const price = str(h.price || h.rate_per_night || h.extracted_price);
    if (price) lines.push(`💰 ${price}`);
    const rt = RATING(h.rating, h.reviews || h.total_reviews);
    if (rt) lines.push(`⭐ ${rt}`);
    const deal = str(h.deal || h.deal_description);
    if (deal) lines.push(`🏷️ ${deal}`);
    const loc = str(h.location || h.address || h.neighborhood);
    if (loc) lines.push(`📌 ${loc}`);
    const cls = str(h.hotel_class || h.stars);
    if (cls) lines.push(`✨ Bintang: ${cls}`);
    return lines.length > 1 ? lines.join("\n") : null;
  }).filter(Boolean).join("\n\n");
}

// ─────────────────────────────────────────────
// 🔹 SHOPPING — produk: nama, harga, toko, rating
// ─────────────────────────────────────────────
export function renderShopping(data, max = 6) {
  const items = data?.shopping_results || data?.products || data?.organic_results || data?.product_results || [];
  const list = items.filter(Boolean).slice(0, max);
  if (!list.length) return null;
  return list.map((s, i) => {
    const lines = [];
    const title = str(s.title || s.name || s.product_name);
    if (title) lines.push(`${i + 1}. 🛍️ ${title.slice(0, 80)}`);
    const price = str(s.price || s.extracted_price || s.offer_price);
    if (price) lines.push(`💰 ${price}`);
    const rt = RATING(s.rating, s.reviews);
    if (rt) lines.push(`⭐ ${rt}`);
    const src = str(s.source || s.seller || s.store || s.merchant);
    if (src) lines.push(`🏬 ${src}`);
    const ship = str(s.delivery || s.shipping);
    if (ship) lines.push(`🚚 ${ship}`);
    return lines.length > 1 ? lines.join("\n") : null;
  }).filter(Boolean).join("\n\n");
}

// ─────────────────────────────────────────────
// 🔹 NEWS — judul, sumber, tanggal, ringkasan
// ─────────────────────────────────────────────
export function renderNews(data, max = 5) {
  const items = data?.news_results || data?.news || [];
  const list = items.filter(Boolean).slice(0, max);
  if (!list.length) return null;
  return list.map((n, i) => {
    const title = str(n.title);
    if (!title) return null;
    const src = str(n.source || n.source_url);
    const when = str(n.date || n.published_date);
    const snippet = str(n.snippet || n.description);
    const link = str(n.link);
    return `${i + 1}. 📰 *${title}*\n${[src ? `📺 ${src}` : "", when ? `🕒 ${when}` : ""].filter(Boolean).join(" | ")}` +
      (snippet ? `\n💬 ${snippet.slice(0, 200)}` : "") + (link ? `\n🔗 ${link}` : "");
  }).filter(Boolean).join("\n\n");
}

// ─────────────────────────────────────────────
// 🔹 JOBS — lowongan: posisi, perusahaan, lokasi
// ─────────────────────────────────────────────
export function renderJobs(data, max = 6) {
  const items = data?.jobs || data?.job_results || [];
  const list = items.filter(Boolean).slice(0, max);
  if (!list.length) return null;
  return list.map((j, i) => {
    const title = str(j.title || j.job_title);
    if (!title) return null;
    const lines = [`${i + 1}. 💼 *${title}*`];
    const co = str(j.company_name || j.company);
    if (co) lines.push(`🏢 ${co}`);
    const loc = str(j.location);
    if (loc) lines.push(`📍 ${loc}`);
    const via = str(j.via || j.source);
    if (via) lines.push(`🔗 Via: ${via}`);
    const ext = j.detected_extensions || {};
    const posted = str(ext.posted_at || j.posted_at);
    const schedule = str(ext.schedule || j.schedule);
    const salary = str(ext.salary || j.salary);
    const bits = [posted, schedule, salary].filter(Boolean);
    if (bits.length) lines.push(`🏷️ ${bits.join(" — ")}`);
    const desc = str(j.description);
    if (desc) lines.push(`💬 ${desc.replace(/\n+/g, " ").slice(0, 150)}`);
    const link = str(j.link || j.job_id);
    if (link) lines.push(`🔗 ${link}`);
    return lines.join("\n");
  }).filter(Boolean).join("\n\n");
}

// ─────────────────────────────────────────────
// 🔹 EVENTS — acara: nama, tanggal, tempat
// ─────────────────────────────────────────────
export function renderEvents(data, max = 5) {
  const items = data?.events || data?.event_results || data?.items || [];
  const list = items.filter(Boolean).slice(0, max);
  if (!list.length) return null;
  return list.map((e, i) => {
    const title = str(e.title || e.name);
    if (!title) return null;
    const lines = [`${i + 1}. 🎉 *${title}*`];
    const when = str(e.date || e.start_date || e.when);
    if (when) lines.push(`🕒 ${when}`);
    const addr = e.address || e.venue || e.location;
    const addrStr = typeof addr === "object" ? [addr.name, addr.address].filter(Boolean).join(", ") : str(addr);
    if (addrStr) lines.push(`📌 ${addrStr}`);
    const desc = str(e.description || e.summary);
    if (desc) lines.push(`💬 ${desc.replace(/\n+/g, " ").slice(0, 150)}`);
    const price = str(e.price || e.ticket_price);
    if (price) lines.push(`💰 ${price}`);
    return lines.join("\n");
  }).filter(Boolean).join("\n\n");
}

// ─────────────────────────────────────────────
// 🔹 IMAGES — judul + link (plain text list)
// ─────────────────────────────────────────────
export function renderImages(data, max = 6) {
  const items = data?.images_results || data?.images || [];
  const list = items.filter(Boolean).slice(0, max);
  if (!list.length) return null;
  return list.map((im, i) => {
    const title = str(im.title);
    const orig = str(im.original || (Array.isArray(im.link) ? im.link[0] : im.link) || im.thumbnail);
    return `${i + 1}. ${title ? `🖼️ ${title.slice(0, 60)}\n` : "🖼️ "}🔗 ${orig}`;
  }).join("\n");
}

// ─────────────────────────────────────────────
// 🔹 VIDEOS (yt search) — judul, channel, durasi, link
// ─────────────────────────────────────────────
export function renderVideos(data, max = 6) {
  const items = data?.video_results || data?.videos || data?.channel_videos || data?.organic_results || [];
  const list = items.filter(Boolean).slice(0, max);
  if (!list.length) return null;
  return list.map((v, i) => {
    const title = str(v.title);
    if (!title) return null;
    const lines = [`${i + 1}. 🎬 *${title.slice(0, 70)}*`];
    const ch = str(v.channel || v.publisher || v.author);
    if (ch) lines.push(`📺 ${ch}`);
    const pub = str(v.published_date || v.published);
    const views = str(v.views || v.view_count);
    const dur = str(v.length || v.duration);
    const bits = [dur, views, pub].filter(Boolean);
    if (bits.length) lines.push(`🏷️ ${bits.join(" — ")}`);
    const sn = str(v.snippet || v.description);
    if (sn) lines.push(`💬 ${sn.replace(/\n+/g, " ").slice(0, 120)}`);
    const link = str(v.link || v.url);
    if (link) lines.push(`🔗 ${link}`);
    return lines.join("\n");
  }).filter(Boolean).join("\n\n");
}

// ─────────────────────────────────────────────
// 🔹 YOUTUBE TRANSCRIPT — transkrip jadi teks utuh
// ─────────────────────────────────────────────
export function renderTranscript(data, maxChars = 3500) {
  const t = data?.transcript || data?.transcripts || [];
  const list = Array.isArray(t) ? t.filter(Boolean) : [];
  if (!list.length) return null;
  return list.map((x) => str(typeof x === "string" ? x : x.text || x.snippet)).filter(Boolean)
    .join(" ").replace(/\s+/g, " ").slice(0, maxChars);
}

// ─────────────────────────────────────────────
// 🔹 SCHOLAR — paper: judul, penulis, sitasi
// ─────────────────────────────────────────────
export function renderScholar(data, max = 5) {
  const items = data?.organic_results || data?.papers || [];
  const list = items.filter(Boolean).slice(0, max);
  if (!list.length) return null;
  return list.map((p, i) => {
    const title = str(p.title);
    if (!title) return null;
    const lines = [`${i + 1}. 📄 *${title.slice(0, 90)}*`];
    const pub = p.publication_info || {};
    const authors = str(pub.authors ? pub.authors.map((a) => str(a.name)).filter(Boolean).join(", ") : p.authors);
    if (authors) lines.push(`✍️ ${authors}`);
    const src = str(pub.summary || p.publication || p.venue);
    if (src) lines.push(`📚 ${src.replace(/\s+/g, " ").slice(0, 120)}`);
    const cited = str(p.cited_by?.value ?? p.cited_by ?? p.inline_links?.cited_by?.total);
    if (cited) lines.push(`🔖 Disitasi: ${cited}x`);
    const sn = str(p.snippet);
    if (sn) lines.push(`💬 ${sn.slice(0, 180)}`);
    const link = str(p.link);
    if (link) lines.push(`🔗 ${link}`);
    return lines.join("\n");
  }).filter(Boolean).join("\n\n");
}

// ─────────────────────────────────────────────
// 🔹 BOOKS — judul, penulis, tahun, harga
// ─────────────────────────────────────────────
export function renderBooks(data, max = 5) {
  const items = data?.book_results || data?.books || data?.organic_results || [];
  const list = items.filter(Boolean).slice(0, max);
  if (!list.length) return null;
  return list.map((b, i) => {
    const vol = b.volume_info || b;
    const title = str(vol.title || b.title);
    if (!title) return null;
    const lines = [`${i + 1}. 📕 *${title.slice(0, 80)}*`];
    const authors = Array.isArray(vol.authors) ? vol.authors.join(", ") : str(vol.author || b.author);
    if (authors) lines.push(`✍️ ${authors}`);
    const year = str(vol.published_date || b.published_date || vol.publishedYear || b.year);
    if (year) lines.push(`📅 ${year}`);
    const pages = str(vol.page_count || b.page_count);
    if (pages) lines.push(`📄 ${pages} halaman`);
    const rt = RATING(vol.rating ?? b.rating, vol.ratings_count ?? b.reviews);
    if (rt) lines.push(`⭐ ${rt}`);
    const sn = str(vol.description || b.snippet || b.description);
    if (sn) lines.push(`💬 ${sn.replace(/\s+/g, " ").slice(0, 150)}`);
    const price = str(b.price || vol.price);
    if (price) lines.push(`💰 ${price}`);
    return lines.join("\n");
  }).filter(Boolean).join("\n\n");
}

// ─────────────────────────────────────────────
// 🔹 PATENTS — paten: judul, nomor, pemilik
// ─────────────────────────────────────────────
export function renderPatents(data, max = 4) {
  const items = data?.organic_results || data?.patents || [];
  const list = items.filter(Boolean).slice(0, max);
  if (!list.length) return null;
  return list.map((p, i) => {
    const title = str(p.title);
    if (!title) return null;
    const lines = [`${i + 1}. 🧪 *${title.slice(0, 90)}*`];
    const assignee = str(p.assignee || p.filing?.assignee);
    if (assignee) lines.push(`🏢 Pemilik: ${assignee}`);
    const no = str(p.patent_id || p.number || p.filing?.patent_id);
    if (no) lines.push(`🔖 No: ${no}`);
    const date = str(p.filing?.date || p.publication_date);
    if (date) lines.push(`📅 ${date}`);
    const sn = str(p.snippet || p.abstract);
    if (sn) lines.push(`💬 ${sn.replace(/\s+/g, " ").slice(0, 160)}`);
    return lines.join("\n");
  }).filter(Boolean).join("\n\n");
}

// ─────────────────────────────────────────────
// 🔹 FINANCE — saham: harga, perubahan, info
// ─────────────────────────────────────────────
export function renderFinance(data) {
  const s = data?.stock || data?.quote || data;
  const lines = [];
  const title = str(s.title || s.name || s.ticker);
  if (title) lines.push(`📈 ${title}`);
  const price = str(s.price || s.regular_market_price);
  if (price) lines.push(`💰 Harga: ${price}`);
  const chg = s.regular_market_change_percent ?? s.change_percent ?? s.percentage;
  const chgN = num(chg);
  if (chgN !== null) lines.push(`${chgN >= 0 ? "🟢" : "🔴"} Perubahan: ${chgN > 0 ? "+" : ""}${chgN}%`);
  const prev = str(s.previous_close || s.regular_market_previous_close);
  if (prev) lines.push(`↩️ Tutup sebelumnya: ${prev}`);
  const cap = str(s.market_cap || s.market_capitalization);
  if (cap) lines.push(`🏦 Kapitalisasi: ${cap}`);
  const exch = str(s.exchange);
  if (exch) lines.push(`🏬 Bursa: ${exch}`);
  const about = str(s.about || s.description || s.summary);
  if (about) lines.push(`💬 ${about.replace(/\s+/g, " ").slice(0, 300)}`);
  return lines.length > 1 ? lines.join("\n") : null;
}

// ─────────────────────────────────────────────
// 🔹 GENERIC ORGANIC (google/bing/ddg/reddit/dll) — judul + snippet + link
// ─────────────────────────────────────────────
export function renderOrganic(data, max = 6) {
  const lines = [];
  const ab = data?.answer_box || data?.answers || data?.answer;
  const abText = str(ab?.answer || ab?.snippet || ab?.result || ab);
  if (abText) lines.push(`💡 *JAWABAN LANGSUNG:*\n${abText.slice(0, 400)}`);
  const items = data?.organic_results || data?.results || [];
  const list = items.filter(Boolean).slice(0, max);
  if (list.length) {
    lines.push("\n🔍 *HASIL:*\n" + list.map((r, i) => {
      const title = str(r.title || r.name || r.full_name);
      const sn = str(r.snippet || r.description || r.body);
      const link = str(r.link || r.url);
      const when = str(r.date);
      return [title && `${i + 1}. ${title}`, sn && `💬 ${sn.slice(0, 150)}`, when && `🕒 ${when}`, link && `🔗 ${link}`].filter(Boolean).join("\n");
    }).filter(Boolean).join("\n"));
  }
  return lines.length ? lines.join("\n") : null;
}

// ─────────────────────────────────────────────
// 🔹 ULTIMATE FALLBACK — apapun bentuknya jadi teks
// ─────────────────────────────────────────────
export function renderGeneric(data, max = 6) {
  // 1. coba scalar penting di root
  const rootLines = [];
  for (const k of ["title", "answer", "snippet", "description", "summary", "text", "message"]) {
    const v = str(data?.[k]);
    if (v) rootLines.push(`${k === "title" ? "📌" : "💬"} ${v.slice(0, 300)}`);
  }
  // 2. array of object terbesar
  const main = findMainArray(data);
  if (main) {
    const items = main.items.filter(Boolean).slice(0, max);
    const itemLines = items.map((it, i) => {
      const parts = [];
      const title = str(it.title || it.name || it.full_name || it.question || it.text);
      if (title) parts.push(`${i + 1}. ${title.slice(0, 90)}`);
      for (const f of ["price", "rating", "address", "location", "date", "duration", "value", "answer", "snippet", "description"]) {
        const v = it[f];
        if (v === undefined || v === null || v === "") continue;
        if (typeof v === "object") continue;
        parts.push(`   ${f}: ${String(v).slice(0, 120)}`);
      }
      const link = str(it.link || it.url || it.original);
      if (link) parts.push(`   🔗 ${link}`);
      return parts.length ? parts.join("\n") : null;
    }).filter(Boolean);
    if (rootLines.length || itemLines.length) {
      return [...rootLines, ...(itemLines.length ? ["\n" + itemLines.join("\n")] : [])].join("\n");
    }
  }
  return rootLines.length ? rootLines.join("\n") : null;
}

// ─────────────────────────────────────────────
// 🔹 REGISTRY ENGINE — pemetaan command → engine + renderer
// ─────────────────────────────────────────────
export const SAPI_ENGINES = {
  // search utama
  "google": { engine: "google", render: renderOrganic, desc: "Google Search", usage: ".sapi google <query>" },
  "google_light": { engine: "google_light", render: renderOrganic, desc: "Google Search (cepat)", usage: ".sapi google_light <query>" },
  "bing": { engine: "bing", render: renderOrganic, desc: "Bing Search", usage: ".sapi bing <query>" },
  "duckduckgo": { engine: "duckduckgo", render: renderOrganic, desc: "DuckDuckGo", usage: ".sapi duckduckgo <query>" },
  "yahoo": { engine: "yahoo_search", render: renderOrganic, desc: "Yahoo Search", usage: ".sapi yahoo <query>" },
  "baidu": { engine: "baidu", render: renderOrganic, desc: "Baidu", usage: ".sapi baidu <query>" },
  "naver": { engine: "naver", render: renderOrganic, desc: "Naver (Korea)", usage: ".sapi naver <query>" },
  "yandex": { engine: "yandex", render: renderOrganic, desc: "Yandex", usage: ".sapi yandex <query>" },
  // maps
  "google_maps": { engine: "google_maps", render: renderPlaces, desc: "Tempat sekitar (alamat, jam, rating)", usage: ".gmaps <tempat>" },
  "google_maps_reviews": { engine: "google_maps_reviews", render: renderReviews, desc: "Ulasan tempat", usage: ".gmapsreviews <tempat>" },
  "apple_maps": { engine: "apple_maps_places", render: renderPlaces, desc: "Apple Maps", usage: ".sapi apple_maps <tempat>" },
  // belanja
  "google_shopping": { engine: "google_shopping", render: renderShopping, desc: "Google Shopping", usage: ".gshopping <produk>" },
  "amazon": { engine: "amazon_search", render: renderShopping, desc: "Amazon", usage: ".amz <produk>" },
  "ebay": { engine: "ebay_search", render: renderShopping, desc: "eBay", usage: ".ebay <produk>" },
  "walmart": { engine: "walmart_search", render: renderShopping, desc: "Walmart", usage: ".walmart <produk>" },
  "bestbuy": { engine: "bestbuy_search", render: renderShopping, desc: "BestBuy", usage: ".bestbuy <produk>" },
  "shein": { engine: "shein_search", render: renderShopping, desc: "Shein", usage: ".shein <produk>" },
  // berita & info
  "google_news": { engine: "google_news", render: renderNews, desc: "Google News", usage: ".gnews <topik>" },
  "google_jobs": { engine: "google_jobs", render: renderJobs, desc: "Lowongan kerja", usage: ".gjobs <posisi>" },
  "google_events": { engine: "google_events", render: renderEvents, desc: "Acara/event", usage: ".gevents <kota/acara>" },
  "google_images": { engine: "google_images", render: renderImages, desc: "Gambar (link plain)", usage: ".gimages <query>" },
  // media & sosial
  "youtube": { engine: "youtube", render: renderVideos, desc: "YouTube search", usage: ".sapi youtube <query>" },
  "reddit": { engine: "reddit", render: renderOrganic, desc: "Reddit search", usage: ".sapireddit <query>" },
  "tiktok": { engine: "tiktok_search", render: renderVideos, desc: "TikTok search", usage: ".sapi tiktok <query>" },
  // riset
  "google_scholar": { engine: "google_scholar", render: renderScholar, desc: "Jurnal ilmiah", usage: ".scholar <topik>" },
  "google_books": { engine: "google_books", render: renderBooks, desc: "Buku", usage: ".gbooks <judul>" },
  "google_patents": { engine: "google_patents", render: renderPatents, desc: "Paten", usage: ".gpatents <teknologi>" },
  "google_finance": { engine: "google_finance", render: renderFinance, desc: "Saham/keuangan", usage: ".gfinance <ticker/nama>" },
  // travel
  "google_flights": { engine: "google_flights", render: renderFlights, desc: "Tiket pesawat", usage: ".gtiket CGK | DPS | 20-09-2026" },
  "google_hotels": { engine: "google_hotels", render: renderHotels, desc: "Hotel", usage: ".ghotels <kota>" },
  "booking": { engine: "booking", render: renderHotels, desc: "Booking.com", usage: ".sapi booking <kota>" },
  "airbnb": { engine: "airbnb", render: renderHotels, desc: "Airbnb", usage: ".sapi airbnb <kota>" },
  "zillow": { engine: "zillow", render: renderGeneric, desc: "Properti AS", usage: ".sapi zillow <lokasi>" },
  "tripadvisor": { engine: "tripadvisor", render: renderReviews, desc: "Tripadvisor", usage: ".sapi tripadvisor <tempat>" },
  "google_travel": { engine: "google_travel_explore", render: renderGeneric, desc: "Explore destinasi", usage: ".sapi google_travel <destinasi>" },
  // app store
  "google_play": { engine: "google_play_store", render: renderOrganic, desc: "Play Store", usage: ".sapi google_play <app>" },
  "apple_appstore": { engine: "apple_app_store", render: renderOrganic, desc: "App Store iOS", usage: ".sapi apple_appstore <app>" },
  // lain-lain
  "google_trends": { engine: "google_trends", render: renderGeneric, desc: "Trending Google", usage: ".sapi google_trends <topik>" },
  "google_autocomplete": { engine: "google_autocomplete", render: renderGeneric, desc: "Saran pencarian", usage: ".sapi google_autocomplete <awalan>" },
  "github": { engine: "github_search", render: renderOrganic, desc: "GitHub repo", usage: ".sapi github <repo>" },
  "google_local": { engine: "google_local", render: renderPlaces, desc: "Bisnis lokal", usage: ".sapi google_local <usaha>" },
  "facebook_page": { engine: "facebook_page", render: renderGeneric, desc: "Info halaman Facebook", usage: ".sapi facebook_page <nama>" },
  "instagram_profile": { engine: "instagram_profile", render: renderGeneric, desc: "Profil Instagram", usage: ".sapi instagram_profile <username>" },
};

/**
 * Ambil konfigurasi engine dari registry (fallback: engine gak terdaftar → generic).
 */
export function getEngineSpec(engineKey) {
  const spec = SAPI_ENGINES[String(engineKey || "").toLowerCase()];
  if (spec) return spec;
  // engine gak terdaftar → coba nama engine searchapi langsung, render generic
  return { engine: engineKey, render: renderGeneric, desc: engineKey, usage: `.sapi ${engineKey} <query>` };
}

/**
 * Pesan error standar suite sapi (dipakai semua plugin).
 */
export function sapiErrorMessage(error) {
  const map = {
    API_KEY: "⚠️ API key searchapi.io belum di-set — owner isi dulu di apikeys.json (slot searchapi).",
    ENGINE_KOSONG: "⚠️ Nama engine kosong. Ketik *.sapi list* buat daftar engine.",
  };
  if (map[error]) return map[error];
  if (String(error).startsWith("QUOTA_HABIS")) return "⚠️ Kuota searchapi.io habis (free trial ±100 req/bulan) — upgrade di searchapi.io.";
  if (String(error).startsWith("API_KEY_INVALID")) return "⚠️ Key searchapi.io ditolak/expired — cek key di dashboard searchapi.io.";
  return `⚠️ Gagal: ${error}`;
}
