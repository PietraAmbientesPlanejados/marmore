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
          const materialConfig = orcamento.materiais?.[parseInt(materialId)] || {
            comprimento: 3000,
            altura: 2000,
            custo: 250,
            venda: 333.33
          };
          const qtd = orcamento.chapasPorMaterial[materialId];
          const areaChapa = (materialConfig.comprimento * materialConfig.altura / 1000000);
          const custoParcial = materialConfig.custo * areaChapa * qtd;
          const vendaParcial = materialConfig.venda * areaChapa * qtd;
          return (
            <div key={materialId} className="flex justify-between text-sm text-slate-700 pl-4 py-2 hover:bg-slate-50 rounded">
              <span className="flex-1">
                <span className="font-medium">{material?.nome}</span>
                <span className="text-slate-500 ml-2">
                  ({qtd}x chapas • {materialConfig.comprimento}x{materialConfig.altura}mm •
                  {(areaChapa * qtd).toFixed(2)}m² total)
                </span>
              </span>
              <div className="flex gap-6 ml-4">
                <span className="text-orange-600 w-24 text-right">{formatBRL(custoParcial)}</span>
                <span className="text-green-600 w-24 text-right">{formatBRL(vendaParcial)}</span>
              </div>
            </div>
          );
        })}
        {orcamento.margemChapas > 0 && orcamento.vendaChapas > 0 && (
          <div className="mt-2 pt-2 border-t border-slate-200 flex justify-between text-sm pl-4">
            <span className="font-semibold text-slate-600">Margem das Chapas:</span>
            <span className="font-semibold text-blue-600">{formatBRL(orcamento.margemChapas)} ({((orcamento.margemChapas / orcamento.vendaChapas) * 100).toFixed(1)}%)</span>
          </div>
        )}

        {/* Detalhamento por Chapa - NOVO */}
        {orcamento.detalhesChapas && orcamento.detalhesChapas.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
              📊 Aproveitamento por Chapa
              <span className="text-xs text-slate-500 font-normal">(peças = preço venda, sobra = preço custo)</span>
            </h4>
            {orcamento.detalhesChapas.map((detalhe, idx) => (
              <div key={idx} className="bg-slate-50 rounded-lg p-3 mb-2 text-sm">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-medium text-slate-800">
                    Chapa {idx + 1} - {detalhe.materialNome}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded font-medium ${
                    detalhe.percentualAproveitamento >= 80 ? 'bg-green-100 text-green-800' :
                    detalhe.percentualAproveitamento >= 50 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {detalhe.percentualAproveitamento.toFixed(1)}% aproveitamento
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600">
                  <div>📏 Área total: <strong>{detalhe.areaTotal.toFixed(2)}m²</strong></div>
                  <div>✂️ Área peças: <strong>{detalhe.areaPecas.toFixed(2)}m²</strong></div>
                  <div>🔲 Área sobra: <strong>{detalhe.areaSobra.toFixed(2)}m²</strong></div>
                  <div>💵 Venda peças: <strong className="text-green-700">{formatBRL(detalhe.vendaPecas)}</strong></div>
                  <div>💰 Custo sobra: <strong className="text-orange-700">{formatBRL(detalhe.custoSobra)}</strong></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Resumo de Metragem - NOVO */}
        {orcamento.detalhesChapas && orcamento.detalhesChapas.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <h4 className="font-semibold text-slate-700 mb-3">📐 Resumo de Metragem</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                <div className="text-xs text-green-700 font-medium mb-1">Peças Cobradas</div>
                <div className="text-xl font-bold text-green-800">
                  {orcamento.detalhesChapas.reduce((sum, d) => sum + d.areaPecas, 0).toFixed(2)}m²
                </div>
                <div className="text-xs text-green-600 mt-1">
                  {formatBRL(orcamento.detalhesChapas.reduce((sum, d) => sum + d.vendaPecas, 0))}
                </div>
              </div>
              <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                <div className="text-xs text-orange-700 font-medium mb-1">Sobra Cobrada</div>
                <div className="text-xl font-bold text-orange-800">
                  {orcamento.detalhesChapas.reduce((sum, d) => sum + d.areaSobra, 0).toFixed(2)}m²
                </div>
                <div className="text-xs text-orange-600 mt-1">
                  {formatBRL(orcamento.detalhesChapas.reduce((sum, d) => sum + d.custoSobra, 0))} (preço custo)
                </div>
              </div>
              <div className="bg-slate-100 rounded-lg p-3 border border-slate-300">
                <div className="text-xs text-slate-700 font-medium mb-1">Total Geral</div>
                <div className="text-xl font-bold text-slate-800">
                  {orcamento.detalhesChapas.reduce((sum, d) => sum + d.areaTotal, 0).toFixed(2)}m²
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  {((orcamento.detalhesChapas.reduce((sum, d) => sum + d.areaPecas, 0) / orcamento.detalhesChapas.reduce((sum, d) => sum + d.areaTotal, 0)) * 100).toFixed(1)}% aproveitamento
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Resumo Simplificado de Acabamentos e Recortes */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {orcamento.acabamentos > 0 && (
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="text-sm text-blue-700 font-medium mb-1">Total Acabamentos</div>
            <div className="text-2xl font-bold text-blue-800">{formatBRL(orcamento.acabamentos)}</div>
            <div className="text-xs text-blue-600 mt-1">Ver detalhes em cada peça</div>
          </div>
        )}
        {orcamento.recortes > 0 && (
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <div className="text-sm text-purple-700 font-medium mb-1">Total Recortes</div>
            <div className="text-2xl font-bold text-purple-800">{formatBRL(orcamento.recortes)}</div>
            <div className="text-xs text-purple-600 mt-1">Ver detalhes em cada peça</div>
          </div>
        )}
      </div>

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
