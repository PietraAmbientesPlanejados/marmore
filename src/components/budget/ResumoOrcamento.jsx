import { formatBRL } from '../../utils/formatters';
import { calcularOrcamentoComDetalhes } from '../../utils/calculations';

export const ResumoOrcamento = ({ orcamentoAtual, materiais, precos }) => {
  const orcamento = calcularOrcamentoComDetalhes(orcamentoAtual, materiais, precos);

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
      <h3 className="text-2xl font-bold mb-6 text-slate-800">Resumo do Orçamento</h3>

      {/* Chapas de Material - CUSTO vs VENDA */}
      <div className="mb-6">
        <div className="flex justify-between items-center py-3 border-b-2 border-slate-300 mb-3">
          <span className="font-bold text-lg text-slate-800">Chapas de Material</span>
          <div className="flex gap-6">
            <div className="text-right">
              <div className="text-xs text-slate-500 uppercase">Custo</div>
              <span className="font-bold text-lg text-orange-600">{formatBRL(orcamento.custoChapas)}</span>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-500 uppercase">Venda</div>
              <span className="font-bold text-lg text-green-600">{formatBRL(orcamento.vendaChapas)}</span>
            </div>
          </div>
        </div>
        {Object.keys(orcamento.chapasPorMaterial || {}).map(materialId => {
          const material = materiais.find(m => m.id === parseInt(materialId));
          const qtd = orcamento.chapasPorMaterial[materialId];
          const custoParcial = material?.custo * qtd;
          const vendaParcial = (material?.venda || material?.custo) * qtd;
          return (
            <div key={materialId} className="flex justify-between text-sm text-slate-700 pl-4 py-2 hover:bg-slate-50 rounded">
              <span className="flex-1">
                <span className="font-medium">{material?.nome}</span>
                <span className="text-slate-500 ml-2">({qtd}x chapas de {material?.comprimento}x{material?.altura}mm)</span>
              </span>
              <div className="flex gap-6 ml-4">
                <span className="text-orange-600 w-24 text-right">{formatBRL(custoParcial)}</span>
                <span className="text-green-600 w-24 text-right">{formatBRL(vendaParcial)}</span>
              </div>
            </div>
          );
        })}
        {orcamento.margemChapas > 0 && (
          <div className="mt-2 pt-2 border-t border-slate-200 flex justify-between text-sm pl-4">
            <span className="font-semibold text-slate-600">Margem das Chapas:</span>
            <span className="font-semibold text-blue-600">{formatBRL(orcamento.margemChapas)} ({((orcamento.margemChapas / orcamento.vendaChapas) * 100).toFixed(1)}%)</span>
          </div>
        )}
      </div>

      {/* Acabamentos Detalhados */}
      {orcamento.detalhesAcabamentos.length > 0 && (
        <div className="mb-6">
          <div className="flex justify-between py-2 border-b-2 border-gray-300 mb-3">
            <span className="font-bold text-lg">Acabamentos</span>
            <span className="font-bold text-lg">{formatBRL(orcamento.acabamentos)}</span>
          </div>
          {orcamento.detalhesAcabamentos.map((item, idx) => (
            <div key={idx} className="flex justify-between text-sm text-gray-700 pl-4 py-1 border-b border-gray-100">
              <div>
                <span className="font-medium">{item.tipo}</span>
                <span className="text-gray-500 ml-2">({item.medida})</span>
                <div className="text-xs text-gray-500">{item.peca}</div>
              </div>
              <span>{formatBRL(item.valor)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Recortes Detalhados */}
      {orcamento.detalhesRecortes.length > 0 && (
        <div className="mb-6">
          <div className="flex justify-between py-2 border-b-2 border-gray-300 mb-3">
            <span className="font-bold text-lg">Recortes</span>
            <span className="font-bold text-lg">{formatBRL(orcamento.recortes)}</span>
          </div>
          {orcamento.detalhesRecortes.map((item, idx) => (
            <div key={idx} className="flex justify-between text-sm text-gray-700 pl-4 py-1 border-b border-gray-100">
              <div>
                <span className="font-medium">{item.tipo}</span>
                <span className="text-gray-500 ml-2">({item.quantidade}x - {formatBRL(item.valorUnit)} cada)</span>
                <div className="text-xs text-gray-500">{item.peca}</div>
              </div>
              <span>{formatBRL(item.valor)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Total Geral - CUSTO vs VENDA */}
      <div className="mt-6 space-y-3">
        <div className="flex justify-between py-3 border-t-2 border-slate-400 bg-gradient-to-r from-slate-50 to-slate-100 px-4 rounded-lg">
          <span className="text-lg font-bold text-slate-700">CUSTO TOTAL</span>
          <span className="text-lg font-bold text-orange-600">{formatBRL(orcamento.custoTotal)}</span>
        </div>
        <div className="flex justify-between py-3 bg-gradient-to-r from-green-50 to-emerald-50 px-4 rounded-lg border-2 border-green-200">
          <span className="text-xl font-bold text-slate-800">VALOR DE VENDA</span>
          <span className="text-xl font-bold text-green-600">{formatBRL(orcamento.vendaTotal)}</span>
        </div>
        {orcamento.margemTotal > 0 && (
          <div className="flex justify-between py-3 bg-gradient-to-r from-blue-50 to-indigo-50 px-4 rounded-lg border-2 border-blue-200">
            <span className="text-lg font-bold text-slate-800">MARGEM DE LUCRO</span>
            <span className="text-lg font-bold text-blue-600">
              {formatBRL(orcamento.margemTotal)}
              <span className="text-sm ml-2">({((orcamento.margemTotal / orcamento.vendaTotal) * 100).toFixed(1)}%)</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
