// Formatar valor em R$ brasileiro (R$ 1.234,56)
export const formatBRL = (valor) => {
  return 'R$ ' + Number(valor).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};
