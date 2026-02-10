import { formatBRL } from '../../utils/formatters';
import { calcularOrcamentoComDetalhes } from '../../utils/calculations';

export const ResumoOrcamento = ({ orcamentoAtual, materiais, precos, onSalvar, onSair }) => {
  const orcamento = calcularOrcamentoComDetalhes(orcamentoAtual, materiais, precos);

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-slate-200">
      <h3 className="text-2xl font-bold mb-6 text-slate-800">Resumo do Orçamento</h3>

      {/* Chapas de Material - CUSTO vs VENDA */}
      <div className="mb-6">
        <div className="flex justify-between items-center py-3 border-b border-slate-300 mb-3">
          <span className="font-semibold text-base text-slate-700">Chapas de Material</span>
          <div className="flex gap-8">
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
            <div key={materialId} className="flex justify-between text-sm text-slate-600 pl-4 py-2 hover:bg-slate-50 rounded">
              <span className="flex-1">
                <span className="font-medium text-slate-700">{material?.nome}</span>
                <span className="text-slate-500 ml-2">
                  ({qtd}x chapas • {materialConfig.comprimento}x{materialConfig.altura}mm • {(areaChapa * qtd).toFixed(2)}m² total)
                </span>
              </span>
              <div className="flex gap-8 ml-4">
                <span className="text-slate-600 w-24 text-right">{formatBRL(custoParcial)}</span>
                <span className="text-slate-700 w-24 text-right font-medium">{formatBRL(vendaParcial)}</span>
              </div>
            </div>
          );
        })}
        {orcamento.margemChapas > 0 && orcamento.vendaChapas > 0 && (
          <div className="mt-2 pt-2 border-t border-slate-200 flex justify-between text-sm pl-4">
            <span className="font-medium text-slate-600">Margem das Chapas:</span>
            <span className="font-medium text-slate-700">{formatBRL(orcamento.margemChapas)} <span className="text-slate-500">({((orcamento.margemChapas / orcamento.vendaChapas) * 100).toFixed(1)}%)</span></span>
          </div>
        )}

        {/* Detalhamento por Chapa */}
        {orcamento.detalhesChapas && orcamento.detalhesChapas.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <h4 className="font-semibold text-slate-700 mb-3">
              Aproveitamento por Chapa
              <span className="text-xs text-slate-500 font-normal ml-2">(peças = preço venda, sobra = preço custo)</span>
            </h4>
            {orcamento.detalhesChapas.map((detalhe, idx) => (
              <div key={idx} className="bg-slate-50 rounded-lg p-3 mb-2 text-sm border border-slate-200">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-medium text-slate-700">
                    Chapa {idx + 1} - {detalhe.materialNome}
                  </span>
                  <span className="text-xs px-2 py-1 rounded bg-slate-200 text-slate-700 font-medium">
                    {detalhe.percentualAproveitamento.toFixed(1)}% aproveitamento
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600">
                  <div>Área total: <strong className="text-slate-700">{detalhe.areaTotal.toFixed(2)}m²</strong></div>
                  <div>Área peças: <strong className="text-slate-700">{detalhe.areaPecas.toFixed(2)}m²</strong></div>
                  <div>Área sobra: <strong className="text-slate-700">{detalhe.areaSobra.toFixed(2)}m²</strong></div>
                  <div>Venda peças: <strong className="text-slate-700">{formatBRL(detalhe.vendaPecas)}</strong></div>
                  <div>Custo sobra: <strong className="text-slate-700">{formatBRL(detalhe.custoSobra)}</strong></div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Resumo de Metragem, Acabamentos e Recortes */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {orcamento.detalhesChapas && orcamento.detalhesChapas.length > 0 && (
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <h4 className="font-semibold text-slate-700 mb-3">Resumo de Metragem</h4>
            <div className="space-y-2">
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
              <div className="flex justify-between items-center text-sm pt-2 border-t-2 border-slate-400">
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
          </div>
        )}
        {orcamento.acabamentos > 0 && (
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <h4 className="font-semibold text-slate-700 mb-3">Acabamentos</h4>
            <div className="space-y-2">
              {(() => {
                // Agregar acabamentos por tipo usando os detalhes já calculados
                const acabamentosPorTipo = {};

                if (orcamento.detalhesAcabamentos && orcamento.detalhesAcabamentos.length > 0) {
                  orcamento.detalhesAcabamentos.forEach(detalhe => {
                    const tipo = detalhe.tipo; // Já vem com nome bonito: 'Polimento', 'Esquadria', etc.
                    if (!acabamentosPorTipo[tipo]) {
                      acabamentosPorTipo[tipo] = 0;
                    }
                    acabamentosPorTipo[tipo] += detalhe.valor;
                  });
                }

                const items = Object.keys(acabamentosPorTipo)
                  .filter(tipo => acabamentosPorTipo[tipo] > 0)
                  .map((tipo, idx, arr) => (
                    <div key={tipo} className={`flex justify-between items-center text-sm ${idx < arr.length - 1 ? 'pb-2 border-b border-slate-300' : ''}`}>
                      <span className="text-slate-600 font-medium">{tipo}</span>
                      <span className="text-slate-700 font-semibold">{formatBRL(acabamentosPorTipo[tipo])}</span>
                    </div>
                  ));

                items.push(
                  <div key="total" className="flex justify-between items-center text-sm pt-2 border-t-2 border-slate-400">
                    <span className="text-slate-700 font-bold">Total</span>
                    <span className="text-slate-800 font-bold text-base">{formatBRL(orcamento.acabamentos)}</span>
                  </div>
                );

                return items;
              })()}
            </div>
          </div>
        )}
        {orcamento.recortes > 0 && (
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <div className="text-sm text-slate-600 font-medium mb-1">Total Recortes</div>
            <div className="text-2xl font-bold text-slate-800">{formatBRL(orcamento.recortes)}</div>
            <div className="text-xs text-slate-500 mt-1">Ver detalhes em cada peça</div>
          </div>
        )}
      </div>

      {/* Total Geral */}
      <div className="mt-6 space-y-3">
        <div className="flex justify-between py-3 border-t-2 border-slate-300 bg-slate-50 px-4 rounded-lg">
          <span className="text-base font-semibold text-slate-700 uppercase">Custo Total</span>
          <span className="text-base font-semibold text-slate-700">{formatBRL(orcamento.custoTotal)}</span>
        </div>
        <div className="flex justify-between py-4 bg-slate-800 px-4 rounded-lg">
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
