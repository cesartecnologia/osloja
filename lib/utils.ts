import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatDateBR(value?: Date | string | number | null, pattern = "dd/MM/yyyy 'às' HH:mm") {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  return format(date, pattern, { locale: ptBR });
}

export function formatPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 10) {
    return digits.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3').trimEnd();
  }
  return digits.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, '($1) $2-$3').trimEnd();
}

export function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

export function currencyToNumber(value: string) {
  return Number(value.replace(/[^\d,-]/g, '').replace(/\./g, '').replace(',', '.')) || 0;
}

export function toMonospaceLine(label: string, value: string, width: number) {
  const base = `${label} `;
  const dots = '.'.repeat(Math.max(2, width - label.length - value.length - 1));
  return `${base}${dots}${value}`;
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
