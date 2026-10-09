import { describe, expect, it } from "vitest";

import { getYearColor } from "./year-color";

describe("getYearColor", () => {
  it("returns a stable hex color for a graduation year", () => {
    expect(getYearColor(2008)).toBe(getYearColor(2008));
    expect(getYearColor(2008)).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("assigns a distinct color to every maintained graduation year", () => {
    const years = [2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2024, 2025, 2026];
    const colors = years.map(getYearColor);

    expect(new Set(colors).size).toBe(years.length);
  });
});
