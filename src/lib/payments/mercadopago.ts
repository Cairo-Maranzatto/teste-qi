import { env } from "@/lib/common/env";

type CreatePreferenceInput = {
  sessionId: string;
  amountCents: number;
  title?: string;
  description?: string;
  backUrlSuccess: string;
  backUrlFailure: string;
  backUrlPending: string;
  metadata?: Record<string, unknown>;
  fbp?: string | null;
  fbc?: string | null;
};

export async function createPreference(input: CreatePreferenceInput) {
  if (!env.MP_ACCESS_TOKEN) throw new Error("MP_ACCESS_TOKEN ausente");

  // Em ambientes locais (localhost/127.0.0.1), alguns validadores do MP rejeitam auto_return.
  // Vamos incluir auto_return apenas quando a SITE_URL não for local.
  let allowAutoReturn = true;
  try {
    const u = new URL(env.SITE_URL);
    const h = (u.hostname || "").toLowerCase();
    if (h === "localhost" || h === "127.0.0.1") allowAutoReturn = false;
  } catch {
    // Se SITE_URL inválida, também não forçar auto_return
    allowAutoReturn = false;
  }

  const extRefRaw = [input.sessionId, input.fbp ?? "", input.fbc ?? ""].join("|");
  const extRef = extRefRaw.replace(/\s+/g, " ").slice(0, 200);

  const body: any = {
    items: [
      {
        title: input.title ?? "Resultado do Teste de QI",
        description: input.description ?? "Acesso ao resultado completo",
        quantity: 1,
        unit_price: Math.round(input.amountCents) / 100,
        currency_id: "BRL",
      },
    ],
    back_urls: {
      success: input.backUrlSuccess,
      failure: input.backUrlFailure,
      pending: input.backUrlPending,
    },
    external_reference: extRef,
    metadata: input.metadata ?? {},
    notification_url: `${env.SITE_URL}/api/payments/webhooks/mercadopago`,
  };

  if (allowAutoReturn) {
    body.auto_return = "approved" as const;
  }

  const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.MP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`MP create preference failed: ${res.status} ${txt}`);
  }
  return (await res.json()) as {
    id: string;
    init_point?: string;
    sandbox_init_point?: string;
    external_reference?: string;
  };
}

export async function getPayment(paymentId: string) {
  if (!env.MP_ACCESS_TOKEN) throw new Error("MP_ACCESS_TOKEN ausente");
  const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${env.MP_ACCESS_TOKEN}` },
    cache: "no-store",
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`MP get payment failed: ${res.status} ${txt}`);
  }
  return (await res.json()) as {
    id: number;
    status: "approved" | "pending" | "rejected" | string;
    transaction_amount: number;
    payer?: { email?: string };
    external_reference?: string;
  };
}

export function verifyWebhookSignature(_headers: Headers, _rawBody: string): boolean {
  // Nota: Implementar assinatura quando configurada. Por ora, aceitar sempre em dev.
  return true;
}
