import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { React, all, cleanup, click, loadSource, queryByText } from "./helpers/blogDomHarness.mjs";

const h = React.createElement;

// Strings/booleans only in assertions: a failing assert on a live jsdom node
// makes Node pretty-print the whole DOM graph and exhaust memory.

const TRACK = {
  label: "Sponsors Registration",
  short_description: "Registration for Sponsor Guests and Staff.",
  enabled_submission_modes: ["self_submission", "confirmed"],
};

const COPIES = {
  main: "src/components/SubmissionModePicker.jsx",
  staging: "../frontend-staging-disposable-email/src/components/SubmissionModePicker.jsx",
};

afterEach(cleanup);

async function mount(path) {
  const { default: Picker } = await loadSource(path);
  const { createRoot } = await import("react-dom/client");
  const { act } = await import("react");
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const picked = [];
  await act(async () => {
    root.render(h(Picker, { track: TRACK, onModeSelected: (m) => picked.push(m), onCancel() {} }));
  });
  return { picked, root };
}

const radios = () => all('input[type="radio"]');
const checkedValues = () => radios().filter((r) => r.checked).map((r) => r.value);
const continueButton = () => all("button").find((b) => /continue/i.test(b.textContent));

for (const [name, path] of Object.entries(COPIES)) {
  test(`${name}: clicking the radio circle itself selects that option`, async () => {
    await mount(path);
    assert.deepEqual(radios().map((r) => r.value), ["self_submission", "confirmed"]);
    assert.deepEqual(checkedValues(), []);
    assert.equal(continueButton().disabled, true);

    await click(radios()[1]);
    assert.deepEqual(checkedValues(), ["confirmed"]);
    assert.equal(continueButton().disabled, false);

    await click(radios()[0]);
    assert.deepEqual(checkedValues(), ["self_submission"]);
  });

  test(`${name}: clicking the card text still selects, and Continue passes the mode`, async () => {
    const { picked } = await mount(path);
    await click(queryByText("Apply with confirmation from a sponsor or partner organization"));
    assert.deepEqual(checkedValues(), ["confirmed"]);
    await click(continueButton());
    assert.deepEqual(picked, ["confirmed"]);
  });

  test(`${name}: clicking the circle then Continue passes the real mode`, async () => {
    const { picked } = await mount(path);
    await click(radios()[0]);
    await click(continueButton());
    assert.deepEqual(picked, ["self_submission"]);
  });
}
