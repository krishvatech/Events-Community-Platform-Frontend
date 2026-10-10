import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_MAX_BYTES,
  DEFAULT_MAX_ROWS,
  checkCsvFile,
  detectTagSeparator,
  duplicateTargets,
  countTagSeparators,
  initialTagSeparator,
  pruneFallbacks,
  splitTags,
  tagProblem,
  tagSeparatorConflicts,
  tagSeparatorConflictsAccepted,
  formatBytes,
  formatCount,
  isTerminalState,
  mappingPayload,
  nextPollDelay,
  readStoredImportId,
  storeImportId,
  validationKey,
} from "./contactImport.js";

const file = (name, size) => ({ name, size, lastModified: 1 });

test("client-side file checks", () => {
  assert.equal(checkCsvFile(null), "Choose a CSV file to upload.");
  assert.equal(checkCsvFile(file("contacts.xlsx", 10)), "Only .csv files can be imported.");
  assert.equal(checkCsvFile(file("contacts.CSV", 0)), "The file is empty.");
  assert.match(checkCsvFile(file("contacts.csv", DEFAULT_MAX_BYTES + 1)), /larger than the 25\.0 MB limit/);
  assert.equal(checkCsvFile(file("contacts.csv", 10)), "");
});

test("duplicate destinations are detected, skipped columns are ignored", () => {
  assert.deepEqual([...duplicateTargets({ A: "email", B: "", C: "city", D: "city", E: "" })], ["city"]);
  assert.equal(duplicateTargets({}).size, 0);
});

test("mapping payload keeps every header in file order", () => {
  assert.deepEqual(mappingPayload(["Email", "City", "ID"], { Email: "email", ID: undefined }), {
    Email: "email",
    City: "",
    ID: "",
  });
});

test("validation key changes with the file, mapping or options", () => {
  const base = validationKey(file("a.csv", 5), ["Email"], { Email: "email" }, { existing_mode: "skip_existing" });
  assert.equal(base, validationKey(file("a.csv", 5), ["Email"], { Email: "email" }, { existing_mode: "skip_existing" }));
  assert.notEqual(base, validationKey(file("b.csv", 5), ["Email"], { Email: "email" }, { existing_mode: "skip_existing" }));
  assert.notEqual(base, validationKey(file("a.csv", 5), ["Email"], { Email: "" }, { existing_mode: "skip_existing" }));
  assert.notEqual(base, validationKey(file("a.csv", 5), ["Email"], { Email: "email" }, { existing_mode: "fill_empty" }));
});

test("polling backs off and is bounded", () => {
  assert.equal(nextPollDelay(0), 3000);
  assert.equal(nextPollDelay(1), 4500);
  assert.equal(nextPollDelay(20), 15000);
  assert.equal(nextPollDelay(-3), 3000);
});

test("formatting never invents numbers", () => {
  assert.equal(formatCount(null), "Unknown");
  assert.equal(formatCount(undefined), "Unknown");
  assert.equal(formatCount(0), "0");
  assert.equal(formatBytes(2048), "2.0 KB");
  assert.equal(isTerminalState("completed_with_errors"), true);
  assert.equal(isTerminalState("processing"), false);
});

test("storage helpers degrade safely without browser storage", () => {
  assert.equal(readStoredImportId(), null);
  assert.doesNotThrow(() => storeImportId(5));
});

test("fallback columns are not duplicates", () => {
  const mapping = { Organization: "company", "*Company Name": "company", Email: "email" };
  assert.deepEqual([...duplicateTargets(mapping)], ["company"]);
  assert.equal(duplicateTargets(mapping, ["*Company Name"]).size, 0);
});

test("tag splitting matches the backend rules", () => {
  assert.deepEqual(splitTags(" a , b ,A,", ","), ["a", "b"]);
  assert.deepEqual(splitTags("demo-contact,local-import", "|"), ["demo-contact,local-import"]);
  assert.deepEqual(splitTags("", ","), []);
});

test("separator detection only suggests when one kind is used", () => {
  assert.equal(detectTagSeparator(["a,b", "c"]), ",");
  assert.equal(detectTagSeparator(["a|b"]), "|");
  assert.equal(detectTagSeparator(["a,b", "c|d"]), null);
  assert.equal(detectTagSeparator(["single"]), null);
  assert.equal(tagSeparatorConflicts(["a,b", "c|d", "e"], "|"), 1);
  assert.equal(tagSeparatorConflicts(["a,b"], ","), 0);
});

test("fallbacks without a primary are pruned", () => {
  const headers = ["Organization", "*Company Name", "Phone", "*Phone"];
  const mapping = { Organization: "company", "*Company Name": "company", Phone: "phone", "*Phone": "phone" };
  assert.deepEqual(pruneFallbacks(headers, mapping, ["*Company Name", "*Phone"]), ["*Company Name", "*Phone"]);
  assert.deepEqual(pruneFallbacks(headers, { ...mapping, Organization: "" }, ["*Company Name", "*Phone"]), ["*Phone"]);
  assert.deepEqual(pruneFallbacks(headers, { ...mapping, "*Phone": "" }, ["*Company Name", "*Phone"]), ["*Company Name"]);
  assert.deepEqual(pruneFallbacks(["A", "B"], { A: "email", B: "email" }, ["B"]), []);
});

test("tag problems mirror the backend rules", () => {
  assert.equal(tagProblem("a,b", ","), "");
  assert.match(tagProblem("a|b", ","), /contains '\|'/);
  assert.equal(tagProblem("a|b", "|"), "");
  assert.match(tagProblem("ok,-gone", ","), /starts with '-'/);
  assert.match(tagProblem("x".repeat(192), "|"), /longer than 191/);
  assert.equal(tagProblem("x".repeat(191), "|"), "");
  assert.equal(tagSeparatorConflictsAccepted(["a,b", "c|d"], ","), 0);
  assert.equal(tagSeparatorConflictsAccepted(["a,b", "-c,d"], "|"), 1);
});

test("initial separator: one kind auto-selects, none keeps Pipe, mixed stays unresolved", () => {
  assert.equal(initialTagSeparator(countTagSeparators(["webinar,newsletter", "member,vip"])), ",");
  assert.equal(initialTagSeparator(countTagSeparators(["webinar|newsletter", "member|vip"])), "|");
  assert.equal(initialTagSeparator(countTagSeparators(["single", "other"])), "|");
  assert.equal(initialTagSeparator(countTagSeparators([])), "|");
  assert.equal(initialTagSeparator(countTagSeparators(["webinar,newsletter", "member|vip"])), "");
  assert.equal(initialTagSeparator({ "|": 0, ",": 3, ";": 1 }), "");
});

test("fallback limits match the server defaults (50,000 contacts, 25 MiB)", () => {
  assert.equal(DEFAULT_MAX_ROWS, 50000);
  assert.equal(DEFAULT_MAX_BYTES, 25 * 1024 * 1024);
});
