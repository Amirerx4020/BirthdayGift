// این اسکریپت رو فقط خودت، یه‌بار، روی کامپیوتر خودت اجرا می‌کنی.
// شماره موبایل دوستت و کد گیفت کارت رو ازت می‌پرسه، و یه خروجی رمزنگاری‌شده بهت می‌ده
// که باید تو فایل index.html جایگزین کنی. هیچ‌کدوم از این اطلاعات جایی ارسال نمی‌شه.

const { webcrypto } = require('crypto');
const { subtle } = webcrypto;
const readline = require('readline');

function toBase64(buf) {
  return Buffer.from(buf).toString('base64');
}

function normalizePhone(raw) {
  return String(raw).replace(/\D/g, '').slice(-10);
}

async function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q) => new Promise((resolve) => rl.question(q, resolve));

  const phone = await ask('شماره موبایل دوستت (همونی که باید تو سایت وارد کنه): ');
  const giftCode = await ask('کد واقعی گیفت کارت پلی‌استیشن: ');
  rl.close();

  const normalized = normalizePhone(phone);
  if (normalized.length < 8) {
    console.error('\n⚠️ شماره خیلی کوتاهه، دوباره چک کن.');
    process.exit(1);
  }

  const salt = webcrypto.getRandomValues(new Uint8Array(16));
  const iv = webcrypto.getRandomValues(new Uint8Array(12));

  const baseKey = await subtle.importKey(
    'raw',
    new TextEncoder().encode(normalized),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const key = await subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 150000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  const ciphertext = await subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(giftCode)
  );

  console.log('\n✅ آماده شد! این سه خط رو تو فایل index.html پیدا کن و مقادیرشون رو با این‌ها جایگزین کن:\n');
  console.log(`const SALT = "${toBase64(salt)}";`);
  console.log(`const IV = "${toBase64(iv)}";`);
  console.log(`const CIPHERTEXT = "${toBase64(ciphertext)}";`);
  console.log('\nهمین. بعد از جایگزینی، فایل رو ذخیره کن و آپلودش کن.');
}

main();
