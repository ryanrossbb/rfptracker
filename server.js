require('dotenv').config();
const express = require('express');
const Airtable = require('airtable');
const cors = require('cors');
const path = require('path');

console.log("🔥 server.js started");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.static(path.join(__dirname))); // Serve static frontend files (like index.html)

const base = new Airtable({ apiKey: process.env.AIRTABLE_TOKEN }).base(process.env.AIRTABLE_BASE);

// Define stages and their index
const stageMap = {
  "Census Received": 0,
  "Processing": 1,
  "Engaging Carriers": 2,
  "Preparing Quote": 3,
  "Quote Returned": 4
};

// ✅ Verify broker by email and PIN
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

    const brokerName = records[0].fields["Broker Name"];
    return res.json({ brokerName });

  } catch (err) {
    console.error("❌ Broker verification failed:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Fetch all RFPs for a given broker
app.get('/api/projects', async (req, res) => {
  const brokerName = req.query.broker;
  if (!brokerName) return res.status(400).json({ error: "Missing broker name" });

  try {
    const records = await base(process.env.AIRTABLE_TABLE).select({
      filterByFormula: `{Broker Name} = '${brokerName}'`
    }).all();

    // 🔍 Debug log
    records.forEach(record => {
      console.log("Returned fields:", record.fields);
    });

    const results = records
      .filter(record => record.fields["Stage"] && record.fields["RFP Name"])
      .map(record => ({
        projectName: record.fields["RFP Name"],
        stage: record.fields["Stage"],
        stageIndex: stageMap[record.fields["Stage"]],
        timeRemaining: record.fields["Time Remaining"] || "N/A",
        submissionTime: record.fields["Created"] || null // Make sure this matches Airtable field name
      }));

    res.json(results);

  } catch (err) {
    console.error("❌ Airtable query failed:", err);
    res.status(500).json({ error: "Airtable query failed" });
  }
});

// ✅ Start the server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
