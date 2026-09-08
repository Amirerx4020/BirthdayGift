const express = require('express');
const path = require('path');
const crypto = require('crypto');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const BOT_TOKEN = process.env.BOT_TOKEN;
const BOT_USERNAME = process.env.BOT_USERNAME; // بدون @ ، مثلا Sara_Birthday_bot
const GIFT_CODE = process.env.GIFT_CODE || 'PSN-XXXX-XXXX-XXXX';
const FRIEND_PHONE = process.env.FRIEND_PHONE; // شماره‌ی دوستت، هر فرمتی، خودمون نرمالش می‌کنیم
const TOKEN_TTL_MINUTES = parseInt(process.env.TOKEN_EXPIRY_MINUTES || '15', 10);
const TOKEN_TTL_MS = TOKEN_TTL_MINUTES * 60 * 1000;

if (!BOT_TOKEN || !BOT_USERNAME || !FRIEND_PHONE) {
  console.error('❌ متغیرهای BOT_TOKEN, BOT_USERNAME و FRIEND_PHONE باید تنظیم بشن.');
  process.exit(1);
}

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// توکن‌های یک‌بارمصرف: token -> { expiresAt, used }
const tokens = new Map();

function normalizePhone(raw) {
  // فقط رقم‌ها رو نگه می‌داریم و ۱۰ رقم آخر رو مقایسه می‌کنیم
  // (تا فرقی نکنه با 0 شروع بشه یا با +98 یا 98)
  const digits = String(raw).replace(/\D/g, '');
  return digits.slice(-10);
}

const FRIEND_PHONE_NORMALIZED = normalizePhone(FRIEND_PHONE);

function generateToken() {
  return crypto.randomBytes(12).toString('hex');
}

app.post('/api/check-phone', (req, res) => {
  const { phone } = req.body || {};

  if (!phone) {
    return res.status(400).json({ ok: false, error: 'شماره رو وارد کن.' });
  }

  if (normalizePhone(phone) !== FRIEND_PHONE_NORMALIZED) {
    return res.status(401).json({ ok: false, error: 'این شماره درست نیست. دوباره چک کن.' });
  }

  const token = generateToken();
  tokens.set(token, { expiresAt: Date.now() + TOKEN_TTL_MS, used: false });

  return res.json({
    ok: true,
    deepLink: `https://t.me/${BOT_USERNAME}?start=${token}`
  });
});

bot.onText(/\/start(?:\s+(.+))?/, (msg, match) => {
  const chatId = msg.chat.id;
  const token = match && match[1];

  if (!token) {
    bot.sendMessage(chatId, 'سلام! برای گرفتن کد، اول باید از همون سایتی که ازش اومدی شروع کنی 🙂');
    return;
  }

  const entry = tokens.get(token);

  if (!entry || entry.used || Date.now() > entry.expiresAt) {
    bot.sendMessage(chatId, 'این لینک منقضی شده یا قبلاً استفاده شده. دوباره از سایت شروع کن.');
    return;
  }

  entry.used = true;
  bot.sendMessage(
    chatId,
    `🎉 تولدت مبارک!\n\nکد گیفت کارت پلی‌استیشنت اینه:\n\n*${GIFT_CODE}*`,
    { parse_mode: 'Markdown' }
  );
});

app.get('/healthz', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
