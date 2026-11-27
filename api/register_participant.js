const { registerParticipantSession } = require("./_store");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    let payload = req.body;
    if (typeof payload === "string") {
      try {
        payload = JSON.parse(payload);
      } catch (e) {
        return res.status(400).json({ error: "Invalid JSON payload" });
      }
    }

    if (!payload || !payload.participant_code) {
      return res.status(400).json({ error: "Missing participant_code" });
    }

    const result = await registerParticipantSession(payload);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error registering participant session:", error);
    return res.status(500).json({ error: "Internal server error", details: error.message });
  }
};
