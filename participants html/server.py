#!/usr/bin/env python3
"""
TaskGPT Research Study Server & Admin Backend
Handles participant sessions, task duration tracking, sequence routing, and admin exports.
"""

import sys
import os
import json
import csv
import io
import time
import sqlite3
from pathlib import Path
from http.server import HTTPServer, SimpleHTTPRequestHandler
import urllib.parse

BASE_DIR = Path(__file__).resolve().parent
ADMIN_DIR = BASE_DIR / "admin html"
PARTICIPANTS_DIR = BASE_DIR / "participants html"
ASSETS_DIR = BASE_DIR / "assets"
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "study_records.db"
JSON_BACKUP = DATA_DIR / "participant_records.json"

def ensure_data_dir():
    DATA_DIR.mkdir(parents=True, exist_ok=True)

def init_db():
    ensure_data_dir()
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS participant_tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        participant_code TEXT NOT NULL,
        sequence TEXT NOT NULL,
        task_order INTEGER NOT NULL,
        task_code TEXT NOT NULL,
        task_name TEXT NOT NULL,
        condition TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        duration_seconds REAL NOT NULL,
        duration_formatted TEXT NOT NULL,
        ratings TEXT NOT NULL,
        selected_options TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS participant_summaries (
        participant_code TEXT PRIMARY KEY,
        sequence TEXT NOT NULL,
        task1_code TEXT,
        task1_duration REAL,
        task1_formatted TEXT,
        task2_code TEXT,
        task2_duration REAL,
        task2_formatted TEXT,
        task3_code TEXT,
        task3_duration REAL,
        task3_formatted TEXT,
        total_duration_seconds REAL,
        total_duration_formatted TEXT,
        is_completed INTEGER DEFAULT 0,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    conn.commit()
    conn.close()

def format_duration(seconds):
    if seconds is None or seconds <= 0:
        return "0s"
    total = int(round(seconds))
    mins = total // 60
    secs = total % 60
    if mins > 0:
        return f"{mins}m {secs:02d}s"
    return f"{secs}s"

class TaskGPTStudyHandler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        parsed = urllib.parse.urlparse(path)
        clean_path = parsed.path
        if clean_path.startswith("/assets/"):
            rel = clean_path[len("/assets/"):]
            return str(ASSETS_DIR / rel)
        return super().translate_path(path)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == "/admin" or path == "/admin/":
            self.send_response(302)
            self.send_header("Location", "/admin%20html/index.html")
            self.end_headers()
            return

        if path == "/api/study_records":
            self.handle_get_records()
            return

        if path == "/api/export_csv":
            self.handle_export_csv()
            return

        return super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == "/api/record_task_time":
            self.handle_record_task_time()
            return

        if path == "/api/clear_data":
            self.handle_clear_data()
            return

        self.send_error(404, "Endpoint not found")

    def handle_record_task_time(self):
        content_len = int(self.headers.get("Content-Length", 0))
        post_body = self.rfile.read(content_len)
        try:
            data = json.loads(post_body.decode("utf-8"))
        except Exception as e:
            self.send_error(400, f"Invalid JSON: {e}")
            return

        p_code = data.get("participant_code", "UNKNOWN").upper().strip()
        sequence = data.get("sequence", "S1")
        t_order = int(data.get("task_order", 1))
        t_code = data.get("task_code", "A1")
        t_name = data.get("task_name", "Travel")
        condition = data.get("condition", "A")
        start_time = data.get("start_time", "")
        end_time = data.get("end_time", "")
        duration_sec = float(data.get("duration_seconds", 0.0))
        duration_fmt = data.get("duration_formatted") or format_duration(duration_sec)
        ratings_json = json.dumps(data.get("ratings", []))
        options_json = json.dumps(data.get("selected_options", {}))

        ensure_data_dir()
        init_db()

        conn = sqlite3.connect(str(DB_PATH))
        cur = conn.cursor()

        cur.execute("""
        INSERT INTO participant_tasks 
        (participant_code, sequence, task_order, task_code, task_name, condition, start_time, end_time, duration_seconds, duration_formatted, ratings, selected_options)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (p_code, sequence, t_order, t_code, t_name, condition, start_time, end_time, duration_sec, duration_fmt, ratings_json, options_json))

        cur.execute("SELECT * FROM participant_summaries WHERE participant_code = ?", (p_code,))
        row = cur.fetchone()

        if not row:
            t1_code = t_code if t_order == 1 else None
            t1_dur = duration_sec if t_order == 1 else None
            t1_fmt = duration_fmt if t_order == 1 else None

            t2_code = t_code if t_order == 2 else None
            t2_dur = duration_sec if t_order == 2 else None
            t2_fmt = duration_fmt if t_order == 2 else None

            t3_code = t_code if t_order == 3 else None
            t3_dur = duration_sec if t_order == 3 else None
            t3_fmt = duration_fmt if t_order == 3 else None

            tot_sec = duration_sec
            tot_fmt = format_duration(tot_sec)
            is_comp = 1 if t_order == 3 else 0

            cur.execute("""
            INSERT INTO participant_summaries
            (participant_code, sequence, task1_code, task1_duration, task1_formatted, task2_code, task2_duration, task2_formatted, task3_code, task3_duration, task3_formatted, total_duration_seconds, total_duration_formatted, is_completed)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (p_code, sequence, t1_code, t1_dur, t1_fmt, t2_code, t2_dur, t2_fmt, t3_code, t3_dur, t3_fmt, tot_sec, tot_fmt, is_comp))
        else:
            if t_order == 1:
                cur.execute("""
                UPDATE participant_summaries 
                SET sequence = ?, task1_code = ?, task1_duration = ?, task1_formatted = ?, last_updated = CURRENT_TIMESTAMP
                WHERE participant_code = ?
                """, (sequence, t_code, duration_sec, duration_fmt, p_code))
            elif t_order == 2:
                cur.execute("""
                UPDATE participant_summaries 
                SET sequence = ?, task2_code = ?, task2_duration = ?, task2_formatted = ?, last_updated = CURRENT_TIMESTAMP
                WHERE participant_code = ?
                """, (sequence, t_code, duration_sec, duration_fmt, p_code))
            elif t_order == 3:
                cur.execute("""
                UPDATE participant_summaries 
                SET sequence = ?, task3_code = ?, task3_duration = ?, task3_formatted = ?, is_completed = 1, last_updated = CURRENT_TIMESTAMP
                WHERE participant_code = ?
                """, (sequence, t_code, duration_sec, duration_fmt, p_code))

            cur.execute("SELECT task1_duration, task2_duration, task3_duration FROM participant_summaries WHERE participant_code = ?", (p_code,))
            s = cur.fetchone()
            d1 = s[0] or 0.0
            d2 = s[1] or 0.0
            d3 = s[2] or 0.0
            tot = d1 + d2 + d3
            is_done = 1 if (s[0] is not None and s[1] is not None and s[2] is not None) else 0

            cur.execute("""
            UPDATE participant_summaries
            SET total_duration_seconds = ?, total_duration_formatted = ?, is_completed = ?
            WHERE participant_code = ?
            """, (tot, format_duration(tot), is_done, p_code))

        conn.commit()
        conn.close()

        self.save_backup_json()

        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps({"status": "success", "duration_formatted": duration_fmt}).encode("utf-8"))

    def handle_get_records(self):
        ensure_data_dir()
        init_db()

        conn = sqlite3.connect(str(DB_PATH))
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()

        cur.execute("SELECT * FROM participant_summaries ORDER BY participant_code ASC")
        summaries = [dict(r) for r in cur.fetchall()]

        cur.execute("SELECT * FROM participant_tasks ORDER BY created_at DESC")
        tasks = [dict(r) for r in cur.fetchall()]

        conn.close()

        data = {
            "summaries": summaries,
            "tasks": tasks
        }

        resp = json.dumps(data)
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(resp.encode("utf-8"))

    def handle_clear_data(self):
        ensure_data_dir()
        init_db()

        conn = sqlite3.connect(str(DB_PATH))
        cur = conn.cursor()
        cur.execute("DELETE FROM participant_tasks")
        cur.execute("DELETE FROM participant_summaries")
        conn.commit()
        conn.close()

        if JSON_BACKUP.exists():
            JSON_BACKUP.unlink()

        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps({"status": "cleared"}).encode("utf-8"))

    def handle_export_csv(self):
        ensure_data_dir()
        init_db()

        conn = sqlite3.connect(str(DB_PATH))
        cur = conn.cursor()
        cur.execute("""
        SELECT participant_code, sequence, task_order, task_code, task_name, condition, duration_seconds, duration_formatted, start_time, end_time, ratings, selected_options
        FROM participant_tasks
        ORDER BY participant_code ASC, task_order ASC
        """)
        rows = cur.fetchall()
        conn.close()

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "Participant Code", "Sequence", "Task Order", "Task Code", "Task Name", "Condition",
            "Duration (Seconds)", "Duration (Formatted)", "Start Time", "End Time", "Likert Ratings", "Selected Options"
        ])

        for r in rows:
            writer.writerow(r)

        csv_data = output.getvalue().encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/csv")
        self.send_header("Content-Disposition", 'attachment; filename="taskgpt_study_durations.csv"')
        self.end_headers()
        self.wfile.write(csv_data)

    def save_backup_json(self):
        try:
            ensure_data_dir()
            conn = sqlite3.connect(str(DB_PATH))
            conn.row_factory = sqlite3.Row
            cur = conn.cursor()
            cur.execute("SELECT * FROM participant_summaries")
            sums = [dict(r) for r in cur.fetchall()]
            cur.execute("SELECT * FROM participant_tasks")
            tsks = [dict(r) for r in cur.fetchall()]
            conn.close()

            with open(JSON_BACKUP, "w") as f:
                json.dump({"summaries": sums, "tasks": tsks}, f, indent=2)
        except Exception as e:
            print(f"Error backing up JSON: {e}")

def run(port=8081):
    init_db()
    os.chdir(BASE_DIR)
    server_address = ("", port)
    httpd = HTTPServer(server_address, TaskGPTStudyHandler)
    print("=" * 55)
    print(f" TaskGPT Web App running at:")
    print(f" http://localhost:{port}")
    print(f" Admin Dashboard:")
    print(f" http://localhost:{port}/admin")
    print("=" * 55)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down TaskGPT server.")
        httpd.server_close()

if __name__ == "__main__":
    p = 8081
    if len(sys.argv) > 1:
        p = int(sys.argv[1])
    run(p)
