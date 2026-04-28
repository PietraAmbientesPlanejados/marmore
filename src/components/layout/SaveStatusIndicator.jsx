/**
 * Indicador visual do status do auto-save.
 * Estilo pill colorido — bem visível ao lado do título.
 */
export const SaveStatusIndicator = ({ status, ultimaGravacao, onRetry }) => {
  if (status === 'saving') {
    return (
      <span className="inline-flex items-center gap-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
        <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
        Salvando...
      </span>
    );
  }

  if (status === 'saved' && ultimaGravacao) {
    return (
      <span className="inline-flex items-center gap-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-3 py-1">
        <span className="text-green-600">✓</span>
        Salvo às{' '}
        {ultimaGravacao.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })}
      </span>
    );
  }

  if (status === 'error') {
    return (
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-full px-3 py-1 hover:bg-red-100 transition-colors cursor-pointer"
        title="Clique para tentar salvar novamente"
      >
        <span>⚠️</span>
        Erro ao salvar — clique para tentar de novo
      </button>
    );
  }

  return null;
};
