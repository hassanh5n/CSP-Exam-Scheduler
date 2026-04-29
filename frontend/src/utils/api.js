const API_BASE = '/api';

// ── Read ──────────────────────────────────────────────────────────────────────

export async function fetchData() {
  const res = await fetch(`${API_BASE}/data`);
  if (!res.ok) throw new Error('Failed to fetch data');
  return res.json();
}

export async function solveOrTools() {
  const res = await fetch(`${API_BASE}/solve/ortools`);
  if (!res.ok) throw new Error('Failed to solve with OR-Tools');
  return res.json();
}

export async function solveBacktrack() {
  const res = await fetch(`${API_BASE}/solve/backtrack`);
  if (!res.ok) throw new Error('Failed to solve with backtracking');
  return res.json();
}

// ── Rooms ─────────────────────────────────────────────────────────────────────

export async function addRoom(name, capacity) {
  const res = await fetch(`${API_BASE}/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, capacity: Number(capacity) }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Failed to add room');
  return data;
}

export async function deleteRoom(roomId) {
  const res = await fetch(`${API_BASE}/rooms/${roomId}`, { method: 'DELETE' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Failed to delete room');
  return data;
}

// ── Exams ─────────────────────────────────────────────────────────────────────

export async function addExam(name, teachers, sections, studentCount) {
  const res = await fetch(`${API_BASE}/exams`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, teachers, sections, student_count: Number(studentCount) }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Failed to add exam');
  return data;
}

export async function updateExam(examId, payload) {
  const res = await fetch(`${API_BASE}/exams/${examId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Failed to update exam');
  return data;
}

export async function deleteExam(examId) {
  const res = await fetch(`${API_BASE}/exams/${examId}`, { method: 'DELETE' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Failed to delete exam');
  return data;
}

// ── Reset ─────────────────────────────────────────────────────────────────────

export async function resetData() {
  const res = await fetch(`${API_BASE}/reset`, { method: 'POST' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Failed to reset data');
  return data;
}
