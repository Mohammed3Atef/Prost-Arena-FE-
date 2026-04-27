import { OtpCode } from '@/lib/db/models/otpCode';
import { operationalError } from '@/lib/server/error';

const OTP_TTL_SECONDS = 300;
const MAX_ATTEMPTS = 5;

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function deliverViaTwilio(phone: string, code: string): Promise<void> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!sid || !token || !from) return;

  // Hidden from static bundlers (Turbopack/Webpack). Twilio is optional;
  // we only load it when env credentials are present.
  const moduleName = 'twilio';
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const twilio = (eval('require'))(moduleName);
  const client = twilio(sid, token);
  await client.messages.create({
    body: `Your Prost Arena code is: ${code}. Valid for 5 minutes.`,
    from,
    to: phone,
  });
}

export async function sendOtp(phone: string): Promise<true> {
  const code = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000);

  await OtpCode.findOneAndUpdate(
    { phone },
    { phone, code, attempts: 0, expiresAt },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    try {
      await deliverViaTwilio(phone, code);
      console.log(`[otp] sent via SMS to ${phone}`);
    } catch (err) {
      console.error(`[otp] SMS delivery failed for ${phone}:`, err);
      throw operationalError('Failed to send OTP — please try again', 503);
    }
  } else {
    console.log(`[otp] 📱 OTP for ${phone}: ${code}  (dev mode — no SMS sent)`);
  }

  return true;
}

export async function verifyOtp(phone: string, code: string): Promise<true> {
  const record = await OtpCode.findOne({ phone });
  if (!record || record.expiresAt.getTime() < Date.now()) {
    throw operationalError('OTP expired or not found — request a new one', 400);
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    await OtpCode.deleteOne({ phone });
    throw operationalError('Too many attempts — request a new OTP', 429);
  }

  if (record.code !== String(code)) {
    record.attempts += 1;
    await record.save();
    throw operationalError('Incorrect OTP', 400);
  }

  await OtpCode.deleteOne({ phone });
  return true;
}
