import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Architecture boundaries. eslint-config-next already registers the `import` plugin.
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      // `import/no-relative-parent-imports` checks the resolved path, so it also flags `@/` imports.
      "no-restricted-imports": [
        "error",
        { patterns: [{ regex: "^\\.\\./", message: "Use the `@/` alias instead of `../`." }] },
      ],
      "import/no-cycle": "error",
      "import/no-restricted-paths": [
        "error",
        {
          zones: [
            // Features never import each other.
            { target: "./src/features/cart", from: "./src/features", except: ["./cart"] },
            { target: "./src/features/products", from: "./src/features", except: ["./products"] },

            // One-way flow: shared code -> features -> app.
            { target: "./src/features", from: "./src/app" },
            {
              target: ["./src/components", "./src/helpers"],
              from: ["./src/features", "./src/app"],
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
