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

export function renderLineChart(data: LineData[], options: VisualUpdateOptions,
    viewport: powerbi.IViewport, svg: Selection<SVGSVGElement>, settings: VisualFormattingSettingsModel) {

    const margin = { top: 30, right: 0, bottom: 30, left: 50 };
    const width = viewport.width - margin.left - margin.right;
    const height = viewport.height - margin.top - margin.bottom;

    svg.selectAll("*").remove();

    // Format number with units
    const formatNumber = (value: number | { valueOf(): number }): string => {
        const numValue = typeof value === 'number' ? value : value.valueOf();

        if (numValue >= 1_000_000_000) {
            return (numValue / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + "B";
        } else if (numValue >= 1_000_000) {
            return (numValue / 1_000_000).toFixed(1).replace(/\.0$/, '') + "M";
        } else if (numValue >= 1_000) {
            return (numValue / 1_000).toFixed(1).replace(/\.0$/, '') + "K";
        } else {
            return numValue.toString();
        }
    };

    const xAxisTitle = options.dataViews?.[0].metadata.columns[0].displayName.toString();
    const yAxisTitle = data.map(d => d.name).join(" & ");

    // Calculate domain for X and Y axes from actual data
    const xMin = d3.min(data, d => d3.min(d.dataPoints, p => p.x))!;
    const xMax = d3.max(data, d => d3.max(d.dataPoints, p => p.x))!;
    const yMin = d3.min(data, d => d3.min(d.dataPoints, p => p.y))!;
    const yMax = d3.max(data, d => d3.max(d.dataPoints, p => p.y))!;

    // Add 5% margin for both axes
    const xMargin = (xMax - xMin) * 0.02;
    const yMargin = (yMax - yMin) * 0.02;

    // Calculate default domain from data
    const defaultXDomain: [number, number] = [xMin - xMargin, xMax + xMargin];
    const defaultYDomain: [number, number] = [yMin - yMargin, yMax + yMargin];

    // Update default values for settings
    settings.axisRange.updateDefaultRange(
        defaultXDomain[0],
        defaultXDomain[1],
        defaultYDomain[0],
        defaultYDomain[1]
    );

    let xDomain: [number, number];
    let yDomain: [number, number];

    if (settings.axisRange.autoRange.value) {
        xDomain = defaultXDomain;
        yDomain = defaultYDomain;
    } else {
        xDomain = [settings.axisRange.xMin.value, settings.axisRange.xMax.value];
        yDomain = [settings.axisRange.yMin.value, settings.axisRange.yMax.value];
    }

    const x = d3.scaleLinear()
        .range([0, width])
        .domain(xDomain);

    const y = d3.scaleLinear()
        .range([height, 0])
        .domain(yDomain);

    svg.datum({ x, y })
    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Add title for X axis
    g.append("text")
        .attr("class", "x-axis-title")
        .attr("text-anchor", "middle")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom - 5)
        .style("font-size", "12px")
        .text(settings.axisLabels.xAxisLabel.value);

    // Add title for Y axis
    g.append("text")
        .attr("class", "y-axis-title")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -margin.left + 15)
        .style("font-size", "12px")
        .text(settings.axisLabels.yAxisLabel.value);

    g.append("defs").append("clipPath")
        .attr("id", "clip")
        .append("rect")
        .attr("x", -5)
        .attr("y", -2)
        .attr("width", width)
        .attr("height", height + 10);

    g.append("rect")
        .attr("x", -5)
        .attr("y", -5)
        .datum(data)
        .attr("width", width)
        .attr("height", height + 10)
        .attr("class", "tooltip-overlay")

        .attr("fill", "white");

    const xAxis = g.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(5).tickFormat(d => d.toString()));

    const yAxis = g.append("g")
        .attr("class", "y-axis")
        .call(d3.axisLeft(y).ticks(5).tickFormat(d => formatNumber(d)));

    //#region Grid
    const xGrid = d3.axisBottom(x)
        .tickSize(-height)
        .ticks(5)
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
        .style("pointer-events", "none") // I disable mouse events to pass through, if not, the tooltip will not work and the line will not be drawn
        .attr("clip-path", "url(#clip)")
    // .attr("transform", `translate(${margin.left}, ${margin.top })`);



    // data[1].isActiveAnimation = true
    var dataFiltered = []
    data.forEach((lineData, index) => {
        var realspeed = 500; // ms
        const pointColor = lineData.color;
        const filteredData = lineData.dataPoints.filter(d => d.y !== 0);

        if (lineData.isDrawLine) {
            const line = d3.line<DataPoint>()
                .x(d => x(d.x))
                .y(d => Math.min(y(d.y), height));

            chartArea.append("path")
                .datum(filteredData)
                .attr("class", "line-interact")
                .attr("fill", "none")
                .attr("stroke", lineData.color)
                .attr("stroke-linejoin", "round")
                .attr("stroke-linecap", "round")
                .attr("stroke-width", 2.5)
                .attr("d", line);
        } else {
            // Hiển thị tất cả điểm tĩnh ban đầu
            chartArea.selectAll(`.point-${index}`)
                .data(filteredData)
                .enter().append("circle")
                .attr("class", `point-${index}`)
                .attr("cx", d => x(d.x))
                .attr("cy", d => y(d.y))
                .attr("r", 4)
                .attr("fill", lineData.color)
                .style("opacity", 1);
        }
    });

    // Add reset button after chart-area
    const buttonContainer = svg.append("g")
        .attr("class", "button-container")
        .raise();

    // Reset button
    const resetGroup = buttonContainer.append("g")
        .attr("class", "reset-button")
        .attr("transform", `translate(${margin.left + width - 35}, ${margin.top - 20})`)
        .style("pointer-events", "all");

    const resetButton = resetGroup.append("rect")
        .attr("width", 30)
        .attr("height", 30)
        .attr("rx", 4)
        .attr("fill", "#f0f0f0")
        .attr("stroke", "#ccc")
        .style("cursor", "pointer");

    // Reset icon using the provided SVG
    const resetIcon = resetGroup.append("g")
        .attr("transform", "translate(5, 5)")
        .style("pointer-events", "none");

    resetIcon.append("svg")
        .attr("width", 20)
        .attr("height", 20)
        .attr("viewBox", "0 0 21 21")
        .append("g")
        .attr("fill", "none")
        .attr("stroke", "#666")
        .attr("stroke-width", 2)
        .attr("stroke-linecap", "round")
        .attr("stroke-linejoin", "round")
        .attr("transform", "matrix(0 1 1 0 2.5 2.5)")
        .html(`
            <path d="m3.98652376 1.07807068c-2.38377179 1.38514556-3.98652376 3.96636605-3.98652376 6.92192932 0 4.418278 3.581722 8 8 8s8-3.581722 8-8-3.581722-8-8-8"/>
            <path d="m4 1v4h-4" transform="matrix(1 0 0 -1 0 6)"/>
        `);

    // Reset click handler
    resetGroup.on("click", () => {
        // Reset all animations
        data.forEach((lineData, index) => {
            if (lineData.isActiveAnimation) {
                // Remove existing points
                chartArea.selectAll(`.point-${index}`).remove();

                // Redraw points with initial animation
                const filteredData = lineData.dataPoints.filter(d => d.y !== 0);
                chartArea.selectAll(`.point-${index}`)
                    .data(filteredData)
                    .enter().append("circle")
                    .attr("class", `point-${index}`)
                    .attr("cx", d => x(d.x))
                    .attr("cy", d => y(d.y))
                    .attr("r", 4)
                    .attr("fill", lineData.color)
                    .style("opacity", 0)
                    .transition()
                    .duration(1000)
                    .style("opacity", 1)
                    .delay((d, i) => i * 500);
            }
        });
    });

    return svg;
}

