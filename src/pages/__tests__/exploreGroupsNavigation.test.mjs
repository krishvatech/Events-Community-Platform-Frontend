import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const source = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("Explore Groups entry points use the registered groups view", () => {
  const myGroups = source("../community/mygroups.jsx");
  const sidebar = source("../../components/UnifiedSidebar.jsx");
  const forum = source("../community/ForumPage.jsx");
  const app = source("../../App.jsx");
  const hub = source("../CommunityHubPage.jsx");

  assert.match(myGroups, /onClick=\{\(\) => navigate\("\/community\?view=groups"\)\}>\s*Explore Groups/);
  assert.match(sidebar, /label: "Explore Groups", to: "\/community\?view=groups"/);
  assert.match(forum, /navigate\("\/community\?view=groups"\)/);
  assert.match(app, /<Route path="\/community" element=\{<RequireAuth><CommunityHubPage \/><\/RequireAuth>\} \/>/);
  assert.match(hub, /case "groups":\s*return <GroupsPage \/>/);
});
