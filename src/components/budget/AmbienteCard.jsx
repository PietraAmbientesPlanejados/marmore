import { useState } from 'react';
import { formatBRL } from '../../utils/formatters';
import { calcularCustosPeca } from '../../utils/calculations';
import { PreviewAcabamentos } from '../preview/PreviewAcabamentos';
import { temaDoAmbiente } from '../../constants/colors';

const MATERIAL_CONFIG_PADRAO = {
  comprimento: 3000,
  altura: 2000,
  custo: 250,
  venda: 333.33
};

const NOVA_PECA_VAZIA = (materialId = null) => ({
  nome: '',
  altura: '',
  largura: '',
  quantidade: 1,
  materialId,
  acabamentos: {
    esquadria: { ativo: false, lados: { superior: false, inferior: false, esquerda: false, direita: false } },
    boleado: { ativo: false, lados: { superior: false, inferior: false, esquerda: false, direita: false } },
    polimento: { ativo: false, lados: { superior: false, inferior: false, esquerda: false, direita: false } },
    canal: { ativo: false, lados: { superior: false, inferior: false, esquerda: false, direita: false } }
  },
  cuba: 0,
  cubaEsculpida: 0,
  cooktop: 0,
  recorte: 0,
  pes: 0
});

export const AmbienteCard = ({ ambiente, indice = 0, materiais, materialConfigs, precos, perda = 0, onAdicionarPeca, onExcluirPeca, onExcluirAmbiente, onRenomearAmbiente, onVisualizarPeca, onPedirConfirmacaoExclusao }) => {
  const [expandido, setExpandido] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [novaPeca, setNovaPeca] = useState(NOVA_PECA_VAZIA(materiais[0]?.id || null));
  const [editandoNome, setEditandoNome] = useState(false);
  const [nomeEditando, setNomeEditando] = useState(ambiente.nome);
  const tema = temaDoAmbiente(indice);

  const subtotais = ambiente.pecas.reduce((acc, peca) => {
    const materialConfig = materialConfigs[peca.materialId] || MATERIAL_CONFIG_PADRAO;
    const custosPeca = calcularCustosPeca(peca, materialConfig, precos);
    return {
      material: acc.material + custosPeca.custoMaterial,
      acabamentos: acc.acabamentos + custosPeca.acabamentos,
      recortes: acc.recortes + custosPeca.recortes,
      total: acc.total + custosPeca.total,
      area: acc.area + ((peca.altura * peca.largura) / 1000000) * (peca.quantidade || 1)
    };
  }, { material: 0, acabamentos: 0, recortes: 0, total: 0, area: 0 });

  return (
    <div
      className="border-2 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-all"
      style={{
        position: 'relative',
        zIndex: 1,
        borderColor: tema.border,
        borderLeft: `6px solid ${tema.base}`,
      }}
    >
      <div
        className="p-4 cursor-pointer transition-all border-b"
        style={{ backgroundColor: tema.bgLight, borderColor: tema.border }}
        onClick={() => setExpandido(!expandido)}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = tema.bgSoft)}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = tema.bgLight)}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 flex-1">
            {editandoNome ? (
              <input
                autoFocus
                value={nomeEditando}
                onChange={(e) => setNomeEditando(e.target.value)}
                onBlur={() => {
                  setEditandoNome(false);
                  if (nomeEditando.trim() && nomeEditando.trim() !== ambiente.nome) {
                    onRenomearAmbiente?.(nomeEditando.trim());
                  } else {
                    setNomeEditando(ambiente.nome);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.target.blur();
                  if (e.key === 'Escape') {
                    setNomeEditando(ambiente.nome);
                    setEditandoNome(false);
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                className="text-base font-semibold text-slate-800 bg-white border border-slate-300 rounded px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-slate-400 w-48"
              />
            ) : (
              <h3
                className="text-base font-semibold text-slate-800 cursor-text hover:text-slate-600 transition-colors"
                title="Clique para renomear"
                onClick={(e) => {
                  e.stopPropagation();
                  setNomeEditando(ambiente.nome);
                  setEditandoNome(true);
                }}
              >
                {ambiente.nome}
              </h3>
            )}
            {onExcluirAmbiente && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`Tem certeza que deseja excluir o ambiente "${ambiente.nome}"?\n\nTodas as peças deste ambiente serão perdidas.`)) {
                    onExcluirAmbiente();
                  }
                }}
                className="text-slate-400 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded-lg transition-all text-xs font-medium"
                title="Excluir ambiente"
              >
                Excluir
              </button>
            )}
          </div>
          <span className="text-xs text-slate-500">{ambiente.pecas.length} peças • {subtotais.area.toFixed(2)}m²</span>
        </div>

        {ambiente.pecas.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {[
              { label: 'Material', valor: subtotais.material },
              { label: 'Acabamentos', valor: subtotais.acabamentos },
              { label: 'Recortes', valor: subtotais.recortes },
              { label: 'Perda', valor: perda },
              { label: 'Total', valor: subtotais.total + perda, destaque: true },
            ].map(({ label, valor, destaque }) => (
              <div
                key={label}
                className="rounded p-2 border"
                style={{ backgroundColor: 'rgba(255,255,255,0.85)', borderColor: tema.border }}
              >
                <div className="text-xs text-slate-500 text-center">{label}</div>
                <div className={`text-center ${destaque ? 'text-sm font-bold text-slate-900' : 'text-sm font-semibold text-slate-700'}`}>
                  {formatBRL(valor)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div
        className="overflow-hidden transition-all duration-500 ease-in-out"
        style={{
          maxHeight: expandido ? '5000px' : '0',
          opacity: expandido ? 1 : 0
        }}
      >
        <div className="p-4 space-y-4 max-h-[800px] overflow-y-auto">
          {!mostrarForm && (
            <button
              onClick={() => setMostrarForm(true)}
              className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-gray-600 hover:border-blue-500 hover:text-blue-600"
            >
              + Adicionar Peça
            </button>
          )}

          {mostrarForm && (
            <div className="border border-slate-300 rounded-lg p-6 bg-slate-50">
              <h4 className="font-semibold mb-4 text-slate-800 text-lg">Nova Peça</h4>

              <div className="grid lg:grid-cols-[1fr_320px] gap-6">
                <div>
                  <div className="mb-3">
                    <label className="block text-xs font-medium mb-1">Nome da Peça *</label>
                    <input
                      type="text"
                      value={novaPeca.nome}
                      onChange={(e) => setNovaPeca({ ...novaPeca, nome: e.target.value })}
                      className="w-full border rounded px-2 py-1 text-sm"
                      placeholder="Ex: Bancada Pia, Mesa Jantar, etc"
                    />
                  </div>
                  <div className="grid md:grid-cols-3 gap-3 mb-3">
                    <div>
                      <label className="block text-xs font-medium mb-1">Altura (mm)</label>
                      <input
                        type="number"
                        value={novaPeca.altura}
                        onChange={(e) => setNovaPeca({ ...novaPeca, altura: e.target.value })}
                        className="w-full border rounded px-2 py-1 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Largura (mm)</label>
                      <input
                        type="number"
                        value={novaPeca.largura}
                        onChange={(e) => setNovaPeca({ ...novaPeca, largura: e.target.value })}
                        className="w-full border rounded px-2 py-1 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Quantidade</label>
                      <input
                        type="number"
                        value={novaPeca.quantidade}
                        onChange={(e) => setNovaPeca({ ...novaPeca, quantidade: parseInt(e.target.value) || 1 })}
                        className="w-full border rounded px-2 py-1 text-sm"
                        min="1"
                      />
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-xs font-medium mb-1">Material</label>
                      <select
                        value={novaPeca.materialId}
                        onChange={(e) => setNovaPeca({ ...novaPeca, materialId: parseInt(e.target.value) })}
                        className="w-full border rounded px-2 py-1 text-sm"
                      >
                        {materiais.map(mat => (
                          <option key={mat.id} value={mat.id}>{mat.nome}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <h5 className="font-medium text-sm mb-2">Acabamentos (opcional)</h5>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                    {[
                      { tipo: 'esquadria', label: 'Esquadria', ativo: 'bg-red-500 border-red-600', hover: 'hover:border-red-400 hover:bg-red-50' },
                      { tipo: 'boleado', label: 'Boleado', ativo: 'bg-yellow-500 border-yellow-600', hover: 'hover:border-yellow-400 hover:bg-yellow-50' },
                      { tipo: 'polimento', label: 'Polimento', ativo: 'bg-blue-500 border-blue-600', hover: 'hover:border-blue-400 hover:bg-blue-50' },
                      { tipo: 'canal', label: 'Canal', ativo: 'bg-orange-500 border-orange-600', hover: 'hover:border-orange-400 hover:bg-orange-50' }
                    ].map(({ tipo, label, ativo, hover }) => (
                      <button
                        key={tipo}
                        type="button"
                        onClick={() => {
                          setNovaPeca({
                            ...novaPeca,
                            acabamentos: {
                              ...novaPeca.acabamentos,
                              [tipo]: { ...novaPeca.acabamentos[tipo], ativo: !novaPeca.acabamentos[tipo].ativo }
                            }
                          });
                        }}
                        className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                          novaPeca.acabamentos[tipo].ativo
                            ? `${ativo} text-white shadow-md`
                            : `bg-gray-100 border-slate-300 text-slate-700 ${hover}`
                        }`}
                      >
                        {label}
                        <div className="text-xs opacity-80 mt-0.5">R$ {precos[tipo]}/m</div>
                      </button>
                    ))}
                  </div>

                  {(novaPeca.acabamentos.esquadria.ativo ||
                    novaPeca.acabamentos.boleado.ativo ||
                    novaPeca.acabamentos.polimento.ativo ||
                    novaPeca.acabamentos.canal.ativo) && (
                    <div className="mb-3 bg-gray-100 border border-slate-300 rounded-lg p-4">
                      <h6 className="font-semibold text-sm mb-3 text-slate-700">Selecione os lados para cada acabamento:</h6>

                      <div className="flex flex-wrap justify-center gap-4">
                        {[
                          { tipo: 'esquadria', label: 'Esquadria', cor: 'red', emoji: '🔴' },
                          { tipo: 'boleado', label: 'Boleado', cor: 'yellow', emoji: '🟡' },
                          { tipo: 'polimento', label: 'Polimento', cor: 'blue', emoji: '🔵' },
                          { tipo: 'canal', label: 'Canal', cor: 'orange', emoji: '🟠' }
                        ].filter(item => novaPeca.acabamentos[item.tipo].ativo).map(item => {
                          const coresBg = { red: 'bg-red-100 border-red-400 text-red-700', yellow: 'bg-yellow-100 border-yellow-400 text-yellow-700', blue: 'bg-blue-100 border-blue-400 text-blue-700', orange: 'bg-orange-100 border-orange-400 text-orange-700' };
                          const coresAtivo = { red: 'bg-red-500 text-white border-red-600', yellow: 'bg-yellow-500 text-white border-yellow-600', blue: 'bg-blue-500 text-white border-blue-600', orange: 'bg-orange-500 text-white border-orange-600' };
                          const coresInativo = { red: 'bg-gray-100 text-red-400 border-red-200 hover:bg-red-50', yellow: 'bg-gray-100 text-yellow-500 border-yellow-200 hover:bg-yellow-50', blue: 'bg-gray-100 text-blue-400 border-blue-200 hover:bg-blue-50', orange: 'bg-gray-100 text-orange-400 border-orange-200 hover:bg-orange-50' };

                          const toggleLado = (lado) => {
                            const novosAcabamentos = { ...novaPeca.acabamentos };
                            novosAcabamentos[item.tipo] = {
                              ...novosAcabamentos[item.tipo],
                              lados: {
                                ...novosAcabamentos[item.tipo].lados,
                                [lado]: !novosAcabamentos[item.tipo].lados[lado]
                              }
                            };
                            setNovaPeca({ ...novaPeca, acabamentos: novosAcabamentos });
                          };

                          const lados = novaPeca.acabamentos[item.tipo].lados;
                          const ladosSelecionados = Object.keys(lados).filter(l => lados[l]).length;
                          const todosAtivos = lados.superior && lados.inferior && lados.esquerda && lados.direita;

                          return (
                            <div key={item.tipo} className={`rounded-lg p-3 border w-56 ${coresBg[item.cor]}`}>
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-bold">{item.emoji} {item.label}</p>
                                <span className="text-xs opacity-70">{ladosSelecionados} lado(s)</span>
                              </div>

                              <div className="flex items-center justify-center">
                                <div className="relative" style={{ width: '180px', height: '120px' }}>
                                  <button
                                    type="button"
                                    onClick={() => toggleLado('superior')}
                                    className={`absolute top-0 left-1/2 -translate-x-1/2 px-3 py-1 text-xs font-bold rounded-t-lg border-2 transition-all ${lados.superior ? coresAtivo[item.cor] : coresInativo[item.cor]}`}
                                    style={{ minWidth: '80px', zIndex: 2 }}
                                  >
                                    Superior
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => toggleLado('inferior')}
                                    className={`absolute bottom-0 left-1/2 -translate-x-1/2 px-3 py-1 text-xs font-bold rounded-b-lg border-2 transition-all ${lados.inferior ? coresAtivo[item.cor] : coresInativo[item.cor]}`}
                                    style={{ minWidth: '80px', zIndex: 2 }}
                                  >
                                    Inferior
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => toggleLado('esquerda')}
                                    className={`absolute left-0 top-1/2 -translate-y-1/2 px-1 py-2 text-xs font-bold rounded-l-lg border-2 transition-all ${lados.esquerda ? coresAtivo[item.cor] : coresInativo[item.cor]}`}
                                    style={{ writingMode: 'vertical-lr', textOrientation: 'mixed', zIndex: 2 }}
                                  >
                                    Esq.
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => toggleLado('direita')}
                                    className={`absolute right-0 top-1/2 -translate-y-1/2 px-1 py-2 text-xs font-bold rounded-r-lg border-2 transition-all ${lados.direita ? coresAtivo[item.cor] : coresInativo[item.cor]}`}
                                    style={{ writingMode: 'vertical-lr', textOrientation: 'mixed', zIndex: 2 }}
                                  >
                                    Dir.
                                  </button>

                                  <div
                                    className="absolute bg-gray-100 border-2 border-gray-300 rounded flex items-center justify-center"
                                    style={{ top: '22px', bottom: '22px', left: '26px', right: '26px' }}
                                  >
                                    <span className="text-xs text-gray-400 font-medium">PEÇA</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex justify-center mt-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const novosAcabamentos = { ...novaPeca.acabamentos };
                                    novosAcabamentos[item.tipo] = {
                                      ...novosAcabamentos[item.tipo],
                                      lados: {
                                        superior: !todosAtivos,
                                        inferior: !todosAtivos,
                                        esquerda: !todosAtivos,
                                        direita: !todosAtivos
                                      }
                                    };
                                    setNovaPeca({ ...novaPeca, acabamentos: novosAcabamentos });
                                  }}
                                  className={`text-xs px-3 py-1 rounded-full border font-semibold transition-all ${
                                    todosAtivos
                                      ? coresAtivo[item.cor]
                                      : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
                                  }`}
                                >
                                  {todosAtivos ? '✓ Todos os lados' : 'Selecionar todos'}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <h5 className="font-medium text-sm mb-2">Recortes (opcional)</h5>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3">
                    {[
                      { campo: 'cuba', label: 'Cuba' },
                      { campo: 'cubaEsculpida', label: 'Cuba Esculpida' },
                      { campo: 'cooktop', label: 'Cooktop' },
                      { campo: 'recorte', label: 'Recorte' },
                      { campo: 'pes', label: 'Pés' }
                    ].map(({ campo, label }) => (
                      <div key={campo}>
                        <label className="block text-xs mb-1">{label}</label>
                        <input
                          type="number"
                          value={novaPeca[campo] || ''}
                          onChange={(e) => setNovaPeca({ ...novaPeca, [campo]: parseInt(e.target.value) || 0 })}
                          className="w-full border rounded px-2 py-1 text-sm"
                          min="0"
                          placeholder="0"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-2 border-slate-300 rounded-lg bg-gray-100 p-4 sticky top-4 self-start">
                  <h5 className="font-bold text-sm text-slate-700 mb-3 pb-2 border-b border-slate-200">
                    📋 Preview da Peça
                  </h5>
                  <div className="flex items-start justify-center">
                    {novaPeca.largura && novaPeca.altura ? (
                      <PreviewAcabamentos peca={novaPeca} />
                    ) : (
                      <div className="text-center py-8 text-slate-400 text-sm">
                        <p className="mb-2">⚠️</p>
                        <p>Preencha largura e altura para ver o preview</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => {
                    if (novaPeca.nome && novaPeca.altura && novaPeca.largura && novaPeca.materialId) {
                      onAdicionarPeca({
                        ...novaPeca,
                        altura: parseFloat(novaPeca.altura),
                        largura: parseFloat(novaPeca.largura)
                      });
                      setNovaPeca(NOVA_PECA_VAZIA(novaPeca.materialId));
                      setMostrarForm(false);
                    } else {
                      alert('Por favor, preencha o nome, altura e largura da peça!');
                    }
                  }}
                  className="bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Adicionar Peça
                </button>
                <button
                  onClick={() => setMostrarForm(false)}
                  className="border border-gray-300 px-4 py-2 rounded text-sm hover:bg-gray-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {ambiente.pecas.map(peca => {
            const material = materiais.find(m => m.id === peca.materialId);
            const materialConfig = materialConfigs[peca.materialId] || MATERIAL_CONFIG_PADRAO;
            const custosPeca = calcularCustosPeca(peca, materialConfig, precos);
            return (
              <div key={peca.id} className="border border-slate-200 rounded-lg p-4 hover:border-slate-400 hover:shadow-sm transition-all">
                <div className="flex gap-4">
                  <div
                    className="flex-shrink-0 cursor-pointer hover:scale-105 transition-transform"
                    style={{ width: '100px', height: '75px' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onVisualizarPeca && onVisualizarPeca(peca);
                    }}
                    title="Clique para ver detalhes"
                  >
                    <PreviewAcabamentos peca={peca} mostrarSempre={true} mini={true} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-slate-800 text-base">{peca.nome || 'Sem nome'}</h4>
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onVisualizarPeca && onVisualizarPeca(peca);
                          }}
                          className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded transition-colors"
                          title="Ver detalhes"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (onPedirConfirmacaoExclusao) {
                              onPedirConfirmacaoExclusao(peca.id, peca.nome);
                            }
                          }}
                          className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded transition-colors"
                          title="Excluir peça"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-500 mt-1">
                      <span><span className="font-medium text-slate-700">{peca.largura} x {peca.altura}</span> mm</span>
                      <span>{material?.nome}</span>
                      <span>Chapa #{peca.chapaId ? String(peca.chapaId).slice(-4) : 'N/A'}</span>
                    </div>

                    {peca.acabamentos && Object.values(peca.acabamentos).some(a => a.ativo) && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {Object.keys(peca.acabamentos).map(tipo => {
                          const acab = peca.acabamentos[tipo];
                          if (!acab.ativo) return null;
                          return (
                            <span key={tipo} className="text-xs px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                              {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-200">
                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                    <span className="text-slate-500">Área: <span className="font-semibold text-slate-700">{custosPeca.area.toFixed(2)}m²</span></span>
                    <span className="text-slate-500">Material: <span className="font-semibold text-slate-700">{formatBRL(custosPeca.custoMaterial)}</span></span>
                    {custosPeca.acabamentos > 0 && (
                      <span className="text-slate-500">Acabamentos: <span className="font-semibold text-slate-700">{formatBRL(custosPeca.acabamentos)}</span></span>
                    )}
                    {custosPeca.recortes > 0 && (
                      <span className="text-slate-500">Recortes: <span className="font-semibold text-slate-700">{formatBRL(custosPeca.recortes)}</span></span>
                    )}
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-300 flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-700">Total da Peça:</span>
                    <span className="text-base font-bold text-green-700">{formatBRL(custosPeca.total)}</span>
                  </div>

                  {(custosPeca.detalhesAcabamentos.length > 0 || custosPeca.detalhesRecortes.length > 0) && (
                    <details className="mt-2">
                      <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-700">
                        Ver detalhes dos custos
                      </summary>
                      <div className="mt-2 space-y-1 pl-2 border-l-2 border-slate-300">
                        {custosPeca.detalhesAcabamentos.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-slate-700">Acabamentos:</p>
                            {custosPeca.detalhesAcabamentos.map((detalhe, idx) => (
                              <div key={idx} className="text-xs text-slate-600 flex justify-between">
                                <span>• {detalhe.tipo.charAt(0).toUpperCase() + detalhe.tipo.slice(1)} ({detalhe.metros}m)</span>
                                <span className="font-medium">{formatBRL(detalhe.valor)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {custosPeca.detalhesRecortes.length > 0 && (
                          <div className="mt-1">
                            <p className="text-xs font-semibold text-slate-700">Recortes:</p>
                            {custosPeca.detalhesRecortes.map((detalhe, idx) => (
                              <div key={idx} className="text-xs text-slate-600 flex justify-between">
                                <span>• {detalhe.tipo} ({detalhe.quantidade}x)</span>
                                <span className="font-medium">{formatBRL(detalhe.valor)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </details>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
