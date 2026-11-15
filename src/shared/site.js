export const email = "directortao@gmail.com";
export const githubUrl = "https://github.com/tao-ximing";
export const assetBase = import.meta.env.BASE_URL;

/**
 * Site-internal URL for a route slug ("" is home).
 * @param {string} slug
 * @returns {string}
 */
export const to = (slug) => `${assetBase}${slug}`;
