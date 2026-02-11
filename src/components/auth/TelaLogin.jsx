import { useState, useEffect } from 'react';
import { verificarSenha } from '../../utils/database';

export const TelaLogin = ({ aoEntrar }) => {
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [tentativas, setTentativas] = useState(0);
  const [bloqueado, setBloqueado] = useState(false);
  const [segundosRestantes, setSegundosRestantes] = useState(0);

  useEffect(() => {
    let timer;
    if (bloqueado && segundosRestantes > 0) {
      timer = setTimeout(() => setSegundosRestantes(s => s - 1), 1000);
    }
    if (segundosRestantes === 0 && bloqueado) {
      setBloqueado(false);
      setTentativas(0);
    }
    return () => clearTimeout(timer);
  }, [bloqueado, segundosRestantes]);

  const tentar = async () => {
    if (bloqueado || !senha || verificando) return;

    setVerificando(true);
    try {
      const senhaCorreta = await verificarSenha(senha);

      if (senhaCorreta) {
        localStorage.setItem('pietra_logado', 'true');
        aoEntrar();
      } else {
        const novas = tentativas + 1;
        setTentativas(novas);
        setErro(true);
        setSenha('');
        setTimeout(() => setErro(false), 2500);
        if (novas >= 5) {
          setBloqueado(true);
          setSegundosRestantes(30);
        }
      }
    } catch (error) {
      console.error('Erro ao verificar senha:', error);
      setErro(true);
      setTimeout(() => setErro(false), 2500);
    } finally {
      setVerificando(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 50%, #1e1b4b 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        fontFamily: 'system-ui, sans-serif'
      }}
    >
      <div style={{ width: '100%', maxWidth: '380px' }}>
        {/* Ícone */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <div
            style={{
              width: '80px',
              height: '80px',
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 10px 40px rgba(59,130,246,0.3)',
              fontSize: '38px'
            }}
          >
            ⊞
          </div>
        </div>

        {/* Título */}
        <h1
          style={{
            color: '#fff',
            fontSize: '28px',
            fontWeight: 'bold',
            textAlign: 'center',
            margin: '0 0 4px 0'
          }}
        >
          Pietra Ambientes
        </h1>
        <p
          style={{
            color: '#94a3b8',
            textAlign: 'center',
            margin: '0 0 32px 0',
            fontSize: '14px'
          }}
        >
          Sistema de Orçamentos
        </p>

        {/* Card */}
        <div
          style={{
            background: '#1e293b',
            borderRadius: '20px',
            border: '1px solid #334155',
            padding: '32px',
            boxShadow: '0 25px 50px rgba(0,0,0,0.4)'
          }}
        >
          <label
            style={{
              display: 'block',
              color: '#cbd5e1',
              fontSize: '13px',
              fontWeight: '600',
              marginBottom: '8px'
            }}
          >
            Senha de Acesso
          </label>

          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') tentar();
            }}
            placeholder={bloqueado ? `Bloqueado... ${segundosRestantes}s` : '••••••••'}
            disabled={bloqueado || verificando}
            autoFocus
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '12px',
              border: erro ? '2px solid #ef4444' : '1px solid #475569',
              background: bloqueado ? '#1e293b' : '#334155',
              color: '#fff',
              fontSize: '16px',
              outline: 'none',
              boxSizing: 'border-box',
              cursor: bloqueado ? 'not-allowed' : 'text',
              transition: 'border 0.2s'
            }}
          />

          {/* Erro */}
          {erro && (
            <p
              style={{
                color: '#f87171',
                fontSize: '13px',
                marginTop: '8px',
                margin: '8px 0 0 0'
              }}
            >
              ⚠️ Senha incorreta. Tentativas restantes: {5 - tentativas}
            </p>
          )}

          {/* Bloqueado */}
          {bloqueado && (
            <p
              style={{
                color: '#fbbf24',
                fontSize: '13px',
                marginTop: '8px',
                margin: '8px 0 0 0'
              }}
            >
              🔒 Bloqueado por tentativas. Aguarde {segundosRestantes}s
            </p>
          )}

          {/* Botão */}
          <button
            onClick={tentar}
            disabled={bloqueado || !senha || verificando}
            style={{
              width: '100%',
              marginTop: '24px',
              padding: '13px',
              borderRadius: '12px',
              border: 'none',
              background:
                bloqueado || !senha || verificando
                  ? '#475569'
                  : 'linear-gradient(135deg, #3b82f6, #2563eb)',
              color: '#fff',
              fontSize: '15px',
              fontWeight: '700',
              cursor: bloqueado || !senha || verificando ? 'not-allowed' : 'pointer',
              boxShadow:
                bloqueado || !senha || verificando ? 'none' : '0 4px 15px rgba(59,130,246,0.4)',
              transition: 'all 0.2s'
            }}
          >
            {bloqueado ? '🔒 Bloqueado' : verificando ? 'Verificando...' : 'Entrar'}
          </button>
        </div>

        {/* Rodapé */}
        <p
          style={{
            color: '#475569',
            textAlign: 'center',
            fontSize: '12px',
            marginTop: '20px'
          }}
        >
          Acesso restrito · Fale com o administrador para obter a senha
        </p>
      </div>
    </div>
  );
};
