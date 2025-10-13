# Variáveis de Ambiente (MVP)

Crie um arquivo `.env.local` (não versionado) na raiz do projeto com as chaves abaixo. Se preferir versionar um exemplo, crie `env.example` (sem ponto) e renomeie localmente.

Recomendado: use valores de sandbox para desenvolvimento.

```
DATABASE_URL=
MP_ACCESS_TOKEN=
MP_WEBHOOK_SECRET=
NEXT_PUBLIC_META_PIXEL_ID=
SITE_URL=http://localhost:3000
```

Notas:
- `SITE_URL`: usado nos retornos do checkout e para compor URLs absolutas em hooks/webhooks.
- `MP_WEBHOOK_SECRET`: somente se aplicar ao método de verificação utilizado.
- `DATABASE_URL`: conexão do Postgres (Supabase Free no MVP).
