# Mimagi 3D

Sistema web para precificacao, producao e controle de estoque de uma operacao de impressao 3D.

## Tecnologias

Next.js App Router, React, TypeScript estrito, Tailwind CSS, shadcn/ui, Supabase Auth, PostgreSQL com RLS, React Hook Form, Zod, Lucide Icons, Recharts, date-fns, Sonner, ESLint, Prettier e Vitest.

## Configuracao

1. Instale dependencias: `npm install`
2. Copie `.env.example` para `.env.local`
3. Preencha `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Use `SUPABASE_SERVICE_ROLE_KEY` apenas em rotinas server-only, quando necessario
5. Rode as migracoes em `supabase/migrations`
6. Inicie: `npm run dev`

## Variaveis

`NEXT_PUBLIC_SUPABASE_URL` aponta para `https://wfxyhzbpyxpoabfndhoo.supabase.co`.
`NEXT_PUBLIC_SUPABASE_ANON_KEY` pode ser usada no cliente.
`SUPABASE_SERVICE_ROLE_KEY` nunca deve ir para componentes client-side.

## Migrações

A migration inicial cria organizacoes, perfis, configuracoes, filamentos, componentes, impressoras, produtos, composicoes, ordens de producao, movimentacoes, estrutura futura de vendas, triggers, RLS e RPCs:

- `register_filament_purchase`
- `register_supply_purchase`
- `adjust_finished_product_stock`
- `finish_production_order`

Todos os dados operacionais usam `organization_id`, e as politicas RLS restringem acesso a propria organizacao.

## Calculos

O motor fica em `src/lib/calculations/pricing.ts`.

- Filamento: peso em gramas vezes custo por grama
- Energia: `(watts / 1000) * horas * R$/kWh`
- Maquina: horas vezes custo/hora
- Mao de obra: custo fixo mais tempo vezes custo/hora
- Desperdicio: subtotal de materiais vezes percentual
- Total do lote: materiais, energia, maquina, componentes, embalagem, mao de obra e desperdicio
- Unidade: total dividido pela quantidade
- Preco sugerido: custo vezes markup
- Margem sobre a venda: lucro bruto dividido pelo preco de venda

## Primeiro produto

Cadastre filamentos e componentes, use a tela de Precificacao para simular pesos, tempo e markup, depois salve o produto em Produtos. Produtos aceitam multiplos filamentos e componentes no banco pelas tabelas `product_filaments` e `product_supplies`.

## Finalizar producao

Crie uma ordem em Producao, inicie a impressao e finalize informando quantidade produzida, falhas e minutos reais. A RPC `finish_production_order` faz a baixa de filamentos e componentes, adiciona produtos acabados, cria movimentacoes e evita finalizar novamente uma ordem concluida.

## Comandos

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

## Minerador 3D

O modulo Minerador 3D fica em `/minerador` e cria uma area separada para pesquisar oportunidades em marketplaces. Ele grava produtos normalizados, snapshots historicos, classificacao inicial, score de oportunidade, favoritos, keywords e jobs de coleta.

Principais telas:

- `/minerador`: visao geral, coleta manual e top oportunidades.
- `/oportunidades`: ranking por score.
- `/minerador/produtos`: catalogo minerado.
- `/minerador/emergentes`: produtos novos, quentes ou em subida.
- `/minerador/keywords`: cadastro e pausa de termos monitorados.
- `/minerador/favoritos`: itens separados para testar.
- `/minerador/jobs`: historico de coletas.
- `/minerador/configuracoes`: pesos e parametros do modulo.

Endpoints para automacao/n8n usam `Authorization: Bearer $CRON_SECRET` ou `x-cron-secret: $CRON_SECRET`:

- `POST /api/collect`
- `POST /api/collect/mercadolivre`
- `POST /api/collect/shopee`
- `GET /api/opportunities?organizationId=...`
- `GET /api/products?organizationId=...`
- `POST /api/keywords`
- `POST /api/analyze/product/:id`
- `POST /api/analyze/pending`
- `GET /api/health`

O adapter do Mercado Livre usa a API publica de busca. O adapter da Shopee esta preparado, mas nao coleta automaticamente enquanto nao houver API/adapter confiavel configurado. O sistema nao inventa vendas: estimativas de 7 e 30 dias dependem de diferenca entre snapshots historicos; sem historico suficiente, o score mostra isso nos motivos.

## Seguranca

O app usa Supabase Auth, middleware de protecao de rotas, Server Actions para mutacoes e RLS em todas as tabelas. Calculos criticos devem ser recalculados no servidor ou no banco; o frontend nunca recebe a service role key.
