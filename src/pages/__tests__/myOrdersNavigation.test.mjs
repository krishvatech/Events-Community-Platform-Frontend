import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const source = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("My Orders sidebar uses the Orders tab while cart entry points retain the Cart tab", () => {
  const page = source("../MyCartPage.jsx");
  const sidebar = source("../../components/UnifiedSidebar.jsx");
  const app = source("../../App.jsx");
  const header = source("../../components/Header.jsx");

  assert.match(page, /<h1[^>]*>\s*My Orders\s*<\/h1>/);
  assert.match(page, /View your orders, manage your cart, and update your account details\./);
  assert.match(sidebar, /label: "My Orders", to: "\/account\/cart\?tab=orders"/);
  assert.match(app, /<Route path="\/account\/cart" element=\{<MyCartPage \/>\} \/>/);
  assert.match(page, /const \[tab, setTab\] = useState\(0\)/);
  assert.match(page, /orders: 1/);
  assert.match(page, /else if \(!requestedTab\) \{\s*setTab\(0\)/);
  assert.match(header, /to=\{staff \? "\/admin\/carts" : "\/account\/cart"\}/);
});
