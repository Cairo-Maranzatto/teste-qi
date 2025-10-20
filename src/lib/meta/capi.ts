import { env } from "@/lib/common/env";
import crypto from "crypto";

function sha256Lower(s: string) {
  return crypto.createHash("sha256").update(s.trim().toLowerCase()).digest("hex");
}

type PurchaseArgs = {
  pixelId: string;
  accessToken: string;
  testEventCode?: string;
  eventId: string;
  eventTime: number;
  eventSourceUrl?: string;
  value: number;
  currency: string;
  fbp?: string | null;
  fbc?: string | null;
  email?: string | null;
  externalId?: string | null;
};

export async function sendPurchase(args: PurchaseArgs) {
  const url = `https://graph.facebook.com/v20.0/${args.pixelId}/events`;
  const user_data: any = {};
  if (args.fbp) user_data.fbp = args.fbp;
  if (args.fbc) user_data.fbc = args.fbc;
  if (args.email) user_data.em = [sha256Lower(args.email)];
  if (args.externalId) user_data.external_id = [sha256Lower(args.externalId)];
  const body: any = {
    data: [
      {
        event_name: "Purchase",
        event_time: args.eventTime,
        action_source: "website",
        event_id: args.eventId,
        event_source_url: args.eventSourceUrl,
        custom_data: { value: args.value, currency: args.currency },
        user_data,
      },
    ],
    access_token: args.accessToken,
  };
  if (args.testEventCode) body.test_event_code = args.testEventCode;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`CAPI ${res.status}: ${t}`);
  }
  return res.json();
}

export async function sendPurchaseFromWebhook(p: {
  providerPaymentId: string;
  amountCents: number;
  sessionId: string;
  payerEmail?: string | null;
  externalReferenceRaw?: string | null;
}) {
  const pixelId = env.NEXT_PUBLIC_META_PIXEL_ID;
  const accessToken = env.META_ACCESS_TOKEN;
  if (!pixelId || !accessToken) return;
  const now = Math.floor(Date.now() / 1000);
  const [sid, fbp, fbc] = String(p.externalReferenceRaw ?? p.sessionId ?? "").split("|");
  const eventSourceUrl = `${env.SITE_URL}/test/${sid || p.sessionId}/result`;
  const value = Math.round(p.amountCents) / 100;
  await sendPurchase({
    pixelId,
    accessToken,
    testEventCode: env.META_TEST_EVENT_CODE || undefined,
    eventId: p.providerPaymentId,
    eventTime: now,
    eventSourceUrl,
    value,
    currency: "BRL",
    fbp: fbp || undefined,
    fbc: fbc || undefined,
    email: p.payerEmail || undefined,
    externalId: sid || p.sessionId,
  });
}
