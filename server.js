require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

const API_TOKEN = process.env.CR_API_TOKEN || '';
const CLAN_TAG = '%23LCY8L80V';
const API_BASE = 'https://api.clashroyale.com/v1';

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Proxy endpoint for river race log
app.get('/api/warlog', async (req, res) => {
  try {
    const limit = req.query.limit || 20;
    const url = `${API_BASE}/clans/${CLAN_TAG}/riverracelog?limit=${limit}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`API Error ${response.status}: ${errorBody}`);
      return res.status(response.status).json({ error: `API returned ${response.status}`, details: errorBody });
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

// Proxy endpoint for clan info
app.get('/api/clan', async (req, res) => {
  try {
    const url = `${API_BASE}/clans/${CLAN_TAG}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `API returned ${response.status}` });
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`⚔️  Baleadas War Stats running at http://localhost:${PORT}`);
});
