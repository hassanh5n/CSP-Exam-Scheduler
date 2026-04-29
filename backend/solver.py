"""
CSP Solver for Exam Timetable Scheduling.
Contains:
  1. OR-Tools CP-SAT solver for optimal solution generation.
  2. Custom backtracking solver that logs each step for visualization.
"""

import time
import copy
import os
from ortools.sat.python import cp_model
from data import EXAMS, ROOMS, TIME_SLOTS, MIN_GAP, SLOTS_PER_DAY


#Conflict Detection
def find_conflicts(exams):
    """Build conflict graph: pairs of exams sharing sections or teachers."""
    section_conflicts = []
    teacher_conflicts = []

    for i in range(len(exams)):
        for j in range(i + 1, len(exams)):
            shared_sections = set(exams[i]["sections"]) & set(exams[j]["sections"])
            if shared_sections:
                section_conflicts.append((i, j, list(shared_sections)))

            shared_teachers = set(exams[i]["teachers"]) & set(exams[j]["teachers"])
            if shared_teachers:
                teacher_conflicts.append((i, j, list(shared_teachers)))

    return section_conflicts, teacher_conflicts


def build_conflict_set(section_conflicts, teacher_conflicts):
    """Return a set of (i,j) pairs that conflict for any reason."""
    conflicts = set()
    for i, j, _ in section_conflicts:
        conflicts.add((i, j))
    for i, j, _ in teacher_conflicts:
        conflicts.add((i, j))
    return conflicts


def exam_student_count(exam):
    """Return the student count for an exam, defaulting old data to 0."""
    return int(exam.get("student_count", 0) or 0)


def room_capacity(room):
    """Return room capacity, defaulting old data to 0."""
    return int(room.get("capacity", 0) or 0)


def allowed_rooms_for_exam(exam, rooms):
    """Return room indexes that can hold the exam."""
    required = exam_student_count(exam)
    return [i for i, room in enumerate(rooms) if room_capacity(room) >= required]


def count_days(n_slots):
    """Return how many timetable days are represented by the slot list."""
    return max(1, (n_slots + SLOTS_PER_DAY - 1) // SLOTS_PER_DAY)


#OR-Tools Solver

def solve_with_ortools(exams=None, rooms=None, time_slots=None, min_gap=None):
    """Solve the exam timetabling CSP using OR-Tools CP-SAT solver."""
    exams = exams or EXAMS
    rooms = rooms or ROOMS
    time_slots = time_slots or TIME_SLOTS
    min_gap = min_gap if min_gap is not None else MIN_GAP

    n_exams = len(exams)
    n_rooms = len(rooms)
    n_slots = len(time_slots)
    n_days = count_days(n_slots)

    if n_exams == 0:
        return {"status": "success", "schedule": [], "solve_time": 0}
    if n_rooms == 0 or n_slots == 0:
        return {"status": "infeasible", "solve_time": 0, "reason": "No rooms or time slots available."}

    allowed_room_lists = [allowed_rooms_for_exam(exam, rooms) for exam in exams]
    for exam, allowed in zip(exams, allowed_room_lists):
        if not allowed:
            return {
                "status": "infeasible",
                "solve_time": 0,
                "reason": f"No room can hold {exam['name']} ({exam_student_count(exam)} students).",
            }

    section_conflicts, teacher_conflicts = find_conflicts(exams)
    all_conflicts = build_conflict_set(section_conflicts, teacher_conflicts)

    model = cp_model.CpModel()

    # Decision variables
    slot_vars = [model.NewIntVar(0, n_slots - 1, f"slot_{i}") for i in range(n_exams)]
    room_vars = [model.NewIntVar(0, n_rooms - 1, f"room_{i}") for i in range(n_exams)]

    # Constraint 1: Each exam must use a room with enough seats.
    for i, allowed_rooms in enumerate(allowed_room_lists):
        model.AddAllowedAssignments([room_vars[i]], [[r] for r in allowed_rooms])

    # Constraint 2: No two exams in the same room at the same time.
    # place = slot * number_of_rooms + room, so each (slot, room) pair is unique.
    place_vars = []
    for i in range(n_exams):
        place = model.NewIntVar(0, n_slots * n_rooms - 1, f"place_{i}")
        model.Add(place == slot_vars[i] * n_rooms + room_vars[i])
        place_vars.append(place)
    model.AddAllDifferent(place_vars)

    # Compute day variable for each exam.
    day_vars = []
    for i in range(n_exams):
        dv = model.NewIntVar(0, n_days - 1, f"day_{i}")
        model.AddDivisionEquality(dv, slot_vars[i], SLOTS_PER_DAY)
        day_vars.append(dv)

    # Constraint 3: Conflicting exams cannot be too close on the same day.
    # min_gap=1 means at least one empty slot between them, so abs(slot_i-slot_j) >= 2.
    required_gap = max(1, min_gap + 1)
    for i, j in sorted(all_conflicts):
        same_day = model.NewBoolVar(f"same_day_{i}_{j}")
        model.Add(day_vars[i] == day_vars[j]).OnlyEnforceIf(same_day)
        model.Add(day_vars[i] != day_vars[j]).OnlyEnforceIf(same_day.Not())
        slot_distance = model.NewIntVar(0, n_slots - 1, f"slot_distance_{i}_{j}")
        model.AddAbsEquality(slot_distance, slot_vars[i] - slot_vars[j])
        model.Add(slot_distance >= required_gap).OnlyEnforceIf(same_day)

    #Constraint 3: At most 2 exams per day for each student section
    #no student has more than 2 exams on the same day
    section_to_exams = {}
    for exam_id, exam in enumerate(exams):
        for sec in exam["sections"]:
            section_to_exams.setdefault(sec, []).append(exam_id)

    for sec, exam_ids in section_to_exams.items():
        if len(exam_ids) <= 2:
            # With 2 or fewer exams, different slots (already done)
            continue
        # For each day, at most 2 exams from this section
        for day in range(n_days):
            day_bools = []
            for eid in exam_ids:
                b = model.NewBoolVar(f"sec_{sec}_e{eid}_d{day}")
                model.Add(day_vars[eid] == day).OnlyEnforceIf(b)
                model.Add(day_vars[eid] != day).OnlyEnforceIf(b.Not())
                day_bools.append(b)
            model.Add(sum(day_bools) <= 2)

    #prefer tight room fits, earlier daily slots, and balanced day loads.
    room_capacities = [room_capacity(room) for room in rooms]
    max_room_capacity = max(room_capacities)
    room_waste_vars = []
    slot_position_vars = []

    for i, exam in enumerate(exams):
        assigned_capacity = model.NewIntVar(0, max_room_capacity, f"assigned_capacity_{i}")
        model.AddElement(room_vars[i], room_capacities, assigned_capacity)

        room_waste = model.NewIntVar(0, max_room_capacity, f"room_waste_{i}")
        model.Add(room_waste == assigned_capacity - exam_student_count(exam))
        room_waste_vars.append(room_waste)

        slot_position = model.NewIntVar(0, SLOTS_PER_DAY - 1, f"slot_position_{i}")
        model.AddModuloEquality(slot_position, slot_vars[i], SLOTS_PER_DAY)
        slot_position_vars.append(slot_position)

    day_load_vars = []
    for day in range(n_days):
        day_bools = []
        for i in range(n_exams):
            b = model.NewBoolVar(f"exam_{i}_on_day_{day}")
            model.Add(day_vars[i] == day).OnlyEnforceIf(b)
            model.Add(day_vars[i] != day).OnlyEnforceIf(b.Not())
            day_bools.append(b)
        day_load = model.NewIntVar(0, n_exams, f"day_load_{day}")
        model.Add(day_load == sum(day_bools))
        day_load_vars.append(day_load)

    max_day_load = model.NewIntVar(0, n_exams, "max_day_load")
    min_day_load = model.NewIntVar(0, n_exams, "min_day_load")
    day_imbalance = model.NewIntVar(0, n_exams, "day_imbalance")
    model.AddMaxEquality(max_day_load, day_load_vars)
    model.AddMinEquality(min_day_load, day_load_vars)
    model.Add(day_imbalance == max_day_load - min_day_load)

    objective_terms = []
    objective_terms.extend(room_waste_vars)
    objective_terms.extend(slot_position_vars)
    objective_terms.append(day_imbalance * 20)
    model.Minimize(sum(objective_terms))

    #Teacher conflict, different time slots
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 30
    solver.parameters.num_search_workers = min(8, os.cpu_count() or 1)

    t0 = time.time()
    status = solver.Solve(model)
    solve_time = round(time.time() - t0, 4)

    if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        schedule = []
        for i in range(n_exams):
            sid = solver.Value(slot_vars[i])
            rid = solver.Value(room_vars[i])
            schedule.append({
                "exam": exams[i],
                "slot": time_slots[sid],
                "room": rooms[rid],
            })
        return {
            "status": "success",
            "schedule": schedule,
            "solve_time": solve_time,
            "objective_value": round(solver.ObjectiveValue(), 2),
            "section_conflicts": [
                {"exam1": exams[i]["name"], "exam2": exams[j]["name"], "shared": s}
                for i, j, s in section_conflicts
            ],
            "teacher_conflicts": [
                {"exam1": exams[i]["name"], "exam2": exams[j]["name"], "shared": s}
                for i, j, s in teacher_conflicts
            ],
        }
    else:
        return {"status": "infeasible", "solve_time": solve_time}


#Backtracking Solver (Visualization)
def solve_with_backtracking(exams=None, rooms=None, time_slots=None, min_gap=None):
    """
    Custom backtracking CSP solver that records every step for UI visualization.
    Uses MRV (Minimum Remaining Values) heuristic and forward checking.
    """
    exams = exams or EXAMS
    rooms = rooms or ROOMS
    time_slots = time_slots or TIME_SLOTS
    min_gap = min_gap if min_gap is not None else MIN_GAP

    n_exams = len(exams)
    n_rooms = len(rooms)
    n_slots = len(time_slots)
    n_days = count_days(n_slots)

    if n_exams == 0:
        return {"status": "success", "schedule": [], "steps": [], "solve_time": 0, "total_steps": 0}
    if n_rooms == 0 or n_slots == 0:
        return {"status": "infeasible", "steps": [], "solve_time": 0, "reason": "No rooms or time slots available."}

    allowed_room_lists = [allowed_rooms_for_exam(exam, rooms) for exam in exams]
    for exam, allowed in zip(exams, allowed_room_lists):
        if not allowed:
            return {
                "status": "infeasible",
                "steps": [],
                "solve_time": 0,
                "reason": f"No room can hold {exam['name']} ({exam_student_count(exam)} students).",
            }

    section_conflicts, teacher_conflicts = find_conflicts(exams)
    all_conflicts = build_conflict_set(section_conflicts, teacher_conflicts)

    # Build adjacency lists: separate section and teacher neighbors
    section_neighbors = {i: set() for i in range(n_exams)}
    teacher_neighbors = {i: set() for i in range(n_exams)}
    for i, j, _ in section_conflicts:
        section_neighbors[i].add(j)
        section_neighbors[j].add(i)
    for i, j, _ in teacher_conflicts:
        teacher_neighbors[i].add(j)
        teacher_neighbors[j].add(i)

    # Combined neighbors for general conflict checking
    neighbors = {i: section_neighbors[i] | teacher_neighbors[i] for i in range(n_exams)}

    # Build section-to-exams map for day counting
    section_to_exams = {}
    for exam_id, exam in enumerate(exams):
        for sec in exam["sections"]:
            section_to_exams.setdefault(sec, []).append(exam_id)

    # Map each exam to its sections for quick lookup
    exam_sections = {exam_id: exam["sections"] for exam_id, exam in enumerate(exams)}

    # Domain: each exam can be assigned to any slot; room assigned greedily
    domains = {i: list(range(n_slots)) for i in range(n_exams)}

    assignment = {}  # exam_id -> {"slot": int, "room": int}
    steps = []       # log of every decision for visualization

    def is_consistent(exam_id, slot_id):
        """Check if assigning slot_id to exam_id violates any constraint."""
        exam_day = slot_id // SLOTS_PER_DAY
        required_gap = max(1, min_gap + 1)

        # Shared sections or teachers need enough space between exams on the same day.
        for nb in neighbors[exam_id]:
            if nb in assignment:
                nb_slot = assignment[nb]["slot"]
                if nb_slot // SLOTS_PER_DAY == exam_day:
                    slot_distance = abs(nb_slot - slot_id)
                    if slot_distance < required_gap:
                        return False, nb, "same_slot" if slot_distance == 0 else "min_gap"

        # Check section conflicts: no same time slot
        for nb in section_neighbors[exam_id]:
            if nb in assignment:
                if assignment[nb]["slot"] == slot_id:
                    return False, nb, "same_slot"

        # Check max 2 exams per day per section
        for sec in exam_sections[exam_id]:
            day_count = 0
            for other_eid in section_to_exams[sec]:
                if other_eid != exam_id and other_eid in assignment:
                    if assignment[other_eid]["slot"] // SLOTS_PER_DAY == exam_day:
                        day_count += 1
            if day_count >= 2:
                # Find one of the conflicting exams for the log
                for other_eid in section_to_exams[sec]:
                    if other_eid != exam_id and other_eid in assignment:
                        if assignment[other_eid]["slot"] // SLOTS_PER_DAY == exam_day:
                            return False, other_eid, "max_per_day"

        # Check teacher conflicts: must be at different time slots
        for nb in teacher_neighbors[exam_id]:
            if nb in assignment:
                if assignment[nb]["slot"] == slot_id:
                    return False, nb, "same_slot"

        return True, None, None

    def find_room(exam_id, slot_id):
        """Find the smallest available room that can hold the exam."""
        used_rooms = set()
        for eid, asgn in assignment.items():
            if asgn["slot"] == slot_id:
                used_rooms.add(asgn["room"])
        for r in sorted(allowed_room_lists[exam_id], key=lambda rid: room_capacity(rooms[rid])):
            if r not in used_rooms:
                return r
        return None

    def select_mrv():
        """Select the unassigned variable with the fewest legal values (MRV)."""
        best = None
        best_count = float("inf")
        for i in range(n_exams):
            if i not in assignment:
                count = 0
                for s in domains[i]:
                    ok, _, _ = is_consistent(i, s)
                    if ok and find_room(i, s) is not None:
                        count += 1
                if count < best_count:
                    best_count = count
                    best = i
        return best

    def get_state_snapshot():
        """Return a copy of the current assignment state."""
        return {eid: {"slot": a["slot"], "room": a["room"]} for eid, a in assignment.items()}

    def backtrack():
        if len(assignment) == n_exams:
            steps.append({"type": "solution", "state": get_state_snapshot()})
            return True

        exam_id = select_mrv()
        if exam_id is None:
            return False

        steps.append({
            "type": "select",
            "exam_id": exam_id,
            "exam_name": exams[exam_id]["name"],
            "state": get_state_snapshot(),
        })

        for slot_id in domains[exam_id]:
            ok, conflict_with, reason = is_consistent(exam_id, slot_id)

            if not ok:
                steps.append({
                    "type": "conflict",
                    "exam_id": exam_id,
                    "exam_name": exams[exam_id]["name"],
                    "slot_id": slot_id,
                    "slot": time_slots[slot_id],
                    "conflict_with": conflict_with,
                    "conflict_name": exams[conflict_with]["name"] if conflict_with is not None else None,
                    "reason": reason,
                    "state": get_state_snapshot(),
                })
                continue

            room_id = find_room(exam_id, slot_id)
            if room_id is None:
                steps.append({
                    "type": "conflict",
                    "exam_id": exam_id,
                    "exam_name": exams[exam_id]["name"],
                    "slot_id": slot_id,
                    "slot": time_slots[slot_id],
                    "conflict_with": None,
                    "conflict_name": None,
                    "reason": "no_room",
                    "state": get_state_snapshot(),
                })
                continue

            # Assign
            assignment[exam_id] = {"slot": slot_id, "room": room_id}
            steps.append({
                "type": "assign",
                "exam_id": exam_id,
                "exam_name": exams[exam_id]["name"],
                "slot_id": slot_id,
                "slot": time_slots[slot_id],
                "room_id": room_id,
                "room": rooms[room_id],
                "state": get_state_snapshot(),
            })

            if backtrack():
                return True

            # Backtrack
            del assignment[exam_id]
            steps.append({
                "type": "backtrack",
                "exam_id": exam_id,
                "exam_name": exams[exam_id]["name"],
                "state": get_state_snapshot(),
            })

        return False

    t0 = time.time()
    success = backtrack()
    solve_time = round(time.time() - t0, 4)

    if success:
        schedule = []
        final = steps[-1]["state"]
        for i in range(n_exams):
            schedule.append({
                "exam": exams[i],
                "slot": time_slots[final[i]["slot"]],
                "room": rooms[final[i]["room"]],
            })
        return {
            "status": "success",
            "schedule": schedule,
            "steps": steps,
            "solve_time": solve_time,
            "total_steps": len(steps),
        }
    else:
        return {"status": "infeasible", "steps": steps, "solve_time": solve_time}
