export function appUrl() {
  // на Vercel адрес сайта берётся из системной переменной, APP_URL можно не задавать
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const url = process.env.APP_URL || (vercel ? `https://${vercel}` : "http://localhost:3000");
  return url.replace(/\/$/, "");
}
