// Load the JSON data
d3.json("/historical-data.json").then(data => {
  // Map vertex archetypes to colors
  const archetypeColors = {
    "person": "#1f77b4",
    "device": "#2ca02c",
    "theory": "#ff7f0e"
  };

  // Get the container dimensions
  const container = document.getElementById('visualization-container');
  const width = container.clientWidth;
  const height = container.clientHeight;

  // Set SVG dimensions to match container
  const svg = d3.select("#visualization")
    .attr("width", width)
    .attr("height", height);

  // Process nodes from vertices
  const nodes = data.vertices.map(vertex => ({
    id: vertex.id,
    name: vertex.title,
    type: data.vertexArchetypes[vertex.archetype].name,
    description: vertex.attributes["0"] || "",
    begin: vertex.attributes["1"] || "",
    end: vertex.attributes["2"] || ""
  }));

  // Process links from edges
  const links = data.edges.map(edge => ({
    source: edge.from,
    target: edge.to,
    relation: edge.attributes["3"] || "related to"
  }));

  // Calculate node degrees
  const nodeDegrees = {};
  nodes.forEach(node => {
    nodeDegrees[node.id] = 0; // Initialize all nodes with degree 0
  });
  
  links.forEach(link => {
    nodeDegrees[link.source] = (nodeDegrees[link.source] || 0) + 1;
    nodeDegrees[link.target] = (nodeDegrees[link.target] || 0) + 1;
  });

  // Find max degree for scaling
  const maxDegree = Math.max(...Object.values(nodeDegrees));
  const minDegree = Math.min(...Object.values(nodeDegrees));

  // Create a scale for node sizes (15 to 40 pixels)
  const radiusScale = d3.scaleLinear()
    .domain([minDegree, maxDegree])
    .range([20, 40]); // radius values (half of diameter)

  const color = d3.scaleOrdinal()
    .domain(Object.keys(archetypeColors))
    .range(Object.values(archetypeColors));

  const tooltip = d3.select("#tooltip");

  const simulation = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(links).id(d => d.id).distance(150))
    .force("charge", d3.forceManyBody().strength(-400))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("collision", d3.forceCollide().radius(50));

  const link = svg.append("g")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
    .selectAll("line")
    .data(links)
    .join("line")
      .attr("stroke-width", 2);

  const edgeLabels = svg.append("g")
    .selectAll("text")
    .data(links)
    .join("text")
      .attr("class", "edge-label")
      .attr("text-anchor", "middle")
      .text(d => d.relation);

  const node = svg.append("g")
    .selectAll("g")
    .data(nodes)
    .join("g")
      .call(drag(simulation));

  node.append("circle")
      .attr("r", d => radiusScale(nodeDegrees[d.id]))
      .attr("fill", d => color(d.type))
      .on("mouseover", function(event, d) {
        tooltip.transition()
          .duration(200)
          .style("opacity", .9);
        tooltip.html(`<strong>${d.name}</strong><br/>
          ${d.description}<br/>
          ${d.begin}${d.end ? ` - ${d.end}` : ''}`)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", function() {
        tooltip.transition()
          .duration(500)
          .style("opacity", 0);
      });

  node.append("text")
      .attr("dy", 4)
      .attr("text-anchor", "middle")
      .text(d => d.name);

  simulation.on("tick", () => {
    link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

    node
        .attr("transform", d => `translate(${d.x},${d.y})`);

    edgeLabels
        .attr("x", d => (d.source.x + d.target.x) / 2)
        .attr("y", d => (d.source.y + d.target.y) / 2);
  });

  function drag(simulation) {
    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }
    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }
    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
    return d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
  }
}); 