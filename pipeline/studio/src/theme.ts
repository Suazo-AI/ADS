import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

// Served locally (public/fonts, SIL OFL) so renders never depend on a CDN.
loadFont({ family: "Inter", url: staticFile("fonts/Inter-Variable-latin.woff2"), weight: "100 900" });

export const theme = {
  paper: "#F6F1E7",
  ink: "#1B1B1F",
  accent: "#FF5A36",
  blue: "#2F6FEB",
  yellow: "#FFC93C",
  soft: "#E9E1D2",
  line: 16,
  font: "Inter, sans-serif",
};
