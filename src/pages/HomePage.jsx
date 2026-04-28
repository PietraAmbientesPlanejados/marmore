import { useState, useEffect } from 'react';

const ITENS_POR_PAGINA = 30;

const PrecoInput = ({ label, unidade, valor, onChange }) => (
  <div>
    <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none select-none">
        R$
      </span>
      <input
        type="number"
        value={valor ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-slate-300 rounded-md pl-9 pr-10 py-2 text-sm focus:ring-2 focus:ring-slate-400 focus:border-slate-400 focus:outline-none"
        step="0.01"
        min="0"
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none select-none">
        {unidade}
      </span>
    </div>
  </div>
);

const Paginador = ({ pagina, totalPaginas, onMudarPagina }) => {
  if (totalPaginas <= 1) return null;
  const btn = 'px-3 py-1 text-sm rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors';
  return (
    <div className="flex items-center justify-center gap-2 pt-4 border-t border-slate-200 mt-3">
      <button onClick={() => onMudarPagina(1)} disabled={pagina === 1} className={btn}>
        «
      </button>
      <button onClick={() => onMudarPagina(pagina - 1)} disabled={pagina === 1} className={btn}>
        ‹
      </button>
      <span className="text-sm text-slate-600 px-2">
        Página <strong>{pagina}</strong> de <strong>{totalPaginas}</strong>
      </span>
      <button onClick={() => onMudarPagina(pagina + 1)} disabled={pagina === totalPaginas} className={btn}>
        ›
      </button>
      <button onClick={() => onMudarPagina(totalPaginas)} disabled={pagina === totalPaginas} className={btn}>
        »
      </button>
    </div>
  );
};

/**
 * Página principal do sistema
 * Exibe lista de materiais e orçamentos
 */
const ACABAMENTOS_CAMPOS = [
  { chave: 'polimento', label: 'Polimento', unidade: '/m' },
  { chave: 'esquadria', label: 'Esquadria', unidade: '/m' },
  { chave: 'boleado', label: 'Boleado', unidade: '/m' },
  { chave: 'canal', label: 'Canal', unidade: '/m' },
];

const RECORTES_CAMPOS = [
  { chave: 'pia', label: 'Cuba', unidade: '/un' },
  { chave: 'cubaEsculpida', label: 'Cuba Esculpida', unidade: '/un' },
  { chave: 'cooktop', label: 'Cooktop', unidade: '/un' },
  { chave: 'recorte', label: 'Recorte', unidade: '/un' },
  { chave: 'pes', label: 'Pés', unidade: '/un' },
];

export const HomePage = ({
  materiais,
  orcamentos,
  onNavigateMaterial,
  onNavigateOrcamento,
  onExcluirMaterial,
  onExcluirOrcamento,
  onDuplicarOrcamento,
  onRenomearOrcamento,
  onRenomearMaterial,
  calcularOrcamento,
  formatBRL,
  precos,
  atualizarPreco,
  salvarPrecos,
  precosSalvos,
}) => {
  const [buscaOrcamento, setBuscaOrcamento] = useState('');
  const [buscaMaterial, setBuscaMaterial] = useState('');
  const [painelPrecosAberto, setPainelPrecosAberto] = useState(false);
  const [paginaOrcamentos, setPaginaOrcamentos] = useState(1);
  const [paginaMateriais, setPaginaMateriais] = useState(1);
  const [editandoOrc, setEditandoOrc] = useState({ id: null, nome: '' });
  const [editandoMat, setEditandoMat] = useState({ id: null, nome: '' });

  const orcamentosFiltrados = orcamentos
    .filter((orc) => orc.nome.toLowerCase().includes(buscaOrcamento.toLowerCase()))
    .slice()
    .sort((a, b) => b.id - a.id);

  const materiaisFiltrados = materiais
    .filter((mat) => mat.nome.toLowerCase().includes(buscaMaterial.toLowerCase()))
    .slice()
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }));

  const totalPaginasOrcamentos = Math.max(1, Math.ceil(orcamentosFiltrados.length / ITENS_POR_PAGINA));
  const totalPaginasMateriais = Math.max(1, Math.ceil(materiaisFiltrados.length / ITENS_POR_PAGINA));

  // Resetar para página 1 quando a busca muda ou lista encolhe
  useEffect(() => {
    setPaginaOrcamentos(1);
  }, [buscaOrcamento]);
  useEffect(() => {
    setPaginaMateriais(1);
  }, [buscaMaterial]);

  // Corrigir se a página atual exceder o total (ex: após excluir itens)
  useEffect(() => {
    if (paginaOrcamentos > totalPaginasOrcamentos) setPaginaOrcamentos(totalPaginasOrcamentos);
  }, [paginaOrcamentos, totalPaginasOrcamentos]);
  useEffect(() => {
    if (paginaMateriais > totalPaginasMateriais) setPaginaMateriais(totalPaginasMateriais);
  }, [paginaMateriais, totalPaginasMateriais]);

  const orcamentosPagina = orcamentosFiltrados.slice(
    (paginaOrcamentos - 1) * ITENS_POR_PAGINA,
    paginaOrcamentos * ITENS_POR_PAGINA
  );
  const materiaisPagina = materiaisFiltrados.slice(
    (paginaMateriais - 1) * ITENS_POR_PAGINA,
    paginaMateriais * ITENS_POR_PAGINA
  );

  return (
    <div className="space-y-6">
      {/* Painel de Preços Padrão (colapsável) */}
      {precos && atualizarPreco && salvarPrecos && (
        <div className="bg-gray-100 rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <button
            onClick={() => setPainelPrecosAberto((v) => !v)}
            className="w-full flex justify-between items-center px-6 py-4 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
          >
            <div>
              <h2 className="text-lg font-bold text-slate-800">Preços Padrão do Sistema</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Estes valores são aplicados a <strong>novos orçamentos</strong>. Cada orçamento pode ajustar os próprios preços depois.
              </p>
            </div>
            <span
              className={`text-slate-500 transition-transform duration-200 ${painelPrecosAberto ? 'rotate-180' : ''}`}
            >
              ▼
            </span>
          </button>

          <div
            className="overflow-hidden transition-all duration-300 ease-in-out"
            style={{ maxHeight: painelPrecosAberto ? '2000px' : '0', opacity: painelPrecosAberto ? 1 : 0 }}
          >
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">Acabamentos</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {ACABAMENTOS_CAMPOS.map(({ chave, label, unidade }) => (
                    <PrecoInput
                      key={chave}
                      label={label}
                      unidade={unidade}
                      valor={precos[chave]}
                      onChange={(v) => atualizarPreco(chave, v)}
                    />
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">Recortes</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {RECORTES_CAMPOS.map(({ chave, label, unidade }) => (
                    <PrecoInput
                      key={chave}
                      label={label}
                      unidade={unidade}
                      valor={precos[chave]}
                      onChange={(v) => atualizarPreco(chave, v)}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-200">
                <button
                  onClick={salvarPrecos}
                  className={`px-5 py-2 rounded-lg font-medium text-sm transition-colors ${
                    precosSalvos
                      ? 'bg-green-600 text-white cursor-default'
                      : 'bg-slate-700 hover:bg-slate-800 text-white'
                  }`}
                >
                  {precosSalvos ? '✓ Salvo' : 'Salvar Preços Padrão'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                {orcamentosPagina.map(orc => {
                  const totalPecas = orc.ambientes.reduce((sum, amb) => sum + amb.pecas.length, 0);
                  const orcCalc = calcularOrcamento(orc);
                  return (
                    <div
                      key={orc.id}
                      onClick={() => onNavigateOrcamento('abrir', orc.id)}
                      className="border border-slate-200 rounded-lg px-4 py-3 hover:border-slate-400 hover:shadow-sm transition-all cursor-pointer group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        {/* Nome + contadores */}
                        <div className="flex-1 min-w-0">
                          {editandoOrc.id === orc.id ? (
                            <input
                              autoFocus
                              value={editandoOrc.nome}
                              onChange={(e) => setEditandoOrc({ id: orc.id, nome: e.target.value })}
                              onBlur={() => {
                                if (editandoOrc.nome.trim() && editandoOrc.nome.trim() !== orc.nome) {
                                  onRenomearOrcamento?.(orc.id, editandoOrc.nome.trim());
                                }
                                setEditandoOrc({ id: null, nome: '' });
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') e.target.blur();
                                if (e.key === 'Escape') setEditandoOrc({ id: null, nome: '' });
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="text-lg font-bold text-slate-800 bg-white border border-slate-300 rounded px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-slate-400 w-full"
                            />
                          ) : (
                            <h3
                              className="text-lg font-bold text-slate-800 group-hover:text-slate-900 truncate cursor-text"
                              title="Clique para renomear"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditandoOrc({ id: orc.id, nome: orc.nome || '' });
                              }}
                            >
                              {orc.nome || `Orçamento #${String(orc.id).slice(-6)}`}
                            </h3>
                          )}
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500 mt-1">
                            <span className="flex items-center gap-1">🏠 {orc.ambientes.length} {orc.ambientes.length === 1 ? 'ambiente' : 'ambientes'}</span>
                            <span className="flex items-center gap-1">📦 {totalPecas} {totalPecas === 1 ? 'peça' : 'peças'}</span>
                            <span className="flex items-center gap-1">📄 {orc.chapas.length} {orc.chapas.length === 1 ? 'chapa' : 'chapas'}</span>
                          </div>
                        </div>

                        {/* Total alinhado à direita */}
                        <span className="text-lg font-bold text-slate-800 flex-shrink-0 whitespace-nowrap">
                          {formatBRL(orcCalc.vendaTotal)}
                        </span>

                        {/* Botões de ação */}
                        <div className="flex flex-col justify-center gap-1 flex-shrink-0">
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

          <Paginador
            pagina={paginaOrcamentos}
            totalPaginas={totalPaginasOrcamentos}
            onMudarPagina={setPaginaOrcamentos}
          />
        </div>

        {/* Card de Materiais */}
        <div className="bg-gray-100 rounded-lg shadow-sm p-6 border border-slate-200 min-h-[500px] max-h-[calc(100vh-200px)] flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-slate-800">Materiais</h2>
            <button
              onClick={() => onNavigateMaterial('novo')}
              className="bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all hover:shadow-lg hover:shadow-slate-500/50 hover:scale-105 active:scale-95"
            >
              + Novo
            </button>
          </div>

          {/* Campo de Busca */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="🔍 Buscar material..."
              value={buscaMaterial}
              onChange={(e) => setBuscaMaterial(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-400 focus:border-slate-400 transition-all"
            />
          </div>

          {/* Lista de Materiais */}
          <div className="flex-1 overflow-y-auto">
            {materiaisFiltrados.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <p className="text-sm">
                  {buscaMaterial ? 'Nenhum material encontrado' : 'Nenhum material cadastrado'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {materiaisPagina.map((material) => (
                  <div
                    key={material.id}
                    className="border border-slate-200 rounded-lg p-4 hover:border-slate-400 transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      {editandoMat.id === material.id ? (
                        <input
                          autoFocus
                          value={editandoMat.nome}
                          onChange={(e) => setEditandoMat({ id: material.id, nome: e.target.value })}
                          onBlur={() => {
                            if (editandoMat.nome.trim() && editandoMat.nome.trim() !== material.nome) {
                              onRenomearMaterial?.(material.id, editandoMat.nome.trim());
                            }
                            setEditandoMat({ id: null, nome: '' });
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') e.target.blur();
                            if (e.key === 'Escape') setEditandoMat({ id: null, nome: '' });
                          }}
                          className="font-medium text-slate-800 bg-white border border-slate-300 rounded px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-slate-400 flex-1 mr-2"
                        />
                      ) : (
                        <h3
                          className="font-medium text-slate-800 cursor-text hover:text-slate-600 transition-colors"
                          title="Clique para renomear"
                          onClick={() => setEditandoMat({ id: material.id, nome: material.nome })}
                        >
                          {material.nome}
                        </h3>
                      )}
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

          <Paginador
            pagina={paginaMateriais}
            totalPaginas={totalPaginasMateriais}
            onMudarPagina={setPaginaMateriais}
          />
        </div>
      </div>
    </div>
  );
};
