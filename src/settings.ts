/*
 *  Power BI Visualizations
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved.
 *  MIT License
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the ""Software""), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *
 *  The above copyright notice and this permission notice shall be included in
 *  all copies or substantial portions of the Software.
 *
 *  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 */

"use strict";
import powerbiVisualsApi from "powerbi-visuals-api";

import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import Card = formattingSettings.SimpleCard;

// import FormattingSettingsCard = formattingSettings.Card;
import FormattingSettingsSlice = formattingSettings.Slice;
import ColorPicker = formattingSettings.ColorPicker;
import ToggleSwitch = formattingSettings.ToggleSwitch;
import NumUpDown = formattingSettings.NumUpDown;

import FormattingSettingsModel = formattingSettings.Model;
import { Slice } from "powerbi-visuals-utils-formattingmodel/lib/FormattingSettingsComponents";
import { LineData } from "./interface";

/**
 * Data Point Formatting Card
 */


class ColorSettingCard extends Card {
    name: string = "colorSelector";
    displayName: string = "Data Colors";
    slices: Slice[] = [];
}
class LineOrPointSettingCard extends Card {
    name: string = "linePointSelector";
    displayName: string = "Line Or Points";
    slices: Slice[] = [];
}
class ActiveAnimation extends Card {
    name: string = "activeAnimation";
    displayName?: string = "Active Animation";
    slices: Slice[] = [];

}

class AxisRangeCard extends Card {
    name: string = "axisRange";
    displayName: string = "Axis Range";

    autoRange = new ToggleSwitch({
        name: "autoRange",
        displayName: "Auto Range",
        value: true
    });

    xMin = new NumUpDown({
        name: "xMin",
        displayName: "X Min (Auto)",
        value: 0
    });

    xMax = new NumUpDown({
        name: "xMax",
        displayName: "X Max (Auto)",
        value: 0
    });

    yMin = new NumUpDown({
        name: "yMin",
        displayName: "Y Min (Auto)",
        value: 0
    });

    yMax = new NumUpDown({
        name: "yMax",
        displayName: "Y Max (Auto)",
        value: 0
    });

    slices: Slice[] = [this.autoRange, this.xMin, this.xMax, this.yMin, this.yMax];

    updateDefaultRange(xMin: number, xMax: number, yMin: number, yMax: number) {
        if (this.xMin.value === 0) {
            this.xMin.value = xMin;
            this.xMin.displayName = "X Min (Auto)";
        } else {
            this.xMin.displayName = "X Min";
        }

        if (this.xMax.value === 0) {
            this.xMax.value = xMax;
            this.xMax.displayName = "X Max (Auto)";
        } else {
            this.xMax.displayName = "X Max";
        }

        if (this.yMin.value === 0) {
            this.yMin.value = yMin;
            this.yMin.displayName = "Y Min (Auto)";
        } else {
            this.yMin.displayName = "Y Min";
        }

        if (this.yMax.value === 0) {
            this.yMax.value = yMax;
            this.yMax.displayName = "Y Max (Auto)";
        } else {
            this.yMax.displayName = "Y Max";
        }
    }
}

class AxisLabelsCard extends Card {
    name: string = "axisLabels";
    displayName: string = "Axis Labels";

    xAxisLabel = new formattingSettings.TextInput({
        name: "xAxisLabel",
        displayName: "X Axis Label",
        value: "X Axis",
        placeholder: "Enter X axis label"
    });

    yAxisLabel = new formattingSettings.TextInput({
        name: "yAxisLabel",
        displayName: "Y Axis Label",
        value: "Y Axis",
        placeholder: "Enter Y axis label"
    });

    slices: Slice[] = [this.xAxisLabel, this.yAxisLabel];
}

/**
* visual settings model class
*
*/
export class VisualFormattingSettingsModel extends FormattingSettingsModel {
    // Create formatting settings model formatting cards
    // dataPointCard = new DataPointCardSettings();
    colorCard = new ColorSettingCard();
    linePointCard = new LineOrPointSettingCard()
    animation = new ActiveAnimation();
    axisRange = new AxisRangeCard();
    axisLabels = new AxisLabelsCard();
    cards = [this.colorCard, this.linePointCard, this.animation, this.axisRange, this.axisLabels];

    pushColorSetting(dataPoints: LineData[]) {
        const slices: Slice[] = this.colorCard.slices;
        if (dataPoints) {
            dataPoints.forEach((dataPoint, index) => {
                const selector = dataPoint.selectionId.getSelector();
                console.log(`Pushing color for series ${dataPoint.name}:`, {
                    selector,
                    color: dataPoint.color
                });
                slices.push(new ColorPicker({
                    name: "fillColor",
                    displayName: dataPoint.name,
                    value: { value: dataPoint.color },
                    selector: selector
                }));
            });
        }
    }
    pushLinePointSetting(dataPoints: LineData[]) {
        const slices: Slice[] = this.linePointCard.slices;
        if (dataPoints) {
            dataPoints.forEach((dataPoint) => {
                slices.push(new ToggleSwitch({
                    name: "toggleLinePoint",
                    displayName: dataPoint.name,
                    value: dataPoint.isDrawLine,
                    // selector: dataPoint.dataPoints[0].selectionId.getSelector()
                    selector: dataPoint.selectionId.getSelector()
                }));
            });
        }
    }
    pushActiveAnimation(dataPoints: LineData[]) {
        const slices: Slice[] = this.animation.slices;
        if (dataPoints) {
            dataPoints.forEach((dataPoint) => {
                slices.push(new ToggleSwitch({
                    name: "line",
                    displayName: dataPoint.name,
                    value: dataPoint.isActiveAnimation,
                    selector: dataPoint.selectionId.getSelector()

                }));
            });
        }
    }
}
