// Chaves do localStorage
export const STORAGE_KEYS = {
  MATERIAIS: 'pietra_materiais',
  ORCAMENTOS: 'pietra_orcamentos',
  PRECOS: 'pietra_precos',
  LOGADO: 'pietra_logado'
};

// Configuração padrão de preços
export const PRECOS_PADRAO = {
  // Acabamentos (por metro linear)
  polimento: 22,
  esquadria: 35,
  boleado: 35,
  canal: 20,
  // Recortes (por unidade)
  pia: 100,
  cubaEsculpida: 630,
  cooktop: 150,
  recorte: 60,
  pes: 200
};

// Espaçamento entre peças nas chapas (mm) — espessura do disco de corte
export const ESPACAMENTO_CHAPAS = 4;

// Margem das bordas da chapa até a primeira peça (mm)
export const MARGEM_CHAPAS = 50;

// Configuração padrão de dimensões e preços de chapas
export const CONFIG_CHAPA_PADRAO = {
  comprimento: 3000,  // mm
  altura: 2000,       // mm
  custo: 250,         // R$ por m²
  venda: 333.33       // R$ por m²
};
