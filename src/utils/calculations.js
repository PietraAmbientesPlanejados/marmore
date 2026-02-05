import { ESPACAMENTO_CHAPAS } from '../constants/config';

/**
 * Organiza todas as peças de um orçamento em chapas de material
 * Retorna o orçamento atualizado com chapas e peças posicionadas
 */
export const organizarPecasEmChapas = (orcamento, materiais) => {
  const todasPecas = orcamento.ambientes.flatMap(amb => amb.pecas);
  const chapas = [];
  const espacamento = ESPACAMENTO_CHAPAS;

  // Agrupar por material
  const pecasPorMaterial = {};
  todasPecas.forEach(peca => {
    if (!pecasPorMaterial[peca.materialId]) {
      pecasPorMaterial[peca.materialId] = [];
    }
    pecasPorMaterial[peca.materialId].push(peca);
  });

  // Para cada material, organizar em chapas
  Object.keys(pecasPorMaterial).forEach(materialId => {
    const material = materiais.find(m => m.id === parseInt(materialId));
    if (!material) return;

    const pecas = pecasPorMaterial[materialId];

    pecas.forEach(peca => {
      let colocada = false;

      // Tentar colocar nas chapas existentes primeiro
      for (let chapa of chapas.filter(c => c.materialId === parseInt(materialId))) {
        const pos = encontrarPosicaoNaChapa(chapa, peca, material, espacamento);
        if (pos) {
          peca.chapaId = chapa.id;
          peca.posX = pos.x;
          peca.posY = pos.y;
          chapa.pecas.push(peca);
          colocada = true;
          break;
        }
      }

      // Se não coube em nenhuma chapa existente, criar nova
      if (!colocada) {
        const novaChapa = {
          id: Date.now() + Math.random(),
          materialId: parseInt(materialId),
          material,
          pecas: []
        };

        peca.chapaId = novaChapa.id;
        peca.posX = espacamento;
        peca.posY = espacamento;
        novaChapa.pecas.push(peca);
        chapas.push(novaChapa);
      }
    });
  });

  // Atualizar ambientes com as peças posicionadas
  const ambientesAtualizados = orcamento.ambientes.map(amb => ({
    ...amb,
    pecas: amb.pecas.map(p => {
      const pecaAtualizada = todasPecas.find(tp => tp.id === p.id);
      return pecaAtualizada || p;
    })
  }));

  return { ...orcamento, chapas, ambientes: ambientesAtualizados };
};

/**
 * Encontra uma posição válida para uma peça dentro de uma chapa
 * Considera rotação da peça e espaçamento entre peças
 */
export const encontrarPosicaoNaChapa = (chapa, peca, material, espacamento) => {
  const larguraChapa = material.comprimento;
  const alturaChapa = material.altura;

  // Considerar rotação da peça
  const pecaLargura = peca.rotacao === 90 ? peca.altura : peca.comprimento;
  const pecaAltura = peca.rotacao === 90 ? peca.comprimento : peca.altura;

  // Tentar diferentes posições, começando do canto superior esquerdo
  for (let y = espacamento; y + pecaAltura + espacamento <= alturaChapa; y += 5) {
    for (let x = espacamento; x + pecaLargura + espacamento <= larguraChapa; x += 5) {
      // Verificar se não sobrepõe com outras peças (considerando espaçamento de 4mm)
      const sobrepoe = chapa.pecas.some(p => {
        const pLargura = p.rotacao === 90 ? p.altura : p.comprimento;
        const pAltura = p.rotacao === 90 ? p.comprimento : p.altura;

        const distanciaX = Math.abs((x + pecaLargura / 2) - (p.posX + pLargura / 2));
        const distanciaY = Math.abs((y + pecaAltura / 2) - (p.posY + pAltura / 2));
        const somaLarguras = (pecaLargura + pLargura) / 2 + espacamento;
        const somaAlturas = (pecaAltura + pAltura) / 2 + espacamento;

        return distanciaX < somaLarguras && distanciaY < somaAlturas;
      });

      if (!sobrepoe) {
        return { x, y };
      }
    }
  }
  return null;
};

/**
 * Calcula os detalhes financeiros completos de um orçamento
 * Retorna custos, vendas, margens e detalhes de acabamentos e recortes
 */
export const calcularOrcamentoComDetalhes = (orcamentoAtual, materiais, precos) => {
  if (!orcamentoAtual) return {
    custoChapas: 0,
    vendaChapas: 0,
    margemChapas: 0,
    acabamentos: 0,
    recortes: 0,
    custoTotal: 0,
    vendaTotal: 0,
    margemTotal: 0,
    chapasPorMaterial: {},
    detalhesAcabamentos: [],
    detalhesRecortes: []
  };

  let custoChapas = 0;
  let vendaChapas = 0;
  const chapasPorMaterial = {};

  // Contar chapas por material
  orcamentoAtual.chapas.forEach(chapa => {
    const key = chapa.materialId;
    chapasPorMaterial[key] = (chapasPorMaterial[key] || 0) + 1;
  });

  // Calcular custo e venda das chapas
  Object.keys(chapasPorMaterial).forEach(materialId => {
    const material = materiais.find(m => m.id === parseInt(materialId));
    if (material) {
      const quantidade = chapasPorMaterial[materialId];
      custoChapas += material.custo * quantidade;
      vendaChapas += (material.venda || material.custo) * quantidade;
    }
  });

  let totalAcabamentos = 0;
  let totalRecortes = 0;
  const detalhesAcabamentos = [];
  const detalhesRecortes = [];

  orcamentoAtual.ambientes.forEach((ambiente, ambIdx) => {
    ambiente.pecas.forEach((peca, pecaIdx) => {
      const nomePeca = peca.nome || `${ambiente.nome} - Peça #${pecaIdx + 1}`;

      // Calcular acabamentos por lado
      if (peca.acabamentos) {
        const largura = peca.rotacao === 90 ? peca.altura : peca.comprimento;
        const altura = peca.rotacao === 90 ? peca.comprimento : peca.altura;

        // Esquadria
        if (peca.acabamentos.esquadria && peca.acabamentos.esquadria.ativo) {
          let totalMm = 0;
          const lados = peca.acabamentos.esquadria.lados;
          if (lados.superior) totalMm += largura;
          if (lados.inferior) totalMm += largura;
          if (lados.esquerda) totalMm += altura;
          if (lados.direita) totalMm += altura;

          if (totalMm > 0) {
            const valor = (totalMm / 1000) * precos.esquadria;
            totalAcabamentos += valor;
            detalhesAcabamentos.push({
              tipo: 'Esquadria',
              peca: nomePeca,
              medida: `${totalMm}mm`,
              valor
            });
          }
        }

        // Boleado
        if (peca.acabamentos.boleado && peca.acabamentos.boleado.ativo) {
          let totalMm = 0;
          const lados = peca.acabamentos.boleado.lados;
          if (lados.superior) totalMm += largura;
          if (lados.inferior) totalMm += largura;
          if (lados.esquerda) totalMm += altura;
          if (lados.direita) totalMm += altura;

          if (totalMm > 0) {
            const valor = (totalMm / 1000) * precos.boleado;
            totalAcabamentos += valor;
            detalhesAcabamentos.push({
              tipo: 'Boleado',
              peca: nomePeca,
              medida: `${totalMm}mm`,
              valor
            });
          }
        }

        // Polimento
        if (peca.acabamentos.polimento && peca.acabamentos.polimento.ativo) {
          let totalMm = 0;
          const lados = peca.acabamentos.polimento.lados;
          if (lados.superior) totalMm += largura;
          if (lados.inferior) totalMm += largura;
          if (lados.esquerda) totalMm += altura;
          if (lados.direita) totalMm += altura;

          if (totalMm > 0) {
            const valor = (totalMm / 1000) * precos.polimento;
            totalAcabamentos += valor;
            detalhesAcabamentos.push({
              tipo: 'Polimento',
              peca: nomePeca,
              medida: `${totalMm}mm`,
              valor
            });
          }
        }

        // Canal
        if (peca.acabamentos.canal && peca.acabamentos.canal.ativo) {
          let totalMm = 0;
          const lados = peca.acabamentos.canal.lados;
          if (lados.superior) totalMm += largura;
          if (lados.inferior) totalMm += largura;
          if (lados.esquerda) totalMm += altura;
          if (lados.direita) totalMm += altura;

          if (totalMm > 0) {
            const valor = (totalMm / 1000) * precos.canal;
            totalAcabamentos += valor;
            detalhesAcabamentos.push({
              tipo: 'Canal',
              peca: nomePeca,
              medida: `${totalMm}mm`,
              valor
            });
          }
        }
      }

      // Recortes (usando preços configuráveis)
      if (peca.cuba && peca.cuba > 0) {
        const valor = peca.cuba * precos.pia;
        totalRecortes += valor;
        detalhesRecortes.push({
          tipo: 'Cuba',
          peca: nomePeca,
          quantidade: peca.cuba,
          valorUnit: precos.pia,
          valor
        });
      }

      if (peca.cubaEsculpida && peca.cubaEsculpida > 0) {
        const valor = peca.cubaEsculpida * precos.cubaEsculpida;
        totalRecortes += valor;
        detalhesRecortes.push({
          tipo: 'Cuba Esculpida',
          peca: nomePeca,
          quantidade: peca.cubaEsculpida,
          valorUnit: precos.cubaEsculpida,
          valor
        });
      }

      if (peca.cooktop && peca.cooktop > 0) {
        const valor = peca.cooktop * precos.cooktop;
        totalRecortes += valor;
        detalhesRecortes.push({
          tipo: 'Cooktop',
          peca: nomePeca,
          quantidade: peca.cooktop,
          valorUnit: precos.cooktop,
          valor
        });
      }

      if (peca.recorte && peca.recorte > 0) {
        const valor = peca.recorte * precos.recorte;
        totalRecortes += valor;
        detalhesRecortes.push({
          tipo: 'Recorte',
          peca: nomePeca,
          quantidade: peca.recorte,
          valorUnit: precos.recorte,
          valor
        });
      }

      if (peca.pes && peca.pes > 0) {
        const valor = peca.pes * precos.pes;
        totalRecortes += valor;
        detalhesRecortes.push({
          tipo: 'Pés',
          peca: nomePeca,
          quantidade: peca.pes,
          valorUnit: precos.pes,
          valor
        });
      }
    });
  });

  const margemChapas = vendaChapas - custoChapas;
  const custoTotal = custoChapas + totalAcabamentos + totalRecortes;
  const vendaTotal = vendaChapas + totalAcabamentos + totalRecortes;
  const margemTotal = vendaTotal - custoTotal;

  return {
    custoChapas,
    vendaChapas,
    margemChapas,
    acabamentos: totalAcabamentos,
    recortes: totalRecortes,
    custoTotal,
    vendaTotal,
    margemTotal,
    chapasPorMaterial,
    detalhesAcabamentos,
    detalhesRecortes,
    // Manter compatibilidade com código antigo
    subtotal: vendaChapas,
    total: vendaTotal
  };
};
