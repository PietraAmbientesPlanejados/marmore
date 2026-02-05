import { STORAGE_KEYS, PRECOS_PADRAO } from '../constants/config';

// Utilitários para gerenciar localStorage
export const storage = {
  // Materiais
  getMateriais: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MATERIAIS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Erro ao carregar materiais:', error);
      return [];
    }
  },

  setMateriais: (materiais) => {
    try {
      localStorage.setItem(STORAGE_KEYS.MATERIAIS, JSON.stringify(materiais));
    } catch (error) {
      console.error('Erro ao salvar materiais:', error);
    }
  },

  // Orçamentos
  getOrcamentos: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ORCAMENTOS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Erro ao carregar orçamentos:', error);
      return [];
    }
  },

  setOrcamentos: (orcamentos) => {
    try {
      localStorage.setItem(STORAGE_KEYS.ORCAMENTOS, JSON.stringify(orcamentos));
    } catch (error) {
      console.error('Erro ao salvar orçamentos:', error);
    }
  },

  // Preços
  getPrecos: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PRECOS);
      return data ? JSON.parse(data) : PRECOS_PADRAO;
    } catch (error) {
      console.error('Erro ao carregar preços:', error);
      return PRECOS_PADRAO;
    }
  },

  setPrecos: (precos) => {
    try {
      localStorage.setItem(STORAGE_KEYS.PRECOS, JSON.stringify(precos));
    } catch (error) {
      console.error('Erro ao salvar preços:', error);
    }
  },

  // Login
  isLogado: () => {
    return localStorage.getItem(STORAGE_KEYS.LOGADO) === 'true';
  },

  setLogado: (logado) => {
    localStorage.setItem(STORAGE_KEYS.LOGADO, logado ? 'true' : 'false');
  },

  logout: () => {
    localStorage.removeItem(STORAGE_KEYS.LOGADO);
  }
};
