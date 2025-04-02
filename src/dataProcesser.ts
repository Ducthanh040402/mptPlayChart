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
type DataViewObjects = { [name: string]: any };


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
        var xValues = categorical.categories[0].values;
        var yValues = categorical.values.map(element => element.values);
        var seriesNames = categorical.values.map(element => element.source.displayName);

        var alldata: LineData[] = yValues.map((ySeries, index) => ({
            name: seriesNames[index],
            color: getColumnColorByIndex(categorical.categories[0], dataView.metadata, index, colorPalette),
            isDrawLine: getBoolenValueToDrawLineOrPoint(dataView.metadata, index),
            isActiveAnimation: activeAnimation(dataView.metadata, index),
            format: ySeries.objects ? <string>ySeries.objects[index].general.formatString : null,

            dataPoints: xValues.map((x, i) => ({
                x: +x,
                y: +ySeries[i],
                selectionId: this.host.createSelectionIdBuilder().withCategory(categorical.categories[0], i).createSelectionId(),
            })).sort((a, b) => a.x - b.x).filter(d => d.y !== 0) //sort the value index        
        }));

        this.data = alldata;
        console.log(this.data)
        return this.data;
    }

}

function getColumnColorByIndex(
    category: DataViewCategoryColumn,
    metadata: DataViewCategoryColumn,
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
        propertyName: `fillColor${index}`
    };
    let colorFromObjects: Fill;
    if (metadata.objects) {
        const objects: DataViewObjects = metadata.objects;
        colorFromObjects = dataViewObjects.getValue(objects, prop, colorFromObjects);
    }
    return colorFromObjects?.solid.color ?? defaultColor.solid.color;
}

function getBoolenValueToDrawLineOrPoint(
    metadata: DataViewCategoryColumn,
    index: number,
): boolean {

    const prop: DataViewObjectPropertyIdentifier = {
        objectName: "linePointSelector",
        propertyName: `toggleLinePoint${index}`
    };
    let isDrawLine: boolean = true;
    if (metadata.objects) {
        const object: DataViewObjects = metadata.objects;
        isDrawLine = dataViewObjects.getValue(object, prop, isDrawLine);
    }

    return isDrawLine;
}

function activeAnimation(
    metadata: DataViewCategoryColumn,
    index: number,
): boolean {
    const prop: DataViewObjectPropertyIdentifier = {
        objectName: "activeAnimation",
        propertyName: `line${index}`
    };
    let isActiveAnimation: boolean = false;
    if (metadata.objects) {
        const object: DataViewObjects = metadata.objects;
        isActiveAnimation = dataViewObjects.getValue(object, prop, isActiveAnimation);
    }
    return isActiveAnimation;
}