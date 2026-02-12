import { jsPDF } from 'jspdf';
import { calcularCustosPeca, calcularOrcamentoComDetalhes, calcularAreaM2 } from '../calculations';
import { formatBRL } from '../formatters';

/**
 * Gera PDF de relatório do orçamento com lista de peças e valores
 * Formato A4 retrato - preto e branco para impressão
 */
export const gerarRelatorioPDF = (orcamentoAtual, materiais, precos) => {
  if (!orcamentoAtual || !orcamentoAtual.ambientes || orcamentoAtual.ambientes.length === 0) {
    alert('Nenhuma peça no orçamento para gerar relatório.');
    return;
  }

  const todasPecas = orcamentoAtual.ambientes.flatMap(amb => amb.pecas);
  if (todasPecas.length === 0) {
    alert('Nenhuma peça no orçamento para gerar relatório.');
    return;
  }

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = 210;
  const pageH = 297;
  const margin = 10;
  const contentW = pageW - margin * 2;
  const rightEdge = pageW - margin;
  let y = 0;

  const orcamento = calcularOrcamentoComDetalhes(orcamentoAtual, materiais, precos);

  // Função para verificar se precisa de nova página
  const checkNewPage = (needed) => {
    if (y + needed > pageH - 10) {
      pdf.addPage();
      y = margin;
      return true;
    }
    return false;
  };

  // Função para desenhar linha horizontal
  const hLine = (yPos, weight) => {
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(weight || 0.3);
    pdf.line(margin, yPos, rightEdge, yPos);
  };

  // ===== HEADER =====
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  y = 14;
  pdf.text('PIETRA MÓVEIS E REVESTIMENTOS', pageW / 2, y, { align: 'center' });

  y += 5;
  hLine(y, 0.5);
  y += 4;

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text('pietramoveiserevestimentos@gmail.com | (19) 99978-0110', pageW / 2, y, { align: 'center' });

  y += 6;
  pdf.setFontSize(13);
  pdf.setFont('helvetica', 'bold');
  pdf.text('RELATÓRIO DO ORÇAMENTO', pageW / 2, y, { align: 'center' });

  y += 5;
  hLine(y, 0.5);
  y += 7;

  // ===== INFO DO ORÇAMENTO =====
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Cliente:', margin, y);
  pdf.setFont('helvetica', 'normal');
  pdf.text(orcamentoAtual.nome || 'Sem nome', margin + 22, y);

  pdf.setFont('helvetica', 'bold');
  pdf.text('Data:', rightEdge - 42, y);
  pdf.setFont('helvetica', 'normal');
  pdf.text(new Date().toLocaleDateString('pt-BR'), rightEdge - 26, y);

  y += 8;
  hLine(y, 0.3);
  y += 6;

  // ===== PEÇAS POR AMBIENTE =====
  const col = {
    nome:     margin + 1,
    dim:      margin + 34,
    material: margin + 62,
    area:     margin + 96,
    qtd:      margin + 110,
    matVal:   margin + 120,
    acab:     margin + 140,
    rec:      margin + 156,
    total:    margin + 172,
  };

  orcamentoAtual.ambientes.forEach((ambiente) => {
    const pecasAmbiente = ambiente.pecas;
    if (!pecasAmbiente || pecasAmbiente.length === 0) return;

    checkNewPage(20);

    // Título do ambiente
    pdf.setFillColor(230, 230, 230);
    pdf.rect(margin, y - 5, contentW, 8, 'F');
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text(ambiente.nome.toUpperCase(), margin + 2, y);
    y += 7;

    // Cabeçalho da tabela
    checkNewPage(12);
    pdf.setFillColor(0, 0, 0);
    pdf.rect(margin, y - 4, contentW, 6.5, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(7.5);
    pdf.setFont('helvetica', 'bold');

    pdf.text('PEÇA', col.nome, y);
    pdf.text('DIMENSÕES', col.dim, y);
    pdf.text('MATERIAL', col.material, y);
    pdf.text('ÁREA', col.area, y);
    pdf.text('QTD', col.qtd, y);
    pdf.text('VALOR MAT.', col.matVal, y);
    pdf.text('ACABAM.', col.acab, y);
    pdf.text('RECORTES', col.rec, y);
    pdf.text('TOTAL', col.total, y);
    y += 5.5;

    // Linhas das peças
    pecasAmbiente.forEach((peca, pecaIdx) => {
      const material = materiais.find(m => m.id === peca.materialId);
      const materialConfig = orcamentoAtual.materiais?.[peca.materialId] || {
        comprimento: 3000, altura: 2000, custo: 250, venda: 333.33
      };
      const materialComConfig = material ? { ...material, ...materialConfig } : null;
      const custos = calcularCustosPeca(peca, materialComConfig, precos);
      const qtd = peca.quantidade || 1;

      checkNewPage(8);

      // Fundo alternado cinza claro
      if (pecaIdx % 2 === 0) {
        pdf.setFillColor(245, 245, 245);
        pdf.rect(margin, y - 4, contentW, 6.5, 'F');
      }

      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(7.5);

      const largura = peca.rotacao === 90 ? peca.altura : peca.largura;
      const altura = peca.rotacao === 90 ? peca.largura : peca.altura;
      const area = calcularAreaM2(largura, altura);

      const nomePeca = (peca.nome || 'Sem nome');
      const nomeExibir = nomePeca.length > 18 ? nomePeca.substring(0, 16) + '..' : nomePeca;
      const matNome = material?.nome || 'N/D';
      const matExibir = matNome.length > 16 ? matNome.substring(0, 14) + '..' : matNome;

      pdf.setFont('helvetica', 'bold');
      pdf.text(nomeExibir, col.nome, y);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${Math.round(largura)} x ${Math.round(altura)}`, col.dim, y);
      pdf.text(matExibir, col.material, y);
      pdf.text(`${(area * qtd).toFixed(2)}m²`, col.area, y);
      pdf.text(`${qtd}`, col.qtd, y);
      pdf.text(formatBRL(custos.custoMaterial * qtd), col.matVal, y);

      const totalAcab = custos.acabamentos * qtd;
      const totalRec = custos.recortes * qtd;
      pdf.text(totalAcab > 0 ? formatBRL(totalAcab) : '-', col.acab, y);
      pdf.text(totalRec > 0 ? formatBRL(totalRec) : '-', col.rec, y);

      // Total da peça
      const totalPeca = custos.total * qtd;
      pdf.setFont('helvetica', 'bold');
      pdf.text(formatBRL(totalPeca), col.total, y);

      y += 6.5;

      // Linha separadora fina entre peças
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.1);
      pdf.line(margin, y - 2.5, rightEdge, y - 2.5);
    });

    y += 2;
  });

  // ===== RESUMO FINANCEIRO =====
  checkNewPage(60);

  hLine(y, 0.8);
  y += 5;

  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('RESUMO FINANCEIRO', margin, y);
  y += 8;

  // --- Material (chapas detalhadas) ---
  if (orcamento.detalhesChapas && orcamento.detalhesChapas.length > 0) {
    hLine(y - 2, 0.2);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`Material (${orcamento.detalhesChapas.length} chapa${orcamento.detalhesChapas.length > 1 ? 's' : ''})`, margin, y + 2);
    pdf.text(formatBRL(orcamento.vendaChapas), rightEdge, y + 2, { align: 'right' });
    y += 7;

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    orcamento.detalhesChapas.forEach((detalhe, idx) => {
      checkNewPage(18);
      const materialConfig = orcamentoAtual.materiais?.[detalhe.materialId] || {
        comprimento: 3000, altura: 2000, custo: 250, venda: 333.33
      };
      const precoVendaM2 = materialConfig.venda || 333.33;
      const precoCustoM2 = materialConfig.custo || 250;

      pdf.setFont('helvetica', 'bold');
      pdf.text(
        `- Chapa ${idx + 1} - ${detalhe.materialNome} (${detalhe.percentualAproveitamento.toFixed(1)}% aproveitamento)`,
        margin + 5, y
      );
      y += 4.5;
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Material: ${detalhe.areaPecas.toFixed(2)}m² x ${formatBRL(precoVendaM2)}/m²`, margin + 10, y);
      pdf.text(formatBRL(detalhe.vendaPecas || 0), rightEdge, y, { align: 'right' });
      y += 4;
      pdf.text(`Sobra: ${detalhe.areaSobra.toFixed(2)}m² x ${formatBRL(precoCustoM2)}/m² (preço de custo)`, margin + 10, y);
      pdf.text(formatBRL(detalhe.custoSobra || 0), rightEdge, y, { align: 'right' });
      y += 5;
    });
    y += 2;
  }

  // --- Acabamentos com sub-lista ---
  if (orcamento.acabamentos > 0) {
    checkNewPage(25);
    hLine(y - 1, 0.2);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Acabamentos', margin, y + 3);
    pdf.text(formatBRL(orcamento.acabamentos), rightEdge, y + 3, { align: 'right' });
    y += 8;

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');

    const acabPorTipo = {};
    if (orcamento.detalhesAcabamentos) {
      orcamento.detalhesAcabamentos.forEach(d => {
        acabPorTipo[d.tipo] = (acabPorTipo[d.tipo] || 0) + d.valor;
      });
    }
    Object.entries(acabPorTipo).forEach(([tipo, valor]) => {
      checkNewPage(6);
      pdf.text(`- ${tipo}`, margin + 5, y);
      pdf.text(formatBRL(valor), rightEdge, y, { align: 'right' });
      y += 5;
    });
    y += 2;
  }

  // --- Recortes com sub-lista ---
  if (orcamento.recortes > 0) {
    checkNewPage(25);
    hLine(y - 1, 0.2);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Recortes', margin, y + 3);
    pdf.text(formatBRL(orcamento.recortes), rightEdge, y + 3, { align: 'right' });
    y += 8;

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');

    const recPorTipo = {};
    if (orcamento.detalhesRecortes) {
      orcamento.detalhesRecortes.forEach(d => {
        recPorTipo[d.tipo] = (recPorTipo[d.tipo] || 0) + d.valor;
      });
    }
    Object.entries(recPorTipo).forEach(([tipo, valor]) => {
      checkNewPage(6);
      pdf.text(`- ${tipo}`, margin + 5, y);
      pdf.text(formatBRL(valor), rightEdge, y, { align: 'right' });
      y += 5;
    });
    y += 2;
  }

  // Total final em destaque
  checkNewPage(16);
  y += 1;
  hLine(y, 0.8);
  y += 1;
  pdf.setFillColor(0, 0, 0);
  pdf.rect(margin, y, contentW, 12, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('VALOR TOTAL:', margin + 4, y + 8);
  pdf.text(formatBRL(orcamento.vendaTotal), rightEdge - 4, y + 8, { align: 'right' });

  // Salvar PDF
  const nomeArquivo = `Relatorio_${orcamentoAtual.nome.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(nomeArquivo);
};
