
// Usar React global
const { useState, useRef, useEffect } = React;

// Ícones do Lucide (carregar depois)
const PlusCircle = () => React.createElement('span', null, '➕');
const Trash2 = () => React.createElement('span', null, '🗑️');
const Edit2 = () => React.createElement('span', null, '✏️');
const Save = () => React.createElement('span', null, '💾');
const X = () => React.createElement('span', null, '❌');
const Move = () => React.createElement('span', null, '↔️');
const Grid = () => React.createElement('span', null, '⊞');
const FileText = () => React.createElement('span', null, '📄');
const Home = () => React.createElement('span', null, '🏠');
const Package = () => React.createElement('span', null, '📦');
const Printer = () => React.createElement('span', null, '🖨️');

// Formatar valor em R$ brasileiro (R$ 1.234,56)
const formatBRL = (valor) => {
  return 'R$ ' + Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};


const SistemaOrcamentoMarmore = () => {
  const [materiais, setMateriais] = useState([
    { id: 1, nome: 'Mármore Branco Carrara', comprimento: 3000, altura: 2000, custo: 1500, venda: 2000 }
  ]);
  const [orcamentos, setOrcamentos] = useState([]);
  const [orcamentoAtual, setOrcamentoAtual] = useState(null);
  const [tela, setTela] = useState('lista'); // lista, novo-material, orcamento, plano-corte, editar-material
  const [novoMaterial, setNovoMaterial] = useState({ nome: '', comprimento: '', altura: '', custo: '', venda: '' });
  const [materialEditando, setMaterialEditando] = useState(null);
  const [mostrarModalNovoOrcamento, setMostrarModalNovoOrcamento] = useState(false);
  const [nomeNovoOrcamento, setNomeNovoOrcamento] = useState('');
  const [ambienteSelecionado, setAmbienteSelecionado] = useState(null);
  const [editandoPeca, setEditandoPeca] = useState(null);
  const [mostrandoDetalhePeca, setMostrandoDetalhePeca] = useState(null);
  const [modoEdicaoPeca, setModoEdicaoPeca] = useState(false);
  const [pecaEditada, setPecaEditada] = useState(null);
  const [pecaParaExcluir, setPecaParaExcluir] = useState(null);
  const [pecaArrastando, setPecaArrastando] = useState(null);
  const [chapaDestaque, setChapaDestaque] = useState(null);
  const [mostrarPainelPrecos, setMostrarPainelPrecos] = useState(false);
  const [precosSalvos, setPrecosSalvos] = useState(false);

  // ============================================
  // CONFIGURAÇÃO DE PREÇOS
  // ============================================
  const [precos, setPrecos] = useState({
    // Acabamentos (por metro linear)
    polimento: 22,
    esquadria: 35,
    boleado: 15,
    canal: 15,
    // Recortes (por unidade)
    pia: 100,
    cubaEsculpida: 630,
    cooktop: 150,
    recorte: 60,
    pes: 200
  });

  // Carregar preços salvos
  useEffect(() => {
    const precosSalvos = localStorage.getItem('pietra_precos');
    if (precosSalvos) {
      try {
        setPrecos(JSON.parse(precosSalvos));
      } catch (error) {
        console.error('Erro ao carregar preços:', error);
      }
    }
  }, []);

  // Carregar materiais e orçamentos ao iniciar
  useEffect(() => {
    const materiaisSalvos = localStorage.getItem('pietra_materiais');
    const orcamentosSalvos = localStorage.getItem('pietra_orcamentos');
    
    if (materiaisSalvos) {
      try {
        const dados = JSON.parse(materiaisSalvos);
        if (Array.isArray(dados) && dados.length > 0) {
          setMateriais(dados);
        }
      } catch (error) {
        console.error('Erro ao carregar materiais:', error);
      }
    }
    
    if (orcamentosSalvos) {
      try {
        const dados = JSON.parse(orcamentosSalvos);
        if (Array.isArray(dados)) {
          setOrcamentos(dados);
        }
      } catch (error) {
        console.error('Erro ao carregar orçamentos:', error);
      }
    }
  }, []);

  // Salvar materiais quando mudam
  useEffect(() => {
    if (materiais.length > 0) {
      localStorage.setItem('pietra_materiais', JSON.stringify(materiais));
      console.log('💾 Materiais salvos automaticamente');
    }
  }, [materiais]);

  // Salvar orçamentos quando mudam
  useEffect(() => {
    localStorage.setItem('pietra_orcamentos', JSON.stringify(orcamentos));
    console.log('💾 Orçamentos salvos automaticamente');
  }, [orcamentos]);

  // Atualizar um preço específico
  const atualizarPreco = (chave, valor) => {
    const valorNumerico = parseFloat(valor) || 0;
    setPrecos(prev => ({
      ...prev,
      [chave]: valorNumerico
    }));
    setPrecosSalvos(false); // Indica que há mudanças não salvas
  };

  // Salvar preços manualmente com feedback
  const salvarPrecos = () => {
    localStorage.setItem('pietra_precos', JSON.stringify(precos));
    setPrecosSalvos(true);
    
    // Remover feedback após 3 segundos
    setTimeout(() => {
      setPrecosSalvos(false);
    }, 3000);
  };

  // Função para imprimir o plano de corte (compatível com artifacts)
  const imprimirPlanoCorte = async () => {
    // Carregar jsPDF se ainda não carregado
    if (!window.jspdf) {
      return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.onload = () => { gerarPDFPlanoCorte(); resolve(); };
        script.onerror = () => { alert('❌ Erro ao carregar biblioteca PDF.'); resolve(); };
        document.head.appendChild(script);
      });
    }
    gerarPDFPlanoCorte();
  };

  const gerarPDFPlanoCorte = () => {
    const { jsPDF } = window.jspdf;
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
      // Fundo do header
      pdf.setFillColor(30, 41, 59); // slate-800
      pdf.rect(0, 0, pageW, headerH, 'F');

      // Título
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('PLANO DE CORTE', margin, 10);

      // Nome do orçamento
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Orçamento: ' + orcamentoAtual.nome, margin, 17);

      // Chapa info à direita
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.text('Chapa ' + (idx + 1) + ' / ' + orcamentoAtual.chapas.length, pageW - margin - 45, 10);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.text(chapa.material?.nome || 'Material', pageW - margin - 45, 17);

      // ---------- ÁREA DE DESENHO (com espaço para legenda à esquerda) ----------
      const legendaW = 58; // largura da coluna de legenda
      const areaTop = headerH + 8;
      const areaLeft = margin + legendaW + 15; // margem para cotas da chapa
      const areaRight = pageW - margin;
      const areaBottom = pageH - margin - 8;
      const areaW = areaRight - areaLeft;
      const areaH = areaBottom - areaTop;

      // Calcular escala para caber a chapa na área
      const chapaW = chapa.material?.comprimento || 3000;
      const chapaH = chapa.material?.altura || 2000;
      const escalaX = areaW / chapaW;
      const escalaY = areaH / chapaH;
      const escala = Math.min(escalaX, escalaY) * 0.92;

      const desenhoW = chapaW * escala;
      const desenhoH = chapaH * escala;
      // Centralizar
      const desenhoX = areaLeft + (areaW - desenhoW) / 2;
      const desenhoY = areaTop + (areaH - desenhoH) / 2;

      // ---------- COTAS DA CHAPA ----------
      pdf.setTextColor(80, 80, 80);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');

      // Cota horizontal (cima)
      const cotaTopY = desenhoY - 5;
      pdf.setDrawColor(100, 100, 100);
      pdf.setLineWidth(0.3);
      // Linha horizontal
      pdf.line(desenhoX, cotaTopY, desenhoX + desenhoW, cotaTopY);
      // Traços terminais
      pdf.line(desenhoX, cotaTopY - 2, desenhoX, cotaTopY + 2);
      pdf.line(desenhoX + desenhoW, cotaTopY - 2, desenhoX + desenhoW, cotaTopY + 2);
      // Texto
      pdf.setTextColor(30, 41, 59);
      pdf.setFont('helvetica', 'bold');
      pdf.text(chapaW + ' mm', desenhoX + desenhoW / 2, cotaTopY - 2, { align: 'center' });

      // Cota vertical (esquerda)
      const cotaLeftX = desenhoX - 5;
      pdf.setDrawColor(100, 100, 100);
      pdf.setFont('helvetica', 'normal');
      pdf.line(cotaLeftX, desenhoY, cotaLeftX, desenhoY + desenhoH);
      pdf.line(cotaLeftX - 2, desenhoY, cotaLeftX + 2, desenhoY);
      pdf.line(cotaLeftX - 2, desenhoY + desenhoH, cotaLeftX + 2, desenhoY + desenhoH);
      // Texto vertical
      pdf.setFont('helvetica', 'bold');
      pdf.text(chapaH + ' mm', cotaLeftX - 3, desenhoY + desenhoH / 2, { angle: 90, align: 'center' });

      // ---------- RETÂNGULO DA CHAPA ----------
      pdf.setFillColor(249, 250, 251); // fundo cinza claro
      pdf.setDrawColor(55, 65, 81);
      pdf.setLineWidth(1.2);
      pdf.roundedRect(desenhoX, desenhoY, desenhoW, desenhoH, 1, 1, 'FD');

      // Grid leve na chapa
      pdf.setDrawColor(220, 220, 220);
      pdf.setLineWidth(0.2);
      const gridSpacing = 500 * escala;
      for (let i = gridSpacing; i < desenhoW; i += gridSpacing) {
        pdf.line(desenhoX + i, desenhoY, desenhoX + i, desenhoY + desenhoH);
      }
      for (let i = gridSpacing; i < desenhoH; i += gridSpacing) {
        pdf.line(desenhoX, desenhoY + i, desenhoX + desenhoW, desenhoY + i);
      }

      // ---------- PEÇAS (borda desenhada para DENTRO para não sobrepor vizinhas) ----------
      const cores = ['#3b82f6','#10b981','#8b5cf6','#f59e0b','#ef4444','#06b6d4','#ec4899','#14b8a6'];
      const legendaItens = [];
      const bordaW = 0.5; // espessura da borda em mm do PDF
      const inset = bordaW / 2; // quanto encolher cada lado para borda ficar dentro

      chapa.pecas.forEach((peca, pIdx) => {
        const px = desenhoX + peca.posX * escala;
        const py = desenhoY + peca.posY * escala;
        const pw = (peca.rotacao === 90 ? peca.altura : peca.comprimento) * escala;
        const ph = (peca.rotacao === 90 ? peca.comprimento : peca.altura) * escala;

        const cor = cores[pIdx % cores.length];
        const r = parseInt(cor.slice(1, 3), 16);
        const g = parseInt(cor.slice(3, 5), 16);
        const b = parseInt(cor.slice(5, 7), 16);

        // Preencher a área inteira da peça com cor clara
        pdf.setFillColor(r + (255 - r) * 0.75, g + (255 - g) * 0.75, b + (255 - b) * 0.75);
        pdf.rect(px, py, pw, ph, 'F');

        // Borda desenhada PARA DENTRO (inset) — nunca invade o espaçamento
        pdf.setDrawColor(r, g, b);
        pdf.setLineWidth(bordaW);
        pdf.rect(px + inset, py + inset, pw - bordaW, ph - bordaW, 'D');

        // Número da peça (centro)
        if (pw > 3 && ph > 3) {
          pdf.setTextColor(r, g, b);
          pdf.setFontSize(Math.min(12, pw * 0.45, ph * 0.35));
          pdf.setFont('helvetica', 'bold');
          pdf.text(String(pIdx + 1), px + pw / 2, py + ph / 2 + 0.5, { align: 'center' });

          // Dimensões abaixo do número
          if (pw > 8 && ph > 7) {
            const fontDim = Math.min(5.5, pw * 0.2, ph * 0.15);
            pdf.setFontSize(fontDim);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(40, 40, 40);
            const dim = peca.rotacao === 90 ? peca.altura + 'x' + peca.comprimento : peca.comprimento + 'x' + peca.altura;
            pdf.text(dim, px + pw / 2, py + ph / 2 + Math.min(3.5, ph * 0.18), { align: 'center' });
          }
        }

        // Guardar para legenda
        const nome = peca.nome || ('Peça ' + (pIdx + 1));
        const pecaCompExib = peca.rotacao === 90 ? peca.altura : peca.comprimento;
        const pecaAltExib = peca.rotacao === 90 ? peca.comprimento : peca.altura;
        legendaItens.push({ numero: pIdx + 1, nome, cor, dim: pecaCompExib + 'x' + pecaAltExib, rotado: peca.rotacao === 90 });
      });

      // ---------- LEGENDA (coluna vertical à esquerda) ----------
      const legendaX = margin;
      let legendaY = areaTop + 2;
      const legendaLineH = 10; // altura de cada item

      // Título da legenda
      pdf.setFillColor(30, 41, 59);
      pdf.roundedRect(legendaX, legendaY - 4, legendaW, 10, 1, 1, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.text('LEGENDA', legendaX + legendaW / 2, legendaY + 2, { align: 'center' });
      legendaY += 12;

      // Fundo da legenda
      const legendaAltura = Math.min(legendaItens.length * legendaLineH + 6, areaBottom - legendaY);
      pdf.setFillColor(248, 250, 252);
      pdf.setDrawColor(200, 210, 220);
      pdf.setLineWidth(0.3);
      pdf.roundedRect(legendaX, legendaY - 4, legendaW, legendaAltura, 1, 1, 'FD');

      legendaItens.forEach((item, i) => {
        if (legendaY + 6 > areaBottom) return; // não ultrapassar a área

        const r = parseInt(item.cor.slice(1, 3), 16);
        const g = parseInt(item.cor.slice(3, 5), 16);
        const b = parseInt(item.cor.slice(5, 7), 16);

        // Quadradinho colorido
        pdf.setFillColor(r, g, b);
        pdf.rect(legendaX + 2, legendaY - 2.5, 4, 4, 'F');

        // Número + nome
        pdf.setTextColor(30, 41, 59);
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'bold');
        pdf.text(item.numero + '.', legendaX + 8, legendaY + 0.5);

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(6.5);
        // Truncar nome se muito longo
        let nomeExib = item.nome;
        if (nomeExib.length > 18) nomeExib = nomeExib.substring(0, 17) + '…';
        pdf.text(nomeExib, legendaX + 13, legendaY + 0.5);

        // Dimensões + rotação
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

    // Salvar
    const nome = orcamentoAtual.nome.replace(/[^a-z0-9]/gi, '_');
    pdf.save('PlanoCorte_' + nome + '_' + new Date().toISOString().split('T')[0] + '.pdf');
    alert('✅ PDF do Plano de Corte gerado!\n' + orcamentoAtual.chapas.length + ' chapa(s)');
  };

  // Criar novo orçamento
  const criarOrcamento = () => {
    setNomeNovoOrcamento(`Orçamento ${new Date().toLocaleDateString()}`);
    setMostrarModalNovoOrcamento(true);
  };

  const confirmarCriacaoOrcamento = () => {
    const novoOrc = {
      id: Date.now(),
      nome: nomeNovoOrcamento.trim() || `Orçamento ${new Date().toLocaleDateString()}`,
      data: new Date().toLocaleDateString(),
      ambientes: [],
      chapas: []
    };
    setOrcamentoAtual(novoOrc);
    setTela('orcamento');
    setMostrarModalNovoOrcamento(false);
    setNomeNovoOrcamento('');
  };

  // Adicionar ambiente
  const adicionarAmbiente = (nome) => {
    if (!nome.trim()) return;
    setOrcamentoAtual({
      ...orcamentoAtual,
      ambientes: [...orcamentoAtual.ambientes, { id: Date.now(), nome, pecas: [] }]
    });
  };

  // Adicionar peça
  const adicionarPeca = (ambienteId, peca) => {
    // Validar se a peça cabe na chapa do material selecionado
    const material = materiais.find(m => m.id === peca.materialId);
    if (!material) {
      alert('❌ Material não encontrado!');
      return;
    }

    const pecaComp = parseFloat(peca.comprimento);
    const pecaAlt = parseFloat(peca.altura);
    const chapaComp = material.comprimento;
    const chapaAlt = material.altura;

    // Verificar se cabe de alguma forma (normal ou rotacionada)
    const cabeNormal = pecaComp <= chapaComp && pecaAlt <= chapaAlt;
    const cabeRotacionada = pecaAlt <= chapaComp && pecaComp <= chapaAlt;

    if (!cabeNormal && !cabeRotacionada) {
      alert(`❌ Peça muito grande!\n\nPeça: ${pecaComp} x ${pecaAlt} mm\nChapa: ${chapaComp} x ${chapaAlt} mm\n\nA peça não cabe na chapa nem rotacionada.`);
      return;
    }

    // Determinar rotação inicial: se não cabe normal mas cabe rotacionada, já inicia rotacionada
    const rotacaoInicial = !cabeNormal && cabeRotacionada ? 90 : 0;

    if (rotacaoInicial === 90) {
      console.log('🔄 Peça será rotacionada automaticamente para caber na chapa');
    }

    const novasPecas = [];
    for (let i = 0; i < (peca.quantidade || 1); i++) {
      novasPecas.push({
        ...peca,
        id: Date.now() + i + Math.random(),
        quantidade: 1,
        ambienteId,
        chapaId: null,
        posX: 0,
        posY: 0,
        rotacao: rotacaoInicial
      });
    }

    const ambientes = orcamentoAtual.ambientes.map(amb => {
      if (amb.id === ambienteId) {
        return { ...amb, pecas: [...amb.pecas, ...novasPecas] };
      }
      return amb;
    });
    
    const novoOrcamento = { ...orcamentoAtual, ambientes };
    setOrcamentoAtual(novoOrcamento);
    
    // Reorganizar todas as peças
    setTimeout(() => {
      organizarPecasEmChapas(novoOrcamento);
    }, 0);
  };

  // Excluir peça
  const excluirPeca = (ambienteId, pecaId) => {
    console.log('🗑️ excluirPeca chamada com:', { ambienteId, pecaId });
    
    const ambientes = orcamentoAtual.ambientes.map(amb => {
      if (amb.id === ambienteId) {
        console.log('✂️ Removendo peça do ambiente:', amb.id);
        return { ...amb, pecas: amb.pecas.filter(p => p.id !== pecaId) };
      }
      return amb;
    });
    
    console.log('📋 Ambientes atualizados:', ambientes);
    
    const novoOrcamento = { ...orcamentoAtual, ambientes };
    setOrcamentoAtual(novoOrcamento);
    
    console.log('💾 Orçamento atualizado, reorganizando chapas...');
    
    // Reorganizar chapas após exclusão
    setTimeout(() => {
      organizarPecasEmChapas(novoOrcamento);
      console.log('✅ Chapas reorganizadas!');
    }, 0);
  };

  // Salvar edição da peça
  const salvarEdicaoPeca = () => {
    if (!pecaEditada || !mostrandoDetalhePeca) return;

    const ambientes = orcamentoAtual.ambientes.map(amb => ({
      ...amb,
      pecas: amb.pecas.map(p => 
        p.id === mostrandoDetalhePeca.id ? pecaEditada : p
      )
    }));
    
    const novoOrcamento = { ...orcamentoAtual, ambientes };
    setOrcamentoAtual(novoOrcamento);
    
    // Reorganizar chapas se mudou dimensões ou material
    if (pecaEditada.comprimento !== mostrandoDetalhePeca.comprimento ||
        pecaEditada.altura !== mostrandoDetalhePeca.altura ||
        pecaEditada.materialId !== mostrandoDetalhePeca.materialId) {
      setTimeout(() => {
        organizarPecasEmChapas(novoOrcamento);
      }, 0);
    }
    
    // Fechar modal
    setMostrandoDetalhePeca(null);
    setModoEdicaoPeca(false);
    setPecaEditada(null);
  };


  // Gerar PDF de etiquetas térmicas
  const gerarEtiquetasPDF = async () => {
    // Carregar jsPDF dinamicamente
    return new Promise((resolve) => {
      if (window.jspdf) {
        gerarPDFComJsPDF();
        resolve();
        return;
      }
      
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      script.onload = () => {
        gerarPDFComJsPDF();
        resolve();
      };
      script.onerror = () => {
        alert('❌ Erro ao carregar biblioteca PDF. Por favor, tente novamente.');
        resolve();
      };
      document.head.appendChild(script);
    });
  };

  const gerarPDFComJsPDF = () => {
    const { jsPDF } = window.jspdf;
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
      const comp = Math.round(peca.comprimento);
      const larg = Math.round(peca.altura);
      
      // ===== HEADER: PIETRA MÓVEIS E REVESTIMENTOS =====
      pdf.setTextColor(0, 0, 0); // Preto
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('PIETRA MÓVEIS E REVESTIMENTOS', 50, 8, { align: 'center' });
      
      // Linha horizontal
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.3);
      pdf.line(5, 10, 95, 10);
      
      // Email
      pdf.setTextColor(0, 0, 0); // Preto
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
      pdf.setTextColor(0, 0, 0); // Preto
      pdf.text('CLIENTE:', 5, 26);
      
      pdf.setTextColor(0, 0, 0); // Preto
      pdf.setFont('helvetica', 'normal');
      const clienteNome = orcamentoAtual.nome || 'Sem nome';
      pdf.text(clienteNome.toUpperCase(), 25, 26);
      
      // ===== AMBIENTE =====
      pdf.setTextColor(0, 0, 0); // Preto
      pdf.setFont('helvetica', 'bold');
      pdf.text('AMBIENTE:', 5, 32);
      
      pdf.setTextColor(0, 0, 0); // Preto
      pdf.setFont('helvetica', 'normal');
      const ambienteNome = peca.ambienteNome || 'Sem ambiente';
      pdf.text(ambienteNome.toUpperCase(), 25, 32);
      
      // ===== PEÇA =====
      pdf.setTextColor(0, 0, 0); // Preto
      pdf.setFont('helvetica', 'bold');
      pdf.text('PEÇA:', 5, 38);
      
      pdf.setTextColor(0, 0, 0); // Preto
      pdf.setFont('helvetica', 'normal');
      const pecaNome = peca.nome || 'Sem nome';
      pdf.text(pecaNome.toUpperCase(), 25, 38);
      
      // ===== MEDIDA =====
      pdf.setTextColor(0, 0, 0); // Preto
      pdf.setFont('helvetica', 'bold');
      pdf.text('MEDIDA:', 5, 44);
      
      pdf.setTextColor(0, 0, 0); // Preto
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${comp} X ${larg} MM`, 25, 44);
      
      // ===== MATERIAL =====
      pdf.setTextColor(0, 0, 0); // Preto
      pdf.setFont('helvetica', 'bold');
      pdf.text('MATERIAL:', 5, 50);
      
      pdf.setTextColor(0, 0, 0); // Preto
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

  // Organizar peças em chapas automaticamente
  const organizarPecasEmChapas = (orcamento) => {
    const todasPecas = orcamento.ambientes.flatMap(amb => amb.pecas);
    const chapas = [];
    const espacamento = 4;

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
      let chapaAtual = null;

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

    setOrcamentoAtual({ ...orcamento, chapas, ambientes: ambientesAtualizados });
  };

  // Encontrar posição para peça na chapa com espaçamento de 4mm
  const encontrarPosicaoNaChapa = (chapa, peca, material, espacamento) => {
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

  // Calcular totais
  const calcularOrcamento = () => {
    if (!orcamentoAtual) return { subtotal: 0, acabamentos: 0, recortes: 0, total: 0, chapas: [] };

    let totalChapas = 0;
    const chapasPorMaterial = {};

    // Contar chapas por material
    orcamentoAtual.chapas.forEach(chapa => {
      const key = chapa.materialId;
      chapasPorMaterial[key] = (chapasPorMaterial[key] || 0) + 1;
    });

    // Calcular custo das chapas
    Object.keys(chapasPorMaterial).forEach(materialId => {
      const material = materiais.find(m => m.id === parseInt(materialId));
      if (material) {
        totalChapas += material.custo * chapasPorMaterial[materialId];
      }
    });

    let totalAcabamentos = 0;
    let totalRecortes = 0;

    orcamentoAtual.ambientes.forEach(ambiente => {
      ambiente.pecas.forEach(peca => {
        // Acabamentos (usando preços configuráveis)
        if (peca.esquadria) totalAcabamentos += (peca.esquadria / 1000) * precos.esquadria;
        if (peca.boleado) totalAcabamentos += (peca.boleado / 1000) * precos.boleado;
        if (peca.polimento) totalAcabamentos += (peca.polimento / 1000) * precos.polimento;

        // Recortes (usando preços configuráveis)
        if (peca.cuba) totalRecortes += peca.cuba * precos.pia;
        if (peca.cubaEsculpida) totalRecortes += peca.cubaEsculpida * precos.cubaEsculpida;
        if (peca.cooktop) totalRecortes += peca.cooktop * precos.cooktop;
        if (peca.recorte) totalRecortes += peca.recorte * precos.recorte;
        if (peca.pes) totalRecortes += peca.pes * precos.pes;
      });
    });

    return {
      subtotal: totalChapas,
      acabamentos: totalAcabamentos,
      recortes: totalRecortes,
      total: totalChapas + totalAcabamentos + totalRecortes,
      chapasPorMaterial
    };
  };

  // Calcular orçamento salvo (usa os materiais salvos no orçamento)
  const calcularOrcamentoSalvo = (orc) => {
    let custoChapas = 0;
    let vendaChapas = 0;
    const chapasPorMaterial = {};

    // Contar chapas por material
    orc.chapas.forEach(chapa => {
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

    orc.ambientes.forEach(ambiente => {
      ambiente.pecas.forEach(peca => {
        // Acabamentos (usando preços configuráveis)
        if (peca.esquadria) totalAcabamentos += (peca.esquadria / 1000) * precos.esquadria;
        if (peca.boleado) totalAcabamentos += (peca.boleado / 1000) * precos.boleado;
        if (peca.polimento) totalAcabamentos += (peca.polimento / 1000) * precos.polimento;

        // Recortes (usando preços configuráveis)
        if (peca.cuba) totalRecortes += peca.cuba * precos.pia;
        if (peca.cubaEsculpida) totalRecortes += peca.cubaEsculpida * precos.cubaEsculpida;
        if (peca.cooktop) totalRecortes += peca.cooktop * precos.cooktop;
        if (peca.recorte) totalRecortes += peca.recorte * precos.recorte;
        if (peca.pes) totalRecortes += peca.pes * precos.pes;
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
      // Manter compatibilidade
      subtotal: vendaChapas,
      total: vendaTotal
    };
  };

  // Mover peça dentro da mesma chapa (arraste manual)
  const moverPecaNaChapa = (pecaId, chapaId, novaX, novaY) => {
    const ambientesAtualizados = orcamentoAtual.ambientes.map(amb => ({
      ...amb,
      pecas: amb.pecas.map(p => 
        p.id === pecaId ? { ...p, chapaId: chapaId, posX: novaX, posY: novaY } : p
      )
    }));

    const todasPecas = ambientesAtualizados.flatMap(amb => amb.pecas);
    const chapasAtualizadas = orcamentoAtual.chapas.map(chapa => ({
      ...chapa,
      pecas: todasPecas.filter(p => p.chapaId === chapa.id)
    }));

    setOrcamentoAtual({ 
      ...orcamentoAtual, 
      ambientes: ambientesAtualizados, 
      chapas: chapasAtualizadas 
    });
  };

  // Encontrar melhor posição disponível para a peça na chapa
  const encontrarMelhorPosicao = (peca, chapaDestino) => {
    const larguraPeca = peca.rotacao === 90 ? peca.altura : peca.comprimento;
    const alturaPeca = peca.rotacao === 90 ? peca.comprimento : peca.altura;
    const espacamento = 4;
    
    const larguraChapa = chapaDestino.material.comprimento;
    const alturaChapa = chapaDestino.material.altura;
    
    // Verificar se a peça é maior que a chapa
    if (larguraPeca + espacamento * 2 > larguraChapa || 
        alturaPeca + espacamento * 2 > alturaChapa) {
      return null; // Peça não cabe de jeito nenhum
    }
    
    // Tentar posições em um grid de 10mm para performance
    const incremento = 10;
    
    // Tentar primeiro posições próximas ao canto superior esquerdo
    for (let y = espacamento; y + alturaPeca + espacamento <= alturaChapa; y += incremento) {
      for (let x = espacamento; x + larguraPeca + espacamento <= larguraChapa; x += incremento) {
        // Verificar se não sobrepõe outras peças
        const sobrepoe = chapaDestino.pecas.some(p => {
          if (p.id === peca.id) return false;
          
          const larguraOutra = p.rotacao === 90 ? p.altura : p.comprimento;
          const alturaOutra = p.rotacao === 90 ? p.comprimento : p.altura;
          
          const centroNovaX = x + larguraPeca / 2;
          const centroNovaY = y + alturaPeca / 2;
          const centroPecaX = p.posX + larguraOutra / 2;
          const centroPecaY = p.posY + alturaOutra / 2;
          
          const distanciaX = Math.abs(centroNovaX - centroPecaX);
          const distanciaY = Math.abs(centroNovaY - centroPecaY);
          
          const distanciaMinX = (larguraPeca + larguraOutra) / 2 + espacamento;
          const distanciaMinY = (alturaPeca + alturaOutra) / 2 + espacamento;
          
          return distanciaX < distanciaMinX && distanciaY < distanciaMinY;
        });
        
        if (!sobrepoe) {
          return { x, y }; // Encontrou uma posição válida!
        }
      }
    }
    
    return null; // Não encontrou posição disponível
  };

  // Mover peça entre chapas
  const moverPeca = (pecaId, novaChapaId) => {
    // Encontrar a peça
    let pecaMovida = null;
    orcamentoAtual.ambientes.forEach(amb => {
      const peca = amb.pecas.find(p => p.id === pecaId);
      if (peca) pecaMovida = peca;
    });
    
    if (!pecaMovida) {
      alert('❌ Erro: Peça não encontrada.');
      return;
    }
    
    // Encontrar a chapa de destino
    const chapaDestino = orcamentoAtual.chapas.find(c => c.id === novaChapaId);
    if (!chapaDestino) {
      alert('❌ Erro: Chapa de destino não encontrada.');
      return;
    }
    
    // Encontrar a melhor posição disponível
    const posicao = encontrarMelhorPosicao(pecaMovida, chapaDestino);
    
    if (!posicao) {
      const larguraPeca = pecaMovida.rotacao === 90 ? pecaMovida.altura : pecaMovida.comprimento;
      const alturaPeca = pecaMovida.rotacao === 90 ? pecaMovida.comprimento : pecaMovida.altura;
      
      alert(
        '⚠️ Não foi possível mover a peça!\n\n' +
        '❌ Não há espaço disponível na chapa de destino.\n\n' +
        '📏 Dimensões da peça: ' + larguraPeca + ' x ' + alturaPeca + ' mm\n' +
        '📐 Dimensões da chapa: ' + chapaDestino.material.comprimento + ' x ' + chapaDestino.material.altura + ' mm\n\n' +
        '💡 Dica: Tente mover outras peças ou use outra chapa.'
      );
      return;
    }
    
    // Mover a peça para a posição encontrada
    const ambientesAtualizados = orcamentoAtual.ambientes.map(amb => ({
      ...amb,
      pecas: amb.pecas.map(p => 
        p.id === pecaId ? { ...p, chapaId: novaChapaId, posX: posicao.x, posY: posicao.y } : p
      )
    }));

    // Reconstruir as chapas com base nas novas posições
    const todasPecas = ambientesAtualizados.flatMap(amb => amb.pecas);
    const chapasAtualizadas = orcamentoAtual.chapas.map(chapa => ({
      ...chapa,
      pecas: todasPecas.filter(p => p.chapaId === chapa.id)
    }));

    setOrcamentoAtual({ 
      ...orcamentoAtual, 
      ambientes: ambientesAtualizados, 
      chapas: chapasAtualizadas 
    });
    
    // Feedback de sucesso
    alert('✅ Peça movida com sucesso!\n\n📍 Posição: X=' + Math.round(posicao.x) + 'mm, Y=' + Math.round(posicao.y) + 'mm');
  };

  // Atualizar material
  const atualizarMaterial = (materialId, novosDados) => {
    const materiaisAtualizados = materiais.map(m => 
      m.id === materialId ? { ...m, ...novosDados } : m
    );
    setMateriais(materiaisAtualizados);
    
    // Atualizar e reorganizar todos os orçamentos que usam este material
    const orcamentosAtualizados = orcamentos.map(orc => {
      const usaMaterial = orc.chapas.some(ch => ch.materialId === materialId);
      
      if (usaMaterial) {
        // Coletar todas as peças deste material
        const pecasDoMaterial = [];
        orc.ambientes.forEach(amb => {
          amb.pecas.forEach(peca => {
            if (peca.materialId === materialId) {
              pecasDoMaterial.push({ ...peca, chapaId: null }); // Resetar chapa
            }
          });
        });
        
        // Reorganizar peças nas chapas com novo tamanho
        const novasChapas = reorganizarPecasComNovoTamanho(
          pecasDoMaterial,
          { id: materialId, ...novosDados },
          4
        );
        
        // Atualizar ambientes com novas posições das peças
        const ambientesAtualizados = orc.ambientes.map(amb => ({
          ...amb,
          pecas: amb.pecas.map(p => {
            if (p.materialId === materialId) {
              const pecaAtualizada = pecasDoMaterial.find(pm => pm.id === p.id);
              return pecaAtualizada || p;
            }
            return p;
          })
        }));
        
        // Manter chapas de outros materiais e adicionar novas do material alterado
        const chapasOutrosMateriais = orc.chapas.filter(ch => ch.materialId !== materialId);
        const todasChapas = [...chapasOutrosMateriais, ...novasChapas];
        
        return {
          ...orc,
          ambientes: ambientesAtualizados,
          chapas: todasChapas
        };
      }
      
      return orc;
    });
    
    setOrcamentos(orcamentosAtualizados);
    
    // Se há orçamento atual aberto e usa este material, reorganizar
    if (orcamentoAtual) {
      const usaMaterial = orcamentoAtual.chapas.some(ch => ch.materialId === materialId);
      
      if (usaMaterial) {
        const pecasDoMaterial = [];
        orcamentoAtual.ambientes.forEach(amb => {
          amb.pecas.forEach(peca => {
            if (peca.materialId === materialId) {
              pecasDoMaterial.push({ ...peca, chapaId: null });
            }
          });
        });
        
        const novasChapas = reorganizarPecasComNovoTamanho(
          pecasDoMaterial,
          { id: materialId, ...novosDados },
          4
        );
        
        const ambientesAtualizados = orcamentoAtual.ambientes.map(amb => ({
          ...amb,
          pecas: amb.pecas.map(p => {
            if (p.materialId === materialId) {
              const pecaAtualizada = pecasDoMaterial.find(pm => pm.id === p.id);
              return pecaAtualizada || p;
            }
            return p;
          })
        }));
        
        const chapasOutrosMateriais = orcamentoAtual.chapas.filter(ch => ch.materialId !== materialId);
        const todasChapas = [...chapasOutrosMateriais, ...novasChapas];
        
        setOrcamentoAtual({
          ...orcamentoAtual,
          ambientes: ambientesAtualizados,
          chapas: todasChapas
        });
      }
    }
  };

  // Função auxiliar para reorganizar peças com novo tamanho de chapa
  const reorganizarPecasComNovoTamanho = (pecas, material, espacamento) => {
    const chapas = [];
    const pecasOrdenadas = [...pecas].sort((a, b) => {
      // Ordenar por área (maior primeiro) para melhor aproveitamento
      const areaA = a.comprimento * a.altura;
      const areaB = b.comprimento * b.altura;
      return areaB - areaA;
    });

    pecasOrdenadas.forEach(peca => {
      let colocada = false;

      // Tentar colocar nas chapas existentes
      for (let chapa of chapas) {
        const pos = encontrarPosicaoNaChapaAux(chapa, peca, material, espacamento);
        if (pos) {
          peca.chapaId = chapa.id;
          peca.posX = pos.x;
          peca.posY = pos.y;
          chapa.pecas.push(peca);
          colocada = true;
          break;
        }
      }

      // Se não coube, criar nova chapa
      if (!colocada) {
        const novaChapa = {
          id: Date.now() + Math.random(),
          materialId: material.id,
          material: material,
          pecas: []
        };
        
        peca.chapaId = novaChapa.id;
        peca.posX = espacamento;
        peca.posY = espacamento;
        novaChapa.pecas.push(peca);
        chapas.push(novaChapa);
      }
    });

    return chapas;
  };

  // Função auxiliar para encontrar posição (considerando rotação)
  const encontrarPosicaoNaChapaAux = (chapa, peca, material, espacamento) => {
    const larguraChapa = material.comprimento;
    const alturaChapa = material.altura;
    
    const larguraPeca = peca.rotacao === 90 ? peca.altura : peca.comprimento;
    const alturaPeca = peca.rotacao === 90 ? peca.comprimento : peca.altura;
    
    for (let y = espacamento; y + alturaPeca + espacamento <= alturaChapa; y += 5) {
      for (let x = espacamento; x + larguraPeca + espacamento <= larguraChapa; x += 5) {
        const sobrepoe = chapa.pecas.some(p => {
          const larguraOutra = p.rotacao === 90 ? p.altura : p.comprimento;
          const alturaOutra = p.rotacao === 90 ? p.comprimento : p.altura;
          
          const distanciaX = Math.abs((x + larguraPeca / 2) - (p.posX + larguraOutra / 2));
          const distanciaY = Math.abs((y + alturaPeca / 2) - (p.posY + alturaOutra / 2));
          const somaLarguras = (larguraPeca + larguraOutra) / 2 + espacamento;
          const somaAlturas = (alturaPeca + alturaOutra) / 2 + espacamento;
          
          return distanciaX < somaLarguras && distanciaY < somaAlturas;
        });
        
        if (!sobrepoe) {
          return { x, y };
        }
      }
    }
    return null;
  };

  // Girar peça
  const girarPeca = (pecaId, chapaId) => {
    const ambientesAtualizados = orcamentoAtual.ambientes.map(amb => ({
      ...amb,
      pecas: amb.pecas.map(p => {
        if (p.id === pecaId) {
          const novaRotacao = p.rotacao === 0 ? 90 : 0;
          return { ...p, rotacao: novaRotacao };
        }
        return p;
      })
    }));

    // Reconstruir as chapas
    const todasPecas = ambientesAtualizados.flatMap(amb => amb.pecas);
    const chapasAtualizadas = orcamentoAtual.chapas.map(chapa => ({
      ...chapa,
      pecas: todasPecas.filter(p => p.chapaId === chapa.id)
    }));

    setOrcamentoAtual({ 
      ...orcamentoAtual, 
      ambientes: ambientesAtualizados, 
      chapas: chapasAtualizadas 
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header Moderno */}
        <header className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl shadow-xl p-8 mb-8 border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                  <Grid size={28} className="text-white" />
                </div>
                Sistema de Orçamento
              </h1>
              <p className="text-slate-300 text-lg">Mármore & Granito - Gestão Profissional</p>
            </div>
            {tela !== 'lista' && (
              <button
                onClick={() => setTela('lista')}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl transition-all duration-200 border border-white/20"
              >
                <Home size={20} />
                Início
              </button>
            )}
          </div>
        </header>

        {/* Modal Novo Orçamento - Design Moderno */}
        {mostrarModalNovoOrcamento && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 border border-slate-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                  <PlusCircle size={24} className="text-white" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800">Novo Orçamento</h2>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Nome do Orçamento
                </label>
                <input
                  type="text"
                  value={nomeNovoOrcamento}
                  onChange={(e) => setNomeNovoOrcamento(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      confirmarCriacaoOrcamento();
                    }
                  }}
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors"
                  placeholder="Ex: Cliente João Silva - Cozinha"
                  autoFocus
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setMostrarModalNovoOrcamento(false);
                    setNomeNovoOrcamento('');
                  }}
                  className="px-6 py-3 border-2 border-slate-200 rounded-xl hover:bg-slate-50 transition-all duration-200 font-medium text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarCriacaoOrcamento}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-semibold"
                >
                  Criar Orçamento
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Detalhes da Peça */}
        {mostrandoDetalhePeca && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4" onClick={() => {
            setMostrandoDetalhePeca(null);
            setModoEdicaoPeca(false);
            setPecaEditada(null);
          }}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200 max-h-[85vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              {/* Header Simplificado */}
              <div className="bg-gradient-to-r from-slate-700 to-slate-800 p-4 flex items-center justify-between flex-shrink-0">
                <h3 className="text-xl font-bold text-white">
                  {modoEdicaoPeca ? '✏️ Editando' : '👁️ Visualizando'}: {mostrandoDetalhePeca.nome || 'Peça'}
                </h3>
                <button
                  onClick={() => {
                    setMostrandoDetalhePeca(null);
                    setModoEdicaoPeca(false);
                    setPecaEditada(null);
                  }}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl font-bold transition-all"
                >
                  ✖ FECHAR
                </button>
              </div>

              {/* Conteúdo Rolável */}
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                {/* Banner com Botão Editar */}
                {!modoEdicaoPeca ? (
                  <button
                    onClick={() => {
                      const copia = JSON.parse(JSON.stringify(mostrandoDetalhePeca));
                      // Garantir que tenha todos os campos
                      if (!copia.acabamentos) {
                        copia.acabamentos = {
                          polimento: { ativo: false, lados: { superior: false, inferior: false, esquerda: false, direita: false } },
                          esquadria: { ativo: false, lados: { superior: false, inferior: false, esquerda: false, direita: false } },
                          boleado: { ativo: false, lados: { superior: false, inferior: false, esquerda: false, direita: false } },
                          canal: { ativo: false, lados: { superior: false, inferior: false, esquerda: false, direita: false } }
                        };
                      }
                      if (!copia.cuba) copia.cuba = 0;
                      if (!copia.cubaEsculpida) copia.cubaEsculpida = 0;
                      if (!copia.cooktop) copia.cooktop = 0;
                      if (!copia.recorte) copia.recorte = 0;
                      if (!copia.pes) copia.pes = 0;
                      
                      setPecaEditada(copia);
                      setModoEdicaoPeca(true);
                    }}
                    className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white p-4 rounded-xl font-bold text-lg shadow-lg transition-all transform hover:scale-105"
                  >
                    ✏️ CLIQUE AQUI PARA EDITAR ESTA PEÇA
                  </button>
                ) : (
                  <div className="bg-yellow-100 border-2 border-yellow-500 rounded-xl p-3 text-center">
                    <p className="text-yellow-900 font-bold">✏️ MODO EDIÇÃO - Altere os campos abaixo</p>
                  </div>
                )}

                {/* Informações Gerais - COMPACTAS */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                    <h4 className="font-semibold text-blue-900 mb-2 text-sm">📏 Dimensões</h4>
                    <div className="space-y-2">
                      <div>
                        <label className="block text-slate-600 text-xs mb-1">Nome:</label>
                        {modoEdicaoPeca ? (
                          <input
                            type="text"
                            value={pecaEditada?.nome || ''}
                            onChange={(e) => setPecaEditada({...pecaEditada, nome: e.target.value})}
                            className="w-full px-2 py-1 border-2 border-blue-400 rounded text-sm"
                          />
                        ) : (
                          <span className="font-bold text-slate-800 text-sm">{mostrandoDetalhePeca.nome || 'Sem nome'}</span>
                        )}
                      </div>
                      <div>
                        <label className="block text-slate-600 text-xs mb-1">Comprimento (mm):</label>
                        {modoEdicaoPeca ? (
                          <input
                            type="number"
                            value={pecaEditada?.comprimento || 0}
                            onChange={(e) => setPecaEditada({...pecaEditada, comprimento: parseInt(e.target.value) || 0})}
                            className="w-full px-2 py-1 border-2 border-blue-400 rounded text-sm"
                          />
                        ) : (
                          <span className="font-bold text-slate-800 text-sm">{mostrandoDetalhePeca.comprimento} mm</span>
                        )}
                      </div>
                      <div>
                        <label className="block text-slate-600 text-xs mb-1">Altura (mm):</label>
                        {modoEdicaoPeca ? (
                          <input
                            type="number"
                            value={pecaEditada?.altura || 0}
                            onChange={(e) => setPecaEditada({...pecaEditada, altura: parseInt(e.target.value) || 0})}
                            className="w-full px-2 py-1 border-2 border-blue-400 rounded text-sm"
                          />
                        ) : (
                          <span className="font-bold text-slate-800 text-sm">{mostrandoDetalhePeca.altura} mm</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                    <h4 className="font-semibold text-green-900 mb-2 text-sm">📦 Material</h4>
                    <div className="space-y-2">
                      <div>
                        <label className="block text-slate-600 text-xs mb-1">Material:</label>
                        {modoEdicaoPeca ? (
                          <select
                            value={pecaEditada?.materialId || ''}
                            onChange={(e) => setPecaEditada({...pecaEditada, materialId: parseInt(e.target.value)})}
                            className="w-full px-2 py-1 border-2 border-green-400 rounded text-sm"
                          >
                            {materiais.map(m => (
                              <option key={m.id} value={m.id}>{m.nome}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="font-bold text-slate-800 text-sm">
                            {materiais.find(m => m.id === mostrandoDetalhePeca.materialId)?.nome || 'N/A'}
                          </span>
                        )}
                      </div>
                      <div>
                        <label className="block text-slate-600 text-xs mb-1">Chapa:</label>
                        <span className="font-bold text-slate-800 text-sm">
                          #{mostrandoDetalhePeca.chapaId ? String(mostrandoDetalhePeca.chapaId).slice(-4) : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Acabamentos - EDITÁVEL OU VISUALIZAÇÃO */}
                {(modoEdicaoPeca || (mostrandoDetalhePeca.acabamentos && Object.values(mostrandoDetalhePeca.acabamentos).some(a => a.ativo))) && (
                  <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                    <h4 className="font-semibold text-purple-900 mb-2 text-sm">✨ Acabamentos</h4>
                    {modoEdicaoPeca ? (
                      <div className="space-y-2">
                        {['polimento', 'esquadria', 'boleado', 'canal'].map(tipo => (
                          <div key={tipo} className="bg-white rounded p-2 border border-purple-300">
                            <label className="flex items-center gap-2 mb-1">
                              <input
                                type="checkbox"
                                checked={pecaEditada?.acabamentos?.[tipo]?.ativo || false}
                                onChange={(e) => {
                                  const novosAcabamentos = {...(pecaEditada?.acabamentos || {})};
                                  if (!novosAcabamentos[tipo]) {
                                    novosAcabamentos[tipo] = { 
                                      ativo: false, 
                                      lados: { superior: false, inferior: false, esquerda: false, direita: false } 
                                    };
                                  }
                                  novosAcabamentos[tipo].ativo = e.target.checked;
                                  setPecaEditada({...pecaEditada, acabamentos: novosAcabamentos});
                                }}
                                className="w-4 h-4"
                              />
                              <span className="font-semibold text-sm capitalize">{tipo}</span>
                            </label>
                            {pecaEditada?.acabamentos?.[tipo]?.ativo && (
                              <div className="flex flex-wrap gap-1 ml-6 mt-1">
                                {['superior', 'inferior', 'esquerda', 'direita'].map(lado => (
                                  <label key={lado} className="flex items-center gap-1 text-xs">
                                    <input
                                      type="checkbox"
                                      checked={pecaEditada?.acabamentos?.[tipo]?.lados?.[lado] || false}
                                      onChange={(e) => {
                                        const novosAcabamentos = {...pecaEditada.acabamentos};
                                        novosAcabamentos[tipo].lados[lado] = e.target.checked;
                                        setPecaEditada({...pecaEditada, acabamentos: novosAcabamentos});
                                      }}
                                      className="w-3 h-3"
                                    />
                                    <span>{lado}</span>
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="grid md:grid-cols-2 gap-2">
                        {Object.keys(mostrandoDetalhePeca.acabamentos).map(tipo => {
                          const acab = mostrandoDetalhePeca.acabamentos[tipo];
                          if (!acab.ativo) return null;
                          const lados = Object.keys(acab.lados).filter(lado => acab.lados[lado]);
                          return (
                            <div key={tipo} className="bg-white rounded p-2 border border-purple-300">
                              <div className="font-semibold text-slate-800 capitalize text-sm mb-1">{tipo}</div>
                              <div className="flex flex-wrap gap-1">
                                {lados.map(lado => (
                                  <span key={lado} className="text-xs bg-purple-100 text-purple-700 px-1 py-0.5 rounded">
                                    {lado}
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Recortes - EDITÁVEL OU VISUALIZAÇÃO */}
                {(modoEdicaoPeca || mostrandoDetalhePeca.cuba > 0 || mostrandoDetalhePeca.cubaEsculpida > 0 || 
                  mostrandoDetalhePeca.cooktop > 0 || mostrandoDetalhePeca.recorte > 0 || 
                  mostrandoDetalhePeca.pes > 0) && (
                  <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                    <h4 className="font-semibold text-orange-900 mb-2 text-sm">🔧 Recortes</h4>
                    {modoEdicaoPeca ? (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-slate-600 mb-1">Pia/Cuba:</label>
                          <input
                            type="number"
                            value={pecaEditada?.cuba || 0}
                            onChange={(e) => setPecaEditada({...pecaEditada, cuba: parseInt(e.target.value) || 0})}
                            className="w-full px-2 py-1 border border-orange-300 rounded text-sm"
                            min="0"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-600 mb-1">Cuba Esculpida:</label>
                          <input
                            type="number"
                            value={pecaEditada?.cubaEsculpida || 0}
                            onChange={(e) => setPecaEditada({...pecaEditada, cubaEsculpida: parseInt(e.target.value) || 0})}
                            className="w-full px-2 py-1 border border-orange-300 rounded text-sm"
                            min="0"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-600 mb-1">Cooktop:</label>
                          <input
                            type="number"
                            value={pecaEditada?.cooktop || 0}
                            onChange={(e) => setPecaEditada({...pecaEditada, cooktop: parseInt(e.target.value) || 0})}
                            className="w-full px-2 py-1 border border-orange-300 rounded text-sm"
                            min="0"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-600 mb-1">Recorte:</label>
                          <input
                            type="number"
                            value={pecaEditada?.recorte || 0}
                            onChange={(e) => setPecaEditada({...pecaEditada, recorte: parseInt(e.target.value) || 0})}
                            className="w-full px-2 py-1 border border-orange-300 rounded text-sm"
                            min="0"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-600 mb-1">Pés:</label>
                          <input
                            type="number"
                            value={pecaEditada?.pes || 0}
                            onChange={(e) => setPecaEditada({...pecaEditada, pes: parseInt(e.target.value) || 0})}
                            className="w-full px-2 py-1 border border-orange-300 rounded text-sm"
                            min="0"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {mostrandoDetalhePeca.cuba > 0 && (
                          <div className="bg-white rounded p-2 text-center border border-orange-300">
                            <div className="text-xs text-slate-600">Cuba</div>
                            <div className="font-bold text-slate-800">{mostrandoDetalhePeca.cuba}x</div>
                          </div>
                        )}
                        {mostrandoDetalhePeca.cubaEsculpida > 0 && (
                          <div className="bg-white rounded p-2 text-center border border-orange-300">
                            <div className="text-xs text-slate-600">Cuba Esculpida</div>
                            <div className="font-bold text-slate-800">{mostrandoDetalhePeca.cubaEsculpida}x</div>
                          </div>
                        )}
                        {mostrandoDetalhePeca.cooktop > 0 && (
                          <div className="bg-white rounded p-2 text-center border border-orange-300">
                            <div className="text-xs text-slate-600">Cooktop</div>
                            <div className="font-bold text-slate-800">{mostrandoDetalhePeca.cooktop}x</div>
                          </div>
                        )}
                        {mostrandoDetalhePeca.recorte > 0 && (
                          <div className="bg-white rounded p-2 text-center border border-orange-300">
                            <div className="text-xs text-slate-600">Recorte</div>
                            <div className="font-bold text-slate-800">{mostrandoDetalhePeca.recorte}x</div>
                          </div>
                        )}
                        {mostrandoDetalhePeca.pes > 0 && (
                          <div className="bg-white rounded p-2 text-center border border-orange-300">
                            <div className="text-xs text-slate-600">Pés</div>
                            <div className="font-bold text-slate-800">{mostrandoDetalhePeca.pes}x</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer - APENAS EM MODO EDIÇÃO */}
              {modoEdicaoPeca && (
                <div className="bg-white p-3 border-t border-slate-200 flex justify-end gap-2 flex-shrink-0">
                  <button
                    onClick={() => {
                      setModoEdicaoPeca(false);
                      setPecaEditada(null);
                    }}
                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-100"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={salvarEdicaoPeca}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold flex items-center gap-2"
                  >
                    <Save size={18} />
                    💾 Salvar
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal de Confirmação de Exclusão */}
        {pecaParaExcluir && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[10000] p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 border-4 border-red-500">
              {/* Header */}
              <div className="bg-gradient-to-r from-red-600 to-red-700 p-6 rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <Trash2 size={24} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">Excluir Peça</h3>
                    <p className="text-red-100 text-sm">Esta ação não pode ser desfeita</p>
                  </div>
                </div>
              </div>

              {/* Conteúdo */}
              <div className="p-6">
                <p className="text-gray-700 text-lg mb-2">
                  Deseja realmente excluir esta peça?
                </p>
                <p className="text-gray-900 font-bold text-xl bg-gray-100 p-3 rounded-lg">
                  {pecaParaExcluir.pecaNome || 'Peça sem nome'}
                </p>
                <p className="text-sm text-gray-500 mt-3">
                  A peça será removida e as chapas serão reorganizadas automaticamente.
                </p>
              </div>

              {/* Rodapé */}
              <div className="bg-gray-50 p-4 rounded-b-2xl flex gap-3 justify-end">
                <button
                  onClick={() => {
                    console.log('❌ Cancelou exclusão');
                    setPecaParaExcluir(null);
                  }}
                  className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-100 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    console.log('✅ Confirmou exclusão');
                    excluirPeca(pecaParaExcluir.ambienteId, pecaParaExcluir.pecaId);
                    setPecaParaExcluir(null);
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center gap-2"
                >
                  <Trash2 size={20} />
                  Excluir Peça
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Visualização de Etiquetas */}
        {/* Menu Principal - Design Moderno */}
        {tela === 'lista' && (
          <div className="space-y-8">
            {/* Painel de Configuração de Preços */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200">
              <button
                onClick={() => setMostrarPainelPrecos(!mostrarPainelPrecos)}
                className="w-full flex items-center justify-between p-6 hover:bg-slate-50 transition-colors rounded-2xl"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                    <span className="text-white text-xl font-bold">R$</span>
                  </div>
                  <div className="text-left">
                    <h2 className="text-xl font-bold text-slate-800">Configuração de Preços</h2>
                    <p className="text-sm text-slate-500">Acabamentos e recortes</p>
                  </div>
                </div>
                <div className="text-slate-400">
                  {mostrarPainelPrecos ? '▲' : '▼'}
                </div>
              </button>
              
              {mostrarPainelPrecos && (
                <div className="px-6 pb-6 pt-2 border-t border-slate-200">
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Acabamentos */}
                    <div>
                      <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        Acabamentos (por metro linear)
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-1">Polimento</label>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500">R$</span>
                            <input
                              type="number"
                              value={precos.polimento}
                              onChange={(e) => atualizarPreco('polimento', e.target.value)}
                              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                              step="0.01"
                              min="0"
                            />
                            <span className="text-slate-500 text-sm">/m</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-1">Esquadria</label>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500">R$</span>
                            <input
                              type="number"
                              value={precos.esquadria}
                              onChange={(e) => atualizarPreco('esquadria', e.target.value)}
                              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                              step="0.01"
                              min="0"
                            />
                            <span className="text-slate-500 text-sm">/m</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-1">Boleado</label>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500">R$</span>
                            <input
                              type="number"
                              value={precos.boleado}
                              onChange={(e) => atualizarPreco('boleado', e.target.value)}
                              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                              step="0.01"
                              min="0"
                            />
                            <span className="text-slate-500 text-sm">/m</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-1">Canal</label>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500">R$</span>
                            <input
                              type="number"
                              value={precos.canal}
                              onChange={(e) => atualizarPreco('canal', e.target.value)}
                              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                              step="0.01"
                              min="0"
                            />
                            <span className="text-slate-500 text-sm">/m</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Recortes */}
                    <div>
                      <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                        Recortes (por unidade)
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-1">Pia/Cuba</label>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500">R$</span>
                            <input
                              type="number"
                              value={precos.pia}
                              onChange={(e) => atualizarPreco('pia', e.target.value)}
                              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                              step="0.01"
                              min="0"
                            />
                            <span className="text-slate-500 text-sm">/un</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-1">Cuba Esculpida</label>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500">R$</span>
                            <input
                              type="number"
                              value={precos.cubaEsculpida}
                              onChange={(e) => atualizarPreco('cubaEsculpida', e.target.value)}
                              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                              step="0.01"
                              min="0"
                            />
                            <span className="text-slate-500 text-sm">/un</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-1">Cooktop</label>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500">R$</span>
                            <input
                              type="number"
                              value={precos.cooktop}
                              onChange={(e) => atualizarPreco('cooktop', e.target.value)}
                              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                              step="0.01"
                              min="0"
                            />
                            <span className="text-slate-500 text-sm">/un</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-1">Recorte Genérico</label>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500">R$</span>
                            <input
                              type="number"
                              value={precos.recorte}
                              onChange={(e) => atualizarPreco('recorte', e.target.value)}
                              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                              step="0.01"
                              min="0"
                            />
                            <span className="text-slate-500 text-sm">/un</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-1">Pés</label>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500">R$</span>
                            <input
                              type="number"
                              value={precos.pes}
                              onChange={(e) => atualizarPreco('pes', e.target.value)}
                              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                              step="0.01"
                              min="0"
                            />
                            <span className="text-slate-500 text-sm">/un</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Botão Salvar */}
                  <div className="mt-6 flex items-center justify-between gap-4">
                    <button
                      onClick={salvarPrecos}
                      className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                        precosSalvos 
                          ? 'bg-green-500 text-white shadow-lg' 
                          : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:shadow-lg'
                      }`}
                    >
                      <Save size={20} />
                      {precosSalvos ? '✓ Salvo com Sucesso!' : 'Salvar Configurações'}
                    </button>
                    
                    {!precosSalvos && (
                      <p className="text-sm text-orange-600 font-medium">
                        ⚠️ Há alterações não salvas
                      </p>
                    )}
                  </div>
                  
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      💡 <strong>Dica:</strong> Estes valores serão usados automaticamente em todos os orçamentos. Clique em "Salvar" para confirmar!
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              {/* Card Materiais - Redesenhado */}
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200 hover:shadow-xl transition-shadow duration-300">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                      <Package size={20} className="text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800">Materiais</h2>
                  </div>
                  <button
                    onClick={() => setTela('novo-material')}
                    className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2.5 rounded-xl hover:shadow-lg transition-all duration-200 font-medium"
                  >
                    <PlusCircle size={18} />
                    Novo
                  </button>
                </div>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {materiais.map(mat => (
                    <div key={mat.id} className="bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200 rounded-xl p-4 hover:shadow-md transition-all duration-200">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-bold text-slate-800 text-lg">{mat.nome}</h3>
                          <div className="grid grid-cols-3 gap-3 mt-2">
                            <div>
                              <p className="text-xs text-slate-500">Dimensões</p>
                              <p className="text-sm font-semibold text-slate-700">{mat.comprimento} x {mat.altura} mm</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500">Custo</p>
                              <p className="text-sm font-semibold text-orange-600">{formatBRL(mat.custo)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500">Venda</p>
                              <p className="text-sm font-semibold text-green-600">{formatBRL((mat.venda || mat.custo))}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => {
                              setMaterialEditando(mat);
                              setNovoMaterial({
                                nome: mat.nome,
                                comprimento: mat.comprimento.toString(),
                                altura: mat.altura.toString(),
                                custo: mat.custo.toString(),
                                venda: (mat.venda || mat.custo).toString()
                              });
                              setTela('editar-material');
                            }}
                            className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors"
                            title="Editar material"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm('Deseja realmente excluir este material?')) {
                                setMateriais(materiais.filter(m => m.id !== mat.id));
                              }
                            }}
                            className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
                            title="Excluir material"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card Orçamentos - Redesenhado */}
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200 hover:shadow-xl transition-shadow duration-300">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                      <FileText size={20} className="text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800">Orçamentos</h2>
                  </div>
                  <button
                    onClick={criarOrcamento}
                    className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2.5 rounded-xl hover:shadow-lg transition-all duration-200 font-medium"
                  >
                    <PlusCircle size={18} />
                    Novo
                  </button>
                </div>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {orcamentos.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <FileText size={32} className="text-slate-400" />
                      </div>
                      <p className="text-slate-500">Nenhum orçamento criado ainda</p>
                    </div>
                  ) : (
                    orcamentos.map(orc => {
                      const totalPecas = orc.ambientes.reduce((sum, amb) => sum + amb.pecas.length, 0);
                      const orcCalc = calcularOrcamentoSalvo(orc);
                      return (
                        <div 
                          key={orc.id} 
                          className="bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200 rounded-xl p-4 hover:shadow-md transition-all duration-200 cursor-pointer"
                          onClick={() => {
                            setOrcamentoAtual(orc);
                            setTela('orcamento');
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-bold text-slate-800 text-lg">{orc.nome || `Orçamento #${String(orc.id).slice(-6)}`}</p>
                              <p className="text-xs text-slate-500 mt-1">📅 {orc.data}</p>
                              <div className="flex gap-4 mt-2 text-xs text-slate-600">
                                <span>🏠 {orc.ambientes.length} ambientes</span>
                                <span>📦 {totalPecas} peças</span>
                                <span>📄 {orc.chapas.length} chapas</span>
                              </div>
                            </div>
                            <div className="text-right ml-4">
                              <div className="space-y-1">
                                <div>
                                  <p className="text-xs text-slate-500 uppercase">Custo</p>
                                  <p className="text-lg font-bold text-orange-600">
                                    {formatBRL(orcCalc.custoTotal)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-slate-500 uppercase">Venda</p>
                                  <p className="text-2xl font-bold text-green-600">
                                    {formatBRL(orcCalc.vendaTotal)}
                                  </p>
                                </div>
                                <div className="pt-1 border-t border-slate-300">
                                  <p className="text-xs text-blue-600 font-semibold">
                                    💰 Lucro: {formatBRL(orcCalc.margemTotal)}
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (window.confirm('Deseja realmente excluir este orçamento?')) {
                                    setOrcamentos(orcamentos.filter(o => o.id !== orc.id));
                                  }
                                }}
                                className="mt-3 text-red-600 hover:bg-red-50 px-3 py-1 rounded-lg text-xs flex items-center gap-1 transition-colors"
                              >
                                <Trash2 size={14} />
                                Excluir
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cadastro de Material */}
        {tela === 'novo-material' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-gray-800">Novo Material</h2>
              <button
                onClick={() => setTela('lista')}
                className="text-gray-600 hover:text-gray-800"
              >
                <X size={24} />
              </button>
            </div>
            <div className="grid md:grid-cols-2 gap-4 max-w-2xl">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nome do Material</label>
                <input
                  type="text"
                  value={novoMaterial.nome}
                  onChange={(e) => setNovoMaterial({ ...novoMaterial, nome: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Ex: Mármore Branco Carrara"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Comprimento da Chapa (mm)</label>
                <input
                  type="number"
                  value={novoMaterial.comprimento}
                  onChange={(e) => setNovoMaterial({ ...novoMaterial, comprimento: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="3000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Altura da Chapa (mm)</label>
                <input
                  type="number"
                  value={novoMaterial.altura}
                  onChange={(e) => setNovoMaterial({ ...novoMaterial, altura: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="2000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Custo por Chapa (R$)</label>
                <input
                  type="number"
                  value={novoMaterial.custo}
                  onChange={(e) => setNovoMaterial({ ...novoMaterial, custo: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="1500.00"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Preço de Venda (R$)</label>
                <input
                  type="number"
                  value={novoMaterial.venda}
                  onChange={(e) => setNovoMaterial({ ...novoMaterial, venda: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="2000.00"
                  step="0.01"
                />
              </div>
            </div>
            <div className="mt-6">
              <button
                onClick={() => {
                  if (novoMaterial.nome && novoMaterial.comprimento && novoMaterial.altura && novoMaterial.custo && novoMaterial.venda) {
                    setMateriais([...materiais, {
                      id: Date.now(),
                      nome: novoMaterial.nome,
                      comprimento: parseFloat(novoMaterial.comprimento),
                      altura: parseFloat(novoMaterial.altura),
                      custo: parseFloat(novoMaterial.custo),
                      venda: parseFloat(novoMaterial.venda)
                    }]);
                    setNovoMaterial({ nome: '', comprimento: '', altura: '', custo: '', venda: '' });
                    setTela('lista');
                  }
                }}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                Salvar Material
              </button>
            </div>
          </div>
        )}

        {/* Edição de Material */}
        {tela === 'editar-material' && materialEditando && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-gray-800">Editar Material</h2>
              <button
                onClick={() => {
                  setTela('lista');
                  setMaterialEditando(null);
                  setNovoMaterial({ nome: '', comprimento: '', altura: '', custo: '', venda: '' });
                }}
                className="text-gray-600 hover:text-gray-800"
              >
                <X size={24} />
              </button>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-yellow-800 font-semibold mb-1">
                ⚠️ Atenção: Alterações neste material afetarão todos os orçamentos
              </p>
              <p className="text-xs text-yellow-700">
                • Mudanças de preço: atualizam o valor dos orçamentos automaticamente<br/>
                • Mudanças de tamanho: reorganizam as peças e podem adicionar novas chapas se necessário
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-4 max-w-2xl">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nome do Material</label>
                <input
                  type="text"
                  value={novoMaterial.nome}
                  onChange={(e) => setNovoMaterial({ ...novoMaterial, nome: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Ex: Mármore Branco Carrara"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Comprimento da Chapa (mm)</label>
                <input
                  type="number"
                  value={novoMaterial.comprimento}
                  onChange={(e) => setNovoMaterial({ ...novoMaterial, comprimento: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="3000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Altura da Chapa (mm)</label>
                <input
                  type="number"
                  value={novoMaterial.altura}
                  onChange={(e) => setNovoMaterial({ ...novoMaterial, altura: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="2000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Custo por Chapa (R$)</label>
                <input
                  type="number"
                  value={novoMaterial.custo}
                  onChange={(e) => setNovoMaterial({ ...novoMaterial, custo: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="1500.00"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Preço de Venda (R$)</label>
                <input
                  type="number"
                  value={novoMaterial.venda}
                  onChange={(e) => setNovoMaterial({ ...novoMaterial, venda: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="2000.00"
                  step="0.01"
                />
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  if (novoMaterial.nome && novoMaterial.comprimento && novoMaterial.altura && novoMaterial.custo && novoMaterial.venda) {
                    atualizarMaterial(materialEditando.id, {
                      nome: novoMaterial.nome,
                      comprimento: parseFloat(novoMaterial.comprimento),
                      altura: parseFloat(novoMaterial.altura),
                      custo: parseFloat(novoMaterial.custo),
                      venda: parseFloat(novoMaterial.venda)
                    });
                    setNovoMaterial({ nome: '', comprimento: '', altura: '', custo: '', venda: '' });
                    setMaterialEditando(null);
                    setTela('lista');
                    alert('Material atualizado com sucesso!\n\nTodos os orçamentos foram recalculados.\nPeças foram reorganizadas nas chapas conforme o novo tamanho.');
                  }
                }}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                Salvar Alterações
              </button>
              <button
                onClick={() => {
                  setTela('lista');
                  setMaterialEditando(null);
                  setNovoMaterial({ nome: '', comprimento: '', altura: '', custo: '', venda: '' });
                }}
                className="border border-gray-300 px-6 py-2 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Tela de Orçamento */}
        {tela === 'orcamento' && orcamentoAtual && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-1">
                  <input
                    type="text"
                    value={orcamentoAtual.nome}
                    onChange={(e) => setOrcamentoAtual({ ...orcamentoAtual, nome: e.target.value })}
                    className="text-2xl font-semibold text-gray-800 border-b-2 border-transparent hover:border-blue-300 focus:border-blue-500 focus:outline-none w-full"
                    placeholder="Nome do orçamento"
                  />
                </div>
                <p className="text-sm text-gray-500 mb-3">Criado em: {orcamentoAtual.data}</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setTela('plano-corte')}
                    className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
                  >
                    <Grid size={20} />
                    Plano de Corte
                  </button>
                  <button
                    onClick={() => gerarEtiquetasPDF()}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    <Printer size={20} />
                    Gerar Etiquetas
                  </button>
                  <button
                    onClick={() => {
                      // Verificar se é um orçamento existente ou novo
                      const existe = orcamentos.find(o => o.id === orcamentoAtual.id);
                      
                      if (existe) {
                        // Atualizar orçamento existente
                        setOrcamentos(orcamentos.map(o => 
                          o.id === orcamentoAtual.id ? orcamentoAtual : o
                        ));
                        alert('Orçamento atualizado com sucesso!');
                      } else {
                        // Adicionar novo orçamento
                        setOrcamentos([...orcamentos, orcamentoAtual]);
                        alert('Orçamento salvo com sucesso!');
                      }
                      
                      setTela('lista');
                      setOrcamentoAtual(null);
                    }}
                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                  >
                    <Save size={20} />
                    Salvar Orçamento
                  </button>
                </div>
              </div>

              {/* Adicionar Ambiente */}
              <div className="mb-6">
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Nome do ambiente (ex: Cozinha)"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        adicionarAmbiente(e.target.value);
                        e.target.value = '';
                      }
                    }}
                  />
                  <button
                    onClick={(e) => {
                      const input = e.target.previousSibling;
                      adicionarAmbiente(input.value);
                      input.value = '';
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Adicionar Ambiente
                  </button>
                </div>
              </div>

              {/* Lista de Ambientes */}
              <div className="space-y-4" style={{ 
                opacity: (mostrandoDetalhePeca || pecaParaExcluir) ? 0 : 1,
                pointerEvents: (mostrandoDetalhePeca || pecaParaExcluir) ? 'none' : 'auto',
                transition: 'opacity 0.3s'
              }}>
                {orcamentoAtual.ambientes.map(ambiente => (
                  <AmbienteCard
                    key={ambiente.id}
                    ambiente={ambiente}
                    materiais={materiais}
                    precos={precos}
                    onAdicionarPeca={(peca) => adicionarPeca(ambiente.id, peca)}
                    onExcluirPeca={(pecaId) => excluirPeca(ambiente.id, pecaId)}
                    onVisualizarPeca={(peca) => setMostrandoDetalhePeca(peca)}
                    onPedirConfirmacaoExclusao={(pecaId, pecaNome) => {
                      setPecaParaExcluir({ pecaId, ambienteId: ambiente.id, pecaNome });
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Resumo do Orçamento */}
            <ResumoOrcamento orcamentoAtual={orcamentoAtual} materiais={materiais} precos={precos} />
          </div>
        )}

        {/* Plano de Corte */}
        {tela === 'plano-corte' && orcamentoAtual && (
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                  <Grid size={20} className="text-white" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800">Plano de Corte</h2>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={imprimirPlanoCorte}
                  className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2.5 rounded-xl hover:shadow-lg transition-all duration-200 font-medium"
                >
                  <FileText size={20} />
                  Imprimir Plano
                </button>
                <button
                  onClick={() => setTela('orcamento')}
                  className="flex items-center gap-2 text-slate-600 hover:text-slate-800 border-2 border-slate-200 px-4 py-2.5 rounded-xl hover:bg-slate-50 transition-all duration-200"
                >
                  <X size={20} />
                  Voltar
                </button>
              </div>
            </div>

            <div className="space-y-6">
              {orcamentoAtual.chapas.map((chapa, idx) => (
                <PlanoCorteChapa
                  key={chapa.id}
                  chapa={chapa}
                  numero={idx + 1}
                  onMoverPeca={moverPeca}
                  onMoverPecaNaChapa={moverPecaNaChapa}
                  onGirarPeca={girarPeca}
                  pecaArrastando={pecaArrastando}
                  setPecaArrastando={setPecaArrastando}
                  todasChapas={orcamentoAtual.chapas}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Componente de Card de Ambiente
const AmbienteCard = ({ ambiente, materiais, precos, onAdicionarPeca, onExcluirPeca, onVisualizarPeca, onPedirConfirmacaoExclusao }) => {
  const [expandido, setExpandido] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [novaPeca, setNovaPeca] = useState({
    nome: '',
    altura: '',
    comprimento: '',
    quantidade: 1,
    materialId: materiais[0]?.id || null,
    acabamentos: {
      esquadria: { ativo: false, lados: { superior: false, inferior: false, esquerda: false, direita: false } },
      boleado: { ativo: false, lados: { superior: false, inferior: false, esquerda: false, direita: false } },
      polimento: { ativo: false, lados: { superior: false, inferior: false, esquerda: false, direita: false } },
      canal: { ativo: false, lados: { superior: false, inferior: false, esquerda: false, direita: false } }
    },
    cuba: 0,
    cubaEsculpida: 0,
    cooktop: 0,
    recorte: 0,
    pes: 0
  });

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden" style={{ position: 'relative', zIndex: 1 }}>
      <div
        className="bg-gray-50 p-4 cursor-pointer hover:bg-gray-100"
        onClick={() => setExpandido(!expandido)}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">{ambiente.nome}</h3>
          <span className="text-sm text-gray-600">{ambiente.pecas.length} peças</span>
        </div>
      </div>

      {expandido && (
        <div className="p-4 space-y-4">
          {/* Lista de Peças */}
          {ambiente.pecas.map(peca => {
            const material = materiais.find(m => m.id === peca.materialId);
            return (
              <div key={peca.id} className="bg-gray-50 p-3 rounded-lg border border-gray-200 hover:border-blue-300 transition-all relative" style={{ zIndex: 1 }}>
                {/* Botões de Ação - ABSOLUTOS NO CANTO */}
                <div className="absolute top-2 right-2 flex gap-2" style={{ zIndex: 2, position: 'absolute' }}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('🔵 Ver detalhes clicado');
                      onVisualizarPeca && onVisualizarPeca(peca);
                    }}
                    onMouseEnter={() => console.log('Mouse entrou no botão AZUL')}
                    className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg shadow-lg transition-all"
                    title="Ver detalhes"
                    style={{ cursor: 'pointer', pointerEvents: 'auto' }}
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('🔴 CLICOU NO BOTÃO EXCLUIR');
                      console.log('Peça ID:', peca.id);
                      console.log('Ambiente ID:', ambiente.id);
                      
                      // Chamar callback para mostrar modal de confirmação
                      if (onPedirConfirmacaoExclusao) {
                        onPedirConfirmacaoExclusao(peca.id, peca.nome);
                      }
                    }}
                    onMouseEnter={() => console.log('Mouse entrou no botão VERMELHO')}
                    className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg shadow-lg transition-all"
                    title="Excluir peça"
                    style={{ cursor: 'pointer', pointerEvents: 'auto' }}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                <div className="flex gap-3 pr-24">
                  {/* Miniatura da peça */}
                  <div 
                    className="flex-shrink-0 cursor-pointer hover:scale-105 transition-transform" 
                    style={{ width: '120px', height: '90px' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onVisualizarPeca && onVisualizarPeca(peca);
                    }}
                    title="Clique para ver detalhes"
                  >
                    <PreviewAcabamentos peca={peca} mostrarSempre={true} mini={true} />
                  </div>
                  
                  {/* Informações da peça */}
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-800 mb-2">{peca.nome || 'Sem nome'}</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                      <div>
                        <p className="text-gray-500 text-xs">Dimensões</p>
                        <p className="font-medium text-xs">{peca.comprimento} x {peca.altura} mm</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Material</p>
                        <p className="font-medium text-xs">{material?.nome}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Chapa</p>
                        <p className="font-medium text-xs">#{peca.chapaId ? String(peca.chapaId).slice(-4) : 'N/A'}</p>
                      </div>
                    </div>
                    
                    {/* Acabamentos aplicados */}
                    {peca.acabamentos && Object.values(peca.acabamentos).some(a => a.ativo) && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {Object.keys(peca.acabamentos).map(tipo => {
                          const acab = peca.acabamentos[tipo];
                          if (!acab.ativo) return null;
                          const cores = {
                            esquadria: 'bg-red-100 text-red-700',
                            boleado: 'bg-yellow-100 text-yellow-700',
                            polimento: 'bg-blue-100 text-blue-700',
                            canal: 'bg-orange-100 text-orange-700'
                          };
                          return (
                            <span key={tipo} className={`text-xs px-2 py-0.5 rounded ${cores[tipo]}`}>
                              {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Botão Adicionar Peça */}
          {!mostrarForm && (
            <button
              onClick={() => setMostrarForm(true)}
              className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-gray-600 hover:border-blue-500 hover:text-blue-600"
            >
              + Adicionar Peça
            </button>
          )}

          {/* Formulário de Nova Peça */}
          {mostrarForm && (
            <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
              <h4 className="font-semibold mb-3">Nova Peça</h4>
              <div className="mb-3">
                <label className="block text-xs font-medium mb-1">Nome da Peça *</label>
                <input
                  type="text"
                  value={novaPeca.nome}
                  onChange={(e) => setNovaPeca({ ...novaPeca, nome: e.target.value })}
                  className="w-full border rounded px-2 py-1 text-sm"
                  placeholder="Ex: Bancada Pia, Mesa Jantar, etc"
                />
              </div>
              <div className="grid md:grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Altura (mm)</label>
                  <input
                    type="number"
                    value={novaPeca.altura}
                    onChange={(e) => setNovaPeca({ ...novaPeca, altura: e.target.value })}
                    className="w-full border rounded px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Comprimento (mm)</label>
                  <input
                    type="number"
                    value={novaPeca.comprimento}
                    onChange={(e) => setNovaPeca({ ...novaPeca, comprimento: e.target.value })}
                    className="w-full border rounded px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Quantidade</label>
                  <input
                    type="number"
                    value={novaPeca.quantidade}
                    onChange={(e) => setNovaPeca({ ...novaPeca, quantidade: parseInt(e.target.value) || 1 })}
                    className="w-full border rounded px-2 py-1 text-sm"
                    min="1"
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-xs font-medium mb-1">Material</label>
                  <select
                    value={novaPeca.materialId}
                    onChange={(e) => setNovaPeca({ ...novaPeca, materialId: parseInt(e.target.value) })}
                    className="w-full border rounded px-2 py-1 text-sm"
                  >
                    {materiais.map(mat => (
                      <option key={mat.id} value={mat.id}>{mat.nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              <h5 className="font-medium text-sm mb-2">Acabamentos (opcional)</h5>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={novaPeca.acabamentos.esquadria.ativo}
                    onChange={(e) => {
                      setNovaPeca({
                        ...novaPeca,
                        acabamentos: {
                          ...novaPeca.acabamentos,
                          esquadria: { ...novaPeca.acabamentos.esquadria, ativo: e.target.checked }
                        }
                      });
                    }}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Esquadria (R$ {precos.esquadria}/m)</span>
                </label>
                
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={novaPeca.acabamentos.boleado.ativo}
                    onChange={(e) => {
                      setNovaPeca({
                        ...novaPeca,
                        acabamentos: {
                          ...novaPeca.acabamentos,
                          boleado: { ...novaPeca.acabamentos.boleado, ativo: e.target.checked }
                        }
                      });
                    }}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Boleado (R$ {precos.boleado}/m)</span>
                </label>
                
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={novaPeca.acabamentos.polimento.ativo}
                    onChange={(e) => {
                      setNovaPeca({
                        ...novaPeca,
                        acabamentos: {
                          ...novaPeca.acabamentos,
                          polimento: { ...novaPeca.acabamentos.polimento, ativo: e.target.checked }
                        }
                      });
                    }}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Polimento (R$ {precos.polimento}/m)</span>
                </label>
                
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={novaPeca.acabamentos.canal.ativo}
                    onChange={(e) => {
                      setNovaPeca({
                        ...novaPeca,
                        acabamentos: {
                          ...novaPeca.acabamentos,
                          canal: { ...novaPeca.acabamentos.canal, ativo: e.target.checked }
                        }
                      });
                    }}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Canal (R$ {precos.canal}/m)</span>
                </label>
              </div>
              
              {/* Preview Unificado de Acabamentos */}
              {(novaPeca.acabamentos.esquadria.ativo || 
                novaPeca.acabamentos.boleado.ativo || 
                novaPeca.acabamentos.polimento.ativo || 
                novaPeca.acabamentos.canal.ativo) && (
                <div className="mb-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <h6 className="font-semibold text-sm mb-3">📐 Selecione os lados para cada acabamento:</h6>
                  
                  <div className="space-y-4">
                    {[
                      { tipo: 'esquadria', label: 'Esquadria', cor: 'red', emoji: '🔴' },
                      { tipo: 'boleado', label: 'Boleado', cor: 'yellow', emoji: '🟡' },
                      { tipo: 'polimento', label: 'Polimento', cor: 'blue', emoji: '🔵' },
                      { tipo: 'canal', label: 'Canal', cor: 'orange', emoji: '🟠' }
                    ].filter(item => novaPeca.acabamentos[item.tipo].ativo).map(item => {
                      const coresBg = { red: 'bg-red-100 border-red-400 text-red-700', yellow: 'bg-yellow-100 border-yellow-400 text-yellow-700', blue: 'bg-blue-100 border-blue-400 text-blue-700', orange: 'bg-orange-100 border-orange-400 text-orange-700' };
                      const coresAtivo = { red: 'bg-red-500 text-white border-red-600', yellow: 'bg-yellow-500 text-white border-yellow-600', blue: 'bg-blue-500 text-white border-blue-600', orange: 'bg-orange-500 text-white border-orange-600' };
                      const coresInativo = { red: 'bg-white text-red-400 border-red-200 hover:bg-red-50', yellow: 'bg-white text-yellow-500 border-yellow-200 hover:bg-yellow-50', blue: 'bg-white text-blue-400 border-blue-200 hover:bg-blue-50', orange: 'bg-white text-orange-400 border-orange-200 hover:bg-orange-50' };
                      
                      const toggleLado = (lado) => {
                        const novosAcabamentos = { ...novaPeca.acabamentos };
                        novosAcabamentos[item.tipo] = {
                          ...novosAcabamentos[item.tipo],
                          lados: {
                            ...novosAcabamentos[item.tipo].lados,
                            [lado]: !novosAcabamentos[item.tipo].lados[lado]
                          }
                        };
                        setNovaPeca({ ...novaPeca, acabamentos: novosAcabamentos });
                      };

                      const lados = novaPeca.acabamentos[item.tipo].lados;
                      const ladosSelecionados = Object.keys(lados).filter(l => lados[l]).length;

                      return (
                        <div key={item.tipo} className={`rounded-lg p-3 border ${coresBg[item.cor]}`}>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-bold">{item.emoji} {item.label}</p>
                            <span className="text-xs opacity-70">{ladosSelecionados} lado(s)</span>
                          </div>
                          
                          {/* Seletor visual com quadrado representando a peça */}
                          <div className="flex items-center justify-center">
                            <div className="relative" style={{ width: '180px', height: '120px' }}>
                              {/* Botão SUPERIOR */}
                              <button
                                type="button"
                                onClick={() => toggleLado('superior')}
                                className={`absolute top-0 left-1/2 -translate-x-1/2 px-3 py-1 text-xs font-bold rounded-t-lg border-2 transition-all ${lados.superior ? coresAtivo[item.cor] : coresInativo[item.cor]}`}
                                style={{ minWidth: '80px', zIndex: 2 }}
                              >
                                Superior
                              </button>

                              {/* Botão INFERIOR */}
                              <button
                                type="button"
                                onClick={() => toggleLado('inferior')}
                                className={`absolute bottom-0 left-1/2 -translate-x-1/2 px-3 py-1 text-xs font-bold rounded-b-lg border-2 transition-all ${lados.inferior ? coresAtivo[item.cor] : coresInativo[item.cor]}`}
                                style={{ minWidth: '80px', zIndex: 2 }}
                              >
                                Inferior
                              </button>

                              {/* Botão ESQUERDA */}
                              <button
                                type="button"
                                onClick={() => toggleLado('esquerda')}
                                className={`absolute left-0 top-1/2 -translate-y-1/2 px-1 py-2 text-xs font-bold rounded-l-lg border-2 transition-all ${lados.esquerda ? coresAtivo[item.cor] : coresInativo[item.cor]}`}
                                style={{ writingMode: 'vertical-lr', textOrientation: 'mixed', zIndex: 2 }}
                              >
                                Esq.
                              </button>

                              {/* Botão DIREITA */}
                              <button
                                type="button"
                                onClick={() => toggleLado('direita')}
                                className={`absolute right-0 top-1/2 -translate-y-1/2 px-1 py-2 text-xs font-bold rounded-r-lg border-2 transition-all ${lados.direita ? coresAtivo[item.cor] : coresInativo[item.cor]}`}
                                style={{ writingMode: 'vertical-lr', textOrientation: 'mixed', zIndex: 2 }}
                              >
                                Dir.
                              </button>

                              {/* Quadrado central representando a peça */}
                              <div 
                                className="absolute bg-white border-2 border-gray-300 rounded flex items-center justify-center"
                                style={{ top: '22px', bottom: '22px', left: '26px', right: '26px' }}
                              >
                                <span className="text-xs text-gray-400 font-medium">PEÇA</span>
                              </div>
                            </div>
                          </div>

                          {/* Botão rápido: Todos os lados */}
                          <div className="flex justify-center mt-2 gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const novosAcabamentos = { ...novaPeca.acabamentos };
                                const todosAtivos = lados.superior && lados.inferior && lados.esquerda && lados.direita;
                                novosAcabamentos[item.tipo] = {
                                  ...novosAcabamentos[item.tipo],
                                  lados: {
                                    superior: !todosAtivos,
                                    inferior: !todosAtivos,
                                    esquerda: !todosAtivos,
                                    direita: !todosAtivos
                                  }
                                };
                                setNovaPeca({ ...novaPeca, acabamentos: novosAcabamentos });
                              }}
                              className={`text-xs px-3 py-1 rounded-full border font-semibold transition-all ${
                                lados.superior && lados.inferior && lados.esquerda && lados.direita
                                  ? coresAtivo[item.cor]
                                  : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
                              }`}
                            >
                              {lados.superior && lados.inferior && lados.esquerda && lados.direita ? '✓ Todos os lados' : 'Selecionar todos'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <h5 className="font-medium text-sm mb-2">Recortes (opcional)</h5>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3">
                <div>
                  <label className="block text-xs mb-1">Cuba</label>
                  <input
                    type="number"
                    value={novaPeca.cuba}
                    onChange={(e) => setNovaPeca({ ...novaPeca, cuba: parseInt(e.target.value) || 0 })}
                    className="w-full border rounded px-2 py-1 text-sm"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1">Cuba Esculpida</label>
                  <input
                    type="number"
                    value={novaPeca.cubaEsculpida}
                    onChange={(e) => setNovaPeca({ ...novaPeca, cubaEsculpida: parseInt(e.target.value) || 0 })}
                    className="w-full border rounded px-2 py-1 text-sm"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1">Cooktop</label>
                  <input
                    type="number"
                    value={novaPeca.cooktop}
                    onChange={(e) => setNovaPeca({ ...novaPeca, cooktop: parseInt(e.target.value) || 0 })}
                    className="w-full border rounded px-2 py-1 text-sm"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1">Recorte</label>
                  <input
                    type="number"
                    value={novaPeca.recorte}
                    onChange={(e) => setNovaPeca({ ...novaPeca, recorte: parseInt(e.target.value) || 0 })}
                    className="w-full border rounded px-2 py-1 text-sm"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1">Pés</label>
                  <input
                    type="number"
                    value={novaPeca.pes}
                    onChange={(e) => setNovaPeca({ ...novaPeca, pes: parseInt(e.target.value) || 0 })}
                    className="w-full border rounded px-2 py-1 text-sm"
                    min="0"
                  />
                </div>
              </div>

              {/* Preview da Peça */}
              {novaPeca.comprimento && novaPeca.altura && (
                <div className="mb-4">
                  <PreviewAcabamentos peca={novaPeca} />
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (novaPeca.nome && novaPeca.altura && novaPeca.comprimento && novaPeca.materialId) {
                      onAdicionarPeca({
                        ...novaPeca,
                        altura: parseFloat(novaPeca.altura),
                        comprimento: parseFloat(novaPeca.comprimento)
                      });
                      setNovaPeca({
                        nome: '',
                        altura: '',
                        comprimento: '',
                        quantidade: 1,
                        materialId: materiais[0]?.id || null,
                        acabamentos: {
                          esquadria: { ativo: false, lados: { superior: false, inferior: false, esquerda: false, direita: false } },
                          boleado: { ativo: false, lados: { superior: false, inferior: false, esquerda: false, direita: false } },
                          polimento: { ativo: false, lados: { superior: false, inferior: false, esquerda: false, direita: false } },
                          canal: { ativo: false, lados: { superior: false, inferior: false, esquerda: false, direita: false } }
                        },
                        cuba: 0,
                        cubaEsculpida: 0,
                        cooktop: 0,
                        recorte: 0,
                        pes: 0
                      });
                      setMostrarForm(false);
                    } else {
                      alert('Por favor, preencha o nome, altura e comprimento da peça!');
                    }
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
                >
                  Adicionar
                </button>
                <button
                  onClick={() => setMostrarForm(false)}
                  className="border border-gray-300 px-4 py-2 rounded text-sm hover:bg-gray-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};


// Componente de Pré-visualização de Acabamentos
const PreviewAcabamentos = ({ peca, mostrarSempre = false, mini = false }) => {
  const canvasRef = useRef(null);
  
  useEffect(() => {
    desenharPreview();
  }, [peca]);
  
  const desenharPreview = () => {
    const canvas = canvasRef.current;
    if (!canvas || !peca.comprimento || !peca.altura) return;
    
    const ctx = canvas.getContext('2d');
    const largura = parseFloat(peca.comprimento) || 600;
    const altura = parseFloat(peca.altura) || 400;
    
    // Ajustar tamanho do canvas baseado em mini ou normal
    const canvasWidth = mini ? 120 : 260;
    const canvasHeight = mini ? 90 : 200;
    
    // Escala para caber no canvas, reservando margem para cotas
    const margemTop = mini ? 10 : 28;   // espaço para cota horizontal
    const margemLeft = mini ? 10 : 30;  // espaço para cota vertical
    const margemRight = mini ? 10 : 12;
    const margemBottom = mini ? 10 : 12;
    
    const areaW = canvasWidth - margemLeft - margemRight;
    const areaH = canvasHeight - margemTop - margemBottom;
    
    const escalaX = areaW / largura;
    const escalaY = areaH / altura;
    const escala = Math.min(escalaX, escalaY, mini ? 0.5 : 0.55);
    
    const w = largura * escala;
    const h = altura * escala;
    const offsetX = margemLeft + (areaW - w) / 2;
    const offsetY = margemTop + (areaH - h) / 2;
    
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    
    // Fundo com gradiente
    const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    gradient.addColorStop(0, '#f8fafc');
    gradient.addColorStop(1, '#e2e8f0');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    if (!mini) {
      // Sombra da peça (apenas em modo normal)
      ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
      ctx.shadowBlur = 15;
      ctx.shadowOffsetX = 3;
      ctx.shadowOffsetY = 3;
    }
    
    // Peça com gradiente
    const pecaGradient = ctx.createLinearGradient(offsetX, offsetY, offsetX + w, offsetY + h);
    pecaGradient.addColorStop(0, '#ffffff');
    pecaGradient.addColorStop(1, '#f1f5f9');
    ctx.fillStyle = pecaGradient;
    ctx.fillRect(offsetX, offsetY, w, h);
    
    // Resetar sombra
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    // Borda da peça
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = mini ? 1 : 2;
    ctx.strokeRect(offsetX, offsetY, w, h);
    
    // Desenhar acabamentos
    const coresAcabamentos = {
      esquadria: '#ef4444',
      boleado: '#eab308',
      polimento: '#3b82f6',
      canal: '#f59e0b'
    };
    
    const offsetCanal = mini ? 3 : 10; // Canal fica mais interno
    
    if (peca.acabamentos) {
      Object.keys(peca.acabamentos).forEach(tipoAcab => {
        const acab = peca.acabamentos[tipoAcab];
        if (!acab.ativo) return;
        
        const cor = coresAcabamentos[tipoAcab];
        const isCanal = tipoAcab === 'canal';
        const offset = isCanal ? offsetCanal : 0;
        
        ctx.strokeStyle = cor;
        ctx.lineWidth = mini ? 2 : 4;
        ctx.setLineDash(mini ? [5, 2] : [10, 5]);
        
        // Superior
        if (acab.lados.superior) {
          ctx.beginPath();
          ctx.moveTo(offsetX + offset, offsetY + offset);
          ctx.lineTo(offsetX + w - offset, offsetY + offset);
          ctx.stroke();
        }
        
        // Inferior
        if (acab.lados.inferior) {
          ctx.beginPath();
          ctx.moveTo(offsetX + offset, offsetY + h - offset);
          ctx.lineTo(offsetX + w - offset, offsetY + h - offset);
          ctx.stroke();
        }
        
        // Esquerda
        if (acab.lados.esquerda) {
          ctx.beginPath();
          ctx.moveTo(offsetX + offset, offsetY + offset);
          ctx.lineTo(offsetX + offset, offsetY + h - offset);
          ctx.stroke();
        }
        
        // Direita
        if (acab.lados.direita) {
          ctx.beginPath();
          ctx.moveTo(offsetX + w - offset, offsetY + offset);
          ctx.lineTo(offsetX + w - offset, offsetY + h - offset);
          ctx.stroke();
        }
        
        ctx.setLineDash([]);
      });
    }
    
    if (!mini) {
      // Dimensões com estilo melhorado (apenas em modo normal)
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      
      // Dimensão horizontal
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(offsetX + w/2 - 35, offsetY - 22, 70, 16);
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1;
      ctx.strokeRect(offsetX + w/2 - 35, offsetY - 22, 70, 16);
      ctx.fillStyle = '#1e293b';
      ctx.fillText(`${largura} mm`, offsetX + w/2, offsetY - 11);
      
      // Dimensão vertical
      ctx.save();
      ctx.translate(offsetX - 22, offsetY + h/2);
      ctx.rotate(-Math.PI/2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-35, -9, 70, 18);
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1;
      ctx.strokeRect(-35, -9, 70, 18);
      ctx.fillStyle = '#1e293b';
      ctx.fillText(`${altura} mm`, 0, 3);
      ctx.restore();
      
      // Nome da peça CENTRALIZADO NA PEÇA (não no topo)
      if (peca.nome && !mini) {
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        const nomeExibir = peca.nome.length > 20 ? peca.nome.substring(0, 20) + '...' : peca.nome;
        
        // Fundo do nome
        const textWidth = ctx.measureText(nomeExibir).width;
        ctx.fillStyle = 'rgba(59, 130, 246, 0.92)';
        ctx.fillRect(offsetX + w/2 - textWidth/2 - 6, offsetY + h/2 - 9, textWidth + 12, 18);
        
        ctx.fillStyle = '#ffffff';
        ctx.fillText(nomeExibir, offsetX + w/2, offsetY + h/2 + 3);
      }
    }
  };
  
  return (
    <div className={`${mini ? 'border border-gray-300 rounded' : 'border-2 border-gray-300 rounded-lg shadow-md'} bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden`} style={mini ? {} : { maxWidth: '260px' }}>
      <canvas 
        ref={canvasRef} 
        className="w-full"
        style={mini ? {} : { maxWidth: '260px' }}
      />
      {!mostrarSempre && !mini && (
        <div className="p-3 border-t-2 border-gray-200 bg-white">
          <p className="text-xs text-gray-600 text-center font-medium">
            👁️ Pré-visualização da peça
          </p>
          <p className="text-xs text-gray-500 text-center mt-1">
            Use os botões abaixo para selecionar os lados de cada acabamento
          </p>
        </div>
      )}
      {!mini && peca.acabamentos && Object.values(peca.acabamentos).some(a => a.ativo) && (
        <div className="p-2 bg-white border-t border-gray-200">
          <p className="text-xs font-semibold text-gray-600 mb-1">Acabamentos:</p>
          <div className="flex flex-wrap gap-2">
            {Object.keys(peca.acabamentos).map(tipo => {
              const acab = peca.acabamentos[tipo];
              if (!acab.ativo) return null;
              const cores = { esquadria: '#ef4444', boleado: '#eab308', polimento: '#3b82f6', canal: '#f59e0b' };
              return (
                <div key={tipo} className="flex items-center gap-1">
                  <div className="w-3 h-0.5" style={{ backgroundColor: cores[tipo] }}></div>
                  <span className="text-xs text-gray-700">{tipo.charAt(0).toUpperCase() + tipo.slice(1)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
const ResumoOrcamento = ({ orcamentoAtual, materiais, precos }) => {
  const orcamento = calcularOrcamentoComDetalhes(orcamentoAtual, materiais, precos);
  
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
      <h3 className="text-2xl font-bold mb-6 text-slate-800">Resumo do Orçamento</h3>
      
      {/* Chapas de Material - CUSTO vs VENDA */}
      <div className="mb-6">
        <div className="flex justify-between items-center py-3 border-b-2 border-slate-300 mb-3">
          <span className="font-bold text-lg text-slate-800">Chapas de Material</span>
          <div className="flex gap-6">
            <div className="text-right">
              <div className="text-xs text-slate-500 uppercase">Custo</div>
              <span className="font-bold text-lg text-orange-600">{formatBRL(orcamento.custoChapas)}</span>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-500 uppercase">Venda</div>
              <span className="font-bold text-lg text-green-600">{formatBRL(orcamento.vendaChapas)}</span>
            </div>
          </div>
        </div>
        {Object.keys(orcamento.chapasPorMaterial || {}).map(materialId => {
          const material = materiais.find(m => m.id === parseInt(materialId));
          const qtd = orcamento.chapasPorMaterial[materialId];
          const custoParcial = material?.custo * qtd;
          const vendaParcial = (material?.venda || material?.custo) * qtd;
          return (
            <div key={materialId} className="flex justify-between text-sm text-slate-700 pl-4 py-2 hover:bg-slate-50 rounded">
              <span className="flex-1">
                <span className="font-medium">{material?.nome}</span>
                <span className="text-slate-500 ml-2">({qtd}x chapas de {material?.comprimento}x{material?.altura}mm)</span>
              </span>
              <div className="flex gap-6 ml-4">
                <span className="text-orange-600 w-24 text-right">{formatBRL(custoParcial)}</span>
                <span className="text-green-600 w-24 text-right">{formatBRL(vendaParcial)}</span>
              </div>
            </div>
          );
        })}
        {orcamento.margemChapas > 0 && (
          <div className="mt-2 pt-2 border-t border-slate-200 flex justify-between text-sm pl-4">
            <span className="font-semibold text-slate-600">Margem das Chapas:</span>
            <span className="font-semibold text-blue-600">{formatBRL(orcamento.margemChapas)} ({((orcamento.margemChapas / orcamento.vendaChapas) * 100).toFixed(1)}%)</span>
          </div>
        )}
      </div>
      
      {/* Acabamentos Detalhados */}
      {orcamento.detalhesAcabamentos.length > 0 && (
        <div className="mb-6">
          <div className="flex justify-between py-2 border-b-2 border-gray-300 mb-3">
            <span className="font-bold text-lg">Acabamentos</span>
            <span className="font-bold text-lg">{formatBRL(orcamento.acabamentos)}</span>
          </div>
          {orcamento.detalhesAcabamentos.map((item, idx) => (
            <div key={idx} className="flex justify-between text-sm text-gray-700 pl-4 py-1 border-b border-gray-100">
              <div>
                <span className="font-medium">{item.tipo}</span>
                <span className="text-gray-500 ml-2">({item.medida})</span>
                <div className="text-xs text-gray-500">{item.peca}</div>
              </div>
              <span>{formatBRL(item.valor)}</span>
            </div>
          ))}
        </div>
      )}
      
      {/* Recortes Detalhados */}
      {orcamento.detalhesRecortes.length > 0 && (
        <div className="mb-6">
          <div className="flex justify-between py-2 border-b-2 border-gray-300 mb-3">
            <span className="font-bold text-lg">Recortes</span>
            <span className="font-bold text-lg">{formatBRL(orcamento.recortes)}</span>
          </div>
          {orcamento.detalhesRecortes.map((item, idx) => (
            <div key={idx} className="flex justify-between text-sm text-gray-700 pl-4 py-1 border-b border-gray-100">
              <div>
                <span className="font-medium">{item.tipo}</span>
                <span className="text-gray-500 ml-2">({item.quantidade}x - {formatBRL(item.valorUnit)} cada)</span>
                <div className="text-xs text-gray-500">{item.peca}</div>
              </div>
              <span>{formatBRL(item.valor)}</span>
            </div>
          ))}
        </div>
      )}
      
      {/* Total Geral - CUSTO vs VENDA */}
      <div className="mt-6 space-y-3">
        <div className="flex justify-between py-3 border-t-2 border-slate-400 bg-gradient-to-r from-slate-50 to-slate-100 px-4 rounded-lg">
          <span className="text-lg font-bold text-slate-700">CUSTO TOTAL</span>
          <span className="text-lg font-bold text-orange-600">{formatBRL(orcamento.custoTotal)}</span>
        </div>
        <div className="flex justify-between py-3 bg-gradient-to-r from-green-50 to-emerald-50 px-4 rounded-lg border-2 border-green-200">
          <span className="text-xl font-bold text-slate-800">VALOR DE VENDA</span>
          <span className="text-xl font-bold text-green-600">{formatBRL(orcamento.vendaTotal)}</span>
        </div>
        {orcamento.margemTotal > 0 && (
          <div className="flex justify-between py-3 bg-gradient-to-r from-blue-50 to-indigo-50 px-4 rounded-lg border-2 border-blue-200">
            <span className="text-lg font-bold text-slate-800">MARGEM DE LUCRO</span>
            <span className="text-lg font-bold text-blue-600">
              {formatBRL(orcamento.margemTotal)}
              <span className="text-sm ml-2">({((orcamento.margemTotal / orcamento.vendaTotal) * 100).toFixed(1)}%)</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

// Função auxiliar para calcular orçamento com detalhes
const calcularOrcamentoComDetalhes = (orcamentoAtual, materiais, precos) => {
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

// Componente de Plano de Corte da Chapa
const PlanoCorteChapa = ({ chapa, numero, onMoverPeca, onMoverPecaNaChapa, onGirarPeca, pecaArrastando, setPecaArrastando, todasChapas }) => {
  const [escala, setEscala] = useState(0.15);
  const canvasRef = useRef(null);
  const [arrastandoPeca, setArrastandoPeca] = useState(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [pecaSelecionada, setPecaSelecionada] = useState(null);
  const [chapaDestinoSelecionada, setChapaDestinoSelecionada] = useState(null);

  useEffect(() => {
    desenharChapa();
  }, [chapa, escala, arrastandoPeca, pecaSelecionada]);

  const desenharChapa = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const largura = chapa.material.comprimento * escala;
    const altura = chapa.material.altura * escala;

    canvas.width = largura + 100;
    canvas.height = altura + 100;

    // Fundo da chapa
    ctx.fillStyle = '#f9fafb';
    ctx.fillRect(50, 50, largura, altura);
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;
    ctx.strokeRect(50, 50, largura, altura);

    // Desenhar grid
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= chapa.material.comprimento; i += 500) {
      const x = 50 + i * escala;
      ctx.beginPath();
      ctx.moveTo(x, 50);
      ctx.lineTo(x, 50 + altura);
      ctx.stroke();
    }
    for (let i = 0; i <= chapa.material.altura; i += 500) {
      const y = 50 + i * escala;
      ctx.beginPath();
      ctx.moveTo(50, y);
      ctx.lineTo(50 + largura, y);
      ctx.stroke();
    }

    // Desenhar peças
    const cores = ['#3b82f6','#10b981','#8b5cf6','#f59e0b','#ef4444','#06b6d4','#ec4899','#14b8a6'];
    
    chapa.pecas.forEach((peca, idx) => {
      if (arrastandoPeca?.id === peca.id) return;

      const x = 50 + peca.posX * escala;
      const y = 50 + peca.posY * escala;
      
      // Considerar rotação para dimensões
      const w = (peca.rotacao === 90 ? peca.altura : peca.comprimento) * escala;
      const h = (peca.rotacao === 90 ? peca.comprimento : peca.altura) * escala;

      const ehSelecionada = pecaSelecionada === peca.id;
      const cor = ehSelecionada ? '#10b981' : cores[idx % cores.length];
      const r = parseInt(cor.slice(1, 3), 16);
      const g = parseInt(cor.slice(3, 5), 16);
      const b = parseInt(cor.slice(5, 7), 16);

      // Preencher a peça com cor clara
      ctx.fillStyle = `rgb(${r + (255-r)*0.7}, ${g + (255-g)*0.7}, ${b + (255-b)*0.7})`;
      ctx.fillRect(x, y, w, h);

      // Borda desenhada PARA DENTRO (inset de 1px) — nunca sobrepõe vizinhas
      const bw = ehSelecionada ? 2 : 1.5;
      ctx.strokeStyle = cor;
      ctx.lineWidth = bw;
      ctx.strokeRect(x + bw/2, y + bw/2, w - bw, h - bw);

      // Desenhar acabamentos na peça
      if (peca.acabamentos) {
        const coresAcabamentos = {
          esquadria: '#ef4444',
          boleado: '#eab308',
          polimento: '#3b82f6',
          canal: '#f59e0b'
        };
        
        const offsetCanal = 3 * escala; // Canal fica mais interno
        
        Object.keys(peca.acabamentos).forEach(tipoAcab => {
          const acab = peca.acabamentos[tipoAcab];
          if (!acab || !acab.ativo || !acab.lados) return;
          
          const cor = coresAcabamentos[tipoAcab];
          const isCanal = tipoAcab === 'canal';
          const offset = isCanal ? offsetCanal : 0;
          
          ctx.strokeStyle = cor;
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 2]);
          
          // Superior
          if (acab.lados.superior) {
            ctx.beginPath();
            ctx.moveTo(x + offset, y + offset);
            ctx.lineTo(x + w - offset, y + offset);
            ctx.stroke();
          }
          
          // Inferior
          if (acab.lados.inferior) {
            ctx.beginPath();
            ctx.moveTo(x + offset, y + h - offset);
            ctx.lineTo(x + w - offset, y + h - offset);
            ctx.stroke();
          }
          
          // Esquerda
          if (acab.lados.esquerda) {
            ctx.beginPath();
            ctx.moveTo(x + offset, y + offset);
            ctx.lineTo(x + offset, y + h - offset);
            ctx.stroke();
          }
          
          // Direita
          if (acab.lados.direita) {
            ctx.beginPath();
            ctx.moveTo(x + w - offset, y + offset);
            ctx.lineTo(x + w - offset, y + h - offset);
            ctx.stroke();
          }
          
          ctx.setLineDash([]);
        });
      }

      // Texto com nome e dimensões (considerando rotação)
      ctx.fillStyle = `rgb(${Math.max(0,r-40)}, ${Math.max(0,g-40)}, ${Math.max(0,b-40)})`;
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      
      // Nome da peça (truncado se muito longo)
      const nomePeca = peca.nome || `Peça #${idx + 1}`;
      const nomeMaxLen = 15;
      const nomeExibir = nomePeca.length > nomeMaxLen ? nomePeca.substring(0, nomeMaxLen) + '...' : nomePeca;
      ctx.fillText(nomeExibir, x + w/2, y + h/2 - 8);
      
      // Dimensões
      ctx.font = '9px Arial';
      const dimensoes = peca.rotacao === 90 
        ? `${peca.altura}x${peca.comprimento}` 
        : `${peca.comprimento}x${peca.altura}`;
      ctx.fillText(dimensoes, x + w/2, y + h/2 + 3);
      
      // Indicador de rotação
      if (peca.rotacao === 90) {
        ctx.font = 'bold 8px Arial';
        ctx.fillText('↻ 90°', x + w/2, y + h/2 + 13);
      }
    });

    // Desenhar peça sendo arrastada
    if (arrastandoPeca) {
      const w = (arrastandoPeca.rotacao === 90 ? arrastandoPeca.altura : arrastandoPeca.comprimento) * escala;
      const h = (arrastandoPeca.rotacao === 90 ? arrastandoPeca.comprimento : arrastandoPeca.altura) * escala;
      
      // Cor muda para vermelho se houver colisão
      const cor = arrastandoPeca.colisao ? 'rgba(239, 68, 68, 0.7)' : 'rgba(59, 130, 246, 0.6)';
      const corBorda = arrastandoPeca.colisao ? '#dc2626' : '#1e40af';
      
      ctx.fillStyle = cor;
      ctx.fillRect(arrastandoPeca.x, arrastandoPeca.y, w, h);
      ctx.strokeStyle = corBorda;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(arrastandoPeca.x, arrastandoPeca.y, w, h);
      ctx.setLineDash([]);
      
      // Texto de aviso
      if (arrastandoPeca.colisao) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('COLISÃO!', arrastandoPeca.x + w/2, arrastandoPeca.y + h/2);
      }
    }

    // Dimensões
    ctx.fillStyle = '#374151';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${chapa.material.comprimento} mm`, 50 + largura/2, 35);
    ctx.save();
    ctx.translate(35, 50 + altura/2);
    ctx.rotate(-Math.PI/2);
    ctx.fillText(`${chapa.material.altura} mm`, 0, 0);
    ctx.restore();
  };

  const handleMouseDown = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Verificar se clicou em alguma peça
    const pecaClicada = chapa.pecas.find(peca => {
      const px = 50 + peca.posX * escala;
      const py = 50 + peca.posY * escala;
      const pw = (peca.rotacao === 90 ? peca.altura : peca.comprimento) * escala;
      const ph = (peca.rotacao === 90 ? peca.comprimento : peca.altura) * escala;
      return x >= px && x <= px + pw && y >= py && y <= py + ph;
    });

    if (pecaClicada) {
      setPecaSelecionada(pecaClicada.id);
      const px = 50 + pecaClicada.posX * escala;
      const py = 50 + pecaClicada.posY * escala;
      setOffset({ x: x - px, y: y - py });
      setArrastandoPeca({ ...pecaClicada, x: px, y: py });
    } else {
      setPecaSelecionada(null);
    }
  };

  const handleMouseMove = (e) => {
    if (!arrastandoPeca) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - offset.x;
    const y = e.clientY - rect.top - offset.y;
    
    // Converter para coordenadas da chapa - SEM arredondamento para movimento suave
    let novaX = Math.max(0, (x - 50) / escala);
    let novaY = Math.max(0, (y - 50) / escala);
    const espacamento = 4;
    
    // MAGNETISMO - Detectar proximidade com outras peças e bordas
    const toleranciaMagnetismo = 20; // pixels de tolerância para ativar o magnetismo
    const larguraPeca = arrastandoPeca.rotacao === 90 ? arrastandoPeca.altura : arrastandoPeca.comprimento;
    const alturaPeca = arrastandoPeca.rotacao === 90 ? arrastandoPeca.comprimento : arrastandoPeca.altura;
    
    // MAGNETISMO NAS BORDAS DA CHAPA
    // Borda esquerda
    if (Math.abs(novaX - espacamento) < toleranciaMagnetismo) {
      novaX = espacamento;
    }
    
    // Borda superior
    if (Math.abs(novaY - espacamento) < toleranciaMagnetismo) {
      novaY = espacamento;
    }
    
    // Borda direita
    const distBordaDireita = Math.abs((novaX + larguraPeca + espacamento) - chapa.material.comprimento);
    if (distBordaDireita < toleranciaMagnetismo) {
      novaX = chapa.material.comprimento - larguraPeca - espacamento;
    }
    
    // Borda inferior
    const distBordaInferior = Math.abs((novaY + alturaPeca + espacamento) - chapa.material.altura);
    if (distBordaInferior < toleranciaMagnetismo) {
      novaY = chapa.material.altura - alturaPeca - espacamento;
    }
    
    // MAGNETISMO ENTRE PEÇAS
    chapa.pecas.forEach(p => {
      if (p.id === arrastandoPeca.id) return;
      
      const larguraOutra = p.rotacao === 90 ? p.altura : p.comprimento;
      const alturaOutra = p.rotacao === 90 ? p.comprimento : p.altura;
      
      // Magnetismo horizontal (alinhamento à direita da peça existente)
      const distDireita = Math.abs(novaX - (p.posX + larguraOutra + espacamento));
      if (distDireita < toleranciaMagnetismo && 
          !(novaY + alturaPeca < p.posY || novaY > p.posY + alturaOutra)) {
        novaX = p.posX + larguraOutra + espacamento;
      }
      
      // Magnetismo horizontal (alinhamento à esquerda da peça existente)
      const distEsquerda = Math.abs((novaX + larguraPeca + espacamento) - p.posX);
      if (distEsquerda < toleranciaMagnetismo && 
          !(novaY + alturaPeca < p.posY || novaY > p.posY + alturaOutra)) {
        novaX = p.posX - larguraPeca - espacamento;
      }
      
      // Magnetismo vertical (alinhamento abaixo da peça existente)
      const distBaixo = Math.abs(novaY - (p.posY + alturaOutra + espacamento));
      if (distBaixo < toleranciaMagnetismo && 
          !(novaX + larguraPeca < p.posX || novaX > p.posX + larguraOutra)) {
        novaY = p.posY + alturaOutra + espacamento;
      }
      
      // Magnetismo vertical (alinhamento acima da peça existente)
      const distCima = Math.abs((novaY + alturaPeca + espacamento) - p.posY);
      if (distCima < toleranciaMagnetismo && 
          !(novaX + larguraPeca < p.posX || novaX > p.posX + larguraOutra)) {
        novaY = p.posY - alturaPeca - espacamento;
      }
      
      // Alinhamento de bordas (mesmo Y)
      if (Math.abs(novaY - p.posY) < toleranciaMagnetismo) {
        novaY = p.posY;
      }
      
      // Alinhamento de bordas (mesmo X)
      if (Math.abs(novaX - p.posX) < toleranciaMagnetismo) {
        novaX = p.posX;
      }
      
      // Alinhamento de bordas inferiores
      const distBordaInferiorPecas = Math.abs((novaY + alturaPeca) - (p.posY + alturaOutra));
      if (distBordaInferiorPecas < toleranciaMagnetismo && 
          !(novaX + larguraPeca < p.posX || novaX > p.posX + larguraOutra)) {
        novaY = (p.posY + alturaOutra) - alturaPeca;
      }
      
      // Alinhamento de bordas direitas
      const distBordaDireitaPecas = Math.abs((novaX + larguraPeca) - (p.posX + larguraOutra));
      if (distBordaDireitaPecas < toleranciaMagnetismo && 
          !(novaY + alturaPeca < p.posY || novaY > p.posY + alturaOutra)) {
        novaX = (p.posX + larguraOutra) - larguraPeca;
      }
    });
    
    // Verificar se a nova posição causaria colisão
    const temColisao = chapa.pecas.some(p => {
      if (p.id === arrastandoPeca.id) return false;
      
      const larguraOutra = p.rotacao === 90 ? p.altura : p.comprimento;
      const alturaOutra = p.rotacao === 90 ? p.comprimento : p.altura;
      
      const centroNovaX = novaX + larguraPeca / 2;
      const centroNovaY = novaY + alturaPeca / 2;
      const centroPecaX = p.posX + larguraOutra / 2;
      const centroPecaY = p.posY + alturaOutra / 2;
      
      const distanciaX = Math.abs(centroNovaX - centroPecaX);
      const distanciaY = Math.abs(centroNovaY - centroPecaY);
      
      const distanciaMinX = (larguraPeca + larguraOutra) / 2 + espacamento;
      const distanciaMinY = (alturaPeca + alturaOutra) / 2 + espacamento;
      
      return distanciaX < distanciaMinX && distanciaY < distanciaMinY;
    });
    
    const foraDosLimites = 
      novaX + larguraPeca + espacamento > chapa.material.comprimento ||
      novaY + alturaPeca + espacamento > chapa.material.altura ||
      novaX < espacamento ||
      novaY < espacamento;
    
    setArrastandoPeca({ 
      ...arrastandoPeca, 
      x: 50 + novaX * escala, 
      y: 50 + novaY * escala,
      posXReal: novaX,
      posYReal: novaY,
      colisao: temColisao || foraDosLimites
    });
  };

  const handleMouseUp = (e) => {
    if (!arrastandoPeca) return;

    // Usar as coordenadas já calculadas pelo magnetismo
    const novaX = arrastandoPeca.posXReal !== undefined ? arrastandoPeca.posXReal : Math.max(0, Math.round((arrastandoPeca.x - 50) / escala));
    const novaY = arrastandoPeca.posYReal !== undefined ? arrastandoPeca.posYReal : Math.max(0, Math.round((arrastandoPeca.y - 50) / escala));

    const espacamento = 4;
    const larguraPeca = arrastandoPeca.rotacao === 90 ? arrastandoPeca.altura : arrastandoPeca.comprimento;
    const alturaPeca = arrastandoPeca.rotacao === 90 ? arrastandoPeca.comprimento : arrastandoPeca.altura;

    // Verificar se está dentro dos limites da chapa
    const dentroDosLimites = 
      novaX + larguraPeca + espacamento <= chapa.material.comprimento &&
      novaY + alturaPeca + espacamento <= chapa.material.altura &&
      novaX >= espacamento &&
      novaY >= espacamento;

    if (!dentroDosLimites) {
      alert('A peça não cabe nesta posição! Verifique os limites da chapa.');
      setArrastandoPeca(null);
      return;
    }

    // Verificar colisão com outras peças (respeitando 4mm de espaçamento)
    const temColisao = chapa.pecas.some(p => {
      if (p.id === arrastandoPeca.id) return false;
      
      const larguraOutra = p.rotacao === 90 ? p.altura : p.comprimento;
      const alturaOutra = p.rotacao === 90 ? p.comprimento : p.altura;
      
      // Calcular distâncias entre centros
      const centroNovaX = novaX + larguraPeca / 2;
      const centroNovaY = novaY + alturaPeca / 2;
      const centroPecaX = p.posX + larguraOutra / 2;
      const centroPecaY = p.posY + alturaOutra / 2;
      
      const distanciaX = Math.abs(centroNovaX - centroPecaX);
      const distanciaY = Math.abs(centroNovaY - centroPecaY);
      
      // Distância mínima necessária (metade de cada peça + espaçamento de 4mm)
      const distanciaMinX = (larguraPeca + larguraOutra) / 2 + espacamento;
      const distanciaMinY = (alturaPeca + alturaOutra) / 2 + espacamento;
      
      // Há colisão se ambas as distâncias forem menores que o mínimo
      return distanciaX < distanciaMinX && distanciaY < distanciaMinY;
    });

    if (temColisao) {
      alert('Não é possível posicionar a peça aqui! Ela precisa estar a pelo menos 4mm de distância das outras peças.');
      setArrastandoPeca(null);
      return;
    }

    // Posição válida - mover a peça
    onMoverPecaNaChapa(arrastandoPeca.id, chapa.id, novaX, novaY);
    setArrastandoPeca(null);
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-lg">Chapa #{numero}</h3>
          <p className="text-sm text-gray-600">{chapa.material.nome} - {chapa.pecas.length} peças</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm">Zoom:</label>
          <input
            type="range"
            min="0.05"
            max="0.3"
            step="0.01"
            value={escala}
            onChange={(e) => setEscala(parseFloat(e.target.value))}
            className="w-32"
          />
        </div>
      </div>
      <div className="overflow-auto bg-white border border-gray-300 rounded">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="cursor-move"
        />
      </div>
      <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
        <div>
          <p className="text-xs text-gray-600">
            🖱️ Arraste peças livremente. Magnetismo ativo (20mm): alinha com outras peças e bordas.
          </p>
          <p className="text-xs text-gray-500 mt-1">
            💡 Dica: O magnetismo facilita o alinhamento, mas você pode posicionar livremente em qualquer lugar!
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {pecaSelecionada && (
            <>
              <button
                onClick={() => {
                  onGirarPeca(pecaSelecionada, chapa.id);
                }}
                className="flex items-center gap-1 bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700"
              >
                <span className="rotate-90 inline-block">↻</span>
                Girar Peça (90°)
              </button>
              
              {/* Botão para mover para outra chapa */}
              {todasChapas && todasChapas.length > 1 && todasChapas.filter(c => c.materialId === chapa.materialId && c.id !== chapa.id).length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setChapaDestinoSelecionada(chapaDestinoSelecionada ? null : 'abrir')}
                    className="flex items-center gap-1 bg-orange-600 text-white px-3 py-1 rounded text-sm hover:bg-orange-700"
                  >
                    <Move size={14} />
                    Mover para Outra Chapa
                  </button>
                  
                  {chapaDestinoSelecionada === 'abrir' && (
                    <div className="absolute bottom-full mb-2 right-0 bg-white border border-gray-300 rounded shadow-lg p-2 z-10 min-w-[200px]">
                      <p className="text-xs font-semibold mb-2 text-gray-700">Selecione a chapa de destino:</p>
                      <p className="text-xs text-blue-600 mb-2">✨ O sistema encontrará automaticamente a melhor posição disponível</p>
                      {todasChapas
                        .filter(c => c.materialId === chapa.materialId && c.id !== chapa.id)
                        .map((chapaDestino, idx) => (
                          <button
                            key={chapaDestino.id}
                            onClick={() => {
                              const pecaAtual = chapa.pecas.find(p => p.id === pecaSelecionada);
                              if (pecaAtual) {
                                // Sistema encontra automaticamente a melhor posição
                                onMoverPeca(pecaSelecionada, chapaDestino.id);
                                setPecaSelecionada(null);
                                setChapaDestinoSelecionada(null);
                              }
                            }}
                            className="w-full text-left px-2 py-1 text-sm hover:bg-blue-50 rounded"
                          >
                            Chapa #{todasChapas.findIndex(c => c.id === chapaDestino.id) + 1} - {chapaDestino.material.nome}
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};



// ============================================
// ⚡ MUDE A SENHA AQUI ⚡
// ============================================
const SENHA_DO_SISTEMA = 'pietra2025';
// ============================================

const TelaLogin = ({ aoEntrar }) => {
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState(false);
  const [tentativas, setTentativas] = useState(0);
  const [bloqueado, setBloqueado] = useState(false);
  const [segundosRestantes, setSegundosRestantes] = useState(0);

  useEffect(() => {
    let timer;
    if (bloqueado && segundosRestantes > 0) {
      timer = setTimeout(() => setSegundosRestantes(s => s - 1), 1000);
    }
    if (segundosRestantes === 0 && bloqueado) {
      setBloqueado(false);
      setTentativas(0);
    }
    return () => clearTimeout(timer);
  }, [bloqueado, segundosRestantes]);

  const tentar = () => {
    if (bloqueado || !senha) return;
    if (senha === SENHA_DO_SISTEMA) {
      localStorage.setItem('pietra_logado', 'sim');
      aoEntrar();
    } else {
      const novas = tentativas + 1;
      setTentativas(novas);
      setErro(true);
      setSenha('');
      setTimeout(() => setErro(false), 2500);
      if (novas >= 5) {
        setBloqueado(true);
        setSegundosRestantes(30);
      }
    }
  };

  return React.createElement('div', {
    style: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 50%, #1e1b4b 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      fontFamily: 'system-ui, sans-serif'
    }
  },
    React.createElement('div', { style: { width: '100%', maxWidth: '380px' } },

      // Ícone
      React.createElement('div', { style: { display: 'flex', justifyContent: 'center', marginBottom: '24px' } },
        React.createElement('div', {
          style: {
            width: '80px', height: '80px',
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
            borderRadius: '20px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 10px 40px rgba(59,130,246,0.3)',
            fontSize: '38px'
          }
        }, '⊞')
      ),

      // Título
      React.createElement('h1', {
        style: { color: '#fff', fontSize: '28px', fontWeight: 'bold', textAlign: 'center', margin: '0 0 4px 0' }
      }, 'Pietra Ambientes'),
      React.createElement('p', {
        style: { color: '#94a3b8', textAlign: 'center', margin: '0 0 32px 0', fontSize: '14px' }
      }, 'Sistema de Orçamentos'),

      // Card
      React.createElement('div', {
        style: {
          background: '#1e293b',
          borderRadius: '20px',
          border: '1px solid #334155',
          padding: '32px',
          boxShadow: '0 25px 50px rgba(0,0,0,0.4)'
        }
      },
        React.createElement('label', {
          style: { display: 'block', color: '#cbd5e1', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }
        }, 'Senha de Acesso'),

        React.createElement('input', {
          type: 'password',
          value: senha,
          onChange: (e) => setSenha(e.target.value),
          onKeyDown: (e) => { if (e.key === 'Enter') tentar(); },
          placeholder: bloqueado ? `Bloqueado... ${segundosRestantes}s` : '••••••••',
          disabled: bloqueado,
          autoFocus: true,
          style: {
            width: '100%',
            padding: '12px 16px',
            borderRadius: '12px',
            border: erro ? '2px solid #ef4444' : '1px solid #475569',
            background: bloqueado ? '#1e293b' : '#334155',
            color: '#fff',
            fontSize: '16px',
            outline: 'none',
            boxSizing: 'border-box',
            cursor: bloqueado ? 'not-allowed' : 'text',
            transition: 'border 0.2s'
          }
        }),

        // Erro
        erro && React.createElement('p', {
          style: { color: '#f87171', fontSize: '13px', marginTop: '8px', margin: '8px 0 0 0' }
        }, `⚠️ Senha incorreta. Tentativas restantes: ${5 - tentativas}`),

        // Bloqueado
        bloqueado && React.createElement('p', {
          style: { color: '#fbbf24', fontSize: '13px', marginTop: '8px', margin: '8px 0 0 0' }
        }, `🔒 Bloqueado por tentativas. Aguarde ${segundosRestantes}s`),

        // Botão
        React.createElement('button', {
          onClick: tentar,
          disabled: bloqueado || !senha,
          style: {
            width: '100%',
            marginTop: '24px',
            padding: '13px',
            borderRadius: '12px',
            border: 'none',
            background: (bloqueado || !senha) ? '#475569' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
            color: '#fff',
            fontSize: '15px',
            fontWeight: '700',
            cursor: (bloqueado || !senha) ? 'not-allowed' : 'pointer',
            boxShadow: (bloqueado || !senha) ? 'none' : '0 4px 15px rgba(59,130,246,0.4)',
            transition: 'all 0.2s'
          }
        }, bloqueado ? '🔒 Bloqueado' : 'Entrar')
      ),

      // Rodapé
      React.createElement('p', {
        style: { color: '#475569', textAlign: 'center', fontSize: '12px', marginTop: '20px' }
      }, 'Acesso restrito · Fale com o administrador para obter a senha')
    )
  );
};

// ============================================
// App Raiz — controla login/logout
// ============================================
const App = () => {
  const [logado, setLogado] = useState(() => {
    return localStorage.getItem('pietra_logado') === 'sim';
  });

  if (!logado) {
    return React.createElement(TelaLogin, { aoEntrar: () => setLogado(true) });
  }

  return React.createElement('div', { style: { position: 'relative' } },
    // Botão Sair (canto superior direito)
    React.createElement('button', {
      onClick: () => { localStorage.removeItem('pietra_logado'); setLogado(false); },
      style: {
        position: 'fixed',
        top: '12px',
        right: '12px',
        zIndex: 9999,
        background: '#ef4444',
        color: '#fff',
        border: 'none',
        borderRadius: '8px',
        padding: '6px 12px',
        fontSize: '12px',
        fontWeight: '600',
        cursor: 'pointer',
        opacity: 0.85,
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
      },
      onMouseEnter: (e) => e.target.style.opacity = '1',
      onMouseLeave: (e) => e.target.style.opacity = '0.85'
    }, '🔐 Sair'),

    React.createElement(SistemaOrcamentoMarmore)
  );
};

// Renderizar no DOM
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));
