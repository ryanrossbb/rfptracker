require('dotenv').config();
const express = require('express');
const Airtable = require('airtable');
const cors = require('cors');
const path = require('path');

console.log("🔥 server.js started");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.static(path.join(__dirname))); // Serve static files like index.html

const base = new Airtable({ apiKey: process.env.AIRTABLE_TOKEN }).base(process.env.AIRTABLE_BASE);

const stageMap = {
  "Census Received": 0,
  "Processing": 1,
  "Engaging Carriers": 2,
  "Preparing Quote": 3,
  "Quote Returned": 4
};

console.log(record.fields);

app.get('/api/verify-broker', async (req, res) => {
  const email = req.query.email;
  const pin = req.query.pin;

  if (!email || !pin) {
    return res.status(400).json({ error: "Missing email or PIN" });
  }

  try {
    const records = await base(process.env.AIRTABLE_BROKER_TABLE).select({
      filterByFormula: `AND(LOWER(TRIM({Email})) = LOWER('${email.trim()}'), TRIM({PIN}) = '${pin.trim()}')`,
      maxRecords: 1
    }).firstPage();

    if (!records.length) {
      return res.status(403).json({ error: "Invalid email or PIN" });
    }

    const brokerName = records[0].fields["Username"];
    return res.json({ brokerName });

  } catch (err) {
    console.error("❌ Broker verification failed:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.get('/api/projects', async (req, res) => {
  const brokerName = req.query.broker;
  if (!brokerName) return res.status(400).json({ error: "Missing Username" });

  try {
    const records = await base(process.env.AIRTABLE_TABLE).select({
      filterByFormula: `{Username} = '${brokerName}'`
    }).all();

    const results = records
      .filter(r => r.fields["Stage"] && r.fields["RFP Name"])
      records.forEach(record => {
  console.log("Returned fields:", record.fields);
});

      .map(record => ({
        projectName: record.fields["RFP Name"],
        stage: record.fields["Stage"],
        stageIndex: stageMap[record.fields["Stage"]],
        timeRemaining: record.fields["Time Remaining"] || "N/A",
        submissionTime: record.fields["created"] || null
      }));

    res.json(results);

  } catch (err) {
    console.error("❌ Airtable query failed:", err);
    res.status(500).json({ error: "Airtable query failed" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
