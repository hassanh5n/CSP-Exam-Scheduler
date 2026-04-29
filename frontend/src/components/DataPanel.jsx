import React, { useState } from 'react';
import {
  addRoom, deleteRoom,
  addExam, updateExam, deleteExam,
  resetData,
} from '../utils/api.js';

// ─── Small helpers ────────────────────────────────────────────────────────────

function TagList({ items, color = 'var(--cyan)', onRemove }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {items.map((item, i) => (
        <span key={i} style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '2px 8px', borderRadius: 2, fontSize: '0.72rem',
          background: `color-mix(in srgb, ${color} 12%, transparent)`,
          border: `1px solid color-mix(in srgb, ${color} 25%, transparent)`,
          color,
        }}>
          {item}
          {onRemove && (
            <button onClick={() => onRemove(i)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color, fontSize: '0.75rem', padding: 0, lineHeight: 1,
            }}>×</button>
          )}
        </span>
      ))}
    </div>
  );
}

function InlineInput({ placeholder, onAdd, buttonLabel = '+ Add' }) {
  const [val, setVal] = useState('');
  const commit = () => {
    const trimmed = val.trim();
    if (trimmed) { onAdd(trimmed); setVal(''); }
  };
  return (
    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
      <input
        className="input-field"
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && commit()}
        placeholder={placeholder}
        style={{ flex: 1, padding: '5px 10px', fontSize: '0.78rem' }}
      />
      <button className="btn-outline" onClick={commit} style={{ padding: '5px 12px', fontSize: '0.78rem' }}>
        {buttonLabel}
      </button>
    </div>
  );
}

function SectionLabel({ color, label, sub }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
      <div style={{ width: 8, height: 8, borderRadius: 1, background: color }} />
      <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>{label}</h3>
      {sub && <span style={{ fontFamily: "'Fira Code', monospace", fontSize: '0.68rem', color: 'var(--text-dim)' }}>{sub}</span>}
    </div>
  );
}

// ─── Add Room Modal ───────────────────────────────────────────────────────────

function AddRoomForm({ onSaved, onCancel }) {
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim()) { setErr('Room name is required.'); return; }
    if (!capacity || isNaN(capacity) || Number(capacity) <= 0) { setErr('Enter a valid capacity.'); return; }
    setSaving(true);
    try {
      await addRoom(name.trim(), Number(capacity));
      onSaved();
    } catch (e) { setErr(e.message); }
    setSaving(false);
  };

  return (
    <div style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-subtle)', borderRadius: 4, padding: 16, marginTop: 12 }}>
      <div style={{ fontSize: '0.82rem', fontWeight: 600, marginBottom: 12, color: 'var(--cyan)' }}>New Classroom / Room</div>
      {err && <div style={{ color: 'var(--rose)', fontSize: '0.75rem', marginBottom: 8, fontFamily: "'Fira Code', monospace" }}>[ERR] {err}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 8, marginBottom: 10 }}>
        <input className="input-field" placeholder="Room name (e.g. Hall 3)" value={name} onChange={e => setName(e.target.value)} style={{ padding: '7px 10px', fontSize: '0.82rem' }} />
        <input className="input-field" placeholder="Capacity" type="number" min={1} value={capacity} onChange={e => setCapacity(e.target.value)} style={{ padding: '7px 10px', fontSize: '0.82rem' }} />
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="btn-solve" onClick={submit} disabled={saving} style={{ flex: 1, fontSize: '0.8rem', padding: '7px 0' }}>
          {saving ? 'Saving…' : 'Add Room'}
        </button>
        <button className="btn-outline" onClick={onCancel} style={{ fontSize: '0.8rem', padding: '7px 16px' }}>Cancel</button>
      </div>
    </div>
  );
}

// ─── Add Exam Modal ───────────────────────────────────────────────────────────

function AddExamForm({ onSaved, onCancel }) {
  const [name, setName] = useState('');
  const [teachers, setTeachers] = useState([]);
  const [sections, setSections] = useState([]);
  const [studentCount, setStudentCount] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim()) { setErr('Exam name is required.'); return; }
    if (teachers.length === 0) { setErr('Add at least one teacher.'); return; }
    if (sections.length === 0) { setErr('Add at least one student section.'); return; }
    if (!studentCount || isNaN(studentCount) || Number(studentCount) <= 0) { setErr('Enter a valid student count.'); return; }
    setSaving(true);
    try {
      await addExam(name.trim(), teachers, sections, Number(studentCount));
      onSaved();
    } catch (e) { setErr(e.message); }
    setSaving(false);
  };

  return (
    <div style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-subtle)', borderRadius: 4, padding: 16, marginTop: 12 }}>
      <div style={{ fontSize: '0.82rem', fontWeight: 600, marginBottom: 12, color: 'var(--amber)' }}>New Exam</div>
      {err && <div style={{ color: 'var(--rose)', fontSize: '0.75rem', marginBottom: 8, fontFamily: "'Fira Code', monospace" }}>[ERR] {err}</div>}

      <input className="input-field" placeholder="Exam name (e.g. Linear Algebra)" value={name}
        onChange={e => setName(e.target.value)}
        style={{ width: '100%', padding: '7px 10px', fontSize: '0.82rem', marginBottom: 10, boxSizing: 'border-box' }} />

      <input className="input-field" placeholder="Student count" type="number" min={1} value={studentCount}
        onChange={e => setStudentCount(e.target.value)}
        style={{ width: '100%', padding: '7px 10px', fontSize: '0.82rem', marginBottom: 10, boxSizing: 'border-box' }} />

      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginBottom: 4, fontFamily: "'Fira Code', monospace" }}>Teachers</div>
        <TagList items={teachers} color="var(--amber)" onRemove={i => setTeachers(t => t.filter((_, j) => j !== i))} />
        <InlineInput placeholder="Teacher name, press Enter" onAdd={t => setTeachers(prev => [...prev, t])} buttonLabel="+ Teacher" />
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginBottom: 4, fontFamily: "'Fira Code', monospace" }}>Student Sections</div>
        <TagList items={sections} color="var(--cyan)" onRemove={i => setSections(s => s.filter((_, j) => j !== i))} />
        <InlineInput placeholder="Section (e.g. BCS-4), press Enter" onAdd={s => setSections(prev => [...prev, s])} buttonLabel="+ Section" />
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        <button className="btn-solve" onClick={submit} disabled={saving} style={{ flex: 1, fontSize: '0.8rem', padding: '7px 0' }}>
          {saving ? 'Saving…' : 'Add Exam'}
        </button>
        <button className="btn-outline" onClick={onCancel} style={{ fontSize: '0.8rem', padding: '7px 16px' }}>Cancel</button>
      </div>
    </div>
  );
}

// ─── Edit Exam Inline ─────────────────────────────────────────────────────────

function EditExamRow({ exam, onSaved, onCancel }) {
  const [teachers, setTeachers] = useState([...exam.teachers]);
  const [sections, setSections] = useState([...exam.sections]);
  const [studentCount, setStudentCount] = useState(String(exam.student_count || ''));
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (teachers.length === 0) { setErr('At least one teacher required.'); return; }
    if (sections.length === 0) { setErr('At least one section required.'); return; }
    if (!studentCount || isNaN(studentCount) || Number(studentCount) <= 0) { setErr('Enter a valid student count.'); return; }
    setSaving(true);
    try {
      await updateExam(exam.id, { teachers, sections, student_count: Number(studentCount) });
      onSaved();
    } catch (e) { setErr(e.message); }
    setSaving(false);
  };

  return (
    <tr style={{ background: 'var(--bg-raised)' }}>
      <td colSpan={6} style={{ padding: '12px 16px' }}>
        <div style={{ fontSize: '0.82rem', fontWeight: 600, marginBottom: 10, color: 'var(--amber)' }}>Editing: {exam.name}</div>
        {err && <div style={{ color: 'var(--rose)', fontSize: '0.75rem', marginBottom: 8 }}>[ERR] {err}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 140px', gap: 16, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginBottom: 4, fontFamily: "'Fira Code', monospace" }}>Teachers</div>
            <TagList items={teachers} color="var(--amber)" onRemove={i => setTeachers(t => t.filter((_, j) => j !== i))} />
            <InlineInput placeholder="Add teacher…" onAdd={t => setTeachers(p => [...p, t])} buttonLabel="+ Add" />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginBottom: 4, fontFamily: "'Fira Code', monospace" }}>Student Sections</div>
            <TagList items={sections} color="var(--cyan)" onRemove={i => setSections(s => s.filter((_, j) => j !== i))} />
            <InlineInput placeholder="Add section…" onAdd={s => setSections(p => [...p, s])} buttonLabel="+ Add" />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginBottom: 4, fontFamily: "'Fira Code', monospace" }}>Students</div>
            <input className="input-field" type="number" min={1} value={studentCount}
              onChange={e => setStudentCount(e.target.value)}
              style={{ width: '100%', padding: '7px 10px', fontSize: '0.82rem', boxSizing: 'border-box' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn-solve" onClick={submit} disabled={saving} style={{ fontSize: '0.78rem', padding: '6px 16px' }}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          <button className="btn-outline" onClick={onCancel} style={{ fontSize: '0.78rem', padding: '6px 16px' }}>Cancel</button>
        </div>
      </td>
    </tr>
  );
}

// ─── Main DataPanel ───────────────────────────────────────────────────────────

export default function DataPanel({ data, onDataChange }) {
  const [activeTab, setActiveTab] = useState('exams');
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [showAddExam, setShowAddExam] = useState(false);
  const [editingExamId, setEditingExamId] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [actionErr, setActionErr] = useState('');
  const [resetting, setResetting] = useState(false);

  if (!data) {
    return (
      <div className="card" style={{ padding: 40, textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 12px' }} />
        <p style={{ color: 'var(--text-dim)', fontFamily: "'Fira Code', monospace", fontSize: '0.8rem' }}>Loading...</p>
      </div>
    );
  }

  const handleDeleteRoom = async (roomId) => {
    setDeleting(roomId);
    setActionErr('');
    try {
      await deleteRoom(roomId);
      onDataChange?.();
    } catch (e) { setActionErr(e.message); }
    setDeleting(null);
  };

  const handleDeleteExam = async (examId) => {
    setDeleting(examId);
    setActionErr('');
    try {
      await deleteExam(examId);
      onDataChange?.();
    } catch (e) { setActionErr(e.message); }
    setDeleting(null);
  };

  const handleReset = async () => {
    if (!window.confirm('Reset all data to defaults? This cannot be undone.')) return;
    setResetting(true);
    try {
      await resetData();
      onDataChange?.();
    } catch (e) { setActionErr(e.message); }
    setResetting(false);
  };

  const saved = () => { setShowAddRoom(false); setShowAddExam(false); setEditingExamId(null); onDataChange?.(); };

  const tabs = [
    { id: 'exams', label: `Exams (${data.exams.length})` },
    { id: 'rooms', label: `Classrooms (${data.rooms.length})` },
    { id: 'slots', label: 'Time Slots' },
  ];

  return (
    <div>
      {/* Tab bar + Reset */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {tabs.map(t => (
            <button key={t.id} className={`tab-btn ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)} style={{ fontSize: '0.8rem', padding: '6px 14px' }}>
              {t.label}
            </button>
          ))}
        </div>
        <button className="btn-outline" onClick={handleReset} disabled={resetting}
          style={{ fontSize: '0.75rem', padding: '5px 14px', color: 'var(--rose)', borderColor: 'var(--rose)' }}>
          {resetting ? 'Resetting…' : 'Reset to Defaults'}
        </button>
      </div>

      {actionErr && (
        <div style={{ color: 'var(--rose)', fontSize: '0.78rem', marginBottom: 10, fontFamily: "'Fira Code', monospace", padding: '8px 12px', background: 'var(--rose-dim)', borderRadius: 3 }}>
          [ERR] {actionErr}
        </div>
      )}

      {/* ── EXAMS TAB ── */}
      {activeTab === 'exams' && (
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <SectionLabel color="var(--amber)" label="Exams" sub="CSP variables — each exam needs a (slot, room) assignment" />
              <p style={{ fontFamily: "'Fira Code', monospace", fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                To add a teacher or student section to an existing exam, click <strong>Edit</strong> on that row.
              </p>
            </div>
            <button className="btn-solve" onClick={() => { setShowAddExam(!showAddExam); setShowAddRoom(false); }}
              style={{ fontSize: '0.8rem', padding: '7px 16px', whiteSpace: 'nowrap' }}>
              {showAddExam ? '✕ Cancel' : '+ New Exam'}
            </button>
          </div>

          {showAddExam && <AddExamForm onSaved={saved} onCancel={() => setShowAddExam(false)} />}

          <table className="data-table" style={{ marginTop: 12 }}>
            <thead>
              <tr><th>#</th><th>Name</th><th>Students</th><th>Teachers</th><th>Sections</th><th style={{ width: 90 }}>Actions</th></tr>
            </thead>
            <tbody>
              {data.exams.map((exam) => (
                <React.Fragment key={exam.id}>
                  <tr>
                    <td style={{ color: 'var(--amber)', fontFamily: "'Fira Code', monospace", fontWeight: 600 }}>{exam.id + 1}</td>
                    <td style={{ fontWeight: 600, color: 'var(--text-bright)' }}>{exam.name}</td>
                    <td style={{ color: 'var(--green)', fontFamily: "'Fira Code', monospace", fontWeight: 600 }}>
                      {exam.student_count || 0}
                    </td>
                    <td style={{ fontSize: '0.75rem' }}>
                      <TagList items={exam.teachers} color="var(--amber)" />
                    </td>
                    <td>
                      <TagList items={exam.sections} color="var(--cyan)" />
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn-outline" onClick={() => setEditingExamId(editingExamId === exam.id ? null : exam.id)}
                          style={{ fontSize: '0.68rem', padding: '3px 8px', color: 'var(--amber)', borderColor: 'var(--amber)' }}>
                          {editingExamId === exam.id ? 'Close' : 'Edit'}
                        </button>
                        <button className="btn-outline" onClick={() => handleDeleteExam(exam.id)}
                          disabled={deleting === exam.id}
                          style={{ fontSize: '0.68rem', padding: '3px 8px', color: 'var(--rose)', borderColor: 'var(--rose)' }}>
                          {deleting === exam.id ? '…' : 'Del'}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {editingExamId === exam.id && (
                    <EditExamRow exam={exam} onSaved={saved} onCancel={() => setEditingExamId(null)} />
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── CLASSROOMS TAB ── */}
      {activeTab === 'rooms' && (
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <SectionLabel color="var(--cyan)" label="Classrooms / Rooms" sub="Venues available for exam scheduling" />
            <button className="btn-solve" onClick={() => { setShowAddRoom(!showAddRoom); setShowAddExam(false); }}
              style={{ fontSize: '0.8rem', padding: '7px 16px', whiteSpace: 'nowrap' }}>
              {showAddRoom ? '✕ Cancel' : '+ New Room'}
            </button>
          </div>

          {showAddRoom && <AddRoomForm onSaved={saved} onCancel={() => setShowAddRoom(false)} />}

          <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
            {data.rooms.map((room) => (
              <div key={room.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 14px', borderRadius: 3,
                background: 'var(--bg-raised)', border: '1px solid var(--border-dim)',
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-bright)' }}>{room.name}</div>
                  <div style={{ fontFamily: "'Fira Code', monospace", fontSize: '0.68rem', color: 'var(--cyan)', marginTop: 2 }}>
                    capacity: {room.capacity}
                  </div>
                </div>
                <button className="btn-outline" onClick={() => handleDeleteRoom(room.id)}
                  disabled={deleting === room.id}
                  style={{ fontSize: '0.7rem', padding: '3px 9px', color: 'var(--rose)', borderColor: 'var(--rose)' }}>
                  {deleting === room.id ? '…' : 'Del'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TIME SLOTS TAB ── */}
      {activeTab === 'slots' && (
        <div className="card" style={{ padding: 20 }}>
          <SectionLabel color="var(--green)" label="Time Slots" sub={`${data.time_slots.length} slots / 3 days / min gap: ${data.min_gap}`} />
          <p style={{ fontFamily: "'Fira Code', monospace", fontSize: '0.72rem', color: 'var(--text-dim)', marginBottom: 16 }}>
            Time slots are fixed and defined in <code>data.py</code> on the backend.
          </p>
          {['Thu', 'Fri', 'Mon'].map(day => {
            const daySlots = data.time_slots.filter(s => s.day === day);
            const dayName = day === 'Thu' ? 'Thursday' : day === 'Fri' ? 'Friday' : 'Monday';
            return (
              <div key={day} style={{ marginBottom: 16 }}>
                <div style={{ fontFamily: "'Fira Code', monospace", fontSize: '0.75rem', fontWeight: 700, color: 'var(--amber)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '1px' }}>
                  {dayName} — {daySlots.length} slots
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {daySlots.map((slot, j) => (
                    <span key={j} style={{
                      fontFamily: "'Fira Code', monospace", fontSize: '0.7rem',
                      padding: '4px 10px', borderRadius: 2,
                      background: 'var(--bg-raised)', border: '1px solid var(--border-dim)',
                      color: 'var(--text-body)',
                    }}>
                      {slot.time}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
