import express from 'express';
import { POST, GET } from './bot/route.js';

const app = express();
app.use(express.json());

// Webhook endpoint
app.post('/api/bot', async (req, res) => {
  const request = {
    json: async () => req.body,
  };
  const response = await POST(request);
  res.status(200).send('OK');
});

// Status endpoint
app.get('/api/bot', async (req, res) => {
  const request = {};
  const response = await GET(request);
  const data = await response.json();
  res.json(data);
});

app.get('/', (req, res) => {
  res.send('Bot is running ✅');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
