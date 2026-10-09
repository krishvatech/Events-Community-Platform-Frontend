import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_MAX_BYTES,
  checkCsvFile,
  duplicateTargets,
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
  assert.match(checkCsvFile(file("contacts.csv", DEFAULT_MAX_BYTES + 1)), /larger than the 10\.0 MB limit/);
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
