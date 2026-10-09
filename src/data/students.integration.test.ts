import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { buildYearScenes, normalizeStudents, parseStudentCsv, validateStudents } from "../domain/student-data";
import { LOCATION_POINTS } from "./locations";

describe("maintained student dataset", () => {
  const csv = fs.readFileSync(path.join(process.cwd(), "src/data/students.csv"), "utf8");
  const students = normalizeStudents(parseStudentCsv(csv));

  it("contains the 80 supplied people and excludes only the missing-year record from scenes", () => {
    expect(students).toHaveLength(80);
    expect(buildYearScenes(students).flatMap((scene) => [...scene.domesticStudents, ...scene.overseasStudents])).toHaveLength(79);
  });

  it("keeps the confirmed correction and the three overseas records", () => {
    expect(students.filter((item) => item.name === "成宇峰")).toMatchObject([{ graduationYear: 2008 }]);
    expect(students.filter((item) => item.name === "岳泰新")).toMatchObject([{ graduationYear: 2016 }]);
    expect(students.filter((item) => item.locationType === "overseas").map((item) => item.name).sort()).toEqual([
      "刘蓝",
      "宋长征",
      "张保玉"
    ]);
  });

  it("reports only Chen Yong's missing year", () => {
    expect(validateStudents(students)).toEqual([
      { id: "s012", code: "missing-year", message: "陈永缺少毕业年份" }
    ]);
  });

  it("has a reviewed point for every domestic destination", () => {
    const missing = students
      .filter((item) => item.locationType === "domestic")
      .filter((item) => !item.locationKey || !LOCATION_POINTS[item.locationKey])
      .map((item) => `${item.name}:${item.workLocationRaw}`);

    expect(missing).toEqual([]);
  });
});
