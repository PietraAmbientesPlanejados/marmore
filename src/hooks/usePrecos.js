import { useState, useEffect } from 'react';
import { PRECOS_PADRAO } from '../constants/config';
import { getPrecos, savePrecos } from '../utils/database';

/**
 * Hook para gerenciar configuração de preços do sistema
 * Controla preços de acabamentos e recortes com persistência no Supabase (ou localStorage como fallback)
 */
export const usePrecos = () => {
  const [precos, setPrecos] = useState(PRECOS_PADRAO);
  const [precosSalvos, setPrecosSalvos] = useState(false);
  const [mostrarPainelPrecos, setMostrarPainelPrecos] = useState(false);

  // Carregar preços salvos do banco ao montar
  useEffect(() => {
    const carregar = async () => {
      try {
        const dados = await getPrecos();
        if (dados) {
          setPrecos(dados);
        }
      } catch (error) {
        console.error('Erro ao carregar preços:', error);
      }
    };
    carregar();
  }, []);

  /**
   * Atualiza um preço específico
   * @param {string} chave - Chave do preço (ex: 'polimento', 'esquadria')
   * @param {number|string} valor - Novo valor do preço
   */
  const atualizarPreco = (chave, valor) => {
    const valorNumerico = parseFloat(valor) || 0;
    setPrecos(prev => ({
      ...prev,
      [chave]: valorNumerico
    }));
    setPrecosSalvos(false);
  };

  /**
   * Salva preços no banco com feedback visual
   */
  const salvarPrecos = async () => {
    await savePrecos(precos);
    setPrecosSalvos(true);

    setTimeout(() => {
      setPrecosSalvos(false);
    }, 3000);
  };

  /**
   * Toggle visibilidade do painel de preços
   */
  const togglePainelPrecos = () => {
    setMostrarPainelPrecos(prev => !prev);
  };

  return {
    precos,
    precosSalvos,
    mostrarPainelPrecos,
    atualizarPreco,
    salvarPrecos,
    togglePainelPrecos,
    setMostrarPainelPrecos
  };
};
