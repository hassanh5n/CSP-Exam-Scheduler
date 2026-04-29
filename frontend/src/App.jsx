import React, { useState, useEffect } from 'react';
import Header from './components/Header.jsx';
import StatsPanel from './components/StatsPanel.jsx';
import TimetableGrid from './components/TimetableGrid.jsx';
import Visualization from './components/Visualization.jsx';
import ConflictPanel from './components/ConflictPanel.jsx';
import DataPanel from './components/DataPanel.jsx';
import { fetchData, solveOrTools, solveBacktrack } from './utils/api.js';

export default function App() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('exam-scheduler-theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });
  const [data, setData] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [vizSteps, setVizSteps] = useState(null);
  const [solveTime, setSolveTime] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('timetable');
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData()
      .then(setData)
      .catch(() => setError('Cannot reach backend. Start the Python server on port 8000.'));
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('exam-scheduler-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(current => current === 'light' ? 'dark' : 'light');
  };

  const handleSolveOrTools = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await solveOrTools();
      if (result.status === 'success') {
        setSchedule(result.schedule);
        setSolveTime(result.solve_time);
        setActiveTab('timetable');
      } else {
        setError('No feasible solution found. Adjust constraints.');
      }
    } catch (e) {
      setError('Solver error: ' + e.message);
    }
    setLoading(false);
  };

  const handleSolveBacktrack = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await solveBacktrack();
      if (result.status === 'success') {
        setSchedule(result.schedule);
        setVizSteps(result.steps);
        setSolveTime(result.solve_time);
        setActiveTab('visualization');
      } else {
        setError('Backtracking solver failed.');
      }
    } catch (e) {
      setError('Solver error: ' + e.message);
    }
    setLoading(false);
  };

  const tabs = [
    { id: 'timetable', label: 'Schedule' },
    { id: 'visualization', label: 'CSP Trace' },
    { id: 'conflicts', label: 'Constraints' },
    { id: 'data', label: 'Input Data' },
  ];

  return (
    <div style={{ minHeight: '100vh', padding: '28px 32px', maxWidth: 1440, margin: '0 auto' }}>
      <div className="animate-in">
        <Header
          onSolveOrTools={handleSolveOrTools}
          onSolveBacktrack={handleSolveBacktrack}
          loading={loading}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      </div>

      {data && (
        <div className="animate-in delay-1">
            <StatsPanel
              numExams={data.exams.length}
              numRooms={data.rooms.length}
              numSlots={data.time_slots.length}
              numStudents={data.exams.reduce((sum, exam) => sum + (Number(exam.student_count) || 0), 0)}
              solveTime={solveTime}
              numConflicts={(data.section_conflicts?.length || 0) + (data.teacher_conflicts?.length || 0)}
            />
        </div>
      )}

      {error && (
        <div className="animate-in" style={{
          background: 'var(--rose-dim)',
          border: '1px solid rgba(196, 100, 122, 0.25)',
          borderRadius: 3,
          padding: '12px 18px',
          marginBottom: 20,
          color: 'var(--rose)',
          fontFamily: "'Fira Code', monospace",
          fontSize: '0.82rem',
        }}>
          [ERR] {error}
        </div>
      )}

      <div className="animate-in delay-2 tab-bar">
        {tabs.map(t => (
          <button key={t.id} className={`tab-btn ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="animate-in delay-3">
        {activeTab === 'timetable' && <TimetableGrid schedule={schedule} data={data} />}
        {activeTab === 'visualization' && <Visualization steps={vizSteps} data={data} schedule={schedule} />}
        {activeTab === 'conflicts' && <ConflictPanel data={data} />}
        {activeTab === 'data' && (
          <DataPanel
            data={data}
            onDataChange={() => fetchData().then(setData).catch(() => {})}
          />
        )}
      </div>
    </div>
  );
}
