import { useState, useEffect } from 'react';
import { STORAGE_KEYS, PRECOS_PADRAO, CONFIG_CHAPA_PADRAO } from '../constants/config';

/**
 * Hook para gerenciar orçamentos
 * Controla CRUD de orçamentos com persistência no localStorage
 */
export const useBudgets = () => {
  const [orcamentos, setOrcamentos] = useState([]);
  const [orcamentoAtual, setOrcamentoAtual] = useState(null);
  const [mostrarModalNovoOrcamento, setMostrarModalNovoOrcamento] = useState(false);
  const [nomeNovoOrcamento, setNomeNovoOrcamento] = useState('');

  // Carregar orçamentos do localStorage ao montar
  useEffect(() => {
    const orcamentosSalvos = localStorage.getItem(STORAGE_KEYS.ORCAMENTOS);
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

  // Salvar orçamentos automaticamente quando mudam
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ORCAMENTOS, JSON.stringify(orcamentos));
    console.log('💾 Orçamentos salvos automaticamente');
  }, [orcamentos]);

  /**
   * Abre o modal para criar novo orçamento
   */
  const abrirModalNovoOrcamento = () => {
    setMostrarModalNovoOrcamento(true);
    setNomeNovoOrcamento('');
  };

  /**
   * Fecha o modal de novo orçamento
   */
  const fecharModalNovoOrcamento = () => {
    setMostrarModalNovoOrcamento(false);
    setNomeNovoOrcamento('');
  };

  /**
   * Cria um novo orçamento
   * @param {string} nome - Nome do orçamento (opcional, usa nomeNovoOrcamento se não fornecido)
   * @returns {Object} Novo orçamento criado
   */
  const criarOrcamento = (nome) => {
    const nomeOrcamento = nome || nomeNovoOrcamento;

    if (!nomeOrcamento.trim()) {
      alert('Por favor, insira um nome para o orçamento.');
      return null;
    }

    const novoId = orcamentos.length > 0
      ? Math.max(...orcamentos.map(o => o.id)) + 1
      : 1;

    const novoOrcamento = {
      id: novoId,
      nome: nomeOrcamento,
      dataCriacao: new Date().toISOString(),
      ambientes: [],
      chapas: [],
      precos: { ...PRECOS_PADRAO }, // Cada orçamento tem seus próprios preços
      materiais: {} // Configuração de materiais específica do orçamento: { materialId: { comprimento, altura, custo, venda } }
    };

    setOrcamentos(prev => [...prev, novoOrcamento]);
    setOrcamentoAtual(novoOrcamento);
    fecharModalNovoOrcamento();

    return novoOrcamento;
  };

  /**
   * Adiciona um ambiente ao orçamento atual
   * @param {string} nomeAmbiente - Nome do ambiente
   */
  const adicionarAmbiente = (nomeAmbiente) => {
    if (!orcamentoAtual) return;

    const novoId = orcamentoAtual.ambientes.length > 0
      ? Math.max(...orcamentoAtual.ambientes.map(a => a.id)) + 1
      : 1;

    const novoAmbiente = {
      id: novoId,
      nome: nomeAmbiente,
      pecas: []
    };

    const orcamentoAtualizado = {
      ...orcamentoAtual,
      ambientes: [...orcamentoAtual.ambientes, novoAmbiente]
    };

    setOrcamentoAtual(orcamentoAtualizado);

    // Atualizar também na lista de orçamentos
    setOrcamentos(prev => prev.map(orc =>
      orc.id === orcamentoAtual.id ? orcamentoAtualizado : orc
    ));
  };

  /**
   * Remove um ambiente do orçamento atual
   * @param {number} ambienteId - ID do ambiente
   */
  const removerAmbiente = (ambienteId) => {
    if (!orcamentoAtual) return;

    const orcamentoAtualizado = {
      ...orcamentoAtual,
      ambientes: orcamentoAtual.ambientes.filter(amb => amb.id !== ambienteId)
    };

    setOrcamentoAtual(orcamentoAtualizado);

    setOrcamentos(prev => prev.map(orc =>
      orc.id === orcamentoAtual.id ? orcamentoAtualizado : orc
    ));
  };

  /**
   * Carrega um orçamento para edição
   * @param {number} orcamentoId - ID do orçamento
   */
  const carregarOrcamento = (orcamentoId) => {
    const orcamento = orcamentos.find(o => o.id === orcamentoId);
    if (orcamento) {
      setOrcamentoAtual(orcamento);
    }
  };

  /**
   * Exclui um orçamento
   * @param {number} orcamentoId - ID do orçamento
   */
  const excluirOrcamento = (orcamentoId) => {
    setOrcamentos(prev => prev.filter(o => o.id !== orcamentoId));

    // Se era o orçamento atual, limpar
    if (orcamentoAtual?.id === orcamentoId) {
      setOrcamentoAtual(null);
    }
  };

  /**
   * Salva alterações do orçamento atual na lista
   */
  const salvarOrcamentoAtual = () => {
    if (!orcamentoAtual) return;

    setOrcamentos(prev => {
      const existe = prev.find(orc => orc.id === orcamentoAtual.id);

      if (existe) {
        // Atualizar orçamento existente
        return prev.map(orc => orc.id === orcamentoAtual.id ? orcamentoAtual : orc);
      } else {
        // Adicionar novo orçamento
        return [...prev, orcamentoAtual];
      }
    });
  };

  /**
   * Atualiza o nome do orçamento atual
   * @param {string} novoNome - Novo nome do orçamento
   */
  const atualizarNomeOrcamento = (novoNome) => {
    if (!orcamentoAtual) return;

    const orcamentoAtualizado = {
      ...orcamentoAtual,
      nome: novoNome
    };

    setOrcamentoAtual(orcamentoAtualizado);
    salvarOrcamentoAtual();
  };

  /**
   * Atualiza os preços do orçamento atual
   * @param {Object} novosPrecos - Novos preços do orçamento
   */
  const atualizarPrecosOrcamento = (novosPrecos) => {
    if (!orcamentoAtual) return;

    const orcamentoAtualizado = {
      ...orcamentoAtual,
      precos: { ...orcamentoAtual.precos, ...novosPrecos }
    };

    setOrcamentoAtual(orcamentoAtualizado);

    // Atualizar também na lista de orçamentos
    setOrcamentos(prev => prev.map(orc =>
      orc.id === orcamentoAtual.id ? orcamentoAtualizado : orc
    ));
  };

  /**
   * Atualiza a configuração de um material específico no orçamento atual
   * @param {number} materialId - ID do material
   * @param {Object} config - Configuração do material (comprimento, altura, custo, venda)
   */
  const atualizarConfigMaterial = (materialId, config) => {
    if (!orcamentoAtual) return;

    const orcamentoAtualizado = {
      ...orcamentoAtual,
      materiais: {
        ...orcamentoAtual.materiais,
        [materialId]: { ...(orcamentoAtual.materiais?.[materialId] || {}), ...config }
      }
    };

    setOrcamentoAtual(orcamentoAtualizado);

    // Atualizar também na lista de orçamentos
    setOrcamentos(prev => prev.map(orc =>
      orc.id === orcamentoAtual.id ? orcamentoAtualizado : orc
    ));
  };

  return {
    orcamentos,
    orcamentoAtual,
    mostrarModalNovoOrcamento,
    nomeNovoOrcamento,
    setOrcamentos,
    setOrcamentoAtual,
    setNomeNovoOrcamento,
    abrirModalNovoOrcamento,
    fecharModalNovoOrcamento,
    criarOrcamento,
    adicionarAmbiente,
    removerAmbiente,
    carregarOrcamento,
    excluirOrcamento,
    salvarOrcamentoAtual,
    atualizarNomeOrcamento,
    atualizarPrecosOrcamento,
    atualizarConfigMaterial
  };
};
