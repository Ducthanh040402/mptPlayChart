import powerbi from "powerbi-visuals-api";
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import { createTooltipServiceWrapper, ITooltipServiceWrapper, TooltipEnabledDataPoint } from "powerbi-visuals-utils-tooltiputils";
import { pointer } from "d3";
import { scaleBand, scaleLinear, ScaleLinear, ScaleBand } from "d3-scale";
import * as d3 from "d3";
import { DataProcesser } from "./dataProcesser";
import { DataPoint, LineData, defaultColors } from "./interface"
import { renderLineChart } from "./renderLineChart";
import { VisualFormattingSettingsModel } from "./settings";
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import { valueFormatter } from "powerbi-visuals-utils-formattingutils";

type Selection<T extends d3.BaseType> = d3.Selection<T, any, any, any>;

export class MouseEventChart {
    private options: VisualUpdateOptions;
    private host: powerbi.extensibility.visual.IVisualHost;
    private svg: d3.Selection<SVGSVGElement, any, any, any>;
    private tooltipServiceWrapper: ITooltipServiceWrapper;

    constructor(options: VisualUpdateOptions, host: powerbi.extensibility.visual.IVisualHost) {
        this.options = options;
        this.host = host;
    }
    public getTooltipData(closestPoint: any): powerbi.extensibility.VisualTooltipDataItem[] {
        var listPoint = [];
        const xFormatter = closestPoint[0].DataPoint.formatX ?
            valueFormatter.create({ format: closestPoint[0].DataPoint.formatX }) : null;

        listPoint.push({
            displayName: `${this.options.dataViews[0].categorical.categories[0].source.displayName}`,
            value: xFormatter ? xFormatter.format(closestPoint[0].DataPoint.x) : `${closestPoint[0].DataPoint.x}`,
            color: closestPoint[0].color,
            header: `${closestPoint[0].DataPoint.time}`
        })
        closestPoint.forEach(point => {
            const yFormatter = point.DataPoint.formatY ?
                valueFormatter.create({ format: point.DataPoint.formatY }) : null;

            listPoint.push({
                displayName: point.key,
                value: yFormatter ? yFormatter.format(point.DataPoint.y) : `${point.DataPoint.y}`,
                color: point.color,
                header: `${point.DataPoint.time}`
            });
        });
        return listPoint;
    }

    public mouseEventTooltip(svg: any, data: LineData[], tooltipServiceWrapper: ITooltipServiceWrapper) {
        const self = this;
        svg.select("rect.tooltip-overlay").on("mousemove", function (event) {
            const scalesX = svg._groups[0][0].__data__.x;
            const scalesY = svg._groups[0][0].__data__.y;
            if (!scalesX) return;
            svg.selectAll(".vertical-line").remove();
            svg.selectAll(".highlight-point").remove();

            const xScale = scalesX;
            const yScale = scalesY;

            const tooltipRect = svg.select("rect.tooltip-overlay");
            const rectHeight = tooltipRect.node()?.getBBox().height || 500;

            let [mouseX, mouseY] = d3.pointer(event);
            let mouseXValue = xScale.invert(mouseX);

            // let closestPoint: { DataPoint: DataPoint, key, color } | null = null;
            let minDistance = Infinity;
            let closestPoints = [];

            data.forEach(lineData => {
                lineData.dataPoints.forEach(point => {
                    let distance = Math.abs(point.x - mouseXValue);
                    if (distance < minDistance) {
                        minDistance = distance;
                    }
                });
            });

            data.forEach(lineData => {
                lineData.dataPoints.forEach(point => {
                    let distance = Math.abs(point.x - mouseXValue);
                    if (distance === minDistance) {
                        closestPoints.push({
                            key: lineData.name,
                            DataPoint: point,
                            color: lineData.color
                        });
                    }
                });
            });

            console.log("closestPoint", closestPoints)
            if (closestPoints[0] !== null) {
                // console.log("data", closestPoint)
                const cx = xScale(closestPoints[0].DataPoint.x);
                const cy = yScale(closestPoints[0].DataPoint.y);
                svg.selectAll("g.chart-area").append("line")
                    .attr("class", "vertical-line")
                    .attr("x1", cx)
                    .attr("x2", cx)
                    .attr("y1", 0)
                    .attr("y2", rectHeight - 6)
                    .attr("stroke", "#000000")
                    .attr("stroke-width", 1)
                    .style("opacity", 1);

                svg.selectAll("g.chart-area").append("circle")
                    .attr("class", "highlight-point")
                    .attr("cx", cx)
                    .attr("cy", cy)
                    .attr("r", 5)
                    .attr("fill", d => {
                        const line = data.find(l => l.name === closestPoints[0].key);
                        return isLastPoint(line, closestPoints[0].DataPoint)
                            ? (line.lastPointColor || line.color)
                            : line.color;
                    })
                    .attr("stroke-width", 2)
                    .style("opacity", 1);

                tooltipServiceWrapper.addTooltip(svg.select("rect.tooltip-overlay"),
                    () => self.getTooltipData(closestPoints),
                    () => null,
                    true

                );
            }
        })
            .on("mouseout", function () {
                svg.selectAll(".vertical-line").style("opacity", 0);
                svg.selectAll(".highlight-point").style("opacity", 0);
            });

    }

    public mouseEventSelection(svg: any, data: LineData[], selectionManager: ISelectionManager) {
        const self = this;
        self.handleClickChart(svg, data, selectionManager);
        self.handleClickUnselect(svg, data, selectionManager);

        return;
    }

    private handleClickChart(svg: any, data: LineData[], selectionManager: ISelectionManager) {
        const self = this;
        const lineChartRegion = svg.select("rect.tooltip-overlay");

        lineChartRegion.on("click", (event: MouseEvent) => {
            if (this.host.hostCapabilities.allowInteractions) {
                const isCtrlPressed = event.ctrlKey || event.metaKey;
                console.log(isCtrlPressed)
                const selectedData = self.getDataNearPointClick(svg, event, data);
                if (!selectedData || !selectedData.DataPoint) return;

                const selectionId = selectedData.DataPoint.selectionId;

                selectionManager.select(selectionId, isCtrlPressed)
                    .then(() => {
                        console.log("Selection updated");
                    })
                    .catch(error => console.error("Selection error", error));

                event.stopPropagation();
            }
        });
    }

    private handleClickUnselect(svg: any, data: LineData[], selectionManager: ISelectionManager) {
        svg.on("click", () => {
            if (this.host.hostCapabilities.allowInteractions) {
                selectionManager
                    .clear()
                    .then(() => {
                        console.log("unselected all");
                    });
            }
        });
    }

    private getDataNearPointClick(svg: any, event: Event, linedata: LineData[]) {
        const scaleX = svg._groups[0][0].__data__.x;
        const scaleY = svg._groups[0][0].__data__.y;
        let [mouseX, mouseY] = d3.pointer(event);
        let mouseXValue = scaleX.invert(mouseX);
        let closestPoint: {
            DataPoint: DataPoint,
            key,
            color
        } | null = null;
        let minDistance = Infinity;
        linedata.forEach(line => {
            line.dataPoints.forEach(point => {
                let distance = Math.abs(point.x - mouseXValue);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestPoint = {
                        key: line.name,
                        DataPoint: point,
                        color: line.color
                    };
                };
            });
        });
        return closestPoint
    }

}

const isLastPoint = (lineData, point) => {
    const filtered = lineData.dataPoints.filter(d => d.y !== null && d.y !== undefined);
    return filtered.length > 0 && point.x === filtered[filtered.length - 1].x && point.y === filtered[filtered.length - 1].y;
};
