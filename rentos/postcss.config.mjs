// Tailwind v4 moved the PostCSS plugin into its own package.
// If this project was actually built on Tailwind v3, replace this with
// { plugins: { tailwindcss: {}, autoprefixer: {} } } and add a tailwind.config.ts.
export default { plugins: { "@tailwindcss/postcss": {} } };
