import { NodeData } from './data';
import historicalData from '../data/historical-data.json';

export const generateTooltipContent = (d: NodeData): string => {
  const vertex = historicalData.vertices.find(v => String(v.id) === d.id);
  const archetype = historicalData.vertexArchetypes[d.group];

  return `
    <div class="tooltip-content">
      <div class="tooltip-text">
        <h3>${d.name}</h3>
        <div class="tooltip-details">
          <p><strong>Typ:</strong> ${archetype.name}</p>
          ${vertex?.attributes['0'] ? `<p><strong>Popis:</strong> ${vertex.attributes['0']}</p>` : ''}
          ${vertex?.attributes['1'] ? `<p><strong>Začátek:</strong> ${new Date(vertex.attributes['1']).toLocaleDateString('cs-CZ')}</p>` : ''}
          ${vertex?.attributes['2'] ? `<p><strong>Konec:</strong> ${new Date(vertex.attributes['2']).toLocaleDateString('cs-CZ')}</p>` : ''}
          <p><strong>Stupeň:</strong> ${d.degree || 0}</p>
          <!-- <p><strong>DOI:</strong> ${(d.doi || 0).toFixed(2)}</p> -->
        </div>
      </div>
    </div>
  `;
};
