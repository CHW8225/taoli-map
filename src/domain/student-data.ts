export interface RawStudentRow {
  id: string;
  name: string;
  graduation_time: string;
  work_location: string;
  location_type: "domestic" | "overseas";
  display_order: string;
}

export interface StudentRecord {
  id: string;
  name: string;
  graduationYear: number | null;
  workLocationRaw: string;
  locationKey: string | null;
  locationType: "domestic" | "overseas";
  displayOrder: number;
}

export interface YearScene {
  year: number;
  domesticStudents: StudentRecord[];
  overseasStudents: StudentRecord[];
}

export interface ValidationIssue {
  id: string;
  code: "missing-name" | "missing-year" | "duplicate" | "missing-location";
  message: string;
}

export interface LocationStudentGroup {
  locationKey: string;
  students: StudentRecord[];
}

const CSV_HEADER = [
  "id",
  "name",
  "graduation_time",
  "work_location",
  "location_type",
  "display_order"
] as const;

const LOCATION_ALIASES: Record<string, string> = {
  深圳: "广东深圳",
  南宁: "广西南宁",
  秦皇岛: "河北秦皇岛",
  绍兴: "浙江绍兴",
  "广西南宁市": "广西南宁",
  "河南郑州市": "河南郑州",
  "河北省秦皇岛市": "河北秦皇岛",
  "宁夏银川市": "宁夏银川",
  "陕西商洛市": "陕西商洛",
  "上海奉贤": "上海奉贤区",
  "上海闵行": "上海闵行区",
  "天津西青": "天津市西青区",
  "天津市": "天津",
  "四川省遂宁市射洪市": "四川射洪",
  "山西省临汾市襄汾县": "山西襄汾",
  "河南省洛阳市洛宁县": "河南洛宁",
  "陕西杨凌": "陕西省咸阳市杨陵区"
};

export function parseGraduationYear(value: string): number | null {
  const match = value.trim().match(/^(19|20)\d{2}/);
  return match ? Number(match[0]) : null;
}

export function parseStudentCsv(csv: string): RawStudentRow[] {
  const lines = csv
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const header = lines[0].split(",");
  if (header.join(",") !== CSV_HEADER.join(",")) {
    throw new Error(`CSV表头必须为：${CSV_HEADER.join(",")}`);
  }

  return lines.slice(1).map((line) => {
    const values = line.split(",");
    if (values.length !== CSV_HEADER.length) {
      throw new Error(`CSV记录列数错误：${line}`);
    }
    return Object.fromEntries(CSV_HEADER.map((key, index) => [key, values[index].trim()])) as unknown as RawStudentRow;
  });
}

export function normalizeLocation(value: string): string {
  const latest = value
    .trim()
    .split(/[\/-]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .at(-1) ?? "";

  return LOCATION_ALIASES[latest] ?? latest;
}

export function normalizeStudents(rows: RawStudentRow[]): StudentRecord[] {
  return rows.map((row, index) => {
    const workLocation = normalizeLocation(row.work_location);
    return {
      id: row.id,
      name: row.name.replace(/\s+/g, ""),
      graduationYear: parseGraduationYear(row.graduation_time),
      workLocationRaw: workLocation,
      locationKey: row.location_type === "domestic" && workLocation ? workLocation : null,
      locationType: row.location_type,
      displayOrder: Number(row.display_order) || index + 1
    };
  });
}

export function buildYearScenes(students: StudentRecord[]): YearScene[] {
  const byYear = new Map<number, YearScene>();

  students
    .filter((student): student is StudentRecord & { graduationYear: number } => student.graduationYear !== null)
    .sort((left, right) => left.displayOrder - right.displayOrder)
    .forEach((student) => {
      const year = student.graduationYear;
      const scene = byYear.get(year) ?? { year, domesticStudents: [], overseasStudents: [] };
      if (student.locationType === "overseas") {
        scene.overseasStudents.push(student);
      } else {
        scene.domesticStudents.push(student);
      }
      byYear.set(year, scene);
    });

  return [...byYear.values()].sort((left, right) => left.year - right.year);
}

export function groupStudentsByLocation(students: StudentRecord[]): LocationStudentGroup[] {
  const groups = new Map<string, StudentRecord[]>();

  students.forEach((student) => {
    if (student.locationType !== "domestic" || !student.locationKey) return;
    const group = groups.get(student.locationKey) ?? [];
    group.push(student);
    groups.set(student.locationKey, group);
  });

  return [...groups.entries()].map(([locationKey, groupedStudents]) => ({
    locationKey,
    students: groupedStudents
  }));
}

export function validateStudents(students: StudentRecord[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const seen = new Set<string>();

  students.forEach((student) => {
    if (!student.name) {
      issues.push({ id: student.id, code: "missing-name", message: "存在缺少姓名的记录" });
    }
    if (student.graduationYear === null) {
      issues.push({ id: student.id, code: "missing-year", message: `${student.name || "该学生"}缺少毕业年份` });
    }
    if (!student.workLocationRaw) {
      issues.push({ id: student.id, code: "missing-location", message: `${student.name || "该学生"}缺少工作地点` });
    }

    const signature = `${student.name}|${student.graduationYear}|${student.workLocationRaw}`;
    if (seen.has(signature)) {
      issues.push({ id: student.id, code: "duplicate", message: `${student.name}存在重复记录` });
    } else {
      seen.add(signature);
    }
  });

  return issues;
}
