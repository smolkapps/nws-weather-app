import { describe, expect, it } from 'vitest';
import {
  celsiusToFahrenheit,
  degreesToCardinal,
  formatPercent,
  formatTempF,
  kmhToMph,
  metersToMiles,
  pascalsToInHg,
  roundPercent,
} from '../units';

describe('celsiusToFahrenheit', () => {
  it('converts freezing and boiling points', () => {
    expect(celsiusToFahrenheit(0)).toBe(32);
    expect(celsiusToFahrenheit(100)).toBe(212);
  });

  it('rounds to the nearest integer', () => {
    // 26.7C -> 80.06F -> 80
    expect(celsiusToFahrenheit(26.7)).toBe(80);
    // -40 is the cross-over point
    expect(celsiusToFahrenheit(-40)).toBe(-40);
  });

  it('is null-safe', () => {
    expect(celsiusToFahrenheit(null)).toBeNull();
    expect(celsiusToFahrenheit(undefined)).toBeNull();
    expect(celsiusToFahrenheit(NaN)).toBeNull();
  });
});

describe('kmhToMph', () => {
  it('converts a known speed', () => {
    // 12.96 km/h -> 8.05 mph -> 8
    expect(kmhToMph(12.96)).toBe(8);
    expect(kmhToMph(100)).toBe(62);
  });

  it('handles zero and null', () => {
    expect(kmhToMph(0)).toBe(0);
    expect(kmhToMph(null)).toBeNull();
    expect(kmhToMph(undefined)).toBeNull();
  });
});

describe('metersToMiles', () => {
  it('converts visibility', () => {
    expect(metersToMiles(16093)).toBe(10); // ~10 mi
    expect(metersToMiles(null)).toBeNull();
  });
});

describe('pascalsToInHg', () => {
  it('converts standard pressure', () => {
    // 101325 Pa ~ 29.92 inHg
    expect(pascalsToInHg(101325)).toBeCloseTo(29.92, 2);
    expect(pascalsToInHg(null)).toBeNull();
  });
});

describe('degreesToCardinal', () => {
  it('maps the four cardinal points', () => {
    expect(degreesToCardinal(0)).toBe('N');
    expect(degreesToCardinal(90)).toBe('E');
    expect(degreesToCardinal(180)).toBe('S');
    expect(degreesToCardinal(270)).toBe('W');
  });

  it('maps intermediate points', () => {
    expect(degreesToCardinal(45)).toBe('NE');
    expect(degreesToCardinal(250)).toBe('WSW'); // observation fixture value
    expect(degreesToCardinal(22.5)).toBe('NNE');
  });

  it('wraps 360 back to North and normalizes out-of-range', () => {
    expect(degreesToCardinal(360)).toBe('N');
    expect(degreesToCardinal(720)).toBe('N');
    expect(degreesToCardinal(-90)).toBe('W');
  });

  it('is null-safe', () => {
    expect(degreesToCardinal(null)).toBeNull();
    expect(degreesToCardinal(undefined)).toBeNull();
  });
});

describe('roundPercent', () => {
  it('rounds and clamps', () => {
    expect(roundPercent(39.254864873991)).toBe(39);
    expect(roundPercent(150)).toBe(100);
    expect(roundPercent(-5)).toBe(0);
    expect(roundPercent(null)).toBeNull();
  });
});

describe('formatters', () => {
  it('formats temperature', () => {
    expect(formatTempF(72)).toBe('72°F');
    expect(formatTempF(null)).toBe('--');
    expect(formatTempF(NaN)).toBe('--');
  });

  it('formats percent', () => {
    expect(formatPercent(30)).toBe('30%');
    expect(formatPercent(null)).toBe('--');
  });
});
