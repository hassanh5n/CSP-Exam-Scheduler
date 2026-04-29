import React, { useState, useEffect, useRef } from 'react';

/*
 * Visualization — Animates the backtracking CSP solver steps.
 * Shows variable selection, domain pruning, assignments, conflicts, and backtracking.
 */

export default function Visualization({ steps, data, schedule }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(200);
  const logRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (playing && steps && currentStep < steps.length - 1) {
      timerRef.current = setTimeout(() => setCurrentStep(prev => prev + 1), speed);
      return () => clearTimeout(timerRef.current);
    } else if (currentStep >= (steps?.length || 0) - 1) {
      setPlaying(false);
    }
  }, [playing, currentStep, steps, speed]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [currentStep]);

  if (!steps || steps.length === 0) {
    return (
      <div className="card" style={{ padding: 60, textAlign: 'center' }}>
        <div style={{
          width: 40, height: 40, border: '2px solid var(--border-subtle)',
          borderRadius: 3, margin: '0 auto 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-dim)', fontFamily: "'Fira Code', monospace", fontSize: '0.9rem',
        }}>~</div>
        <h3 style={{ color: 'var(--text-body)', fontWeight: 600, marginBottom: 8, fontSize: '1rem' }}>
          No Trace Data
        </h3>
        <p style={{ color: 'var(--text-dim)', fontFamily: "'Fira Code', monospace", fontSize: '0.78rem' }}>
          Click "Trace CSP" to run the backtracking solver.
        </p>
      </div>
    );
  }

  const step = steps[currentStep];
  const visibleSteps = steps.slice(0, currentStep + 1);

  const counts = { assign: 0, conflict: 0, backtrack: 0, select: 0, solution: 0 };
  visibleSteps.forEach(s => { counts[s.type] = (counts[s.type] || 0) + 1; });

  const currentState = step?.state || {};
  const assignedCount = Object.keys(currentState).length;
  const totalExams = data?.exams?.length || 17;

  function getStepText(s) {
    switch (s.type) {
      case 'select': return `SELECT  ${s.exam_name}`;
      case 'assign': return `ASSIGN  ${s.exam_name} -> ${s.slot.day} ${s.slot.time} [${s.room.name}]`;
      case 'conflict':
        if (s.reason === 'min_gap') return `GAP     ${s.exam_name} @ ${s.slot.day} ${s.slot.time} too close to ${s.conflict_name}`;
        if (s.reason === 'same_slot') return `CLASH   ${s.exam_name} @ ${s.slot.day} ${s.slot.time} vs ${s.conflict_name}`;
        if (s.reason === 'same_day') return `DAY-LIM ${s.exam_name} @ ${s.slot.day} — student overlap with ${s.conflict_name}`;
        if (s.reason === 'same_day_teacher') return `DAY-LIM ${s.exam_name} @ ${s.slot.day} — teacher overlap with ${s.conflict_name}`;
        if (s.reason === 'max_per_day') return `DAY-LIM ${s.exam_name} @ ${s.slot?.day ?? '?'} — >2 exams/day for section (conflict: ${s.conflict_name ?? 'unknown'})`;
        if (s.reason === 'no_room') return `FULL    ${s.exam_name} @ ${s.slot?.day} ${s.slot?.time} — no room available`;
        return `CONFLICT ${s.exam_name} @ ${s.slot?.day ?? ''} ${s.slot?.time ?? ''} [${s.reason}]`;
      case 'backtrack': return `REVERT  ${s.exam_name}`;
      case 'solution': return `DONE    All ${totalExams} exams scheduled.`;
      default: return JSON.stringify(s);
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 12 }}>
      {/* Left: Variable state */}
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700 }}>
            Variable State
          </h3>
          <span style={{
            fontFamily: "'Fira Code', monospace", fontSize: '0.72rem', color: 'var(--text-dim)',
          }}>
            step {currentStep + 1}/{steps.length}
          </span>
        </div>

        {/* Progress */}
        <div style={{ height: 3, background: 'var(--border-dim)', borderRadius: 1, marginBottom: 20 }}>
          <div style={{
            height: '100%', width: `${(assignedCount / totalExams) * 100}%`,
            background: 'var(--amber)', borderRadius: 1, transition: 'width 0.3s ease',
          }} />
        </div>

        {/* Mini counters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, fontFamily: "'Fira Code', monospace", fontSize: '0.72rem' }}>
          <CounterChip label="assigned" value={assignedCount} total={totalExams} color="var(--green)" />
          <CounterChip label="conflicts" value={counts.conflict} color="var(--rose)" />
          <CounterChip label="backtracks" value={counts.backtrack} color="#f59e0b" />
        </div>

        {/* Variable grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(195px, 1fr))', gap: 4 }}>
          {data?.exams?.map((exam, i) => {
            const isAssigned = currentState[i] !== undefined;
            const isCurrent = step?.exam_id === i;
            const slotInfo = isAssigned && data.time_slots[currentState[i].slot];
            const roomInfo = isAssigned && data.rooms[currentState[i].room];

            let border = 'var(--border-dim)';
            let bg = 'transparent';
            let cls = '';

            if (isCurrent && step.type === 'conflict') {
              border = 'var(--rose)'; bg = 'var(--rose-dim)'; cls = 'step-conflict';
            } else if (isCurrent && step.type === 'select') {
              border = 'var(--amber)'; bg = 'var(--amber-dim)'; cls = 'step-active';
            } else if (isAssigned) {
              border = 'var(--green)'; bg = 'var(--green-dim)'; cls = 'step-assigned';
            }

            return (
              <div key={i} className={cls} style={{
                padding: '6px 9px', borderRadius: 3,
                border: `1px solid ${border}`, background: bg,
                fontSize: '0.72rem', transition: 'all 0.25s ease',
              }}>
                <div style={{
                  fontWeight: 600, fontFamily: "'Poppins', sans-serif",
                  color: isAssigned ? 'var(--green)' : isCurrent ? 'var(--amber)' : 'var(--text-body)',
                  marginBottom: 1,
                }}>
                  {isCurrent ? '> ' : ''}{exam.name}
                </div>
                <div style={{ fontFamily: "'Fira Code', monospace", fontSize: '0.62rem', color: 'var(--text-dim)' }}>
                  {isAssigned ? `${slotInfo?.day} ${slotInfo?.time} / ${roomInfo?.name}` : 'unassigned'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: Controls + Log */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Playback */}
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, marginBottom: 12, color: 'var(--text-body)' }}>
            Playback
          </div>
          <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
            {[
              { label: '|<', action: () => { setCurrentStep(0); setPlaying(false); } },
              { label: '<<', action: () => setCurrentStep(Math.max(0, currentStep - 1)) },
              { label: playing ? '||' : '>', action: () => setPlaying(!playing), primary: true },
              { label: '>>', action: () => setCurrentStep(Math.min(steps.length - 1, currentStep + 1)) },
              { label: '>|', action: () => { setCurrentStep(steps.length - 1); setPlaying(false); } },
            ].map((b, i) => (
              <button key={i}
                className={b.primary ? 'btn-solve' : 'btn-outline'}
                style={{ padding: '6px 12px', fontSize: '0.75rem', flex: b.primary ? 1 : 'none' }}
                onClick={b.action}
              >{b.label}</button>
            ))}
          </div>
          <div>
            <label style={{ fontFamily: "'Fira Code', monospace", fontSize: '0.68rem', color: 'var(--text-dim)', display: 'block', marginBottom: 4 }}>
              delay: {speed}ms
            </label>
            <input type="range" min={50} max={1000} step={50} value={speed}
              onChange={e => setSpeed(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--amber)' }} />
          </div>
        </div>

        {/* Step Log */}
        <div className="card" style={{ padding: 16, flex: 1 }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, marginBottom: 10, color: 'var(--text-body)' }}>
            Trace Log
          </div>
          <div className="viz-log" ref={logRef}>
            {visibleSteps.map((s, i) => (
              <div key={i} className={`viz-step ${s.type}`}
                style={{ opacity: i === currentStep ? 1 : 0.5, fontWeight: i === currentStep ? 600 : 400 }}>
                <span className="marker" />
                <span>{getStepText(s)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CounterChip({ label, value, total, color }) {
  return (
    <div style={{
      padding: '5px 10px', borderRadius: 2,
      background: `color-mix(in srgb, ${color} 10%, transparent)`,
      border: `1px solid color-mix(in srgb, ${color} 20%, transparent)`,
    }}>
      <span style={{ color, fontWeight: 700 }}>{value}</span>
      {total !== undefined && <span style={{ color: 'var(--text-dim)' }}>/{total}</span>}
      <span style={{ color: 'var(--text-dim)', marginLeft: 6 }}>{label}</span>
    </div>
  );
}
