'use client';

import { useEffect, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { CupomVenda } from '@/components/vendas/CupomVenda';
import { useImpressao } from '@/lib/impressao';
import { Empresa, LarguraImpressora, Venda } from '@/types';

export function ModalImpressaoVenda({
  open,
  onClose,
  empresa,
  venda,
  defaultWidth,
  atendente,
  autoPrint = false
}: {
  open: boolean;
  onClose: () => void;
  empresa: Empresa;
  venda: Venda;
  defaultWidth: LarguraImpressora;
  atendente?: string;
  autoPrint?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { selectedWidth, setSelectedWidth, injectPrintClass } = useImpressao(defaultWidth);
  const handlePrint = useReactToPrint({ content: () => containerRef.current });
  const hasAutoPrintedRef = useRef(false);

  useEffect(() => {
    if (!open) {
      hasAutoPrintedRef.current = false;
      return;
    }

    if (!autoPrint || hasAutoPrintedRef.current) return;

    const timer = window.setTimeout(() => {
      injectPrintClass(containerRef.current);
      hasAutoPrintedRef.current = true;
      handlePrint?.();
    }, 250);

    return () => window.clearTimeout(timer);
  }, [autoPrint, handlePrint, injectPrintClass, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4">
      <div className="mx-auto max-w-3xl rounded-xl bg-white p-6 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-600">Preview de impressão</p>
            <h3 className="text-xl font-bold text-ink">Comprovante de venda</h3>
          </div>

          <div className="flex items-center gap-2">
            <Select value={selectedWidth} onChange={(e) => setSelectedWidth(e.target.value as LarguraImpressora)} className="w-28">
              <option value="58mm">58mm</option>
              <option value="80mm">80mm</option>
            </Select>
            <Button type="button" variant="outline" onClick={onClose}>
              Fechar
            </Button>
            <Button
              type="button"
              onClick={() => {
                injectPrintClass(containerRef.current);
                handlePrint?.();
              }}
            >
              Imprimir
            </Button>
          </div>
        </div>

        <div className="mt-6 flex justify-center overflow-auto rounded-xl bg-gray-100 p-6">
          <div ref={containerRef}>
            <CupomVenda empresa={empresa} venda={venda} width={selectedWidth} atendente={atendente} />
          </div>
        </div>
      </div>
    </div>
  );
}
