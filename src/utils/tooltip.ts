import { NodeData } from './data';
import { rawData } from './data';

export const generateTooltipContent = (d: NodeData): string => {
  const vertex = rawData.vertices.find(v => String(v.id) === d.id);
  const archetype = rawData.vertexArchetypes[d.group];

  // Get all available attributes
  const attributes = vertex?.attributes || {};
  const attributeEntries = Object.entries(attributes).filter(
    ([_, value]) => value !== undefined && value !== null
  );

  return `
    <div class="tooltip-content">
      <button class="tooltip-close">×</button>
      <div class="tooltip-text">
        <h3>${d.name}</h3>
        <div class="tooltip-details">
          <p><strong>Typ:</strong> ${archetype.name}</p>
          ${attributeEntries
            .map(([key, value]) => {
              // Try to parse as date if it looks like a date
              const isDate = typeof value === 'string' && !isNaN(Date.parse(value));
              const displayValue = isDate ? new Date(value).toLocaleDateString('cs-CZ') : value;

              return `<p><strong>${key}:</strong> ${displayValue}</p>`;
            })
            .join('')}
          <p><strong>Stupeň:</strong> ${d.degree || 0}</p>
          <!-- <p><strong>DOI:</strong> ${(d.doi || 0).toFixed(2)}</p> -->
        </div>
      </div>
    </div>
  `;
};
