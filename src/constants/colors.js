// Paleta usada para identificar ambientes visualmente.
// Os índices são consistentes entre o card de ambiente (tela de orçamento)
// e o desenho das peças no plano de corte.
export const CORES_AMBIENTES = [
  '#3b82f6', // azul
  '#10b981', // verde
  '#8b5cf6', // roxo
  '#f59e0b', // âmbar
  '#ef4444', // vermelho
  '#06b6d4', // ciano
  '#ec4899', // rosa
  '#14b8a6', // teal
  '#84cc16', // lima
  '#f97316', // laranja
];

export const corDoAmbiente = (idx) => CORES_AMBIENTES[idx % CORES_AMBIENTES.length];

/**
 * Gera um "tema" com variações da cor base (para borders, backgrounds, etc).
 * Usa rgba para cores suaves sem precisar do Tailwind.
 */
export const temaDoAmbiente = (idx) => {
  const base = corDoAmbiente(idx);
  const r = parseInt(base.slice(1, 3), 16);
  const g = parseInt(base.slice(3, 5), 16);
  const b = parseInt(base.slice(5, 7), 16);
  return {
    base,
    border: `rgba(${r}, ${g}, ${b}, 0.35)`,
    bgLight: `rgba(${r}, ${g}, ${b}, 0.08)`,
    bgSoft: `rgba(${r}, ${g}, ${b}, 0.16)`,
  };
};
