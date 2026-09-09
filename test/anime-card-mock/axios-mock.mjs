// Mock axios: AniList GraphQL → fixture dari globalThis.__ANIME_FIXTURE__ (throw kalau
// __ANILIST_DOWN__), download gambar → buffer palsu. Lainnya → reject pelan.
const FAKE_JPG = Buffer.from("/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNCwsLDBkSDAwKDBcPFRYV0hIKSkrtLS4uUFCMjJCXv+Hh4v/wAALCAABAAEBAREA/8QAFAABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmXAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/9k=");

const defaultExport = {
  async post(url, body) {
    if (String(url).includes("graphql.anilist.co")) {
      if (globalThis.__ANILIST_DOWN__) throw new Error("Request failed with status code 403");
      const fixture = globalThis.__ANIME_FIXTURE__ || [];
      return { data: { data: { Page: { media: fixture } } } };
    }
    throw new Error(`axios.post mock: unhandled ${url}`);
  },
  async get(url, opts = {}) {
    // download gambar cover/banner/trailer (responseType arraybuffer)
    if ((opts.responseType === "arraybuffer") || /\.(jpg|jpeg|png)$/i.test(String(url))) {
      if (globalThis.__IMG_DOWN__) throw new Error("img down");
      return { data: FAKE_JPG };
    }
    throw new Error(`axios.get mock: unhandled ${url}`);
  },
};
defaultExport.__ANIME_MOCK = true;
export default defaultExport;
