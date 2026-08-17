import { FlatCompat } from "@eslint/eslintrc";
import boundaries from "eslint-plugin-boundaries";
import prettier from "eslint-config-prettier";

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const config = [
  { ignores: ["node_modules/**", ".next/**", "coverage/**", "next-env.d.ts"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { boundaries },
    settings: {
      "import/resolver": { typescript: { alwaysTryTypes: true } },
      "boundaries/elements": [
        { type: "app", pattern: "src/app/**" },
        { type: "providers", pattern: "src/providers/**" },
        { type: "widgets", pattern: "src/widgets/*", capture: ["widget"] },
        { type: "features", pattern: "src/features/*", capture: ["feature"] },
        { type: "entities", pattern: "src/entities/*", capture: ["entity"] },
        { type: "shared", pattern: "src/shared/**" },
        { type: "i18n", pattern: "src/i18n/**" },
      ],
    },
    rules: {
      "boundaries/element-types": [
        "error",
        {
          default: "disallow",
          message:
            "${file.type} may not import ${dependency.type} — dependencies point down (MPS §8)",
          rules: [
            {
              from: "app",
              allow: [
                "app",
                "providers",
                "widgets",
                "features",
                "entities",
                "shared",
                "i18n",
              ],
            },
            { from: "providers", allow: ["providers", "shared"] },
            {
              from: "widgets",
              allow: ["widgets", "features", "entities", "shared"],
            },
            {
              from: "features",
              allow: [
                ["features", { feature: "${from.feature}" }],
                "entities",
                "shared",
              ],
            },
            // Entities may reference other entities (a booking is for a
            // table in a club). Cycles remain forbidden — see ADR-0008 and
            // the runtime-cycle check in `npm run graph`.
            { from: "entities", allow: ["entities", "shared"] },
            { from: "shared", allow: ["shared"] },
            { from: "i18n", allow: ["shared"] },
          ],
        },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports" },
      ],
    },
  },
  prettier,
];

export default config;
