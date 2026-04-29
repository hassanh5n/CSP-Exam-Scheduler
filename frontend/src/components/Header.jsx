import React from 'react';
import { Moon, Sun } from 'lucide-react';

export default function Header({ onSolveOrTools, onSolveBacktrack, loading, theme, onToggleTheme }) {
  const isLight = theme === 'light';

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      marginBottom: 28,
      flexWrap: 'wrap',
      gap: 16,
    }}>
      <div>
        <div style={{
          fontFamily: "'Fira Code', monospace",
          fontSize: '0.68rem',
          color: 'var(--text-dim)',
          letterSpacing: '2px',
          textTransform: 'uppercase',
          marginBottom: 6,
        }}>
          Constraint Satisfaction Problem
        </div>
        <h1 style={{
          fontSize: '1.6rem',
          fontWeight: 800,
          color: 'var(--text-bright)',
          letterSpacing: '-0.5px',
          lineHeight: 1.1,
        }}>
          Exam Timetable<br />
          <span style={{ color: 'var(--amber)' }}>Scheduler</span>
        </h1>
        <div style={{
          fontFamily: "'Fira Code', monospace",
          fontSize: '0.7rem',
          color: 'var(--text-dim)',
          marginTop: 8,
        }}>
          Made with OR-Tools
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button
          className="theme-toggle"
          type="button"
          onClick={onToggleTheme}
          aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
          title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
        >
          {isLight ? <Moon size={16} /> : <Sun size={16} />}
        </button>
        <button className="btn-solve" onClick={onSolveOrTools} disabled={loading}>
          {loading ? <span className="spinner" /> : null}
          {loading ? 'Solving...' : 'Solve'}
        </button>
        <button className="btn-outline" onClick={onSolveBacktrack} disabled={loading}>
          Trace CSP
        </button>
      </div>
    </div>
  );
}
