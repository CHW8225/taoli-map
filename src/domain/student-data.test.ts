import { describe, expect, it } from "vitest";

import {
  buildYearScenes,
  normalizeLocation,
  normalizeStudents,
  parseStudentCsv,
  parseGraduationYear,
  validateStudents,
  type RawStudentRow
} from "./student-data";

describe("parseStudentCsv", () => {
  it("reads the maintained CSV columns and skips blank lines", () => {
    const csv = [
      "id,name,graduation_time,work_location,location_type,display_order",
      "s001,尹春丽,2003.07,陕西西安,domestic,1",
      "",
      "s002,宋长征,2018.07,德国海德堡,overseas,2"
    ].join("\n");

    expect(parseStudentCsv(csv)).toEqual([
      {
        id: "s001",
        name: "尹春丽",
        graduation_time: "2003.07",
        work_location: "陕西西安",
        location_type: "domestic",
        display_order: "1"
      },
      {
        id: "s002",
        name: "宋长征",
        graduation_time: "2018.07",
        work_location: "德国海德堡",
        location_type: "overseas",
        display_order: "2"
      }
    ]);
  });
});

describe("parseGraduationYear", () => {
  it.each([
    ["2003.07", 2003],
    ["2009年", 2009],
    ["202206", 2022],
    ["2010", 2010],
    ["", null]
  ])("parses %s as %s", (input, expected) => {
    expect(parseGraduationYear(input)).toBe(expected);
  });
});

describe("normalizeLocation", () => {
  it("uses the rightmost location as the current workplace", () => {
    expect(normalizeLocation("宁夏银川/浙江绍兴")).toBe("浙江绍兴");
    expect(normalizeLocation("山东济宁-南宁")).toBe("广西南宁");
  });

  it("expands known short place names", () => {
    expect(normalizeLocation("深圳")).toBe("广东深圳");
    expect(normalizeLocation("天津西青")).toBe("天津市西青区");
    expect(normalizeLocation("陕西杨凌")).toBe("陕西省咸阳市杨陵区");
  });
});

describe("normalizeStudents", () => {
  const rows: RawStudentRow[] = [
    {
      id: "1",
      name: "成宇峰",
      graduation_time: "2008.06",
      work_location: "内蒙古包头",
      location_type: "domestic",
      display_order: "1"
    },
    {
      id: "2",
      name: "岳泰新",
      graduation_time: "2016.06",
      work_location: "内蒙古包头",
      location_type: "domestic",
      display_order: "2"
    },
    {
      id: "3",
      name: "刘蓝",
      graduation_time: "2010.6",
      work_location: "意大利都灵",
      location_type: "overseas",
      display_order: "3"
    }
  ];

  it("preserves the corrected graduation years and partitions overseas students", () => {
    const students = normalizeStudents(rows);
    const scenes = buildYearScenes(students);

    expect(scenes.find((scene) => scene.year === 2008)?.domesticStudents.map((item) => item.name)).toEqual([
      "成宇峰"
    ]);
    expect(scenes.find((scene) => scene.year === 2016)?.domesticStudents.map((item) => item.name)).toEqual([
      "岳泰新"
    ]);
    expect(scenes.find((scene) => scene.year === 2010)?.overseasStudents.map((item) => item.name)).toEqual([
      "刘蓝"
    ]);
  });
});

describe("validateStudents", () => {
  it("reports missing years and duplicate named records", () => {
    const rows: RawStudentRow[] = [
      {
        id: "1",
        name: "陈 永",
        graduation_time: "",
        work_location: "宁夏银川",
        location_type: "domestic",
        display_order: "1"
      },
      {
        id: "2",
        name: "成宇峰",
        graduation_time: "2008.06",
        work_location: "内蒙古包头",
        location_type: "domestic",
        display_order: "2"
      },
      {
        id: "3",
        name: "成宇峰",
        graduation_time: "2008.06",
        work_location: "内蒙古包头",
        location_type: "domestic",
        display_order: "3"
      }
    ];

    const issues = validateStudents(normalizeStudents(rows));

    expect(issues).toContainEqual({ id: "1", code: "missing-year", message: "陈永缺少毕业年份" });
    expect(issues).toContainEqual({ id: "3", code: "duplicate", message: "成宇峰存在重复记录" });
  });
});
