import assert from "node:assert/strict";
import test from "node:test";

import {
  MARKETING_BROADCASTS_PATH,
  MARKETING_BROADCAST_NEW_PATH,
  MARKETING_HOME_PATH,
  getMarketingSectionFromPath,
  isMarketingHubPath,
  isMarketingNavItemActive,
  marketingNavigationItems,
} from "../../config/marketingNavigation.js";

const itemById = (id) => marketingNavigationItems.find((item) => item.id === id);

test("automation campaigns and email broadcasts are separate hub entries", () => {
  const campaigns = itemById("campaigns");
  const broadcasts = itemById("broadcasts");

  assert.ok(campaigns, "automation campaigns entry is missing");
  assert.ok(broadcasts, "email broadcasts entry is missing");
  assert.notEqual(campaigns.path, broadcasts.path);
  assert.equal(campaigns.path, `${MARKETING_HOME_PATH}/campaigns`);
  assert.equal(broadcasts.path, MARKETING_BROADCASTS_PATH);
});

test("the two entries are labelled so a user can tell them apart", () => {
  assert.equal(itemById("campaigns").label, "Automation Campaigns");
  assert.equal(itemById("broadcasts").label, "Email Broadcasts");
});

test("the automation campaign builder stays under automation campaigns", () => {
  assert.equal(
    getMarketingSectionFromPath(`${MARKETING_HOME_PATH}/builder`),
    "campaigns",
  );
  assert.equal(
    getMarketingSectionFromPath(`${MARKETING_HOME_PATH}/builder/42`),
    "campaigns",
  );
  assert.equal(
    getMarketingSectionFromPath(`${MARKETING_HOME_PATH}/campaigns`),
    "campaigns",
  );
});

test("the broadcast composer and one broadcast resolve to broadcasts", () => {
  assert.equal(
    getMarketingSectionFromPath(MARKETING_BROADCASTS_PATH),
    "broadcasts",
  );
  assert.equal(
    getMarketingSectionFromPath(MARKETING_BROADCAST_NEW_PATH),
    "broadcasts",
  );
  // /admin/newsletter/:uuid — a single broadcast, the only unmatched hub path.
  assert.equal(
    getMarketingSectionFromPath(
      `${MARKETING_HOME_PATH}/0f8a1c2e-1111-2222-3333-444455556666`,
    ),
    "broadcasts",
  );
});

test("broadcast routes stay inside the marketing hub", () => {
  assert.equal(isMarketingHubPath(MARKETING_BROADCASTS_PATH), true);
  assert.equal(isMarketingHubPath(MARKETING_BROADCAST_NEW_PATH), true);
});

test("sidebar highlights broadcasts, not campaigns, while composing", () => {
  const campaigns = itemById("campaigns");
  const broadcasts = itemById("broadcasts");

  assert.equal(isMarketingNavItemActive(broadcasts, MARKETING_BROADCAST_NEW_PATH), true);
  assert.equal(isMarketingNavItemActive(campaigns, MARKETING_BROADCAST_NEW_PATH), false);
  assert.equal(isMarketingNavItemActive(broadcasts, MARKETING_BROADCASTS_PATH), true);
  assert.equal(isMarketingNavItemActive(campaigns, MARKETING_BROADCASTS_PATH), false);
});

test("other hub sections are unaffected", () => {
  for (const [path, expected] of [
    [MARKETING_HOME_PATH, "dashboard"],
    [`${MARKETING_HOME_PATH}/templates`, "templates"],
    [`${MARKETING_HOME_PATH}/contacts`, "contacts"],
    [`${MARKETING_HOME_PATH}/segments`, "segments"],
    [`${MARKETING_HOME_PATH}/lists`, "lists"],
    [`${MARKETING_HOME_PATH}/analytics`, "analytics"],
    [`${MARKETING_HOME_PATH}/settings`, "settings"],
  ]) {
    assert.equal(getMarketingSectionFromPath(path), expected, `for ${path}`);
  }
});
