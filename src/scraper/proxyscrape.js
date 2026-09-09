// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// src/scraper/proxyscrape.js — ProxyScrape v4 free-proxy-list
// (port dari script owner 9 Sep 2026). Fetch daftar proxy gratis
// (http/socks4/socks5) + filter negara/protokol, cache 5 menit.

const BASE = "https://api.proxyscrape.com/v4/free-proxy-list/get";
const LIMIT = 500;
const CACHE_MS = 5 * 60 * 1000;

// daftar negara verbatim dari script owner (semua region)
const COUNTRIES = "af,al,dz,ad,ao,ar,am,au,at,az,bd,by,be,bj,bm,bt,bo,bw,bg,bf,bi,kh,cm,ca,td,cl,cn,co,cg,cr,hr,cy,cz,dk,do,ec,eg,sv,gq,ee,sz,et,fj,fi,fr,gm,ge,de,gh,gi,gr,gu,gt,gn,ht,hn,hk,hu,in,id,ir,iq,ie,il,it,jm,jp,jo,kz,ke,kr,kg,lv,lb,ls,lt,mg,mw,my,mv,ml,mt,mu,mx,md,mn,me,ma,mz,mm,na,np,nl,nz,ni,ng,mk,no,pk,ps,pa,py,pe,ph,pl,pt,pr,qa,ro,rw,kn,sa,sn,rs,sc,sl,sg,sk,si,so,za,es,lk,sd,se,ch,sy,tw,tj,tz,th,tl,tg,tn,tr,ug,ua,ae,gb,us,uy,uz,ve,vn,vi,ye,zw";

const cache = { key: null, at: 0, proxies: [] };

export function parseProxy(p) {
  if (typeof p === "string") return { addr: p, protocol: p.split("://")[0] || "?", country: "?", anonymity: "?", alive: true, uptime: 0 };
  return {
    addr: p.proxy || (p.ip && p.port ? `${p.protocol ? p.protocol + "://" : ""}${p.ip}:${p.port}` : null),
    protocol: p.protocol || "?",
    country: p.ip_data?.country_code || p.ip_data?.country || "?",
    city: p.ip_data?.city || "",
    anonymity: p.anonymity || "?",
    alive: p.alive !== false,
    uptime: p.uptime || 0,
    timeout: p.average_timeout || 0,
    ssl: !!p.ssl,
  };
}

export async function fetchProxies({ protocol = "http,socks4,socks5", country = "" } = {}) {
  const key = `${protocol}|${country}`;
  if (cache.key === key && Date.now() - cache.at < CACHE_MS) return cache.proxies;

  const params = new URLSearchParams({
    request: "get_proxies",
    proxy_format: "protocolipport",
    format: "json",
    limit: LIMIT,
    skip: 0,
    protocol,
    anonymity: "elite,anonymous,transparent",
    country: country || COUNTRIES,
    timeout: 597,
  });

  const res = await fetch(`${BASE}?${params}`, {
    headers: { "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const raw = Array.isArray(data) ? data : data.proxies || data.data || [];
  const proxies = raw.map(parseProxy).filter((p) => p.addr);
  cache.key = key; cache.at = Date.now(); cache.proxies = proxies;
  return proxies;
}

// proxy hidup, diacak, diambil N
export function pickAlive(proxies, n = 10) {
  const alive = proxies.filter((p) => p.alive);
  const pool = alive.length ? alive : proxies;
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.max(1, Math.min(n, pool.length)));
}

export { LIMIT, COUNTRIES };
