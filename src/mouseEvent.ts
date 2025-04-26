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
        // console.log("value tooltip", closestPoint.DataPoint.x)
        return [{
            displayName: closestPoint.key,
            value: `${closestPoint.DataPoint.y}`,
            color: "red",
            header: `${closestPoint.DataPoint.x}`
        }]

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

            let closestPoint: { DataPoint: DataPoint, key, color } | null = null;
            let minDistance = Infinity;
            data.forEach(lineData => {
                lineData.dataPoints.forEach(point => {
                    let distance = Math.abs(point.x - mouseXValue);
                    if (distance < minDistance) {
                        minDistance = distance;
                        closestPoint = {
                            key: lineData.name,
                            DataPoint: point,
                            color: lineData.color
                        };
                    }
                });
            });
            // console.log("closestPoint", closestPoint)
            if (closestPoint !== null) {
                // console.log("data", closestPoint)
                const cx = xScale(closestPoint.DataPoint.x);
                const cy = yScale(closestPoint.DataPoint.y);
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
                    .attr("fill", closestPoint.color)
                    .attr("stroke-width", 2)
                    .style("opacity", 1);

                tooltipServiceWrapper.addTooltip(svg.select("rect.tooltip-overlay"),
                    () => self.getTooltipData(closestPoint),
                    () => closestPoint.DataPoint.selectionId,
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
