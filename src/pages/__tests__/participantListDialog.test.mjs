import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import {
  React,
  cleanup,
  click,
  loadSource,
  queryByRole,
  queryByText,
  renderRoutes,
  router,
  waitFor,
} from "./helpers/blogDomHarness.mjs";

const { default: ParticipantListDialog } = await loadSource("src/components/ParticipantListDialog.jsx");

const baseProps = {
  open: true,
  onClose: () => {},
  participants: [],
  eventTitle: "M&A in Asia 2026",
  loading: false,
  error: null,
};

const render = (props) =>
  renderRoutes(
    React.createElement(router.Route, {
      path: "*",
      element: React.createElement(ParticipantListDialog, { ...baseProps, ...props }),
    })
  );

afterEach(cleanup);

test("logged-out visitors see a log-in prompt instead of an error", async () => {
  let loginClicks = 0;
  await render({ loginRequired: true, onLogin: () => { loginClicks += 1; } });

  await waitFor(() => assert.ok(queryByText("Log in to see the participants of this event.")));
  assert.equal(queryByText("Failed to load participants"), null);
  await click(queryByRole("button", "Log in"));
  assert.equal(loginClicks, 1);
});

test("without loginRequired the dialog keeps showing load errors", async () => {
  await render({ error: "Participant list is not visible before the event." });

  await waitFor(() => assert.ok(queryByText("Participant list is not visible before the event.")));
  assert.equal(queryByText("Log in to see the participants of this event."), null);
  assert.equal(queryByRole("button", "Log in"), null);
});
