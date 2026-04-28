import logoImg from '/logo.png';

/**
 * Cabeçalho + barra de navegação.
 * A NavBar só aparece quando há orçamento aberto (tela 'orcamento' ou 'plano-corte').
 */
export const Header = ({
  tela,
  orcamentoAtual,
  menuMobileAberto,
  setMenuMobileAberto,
  mostrarPainelPrecosOrcamento,
  setMostrarPainelPrecosOrcamento,
  mostrarPainelMateriaisOrcamento,
  setMostrarPainelMateriaisOrcamento,
  setTela,
  setOrcamentoAtual,
  onGerarEtiquetas,
  onGerarRelatorio,
}) => {
  const navBarVisivel = (tela === 'orcamento' || tela === 'plano-corte') && orcamentoAtual;

  const irParaLista = () => {
    setTela('lista');
    setOrcamentoAtual(null);
  };

  const fecharMenuMobile = () => setMenuMobileAberto(false);

  return (
    <header
      className={`bg-slate-800 shadow-md border-b border-slate-700 ${navBarVisivel ? 'mb-0' : 'mb-4'}`}
    >
      <div className="px-6 py-6">
        <div className="flex items-center gap-4 group cursor-pointer" onClick={irParaLista}>
          <div className="w-20 h-20 rounded-lg overflow-hidden border-2 border-slate-600 bg-gray-100 transition-all duration-500 group-hover:rotate-180 group-hover:scale-110">
            <img src={logoImg} alt="Pietra" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold text-white mb-1 transition-all duration-300 group-hover:bg-gradient-to-r group-hover:from-slate-200 group-hover:via-white group-hover:to-slate-200 group-hover:bg-clip-text group-hover:text-transparent group-hover:scale-105">
              Pietra Sistema de Orçamento
            </h1>
            <p className="text-slate-400 text-base transition-colors duration-300 group-hover:text-slate-300">
              Mármore e Granito
            </p>
          </div>
        </div>
      </div>

      {navBarVisivel && (
        <NavBar
          tela={tela}
          menuMobileAberto={menuMobileAberto}
          setMenuMobileAberto={setMenuMobileAberto}
          mostrarPainelPrecosOrcamento={mostrarPainelPrecosOrcamento}
          setMostrarPainelPrecosOrcamento={setMostrarPainelPrecosOrcamento}
          mostrarPainelMateriaisOrcamento={mostrarPainelMateriaisOrcamento}
          setMostrarPainelMateriaisOrcamento={setMostrarPainelMateriaisOrcamento}
          setTela={setTela}
          onGerarEtiquetas={() => {
            onGerarEtiquetas();
            fecharMenuMobile();
          }}
          onGerarRelatorio={() => {
            onGerarRelatorio();
            fecharMenuMobile();
          }}
        />
      )}
    </header>
  );
};

const NavBar = ({
  tela,
  menuMobileAberto,
  setMenuMobileAberto,
  mostrarPainelPrecosOrcamento,
  setMostrarPainelPrecosOrcamento,
  mostrarPainelMateriaisOrcamento,
  setMostrarPainelMateriaisOrcamento,
  setTela,
  onGerarEtiquetas,
  onGerarRelatorio,
}) => {
  const fecharMenuMobile = () => setMenuMobileAberto(false);

  const trocarTela = (novaTela) => {
    setTela(novaTela);
    fecharMenuMobile();
  };

  const toggleMostrar = (setter, fecharOutro) => {
    setter((v) => !v);
    fecharOutro(false);
    fecharMenuMobile();
  };

  const botaoBase =
    'flex-1 flex items-center justify-center gap-2 bg-slate-700 text-white px-4 py-3 hover:bg-slate-800 font-medium transition-all';

  return (
    <div>
      <button
        onClick={() => setMenuMobileAberto(!menuMobileAberto)}
        className={`md:hidden w-full ${botaoBase}`}
      >
        <span className="text-xl">{menuMobileAberto ? '✕' : '☰'}</span>
        <span>Menu</span>
      </button>

      <div className={`${menuMobileAberto ? 'flex' : 'hidden'} md:flex flex-col md:flex-row`}>
        {tela === 'orcamento' ? (
          <button onClick={() => trocarTela('plano-corte')} className={`${botaoBase} border-r border-slate-600`}>
            Plano de Corte
          </button>
        ) : (
          <button onClick={() => trocarTela('orcamento')} className={`${botaoBase} border-r border-slate-600`}>
            Voltar ao Orçamento
          </button>
        )}

        <button onClick={onGerarEtiquetas} className={`${botaoBase} border-r border-slate-600`}>
          Gerar Etiquetas
        </button>

        <button onClick={onGerarRelatorio} className={`${botaoBase} border-r border-slate-600`}>
          Relatório
        </button>

        <button
          onClick={() => toggleMostrar(setMostrarPainelPrecosOrcamento, setMostrarPainelMateriaisOrcamento)}
          className={`${botaoBase} border-r border-slate-600`}
        >
          Configurar Preços
        </button>

        <button
          onClick={() => toggleMostrar(setMostrarPainelMateriaisOrcamento, setMostrarPainelPrecosOrcamento)}
          className={botaoBase}
        >
          Configurar Materiais
        </button>
      </div>
    </div>
  );
};
