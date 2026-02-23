const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const dataDir = path.join(__dirname, 'data');
const dataFile = path.join(dataDir, 'leads.json');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
if (!fs.existsSync(dataFile)) {
  fs.writeFileSync(dataFile, '[]', 'utf8');
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/leads', (req, res) => {
  const { name, mobile } = req.body;

  if (!name || !mobile) {
    return res.status(400).json({ message: 'Name and mobile are required.' });
  }

  const cleanedName = String(name).trim();
  const cleanedMobile = String(mobile).replace(/\D/g, '');

  if (cleanedName.length < 2) {
    return res.status(400).json({ message: 'Name must be at least 2 characters.' });
  }

  if (!/^\d{10}$/.test(cleanedMobile)) {
    return res.status(400).json({ message: 'Mobile must be a valid 10-digit number.' });
  }

  const newLead = {
    id: Date.now(),
    name: cleanedName,
    mobile: cleanedMobile,
    createdAt: new Date().toISOString()
  };

  try {
    const leads = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    leads.push(newLead);
    fs.writeFileSync(dataFile, JSON.stringify(leads, null, 2), 'utf8');
    return res.status(201).json({ message: 'Lead saved successfully.' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error while saving lead.' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
