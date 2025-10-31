import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "scripts/**",
    ],
  },
  {
    rules: {
      // Allow any types during development
      "@typescript-eslint/no-explicit-any": "off",
      // Allow unused variables during development
      "@typescript-eslint/no-unused-vars": "off",
      // Allow unescaped entities in JSX
      "react/no-unescaped-entities": "off",
      // Allow missing dependencies in useEffect
      "react-hooks/exhaustive-deps": "off",
      // Allow img tags (Next.js Image optimization can be added later)
      "@next/next/no-img-element": "off",
      // Allow missing alt props (can be added later)
      "jsx-a11y/alt-text": "off",
    },
  },
];

export default eslintConfig;
