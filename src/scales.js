import {quantile} from "d3-array";
import {ScaleDiverging, ScaleLinear, ScalePow, ScaleLog, ScaleSymlog} from "./scales/quantitative.js";
import {ScaleTime, ScaleUtc} from "./scales/temporal.js";
import {ScalePoint, ScaleBand} from "./scales/ordinal.js";

export function Scales(encodings, options = {}) {
  const keys = new Set([...Object.keys(options), ...encodings.keys()]);
  const scales = {};
  for (const key of keys) scales[key] = Scale(key, encodings.get(key), options[key]);
  return scales
}

// Mutates scale.range!
export function autoScaleRange(scales, dimensions) {
  if (scales.x) {
    const {width, marginLeft, marginRight} = dimensions;
    const {range = [marginLeft, width - marginRight]} = scales.x;
    scales.x.scale.range(range);
  }
  if (scales.y) {
    const {height, marginTop, marginBottom} = dimensions;
    const {range = [height - marginBottom, marginTop]} = scales.y;
    scales.y.scale.range(range);
  }
  if (scales.r) {
    const {range = [0, 3]} = scales.r;
    scales.r.scale.range(range);
  }
}

function Scale(key, encodings, options = {}) {
  if (key === "r") {
    const {domain = inferRadiusDomain(encodings)} = options;
    options = {type: "sqrt", domain, ...options};
  }
  switch (inferScaleType(encodings, options)) {
    case "diverging": return ScaleDiverging(key, encodings, options); // TODO color-specific?
    case "linear": return ScaleLinear(key, encodings, options);
    case "sqrt": return ScalePow(key, encodings, {...options, exponent: 0.5});
    case "pow": return ScalePow(key, encodings, options);
    case "log": return ScaleLog(key, encodings, options);
    case "symlog": return ScaleSymlog(key, encodings, options);
    case "utc": return ScaleUtc(key, encodings, options);
    case "time": return ScaleTime(key, encodings, options);
    case "point": return ScalePoint(key, encodings, options);
    case "band": return ScaleBand(key, encodings, options);
    default: throw new Error(`unknown scale type: ${options.type}`);
  }
}

function inferScaleType(encodings, {type, domain}) {
  if (type !== undefined) {
    for (const {type: t} of encodings) {
      if (t !== undefined && type !== t) {
        throw new Error(`scale incompatible with channel: ${type} !== ${t}`);
      }
    }
    return type;
  }
  for (const {type} of encodings) {
    if (type !== undefined) return type;
  }
  if (domain !== undefined) {
    if (domain.length > 2) return "point";
    type = inferScaleTypeFromValues(domain);
    if (type !== undefined) return type;
  }
  for (const {value} of encodings) {
    type = inferScaleTypeFromValues(value);
    if (type !== undefined) return type;
  }
  return "linear";
}

function inferScaleTypeFromValues(values) {
  for (const value of values) {
    if (value == null) continue;
    if (typeof value === "string") return "point";
    else if (typeof value === "boolean") return "point";
    else if (value instanceof Date) return "utc";
    return "linear";
  }
}

function inferRadiusDomain(encodings) {
  return [0, quantile(encodings, 0.5, ({value}) => quantile(value, 0.25))];
}