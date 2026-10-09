export interface SiteConfig {
  title: string;
  subtitle: string;
  mentorName?: string;
  originLabel: string;
  originCoordinates: [number, number];
  ceremonySpeed: 0.75 | 1 | 1.5;
}

export const SITE_CONFIG: SiteConfig = {
  title: "桃李满天下",
  subtitle: "从杨凌出发，奔赴山海",
  originLabel: "陕西杨凌",
  originCoordinates: [108.072, 34.272],
  ceremonySpeed: 1
};
