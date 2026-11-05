import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const source = readFileSync(new URL("../AdminNotificationsPage.jsx", import.meta.url), "utf8");
const helper = source.match(/const getUserDisplayName = \(u\) => \{[\s\S]*?\n\};/)?.[0];
assert.ok(helper, "display name helper exists");
const getUserDisplayName = new Function(`${helper}; return getUserDisplayName;`)();

test("admin notification requester names and avatar initials", () => {
  const cases = [
    [{ first_name: "John", last_name: "Smith", name: "Other" }, "John Smith"],
    [{ name: "Jane Doe" }, "Jane Doe"],
    [{ full_name: "Full Name", name: "Other" }, "Full Name"],
    [{ username: "username", name: "Other" }, "username"],
    [null, "User"],
    [undefined, "User"],
    [{ name: "   " }, "User"],
  ];
  for (const [user, expected] of cases) {
    const displayName = getUserDisplayName(user);
    assert.equal(displayName, expected);
    assert.equal(displayName[0].toUpperCase(), expected[0].toUpperCase());
  }
  assert.deepEqual(
    [{ name: "Alice" }, { name: "Bob" }].map(getUserDisplayName),
    ["Alice", "Bob"],
  );
});
