import React from 'react';

/*
 * TimetableGrid — Displays the solved exam schedule in a Day x Time grid.
 * Uses color-coded left-border chips with no emojis.
 */

const PALETTES = [
  { bg: 'rgba(212, 168, 67, 0.10)', border: '#d4a843', text: '#d4a843' },
  { bg: 'rgba(91, 184, 196, 0.10)', border: '#5bb8c4', text: '#5bb8c4' },
  { bg: 'rgba(91, 196, 122, 0.10)', border: '#5bc47a', text: '#5bc47a' },
  { bg: 'rgba(196, 100, 122, 0.10)', border: '#c4647a', text: '#c4647a' },
  { bg: 'rgba(168, 139, 250, 0.10)', border: '#a88bfa', text: '#a88bfa' },
  { bg: 'rgba(251, 146, 60, 0.10)', border: '#fb923c', text: '#fb923c' },
  { bg: 'rgba(34, 211, 238, 0.10)', border: '#22d3ee', text: '#22d3ee' },
  { bg: 'rgba(232, 121, 249, 0.10)', border: '#e879f9', text: '#e879f9' },
  { bg: 'rgba(163, 230, 53, 0.10)', border: '#a3e635', text: '#a3e635' },
  { bg: 'rgba(248, 113, 113, 0.10)', border: '#f87171', text: '#f87171' },
];

function getPalette(i) { return PALETTES[i % PALETTES.length]; }

export default function TimetableGrid({ schedule, data }) {
  if (!data) {
    return (
      <div className="card" style={{ padding: 40, textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 12px' }} />
        <p style={{ color: 'var(--text-dim)', fontFamily: "'Fira Code', monospace", fontSize: '0.8rem' }}>Loading...</p>
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="card" style={{ padding: 60, textAlign: 'center' }}>
        <div style={{
          width: 40, height: 40, border: '2px solid var(--border-subtle)',
          borderRadius: 3, margin: '0 auto 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-dim)', fontFamily: "'Fira Code', monospace", fontSize: '0.9rem',
        }}>?</div>
        <h3 style={{ color: 'var(--text-body)', fontWeight: 600, marginBottom: 8, fontSize: '1rem' }}>
          No Schedule Generated
        </h3>
        <p style={{ color: 'var(--text-dim)', fontFamily: "'Fira Code', monospace", fontSize: '0.78rem' }}>
          Run the solver to generate a timetable.
        </p>
      </div>
    );
  }

  const days = ['Thu', 'Fri', 'Mon'];
  const slotsPerDay = data.slots_per_day || 8;
  const timeLabels = [];
  for (let i = 0; i < slotsPerDay; i++) {
    const slot = data.time_slots[i];
    timeLabels.push(slot ? slot.time : `Slot ${i + 1}`);
  }

  const grid = {};
  days.forEach(day => {
    grid[day] = {};
    for (let i = 0; i < slotsPerDay; i++) grid[day][i] = [];
  });

  schedule.forEach((entry, idx) => {
    const day = entry.slot.day;
    const slotIndex = entry.slot.id % slotsPerDay;
    if (grid[day] && grid[day][slotIndex] !== undefined) {
      grid[day][slotIndex].push({ ...entry, colorIndex: idx });
    }
  });

  return (
    <div className="card" style={{ padding: 12, overflow: 'auto' }}>
      <div className="timetable-grid" style={{ gridTemplateColumns: `90px repeat(${days.length}, 1fr)` }}>
        <div className="timetable-header">Time</div>
        {days.map(d => (
          <div key={d} className="timetable-header">{d}</div>
        ))}

        {timeLabels.map((time, si) => (
          <React.Fragment key={si}>
            <div className="timetable-time">{time}</div>
            {days.map(day => {
              const exams = grid[day][si] || [];
              return (
                <div key={`${day}-${si}`} className="timetable-cell">
                  {exams.map((entry, i) => {
                    const p = getPalette(entry.colorIndex);
                    return (
                      <div key={i} className="exam-chip" style={{
                        background: p.bg, borderLeftColor: p.border, color: p.text,
                      }}
                        title={`${entry.exam.name}\nStudents: ${entry.exam.student_count || 0}\nRoom: ${entry.room.name} (${entry.room.capacity})\nTeachers: ${entry.exam.teachers.join(', ')}\nSections: ${entry.exam.sections.join(', ')}`}
                      >
                        <div className="exam-chip-title">{entry.exam.name}</div>
                        <div className="exam-chip-meta">
                          {entry.room.name} / {entry.exam.student_count || 0} students
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
