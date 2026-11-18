# TaskGPT — Controlled UX Research Study Platform

A desktop web application designed for a controlled university UX research study on conversational AI clarification strategies with full participant time-tracking and a live researcher admin dashboard.

---

## 🚀 How It Works on Vercel (100% Linked)

Both the **Participant Web App** and the **Researcher Admin Dashboard** live in this single project and share the same domain and backend:

1. **Participant Chat Web App**: `https://<your-project>.vercel.app/`
   - Participants enter their assigned code (`P01` to `P24`).
   - Automatically assigns the Latin-square condition sequence (S1 to S6).
   - Strict gating: Task 1 must be completed before Task 2, and Task 2 before Task 3.
   - Accurately tracks exact seconds and minutes spent on each task.

2. **Researcher Admin Dashboard**: `https://<your-project>.vercel.app/admin`
   - Live auto-refreshing table (every 3 seconds) showing all active and completed participants.
   - Displays exact time spent per task (`⏱️ 1m 24s`), total duration, and status.
   - "📥 Export CSV" button downloads the complete research dataset with one click.
   - "👤 Participant App ↗" button lets researchers test or open the participant view anytime.

---

## 🌐 How the Data Stays Linked Across Devices

When participants complete tasks on their phones or laptops anywhere in the world:
1. The participant web app transmits task time to `/api/record_task_time`.
2. The serverless backend (`api/`):
   - **Out-of-the-box Cloud KV Sync**: Operates automatically with zero configuration, synchronizing participant data across devices and browsers in real time.
   - **Vercel KV (Optional Enterprise Storage)**: If you enable Vercel KV in the Vercel dashboard (`Storage` → `Create Database` → `KV`), the functions automatically use high-speed Upstash Redis with zero code changes!
3. The Admin Dashboard reads live records from `/api/study_records`, ensuring the researcher sees participant data in real-time.

---

## 📦 2-Minute Deployment Guide to Vercel

### Method 1: Deploy with Vercel CLI (Fastest)

1. Open your terminal in this directory:
   ```bash
   cd "/Users/macbookpro/Downloads/CHATGPT TASK"
   ```
2. Run:
   ```bash
   npx vercel
   ```
3. Follow the quick prompts:
   - "Set up and deploy?": **Yes**
   - "Which scope?": Select your account
   - "Link to existing project?": **No**
   - "What's your project's name?": `taskgpt-study` (or any name you prefer)
   - "In which directory is your code located?": `./`
4. Once deployment finishes, Vercel gives you your live URL (e.g. `https://taskgpt-study.vercel.app`).
   - Participant link: `https://taskgpt-study.vercel.app/`
   - Admin link: `https://taskgpt-study.vercel.app/admin`

---

### Method 2: Deploy via GitHub + Vercel Dashboard

1. Create a new GitHub repository (e.g. `taskgpt-study`).
2. Push this folder to your repository:
   ```bash
   cd "/Users/macbookpro/Downloads/CHATGPT TASK"
   git init
   git add .
   git commit -m "TaskGPT complete study platform with linked participant and admin apps"
   git branch -M main
   git remote add origin https://github.com/<your-username>/taskgpt-study.git
   git push -u origin main
   ```
3. Go to [vercel.com](https://vercel.com) and click **"Add New..."** → **"Project"**.
4. Select your `taskgpt-study` repository and click **Deploy**.
5. Everything is pre-configured with `vercel.json` and `api/`. Your app will be live in 30 seconds!

---

## 💻 Local Testing (Offline)

You can also run the entire platform locally on your computer:
```bash
python3 server.py 8081
```
- Open Participant App: [http://localhost:8081](http://localhost:8081)
- Open Admin Dashboard: [http://localhost:8081/admin](http://localhost:8081/admin)
Local sessions are stored in `data/study.db` (SQLite) and also mirrored in browser `localStorage`.
