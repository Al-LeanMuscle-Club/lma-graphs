/* Presentation adapter: left-to-right functional trees with vertical reading order. */
(function (root) {
  "use strict";
  const verticalLayout = root.LMATreeLayout.layoutTree;
  function layoutTree(items, options = {}) {
    const width = options.nodeWidth === undefined ? 224 : options.nodeWidth;
    const height = options.nodeHeight === undefined ? 124 : options.nodeHeight;
    const vertical = verticalLayout(items, {...options, nodeWidth: height, nodeHeight: width});
    const nodes = vertical.nodes.map(node => ({...node, x: node.y, y: node.x,
      width: node.height, height: node.width}));
    const byId = new Map(nodes.map(node => [node.id, node]));
    const children = new Map();
    for (const node of nodes) {
      if (node.parent === null) continue;
      if (!children.has(node.parent)) children.set(node.parent, []);
      children.get(node.parent).push(node);
    }
    // Put each parent beside its first child. Reading starts at the top, and
    // adding more leaves extends the page downward without moving the root.
    for (const node of [...nodes].sort((a, b) => b.depth - a.depth)) {
      const branch = children.get(node.id);
      if (branch) node.y = Math.min(...branch.map(child => child.y));
    }
    const links = nodes.filter(node => node.parent !== null).map(node => {
      const parent = byId.get(node.parent);
      const startX = parent.x + parent.width, startY = parent.y + parent.height / 2;
      const endX = node.x, endY = node.y + node.height / 2;
      const middleX = (startX + endX) / 2;
      return {source: parent.id, target: node.id,
        path: `M ${startX} ${startY} C ${middleX} ${startY} ${middleX} ${endY} ${endX} ${endY}`};
    });
    return {nodes, links, width: vertical.height, height: vertical.width, orientation: "left-to-right"};
  }
  root.LMATreeLayout = {...root.LMATreeLayout, layoutTree};
})(globalThis);
