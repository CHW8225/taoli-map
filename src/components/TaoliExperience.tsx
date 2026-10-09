"use client";

import { useEffect, useMemo, useReducer, useState } from "react";

import type { LocationPoint } from "../data/locations";
import type { SiteConfig } from "../data/site-config";
import { buildYearScenes, type StudentRecord } from "../domain/student-data";
import { createInitialPlayback, getSceneStudents, playbackReducer } from "../domain/timeline";
import { MapStage } from "./MapStage";
import { PeoplePanel } from "./PeoplePanel";

interface TaoliExperienceProps {
  students: StudentRecord[];
  locations: Record<string, LocationPoint>;
  config: SiteConfig;
  amapKey: string;
  ceremonyMode: boolean;
}

export function TaoliExperience({ students, locations, config, amapKey, ceremonyMode }: TaoliExperienceProps) {
  const scenes = useMemo(() => buildYearScenes(students), [students]);
  const [playback, dispatch] = useReducer(playbackReducer, undefined, createInitialPlayback);
  const [entered, setEntered] = useState(false);
  const [speed, setSpeed] = useState<0.75 | 1 | 1.5>(config.ceremonySpeed);
  const currentScene = scenes[playback.sceneIndex] ?? scenes[0];
  const currentSceneStudents = currentScene ? getSceneStudents(currentScene) : [];
  const currentStudent = playback.status === "studentLaunch" ? currentSceneStudents[playback.studentIndex] ?? null : null;

  const visibleStudents = useMemo(() => {
    if (playback.status === "finale") return scenes.flatMap(getSceneStudents);
    const completed = scenes.slice(0, playback.sceneIndex).flatMap(getSceneStudents);
    const current = playback.status === "studentLaunch" || playback.status === "yearHold" || playback.status === "paused"
      ? currentSceneStudents.slice(0, Math.max(0, playback.studentIndex + 1))
      : [];
    return [...completed, ...current];
  }, [currentSceneStudents, playback.sceneIndex, playback.status, playback.studentIndex, scenes]);

  const revealedIds = useMemo(() => new Set(visibleStudents.map((student) => student.id)), [visibleStudents]);
  const stats = useMemo(() => {
    const domestic = students.filter((student) => student.locationType === "domestic" && student.locationKey);
    return {
      students: students.length,
      years: scenes.length,
      provinces: new Set(domestic.map((student) => locations[student.locationKey!]?.province).filter(Boolean)).size,
      cities: new Set(domestic.map((student) => student.locationKey)).size,
      overseas: students.filter((student) => student.locationType === "overseas").length
    };
  }, [locations, scenes.length, students]);

  useEffect(() => {
    if (!entered || ["idle", "paused", "finale"].includes(playback.status)) return;
    const baseDelay = playback.status === "yearIntro" ? 800 : playback.status === "studentLaunch" ? 550 : 2500;
    const timer = window.setTimeout(() => dispatch({ type: "TICK", scenes }), baseDelay / speed);
    return () => window.clearTimeout(timer);
  }, [entered, playback.status, playback.sceneIndex, playback.studentIndex, scenes, speed]);

  useEffect(() => {
    if (!entered || playback.status !== "finale" || !ceremonyMode) return;
    const timer = window.setTimeout(() => dispatch({ type: "RESTART", scenes }), 12000 / speed);
    return () => window.clearTimeout(timer);
  }, [ceremonyMode, entered, playback.status, scenes, speed]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!entered) return;
      if (event.key === " ") {
        event.preventDefault();
        dispatch({ type: playback.status === "paused" ? "RESUME" : "PAUSE", scenes });
      }
      if (event.key === "ArrowRight") dispatch({ type: "NEXT_YEAR", scenes });
      if (event.key === "ArrowLeft") dispatch({ type: "PREVIOUS_YEAR", scenes });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [entered, playback.status, scenes]);

  const start = async () => {
    setEntered(true);
    dispatch({ type: "START", scenes });
    if (ceremonyMode && document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen().catch(() => undefined);
    }
  };

  const togglePause = () => dispatch({ type: playback.status === "paused" ? "RESUME" : "PAUSE", scenes });

  return (
    <main className={`experience${ceremonyMode ? " ceremony" : ""}`}>
      <div className="ambient-grid" aria-hidden="true" />

      <header className="topbar">
        <div className="brand-mark"><i /><span>桃李轨迹</span><small>LEGACY MAP</small></div>
        <div className="top-title"><strong>{config.title}</strong><span>{config.subtitle}</span></div>
        <div className="mode-badge"><i />{ceremonyMode ? "仪式模式" : "自由浏览"}</div>
      </header>

      <section className="stage">
        <MapStage
          amapKey={amapKey}
          locations={locations}
          visibleStudents={visibleStudents}
          activeStudent={currentStudent}
          finale={playback.status === "finale"}
        />

        <div className="year-display" aria-live="polite">
          <small>GRADUATION YEAR</small>
          <b>{playback.status === "finale" ? config.title : `${currentScene?.year ?? "—"}届`}</b>
          <span>{playback.status === "finale" ? config.subtitle : `第 ${playback.sceneIndex + 1} / ${scenes.length} 个年份`}</span>
        </div>

        {currentScene && (
          <PeoplePanel
            scene={currentScene}
            currentStudent={currentStudent}
            revealedIds={revealedIds}
            finale={playback.status === "finale"}
            originLabel={config.originLabel}
          />
        )}

        {playback.status === "finale" && (
          <div className="finale-copy">
            <span>二十余载 · 薪火相传</span>
            <h2>{config.subtitle}<br />{config.title}</h2>
            <div className="finale-actions">
              <button type="button" onClick={() => dispatch({ type: "RESTART", scenes })}>重新播放</button>
              <button type="button" onClick={() => dispatch({ type: "GO_TO_YEAR", scenes, sceneIndex: scenes.length - 1 })}>自由浏览</button>
              {document.fullscreenEnabled && <button type="button" onClick={() => document.exitFullscreen?.()}>退出全屏</button>}
            </div>
          </div>
        )}
      </section>

      <section className="stats-bar" aria-label="桃李分布统计">
        <div><strong>{stats.students}</strong><span>学生总数</span></div>
        <div><strong>{stats.years}</strong><span>毕业届次</span></div>
        <div><strong>{stats.provinces}</strong><span>覆盖省份</span></div>
        <div><strong>{stats.cities}</strong><span>城市区县</span></div>
        <div><strong>{stats.overseas}</strong><span>海外桃李</span></div>
      </section>

      <footer className="controls">
        <button type="button" className="icon-button" aria-label="上一届" onClick={() => dispatch({ type: "PREVIOUS_YEAR", scenes })}>‹</button>
        <button type="button" className="play-button" aria-label={playback.status === "paused" ? "继续播放" : "暂停播放"} onClick={togglePause}>
          {playback.status === "paused" ? "▶" : "Ⅱ"}
        </button>
        <button type="button" className="icon-button" aria-label="下一届" onClick={() => dispatch({ type: "NEXT_YEAR", scenes })}>›</button>
        <nav className="timeline" aria-label="毕业年份时间轴">
          {scenes.map((scene, index) => (
            <button
              type="button"
              key={scene.year}
              className={index === playback.sceneIndex ? "active" : index < playback.sceneIndex ? "passed" : ""}
              onClick={() => dispatch({ type: "GO_TO_YEAR", scenes, sceneIndex: index })}
              aria-label={`查看${scene.year}届`}
            >
              <i /><span>{scene.year}</span>
            </button>
          ))}
        </nav>
        <label className="speed-control">速度
          <select value={speed} onChange={(event) => setSpeed(Number(event.target.value) as 0.75 | 1 | 1.5)}>
            <option value="0.75">0.75×</option>
            <option value="1">1×</option>
            <option value="1.5">1.5×</option>
          </select>
        </label>
      </footer>

      {!entered && (
        <section className="opening-screen">
          <div className="opening-orbit" aria-hidden="true"><i /><i /><i /></div>
          <p data-testid={config.mentorName ? "mentor-name" : undefined}>
            {config.mentorName ? `致敬 · ${config.mentorName}` : "致敬 · 传承 · 启程"}
          </p>
          <h1>{config.title}</h1>
          <h2>{config.subtitle}</h2>
          <div className="opening-rule"><span /><i />二十余载育英才 · 一片丹心映山河<i /><span /></div>
          <button type="button" onClick={start}>开始桃李之旅</button>
          <small>{ceremonyMode ? "点击后进入全屏并自动播放" : "点击开始 · 可随时暂停或选择年份"}</small>
        </section>
      )}
    </main>
  );
}
