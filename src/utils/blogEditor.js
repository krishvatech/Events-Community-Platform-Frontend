// src/utils/blogEditor.js
//
// Pure form logic for the superuser Blog editor: API <-> form mapping,
// validation, featured-image rules and the save/publish sequence.
//
// status/published_at are never part of a payload. Publishing only ever goes
// through the explicit publish/unpublish endpoints.

import { BLOG_IMAGE_MAX_BYTES } from "../services/blogService.js";

export const emptyBlogForm = () => ({
  title: "",
  slug: "",
  excerpt: "",
  content_html: "",
  author: null, // { id, full_name } | null
  category_ids: [],
  tag_ids: [],
  seo_title: "",
  seo_description: "",
  canonical_url: "",
  imageFile: null, // newly chosen File
  clearImage: false, // remove the existing image on save
});

export const blogToForm = (blog) => ({
  ...emptyBlogForm(),
  title: blog?.title || "",
  slug: blog?.slug || "",
  excerpt: blog?.excerpt || "",
  content_html: blog?.content_html || "",
  author: blog?.author ? { id: blog.author.id, full_name: blog.author.full_name || "" } : null,
  category_ids: (blog?.categories || []).map((c) => c.id),
  tag_ids: (blog?.tags || []).map((t) => t.id),
  seo_title: blog?.seo_title || "",
  seo_description: blog?.seo_description || "",
  canonical_url: blog?.canonical_url || "",
});

const SLUG_PATTERN = /^[-a-zA-Z0-9_]+$/;

const isHttpUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

/** Client-side checks; the backend re-validates everything. */
export const validateBlogForm = (form, { isEdit = false } = {}) => {
  const errors = {};
  if (!form.title.trim()) errors.title = "Title is required.";
  const slug = form.slug.trim();
  if (isEdit && !slug) {
    errors.slug = "Slug cannot be blank for an existing blog.";
  } else if (slug && !SLUG_PATTERN.test(slug)) {
    errors.slug = "Use only letters, numbers, hyphens and underscores.";
  } else if (slug.toLowerCase() === "admin") {
    errors.slug = "This slug is reserved.";
  }
  const canonical = form.canonical_url.trim();
  if (canonical && !isHttpUrl(canonical)) {
    errors.canonical_url = "Enter a full URL starting with http:// or https://.";
  }
  return errors;
};

/** JSON body for POST/PATCH. A blank slug on create lets the backend generate one. */
export const buildBlogPayload = (form, { isEdit = false } = {}) => {
  const payload = {
    title: form.title.trim(),
    excerpt: form.excerpt,
    content_html: form.content_html,
    author_id: form.author ? form.author.id : null,
    category_ids: [...form.category_ids],
    tag_ids: [...form.tag_ids],
    seo_title: form.seo_title.trim(),
    seo_description: form.seo_description.trim(),
    canonical_url: form.canonical_url.trim(),
  };
  const slug = form.slug.trim();
  if (slug || isEdit) payload.slug = slug;
  return payload;
};

export const validateImageFile = (file) => {
  if (!file) return "";
  if (!String(file.type || "").startsWith("image/")) {
    return "Please choose an image file (JPG, PNG, GIF or WebP).";
  }
  if (file.size > BLOG_IMAGE_MAX_BYTES) {
    return "Featured image must be 10 MB or smaller.";
  }
  return "";
};

/**
 * Saves fields as JSON, then applies the featured-image change (upload or
 * clear) as a separate request. Multipart is used only for the file itself so
 * list fields such as an empty category_ids are always sent faithfully.
 *
 * If the fields save but the image step fails, the error carries `savedBlog`
 * so the caller can keep the user on the (now existing) record.
 */
export async function saveBlog({ service, id, form }) {
  const isEdit = id !== undefined && id !== null;
  const payload = buildBlogPayload(form, { isEdit });
  let saved = isEdit ? await service.updateBlog(id, payload) : await service.createBlog(payload);

  try {
    if (form.imageFile) {
      saved = await service.uploadBlogFeaturedImage(saved.id, form.imageFile);
    } else if (form.clearImage && isEdit) {
      saved = await service.clearBlogFeaturedImage(saved.id);
    }
  } catch (error) {
    error.savedBlog = saved;
    throw error;
  }
  return saved;
}

/** Runs save first; publish is only attempted when the save succeeded. */
export async function saveThenPublish({ save, publish }) {
  const saved = await save();
  if (!saved || saved.id === undefined || saved.id === null) {
    throw new Error("Save did not return a blog; publish was not attempted.");
  }
  return publish(saved.id);
}

const comparable = (form) => JSON.stringify({ ...form, imageFile: Boolean(form.imageFile) });

export const isBlogFormDirty = (form, baseline) => comparable(form) !== comparable(baseline);
