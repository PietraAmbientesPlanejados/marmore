import { useState, useEffect } from 'react';
import { TelaLogin } from './components/auth/TelaLogin';
import { SistemaOrcamentoMarmore } from './SistemaOrcamentoMarmore';
import { storage } from './utils/storage';

export default function App() {
  const [logado, setLogado] = useState(false);

  useEffect(() => {
    setLogado(storage.isLogado());
  }, []);

  if (!logado) {
    return <TelaLogin aoEntrar={() => setLogado(true)} />;
  }

  return (
    <div>
      <SistemaOrcamentoMarmore />
    </div>
  );
}
