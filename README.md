# Mimagi 3D

Sistema web para precificacao, vendas e controle de estoque de uma operacao de impressao 3D.

## Tecnologias

Next.js App Router, React, TypeScript estrito, Tailwind CSS, shadcn/ui, Supabase Auth, PostgreSQL com RLS, React Hook Form, Zod, Lucide Icons, date-fns, Sonner, ESLint, Prettier e Vitest.

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

A migration inicial cria organizacoes, perfis, configuracoes, filamentos, componentes, impressoras, produtos, composicoes, movimentacoes, estrutura de vendas, triggers, RLS e RPCs.

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

## Comandos

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

## Seguranca

O app usa Supabase Auth, middleware de protecao de rotas, Server Actions para mutacoes e RLS em todas as tabelas. Calculos criticos devem ser recalculados no servidor ou no banco; o frontend nunca recebe a service role key.
