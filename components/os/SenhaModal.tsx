'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useFeedback } from '@/components/providers/FeedbackProvider';
import { patternPoints } from '@/lib/pattern';

interface SenhaModalProps {
  open: boolean;
  initialValue?: string;
  onClose: () => void;
  onConfirm: (pattern: string) => void;
}

export function SenhaModal({ open, initialValue = '', onClose, onConfirm }: SenhaModalProps) {
  const { notify } = useFeedback();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [sequence, setSequence] = useState<string[]>(initialValue ? initialValue.split('') : []);
  const [dragging, setDragging] = useState(false);

  const activePoints = useMemo(() => new Set(sequence), [sequence]);

  useEffect(() => {
    if (!open) return;
    setSequence(initialValue ? initialValue.split('') : []);
  }, [initialValue, open]);

  useEffect(() => {
    if (!open) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.lineWidth = 5;
    context.strokeStyle = '#DC2626';
    context.lineCap = 'round';

    if (sequence.length > 1) {
      context.beginPath();
      sequence.forEach((value, index) => {
        const point = patternPoints.find((item) => item.value === value)!;
        if (index === 0) context.moveTo(point.x, point.y);
        else context.lineTo(point.x, point.y);
      });
      context.stroke();
    }

    for (const point of patternPoints) {
      context.beginPath();
      context.fillStyle = activePoints.has(point.value) ? '#DC2626' : '#E5E7EB';
      context.arc(point.x, point.y, 14, 0, Math.PI * 2);
      context.fill();
    }
  }, [sequence, activePoints, open]);

  function getPointFromEvent(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 240;
    const y = ((event.clientY - rect.top) / rect.height) * 240;
    return patternPoints.find((point) => Math.hypot(point.x - x, point.y - y) <= 20);
  }

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    const point = getPointFromEvent(event);
    if (!point) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
    setSequence([point.value]);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!dragging) return;
    const point = getPointFromEvent(event);
    if (!point) return;
    setSequence((current) => (current.includes(point.value) ? current : [...current, point.value]));
  }

  function handlePointerEnd(event: React.PointerEvent<HTMLCanvasElement>) {
    if (dragging) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDragging(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-soft">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-600">Senha padrão</p>
          <h3 className="text-xl font-bold text-ink">Desenhe o padrão do Android</h3>
          <p className="mt-1 text-sm text-gray-500">Funciona com mouse e toque. O padrão é salvo como sequência de 1 a 9.</p>
        </div>

        <canvas
          ref={canvasRef}
          width={240}
          height={240}
          className="mx-auto touch-none rounded-xl border border-gray-200 bg-gray-50"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerLeave={handlePointerEnd}
        />

        <p className="mt-3 text-center font-mono text-sm text-gray-600">{sequence.join('') || 'Nenhum ponto selecionado'}</p>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setSequence([])}>
            Limpar
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Fechar
          </Button>
          <Button
            type="button"
            onClick={() => {
              if (sequence.length < 4) {
                notify({ title: 'Padrão incompleto', description: 'O padrão deve ter pelo menos 4 pontos.', variant: 'warning' });
                return;
              }
              onConfirm(sequence.join(''));
              onClose();
            }}
          >
            Confirmar padrão
          </Button>
        </div>
      </div>
    </div>
  );
}
