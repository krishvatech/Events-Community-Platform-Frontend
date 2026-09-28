// Test stand-in for services/blogApi.js: delegates to the fake installed by
// the current test via setBlogApi().
const blogApi = new Proxy(
  {},
  {
    get(_target, name) {
      const api = globalThis.__blogTestApi;
      if (!api || !(name in api)) {
        throw new Error(`fake blogApi.${String(name)} is not configured`);
      }
      return api[name];
    },
  }
);

export default blogApi;
