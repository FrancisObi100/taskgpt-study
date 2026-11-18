// Shared Storage Engine for Vercel Serverless Functions
// Supports:
// 1. Vercel KV / Upstash Redis (when KV_REST_API_URL & KV_REST_API_TOKEN exist)
// 2. Free Cloud KV Bucket (kvdb.io fallback for instant zero-config sync across all devices)
// 3. In-memory fallback

const SEQUENCES = {
  S1: ["A1", "B2", "C3"],
  S2: ["B3", "C1", "A2"],
  S3: ["C2", "A3", "B1"],
  S4: ["C3", "B2", "A1"],
  S5: ["A2", "C1", "B3"],
  S6: ["B1", "A3", "C2"]
};

function getSequenceForCode(code) {
  if (!code) return "S1";
  const num = parseInt(code.replace(/\D/g, ""), 10);
  if (isNaN(num)) return "S1";
  if (num >= 1 && num <= 4) return "S1";
  if (num >= 5 && num <= 8) return "S2";
  if (num >= 9 && num <= 12) return "S3";
  if (num >= 13 && num <= 16) return "S4";
  if (num >= 17 && num <= 20) return "S5";
  if (num >= 21 && num <= 24) return "S6";
  return "S1";
}

function formatDuration(sec) {
  if (!sec || isNaN(sec) || sec <= 0) return "0s";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  if (m === 0) return `${s}s`;
  return `${m}m ${s < 10 ? '0' : ''}${s}s`;
}

// In-memory fallback
let memoryData = {
  summaries: [],
  tasks: []
};

const KV_CLOUD_FALLBACK = "https://kvdb.io/K9mTaskGPTStudy2026/study_dataset_v1";

async function readFromStorage() {
  // Option 1: Vercel KV / Upstash Redis
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    try {
      const res = await fetch(`${process.env.KV_REST_API_URL}/get/taskgpt_study_data`, {
        headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` }
      });
      if (res.ok) {
        const body = await res.json();
        if (body && body.result) {
          const parsed = typeof body.result === "string" ? JSON.parse(body.result) : body.result;
          if (parsed && Array.isArray(parsed.summaries)) {
            memoryData = parsed;
            return parsed;
          }
        }
      }
    } catch (err) {
      console.warn("Vercel KV read failed, trying cloud fallback:", err.message);
    }
  }

  // Option 2: Free Public Cloud KV Fallback (Zero Config for Vercel)
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(KV_CLOUD_FALLBACK, {
      signal: controller.signal,
      headers: { "Accept": "application/json" }
    });
    clearTimeout(timer);

    if (res.ok) {
      const text = await res.text();
      if (text && text.trim().startsWith("{")) {
        const parsed = JSON.parse(text);
        if (parsed && Array.isArray(parsed.summaries)) {
          memoryData = parsed;
          return parsed;
        }
      }
    }
  } catch (err) {
    // Cloud fallback timeout/error - fallback to memory
  }

  return memoryData;
}

async function writeToStorage(data) {
  memoryData = data;

  // Option 1: Vercel KV / Upstash Redis
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    try {
      await fetch(process.env.KV_REST_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(["SET", "taskgpt_study_data", JSON.stringify(data)])
      });
      return true;
    } catch (err) {
      console.warn("Vercel KV write error:", err.message);
    }
  }

  // Option 2: Free Public Cloud KV Fallback
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    await fetch(KV_CLOUD_FALLBACK, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    clearTimeout(timer);
    return true;
  } catch (err) {
    console.warn("Cloud fallback write error:", err.message);
  }

  return true;
}

async function getStudyData() {
  const data = await readFromStorage();
  return {
    summaries: data.summaries || [],
    tasks: data.tasks || []
  };
}

async function recordTaskTime(payload) {
  const data = await readFromStorage();
  const tasks = data.tasks || [];
  const summaries = data.summaries || [];

  const pCode = (payload.participant_code || "UNKNOWN").toUpperCase().trim();
  const seq = payload.sequence || getSequenceForCode(pCode);
  const taskOrder = parseInt(payload.task_order || payload.task_number || 1, 10);
  const seqTasks = SEQUENCES[seq] || ["A1", "B2", "C3"];
  const taskCode = payload.task_code || seqTasks[taskOrder - 1] || "A1";
  const durationSec = parseFloat(payload.duration_seconds || 0.0);
  const durationFmt = payload.duration_formatted || formatDuration(durationSec);

  const rawTask = {
    id: "task_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
    participant_code: pCode,
    sequence: seq,
    task_order: taskOrder,
    task_code: taskCode,
    task_name: payload.task_name || (taskOrder === 1 ? "Travel" : taskOrder === 2 ? "Dinner" : "Budgeting"),
    condition: payload.condition || taskCode.charAt(0),
    start_time: payload.start_time || "",
    end_time: payload.end_time || "",
    duration_seconds: durationSec,
    duration_formatted: durationFmt,
    ratings: payload.ratings || [],
    selected_options: payload.selected_options || payload.answers || {},
    timestamp: payload.timestamp || new Date().toISOString()
  };

  tasks.push(rawTask);

  // Update or insert summary for this participant
  let summary = summaries.find(s => s.participant_code === pCode);
  if (!summary) {
    summary = {
      participant_code: pCode,
      sequence: seq,
      task1_code: seqTasks[0],
      task1_duration: 0,
      task1_formatted: "",
      task2_code: seqTasks[1],
      task2_duration: 0,
      task2_formatted: "",
      task3_code: seqTasks[2],
      task3_duration: 0,
      task3_formatted: "",
      total_duration_seconds: 0,
      total_duration_formatted: "0s",
      is_completed: 0,
      last_updated: new Date().toISOString()
    };
    summaries.push(summary);
  }

  // Update specific task duration
  if (taskOrder === 1) {
    summary.task1_code = taskCode;
    summary.task1_duration = durationSec;
    summary.task1_formatted = durationFmt;
  } else if (taskOrder === 2) {
    summary.task2_code = taskCode;
    summary.task2_duration = durationSec;
    summary.task2_formatted = durationFmt;
  } else if (taskOrder === 3) {
    summary.task3_code = taskCode;
    summary.task3_duration = durationSec;
    summary.task3_formatted = durationFmt;
  }

  // Recalculate totals
  const t1 = parseFloat(summary.task1_duration || 0);
  const t2 = parseFloat(summary.task2_duration || 0);
  const t3 = parseFloat(summary.task3_duration || 0);
  summary.total_duration_seconds = t1 + t2 + t3;
  summary.total_duration_formatted = formatDuration(summary.total_duration_seconds);
  summary.is_completed = (t1 > 0 && t2 > 0 && t3 > 0) ? 1 : 0;
  summary.last_updated = new Date().toISOString();

  // Sort summaries P01..P24
  summaries.sort((a, b) => a.participant_code.localeCompare(b.participant_code, undefined, { numeric: true }));

  await writeToStorage({ summaries, tasks });
  return { status: "ok", message: "Task recorded successfully", summary };
}

async function clearStudyData() {
  const emptyData = { summaries: [], tasks: [] };
  await writeToStorage(emptyData);
  return { status: "ok", message: "All study data cleared successfully" };
}

function generateCSV(summaries) {
  const headers = [
    "Participant Code",
    "Sequence",
    "Task 1 Code",
    "Task 1 Time (Seconds)",
    "Task 1 Time (Formatted)",
    "Task 2 Code",
    "Task 2 Time (Seconds)",
    "Task 2 Time (Formatted)",
    "Task 3 Code",
    "Task 3 Time (Seconds)",
    "Task 3 Time (Formatted)",
    "Total Study Duration (Seconds)",
    "Total Study Duration (Formatted)",
    "Status",
    "Last Active Timestamp"
  ];

  const rows = (summaries || []).map(r => {
    return [
      r.participant_code,
      r.sequence,
      r.task1_code,
      r.task1_duration || 0,
      `"${r.task1_formatted || formatDuration(r.task1_duration) || '-'}"`,
      r.task2_code,
      r.task2_duration || 0,
      `"${r.task2_formatted || formatDuration(r.task2_duration) || '-'}"`,
      r.task3_code,
      r.task3_duration || 0,
      `"${r.task3_formatted || formatDuration(r.task3_duration) || '-'}"`,
      r.total_duration_seconds || 0,
      `"${r.total_duration_formatted || formatDuration(r.total_duration_seconds) || '0s'}"`,
      `"${r.is_completed === 1 ? 'Completed (3/3)' : 'In Progress'}"`,
      `"${r.last_updated || '-'}"`
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\r\n");
}

module.exports = {
  getStudyData,
  recordTaskTime,
  clearStudyData,
  generateCSV,
  formatDuration,
  getSequenceForCode
};
