import type { StudentRecord, YearScene } from "../domain/student-data";
import { getSceneStudents } from "../domain/timeline";

interface PeoplePanelProps {
  scene: YearScene;
  currentStudent: StudentRecord | null;
  revealedIds: Set<string>;
  finale: boolean;
  originLabel: string;
}

export function PeoplePanel({ scene, currentStudent, revealedIds, finale, originLabel }: PeoplePanelProps) {
  const students = getSceneStudents(scene);

  return (
    <aside className="people-panel" aria-label={`${scene.year}届学生名单`}>
      <div className="panel-heading">
        <span>GRADUATES</span>
        <strong>{scene.year}届 · 共{students.length}人</strong>
      </div>

      <div className={currentStudent ? "current-person visible" : "current-person"}>
        <small>{currentStudent ? `${currentStudent.graduationYear}届` : "正在启程"}</small>
        <b>{currentStudent?.name ?? `从${originLabel}出发`}</b>
        <span>{currentStudent?.workLocationRaw ?? "等待下一束光"}</span>
      </div>

      <div className="student-list">
        {students.map((student) => {
          const shown = finale || revealedIds.has(student.id) || scene.overseasStudents.some((item) => item.id === student.id);
          return (
            <div
              key={student.id}
              className={`${shown ? "student-row shown" : "student-row"}${currentStudent?.id === student.id ? " active" : ""}`}
            >
              <i />
              <span>{student.name}</span>
              <small>{student.workLocationRaw}</small>
            </div>
          );
        })}
      </div>

      {scene.overseasStudents.length > 0 && (
        <section className="overseas-card">
          <header><span>✦</span><strong>海外桃李</strong><small>OVERSEAS</small></header>
          {scene.overseasStudents.map((student) => (
            <div key={student.id} className={revealedIds.has(student.id) || finale ? "overseas-person lit" : "overseas-person"}>
              <b>{student.name}</b>
              <span>{student.graduationYear}届</span>
              <small>{student.workLocationRaw}</small>
            </div>
          ))}
        </section>
      )}
    </aside>
  );
}
