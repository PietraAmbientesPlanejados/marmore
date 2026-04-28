# Pietra — Sistema de Orçamento de Mármore e Granito

Sistema de orçamento, plano de corte e emissão de etiquetas para a Pietra Móveis e Revestimentos.

## Stack

- **React 18** + **Vite 5**
- **TailwindCSS 3**
- **Supabase** como banco de dados (com fallback automático para `localStorage` se não configurado)
- **jsPDF** para geração de PDFs (relatório, etiquetas térmicas)

## Scripts

```bash
npm install        # instalar dependências
npm run dev        # servidor de desenvolvimento em http://localhost:3000
npm run build      # build de produção em dist/
npm run preview    # preview do build de produção
```

## Estrutura de pastas

```
marmore/
├── _arquivo/                    # histórico do projeto — NÃO é código ativo
├── src/
│   ├── App.jsx                  # roteamento login ⇄ sistema
│   ├── main.jsx                 # entry point
│   ├── SistemaOrcamentoMarmore.jsx  # componente principal (orquestração)
│   │
│   ├── components/
│   │   ├── auth/                # tela de login
│   │   ├── budget/              # AmbienteCard, ResumoOrcamento
│   │   ├── cutting/             # PlanoCorteChapa (canvas com drag&drop)
│   │   └── preview/             # PreviewAcabamentos
│   │
│   ├── hooks/                   # usePrecos, useMaterials, useBudgets
│   ├── pages/                   # HomePage, MaterialFormPage
│   ├── lib/                     # cliente Supabase
│   ├── constants/               # config (preços padrão, dimensões, chaves) + icons
│   ├── styles/                  # Tailwind entry
│   └── utils/
│       ├── calculations.js      # cálculos de orçamento e custo por peça
│       ├── cuttingOptimization.js  # Shelf + Bottom-Left para encaixe de peças
│       ├── database.js          # CRUD Supabase com fallback localStorage
│       ├── formatters.js        # formatBRL
│       └── pdf/                 # geradores de PDF (etiquetas, relatório)
```

## Fluxo de dados

1. **Login** → `TelaLogin` escreve a flag `pietra_logado` em localStorage.
2. **App** lê essa flag e renderiza `SistemaOrcamentoMarmore`.
3. **Hooks** (`useBudgets`, `useMaterials`, `usePrecos`) encapsulam o acesso aos dados. Cada um tenta Supabase primeiro e cai para localStorage se não estiver configurado.
4. **SistemaOrcamentoMarmore** orquestra telas (`lista`, `orcamento`, `plano-corte`, `novo-material`, `editar-material`) via `useState`.

## Variáveis de ambiente

Opcionais — se não configuradas, o sistema usa localStorage:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Schema SQL em [src/constants/supabase.sql](src/constants/supabase.sql).

## Deploy

Configurado para Vercel via [vercel.json](vercel.json). Build roda `npm run build` e publica `dist/`.

## Histórico

Arquivos pré-refatoração (app.jsx monolítico, tentativa anterior de modularização, docs de hospedagem antigas) ficam em [_arquivo/](_arquivo/) para consulta. Ver [_arquivo/README.md](_arquivo/README.md).
