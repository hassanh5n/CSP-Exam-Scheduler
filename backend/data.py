"""
Dummy data for the AI Exam Timetable Scheduler.
Contains exams, rooms, and time slots as specified in the project requirements.
"""

EXAMS = [
    {"id": 0, "name": "Applied Physics", "teachers": ["M Rahim", "Ishtiaq Ahmad"], "sections": ["BCS-2"], "student_count": 46},
    {"id": 1, "name": "Applied Human Computer Interaction", "teachers": ["Ghulam Murtaza", "Syed Kashan Hussain Naqvi", "Shaheer Ahmad Khan", "Jibran Rasheed Khan", "Asif Fazwani"], "sections": ["BCS-6"], "student_count": 88},
    {"id": 2, "name": "Pakistan Studies", "teachers": ["Khushboo Farid"], "sections": ["BEE-6"], "student_count": 42},
    {"id": 3, "name": "Generative AI", "teachers": ["Omer Qureshi"], "sections": ["BAI-8", "BCS-8"], "student_count": 96},
    {"id": 4, "name": "Information Security", "teachers": ["M Usman"], "sections": ["BAI-8", "BCS-8", "BCY-9", "BSE-9"], "student_count": 172},
    {"id": 5, "name": "Data Structures", "teachers": ["Shafique Rahman"], "sections": ["BCS-4"], "student_count": 72},
    {"id": 6, "name": "Programming Fundamentals", "teachers": ["Abeeha Sattar", "Shahbaz Akhtar Siddiqui"], "sections": ["BCE-2", "BEE-4"], "student_count": 84},
    {"id": 7, "name": "Software Engineering", "teachers": ["Sobia", "Abdul Rahman", "Hajra Ahmed", "Shaheer Ahmad Khan"], "sections": ["BCS-6"], "student_count": 88},
    {"id": 8, "name": "Database Systems", "teachers": ["Mehak", "Basit Ali", "Talha Shahid"], "sections": ["BAI-4", "BCS-4", "BDS-4", "BSE-4"], "student_count": 194},
    {"id": 9, "name": "Object Oriented Programming", "teachers": ["Talha Shahid", "Saif ur Rehman"], "sections": ["BAI-2", "BCS-2", "BCY-2", "BDS-2", "BEE-6", "BSE-2"], "student_count": 268},
    {"id": 10, "name": "Operating Systems", "teachers": ["Saeeda Kanwal", "Ghufran Ahmed"], "sections": ["BAI-4", "BCS-4", "BCY-9", "BDS-4", "BSE-4"], "student_count": 214},
    {"id": 11, "name": "Applied DevOps", "teachers": ["Talal Ahmed"], "sections": ["SE4007"], "student_count": 34},
    {"id": 12, "name": "DevOps", "teachers": ["Syed M Sohaib Ur Rehman", "Talal Ahmed"], "sections": ["BCS-8"], "student_count": 52},
    {"id": 13, "name": "Blockchain and Cryptocurrency", "teachers": ["Kashif Hanif"], "sections": ["BCS-8"], "student_count": 49},
    {"id": 14, "name": "Machine Learning for Robotics", "teachers": ["M Sudais"], "sections": ["BCS-8"], "student_count": 45},
    {"id": 15, "name": "Computer Graphics", "teachers": ["Javeria Farooq"], "sections": ["BCS-8"], "student_count": 51},
    {"id": 16, "name": "Artificial Intelligence", "teachers": ["Abeeha Sattar", "Shahbaz Akhtar Siddiqui", "Nasir Uddin"], "sections": ["BAI-4", "BCS-4", "BCS-6", "BCY-6", "BSE-6"], "student_count": 236},
]

ROOMS = [
    {"id": 0, "name": "Room A", "capacity": 50},
    {"id": 1, "name": "Room B", "capacity": 100},
    {"id": 2, "name": "Lab 1", "capacity": 40},
    {"id": 3, "name": "Lab 2", "capacity": 40},
    {"id": 4, "name": "Hall 1", "capacity": 200},
    {"id": 5, "name": "Hall 2", "capacity": 300},
]

# Time slots: 3 days x 8 slots = 24 total (8 AM to 4 PM, 1-hour each)
SLOTS_PER_DAY = 8

TIME_SLOTS = [
    # Thursday (indices 0-7)
    {"id": 0,  "day": "Thu", "time": "08:00 - 09:00"},
    {"id": 1,  "day": "Thu", "time": "09:00 - 10:00"},
    {"id": 2,  "day": "Thu", "time": "10:00 - 11:00"},
    {"id": 3,  "day": "Thu", "time": "11:00 - 12:00"},
    {"id": 4,  "day": "Thu", "time": "12:00 - 01:00"},
    {"id": 5,  "day": "Thu", "time": "01:00 - 02:00"},
    {"id": 6,  "day": "Thu", "time": "02:00 - 03:00"},
    {"id": 7,  "day": "Thu", "time": "03:00 - 04:00"},
    # Friday (indices 8-15)
    {"id": 8,  "day": "Fri", "time": "08:00 - 09:00"},
    {"id": 9,  "day": "Fri", "time": "09:00 - 10:00"},
    {"id": 10, "day": "Fri", "time": "10:00 - 11:00"},
    {"id": 11, "day": "Fri", "time": "11:00 - 12:00"},
    {"id": 12, "day": "Fri", "time": "12:00 - 01:00"},
    {"id": 13, "day": "Fri", "time": "01:00 - 02:00"},
    {"id": 14, "day": "Fri", "time": "02:00 - 03:00"},
    {"id": 15, "day": "Fri", "time": "03:00 - 04:00"},
    # Monday (indices 16-23)
    {"id": 16, "day": "Mon", "time": "08:00 - 09:00"},
    {"id": 17, "day": "Mon", "time": "09:00 - 10:00"},
    {"id": 18, "day": "Mon", "time": "10:00 - 11:00"},
    {"id": 19, "day": "Mon", "time": "11:00 - 12:00"},
    {"id": 20, "day": "Mon", "time": "12:00 - 01:00"},
    {"id": 21, "day": "Mon", "time": "01:00 - 02:00"},
    {"id": 22, "day": "Mon", "time": "02:00 - 03:00"},
    {"id": 23, "day": "Mon", "time": "03:00 - 04:00"},
]

# Minimum gap between exams sharing students/teachers (in slots, within same day)
MIN_GAP = 1
