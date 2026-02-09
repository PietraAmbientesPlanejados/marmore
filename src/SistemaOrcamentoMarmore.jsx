import { useState, useRef, useEffect, useMemo } from 'react';
import { formatBRL } from './utils/formatters';
import { organizarPecasEmChapas, calcularOrcamentoComDetalhes, calcularCustosPeca } from './utils/calculations';
import { PRECOS_PADRAO, CONFIG_CHAPA_PADRAO } from './constants/config';
import { usePrecos } from './hooks/usePrecos';
import { useMaterials } from './hooks/useMaterials';
import { useBudgets } from './hooks/useBudgets';
import { HomePage } from './pages/HomePage';
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
  const { orcamentos, orcamentoAtual, mostrarModalNovoOrcamento, nomeNovoOrcamento, setOrcamentos, setOrcamentoAtual, setNomeNovoOrcamento, abrirModalNovoOrcamento, fecharModalNovoOrcamento, criarOrcamento, adicionarAmbiente, salvarOrcamentoAtual, atualizarPrecosOrcamento, atualizarConfigMaterial } = useBudgets();

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
          // Migração automática: adicionar preços e materiais a orçamentos antigos
          const orcamentosMigrados = dados.map(orc => {
            const materiaisConfig = orc.materiais || {};

            // Migrar materiais antigos que vêm das peças
            if (orc.ambientes) {
              orc.ambientes.forEach(amb => {
                if (amb.pecas) {
                  amb.pecas.forEach(peca => {
                    if (peca.material && peca.material.comprimento && !materiaisConfig[peca.materialId]) {
                      // Material antigo com dados completos - migrar para nova estrutura
                      materiaisConfig[peca.materialId] = {
                        comprimento: peca.material.comprimento,
                        altura: peca.material.altura,
                        custo: peca.material.custo || 250,
                        venda: peca.material.venda || 333.33
                      };
                    } else if (peca.materialId && !materiaisConfig[peca.materialId]) {
                      // Novo formato - adicionar config padrão se não existir
                      materiaisConfig[peca.materialId] = { ...CONFIG_CHAPA_PADRAO };
                    }
                  });
                }
              });
            }

            return {
              ...orc,
              precos: orc.precos || { ...PRECOS_PADRAO },
              materiais: materiaisConfig
            };
          });
          setOrcamentos(orcamentosMigrados);
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
        const pw = (peca.rotacao === 90 ? peca.altura : peca.comprimento) * escala;
        const ph = (peca.rotacao === 90 ? peca.comprimento : peca.altura) * escala;

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
            const pecaCompExib = peca.rotacao === 90 ? peca.altura : peca.comprimento;
            const pecaAltExib = peca.rotacao === 90 ? peca.comprimento : peca.altura;
            const dimText = pecaCompExib + 'x' + pecaAltExib;
            pdf.text(dimText, px + pw / 2, py + ph / 2 + 4, { align: 'center' });
          }
        }

        // Guardar para legenda
        const nome = peca.nome || ('Peça ' + (pIdx + 1));
        const pecaCompExib = peca.rotacao === 90 ? peca.altura : peca.comprimento;
        const pecaAltExib = peca.rotacao === 90 ? peca.comprimento : peca.altura;
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
          const pw = (peca.rotacao === 90 ? peca.altura : peca.comprimento) * escala;
          const ph = (peca.rotacao === 90 ? peca.comprimento : peca.altura) * escala;
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

    const pecaComp = parseFloat(peca.comprimento);
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
    if (pecaEditada.comprimento !== mostrandoDetalhePeca.comprimento ||
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
  // Wrapper para organizar peças usando a função do utils
  const organizarPecasLocalmente = (orcamento) => {
    const orcamentoAtualizado = organizarPecasEmChapas(orcamento, materiais);
    setOrcamentoAtual(orcamentoAtualizado);

    // Sincronizar com a lista de orçamentos
    setOrcamentos(prev => prev.map(orc =>
      orc.id === orcamento.id ? orcamentoAtualizado : orc
    ));
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
    const larguraPeca = peca.rotacao === 90 ? peca.altura : peca.comprimento;
    const alturaPeca = peca.rotacao === 90 ? peca.comprimento : peca.altura;
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
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <header className={`bg-slate-800 shadow-md border border-slate-700 ${tela === 'orcamento' && orcamentoAtual ? 'rounded-t-xl mb-0' : 'rounded-xl mb-8'}`}>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-white mb-1 flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center border border-slate-600">
                    <Grid size={20} className="text-slate-300" />
                  </div>
                  Sistema de Orçamento
                </h1>
                <p className="text-slate-400 text-sm">Mármore & Granito - Gestão Profissional</p>
              </div>
            </div>
          </div>

          {/* Barra de Navegação - Visível apenas na tela de orçamento */}
          {tela === 'orcamento' && orcamentoAtual && (
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
                <button
                  onClick={() => {
                    setTela('lista');
                    setOrcamentoAtual(null);
                    setMenuMobileAberto(false);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 bg-slate-700 text-white px-4 py-3 hover:bg-slate-800 font-medium transition-all border-r border-slate-600"
                >
                  <Home size={18} />
                  <span>Início</span>
                </button>

                <button
                  onClick={() => {
                    setTela('plano-corte');
                    setMenuMobileAberto(false);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 bg-slate-700 text-white px-4 py-3 hover:bg-slate-800 font-medium transition-all border-r border-slate-600"
                >
                  <Grid size={18} />
                  <span>Plano de Corte</span>
                </button>

                <button
                  onClick={() => {
                    gerarEtiquetasPDF();
                    setMenuMobileAberto(false);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 bg-slate-700 text-white px-4 py-3 hover:bg-slate-800 font-medium transition-all border-r border-slate-600"
                >
                  <Printer size={18} />
                  <span>Gerar Etiquetas</span>
                </button>

                <button
                  onClick={() => {
                    salvarOrcamentoAtual();
                    alert('✅ Orçamento salvo com sucesso!');
                    setTela('lista');
                    setOrcamentoAtual(null);
                    setMenuMobileAberto(false);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 bg-slate-700 text-white px-4 py-3 hover:bg-slate-800 font-medium transition-all border-r border-slate-600"
                >
                  <Save size={18} />
                  <span>Salvar Orçamento</span>
                </button>

                <button
                  onClick={() => {
                    setMostrarPainelPrecosOrcamento(!mostrarPainelPrecosOrcamento);
                    setMenuMobileAberto(false);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 bg-slate-700 text-white px-4 py-3 hover:bg-slate-800 font-medium transition-all border-r border-slate-600"
                >
                  <span className="text-lg">💰</span>
                  <span>Configurar Preços</span>
                </button>

                <button
                  onClick={() => {
                    setMostrarPainelMateriaisOrcamento(!mostrarPainelMateriaisOrcamento);
                    setMenuMobileAberto(false);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 bg-slate-700 text-white px-4 py-3 hover:bg-slate-800 font-medium transition-all"
                >
                  <Package size={18} />
                  <span>Configurar Materiais</span>
                </button>
              </div>
            </div>
          )}
        </header>

        {/* Espaçamento após barra de navegação */}
        {tela === 'orcamento' && orcamentoAtual && <div className="mb-8"></div>}

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
                    fecharModalNovoOrcamento();
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

                      // Inicializar acabamentos personalizados com valores calculados dos lados
                      if (!copia.acabamentosPersonalizados) {
                        const largura = copia.rotacao === 90 ? copia.altura : copia.comprimento;
                        const altura = copia.rotacao === 90 ? copia.comprimento : copia.altura;

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
                    <h4 className="font-semibold text-purple-900 mb-3 text-sm">✨ Acabamentos</h4>
                    {modoEdicaoPeca ? (
                      <div className="space-y-3">
                        <p className="text-xs text-purple-800 bg-purple-100 p-2 rounded border border-purple-300">
                          💡 <strong>Modo de edição:</strong> Insira a quantidade de acabamento em metros lineares. Deixe em branco ou 0 para desativar o acabamento.
                        </p>
                        <div className="grid md:grid-cols-2 gap-3">
                          {['polimento', 'esquadria', 'boleado', 'canal'].map(tipo => {
                            const cores = {
                              polimento: 'border-blue-400 focus:ring-blue-500',
                              esquadria: 'border-red-400 focus:ring-red-500',
                              boleado: 'border-yellow-400 focus:ring-yellow-500',
                              canal: 'border-orange-400 focus:ring-orange-500'
                            };
                            return (
                              <div key={tipo} className="bg-white rounded-lg p-3 border-2 border-purple-300">
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
                                    className={`w-full px-3 py-2 border-2 ${cores[tipo]} rounded-lg focus:ring-2 focus:outline-none text-sm font-medium`}
                                    placeholder="0.00"
                                  />
                                  <span className="text-sm text-slate-600 whitespace-nowrap">metros</span>
                                </div>
                                {pecaEditada?.acabamentosPersonalizados?.[tipo] > 0 && (
                                  <div className="mt-2 text-xs text-green-700 bg-green-50 p-2 rounded border border-green-200">
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
                              <div key={tipo} className="bg-white rounded p-2 border border-purple-300">
                                <div className="font-semibold text-slate-800 capitalize text-sm mb-1">{tipo}</div>
                                <div className="text-xs text-slate-700">
                                  <span className="font-bold text-blue-600">{metros.toFixed(2)}m</span>
                                  <span className="ml-2 text-green-600">({valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})</span>
                                </div>
                              </div>
                            );
                          }

                          // Se não, mostrar lados (modo tradicional)
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
          <div className="bg-white rounded-lg shadow-sm p-6 max-w-2xl mx-auto">
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
          <div className="bg-white rounded-lg shadow-sm p-6 max-w-2xl mx-auto">
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

        {/* Tela de Orçamento */}
        {tela === 'orcamento' && orcamentoAtual && (
          <div className="space-y-4">
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
                <p className="text-sm text-gray-500">Criado em: {orcamentoAtual.data}</p>
              </div>

              {/* Painel de Configuração de Preços do Orçamento */}
              {mostrarPainelPrecosOrcamento && (
                <div className="mb-6 bg-amber-50 border-2 border-amber-300 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-amber-900 mb-4">💰 Configuração de Preços deste Orçamento</h3>
                  <p className="text-sm text-amber-800 mb-4">
                    Estes preços são específicos deste orçamento e não afetam outros orçamentos.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Acabamentos */}
                    <div className="bg-white p-4 rounded-lg border border-amber-200">
                      <h4 className="font-bold text-gray-800 mb-3 text-sm">Acabamentos (R$/m)</h4>
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
                    <div className="bg-white p-4 rounded-lg border border-amber-200">
                      <h4 className="font-bold text-gray-800 mb-3 text-sm">Recortes (R$/un)</h4>
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
                    <div className="bg-white p-4 rounded-lg border border-amber-200 flex flex-col justify-center items-center">
                      <button
                        onClick={salvarPrecosOrcamento}
                        className={`px-6 py-3 rounded-lg font-bold transition-all w-full ${
                          precosSalvosOrcamento
                            ? 'bg-green-500 text-white'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        {precosSalvosOrcamento ? '✓ Salvo!' : '💾 Salvar Preços'}
                      </button>
                      <p className="text-xs text-gray-600 mt-3 text-center">
                        Clique para salvar e atualizar o plano de corte
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Painel de Configuração de Materiais do Orçamento */}
              {mostrarPainelMateriaisOrcamento && (
                <div className="mb-6 bg-purple-50 border-2 border-purple-300 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-purple-900 mb-4">📦 Configuração de Materiais deste Orçamento</h3>
                  <p className="text-sm text-purple-800 mb-4">
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
                            <div key={materialId} className="bg-white p-4 rounded-lg border-2 border-purple-200">
                              <h4 className="font-bold text-gray-900 mb-4">{material.nome}</h4>

                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {/* Comprimento */}
                                <div>
                                  <label className="text-xs text-gray-600 block mb-1">Comprimento (mm)</label>
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
                              <div className="mt-3 pt-3 border-t border-purple-100 text-xs text-gray-600">
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
                      className={`px-6 py-3 rounded-lg font-bold transition-all ${
                        materiaisSalvosOrcamento
                          ? 'bg-green-500 text-white'
                          : 'bg-purple-600 hover:bg-purple-700 text-white'
                      }`}
                    >
                      {materiaisSalvosOrcamento ? '✓ Salvo!' : '💾 Salvar Configurações'}
                    </button>
                    <p className="text-xs text-gray-600 mt-3 text-center">
                      Clique para salvar e atualizar o plano de corte
                    </p>
                  </div>
                </div>
              )}

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
                    materialConfigs={orcamentoAtual.materiais || {}}
                    precos={orcamentoAtual.precos || PRECOS_PADRAO}
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
            <ResumoOrcamento
              key={`resumo-${orcamentoAtual.id}-v${orcamentoVersion}`}
              orcamentoAtual={orcamentoAtual}
              materiais={materiais}
              precos={orcamentoAtual.precos || PRECOS_PADRAO}
            />
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
                  totalChapas={orcamentoAtual.chapas.length}
                  orcamentoNome={orcamentoAtual.nome || 'Orçamento'}
                  onMoverPeca={moverPeca}
                  onMoverPecaNaChapa={moverPecaNaChapa}
                  onExcluirChapa={excluirChapa}
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
const AmbienteCard = ({ ambiente, materiais, materialConfigs, precos, onAdicionarPeca, onExcluirPeca, onVisualizarPeca, onPedirConfirmacaoExclusao }) => {
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
      area: acc.area + ((peca.altura * peca.comprimento) / 1000000) * (peca.quantidade || 1)
    };
  }, { material: 0, acabamentos: 0, recortes: 0, total: 0, area: 0 });

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden" style={{ position: 'relative', zIndex: 1 }}>
      <div
        className="bg-slate-50 p-4 cursor-pointer hover:bg-slate-100 transition-all border-b border-slate-200"
        onClick={() => setExpandido(!expandido)}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-slate-800">{ambiente.nome}</h3>
          <span className="text-xs text-slate-500">{ambiente.pecas.length} peças • {subtotais.area.toFixed(2)}m²</span>
        </div>

        {/* Resumo no Card Fechado */}
        {ambiente.pecas.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="bg-white rounded p-2 border border-slate-200">
              <div className="text-xs text-slate-500">Material</div>
              <div className="text-sm font-semibold text-slate-700">{formatBRL(subtotais.material)}</div>
            </div>
            <div className="bg-white rounded p-2 border border-slate-200">
              <div className="text-xs text-slate-500">Acabamentos</div>
              <div className="text-sm font-semibold text-slate-700">{formatBRL(subtotais.acabamentos)}</div>
            </div>
            <div className="bg-white rounded p-2 border border-slate-200">
              <div className="text-xs text-slate-500">Recortes</div>
              <div className="text-sm font-semibold text-slate-700">{formatBRL(subtotais.recortes)}</div>
            </div>
            <div className="bg-white rounded p-2 border border-slate-300">
              <div className="text-xs text-slate-500">Total</div>
              <div className="text-sm font-bold text-slate-900">{formatBRL(subtotais.total)}</div>
            </div>
          </div>
        )}
      </div>

      {expandido && (
        <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
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
                    <h4 className="font-semibold text-gray-800 mb-2 text-base">{peca.nome || 'Sem nome'}</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      <div>
                        <p className="text-gray-500 text-sm">Dimensões</p>
                        <p className="font-medium text-sm">{peca.comprimento} x {peca.altura} mm</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-sm">Material</p>
                        <p className="font-medium text-sm">{material?.nome}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-sm">Chapa</p>
                        <p className="font-medium text-sm">#{peca.chapaId ? String(peca.chapaId).slice(-4) : 'N/A'}</p>
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
                            <span key={tipo} className={`text-sm px-2 py-1 rounded ${cores[tipo]}`}>
                              {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {/* Custos Detalhados da Peça */}
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-500">Área:</span>
                          <span className="font-semibold text-gray-800 ml-1">{custosPeca.area.toFixed(2)}m²</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Material:</span>
                          <span className="font-semibold text-green-700 ml-1">{formatBRL(custosPeca.custoMaterial)}</span>
                        </div>
                        {custosPeca.acabamentos > 0 && (
                          <div>
                            <span className="text-gray-500">Acabamentos:</span>
                            <span className="font-semibold text-blue-700 ml-1">{formatBRL(custosPeca.acabamentos)}</span>
                          </div>
                        )}
                        {custosPeca.recortes > 0 && (
                          <div>
                            <span className="text-gray-500">Recortes:</span>
                            <span className="font-semibold text-purple-700 ml-1">{formatBRL(custosPeca.recortes)}</span>
                          </div>
                        )}
                      </div>
                      <div className="mt-2 pt-2 border-t border-gray-300 flex justify-between items-center">
                        <span className="text-sm font-bold text-gray-700">Total da Peça:</span>
                        <span className="text-base font-bold text-green-600">{formatBRL(custosPeca.total)}</span>
                      </div>

                      {/* Detalhes expandíveis de acabamentos e recortes */}
                      {(custosPeca.detalhesAcabamentos.length > 0 || custosPeca.detalhesRecortes.length > 0) && (
                        <details className="mt-2">
                          <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-800">
                            Ver detalhes dos custos
                          </summary>
                          <div className="mt-2 space-y-1 pl-2 border-l-2 border-blue-200">
                            {custosPeca.detalhesAcabamentos.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-gray-700">Acabamentos:</p>
                                {custosPeca.detalhesAcabamentos.map((detalhe, idx) => (
                                  <div key={idx} className="text-xs text-gray-600 flex justify-between">
                                    <span>• {detalhe.tipo.charAt(0).toUpperCase() + detalhe.tipo.slice(1)} ({detalhe.metros}m)</span>
                                    <span className="font-medium">{formatBRL(detalhe.valor)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {custosPeca.detalhesRecortes.length > 0 && (
                              <div className="mt-1">
                                <p className="text-xs font-semibold text-gray-700">Recortes:</p>
                                {custosPeca.detalhesRecortes.map((detalhe, idx) => (
                                  <div key={idx} className="text-xs text-gray-600 flex justify-between">
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
  // Recalcular sempre que orcamentoAtual, materiais ou precos mudarem
  const orcamento = useMemo(() => {
    return calcularOrcamentoComDetalhes(orcamentoAtual, materiais, precos);
  }, [orcamentoAtual, materiais, precos]);

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
          const materialConfig = orcamento.materiais?.[parseInt(materialId)] || {
            comprimento: 3000,
            altura: 2000,
            custo: 250,
            venda: 333.33
          };
          const qtd = orcamento.chapasPorMaterial[materialId];
          const areaChapa = (materialConfig.comprimento * materialConfig.altura / 1000000);
          const custoParcial = materialConfig.custo * areaChapa * qtd;
          const vendaParcial = materialConfig.venda * areaChapa * qtd;
          return (
            <div key={materialId} className="flex justify-between text-sm text-slate-700 pl-4 py-2 hover:bg-slate-50 rounded">
              <span className="flex-1">
                <span className="font-medium">{material?.nome}</span>
                <span className="text-slate-500 ml-2">
                  ({qtd}x chapas • {materialConfig.comprimento}x{materialConfig.altura}mm •
                  {(areaChapa * qtd).toFixed(2)}m² total)
                </span>
              </span>
              <div className="flex gap-6 ml-4">
                <span className="text-orange-600 w-24 text-right">{formatBRL(custoParcial)}</span>
                <span className="text-green-600 w-24 text-right">{formatBRL(vendaParcial)}</span>
              </div>
            </div>
          );
        })}
        {orcamento.margemChapas > 0 && orcamento.vendaChapas > 0 && (
          <div className="mt-2 pt-2 border-t border-slate-200 flex justify-between text-sm pl-4">
            <span className="font-semibold text-slate-600">Margem das Chapas:</span>
            <span className="font-semibold text-blue-600">{formatBRL(orcamento.margemChapas)} ({((orcamento.margemChapas / orcamento.vendaChapas) * 100).toFixed(1)}%)</span>
          </div>
        )}

        {/* Detalhamento por Chapa - NOVO */}
        {orcamento.detalhesChapas && orcamento.detalhesChapas.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
              📊 Aproveitamento por Chapa
              <span className="text-xs text-slate-500 font-normal">(peças = preço venda, sobra = preço custo)</span>
            </h4>
            {orcamento.detalhesChapas.map((detalhe, idx) => (
              <div key={idx} className="bg-slate-50 rounded-lg p-3 mb-2 text-sm">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-medium text-slate-800">
                    Chapa {idx + 1} - {detalhe.materialNome}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded font-medium ${
                    detalhe.percentualAproveitamento >= 80 ? 'bg-green-100 text-green-800' :
                    detalhe.percentualAproveitamento >= 50 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {detalhe.percentualAproveitamento.toFixed(1)}% aproveitamento
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600">
                  <div>📏 Área total: <strong>{detalhe.areaTotal.toFixed(2)}m²</strong></div>
                  <div>✂️ Área peças: <strong>{detalhe.areaPecas.toFixed(2)}m²</strong></div>
                  <div>🔲 Área sobra: <strong>{detalhe.areaSobra.toFixed(2)}m²</strong></div>
                  <div>💵 Venda peças: <strong className="text-green-700">{formatBRL(detalhe.vendaPecas)}</strong></div>
                  <div>💰 Custo sobra: <strong className="text-orange-700">{formatBRL(detalhe.custoSobra)}</strong></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Resumo de Metragem - NOVO */}
        {orcamento.detalhesChapas && orcamento.detalhesChapas.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <h4 className="font-semibold text-slate-700 mb-3">📐 Resumo de Metragem</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                <div className="text-xs text-green-700 font-medium mb-1">Peças Cobradas</div>
                <div className="text-xl font-bold text-green-800">
                  {orcamento.detalhesChapas.reduce((sum, d) => sum + d.areaPecas, 0).toFixed(2)}m²
                </div>
                <div className="text-xs text-green-600 mt-1">
                  {formatBRL(orcamento.detalhesChapas.reduce((sum, d) => sum + d.vendaPecas, 0))}
                </div>
              </div>
              <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                <div className="text-xs text-orange-700 font-medium mb-1">Sobra Cobrada</div>
                <div className="text-xl font-bold text-orange-800">
                  {orcamento.detalhesChapas.reduce((sum, d) => sum + d.areaSobra, 0).toFixed(2)}m²
                </div>
                <div className="text-xs text-orange-600 mt-1">
                  {formatBRL(orcamento.detalhesChapas.reduce((sum, d) => sum + d.custoSobra, 0))} (preço custo)
                </div>
              </div>
              <div className="bg-slate-100 rounded-lg p-3 border border-slate-300">
                <div className="text-xs text-slate-700 font-medium mb-1">Total Geral</div>
                <div className="text-xl font-bold text-slate-800">
                  {orcamento.detalhesChapas.reduce((sum, d) => sum + d.areaTotal, 0).toFixed(2)}m²
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  {((orcamento.detalhesChapas.reduce((sum, d) => sum + d.areaPecas, 0) / orcamento.detalhesChapas.reduce((sum, d) => sum + d.areaTotal, 0)) * 100).toFixed(1)}% aproveitamento
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Resumo Simplificado de Acabamentos e Recortes */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {orcamento.acabamentos > 0 && (
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="text-sm text-blue-700 font-medium mb-1">Total Acabamentos</div>
            <div className="text-2xl font-bold text-blue-800">{formatBRL(orcamento.acabamentos)}</div>
          </div>
        )}
        {orcamento.recortes > 0 && (
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <div className="text-sm text-purple-700 font-medium mb-1">Total Recortes</div>
            <div className="text-2xl font-bold text-purple-800">{formatBRL(orcamento.recortes)}</div>
          </div>
        )}
      </div>

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




// Exportar componente
export { SistemaOrcamentoMarmore };
