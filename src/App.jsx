import { useState, useEffect } from 'react';
import { TelaLogin } from './components/auth/TelaLogin';
import { SistemaOrcamentoMarmore } from './SistemaOrcamentoMarmore';
import { STORAGE_KEYS } from './constants/config';

export default function App() {
  const [logado, setLogado] = useState(false);

  useEffect(() => {
    setLogado(localStorage.getItem(STORAGE_KEYS.LOGADO) === 'true');
  }, []);

  if (!logado) {
    return <TelaLogin aoEntrar={() => setLogado(true)} />;
  }

  return <SistemaOrcamentoMarmore />;
}
