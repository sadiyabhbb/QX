const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
const { RSI, EMA } = require('technicalindicators');

// 🔐 Replace with your actual Telegram bot token and chat ID
const TELEGRAM_TOKEN = 'YOUR_TELEGRAM_BOT_TOKEN';
const CHAT_ID = 'YOUR_CHAT_ID';

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: false });

// Fetch latest 1-minute candles from Binance
async function getCandles() {
  try {
    const res = await axios.get('https://api.binance.com/api/v3/klines?symbol=EURUSDT&interval=1m&limit=50');
    return res.data.map(c => parseFloat(c[4])); // Close prices
  } catch (err) {
    console.error('API error:', err.message);
    return [];
  }
}

// Signal logic using RSI, EMA, and candle patterns
async function sendSignal() {
  const closes = await getCandles();
  if (closes.length < 20) return;

  const rsi = RSI.calculate({ period: 14, values: closes });
  const ema5 = EMA.calculate({ period: 5, values: closes });
  const ema13 = EMA.calculate({ period: 13, values: closes });

  const latestRSI = rsi[rsi.length - 1];
  const lastEMA5 = ema5[ema5.length - 1];
  const lastEMA13 = ema13[ema13.length - 1];

  const candle1 = closes[closes.length - 1];
  const candle2 = closes[closes.length - 2];
  const candle3 = closes[closes.length - 3];

  let signal = '⏸ No clear signal';
  let confidence = 0;

  if (latestRSI < 28 && lastEMA5 > lastEMA13 && candle1 > candle2 && candle2 > candle3) {
    signal = '🔼 Signal: UP';
    confidence = 80;
  } else if (latestRSI > 72 && lastEMA5 < lastEMA13 && candle1 < candle2 && candle2 < candle3) {
    signal = '🔽 Signal: DOWN';
    confidence = 80;
  }

  if (confidence > 0) {
    await bot.sendMessage(CHAT_ID, `${signal}\nConfidence: ${confidence}%`);
  } else {
    console.log('No strong signal.');
  }
}

// Run once and then every 1 minute
sendSignal();
setInterval(sendSignal, 60 * 1000);
