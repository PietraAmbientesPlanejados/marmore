import { jsPDF } from 'jspdf';

/**
 * Gera PDF com etiquetas para impressão térmica (100x60mm)
 * Uma etiqueta por peça
 */
export const gerarEtiquetasPDF = (orcamentoAtual, materiais) => {
  const todasPecas = orcamentoAtual.ambientes.flatMap(amb =>
    amb.pecas.map(peca => ({ ...peca, ambienteNome: amb.nome }))
  );

  // Criar PDF com páginas do tamanho da etiqueta (100x60mm)
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [100, 60]
  });

  let primeira = true;

  todasPecas.forEach((peca, index) => {
    if (!primeira) {
      pdf.addPage([100, 60], 'landscape');
    }
    primeira = false;

    const material = materiais.find(m => m.id === peca.materialId);
    const comp = Math.round(peca.largura);
    const larg = Math.round(peca.altura);

    // ===== HEADER: PIETRA MÓVEIS E REVESTIMENTOS =====
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('PIETRA MÓVEIS E REVESTIMENTOS', 50, 8, { align: 'center' });

    // Linha horizontal
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.3);
    pdf.line(5, 10, 95, 10);

    // Email
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text('pietramoveiserevestimentos@gmail.com', 50, 14, { align: 'center' });

    // Telefone
    pdf.setFontSize(9);
    pdf.text('(19) 99978-0110', 50, 18, { align: 'center' });

    // Linha horizontal
    pdf.line(5, 20, 95, 20);

    // ===== CLIENTE =====
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text('CLIENTE:', 5, 26);

    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'normal');
    const clienteNome = orcamentoAtual.nome || 'Sem nome';
    pdf.text(clienteNome.toUpperCase(), 25, 26);

    // ===== AMBIENTE =====
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'bold');
    pdf.text('AMBIENTE:', 5, 32);

    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'normal');
    const ambienteNome = peca.ambienteNome || 'Sem ambiente';
    pdf.text(ambienteNome.toUpperCase(), 25, 32);

    // ===== PEÇA =====
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'bold');
    pdf.text('PEÇA:', 5, 38);

    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'normal');
    const pecaNome = peca.nome || 'Sem nome';
    pdf.text(pecaNome.toUpperCase(), 25, 38);

    // ===== MEDIDA =====
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'bold');
    pdf.text('MEDIDA:', 5, 44);

    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`${comp} X ${larg} MM`, 25, 44);

    // ===== MATERIAL =====
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'bold');
    pdf.text('MATERIAL:', 5, 50);

    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'normal');
    const materialNome = material?.nome || 'N/D';
    pdf.text(materialNome.toUpperCase(), 25, 50);

    // Linha horizontal no rodapé
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.3);
    pdf.line(5, 55, 95, 55);
  });

  // Salvar PDF
  const nomeArquivo = `Etiquetas_${orcamentoAtual.nome.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(nomeArquivo);

  alert(`✅ PDF gerado com sucesso!\n${todasPecas.length} etiqueta(s) - 1 por página\nArquivo: ${nomeArquivo}`);
};
