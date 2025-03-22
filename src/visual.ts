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
import { MouseEventChart } from "./mouseEvent";
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
    private mouseEvent: MouseEventChart;

    constructor(options: VisualConstructorOptions) {
        console.log('Visual constructor', options);
        this.formattingSettingsService = new FormattingSettingsService();
        this.target = options.element;
        this.host = options.host;
        this.tooltipServiceWrapper = createTooltipServiceWrapper(this.host.tooltipService, options.element);
        this.svg = d3Select(this.target)
            .append("svg")
            .classed("linechart", true);

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
        this.mouseEvent = new MouseEventChart(options, this.host);

        this.svg = renderLineChart(this.lineDataPoints, this.viewport, this.svg, this.formattingSettings);
        this.mouseEvent.mouseEventTooltip(this.svg, this.lineDataPoints, this.tooltipServiceWrapper);
        this.mouseEvent.mouseEventSelection(this.svg, this.lineDataPoints);
        
    }



    /**
     * Returns properties pane formatting model content hierarchies, properties and latest formatting values, Then populate properties pane.
     * This method is called once every time we open properties pane or when the user edit any format property. 
     */
    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }

}
