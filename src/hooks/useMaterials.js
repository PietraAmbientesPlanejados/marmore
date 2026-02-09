import { useState, useEffect } from 'react';
import { STORAGE_KEYS } from '../constants/config';

/**
 * Hook para gerenciar materiais (chapas de mármore/granito)
 * Controla CRUD de materiais com persistência no localStorage
 */
export const useMaterials = () => {
  const [materiais, setMateriais] = useState([
    { id: 1, nome: 'Mármore Branco Carrara' },
    { id: 2, nome: 'Granito Preto São Gabriel' },
    { id: 3, nome: 'Quartzo Branco' }
  ]);
  const [materialEditando, setMaterialEditando] = useState(null);
  const [novoMaterial, setNovoMaterial] = useState({
    nome: ''
  });

  // Carregar materiais do localStorage ao montar
  useEffect(() => {
    const materiaisSalvos = localStorage.getItem(STORAGE_KEYS.MATERIAIS);
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
  }, []);

  // Salvar materiais automaticamente quando mudam
  useEffect(() => {
    if (materiais.length > 0) {
      localStorage.setItem(STORAGE_KEYS.MATERIAIS, JSON.stringify(materiais));
      console.log('💾 Materiais salvos automaticamente');
    }
  }, [materiais]);

  /**
   * Adiciona um novo material
   * @param {Object} material - Dados do material (apenas nome)
   */
  const adicionarMaterial = (material) => {
    const novoId = materiais.length > 0
      ? Math.max(...materiais.map(m => m.id)) + 1
      : 1;

    const materialComId = {
      id: novoId,
      nome: material.nome
    };

    setMateriais(prev => [...prev, materialComId]);
    resetNovoMaterial();
  };

  /**
   * Exclui um material
   * @param {number} materialId - ID do material a ser excluído
   */
  const excluirMaterial = (materialId) => {
    setMateriais(prev => prev.filter(m => m.id !== materialId));
  };

  /**
   * Atualiza os dados de um material existente
   * NOTA: Esta é uma versão simplificada. Para atualização completa com
   * reorganização de orçamentos, use a função atualizarMaterial do componente principal
   * @param {number} materialId - ID do material
   * @param {Object} novosDados - Novos dados do material
   */
  const atualizarMaterialSimples = (materialId, novosDados) => {
    const materiaisAtualizados = materiais.map(m =>
      m.id === materialId ? { ...m, ...novosDados } : m
    );
    setMateriais(materiaisAtualizados);
  };

  /**
   * Inicia o modo de edição de um material
   * @param {Object} material - Material a ser editado
   */
  const iniciarEdicao = (material) => {
    setMaterialEditando(material);
    setNovoMaterial({
      nome: material.nome
    });
  };

  /**
   * Cancela o modo de edição
   */
  const cancelarEdicao = () => {
    setMaterialEditando(null);
    resetNovoMaterial();
  };

  /**
   * Reseta o formulário de novo material
   */
  const resetNovoMaterial = () => {
    setNovoMaterial({ nome: '' });
  };

  /**
   * Atualiza um campo do formulário de novo material
   * @param {string} campo - Nome do campo
   * @param {any} valor - Novo valor
   */
  const atualizarCampoMaterial = (campo, valor) => {
    setNovoMaterial(prev => ({ ...prev, [campo]: valor }));
  };

  /**
   * Busca um material por ID
   * @param {number} materialId - ID do material
   * @returns {Object|undefined} Material encontrado ou undefined
   */
  const buscarMaterialPorId = (materialId) => {
    return materiais.find(m => m.id === materialId);
  };

  return {
    materiais,
    materialEditando,
    novoMaterial,
    setMateriais,
    setMaterialEditando,
    setNovoMaterial,
    adicionarMaterial,
    excluirMaterial,
    atualizarMaterialSimples,
    iniciarEdicao,
    cancelarEdicao,
    resetNovoMaterial,
    atualizarCampoMaterial,
    buscarMaterialPorId
  };
};
