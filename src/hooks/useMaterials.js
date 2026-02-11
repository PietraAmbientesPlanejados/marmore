import { useState, useEffect, useCallback } from 'react';
import { getMateriais, saveMaterial, deleteMaterial } from '../utils/database';

/**
 * Hook para gerenciar materiais (chapas de mármore/granito)
 * Controla CRUD de materiais com persistência no Supabase (ou localStorage como fallback)
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
  const [carregando, setCarregando] = useState(true);

  // Carregar materiais do banco ao montar
  useEffect(() => {
    const carregar = async () => {
      try {
        const dados = await getMateriais();
        if (Array.isArray(dados) && dados.length > 0) {
          setMateriais(dados);
        }
      } catch (error) {
        console.error('Erro ao carregar materiais:', error);
      } finally {
        setCarregando(false);
      }
    };
    carregar();
  }, []);

  /**
   * Adiciona um novo material
   * @param {Object} material - Dados do material (apenas nome)
   */
  const adicionarMaterial = useCallback(async (material) => {
    const salvo = await saveMaterial({ nome: material.nome });

    if (salvo) {
      setMateriais(prev => [...prev, salvo]);
    } else {
      // Fallback: adicionar localmente
      const novoId = materiais.length > 0
        ? Math.max(...materiais.map(m => m.id)) + 1
        : 1;
      setMateriais(prev => [...prev, { id: novoId, nome: material.nome }]);
    }

    resetNovoMaterial();
  }, [materiais]);

  /**
   * Exclui um material
   * @param {number} materialId - ID do material a ser excluído
   */
  const excluirMaterial = useCallback(async (materialId) => {
    await deleteMaterial(materialId);
    setMateriais(prev => prev.filter(m => m.id !== materialId));
  }, []);

  /**
   * Atualiza os dados de um material existente
   * @param {number} materialId - ID do material
   * @param {Object} novosDados - Novos dados do material
   */
  const atualizarMaterialSimples = useCallback(async (materialId, novosDados) => {
    const materialAtualizado = { id: materialId, ...novosDados };
    await saveMaterial(materialAtualizado);

    setMateriais(prev =>
      prev.map(m => m.id === materialId ? { ...m, ...novosDados } : m)
    );
  }, []);

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
    carregando,
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
