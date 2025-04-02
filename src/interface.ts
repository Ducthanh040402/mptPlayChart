export interface DataPoint {
    x: number;
    y: number;
    selectionId: powerbi.visuals.ISelectionId;
    color: string;
}
export interface SettingsPanel {
    color: string;
    styleLine: string;
    isDrawLine: boolean;
    isDrawPoint: boolean;
    isDrawGrid: boolean;
    isDrawAxis: boolean;
    isDrawLabel: boolean;
    isDrawLegend: boolean;

}

export interface LineData {
    name: string;
    color: string;
    dataPoints: DataPoint[];
    isDrawLine: boolean;
    isActiveAnimation: boolean;
    format: string;

}

export interface Tooltip {
    lineData: LineData[];
    pointData: DataPoint[];
}
export const defaultColors = [
    "#ff0000",
    "#00ff00",
    "#0000ff",
    "#ff9900",
    "#9900ff",
    "#00ffff",
    "#ff00ff",
    "#999999"
];