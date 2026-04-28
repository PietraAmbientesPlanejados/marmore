import { useEffect, useRef, useState, useCallback } from 'react';
import { saveOrcamento } from '../utils/database';

/**
 * Auto-save do orçamento atual no banco com debounce + retry + estado visível.
 *
 * - Debounce de 600ms: agrupa várias alterações rápidas (ex: arrastar peça) num único save.
 * - Retry com backoff: se falhar, tenta de novo em 2s, 5s, 10s (máx 3 tentativas).
 * - Estado `status`: 'idle' | 'saving' | 'saved' | 'error' — alimenta o indicador visual.
 * - `salvar()`: força save imediato (usado pelo botão manual).
 */
export const useAutoSave = (orcamentoAtual) => {
  const [status, setStatus] = useState('idle');
  const [ultimaGravacao, setUltimaGravacao] = useState(null);

  const orcamentoRef = useRef(orcamentoAtual);
  const debounceTimerRef = useRef(null);
  const retryTimerRef = useRef(null);
  const primeiraCargaRef = useRef(true);
  const ultimoIdRef = useRef(null);

  // Mantém ref atualizada pro salvar() poder pegar o estado mais recente
  useEffect(() => {
    orcamentoRef.current = orcamentoAtual;
  }, [orcamentoAtual]);

  const executarSalvamento = useCallback(async (tentativa = 1) => {
    const orc = orcamentoRef.current;
    if (!orc) return;

    setStatus('saving');
    try {
      await saveOrcamento(orc);
      setStatus('saved');
      setUltimaGravacao(new Date());
    } catch (err) {
      console.error(`Erro ao salvar orçamento (tentativa ${tentativa}):`, err);
      if (tentativa < 3) {
        const delays = [2000, 5000, 10000];
        retryTimerRef.current = setTimeout(
          () => executarSalvamento(tentativa + 1),
          delays[tentativa - 1]
        );
        setStatus('error');
      } else {
        setStatus('error');
      }
    }
  }, []);

  // Auto-save com debounce ao mudar orcamentoAtual
  useEffect(() => {
    if (!orcamentoAtual) {
      primeiraCargaRef.current = true;
      ultimoIdRef.current = null;
      return;
    }

    // Pular a primeira renderização de cada orçamento (é o carregamento do banco)
    if (primeiraCargaRef.current || ultimoIdRef.current !== orcamentoAtual.id) {
      primeiraCargaRef.current = false;
      ultimoIdRef.current = orcamentoAtual.id;
      return;
    }

    // Cancelar timers pendentes
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);

    setStatus('saving');
    debounceTimerRef.current = setTimeout(() => executarSalvamento(), 600);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [orcamentoAtual, executarSalvamento]);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, []);

  const salvar = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    return executarSalvamento();
  }, [executarSalvamento]);

  return { status, ultimaGravacao, salvar };
};
