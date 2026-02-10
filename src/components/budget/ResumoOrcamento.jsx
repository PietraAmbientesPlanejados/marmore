import { formatBRL } from '../../utils/formatters';
import { calcularOrcamentoComDetalhes } from '../../utils/calculations';

export const ResumoOrcamento = ({ orcamentoAtual, materiais, precos, onSalvar, onSair }) => {
  const orcamento = calcularOrcamentoComDetalhes(orcamentoAtual, materiais, precos);

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-slate-200">
      <h3 className="text-2xl font-bold mb-6 text-slate-800">Resumo do Orçamento</h3>

      {/* Chapas - Aproveitamento */}
      {orcamento.detalhesChapas && orcamento.detalhesChapas.length > 0 && (
        <div className="mb-6">
          <div className="flex justify-between items-center py-3 border-b border-slate-300 mb-4">
            <span className="font-semibold text-base text-slate-700">Chapas ({orcamento.detalhesChapas.length})</span>
            <div className="flex gap-6">
              <div className="text-right">
                <div className="text-xs text-slate-500 uppercase mb-1">Custo</div>
                <span className="font-semibold text-base text-slate-700">{formatBRL(orcamento.custoChapas)}</span>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500 uppercase mb-1">Venda</div>
                <span className="font-semibold text-base text-slate-800">{formatBRL(orcamento.vendaChapas)}</span>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            {orcamento.detalhesChapas.map((detalhe, idx) => {
              const custoChapa = (detalhe.custoPecas || 0) + (detalhe.custoSobra || 0);
              const vendaChapa = (detalhe.vendaPecas || 0) + (detalhe.custoSobra || 0);
              return (
                <div key={idx} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  {/* Header da chapa */}
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-semibold text-slate-800">
                      Chapa {idx + 1} - {detalhe.materialNome}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded font-medium ${
                      detalhe.percentualAproveitamento >= 70 ? 'bg-green-100 text-green-700' :
                      detalhe.percentualAproveitamento >= 40 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {detalhe.percentualAproveitamento.toFixed(1)}% aproveitamento
                    </span>
                  </div>

                  {/* Metragem e Peças */}
                  <div className="grid grid-cols-4 gap-3 mb-3">
                    <div className="bg-white rounded p-2 border border-slate-200 text-center">
                      <div className="text-xs text-slate-500">Peças</div>
                      <div className="font-bold text-base text-slate-800">{detalhe.numPecas || 0}</div>
                    </div>
                    <div className="bg-white rounded p-2 border border-slate-200 text-center">
                      <div className="text-xs text-slate-500">Área Total</div>
                      <div className="font-bold text-sm text-slate-800">{detalhe.areaTotal.toFixed(2)}m²</div>
                    </div>
                    <div className="bg-white rounded p-2 border border-slate-200 text-center">
                      <div className="text-xs text-slate-500">Área Peças</div>
                      <div className="font-bold text-sm text-slate-800">{detalhe.areaPecas.toFixed(2)}m²</div>
                    </div>
                    <div className="bg-white rounded p-2 border border-slate-200 text-center">
                      <div className="text-xs text-slate-500">Sobra</div>
                      <div className="font-bold text-sm text-slate-800">{detalhe.areaSobra.toFixed(2)}m²</div>
                    </div>
                  </div>

                  {/* Valores */}
                  <div className="flex justify-end gap-6 pt-3 border-t border-slate-200">
                    <div>
                      <span className="text-xs text-slate-500">Custo: </span>
                      <span className="text-base font-bold text-orange-600">{formatBRL(custoChapa)}</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500">Venda: </span>
                      <span className="text-base font-bold text-green-600">{formatBRL(vendaChapa)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Acabamentos, Recortes e Resumo de Metragem */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {orcamento.acabamentos > 0 && (
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 flex flex-col">
            <h4 className="font-semibold text-slate-700 mb-3">Acabamentos</h4>
            <div className="space-y-2 flex-1">
              {(() => {
                // Agregar acabamentos por tipo usando os detalhes já calculados
                const acabamentosPorTipo = {};

                if (orcamento.detalhesAcabamentos && orcamento.detalhesAcabamentos.length > 0) {
                  orcamento.detalhesAcabamentos.forEach(detalhe => {
                    const tipo = detalhe.tipo;
                    if (!acabamentosPorTipo[tipo]) {
                      acabamentosPorTipo[tipo] = 0;
                    }
                    acabamentosPorTipo[tipo] += detalhe.valor;
                  });
                }

                return Object.keys(acabamentosPorTipo)
                  .filter(tipo => acabamentosPorTipo[tipo] > 0)
                  .map((tipo, idx, arr) => (
                    <div key={tipo} className={`flex justify-between items-center text-sm ${idx < arr.length - 1 ? 'pb-2 border-b border-slate-300' : ''}`}>
                      <span className="text-slate-600 font-medium">{tipo}</span>
                      <span className="text-slate-700 font-semibold">{formatBRL(acabamentosPorTipo[tipo])}</span>
                    </div>
                  ));
              })()}
            </div>
            <div className="flex justify-between items-center text-sm pt-2 mt-auto border-t-2 border-slate-400">
              <span className="text-slate-700 font-bold">Total</span>
              <span className="text-slate-800 font-bold text-base">{formatBRL(orcamento.acabamentos)}</span>
            </div>
          </div>
        )}
        {orcamento.recortes > 0 && (
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 flex flex-col">
            <h4 className="font-semibold text-slate-700 mb-3">Recortes</h4>
            <div className="space-y-2 flex-1">
              {(() => {
                const recortesPorTipo = {};
                if (orcamento.detalhesRecortes && orcamento.detalhesRecortes.length > 0) {
                  orcamento.detalhesRecortes.forEach(detalhe => {
                    const tipo = detalhe.tipo;
                    if (!recortesPorTipo[tipo]) {
                      recortesPorTipo[tipo] = 0;
                    }
                    recortesPorTipo[tipo] += detalhe.valor;
                  });
                }
                return Object.keys(recortesPorTipo)
                  .filter(tipo => recortesPorTipo[tipo] > 0)
                  .map((tipo, idx, arr) => (
                    <div key={tipo} className={`flex justify-between items-center text-sm ${idx < arr.length - 1 ? 'pb-2 border-b border-slate-300' : ''}`}>
                      <span className="text-slate-600 font-medium">{tipo}</span>
                      <span className="text-slate-700 font-semibold">{formatBRL(recortesPorTipo[tipo])}</span>
                    </div>
                  ));
              })()}
            </div>
            <div className="flex justify-between items-center text-sm pt-2 mt-auto border-t-2 border-slate-400">
              <span className="text-slate-700 font-bold">Total</span>
              <span className="text-slate-800 font-bold text-base">{formatBRL(orcamento.recortes)}</span>
            </div>
          </div>
        )}
        {orcamento.detalhesChapas && orcamento.detalhesChapas.length > 0 && (
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 flex flex-col">
            <h4 className="font-semibold text-slate-700 mb-3">Resumo de Metragem</h4>
            <div className="space-y-2 flex-1">
              <div className="flex justify-between items-center text-sm pb-2 border-b border-slate-300">
                <span className="text-slate-600 font-medium">Peças Cobradas</span>
                <div className="text-right">
                  <span className="text-slate-700 font-semibold">
                    {orcamento.detalhesChapas.reduce((sum, d) => sum + d.areaPecas, 0).toFixed(2)}m²
                  </span>
                  <span className="text-xs text-slate-500 ml-2">
                    ({formatBRL(orcamento.detalhesChapas.reduce((sum, d) => sum + d.vendaPecas, 0))})
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center text-sm pb-2 border-b border-slate-300">
                <span className="text-slate-600 font-medium">Sobra Cobrada</span>
                <div className="text-right">
                  <span className="text-slate-700 font-semibold">
                    {orcamento.detalhesChapas.reduce((sum, d) => sum + d.areaSobra, 0).toFixed(2)}m²
                  </span>
                  <span className="text-xs text-slate-500 ml-2">
                    ({formatBRL(orcamento.detalhesChapas.reduce((sum, d) => sum + d.custoSobra, 0))} preço custo)
                  </span>
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center text-sm pt-2 mt-auto border-t-2 border-slate-400">
              <span className="text-slate-700 font-bold">Total Geral</span>
              <div className="text-right">
                <span className="text-slate-800 font-bold text-base">
                  {orcamento.detalhesChapas.reduce((sum, d) => sum + d.areaTotal, 0).toFixed(2)}m²
                </span>
                <span className="text-xs text-slate-500 ml-2">
                  ({((orcamento.detalhesChapas.reduce((sum, d) => sum + d.areaPecas, 0) / orcamento.detalhesChapas.reduce((sum, d) => sum + d.areaTotal, 0)) * 100).toFixed(1)}% aproveitamento)
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Total Geral */}
      <div className="mt-6 space-y-3">
        <div className="flex justify-between py-3 border-t-2 border-slate-300 bg-slate-50 px-4 rounded-lg">
          <span className="text-base font-semibold text-slate-700 uppercase">Custo Total</span>
          <span className="text-base font-semibold text-slate-700">{formatBRL(orcamento.custoTotal)}</span>
        </div>
        <div className="flex justify-between py-4 bg-green-700 px-4 rounded-lg">
          <span className="text-xl font-bold text-white uppercase">Valor de Venda</span>
          <span className="text-xl font-bold text-white">{formatBRL(orcamento.vendaTotal)}</span>
        </div>
        {orcamento.margemTotal > 0 && (
          <div className="flex justify-between py-3 bg-slate-50 px-4 rounded-lg border border-slate-300">
            <span className="text-base font-semibold text-slate-700 uppercase">Margem de Lucro</span>
            <span className="text-base font-semibold text-slate-700">
              {formatBRL(orcamento.margemTotal)}
              <span className="text-sm ml-2 text-slate-500">({((orcamento.margemTotal / orcamento.vendaTotal) * 100).toFixed(1)}%)</span>
            </span>
          </div>
        )}
      </div>

      {/* Botões de Ação */}
      {(onSalvar || onSair) && (
        <div className="mt-6 flex justify-end gap-4">
          {onSair && (
            <button
              onClick={onSair}
              className="bg-slate-600 hover:bg-slate-700 text-white px-6 py-2.5 rounded-lg font-medium text-base transition-all hover:shadow-lg hover:shadow-slate-500/50 hover:scale-105 active:scale-95"
            >
              Voltar
            </button>
          )}
          {onSalvar && (
            <button
              onClick={onSalvar}
              className="bg-slate-700 hover:bg-slate-800 text-white px-6 py-2.5 rounded-lg font-medium text-base transition-all hover:shadow-lg hover:shadow-slate-500/50 hover:scale-105 active:scale-95"
            >
              Salvar Orçamento
            </button>
          )}
        </div>
      )}
    </div>
  );
};
