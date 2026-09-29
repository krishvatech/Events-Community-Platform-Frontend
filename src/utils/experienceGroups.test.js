import test from "node:test";
import assert from "node:assert/strict";

import {
  formatMonths,
  groupExperiences,
  positionDuration,
  tenureDuration,
} from "./experienceGroups.js";

const IMAA = "Institute for Mergers, Acquisitions and Alliances (IMAA)";
// Snapshot date from the ticket's LinkedIn screenshot.
const TODAY = new Date(2026, 8, 29);

// API order: current first, then -end_date, -start_date (users.Experience.Meta.ordering).
const profile = [
  { id: 1, position: "Member", community_name: "GCC Board Directors Institute (GCC BDI)", start_date: "2024-01-01", currently_work_here: true },
  { id: 2, position: "Founder", community_name: "Change Institute", start_date: "2022-05-01", currently_work_here: true },
  { id: 3, position: "Director", community_name: IMAA, start_date: "2020-10-01", currently_work_here: true, location: "New York, United States", employment_type: "full_time" },
  { id: 4, position: "Director", community_name: IMAA, start_date: "2018-02-01", currently_work_here: true, location: "Singapore, Singapore", employment_type: "full_time" },
  { id: 5, position: "Research Partner", community_name: "UNCTAD", start_date: "2012-01-01", currently_work_here: true },
  { id: 6, position: "Founder & CEO", community_name: `${IMAA} `, start_date: "2004-08-01", currently_work_here: true, location: "Zurich, Zurich, Switzerland", employment_type: "full_time" },
];

test("groups all positions at the same organization under one entry", () => {
  const groups = groupExperiences(profile);
  assert.deepEqual(
    groups.map((g) => g.positions.map((p) => p.id)),
    [[1], [2], [6, 4, 3], [5]],
  );
  const imaa = groups[2];
  assert.equal(imaa.orgName, IMAA);
  assert.equal(imaa.employmentType, "Full-time");
});

test("inside a company: current roles oldest-first, then past roles latest-ended first", () => {
  const [g] = groupExperiences([
    { id: "past-old", community_name: "A", start_date: "2001-01-01", end_date: "2003-01-01" },
    { id: "cur-new", community_name: "A", start_date: "2020-01-01", currently_work_here: true },
    { id: "past-new", community_name: "A", start_date: "2003-02-01", end_date: "2008-01-01" },
    { id: "cur-old", community_name: "A", start_date: "2010-01-01", currently_work_here: true },
  ]);
  assert.deepEqual(g.positions.map((p) => p.id), ["cur-old", "cur-new", "past-new", "past-old"]);
});

test("org matching ignores case and surrounding/extra whitespace", () => {
  const groups = groupExperiences([
    { id: 1, community_name: "Acme  Corp" },
    { id: 2, community_name: " acme corp " },
  ]);
  assert.equal(groups.length, 1);
});

test("entries without an organization are never merged", () => {
  const groups = groupExperiences([{ id: 1, community_name: "" }, { id: 2 }]);
  assert.equal(groups.length, 2);
});

test("mixed employment types leave the header label blank", () => {
  const [g] = groupExperiences([
    { id: 1, community_name: "A", employment_type: "full_time" },
    { id: 2, community_name: "A", employment_type: "freelance" },
  ]);
  assert.equal(g.employmentType, "");
});

test("durations match LinkedIn's inclusive month counting", () => {
  assert.equal(positionDuration(profile[5], TODAY), "22 yrs 2 mos");
  assert.equal(positionDuration(profile[3], TODAY), "8 yrs 8 mos");
  assert.equal(positionDuration(profile[2], TODAY), "6 yrs");
});

test("tenure merges overlapping roles and skips gaps", () => {
  const imaa = groupExperiences(profile)[2].positions;
  assert.equal(tenureDuration(imaa, TODAY), "22 yrs 2 mos");

  const gap = [
    { start_date: "2010-01-01", end_date: "2010-12-01" },
    { start_date: "2015-01-01", end_date: "2015-06-01" },
  ];
  assert.equal(tenureDuration(gap, TODAY), "1 yr 6 mos");
});

test("formatMonths handles singulars and empty values", () => {
  assert.equal(formatMonths(13), "1 yr 1 mo");
  assert.equal(formatMonths(0), "");
  assert.equal(positionDuration({ start_date: "" }, TODAY), "");
});
