// server/index.js
/**
 * MT16 QUANTMIND — NODE.JS EXPRESS YAHOO PROXY SERVER (server/index.js)
 *
 * QODI ANAYASA STANDARTLARI:
 * - Kural 1 (CORS Kalkanı): Tarayıcı doğrudan Yahoo'ya gidemediği için Node.js proxy sunucusu üzerinden sorgu yapılır.
 * - Kural 2 (Fallback Yasağı): Hata durumunda ASLA sahte fallback dönülmez, doğrudan null dönülür.
 * - Kural 3 (Sessiz Hata Yönetimi): Terminale console.error basılmaz.
 */

import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// 🌐 Yahoo Finance CORS Proxy Uç Noktası
app.get('/api/yahoo-proxy', async (req, res) => {
  const { symbol } = req.query;
  if (!symbol) return res.json(null);
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1mo&interval=1d`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    if (!response.ok) return res.json(null);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.json(null); // Qodi Kuralı: Hata durumunda null dön
  }
});

export default app;
