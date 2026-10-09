import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { LocationPoint } from "../data/locations";
import type { SiteConfig } from "../data/site-config";
import type { StudentRecord } from "../domain/student-data";
import { getYearColor } from "../domain/year-color";
import { TaoliExperience } from "./TaoliExperience";

const students: StudentRecord[] = [
  {
    id: "s001",
    name: "尹春丽",
    graduationYear: 2003,
    workLocationRaw: "陕西西安",
    locationKey: "陕西西安",
    locationType: "domestic",
    displayOrder: 1
  },
  {
    id: "s002",
    name: "刘蓝",
    graduationYear: 2010,
    workLocationRaw: "意大利都灵",
    locationKey: null,
    locationType: "overseas",
    displayOrder: 2
  }
];

const locations: Record<string, LocationPoint> = {
  陕西西安: {
    key: "陕西西安",
    displayName: "陕西西安",
    province: "陕西",
    city: "西安",
    coordinates: [108.9398, 34.3416]
  }
};

const config: SiteConfig = {
  title: "桃李满天下",
  subtitle: "从杨凌出发，奔赴山海",
  originLabel: "陕西杨凌",
  originCoordinates: [108.072, 34.272],
  ceremonySpeed: 1
};

describe("TaoliExperience", () => {
  it("opens with the commemorative title and starts at the first graduating year", () => {
    render(
      <TaoliExperience students={students} locations={locations} config={config} amapKey="" ceremonyMode={false} />
    );

    expect(screen.getByRole("heading", { name: "桃李满天下" })).toBeInTheDocument();
    expect(document.querySelector<HTMLElement>(".experience")?.style.getPropertyValue("--year-color")).toBe(getYearColor(2003));
    fireEvent.click(screen.getByRole("button", { name: "开始桃李之旅" }));

    expect(screen.getByText("2003届")).toBeInTheDocument();
    expect(screen.getByTestId("map-fallback")).toHaveTextContent("等待地图授权");
  });

  it("supports year navigation and preserves the overseas card treatment", () => {
    render(
      <TaoliExperience students={students} locations={locations} config={config} amapKey="" ceremonyMode={false} />
    );
    fireEvent.click(screen.getByRole("button", { name: "开始桃李之旅" }));
    fireEvent.click(screen.getByRole("button", { name: "下一届" }));

    expect(screen.getByText("2010届", { selector: ".year-display b" })).toBeInTheDocument();
    const overseas = screen.getByText("海外桃李", { selector: ".overseas-card strong" }).closest("section");
    expect(overseas).not.toBeNull();
    expect(within(overseas!).getByText("刘蓝")).toBeInTheDocument();
    expect(within(overseas!).getByText("意大利都灵")).toBeInTheDocument();
  });

  it("renders site copy from config and omits the mentor area when the name is blank", () => {
    render(
      <TaoliExperience
        students={students}
        locations={locations}
        config={{ ...config, title: "四海芳华", subtitle: "师恩长存", mentorName: "" }}
        amapKey=""
        ceremonyMode={false}
      />
    );

    expect(screen.getByRole("heading", { name: "四海芳华" })).toBeInTheDocument();
    expect(screen.getByText("师恩长存", { selector: ".opening-screen h2" })).toBeInTheDocument();
    expect(screen.queryByTestId("mentor-name")).not.toBeInTheDocument();
  });

  it("keeps the current student visible while playback is paused", () => {
    vi.useFakeTimers();
    try {
      render(
        <TaoliExperience students={students} locations={locations} config={config} amapKey="" ceremonyMode={false} />
      );
      fireEvent.click(screen.getByRole("button", { name: "开始桃李之旅" }));
      act(() => vi.advanceTimersByTime(800));
      expect(screen.getByText("尹春丽", { selector: ".current-person b" })).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "暂停播放" }));
      expect(screen.getByText("尹春丽", { selector: ".current-person b" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "继续播放" })).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});
