import { useState, useEffect, useCallback } from 'react';
import { PRECOS_PADRAO } from '../constants/config';
import { getOrcamentos, saveOrcamento, deleteOrcamento, migrarLocalStorageParaSupabase } from '../utils/database';

/**
 * Hook para gerenciar orçamentos
 * Controla CRUD de orçamentos com persistência no Supabase (ou localStorage como fallback)
 */
export const useBudgets = () => {
  const [orcamentos, setOrcamentos] = useState([]);
  const [orcamentoAtual, setOrcamentoAtual] = useState(null);
  const [mostrarModalNovoOrcamento, setMostrarModalNovoOrcamento] = useState(false);
  const [nomeNovoOrcamento, setNomeNovoOrcamento] = useState('');
  const [carregando, setCarregando] = useState(true);

  // Referência para evitar salvar no banco durante o carregamento inicial
  const [inicializado, setInicializado] = useState(false);

  // Migrar dados e carregar orçamentos do banco ao montar
  useEffect(() => {
    const carregar = async () => {
      try {
        // Tentar migrar dados do localStorage para Supabase (só roda uma vez)
        await migrarLocalStorageParaSupabase();

        const dados = await getOrcamentos();
        if (Array.isArray(dados)) {
          setOrcamentos(dados);
        }
      } catch (error) {
        console.error('Erro ao carregar orçamentos:', error);
      } finally {
        setCarregando(false);
        setInicializado(true);
      }
    };
    carregar();
  }, []);

  // Salvar orçamento atual no banco quando muda (debounced via flag)
  const salvarOrcamentoNoBanco = useCallback(async (orcamento) => {
    if (!inicializado || !orcamento) return;
    try {
      await saveOrcamento(orcamento);
      console.log('💾 Orçamento salvo automaticamente');
    } catch (error) {
      console.error('Erro ao salvar orçamento:', error);
    }
  }, [inicializado]);

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
  const criarOrcamento = async (nome) => {
    const nomeOrcamento = nome || nomeNovoOrcamento;

    if (!nomeOrcamento.trim()) {
      alert('Por favor, insira um nome para o orçamento.');
      return null;
    }

    const novoOrcamento = {
      nome: nomeOrcamento,
      dataCriacao: new Date().toISOString(),
      ambientes: [],
      chapas: [],
      precos: { ...PRECOS_PADRAO },
      materiais: {}
    };

    const salvo = await saveOrcamento(novoOrcamento);

    if (salvo) {
      setOrcamentos(prev => [...prev, salvo]);
      setOrcamentoAtual(salvo);
    } else {
      // Fallback local
      const novoId = orcamentos.length > 0
        ? Math.max(...orcamentos.map(o => o.id)) + 1
        : 1;
      const comId = { ...novoOrcamento, id: novoId };
      setOrcamentos(prev => [...prev, comId]);
      setOrcamentoAtual(comId);
    }

    fecharModalNovoOrcamento();
    return salvo || novoOrcamento;
  };

  /**
   * Adiciona um ambiente ao orçamento atual
   * @param {string} nomeAmbiente - Nome do ambiente
   */
  const adicionarAmbiente = async (nomeAmbiente) => {
    if (!orcamentoAtual) return;

    if (!nomeAmbiente || !nomeAmbiente.trim()) {
      alert('Por favor, insira um nome para o ambiente.');
      return;
    }

    const novoId = orcamentoAtual.ambientes.length > 0
      ? Math.max(...orcamentoAtual.ambientes.map(a => a.id)) + 1
      : 1;

    const novoAmbiente = {
      id: novoId,
      nome: nomeAmbiente.trim(),
      pecas: []
    };

    const orcamentoAtualizado = {
      ...orcamentoAtual,
      ambientes: [...orcamentoAtual.ambientes, novoAmbiente]
    };

    setOrcamentoAtual(orcamentoAtualizado);
    setOrcamentos(prev => prev.map(orc =>
      orc.id === orcamentoAtual.id ? orcamentoAtualizado : orc
    ));

    await salvarOrcamentoNoBanco(orcamentoAtualizado);
  };

  /**
   * Remove um ambiente do orçamento atual
   * @param {number} ambienteId - ID do ambiente
   */
  const removerAmbiente = async (ambienteId) => {
    if (!orcamentoAtual) return;

    const orcamentoAtualizado = {
      ...orcamentoAtual,
      ambientes: orcamentoAtual.ambientes.filter(amb => amb.id !== ambienteId)
    };

    setOrcamentoAtual(orcamentoAtualizado);
    setOrcamentos(prev => prev.map(orc =>
      orc.id === orcamentoAtual.id ? orcamentoAtualizado : orc
    ));

    await salvarOrcamentoNoBanco(orcamentoAtualizado);
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
  const excluirOrcamento = async (orcamentoId) => {
    await deleteOrcamento(orcamentoId);
    setOrcamentos(prev => prev.filter(o => o.id !== orcamentoId));

    if (orcamentoAtual?.id === orcamentoId) {
      setOrcamentoAtual(null);
    }
  };

  /**
   * Salva alterações do orçamento atual na lista
   */
  const salvarOrcamentoAtual = async () => {
    if (!orcamentoAtual) return;

    setOrcamentos(prev => {
      const existe = prev.find(orc => orc.id === orcamentoAtual.id);

      if (existe) {
        return prev.map(orc => orc.id === orcamentoAtual.id ? orcamentoAtual : orc);
      } else {
        return [...prev, orcamentoAtual];
      }
    });

    await salvarOrcamentoNoBanco(orcamentoAtual);
  };

  /**
   * Atualiza o nome do orçamento atual
   * @param {string} novoNome - Novo nome do orçamento
   */
  const atualizarNomeOrcamento = async (novoNome) => {
    if (!orcamentoAtual) return;

    const orcamentoAtualizado = {
      ...orcamentoAtual,
      nome: novoNome
    };

    setOrcamentoAtual(orcamentoAtualizado);
    setOrcamentos(prev => prev.map(orc =>
      orc.id === orcamentoAtual.id ? orcamentoAtualizado : orc
    ));

    await salvarOrcamentoNoBanco(orcamentoAtualizado);
  };

  /**
   * Atualiza os preços do orçamento atual
   * @param {Object} novosPrecos - Novos preços do orçamento
   */
  const atualizarPrecosOrcamento = async (novosPrecos) => {
    if (!orcamentoAtual) return;

    const orcamentoAtualizado = {
      ...orcamentoAtual,
      precos: { ...orcamentoAtual.precos, ...novosPrecos }
    };

    setOrcamentoAtual(orcamentoAtualizado);
    setOrcamentos(prev => prev.map(orc =>
      orc.id === orcamentoAtual.id ? orcamentoAtualizado : orc
    ));

    await salvarOrcamentoNoBanco(orcamentoAtualizado);
  };

  /**
   * Atualiza a configuração de um material específico no orçamento atual
   * @param {number} materialId - ID do material
   * @param {Object} config - Configuração do material (comprimento, altura, custo, venda)
   */
  const atualizarConfigMaterial = async (materialId, config) => {
    if (!orcamentoAtual) return;

    const orcamentoAtualizado = {
      ...orcamentoAtual,
      materiais: {
        ...orcamentoAtual.materiais,
        [materialId]: { ...(orcamentoAtual.materiais?.[materialId] || {}), ...config }
      }
    };

    setOrcamentoAtual(orcamentoAtualizado);
    setOrcamentos(prev => prev.map(orc =>
      orc.id === orcamentoAtual.id ? orcamentoAtualizado : orc
    ));

    await salvarOrcamentoNoBanco(orcamentoAtualizado);
  };

  return {
    orcamentos,
    orcamentoAtual,
    mostrarModalNovoOrcamento,
    nomeNovoOrcamento,
    carregando,
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
