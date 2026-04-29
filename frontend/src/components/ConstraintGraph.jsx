import React, { useEffect, useRef, useState, useCallback } from 'react';

// ─── tiny abbreviation helper ─────────────────────────────────────────────────
function abbr(name, max = 14) {
  if (name.length <= max) return name;
  // keep first word + initials of rest
  const words = name.split(' ');
  if (words.length === 1) return name.slice(0, max - 1) + '…';
  return words[0].slice(0, 8) + ' ' + words.slice(1).map(w => w[0]).join('');
}

// ─── build conflict edges from data ──────────────────────────────────────────
function buildEdges(data) {
  const edgeMap = {};         // key = "min-max"
  const add = (i, j, type) => {
    const k = `${Math.min(i, j)}-${Math.max(i, j)}`;
    if (!edgeMap[k]) edgeMap[k] = { i: Math.min(i, j), j: Math.max(i, j), types: new Set() };
    edgeMap[k].types.add(type);
  };

  (data.section_conflicts || []).forEach(c => {
    const ei = data.exams.findIndex(e => e.name === c.exam1);
    const ej = data.exams.findIndex(e => e.name === c.exam2);
    if (ei >= 0 && ej >= 0) add(ei, ej, 'section');
  });
  (data.teacher_conflicts || []).forEach(c => {
    const ei = data.exams.findIndex(e => e.name === c.exam1);
    const ej = data.exams.findIndex(e => e.name === c.exam2);
    if (ei >= 0 && ej >= 0) add(ei, ej, 'teacher');
  });

  return Object.values(edgeMap).map(e => ({
    ...e,
    types: e.types,
    color: e.types.has('section') && e.types.has('teacher')
      ? '#d4a843'   // amber  – both
      : e.types.has('section')
        ? '#5bb8c4' // cyan   – section
        : '#c4647a' // rose   – teacher
  }));
}

// ─── allowed rooms for an exam ────────────────────────────────────────────────
function allowedRooms(exam, rooms) {
  return rooms.filter(r => (r.capacity || 0) >= (exam.student_count || 0));
}

// ─── force layout (spring/repulsion) ─────────────────────────────────────────
function initNodes(exams, W, H) {
  const cx = W / 2, cy = H / 2, r = Math.min(W, H) * 0.36;
  return exams.map((exam, i) => {
    const angle = (i / exams.length) * 2 * Math.PI - Math.PI / 2;
    return {
      id: i,
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
      vx: 0, vy: 0,
    };
  });
}

function stepForce(nodes, edges, W, H, alpha) {
  const REPEL = 3200;
  const SPRING_LEN = 140;
  const SPRING_K = 0.06;
  const CENTER_K = 0.012;
  const cx = W / 2, cy = H / 2;

  // repulsion
  for (let a = 0; a < nodes.length; a++) {
    for (let b = a + 1; b < nodes.length; b++) {
      const dx = nodes[b].x - nodes[a].x;
      const dy = nodes[b].y - nodes[a].y;
      const d2 = dx * dx + dy * dy + 0.01;
      const f = REPEL / d2;
      const fx = f * dx / Math.sqrt(d2);
      const fy = f * dy / Math.sqrt(d2);
      nodes[a].vx -= fx; nodes[a].vy -= fy;
      nodes[b].vx += fx; nodes[b].vy += fy;
    }
  }

  // spring (edges)
  for (const e of edges) {
    const a = nodes[e.i], b = nodes[e.j];
    const dx = b.x - a.x, dy = b.y - a.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    const f = (d - SPRING_LEN) * SPRING_K;
    const fx = f * dx / d, fy = f * dy / d;
    a.vx += fx; a.vy += fy;
    b.vx -= fx; b.vy -= fy;
  }

  // center gravity
  for (const n of nodes) {
    n.vx += (cx - n.x) * CENTER_K;
    n.vy += (cy - n.y) * CENTER_K;
    n.vx *= 0.85; n.vy *= 0.85;
    n.x += n.vx * alpha;
    n.y += n.vy * alpha;
    // clamp
    const PAD = 48;
    n.x = Math.max(PAD, Math.min(W - PAD, n.x));
    n.y = Math.max(PAD, Math.min(H - PAD, n.y));
  }
}

// ─── main component ───────────────────────────────────────────────────────────
export default function ConstraintGraph({ data, schedule }) {
  const canvasRef = useRef(null);
  const nodesRef = useRef([]);
  const edgesRef = useRef([]);
  const rafRef = useRef(null);
  const alphaRef = useRef(1);
  const dragRef = useRef(null);       // { nodeIdx, offsetX, offsetY }

  const [selected, setSelected] = useState(null);   // exam index
  const [hovered, setHovered] = useState(null);
  const [filter, setFilter] = useState('all');       // 'all' | 'section' | 'teacher' | 'both'
  const [showDomain, setShowDomain] = useState(true);

  const NODE_R = 26;

  // build assignment map from schedule
  const assignMap = {};
  if (schedule) {
    schedule.forEach(entry => {
      const idx = data.exams.findIndex(e => e.name === entry.exam.name);
      if (idx >= 0) assignMap[idx] = entry;
    });
  }

  // initialise on data change
  useEffect(() => {
    if (!data || !canvasRef.current) return;
    const W = canvasRef.current.offsetWidth || 900;
    const H = canvasRef.current.offsetHeight || 600;
    canvasRef.current.width = W;
    canvasRef.current.height = H;
    edgesRef.current = buildEdges(data);
    nodesRef.current = initNodes(data.exams, W, H);
    alphaRef.current = 1;
  }, [data]);

  // draw loop
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;

    // step physics
    if (alphaRef.current > 0.01 && !dragRef.current) {
      stepForce(nodesRef.current, edgesRef.current, W, H, alphaRef.current);
      alphaRef.current *= 0.992;
    }

    ctx.clearRect(0, 0, W, H);

    // filter edges
    const visEdges = edgesRef.current.filter(e => {
      if (filter === 'all') return true;
      if (filter === 'section') return e.types.has('section') && !e.types.has('teacher');
      if (filter === 'teacher') return e.types.has('teacher') && !e.types.has('section');
      if (filter === 'both') return e.types.has('section') && e.types.has('teacher');
      return true;
    });

    // edges
    for (const e of visEdges) {
      const a = nodesRef.current[e.i], b = nodesRef.current[e.j];
      const isRelated = selected !== null && (e.i === selected || e.j === selected);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = isRelated
        ? e.color
        : e.color + '44';
      ctx.lineWidth = isRelated ? 2.2 : 1;
      ctx.stroke();
    }

    // nodes
    nodesRef.current.forEach((n, i) => {
      const exam = data.exams[i];
      const isAssigned = assignMap[i] !== undefined;
      const isSel = selected === i;
      const isHov = hovered === i;

      // connected?
      const connectedToSel = selected !== null && visEdges.some(
        e => (e.i === selected && e.j === i) || (e.j === selected && e.i === i)
      );

      const dimmed = selected !== null && !isSel && !connectedToSel;
      const alpha = dimmed ? 0.28 : 1;

      ctx.globalAlpha = alpha;

      // glow
      if (isSel || isHov) {
        const grd = ctx.createRadialGradient(n.x, n.y, NODE_R * 0.5, n.x, n.y, NODE_R * 2.2);
        grd.addColorStop(0, isAssigned ? 'rgba(91,196,122,0.22)' : 'rgba(212,168,67,0.22)');
        grd.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(n.x, n.y, NODE_R * 2.2, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();
      }

      // circle
      ctx.beginPath();
      ctx.arc(n.x, n.y, NODE_R, 0, Math.PI * 2);
      const baseColor = isAssigned ? '#5bc47a' : '#d4a843';
      ctx.fillStyle = isAssigned
        ? 'rgba(91,196,122,0.15)'
        : 'rgba(212,168,67,0.12)';
      ctx.fill();
      ctx.strokeStyle = isSel ? baseColor : (isHov ? baseColor + 'cc' : baseColor + '66');
      ctx.lineWidth = isSel ? 2.5 : 1.5;
      ctx.stroke();

      // label
      ctx.fillStyle = isAssigned ? '#5bc47a' : '#d4a843';
      ctx.font = `600 9.5px 'Fira Code', monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = abbr(exam.name, 13);
      // wrap at ~13 chars
      const words = label.split(' ');
      let line1 = '', line2 = '';
      for (const w of words) {
        if ((line1 + ' ' + w).trim().length <= 7) line1 = (line1 + ' ' + w).trim();
        else line2 = (line2 + ' ' + w).trim();
      }
      if (line2) {
        ctx.fillText(line1, n.x, n.y - 5.5);
        ctx.fillText(line2, n.x, n.y + 5.5);
      } else {
        ctx.fillText(line1, n.x, n.y);
      }

      // index badge
      ctx.font = `500 8px 'Fira Code', monospace`;
      ctx.fillStyle = '#6b6358';
      ctx.fillText(`#${i + 1}`, n.x, n.y + NODE_R + 10);

      ctx.globalAlpha = 1;
    });

    rafRef.current = requestAnimationFrame(draw);
  }, [data, selected, hovered, filter, schedule]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  // hit test
  const hitNode = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    for (let i = 0; i < nodesRef.current.length; i++) {
      const n = nodesRef.current[i];
      const dx = n.x - mx, dy = n.y - my;
      if (dx * dx + dy * dy <= (NODE_R + 4) ** 2) return i;
    }
    return -1;
  };

  const onMouseMove = (e) => {
    if (dragRef.current !== null) {
      const rect = canvasRef.current.getBoundingClientRect();
      const n = nodesRef.current[dragRef.current];
      n.x = e.clientX - rect.left;
      n.y = e.clientY - rect.top;
      n.vx = 0; n.vy = 0;
      alphaRef.current = 0; // freeze physics while dragging
      return;
    }
    const idx = hitNode(e);
    setHovered(idx >= 0 ? idx : null);
    canvasRef.current.style.cursor = idx >= 0 ? 'grab' : 'default';
  };
  const onMouseDown = (e) => {
    const idx = hitNode(e);
    if (idx >= 0) {
      dragRef.current = idx;
      canvasRef.current.style.cursor = 'grabbing';
    }
  };
  const onMouseUp = (e) => {
    if (dragRef.current !== null) {
      alphaRef.current = 0.3; // resume gently
      dragRef.current = null;
      canvasRef.current.style.cursor = 'grab';
    }
  };
  const onClick = (e) => {
    const idx = hitNode(e);
    setSelected(idx >= 0 ? (selected === idx ? null : idx) : null);
  };

  // ── sidebar content ─────────────────────────────────────────────────────────
  const selExam = selected !== null ? data?.exams[selected] : null;
  const selAssign = selected !== null ? assignMap[selected] : null;
  const selRooms = selExam ? allowedRooms(selExam, data.rooms) : [];
  const selEdges = selected !== null
    ? edgesRef.current.filter(e => e.i === selected || e.j === selected)
    : [];

  if (!data) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)', fontFamily: "'Fira Code', monospace" }}>
        No data loaded — run the backend and fetch data first.
      </div>
    );
  }

  const totalEdges = edgesRef.current.length;
  const sectionOnly = edgesRef.current.filter(e => e.types.has('section') && !e.types.has('teacher')).length;
  const teacherOnly = edgesRef.current.filter(e => e.types.has('teacher') && !e.types.has('section')).length;
  const both = edgesRef.current.filter(e => e.types.has('section') && e.types.has('teacher')).length;

  return (
    <div style={{ display: 'flex', gap: 12, height: 620, position: 'relative' }}>

      {/* ── Canvas ──────────────────────────────────────────────────────────── */}
      <div className="card" style={{ flex: 1, position: 'relative', overflow: 'hidden', padding: 0 }}>
        {/* top bar */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
          background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-dim)',
          flexWrap: 'wrap',
        }}>
          <span style={{ fontFamily: "'Fira Code', monospace", fontSize: '0.7rem', color: 'var(--text-dim)', marginRight: 4 }}>
            filter:
          </span>
          {[
            { id: 'all',     label: 'All',           color: '#a89f91' },
            { id: 'section', label: 'Section',        color: '#5bb8c4' },
            { id: 'teacher', label: 'Teacher',        color: '#c4647a' },
            { id: 'both',    label: 'Both',           color: '#d4a843' },
          ].map(f => (
            <button key={f.id}
              onClick={() => setFilter(f.id)}
              style={{
                fontFamily: "'Fira Code', monospace", fontSize: '0.68rem',
                padding: '3px 10px', borderRadius: 2, cursor: 'pointer',
                border: `1px solid ${filter === f.id ? f.color : f.color + '44'}`,
                background: filter === f.id ? f.color + '22' : 'transparent',
                color: filter === f.id ? f.color : 'var(--text-dim)',
              }}>
              {f.label}
            </button>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 16, fontFamily: "'Fira Code', monospace", fontSize: '0.68rem' }}>
            <span style={{ color: '#5bb8c4' }}>{sectionOnly} section</span>
            <span style={{ color: '#c4647a' }}>{teacherOnly} teacher</span>
            <span style={{ color: '#d4a843' }}>{both} both</span>
            <span style={{ color: 'var(--text-dim)' }}>{totalEdges} total</span>
          </div>
        </div>

        {/* legend */}
        <div style={{
          position: 'absolute', bottom: 12, left: 12, zIndex: 10,
          display: 'flex', flexDirection: 'column', gap: 5,
          fontFamily: "'Fira Code', monospace", fontSize: '0.65rem',
        }}>
          {[
            { color: '#d4a843', label: 'Variable (unassigned)' },
            { color: '#5bc47a', label: 'Variable (assigned)' },
            { color: '#5bb8c4', label: 'Section conflict' },
            { color: '#c4647a', label: 'Teacher conflict' },
            { color: '#d4a843', label: 'Both conflicts' },
          ].map((l, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: i < 2 ? 12 : 20, height: i < 2 ? 12 : 2,
                borderRadius: i < 2 ? '50%' : 0,
                background: l.color,
                opacity: 0.85,
                flexShrink: 0,
              }} />
              <span style={{ color: 'var(--text-dim)' }}>{l.label}</span>
            </div>
          ))}
          <div style={{ color: 'var(--text-dim)', marginTop: 4, opacity: 0.7 }}>
            drag nodes · click to inspect
          </div>
        </div>

        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '100%', display: 'block' }}
          onMouseMove={onMouseMove}
          onMouseDown={onMouseDown}
          onMouseUp={onMouseUp}
          onClick={onClick}
          onMouseLeave={() => { setHovered(null); if (dragRef.current !== null) { dragRef.current = null; alphaRef.current = 0.3; } }}
        />
      </div>

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <div style={{ width: 280, display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>

        {/* Variable panel */}
        <div className="card" style={{ padding: 14 }}>
          <div style={{ fontFamily: "'Fira Code', monospace", fontSize: '0.65rem', color: 'var(--amber)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 10 }}>
            {selExam ? 'Variable' : 'Select a node'}
          </div>

          {selExam ? (
            <>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-bright)', marginBottom: 2 }}>
                {selExam.name}
              </div>
              <div style={{ fontFamily: "'Fira Code', monospace", fontSize: '0.68rem', color: 'var(--text-dim)', marginBottom: 10 }}>
                exam #{selected + 1}
              </div>

              <Row label="Students" value={selExam.student_count} color="var(--green)" />
              <Row label="Sections" value={selExam.sections.join(', ')} color="var(--cyan)" />
              <Row label="Teachers" value={selExam.teachers.join(', ')} color="var(--amber)" mono />

              {selAssign && (
                <div style={{ marginTop: 10, padding: '8px 10px', borderRadius: 3, background: 'var(--green-dim)', border: '1px solid rgba(91,196,122,0.2)' }}>
                  <div style={{ fontFamily: "'Fira Code', monospace", fontSize: '0.65rem', color: 'var(--green)', fontWeight: 700 }}>
                    ✓ ASSIGNED
                  </div>
                  <div style={{ fontFamily: "'Fira Code', monospace", fontSize: '0.68rem', color: 'var(--text-body)', marginTop: 3 }}>
                    {selAssign.slot.day} {selAssign.slot.time}<br />
                    {selAssign.room.name} (cap {selAssign.room.capacity})
                  </div>
                </div>
              )}
            </>
          ) : (
            <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
              Click any exam node on the graph to inspect its variable, domain, and constraints.
            </p>
          )}
        </div>

        {/* Domain panel */}
        {selExam && (
          <div className="card" style={{ padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontFamily: "'Fira Code', monospace", fontSize: '0.65rem', color: 'var(--cyan)', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                Domain
              </div>
              <button onClick={() => setShowDomain(d => !d)}
                style={{ fontFamily: "'Fira Code', monospace", fontSize: '0.65rem', color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer' }}>
                {showDomain ? '▲ hide' : '▼ show'}
              </button>
            </div>
            <div style={{ fontFamily: "'Fira Code', monospace", fontSize: '0.68rem', color: 'var(--text-dim)', marginBottom: 8 }}>
              {data.time_slots.length} slots × {selRooms.length} rooms = {data.time_slots.length * selRooms.length} values
            </div>

            {showDomain && (
              <>
                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-body)', marginBottom: 4 }}>
                  Allowed Rooms ({selRooms.length}/{data.rooms.length})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
                  {data.rooms.map(r => {
                    const ok = (r.capacity || 0) >= (selExam.student_count || 0);
                    return (
                      <span key={r.id} style={{
                        fontFamily: "'Fira Code', monospace", fontSize: '0.62rem',
                        padding: '2px 7px', borderRadius: 2,
                        background: ok ? 'var(--green-dim)' : 'var(--rose-dim)',
                        border: `1px solid ${ok ? 'rgba(91,196,122,0.2)' : 'rgba(196,100,122,0.2)'}`,
                        color: ok ? 'var(--green)' : 'var(--rose)',
                        textDecoration: ok ? 'none' : 'line-through',
                      }}>
                        {r.name} ({r.capacity})
                      </span>
                    );
                  })}
                </div>

                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-body)', marginBottom: 4 }}>
                  Time Slots
                </div>
                {['Thu', 'Fri', 'Mon'].map(day => (
                  <div key={day} style={{ marginBottom: 6 }}>
                    <div style={{ fontFamily: "'Fira Code', monospace", fontSize: '0.62rem', color: 'var(--amber)', marginBottom: 3 }}>{day}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                      {data.time_slots.filter(s => s.day === day).map(s => (
                        <span key={s.id} style={{
                          fontFamily: "'Fira Code', monospace", fontSize: '0.58rem',
                          padding: '1px 5px', borderRadius: 2,
                          background: 'var(--bg-raised)', border: '1px solid var(--border-dim)',
                          color: selAssign?.slot?.id === s.id ? 'var(--green)' : 'var(--text-dim)',
                          fontWeight: selAssign?.slot?.id === s.id ? 700 : 400,
                        }}>
                          {s.time.split(' - ')[0]}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* Constraints for selected node */}
        {selExam && (
          <div className="card" style={{ padding: 14 }}>
            <div style={{ fontFamily: "'Fira Code', monospace", fontSize: '0.65rem', color: 'var(--rose)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 10 }}>
              Constraints ({selEdges.length})
            </div>
            {selEdges.length === 0 ? (
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>No conflicts with other exams.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {selEdges.map((e, k) => {
                  const othIdx = e.i === selected ? e.j : e.i;
                  const oth = data.exams[othIdx];
                  const typeStr = e.types.has('section') && e.types.has('teacher')
                    ? 'section + teacher' : e.types.has('section') ? 'section' : 'teacher';
                  return (
                    <div key={k}
                      onClick={() => setSelected(othIdx)}
                      style={{
                        padding: '6px 9px', borderRadius: 3, cursor: 'pointer',
                        background: 'var(--bg-raised)', border: `1px solid ${e.color}33`,
                        fontSize: '0.7rem',
                      }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-bright)' }}>#{othIdx + 1} {oth.name}</div>
                      <div style={{ fontFamily: "'Fira Code', monospace", fontSize: '0.62rem', color: e.color, marginTop: 2 }}>
                        {typeStr} conflict
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Summary stats */}
        {!selExam && (
          <div className="card" style={{ padding: 14 }}>
            <div style={{ fontFamily: "'Fira Code', monospace", fontSize: '0.65rem', color: 'var(--text-dim)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 10 }}>
              CSP Summary
            </div>
            <Row label="Variables" value={data.exams.length} color="var(--amber)" />
            <Row label="Domains" value={`${data.time_slots.length} slots × rooms`} color="var(--cyan)" />
            <Row label="Constraints" value={totalEdges} color="var(--rose)" />
            <Row label="Rooms" value={data.rooms.length} color="var(--green)" />
            <Row label="Time slots" value={data.time_slots.length} color="var(--text-body)" />
            {schedule && <Row label="Assigned" value={`${Object.keys(assignMap).length}/${data.exams.length}`} color="var(--green)" />}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, color, mono }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, gap: 8 }}>
      <span style={{ fontFamily: "'Fira Code', monospace", fontSize: '0.65rem', color: 'var(--text-dim)', flexShrink: 0 }}>{label}</span>
      <span style={{ fontFamily: mono ? "'Fira Code', monospace" : 'inherit', fontSize: '0.7rem', color, textAlign: 'right', wordBreak: 'break-word' }}>{value}</span>
    </div>
  );
}