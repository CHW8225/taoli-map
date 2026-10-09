import fs from "node:fs";
import path from "node:path";

import { TaoliExperience } from "../components/TaoliExperience";
import { LOCATION_POINTS } from "../data/locations";
import { SITE_CONFIG } from "../data/site-config";
import { normalizeStudents, parseStudentCsv } from "../domain/student-data";

interface HomeProps {
  searchParams: Promise<{ mode?: string }>;
}

export default async function Home({ searchParams }: HomeProps) {
  const csv = fs.readFileSync(path.join(process.cwd(), "src/data/students.csv"), "utf8");
  const students = normalizeStudents(parseStudentCsv(csv));
  const params = await searchParams;

  return (
    <TaoliExperience
      students={students}
      locations={LOCATION_POINTS}
      config={SITE_CONFIG}
      amapKey={process.env.NEXT_PUBLIC_AMAP_KEY ?? ""}
      ceremonyMode={params.mode === "ceremony"}
    />
  );
}
