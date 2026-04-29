"""
FastAPI server for the AI Exam Timetable Scheduler.
Serves both the OR-Tools solution and the step-by-step backtracking visualization.
Also serves the React frontend static files in production.
Includes full CRUD endpoints for exams and rooms.
"""

import copy
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional
import os

from data import EXAMS as _DEFAULT_EXAMS, ROOMS as _DEFAULT_ROOMS, TIME_SLOTS, MIN_GAP, SLOTS_PER_DAY
from solver import (
    find_conflicts,
    solve_with_ortools,
    solve_with_backtracking,
)

app = FastAPI(title="AI Exam Timetable Scheduler", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────── In-Memory Mutable State ──────────────────────────

app_state = {
    "exams": copy.deepcopy(_DEFAULT_EXAMS),
    "rooms": copy.deepcopy(_DEFAULT_ROOMS),
}

def _reindex_exams(exams):
    for i, e in enumerate(exams):
        e["id"] = i
    return exams

def _reindex_rooms(rooms):
    for i, r in enumerate(rooms):
        r["id"] = i
    return rooms

# ─────────────────────────── Pydantic Models ──────────────────────────────────

class AddRoomRequest(BaseModel):
    name: str
    capacity: int

class AddExamRequest(BaseModel):
    name: str
    teachers: List[str]
    sections: List[str]
    student_count: int

class UpdateExamRequest(BaseModel):
    name: Optional[str] = None
    teachers: Optional[List[str]] = None
    sections: Optional[List[str]] = None
    student_count: Optional[int] = None

# ─────────────────────────── Read Endpoints ───────────────────────────────────

@app.get("/api/data")
def get_data():
    exams = app_state["exams"]
    rooms = app_state["rooms"]
    section_conflicts, teacher_conflicts = find_conflicts(exams)
    return {
        "exams": exams,
        "rooms": rooms,
        "time_slots": TIME_SLOTS,
        "slots_per_day": SLOTS_PER_DAY,
        "min_gap": MIN_GAP,
        "section_conflicts": [
            {"exam1": exams[i]["name"], "exam2": exams[j]["name"], "shared": s}
            for i, j, s in section_conflicts
        ],
        "teacher_conflicts": [
            {"exam1": exams[i]["name"], "exam2": exams[j]["name"], "shared": s}
            for i, j, s in teacher_conflicts
        ],
    }

@app.get("/api/solve/ortools")
def solve_ortools():
    return solve_with_ortools(
        exams=app_state["exams"],
        rooms=app_state["rooms"],
        time_slots=TIME_SLOTS,
        min_gap=MIN_GAP,
    )

@app.get("/api/solve/backtrack")
def solve_backtrack():
    return solve_with_backtracking(
        exams=app_state["exams"],
        rooms=app_state["rooms"],
        time_slots=TIME_SLOTS,
        min_gap=MIN_GAP,
    )

# ─────────────────────────── Room CRUD ────────────────────────────────────────

@app.post("/api/rooms", status_code=201)
def add_room(req: AddRoomRequest):
    name = req.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Room name cannot be empty.")
    if any(r["name"].lower() == name.lower() for r in app_state["rooms"]):
        raise HTTPException(status_code=409, detail=f"Room '{name}' already exists.")
    new_id = len(app_state["rooms"])
    app_state["rooms"].append({"id": new_id, "name": name, "capacity": req.capacity})
    return {"message": "Room added.", "room": app_state["rooms"][-1]}

@app.delete("/api/rooms/{room_id}", status_code=200)
def delete_room(room_id: int):
    rooms = app_state["rooms"]
    idx = next((i for i, r in enumerate(rooms) if r["id"] == room_id), None)
    if idx is None:
        raise HTTPException(status_code=404, detail="Room not found.")
    deleted = rooms.pop(idx)
    app_state["rooms"] = _reindex_rooms(rooms)
    return {"message": f"Room '{deleted['name']}' deleted."}

# ─────────────────────────── Exam CRUD ────────────────────────────────────────

@app.post("/api/exams", status_code=201)
def add_exam(req: AddExamRequest):
    name = req.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Exam name cannot be empty.")
    teachers = [t.strip() for t in req.teachers if t.strip()]
    sections = [s.strip() for s in req.sections if s.strip()]
    if not teachers:
        raise HTTPException(status_code=400, detail="At least one teacher is required.")
    if not sections:
        raise HTTPException(status_code=400, detail="At least one section is required.")
    if req.student_count <= 0:
        raise HTTPException(status_code=400, detail="Student count must be greater than zero.")
    new_id = len(app_state["exams"])
    new_exam = {
        "id": new_id,
        "name": name,
        "teachers": teachers,
        "sections": sections,
        "student_count": req.student_count,
    }
    app_state["exams"].append(new_exam)
    return {"message": "Exam added.", "exam": new_exam}

@app.put("/api/exams/{exam_id}", status_code=200)
def update_exam(exam_id: int, req: UpdateExamRequest):
    exam = next((e for e in app_state["exams"] if e["id"] == exam_id), None)
    if exam is None:
        raise HTTPException(status_code=404, detail="Exam not found.")
    if req.name is not None:
        name = req.name.strip()
        if not name:
            raise HTTPException(status_code=400, detail="Exam name cannot be empty.")
        exam["name"] = name
    if req.teachers is not None:
        teachers = [t.strip() for t in req.teachers if t.strip()]
        if not teachers:
            raise HTTPException(status_code=400, detail="At least one teacher is required.")
        exam["teachers"] = teachers
    if req.sections is not None:
        sections = [s.strip() for s in req.sections if s.strip()]
        if not sections:
            raise HTTPException(status_code=400, detail="At least one section is required.")
        exam["sections"] = sections
    if req.student_count is not None:
        if req.student_count <= 0:
            raise HTTPException(status_code=400, detail="Student count must be greater than zero.")
        exam["student_count"] = req.student_count
    return {"message": "Exam updated.", "exam": exam}

@app.delete("/api/exams/{exam_id}", status_code=200)
def delete_exam(exam_id: int):
    exams = app_state["exams"]
    idx = next((i for i, e in enumerate(exams) if e["id"] == exam_id), None)
    if idx is None:
        raise HTTPException(status_code=404, detail="Exam not found.")
    deleted = exams.pop(idx)
    app_state["exams"] = _reindex_exams(exams)
    return {"message": f"Exam '{deleted['name']}' deleted."}

# ─────────────────────────── Reset ────────────────────────────────────────────

@app.post("/api/reset", status_code=200)
def reset_data():
    app_state["exams"] = copy.deepcopy(_DEFAULT_EXAMS)
    app_state["rooms"] = copy.deepcopy(_DEFAULT_ROOMS)
    return {"message": "Data reset to defaults."}

# ─────────────────────────── Serve React ──────────────────────────────────────

frontend_dist = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.isdir(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
