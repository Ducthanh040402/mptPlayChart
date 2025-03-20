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

    const margin = { top: 30, right: 0, bottom: 30, left: 50 };
    const width = viewport.width - margin.left - margin.right;
    const height = viewport.height - margin.top - margin.bottom;

    svg.selectAll("*").remove();
    const formatNumber = d3.format(".0f");

    const x = d3.scaleLinear()
        .range([0, width])
        .domain([d3.min(data[0].dataPoints, (d) => d.x)! - 20, d3.max(data[0].dataPoints, (d) => d.x)!]);

    const y = d3.scaleLinear()
        .range([height, 0])
        .domain([0, 800]);

    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    g.append("defs").append("clipPath")
        .attr("id", "clip")
        .append("rect")
        .attr("x", -5)
        .attr("y", -2)
        .attr("width", width)
        .attr("height", height + 2);

    g.append("rect")
        .attr("x", -5)
        .attr("y", -5)
        .attr("width", width)
        .attr("height", height + 10)
        .attr("class", "tooltip-overlay")
        .attr("fill", "white");

    const xAxis = g.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(3).tickFormat(formatNumber));

    const yAxis = g.append("g")
        .attr("class", "y-axis")
        .call(d3.axisLeft(y).ticks(4).tickFormat(formatNumber));

    //#region Grid
    const xGrid = d3.axisBottom(x)
        .tickSize(-height)
        .ticks(3)
        .tickFormat(() => "");

    g.append("g")
        .attr("class", "x-grid")
        .attr("transform", `translate(0,${height})`)
        .call(xGrid)
        .selectAll("path, line")
        .style("stroke", "grey")
        .style("opacity", 0.35)
        .style("stroke-dasharray", "1 4");

    const yGrid = d3.axisLeft(y)
        .tickSize(-width)
        .ticks(5)
        .tickFormat(() => "");

    g.append("g")
        .attr("class", "y-grid")
        .call(yGrid)
        .selectAll("path, line")
        .style("stroke", "grey")
        .style("opacity", 0.35)
        .style("stroke-dasharray", "1 4");

    g.selectAll(".y-grid path, .x-grid path").style("stroke", "none");

    //#endregion
    xAxis.select("path").style("stroke", "none");
    xAxis.selectAll("line").style("stroke", "none");
    yAxis.select("path").style("stroke", "none");
    yAxis.selectAll("line").style("stroke", "none");


    const chartArea = g.append("g")
        .attr("class", "chart-area")
        .attr("clip-path", "url(#clip)")
    // .attr("transform", `translate(${margin.left}, ${margin.top })`);


    data[0].isDrawLine = false
    data.forEach((lineData, index) => {
        const filteredData = lineData.dataPoints.filter(d => d.y !== 0);
        console.log(filteredData)
        if (!lineData.isDrawLine) {
            const line = d3.line<DataPoint>()
                .x(d => x(d.x))
                .y(d => Math.min(y(d.y), height)); // Limit height

            chartArea.append("path")
                .datum(filteredData)
                .attr("class", "line-interact")
                .attr("fill", "none")
                .attr("stroke", lineData.color)
                .attr("stroke-linejoin", "round")
                .attr("stroke-linecap", "round")
                .attr("stroke-width", 2.5)
                .attr("d", line);
        }
        else {
            chartArea.selectAll(`.point-${index}`)
                .data(filteredData)
                .enter().append("circle")
                .attr("class", `point-${index}`)
                .attr("cx", d => x(d.x))
                .attr("cy", d => y(d.y))
                .attr("r", 4)
                .attr("fill", lineData.color);
        }
    });

    return svg;
}

