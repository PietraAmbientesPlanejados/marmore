import { ESPACAMENTO_CHAPAS } from '../constants/config';

/**
 * Converte área de mm² para m²
 */
export const mm2ToM2 = (areaMm2) => {
  return areaMm2 / 1000000;
};

/**
 * Calcula área em m² a partir de dimensões em mm
 */
export const calcularAreaM2 = (comprimentoMm, alturaMm) => {
  return mm2ToM2(comprimentoMm * alturaMm);
};

/**
 * Converte preço por chapa para preço por m²
 */
export const converterPrecoParaM2 = (precoChapa, comprimentoMm, alturaMm) => {
  const areaM2 = calcularAreaM2(comprimentoMm, alturaMm);
  return precoChapa / areaM2;
};

/**
 * Calcula os custos detalhados de uma única peça
 */
export const calcularCustosPeca = (peca, material, precos) => {
  if (!peca || !material) return { area: 0, custoMaterial: 0, acabamentos: 0, recortes: 0, total: 0, detalhesAcabamentos: [], detalhesRecortes: [] };

  const largura = peca.rotacao === 90 ? peca.altura : peca.comprimento;
  const altura = peca.rotacao === 90 ? peca.comprimento : peca.altura;
  const area = calcularAreaM2(largura, altura);

  // Custo do material (área × preço de venda)
  const custoMaterial = area * (material.venda || material.custo);

  // Calcular acabamentos
  let totalAcabamentos = 0;
  const detalhesAcabamentos = [];

  if (peca.acabamentos) {
    ['esquadria', 'boleado', 'polimento', 'canal'].forEach(tipo => {
      // Verificar se existe valor personalizado
      const valorPersonalizado = peca.acabamentosPersonalizados?.[tipo];

      if (valorPersonalizado && parseFloat(valorPersonalizado) > 0) {
        // Usar valor personalizado (já está em metros)
        const metros = parseFloat(valorPersonalizado);
        const valor = metros * precos[tipo];
        totalAcabamentos += valor;
        detalhesAcabamentos.push({ tipo, metros: metros.toFixed(2), valor });
      } else {
        // Usar cálculo tradicional pelos lados
        const acab = peca.acabamentos[tipo];
        if (acab && acab.ativo) {
          let totalMm = 0;
          const lados = acab.lados;
          if (lados.superior) totalMm += largura;
          if (lados.inferior) totalMm += largura;
          if (lados.esquerda) totalMm += altura;
          if (lados.direita) totalMm += altura;

          if (totalMm > 0) {
            const metros = totalMm / 1000;
            const valor = metros * precos[tipo];
            totalAcabamentos += valor;
            detalhesAcabamentos.push({ tipo, metros: metros.toFixed(2), valor });
          }
        }
      }
    });
  }

  // Calcular recortes
  let totalRecortes = 0;
  const detalhesRecortes = [];

  if (peca.cuba && peca.cuba > 0) {
    const valor = peca.cuba * precos.pia;
    totalRecortes += valor;
    detalhesRecortes.push({ tipo: 'Cuba', quantidade: peca.cuba, valor });
  }
  if (peca.cubaEsculpida && peca.cubaEsculpida > 0) {
    const valor = peca.cubaEsculpida * precos.cubaEsculpida;
    totalRecortes += valor;
    detalhesRecortes.push({ tipo: 'Cuba Esculpida', quantidade: peca.cubaEsculpida, valor });
  }
  if (peca.cooktop && peca.cooktop > 0) {
    const valor = peca.cooktop * precos.cooktop;
    totalRecortes += valor;
    detalhesRecortes.push({ tipo: 'Cooktop', quantidade: peca.cooktop, valor });
  }
  if (peca.recorte && peca.recorte > 0) {
    const valor = peca.recorte * precos.recorte;
    totalRecortes += valor;
    detalhesRecortes.push({ tipo: 'Recorte', quantidade: peca.recorte, valor });
  }
  if (peca.pes && peca.pes > 0) {
    const valor = peca.pes * precos.pes;
    totalRecortes += valor;
    detalhesRecortes.push({ tipo: 'Pés', quantidade: peca.pes, valor });
  }

  return {
    area,
    custoMaterial,
    acabamentos: totalAcabamentos,
    recortes: totalRecortes,
    total: custoMaterial + totalAcabamentos + totalRecortes,
    detalhesAcabamentos,
    detalhesRecortes
  };
};

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

    // Obter configuração do material para este orçamento
    const materialConfig = orcamento.materiais?.[parseInt(materialId)] || {
      comprimento: 3000,
      altura: 2000,
      custo: 250,
      venda: 333.33
    };

    const pecas = pecasPorMaterial[materialId];

    pecas.forEach(peca => {
      let colocada = false;

      // Tentar colocar nas chapas existentes primeiro
      for (let chapa of chapas.filter(c => c.materialId === parseInt(materialId))) {
        const pos = encontrarPosicaoNaChapa(chapa, peca, materialConfig, espacamento);
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
          material: { ...material, ...materialConfig }, // Combinar nome do material com suas dimensões/preços
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
export const encontrarPosicaoNaChapa = (chapa, peca, materialConfig, espacamento) => {
  const larguraChapa = materialConfig.comprimento;
  const alturaChapa = materialConfig.altura;

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

  // NOVA LÓGICA: Cálculo por m²
  let custoChapas = 0;
  let vendaChapas = 0;
  const chapasPorMaterial = {};
  const detalhesChapas = [];

  orcamentoAtual.chapas.forEach(chapa => {
    const material = materiais.find(m => m.id === chapa.materialId);
    if (!material) return;

    // Obter configuração do material para este orçamento
    const materialConfig = orcamentoAtual.materiais?.[chapa.materialId] || {
      comprimento: 3000,
      altura: 2000,
      custo: 250,
      venda: 333.33
    };

    // Contar chapas por material (para exibição)
    const key = chapa.materialId;
    chapasPorMaterial[key] = (chapasPorMaterial[key] || 0) + 1;

    // Calcular área total da chapa em m²
    const areaTotalChapa = calcularAreaM2(materialConfig.comprimento, materialConfig.altura);

    // Calcular área total das peças nesta chapa
    let areaPecasM2 = 0;
    chapa.pecas.forEach(peca => {
      const larguraPeca = peca.rotacao === 90 ? peca.altura : peca.comprimento;
      const alturaPeca = peca.rotacao === 90 ? peca.comprimento : peca.altura;
      areaPecasM2 += calcularAreaM2(larguraPeca, alturaPeca);
    });

    // Calcular área da sobra
    const areaSobraM2 = areaTotalChapa - areaPecasM2;

    // Cobrar peças pelo preço de VENDA por m²
    const vendaPecas = areaPecasM2 * (materialConfig.venda || 333.33);

    // Cobrar sobra pelo preço de CUSTO por m²
    const custoSobra = areaSobraM2 * (materialConfig.custo || 250);

    // Adicionar custo base das peças (necessário para cálculo de margem)
    const custoPecas = areaPecasM2 * (materialConfig.custo || 250);

    // Acumular totais
    // Cliente paga: peças (preço venda) + sobra (preço custo)
    vendaChapas += vendaPecas + custoSobra;
    // Custo real: peças (preço custo) + sobra (preço custo)
    custoChapas += custoPecas + custoSobra;

    // Guardar detalhes para exibição
    detalhesChapas.push({
      chapaId: chapa.id,
      materialId: material.id,
      materialNome: material.nome,
      areaTotal: areaTotalChapa,
      areaPecas: areaPecasM2,
      areaSobra: areaSobraM2,
      custoSobra: custoSobra,
      custoPecas: custoPecas,
      vendaPecas: vendaPecas,
      percentualAproveitamento: (areaPecasM2 / areaTotalChapa) * 100
    });
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

        const tiposAcabamento = [
          { tipo: 'esquadria', nome: 'Esquadria' },
          { tipo: 'boleado', nome: 'Boleado' },
          { tipo: 'polimento', nome: 'Polimento' },
          { tipo: 'canal', nome: 'Canal' }
        ];

        tiposAcabamento.forEach(({ tipo, nome }) => {
          // Verificar se existe valor personalizado
          const valorPersonalizado = peca.acabamentosPersonalizados?.[tipo];

          if (valorPersonalizado && parseFloat(valorPersonalizado) > 0) {
            // Usar valor personalizado (já está em metros)
            const metros = parseFloat(valorPersonalizado);
            const valor = metros * precos[tipo];
            totalAcabamentos += valor;
            detalhesAcabamentos.push({
              tipo: nome,
              peca: nomePeca,
              medida: `${(metros * 1000).toFixed(0)}mm`,
              valor
            });
          } else if (peca.acabamentos[tipo] && peca.acabamentos[tipo].ativo) {
            // Usar cálculo tradicional pelos lados
            let totalMm = 0;
            const lados = peca.acabamentos[tipo].lados;
            if (lados.superior) totalMm += largura;
            if (lados.inferior) totalMm += largura;
            if (lados.esquerda) totalMm += altura;
            if (lados.direita) totalMm += altura;

            if (totalMm > 0) {
              const valor = (totalMm / 1000) * precos[tipo];
              totalAcabamentos += valor;
              detalhesAcabamentos.push({
                tipo: nome,
                peca: nomePeca,
                medida: `${totalMm}mm`,
                valor
              });
            }
          }
        });
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

  const margemChapas = (vendaChapas || 0) - (custoChapas || 0);
  const custoTotal = (custoChapas || 0) + (totalAcabamentos || 0) + (totalRecortes || 0);
  const vendaTotal = (vendaChapas || 0) + (totalAcabamentos || 0) + (totalRecortes || 0);
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
    detalhesChapas,
    detalhesAcabamentos,
    detalhesRecortes,
    // Manter compatibilidade com código antigo
    subtotal: vendaChapas,
    total: vendaTotal
  };
};
