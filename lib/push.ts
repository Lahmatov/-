import http2 from "node:http2";
import { importPKCS8, SignJWT } from "jose";
import { db } from "./db";
import type { Lang } from "./i18n";

// Push-уведомления на iPhone через APNs. Работают, когда заданы APNS_KEY_ID, APNS_TEAM_ID и APNS_KEY
// (содержимое .p8-ключа из Apple Developer → Keys). Без них уведомления остаются только внутри приложения.

const config = () => {
  const keyId = process.env.APNS_KEY_ID;
  const teamId = process.env.APNS_TEAM_ID;
  const key = process.env.APNS_KEY?.replace(/\\n/g, "\n");
  const topic = process.env.APPLE_BUNDLE_ID?.split(",")[0]?.trim();
  if (!keyId || !teamId || !key || !topic) return null;
  const host = process.env.APNS_PRODUCTION === "true" ? "https://api.push.apple.com" : "https://api.sandbox.push.apple.com";
  return { keyId, teamId, key, topic, host };
};

export const pushEnabled = () => config() !== null;

let cachedJwt: { token: string; at: number } | null = null;

async function providerToken(c: NonNullable<ReturnType<typeof config>>) {
  // Apple просит обновлять токен не чаще раза в 20 минут и не реже раза в час.
  if (cachedJwt && Date.now() - cachedJwt.at < 40 * 60 * 1000) return cachedJwt.token;
  const key = await importPKCS8(c.key, "ES256");
  const token = await new SignJWT({}).setProtectedHeader({ alg: "ES256", kid: c.keyId }).setIssuer(c.teamId).setIssuedAt().sign(key);
  cachedJwt = { token, at: Date.now() };
  return token;
}

function send(host: string, path: string, headers: Record<string, string>, body: string) {
  return new Promise<{ status: number; reason?: string }>((resolve) => {
    const client = http2.connect(host);
    client.on("error", () => resolve({ status: 0 }));
    const req = client.request({ ":method": "POST", ":path": path, ...headers });
    let status = 0;
    let data = "";
    req.on("response", (h) => (status = Number(h[":status"])));
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      client.close();
      let reason: string | undefined;
      try {
        reason = data ? (JSON.parse(data) as { reason?: string }).reason : undefined;
      } catch {}
      resolve({ status, reason });
    });
    req.on("error", () => {
      client.close();
      resolve({ status: 0 });
    });
    req.end(body);
  });
}

/** Отправляет push на все устройства пользователя. Ошибки не роняют основной запрос. */
export async function pushToUser(userId: string, message: (lang: Lang) => { title: string; body: string }) {
  const c = config();
  if (!c) return;
  try {
    const devices = await db.deviceToken.findMany({ where: { userId } });
    if (devices.length === 0) return;
    const unread = await db.notification.count({ where: { userId, read: false } });
    const jwt = await providerToken(c);
    for (const d of devices) {
      const payload = JSON.stringify({
        aps: { alert: message(d.lang === "en" ? "en" : "ru"), sound: "default", badge: unread },
      });
      const res = await send(
        c.host,
        `/3/device/${d.token}`,
        { authorization: `bearer ${jwt}`, "apns-topic": c.topic, "apns-push-type": "alert" },
        payload,
      );
      // Устройство удалило приложение или токен устарел — забываем его.
      if (res.status === 410 || res.reason === "BadDeviceToken" || res.reason === "Unregistered") {
        await db.deviceToken.deleteMany({ where: { token: d.token } });
      }
    }
  } catch (e) {
    console.error("APNs push failed", e);
  }
}
