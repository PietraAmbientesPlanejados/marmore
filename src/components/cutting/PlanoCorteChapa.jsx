import { useState, useRef, useEffect } from 'react';
import { Move } from '../../constants/icons';

export const PlanoCorteChapa = ({ chapa, numero, onMoverPeca, onMoverPecaNaChapa, onGirarPeca, pecaArrastando, setPecaArrastando, todasChapas }) => {
  const [escala, setEscala] = useState(0.15);
  const canvasRef = useRef(null);
  const [arrastandoPeca, setArrastandoPeca] = useState(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [pecaSelecionada, setPecaSelecionada] = useState(null);
  const [chapaDestinoSelecionada, setChapaDestinoSelecionada] = useState(null);

  useEffect(() => {
    desenharChapa();
  }, [chapa, escala, arrastandoPeca, pecaSelecionada]);

  const desenharChapa = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const largura = chapa.material.comprimento * escala;
    const altura = chapa.material.altura * escala;

    canvas.width = largura + 100;
    canvas.height = altura + 100;

    // Fundo da chapa
    ctx.fillStyle = '#f9fafb';
    ctx.fillRect(50, 50, largura, altura);
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;
    ctx.strokeRect(50, 50, largura, altura);

    // Desenhar grid
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= chapa.material.comprimento; i += 500) {
      const x = 50 + i * escala;
      ctx.beginPath();
      ctx.moveTo(x, 50);
      ctx.lineTo(x, 50 + altura);
      ctx.stroke();
    }
    for (let i = 0; i <= chapa.material.altura; i += 500) {
      const y = 50 + i * escala;
      ctx.beginPath();
      ctx.moveTo(50, y);
      ctx.lineTo(50 + largura, y);
      ctx.stroke();
    }

    // Desenhar peças
    const cores = ['#3b82f6','#10b981','#8b5cf6','#f59e0b','#ef4444','#06b6d4','#ec4899','#14b8a6'];

    chapa.pecas.forEach((peca, idx) => {
      if (arrastandoPeca?.id === peca.id) return;

      const x = 50 + peca.posX * escala;
      const y = 50 + peca.posY * escala;

      // Considerar rotação para dimensões
      const w = (peca.rotacao === 90 ? peca.altura : peca.comprimento) * escala;
      const h = (peca.rotacao === 90 ? peca.comprimento : peca.altura) * escala;

      const ehSelecionada = pecaSelecionada === peca.id;
      const cor = ehSelecionada ? '#10b981' : cores[idx % cores.length];
      const r = parseInt(cor.slice(1, 3), 16);
      const g = parseInt(cor.slice(3, 5), 16);
      const b = parseInt(cor.slice(5, 7), 16);

      // Preencher a peça com cor clara
      ctx.fillStyle = `rgb(${r + (255-r)*0.7}, ${g + (255-g)*0.7}, ${b + (255-b)*0.7})`;
      ctx.fillRect(x, y, w, h);

      // Borda desenhada PARA DENTRO (inset de 1px) — nunca sobrepõe vizinhas
      const bw = ehSelecionada ? 2 : 1.5;
      ctx.strokeStyle = cor;
      ctx.lineWidth = bw;
      ctx.strokeRect(x + bw/2, y + bw/2, w - bw, h - bw);

      // Desenhar acabamentos na peça
      if (peca.acabamentos) {
        const coresAcabamentos = {
          esquadria: '#ef4444',
          boleado: '#eab308',
          polimento: '#3b82f6',
          canal: '#f59e0b'
        };

        const offsetCanal = 3 * escala; // Canal fica mais interno

        Object.keys(peca.acabamentos).forEach(tipoAcab => {
          const acab = peca.acabamentos[tipoAcab];
          if (!acab || !acab.ativo || !acab.lados) return;

          const cor = coresAcabamentos[tipoAcab];
          const isCanal = tipoAcab === 'canal';
          const offset = isCanal ? offsetCanal : 0;

          ctx.strokeStyle = cor;
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 2]);

          // Superior
          if (acab.lados.superior) {
            ctx.beginPath();
            ctx.moveTo(x + offset, y + offset);
            ctx.lineTo(x + w - offset, y + offset);
            ctx.stroke();
          }

          // Inferior
          if (acab.lados.inferior) {
            ctx.beginPath();
            ctx.moveTo(x + offset, y + h - offset);
            ctx.lineTo(x + w - offset, y + h - offset);
            ctx.stroke();
          }

          // Esquerda
          if (acab.lados.esquerda) {
            ctx.beginPath();
            ctx.moveTo(x + offset, y + offset);
            ctx.lineTo(x + offset, y + h - offset);
            ctx.stroke();
          }

          // Direita
          if (acab.lados.direita) {
            ctx.beginPath();
            ctx.moveTo(x + w - offset, y + offset);
            ctx.lineTo(x + w - offset, y + h - offset);
            ctx.stroke();
          }

          ctx.setLineDash([]);
        });
      }

      // Texto com nome e dimensões (considerando rotação)
      ctx.fillStyle = `rgb(${Math.max(0,r-40)}, ${Math.max(0,g-40)}, ${Math.max(0,b-40)})`;
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';

      // Nome da peça (truncado se muito longo)
      const nomePeca = peca.nome || `Peça #${idx + 1}`;
      const nomeMaxLen = 15;
      const nomeExibir = nomePeca.length > nomeMaxLen ? nomePeca.substring(0, nomeMaxLen) + '...' : nomePeca;
      ctx.fillText(nomeExibir, x + w/2, y + h/2 - 8);

      // Dimensões
      ctx.font = '9px Arial';
      const dimensoes = peca.rotacao === 90
        ? `${peca.altura}x${peca.comprimento}`
        : `${peca.comprimento}x${peca.altura}`;
      ctx.fillText(dimensoes, x + w/2, y + h/2 + 3);

      // Indicador de rotação
      if (peca.rotacao === 90) {
        ctx.font = 'bold 8px Arial';
        ctx.fillText('90°', x + w/2, y + h/2 + 13);
      }
    });

    // Desenhar peça sendo arrastada
    if (arrastandoPeca) {
      const w = (arrastandoPeca.rotacao === 90 ? arrastandoPeca.altura : arrastandoPeca.comprimento) * escala;
      const h = (arrastandoPeca.rotacao === 90 ? arrastandoPeca.comprimento : arrastandoPeca.altura) * escala;

      // Cor muda para vermelho se houver colisão
      const cor = arrastandoPeca.colisao ? 'rgba(239, 68, 68, 0.7)' : 'rgba(59, 130, 246, 0.6)';
      const corBorda = arrastandoPeca.colisao ? '#dc2626' : '#1e40af';

      ctx.fillStyle = cor;
      ctx.fillRect(arrastandoPeca.x, arrastandoPeca.y, w, h);
      ctx.strokeStyle = corBorda;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(arrastandoPeca.x, arrastandoPeca.y, w, h);
      ctx.setLineDash([]);

      // Texto de aviso
      if (arrastandoPeca.colisao) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('COLISÃO!', arrastandoPeca.x + w/2, arrastandoPeca.y + h/2);
      }
    }

    // Dimensões
    ctx.fillStyle = '#374151';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${chapa.material.comprimento} mm`, 50 + largura/2, 35);
    ctx.save();
    ctx.translate(35, 50 + altura/2);
    ctx.rotate(-Math.PI/2);
    ctx.fillText(`${chapa.material.altura} mm`, 0, 0);
    ctx.restore();
  };

  const handleMouseDown = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Verificar se clicou em alguma peça
    const pecaClicada = chapa.pecas.find(peca => {
      const px = 50 + peca.posX * escala;
      const py = 50 + peca.posY * escala;
      const pw = (peca.rotacao === 90 ? peca.altura : peca.comprimento) * escala;
      const ph = (peca.rotacao === 90 ? peca.comprimento : peca.altura) * escala;
      return x >= px && x <= px + pw && y >= py && y <= py + ph;
    });

    if (pecaClicada) {
      setPecaSelecionada(pecaClicada.id);
      const px = 50 + pecaClicada.posX * escala;
      const py = 50 + pecaClicada.posY * escala;
      setOffset({ x: x - px, y: y - py });
      setArrastandoPeca({ ...pecaClicada, x: px, y: py });
    } else {
      setPecaSelecionada(null);
    }
  };

  const handleMouseMove = (e) => {
    if (!arrastandoPeca) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - offset.x;
    const y = e.clientY - rect.top - offset.y;

    // Converter para coordenadas da chapa - SEM arredondamento para movimento suave
    let novaX = Math.max(0, (x - 50) / escala);
    let novaY = Math.max(0, (y - 50) / escala);
    const espacamento = 4;

    // MAGNETISMO - Detectar proximidade com outras peças e bordas
    const toleranciaMagnetismo = 20; // pixels de tolerância para ativar o magnetismo
    const larguraPeca = arrastandoPeca.rotacao === 90 ? arrastandoPeca.altura : arrastandoPeca.comprimento;
    const alturaPeca = arrastandoPeca.rotacao === 90 ? arrastandoPeca.comprimento : arrastandoPeca.altura;

    // MAGNETISMO NAS BORDAS DA CHAPA
    // Borda esquerda
    if (Math.abs(novaX - espacamento) < toleranciaMagnetismo) {
      novaX = espacamento;
    }

    // Borda superior
    if (Math.abs(novaY - espacamento) < toleranciaMagnetismo) {
      novaY = espacamento;
    }

    // Borda direita
    const distBordaDireita = Math.abs((novaX + larguraPeca + espacamento) - chapa.material.comprimento);
    if (distBordaDireita < toleranciaMagnetismo) {
      novaX = chapa.material.comprimento - larguraPeca - espacamento;
    }

    // Borda inferior
    const distBordaInferior = Math.abs((novaY + alturaPeca + espacamento) - chapa.material.altura);
    if (distBordaInferior < toleranciaMagnetismo) {
      novaY = chapa.material.altura - alturaPeca - espacamento;
    }

    // MAGNETISMO ENTRE PEÇAS
    chapa.pecas.forEach(p => {
      if (p.id === arrastandoPeca.id) return;

      const larguraOutra = p.rotacao === 90 ? p.altura : p.comprimento;
      const alturaOutra = p.rotacao === 90 ? p.comprimento : p.altura;

      // Magnetismo horizontal (alinhamento à direita da peça existente)
      const distDireita = Math.abs(novaX - (p.posX + larguraOutra + espacamento));
      if (distDireita < toleranciaMagnetismo &&
          !(novaY + alturaPeca < p.posY || novaY > p.posY + alturaOutra)) {
        novaX = p.posX + larguraOutra + espacamento;
      }

      // Magnetismo horizontal (alinhamento à esquerda da peça existente)
      const distEsquerda = Math.abs((novaX + larguraPeca + espacamento) - p.posX);
      if (distEsquerda < toleranciaMagnetismo &&
          !(novaY + alturaPeca < p.posY || novaY > p.posY + alturaOutra)) {
        novaX = p.posX - larguraPeca - espacamento;
      }

      // Magnetismo vertical (alinhamento abaixo da peça existente)
      const distBaixo = Math.abs(novaY - (p.posY + alturaOutra + espacamento));
      if (distBaixo < toleranciaMagnetismo &&
          !(novaX + larguraPeca < p.posX || novaX > p.posX + larguraOutra)) {
        novaY = p.posY + alturaOutra + espacamento;
      }

      // Magnetismo vertical (alinhamento acima da peça existente)
      const distCima = Math.abs((novaY + alturaPeca + espacamento) - p.posY);
      if (distCima < toleranciaMagnetismo &&
          !(novaX + larguraPeca < p.posX || novaX > p.posX + larguraOutra)) {
        novaY = p.posY - alturaPeca - espacamento;
      }

      // Alinhamento de bordas (mesmo Y)
      if (Math.abs(novaY - p.posY) < toleranciaMagnetismo) {
        novaY = p.posY;
      }

      // Alinhamento de bordas (mesmo X)
      if (Math.abs(novaX - p.posX) < toleranciaMagnetismo) {
        novaX = p.posX;
      }

      // Alinhamento de bordas inferiores
      const distBordaInferiorPecas = Math.abs((novaY + alturaPeca) - (p.posY + alturaOutra));
      if (distBordaInferiorPecas < toleranciaMagnetismo &&
          !(novaX + larguraPeca < p.posX || novaX > p.posX + larguraOutra)) {
        novaY = (p.posY + alturaOutra) - alturaPeca;
      }

      // Alinhamento de bordas direitas
      const distBordaDireitaPecas = Math.abs((novaX + larguraPeca) - (p.posX + larguraOutra));
      if (distBordaDireitaPecas < toleranciaMagnetismo &&
          !(novaY + alturaPeca < p.posY || novaY > p.posY + alturaOutra)) {
        novaX = (p.posX + larguraOutra) - larguraPeca;
      }
    });

    // Verificar se a nova posição causaria colisão
    const temColisao = chapa.pecas.some(p => {
      if (p.id === arrastandoPeca.id) return false;

      const larguraOutra = p.rotacao === 90 ? p.altura : p.comprimento;
      const alturaOutra = p.rotacao === 90 ? p.comprimento : p.altura;

      const centroNovaX = novaX + larguraPeca / 2;
      const centroNovaY = novaY + alturaPeca / 2;
      const centroPecaX = p.posX + larguraOutra / 2;
      const centroPecaY = p.posY + alturaOutra / 2;

      const distanciaX = Math.abs(centroNovaX - centroPecaX);
      const distanciaY = Math.abs(centroNovaY - centroPecaY);

      const distanciaMinX = (larguraPeca + larguraOutra) / 2 + espacamento;
      const distanciaMinY = (alturaPeca + alturaOutra) / 2 + espacamento;

      return distanciaX < distanciaMinX && distanciaY < distanciaMinY;
    });

    const foraDosLimites =
      novaX + larguraPeca + espacamento > chapa.material.comprimento ||
      novaY + alturaPeca + espacamento > chapa.material.altura ||
      novaX < espacamento ||
      novaY < espacamento;

    setArrastandoPeca({
      ...arrastandoPeca,
      x: 50 + novaX * escala,
      y: 50 + novaY * escala,
      posXReal: novaX,
      posYReal: novaY,
      colisao: temColisao || foraDosLimites
    });
  };

  const handleMouseUp = (e) => {
    if (!arrastandoPeca) return;

    // Usar as coordenadas já calculadas pelo magnetismo
    const novaX = arrastandoPeca.posXReal !== undefined ? arrastandoPeca.posXReal : Math.max(0, Math.round((arrastandoPeca.x - 50) / escala));
    const novaY = arrastandoPeca.posYReal !== undefined ? arrastandoPeca.posYReal : Math.max(0, Math.round((arrastandoPeca.y - 50) / escala));

    const espacamento = 4;
    const larguraPeca = arrastandoPeca.rotacao === 90 ? arrastandoPeca.altura : arrastandoPeca.comprimento;
    const alturaPeca = arrastandoPeca.rotacao === 90 ? arrastandoPeca.comprimento : arrastandoPeca.altura;

    // Verificar se está dentro dos limites da chapa
    const dentroDosLimites =
      novaX + larguraPeca + espacamento <= chapa.material.comprimento &&
      novaY + alturaPeca + espacamento <= chapa.material.altura &&
      novaX >= espacamento &&
      novaY >= espacamento;

    if (!dentroDosLimites) {
      alert('A peça não cabe nesta posição! Verifique os limites da chapa.');
      setArrastandoPeca(null);
      return;
    }

    // Verificar colisão com outras peças (respeitando 4mm de espaçamento)
    const temColisao = chapa.pecas.some(p => {
      if (p.id === arrastandoPeca.id) return false;

      const larguraOutra = p.rotacao === 90 ? p.altura : p.comprimento;
      const alturaOutra = p.rotacao === 90 ? p.comprimento : p.altura;

      // Calcular distâncias entre centros
      const centroNovaX = novaX + larguraPeca / 2;
      const centroNovaY = novaY + alturaPeca / 2;
      const centroPecaX = p.posX + larguraOutra / 2;
      const centroPecaY = p.posY + alturaOutra / 2;

      const distanciaX = Math.abs(centroNovaX - centroPecaX);
      const distanciaY = Math.abs(centroNovaY - centroPecaY);

      // Distância mínima necessária (metade de cada peça + espaçamento de 4mm)
      const distanciaMinX = (larguraPeca + larguraOutra) / 2 + espacamento;
      const distanciaMinY = (alturaPeca + alturaOutra) / 2 + espacamento;

      // Há colisão se ambas as distâncias forem menores que o mínimo
      return distanciaX < distanciaMinX && distanciaY < distanciaMinY;
    });

    if (temColisao) {
      alert('Não é possível posicionar a peça aqui! Ela precisa estar a pelo menos 4mm de distância das outras peças.');
      setArrastandoPeca(null);
      return;
    }

    // Posição válida - mover a peça
    onMoverPecaNaChapa(arrastandoPeca.id, chapa.id, novaX, novaY);
    setArrastandoPeca(null);
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-lg">Chapa #{numero}</h3>
          <p className="text-sm text-gray-600">{chapa.material.nome} - {chapa.pecas.length} peças</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm">Zoom:</label>
          <input
            type="range"
            min="0.05"
            max="0.3"
            step="0.01"
            value={escala}
            onChange={(e) => setEscala(parseFloat(e.target.value))}
            className="w-32"
          />
        </div>
      </div>
      <div className="overflow-auto bg-white border border-gray-300 rounded">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="cursor-move"
        />
      </div>
      <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
        <div>
          <p className="text-xs text-gray-600">
            Arraste peças livremente. Magnetismo ativo (20mm): alinha com outras peças e bordas.
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Dica: O magnetismo facilita o alinhamento, mas você pode posicionar livremente em qualquer lugar!
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {pecaSelecionada && (
            <>
              <button
                onClick={() => {
                  onGirarPeca(pecaSelecionada, chapa.id);
                }}
                className="flex items-center gap-1 bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700"
              >
                <span className="rotate-90 inline-block"></span>
                Girar Peça (90°)
              </button>

              {/* Botão para mover para outra chapa */}
              {todasChapas && todasChapas.length > 1 && todasChapas.filter(c => c.materialId === chapa.materialId && c.id !== chapa.id).length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setChapaDestinoSelecionada(chapaDestinoSelecionada ? null : 'abrir')}
                    className="flex items-center gap-1 bg-orange-600 text-white px-3 py-1 rounded text-sm hover:bg-orange-700"
                  >
                    <Move size={14} />
                    Mover para Outra Chapa
                  </button>

                  {chapaDestinoSelecionada === 'abrir' && (
                    <div className="absolute bottom-full mb-2 right-0 bg-white border border-gray-300 rounded shadow-lg p-2 z-10 min-w-[200px]">
                      <p className="text-xs font-semibold mb-2 text-gray-700">Selecione a chapa de destino:</p>
                      <p className="text-xs text-blue-600 mb-2">O sistema encontrará automaticamente a melhor posição disponível</p>
                      {todasChapas
                        .filter(c => c.materialId === chapa.materialId && c.id !== chapa.id)
                        .map((chapaDestino, idx) => (
                          <button
                            key={chapaDestino.id}
                            onClick={() => {
                              const pecaAtual = chapa.pecas.find(p => p.id === pecaSelecionada);
                              if (pecaAtual) {
                                // Sistema encontra automaticamente a melhor posição
                                onMoverPeca(pecaSelecionada, chapaDestino.id);
                                setPecaSelecionada(null);
                                setChapaDestinoSelecionada(null);
                              }
                            }}
                            className="w-full text-left px-2 py-1 text-sm hover:bg-blue-50 rounded"
                          >
                            Chapa #{todasChapas.findIndex(c => c.id === chapaDestino.id) + 1} - {chapaDestino.material.nome}
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
