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
import { valueFormatter } from "powerbi-visuals-utils-formattingutils";




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

        var xValues = categorical.categories[0].values;
        var xFormat = categorical.categories[0].source.format || null;
        // var yValues = categorical.values.slice(1).map(element => element.values);
        var yValues = categorical.values.slice(1).map((element, index) => ({
            values: element.values,
            format: element.source.format || null
        }));
        var timeValues = categorical.values[0].values;
        console.log("timeValues", timeValues[0].toString())
        var seriesNames = categorical.values.slice(1).map(element => element.source.displayName);

        var formatData = getFormatData(dataView.metadata)

        var alldata: LineData[] = yValues.map((ySeries, index) => ({
            name: seriesNames[index],
            color: getColumnColorByIndex(categorical.categories[0], dataView.metadata, index + 1, colorPalette),
            isDrawLine: getBoolenValueToDrawLineOrPoint(dataView.metadata, index + 1),
            isActiveAnimation: activeAnimation(dataView.metadata, index + 1),
            format: ySeries.objects ? <string>ySeries.objects[index].general.formatString : null,
            lastPointColor: getLastPointColorByIndex(categorical.categories[0], dataView.metadata, index + 1, colorPalette),
            dataPoints: xValues.map((x, i) => {
                if (ySeries.values[i] == null) return null;

                return {
                    x: +x,
                    y: +ySeries.values[i],
                    formatX: xFormat,
                    formatY: ySeries.format,
                    time: formatToMMDDYYYY_HHMM(timeValues[i].toString()),
                    selectionId: this.host.createSelectionIdBuilder()
                        .withCategory(categorical.categories[0], i)
                        .createSelectionId(),
                };
            }).filter(Boolean),

            selectionId: this.host.createSelectionIdBuilder()
                .withMeasure(categorical.values[index + 1].source.queryName)
                .createSelectionId()
        }));

        this.data = alldata;
        console.log("dataProcesser----", this.data)
        return this.data;
    }

}
function formatToMMDDYYYY_HHMM(isoString) {
    const date = new Date(isoString);
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    console.log("timeZone", timeZone)
    const options = { timeZone };
    const localDate = new Date(date.toLocaleString("en-US", options));

    const mm = String(localDate.getMonth() + 1).padStart(2, '0');
    const dd = String(localDate.getDate()).padStart(2, '0');
    const yyyy = localDate.getFullYear();
    const hh = String(localDate.getHours()).padStart(2, '0');
    const min = String(localDate.getMinutes()).padStart(2, '0');
    const sec = String(localDate.getSeconds()).padStart(2, '0');

    return `${mm}-${dd}-${yyyy} ${hh}:${min}:${sec}`;
}

function getFormatData(metadata: any): any {
    var format_data;
    var list_format_data = []
    metadata.columns.forEach(_data => {
        let format_type = _data.format;
        if (_data.roles.timestamp)
            console.log("time")
        if (format_type) {
            format_data = format_type;
        }
        list_format_data.push({ name: _data.queryName, _format: format_data })
    })
    return list_format_data;
}

function getColumnColorByIndex(
    category: DataViewCategoryColumn,
    metadata: any,
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
    if (metadata.columns[index + 1].objects) {
        const objects = metadata.columns[index + 1].objects as DataViewObjects;
        colorFromObjects = dataViewObjects.getValue<Fill>(objects, prop);
    }

    return colorFromObjects?.solid.color ?? defaultColor.solid.color;
}

function getBoolenValueToDrawLineOrPoint(
    metadata: any,
    index: number,
): boolean {

    const prop: DataViewObjectPropertyIdentifier = {
        objectName: "linePointSelector",
        propertyName: `toggleLinePoint`
    };
    let isDrawLine: boolean = true;
    if (metadata.columns[index + 1].objects) {
        const object: DataViewObjects = metadata.columns[index + 1].objects;
        isDrawLine = dataViewObjects.getValue(object, prop, isDrawLine);
    }

    return isDrawLine;
}

function activeAnimation(
    metadata: any,
    index: number,
): boolean {
    const prop: DataViewObjectPropertyIdentifier = {
        objectName: "activeAnimation",
        propertyName: `line`
    };
    let isActiveAnimation: boolean = false;
    if (metadata.columns[index + 1].objects) {
        const object: DataViewObjects = metadata.columns[index + 1].objects;
        isActiveAnimation = dataViewObjects.getValue(object, prop, isActiveAnimation);
    }
    return isActiveAnimation;
}

function getLastPointColorByIndex(
    category: DataViewCategoryColumn,
    metadata: any,
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
        propertyName: "lastPointColor"
    };

    let colorFromObjects: Fill;
    if (metadata.columns[index + 1].objects) {
        const objects = metadata.columns[index + 1].objects as DataViewObjects;
        colorFromObjects = dataViewObjects.getValue<Fill>(objects, prop);
    }

    return colorFromObjects?.solid.color ?? defaultColor.solid.color;
}