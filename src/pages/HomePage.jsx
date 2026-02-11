import { useState } from 'react';

/**
 * Página principal do sistema
 * Exibe lista de materiais e orçamentos
 */
export const HomePage = ({
  materiais,
  orcamentos,
  onNavigateMaterial,
  onNavigateOrcamento,
  onExcluirMaterial,
  onExcluirOrcamento,
  onDuplicarOrcamento,
  calcularOrcamento,
  formatBRL
}) => {
  const [buscaOrcamento, setBuscaOrcamento] = useState('');

  // Filtrar orçamentos com base na busca
  const orcamentosFiltrados = orcamentos.filter(orc =>
    orc.nome.toLowerCase().includes(buscaOrcamento.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Grid com proporção 2:1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card de Orçamentos - Ocupa 2 colunas */}
        <div className="lg:col-span-2 bg-gray-100 rounded-lg shadow-sm p-6 border border-slate-200 min-h-[500px] max-h-[calc(100vh-200px)] flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-slate-800">Orçamentos</h2>
            <button
              onClick={() => onNavigateOrcamento('novo')}
              className="bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all hover:shadow-lg hover:shadow-slate-500/50 hover:scale-105 active:scale-95"
            >
              + Novo
            </button>
          </div>

          {/* Campo de Busca */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="🔍 Buscar orçamento..."
              value={buscaOrcamento}
              onChange={(e) => setBuscaOrcamento(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-400 focus:border-slate-400 transition-all"
            />
          </div>

          {/* Lista de Orçamentos */}
          <div className="flex-1 overflow-y-auto">
            {orcamentosFiltrados.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <p className="text-sm">
                  {buscaOrcamento ? 'Nenhum orçamento encontrado' : 'Nenhum orçamento criado'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {orcamentosFiltrados.map(orc => {
                  const totalPecas = orc.ambientes.reduce((sum, amb) => sum + amb.pecas.length, 0);
                  const orcCalc = calcularOrcamento(orc);
                  return (
                    <div
                      key={orc.id}
                      onClick={() => onNavigateOrcamento('abrir', orc.id)}
                      className="border border-slate-200 rounded-lg px-4 py-2 hover:border-slate-400 hover:shadow-sm transition-all cursor-pointer group"
                    >
                      <div className="flex items-stretch justify-between gap-4">
                        {/* Nome e informações */}
                        <div className="flex-1 flex flex-col">
                          <h3 className="text-2xl font-bold text-slate-800 group-hover:text-slate-900">
                            {orc.nome || `Orçamento #${String(orc.id).slice(-6)}`}
                          </h3>
                          <div className="flex gap-4 text-sm text-slate-600 mt-auto font-medium">
                            <span className="flex items-center gap-1">
                              <span className="text-lg">🏠</span> {orc.ambientes.length} ambientes
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="text-lg">📦</span> {totalPecas} peças
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="text-lg">📄</span> {orc.chapas.length} chapas
                            </span>
                          </div>
                        </div>

                        {/* Resumo do Orçamento */}
                        <div className="flex flex-wrap gap-2">
                          <div className="bg-blue-50 rounded-lg p-2 border border-blue-200 min-w-[90px]">
                            <div className="text-xs text-slate-600 font-medium mb-1">Material</div>
                            <div className="text-sm font-bold text-blue-900">{formatBRL(orcCalc.vendaPecas || 0)}</div>
                          </div>
                          {orcCalc.acabamentos > 0 && (
                            <div className="bg-red-50 rounded-lg p-2 border border-red-200 min-w-[90px]">
                              <div className="text-xs text-slate-600 font-medium mb-1">Acabamentos</div>
                              <div className="text-sm font-bold text-red-900">{formatBRL(orcCalc.acabamentos)}</div>
                            </div>
                          )}
                          {orcCalc.custoSobra > 0 && (
                            <div className="bg-orange-50 rounded-lg p-2 border border-orange-200 min-w-[90px]">
                              <div className="text-xs text-slate-600 font-medium mb-1">Sobra</div>
                              <div className="text-sm font-bold text-orange-900">{formatBRL(orcCalc.custoSobra)}</div>
                            </div>
                          )}
                          {orcCalc.recortes > 0 && (
                            <div className="bg-purple-50 rounded-lg p-2 border border-purple-200 min-w-[90px]">
                              <div className="text-xs text-slate-600 font-medium mb-1">Recortes</div>
                              <div className="text-sm font-bold text-purple-900">{formatBRL(orcCalc.recortes)}</div>
                            </div>
                          )}
                          <div className="bg-green-50 rounded-lg p-2 border border-green-200 min-w-[90px]">
                            <div className="text-xs text-slate-600 font-medium mb-1">Total</div>
                            <div className="text-base font-bold text-green-900">{formatBRL(orcCalc.vendaTotal)}</div>
                          </div>
                        </div>

                        {/* Botões de ação */}
                        <div className="flex flex-col justify-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDuplicarOrcamento(orc.id);
                            }}
                            className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded transition-colors"
                            title="Duplicar orçamento"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onExcluirOrcamento(orc.id);
                            }}
                            className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded transition-colors"
                            title="Excluir orçamento"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Card de Materiais */}
        <div className="bg-gray-100 rounded-lg shadow-sm p-6 border border-slate-200 min-h-[500px] max-h-[calc(100vh-200px)] flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-800">Materiais</h2>
            <button
              onClick={() => onNavigateMaterial('novo')}
              className="bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all hover:shadow-lg hover:shadow-slate-500/50 hover:scale-105 active:scale-95"
            >
              + Novo
            </button>
          </div>

          {/* Lista de Materiais */}
          <div className="flex-1 overflow-y-auto">
            {materiais.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <p className="text-sm">Nenhum material cadastrado</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {materiais.map(material => (
                  <div
                    key={material.id}
                    className="border border-slate-200 rounded-lg p-4 hover:border-slate-400 transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-slate-800">{material.nome}</h3>
                      <button
                        onClick={() => onExcluirMaterial(material.id)}
                        className="text-slate-400 hover:text-red-600 text-sm transition-colors opacity-0 group-hover:opacity-100"
                        title="Excluir"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
