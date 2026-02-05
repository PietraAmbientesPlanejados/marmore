import { jsPDF } from 'jspdf';

/**
 * Gera PDF do plano de corte com visualização das chapas e peças
 */
export const gerarPDFPlanoCorte = (orcamentoAtual) => {
  if (!orcamentoAtual || !orcamentoAtual.chapas || orcamentoAtual.chapas.length === 0) {
    alert('⚠️ Nenhuma chapa no plano de corte.');
    return;
  }

  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  // A4 landscape: 297 x 210 mm
  const pageW = 297;
  const pageH = 210;
  const margin = 15;
  const headerH = 22;

  orcamentoAtual.chapas.forEach((chapa, idx) => {
    if (idx > 0) pdf.addPage();

    // ---------- HEADER ----------
    pdf.setFillColor(30, 41, 59);
    pdf.rect(0, 0, pageW, headerH, 'F');

    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('PLANO DE CORTE', margin, 10);

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Orçamento: ' + orcamentoAtual.nome, margin, 17);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.text('Chapa ' + (idx + 1) + ' / ' + orcamentoAtual.chapas.length, pageW - margin - 45, 10);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text(chapa.material?.nome || 'Material', pageW - margin - 45, 17);

    // ---------- ÁREA DE DESENHO ----------
    const legendaW = 58;
    const areaTop = headerH + 8;
    const areaLeft = margin + legendaW + 15;
    const areaRight = pageW - margin;
    const areaBottom = pageH - margin - 8;
    const areaW = areaRight - areaLeft;
    const areaH = areaBottom - areaTop;

    const chapaW = chapa.material?.comprimento || 3000;
    const chapaH = chapa.material?.altura || 2000;
    const escalaX = areaW / chapaW;
    const escalaY = areaH / chapaH;
    const escala = Math.min(escalaX, escalaY) * 0.92;

    const desenhoW = chapaW * escala;
    const desenhoH = chapaH * escala;
    const desenhoX = areaLeft + (areaW - desenhoW) / 2;
    const desenhoY = areaTop + (areaH - desenhoH) / 2;

    // ---------- COTAS DA CHAPA ----------
    pdf.setTextColor(80, 80, 80);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');

    const cotaTopY = desenhoY - 5;
    pdf.setDrawColor(100, 100, 100);
    pdf.setLineWidth(0.3);
    pdf.line(desenhoX, cotaTopY, desenhoX + desenhoW, cotaTopY);
    pdf.line(desenhoX, cotaTopY - 2, desenhoX, cotaTopY + 2);
    pdf.line(desenhoX + desenhoW, cotaTopY - 2, desenhoX + desenhoW, cotaTopY + 2);
    pdf.setTextColor(30, 41, 59);
    pdf.setFont('helvetica', 'bold');
    pdf.text(chapaW + ' mm', desenhoX + desenhoW / 2, cotaTopY - 2, { align: 'center' });

    const cotaLeftX = desenhoX - 5;
    pdf.setDrawColor(100, 100, 100);
    pdf.setFont('helvetica', 'normal');
    pdf.line(cotaLeftX, desenhoY, cotaLeftX, desenhoY + desenhoH);
    pdf.line(cotaLeftX - 2, desenhoY, cotaLeftX + 2, desenhoY);
    pdf.line(cotaLeftX - 2, desenhoY + desenhoH, cotaLeftX + 2, desenhoY + desenhoH);
    pdf.setFont('helvetica', 'bold');
    pdf.text(chapaH + ' mm', cotaLeftX - 3, desenhoY + desenhoH / 2, { angle: 90, align: 'center' });

    // ---------- RETÂNGULO DA CHAPA ----------
    pdf.setFillColor(249, 250, 251);
    pdf.setDrawColor(55, 65, 81);
    pdf.setLineWidth(1.2);
    pdf.roundedRect(desenhoX, desenhoY, desenhoW, desenhoH, 1, 1, 'FD');

    // Grid
    pdf.setDrawColor(220, 220, 220);
    pdf.setLineWidth(0.2);
    const gridSpacing = 500 * escala;
    for (let i = gridSpacing; i < desenhoW; i += gridSpacing) {
      pdf.line(desenhoX + i, desenhoY, desenhoX + i, desenhoY + desenhoH);
    }
    for (let i = gridSpacing; i < desenhoH; i += gridSpacing) {
      pdf.line(desenhoX, desenhoY + i, desenhoX + desenhoW, desenhoY + i);
    }

    // ---------- PEÇAS ----------
    const cores = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#14b8a6'];
    const legendaItens = [];
    const bordaW = 0.5;
    const inset = bordaW / 2;

    chapa.pecas.forEach((peca, pIdx) => {
      const px = desenhoX + peca.posX * escala;
      const py = desenhoY + peca.posY * escala;
      const pw = (peca.rotacao === 90 ? peca.altura : peca.comprimento) * escala;
      const ph = (peca.rotacao === 90 ? peca.comprimento : peca.altura) * escala;

      const cor = cores[pIdx % cores.length];
      const r = parseInt(cor.slice(1, 3), 16);
      const g = parseInt(cor.slice(3, 5), 16);
      const b = parseInt(cor.slice(5, 7), 16);

      pdf.setFillColor(r + (255 - r) * 0.75, g + (255 - g) * 0.75, b + (255 - b) * 0.75);
      pdf.rect(px, py, pw, ph, 'F');

      pdf.setDrawColor(r, g, b);
      pdf.setLineWidth(bordaW);
      pdf.rect(px + inset, py + inset, pw - bordaW, ph - bordaW, 'D');

      if (pw > 3 && ph > 3) {
        pdf.setTextColor(r, g, b);
        pdf.setFontSize(Math.min(12, pw * 0.45, ph * 0.35));
        pdf.setFont('helvetica', 'bold');
        pdf.text(String(pIdx + 1), px + pw / 2, py + ph / 2 + 0.5, { align: 'center' });

        if (pw > 8 && ph > 7) {
          const fontDim = Math.min(5.5, pw * 0.2, ph * 0.15);
          pdf.setFontSize(fontDim);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(40, 40, 40);
          const dim = peca.rotacao === 90 ? peca.altura + 'x' + peca.comprimento : peca.comprimento + 'x' + peca.altura;
          pdf.text(dim, px + pw / 2, py + ph / 2 + Math.min(3.5, ph * 0.18), { align: 'center' });
        }
      }

      const nome = peca.nome || ('Peça ' + (pIdx + 1));
      const pecaCompExib = peca.rotacao === 90 ? peca.altura : peca.comprimento;
      const pecaAltExib = peca.rotacao === 90 ? peca.comprimento : peca.altura;
      legendaItens.push({ numero: pIdx + 1, nome, cor, dim: pecaCompExib + 'x' + pecaAltExib, rotado: peca.rotacao === 90 });
    });

    // ---------- LEGENDA ----------
    const legendaX = margin;
    let legendaY = areaTop + 2;
    const legendaLineH = 10;

    pdf.setFillColor(30, 41, 59);
    pdf.roundedRect(legendaX, legendaY - 4, legendaW, 10, 1, 1, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.text('LEGENDA', legendaX + legendaW / 2, legendaY + 2, { align: 'center' });
    legendaY += 12;

    const legendaAltura = Math.min(legendaItens.length * legendaLineH + 6, areaBottom - legendaY);
    pdf.setFillColor(248, 250, 252);
    pdf.setDrawColor(200, 210, 220);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(legendaX, legendaY - 4, legendaW, legendaAltura, 1, 1, 'FD');

    legendaItens.forEach((item, i) => {
      if (legendaY + 6 > areaBottom) return;

      const r = parseInt(item.cor.slice(1, 3), 16);
      const g = parseInt(item.cor.slice(3, 5), 16);
      const b = parseInt(item.cor.slice(5, 7), 16);

      pdf.setFillColor(r, g, b);
      pdf.rect(legendaX + 2, legendaY - 2.5, 4, 4, 'F');

      pdf.setTextColor(30, 41, 59);
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'bold');
      pdf.text(item.numero + '.', legendaX + 8, legendaY + 0.5);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(6.5);
      let nomeExib = item.nome;
      if (nomeExib.length > 18) nomeExib = nomeExib.substring(0, 17) + '…';
      pdf.text(nomeExib, legendaX + 13, legendaY + 0.5);

      pdf.setTextColor(100, 110, 120);
      pdf.setFontSize(5.5);
      const rot = item.rotado ? ' ↻' : '';
      pdf.text(item.dim + rot, legendaX + 13, legendaY + 4.5);

      legendaY += legendaLineH;
    });

    // ---------- RODAPÉ ----------
    pdf.setTextColor(150, 150, 150);
    pdf.setFontSize(6);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Gerado pelo Sistema Pietra  |  ' + new Date().toLocaleDateString('pt-BR'), pageW / 2, pageH - 4, { align: 'center' });
  });

  const nome = orcamentoAtual.nome.replace(/[^a-z0-9]/gi, '_');
  pdf.save('PlanoCorte_' + nome + '_' + new Date().toISOString().split('T')[0] + '.pdf');
  alert('✅ PDF do Plano de Corte gerado!\n' + orcamentoAtual.chapas.length + ' chapa(s)');
};
