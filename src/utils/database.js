import { db, isFirebaseConfigured } from '../lib/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import { PRECOS_PADRAO, STORAGE_KEYS } from '../constants/config';

/**
 * Camada de acesso ao banco de dados (Firebase Firestore).
 * Se o Firebase não estiver configurado (.env ausente), cai no fallback localStorage.
 *
 * Convenção de IDs: usamos IDs numéricos (Date.now()) como ID do documento Firestore.
 * Isso mantém compatibilidade com o código que compara ids com números (===).
 */

const ORCAMENTO_PADRAO_BASE = {
  ambientes: [],
  chapas: [],
  precos: {},
  materiaisConfig: {},
};

// ============ MATERIAIS ============

export async function getMateriais() {
  if (!isFirebaseConfigured) {
    return getFromLocalStorage(STORAGE_KEYS.MATERIAIS, []);
  }
  try {
    const snap = await getDocs(collection(db, 'materiais'));
    const data = snap.docs.map((d) => ({ id: Number(d.id), ...d.data() }));
    return data.sort((a, b) => a.id - b.id);
  } catch (error) {
    console.error('Erro ao buscar materiais:', error);
    return getFromLocalStorage(STORAGE_KEYS.MATERIAIS, []);
  }
}

export async function saveMaterial(material) {
  if (!isFirebaseConfigured) {
    return saveToLocalStorageArray(STORAGE_KEYS.MATERIAIS, material);
  }
  try {
    const id = material.id || Date.now();
    const payload = { nome: material.nome };
    await setDoc(doc(db, 'materiais', String(id)), payload, { merge: true });
    return { id, ...payload };
  } catch (error) {
    console.error('Erro ao salvar material:', error);
    return null;
  }
}

export async function deleteMaterial(materialId) {
  if (!isFirebaseConfigured) {
    return deleteFromLocalStorageArray(STORAGE_KEYS.MATERIAIS, materialId);
  }
  try {
    await deleteDoc(doc(db, 'materiais', String(materialId)));
    return true;
  } catch (error) {
    console.error('Erro ao excluir material:', error);
    return false;
  }
}

// ============ ORÇAMENTOS ============

export async function getOrcamentos() {
  if (!isFirebaseConfigured) {
    return getFromLocalStorage(STORAGE_KEYS.ORCAMENTOS, []);
  }
  try {
    const snap = await getDocs(collection(db, 'orcamentos'));
    const data = snap.docs.map((d) => {
      const raw = d.data();
      return {
        id: Number(d.id),
        nome: raw.nome,
        dataCriacao: raw.dataCriacao,
        ambientes: raw.ambientes || [],
        chapas: raw.chapas || [],
        precos: raw.precos || { ...PRECOS_PADRAO },
        materiais: raw.materiaisConfig || {},
      };
    });
    return data.sort((a, b) => a.id - b.id);
  } catch (error) {
    console.error('Erro ao buscar orçamentos:', error);
    return getFromLocalStorage(STORAGE_KEYS.ORCAMENTOS, []);
  }
}

export async function saveOrcamento(orcamento) {
  if (!isFirebaseConfigured) {
    return saveToLocalStorageArray(STORAGE_KEYS.ORCAMENTOS, orcamento);
  }
  try {
    const id = orcamento.id || Date.now();
    const payload = {
      ...ORCAMENTO_PADRAO_BASE,
      nome: orcamento.nome,
      dataCriacao: orcamento.dataCriacao || new Date().toISOString(),
      ambientes: orcamento.ambientes || [],
      chapas: orcamento.chapas || [],
      precos: orcamento.precos || {},
      materiaisConfig: orcamento.materiais || {},
    };
    await setDoc(doc(db, 'orcamentos', String(id)), payload);
    return {
      id,
      nome: payload.nome,
      dataCriacao: payload.dataCriacao,
      ambientes: payload.ambientes,
      chapas: payload.chapas,
      precos: payload.precos,
      materiais: payload.materiaisConfig,
    };
  } catch (error) {
    console.error('Erro ao salvar orçamento:', error);
    return null;
  }
}

export async function deleteOrcamento(orcamentoId) {
  if (!isFirebaseConfigured) {
    return deleteFromLocalStorageArray(STORAGE_KEYS.ORCAMENTOS, orcamentoId);
  }
  try {
    await deleteDoc(doc(db, 'orcamentos', String(orcamentoId)));
    return true;
  } catch (error) {
    console.error('Erro ao excluir orçamento:', error);
    return false;
  }
}

// ============ PREÇOS PADRÃO ============

export async function getPrecos() {
  if (!isFirebaseConfigured) {
    return getFromLocalStorage(STORAGE_KEYS.PRECOS, PRECOS_PADRAO);
  }
  try {
    const snap = await getDoc(doc(db, 'config', 'precos_padrao'));
    return snap.exists() ? snap.data().config || PRECOS_PADRAO : PRECOS_PADRAO;
  } catch (error) {
    console.error('Erro ao buscar preços:', error);
    return PRECOS_PADRAO;
  }
}

export async function savePrecos(precos) {
  if (!isFirebaseConfigured) {
    try {
      localStorage.setItem(STORAGE_KEYS.PRECOS, JSON.stringify(precos));
      return true;
    } catch {
      return false;
    }
  }
  try {
    await setDoc(doc(db, 'config', 'precos_padrao'), {
      config: precos,
      updatedAt: new Date().toISOString(),
    });
    return true;
  } catch (error) {
    console.error('Erro ao salvar preços:', error);
    return false;
  }
}

// ============ AUTENTICAÇÃO ============

const SENHA_PADRAO = 'pietra2025';

export async function verificarSenha(senhaDigitada) {
  if (!isFirebaseConfigured) {
    return senhaDigitada === SENHA_PADRAO;
  }
  try {
    const snap = await getDoc(doc(db, 'config', 'sistema'));
    if (!snap.exists()) return senhaDigitada === SENHA_PADRAO;
    return senhaDigitada === snap.data().senhaHash;
  } catch (error) {
    console.error('Erro ao verificar senha:', error);
    return senhaDigitada === SENHA_PADRAO;
  }
}

// ============ MIGRAÇÃO localStorage → Firebase ============

export async function migrarLocalStorageParaFirebase() {
  if (!isFirebaseConfigured) return;
  if (localStorage.getItem('pietra_migrado_firebase') === 'true') return;

  console.log('Iniciando migração do localStorage para Firebase...');
  try {
    const materiaisLocal = getFromLocalStorage(STORAGE_KEYS.MATERIAIS, []);
    if (materiaisLocal.length > 0) {
      const snap = await getDocs(collection(db, 'materiais'));
      if (snap.empty) {
        for (const mat of materiaisLocal) {
          await saveMaterial(mat);
        }
        console.log(`Migrados ${materiaisLocal.length} materiais`);
      }
    }

    const orcamentosLocal = getFromLocalStorage(STORAGE_KEYS.ORCAMENTOS, []);
    if (orcamentosLocal.length > 0) {
      const snap = await getDocs(collection(db, 'orcamentos'));
      if (snap.empty) {
        for (const orc of orcamentosLocal) {
          await saveOrcamento(orc);
        }
        console.log(`Migrados ${orcamentosLocal.length} orçamentos`);
      }
    }

    const precosLocal = getFromLocalStorage(STORAGE_KEYS.PRECOS, null);
    if (precosLocal) {
      await savePrecos(precosLocal);
      console.log('Preços migrados');
    }

    localStorage.setItem('pietra_migrado_firebase', 'true');
    console.log('Migração concluída com sucesso!');
  } catch (error) {
    console.error('Erro durante migração:', error);
  }
}

// Alias de compatibilidade — nome antigo (Supabase) ainda é importado em useBudgets.js
export const migrarLocalStorageParaSupabase = migrarLocalStorageParaFirebase;

// ============ HELPERS localStorage (fallback) ============

function getFromLocalStorage(key, defaultValue) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function saveToLocalStorageArray(key, item) {
  try {
    const items = getFromLocalStorage(key, []);
    const index = items.findIndex((i) => i.id === item.id);
    if (index >= 0) {
      items[index] = item;
    } else {
      const novoId = items.length > 0 ? Math.max(...items.map((i) => i.id)) + 1 : 1;
      item.id = novoId;
      items.push(item);
    }
    localStorage.setItem(key, JSON.stringify(items));
    return item;
  } catch {
    return null;
  }
}

function deleteFromLocalStorageArray(key, itemId) {
  try {
    const items = getFromLocalStorage(key, []);
    const filtered = items.filter((i) => i.id !== itemId);
    localStorage.setItem(key, JSON.stringify(filtered));
    return true;
  } catch {
    return false;
  }
}
