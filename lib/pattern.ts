import { LarguraImpressora } from '@/types';

export const patternPoints = [
  { x: 36, y: 36, value: '1' },
  { x: 120, y: 36, value: '2' },
  { x: 204, y: 36, value: '3' },
  { x: 36, y: 120, value: '4' },
  { x: 120, y: 120, value: '5' },
  { x: 204, y: 120, value: '6' },
  { x: 36, y: 204, value: '7' },
  { x: 120, y: 204, value: '8' },
  { x: 204, y: 204, value: '9' }
];

export function patternToAsciiGrid(pattern: string) {
  const active = new Set(pattern.split(''));
  return [
    '┌───┬───┬───┐',
    `│ ${active.has('1') ? '●' : ' '} │ ${active.has('2') ? '●' : ' '} │ ${active.has('3') ? '●' : ' '} │`,
    '├───┼───┼───┤',
    `│ ${active.has('4') ? '●' : ' '} │ ${active.has('5') ? '●' : ' '} │ ${active.has('6') ? '●' : ' '} │`,
    '├───┼───┼───┤',
    `│ ${active.has('7') ? '●' : ' '} │ ${active.has('8') ? '●' : ' '} │ ${active.has('9') ? '●' : ' '} │`,
    '└───┴───┴───┘'
  ].join('\n');
}

export function getPrintChars(width: LarguraImpressora) {
  return width === '58mm' ? 32 : 44;
}
