import { NodeData } from './data';

export const calculateNodeRadius = (node: NodeData, allNodes: NodeData[]) => {
  const baseSize = 30;
  const maxSize = 50;
  const maxDegree = Math.max(...allNodes.map(n => n.degree || 0));
  const minDegree = Math.min(...allNodes.map(n => n.degree || 0));

  if (maxDegree === minDegree) return baseSize;

  const normalizedDegree = (node.degree || 0 - minDegree) / (maxDegree - minDegree);

  console.log(Math.min(baseSize + normalizedDegree * (maxSize - baseSize), maxSize));
  return Math.min(baseSize + normalizedDegree * (maxSize - baseSize), maxSize);
};

export const hexToHSL = (hex: string) => {
  hex = hex.replace('#', '');

  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);

  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }

    h /= 6;
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
};

export const hslToHex = (h: number, s: number, l: number) => {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;

  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  };

  return `#${f(0)}${f(8)}${f(4)}`;
};
