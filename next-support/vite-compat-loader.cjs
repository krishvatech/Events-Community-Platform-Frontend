// next-support/vite-compat-loader.cjs
// TEMPORARY Next.js (webpack) build adapter for Vite-only syntax in shared source,
// so the same files build under both Vite and Next.js without edits:
//  1. `import.meta?.env` -> `import.meta.env`. webpack does not treat optional
//     chaining on import.meta as property access, so next.config's DefinePlugin
//     mapping would be skipped and values would silently fall back
//     (e.g. CommunityProfileCard / LiveFeedPage API base URL).
//  2. `import.meta.glob(pattern, { eager: true, import: "default" })` (used by
//     EventLandingPage_Marketing for optional partner logos) -> webpack's
//     import.meta.webpackContext equivalent.
// Remove when Vite is removed and shared code reads src/lib/env.js.

const GLOB_CALL =
  /import\.meta\.glob\(\s*(["'])([^"']+)\1\s*,\s*\{\s*eager\s*:\s*true\s*,\s*import\s*:\s*(["'])default\3\s*,?\s*\}\s*\)/g;

const escapeRegExp = (value) => value.replace(/[.+^${}()|[\]\\]/g, "\\$&");

// "*.{png,jpg}" -> /^\.\/[^/]*\.(png|jpg)$/
function fileGlobToRegExp(fileGlob) {
  let out = "";
  for (let i = 0; i < fileGlob.length; i++) {
    const ch = fileGlob[i];
    if (ch === "*") out += "[^/]*";
    else if (ch === "{") {
      const close = fileGlob.indexOf("}", i);
      out += `(${fileGlob.slice(i + 1, close).split(",").map(escapeRegExp).join("|")})`;
      i = close;
    } else out += escapeRegExp(ch);
  }
  return `/^\\.\\/${out}$/`;
}

module.exports = function viteCompatLoader(input) {
  const source = input.replace(/import\.meta\?\.env\b/g, "import.meta.env");
  const GLOB_USE = /import\.meta\.glob\s*\(/;
  if (!GLOB_USE.test(source)) return source;

  const transformed = source.replace(GLOB_CALL, (_match, _q, pattern) => {
    const slash = pattern.lastIndexOf("/");
    const dir = pattern.slice(0, slash);
    const fileGlob = pattern.slice(slash + 1);
    if (!dir || fileGlob.includes("**")) {
      throw new Error(`vite-compat-loader: unsupported glob "${pattern}" in ${this.resourcePath}`);
    }
    return `(() => {
      const ctx = import.meta.webpackContext(${JSON.stringify(dir)}, { recursive: false, regExp: ${fileGlobToRegExp(fileGlob)} });
      const out = {};
      for (const key of ctx.keys()) {
        const mod = ctx(key);
        out[${JSON.stringify(dir)} + key.slice(1)] = mod && mod.default !== undefined ? mod.default : mod;
      }
      return out;
    })()`;
  });

  if (GLOB_USE.test(transformed)) {
    throw new Error(`vite-compat-loader: unsupported import.meta.glob form in ${this.resourcePath}`);
  }
  return transformed;
};
