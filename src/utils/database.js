import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { PRECOS_PADRAO, STORAGE_KEYS } from '../constants/config';

/**
 * Camada de acesso ao banco de dados (Supabase)
 * Quando o Supabase não está configurado, usa localStorage como fallback
 */

// ============ MATERIAIS ============

export async function getMateriais() {
  if (!isSupabaseConfigured) {
    return getFromLocalStorage(STORAGE_KEYS.MATERIAIS, []);
  }

  const { data, error } = await supabase
    .from('materiais')
    .select('*')
    .order('id');

  if (error) {
    console.error('Erro ao buscar materiais:', error);
    return getFromLocalStorage(STORAGE_KEYS.MATERIAIS, []);
  }

  return data;
}

export async function saveMaterial(material) {
  if (!isSupabaseConfigured) {
    return saveToLocalStorageArray(STORAGE_KEYS.MATERIAIS, material);
  }

  if (material.id) {
    // Atualizar existente
    const { data, error } = await supabase
      .from('materiais')
      .update({ nome: material.nome })
      .eq('id', material.id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar material:', error);
      return null;
    }
    return data;
  } else {
    // Inserir novo
    const { data, error } = await supabase
      .from('materiais')
      .insert({ nome: material.nome })
      .select()
      .single();

    if (error) {
      console.error('Erro ao inserir material:', error);
      return null;
    }
    return data;
  }
}

export async function deleteMaterial(materialId) {
  if (!isSupabaseConfigured) {
    return deleteFromLocalStorageArray(STORAGE_KEYS.MATERIAIS, materialId);
  }

  const { error } = await supabase
    .from('materiais')
    .delete()
    .eq('id', materialId);

  if (error) {
    console.error('Erro ao excluir material:', error);
    return false;
  }
  return true;
}

// ============ ORÇAMENTOS ============

export async function getOrcamentos() {
  if (!isSupabaseConfigured) {
    return getFromLocalStorage(STORAGE_KEYS.ORCAMENTOS, []);
  }

  const { data, error } = await supabase
    .from('orcamentos')
    .select('*')
    .order('id');

  if (error) {
    console.error('Erro ao buscar orçamentos:', error);
    return getFromLocalStorage(STORAGE_KEYS.ORCAMENTOS, []);
  }

  // Mapear campos do banco para o formato esperado pelo app
  return data.map(orc => ({
    id: orc.id,
    nome: orc.nome,
    dataCriacao: orc.data_criacao,
    ambientes: orc.ambientes || [],
    chapas: orc.chapas || [],
    precos: orc.precos || { ...PRECOS_PADRAO },
    materiais: orc.materiais_config || {}
  }));
}

export async function saveOrcamento(orcamento) {
  if (!isSupabaseConfigured) {
    return saveToLocalStorageArray(STORAGE_KEYS.ORCAMENTOS, orcamento);
  }

  const dbData = {
    nome: orcamento.nome,
    data_criacao: orcamento.dataCriacao || new Date().toISOString(),
    ambientes: orcamento.ambientes || [],
    chapas: orcamento.chapas || [],
    precos: orcamento.precos || {},
    materiais_config: orcamento.materiais || {}
  };

  if (orcamento.id) {
    // Atualizar existente
    const { data, error } = await supabase
      .from('orcamentos')
      .update(dbData)
      .eq('id', orcamento.id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar orçamento:', error);
      return null;
    }

    return {
      id: data.id,
      nome: data.nome,
      dataCriacao: data.data_criacao,
      ambientes: data.ambientes || [],
      chapas: data.chapas || [],
      precos: data.precos || {},
      materiais: data.materiais_config || {}
    };
  } else {
    // Inserir novo
    const { data, error } = await supabase
      .from('orcamentos')
      .insert(dbData)
      .select()
      .single();

    if (error) {
      console.error('Erro ao inserir orçamento:', error);
      return null;
    }

    return {
      id: data.id,
      nome: data.nome,
      dataCriacao: data.data_criacao,
      ambientes: data.ambientes || [],
      chapas: data.chapas || [],
      precos: data.precos || {},
      materiais: data.materiais_config || {}
    };
  }
}

export async function deleteOrcamento(orcamentoId) {
  if (!isSupabaseConfigured) {
    return deleteFromLocalStorageArray(STORAGE_KEYS.ORCAMENTOS, orcamentoId);
  }

  const { error } = await supabase
    .from('orcamentos')
    .delete()
    .eq('id', orcamentoId);

  if (error) {
    console.error('Erro ao excluir orçamento:', error);
    return false;
  }
  return true;
}

// ============ PREÇOS ============

export async function getPrecos() {
  if (!isSupabaseConfigured) {
    return getFromLocalStorage(STORAGE_KEYS.PRECOS, PRECOS_PADRAO);
  }

  const { data, error } = await supabase
    .from('precos_padrao')
    .select('config')
    .eq('id', 1)
    .single();

  if (error) {
    console.error('Erro ao buscar preços:', error);
    return PRECOS_PADRAO;
  }

  return data?.config || PRECOS_PADRAO;
}

export async function savePrecos(precos) {
  if (!isSupabaseConfigured) {
    try {
      localStorage.setItem(STORAGE_KEYS.PRECOS, JSON.stringify(precos));
      return true;
    } catch {
      return false;
    }
  }

  const { error } = await supabase
    .from('precos_padrao')
    .upsert({
      id: 1,
      config: precos,
      updated_at: new Date().toISOString()
    });

  if (error) {
    console.error('Erro ao salvar preços:', error);
    return false;
  }
  return true;
}

// ============ AUTENTICAÇÃO ============

export async function verificarSenha(senhaDigitada) {
  if (!isSupabaseConfigured) {
    // Fallback: senha padrão quando Supabase não está configurado
    return senhaDigitada === 'pietra2025';
  }

  const { data, error } = await supabase
    .from('config_sistema')
    .select('senha_hash')
    .eq('id', 1)
    .single();

  if (error || !data) {
    console.error('Erro ao verificar senha:', error);
    // Fallback em caso de erro de conexão
    return senhaDigitada === 'pietra2025';
  }

  return senhaDigitada === data.senha_hash;
}

// ============ MIGRAÇÃO localStorage → Supabase ============

export async function migrarLocalStorageParaSupabase() {
  if (!isSupabaseConfigured) return;

  const jaFoiMigrado = localStorage.getItem('pietra_migrado_supabase');
  if (jaFoiMigrado === 'true') return;

  console.log('Iniciando migração do localStorage para Supabase...');

  try {
    // Migrar materiais
    const materiaisLocal = getFromLocalStorage(STORAGE_KEYS.MATERIAIS, []);
    if (materiaisLocal.length > 0) {
      // Verificar se já existem materiais no banco
      const { data: materiaisExistentes } = await supabase.from('materiais').select('id');
      if (!materiaisExistentes || materiaisExistentes.length === 0) {
        for (const mat of materiaisLocal) {
          await supabase.from('materiais').insert({ nome: mat.nome });
        }
        console.log(`Migrados ${materiaisLocal.length} materiais`);
      }
    }

    // Migrar orçamentos
    const orcamentosLocal = getFromLocalStorage(STORAGE_KEYS.ORCAMENTOS, []);
    if (orcamentosLocal.length > 0) {
      const { data: orcExistentes } = await supabase.from('orcamentos').select('id');
      if (!orcExistentes || orcExistentes.length === 0) {
        for (const orc of orcamentosLocal) {
          await supabase.from('orcamentos').insert({
            nome: orc.nome,
            data_criacao: orc.dataCriacao || new Date().toISOString(),
            ambientes: orc.ambientes || [],
            chapas: orc.chapas || [],
            precos: orc.precos || {},
            materiais_config: orc.materiais || {}
          });
        }
        console.log(`Migrados ${orcamentosLocal.length} orçamentos`);
      }
    }

    // Migrar preços
    const precosLocal = getFromLocalStorage(STORAGE_KEYS.PRECOS, null);
    if (precosLocal) {
      await supabase.from('precos_padrao').upsert({
        id: 1,
        config: precosLocal,
        updated_at: new Date().toISOString()
      });
      console.log('Preços migrados');
    }

    localStorage.setItem('pietra_migrado_supabase', 'true');
    console.log('Migração concluída com sucesso!');
  } catch (error) {
    console.error('Erro durante migração:', error);
  }
}

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
    const index = items.findIndex(i => i.id === item.id);
    if (index >= 0) {
      items[index] = item;
    } else {
      const novoId = items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1;
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
    const filtered = items.filter(i => i.id !== itemId);
    localStorage.setItem(key, JSON.stringify(filtered));
    return true;
  } catch {
    return false;
  }
}
