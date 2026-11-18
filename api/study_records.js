const { getStudyData } = require("./_store");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed. Use GET." });
  }

  try {
    const data = await getStudyData();
    return res.status(200).json({
      status: "ok",
      summaries: data.summaries,
      tasks: data.tasks
    });
  } catch (error) {
    console.error("Error fetching study records:", error);
    return res.status(500).json({ error: "Internal server error", details: error.message });
  }
};
