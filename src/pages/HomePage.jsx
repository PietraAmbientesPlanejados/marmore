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
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Grid de 2 colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card de Orçamentos */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-slate-200 min-h-[calc(100vh-200px)] flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-800">Orçamentos</h2>
            <button
              onClick={() => onNavigateOrcamento('novo')}
              className="bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
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
                      className="border border-slate-200 rounded-lg p-4 hover:border-slate-400 hover:shadow-sm transition-all cursor-pointer group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-slate-800 group-hover:text-slate-900">
                            {orc.nome || `Orçamento #${String(orc.id).slice(-6)}`}
                          </h3>
                          <p className="text-xs text-slate-500 mt-1">
                            📅 {orc.data}
                          </p>
                          <div className="flex gap-3 mt-2 text-xs text-slate-600">
                            <span>🏠 {orc.ambientes.length} ambientes</span>
                            <span>📦 {totalPecas} peças</span>
                            <span>📄 {orc.chapas.length} chapas</span>
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <div className="space-y-1">
                            <div>
                              <p className="text-xs text-slate-500 uppercase">Custo</p>
                              <p className="text-sm font-bold text-orange-600">
                                {formatBRL(orcCalc.custoTotal)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 uppercase">Venda</p>
                              <p className="text-lg font-bold text-green-600">
                                {formatBRL(orcCalc.vendaTotal)}
                              </p>
                            </div>
                            <div className="pt-1 border-t border-slate-300">
                              <p className="text-xs text-slate-600 font-semibold">
                                💰 Lucro: {formatBRL(orcCalc.margemTotal)}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDuplicarOrcamento(orc.id);
                              }}
                              className="flex-1 text-blue-600 hover:bg-blue-50 px-2 py-1 rounded text-xs transition-colors border border-blue-200"
                              title="Duplicar orçamento"
                            >
                              📋 Duplicar
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onExcluirOrcamento(orc.id);
                              }}
                              className="flex-1 text-red-600 hover:bg-red-50 px-2 py-1 rounded text-xs transition-colors border border-red-200"
                              title="Excluir orçamento"
                            >
                              🗑️ Excluir
                            </button>
                          </div>
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
        <div className="bg-white rounded-lg shadow-sm p-6 border border-slate-200 min-h-[calc(100vh-200px)] flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-slate-800">Materiais</h2>
            <button
              onClick={() => onNavigateMaterial('novo')}
              className="bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
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
