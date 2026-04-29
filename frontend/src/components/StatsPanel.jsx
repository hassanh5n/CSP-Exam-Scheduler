import React from 'react';

export default function StatsPanel({ numExams, numRooms, numSlots, numStudents, solveTime, numConflicts }) {
  const stats = [
    { label: 'Exams', value: numExams, color: 'var(--amber)' },
    { label: 'Students', value: numStudents, color: 'var(--green)' },
    { label: 'Rooms', value: numRooms, color: 'var(--cyan)' },
    { label: 'Slots', value: numSlots, color: 'var(--green)' },
    { label: 'Conflicts', value: numConflicts, color: 'var(--rose)' },
    { label: 'Solve Time', value: solveTime !== null ? `${solveTime}s` : '—', color: 'var(--amber)' },
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(6, 1fr)',
      gap: 8,
      marginBottom: 28,
    }}>
      {stats.map((s, i) => (
        <div key={i} className="card stat-card">
          <div className="stat-indicator" style={{ background: s.color }} />
          <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
          <div className="stat-label">{s.label}</div>
        </div>
      ))}
    </div>
  );
}
