import assert from "node:assert/strict";
import test from "node:test";

import {
  blogToForm,
  buildBlogPayload,
  emptyBlogForm,
  isBlogFormDirty,
  saveBlog,
  saveThenPublish,
  validateBlogForm,
  validateImageFile,
} from "../../utils/blogEditor.js";

const BLOG = {
  id: 9,
  title: "Existing",
  slug: "existing",
  excerpt: "Ex",
  content_html: "<p>Body</p>",
  author: { id: 3, full_name: "Ada", avatar_url: "" },
  categories: [{ id: 1, name: "Research", slug: "research" }],
  tags: [{ id: 2, name: "Europe", slug: "europe" }],
  seo_title: "S",
  seo_description: "D",
  canonical_url: "https://x.test/a",
  status: "published",
  published_at: "2026-01-01T00:00:00Z",
};

function fakeService(overrides = {}) {
  const calls = [];
  const record = (name, result) => async (...args) => {
    calls.push([name, ...args]);
    if (result instanceof Error) throw result;
    return typeof result === "function" ? result(...args) : result;
  };
  return {
    calls,
    service: {
      createBlog: record("create", overrides.create ?? ((payload) => ({ id: 11, ...payload }))),
      updateBlog: record("update", overrides.update ?? ((id, payload) => ({ id, ...payload }))),
      uploadBlogFeaturedImage: record("upload", overrides.upload ?? ((id) => ({ id, featured_image: "https://cdn/x.png" }))),
      clearBlogFeaturedImage: record("clear", overrides.clear ?? ((id) => ({ id, featured_image: null }))),
    },
  };
}

test("existing values map into the form", () => {
  const form = blogToForm(BLOG);
  assert.equal(form.title, "Existing");
  assert.equal(form.slug, "existing");
  assert.deepEqual(form.author, { id: 3, full_name: "Ada" });
  assert.deepEqual(form.category_ids, [1]);
  assert.deepEqual(form.tag_ids, [2]);
  assert.equal(form.canonical_url, "https://x.test/a");
});

test("title is required and slug/canonical are validated", () => {
  const form = { ...emptyBlogForm(), title: "   ", slug: "bad slug!", canonical_url: "javascript:alert(1)" };
  const errors = validateBlogForm(form);
  assert.ok(errors.title);
  assert.ok(errors.slug);
  assert.ok(errors.canonical_url);
  assert.deepEqual(validateBlogForm({ ...emptyBlogForm(), title: "Ok" }), {});
  assert.ok(validateBlogForm({ ...emptyBlogForm(), title: "Ok", slug: "admin" }).slug);
  assert.ok(validateBlogForm({ ...blogToForm(BLOG), slug: "" }, { isEdit: true }).slug);
});

test("create payload omits a blank slug so the backend generates it", () => {
  const payload = buildBlogPayload({ ...emptyBlogForm(), title: "  T  " });
  assert.equal(payload.title, "T");
  assert.equal("slug" in payload, false);
});

test("an explicit slug is sent trimmed, exactly as intended", () => {
  assert.equal(buildBlogPayload({ ...emptyBlogForm(), title: "T", slug: "  My-Slug " }).slug, "My-Slug");
});

test("payload carries content_html, author, taxonomy and SEO but never status fields", () => {
  const payload = buildBlogPayload(blogToForm(BLOG), { isEdit: true });
  assert.equal(payload.content_html, "<p>Body</p>");
  assert.equal(payload.author_id, 3);
  assert.deepEqual(payload.category_ids, [1]);
  assert.deepEqual(payload.tag_ids, [2]);
  assert.equal(payload.seo_title, "S");
  assert.equal(payload.seo_description, "D");
  assert.equal(payload.canonical_url, "https://x.test/a");
  for (const forbidden of ["status", "published_at", "created_by", "updated_by", "wp_post_id", "featured_image"]) {
    assert.equal(forbidden in payload, false, `${forbidden} must not be sent`);
  }
  assert.equal(buildBlogPayload({ ...emptyBlogForm(), title: "T" }).author_id, null);
});

test("title edits never regenerate the slug client-side", () => {
  const form = { ...blogToForm(BLOG), title: "A totally new title" };
  assert.equal(buildBlogPayload(form, { isEdit: true }).slug, "existing");
});

test("image validation enforces type and the 10 MB limit", () => {
  assert.equal(validateImageFile(null), "");
  assert.equal(validateImageFile({ type: "image/png", size: 1000 }), "");
  assert.match(validateImageFile({ type: "application/pdf", size: 10 }), /image file/);
  assert.match(validateImageFile({ type: "image/jpeg", size: 10 * 1024 * 1024 + 1 }), /10 MB/);
});

test("create saves JSON then uploads the image as a separate step", async () => {
  const { calls, service } = fakeService();
  const file = { name: "a.png", type: "image/png", size: 10 };
  const saved = await saveBlog({ service, id: null, form: { ...emptyBlogForm(), title: "T", imageFile: file } });
  assert.deepEqual(calls.map((c) => c[0]), ["create", "upload"]);
  assert.equal(calls[1][1], 11);
  assert.equal(calls[1][2], file);
  assert.equal(saved.featured_image, "https://cdn/x.png");
});

test("edit PATCHes then replaces or clears the image", async () => {
  const replace = fakeService();
  await saveBlog({ service: replace.service, id: 9, form: { ...blogToForm(BLOG), imageFile: { type: "image/png", size: 1 } } });
  assert.deepEqual(replace.calls.map((c) => c[0]), ["update", "upload"]);

  const clear = fakeService();
  await saveBlog({ service: clear.service, id: 9, form: { ...blogToForm(BLOG), clearImage: true } });
  assert.deepEqual(clear.calls.map((c) => c[0]), ["update", "clear"]);

  const untouched = fakeService();
  await saveBlog({ service: untouched.service, id: 9, form: blogToForm(BLOG) });
  assert.deepEqual(untouched.calls.map((c) => c[0]), ["update"]);
});

test("a failed image upload after create reports the saved record", async () => {
  const uploadError = new Error("Featured image must be 10 MB or smaller.");
  const { service } = fakeService({ upload: uploadError });
  await assert.rejects(
    saveBlog({ service, id: null, form: { ...emptyBlogForm(), title: "T", imageFile: { type: "image/png", size: 1 } } }),
    (err) => {
      assert.equal(err.savedBlog.id, 11);
      return true;
    }
  );
});

test("failed save prevents publish", async () => {
  let published = false;
  await assert.rejects(
    saveThenPublish({
      save: async () => {
        throw new Error("400");
      },
      publish: async () => {
        published = true;
      },
    })
  );
  await assert.rejects(saveThenPublish({ save: async () => null, publish: async () => { published = true; } }));
  assert.equal(published, false);
});

test("publish runs after a successful save with the saved id", async () => {
  const order = [];
  const result = await saveThenPublish({
    save: async () => {
      order.push("save");
      return { id: 5 };
    },
    publish: async (id) => {
      order.push(`publish:${id}`);
      return { id, status: "published" };
    },
  });
  assert.deepEqual(order, ["save", "publish:5"]);
  assert.equal(result.status, "published");
});

test("dirty tracking", () => {
  const base = blogToForm(BLOG);
  assert.equal(isBlogFormDirty(base, base), false);
  assert.equal(isBlogFormDirty({ ...base, excerpt: "changed" }, base), true);
  assert.equal(isBlogFormDirty({ ...base, imageFile: { name: "a" } }, base), true);
});
