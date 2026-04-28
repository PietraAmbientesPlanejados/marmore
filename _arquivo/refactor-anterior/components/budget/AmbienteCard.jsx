import { useState } from 'react';
import { Edit2, Trash2 } from '../../constants/icons';
import { PreviewAcabamentos } from '../preview/PreviewAcabamentos';
import { calcularCustosPeca } from '../../utils/calculations';
import { formatBRL } from '../../utils/formatters';

export const AmbienteCard = ({ ambiente, materiais, precos, onAdicionarPeca, onExcluirPeca, onExcluirAmbiente, onVisualizarPeca, onPedirConfirmacaoExclusao }) => {
  const [expandido, setExpandido] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [novaPeca, setNovaPeca] = useState({
    nome: '',
    altura: '',
    largura: '',
    quantidade: 1,
    materialId: materiais[0]?.id || null,
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

  return (
    <div className="border-2 border-teal-200 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-all bg-gray-100" style={{ position: 'relative', zIndex: 1, borderLeft: '6px solid #14b8a6' }}>
      <div
        className="bg-gradient-to-r from-teal-50 to-teal-100 p-4 cursor-pointer hover:from-teal-100 hover:to-teal-200 transition-all"
        onClick={() => setExpandido(!expandido)}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-teal-900">{ambiente.nome}</h3>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-teal-700 bg-white px-3 py-1 rounded-full">{ambiente.pecas.length} {ambiente.pecas.length === 1 ? 'peça' : 'peças'}</span>
            {onExcluirAmbiente && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`Tem certeza que deseja excluir o ambiente "${ambiente.nome}"?\n\nTodas as peças deste ambiente serão perdidas.`)) {
                    onExcluirAmbiente();
                  }
                }}
                className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg transition-all shadow-md hover:shadow-lg"
                title="Excluir ambiente"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Resumo do Ambiente */}
      {(() => {
        let totalMaterial = 0;
        let totalAcabamentos = 0;
        let totalRecortes = 0;
        let totalArea = 0;

        ambiente.pecas.forEach(peca => {
          const material = materiais.find(m => m.id === peca.materialId);
          const custos = calcularCustosPeca(peca, material, precos);
          totalMaterial += custos.custoMaterial || 0;
          totalAcabamentos += custos.acabamentos || 0;
          totalRecortes += custos.recortes || 0;
          totalArea += custos.area || 0;
        });

        const totalGeral = totalMaterial + totalAcabamentos + totalRecortes;

        return (
          <div className="px-4 py-3 bg-gray-100 border-t border-teal-100">
            <div className="flex items-center gap-2 text-xs text-slate-600 mb-3">
              <span className="font-medium">{ambiente.pecas.length} {ambiente.pecas.length === 1 ? 'peça' : 'peças'}</span>
              <span>•</span>
              <span className="font-medium">{totalArea.toFixed(2)}m²</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                <div className="text-xs text-slate-600 font-medium mb-1 text-center">Material</div>
                <div className="text-sm font-bold text-red-900 text-center">{formatBRL(totalMaterial)}</div>
              </div>
              <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                <div className="text-xs text-slate-600 font-medium mb-1 text-center">Sobra</div>
                <div className="text-sm font-bold text-orange-900 text-center">{formatBRL(0)}</div>
              </div>
              <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                <div className="text-xs text-slate-600 font-medium mb-1 text-center">Acabamentos</div>
                <div className="text-sm font-bold text-red-900 text-center">{formatBRL(totalAcabamentos)}</div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                <div className="text-xs text-slate-600 font-medium mb-1 text-center">Recortes</div>
                <div className="text-sm font-bold text-yellow-900 text-center">{formatBRL(totalRecortes)}</div>
              </div>
              <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                <div className="text-xs text-slate-600 font-medium mb-1 text-center">Total</div>
                <div className="text-sm font-bold text-green-900 text-center">{formatBRL(totalGeral)}</div>
              </div>
            </div>
          </div>
        );
      })()}

      {expandido && (
        <div className="p-4 space-y-4">
          {/* Lista de Peças */}
          {ambiente.pecas.map(peca => {
            const material = materiais.find(m => m.id === peca.materialId);
            const custosPeca = calcularCustosPeca(peca, material, precos);
            return (
              <div key={peca.id} className="bg-gray-50 p-3 rounded-lg border border-gray-200 hover:border-blue-300 transition-all relative" style={{ zIndex: 1 }}>
                {/* Botões de Ação - ABSOLUTOS NO CANTO */}
                <div className="absolute top-2 right-2 flex gap-2" style={{ zIndex: 2, position: 'absolute' }}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('Ver detalhes clicado');
                      onVisualizarPeca && onVisualizarPeca(peca);
                    }}
                    onMouseEnter={() => console.log('Mouse entrou no botão AZUL')}
                    className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg shadow-lg transition-all"
                    title="Ver detalhes"
                    style={{ cursor: 'pointer', pointerEvents: 'auto' }}
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('CLICOU NO BOTÃO EXCLUIR');
                      console.log('Peça ID:', peca.id);
                      console.log('Ambiente ID:', ambiente.id);

                      // Chamar callback para mostrar modal de confirmação
                      if (onPedirConfirmacaoExclusao) {
                        onPedirConfirmacaoExclusao(peca.id, peca.nome);
                      }
                    }}
                    onMouseEnter={() => console.log('Mouse entrou no botão VERMELHO')}
                    className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg shadow-lg transition-all"
                    title="Excluir peça"
                    style={{ cursor: 'pointer', pointerEvents: 'auto' }}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                <div className="flex gap-3 pr-24">
                  {/* Miniatura da peça */}
                  <div
                    className="flex-shrink-0 cursor-pointer hover:scale-105 transition-transform"
                    style={{ width: '120px', height: '90px' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onVisualizarPeca && onVisualizarPeca(peca);
                    }}
                    title="Clique para ver detalhes"
                  >
                    <PreviewAcabamentos peca={peca} mostrarSempre={true} mini={true} />
                  </div>

                  {/* Informações da peça */}
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-800 mb-2">{peca.nome || 'Sem nome'}</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                      <div>
                        <p className="text-gray-500 text-xs">Dimensões</p>
                        <p className="font-medium text-xs">{peca.largura} x {peca.altura} mm</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Material</p>
                        <p className="font-medium text-xs">{material?.nome}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Chapa</p>
                        <p className="font-medium text-xs">#{peca.chapaId ? String(peca.chapaId).slice(-4) : 'N/A'}</p>
                      </div>
                    </div>

                    {/* Acabamentos aplicados */}
                    {peca.acabamentos && Object.values(peca.acabamentos).some(a => a.ativo) && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {Object.keys(peca.acabamentos).map(tipo => {
                          const acab = peca.acabamentos[tipo];
                          if (!acab.ativo) return null;
                          const cores = {
                            esquadria: 'bg-red-100 text-red-700',
                            boleado: 'bg-yellow-100 text-yellow-700',
                            polimento: 'bg-blue-100 text-blue-700',
                            canal: 'bg-orange-100 text-orange-700'
                          };
                          return (
                            <span key={tipo} className={`text-xs px-2 py-0.5 rounded ${cores[tipo]}`}>
                              {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {/* Custos Detalhados da Peça */}
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-500">Área:</span>
                          <span className="font-semibold text-gray-800 ml-1">{custosPeca.area.toFixed(2)}m²</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Material:</span>
                          <span className="font-semibold text-green-700 ml-1">{formatBRL(custosPeca.custoMaterial)}</span>
                        </div>
                        {custosPeca.acabamentos > 0 && (
                          <div>
                            <span className="text-gray-500">Acabamentos:</span>
                            <span className="font-semibold text-blue-700 ml-1">{formatBRL(custosPeca.acabamentos)}</span>
                          </div>
                        )}
                        {custosPeca.recortes > 0 && (
                          <div>
                            <span className="text-gray-500">Recortes:</span>
                            <span className="font-semibold text-purple-700 ml-1">{formatBRL(custosPeca.recortes)}</span>
                          </div>
                        )}
                      </div>
                      <div className="mt-2 pt-2 border-t border-gray-300 flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-700">Total da Peça:</span>
                        <span className="text-sm font-bold text-green-600">{formatBRL(custosPeca.total)}</span>
                      </div>

                      {/* Detalhes expandíveis de acabamentos e recortes */}
                      {(custosPeca.detalhesAcabamentos.length > 0 || custosPeca.detalhesRecortes.length > 0) && (
                        <details className="mt-2">
                          <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-800">
                            Ver detalhes dos custos
                          </summary>
                          <div className="mt-2 space-y-1 pl-2 border-l-2 border-blue-200">
                            {custosPeca.detalhesAcabamentos.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-gray-700">Acabamentos:</p>
                                {custosPeca.detalhesAcabamentos.map((detalhe, idx) => (
                                  <div key={idx} className="text-xs text-gray-600 flex justify-between">
                                    <span>• {detalhe.tipo.charAt(0).toUpperCase() + detalhe.tipo.slice(1)} ({detalhe.metros}m)</span>
                                    <span className="font-medium">{formatBRL(detalhe.valor)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {custosPeca.detalhesRecortes.length > 0 && (
                              <div className="mt-1">
                                <p className="text-xs font-semibold text-gray-700">Recortes:</p>
                                {custosPeca.detalhesRecortes.map((detalhe, idx) => (
                                  <div key={idx} className="text-xs text-gray-600 flex justify-between">
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
                </div>
              </div>
            );
          })}

          {/* Botão Adicionar Peça */}
          {!mostrarForm && (
            <button
              onClick={() => setMostrarForm(true)}
              className="w-full border-2 border-dashed border-green-300 rounded-lg p-4 text-gray-600 hover:border-green-500 hover:text-green-600"
            >
              + Adicionar Peça
            </button>
          )}

          {/* Formulário de Nova Peça */}
          {mostrarForm && (
            <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
              <h4 className="font-semibold mb-4">Nova Peça</h4>

              {/* Layout com duas colunas: Formulário e Preview */}
              <div className="grid lg:grid-cols-[1fr_300px] gap-6">
                {/* Coluna Esquerda: Formulário */}
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
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={novaPeca.acabamentos.esquadria.ativo}
                    onChange={(e) => {
                      setNovaPeca({
                        ...novaPeca,
                        acabamentos: {
                          ...novaPeca.acabamentos,
                          esquadria: { ...novaPeca.acabamentos.esquadria, ativo: e.target.checked }
                        }
                      });
                    }}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Esquadria (R$ {precos.esquadria}/m)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={novaPeca.acabamentos.boleado.ativo}
                    onChange={(e) => {
                      setNovaPeca({
                        ...novaPeca,
                        acabamentos: {
                          ...novaPeca.acabamentos,
                          boleado: { ...novaPeca.acabamentos.boleado, ativo: e.target.checked }
                        }
                      });
                    }}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Boleado (R$ {precos.boleado}/m)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={novaPeca.acabamentos.polimento.ativo}
                    onChange={(e) => {
                      setNovaPeca({
                        ...novaPeca,
                        acabamentos: {
                          ...novaPeca.acabamentos,
                          polimento: { ...novaPeca.acabamentos.polimento, ativo: e.target.checked }
                        }
                      });
                    }}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Polimento (R$ {precos.polimento}/m)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={novaPeca.acabamentos.canal.ativo}
                    onChange={(e) => {
                      setNovaPeca({
                        ...novaPeca,
                        acabamentos: {
                          ...novaPeca.acabamentos,
                          canal: { ...novaPeca.acabamentos.canal, ativo: e.target.checked }
                        }
                      });
                    }}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Canal (R$ {precos.canal}/m)</span>
                </label>
              </div>

              {/* Preview Unificado de Acabamentos */}
              {(novaPeca.acabamentos.esquadria.ativo ||
                novaPeca.acabamentos.boleado.ativo ||
                novaPeca.acabamentos.polimento.ativo ||
                novaPeca.acabamentos.canal.ativo) && (
                <div className="mb-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <h6 className="font-semibold text-sm mb-3">Selecione os lados para cada acabamento:</h6>

                  <div className="space-y-4">
                    {[
                      { tipo: 'esquadria', label: 'Esquadria', cor: 'red', emoji: '' },
                      { tipo: 'boleado', label: 'Boleado', cor: 'yellow', emoji: '' },
                      { tipo: 'polimento', label: 'Polimento', cor: 'blue', emoji: '' },
                      { tipo: 'canal', label: 'Canal', cor: 'orange', emoji: '' }
                    ].filter(item => novaPeca.acabamentos[item.tipo].ativo).map(item => {
                      const coresBg = { red: 'bg-red-100 border-red-400 text-red-700', yellow: 'bg-yellow-100 border-yellow-400 text-yellow-700', blue: 'bg-blue-100 border-blue-400 text-blue-700', orange: 'bg-orange-100 border-orange-400 text-orange-700' };
                      const coresAtivo = { red: 'bg-red-500 text-white border-red-600', yellow: 'bg-yellow-500 text-white border-yellow-600', blue: 'bg-blue-500 text-white border-blue-600', orange: 'bg-orange-500 text-white border-orange-600' };
                      const coresInativo = { red: 'bg-white text-red-400 border-red-200 hover:bg-red-50', yellow: 'bg-white text-yellow-500 border-yellow-200 hover:bg-yellow-50', blue: 'bg-white text-blue-400 border-blue-200 hover:bg-blue-50', orange: 'bg-white text-orange-400 border-orange-200 hover:bg-orange-50' };

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

                      return (
                        <div key={item.tipo} className={`rounded-lg p-3 border ${coresBg[item.cor]}`}>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-bold">{item.label}</p>
                            <span className="text-xs opacity-70">{ladosSelecionados} lado(s)</span>
                          </div>

                          {/* Seletor visual com quadrado representando a peça */}
                          <div className="flex items-center justify-center">
                            <div className="relative" style={{ width: '180px', height: '120px' }}>
                              {/* Botão SUPERIOR */}
                              <button
                                type="button"
                                onClick={() => toggleLado('superior')}
                                className={`absolute top-0 left-1/2 -translate-x-1/2 px-3 py-1 text-xs font-bold rounded-t-lg border-2 transition-all ${lados.superior ? coresAtivo[item.cor] : coresInativo[item.cor]}`}
                                style={{ minWidth: '80px', zIndex: 2 }}
                              >
                                Superior
                              </button>

                              {/* Botão INFERIOR */}
                              <button
                                type="button"
                                onClick={() => toggleLado('inferior')}
                                className={`absolute bottom-0 left-1/2 -translate-x-1/2 px-3 py-1 text-xs font-bold rounded-b-lg border-2 transition-all ${lados.inferior ? coresAtivo[item.cor] : coresInativo[item.cor]}`}
                                style={{ minWidth: '80px', zIndex: 2 }}
                              >
                                Inferior
                              </button>

                              {/* Botão ESQUERDA */}
                              <button
                                type="button"
                                onClick={() => toggleLado('esquerda')}
                                className={`absolute left-0 top-1/2 -translate-y-1/2 px-1 py-2 text-xs font-bold rounded-l-lg border-2 transition-all ${lados.esquerda ? coresAtivo[item.cor] : coresInativo[item.cor]}`}
                                style={{ writingMode: 'vertical-lr', textOrientation: 'mixed', zIndex: 2 }}
                              >
                                Esq.
                              </button>

                              {/* Botão DIREITA */}
                              <button
                                type="button"
                                onClick={() => toggleLado('direita')}
                                className={`absolute right-0 top-1/2 -translate-y-1/2 px-1 py-2 text-xs font-bold rounded-r-lg border-2 transition-all ${lados.direita ? coresAtivo[item.cor] : coresInativo[item.cor]}`}
                                style={{ writingMode: 'vertical-lr', textOrientation: 'mixed', zIndex: 2 }}
                              >
                                Dir.
                              </button>

                              {/* Quadrado central representando a peça */}
                              <div
                                className="absolute bg-white border-2 border-gray-300 rounded flex items-center justify-center"
                                style={{ top: '22px', bottom: '22px', left: '26px', right: '26px' }}
                              >
                                <span className="text-xs text-gray-400 font-medium">PEÇA</span>
                              </div>
                            </div>
                          </div>

                          {/* Botão rápido: Todos os lados */}
                          <div className="flex justify-center mt-2 gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const novosAcabamentos = { ...novaPeca.acabamentos };
                                const todosAtivos = lados.superior && lados.inferior && lados.esquerda && lados.direita;
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
                                lados.superior && lados.inferior && lados.esquerda && lados.direita
                                  ? coresAtivo[item.cor]
                                  : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
                              }`}
                            >
                              {lados.superior && lados.inferior && lados.esquerda && lados.direita ? 'Todos os lados' : 'Selecionar todos'}
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
                <div>
                  <label className="block text-xs mb-1">Cuba</label>
                  <input
                    type="number"
                    value={novaPeca.cuba}
                    onChange={(e) => setNovaPeca({ ...novaPeca, cuba: parseInt(e.target.value) || 0 })}
                    className="w-full border rounded px-2 py-1 text-sm"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1">Cuba Esculpida</label>
                  <input
                    type="number"
                    value={novaPeca.cubaEsculpida}
                    onChange={(e) => setNovaPeca({ ...novaPeca, cubaEsculpida: parseInt(e.target.value) || 0 })}
                    className="w-full border rounded px-2 py-1 text-sm"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1">Cooktop</label>
                  <input
                    type="number"
                    value={novaPeca.cooktop}
                    onChange={(e) => setNovaPeca({ ...novaPeca, cooktop: parseInt(e.target.value) || 0 })}
                    className="w-full border rounded px-2 py-1 text-sm"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1">Recorte</label>
                  <input
                    type="number"
                    value={novaPeca.recorte}
                    onChange={(e) => setNovaPeca({ ...novaPeca, recorte: parseInt(e.target.value) || 0 })}
                    className="w-full border rounded px-2 py-1 text-sm"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1">Pés</label>
                  <input
                    type="number"
                    value={novaPeca.pes}
                    onChange={(e) => setNovaPeca({ ...novaPeca, pes: parseInt(e.target.value) || 0 })}
                    className="w-full border rounded px-2 py-1 text-sm"
                    min="0"
                  />
                </div>
              </div>
                </div>

                {/* Coluna Direita: Preview Fixo */}
                <div className="border-2 border-slate-300 rounded-lg bg-gray-100 p-4 sticky top-4 h-fit">
                  <h5 className="font-bold text-sm text-slate-700 mb-3 pb-2 border-b border-slate-200">
                    📋 Preview da Peça
                  </h5>
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

              {/* Botões de Ação */}
              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => {
                    if (novaPeca.nome && novaPeca.altura && novaPeca.largura && novaPeca.materialId) {
                      onAdicionarPeca({
                        ...novaPeca,
                        altura: parseFloat(novaPeca.altura),
                        largura: parseFloat(novaPeca.largura)
                      });
                      setNovaPeca({
                        nome: '',
                        altura: '',
                        largura: '',
                        quantidade: 1,
                        materialId: materiais[0]?.id || null,
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
                      setMostrarForm(false);
                    } else {
                      alert('Por favor, preencha o nome, altura e largura da peça!');
                    }
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
                >
                  Adicionar
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
        </div>
      )}
    </div>
  );
};
