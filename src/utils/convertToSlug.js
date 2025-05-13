import slugify from "slugify";

export const convertToSlug = (text) =>
  slugify(text, { lower: true, remove: /[*+~.()'"!:@]/g });
