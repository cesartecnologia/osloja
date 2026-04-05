'use client';

import { useMemo, useState } from 'react';
import { LarguraImpressora } from '@/types';

export function useImpressao(defaultWidth: LarguraImpressora = '58mm') {
  const [selectedWidth, setSelectedWidth] = useState<LarguraImpressora>(defaultWidth);

  const printClass = useMemo(() => {
    return selectedWidth === '58mm' ? 'cupom-58mm' : 'cupom-80mm';
  }, [selectedWidth]);

  const injectPrintClass = (target: HTMLElement | null) => {
    if (!target) return;
    target.classList.remove('cupom-58mm', 'cupom-80mm');
    target.classList.add(printClass);
  };

  return {
    selectedWidth,
    setSelectedWidth,
    printClass,
    injectPrintClass
  };
}
