import { Suspense } from "react";
import CheckoutClient from "./CheckoutClient";

export default function Page() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-2xl p-6 md:p-8">
          <div className="rounded-md border p-4 text-sm text-muted-foreground">Carregando…</div>
        </main>
      }
    >
      <CheckoutClient />
    </Suspense>
  );
}
