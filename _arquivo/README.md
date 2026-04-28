# Arquivo — histórico do projeto

Esta pasta contém arquivos que **não fazem mais parte do código ativo** do sistema Pietra. Foram preservados aqui apenas para consulta histórica.

⚠️ **Nenhum arquivo desta pasta é importado pelo código em produção.** Pode ser consultada livremente, mas não deve ser referenciada por `src/`.

## Estrutura

### `versao-pre-vite/`
Versão monolítica do sistema de antes da migração para Vite. Carregava React/Babel via CDN diretamente no navegador (`<script type="text/babel">`). Não tinha Supabase e usava apenas localStorage.

- `app-legacy.jsx` — sistema completo em um arquivo único (~4200 linhas)
- `backup/` — cópia bit-idêntica que ficou na raiz do projeto

Substituído pela arquitetura atual: Vite + ES modules + Supabase (com fallback localStorage).

### `docs-obsoletas/`
Três guias de hospedagem que descreviam a arquitetura antiga (upload de 2 arquivos soltos via Netlify Drop). Não refletem mais o deploy atual, que usa Vite build + Vercel.

- `GUIA-HOSPEDAGEM.md`
- `INICIO-RAPIDO.md`
- `RESUMO-COMPLETO.md`

### `refactor-anterior/`
Componentes que foram extraídos numa primeira tentativa de refatoração que **não foi concluída**. O código continuou evoluindo na versão inline do `SistemaOrcamentoMarmore.jsx`, deixando estas versões defasadas:

- `components/budget/AmbienteCard.jsx` — sem suporte a `materialConfigs` por orçamento
- `components/budget/ResumoOrcamento.jsx` — tem "Custo Total" e custo/venda por chapa, removidos da versão em uso
- `components/cutting/PlanoCorteChapa.jsx` — tem features que a versão atual não tem: botão "Excluir Chapa Vazia", cabeçalho "PROJETO / CHAPA N/M", legenda lateral, desenho de acabamentos no canvas, rodapé. **Se alguma dessas features for desejada no futuro, o código está aqui para referência.**
- `components/preview/PreviewAcabamentos.jsx` — tem um bug com `largura`/`altura` invertidas
- `utils/pdf/etiquetas.js` / `planoCorte.js` — lógica que continuou mantida inline no componente principal
- `pages/MaterialFormPage.jsx` — **modelo de dados descontinuado**. Neste formulário, o material "possui" dimensões (comprimento/altura) e preços (custo/venda). Na arquitetura atual, o material é apenas um nome; dimensões e preços são armazenados **por orçamento** em `orcamento.materiais[materialId]`, permitindo que o mesmo material tenha preços diferentes entre orçamentos (ex: fornecedor/data/obra). **Não reativar sem mudar o modelo de dados.** A calculadora de conversão "preço por chapa inteira ↔ preço por m²" é uma ideia útil que pode ser portada para o painel de materiais do orçamento.

### `supabase/`
Cliente Supabase e schema SQL da versão anterior. O projeto migrou para **Firebase Firestore** em 2026-04-20 porque o plano free do Supabase pausa o projeto após 7 dias sem atividade. O cliente atual está em `src/lib/firebase.js` e o schema do Firestore é criado implicitamente na primeira escrita (coleções `materiais`, `orcamentos`, `config`).
