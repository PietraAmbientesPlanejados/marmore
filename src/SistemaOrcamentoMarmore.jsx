import { useState, useEffect } from 'react';
import { formatBRL } from './utils/formatters';
import { organizarPecasEmChapas, calcularOrcamentoComDetalhes, calcularPerdaPorAmbiente } from './utils/calculations';
import { PRECOS_PADRAO, CONFIG_CHAPA_PADRAO } from './constants/config';
import { saveOrcamento } from './utils/database';
import { usePrecos } from './hooks/usePrecos';
import { useMaterials } from './hooks/useMaterials';
import { useBudgets } from './hooks/useBudgets';
import { useAutoSave } from './hooks/useAutoSave';
import { HomePage } from './pages/HomePage';
import { gerarRelatorioPDF as gerarRelatorioPDFUtil } from './utils/pdf/relatorio';
import { gerarEtiquetasPDF as gerarEtiquetasPDFUtil } from './utils/pdf/etiquetas';
import { otimizarOrcamento } from './utils/cuttingOptimization';
import { X, Grid, FileText, Save } from './constants/icons';
import { PlanoCorteChapa } from './components/cutting/PlanoCorteChapa';
import { BandejaPecasAvulsas } from './components/cutting/BandejaPecasAvulsas';
import { ResumoOrcamento } from './components/budget/ResumoOrcamento';
import { AmbienteCard } from './components/budget/AmbienteCard';
import { Header } from './components/layout/Header';
import { SaveStatusIndicator } from './components/layout/SaveStatusIndicator';


const SistemaOrcamentoMarmore = () => {
  // Hooks customizados
  const { precos, precosSalvos, mostrarPainelPrecos, atualizarPreco, salvarPrecos, setMostrarPainelPrecos } = usePrecos();
  const { materiais, materialEditando, novoMaterial, setMateriais, setMaterialEditando, setNovoMaterial, adicionarMaterial, excluirMaterial, atualizarMaterialSimples } = useMaterials();
  const { orcamentos, orcamentoAtual, mostrarModalNovoOrcamento, nomeNovoOrcamento, setOrcamentos, setOrcamentoAtual, setNomeNovoOrcamento, abrirModalNovoOrcamento, fecharModalNovoOrcamento, criarOrcamento, adicionarAmbiente, removerAmbiente, renomearAmbiente, renomearOrcamento, excluirOrcamento, salvarOrcamentoAtual, atualizarPrecosOrcamento, atualizarConfigMaterial } = useBudgets();

  const [tela, setTela] = useState('lista'); // lista, novo-material, orcamento, plano-corte, editar-material
  const [mostrandoDetalhePeca, setMostrandoDetalhePeca] = useState(null);
  const [modoEdicaoPeca, setModoEdicaoPeca] = useState(false);
  const [pecaEditada, setPecaEditada] = useState(null);
  const [pecaParaExcluir, setPecaParaExcluir] = useState(null);
  const [mostrarPainelPrecosOrcamento, setMostrarPainelPrecosOrcamento] = useState(false);
  const [mostrarPainelMateriaisOrcamento, setMostrarPainelMateriaisOrcamento] = useState(false);
  const [precosTemp, setPrecosTemp] = useState({});
  const [materiaisTemp, setMateriaisTemp] = useState({});
  const [precosSalvosOrcamento, setPrecosSalvosOrcamento] = useState(false);
  const [materiaisSalvosOrcamento, setMateriaisSalvosOrcamento] = useState(false);
  const [orcamentoVersion, setOrcamentoVersion] = useState(0);
  const [menuMobileAberto, setMenuMobileAberto] = useState(false);
  const [mostrarModalOtimizacao, setMostrarModalOtimizacao] = useState(false);
  const [mostrarModalNovaChapa, setMostrarModalNovaChapa] = useState(false);
  const [materialNovaChapa, setMaterialNovaChapa] = useState('');
  // Preview flutuante da peça durante drag entre chapas
  const [dragPreview, setDragPreview] = useState(null);
  const OPCOES_OTIMIZACAO_PADRAO = {
    tipoOtimizacao: 'aproveitamento',
    ordenacaoSequencial: 'maiores-menores',
    margemLaterais: 25,
    espessuraDisco: 4,
  };

  const [opcoesOtimizacao, setOpcoesOtimizacao] = useState(OPCOES_OTIMIZACAO_PADRAO);

  // Atualiza as opções localmente E salva dentro do orçamento atual
  const atualizarOpcoesOtimizacao = (novasOpcoes) => {
    setOpcoesOtimizacao(novasOpcoes);
    if (orcamentoAtual) {
      const orcAtualizado = { ...orcamentoAtual, opcoesOtimizacao: novasOpcoes };
      setOrcamentoAtual(orcAtualizado);
      setOrcamentos(prev => prev.map(o => o.id === orcamentoAtual.id ? orcAtualizado : o));
    }
  };

  // Auto-save com debounce + retry + indicador visual de status
  const { status: saveStatus, ultimaGravacao, salvar: salvarAgora } = useAutoSave(orcamentoAtual);

  // Função para atualizar material e reorganizar orçamentos
  const atualizarMaterial = (materialId, novosDados) => {
    // 1. Atualizar o material
    atualizarMaterialSimples(materialId, novosDados);

    // 2. Recalcular e reorganizar todos os orçamentos que usam esse material
    const orcamentosAtualizados = orcamentos.map(orc => {
      // Verificar se algum ambiente usa esse material
      const usaMaterial = orc.ambientes.some(amb =>
        amb.pecas.some(peca => peca.material?.id === materialId)
      );

      if (!usaMaterial) {
        return orc; // Não usa esse material, mantém inalterado
      }

      // Atualizar referência do material nas peças
      const ambientesAtualizados = orc.ambientes.map(amb => ({
        ...amb,
        pecas: amb.pecas.map(peca =>
          peca.material?.id === materialId
            ? { ...peca, material: { ...peca.material, ...novosDados } }
            : peca
        )
      }));

      // Reorganizar peças nas chapas com o novo tamanho de material
      const todasAsPecas = ambientesAtualizados.flatMap(amb => amb.pecas);
      const pecasComMaterial = todasAsPecas.filter(p => p.material?.id === materialId);

      if (pecasComMaterial.length > 0) {
        // Buscar o material atualizado
        const materialAtualizado = { id: materialId, ...novosDados };
        // Reorganizar chapas
        const chapasReorganizadas = organizarPecasEmChapas(todasAsPecas, materiais);

        return {
          ...orc,
          ambientes: ambientesAtualizados,
          chapas: chapasReorganizadas
        };
      }

      return { ...orc, ambientes: ambientesAtualizados };
    });

    setOrcamentos(orcamentosAtualizados);

    // Se o orçamento atual foi afetado, atualizá-lo também
    if (orcamentoAtual) {
      const orcAtualAtualizado = orcamentosAtualizados.find(o => o.id === orcamentoAtual.id);
      if (orcAtualAtualizado) {
        setOrcamentoAtual(orcAtualAtualizado);
      }
    }
  };

  // Função auxiliar para obter configuração de um material (do orçamento ou padrão)
  const getMaterialConfig = (materialId, orcamento = orcamentoAtual) => {
    if (!orcamento || !materialId) return CONFIG_CHAPA_PADRAO;

    const config = orcamento.materiais?.[materialId];
    if (config && config.comprimento && config.altura) {
      return config;
    }

    // Retornar config padrão se não existir
    return { ...CONFIG_CHAPA_PADRAO };
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
    const margin = 8;
    const headerH = 22;

    orcamentoAtual.chapas.forEach((chapa, idx) => {
      if (idx > 0) pdf.addPage();

      // ---------- HEADER ----------
      const headerY = 8;
      const headerHeight = 20;

      // Retângulo do cabeçalho
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.8);
      pdf.rect(margin, headerY, pageW - 2 * margin, headerHeight, 'S');

      // Linha horizontal divisória no meio
      pdf.line(margin, headerY + headerHeight / 2, pageW - margin, headerY + headerHeight / 2);

      // Título principal (parte superior)
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text('PLANO DE CORTE - PIETRA AMBIENTES PLANEJADOS', margin + 2, headerY + 7);

      // Nome do projeto (parte inferior esquerda)
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('PROJETO: ' + (orcamentoAtual.nome || 'NOME DO ORÇAMENTO').toUpperCase(), margin + 2, headerY + 17);

      // Chapa info (canto superior direito)
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(18);
      pdf.text('CHAPA ' + (idx + 1) + ' / ' + orcamentoAtual.chapas.length, pageW - margin - 2, headerY + 7, { align: 'right' });

      // Material (parte inferior direita)
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text((chapa.material?.nome || 'Material').toUpperCase(), pageW - margin - 2, headerY + 17, { align: 'right' });

      // ---------- ÁREA DE DESENHO (com espaço para legenda à esquerda) ----------
      const legendaW = 55; // largura da coluna de legenda
      const areaTop = headerY + headerHeight + 8;
      const areaLeft = margin + legendaW + 12; // margem para cotas da chapa
      const areaRight = pageW - margin;
      const areaBottom = pageH - 14; // espaço para rodapé
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
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.5);

      // Cota horizontal (cima)
      const cotaTopY = desenhoY - 7;
      // Linha horizontal com setas
      pdf.line(desenhoX, cotaTopY, desenhoX + desenhoW, cotaTopY);
      // Setas nas extremidades
      pdf.line(desenhoX, cotaTopY, desenhoX + 3, cotaTopY - 1.5);
      pdf.line(desenhoX, cotaTopY, desenhoX + 3, cotaTopY + 1.5);
      pdf.line(desenhoX + desenhoW, cotaTopY, desenhoX + desenhoW - 3, cotaTopY - 1.5);
      pdf.line(desenhoX + desenhoW, cotaTopY, desenhoX + desenhoW - 3, cotaTopY + 1.5);
      // Texto
      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.text(chapaW + ' mm', desenhoX + desenhoW / 2, cotaTopY - 1.5, { align: 'center' });

      // Cota vertical (esquerda)
      const cotaLeftX = desenhoX - 7;
      // Linha vertical com setas
      pdf.line(cotaLeftX, desenhoY, cotaLeftX, desenhoY + desenhoH);
      // Setas nas extremidades
      pdf.line(cotaLeftX, desenhoY, cotaLeftX - 1.5, desenhoY + 3);
      pdf.line(cotaLeftX, desenhoY, cotaLeftX + 1.5, desenhoY + 3);
      pdf.line(cotaLeftX, desenhoY + desenhoH, cotaLeftX - 1.5, desenhoY + desenhoH - 3);
      pdf.line(cotaLeftX, desenhoY + desenhoH, cotaLeftX + 1.5, desenhoY + desenhoH - 3);
      // Texto vertical
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.text(chapaH + ' mm', cotaLeftX - 2, desenhoY + desenhoH / 2, { angle: 90, align: 'center' });

      // ---------- RETÂNGULO DA CHAPA ----------
      pdf.setFillColor(255, 255, 255); // fundo branco
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(1.5);
      pdf.rect(desenhoX, desenhoY, desenhoW, desenhoH, 'FD');

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

      // ---------- PEÇAS (PRETO E BRANCO) ----------
      const legendaItens = [];
      const bordaW = 0.8; // espessura da borda em mm do PDF
      const inset = bordaW / 2; // quanto encolher cada lado para borda ficar dentro

      chapa.pecas.forEach((peca, pIdx) => {
        const px = desenhoX + peca.posX * escala;
        const py = desenhoY + peca.posY * escala;
        const pw = (peca.rotacao === 90 ? peca.altura : peca.largura) * escala;
        const ph = (peca.rotacao === 90 ? peca.largura : peca.altura) * escala;

        // Preencher a área da peça com branco
        pdf.setFillColor(255, 255, 255);
        pdf.rect(px, py, pw, ph, 'F');

        // Borda preta desenhada PARA DENTRO (inset)
        pdf.setDrawColor(0, 0, 0);
        pdf.setLineWidth(bordaW);
        pdf.rect(px + inset, py + inset, pw - bordaW, ph - bordaW, 'D');

        // Número da peça e dimensões (centro) - EM PRETO
        if (pw > 3 && ph > 3) {
          pdf.setTextColor(0, 0, 0);

          // Número da peça
          pdf.setFontSize(Math.min(16, pw * 0.55, ph * 0.45));
          pdf.setFont('helvetica', 'bold');
          const numeroY = ph > 10 ? py + ph / 2 - 1 : py + ph / 2 + 1;
          pdf.text(String(pIdx + 1), px + pw / 2, numeroY, { align: 'center' });

          // Dimensões da peça (abaixo do número) - apenas se tiver espaço
          if (ph > 10) {
            pdf.setFontSize(9);
            pdf.setFont('helvetica', 'normal');
            const pecaCompExib = peca.rotacao === 90 ? peca.altura : peca.largura;
            const pecaAltExib = peca.rotacao === 90 ? peca.largura : peca.altura;
            const dimText = pecaCompExib + 'x' + pecaAltExib;
            pdf.text(dimText, px + pw / 2, py + ph / 2 + 4, { align: 'center' });
          }
        }

        // Guardar para legenda
        const nome = peca.nome || ('Peça ' + (pIdx + 1));
        const pecaCompExib = peca.rotacao === 90 ? peca.altura : peca.largura;
        const pecaAltExib = peca.rotacao === 90 ? peca.largura : peca.altura;
        legendaItens.push({ numero: pIdx + 1, nome, dim: pecaCompExib + 'x' + pecaAltExib, rotado: peca.rotacao === 90 });
      });

      // ---------- HACHURAS NAS ÁREAS DE SOBRA ----------
      // Desenhar hachuras diagonais apenas nas áreas não ocupadas
      pdf.setDrawColor(160, 160, 160);
      pdf.setLineWidth(0.15);
      const espacamentoHachura = 2.5; // espaçamento entre linhas de hachura em mm

      // Função auxiliar para verificar se um ponto está dentro de alguma peça
      const pontoEmPeca = (x, y) => {
        for (const peca of chapa.pecas) {
          const px = desenhoX + peca.posX * escala;
          const py = desenhoY + peca.posY * escala;
          const pw = (peca.rotacao === 90 ? peca.altura : peca.largura) * escala;
          const ph = (peca.rotacao === 90 ? peca.largura : peca.altura) * escala;
          if (x >= px && x <= px + pw && y >= py && y <= py + ph) {
            return true;
          }
        }
        return false;
      };

      // Desenhar hachuras em grade pequena para evitar peças
      const step = 1; // passo pequeno para verificação
      for (let offset = -desenhoH; offset < desenhoW + desenhoH; offset += espacamentoHachura) {
        let segmentos = []; // armazenar segmentos válidos

        for (let t = 0; t < desenhoW + desenhoH; t += step) {
          const x = desenhoX + offset + t;
          const y = desenhoY + t;

          // Verificar se está dentro dos limites da chapa
          if (x >= desenhoX && x <= desenhoX + desenhoW && y >= desenhoY && y <= desenhoY + desenhoH) {
            const emPeca = pontoEmPeca(x, y);

            if (!emPeca) {
              if (segmentos.length === 0 || segmentos[segmentos.length - 1].fim) {
                segmentos.push({ x1: x, y1: y, x2: x, y2: y, fim: false });
              } else {
                segmentos[segmentos.length - 1].x2 = x;
                segmentos[segmentos.length - 1].y2 = y;
              }
            } else {
              if (segmentos.length > 0) {
                segmentos[segmentos.length - 1].fim = true;
              }
            }
          }
        }

        // Desenhar os segmentos válidos
        for (const seg of segmentos) {
          if (Math.abs(seg.x2 - seg.x1) > 1 || Math.abs(seg.y2 - seg.y1) > 1) {
            pdf.line(seg.x1, seg.y1, seg.x2, seg.y2);
          }
        }
      }

      // ---------- LEGENDA (coluna vertical à esquerda) ----------
      const legendaX = margin;
      let legendaY = areaTop;

      // Título da legenda
      pdf.setDrawColor(0, 0, 0);
      pdf.setFillColor(255, 255, 255);
      pdf.setLineWidth(0.8);
      pdf.rect(legendaX, legendaY, legendaW, 8, 'FD');
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('LEGENDA', legendaX + legendaW / 2, legendaY + 6, { align: 'center' });
      legendaY += 8;

      // Itens da legenda (sem borda externa, apenas linhas separando)
      legendaItens.forEach((item, i) => {
        if (legendaY + 5.5 > areaBottom - 10) return; // não ultrapassar a área

        // Linha separadora
        if (i > 0) {
          pdf.setDrawColor(200, 200, 200);
          pdf.setLineWidth(0.3);
          pdf.line(legendaX, legendaY, legendaX + legendaW, legendaY);
        }

        // Formato: "1 - asdasdasd 600 x 500"
        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');

        // Truncar nome se muito longo
        let nomeExib = item.nome;
        if (nomeExib.length > 15) nomeExib = nomeExib.substring(0, 14) + '...';

        // Montar texto completo: "1 - Nome 600 x 500"
        const textoCompleto = item.numero + ' - ' + nomeExib + ' ' + item.dim;
        pdf.text(textoCompleto, legendaX + 2, legendaY + 4);

        legendaY += 6; // espaçamento entre linhas
      });

      // Borda externa da área de legenda
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.8);
      const legendaAltura = (legendaItens.length * 6) + 8;
      pdf.rect(legendaX, areaTop, legendaW, Math.min(legendaAltura, areaBottom - areaTop - 10), 'S');

      // ---------- RODAPÉ ----------
      const rodapeY = pageH - 10;
      pdf.setTextColor(120, 120, 120);
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Gerado pelo Sistema Pietra  |  ' + new Date().toLocaleDateString('pt-BR'), pageW / 2, rodapeY, { align: 'center' });
    });

    // Salvar
    const nome = orcamentoAtual.nome.replace(/[^a-z0-9]/gi, '_');
    pdf.save('PlanoCorte_' + nome + '_' + new Date().toISOString().split('T')[0] + '.pdf');
    alert('✅ PDF do Plano de Corte gerado!\n' + orcamentoAtual.chapas.length + ' chapa(s)');
  };

  // Wrapper para criar orçamento e navegar para tela de orçamento
  const confirmarCriacaoOrcamento = () => {
    const novoOrc = criarOrcamento(nomeNovoOrcamento, precos);
    if (novoOrc) {
      setTela('orcamento');
    }
  };

  // Adicionar peça
  const adicionarPeca = (ambienteId, peca) => {
    // Validar se a peça cabe na chapa do material selecionado
    const material = materiais.find(m => m.id === peca.materialId);
    if (!material) {
      alert('❌ Material não encontrado!');
      return;
    }

    // Obter configuração do material para este orçamento (usa padrão se não existir)
    const materialConfig = orcamentoAtual.materiais?.[peca.materialId] || { ...CONFIG_CHAPA_PADRAO };

    const pecaComp = parseFloat(peca.largura);
    const pecaAlt = parseFloat(peca.altura);
    const chapaComp = materialConfig.comprimento;
    const chapaAlt = materialConfig.altura;

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
    const quantidade = peca.quantidade || 1;
    for (let i = 0; i < quantidade; i++) {
      // Se quantidade > 1, adicionar numeração no nome
      const nomeComNumeracao = quantidade > 1
        ? `${peca.nome} ${i + 1} - ${quantidade}`
        : peca.nome;

      novasPecas.push({
        ...peca,
        id: Date.now() + i + Math.random(),
        nome: nomeComNumeracao,
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

    // Garantir que o material tem configuração no orçamento
    const materiaisConfig = { ...orcamentoAtual.materiais };
    if (!materiaisConfig[peca.materialId]) {
      materiaisConfig[peca.materialId] = { ...CONFIG_CHAPA_PADRAO };
    }

    const novoOrcamento = { ...orcamentoAtual, ambientes, materiais: materiaisConfig };
    setOrcamentoAtual(novoOrcamento);

    // Sincronizar com a lista de orçamentos
    setOrcamentos(prev => prev.map(orc =>
      orc.id === orcamentoAtual.id ? novoOrcamento : orc
    ));

    // Reorganizar todas as peças
    setTimeout(() => {
      organizarPecasLocalmente(novoOrcamento);
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

    // Sincronizar com a lista de orçamentos
    setOrcamentos(prev => prev.map(orc =>
      orc.id === orcamentoAtual.id ? novoOrcamento : orc
    ));

    console.log('💾 Orçamento atualizado, reorganizando chapas...');

    // Reorganizar chapas após exclusão
    setTimeout(() => {
      organizarPecasLocalmente(novoOrcamento);
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

    // Sincronizar com a lista de orçamentos
    setOrcamentos(prev => prev.map(orc =>
      orc.id === orcamentoAtual.id ? novoOrcamento : orc
    ));

    // Forçar atualização do resumo
    setOrcamentoVersion(prev => prev + 1);

    // Reorganizar chapas se mudou dimensões ou material
    if (pecaEditada.largura !== mostrandoDetalhePeca.largura ||
        pecaEditada.altura !== mostrandoDetalhePeca.altura ||
        pecaEditada.materialId !== mostrandoDetalhePeca.materialId) {
      setTimeout(() => {
        organizarPecasLocalmente(novoOrcamento);
      }, 0);
    }

    // Fechar modal
    setMostrandoDetalhePeca(null);
    setModoEdicaoPeca(false);
    setPecaEditada(null);
  };


  const gerarEtiquetasPDF = () => {
    gerarEtiquetasPDFUtil(orcamentoAtual, materiais);
  };

  const gerarRelatorioPDF = async () => {
    const precosAtual = orcamentoAtual.precos || PRECOS_PADRAO;
    await gerarRelatorioPDFUtil(orcamentoAtual, materiais, precosAtual);
  };

  // Organizar peças em chapas automaticamente
  // Wrapper para organizar peças usando a função do utils
  const organizarPecasLocalmente = (orcamento) => {
    const orcamentoAtualizado = organizarPecasEmChapas(orcamento, materiais);
    setOrcamentoAtual(orcamentoAtualizado);

    // Sincronizar com a lista de orçamentos
    setOrcamentos(prev => prev.map(orc =>
      orc.id === orcamento.id ? orcamentoAtualizado : orc
    ));
  };

  const otimizarCorte = () => {
    if (!orcamentoAtual) return;
    const orcamentoOtimizado = otimizarOrcamento(orcamentoAtual, materiais, opcoesOtimizacao);
    setOrcamentoAtual(orcamentoOtimizado);
    setOrcamentos(prev => prev.map(orc =>
      orc.id === orcamentoAtual.id ? orcamentoOtimizado : orc
    ));
    setMostrarModalOtimizacao(false);
  };

  const salvarPrecosOrcamento = () => {
    if (!orcamentoAtual) return;

    // Criar orçamento atualizado com os novos preços
    const orcamentoComPrecosAtualizados = {
      ...orcamentoAtual,
      precos: { ...orcamentoAtual.precos, ...precosTemp }
    };

    // Reorganizar chapas com os novos preços (preserva os preços)
    const orcamentoReorganizado = organizarPecasEmChapas(orcamentoComPrecosAtualizados, materiais);

    // Aplicar as mudanças (uma única atualização de estado)
    setOrcamentoAtual(orcamentoReorganizado);
    setOrcamentos(prev => prev.map(orc =>
      orc.id === orcamentoAtual.id ? orcamentoReorganizado : orc
    ));

    // Forçar re-renderização do resumo
    setOrcamentoVersion(prev => prev + 1);

    // Mostrar feedback
    setPrecosSalvosOrcamento(true);
    setTimeout(() => setPrecosSalvosOrcamento(false), 2000);
  };

  // Salvar configuração de materiais e reorganizar chapas
  const salvarMateriaisOrcamento = () => {
    if (!orcamentoAtual) return;

    // Criar orçamento atualizado com as novas configurações de materiais
    const orcamentoComMateriaisAtualizados = {
      ...orcamentoAtual,
      materiais: { ...orcamentoAtual.materiais, ...materiaisTemp }
    };

    // Reorganizar chapas com as novas configurações (preserva os materiais)
    const orcamentoReorganizado = organizarPecasEmChapas(orcamentoComMateriaisAtualizados, materiais);

    // Aplicar as mudanças (uma única atualização de estado)
    setOrcamentoAtual(orcamentoReorganizado);
    setOrcamentos(prev => prev.map(orc =>
      orc.id === orcamentoAtual.id ? orcamentoReorganizado : orc
    ));

    // Forçar re-renderização do resumo
    setOrcamentoVersion(prev => prev + 1);

    // Mostrar feedback
    setMateriaisSalvosOrcamento(true);
    setTimeout(() => setMateriaisSalvosOrcamento(false), 2000);
  };

  // Função para substituir um material por outro no orçamento
  const substituirMaterial = (materialAntigoId, materialNovoId) => {
    if (!orcamentoAtual || !materialAntigoId || !materialNovoId) return;

    // Converter IDs para string para comparação
    const antigoIdStr = String(materialAntigoId);
    const novoIdStr = String(materialNovoId);

    if (antigoIdStr === novoIdStr) {
      alert('⚠️ Selecione um material diferente para substituição.');
      return;
    }

    // Buscar material novo (comparação flexível)
    const materialNovo = materiais.find(m => String(m.id) === novoIdStr);
    if (!materialNovo) {
      console.error('Material não encontrado. ID procurado:', novoIdStr, 'Materiais disponíveis:', materiais);
      alert('❌ Material de substituição não encontrado.');
      return;
    }

    // Contar quantas peças serão afetadas
    let totalPecas = 0;
    orcamentoAtual.ambientes.forEach(amb => {
      amb.pecas.forEach(peca => {
        if (String(peca.materialId) === antigoIdStr) {
          totalPecas++;
        }
      });
    });

    if (totalPecas === 0) {
      alert('⚠️ Nenhuma peça usa este material.');
      return;
    }

    const confirmar = window.confirm(
      `Substituir ${totalPecas} peça(s) que usam este material por "${materialNovo.nome}"?\n\n` +
      `As chapas serão reorganizadas automaticamente.`
    );

    if (!confirmar) return;

    // Substituir material em todas as peças
    const ambientesAtualizados = orcamentoAtual.ambientes.map(amb => ({
      ...amb,
      pecas: amb.pecas.map(peca => {
        if (String(peca.materialId) === antigoIdStr) {
          return {
            ...peca,
            materialId: materialNovo.id, // Usar o ID original do material novo
            material: materialNovo
          };
        }
        return peca;
      })
    }));

    // Atualizar configuração de materiais (copiar config do material antigo para o novo se não existir)
    const materiaisConfig = { ...orcamentoAtual.materiais };
    if (!materiaisConfig[materialNovo.id] && materiaisConfig[materialAntigoId]) {
      materiaisConfig[materialNovo.id] = { ...materiaisConfig[materialAntigoId] };
    }
    // Se não tiver config do material novo, criar uma padrão
    if (!materiaisConfig[materialNovo.id]) {
      materiaisConfig[materialNovo.id] = { ...CONFIG_CHAPA_PADRAO };
    }

    // Criar novo orçamento com as peças atualizadas
    const orcamentoAtualizado = {
      ...orcamentoAtual,
      ambientes: ambientesAtualizados,
      materiais: materiaisConfig
    };

    // Reorganizar chapas
    const orcamentoReorganizado = organizarPecasEmChapas(orcamentoAtualizado, materiais);

    // Aplicar mudanças
    setOrcamentoAtual(orcamentoReorganizado);
    setOrcamentos(prev => prev.map(orc =>
      orc.id === orcamentoAtual.id ? orcamentoReorganizado : orc
    ));

    // Forçar re-renderização
    setOrcamentoVersion(prev => prev + 1);

    alert(`✅ Material substituído com sucesso!\n${totalPecas} peça(s) atualizada(s).`);
  };

  // Inicializar estado temporário quando o painel de preços abre
  useEffect(() => {
    if (mostrarPainelPrecosOrcamento && orcamentoAtual) {
      setPrecosTemp({ ...orcamentoAtual.precos });
      setPrecosSalvosOrcamento(false);
    }
  }, [mostrarPainelPrecosOrcamento, orcamentoAtual?.id]);

  // Inicializar estado temporário quando o painel de materiais abre
  useEffect(() => {
    if (mostrarPainelMateriaisOrcamento && orcamentoAtual) {
      setMateriaisTemp({ ...orcamentoAtual.materiais });
      setMateriaisSalvosOrcamento(false);
    }
  }, [mostrarPainelMateriaisOrcamento, orcamentoAtual?.id]);

  // Calcular totais
  // Calcular orçamento salvo (usa os materiais salvos no orçamento)

  // Mover peça dentro da mesma chapa (arraste manual)





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

    const orcamentoAtualizado = {
      ...orcamentoAtual,
      ambientes: ambientesAtualizados,
      chapas: chapasAtualizadas
    };

    setOrcamentoAtual(orcamentoAtualizado);

    // Sincronizar com a lista de orçamentos
    setOrcamentos(prev => prev.map(orc =>
      orc.id === orcamentoAtual.id ? orcamentoAtualizado : orc
    ));
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

    const orcamentoAtualizado = {
      ...orcamentoAtual,
      ambientes: ambientesAtualizados,
      chapas: chapasAtualizadas
    };

    setOrcamentoAtual(orcamentoAtualizado);

    // Sincronizar com a lista de orçamentos
    setOrcamentos(prev => prev.map(orc =>
      orc.id === orcamentoAtual.id ? orcamentoAtualizado : orc
    ));
  };

  // Encontrar melhor posição disponível para a peça na chapa
  const encontrarMelhorPosicao = (peca, chapaDestino) => {
    const larguraPeca = peca.rotacao === 90 ? peca.altura : peca.largura;
    const alturaPeca = peca.rotacao === 90 ? peca.largura : peca.altura;
    const margem = opcoesOtimizacao.margemLaterais;
    const espacamento = opcoesOtimizacao.espessuraDisco;

    const larguraChapa = chapaDestino.material.comprimento;
    const alturaChapa = chapaDestino.material.altura;

    // Verificar se a peça é maior que a chapa (considerando margens)
    if (larguraPeca + margem * 2 > larguraChapa ||
        alturaPeca + margem * 2 > alturaChapa) {
      return null;
    }

    // Incremento igual ao espaçamento garante que a posição exata com gap correto
    // sempre seja testada — evita gaps maiores que o configurado.
    const incremento = espacamento;

    for (let y = margem; y + alturaPeca + margem <= alturaChapa; y += incremento) {
      for (let x = margem; x + larguraPeca + margem <= larguraChapa; x += incremento) {
        // AABB inflado pelo espaçamento — mesma lógica usada no canvas
        const sobrepoe = chapaDestino.pecas.some(p => {
          if (p.id === peca.id) return false;

          const larguraOutra = p.rotacao === 90 ? p.altura : p.largura;
          const alturaOutra = p.rotacao === 90 ? p.largura : p.altura;

          const aMinX = p.posX - espacamento;
          const aMaxX = p.posX + larguraOutra + espacamento;
          const aMinY = p.posY - espacamento;
          const aMaxY = p.posY + alturaOutra + espacamento;

          return (
            x < aMaxX &&
            x + larguraPeca > aMinX &&
            y < aMaxY &&
            y + alturaPeca > aMinY
          );
        });

        if (!sobrepoe) {
          return { x, y };
        }
      }
    }

    return null;
  };

  // Mover peça entre chapas (ou da bandeja de avulsas para uma chapa)
  const moverPeca = (pecaId, novaChapaId) => {
    let pecaMovida = null;
    orcamentoAtual.ambientes.forEach(amb => {
      const peca = amb.pecas.find(p => p.id === pecaId);
      if (peca) pecaMovida = peca;
    });

    if (!pecaMovida) {
      alert('❌ Erro: Peça não encontrada.');
      return;
    }

    // Comparar como string pois o id vindo do data-chapa-id é string
    const chapaDestino = orcamentoAtual.chapas.find(c => String(c.id) === String(novaChapaId));
    if (!chapaDestino) {
      alert('❌ Erro: Chapa de destino não encontrada.');
      return;
    }

    // Validar compatibilidade de material entre peça e chapa
    if (chapaDestino.materialId !== pecaMovida.materialId) {
      alert('⚠️ Só é possível colocar a peça em uma chapa do mesmo material.');
      return;
    }

    // Usa o id real (number) da chapa encontrada, não o id recebido (que pode ser string)
    const chapaDestinoId = chapaDestino.id;

    const posicao = encontrarMelhorPosicao(pecaMovida, chapaDestino);

    if (!posicao) {
      const larguraPeca = pecaMovida.rotacao === 90 ? pecaMovida.altura : pecaMovida.largura;
      const alturaPeca = pecaMovida.rotacao === 90 ? pecaMovida.largura : pecaMovida.altura;

      alert(
        '⚠️ Não foi possível mover a peça!\n\n' +
        '❌ Não há espaço disponível na chapa de destino.\n\n' +
        '📏 Dimensões da peça: ' + larguraPeca + ' x ' + alturaPeca + ' mm\n' +
        '📐 Dimensões da chapa: ' + chapaDestino.material.comprimento + ' x ' + chapaDestino.material.altura + ' mm\n\n' +
        '💡 Dica: Tente mover outras peças ou use outra chapa.'
      );
      return;
    }

    const ambientesAtualizados = orcamentoAtual.ambientes.map(amb => ({
      ...amb,
      pecas: amb.pecas.map(p =>
        p.id === pecaId ? { ...p, chapaId: chapaDestinoId, posX: posicao.x, posY: posicao.y } : p
      )
    }));

    const todasPecas = ambientesAtualizados.flatMap(amb => amb.pecas);
    const chapasAtualizadas = orcamentoAtual.chapas.map(chapa => ({
      ...chapa,
      pecas: todasPecas.filter(p => p.chapaId === chapa.id)
    }));

    const orcamentoAtualizado = {
      ...orcamentoAtual,
      ambientes: ambientesAtualizados,
      chapas: chapasAtualizadas
    };

    setOrcamentoAtual(orcamentoAtualizado);

    // Sincronizar com a lista de orçamentos
    setOrcamentos(prev => prev.map(orc =>
      orc.id === orcamentoAtual.id ? orcamentoAtualizado : orc
    ));
  };

  // Adicionar chapa manualmente ao plano de corte
  // Excluir uma chapa vazia (sem peças)
  const excluirChapa = (chapaId) => {
    if (!orcamentoAtual) return;
    const chapa = orcamentoAtual.chapas.find(c => String(c.id) === String(chapaId));
    if (!chapa) return;
    if (chapa.pecas && chapa.pecas.length > 0) {
      alert('❌ Esta chapa não pode ser excluída pois contém peças.');
      return;
    }
    if (!window.confirm('Excluir esta chapa vazia?')) return;

    const orcamentoAtualizado = {
      ...orcamentoAtual,
      chapas: orcamentoAtual.chapas.filter(c => String(c.id) !== String(chapaId)),
    };
    setOrcamentoAtual(orcamentoAtualizado);
    setOrcamentos(prev => prev.map(orc =>
      orc.id === orcamentoAtual.id ? orcamentoAtualizado : orc
    ));
  };

  // Plano Manual: desloca todas as peças pra "área de avulsas" (chapaId=null).
  // Chapas existentes ficam (opção 1B do usuário).
  const iniciarPlanoManual = () => {
    if (!orcamentoAtual) return;
    if (!window.confirm(
      'Iniciar plano manual?\n\n' +
      'Todas as peças voltarão para a área de peças avulsas.\n' +
      'As chapas existentes serão mantidas (vazias).\n\n' +
      'Você poderá arrastar as peças para as chapas uma a uma.'
    )) return;

    const ambientesAtualizados = orcamentoAtual.ambientes.map(amb => ({
      ...amb,
      pecas: amb.pecas.map(p => ({ ...p, chapaId: null, posX: null, posY: null })),
    }));
    const chapasLimpas = orcamentoAtual.chapas.map(c => ({ ...c, pecas: [] }));

    const orcamentoAtualizado = {
      ...orcamentoAtual,
      ambientes: ambientesAtualizados,
      chapas: chapasLimpas,
    };
    setOrcamentoAtual(orcamentoAtualizado);
    setOrcamentos(prev => prev.map(orc =>
      orc.id === orcamentoAtual.id ? orcamentoAtualizado : orc
    ));
  };

  // Mover peça de uma chapa de volta para a área de avulsas
  const moverPecaParaAvulsas = (pecaId) => {
    if (!orcamentoAtual) return;

    const ambientesAtualizados = orcamentoAtual.ambientes.map(amb => ({
      ...amb,
      pecas: amb.pecas.map(p =>
        p.id === pecaId ? { ...p, chapaId: null, posX: null, posY: null } : p
      ),
    }));
    const todasPecas = ambientesAtualizados.flatMap(amb => amb.pecas);
    const chapasAtualizadas = orcamentoAtual.chapas.map(chapa => ({
      ...chapa,
      pecas: todasPecas.filter(p => p.chapaId === chapa.id),
    }));

    const orcamentoAtualizado = {
      ...orcamentoAtual,
      ambientes: ambientesAtualizados,
      chapas: chapasAtualizadas,
    };
    setOrcamentoAtual(orcamentoAtualizado);
    setOrcamentos(prev => prev.map(orc =>
      orc.id === orcamentoAtual.id ? orcamentoAtualizado : orc
    ));
  };

  const adicionarChapa = (materialId) => {
    const material = materiais.find((m) => m.id === parseInt(materialId));
    if (!material) return;

    const materialConfig = orcamentoAtual.materiais?.[material.id] || { ...CONFIG_CHAPA_PADRAO };

    const novaChapa = {
      id: Date.now() + Math.random(),
      materialId: material.id,
      material: { ...material, ...materialConfig },
      pecas: [],
    };

    // Garantir que a config do material esteja no orçamento (para cálculos futuros)
    const materiaisConfig = { ...(orcamentoAtual.materiais || {}) };
    if (!materiaisConfig[material.id]) {
      materiaisConfig[material.id] = materialConfig;
    }

    const orcamentoAtualizado = {
      ...orcamentoAtual,
      chapas: [...orcamentoAtual.chapas, novaChapa],
      materiais: materiaisConfig,
    };

    setOrcamentoAtual(orcamentoAtualizado);
    setOrcamentos((prev) =>
      prev.map((orc) => (orc.id === orcamentoAtual.id ? orcamentoAtualizado : orc))
    );

    setMostrarModalNovaChapa(false);
    setMaterialNovaChapa('');
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-400">
      <Header
        tela={tela}
        orcamentoAtual={orcamentoAtual}
        menuMobileAberto={menuMobileAberto}
        setMenuMobileAberto={setMenuMobileAberto}
        mostrarPainelPrecosOrcamento={mostrarPainelPrecosOrcamento}
        setMostrarPainelPrecosOrcamento={setMostrarPainelPrecosOrcamento}
        mostrarPainelMateriaisOrcamento={mostrarPainelMateriaisOrcamento}
        setMostrarPainelMateriaisOrcamento={setMostrarPainelMateriaisOrcamento}
        setTela={setTela}
        setOrcamentoAtual={setOrcamentoAtual}
        onGerarEtiquetas={gerarEtiquetasPDF}
        onGerarRelatorio={gerarRelatorioPDF}
      />

      <div className="px-8 py-3">
        {(tela === 'orcamento' || tela === 'plano-corte') && orcamentoAtual && <div className="mb-4"></div>}
        {(tela === 'orcamento' || tela === 'plano-corte') && orcamentoAtual && <div className="mb-4"></div>}

        {/* Modal Novo Orçamento - Design Moderno */}
        {mostrarModalNovoOrcamento && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-100 rounded-lg shadow-2xl max-w-md w-full mx-4 border border-slate-200 overflow-hidden">
              <div className="bg-slate-800 px-6 py-4">
                <h2 className="text-2xl font-bold text-white">Novo Orçamento</h2>
              </div>
              <div className="p-6">
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
                    className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-slate-400 focus:border-slate-400 transition-all"
                    placeholder="Ex: Cliente João Silva - Cozinha"
                    autoFocus
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => {
                      fecharModalNovoOrcamento();
                      setNomeNovoOrcamento('');
                    }}
                    className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-all text-sm font-medium text-slate-700"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={confirmarCriacaoOrcamento}
                    className="bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all hover:shadow-lg hover:shadow-slate-500/50 hover:scale-105 active:scale-95"
                  >
                    Criar Orçamento
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Detalhes da Peça */}
        {mostrandoDetalhePeca && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
            <div className="bg-gray-100 rounded-lg shadow-lg w-full max-w-2xl border border-slate-200 max-h-[85vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="bg-slate-800 px-6 py-4 flex items-center justify-between flex-shrink-0">
                <h3 className="text-lg font-bold text-white">
                  {modoEdicaoPeca ? 'Editando' : ''} {mostrandoDetalhePeca.nome || 'Peça'}
                </h3>
                <button
                  onClick={() => {
                    setMostrandoDetalhePeca(null);
                    setModoEdicaoPeca(false);
                    setPecaEditada(null);
                  }}
                  className="text-slate-300 hover:text-white transition-colors text-xl font-bold"
                >
                  &times;
                </button>
              </div>

              {/* Conteúdo Rolável */}
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                {/* Informações Gerais - COMPACTAS */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                    <h4 className="font-semibold text-slate-700 mb-2 text-sm">Dimensões</h4>
                    <div className="space-y-2">
                      <div>
                        <label className="block text-slate-600 text-xs mb-1">Nome:</label>
                        {modoEdicaoPeca ? (
                          <input
                            type="text"
                            value={pecaEditada?.nome || ''}
                            onChange={(e) => setPecaEditada({...pecaEditada, nome: e.target.value})}
                            className="w-full px-2 py-1 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
                          />
                        ) : (
                          <span className="font-bold text-slate-800 text-sm">{mostrandoDetalhePeca.nome || 'Sem nome'}</span>
                        )}
                      </div>
                      <div>
                        <label className="block text-slate-600 text-xs mb-1">Largura (mm):</label>
                        {modoEdicaoPeca ? (
                          <input
                            type="number"
                            value={pecaEditada?.largura || 0}
                            onChange={(e) => setPecaEditada({...pecaEditada, largura: parseInt(e.target.value) || 0})}
                            className="w-full px-2 py-1 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
                          />
                        ) : (
                          <span className="font-bold text-slate-800 text-sm">{mostrandoDetalhePeca.largura} mm</span>
                        )}
                      </div>
                      <div>
                        <label className="block text-slate-600 text-xs mb-1">Altura (mm):</label>
                        {modoEdicaoPeca ? (
                          <input
                            type="number"
                            value={pecaEditada?.altura || 0}
                            onChange={(e) => setPecaEditada({...pecaEditada, altura: parseInt(e.target.value) || 0})}
                            className="w-full px-2 py-1 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
                          />
                        ) : (
                          <span className="font-bold text-slate-800 text-sm">{mostrandoDetalhePeca.altura} mm</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                    <h4 className="font-semibold text-slate-700 mb-2 text-sm">Material</h4>
                    <div className="space-y-2">
                      <div>
                        <label className="block text-slate-600 text-xs mb-1">Material:</label>
                        {modoEdicaoPeca ? (
                          <select
                            value={pecaEditada?.materialId || ''}
                            onChange={(e) => setPecaEditada({...pecaEditada, materialId: parseInt(e.target.value)})}
                            className="w-full px-2 py-1 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
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
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                    <h4 className="font-semibold text-slate-700 mb-3 text-sm">Acabamentos</h4>
                    {modoEdicaoPeca ? (
                      <div className="space-y-3">
                        <p className="text-xs text-slate-600 bg-slate-100 p-2 rounded border border-slate-300">
                          Insira a quantidade de acabamento em metros lineares. Deixe em branco ou 0 para desativar.
                        </p>
                        <div className="grid md:grid-cols-2 gap-3">
                          {['polimento', 'esquadria', 'boleado', 'canal'].map(tipo => {
                            return (
                              <div key={tipo} className="bg-gray-100 rounded-lg p-3 border border-slate-300">
                                <label className="block mb-2">
                                  <span className="font-semibold text-sm capitalize text-slate-700">{tipo}</span>
                                  <span className="text-xs text-slate-500 ml-1">(R$ {(orcamentoAtual.precos || PRECOS_PADRAO)[tipo]}/m)</span>
                                </label>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={pecaEditada?.acabamentosPersonalizados?.[tipo] || ''}
                                    onChange={(e) => {
                                      const novosAcabamentosPersonalizados = {
                                        ...(pecaEditada?.acabamentosPersonalizados || {}),
                                        [tipo]: e.target.value
                                      };
                                      setPecaEditada({
                                        ...pecaEditada,
                                        acabamentosPersonalizados: novosAcabamentosPersonalizados
                                      });
                                    }}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-slate-400 focus:outline-none text-sm font-medium"
                                    placeholder="0.00"
                                  />
                                  <span className="text-sm text-slate-600 whitespace-nowrap">metros</span>
                                </div>
                                {pecaEditada?.acabamentosPersonalizados?.[tipo] > 0 && (
                                  <div className="mt-2 text-xs text-slate-700 bg-slate-50 p-2 rounded border border-slate-200">
                                    <strong>Custo:</strong> {((parseFloat(pecaEditada.acabamentosPersonalizados[tipo]) || 0) * (orcamentoAtual.precos || PRECOS_PADRAO)[tipo]).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="grid md:grid-cols-2 gap-2">
                        {Object.keys(mostrandoDetalhePeca.acabamentos).map(tipo => {
                          const acab = mostrandoDetalhePeca.acabamentos[tipo];
                          const valorPersonalizado = mostrandoDetalhePeca.acabamentosPersonalizados?.[tipo];

                          // Se tem valor personalizado, mostrar ele
                          if (valorPersonalizado && parseFloat(valorPersonalizado) > 0) {
                            const metros = parseFloat(valorPersonalizado);
                            const valor = metros * (orcamentoAtual.precos || PRECOS_PADRAO)[tipo];
                            return (
                              <div key={tipo} className="bg-gray-100 rounded p-2 border border-slate-300">
                                <div className="font-semibold text-slate-800 capitalize text-sm mb-1">{tipo}</div>
                                <div className="text-xs text-slate-700">
                                  <span className="font-bold text-slate-800">{metros.toFixed(2)}m</span>
                                  <span className="ml-2 text-slate-600">({valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})</span>
                                </div>
                              </div>
                            );
                          }

                          // Se não, mostrar lados (modo tradicional)
                          if (!acab.ativo) return null;
                          const lados = Object.keys(acab.lados).filter(lado => acab.lados[lado]);
                          return (
                            <div key={tipo} className="bg-gray-100 rounded p-2 border border-slate-300">
                              <div className="font-semibold text-slate-800 capitalize text-sm mb-1">{tipo}</div>
                              <div className="flex flex-wrap gap-1">
                                {lados.map(lado => (
                                  <span key={lado} className="text-xs bg-slate-100 text-slate-700 px-1 py-0.5 rounded">
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
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                    <h4 className="font-semibold text-slate-700 mb-2 text-sm">Recortes</h4>
                    {modoEdicaoPeca ? (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-slate-600 mb-1">Pia/Cuba:</label>
                          <input
                            type="number"
                            value={pecaEditada?.cuba || 0}
                            onChange={(e) => setPecaEditada({...pecaEditada, cuba: parseInt(e.target.value) || 0})}
                            className="w-full px-2 py-1 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
                            min="0"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-600 mb-1">Cuba Esculpida:</label>
                          <input
                            type="number"
                            value={pecaEditada?.cubaEsculpida || 0}
                            onChange={(e) => setPecaEditada({...pecaEditada, cubaEsculpida: parseInt(e.target.value) || 0})}
                            className="w-full px-2 py-1 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
                            min="0"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-600 mb-1">Cooktop:</label>
                          <input
                            type="number"
                            value={pecaEditada?.cooktop || 0}
                            onChange={(e) => setPecaEditada({...pecaEditada, cooktop: parseInt(e.target.value) || 0})}
                            className="w-full px-2 py-1 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
                            min="0"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-600 mb-1">Recorte:</label>
                          <input
                            type="number"
                            value={pecaEditada?.recorte || 0}
                            onChange={(e) => setPecaEditada({...pecaEditada, recorte: parseInt(e.target.value) || 0})}
                            className="w-full px-2 py-1 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
                            min="0"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-600 mb-1">Pés:</label>
                          <input
                            type="number"
                            value={pecaEditada?.pes || 0}
                            onChange={(e) => setPecaEditada({...pecaEditada, pes: parseInt(e.target.value) || 0})}
                            className="w-full px-2 py-1 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
                            min="0"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {mostrandoDetalhePeca.cuba > 0 && (
                          <div className="bg-gray-100 rounded p-2 text-center border border-slate-300">
                            <div className="text-xs text-slate-600">Cuba</div>
                            <div className="font-bold text-slate-800">{mostrandoDetalhePeca.cuba}x</div>
                          </div>
                        )}
                        {mostrandoDetalhePeca.cubaEsculpida > 0 && (
                          <div className="bg-gray-100 rounded p-2 text-center border border-slate-300">
                            <div className="text-xs text-slate-600">Cuba Esculpida</div>
                            <div className="font-bold text-slate-800">{mostrandoDetalhePeca.cubaEsculpida}x</div>
                          </div>
                        )}
                        {mostrandoDetalhePeca.cooktop > 0 && (
                          <div className="bg-gray-100 rounded p-2 text-center border border-slate-300">
                            <div className="text-xs text-slate-600">Cooktop</div>
                            <div className="font-bold text-slate-800">{mostrandoDetalhePeca.cooktop}x</div>
                          </div>
                        )}
                        {mostrandoDetalhePeca.recorte > 0 && (
                          <div className="bg-gray-100 rounded p-2 text-center border border-slate-300">
                            <div className="text-xs text-slate-600">Recorte</div>
                            <div className="font-bold text-slate-800">{mostrandoDetalhePeca.recorte}x</div>
                          </div>
                        )}
                        {mostrandoDetalhePeca.pes > 0 && (
                          <div className="bg-gray-100 rounded p-2 text-center border border-slate-300">
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
                <div className="bg-gray-100 px-6 py-3 border-t border-slate-200 flex justify-end gap-3 flex-shrink-0">
                  <button
                    onClick={() => {
                      setModoEdicaoPeca(false);
                      setPecaEditada(null);
                      setMostrandoDetalhePeca(null);
                    }}
                    className="bg-slate-600 hover:bg-slate-700 text-white px-6 py-2.5 rounded-lg font-medium text-sm transition-all hover:shadow-lg hover:shadow-slate-500/50 hover:scale-105 active:scale-95"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={salvarEdicaoPeca}
                    className="bg-slate-700 hover:bg-slate-800 text-white px-6 py-2.5 rounded-lg font-medium text-sm transition-all hover:shadow-lg hover:shadow-slate-500/50 hover:scale-105 active:scale-95"
                  >
                    Salvar
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal de Confirmação de Exclusão */}
        {pecaParaExcluir && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10000] p-4">
            <div className="bg-gray-100 rounded-lg shadow-lg max-w-md w-full mx-4 border border-slate-200">
              {/* Header */}
              <div className="bg-slate-800 px-6 py-4 rounded-t-lg">
                <h3 className="text-lg font-bold text-white">Excluir Peça</h3>
              </div>

              {/* Conteúdo */}
              <div className="p-6">
                <p className="text-slate-700 text-sm mb-3">
                  Deseja realmente excluir esta peça?
                </p>
                <p className="text-slate-900 font-bold text-base bg-slate-50 p-3 rounded-lg border border-slate-200">
                  {pecaParaExcluir.pecaNome || 'Peça sem nome'}
                </p>
                <p className="text-xs text-slate-500 mt-3">
                  A peça será removida e as chapas serão reorganizadas automaticamente.
                </p>
              </div>

              {/* Rodapé */}
              <div className="px-6 py-3 border-t border-slate-200 flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setPecaParaExcluir(null);
                  }}
                  className="bg-slate-600 hover:bg-slate-700 text-white px-6 py-2.5 rounded-lg font-medium text-sm transition-all hover:shadow-lg hover:shadow-slate-500/50 hover:scale-105 active:scale-95"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    excluirPeca(pecaParaExcluir.ambienteId, pecaParaExcluir.pecaId);
                    setPecaParaExcluir(null);
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg font-medium text-sm transition-all hover:shadow-lg hover:shadow-red-500/50 hover:scale-105 active:scale-95"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Visualização de Etiquetas */}
        {/* Menu Principal - Design Moderno */}
        {tela === 'lista' && (
          <HomePage
            materiais={materiais}
            orcamentos={orcamentos}
            onNavigateMaterial={(acao) => setTela('novo-material')}
            onNavigateOrcamento={(acao, orcId) => {
              if (acao === 'novo') {
                abrirModalNovoOrcamento();
              } else if (acao === 'abrir') {
                const orc = orcamentos.find(o => o.id === orcId);
                if (orc) {
                  setOrcamentoAtual(orc);
                  setTela('orcamento');
                  // Restaurar opções de otimização salvas no orçamento (se houver)
                  if (orc.opcoesOtimizacao) {
                    setOpcoesOtimizacao({ ...OPCOES_OTIMIZACAO_PADRAO, ...orc.opcoesOtimizacao });
                  } else {
                    setOpcoesOtimizacao(OPCOES_OTIMIZACAO_PADRAO);
                  }
                }
              }
            }}
            onExcluirMaterial={(matId) => {
              if (window.confirm('Deseja realmente excluir este material?')) {
                excluirMaterial(matId);
              }
            }}
            onExcluirOrcamento={(orcId) => {
              if (window.confirm('Deseja realmente excluir este orçamento?')) {
                excluirOrcamento(orcId);
              }
            }}
            onDuplicarOrcamento={(orcId) => {
              const orcOriginal = orcamentos.find(o => o.id === orcId);
              if (orcOriginal) {
                const novoOrc = {
                  ...orcOriginal,
                  id: Date.now(),
                  nome: `${orcOriginal.nome} (Cópia)`,
                  data: new Date().toLocaleDateString('pt-BR'),
                  ambientes: orcOriginal.ambientes.map(amb => ({
                    ...amb,
                    id: Date.now() + Math.random(),
                    pecas: amb.pecas.map(peca => ({
                      ...peca,
                      id: Date.now() + Math.random()
                    }))
                  })),
                  chapas: orcOriginal.chapas.map(chapa => ({
                    ...chapa,
                    id: Date.now() + Math.random()
                  }))
                };
                saveOrcamento({ ...novoOrc, id: undefined }).then(salvo => {
                  if (salvo) {
                    setOrcamentos(prev => [...prev, salvo]);
                  } else {
                    setOrcamentos(prev => [...prev, novoOrc]);
                  }
                });
                alert('✅ Orçamento duplicado com sucesso!');
              }
            }}
            onRenomearOrcamento={(id, nome) => renomearOrcamento(id, nome)}
            onRenomearMaterial={(id, nome) => atualizarMaterialSimples(id, { nome })}
            calcularOrcamento={(orc) => calcularOrcamentoComDetalhes(orc, materiais, orc.precos || PRECOS_PADRAO)}
            formatBRL={formatBRL}
            precos={precos}
            atualizarPreco={atualizarPreco}
            salvarPrecos={salvarPrecos}
            precosSalvos={precosSalvos}
          />
        )}

        {/* Cadastro de Material */}
        {tela === 'novo-material' && (
          <div className="bg-gray-100 rounded-lg shadow-sm p-6 max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-gray-800">Novo Material</h2>
              <button
                onClick={() => setTela('lista')}
                className="text-gray-600 hover:text-gray-800"
              >
                <X size={24} />
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                💡 <strong>Dica:</strong> As dimensões e preços da chapa serão configurados individualmente em cada orçamento.
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Nome do Material *</label>
              <input
                type="text"
                value={novoMaterial.nome}
                onChange={(e) => setNovoMaterial({ nome: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ex: Mármore Branco Carrara, Granito Preto, Quartzo Branco"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (novoMaterial.nome && novoMaterial.nome.trim()) {
                    adicionarMaterial({ nome: novoMaterial.nome.trim() });
                    setTela('lista');
                  } else {
                    alert('Por favor, insira um nome para o material.');
                  }
                }}
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium transition-colors"
              >
                ✓ Salvar Material
              </button>
              <button
                onClick={() => {
                  setNovoMaterial({ nome: '' });
                  setTela('lista');
                }}
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Edição de Material */}
        {tela === 'editar-material' && materialEditando && (
          <div className="bg-gray-100 rounded-lg shadow-sm p-6 max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-gray-800">Editar Material</h2>
              <button
                onClick={() => {
                  setTela('lista');
                  setMaterialEditando(null);
                  setNovoMaterial({ nome: '' });
                }}
                className="text-gray-600 hover:text-gray-800"
              >
                <X size={24} />
              </button>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Nome do Material *</label>
              <input
                type="text"
                value={novoMaterial.nome}
                onChange={(e) => setNovoMaterial({ nome: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ex: Mármore Branco Carrara"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (novoMaterial.nome && novoMaterial.nome.trim()) {
                    atualizarMaterialSimples(materialEditando.id, { nome: novoMaterial.nome.trim() });
                    setTela('lista');
                    setMaterialEditando(null);
                    setNovoMaterial({ nome: '' });
                  } else {
                    alert('Por favor, insira um nome para o material.');
                  }
                }}
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium transition-colors"
              >
                ✓ Salvar Alterações
              </button>
              <button
                onClick={() => {
                  setTela('lista');
                  setMaterialEditando(null);
                  setNovoMaterial({ nome: '' });
                }}
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Painéis de Configuração - Visíveis no Orçamento e Plano de Corte */}
        {(tela === 'orcamento' || tela === 'plano-corte') && orcamentoAtual && (
          <>
            {/* Painel de Configuração de Preços do Orçamento */}
            <div
              className="overflow-hidden transition-all duration-500 ease-in-out"
              style={{ maxHeight: mostrarPainelPrecosOrcamento ? '800px' : '0', opacity: mostrarPainelPrecosOrcamento ? 1 : 0 }}
            >
                <div className="mb-6 bg-slate-50 border border-slate-300 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Configuração de Preços deste Orçamento</h3>
                  <p className="text-sm text-slate-600 mb-4">
                    Estes preços são específicos deste orçamento e não afetam outros orçamentos.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Acabamentos */}
                    <div className="bg-gray-100 p-4 rounded-lg border border-slate-200">
                      <h4 className="font-semibold text-slate-700 mb-3 text-sm">Acabamentos (R$/m)</h4>
                      <div className="space-y-2">
                        <div>
                          <label className="text-xs text-gray-600 block mb-1">Polimento</label>
                          <input
                            type="number"
                            value={precosTemp.polimento || 0}
                            onChange={(e) => setPrecosTemp({ ...precosTemp, polimento: parseFloat(e.target.value) || 0 })}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                            step="0.01"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600 block mb-1">Esquadria</label>
                          <input
                            type="number"
                            value={precosTemp.esquadria || 0}
                            onChange={(e) => setPrecosTemp({ ...precosTemp, esquadria: parseFloat(e.target.value) || 0 })}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                            step="0.01"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600 block mb-1">Boleado</label>
                          <input
                            type="number"
                            value={precosTemp.boleado || 0}
                            onChange={(e) => setPrecosTemp({ ...precosTemp, boleado: parseFloat(e.target.value) || 0 })}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                            step="0.01"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600 block mb-1">Canal</label>
                          <input
                            type="number"
                            value={precosTemp.canal || 0}
                            onChange={(e) => setPrecosTemp({ ...precosTemp, canal: parseFloat(e.target.value) || 0 })}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                            step="0.01"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Recortes */}
                    <div className="bg-gray-100 p-4 rounded-lg border border-slate-200">
                      <h4 className="font-semibold text-slate-700 mb-3 text-sm">Recortes (R$/un)</h4>
                      <div className="space-y-2">
                        <div>
                          <label className="text-xs text-gray-600 block mb-1">Pia</label>
                          <input
                            type="number"
                            value={precosTemp.pia || 0}
                            onChange={(e) => setPrecosTemp({ ...precosTemp, pia: parseFloat(e.target.value) || 0 })}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                            step="0.01"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600 block mb-1">Cuba Esculpida</label>
                          <input
                            type="number"
                            value={precosTemp.cubaEsculpida || 0}
                            onChange={(e) => setPrecosTemp({ ...precosTemp, cubaEsculpida: parseFloat(e.target.value) || 0 })}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                            step="0.01"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600 block mb-1">Cooktop</label>
                          <input
                            type="number"
                            value={precosTemp.cooktop || 0}
                            onChange={(e) => setPrecosTemp({ ...precosTemp, cooktop: parseFloat(e.target.value) || 0 })}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                            step="0.01"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600 block mb-1">Recorte</label>
                          <input
                            type="number"
                            value={precosTemp.recorte || 0}
                            onChange={(e) => setPrecosTemp({ ...precosTemp, recorte: parseFloat(e.target.value) || 0 })}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                            step="0.01"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600 block mb-1">Pés</label>
                          <input
                            type="number"
                            value={precosTemp.pes || 0}
                            onChange={(e) => setPrecosTemp({ ...precosTemp, pes: parseFloat(e.target.value) || 0 })}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                            step="0.01"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Botão Salvar */}
                  <div className="mt-4 flex flex-col items-center">
                    <button
                      onClick={salvarPrecosOrcamento}
                      className={`px-6 py-2.5 rounded-lg font-medium transition-colors w-full max-w-md ${
                        precosSalvosOrcamento
                          ? 'bg-slate-600 text-white cursor-default'
                          : 'bg-slate-700 hover:bg-slate-800 text-white'
                      }`}
                    >
                      {precosSalvosOrcamento ? 'Salvo' : 'Salvar Preços'}
                    </button>
                    <p className="text-xs text-slate-500 mt-2 text-center">
                      Clique para salvar e atualizar o plano de corte
                    </p>
                  </div>
                </div>
            </div>

              {/* Painel de Configuração de Materiais do Orçamento */}
            <div
              className="overflow-hidden transition-all duration-500 ease-in-out"
              style={{ maxHeight: mostrarPainelMateriaisOrcamento ? '2000px' : '0', opacity: mostrarPainelMateriaisOrcamento ? 1 : 0 }}
            >
                <div className="mb-6 bg-slate-50 border border-slate-300 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Configuração de Materiais deste Orçamento</h3>
                  <p className="text-sm text-slate-600 mb-4">
                    Defina as dimensões e preços das chapas para cada material usado neste orçamento.
                  </p>

                  {/* Listar materiais usados no orçamento */}
                  {(() => {
                    // Extrair IDs únicos de materiais usados
                    const materiaisUsados = new Set();
                    orcamentoAtual.ambientes.forEach(amb => {
                      amb.pecas.forEach(peca => {
                        if (peca.materialId) {
                          materiaisUsados.add(peca.materialId);
                        }
                      });
                    });

                    if (materiaisUsados.size === 0) {
                      return (
                        <div className="text-center py-8 text-gray-500">
                          <p>Nenhum material em uso neste orçamento.</p>
                          <p className="text-sm mt-2">Adicione peças aos ambientes para configurar materiais.</p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-6">
                        {Array.from(materiaisUsados).map(materialId => {
                          const material = materiais.find(m => m.id === materialId);
                          if (!material) return null;

                          const config = materiaisTemp[materialId] || getMaterialConfig(materialId) || CONFIG_CHAPA_PADRAO;

                          return (
                            <div key={materialId} className="bg-gray-100 p-4 rounded-lg border border-slate-200">
                              <div className="flex items-center justify-between mb-4">
                                <h4 className="font-semibold text-slate-800">{material.nome}</h4>

                                {/* Botão para substituir material */}
                                <div className="flex items-center gap-2">
                                  <label className="text-xs text-slate-600">Substituir por:</label>
                                  <select
                                    onChange={(e) => {
                                      if (e.target.value) {
                                        substituirMaterial(materialId, e.target.value);
                                        e.target.value = ''; // Resetar select
                                      }
                                    }}
                                    className="text-xs border border-slate-300 rounded px-2 py-1 bg-gray-100 hover:border-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                  >
                                    <option value="">Selecionar...</option>
                                    {materiais
                                      .filter(m => m.id !== materialId)
                                      .map(m => (
                                        <option key={m.id} value={m.id}>{m.nome}</option>
                                      ))
                                    }
                                  </select>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {/* Largura */}
                                <div>
                                  <label className="text-xs text-gray-600 block mb-1">Largura (mm)</label>
                                  <input
                                    type="number"
                                    value={config.comprimento || ''}
                                    onChange={(e) => setMateriaisTemp({
                                      ...materiaisTemp,
                                      [materialId]: { ...config, comprimento: parseFloat(e.target.value) || 0 }
                                    })}
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                    placeholder="3000"
                                  />
                                </div>

                                {/* Altura */}
                                <div>
                                  <label className="text-xs text-gray-600 block mb-1">Altura (mm)</label>
                                  <input
                                    type="number"
                                    value={config.altura || ''}
                                    onChange={(e) => setMateriaisTemp({
                                      ...materiaisTemp,
                                      [materialId]: { ...config, altura: parseFloat(e.target.value) || 0 }
                                    })}
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                    placeholder="2000"
                                  />
                                </div>

                                {/* Custo */}
                                <div>
                                  <label className="text-xs text-gray-600 block mb-1">Custo (R$/m²)</label>
                                  <input
                                    type="number"
                                    value={config.custo || ''}
                                    onChange={(e) => setMateriaisTemp({
                                      ...materiaisTemp,
                                      [materialId]: { ...config, custo: parseFloat(e.target.value) || 0 }
                                    })}
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                    placeholder="250.00"
                                    step="0.01"
                                  />
                                </div>

                                {/* Venda */}
                                <div>
                                  <label className="text-xs text-gray-600 block mb-1">Venda (R$/m²)</label>
                                  <input
                                    type="number"
                                    value={config.venda || ''}
                                    onChange={(e) => setMateriaisTemp({
                                      ...materiaisTemp,
                                      [materialId]: { ...config, venda: parseFloat(e.target.value) || 0 }
                                    })}
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                    placeholder="333.33"
                                    step="0.01"
                                  />
                                </div>
                              </div>

                              {/* Não cobrar perda */}
                              <div className="mt-3 pt-3 border-t border-slate-200">
                                <label className="inline-flex items-center gap-2 cursor-pointer select-none text-sm text-slate-700">
                                  <input
                                    type="checkbox"
                                    checked={!!config.naoCobrarPerda}
                                    onChange={(e) => setMateriaisTemp({
                                      ...materiaisTemp,
                                      [materialId]: { ...config, naoCobrarPerda: e.target.checked }
                                    })}
                                    className="w-4 h-4 rounded border-slate-300"
                                  />
                                  Não cobrar perda deste material
                                  <span className="text-xs text-slate-500">(material em estoque — sobra não entra no orçamento)</span>
                                </label>
                              </div>

                              {/* Informações calculadas */}
                              <div className="mt-3 pt-3 border-t border-slate-200 text-xs text-slate-600">
                                <p>
                                  <strong>Área da chapa:</strong> {((config.comprimento * config.altura) / 1000000).toFixed(2)} m²
                                  <span className="mx-2">|</span>
                                  <strong>Custo/chapa:</strong> R$ {((config.comprimento * config.altura / 1000000) * config.custo).toFixed(2)}
                                  <span className="mx-2">|</span>
                                  <strong>Venda/chapa:</strong> R$ {((config.comprimento * config.altura / 1000000) * config.venda).toFixed(2)}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  <div className="mt-4 flex flex-col items-center">
                    <button
                      onClick={salvarMateriaisOrcamento}
                      className={`px-6 py-2.5 rounded-lg font-medium transition-colors ${
                        materiaisSalvosOrcamento
                          ? 'bg-slate-600 text-white cursor-default'
                          : 'bg-slate-700 hover:bg-slate-800 text-white'
                      }`}
                    >
                      {materiaisSalvosOrcamento ? 'Salvo' : 'Salvar Configurações'}
                    </button>
                    <p className="text-xs text-slate-500 mt-3 text-center">
                      Clique para salvar e atualizar o plano de corte
                    </p>
                  </div>
                </div>
            </div>
          </>
        )}

        {/* Tela de Orçamento */}
        {tela === 'orcamento' && orcamentoAtual && (
          <div className="space-y-4">
            <div className="bg-gray-100 rounded-lg shadow-sm p-6">
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
                <p className="text-sm text-gray-500">Criado em: {orcamentoAtual.dataCriacao ? new Date(orcamentoAtual.dataCriacao).toLocaleDateString('pt-BR') : '-'}</p>
              </div>

              {/* Adicionar Ambiente */}
              <div className="mb-6">
                <div className="flex flex-col sm:flex-row gap-3">
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
                      const input = e.target.parentElement.querySelector('input');
                      adicionarAmbiente(input.value);
                      input.value = '';
                    }}
                    className="bg-slate-700 hover:bg-slate-800 text-white px-4 py-2.5 rounded-lg font-medium transition-all hover:shadow-lg hover:shadow-slate-500/50 hover:scale-105 active:scale-95 whitespace-nowrap"
                  >
                    Adicionar Ambiente
                  </button>
                </div>
              </div>

              {/* Título da seção de ambientes */}
              {orcamentoAtual.ambientes.length > 0 && (
                <div className="mt-8 mb-4">
                  <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <span className="w-1 h-6 bg-blue-600 rounded-full"></span>
                    Ambientes do Orçamento
                  </h3>
                  <p className="text-sm text-slate-600 mt-1 ml-5">
                    {orcamentoAtual.ambientes.length} {orcamentoAtual.ambientes.length === 1 ? 'ambiente cadastrado' : 'ambientes cadastrados'}
                  </p>
                </div>
              )}

              {/* Lista de Ambientes */}
              <div className="space-y-4" style={{
                opacity: (mostrandoDetalhePeca || pecaParaExcluir) ? 0 : 1,
                pointerEvents: (mostrandoDetalhePeca || pecaParaExcluir) ? 'none' : 'auto',
                transition: 'opacity 0.3s'
              }}>
                {(() => {
                  const perdaPorAmbiente = calcularPerdaPorAmbiente(orcamentoAtual);
                  return orcamentoAtual.ambientes.map((ambiente, idx) => (
                  <AmbienteCard
                    key={ambiente.id}
                    ambiente={ambiente}
                    indice={idx}
                    materiais={materiais}
                    materialConfigs={orcamentoAtual.materiais || {}}
                    precos={orcamentoAtual.precos || PRECOS_PADRAO}
                    perda={perdaPorAmbiente[ambiente.id] || 0}
                    onAdicionarPeca={(peca) => adicionarPeca(ambiente.id, peca)}
                    onExcluirPeca={(pecaId) => excluirPeca(ambiente.id, pecaId)}
                    onExcluirAmbiente={() => removerAmbiente(ambiente.id)}
                    onRenomearAmbiente={(novoNome) => renomearAmbiente(ambiente.id, novoNome)}
                    onVisualizarPeca={(peca) => {
                      // Preparar cópia da peça para edição
                      const copia = JSON.parse(JSON.stringify(peca));

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

                      // Inicializar acabamentos personalizados
                      if (!copia.acabamentosPersonalizados) {
                        const largura = copia.rotacao === 90 ? copia.altura : copia.largura;
                        const altura = copia.rotacao === 90 ? copia.largura : copia.altura;

                        copia.acabamentosPersonalizados = {};
                        ['esquadria', 'boleado', 'polimento', 'canal'].forEach(tipo => {
                          if (copia.acabamentos[tipo]?.ativo) {
                            let totalMm = 0;
                            const lados = copia.acabamentos[tipo].lados;
                            if (lados.superior) totalMm += largura;
                            if (lados.inferior) totalMm += largura;
                            if (lados.esquerda) totalMm += altura;
                            if (lados.direita) totalMm += altura;
                            copia.acabamentosPersonalizados[tipo] = (totalMm / 1000).toFixed(2);
                          } else {
                            copia.acabamentosPersonalizados[tipo] = '';
                          }
                        });
                      }

                      // Abrir modal já em modo de edição
                      setMostrandoDetalhePeca(peca);
                      setPecaEditada(copia);
                      setModoEdicaoPeca(true);
                    }}
                    onPedirConfirmacaoExclusao={(pecaId, pecaNome) => {
                      setPecaParaExcluir({ pecaId, ambienteId: ambiente.id, pecaNome });
                    }}
                  />
                  ));
                })()}
              </div>
            </div>

            {/* Resumo do Orçamento */}
            {orcamentoAtual.ambientes && orcamentoAtual.ambientes.some(amb => amb.pecas && amb.pecas.length > 0) && (
              <ResumoOrcamento
                key={`resumo-${orcamentoAtual.id}-v${orcamentoVersion}`}
                orcamentoAtual={orcamentoAtual}
                materiais={materiais}
                precos={orcamentoAtual.precos || PRECOS_PADRAO}
                onSalvar={() => {
                  salvarOrcamentoAtual();
                  alert('✅ Orçamento salvo com sucesso!');
                }}
                onSair={() => {
                  setTela('lista');
                  setOrcamentoAtual(null);
              }}
              />
            )}
          </div>
        )}

        {/* Modal Nova Chapa */}
        {mostrarModalNovaChapa && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-100 rounded-lg shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
              <div className="bg-slate-800 px-6 py-4 flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">Adicionar Nova Chapa</h2>
                <button
                  onClick={() => {
                    setMostrarModalNovaChapa(false);
                    setMaterialNovaChapa('');
                  }}
                  className="text-slate-300 hover:text-white transition-colors text-xl font-bold"
                >
                  &times;
                </button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-sm text-slate-600">
                  A chapa vazia será cobrada pelo preço de custo. Ao arrastar peças para ela, a área
                  ocupada passa a ser cobrada pelo preço de venda.
                </p>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Material</label>
                  <select
                    value={materialNovaChapa}
                    onChange={(e) => setMaterialNovaChapa(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
                    autoFocus
                  >
                    {materiais.map((mat) => (
                      <option key={mat.id} value={mat.id}>
                        {mat.nome}
                      </option>
                    ))}
                  </select>
                </div>

                {materialNovaChapa && (() => {
                  const config =
                    orcamentoAtual?.materiais?.[parseInt(materialNovaChapa)] || CONFIG_CHAPA_PADRAO;
                  return (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600 space-y-1">
                      <div className="flex justify-between">
                        <span>Dimensões:</span>
                        <strong className="text-slate-800">
                          {config.comprimento} × {config.altura} mm
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Custo da chapa:</span>
                        <strong className="text-slate-800">
                          {formatBRL(((config.comprimento * config.altura) / 1000000) * config.custo)}
                        </strong>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setMostrarModalNovaChapa(false);
                    setMaterialNovaChapa('');
                  }}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => adicionarChapa(materialNovaChapa)}
                  disabled={!materialNovaChapa}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Criar Chapa
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Otimização de Corte */}
        {mostrarModalOtimizacao && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-100 rounded-lg shadow-2xl max-w-2xl w-full mx-4 border border-slate-200 overflow-hidden">
              <div className="bg-slate-800 px-6 py-4 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">Otimização de Corte</h2>
                <button
                  onClick={() => setMostrarModalOtimizacao(false)}
                  className="text-white hover:bg-slate-700 rounded-full p-1 transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Tipo de Otimização */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-3">
                    Tipo de Otimização
                  </label>
                  <div className="space-y-3">
                    <label className="flex items-start gap-3 p-4 border-2 border-slate-200 rounded-lg cursor-pointer hover:border-slate-400 transition-all">
                      <input
                        type="radio"
                        name="tipoOtimizacao"
                        value="aproveitamento"
                        checked={opcoesOtimizacao.tipoOtimizacao === 'aproveitamento'}
                        onChange={(e) => atualizarOpcoesOtimizacao({ ...opcoesOtimizacao, tipoOtimizacao: e.target.value })}
                        className="mt-1"
                      />
                      <div>
                        <div className="font-semibold text-slate-800">Melhor Aproveitamento</div>
                        <div className="text-sm text-slate-600">Maximiza o uso da chapa, minimizando sobras</div>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 p-4 border-2 border-slate-200 rounded-lg cursor-pointer hover:border-slate-400 transition-all">
                      <input
                        type="radio"
                        name="tipoOtimizacao"
                        value="sequencial"
                        checked={opcoesOtimizacao.tipoOtimizacao === 'sequencial'}
                        onChange={(e) => atualizarOpcoesOtimizacao({ ...opcoesOtimizacao, tipoOtimizacao: e.target.value })}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="font-semibold text-slate-800">Corte Sequencial</div>
                        <div className="text-sm text-slate-600 mb-3">Organiza peças por tamanho para facilitar o corte</div>

                        {opcoesOtimizacao.tipoOtimizacao === 'sequencial' && (
                          <div className="ml-0 mt-3 space-y-2 pl-4 border-l-2 border-slate-400">
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="radio"
                                name="ordenacaoSequencial"
                                value="maiores-menores"
                                checked={opcoesOtimizacao.ordenacaoSequencial === 'maiores-menores'}
                                onChange={(e) => atualizarOpcoesOtimizacao({ ...opcoesOtimizacao, ordenacaoSequencial: e.target.value })}
                              />
                              <span className="text-slate-700">Das maiores para as menores</span>
                            </label>
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="radio"
                                name="ordenacaoSequencial"
                                value="agrupamento-tamanho"
                                checked={opcoesOtimizacao.ordenacaoSequencial === 'agrupamento-tamanho'}
                                onChange={(e) => atualizarOpcoesOtimizacao({ ...opcoesOtimizacao, ordenacaoSequencial: e.target.value })}
                              />
                              <span className="text-slate-700">Agrupamento por mesmo tamanho</span>
                            </label>
                          </div>
                        )}
                      </div>
                    </label>
                  </div>
                </div>

                {/* Configurações de Margem e Disco */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Margem das Laterais (mm)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={opcoesOtimizacao.margemLaterais}
                      onChange={(e) => atualizarOpcoesOtimizacao({ ...opcoesOtimizacao, margemLaterais: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                    />
                    <p className="text-xs text-slate-500 mt-1">Desconto das bordas da chapa</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Espessura do Disco (mm)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="20"
                      step="0.5"
                      value={opcoesOtimizacao.espessuraDisco}
                      onChange={(e) => atualizarOpcoesOtimizacao({ ...opcoesOtimizacao, espessuraDisco: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                    />
                    <p className="text-xs text-slate-500 mt-1">Espaçamento entre peças</p>
                  </div>
                </div>

                {/* Botões */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                  <button
                    onClick={() => setMostrarModalOtimizacao(false)}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={otimizarCorte}
                    className="px-6 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg font-medium transition-all hover:shadow-lg hover:shadow-slate-500/50 hover:scale-105 active:scale-95"
                  >
                    Aplicar Otimização
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Plano de Corte */}
        {tela === 'plano-corte' && orcamentoAtual && (
          <div className="bg-gray-100 rounded-lg shadow-sm p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-bold text-slate-800">Plano de Corte</h2>
                <SaveStatusIndicator
                  status={saveStatus}
                  ultimaGravacao={ultimaGravacao}
                  onRetry={salvarAgora}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={salvarAgora}
                  disabled={saveStatus === 'saving'}
                  className="flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white px-4 py-2.5 rounded-lg font-medium text-sm transition-all hover:shadow-lg hover:shadow-green-500/50 hover:scale-105 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  <Save size={18} />
                  Salvar Plano
                </button>
                <button
                  onClick={() => {
                    setMaterialNovaChapa(materiais[0]?.id?.toString() || '');
                    setMostrarModalNovaChapa(true);
                  }}
                  disabled={materiais.length === 0}
                  className="flex items-center gap-2 bg-slate-700 hover:bg-slate-800 text-white px-4 py-2.5 rounded-lg font-medium text-sm transition-all hover:shadow-lg hover:shadow-slate-500/50 hover:scale-105 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
                  title={materiais.length === 0 ? 'Cadastre um material primeiro' : 'Adicionar nova chapa ao plano'}
                >
                  <span className="text-lg leading-none">+</span>
                  Nova Chapa
                </button>
                <button
                  onClick={() => setMostrarModalOtimizacao(true)}
                  className="flex items-center gap-2 bg-slate-700 hover:bg-slate-800 text-white px-4 py-2.5 rounded-lg font-medium text-sm transition-all hover:shadow-lg hover:shadow-slate-500/50 hover:scale-105 active:scale-95"
                >
                  <Grid size={18} />
                  Otimizar Corte
                </button>
                <button
                  onClick={iniciarPlanoManual}
                  className="flex items-center gap-2 bg-amber-700 hover:bg-amber-800 text-white px-4 py-2.5 rounded-lg font-medium text-sm transition-all hover:shadow-lg hover:shadow-amber-500/50 hover:scale-105 active:scale-95"
                  title="Volta todas as peças para a área de avulsas para montagem manual"
                >
                  ✋
                  Plano Manual
                </button>
                <button
                  onClick={imprimirPlanoCorte}
                  className="flex items-center gap-2 bg-slate-700 hover:bg-slate-800 text-white px-4 py-2.5 rounded-lg font-medium text-sm transition-all hover:shadow-lg hover:shadow-slate-500/50 hover:scale-105 active:scale-95"
                >
                  <FileText size={18} />
                  Imprimir Plano
                </button>
              </div>
            </div>

            {(() => {
              const pecasAvulsas = orcamentoAtual.ambientes
                .flatMap(amb => amb.pecas)
                .filter(p => !p.chapaId);
              const temAvulsas = pecasAvulsas.length > 0;

              return (
                <div className="flex gap-4">
                  {temAvulsas && (
                    <aside
                      className="w-60 shrink-0 sticky top-4 self-start"
                      style={{ height: 'calc(100vh - 160px)' }}
                    >
                      <BandejaPecasAvulsas
                        pecasAvulsas={pecasAvulsas}
                        ambientes={orcamentoAtual.ambientes}
                        materiais={materiais}
                        onMoverParaChapa={moverPeca}
                        onDragPreviewChange={setDragPreview}
                      />
                    </aside>
                  )}
                  <div className="flex-1 min-w-0 grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
                    {orcamentoAtual.chapas.map((chapa, idx) => (
                <PlanoCorteChapa
                  key={chapa.id}
                  chapa={chapa}
                  numero={idx + 1}
                  ambientes={orcamentoAtual.ambientes}
                  onMoverPeca={moverPeca}
                  onMoverPecaNaChapa={moverPecaNaChapa}
                  onGirarPeca={girarPeca}
                  onMoverParaAvulsas={moverPecaParaAvulsas}
                  onExcluirChapa={excluirChapa}
                  todasChapas={orcamentoAtual.chapas}
                  setMostrandoDetalhePeca={setMostrandoDetalhePeca}
                  setModoEdicaoPeca={setModoEdicaoPeca}
                  setPecaEditada={setPecaEditada}
                  espessuraDisco={opcoesOtimizacao.espessuraDisco}
                  margemLaterais={opcoesOtimizacao.margemLaterais}
                  onDragPreviewChange={setDragPreview}
                />
              ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-slate-800 border-t border-slate-700 mt-auto">
        <div className="px-6 py-4">
          <div className="flex items-end justify-between">
            <p className="text-slate-400 text-sm">
              © {new Date().getFullYear()} Pietra Sistema de Orçamento • Versão 1.0
            </p>
            <div className="flex items-end gap-4">
              <span className="text-slate-400 text-sm">Desenvolvido por Caique Lacerda</span>
              <button
                onClick={() => {
                  localStorage.removeItem('pietra_logado');
                  window.location.reload();
                }}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all hover:shadow-lg hover:shadow-red-500/50 hover:scale-105 active:scale-95"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Preview flutuante durante drag entre chapas */}
      {dragPreview && (() => {
        const w = (dragPreview.peca.rotacao === 90 ? dragPreview.peca.altura : dragPreview.peca.largura) * dragPreview.escala;
        const h = (dragPreview.peca.rotacao === 90 ? dragPreview.peca.largura : dragPreview.peca.altura) * dragPreview.escala;
        return (
          <div
            style={{
              position: 'fixed',
              pointerEvents: 'none',
              left: dragPreview.clientX - w / 2,
              top: dragPreview.clientY - h / 2,
              width: w,
              height: h,
              border: '2px dashed #1e40af',
              background: 'rgba(59, 130, 246, 0.35)',
              borderRadius: '2px',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#1e40af',
              fontSize: '11px',
              fontWeight: 'bold',
              fontFamily: 'Arial, sans-serif',
            }}
          >
            {dragPreview.peca.nome || 'Peça'}
          </div>
        );
      })()}
    </div>
  );
};


export { SistemaOrcamentoMarmore };
