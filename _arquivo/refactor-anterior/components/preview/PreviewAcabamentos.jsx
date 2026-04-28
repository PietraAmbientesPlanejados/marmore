import { useRef, useEffect } from 'react';

export const PreviewAcabamentos = ({ peca, mostrarSempre = false, mini = false }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    desenharPreview();
  }, [peca]);

  const desenharPreview = () => {
    const canvas = canvasRef.current;
    if (!canvas || !peca.largura || !peca.altura) return;

    const ctx = canvas.getContext('2d');
    const largura = parseFloat(peca.largura) || 600;
    const altura = parseFloat(peca.altura) || 400;

    const canvasWidth = mini ? 120 : 260;
    const canvasHeight = mini ? 90 : 200;

    const margemTop = mini ? 10 : 28;
    const margemLeft = mini ? 10 : 30;
    const margemRight = mini ? 10 : 12;
    const margemBottom = mini ? 10 : 12;

    const areaW = canvasWidth - margemLeft - margemRight;
    const areaH = canvasHeight - margemTop - margemBottom;

    const escalaX = areaW / altura;
    const escalaY = areaH / largura;
    const escala = Math.min(escalaX, escalaY, mini ? 0.5 : 0.55);

    const w = altura * escala;
    const h = largura * escala;
    const offsetX = margemLeft + (areaW - w) / 2;
    const offsetY = margemTop + (areaH - h) / 2;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    gradient.addColorStop(0, '#f8fafc');
    gradient.addColorStop(1, '#e2e8f0');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    if (!mini) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
      ctx.shadowBlur = 15;
      ctx.shadowOffsetX = 3;
      ctx.shadowOffsetY = 3;
    }

    const pecaGradient = ctx.createLinearGradient(offsetX, offsetY, offsetX + w, offsetY + h);
    pecaGradient.addColorStop(0, '#ffffff');
    pecaGradient.addColorStop(1, '#f1f5f9');
    ctx.fillStyle = pecaGradient;
    ctx.fillRect(offsetX, offsetY, w, h);

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = mini ? 1 : 2;
    ctx.strokeRect(offsetX, offsetY, w, h);

    const coresAcabamentos = {
      esquadria: '#ef4444',
      boleado: '#eab308',
      polimento: '#3b82f6',
      canal: '#f59e0b'
    };

    const offsetCanal = mini ? 3 : 10;

    if (peca.acabamentos) {
      Object.keys(peca.acabamentos).forEach((tipoAcab) => {
        const acab = peca.acabamentos[tipoAcab];
        if (!acab.ativo) return;

        const cor = coresAcabamentos[tipoAcab];
        const isCanal = tipoAcab === 'canal';
        const offset = isCanal ? offsetCanal : 0;

        ctx.strokeStyle = cor;
        ctx.lineWidth = mini ? 2 : 4;
        ctx.setLineDash(mini ? [5, 2] : [10, 5]);

        if (acab.lados.superior) {
          ctx.beginPath();
          ctx.moveTo(offsetX + offset, offsetY + offset);
          ctx.lineTo(offsetX + w - offset, offsetY + offset);
          ctx.stroke();
        }

        if (acab.lados.inferior) {
          ctx.beginPath();
          ctx.moveTo(offsetX + offset, offsetY + h - offset);
          ctx.lineTo(offsetX + w - offset, offsetY + h - offset);
          ctx.stroke();
        }

        if (acab.lados.esquerda) {
          ctx.beginPath();
          ctx.moveTo(offsetX + offset, offsetY + offset);
          ctx.lineTo(offsetX + offset, offsetY + h - offset);
          ctx.stroke();
        }

        if (acab.lados.direita) {
          ctx.beginPath();
          ctx.moveTo(offsetX + w - offset, offsetY + offset);
          ctx.lineTo(offsetX + w - offset, offsetY + h - offset);
          ctx.stroke();
        }

        ctx.setLineDash([]);
      });
    }

    if (!mini) {
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(offsetX + w / 2 - 35, offsetY - 22, 70, 16);
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1;
      ctx.strokeRect(offsetX + w / 2 - 35, offsetY - 22, 70, 16);
      ctx.fillStyle = '#1e293b';
      ctx.fillText(`${largura} mm`, offsetX + w / 2, offsetY - 11);

      ctx.save();
      ctx.translate(offsetX - 22, offsetY + h / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-35, -9, 70, 18);
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1;
      ctx.strokeRect(-35, -9, 70, 18);
      ctx.fillStyle = '#1e293b';
      ctx.fillText(`${altura} mm`, 0, 3);
      ctx.restore();

      if (peca.nome && !mini) {
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        const nomeExibir = peca.nome.length > 20 ? peca.nome.substring(0, 20) + '...' : peca.nome;

        const textWidth = ctx.measureText(nomeExibir).width;
        ctx.fillStyle = 'rgba(59, 130, 246, 0.92)';
        ctx.fillRect(offsetX + w / 2 - textWidth / 2 - 6, offsetY + h / 2 - 9, textWidth + 12, 18);

        ctx.fillStyle = '#ffffff';
        ctx.fillText(nomeExibir, offsetX + w / 2, offsetY + h / 2 + 3);
      }
    }
  };

  return (
    <div className={`${mini ? 'border border-gray-300 rounded' : 'border-2 border-gray-300 rounded-lg shadow-md'} bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden`} style={mini ? {} : { maxWidth: '260px' }}>
      <canvas ref={canvasRef} className="w-full" style={mini ? {} : { maxWidth: '260px' }} />
      {!mostrarSempre && !mini && (
        <div className="p-3 border-t-2 border-gray-200 bg-gray-100">
          <p className="text-xs text-gray-600 text-center font-medium">👁️ Pré-visualização da peça</p>
          <p className="text-xs text-gray-500 text-center mt-1">Use os botões abaixo para selecionar os lados de cada acabamento</p>
        </div>
      )}
      {!mini && peca.acabamentos && Object.values(peca.acabamentos).some((a) => a.ativo) && (
        <div className="p-2 bg-gray-100 border-t border-gray-200">
          <p className="text-xs font-semibold text-gray-600 mb-1">Acabamentos:</p>
          <div className="flex flex-wrap gap-2">
            {Object.keys(peca.acabamentos).map((tipo) => {
              const acab = peca.acabamentos[tipo];
              if (!acab.ativo) return null;
              const cores = { esquadria: '#ef4444', boleado: '#eab308', polimento: '#3b82f6', canal: '#f59e0b' };
              return (
                <div key={tipo} className="flex items-center gap-1">
                  <div className="w-3 h-0.5" style={{ backgroundColor: cores[tipo] }}></div>
                  <span className="text-xs text-gray-700">{tipo.charAt(0).toUpperCase() + tipo.slice(1)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
