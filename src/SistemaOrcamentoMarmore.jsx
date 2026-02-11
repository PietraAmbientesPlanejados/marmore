import { useState, useRef, useEffect, useMemo } from 'react';
import { formatBRL } from './utils/formatters';
import { organizarPecasEmChapas, calcularOrcamentoComDetalhes, calcularCustosPeca } from './utils/calculations';
import { PRECOS_PADRAO, CONFIG_CHAPA_PADRAO } from './constants/config';
import { saveOrcamento } from './utils/database';
import { usePrecos } from './hooks/usePrecos';
import { useMaterials } from './hooks/useMaterials';
import { useBudgets } from './hooks/useBudgets';
import { HomePage } from './pages/HomePage';
import logoImg from '/logo.png';
import { MaterialFormPage } from './pages/MaterialFormPage';

// Ícones (emoji fallback)
const PlusCircle = () => <span>➕</span>;
const Trash2 = () => <span>🗑️</span>;
const Edit2 = () => <span>✏️</span>;
const Save = () => <span>💾</span>;
const X = () => <span>❌</span>;
const Move = () => <span>↔️</span>;
const Grid = () => <span>⊞</span>;
const FileText = () => <span>📄</span>;
const Home = () => <span>🏠</span>;
const Package = () => <span>📦</span>;
const Printer = () => <span>🖨️</span>;


const SistemaOrcamentoMarmore = () => {
  // Hooks customizados
  const { precos, precosSalvos, mostrarPainelPrecos, atualizarPreco, salvarPrecos, setMostrarPainelPrecos } = usePrecos();
  const { materiais, materialEditando, novoMaterial, setMateriais, setMaterialEditando, setNovoMaterial, adicionarMaterial, excluirMaterial, atualizarMaterialSimples } = useMaterials();
  const { orcamentos, orcamentoAtual, mostrarModalNovoOrcamento, nomeNovoOrcamento, setOrcamentos, setOrcamentoAtual, setNomeNovoOrcamento, abrirModalNovoOrcamento, fecharModalNovoOrcamento, criarOrcamento, adicionarAmbiente, removerAmbiente, salvarOrcamentoAtual, atualizarPrecosOrcamento, atualizarConfigMaterial } = useBudgets();

  const [tela, setTela] = useState('lista'); // lista, novo-material, orcamento, plano-corte, editar-material
  const [mostrandoDetalhePeca, setMostrandoDetalhePeca] = useState(null);
  const [modoEdicaoPeca, setModoEdicaoPeca] = useState(false);
  const [pecaEditada, setPecaEditada] = useState(null);
  const [pecaParaExcluir, setPecaParaExcluir] = useState(null);
  const [pecaArrastando, setPecaArrastando] = useState(null);
  const [mostrarPainelPrecosOrcamento, setMostrarPainelPrecosOrcamento] = useState(false);
  const [mostrarPainelMateriaisOrcamento, setMostrarPainelMateriaisOrcamento] = useState(false);
  const [precosTemp, setPrecosTemp] = useState({});
  const [materiaisTemp, setMateriaisTemp] = useState({});
  const [precosSalvosOrcamento, setPrecosSalvosOrcamento] = useState(false);
  const [materiaisSalvosOrcamento, setMateriaisSalvosOrcamento] = useState(false);
  const [orcamentoVersion, setOrcamentoVersion] = useState(0);
  const [menuMobileAberto, setMenuMobileAberto] = useState(false);
  const [mostrarModalOtimizacao, setMostrarModalOtimizacao] = useState(false);
  const [opcoesOtimizacao, setOpcoesOtimizacao] = useState({
    tipoOtimizacao: 'aproveitamento', // 'aproveitamento' ou 'sequencial'
    ordenacaoSequencial: 'maiores-menores', // 'maiores-menores' ou 'agrupamento-tamanho'
    margemLaterais: 4, // margem das laterais da chapa em mm
    espessuraDisco: 4 // espessura do disco de corte em mm (substitui o espacamento padrão)
  });

  // Auto-salvar orçamento atual no banco quando ele muda
  const orcamentoAtualRef = useRef(null);
  useEffect(() => {
    if (!orcamentoAtual) return;
    // Evitar salvar na primeira renderização (carregamento)
    if (orcamentoAtualRef.current === null) {
      orcamentoAtualRef.current = orcamentoAtual.id;
      return;
    }
    // Salvar no banco de dados
    saveOrcamento(orcamentoAtual).catch(err =>
      console.error('Erro ao auto-salvar orçamento:', err)
    );
  }, [orcamentoAtual]);

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
    const novoOrc = criarOrcamento(nomeNovoOrcamento);
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
      const comp = Math.round(peca.largura);
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
  // Wrapper para organizar peças usando a função do utils
  const organizarPecasLocalmente = (orcamento) => {
    const orcamentoAtualizado = organizarPecasEmChapas(orcamento, materiais);
    setOrcamentoAtual(orcamentoAtualizado);

    // Sincronizar com a lista de orçamentos
    setOrcamentos(prev => prev.map(orc =>
      orc.id === orcamento.id ? orcamentoAtualizado : orc
    ));
  };

  // Otimizar corte com opções personalizadas
  const otimizarCorte = () => {
    if (!orcamentoAtual) return;

    // Coletar todas as peças
    const todasPecas = orcamentoAtual.ambientes.flatMap(amb => amb.pecas);

    // Ordenar peças baseado no tipo de otimização
    let pecasOrdenadas;

    if (opcoesOtimizacao.tipoOtimizacao === 'sequencial') {
      if (opcoesOtimizacao.ordenacaoSequencial === 'maiores-menores') {
        // Ordenar das maiores para as menores (por área)
        pecasOrdenadas = [...todasPecas].sort((a, b) => {
          const areaA = a.largura * a.altura;
          const areaB = b.largura * b.altura;
          return areaB - areaA; // Decrescente
        });
      } else {
        // Agrupamento por tamanho (agrupar peças com mesmas dimensões)
        const grupos = {};
        todasPecas.forEach(peca => {
          const chave = `${peca.largura}x${peca.altura}`;
          if (!grupos[chave]) {
            grupos[chave] = [];
          }
          grupos[chave].push(peca);
        });

        // Ordenar grupos por tamanho (maior para menor) e concatenar
        pecasOrdenadas = Object.keys(grupos)
          .sort((a, b) => {
            const [c1, a1] = a.split('x').map(Number);
            const [c2, a2] = b.split('x').map(Number);
            return (c2 * a2) - (c1 * a1);
          })
          .flatMap(chave => grupos[chave]);
      }
    } else {
      // Melhor aproveitamento - ordenar por área (maiores primeiro)
      pecasOrdenadas = [...todasPecas].sort((a, b) => {
        const areaA = a.largura * a.altura;
        const areaB = b.largura * b.altura;
        return areaB - areaA;
      });
    }

    // Limpar posições antigas das peças ordenadas
    const pecasLimpas = pecasOrdenadas.map(peca => {
      const { posX, posY, chapaId, ...pecaSemPosicao } = peca;
      return pecaSemPosicao;
    });

    // Reorganizar em chapas usando a ordem correta
    const chapas = [];
    const espacamento = opcoesOtimizacao.espessuraDisco;
    const margem = opcoesOtimizacao.margemLaterais;

    // Agrupar peças por material mantendo a ordem
    const pecasPorMaterial = {};
    pecasLimpas.forEach(peca => {
      if (!pecasPorMaterial[peca.materialId]) {
        pecasPorMaterial[peca.materialId] = [];
      }
      pecasPorMaterial[peca.materialId].push(peca);
    });

    // Para cada material, organizar em chapas na ordem
    Object.keys(pecasPorMaterial).forEach(materialId => {
      const material = materiais.find(m => m.id === parseInt(materialId));
      if (!material) return;

      const materialConfig = orcamentoAtual.materiais?.[parseInt(materialId)] || {
        comprimento: 3000,
        altura: 2000,
        custo: 250,
        venda: 333.33
      };

      const pecas = pecasPorMaterial[materialId];

      // Rastrear última chapa usada por cada tamanho (para agrupamento)
      const ultimaChapaPorTamanho = {};

      pecas.forEach(peca => {
        let colocada = false;
        const chaveTamanho = `${peca.largura}x${peca.altura}`;

        const modoAgrupamento = opcoesOtimizacao.ordenacaoSequencial === 'agrupamento-tamanho';

        // Se for agrupamento por tamanho, tentar primeiro na última chapa onde esse tamanho foi colocado
        if (modoAgrupamento && ultimaChapaPorTamanho[chaveTamanho]) {
          const chapaPreferida = chapas.find(c => c.id === ultimaChapaPorTamanho[chaveTamanho]);
          if (chapaPreferida) {
            const pos = encontrarPosicaoNaChapaComOpcoes(chapaPreferida, peca, materialConfig, espacamento, margem, opcoesOtimizacao.tipoOtimizacao, modoAgrupamento);
            if (pos) {
              peca.chapaId = chapaPreferida.id;
              peca.posX = pos.x;
              peca.posY = pos.y;
              chapaPreferida.pecas.push(peca);
              colocada = true;
            }
          }
        }

        // Se não colocou ainda, tentar em qualquer chapa existente
        if (!colocada) {
          for (let chapa of chapas.filter(c => c.materialId === parseInt(materialId))) {
            const pos = encontrarPosicaoNaChapaComOpcoes(chapa, peca, materialConfig, espacamento, margem, opcoesOtimizacao.tipoOtimizacao, modoAgrupamento);
            if (pos) {
              peca.chapaId = chapa.id;
              peca.posX = pos.x;
              peca.posY = pos.y;
              chapa.pecas.push(peca);
              colocada = true;
              // Atualizar última chapa para este tamanho
              if (modoAgrupamento) {
                ultimaChapaPorTamanho[chaveTamanho] = chapa.id;
              }
              break;
            }
          }
        }

        // Se não coube, criar nova chapa
        if (!colocada) {
          const novaChapa = {
            id: Date.now() + Math.random(),
            materialId: parseInt(materialId),
            material: { ...material, ...materialConfig },
            pecas: []
          };

          peca.chapaId = novaChapa.id;
          peca.posX = margem;
          peca.posY = margem;
          novaChapa.pecas.push(peca);
          chapas.push(novaChapa);

          // Registrar última chapa para este tamanho
          if (opcoesOtimizacao.ordenacaoSequencial === 'agrupamento-tamanho') {
            ultimaChapaPorTamanho[chaveTamanho] = novaChapa.id;
          }
        }
      });
    });

    // Atualizar ambientes com as peças posicionadas
    const ambientesAtualizados = orcamentoAtual.ambientes.map(amb => ({
      ...amb,
      pecas: amb.pecas.map(p => {
        const pecaAtualizada = pecasLimpas.find(pl => pl.id === p.id);
        return pecaAtualizada || p;
      })
    }));

    const orcamentoOtimizado = {
      ...orcamentoAtual,
      chapas,
      ambientes: ambientesAtualizados
    };

    setOrcamentoAtual(orcamentoOtimizado);
    setOrcamentos(prev => prev.map(orc =>
      orc.id === orcamentoAtual.id ? orcamentoOtimizado : orc
    ));

    setMostrarModalOtimizacao(false);
  };

  // Organizar peças em chapas com opções personalizadas de margem e espaçamento
  const organizarPecasEmChapasComOpcoes = (orcamento, materiais, espacamento, margem, pecasOrdenadas = null, tipoOtimizacao = 'sequencial') => {
    // Usar a ordem das peças passada ou coletar dos ambientes
    const todasPecas = pecasOrdenadas || orcamento.ambientes.flatMap(amb => amb.pecas);
    const chapas = [];

    // Agrupar por material mantendo a ordem
    const pecasPorMaterial = {};
    todasPecas.forEach(peca => {
      if (!pecasPorMaterial[peca.materialId]) {
        pecasPorMaterial[peca.materialId] = [];
      }
      pecasPorMaterial[peca.materialId].push(peca);
    });

    // Para cada material, organizar em chapas (mantendo a ordem das peças)
    Object.keys(pecasPorMaterial).forEach(materialId => {
      const material = materiais.find(m => m.id === parseInt(materialId));
      if (!material) return;

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
          const pos = encontrarPosicaoNaChapaComOpcoes(chapa, peca, materialConfig, espacamento, margem, tipoOtimizacao);
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
            material: { ...material, ...materialConfig },
            pecas: []
          };

          peca.chapaId = novaChapa.id;
          peca.posX = margem;
          peca.posY = margem;
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

  // Shelf Algorithm - Organiza peças em linhas horizontais (ideal para corte sequencial)
  const encontrarPosicaoShelf = (chapa, peca, materialConfig, espacamento, margem, modoAgrupamento = false) => {
    const larguraChapa = materialConfig.comprimento;
    const alturaChapa = materialConfig.altura;
    const pecaLargura = peca.rotacao === 90 ? peca.altura : peca.largura;
    const pecaAltura = peca.rotacao === 90 ? peca.largura : peca.altura;

    if (chapa.pecas.length === 0) {
      return { x: margem, y: margem };
    }

    // Criar "prateleiras" - linhas horizontais de peças
    const shelves = [];

    chapa.pecas.forEach(p => {
      const pLargura = p.rotacao === 90 ? p.altura : p.largura;
      const pAltura = p.rotacao === 90 ? p.largura : p.altura;

      // Encontrar shelf existente ou criar nova
      let shelf = shelves.find(s => Math.abs(p.posY - s.y) < 1);

      if (!shelf) {
        shelf = {
          y: p.posY,
          altura: 0,
          xFinal: margem,
          tamanho: `${p.largura}x${p.altura}` // Rastrear tamanho das peças na shelf
        };
        shelves.push(shelf);
      }

      shelf.altura = Math.max(shelf.altura, pAltura);
      shelf.xFinal = Math.max(shelf.xFinal, p.posX + pLargura);
    });

    // Ordenar shelves por Y
    shelves.sort((a, b) => a.y - b.y);

    const tamanhoAtual = `${peca.largura}x${peca.altura}`;

    // Tentar encaixar na shelf existente
    for (const shelf of shelves) {
      // Se modo agrupamento, só aceitar shelf com mesmo tamanho
      if (modoAgrupamento && shelf.tamanho !== tamanhoAtual) {
        continue;
      }

      const x = shelf.xFinal + espacamento;
      const y = shelf.y;

      if (x + pecaLargura + margem <= larguraChapa && pecaAltura <= shelf.altura + 1) {
        return { x, y };
      }
    }

    // Criar nova shelf abaixo
    if (shelves.length > 0) {
      const ultimaShelf = shelves[shelves.length - 1];
      const novaY = ultimaShelf.y + ultimaShelf.altura + espacamento;

      if (novaY + pecaAltura + margem <= alturaChapa) {
        return { x: margem, y: novaY };
      }
    }

    return null;
  };

  // Bottom-Left Algorithm - Melhor aproveitamento
  const encontrarPosicaoBottomLeft = (chapa, peca, materialConfig, espacamento, margem) => {
    const larguraChapa = materialConfig.comprimento;
    const alturaChapa = materialConfig.altura;
    const pecaLargura = peca.rotacao === 90 ? peca.altura : peca.largura;
    const pecaAltura = peca.rotacao === 90 ? peca.largura : peca.altura;

    if (chapa.pecas.length === 0) {
      return { x: margem, y: margem };
    }

    // Tentar posições de baixo para cima, esquerda para direita
    const step = 10;
    for (let y = margem; y + pecaAltura + margem <= alturaChapa; y += step) {
      for (let x = margem; x + pecaLargura + margem <= larguraChapa; x += step) {
        // Verificar colisão
        const temColisao = chapa.pecas.some(p => {
          const pLargura = p.rotacao === 90 ? p.altura : p.largura;
          const pAltura = p.rotacao === 90 ? p.largura : p.altura;

          const distanciaX = Math.abs((x + pecaLargura / 2) - (p.posX + pLargura / 2));
          const distanciaY = Math.abs((y + pecaAltura / 2) - (p.posY + pAltura / 2));

          return distanciaX < (pecaLargura + pLargura) / 2 + espacamento &&
                 distanciaY < (pecaAltura + pAltura) / 2 + espacamento;
        });

        if (!temColisao) {
          return { x, y };
        }
      }
    }

    return null;
  };

  // Wrapper que escolhe o algoritmo
  const encontrarPosicaoNaChapaComOpcoes = (chapa, peca, materialConfig, espacamento, margem, tipoOtimizacao = 'sequencial', modoAgrupamento = false) => {
    if (tipoOtimizacao === 'sequencial') {
      return encontrarPosicaoShelf(chapa, peca, materialConfig, espacamento, margem, modoAgrupamento);
    } else {
      return encontrarPosicaoBottomLeft(chapa, peca, materialConfig, espacamento, margem);
    }
  };

  // Salvar preços do orçamento e reorganizar chapas
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

  // Atualizar dimensões de uma peça
  const atualizarDimensoesPeca = (pecaId, campo, valor) => {
    const ambientesAtualizados = orcamentoAtual.ambientes.map(amb => ({
      ...amb,
      pecas: amb.pecas.map(p =>
        p.id === pecaId ? { ...p, [campo]: parseInt(valor) || 0 } : p
      )
    }));

    const novoOrcamento = { ...orcamentoAtual, ambientes: ambientesAtualizados };
    setOrcamentoAtual(novoOrcamento);

    // Sincronizar com a lista de orçamentos
    setOrcamentos(prev => prev.map(orc =>
      orc.id === orcamentoAtual.id ? novoOrcamento : orc
    ));

    // Reorganizar chapas após mudança de dimensão
    setTimeout(() => {
      organizarPecasLocalmente(novoOrcamento);
    }, 500); // Delay para permitir múltiplas edições antes de reorganizar
  };

  // Encontrar melhor posição disponível para a peça na chapa
  const encontrarMelhorPosicao = (peca, chapaDestino) => {
    const larguraPeca = peca.rotacao === 90 ? peca.altura : peca.largura;
    const alturaPeca = peca.rotacao === 90 ? peca.largura : peca.altura;
    const espacamento = 4;

    const larguraChapa = chapaDestino.material.comprimento;
    const alturaChapa = chapaDestino.material.altura;

    // Verificar se a peça é maior que a chapa
    if (larguraPeca + espacamento * 2 > larguraChapa ||
        alturaPeca + espacamento * 2 > alturaChapa) {
      return null;
    }

    // Tentar posições em um grid de 10mm para performance
    const incremento = 10;

    for (let y = espacamento; y + alturaPeca + espacamento <= alturaChapa; y += incremento) {
      for (let x = espacamento; x + larguraPeca + espacamento <= larguraChapa; x += incremento) {
        const sobrepoe = chapaDestino.pecas.some(p => {
          if (p.id === peca.id) return false;

          const larguraOutra = p.rotacao === 90 ? p.altura : p.largura;
          const alturaOutra = p.rotacao === 90 ? p.largura : p.altura;

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
          return { x, y };
        }
      }
    }

    return null;
  };

  // Mover peça entre chapas
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

    const chapaDestino = orcamentoAtual.chapas.find(c => c.id === novaChapaId);
    if (!chapaDestino) {
      alert('❌ Erro: Chapa de destino não encontrada.');
      return;
    }

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
        p.id === pecaId ? { ...p, chapaId: novaChapaId, posX: posicao.x, posY: posicao.y } : p
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

    alert('✅ Peça movida com sucesso!\n\n📍 Posição: X=' + Math.round(posicao.x) + 'mm, Y=' + Math.round(posicao.y) + 'mm');
  };

  // Excluir chapa vazia
  const excluirChapa = (chapaId) => {
    const chapaParaExcluir = orcamentoAtual.chapas.find(c => c.id === chapaId);

    // Verificar se a chapa está realmente vazia
    if (chapaParaExcluir && chapaParaExcluir.pecas.length > 0) {
      alert('❌ Esta chapa não pode ser excluída pois contém peças!');
      return;
    }

    // Remover a chapa da lista
    const chapasAtualizadas = orcamentoAtual.chapas.filter(c => c.id !== chapaId);

    const orcamentoAtualizado = {
      ...orcamentoAtual,
      chapas: chapasAtualizadas
    };

    setOrcamentoAtual(orcamentoAtualizado);

    // Sincronizar com a lista de orçamentos
    setOrcamentos(prev => prev.map(orc =>
      orc.id === orcamentoAtual.id ? orcamentoAtualizado : orc
    ));

    alert('✅ Chapa vazia excluída com sucesso!');
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-400">
      {/* Header */}
      <header className={`bg-slate-800 shadow-md border-b border-slate-700 ${(tela === 'orcamento' || tela === 'plano-corte') && orcamentoAtual ? 'mb-0' : 'mb-4'}`}>
        <div className="px-6 py-6">
          <div
            className="flex items-center gap-4 group cursor-pointer"
            onClick={() => {
              setTela('lista');
              setOrcamentoAtual(null);
            }}
          >
            <div className="w-20 h-20 rounded-lg overflow-hidden border-2 border-slate-600 bg-gray-100 transition-all duration-500 group-hover:rotate-180 group-hover:scale-110">
              <img src={logoImg} alt="Pietra" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold text-white mb-1 transition-all duration-300 group-hover:bg-gradient-to-r group-hover:from-slate-200 group-hover:via-white group-hover:to-slate-200 group-hover:bg-clip-text group-hover:text-transparent group-hover:scale-105">
                Pietra Sistema de Orçamento
              </h1>
              <p className="text-slate-400 text-base transition-colors duration-300 group-hover:text-slate-300">Mármore e Granito</p>
            </div>
          </div>
        </div>

        {/* Barra de Navegação - Visível na tela de orçamento e plano de corte */}
        {(tela === 'orcamento' || tela === 'plano-corte') && orcamentoAtual && (
            <div>
              {/* Botão Menu Mobile */}
              <button
                onClick={() => setMenuMobileAberto(!menuMobileAberto)}
                className="md:hidden w-full flex items-center justify-center gap-2 bg-slate-700 text-white px-4 py-3 hover:bg-slate-800 font-medium transition-all"
              >
                <span className="text-xl">{menuMobileAberto ? '✕' : '☰'}</span>
                <span>Menu</span>
              </button>

              {/* Barra de Navegação - Botões grudados */}
              <div className={`${menuMobileAberto ? 'flex' : 'hidden'} md:flex flex-col md:flex-row`}>
                {tela === 'orcamento' ? (
                  <button
                    onClick={() => {
                      setTela('plano-corte');
                      setMenuMobileAberto(false);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 bg-slate-700 text-white px-4 py-3 hover:bg-slate-800 font-medium transition-all border-r border-slate-600"
                  >
                    Plano de Corte
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setTela('orcamento');
                      setMenuMobileAberto(false);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 bg-slate-700 text-white px-4 py-3 hover:bg-slate-800 font-medium transition-all border-r border-slate-600"
                  >
                    Voltar ao Orçamento
                  </button>
                )}

                <button
                  onClick={() => {
                    gerarEtiquetasPDF();
                    setMenuMobileAberto(false);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 bg-slate-700 text-white px-4 py-3 hover:bg-slate-800 font-medium transition-all border-r border-slate-600"
                >
                  Gerar Etiquetas
                </button>

                <button
                  onClick={() => {
                    setMostrarPainelPrecosOrcamento(!mostrarPainelPrecosOrcamento);
                    setMenuMobileAberto(false);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 bg-slate-700 text-white px-4 py-3 hover:bg-slate-800 font-medium transition-all border-r border-slate-600"
                >
                  Configurar Preços
                </button>

                <button
                  onClick={() => {
                    setMostrarPainelMateriaisOrcamento(!mostrarPainelMateriaisOrcamento);
                    setMenuMobileAberto(false);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 bg-slate-700 text-white px-4 py-3 hover:bg-slate-800 font-medium transition-all"
                >
                  Configurar Materiais
                </button>
              </div>
            </div>
          )}
      </header>

      <div className="px-8 py-3">
        {/* Espaçamento após barra de navegação */}
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
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4" onClick={() => {
            setMostrandoDetalhePeca(null);
            setModoEdicaoPeca(false);
            setPecaEditada(null);
          }}>
            <div className="bg-gray-100 rounded-lg shadow-lg w-full max-w-2xl border border-slate-200 max-h-[85vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
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
                                  <span className="text-xs text-slate-500 ml-1">(R$ {precos[tipo]}/m)</span>
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
                                    <strong>Custo:</strong> {((parseFloat(pecaEditada.acabamentosPersonalizados[tipo]) || 0) * precos[tipo]).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
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
                            const valor = metros * precos[tipo];
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
                setOrcamentos(orcamentos.filter(o => o.id !== orcId));
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
                setOrcamentos([...orcamentos, novoOrc]);
                alert('✅ Orçamento duplicado com sucesso!');
              }
            }}
            calcularOrcamento={(orc) => calcularOrcamentoComDetalhes(orc, materiais, orc.precos || PRECOS_PADRAO)}
            formatBRL={formatBRL}
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
            {mostrarPainelPrecosOrcamento && (
                <div className="mb-6 bg-slate-50 border border-slate-300 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Configuração de Preços deste Orçamento</h3>
                  <p className="text-sm text-slate-600 mb-4">
                    Estes preços são específicos deste orçamento e não afetam outros orçamentos.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

                    {/* Botão Salvar */}
                    <div className="bg-gray-100 p-4 rounded-lg border border-slate-200 flex flex-col justify-center items-center">
                      <button
                        onClick={salvarPrecosOrcamento}
                        className={`px-6 py-2.5 rounded-lg font-medium transition-colors w-full ${
                          precosSalvosOrcamento
                            ? 'bg-slate-600 text-white cursor-default'
                            : 'bg-slate-700 hover:bg-slate-800 text-white'
                        }`}
                      >
                        {precosSalvosOrcamento ? 'Salvo' : 'Salvar Preços'}
                      </button>
                      <p className="text-xs text-slate-500 mt-3 text-center">
                        Clique para salvar e atualizar o plano de corte
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Painel de Configuração de Materiais do Orçamento */}
              {mostrarPainelMateriaisOrcamento && (
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
              )}
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
                {orcamentoAtual.ambientes.map(ambiente => (
                  <AmbienteCard
                    key={ambiente.id}
                    ambiente={ambiente}
                    materiais={materiais}
                    materialConfigs={orcamentoAtual.materiais || {}}
                    precos={orcamentoAtual.precos || PRECOS_PADRAO}
                    onAdicionarPeca={(peca) => adicionarPeca(ambiente.id, peca)}
                    onExcluirPeca={(pecaId) => excluirPeca(ambiente.id, pecaId)}
                    onExcluirAmbiente={() => removerAmbiente(ambiente.id)}
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
                ))}
              </div>
            </div>

            {/* Resumo do Orçamento */}
            {orcamentoAtual.ambientes && orcamentoAtual.ambientes.length > 0 && (
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
                        onChange={(e) => setOpcoesOtimizacao({ ...opcoesOtimizacao, tipoOtimizacao: e.target.value })}
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
                        onChange={(e) => setOpcoesOtimizacao({ ...opcoesOtimizacao, tipoOtimizacao: e.target.value })}
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
                                onChange={(e) => setOpcoesOtimizacao({ ...opcoesOtimizacao, ordenacaoSequencial: e.target.value })}
                              />
                              <span className="text-slate-700">Das maiores para as menores</span>
                            </label>
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="radio"
                                name="ordenacaoSequencial"
                                value="agrupamento-tamanho"
                                checked={opcoesOtimizacao.ordenacaoSequencial === 'agrupamento-tamanho'}
                                onChange={(e) => setOpcoesOtimizacao({ ...opcoesOtimizacao, ordenacaoSequencial: e.target.value })}
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
                      onChange={(e) => setOpcoesOtimizacao({ ...opcoesOtimizacao, margemLaterais: parseFloat(e.target.value) || 0 })}
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
                      onChange={(e) => setOpcoesOtimizacao({ ...opcoesOtimizacao, espessuraDisco: parseFloat(e.target.value) || 0 })}
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
              <h2 className="text-2xl font-bold text-slate-800">Plano de Corte</h2>
              <div className="flex gap-3">
                <button
                  onClick={() => setMostrarModalOtimizacao(true)}
                  className="flex items-center gap-2 bg-slate-700 hover:bg-slate-800 text-white px-4 py-2.5 rounded-lg font-medium text-sm transition-all hover:shadow-lg hover:shadow-slate-500/50 hover:scale-105 active:scale-95"
                >
                  <Grid size={18} />
                  Otimizar Corte
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

            <div className="space-y-6">
              {orcamentoAtual.chapas.map((chapa, idx) => (
                <PlanoCorteChapa
                  key={chapa.id}
                  chapa={chapa}
                  numero={idx + 1}
                  totalChapas={orcamentoAtual.chapas.length}
                  orcamentoNome={orcamentoAtual.nome || 'Orçamento'}
                  onMoverPeca={moverPeca}
                  onMoverPecaNaChapa={moverPecaNaChapa}
                  onExcluirChapa={excluirChapa}
                  onGirarPeca={girarPeca}
                  onAtualizarDimensoes={atualizarDimensoesPeca}
                  pecaArrastando={pecaArrastando}
                  setPecaArrastando={setPecaArrastando}
                  todasChapas={orcamentoAtual.chapas}
                  setMostrandoDetalhePeca={setMostrandoDetalhePeca}
                  setModoEdicaoPeca={setModoEdicaoPeca}
                  setPecaEditada={setPecaEditada}
                  espessuraDisco={opcoesOtimizacao.espessuraDisco}
                  margemLaterais={opcoesOtimizacao.margemLaterais}
                />
              ))}
            </div>
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
    </div>
  );
};

// Componente de Card de Ambiente
const AmbienteCard = ({ ambiente, materiais, materialConfigs, precos, onAdicionarPeca, onExcluirPeca, onExcluirAmbiente, onVisualizarPeca, onPedirConfirmacaoExclusao }) => {
  const [expandido, setExpandido] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [novaPeca, setNovaPeca] = useState({
    nome: '',
    altura: '',
    largura: '',
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

  // Calcular subtotais do ambiente
  const subtotais = ambiente.pecas.reduce((acc, peca) => {
    const materialConfig = materialConfigs[peca.materialId] || {
      comprimento: 3000,
      altura: 2000,
      custo: 250,
      venda: 333.33
    };
    const custosPeca = calcularCustosPeca(peca, materialConfig, precos);
    return {
      material: acc.material + custosPeca.custoMaterial,
      acabamentos: acc.acabamentos + custosPeca.acabamentos,
      recortes: acc.recortes + custosPeca.recortes,
      total: acc.total + custosPeca.total,
      area: acc.area + ((peca.altura * peca.largura) / 1000000) * (peca.quantidade || 1)
    };
  }, { material: 0, acabamentos: 0, recortes: 0, total: 0, area: 0 });

  return (
    <div className="border-2 border-teal-200 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-all" style={{ position: 'relative', zIndex: 1, borderLeft: '6px solid #14b8a6' }}>
      <div
        className="bg-gradient-to-r from-teal-50 to-teal-100 p-4 cursor-pointer hover:from-teal-100 hover:to-teal-200 transition-all border-b border-teal-100"
        onClick={() => setExpandido(!expandido)}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3 flex-1">
            <h3 className="text-base font-semibold text-slate-800">{ambiente.nome}</h3>
            {onExcluirAmbiente && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`Tem certeza que deseja excluir o ambiente "${ambiente.nome}"?\n\nTodas as peças deste ambiente serão perdidas.`)) {
                    onExcluirAmbiente();
                  }
                }}
                className="text-slate-400 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded-lg transition-all text-xs font-medium"
                title="Excluir ambiente"
              >
                Excluir
              </button>
            )}
          </div>
          <span className="text-xs text-slate-500">{ambiente.pecas.length} peças • {subtotais.area.toFixed(2)}m²</span>
        </div>

        {/* Resumo no Card Fechado */}
        {ambiente.pecas.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="bg-teal-50 rounded p-2 border border-teal-300">
              <div className="text-xs text-slate-500 text-center">Material</div>
              <div className="text-sm font-semibold text-slate-700 text-center">{formatBRL(subtotais.material)}</div>
            </div>
            <div className="bg-teal-50 rounded p-2 border border-teal-300">
              <div className="text-xs text-slate-500 text-center">Acabamentos</div>
              <div className="text-sm font-semibold text-slate-700 text-center">{formatBRL(subtotais.acabamentos)}</div>
            </div>
            <div className="bg-teal-50 rounded p-2 border border-teal-300">
              <div className="text-xs text-slate-500 text-center">Recortes</div>
              <div className="text-sm font-semibold text-slate-700 text-center">{formatBRL(subtotais.recortes)}</div>
            </div>
            <div className="bg-teal-50 rounded p-2 border border-teal-300">
              <div className="text-xs text-slate-500 text-center">Total</div>
              <div className="text-sm font-bold text-slate-900 text-center">{formatBRL(subtotais.total)}</div>
            </div>
          </div>
        )}
      </div>

      {expandido && (
        <div className="p-4 space-y-4 max-h-[800px] overflow-y-auto">
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
            <div className="border border-slate-300 rounded-lg p-6 bg-slate-50">
              <h4 className="font-semibold mb-4 text-slate-800 text-lg">Nova Peça</h4>

              {/* Layout com duas colunas: Formulário e Preview */}
              <div className="grid lg:grid-cols-[1fr_320px] gap-6">
                {/* Coluna Esquerda: Formulário */}
                <div>
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
                  <label className="block text-xs font-medium mb-1">Largura (mm)</label>
                  <input
                    type="number"
                    value={novaPeca.largura}
                    onChange={(e) => setNovaPeca({ ...novaPeca, largura: e.target.value })}
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
                <button
                  type="button"
                  onClick={() => {
                    setNovaPeca({
                      ...novaPeca,
                      acabamentos: {
                        ...novaPeca.acabamentos,
                        esquadria: { ...novaPeca.acabamentos.esquadria, ativo: !novaPeca.acabamentos.esquadria.ativo }
                      }
                    });
                  }}
                  className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                    novaPeca.acabamentos.esquadria.ativo
                      ? 'bg-red-500 border-red-600 text-white shadow-md'
                      : 'bg-gray-100 border-slate-300 text-slate-700 hover:border-red-400 hover:bg-red-50'
                  }`}
                >
                  Esquadria
                  <div className="text-xs opacity-80 mt-0.5">R$ {precos.esquadria}/m</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setNovaPeca({
                      ...novaPeca,
                      acabamentos: {
                        ...novaPeca.acabamentos,
                        boleado: { ...novaPeca.acabamentos.boleado, ativo: !novaPeca.acabamentos.boleado.ativo }
                      }
                    });
                  }}
                  className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                    novaPeca.acabamentos.boleado.ativo
                      ? 'bg-yellow-500 border-yellow-600 text-white shadow-md'
                      : 'bg-gray-100 border-slate-300 text-slate-700 hover:border-yellow-400 hover:bg-yellow-50'
                  }`}
                >
                  Boleado
                  <div className="text-xs opacity-80 mt-0.5">R$ {precos.boleado}/m</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setNovaPeca({
                      ...novaPeca,
                      acabamentos: {
                        ...novaPeca.acabamentos,
                        polimento: { ...novaPeca.acabamentos.polimento, ativo: !novaPeca.acabamentos.polimento.ativo }
                      }
                    });
                  }}
                  className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                    novaPeca.acabamentos.polimento.ativo
                      ? 'bg-blue-500 border-blue-600 text-white shadow-md'
                      : 'bg-gray-100 border-slate-300 text-slate-700 hover:border-blue-400 hover:bg-blue-50'
                  }`}
                >
                  Polimento
                  <div className="text-xs opacity-80 mt-0.5">R$ {precos.polimento}/m</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setNovaPeca({
                      ...novaPeca,
                      acabamentos: {
                        ...novaPeca.acabamentos,
                        canal: { ...novaPeca.acabamentos.canal, ativo: !novaPeca.acabamentos.canal.ativo }
                      }
                    });
                  }}
                  className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                    novaPeca.acabamentos.canal.ativo
                      ? 'bg-orange-500 border-orange-600 text-white shadow-md'
                      : 'bg-gray-100 border-slate-300 text-slate-700 hover:border-orange-400 hover:bg-orange-50'
                  }`}
                >
                  Canal
                  <div className="text-xs opacity-80 mt-0.5">R$ {precos.canal}/m</div>
                </button>
              </div>

              {/* Preview Unificado de Acabamentos */}
              {(novaPeca.acabamentos.esquadria.ativo ||
                novaPeca.acabamentos.boleado.ativo ||
                novaPeca.acabamentos.polimento.ativo ||
                novaPeca.acabamentos.canal.ativo) && (
                <div className="mb-3 bg-gray-100 border border-slate-300 rounded-lg p-4">
                  <h6 className="font-semibold text-sm mb-3 text-slate-700">Selecione os lados para cada acabamento:</h6>

                  <div className="flex flex-wrap justify-center gap-4">
                    {[
                      { tipo: 'esquadria', label: 'Esquadria', cor: 'red', emoji: '🔴' },
                      { tipo: 'boleado', label: 'Boleado', cor: 'yellow', emoji: '🟡' },
                      { tipo: 'polimento', label: 'Polimento', cor: 'blue', emoji: '🔵' },
                      { tipo: 'canal', label: 'Canal', cor: 'orange', emoji: '🟠' }
                    ].filter(item => novaPeca.acabamentos[item.tipo].ativo).map(item => {
                      const coresBg = { red: 'bg-red-100 border-red-400 text-red-700', yellow: 'bg-yellow-100 border-yellow-400 text-yellow-700', blue: 'bg-blue-100 border-blue-400 text-blue-700', orange: 'bg-orange-100 border-orange-400 text-orange-700' };
                      const coresAtivo = { red: 'bg-red-500 text-white border-red-600', yellow: 'bg-yellow-500 text-white border-yellow-600', blue: 'bg-blue-500 text-white border-blue-600', orange: 'bg-orange-500 text-white border-orange-600' };
                      const coresInativo = { red: 'bg-gray-100 text-red-400 border-red-200 hover:bg-red-50', yellow: 'bg-gray-100 text-yellow-500 border-yellow-200 hover:bg-yellow-50', blue: 'bg-gray-100 text-blue-400 border-blue-200 hover:bg-blue-50', orange: 'bg-gray-100 text-orange-400 border-orange-200 hover:bg-orange-50' };

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
                        <div key={item.tipo} className={`rounded-lg p-3 border w-56 ${coresBg[item.cor]}`}>
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
                                className="absolute bg-gray-100 border-2 border-gray-300 rounded flex items-center justify-center"
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
                    value={novaPeca.cuba || ''}
                    onChange={(e) => setNovaPeca({ ...novaPeca, cuba: parseInt(e.target.value) || 0 })}
                    className="w-full border rounded px-2 py-1 text-sm"
                    min="0"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1">Cuba Esculpida</label>
                  <input
                    type="number"
                    value={novaPeca.cubaEsculpida || ''}
                    onChange={(e) => setNovaPeca({ ...novaPeca, cubaEsculpida: parseInt(e.target.value) || 0 })}
                    className="w-full border rounded px-2 py-1 text-sm"
                    min="0"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1">Cooktop</label>
                  <input
                    type="number"
                    value={novaPeca.cooktop || ''}
                    onChange={(e) => setNovaPeca({ ...novaPeca, cooktop: parseInt(e.target.value) || 0 })}
                    className="w-full border rounded px-2 py-1 text-sm"
                    min="0"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1">Recorte</label>
                  <input
                    type="number"
                    value={novaPeca.recorte || ''}
                    onChange={(e) => setNovaPeca({ ...novaPeca, recorte: parseInt(e.target.value) || 0 })}
                    className="w-full border rounded px-2 py-1 text-sm"
                    min="0"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1">Pés</label>
                  <input
                    type="number"
                    value={novaPeca.pes || ''}
                    onChange={(e) => setNovaPeca({ ...novaPeca, pes: parseInt(e.target.value) || 0 })}
                    className="w-full border rounded px-2 py-1 text-sm"
                    min="0"
                    placeholder="0"
                  />
                </div>
              </div>
                </div>

                {/* Coluna Direita: Preview Fixo */}
                <div className="border-2 border-slate-300 rounded-lg bg-gray-100 p-4 sticky top-4 self-start">
                  <h5 className="font-bold text-sm text-slate-700 mb-3 pb-2 border-b border-slate-200">
                    📋 Preview da Peça
                  </h5>
                  <div className="flex items-start justify-center">
                    {novaPeca.largura && novaPeca.altura ? (
                      <PreviewAcabamentos peca={novaPeca} />
                    ) : (
                      <div className="text-center py-8 text-slate-400 text-sm">
                        <p className="mb-2">⚠️</p>
                        <p>Preencha largura e altura para ver o preview</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => {
                    if (novaPeca.nome && novaPeca.altura && novaPeca.largura && novaPeca.materialId) {
                      onAdicionarPeca({
                        ...novaPeca,
                        altura: parseFloat(novaPeca.altura),
                        largura: parseFloat(novaPeca.largura)
                      });
                      setNovaPeca({
                        nome: '',
                        altura: '',
                        largura: '',
                        quantidade: 1,
                        materialId: novaPeca.materialId,
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
                      alert('Por favor, preencha o nome, altura e largura da peça!');
                    }
                  }}
                  className="bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Adicionar Peça
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

          {/* Lista de Peças */}
          {ambiente.pecas.map(peca => {
            const material = materiais.find(m => m.id === peca.materialId);
            const materialConfig = materialConfigs[peca.materialId] || {
              comprimento: 3000,
              altura: 2000,
              custo: 250,
              venda: 333.33
            };
            const custosPeca = calcularCustosPeca(peca, materialConfig, precos);
            return (
              <div key={peca.id} className="border border-slate-200 rounded-lg p-4 hover:border-slate-400 hover:shadow-sm transition-all">
                <div className="flex gap-4">
                  {/* Miniatura da peça */}
                  <div
                    className="flex-shrink-0 cursor-pointer hover:scale-105 transition-transform"
                    style={{ width: '100px', height: '75px' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onVisualizarPeca && onVisualizarPeca(peca);
                    }}
                    title="Clique para ver detalhes"
                  >
                    <PreviewAcabamentos peca={peca} mostrarSempre={true} mini={true} />
                  </div>

                  {/* Informações da peça */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-slate-800 text-base">{peca.nome || 'Sem nome'}</h4>
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onVisualizarPeca && onVisualizarPeca(peca);
                          }}
                          className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded transition-colors"
                          title="Ver detalhes"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (onPedirConfirmacaoExclusao) {
                              onPedirConfirmacaoExclusao(peca.id, peca.nome);
                            }
                          }}
                          className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded transition-colors"
                          title="Excluir peça"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-500 mt-1">
                      <span><span className="font-medium text-slate-700">{peca.largura} x {peca.altura}</span> mm</span>
                      <span>{material?.nome}</span>
                      <span>Chapa #{peca.chapaId ? String(peca.chapaId).slice(-4) : 'N/A'}</span>
                    </div>

                    {/* Acabamentos aplicados */}
                    {peca.acabamentos && Object.values(peca.acabamentos).some(a => a.ativo) && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {Object.keys(peca.acabamentos).map(tipo => {
                          const acab = peca.acabamentos[tipo];
                          if (!acab.ativo) return null;
                          return (
                            <span key={tipo} className="text-xs px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                              {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Custos */}
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                    <span className="text-slate-500">Área: <span className="font-semibold text-slate-700">{custosPeca.area.toFixed(2)}m²</span></span>
                    <span className="text-slate-500">Material: <span className="font-semibold text-slate-700">{formatBRL(custosPeca.custoMaterial)}</span></span>
                    {custosPeca.acabamentos > 0 && (
                      <span className="text-slate-500">Acabamentos: <span className="font-semibold text-slate-700">{formatBRL(custosPeca.acabamentos)}</span></span>
                    )}
                    {custosPeca.recortes > 0 && (
                      <span className="text-slate-500">Recortes: <span className="font-semibold text-slate-700">{formatBRL(custosPeca.recortes)}</span></span>
                    )}
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-300 flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-700">Total da Peça:</span>
                    <span className="text-base font-bold text-green-700">{formatBRL(custosPeca.total)}</span>
                  </div>

                  {/* Detalhes expandíveis */}
                  {(custosPeca.detalhesAcabamentos.length > 0 || custosPeca.detalhesRecortes.length > 0) && (
                    <details className="mt-2">
                      <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-700">
                        Ver detalhes dos custos
                      </summary>
                      <div className="mt-2 space-y-1 pl-2 border-l-2 border-slate-300">
                        {custosPeca.detalhesAcabamentos.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-slate-700">Acabamentos:</p>
                            {custosPeca.detalhesAcabamentos.map((detalhe, idx) => (
                              <div key={idx} className="text-xs text-slate-600 flex justify-between">
                                <span>• {detalhe.tipo.charAt(0).toUpperCase() + detalhe.tipo.slice(1)} ({detalhe.metros}m)</span>
                                <span className="font-medium">{formatBRL(detalhe.valor)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {custosPeca.detalhesRecortes.length > 0 && (
                          <div className="mt-1">
                            <p className="text-xs font-semibold text-slate-700">Recortes:</p>
                            {custosPeca.detalhesRecortes.map((detalhe, idx) => (
                              <div key={idx} className="text-xs text-slate-600 flex justify-between">
                                <span>• {detalhe.tipo} ({detalhe.quantidade}x)</span>
                                <span className="font-medium">{formatBRL(detalhe.valor)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </details>
                  )}
                </div>
              </div>
            );
          })}

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
    if (!canvas || !peca.largura || !peca.altura) return;
    
    const ctx = canvas.getContext('2d');
    const largura = parseFloat(peca.largura) || 600;
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
      {!mini && peca.acabamentos && Object.values(peca.acabamentos).some(a => a.ativo) && (
        <div className="p-2 bg-gray-100 border-t border-gray-200">
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
const ResumoOrcamento = ({ orcamentoAtual, materiais, precos, onSalvar, onSair }) => {
  // Recalcular sempre que orcamentoAtual, materiais ou precos mudarem
  const orcamento = useMemo(() => {
    return calcularOrcamentoComDetalhes(orcamentoAtual, materiais, precos);
  }, [orcamentoAtual, materiais, precos]);

  return (
    <div className="bg-gray-100 rounded-lg shadow-sm p-6 border border-slate-200">
      <h3 className="text-2xl font-bold mb-6 text-slate-800">Resumo do Orçamento</h3>

      {/* Chapas - Aproveitamento */}
      {orcamento.detalhesChapas && orcamento.detalhesChapas.length > 0 && (
        <div className="mb-6">
          <div className="py-3 border-b border-slate-300 mb-4">
            <span className="font-semibold text-base text-slate-700">Chapas ({orcamento.detalhesChapas.length})</span>
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {orcamento.detalhesChapas.map((detalhe, idx) => {
              const custoChapa = (detalhe.custoPecas || 0) + (detalhe.custoSobra || 0);
              const vendaChapa = (detalhe.vendaPecas || 0) + (detalhe.custoSobra || 0);
              return (
                <div key={idx} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  {/* Header da chapa */}
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-semibold text-slate-800">
                      Chapa {idx + 1} - {detalhe.materialNome}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded font-medium ${
                      detalhe.percentualAproveitamento >= 70 ? 'bg-green-100 text-green-700' :
                      detalhe.percentualAproveitamento >= 40 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {detalhe.percentualAproveitamento.toFixed(1)}% aproveitamento
                    </span>
                  </div>

                  {/* Metragem e Peças */}
                  <div className="grid grid-cols-4 gap-3 mb-3">
                    <div className="bg-gray-100 rounded p-2 border border-slate-200 text-center">
                      <div className="text-xs text-slate-500">Peças</div>
                      <div className="font-bold text-base text-slate-800">{detalhe.numPecas || 0}</div>
                    </div>
                    <div className="bg-gray-100 rounded p-2 border border-slate-200 text-center">
                      <div className="text-xs text-slate-500">Área Total</div>
                      <div className="font-bold text-sm text-slate-800">{detalhe.areaTotal.toFixed(2)}m²</div>
                    </div>
                    <div className="bg-gray-100 rounded p-2 border border-slate-200 text-center">
                      <div className="text-xs text-slate-500">Área Peças</div>
                      <div className="font-bold text-sm text-slate-800">{detalhe.areaPecas.toFixed(2)}m²</div>
                    </div>
                    <div className="bg-gray-100 rounded p-2 border border-slate-200 text-center">
                      <div className="text-xs text-slate-500">Sobra</div>
                      <div className="font-bold text-sm text-slate-800">{detalhe.areaSobra.toFixed(2)}m²</div>
                      <div className="text-xs text-slate-600 mt-1">{formatBRL(detalhe.custoSobra || 0)}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Acabamentos, Recortes e Resumo de Metragem */}
      {(orcamento.acabamentos > 0 || orcamento.recortes > 0 || (orcamento.detalhesChapas && orcamento.detalhesChapas.length > 0)) && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {orcamento.acabamentos > 0 && (
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 flex flex-col">
            <h4 className="font-semibold text-slate-700 mb-3">Acabamentos</h4>
            <div className="space-y-2 flex-1">
              {(() => {
                const acabamentosPorTipo = {};
                if (orcamento.detalhesAcabamentos && orcamento.detalhesAcabamentos.length > 0) {
                  orcamento.detalhesAcabamentos.forEach(detalhe => {
                    const tipo = detalhe.tipo;
                    if (!acabamentosPorTipo[tipo]) {
                      acabamentosPorTipo[tipo] = 0;
                    }
                    acabamentosPorTipo[tipo] += detalhe.valor;
                  });
                }
                return Object.keys(acabamentosPorTipo)
                  .filter(tipo => acabamentosPorTipo[tipo] > 0)
                  .map((tipo, idx, arr) => (
                    <div key={tipo} className={`flex justify-between items-center text-sm ${idx < arr.length - 1 ? 'pb-2 border-b border-slate-300' : ''}`}>
                      <span className="text-slate-600 font-medium">{tipo}</span>
                      <span className="text-slate-700 font-semibold">{formatBRL(acabamentosPorTipo[tipo])}</span>
                    </div>
                  ));
              })()}
            </div>
            <div className="flex justify-between items-center text-sm pt-2 mt-auto border-t-2 border-slate-400">
              <span className="text-slate-700 font-bold">Total</span>
              <span className="text-slate-800 font-bold text-base">{formatBRL(orcamento.acabamentos)}</span>
            </div>
          </div>
        )}
        {orcamento.recortes > 0 && (
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 flex flex-col">
            <h4 className="font-semibold text-slate-700 mb-3">Recortes</h4>
            <div className="space-y-2 flex-1">
              {(() => {
                const recortesPorTipo = {};
                if (orcamento.detalhesRecortes && orcamento.detalhesRecortes.length > 0) {
                  orcamento.detalhesRecortes.forEach(detalhe => {
                    const tipo = detalhe.tipo;
                    if (!recortesPorTipo[tipo]) {
                      recortesPorTipo[tipo] = 0;
                    }
                    recortesPorTipo[tipo] += detalhe.valor;
                  });
                }
                return Object.keys(recortesPorTipo)
                  .filter(tipo => recortesPorTipo[tipo] > 0)
                  .map((tipo, idx, arr) => (
                    <div key={tipo} className={`flex justify-between items-center text-sm ${idx < arr.length - 1 ? 'pb-2 border-b border-slate-300' : ''}`}>
                      <span className="text-slate-600 font-medium">{tipo}</span>
                      <span className="text-slate-700 font-semibold">{formatBRL(recortesPorTipo[tipo])}</span>
                    </div>
                  ));
              })()}
            </div>
            <div className="flex justify-between items-center text-sm pt-2 mt-auto border-t-2 border-slate-400">
              <span className="text-slate-700 font-bold">Total</span>
              <span className="text-slate-800 font-bold text-base">{formatBRL(orcamento.recortes)}</span>
            </div>
          </div>
        )}
        {orcamento.detalhesChapas && orcamento.detalhesChapas.length > 0 && (
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 flex flex-col">
            <h4 className="font-semibold text-slate-700 mb-3">Resumo de Metragem</h4>
            <div className="space-y-2 flex-1">
              <div className="flex justify-between items-center text-sm pb-2 border-b border-slate-300">
                <span className="text-slate-600 font-medium">Peças Cobradas</span>
                <div className="text-right">
                  <span className="text-slate-700 font-semibold">
                    {orcamento.detalhesChapas.reduce((sum, d) => sum + d.areaPecas, 0).toFixed(2)}m²
                  </span>
                  <span className="text-xs text-slate-500 ml-2">
                    ({formatBRL(orcamento.detalhesChapas.reduce((sum, d) => sum + d.vendaPecas, 0))})
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center text-sm pb-2 border-b border-slate-300">
                <span className="text-slate-600 font-medium">Sobra Cobrada</span>
                <div className="text-right">
                  <span className="text-slate-700 font-semibold">
                    {orcamento.detalhesChapas.reduce((sum, d) => sum + d.areaSobra, 0).toFixed(2)}m²
                  </span>
                  <span className="text-xs text-slate-500 ml-2">
                    ({formatBRL(orcamento.detalhesChapas.reduce((sum, d) => sum + d.custoSobra, 0))} preço custo)
                  </span>
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center text-sm pt-2 mt-auto border-t-2 border-slate-400">
              <span className="text-slate-700 font-bold">Total Geral</span>
              <div className="text-right">
                <span className="text-slate-800 font-bold text-base">
                  {orcamento.detalhesChapas.reduce((sum, d) => sum + d.areaTotal, 0).toFixed(2)}m²
                </span>
                <span className="text-xs text-slate-500 ml-2">
                  ({((orcamento.detalhesChapas.reduce((sum, d) => sum + d.areaPecas, 0) / orcamento.detalhesChapas.reduce((sum, d) => sum + d.areaTotal, 0)) * 100).toFixed(1)}% aproveitamento)
                </span>
              </div>
            </div>
          </div>
        )}
        </div>
      )}

      {/* Detalhamento de Custos */}
      <div className="mt-6 space-y-2">
        <div className="flex justify-between py-3 bg-slate-50 px-4 rounded-lg border border-slate-200">
          <span className="text-base font-medium text-slate-600">Material (peças)</span>
          <span className="text-base font-semibold text-slate-700">{formatBRL(orcamento.vendaPecas || 0)}</span>
        </div>
        {orcamento.custoSobra && orcamento.custoSobra > 0 && (
          <div className="flex justify-between py-3 bg-slate-50 px-4 rounded-lg border border-slate-200">
            <span className="text-base font-medium text-slate-600">Sobra</span>
            <span className="text-base font-semibold text-slate-700">
              {formatBRL(orcamento.custoSobra)}
            </span>
          </div>
        )}
        {orcamento.acabamentos > 0 && (
          <div className="flex justify-between py-3 bg-slate-50 px-4 rounded-lg border border-slate-200">
            <span className="text-base font-medium text-slate-600">Acabamentos</span>
            <span className="text-base font-semibold text-slate-700">{formatBRL(orcamento.acabamentos)}</span>
          </div>
        )}
        {orcamento.recortes > 0 && (
          <div className="flex justify-between py-3 bg-slate-50 px-4 rounded-lg border border-slate-200">
            <span className="text-base font-medium text-slate-600">Recortes</span>
            <span className="text-base font-semibold text-slate-700">{formatBRL(orcamento.recortes)}</span>
          </div>
        )}
      </div>

      {/* Total Geral */}
      <div className="mt-4 space-y-3">
        <div className="flex justify-between py-4 bg-green-700 px-4 rounded-lg">
          <span className="text-xl font-bold text-white uppercase">Valor de Venda</span>
          <span className="text-xl font-bold text-white">{formatBRL(orcamento.vendaTotal)}</span>
        </div>
        {orcamento.margemTotal > 0 && (
          <div className="flex justify-between py-3 bg-slate-50 px-4 rounded-lg border border-slate-300">
            <span className="text-base font-semibold text-slate-700 uppercase">Margem de Lucro</span>
            <span className="text-base font-semibold text-slate-700">
              {formatBRL(orcamento.margemTotal)}
              <span className="text-sm ml-2 text-slate-500">({((orcamento.margemTotal / orcamento.vendaTotal) * 100).toFixed(1)}%)</span>
            </span>
          </div>
        )}
      </div>

      {/* Botões de Ação */}
      {(onSalvar || onSair) && (
        <div className="mt-6 flex justify-end gap-4">
          {onSair && (
            <button
              onClick={onSair}
              className="bg-slate-600 hover:bg-slate-700 text-white px-6 py-2.5 rounded-lg font-medium text-base transition-all hover:shadow-lg hover:shadow-slate-500/50 hover:scale-105 active:scale-95"
            >
              Voltar
            </button>
          )}
          {onSalvar && (
            <button
              onClick={onSalvar}
              className="bg-slate-700 hover:bg-slate-800 text-white px-6 py-2.5 rounded-lg font-medium text-base transition-all hover:shadow-lg hover:shadow-slate-500/50 hover:scale-105 active:scale-95"
            >
              Salvar Orçamento
            </button>
          )}
        </div>
      )}
    </div>
  );
};


// Componente de Plano de Corte da Chapa
const PlanoCorteChapa = ({ chapa, numero, onMoverPeca, onMoverPecaNaChapa, onGirarPeca, onAtualizarDimensoes, pecaArrastando, setPecaArrastando, todasChapas, setMostrandoDetalhePeca, setModoEdicaoPeca, setPecaEditada, espessuraDisco = 4, margemLaterais = 4 }) => {
  const [escala, setEscala] = useState(0.15);
  const canvasRef = useRef(null);
  const [arrastandoPeca, setArrastandoPeca] = useState(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [pecaSelecionada, setPecaSelecionada] = useState(null);
  const [chapaDestinoSelecionada, setChapaDestinoSelecionada] = useState(null);
  const [pecaHover, setPecaHover] = useState(null);
  const [valoresEditando, setValoresEditando] = useState({}); // State local para edição

  useEffect(() => {
    desenharChapa();
  }, [chapa, escala, arrastandoPeca, pecaSelecionada, pecaHover]);

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
      const w = (peca.rotacao === 90 ? peca.altura : peca.largura) * escala;
      const h = (peca.rotacao === 90 ? peca.largura : peca.altura) * escala;

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

      // Texto com número e dimensões (considerando rotação)
      ctx.fillStyle = `rgb(${Math.max(0,r-40)}, ${Math.max(0,g-40)}, ${Math.max(0,b-40)})`;
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';

      // Número da peça
      ctx.fillText(`#${idx + 1}`, x + w/2, y + h/2 - 6);

      // Dimensões
      ctx.font = '9px Arial';
      const dimensoes = peca.rotacao === 90
        ? `${peca.altura}x${peca.largura}`
        : `${peca.largura}x${peca.altura}`;
      ctx.fillText(dimensoes, x + w/2, y + h/2 + 5);

      // Indicador de rotação
      if (peca.rotacao === 90) {
        ctx.font = 'bold 8px Arial';
        ctx.fillText('↻ 90°', x + w/2, y + h/2 + 15);
      }
    });

    // Desenhar tooltip se hover em alguma peça
    if (pecaHover) {
      const pecaIdx = chapa.pecas.findIndex(p => p.id === pecaHover.id);
      if (pecaIdx !== -1) {
        const peca = chapa.pecas[pecaIdx];
        const nomePeca = peca.nome || `Peça #${pecaIdx + 1}`;

        // Calcular posição do tooltip
        const tooltipX = pecaHover.mouseX + 15;
        const tooltipY = pecaHover.mouseY - 10;

        // Medir largura do texto
        ctx.font = 'bold 12px Arial';
        const textWidth = ctx.measureText(nomePeca).width;
        const padding = 8;
        const tooltipWidth = textWidth + padding * 2;
        const tooltipHeight = 24;

        // Desenhar fundo do tooltip
        ctx.fillStyle = 'rgba(30, 41, 59, 0.95)';
        ctx.fillRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);

        // Borda do tooltip
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.8)';
        ctx.lineWidth = 1;
        ctx.strokeRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);

        // Texto do tooltip
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(nomePeca, tooltipX + padding, tooltipY + tooltipHeight / 2 + 4);
      }
    }

    // Desenhar peça sendo arrastada
    if (arrastandoPeca) {
      const w = (arrastandoPeca.rotacao === 90 ? arrastandoPeca.altura : arrastandoPeca.largura) * escala;
      const h = (arrastandoPeca.rotacao === 90 ? arrastandoPeca.largura : arrastandoPeca.altura) * escala;
      
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
      const pw = (peca.rotacao === 90 ? peca.altura : peca.largura) * escala;
      const ph = (peca.rotacao === 90 ? peca.largura : peca.altura) * escala;
      return x >= px && x <= px + pw && y >= py && y <= py + ph;
    });

    if (pecaClicada) {
      setPecaSelecionada(pecaClicada.id);
      setPecaHover(null); // Limpar hover ao começar a arrastar
      const px = 50 + pecaClicada.posX * escala;
      const py = 50 + pecaClicada.posY * escala;
      setOffset({ x: x - px, y: y - py });
      setArrastandoPeca({ ...pecaClicada, x: px, y: py });
    } else {
      setPecaSelecionada(null);
    }
  };

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Se não está arrastando, apenas detectar hover para tooltip
    if (!arrastandoPeca) {
      const pecaSobMouse = chapa.pecas.find(peca => {
        const px = 50 + peca.posX * escala;
        const py = 50 + peca.posY * escala;
        const pw = (peca.rotacao === 90 ? peca.altura : peca.largura) * escala;
        const ph = (peca.rotacao === 90 ? peca.largura : peca.altura) * escala;
        return mouseX >= px && mouseX <= px + pw && mouseY >= py && mouseY <= py + ph;
      });

      if (pecaSobMouse) {
        setPecaHover({ id: pecaSobMouse.id, mouseX, mouseY });
      } else {
        setPecaHover(null);
      }
      return;
    }

    const x = mouseX - offset.x;
    const y = mouseY - offset.y;

    // Converter para coordenadas da chapa - SEM arredondamento para movimento suave
    let novaX = Math.max(0, (x - 50) / escala);
    let novaY = Math.max(0, (y - 50) / escala);
    const espacamento = espessuraDisco;
    
    // MAGNETISMO - Detectar proximidade com outras peças e bordas
    const toleranciaMagnetismo = 20; // pixels de tolerância para ativar o magnetismo
    const larguraPeca = arrastandoPeca.rotacao === 90 ? arrastandoPeca.altura : arrastandoPeca.largura;
    const alturaPeca = arrastandoPeca.rotacao === 90 ? arrastandoPeca.largura : arrastandoPeca.altura;
    
    // MAGNETISMO NAS BORDAS DA CHAPA
    // Borda esquerda
    if (Math.abs(novaX - margemLaterais) < toleranciaMagnetismo) {
      novaX = margemLaterais;
    }

    // Borda superior
    if (Math.abs(novaY - margemLaterais) < toleranciaMagnetismo) {
      novaY = margemLaterais;
    }

    // Borda direita
    const distBordaDireita = Math.abs((novaX + larguraPeca + margemLaterais) - chapa.material.comprimento);
    if (distBordaDireita < toleranciaMagnetismo) {
      novaX = chapa.material.comprimento - larguraPeca - margemLaterais;
    }

    // Borda inferior
    const distBordaInferior = Math.abs((novaY + alturaPeca + margemLaterais) - chapa.material.altura);
    if (distBordaInferior < toleranciaMagnetismo) {
      novaY = chapa.material.altura - alturaPeca - margemLaterais;
    }
    
    // MAGNETISMO ENTRE PEÇAS
    chapa.pecas.forEach(p => {
      if (p.id === arrastandoPeca.id) return;
      
      const larguraOutra = p.rotacao === 90 ? p.altura : p.largura;
      const alturaOutra = p.rotacao === 90 ? p.largura : p.altura;
      
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
      
      const larguraOutra = p.rotacao === 90 ? p.altura : p.largura;
      const alturaOutra = p.rotacao === 90 ? p.largura : p.altura;
      
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
      novaX + larguraPeca + margemLaterais > chapa.material.comprimento ||
      novaY + alturaPeca + margemLaterais > chapa.material.altura ||
      novaX < margemLaterais ||
      novaY < margemLaterais;
    
    setArrastandoPeca({ 
      ...arrastandoPeca, 
      x: 50 + novaX * escala, 
      y: 50 + novaY * escala,
      posXReal: novaX,
      posYReal: novaY,
      colisao: temColisao || foraDosLimites
    });
  };

  const handleMouseLeaveCanvas = () => {
    setPecaHover(null);
    if (arrastandoPeca) {
      setArrastandoPeca(null);
    }
  };

  const handleMouseUp = (e) => {
    if (!arrastandoPeca) return;

    // Usar as coordenadas já calculadas pelo magnetismo
    const novaX = arrastandoPeca.posXReal !== undefined ? arrastandoPeca.posXReal : Math.max(0, Math.round((arrastandoPeca.x - 50) / escala));
    const novaY = arrastandoPeca.posYReal !== undefined ? arrastandoPeca.posYReal : Math.max(0, Math.round((arrastandoPeca.y - 50) / escala));

    const espacamento = espessuraDisco;
    const larguraPeca = arrastandoPeca.rotacao === 90 ? arrastandoPeca.altura : arrastandoPeca.largura;
    const alturaPeca = arrastandoPeca.rotacao === 90 ? arrastandoPeca.largura : arrastandoPeca.altura;

    // Verificar se está dentro dos limites da chapa (considerando margem)
    const dentroDosLimites =
      novaX + larguraPeca + margemLaterais <= chapa.material.comprimento &&
      novaY + alturaPeca + margemLaterais <= chapa.material.altura &&
      novaX >= margemLaterais &&
      novaY >= margemLaterais;

    if (!dentroDosLimites) {
      alert('A peça não cabe nesta posição! Verifique os limites da chapa.');
      setArrastandoPeca(null);
      return;
    }

    // Verificar colisão com outras peças (respeitando espaçamento do disco de corte)
    const temColisao = chapa.pecas.some(p => {
      if (p.id === arrastandoPeca.id) return false;
      
      const larguraOutra = p.rotacao === 90 ? p.altura : p.largura;
      const alturaOutra = p.rotacao === 90 ? p.largura : p.altura;
      
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
      alert(`Não é possível posicionar a peça aqui! Ela precisa estar a pelo menos ${espessuraDisco}mm de distância das outras peças (espessura do disco de corte).`);
      setArrastandoPeca(null);
      return;
    }

    // Posição válida - mover a peça
    onMoverPecaNaChapa(arrastandoPeca.id, chapa.id, novaX, novaY);
    setArrastandoPeca(null);
  };

  return (
    <div className="border border-slate-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-lg text-slate-800">Chapa #{numero}</h3>
          <p className="text-sm text-slate-500">{chapa.material.nome} - {chapa.pecas.length} peças</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600">Zoom:</label>
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

      {/* Layout: Lista de peças à esquerda + Canvas à direita */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] xl:grid-cols-[380px_1fr] gap-4">
        {/* Lista de peças - lado esquerdo (estilo tabela) */}
        <div className="border border-slate-200 rounded bg-gray-100 p-3">
          <h4 className="font-semibold text-slate-800 mb-2 text-sm">Peças ({chapa.pecas.length})</h4>
          <div className="max-h-[600px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 sticky top-0 border-b border-slate-200">
                <tr>
                  <th className="px-2 py-1.5 text-left font-semibold text-slate-700">#</th>
                  <th className="px-2 py-1.5 text-left font-semibold text-slate-700">Nome</th>
                  <th className="px-2 py-1.5 text-left font-semibold text-slate-700">Larg.</th>
                  <th className="px-2 py-1.5 text-left font-semibold text-slate-700">Alt.</th>
                  <th className="px-2 py-1.5 text-center font-semibold text-slate-700">↻</th>
                </tr>
              </thead>
              <tbody>
                {chapa.pecas.map((peca, idx) => {
                  const cores = ['#3b82f6','#10b981','#8b5cf6','#f59e0b','#ef4444','#06b6d4','#ec4899','#14b8a6'];
                  const cor = cores[idx % cores.length];

                  return (
                    <tr
                      key={peca.id}
                      className={`border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors ${
                        pecaSelecionada === peca.id ? 'bg-slate-100' : ''
                      }`}
                      onClick={(e) => {
                        // Não selecionar se clicar em input
                        if (e.target.tagName !== 'INPUT') {
                          setPecaSelecionada(pecaSelecionada === peca.id ? null : peca.id);
                        }
                      }}
                    >
                      <td className="px-2 py-1.5">
                        <div className="flex items-center gap-1.5">
                          <div
                            className="w-2.5 h-2.5 rounded-sm"
                            style={{ backgroundColor: cor }}
                          ></div>
                          <span className="font-medium text-slate-700">#{idx + 1}</span>
                        </div>
                      </td>
                      <td className="px-2 py-1.5">
                        <div className="text-slate-700 truncate max-w-[80px]" title={peca.nome}>
                          {peca.nome || `Peça ${idx + 1}`}
                        </div>
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          value={valoresEditando[`${peca.id}_largura`] ?? peca.largura}
                          onChange={(e) => {
                            e.stopPropagation();
                            setValoresEditando({
                              ...valoresEditando,
                              [`${peca.id}_largura`]: e.target.value
                            });
                          }}
                          onBlur={(e) => {
                            if (valoresEditando[`${peca.id}_largura`] !== undefined) {
                              onAtualizarDimensoes && onAtualizarDimensoes(peca.id, 'largura', valoresEditando[`${peca.id}_largura`]);
                              const novosValores = { ...valoresEditando };
                              delete novosValores[`${peca.id}_largura`];
                              setValoresEditando(novosValores);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.target.blur();
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-16 px-1.5 py-0.5 border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-slate-500 focus:border-slate-500"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          value={valoresEditando[`${peca.id}_altura`] ?? peca.altura}
                          onChange={(e) => {
                            e.stopPropagation();
                            setValoresEditando({
                              ...valoresEditando,
                              [`${peca.id}_altura`]: e.target.value
                            });
                          }}
                          onBlur={(e) => {
                            if (valoresEditando[`${peca.id}_altura`] !== undefined) {
                              onAtualizarDimensoes && onAtualizarDimensoes(peca.id, 'altura', valoresEditando[`${peca.id}_altura`]);
                              const novosValores = { ...valoresEditando };
                              delete novosValores[`${peca.id}_altura`];
                              setValoresEditando(novosValores);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.target.blur();
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-16 px-1.5 py-0.5 border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-slate-500 focus:border-slate-500"
                        />
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        {peca.rotacao === 90 && (
                          <span className="inline-block text-slate-500" title="Rotacionada 90°">↻</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Canvas - lado direito */}
        <div className="overflow-auto bg-gray-100 border border-slate-200 rounded flex justify-center">
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeaveCanvas}
            className="cursor-move"
          />
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
        <div>
          <p className="text-xs text-slate-500">
            Arraste peças livremente. Magnetismo ativo (20mm): alinha com outras peças e bordas.
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Espaçamento entre peças: {espessuraDisco}mm (disco de corte) • Margem das bordas: {margemLaterais}mm
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {pecaSelecionada && (
            <>
              <button
                onClick={() => {
                  const peca = chapa.pecas.find(p => p.id === pecaSelecionada);
                  if (peca && setMostrandoDetalhePeca && setModoEdicaoPeca && setPecaEditada) {
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
                  }
                }}
                className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
              >
                <Edit2 size={14} />
                Editar Peça
              </button>

              <button
                onClick={() => {
                  onGirarPeca(pecaSelecionada, chapa.id);
                }}
                className="flex items-center gap-1 bg-slate-700 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
              >
                <span className="rotate-90 inline-block">↻</span>
                Girar Peça (90°)
              </button>

              {/* Botão para mover para outra chapa */}
              {todasChapas && todasChapas.length > 1 && todasChapas.filter(c => c.materialId === chapa.materialId && c.id !== chapa.id).length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setChapaDestinoSelecionada(chapaDestinoSelecionada ? null : 'abrir')}
                    className="flex items-center gap-1 bg-slate-600 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                  >
                    <Move size={14} />
                    Mover para Outra Chapa
                  </button>

                  {chapaDestinoSelecionada === 'abrir' && (
                    <div className="absolute bottom-full mb-2 right-0 bg-gray-100 border border-slate-200 rounded-lg shadow-lg p-3 z-10 min-w-[200px]">
                      <p className="text-xs font-semibold mb-2 text-slate-700">Selecione a chapa de destino:</p>
                      <p className="text-xs text-slate-500 mb-2">O sistema encontrará automaticamente a melhor posição disponível</p>
                      {todasChapas
                        .filter(c => c.materialId === chapa.materialId && c.id !== chapa.id)
                        .map((chapaDestino, idx) => (
                          <button
                            key={chapaDestino.id}
                            onClick={() => {
                              const pecaAtual = chapa.pecas.find(p => p.id === pecaSelecionada);
                              if (pecaAtual) {
                                onMoverPeca(pecaSelecionada, chapaDestino.id);
                                setPecaSelecionada(null);
                                setChapaDestinoSelecionada(null);
                              }
                            }}
                            className="w-full text-left px-2 py-1.5 text-sm hover:bg-slate-50 rounded transition-colors text-slate-700"
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




// Exportar componente
export { SistemaOrcamentoMarmore };
