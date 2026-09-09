// Mock axios ala situasi live 9 Sep 2026: IMDbOT MATI (SERVER_FAILURE_25) →
// semua request IMDbOT throw; Cinemeta (katalog/search/meta) hidup pakai
// fixture dari globalThis. Download poster → buffer palsu.
const FAKE_JPG = Buffer.from("/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNCwsLDBkSDAwKDBcPFRYV0hIKSkrtLS4uUFCMjJCXgAA/9k=");

const defaultExport = {
  async get(url, opts = {}) {
    const u = String(url);
    // IMDbOT down (kondisi live saat build)
    if (u.includes("imdb.iamidiotareyoutoo.com")) {
      if (globalThis.__IMDBOT_UP__) return { data: globalThis.__IMDBOT_RESPONSE__ || { results: [] } };
      throw new Error("Request failed with status code 500 SERVER_FAILURE_25");
    }
    if (u.includes("v3-cinemeta.strem.io")) {
      if (globalThis.__CINEMETA_DOWN__) throw new Error("cinemeta down");
      const fx = globalThis.__CINEMETA__ || {};
      for (const [key, val] of Object.entries(fx)) {
        if (u.includes(key)) return { data: val };
      }
      throw new Error(`cinemeta mock: unhandled ${u}`);
    }
    // download poster (arraybuffer)
    if (opts.responseType === "arraybuffer" || /\.(jpg|jpeg|png)$/i.test(u)) {
      if (globalThis.__IMG_DOWN__) throw new Error("img down");
      return { data: FAKE_JPG };
    }
    throw new Error(`axios.get mock: unhandled ${u}`);
  },
  async post() { throw new Error("axios.post mock: unhandled"); },
};
export default defaultExport;
