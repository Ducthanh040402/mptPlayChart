import powerbi from "powerbi-visuals-api";
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import { range } from "d3";
import { DataPoint, LineData, defaultColors } from "./interface"


export class DataProcesser {
    private options;
    private host: IVisualHost;    
    private data: LineData[]
    constructor(options: VisualUpdateOptions,host: IVisualHost) {
        this.host = host;
        this.options = options;
    }

    private getColorForSeries(series: any, index: number): string {
        return series?.source?.objects?.["colorSelector"]?.["fill"]?.["solid"]?.["color"]
            || defaultColors[index % defaultColors.length];
    }

    public processData(): LineData[] {
        if (!this.options.dataViews || !this.options.dataViews[0]) {
            return [];
        }
        const dataView = this.options.dataViews[0];
        const categorical = dataView.categorical;

        var xValues = categorical.categories[0].values;
        var yValues = categorical.values.map(element => element.values);
        var seriesNames = categorical.values.map(element => element.source.displayName);

        var alldata: LineData[] = yValues.map((ySeries, index) => ({
                name: seriesNames[index],
                color: this.getColorForSeries(categorical.values[index], index),
                isDrawLine:true,
                dataPoints: xValues.map((x, i) => ({
                    x: +x,
                    y: +ySeries[i],
                    selectionId: this.host.createSelectionIdBuilder().withCategory(categorical.categories[0], i).createSelectionId(),
                })).sort((a, b) => a.x - b.x) // sort by x value if not already sorted           
        }));

        this.data = alldata;
        console.log(this.data)
        return this.data;
    }

}

