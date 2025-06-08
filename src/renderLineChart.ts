import * as d3 from "d3";
import powerbi from "powerbi-visuals-api";
import { VisualFormattingSettingsModel } from "./settings";
import { DataPoint, LineData, defaultColors } from "./interface";
import { valueFormatter } from "powerbi-visuals-utils-formattingutils";

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

    const margin = { top: 30, right: 0, bottom: 60, left: 50 };
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

    // Add % margin for both axes
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
        xDomain = [settings.axisRange.xMin.value - xMargin, settings.axisRange.xMax.value + xMargin];
        yDomain = [settings.axisRange.yMin.value, settings.axisRange.yMax.value];
    }

    const x = d3.scaleLinear()
        .range([0, width])
        .domain(xDomain);

    const y = d3.scaleLinear()
        .range([height, 0])
        .domain(yDomain);

    svg.datum({ x, y })

    // button area
    const buttonArea = svg.append("g")
        .attr("class", "button-area");

    // create chart-Area 
    const chartArea = svg.append("g")
        .attr("class", "chart-area")
        .attr("transform", `translate(${margin.left},${margin.top + 10})`)
        .style("pointer-events", "none"); // I disable mouse events to pass through, if not, the tooltip will not work and the line will not be drawn

    // Add title for X axis
    chartArea.append("text")
        .attr("class", "x-axis-title")
        .attr("text-anchor", "middle")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom - 20)
        .style("font-size", "12px")
        .text(settings.axisLabels.xAxisLabel.value);

    // Add title for Y axis
    chartArea.append("text")
        .attr("class", "y-axis-title")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -margin.left + 15)
        .style("font-size", "12px")
        .text(settings.axisLabels.yAxisLabel.value);

    chartArea.append("defs").append("clipPath")
        .attr("id", "clip")
        .append("rect")
        .attr("x", -5)
        .attr("y", -2)
        .attr("width", width)
        .attr("height", height + 10);

    chartArea.append("rect")
        .attr("x", -5)
        .attr("y", -5)
        .datum(data)
        .attr("width", width)
        .attr("height", height + 10)
        .attr("class", "tooltip-overlay")
        .attr("fill", "none")
        .style("pointer-events", "all");

    const chartContent = chartArea.append("g")
        .attr("class", "chart-content")
        .attr("clip-path", "url(#clip)");

    const xGrid = d3.axisBottom(x)
        .tickSize(-height)
        .ticks(5)
        .tickFormat(() => "");

    chartContent.append("g")
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

    chartContent.append("g")
        .attr("class", "y-grid")
        .call(yGrid)
        .selectAll("path, line")
        .style("stroke", "grey")
        .style("opacity", 0.35)
        .style("stroke-dasharray", "1 4");

    chartContent.selectAll(".y-grid path, .x-grid path").style("stroke", "none");

    // First draw, static chart
    data.forEach((lineData, index) => {
        const pointColor = lineData.color;
        const lastPointColor = lineData.lastPointColor || lineData.color;
        const filteredData = lineData.dataPoints.filter(d => d.y !== 0);
        const totalPoints = filteredData.length;
        const brightPointsCount = settings.animationSettings.brightPointsCount.value;
        if (lineData.isDrawLine) {
            const line = d3.line<DataPoint>()
                .x(d => x(d.x))
                .y(d => Math.min(y(d.y), height));

            chartContent.append("path")
                .datum(filteredData)
                .attr("class", `line-${index}`)
                .attr("fill", "none")
                .attr("stroke", lineData.color)
                .attr("stroke-linejoin", "round")
                .attr("stroke-linecap", "round")
                .attr("stroke-width", 4)
                .attr("d", line);
        } else {
            chartContent.selectAll(`.point-${index}`)
                .data(filteredData)
                .enter()
                .append("circle")
                .attr("class", `point-${index}`)
                .attr("cx", d => x(d.x))
                .attr("cy", d => y(d.y))
                .attr("r", 4)
                .attr("fill", (d, i) => i === filteredData.length - 1 ? (lineData.lastPointColor || lineData.color) : lineData.color)
                .style("opacity", (d, i) => i >= totalPoints - brightPointsCount ? 1 : 0.3)
                .style("fill", (d, i) => i === totalPoints - 1 ? (lineData.lastPointColor || lineData.color) : (i >= totalPoints - brightPointsCount ? lineData.color : lineData.color))
        }
    });

    const xAxis = chartArea.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(3).tickFormat(d => {
            // Find the corresponding dataPoint to get its format
            const dataPoint = data[0].dataPoints[0];
            console.log("DataPoint format:", {
                x: d,
                formatX: dataPoint.formatX,
                dataPoint: dataPoint
            });
            if (dataPoint.formatX) {
                const formatter = valueFormatter.create({ format: dataPoint.formatX });
                return formatter.format(d);
            }
            return `${d}`;
        }));

    const yAxis = chartArea.append("g")
        .attr("class", "y-axis")
        .call(d3.axisLeft(y).ticks(3).tickFormat(d => formatNumber(d)));

    xAxis.select("path").style("stroke", "none");
    xAxis.selectAll("line").style("stroke", "none");
    yAxis.select("path").style("stroke", "none");
    yAxis.selectAll("line").style("stroke", "none");

    //#region Legend
    const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${margin.left - 50}, 10   )`);

    const legendAreaWidth = width; // 100px buffer for button
    const legendItemWidth = legendAreaWidth / data.length;

    const legendItems = legend.selectAll(".legend-item")
        .data(data)
        .enter()
        .append("g")
        .attr("class", "legend-item")
        .attr("transform", (d, i) => `translate(${i * legendItemWidth}, 0)`); // responsive spacing

    // Responsive legend: truncate text with ellipsis if not enough space
    const minTextWidth = 30; // minimum width for text (px)
    const circleWidth = 20; // width for circle and margin
    const maxTextWidth = Math.max(
        minTextWidth,
        Math.floor((legendAreaWidth / data.length) - circleWidth)
    );

    const getResponsiveTitle = (title: string, maxWidth: number): string => {
        const charWidth = 8;
        const maxChars = Math.floor(maxWidth / charWidth);
        if (title.length > maxChars) {
            return title.substring(0, Math.max(0, maxChars - 1)) + "...";
        }
        return title;
    };

    const legendGap = 10;

    let selectedLegendIndex: number | null = null;

    // Append circle 
    legendItems.append("circle")
        .attr("cx", 8)
        .attr("cy", 8)
        .attr("r", 5)
        .attr("fill", d => d.color)
        .style("cursor", "pointer")
        .on("click", function (event, d: LineData) {
            const index = data.indexOf(d);
            if (selectedLegendIndex === index) {
                // unselect
                selectedLegendIndex = null;
                data.forEach((ld, i) => {
                    chartContent.select(`.line-${i}`).style("opacity", "1");
                    chartContent.selectAll(`.point-${i}`).style("opacity", (d: LineData, i) => i >= d.dataPoints.length - settings.animationSettings.brightPointsCount.value ? 1 : 0.3);
                });
            } else {
                // select
                selectedLegendIndex = index;
                data.forEach((ld, i) => {
                    if (i === index) {
                        chartContent.select(`.line-${i}`).style("opacity", "1");
                        chartContent.selectAll(`.point-${i}`).style("opacity", (d: LineData, i) => i >= d.dataPoints.length - settings.animationSettings.brightPointsCount.value ? 1 : 0.3);
                    } else {
                        chartContent.select(`.line-${i}`).style("opacity", "0.3");
                        chartContent.selectAll(`.point-${i}`).style("opacity", "0.3");
                    }
                });
            }
        });

    // Add lastest point legend only if isDrawLine is false
    legendItems.filter(d => !d.isDrawLine)
        .append("circle")
        .attr("cx", 8)
        .attr("cy", 20)
        .attr("r", 5)
        .attr("fill", d => d.lastPointColor || d.color)
        .style("cursor", "pointer")
        .on("click", function (event, d: LineData) {
            const index = data.indexOf(d);
            if (selectedLegendIndex === index) {
                // unselect
                selectedLegendIndex = null;
                data.forEach((ld, i) => {
                    chartContent.select(`.line-${i}`).style("opacity", "1");
                    chartContent.selectAll(`.point-${i}`).style("opacity", (d: LineData, i) => i >= d.dataPoints.length - settings.animationSettings.brightPointsCount.value ? 1 : 0.3);
                });
            } else {
                // select
                selectedLegendIndex = index;
                data.forEach((ld, i) => {
                    if (i === index) {
                        chartContent.select(`.line-${i}`).style("opacity", "1");
                        chartContent.selectAll(`.point-${i}`).style("opacity", (d: LineData, i) => i >= d.dataPoints.length - settings.animationSettings.brightPointsCount.value ? 1 : 0.3);
                    } else {
                        chartContent.select(`.line-${i}`).style("opacity", "0.3");
                        chartContent.selectAll(`.point-${i}`).style("opacity", "0.3");
                    }
                });
            }
        });

    // Append text
    legendItems.append("text")
        .attr("x", 16)
        .attr("y", 12)
        .attr("font-size", "13px")
        .attr("cursor", "pointer")
        .attr("fill", "#999")
        .text(d => getResponsiveTitle(d.name, maxTextWidth))
        .on("click", function (event, d: LineData) {
            const index = data.indexOf(d);
            if (selectedLegendIndex === index) {
                selectedLegendIndex = null;
                data.forEach((ld, i) => {
                    chartContent.select(`.line-${i}`).style("opacity", "1");
                    chartContent.selectAll(`.point-${i}`).style("opacity", (d: LineData, i) => i >= d.dataPoints.length - settings.animationSettings.brightPointsCount.value ? 1 : 0.3);
                });
            } else {
                selectedLegendIndex = index;
                data.forEach((ld, i) => {
                    if (i === index) {
                        chartContent.select(`.line-${i}`).style("opacity", "1");
                        chartContent.selectAll(`.point-${i}`).style("opacity", (d: LineData, i) => i >= d.dataPoints.length - settings.animationSettings.brightPointsCount.value ? 1 : 0.3);
                    } else {
                        chartContent.select(`.line-${i}`).style("opacity", "0.3");
                        chartContent.selectAll(`.point-${i}`).style("opacity", "0.3");
                    }
                });
            }
        });

    // Add lastest point text only if isDrawLine is false
    legendItems.filter(d => !d.isDrawLine)
        .append("text")
        .attr("x", 16)
        .attr("y", 24)
        .attr("font-size", "13px")
        .attr("cursor", "pointer")
        .attr("fill", "#999")
        .text(d => getResponsiveTitle("Lastest " + d.name, maxTextWidth))
        .on("click", function (event, d: LineData) {
            const index = data.indexOf(d);
            if (selectedLegendIndex === index) {
                selectedLegendIndex = null;
                data.forEach((ld, i) => {
                    chartContent.select(`.line-${i}`).style("opacity", "1");
                    chartContent.selectAll(`.point-${i}`).style("opacity", (d: LineData, i) => i >= d.dataPoints.length - settings.animationSettings.brightPointsCount.value ? 1 : 0.3);
                });
            } else {
                selectedLegendIndex = index;
                data.forEach((ld, i) => {
                    if (i === index) {
                        chartContent.select(`.line-${i}`).style("opacity", "1");
                        chartContent.selectAll(`.point-${i}`).style("opacity", (d: LineData, i) => i >= d.dataPoints.length - settings.animationSettings.brightPointsCount.value ? 1 : 0.3);
                    } else {
                        chartContent.select(`.line-${i}`).style("opacity", "0.3");
                        chartContent.selectAll(`.point-${i}`).style("opacity", "0.3");
                    }
                });
            }
        });

    // Adjust legend item positions
    requestAnimationFrame(() => {
        let offset = 0;
        legendItems.each(function (d, i) {
            const textNode = d3.select(this).select("text").node() as SVGTextElement;
            const textWidth = textNode ? textNode.getComputedTextLength() : 60;
            d3.select(this).attr("transform", `translate(${offset}, 0)`);
            offset += 7 * 2 + 6 + textWidth + legendGap;
        });
    });
    //#endregion

    // Reset button
    const resetGroup = buttonArea.append("g")
        .attr("class", "reset-button")
        .attr("transform", `translate(${margin.left + width - 35}, 10)`)
        .style("pointer-events", "all");

    const resetButton = resetGroup.append("rect")
        .attr("width", 22)
        .attr("height", 22)
        .attr("rx", 4)
        .attr("fill", "#f0f0f0")
        .attr("stroke", "#ccc")
        .style("cursor", "pointer");

    // Reset icon using the provided SVG
    const resetIcon = resetGroup.append("g")
        .attr("transform", "translate(4, 4)")
        .style("pointer-events", "none");

    resetIcon.append("svg")
        .attr("width", 14)
        .attr("height", 14)
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
                // Remove existing elements
                chartContent.selectAll(`.point-${index}, .line-${index}`).remove();

                const filteredData = lineData.dataPoints.filter(d => d.y !== 0);
                const totalPoints = filteredData.length;
                const realspeed = settings.animationSettings.animationSpeed.value;
                const brightPointsCount = settings.animationSettings.brightPointsCount.value;

                if (lineData.isDrawLine) {
                    // Line animation
                    const line = d3.line<DataPoint>()
                        .x(d => x(d.x))
                        .y(d => Math.min(y(d.y), height));

                    // Create segments between points
                    for (let i = 0; i < filteredData.length - 1; i++) {
                        const segment = [filteredData[i], filteredData[i + 1]];
                        const path = chartContent.append("path")
                            .attr("class", `line-${index}`)
                            .attr("fill", "none")
                            .attr("stroke-linejoin", "round")
                            .attr("stroke-linecap", "round")
                            .attr("stroke-width", 4)
                            .attr("d", line(segment))
                            .attr("stroke-dasharray", function () {
                                return this.getTotalLength();
                            })
                            .attr("stroke-dashoffset", function () {
                                return this.getTotalLength();
                            });

                        // Animate each segment
                        path.transition()
                            .duration(realspeed)
                            .delay(i * realspeed)
                            .attr("stroke", lineData.color)
                            .attr("stroke-dashoffset", 0);
                    }

                } else {
                    // Point animation
                    chartContent.selectAll(`.point-${index}`)
                        .data(filteredData)
                        .enter()
                        .append("circle")
                        .attr("class", `point-${index}`)
                        .attr("cx", d => x(d.x))
                        .attr("cy", d => y(d.y))
                        .attr("r", 4)
                        .attr("fill", (d, i) => i === filteredData.length - 1 ? (lineData.lastPointColor || lineData.color) : lineData.color)
                        .style("opacity", 0)
                        // First transition: fade in
                        .transition()
                        .duration(1000)
                        .style("opacity", 1)
                        .delay((d, i) => i * realspeed)
                        // Second transition: fade out old points
                        .transition()
                        .duration(1000)
                        .style("opacity", (d, i) => i >= totalPoints - brightPointsCount ? 1 : 0.3)
                        .style("fill", (d, i) => i === totalPoints - 1 ? (lineData.lastPointColor || lineData.color) : (i >= totalPoints - brightPointsCount ? lineData.color : lineData.color))
                        .delay(realspeed)
                        // Third transition: maintain state
                        .transition()
                        .duration(1000)
                        .style("opacity", (d, i) => i >= totalPoints - brightPointsCount ? 1 : 0.3)
                        .style("fill", (d, i) => i === totalPoints - 1 ? (lineData.lastPointColor || lineData.color) : (i >= totalPoints - brightPointsCount ? lineData.color : lineData.color))
                        .delay(realspeed)

                }
            }
        });
    });

    return svg;
}

