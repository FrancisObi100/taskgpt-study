const { getStudyData, generateCSV } = require("./_store");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed. Use GET." });
  }

  try {
    const data = await getStudyData();
    const csvContent = generateCSV(data.summaries || []);
    const dateStr = new Date().toISOString().slice(0, 10);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="taskgpt_study_time_tracking_${dateStr}.csv"`);
    return res.status(200).send(csvContent);
  } catch (error) {
    console.error("Error generating CSV:", error);
    return res.status(500).json({ error: "Internal server error", details: error.message });
  }
};
