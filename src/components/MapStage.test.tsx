import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import AMapLoader from "@amap/amap-jsapi-loader";
import { ORIGIN } from "../data/locations";
import type { StudentRecord } from "../domain/student-data";
import { getYearColor } from "../domain/year-color";
import { MapStage } from "./MapStage";

vi.mock("@amap/amap-jsapi-loader", () => ({
  default: { load: vi.fn() }
}));

const localStudent: StudentRecord = {
  id: "local",
  name: "本地学生",
  graduationYear: 2020,
  workLocationRaw: ORIGIN.displayName,
  locationKey: ORIGIN.key,
  locationType: "domestic",
  displayOrder: 1
};

afterEach(() => {
  vi.mocked(AMapLoader.load).mockReset();
  delete window.Loca;
});

describe("MapStage fallback behavior", () => {
  it("colors a fallback route by its graduation year", () => {
    const remoteStudent: StudentRecord = {
      ...localStudent,
      id: "remote",
      graduationYear: 2025,
      workLocationRaw: "陕西西安",
      locationKey: "陕西西安"
    };
    const { container } = render(
      <MapStage
        amapKey=""
        locations={{
          陕西西安: {
            key: "陕西西安",
            displayName: "陕西西安",
            province: "陕西",
            coordinates: [108.9398, 34.3416]
          }
        }}
        visibleStudents={[remoteStudent]}
        activeStudent={remoteStudent}
        finale={false}
      />
    );

    expect((container.querySelector(".route") as HTMLElement).style.getPropertyValue("--route-color"))
      .toBe(getYearColor(2025));
  });

  it("uses an origin bloom instead of a zero-length fallback route", () => {
    const { container } = render(
      <MapStage
        amapKey=""
        locations={{ [ORIGIN.key]: ORIGIN }}
        visibleStudents={[localStudent]}
        activeStudent={localStudent}
        finale={false}
      />
    );

    expect(container.querySelectorAll(".route")).toHaveLength(0);
    expect(container.querySelector(".origin-glyph.blooming")).toBeInTheDocument();
  });

  it("falls back when AMap loads but Loca is unavailable", async () => {
    vi.mocked(AMapLoader.load).mockResolvedValue({});
    render(
      <MapStage amapKey="test-key" locations={{}} visibleStudents={[]} activeStudent={null} finale={false} />
    );

    await waitFor(() => expect(screen.getByTestId("map-fallback")).toBeInTheDocument());
  });
});
