import React from 'react';

export default function ConflictPanel({ data }) {
  if (!data) {
    return (
      <div className="card" style={{ padding: 40, textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 12px' }} />
        <p style={{ color: 'var(--text-dim)', fontFamily: "'Fira Code', monospace", fontSize: '0.8rem' }}>Loading...</p>
      </div>
    );
  }

  const { section_conflicts = [], teacher_conflicts = [] } = data;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: 1, background: 'var(--cyan)' }} />
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Section Conflicts</h3>
        </div>
        <p style={{ fontFamily: "'Fira Code', monospace", fontSize: '0.72rem', color: 'var(--text-dim)', marginBottom: 16 }}>
          Shared student groups — mutually exclusive scheduling
        </p>
        {section_conflicts.length === 0 ? (
          <p style={{ color: 'var(--text-dim)', textAlign: 'center', padding: 20, fontFamily: "'Fira Code', monospace", fontSize: '0.78rem' }}>
            No section conflicts.
          </p>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Exam 1</th><th>Exam 2</th><th>Shared</th></tr>
            </thead>
            <tbody>
              {section_conflicts.map((c, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 500, color: 'var(--text-bright)' }}>{c.exam1}</td>
                  <td style={{ fontWeight: 500, color: 'var(--text-bright)' }}>{c.exam2}</td>
                  <td>
                    {c.shared.map((s, j) => (
                      <span key={j} className="tag tag-section" style={{ marginRight: 3 }}>{s}</span>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div style={{ marginTop: 12, fontFamily: "'Fira Code', monospace", fontSize: '0.72rem', color: 'var(--text-dim)' }}>
          total: <span style={{ color: 'var(--cyan)', fontWeight: 700 }}>{section_conflicts.length}</span>
        </div>
      </div>

      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: 1, background: 'var(--amber)' }} />
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Teacher Conflicts</h3>
        </div>
        <p style={{ fontFamily: "'Fira Code', monospace", fontSize: '0.72rem', color: 'var(--text-dim)', marginBottom: 16 }}>
          Shared invigilators — mutually exclusive scheduling
        </p>
        {teacher_conflicts.length === 0 ? (
          <p style={{ color: 'var(--text-dim)', textAlign: 'center', padding: 20, fontFamily: "'Fira Code', monospace", fontSize: '0.78rem' }}>
            No teacher conflicts.
          </p>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Exam 1</th><th>Exam 2</th><th>Shared</th></tr>
            </thead>
            <tbody>
              {teacher_conflicts.map((c, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 500, color: 'var(--text-bright)' }}>{c.exam1}</td>
                  <td style={{ fontWeight: 500, color: 'var(--text-bright)' }}>{c.exam2}</td>
                  <td>
                    {c.shared.map((s, j) => (
                      <span key={j} className="tag tag-teacher" style={{ marginRight: 3 }}>{s}</span>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div style={{ marginTop: 12, fontFamily: "'Fira Code', monospace", fontSize: '0.72rem', color: 'var(--text-dim)' }}>
          total: <span style={{ color: 'var(--amber)', fontWeight: 700 }}>{teacher_conflicts.length}</span>
        </div>
      </div>
    </div>
  );
}
