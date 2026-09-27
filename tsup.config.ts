import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  // tsup's declaration step builds its own program with a legacy baseUrl,
  // which TypeScript 6 reports as a deprecation error without this.
  dts: { compilerOptions: { ignoreDeprecations: "6.0" } },
  sourcemap: true,
  clean: true,
  // A library should not emit shared chunks: consumers bundle their own way.
  splitting: false,
  treeshake: true,
  target: "es2023",
});