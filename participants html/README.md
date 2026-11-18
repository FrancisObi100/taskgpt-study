# Condition A Web Application: Autonomous Assumption

This folder contains the complete, self-contained desktop web application for **Condition A (Autonomous Assumption)** in the Conversational AI UX Research Study.

## Condition A Behavior & Process Flow

1. **Step 1: Task Briefing**:
   - Shows the scenario and the specific preferences the participant has in mind (e.g. 2 nights in London, partner, ~£350 budget, food & markets, central).
   - Shows the underspecified prompt (*"Help me plan a short trip to London for next month."*).
2. **Step 2: Enter Chat & Prompt**:
   - The participant enters the ChatGPT-style chat box.
   - Click **"⚡ Click to Send Prompt"** or **"📋 Copy Prompt"** to immediately submit the prompt into the chat box.
3. **Step 3: AI Autonomous Assumption Response**:
   - Realistic 1.2s typing animation.
   - The AI immediately generates a complete rich response without clarifying questions first, making deliberate assumptions (e.g. assuming 3 days / 2 nights, moderate budget ~£525, general classic landmarks).
   - Displays 3 London landmark visual cards, 3-day itinerary schedule, route & Underground transit strip, and budget breakdown table.
   - Locks further uncontrolled chatting.
4. **Step 4: Post-Task Questionnaire**:
   - 7-point Likert scale evaluation on Effort, Control, Autonomy, Intent Confidence, Usefulness, and Overall Satisfaction.
   - Automatically advances to the next task (Task 2: Dinner Recipe, Task 3: House Deposit Budgeting).

---

## How to Test and Run

### Option 1: Open Directly in Browser (No Server Needed)
You can directly double-click or open:
[`/Users/macbookpro/Downloads/CHATGPT TASK/index.html`](file:///Users/macbookpro/Downloads/CHATGPT TASK/index.html)
in Google Chrome, Safari, Edge, or Firefox. Everything is self-contained with embedded styling, vector visuals, and logic.

### Option 2: Run with a Local Web Link
To access via a local link (`http://localhost:8081`):

```bash
cd "/Users/macbookpro/Downloads/CHATGPT TASK"
python3 server.py 8081
```

Then open in your browser:
[http://localhost:8081](http://localhost:8081)
