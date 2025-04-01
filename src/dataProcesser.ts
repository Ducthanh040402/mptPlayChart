import powerbi from "powerbi-visuals-api";
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import { format, range } from "d3";
import { DataPoint, LineData, defaultColors } from "./interface"
import DataViewCategoryColumn = powerbi.DataViewCategoryColumn;
import Fill = powerbi.Fill;
import DataViewObjectPropertyIdentifier = powerbi.DataViewObjectPropertyIdentifier;
import ISandboxExtendedColorPalette = powerbi.extensibility.ISandboxExtendedColorPalette;
import { dataViewObjects } from "powerbi-visuals-utils-dataviewutils";


export class DataProcesser {
    private options;
    private host: IVisualHost;
    private data: LineData[]
    constructor(options: VisualUpdateOptions, host: IVisualHost) {
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
        const colorPalette: ISandboxExtendedColorPalette = this.host.colorPalette;
        const dataViewOB = dataViewObjects;
        const color: string = getColumnColorByIndex(categorical.categories[0], 0, colorPalette)
        var xValues = categorical.categories[0].values;
        var yValues = categorical.values.map(element => element.values);
        var seriesNames = categorical.values.map(element => element.source.displayName);

        var alldata: LineData[] = yValues.map((ySeries, index) => ({
            name: seriesNames[index],
            color: getColumnColorByIndex(categorical.categories[0], index, colorPalette),
            isDrawLine: true,
            isActiveAnimation: false,
            format: ySeries.objects ? <string>ySeries.objects[index].general.formatString : null,

            dataPoints: xValues.map((x, i) => ({
                x: +x,
                y: +ySeries[i],
                selectionId: this.host.createSelectionIdBuilder().withCategory(categorical.categories[0], i).createSelectionId(),
            })).sort((a, b) => a.x - b.x).filter(d => d.y !== 0) // sort by x value if not already sorted           
        }));

        this.data = alldata;
        console.log(this.data)
        return this.data;
    }

}

function getColumnColorByIndex(
    category: DataViewCategoryColumn,
    index: number,
    colorPalette: ISandboxExtendedColorPalette,
): string {
    if (colorPalette.isHighContrast) {
        return colorPalette.background.value;
    }

    const defaultColor: Fill = {
        solid: {
            color: colorPalette.getColor(`${category.values[index]}`).value,
        }
    };
    const prop: DataViewObjectPropertyIdentifier = {
        objectName: "colorSelector",
        propertyName: "fillColor"
    };
    let colorFromObjects: Fill;
    if (category.objects?.[index]) {
        colorFromObjects = dataViewObjects.getValue(category?.objects[index], prop);
    }

    return colorFromObjects?.solid.color ?? defaultColor.solid.color;
}