import { describe, expect, it } from "vitest";

import { createInitialPlayback, getSceneStudents, playbackReducer } from "./timeline";
import type { StudentRecord, YearScene } from "./student-data";

function student(id: string, year: number, order: number, type: "domestic" | "overseas" = "domestic"): StudentRecord {
  return {
    id,
    name: id,
    graduationYear: year,
    workLocationRaw: type === "overseas" ? "德国海德堡" : "陕西西安",
    locationKey: type === "overseas" ? null : "陕西西安",
    locationType: type,
    displayOrder: order
  };
}

const scenes: YearScene[] = [
  {
    year: 2003,
    domesticStudents: [student("甲", 2003, 2)],
    overseasStudents: [student("乙", 2003, 1, "overseas")]
  },
  { year: 2004, domesticStudents: [student("丙", 2004, 3)], overseasStudents: [] }
];

describe("getSceneStudents", () => {
  it("restores display order across domestic and overseas groups", () => {
    expect(getSceneStudents(scenes[0]).map((item) => item.name)).toEqual(["乙", "甲"]);
  });
});

describe("playbackReducer", () => {
  it("advances one student at a time and enters a year hold without replaying", () => {
    let state = createInitialPlayback();
    state = playbackReducer(state, { type: "START", scenes });
    expect(state).toMatchObject({ status: "yearIntro", sceneIndex: 0, studentIndex: -1 });

    state = playbackReducer(state, { type: "TICK", scenes });
    expect(state).toMatchObject({ status: "studentLaunch", studentIndex: 0 });

    state = playbackReducer(state, { type: "TICK", scenes });
    expect(state).toMatchObject({ status: "studentLaunch", studentIndex: 1 });

    state = playbackReducer(state, { type: "TICK", scenes });
    expect(state).toMatchObject({ status: "yearHold", studentIndex: 1 });
  });

  it("pauses and resumes from the same student", () => {
    const playing = { ...createInitialPlayback(), status: "studentLaunch" as const, sceneIndex: 0, studentIndex: 1 };
    const paused = playbackReducer(playing, { type: "PAUSE", scenes });
    const resumed = playbackReducer(paused, { type: "RESUME", scenes });

    expect(paused).toMatchObject({ status: "paused", studentIndex: 1, resumeStatus: "studentLaunch" });
    expect(resumed).toMatchObject({ status: "studentLaunch", studentIndex: 1 });
  });

  it("enters the finale after the last year and can restart", () => {
    const lastHold = {
      ...createInitialPlayback(),
      status: "yearHold" as const,
      sceneIndex: 1,
      studentIndex: 0
    };
    const finale = playbackReducer(lastHold, { type: "TICK", scenes });
    const restarted = playbackReducer(finale, { type: "RESTART", scenes });

    expect(finale.status).toBe("finale");
    expect(restarted).toMatchObject({ status: "yearIntro", sceneIndex: 0, studentIndex: -1 });
  });

  it("moves between years without leaving the scene bounds", () => {
    const first = playbackReducer(createInitialPlayback(), { type: "PREVIOUS_YEAR", scenes });
    const second = playbackReducer(first, { type: "NEXT_YEAR", scenes });
    const stillSecond = playbackReducer(second, { type: "NEXT_YEAR", scenes });

    expect(first.sceneIndex).toBe(0);
    expect(second.sceneIndex).toBe(1);
    expect(stillSecond.sceneIndex).toBe(1);
  });
});
