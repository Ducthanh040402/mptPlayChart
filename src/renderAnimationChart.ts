import * as d3 from 'd3';
import { LineData, DataPoint, SettingsPanel } from './interface';

export class Animation {
    private firstDraw: boolean = true;
    private svg: any;
    private lineDataPoints: LineData[];

    constructor(svg: any, lineDataPoints: LineData[]) {
        this.svg = svg;
        this.lineDataPoints = lineDataPoints;
        this.firstDraw = true;

    }
    public renderAnimationChart(indexAnimation: number) {
        /**
         * This function will render the animation chart
         */
        const self = this;
        var realspeed = 1000; // ms

        const lineDataPoints = this.lineDataPoints;
        const svg = this.svg;
        var chartArea = svg.selectAll(`circle.point-${indexAnimation}`).remove();
        const scalesX = svg._groups[0][0].__data__.x;
        const scalesY = svg._groups[0][0].__data__.y;
        const data = lineDataPoints[indexAnimation].dataPoints;
        debugger

        chartArea.selectAll(`circle.point-${indexAnimation}`)
            .data(data)
            .enter()
            .append("circle")
            .attr("class", `point-${indexAnimation}`)
            .attr("cx", d => scalesX(d.x))
            .attr("cy", d => scalesY(d.y))
            .attr("r", 4)
            .attr("fill", lineDataPoints[indexAnimation].color)
            .style("fill", 4)
            .style("opacity", 0)
            .transition()
            .duration(1000)
            .style("opacity", 1)
        // .delay((d, i) => i * realspeed)
        // .transition()
        // .duration(1000)
        // .style("opacity", (d, i) => (i >= data.length - 1 ? 1 : 0.1))
        // .style("fill", (d, i) =>
        //     i >= data.length - 1
        //         ? lineDataPoints[indexAnimation].color
        //         : "grey"
        // )
        // .delay((d, i) => realspeed)
        // .transition()
        // .duration(1000)
        // .style("opacity", (d, i) => (i >= data.length - 10 ? 1 : 0.1))
        // .style("fill", (d, i) =>
        //     i >= data.length - 10
        //         ? lineDataPoints[indexAnimation].color
        //         : "grey"
        // )
        // .delay((d, i) => realspeed)
        // .transition()
        // .duration((data.length - 1) * realspeed)
        // .style("opacity", 1)
        // .style("fill", (d, i) =>
        //     i >= data.length - 10
        //         ? lineDataPoints[indexAnimation].color
        //         : "grey"
        // );

    }
}

