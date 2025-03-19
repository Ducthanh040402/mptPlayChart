import * as d3 from "d3";
import powerbi from "powerbi-visuals-api";
import { VisualFormattingSettingsModel } from "./settings";
import { DataPoint, LineData, defaultColors } from "./interface"

import { scaleBand, scaleLinear, ScaleLinear, ScaleBand } from "d3-scale";
import {
    BaseType,
    select as d3Select,
    Selection as d3Selection,
} from "d3-selection";
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
type Selection<T extends d3.BaseType> = d3.Selection<T, any, any, any>;

export function renderLineChart(data: LineData[],
    viewport: powerbi.IViewport, svg: Selection<SVGSVGElement>, settings: VisualFormattingSettingsModel) {
    const margin = { top: 20, right: 20, bottom: 30, left: 50 };
    const width = viewport.width - margin.left - margin.right;
    const height = viewport.height - margin.top - margin.bottom;

    svg.selectAll("*").remove();

    const x = scaleBand()
        .range([0, width])
        .padding(0.1)
        .domain(data[0].dataPoints.map(d => d.x.toString()));

    const y = scaleLinear()
        .range([height, 0])
        .domain([0, d3.max(data, d => d3.max(d.dataPoints, d => d.y))]);

    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    g.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x));

    g.append("g")
        .call(d3.axisLeft(y))
        .append("text")
        .attr("fill", "#000")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", "0.71em")
        .attr("text-anchor", "end")
        .text("Value");

    data.forEach((lineData, index) => {
        const line = d3.line<DataPoint>()
            .x(d => x(d.x.toString()))
            .y(d => y(d.y));

        g.append("path")
            .datum(lineData.dataPoints)
            .attr("fill", "none")
            .attr("stroke", lineData.color)
            .attr("stroke-linejoin", "round")
            .attr("stroke-linecap", "round")
            .attr("stroke-width", 1.5)
            .attr("d", line);
    }
    );

    // Add legend
    const legend = svg.append("g")
        .attr("transform", `translate(${width},${margin.top})`)
        .attr("text-anchor", "end")
        .selectAll("g")
        .data(data.map(d => d.name))
        .enter().append("g")
        .attr("transform", (d, i) => `translate(0,${i * 20})`);

    legend.append("rect")
        .attr("x", -19)
        .attr("width", 19)
        .attr("height", 19)
        .attr("fill", (d, i) => defaultColors[i % defaultColors.length]);

    legend.append("text")
        .attr("x", -24)
        .attr("y", 9.5)
        .attr("dy", "0.32em")
        .text(d => d);

    return svg;

}