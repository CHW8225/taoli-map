import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { buildYearScenes, normalizeStudents, parseStudentCsv, validateStudents } from "../domain/student-data";
import { LOCATION_POINTS } from "./locations";

describe("maintained student dataset", () => {
  const csv = fs.readFileSync(path.join(process.cwd(), "src/data/students.csv"), "utf8");
  const students = normalizeStudents(parseStudentCsv(csv));

  it("contains all 80 supplied people in the year scenes", () => {
    expect(students).toHaveLength(80);
    expect(buildYearScenes(students).flatMap((scene) => [...scene.domesticStudents, ...scene.overseasStudents])).toHaveLength(80);
  });

  it("keeps the confirmed correction and the three overseas records", () => {
    expect(students.filter((item) => item.name === "成宇峰")).toMatchObject([{ graduationYear: 2008 }]);
    expect(students.filter((item) => item.name === "岳泰新")).toMatchObject([{ graduationYear: 2016 }]);
    expect(students.filter((item) => item.name === "陈永")).toMatchObject([{ graduationYear: 2025 }]);
    expect(students.filter((item) => item.locationType === "overseas").map((item) => item.name).sort()).toEqual([
      "刘蓝",
      "宋长征",
      "张保玉"
    ]);
  });

  it("passes maintained-data validation", () => {
    expect(validateStudents(students)).toEqual([]);
  });

  it("has a reviewed point for every domestic destination", () => {
    const missing = students
      .filter((item) => item.locationType === "domestic")
      .filter((item) => !item.locationKey || !LOCATION_POINTS[item.locationKey])
      .map((item) => `${item.name}:${item.workLocationRaw}`);

    expect(missing).toEqual([]);
  });
});
