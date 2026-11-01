/**
 * Safe unit conversion for length, mass/weight, temperature, time, and digital data.
 */

interface ConversionCategory {
  units: Record<string, number | ((val: number, toBase: boolean) => number)>;
}

const LENGTH_FACTORS: Record<string, number> = {
  m: 1,
  meter: 1,
  meters: 1,
  km: 1000,
  kilometer: 1000,
  cm: 0.01,
  centimeter: 0.01,
  mm: 0.001,
  millimeter: 0.001,
  mi: 1609.344,
  mile: 1609.344,
  miles: 1609.344,
  yd: 0.9144,
  yard: 0.9144,
  ft: 0.3048,
  foot: 0.3048,
  feet: 0.3048,
  in: 0.0254,
  inch: 0.0254,
  inches: 0.0254,
};

const MASS_FACTORS: Record<string, number> = {
  kg: 1,
  kilogram: 1,
  g: 0.001,
  gram: 0.001,
  mg: 0.000001,
  milligram: 0.000001,
  lb: 0.45359237,
  pound: 0.45359237,
  pounds: 0.45359237,
  oz: 0.028349523125,
  ounce: 0.028349523125,
};

const TIME_FACTORS: Record<string, number> = {
  s: 1,
  sec: 1,
  second: 1,
  seconds: 1,
  detik: 1,
  min: 60,
  minute: 60,
  minutes: 60,
  menit: 60,
  h: 3600,
  hour: 3600,
  hours: 3600,
  jam: 3600,
  d: 86400,
  day: 86400,
  days: 86400,
  hari: 86400,
};

const DATA_FACTORS: Record<string, number> = {
  b: 1,
  byte: 1,
  bytes: 1,
  kb: 1024,
  mb: 1024 * 1024,
  gb: 1024 * 1024 * 1024,
  tb: 1024 * 1024 * 1024 * 1024,
};

function normalizeUnit(unit: string): string {
  return unit.trim().toLowerCase();
}

function convertTemperature(value: number, from: string, to: string): number {
  let celsius = value;
  if (from === 'f' || from === 'fahrenheit') {
    celsius = ((value - 32) * 5) / 9;
  } else if (from === 'k' || from === 'kelvin') {
    celsius = value - 273.15;
  }

  if (to === 'f' || to === 'fahrenheit') {
    return (celsius * 9) / 5 + 32;
  }
  if (to === 'k' || to === 'kelvin') {
    return celsius + 273.15;
  }
  return celsius;
}

export function convertUnits(
  value: number,
  fromRaw: string,
  toRaw: string,
): { ok: boolean; result?: number; error?: string } {
  const from = normalizeUnit(fromRaw);
  const to = normalizeUnit(toRaw);

  if (from === to) return { ok: true, result: value };

  // Temperature
  const tempUnits = ['c', 'celsius', 'f', 'fahrenheit', 'k', 'kelvin'];
  if (tempUnits.includes(from) && tempUnits.includes(to)) {
    return { ok: true, result: Math.round(convertTemperature(value, from, to) * 10000) / 10000 };
  }

  // Length
  if (LENGTH_FACTORS[from] && LENGTH_FACTORS[to]) {
    const meters = value * LENGTH_FACTORS[from];
    return { ok: true, result: meters / LENGTH_FACTORS[to] };
  }

  // Mass
  if (MASS_FACTORS[from] && MASS_FACTORS[to]) {
    const kg = value * MASS_FACTORS[from];
    return { ok: true, result: kg / MASS_FACTORS[to] };
  }

  // Time
  if (TIME_FACTORS[from] && TIME_FACTORS[to]) {
    const seconds = value * TIME_FACTORS[from];
    return { ok: true, result: seconds / TIME_FACTORS[to] };
  }

  // Digital data
  if (DATA_FACTORS[from] && DATA_FACTORS[to]) {
    const bytes = value * DATA_FACTORS[from];
    return { ok: true, result: bytes / DATA_FACTORS[to] };
  }

  return {
    ok: false,
    error: `Konversi dari unit '${fromRaw}' ke '${toRaw}' tidak didukung atau kategori tidak cocok.`,
  };
}

