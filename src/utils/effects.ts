import { EdgeController, LinkController, NodeController } from './d3-controllers';
import { NodeData } from './data';

export const hideNonAdjacent = (
  nodes: NodeData[],
  neighborMap: Map<string, Set<string>>,
  nodeController: NodeController,
  linkController: LinkController,
  edgeController: EdgeController
) => {
  const adjacent = new Set();
  for (const node of nodes) {
    const adj = neighborMap.get(node.id);
    if (adj) {
      adj.forEach(id => adjacent.add(id));
    }
    adjacent.add(node.id);
  }

  const LIGHT_OPACITY = 0.3;

  nodeController.style('opacity', nd => (adjacent.has(nd.id) ? 1 : LIGHT_OPACITY));
  linkController.style('opacity', lk =>
    adjacent.has(lk.source) && adjacent.has(lk.target) ? 1 : LIGHT_OPACITY
  );
  edgeController.style('opacity', el =>
    adjacent.has(el.source) && adjacent.has(el.target) ? 1 : LIGHT_OPACITY
  );
};

export const showNonAdjacent = (
  nodeController: NodeController,
  linkController: LinkController,
  edgeController: EdgeController
) => {
  nodeController.style('opacity', 1);
  linkController.style('opacity', 1);
  edgeController.style('opacity', 1);
};
