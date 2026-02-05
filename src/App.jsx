import { useState, useEffect } from 'react';
import { TelaLogin } from './components/auth/TelaLogin';
import { SistemaOrcamentoMarmore } from './SistemaOrcamentoMarmore';
import { storage } from './utils/storage';

export default function App() {
  const [logado, setLogado] = useState(false);

  useEffect(() => {
    setLogado(storage.isLogado());
  }, []);

  const handleLogout = () => {
    storage.logout();
    setLogado(false);
  };

  if (!logado) {
    return <TelaLogin aoEntrar={() => setLogado(true)} />;
  }

  return (
    <div>
      <SistemaOrcamentoMarmore />
      <button
        onClick={handleLogout}
        className="fixed bottom-4 right-4 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg transition-colors duration-200 flex items-center gap-2"
      >
        🚪 Sair
      </button>
    </div>
  );
}
