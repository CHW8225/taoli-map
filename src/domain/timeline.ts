import type { StudentRecord, YearScene } from "./student-data";

export type PlaybackStatus = "idle" | "yearIntro" | "studentLaunch" | "yearHold" | "finale" | "paused";

export interface PlaybackState {
  status: PlaybackStatus;
  sceneIndex: number;
  studentIndex: number;
  resumeStatus: Exclude<PlaybackStatus, "paused"> | null;
}

export type PlaybackAction =
  | { type: "START" | "TICK" | "PAUSE" | "RESUME" | "RESTART" | "NEXT_YEAR" | "PREVIOUS_YEAR"; scenes: YearScene[] };

export function createInitialPlayback(): PlaybackState {
  return { status: "idle", sceneIndex: 0, studentIndex: -1, resumeStatus: null };
}

export function getSceneStudents(_scene: YearScene): StudentRecord[] {
  return [..._scene.domesticStudents, ..._scene.overseasStudents].sort(
    (left, right) => left.displayOrder - right.displayOrder
  );
}

function yearState(sceneIndex: number): PlaybackState {
  return { status: "yearIntro", sceneIndex, studentIndex: -1, resumeStatus: null };
}

export function playbackReducer(state: PlaybackState, action: PlaybackAction): PlaybackState {
  const { scenes } = action;
  if (scenes.length === 0) return createInitialPlayback();

  switch (action.type) {
    case "START":
    case "RESTART":
      return yearState(0);
    case "PAUSE":
      if (state.status === "idle" || state.status === "paused" || state.status === "finale") return state;
      return { ...state, status: "paused", resumeStatus: state.status };
    case "RESUME":
      return state.status === "paused" && state.resumeStatus
        ? { ...state, status: state.resumeStatus, resumeStatus: null }
        : state;
    case "PREVIOUS_YEAR":
      return yearState(Math.max(0, state.sceneIndex - 1));
    case "NEXT_YEAR":
      return yearState(Math.min(scenes.length - 1, state.sceneIndex + 1));
    case "TICK": {
      if (state.status === "yearIntro") {
        return getSceneStudents(scenes[state.sceneIndex]).length > 0
          ? { ...state, status: "studentLaunch", studentIndex: 0 }
          : { ...state, status: "yearHold" };
      }
      if (state.status === "studentLaunch") {
        const finalStudentIndex = getSceneStudents(scenes[state.sceneIndex]).length - 1;
        return state.studentIndex < finalStudentIndex
          ? { ...state, studentIndex: state.studentIndex + 1 }
          : { ...state, status: "yearHold" };
      }
      if (state.status === "yearHold") {
        return state.sceneIndex === scenes.length - 1
          ? { ...state, status: "finale", resumeStatus: null }
          : yearState(state.sceneIndex + 1);
      }
      return state;
    }
    default:
      return state;
  }
}
