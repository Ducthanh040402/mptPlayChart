import * as d3 from "d3";
import powerbi from "powerbi-visuals-api";
import { VisualFormattingSettingsModel } from "./settings";

import { scaleBand, scaleLinear, ScaleLinear, ScaleBand } from "d3-scale";
import {
    BaseType,
    select as d3Select,
    Selection as d3Selection,
} from "d3-selection";
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
type Selection<T extends d3.BaseType> = d3.Selection<T, any, any, any>;

/**
 * renderLineChart
data:[Array<x:number;y:number] */
function renderLineChart(data: [Array<{ x: number; y: number }>],
    viewport: VisualUpdateOptions, svg: d3.Selection<SVGAElement, unknown, null, undefined>, settings: VisualFormattingSettingsModel) {
        

}