/*
*  Power BI Visual CLI
*
*  Copyright (c) Microsoft Corporation
*  All rights reserved.
*  MIT License
*
*  Permission is hereby granted, free of charge, to any person obtaining a copy
*  of this software and associated documentation files (the ""Software""), to deal
*  in the Software without restriction, including without limitation the rights
*  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
*  copies of the Software, and to permit persons to whom the Software is
*  furnished to do so, subject to the following conditions:
*
*  The above copyright notice and this permission notice shall be included in
*  all copies or substantial portions of the Software.
*
*  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
*  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
*  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
*  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
*  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
*  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
*  THE SOFTWARE.
*/
"use strict";

import powerbi from "powerbi-visuals-api";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import "./../style/visual.less";
import { createTooltipServiceWrapper, ITooltipServiceWrapper, TooltipEnabledDataPoint } from "powerbi-visuals-utils-tooltiputils";
import { pointer } from "d3";
import { scaleBand, scaleLinear, ScaleLinear, ScaleBand } from "d3-scale";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import FormattingModel = powerbi.visuals.FormattingModel;
import { VisualFormattingSettingsModel } from "./settings";
import * as d3 from "d3";
import { DataProcesser } from "./dataProcesser";
type Selection<T extends d3.BaseType> = d3.Selection<T, any, any, any>;
import { renderLineChart } from "./renderLineChart";
import { DataPoint, LineData, defaultColors } from "./interface"
import {
    BaseType,
    select as d3Select,
    Selection as d3Selection
} from "d3-selection";
export class Visual implements IVisual {
    private host: IVisualHost
    private target: HTMLElement;
    private viewport: powerbi.IViewport;
    private data: DataProcesser;
    private formattingSettings: VisualFormattingSettingsModel;
    private formattingSettingsService: FormattingSettingsService;
    private lineDataPoints: LineData[];
    private pointData: DataPoint[];
    private svg: Selection<SVGSVGElement>;
    private tooltipServiceWrapper: ITooltipServiceWrapper;
    private number: number;
    constructor(options: VisualConstructorOptions) {
        console.log('Visual constructor', options);
        this.formattingSettingsService = new FormattingSettingsService();
        this.target = options.element;
        this.host = options.host;
        this.tooltipServiceWrapper = createTooltipServiceWrapper(this.host.tooltipService, options.element);
        this.svg = d3Select(this.target)
            .append("svg")
            .classed("linechart", true);

        this.number = 0;

    }

    public update(options: VisualUpdateOptions) {
        this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(VisualFormattingSettingsModel, options.dataViews);

        this.data = new DataProcesser(options, this.host);
        this.lineDataPoints = this.data.processData();
        this.viewport = options.viewport

        console.log("dataUse", this.lineDataPoints)
        this.svg
            .attr("width", this.viewport.width)
            .attr("height", this.viewport.height);

        this.svg = renderLineChart(this.lineDataPoints, this.viewport, this.svg, this.formattingSettings);
        this.number++;
        // this.tooltipServiceWrapper.addTooltip(this.svg.selectAll("rect.tooltip-overlay"),
        //     (dataTooltip: TooltipEnabledDataPoint) => getTooltipData(dataTooltip),
        //     () => null
        // );
        this.mouseEventTooltip(this.svg, this.lineDataPoints, this.tooltipServiceWrapper);


    }
    public mouseEventTooltip(svg: any, data: LineData[], tooltipServiceWrapper: ITooltipServiceWrapper) {
        svg.selectAll("rect.tooltip-overlay").on("mousemove", function (event) {
            const scalesX = svg._groups[0][0].__data__.x;
            const scalesY = svg._groups[0][0].__data__.y;
            if (!scalesX) return;
            svg.selectAll(".vertical-line").remove();
            svg.selectAll(".highlight-point").remove();

            const xScale = scalesX;
            const yScale = scalesY;

            let [mouseX, mouseY] = d3.pointer(event);
            let mouseXValue = xScale.invert(mouseX);

            let closestPoint: { DataPoint: DataPoint, key } | null = null;
            let minDistance = Infinity;

            data.forEach(lineData => {
                lineData.dataPoints.forEach(point => {
                    let distance = Math.abs(point.x - mouseXValue);
                    if (distance < minDistance) {
                        minDistance = distance;
                        closestPoint = {
                            key: lineData.name,
                            DataPoint: point
                        };
                    }
                });
            });
            const cx = xScale(closestPoint.DataPoint.x);
            const cy = yScale(closestPoint.DataPoint.y);
            svg.selectAll("g.chart-area").append("line")
                .attr("class", "vertical-line")
                .attr("x1", cx)
                .attr("x2", cx)
                .attr("y1", 0)
                .attr("y2", 300)
                .attr("stroke", "#000000")
                .attr("stroke-width", 1)
                .style("opacity", 1);

            svg.selectAll("g.chart-area").append("circle")
                .attr("class", "highlight-point")
                .attr("cx", cx)
                .attr("cy", cy)
                .attr("r", 5)
                .attr("fill", "blue")
                .attr("stroke-width", 2)
                .style("opacity", 1);

            // console.log("tooltip", getTooltipData(closestPoint, svg))

            tooltipServiceWrapper.addTooltip(svg.selectAll("rect.tooltip-overlay"),
                () => getTooltipData(closestPoint, svg),
                () => closestPoint.DataPoint.selectionId,
                true,
                // () => null
            );

        })
            .on("mouseout", function () {
                svg.selectAll(".vertical-line").style("opacity", 0);
                svg.selectAll(".highlight-point").style("opacity", 0);
            });

    }


    /**
     * Returns properties pane formatting model content hierarchies, properties and latest formatting values, Then populate properties pane.
     * This method is called once every time we open properties pane or when the user edit any format property. 
     */
    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }

}
function getTooltipData(closestPoint: any, svg): powerbi.extensibility.VisualTooltipDataItem[] {

    console.log("value tooltip", closestPoint.DataPoint.x)
    return [{
        displayName: closestPoint.key,
        value: `${closestPoint.DataPoint.y}`,
        color: "red",
        header: `${closestPoint.DataPoint.x}`
    }]

}