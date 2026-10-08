import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import {
  React,
  cleanup,
  click,
  getByRole,
  loadSource,
  queryByRole,
  queryByText,
  renderRoutes,
  router,
  typeInto,
  waitFor,
} from "./helpers/blogDomHarness.mjs";

const { default: MultiTrackApplicationForm } = await loadSource("src/components/MultiTrackApplicationForm.jsx");
const { default: GuestApplyModal } = await loadSource("src/components/GuestApplyModal.jsx");
const { Route } = router;
const h = React.createElement;

const EVENT_ID = 809;
const PROFILE = "https://www.linkedin.com/in/rahul-sharma";
const LINKEDIN_MESSAGE =
  "Please enter a valid LinkedIn URL, for example https://www.linkedin.com/in/your-profile, or leave this field blank.";
const TOO_LONG = /LinkedIn URL is too long \(maximum 200 characters\)/;
const urlOfLength = (length) => {
  const base = `${PROFILE}?ref=`;
  return base + "a".repeat(length - base.length);
};

const makeTrack = (id, label) => ({
  id,
  label,
  enabled_submission_modes: ["self_submission"],
  form_schema: {
    self_submission: {
      sections: [{ fields: [{ id: `q${id}`, label: `Why attend ${id}?`, required: true, type: "text" }] }],
    },
  },
});
const TRACKS = {
  32: makeTrack(32, "End User: Application & Qualification"),
  33: makeTrack(33, "Second Track"),
};

/** An axios-shaped rejection. Omit `status` for a network failure. */
const axiosError = (status, data) =>
  Object.assign(new Error("Request failed"), status ? { response: { status, data } } : {});

let posts;

/** Mocks every apiClient call the form makes. Nothing leaves the process. */
function installApi({ onApply = async () => ({ data: { id: 1, status: "pending" } }), profile } = {}) {
  posts = [];
  globalThis.__testApiClient = {
    get: async (url) => {
      if (url === "/auth/me/profile/") {
        if (profile) return { data: profile };
        throw axiosError(401, {});
      }
      const match = url.match(/application-tracks\/(\d+)\/(pricing-tiers\/|form-fields\/)?$/);
      if (match && match[2] === "pricing-tiers/") return { data: [{ id: 5, label: "Delegates", price: 0 }] };
      if (match && match[2] === "form-fields/") return { data: [] };
      if (match) return { data: TRACKS[match[1]] };
      throw new Error(`unexpected GET ${url}`);
    },
    post: async (url, payload) => {
      posts.push({ url, payload: JSON.parse(JSON.stringify(payload)) });
      if (url === `/events/${EVENT_ID}/apply/`) return onApply(payload);
      return { data: {} };
    },
  };
}

const applyPosts = () => posts.filter((p) => p.url === `/events/${EVENT_ID}/apply/`);
const alertText = () => (queryByRole("alert")?.textContent || "").trim();
const linkedinInput = () => getByRole("textbox", /^LinkedIn URL/);
const onApplicantStep = () => Boolean(queryByText("Your Information"));

async function renderForm({ selectedTracks = [32], isGuestApplication = true, onSuccess } = {}) {
  const successes = [];
  await renderRoutes(
    h(Route, {
      path: "/",
      element: h(MultiTrackApplicationForm, {
        eventId: EVENT_ID,
        selectedTracks,
        event: { id: EVENT_ID, title: "M&A in Asia 2026" },
        isGuestApplication,
        onSuccess: onSuccess || ((data) => successes.push(data)),
      }),
    })
  );
  await waitFor(() => assert.ok(queryByText("Your Information")));
  return successes;
}

async function fillApplicant({ linkedin = PROFILE } = {}) {
  await typeInto(getByRole("textbox", /^First Name/), "Rahul");
  await typeInto(getByRole("textbox", /^Last Name/), "Sharma");
  await typeInto(document.querySelector("input[type='email']"), "rahul@example.com");
  await typeInto(getByRole("textbox", /^Job Title/), "Director");
  await typeInto(getByRole("textbox", /^Company/), "Acme");
  await typeInto(getByRole("textbox", /^Country\/Region/), "India");
  await typeInto(linkedinInput(), linkedin);
}

/** From step 0 through every track step to Review & Submit, then submits once. */
async function advanceAndSubmit(selectedTracks = [32]) {
  await click(getByRole("button", "Next"));
  for (const id of selectedTracks) {
    await waitFor(() => assert.ok(queryByRole("textbox", new RegExp(`^Why attend ${id}\\?`))));
    const answer = getByRole("textbox", new RegExp(`^Why attend ${id}\\?`));
    if (!answer.value) await typeInto(answer, `Answer ${id}`);
    await click(getByRole("button", "Next"));
  }
  await waitFor(() => assert.ok(queryByText("Review Your Application")));
  await click(getByRole("button", "Submit Application"));
}

afterEach(async () => {
  await cleanup();
  delete globalThis.__testApiClient;
});

// ------------------------------------------------- MultiTrackApplicationForm --

test("URL without a scheme is caught on the applicant step; nothing is posted", async () => {
  installApi();
  await renderForm();
  await fillApplicant({ linkedin: "www.linkedin.com/in/rahul-sharma" });

  await click(getByRole("button", "Next"));

  assert.match(alertText(), /start your LinkedIn URL with https:\/\//);
  assert.equal(linkedinInput().getAttribute("aria-invalid"), "true");
  assert.equal(onApplicantStep(), true);
  assert.equal(applyPosts().length, 0);
});

test("241-character URL is blocked on the applicant step with the length message; nothing is posted", async () => {
  installApi();
  await renderForm();
  await fillApplicant({ linkedin: urlOfLength(241) });

  await click(getByRole("button", "Next"));

  assert.match(alertText(), TOO_LONG);
  assert.equal(linkedinInput().getAttribute("aria-invalid"), "true");
  assert.equal(linkedinInput().value, urlOfLength(241), "not truncated");
  assert.equal(onApplicantStep(), true);
  assert.equal(applyPosts().length, 0);
});

test("URL of exactly 200 characters (after trimming) is submitted unchanged", async () => {
  installApi();
  const successes = await renderForm();
  await fillApplicant({ linkedin: `​ ${urlOfLength(200)} ` });
  await advanceAndSubmit();

  await waitFor(() => assert.equal(successes.length, 1));
  assert.equal(applyPosts()[0].payload.linkedin_url, urlOfLength(200));
});

test("empty LinkedIn URL is accepted and sent as an empty string", async () => {
  installApi();
  const successes = await renderForm();
  await fillApplicant({ linkedin: "" });
  await advanceAndSubmit();

  await waitFor(() => assert.equal(successes.length, 1));
  assert.equal(applyPosts()[0].payload.linkedin_url, "");
});

test("valid guest submission trims whitespace/zero-width chars and keeps the payload shape", async () => {
  installApi();
  const successes = await renderForm();
  await fillApplicant({ linkedin: `​  ${PROFILE}  ` });
  await advanceAndSubmit();

  await waitFor(() => assert.equal(successes.length, 1));
  assert.equal(applyPosts().length, 1);
  const { payload } = applyPosts()[0];
  assert.equal(payload.linkedin_url, PROFILE);
  assert.equal(payload.first_name, "Rahul");
  assert.equal(payload.email, "rahul@example.com");
  assert.equal(payload.q32, "Answer 32");
  assert.deepEqual(
    payload.track_applications.map(({ track_id, submission_mode, tier_preference_id, form_answers }) => ({
      track_id, submission_mode, tier_preference_id, form_answers,
    })),
    [{ track_id: 32, submission_mode: "self_submission", tier_preference_id: 5, form_answers: { q32: "Answer 32" } }]
  );
  // Guests never hit the signed-in profile sync.
  assert.equal(posts.some((p) => p.url === "/events/save-lead-gen-fields/"), false);
});

test("backend linkedin_url 400 shows the field message, returns to the field, keeps data, allows retry", async () => {
  let calls = 0;
  installApi({
    onApply: async () => {
      calls += 1;
      if (calls === 1) throw axiosError(400, { linkedin_url: ["Enter a valid URL."] });
      return { data: { id: 7, status: "pending" } };
    },
  });
  const successes = await renderForm();
  await fillApplicant({ linkedin: "https://www.linkedin.com/in/rahul-sharma" });
  await advanceAndSubmit();

  await waitFor(() => assert.equal(alertText(), LINKEDIN_MESSAGE));
  assert.equal(onApplicantStep(), true);
  assert.equal(linkedinInput().getAttribute("aria-invalid"), "true");
  assert.equal(getByRole("textbox", /^First Name/).value, "Rahul");
  assert.equal(linkedinInput().value, PROFILE);
  assert.equal(successes.length, 0);
  assert.equal(applyPosts().length, 1, "no automatic resubmission");

  await typeInto(linkedinInput(), "https://www.linkedin.com/in/rahul-sharma-2");
  assert.equal(linkedinInput().getAttribute("aria-invalid"), "false");
  await advanceAndSubmit();

  await waitFor(() => assert.equal(successes.length, 1));
  assert.equal(applyPosts().length, 2);
  const retry = applyPosts()[1].payload;
  assert.equal(retry.linkedin_url, "https://www.linkedin.com/in/rahul-sharma-2");
  assert.equal(retry.q32, "Answer 32", "track answers survive the round trip");
  assert.equal(retry.track_applications[0].tier_preference_id, 5);
});

for (const [name, error, expected] of [
  ["other field error", axiosError(400, { email: ["Enter a valid email address."] }),
    "Please check the following: Email: Enter a valid email address."],
  ["detail response", axiosError(400, { detail: "You have already applied to this event." }),
    "You have already applied to this event."],
  ["missing_fields list", axiosError(400, { missing_fields: ["q32"] }), "Missing required fields: q32"],
  ["unrecognised 400 body", axiosError(400, {}),
    "Unable to submit application. Please check your information and try again."],
  ["401", axiosError(401, {}), "You must be logged in to apply for this event."],
  ["500 HTML page", axiosError(500, "<html>Traceback: secret</html>"), "Failed to submit application. Please try again."],
  ["network failure", axiosError(undefined), "Failed to submit application. Please try again."],
]) {
  test(`submission error handling: ${name}`, async () => {
    installApi({ onApply: async () => { throw error; } });
    await renderForm();
    await fillApplicant();
    await advanceAndSubmit();

    await waitFor(() => assert.equal(alertText(), expected));
    assert.equal(applyPosts().length, 1);
  });
}

test("authenticated multi-track submission keeps both track selections and profile sync", async () => {
  installApi({
    profile: { first_name: "Rahul", last_name: "Sharma", email: "rahul@example.com", job_title: "Director", company: "Acme", location: "India", links: {} },
  });
  const successes = await renderForm({ selectedTracks: [32, 33], isGuestApplication: false });
  await waitFor(() => assert.equal(getByRole("textbox", /^First Name/).value, "Rahul"));
  await typeInto(linkedinInput(), ` ${PROFILE} `);
  await advanceAndSubmit([32, 33]);

  await waitFor(() => assert.equal(successes.length, 1));
  assert.equal(posts.filter((p) => p.url === "/events/save-lead-gen-fields/").length, 1);
  const { payload } = applyPosts()[0];
  assert.equal(payload.linkedin_url, PROFILE);
  assert.deepEqual(payload.track_applications.map((t) => t.track_id), [32, 33]);
  assert.deepEqual(payload.track_applications.map((t) => t.form_answers), [{ q32: "Answer 32" }, { q33: "Answer 33" }]);
});

// ----------------------------------------------------------- GuestApplyModal --

let fetchCalls;
const realFetch = globalThis.fetch;

function installFetch(onApplyPost) {
  fetchCalls = [];
  globalThis.fetch = async (url, init = {}) => {
    fetchCalls.push({ url: String(url), method: init.method || "GET", body: init.body ? JSON.parse(init.body) : null });
    if ((init.method || "GET") === "GET") {
      return new Response(JSON.stringify({ status: "none" }), { status: 200 });
    }
    return onApplyPost();
  };
}

async function renderGuestModal() {
  await renderRoutes(
    h(Route, { path: "/", element: h(GuestApplyModal, { open: true, onClose: () => {}, event: { id: EVENT_ID, title: "M&A in Asia 2026" } }) })
  );
  await typeInto(getByRole("textbox", /^First Name/), "Rahul");
  await typeInto(getByRole("textbox", /^Last Name/), "Sharma");
  await typeInto(document.querySelector("input[type='email']"), "rahul@example.com");
  await typeInto(getByRole("textbox", /^Job Title/), "Director");
  await typeInto(getByRole("textbox", /^Company Name/), "Acme");
}

const guestPosts = () => fetchCalls.filter((c) => c.method === "POST");

test("guest modal: invalid LinkedIn URL is caught before any request", async (t) => {
  t.after(() => { globalThis.fetch = realFetch; });
  installFetch(async () => new Response("{}", { status: 201 }));
  await renderGuestModal();
  await typeInto(getByRole("textbox", /^LinkedIn URL/), "linkedin.com/in/rahul-sharma");
  await click(getByRole("button", "Submit Application"));

  assert.match(alertText(), /start your LinkedIn URL with https:\/\//);
  assert.equal(fetchCalls.length, 0);
});

test("guest modal: 201-character URL is blocked before any request", async (t) => {
  t.after(() => { globalThis.fetch = realFetch; });
  installFetch(async () => new Response("{}", { status: 201 }));
  await renderGuestModal();
  await typeInto(getByRole("textbox", /^LinkedIn URL/), urlOfLength(201));
  await click(getByRole("button", "Submit Application"));

  assert.match(alertText(), TOO_LONG);
  assert.equal(getByRole("textbox", /^LinkedIn URL/).value, urlOfLength(201));
  assert.equal(fetchCalls.length, 0);
});

test("guest modal: backend linkedin_url 400 shows the LinkedIn message and keeps the form", async (t) => {
  t.after(() => { globalThis.fetch = realFetch; });
  installFetch(async () => new Response(JSON.stringify({ linkedin_url: ["Enter a valid URL."] }), { status: 400 }));
  await renderGuestModal();
  await typeInto(getByRole("textbox", /^LinkedIn URL/), PROFILE);
  await click(getByRole("button", "Submit Application"));

  await waitFor(() => assert.equal(alertText(), LINKEDIN_MESSAGE));
  assert.equal(getByRole("textbox", /^LinkedIn URL/).value, PROFILE);
  assert.equal(getByRole("textbox", /^First Name/).value, "Rahul");
  assert.equal(guestPosts().length, 1);
});

test("guest modal: valid submission sends the trimmed URL", async (t) => {
  t.after(() => { globalThis.fetch = realFetch; });
  installFetch(async () => new Response(JSON.stringify({ id: 3, status: "pending" }), { status: 201 }));
  await renderGuestModal();
  await typeInto(getByRole("textbox", /^LinkedIn URL/), `​${PROFILE} `);
  await click(getByRole("button", "Submit Application"));

  await waitFor(() => assert.equal(guestPosts().length, 1));
  assert.equal(guestPosts()[0].body.linkedin_url, PROFILE);
  assert.equal(guestPosts()[0].body.email, "rahul@example.com");
  assert.equal(alertText(), "");
});

test("guest modal: server error page text is never shown", async (t) => {
  t.after(() => { globalThis.fetch = realFetch; });
  installFetch(async () => new Response("<html>Traceback: secret</html>", { status: 500 }));
  await renderGuestModal();
  await click(getByRole("button", "Submit Application"));

  await waitFor(() => assert.equal(alertText(), "Failed to submit application (500)"));
});
