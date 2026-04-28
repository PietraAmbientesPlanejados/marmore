/**
 * Página de formulário para criar/editar material
 */
export const MaterialFormPage = ({
  novoMaterial,
  materialEditando,
  materiais,
  onCampoChange,
  onSalvar,
  onCancelar
}) => {
  const isEdit = !!materialEditando;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSalvar();
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-gray-100 rounded-2xl shadow-lg p-8 border border-slate-200">
        <h2 className="text-3xl font-bold mb-6 text-slate-800 flex items-center gap-3">
          <span>{isEdit ? '✏️' : '➕'}</span>
          {isEdit ? 'Editar Material' : 'Novo Material'}
        </h2>

        {isEdit && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded">
            <p className="text-yellow-800 font-medium">
              ⚠️ Atenção: Alterações neste material afetarão todos os orçamentos que o utilizam.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nome */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Nome do Material *
            </label>
            <input
              type="text"
              value={novoMaterial.nome}
              onChange={(e) => onCampoChange('nome', e.target.value)}
              placeholder="Ex: Mármore Branco Carrara"
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Dimensões */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Comprimento (mm) *
              </label>
              <input
                type="number"
                value={novoMaterial.comprimento}
                onChange={(e) => onCampoChange('comprimento', e.target.value)}
                placeholder="3000"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Altura (mm) *
              </label>
              <input
                type="number"
                value={novoMaterial.altura}
                onChange={(e) => onCampoChange('altura', e.target.value)}
                placeholder="2000"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                min="0"
              />
            </div>
          </div>

          {/* Preços */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                Preço de Custo por m² (R$) *
                <span className="text-xs text-slate-500 font-normal">
                  (1m² = 1.000.000mm²)
                </span>
              </label>
              <input
                type="number"
                value={novoMaterial.custo}
                onChange={(e) => onCampoChange('custo', e.target.value)}
                placeholder="250.00"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                min="0"
                step="0.01"
              />
              {/* Mostrar equivalente por chapa */}
              {novoMaterial.custo && novoMaterial.comprimento && novoMaterial.altura && (
                <p className="text-sm text-slate-600 mt-1">
                  ≈ R$ {(
                    parseFloat(novoMaterial.custo) *
                    (parseFloat(novoMaterial.comprimento) * parseFloat(novoMaterial.altura) / 1000000)
                  ).toFixed(2)} por chapa completa
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                Preço de Venda por m² (R$) *
                <span className="text-xs text-slate-500 font-normal">
                  (cobrado nas peças)
                </span>
              </label>
              <input
                type="number"
                value={novoMaterial.venda}
                onChange={(e) => onCampoChange('venda', e.target.value)}
                placeholder="333.33"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                min="0"
                step="0.01"
              />
              {/* Mostrar equivalente por chapa */}
              {novoMaterial.venda && novoMaterial.comprimento && novoMaterial.altura && (
                <p className="text-sm text-slate-600 mt-1">
                  ≈ R$ {(
                    parseFloat(novoMaterial.venda) *
                    (parseFloat(novoMaterial.comprimento) * parseFloat(novoMaterial.altura) / 1000000)
                  ).toFixed(2)} por chapa completa
                </p>
              )}
            </div>
          </div>

          {/* Calculadora de Conversão */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
            <h4 className="font-bold text-blue-900 mb-2">💡 Calculadora de Conversão</h4>
            <p className="text-sm text-blue-800 mb-3">
              Se você sabe o preço por chapa completa, digite aqui para converter:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Custo */}
              <div>
                <label className="block text-xs font-medium text-blue-900 mb-1">
                  Preço de Custo da Chapa Completa (R$)
                </label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-blue-300 rounded bg-white"
                  placeholder="1500.00"
                  step="0.01"
                  onChange={(e) => {
                    const precoChapa = parseFloat(e.target.value);
                    const comp = parseFloat(novoMaterial.comprimento);
                    const alt = parseFloat(novoMaterial.altura);
                    if (precoChapa && comp && alt) {
                      const areaM2 = (comp * alt) / 1000000;
                      const precoM2 = (precoChapa / areaM2).toFixed(2);
                      onCampoChange('custo', precoM2);
                    }
                  }}
                />
                <div className="mt-1 text-xs text-blue-700">
                  → Preço por m²: <strong>R$ {novoMaterial.custo || '0.00'}</strong>
                </div>
              </div>

              {/* Venda */}
              <div>
                <label className="block text-xs font-medium text-blue-900 mb-1">
                  Preço de Venda da Chapa Completa (R$)
                </label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-blue-300 rounded bg-white"
                  placeholder="2000.00"
                  step="0.01"
                  onChange={(e) => {
                    const precoChapa = parseFloat(e.target.value);
                    const comp = parseFloat(novoMaterial.comprimento);
                    const alt = parseFloat(novoMaterial.altura);
                    if (precoChapa && comp && alt) {
                      const areaM2 = (comp * alt) / 1000000;
                      const precoM2 = (precoChapa / areaM2).toFixed(2);
                      onCampoChange('venda', precoM2);
                    }
                  }}
                />
                <div className="mt-1 text-xs text-blue-700">
                  → Preço por m²: <strong>R$ {novoMaterial.venda || '0.00'}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Botões */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-bold transition-colors"
            >
              {isEdit ? '💾 Salvar Alterações' : '➕ Adicionar Material'}
            </button>
            <button
              type="button"
              onClick={onCancelar}
              className="flex-1 bg-slate-300 hover:bg-slate-400 text-slate-800 py-3 px-6 rounded-lg font-bold transition-colors"
            >
              ❌ Cancelar
            </button>
          </div>
        </form>

        {isEdit && (
          <div className="mt-6 pt-6 border-t border-slate-200">
            <p className="text-sm text-slate-600">
              <strong>Material sendo editado:</strong> {materialEditando.nome}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
