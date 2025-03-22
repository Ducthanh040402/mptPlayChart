import * as d3 from 'd3';
import { LineData, DataPoint, SettingsPanel } from './interface';

export class Animation {
    private firstDraw: boolean = true;
    private svg: d3.Selection<SVGSVGElement, any, any, any>;
    private lineDataPoints: LineData[];

    constructor(svg: d3.Selection<SVGSVGElement, any, any, any>, lineDataPoints: LineData[]) {
        this.svg = svg;
        this.lineDataPoints = lineDataPoints;
        this.firstDraw = true;

    }
    public renderAnimationChart() {
        /**
         * This function will render the animation chart
         */
    }
}

