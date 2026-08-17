// Resolved hex values for recharts (SVG fill/stroke needs real hex, not CSS vars).
// Categorical order follows the dataviz skill's validated 8-slot palette —
// fixed order is the CVD-safety mechanism, never reassigned per-series.

export interface ChartColors {
  grid: string;
  axis: string;
  primary: string;
  categorical: string[];
}

const light: ChartColors = {
  grid: "#e2e5ee",
  axis: "#8891a8",
  primary: "#3b5bdb",
  categorical: ["#2a78d6", "#008300", "#e87ba4", "#eda100", "#1baf7a", "#eb6834", "#4a3aa7", "#e34948"],
};

const dark: ChartColors = {
  grid: "#262b38",
  axis: "#7c8399",
  primary: "#5b7cf0",
  categorical: ["#3987e5", "#008300", "#d55181", "#c98500", "#199e70", "#d95926", "#9085e9", "#e66767"],
};

export function getChartColors(isDark: boolean): ChartColors {
  return isDark ? dark : light;
}
