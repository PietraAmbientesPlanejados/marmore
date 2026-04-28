import { useState, useRef, useEffect, useMemo } from 'react';
import { CORES_AMBIENTES } from '../../constants/colors';

const CANVAS_OFFSET = 50;

export const PlanoCorteChapa = ({
  chapa,
  numero,
  ambientes,
  onMoverPeca,
  onMoverPecaNaChapa,
  onGirarPeca,
  onMoverParaAvulsas,
  onExcluirChapa,
  todasChapas,
  setMostrandoDetalhePeca,
  setModoEdicaoPeca,
  setPecaEditada,
  espessuraDisco = 4,
  margemLaterais = 50,
  onDragPreviewChange,
}) => {
  const escala = 0.3;
  const canvasRef = useRef(null);
  const [arrastandoPeca, setArrastandoPeca] = useState(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [pecaSelecionada, setPecaSelecionada] = useState(null);
  const [pecaHover, setPecaHover] = useState(null);
  const [menuContexto, setMenuContexto] = useState(null);
  const [mouseForaDoCanvas, setMouseForaDoCanvas] = useState(false);
  const [expandido, setExpandido] = useState(true);
  // Ref espelho para acessar o valor atual dentro de listeners globais (sem re-registrar)
  const mouseForaDoCanvasRef = useRef(false);

  // Mapa peca.id → índice do ambiente ao qual ela pertence
  const ambienteIdxPorPecaId = useMemo(() => {
    const mapa = {};
    (ambientes || []).forEach((amb, idx) => {
      (amb.pecas || []).forEach((p) => {
        mapa[p.id] = idx;
      });
    });
    return mapa;
  }, [ambientes]);

  const corDaPeca = (pecaId) => {
    const idx = ambienteIdxPorPecaId[pecaId] ?? 0;
    return CORES_AMBIENTES[idx % CORES_AMBIENTES.length];
  };

  useEffect(() => {
    if (!expandido) return;
    desenharChapa();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapa, escala, arrastandoPeca, pecaSelecionada, pecaHover, ambienteIdxPorPecaId, mouseForaDoCanvas, expandido]);

  // Fechar menu de contexto ao clicar fora
  useEffect(() => {
    if (!menuContexto) return;
    const fechar = () => setMenuContexto(null);
    document.addEventListener('mousedown', fechar);
    document.addEventListener('scroll', fechar, true);
    return () => {
      document.removeEventListener('mousedown', fechar);
      document.removeEventListener('scroll', fechar, true);
    };
  }, [menuContexto]);

  // Durante drag: atualiza preview flutuante e processa drop em outra chapa no mouseup.
  useEffect(() => {
    if (!arrastandoPeca) return;

    const detectarChapaAlvo = (e) => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const alvo = el?.closest('[data-chapa-id]');
      return alvo?.getAttribute('data-chapa-id') || null;
    };

    const handleGlobalMove = (e) => {
      // Preview flutuante só quando mouse está FORA do canvas de origem
      // (dentro, o fantasma do canvas já mostra a peça com magnetismo).
      if (!mouseForaDoCanvasRef.current) {
        onDragPreviewChange?.(null);
        return;
      }
      onDragPreviewChange?.({
        peca: arrastandoPeca,
        chapaOrigemId: chapa.id,
        escala,
        clientX: e.clientX,
        clientY: e.clientY,
      });
    };

    const handleGlobalUp = (e) => {
      const chapaAlvoId = detectarChapaAlvo(e);
      const targetIsCanvas = e.target?.tagName === 'CANVAS';

      // Mesmo card + direto no canvas: deixa handleMouseUp local processar (valida posição/colisão)
      if (chapaAlvoId === String(chapa.id) && targetIsCanvas) {
        onDragPreviewChange?.(null);
        return;
      }

      // Mesmo card + fora do canvas: cancelar drag
      if (chapaAlvoId === String(chapa.id)) {
        setArrastandoPeca(null);
        onDragPreviewChange?.(null);
        return;
      }

      // Bandeja de peças avulsas: voltar peça para lá
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const bandeja = el?.closest('[data-destino-avulsas]');
      if (bandeja && onMoverParaAvulsas) {
        onMoverParaAvulsas(arrastandoPeca.id);
        setArrastandoPeca(null);
        onDragPreviewChange?.(null);
        return;
      }

      // Outra chapa: validar material e mover
      if (chapaAlvoId) {
        const chapaAlvo = (todasChapas || []).find((c) => String(c.id) === chapaAlvoId);
        if (chapaAlvo && chapaAlvo.materialId === chapa.materialId) {
          onMoverPeca(arrastandoPeca.id, chapaAlvo.id);
        } else if (chapaAlvo) {
          alert('⚠️ Só é possível mover peças entre chapas do mesmo material.');
        }
      }
      setArrastandoPeca(null);
      onDragPreviewChange?.(null);
    };

    window.addEventListener('mousemove', handleGlobalMove);
    window.addEventListener('mouseup', handleGlobalUp);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMove);
      window.removeEventListener('mouseup', handleGlobalUp);
    };
  }, [arrastandoPeca, chapa.id, chapa.materialId, escala, todasChapas, onMoverPeca, onMoverParaAvulsas, onDragPreviewChange]);

  const desenharChapa = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const largura = chapa.material.comprimento * escala;
    const altura = chapa.material.altura * escala;

    canvas.width = largura + 100;
    canvas.height = altura + 100;

    ctx.fillStyle = '#f9fafb';
    ctx.fillRect(CANVAS_OFFSET, CANVAS_OFFSET, largura, altura);
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;
    ctx.strokeRect(CANVAS_OFFSET, CANVAS_OFFSET, largura, altura);

    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= chapa.material.comprimento; i += 500) {
      const x = CANVAS_OFFSET + i * escala;
      ctx.beginPath();
      ctx.moveTo(x, CANVAS_OFFSET);
      ctx.lineTo(x, CANVAS_OFFSET + altura);
      ctx.stroke();
    }
    for (let i = 0; i <= chapa.material.altura; i += 500) {
      const y = CANVAS_OFFSET + i * escala;
      ctx.beginPath();
      ctx.moveTo(CANVAS_OFFSET, y);
      ctx.lineTo(CANVAS_OFFSET + largura, y);
      ctx.stroke();
    }

    chapa.pecas.forEach((peca, idx) => {
      if (arrastandoPeca?.id === peca.id) return;

      const x = CANVAS_OFFSET + peca.posX * escala;
      const y = CANVAS_OFFSET + peca.posY * escala;
      const w = (peca.rotacao === 90 ? peca.altura : peca.largura) * escala;
      const h = (peca.rotacao === 90 ? peca.largura : peca.altura) * escala;

      const cor = corDaPeca(peca.id);
      const ehSelecionada = pecaSelecionada === peca.id;

      const r = parseInt(cor.slice(1, 3), 16);
      const g = parseInt(cor.slice(3, 5), 16);
      const b = parseInt(cor.slice(5, 7), 16);

      // Preenchimento: mais escuro se selecionada
      const fatorClareamento = ehSelecionada ? 0.35 : 0.7;
      ctx.fillStyle = `rgb(${r + (255 - r) * fatorClareamento}, ${g + (255 - g) * fatorClareamento}, ${b + (255 - b) * fatorClareamento})`;
      ctx.fillRect(x, y, w, h);

      // Borda: mais espessa se selecionada
      const bw = ehSelecionada ? 3 : 1.5;
      ctx.strokeStyle = cor;
      ctx.lineWidth = bw;
      ctx.strokeRect(x + bw / 2, y + bw / 2, w - bw, h - bw);

      // Número da peça centralizado
      ctx.fillStyle = `rgb(${Math.max(0, r - 40)}, ${Math.max(0, g - 40)}, ${Math.max(0, b - 40)})`;
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`#${idx + 1}`, x + w / 2, y + h / 2);
      ctx.textBaseline = 'alphabetic';
    });

    // Tooltip no hover — nome + dimensões (+ indicação de rotação)
    if (pecaHover) {
      const pecaIdx = chapa.pecas.findIndex((p) => p.id === pecaHover.id);
      if (pecaIdx !== -1) {
        const peca = chapa.pecas[pecaIdx];
        const nomePeca = peca.nome || `Peça #${pecaIdx + 1}`;
        const dimensoes =
          peca.rotacao === 90
            ? `${peca.altura} × ${peca.largura} mm  ↻ 90°`
            : `${peca.largura} × ${peca.altura} mm`;

        const tooltipX = pecaHover.mouseX + 15;
        const tooltipY = pecaHover.mouseY - 10;

        ctx.font = 'bold 12px Arial';
        const larguraNome = ctx.measureText(nomePeca).width;
        ctx.font = '11px Arial';
        const larguraDim = ctx.measureText(dimensoes).width;
        const padding = 8;
        const tooltipWidth = Math.max(larguraNome, larguraDim) + padding * 2;
        const tooltipHeight = 40;

        ctx.fillStyle = 'rgba(30, 41, 59, 0.95)';
        ctx.fillRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);

        ctx.strokeStyle = 'rgba(148, 163, 184, 0.8)';
        ctx.lineWidth = 1;
        ctx.strokeRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.font = 'bold 12px Arial';
        ctx.fillText(nomePeca, tooltipX + padding, tooltipY + 16);

        ctx.fillStyle = 'rgba(203, 213, 225, 1)';
        ctx.font = '11px Arial';
        ctx.fillText(dimensoes, tooltipX + padding, tooltipY + 31);
      }
    }

    // Peça sendo arrastada (fantasma) — esconde se mouse saiu do canvas (arrastando para outra chapa)
    if (arrastandoPeca && !mouseForaDoCanvas) {
      const w =
        (arrastandoPeca.rotacao === 90 ? arrastandoPeca.altura : arrastandoPeca.largura) * escala;
      const h =
        (arrastandoPeca.rotacao === 90 ? arrastandoPeca.largura : arrastandoPeca.altura) * escala;

      const cor = arrastandoPeca.colisao ? 'rgba(239, 68, 68, 0.7)' : 'rgba(59, 130, 246, 0.6)';
      const corBorda = arrastandoPeca.colisao ? '#dc2626' : '#1e40af';

      ctx.fillStyle = cor;
      ctx.fillRect(arrastandoPeca.x, arrastandoPeca.y, w, h);
      ctx.strokeStyle = corBorda;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(arrastandoPeca.x, arrastandoPeca.y, w, h);
      ctx.setLineDash([]);

      if (arrastandoPeca.colisao) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('COLISÃO!', arrastandoPeca.x + w / 2, arrastandoPeca.y + h / 2);
      }
    }

    // Dimensões da chapa
    ctx.fillStyle = '#374151';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${chapa.material.comprimento} mm`, CANVAS_OFFSET + largura / 2, 35);
    ctx.save();
    ctx.translate(35, CANVAS_OFFSET + altura / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(`${chapa.material.altura} mm`, 0, 0);
    ctx.restore();
  };

  const pecaNaPosicao = (x, y) => {
    return chapa.pecas.find((peca) => {
      const px = CANVAS_OFFSET + peca.posX * escala;
      const py = CANVAS_OFFSET + peca.posY * escala;
      const pw = (peca.rotacao === 90 ? peca.altura : peca.largura) * escala;
      const ph = (peca.rotacao === 90 ? peca.largura : peca.altura) * escala;
      return x >= px && x <= px + pw && y >= py && y <= py + ph;
    });
  };

  const handleMouseDown = (e) => {
    if (e.button !== 0) return; // só processar clique esquerdo
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const pecaClicada = pecaNaPosicao(x, y);

    if (pecaClicada) {
      setPecaSelecionada(pecaClicada.id);
      setPecaHover(null);
      setMouseForaDoCanvas(false);
      mouseForaDoCanvasRef.current = false;
      const px = CANVAS_OFFSET + pecaClicada.posX * escala;
      const py = CANVAS_OFFSET + pecaClicada.posY * escala;
      setOffset({ x: x - px, y: y - py });
      setArrastandoPeca({ ...pecaClicada, x: px, y: py });
    } else {
      setPecaSelecionada(null);
    }
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const pecaClicada = pecaNaPosicao(x, y);
    if (!pecaClicada) return;

    setPecaSelecionada(pecaClicada.id);
    setMenuContexto({ x: e.clientX, y: e.clientY, peca: pecaClicada });
  };

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (!arrastandoPeca) {
      const pecaSobMouse = pecaNaPosicao(mouseX, mouseY);
      if (pecaSobMouse) {
        setPecaHover({ id: pecaSobMouse.id, mouseX, mouseY });
      } else {
        setPecaHover(null);
      }
      return;
    }

    const x = mouseX - offset.x;
    const y = mouseY - offset.y;

    let novaX = Math.max(0, (x - CANVAS_OFFSET) / escala);
    let novaY = Math.max(0, (y - CANVAS_OFFSET) / escala);
    const espacamento = espessuraDisco;

    const toleranciaMagnetismo = 40;
    const larguraPeca = arrastandoPeca.rotacao === 90 ? arrastandoPeca.altura : arrastandoPeca.largura;
    const alturaPeca = arrastandoPeca.rotacao === 90 ? arrastandoPeca.largura : arrastandoPeca.altura;

    // Coleta o melhor candidato de snap por eixo usando a posição RAW do mouse para todos
    // os checks de sobreposição. Isso evita que snaps sequenciais se sobreponham
    // (problema "o último vence") quando há várias peças próximas.
    // Snaps de borda da chapa e de espaçamento têm prioridade sobre alinhamentos de borda.
    const origX = novaX;
    const origY = novaY;

    let xEspacamentoSnap = null; // { target, dist } — borda da chapa + espaçamento entre peças
    let yEspacamentoSnap = null;
    let xAlinhamentoSnap = null;
    let yAlinhamentoSnap = null;

    // Snaps de borda da chapa entram no mesmo pool de candidatos (prioridade = espaçamento)
    const dBordaEsq = Math.abs(origX - margemLaterais);
    if (dBordaEsq < toleranciaMagnetismo) {
      xEspacamentoSnap = { target: margemLaterais, dist: dBordaEsq };
    }
    const dBordaDir = Math.abs(origX + larguraPeca + margemLaterais - chapa.material.comprimento);
    if (dBordaDir < toleranciaMagnetismo) {
      const targetDir = chapa.material.comprimento - larguraPeca - margemLaterais;
      if (!xEspacamentoSnap || dBordaDir < xEspacamentoSnap.dist) {
        xEspacamentoSnap = { target: targetDir, dist: dBordaDir };
      }
    }
    const dBordaTopo = Math.abs(origY - margemLaterais);
    if (dBordaTopo < toleranciaMagnetismo) {
      yEspacamentoSnap = { target: margemLaterais, dist: dBordaTopo };
    }
    const dBordaInf = Math.abs(origY + alturaPeca + margemLaterais - chapa.material.altura);
    if (dBordaInf < toleranciaMagnetismo) {
      const targetInf = chapa.material.altura - alturaPeca - margemLaterais;
      if (!yEspacamentoSnap || dBordaInf < yEspacamentoSnap.dist) {
        yEspacamentoSnap = { target: targetInf, dist: dBordaInf };
      }
    }

    chapa.pecas.forEach((p) => {
      if (p.id === arrastandoPeca.id) return;

      const larguraOutra = p.rotacao === 90 ? p.altura : p.largura;
      const alturaOutra = p.rotacao === 90 ? p.largura : p.altura;

      // Checks de sobreposição sempre com posições ORIGINAIS (sem modificar novaX/novaY ainda)
      const sobrepoeV = !(origY + alturaPeca < p.posY - toleranciaMagnetismo ||
                          origY > p.posY + alturaOutra + toleranciaMagnetismo);
      const sobrepoeH = !(origX + larguraPeca < p.posX - toleranciaMagnetismo ||
                          origX > p.posX + larguraOutra + toleranciaMagnetismo);

      // Snaps de espaçamento em X (requerem sobreposição vertical)
      if (sobrepoeV) {
        const dDir = Math.abs(origX - (p.posX + larguraOutra + espacamento));
        if (dDir < toleranciaMagnetismo && (!xEspacamentoSnap || dDir < xEspacamentoSnap.dist)) {
          xEspacamentoSnap = { target: p.posX + larguraOutra + espacamento, dist: dDir };
        }
        const dEsq = Math.abs(origX + larguraPeca + espacamento - p.posX);
        if (dEsq < toleranciaMagnetismo && (!xEspacamentoSnap || dEsq < xEspacamentoSnap.dist)) {
          xEspacamentoSnap = { target: p.posX - larguraPeca - espacamento, dist: dEsq };
        }
      }

      // Snaps de espaçamento em Y (requerem sobreposição horizontal)
      if (sobrepoeH) {
        const dBaixo = Math.abs(origY - (p.posY + alturaOutra + espacamento));
        if (dBaixo < toleranciaMagnetismo && (!yEspacamentoSnap || dBaixo < yEspacamentoSnap.dist)) {
          yEspacamentoSnap = { target: p.posY + alturaOutra + espacamento, dist: dBaixo };
        }
        const dCima = Math.abs(origY + alturaPeca + espacamento - p.posY);
        if (dCima < toleranciaMagnetismo && (!yEspacamentoSnap || dCima < yEspacamentoSnap.dist)) {
          yEspacamentoSnap = { target: p.posY - alturaPeca - espacamento, dist: dCima };
        }
      }

      // Alinhamentos de borda em Y (peças em colunas diferentes — sem sobreposição horizontal)
      if (!sobrepoeH) {
        const dTopo = Math.abs(origY - p.posY);
        if (dTopo < toleranciaMagnetismo && (!yAlinhamentoSnap || dTopo < yAlinhamentoSnap.dist)) {
          yAlinhamentoSnap = { target: p.posY, dist: dTopo };
        }
        const dBase = Math.abs(origY + alturaPeca - (p.posY + alturaOutra));
        if (dBase < toleranciaMagnetismo && (!yAlinhamentoSnap || dBase < yAlinhamentoSnap.dist)) {
          yAlinhamentoSnap = { target: p.posY + alturaOutra - alturaPeca, dist: dBase };
        }
      }

      // Alinhamentos de borda em X (peças em linhas diferentes — sem sobreposição vertical)
      if (!sobrepoeV) {
        const dEsqBorda = Math.abs(origX - p.posX);
        if (dEsqBorda < toleranciaMagnetismo && (!xAlinhamentoSnap || dEsqBorda < xAlinhamentoSnap.dist)) {
          xAlinhamentoSnap = { target: p.posX, dist: dEsqBorda };
        }
        const dDirBorda = Math.abs(origX + larguraPeca - (p.posX + larguraOutra));
        if (dDirBorda < toleranciaMagnetismo && (!xAlinhamentoSnap || dDirBorda < xAlinhamentoSnap.dist)) {
          xAlinhamentoSnap = { target: p.posX + larguraOutra - larguraPeca, dist: dDirBorda };
        }
      }
    });

    // Aplica: espaçamento tem prioridade sobre alinhamento de borda
    if (xEspacamentoSnap) novaX = xEspacamentoSnap.target;
    else if (xAlinhamentoSnap) novaX = xAlinhamentoSnap.target;

    if (yEspacamentoSnap) novaY = yEspacamentoSnap.target;
    else if (yAlinhamentoSnap) novaY = yAlinhamentoSnap.target;

    // Fase 2: se o snap de Y moveu a peça para dentro da zona de sobreposição vertical
    // mas não havia snap de X na fase 1 (porque origY estava fora da zona), tenta de novo.
    if (yEspacamentoSnap && !xEspacamentoSnap) {
      chapa.pecas.forEach((p) => {
        if (p.id === arrastandoPeca.id) return;
        const larguraOutra = p.rotacao === 90 ? p.altura : p.largura;
        const alturaOutra = p.rotacao === 90 ? p.largura : p.altura;

        const sobrepoeVOrig = !(origY + alturaPeca < p.posY - toleranciaMagnetismo ||
                                origY > p.posY + alturaOutra + toleranciaMagnetismo);
        const sobrepoeVNovo = !(novaY + alturaPeca < p.posY - toleranciaMagnetismo ||
                                novaY > p.posY + alturaOutra + toleranciaMagnetismo);

        if (!sobrepoeVOrig && sobrepoeVNovo) {
          const dDir = Math.abs(novaX - (p.posX + larguraOutra + espacamento));
          if (dDir < toleranciaMagnetismo && (!xEspacamentoSnap || dDir < xEspacamentoSnap.dist)) {
            xEspacamentoSnap = { target: p.posX + larguraOutra + espacamento, dist: dDir };
            novaX = xEspacamentoSnap.target;
          }
          const dEsq = Math.abs(novaX + larguraPeca + espacamento - p.posX);
          if (dEsq < toleranciaMagnetismo && (!xEspacamentoSnap || dEsq < xEspacamentoSnap.dist)) {
            xEspacamentoSnap = { target: p.posX - larguraPeca - espacamento, dist: dEsq };
            novaX = xEspacamentoSnap.target;
          }
        }
      });
    }

    const temColisao = chapa.pecas.some((p) => {
      if (p.id === arrastandoPeca.id) return false;
      const larguraOutra = p.rotacao === 90 ? p.altura : p.largura;
      const alturaOutra = p.rotacao === 90 ? p.largura : p.altura;

      // AABB inflado pelo espaçamento — colisão se sobrepõem a bbox + gap
      const aMinX = p.posX - espacamento;
      const aMaxX = p.posX + larguraOutra + espacamento;
      const aMinY = p.posY - espacamento;
      const aMaxY = p.posY + alturaOutra + espacamento;

      return (
        novaX < aMaxX &&
        novaX + larguraPeca > aMinX &&
        novaY < aMaxY &&
        novaY + alturaPeca > aMinY
      );
    });

    const foraDosLimites =
      novaX + larguraPeca + margemLaterais > chapa.material.comprimento ||
      novaY + alturaPeca + margemLaterais > chapa.material.altura ||
      novaX < margemLaterais ||
      novaY < margemLaterais;

    setArrastandoPeca({
      ...arrastandoPeca,
      x: CANVAS_OFFSET + novaX * escala,
      y: CANVAS_OFFSET + novaY * escala,
      posXReal: novaX,
      posYReal: novaY,
      colisao: temColisao || foraDosLimites,
    });
  };

  const handleMouseLeaveCanvas = () => {
    setPecaHover(null);
    // NÃO cancela arrastandoPeca: permite arrastar para fora e soltar em outra chapa
    // (drop é tratado no listener global de mouseup).
    // Esconder fantasma para não ficar preso na borda nem mostrar "COLISÃO" falso.
    if (arrastandoPeca) {
      setMouseForaDoCanvas(true);
      mouseForaDoCanvasRef.current = true;
    }
  };

  const handleMouseEnterCanvas = () => {
    setMouseForaDoCanvas(false);
    mouseForaDoCanvasRef.current = false;
  };

  const handleMouseUp = () => {
    if (!arrastandoPeca) return;

    // Arredonda para inteiros (mm) pra evitar erros de floating-point nas comparações
    const novaX = Math.round(
      arrastandoPeca.posXReal !== undefined
        ? arrastandoPeca.posXReal
        : Math.max(0, (arrastandoPeca.x - CANVAS_OFFSET) / escala)
    );
    const novaY = Math.round(
      arrastandoPeca.posYReal !== undefined
        ? arrastandoPeca.posYReal
        : Math.max(0, (arrastandoPeca.y - CANVAS_OFFSET) / escala)
    );

    const espacamento = espessuraDisco;
    const larguraPeca = arrastandoPeca.rotacao === 90 ? arrastandoPeca.altura : arrastandoPeca.largura;
    const alturaPeca = arrastandoPeca.rotacao === 90 ? arrastandoPeca.largura : arrastandoPeca.altura;

    const dentroDosLimites =
      novaX + larguraPeca + margemLaterais <= chapa.material.comprimento &&
      novaY + alturaPeca + margemLaterais <= chapa.material.altura &&
      novaX >= margemLaterais &&
      novaY >= margemLaterais;

    if (!dentroDosLimites) {
      alert('A peça não cabe nesta posição! Verifique os limites da chapa.');
      setArrastandoPeca(null);
      return;
    }

    // Colisão via AABB com bordas infladas pelo espaçamento (gap mínimo exigido).
    // Se alguma borda ficar a menos que `espacamento`mm com sobreposição no eixo perpendicular,
    // as bboxes infladas se sobrepõem → colisão.
    const temColisao = chapa.pecas.some((p) => {
      if (p.id === arrastandoPeca.id) return false;
      const larguraOutra = p.rotacao === 90 ? p.altura : p.largura;
      const alturaOutra = p.rotacao === 90 ? p.largura : p.altura;

      const aMinX = Math.round(p.posX) - espacamento;
      const aMaxX = Math.round(p.posX) + larguraOutra + espacamento;
      const aMinY = Math.round(p.posY) - espacamento;
      const aMaxY = Math.round(p.posY) + alturaOutra + espacamento;

      return (
        novaX < aMaxX &&
        novaX + larguraPeca > aMinX &&
        novaY < aMaxY &&
        novaY + alturaPeca > aMinY
      );
    });

    if (temColisao) {
      alert(
        `Não é possível posicionar a peça aqui! Ela precisa estar a pelo menos ${espessuraDisco}mm de distância das outras peças (espessura do disco de corte).`
      );
      setArrastandoPeca(null);
      return;
    }

    onMoverPecaNaChapa(arrastandoPeca.id, chapa.id, novaX, novaY);
    setArrastandoPeca(null);
  };

  const abrirEdicaoPeca = (peca) => {
    if (!(setMostrandoDetalhePeca && setModoEdicaoPeca && setPecaEditada)) return;

    const copia = JSON.parse(JSON.stringify(peca));

    if (!copia.acabamentos) {
      copia.acabamentos = {
        polimento: { ativo: false, lados: { superior: false, inferior: false, esquerda: false, direita: false } },
        esquadria: { ativo: false, lados: { superior: false, inferior: false, esquerda: false, direita: false } },
        boleado: { ativo: false, lados: { superior: false, inferior: false, esquerda: false, direita: false } },
        canal: { ativo: false, lados: { superior: false, inferior: false, esquerda: false, direita: false } },
      };
    }
    copia.cuba = copia.cuba || 0;
    copia.cubaEsculpida = copia.cubaEsculpida || 0;
    copia.cooktop = copia.cooktop || 0;
    copia.recorte = copia.recorte || 0;
    copia.pes = copia.pes || 0;

    if (!copia.acabamentosPersonalizados) {
      const largura = copia.rotacao === 90 ? copia.altura : copia.largura;
      const altura = copia.rotacao === 90 ? copia.largura : copia.altura;

      copia.acabamentosPersonalizados = {};
      ['esquadria', 'boleado', 'polimento', 'canal'].forEach((tipo) => {
        if (copia.acabamentos[tipo]?.ativo) {
          let totalMm = 0;
          const lados = copia.acabamentos[tipo].lados;
          if (lados.superior) totalMm += largura;
          if (lados.inferior) totalMm += largura;
          if (lados.esquerda) totalMm += altura;
          if (lados.direita) totalMm += altura;
          copia.acabamentosPersonalizados[tipo] = (totalMm / 1000).toFixed(2);
        } else {
          copia.acabamentosPersonalizados[tipo] = '';
        }
      });
    }

    setMostrandoDetalhePeca(peca);
    setPecaEditada(copia);
    setModoEdicaoPeca(true);
  };

  const chapasDestino = (todasChapas || []).filter(
    (c) => c.materialId === chapa.materialId && c.id !== chapa.id
  );

  return (
    <div className="border border-slate-200 rounded-lg p-4 bg-white min-w-0" data-chapa-id={chapa.id}>
      <div className={`flex items-center justify-between gap-3 flex-wrap ${expandido ? 'mb-4' : ''}`}>
        <div className="flex items-center gap-3">
          <span className="font-bold text-lg text-slate-800">Chapa #{numero}</span>
          <span className="bg-slate-800 text-white text-sm font-semibold px-3 py-1 rounded-full whitespace-nowrap">
            {chapa.material.nome}
          </span>
          <span className="text-xs text-slate-500">{chapa.pecas.length} peças</span>
        </div>
        <div className="flex items-center gap-2">
          {chapa.pecas.length === 0 && onExcluirChapa && (
            <button
              onClick={() => onExcluirChapa(chapa.id)}
              className="flex items-center gap-1.5 text-sm text-red-600 hover:text-red-800 px-2 py-1 rounded hover:bg-red-50 transition-colors"
              title="Excluir esta chapa vazia"
            >
              🗑️ Excluir
            </button>
          )}
          <button
            onClick={() => setExpandido((v) => !v)}
            className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
            title={expandido ? 'Retrair chapa' : 'Expandir chapa'}
          >
            <span className={`transition-transform duration-200 ${expandido ? 'rotate-180' : ''}`}>▼</span>
            {expandido ? 'Retrair' : 'Expandir'}
          </button>
        </div>
      </div>

      {expandido && (
        <div className="overflow-auto bg-gray-100 border border-slate-200 rounded max-w-full">
          <canvas
            ref={canvasRef}
            data-chapa-id={chapa.id}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeaveCanvas}
            onMouseEnter={handleMouseEnterCanvas}
            onContextMenu={handleContextMenu}
            className="cursor-move block mx-auto"
          />
        </div>
      )}

      {menuContexto && (
        <div
          className="fixed bg-white border border-slate-200 rounded-lg shadow-xl py-1 z-50 min-w-[220px]"
          style={{ left: menuContexto.x, top: menuContexto.y }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="px-4 py-2 border-b border-slate-100">
            <p className="text-xs text-slate-500">Peça</p>
            <p className="text-sm font-semibold text-slate-800 truncate">
              {menuContexto.peca.nome || 'Sem nome'}
            </p>
          </div>

          <button
            onClick={() => {
              onGirarPeca(menuContexto.peca.id, chapa.id);
              setMenuContexto(null);
            }}
            className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-2"
          >
            <span className="text-base">↻</span>
            Rotacionar 90°
          </button>

          <button
            onClick={() => {
              abrirEdicaoPeca(menuContexto.peca);
              setMenuContexto(null);
            }}
            className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-2"
          >
            <span className="text-base">✏️</span>
            Editar propriedades
          </button>

          {chapasDestino.length > 0 && (
            <>
              <div className="border-t border-slate-100 my-1" />
              <div className="px-4 py-1 text-xs font-semibold text-slate-500 uppercase">
                Mover para
              </div>
              {chapasDestino.map((chapaDestino) => {
                const numeroChapa = (todasChapas || []).findIndex((c) => c.id === chapaDestino.id) + 1;
                return (
                  <button
                    key={chapaDestino.id}
                    onClick={() => {
                      onMoverPeca(menuContexto.peca.id, chapaDestino.id);
                      setMenuContexto(null);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    Chapa #{numeroChapa} — {chapaDestino.material.nome}
                  </button>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
};
