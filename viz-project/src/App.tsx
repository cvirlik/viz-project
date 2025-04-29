import { useState } from 'react';
import * as d3 from 'd3';

type LinePlotProps = {
    data: number[];
    width?: number;
    height?: number;
    marginTop?: number;
    marginRight?: number;
    marginBottom?: number;
    marginLeft?: number;
};

function LinePlot({
    data,
    width = 640,
    height = 400,
    marginTop = 20,
    marginRight = 20,
    marginBottom = 20,
    marginLeft = 20
    }: LinePlotProps) {
    const x = d3.scaleLinear(
        [0, data.length - 1],
        [marginLeft, width - marginRight]
    );
    const extent = d3.extent(data);

    const y = d3.scaleLinear()
    .domain(extent as [number, number])
    .range([height - marginBottom, marginTop]);
    // const y = d3.scaleLinear(d3.extent(data), [height - marginBottom, marginTop]);
    const line = d3.line((d, i) => x(i), y);
    return (
        <svg width={width} height={height}>
        <path
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            d={line(data) ?? undefined}
        />
        <g fill="white" stroke="currentColor" stroke-width="1.5">
            {data.map((d, i) => (
            <circle key={i} cx={x(i)} cy={y(d)} r="2.5" />
            ))}
        </g>
        </svg>
    );
}

function App() {
    const [data, setData] = useState(() => d3.ticks(-2, 2, 200).map(Math.sin));
  
    function onMouseMove(event: any) {
      const [x, y] = d3.pointer(event);
      setData(data.slice(-200).concat(Math.atan2(x, y)));
    }
  
    return (
      <div onMouseMove={onMouseMove}>
        <LinePlot data={data} />
      </div>
    );
  }
  

export default App;
