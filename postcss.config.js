// WHY: Tailwind 4 ships its own PostCSS plugin; autoprefixer remains because
// the Next 15 default browserlist still includes targets that need vendor
// prefixes for `backdrop-filter` and a few transform properties.
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
};
