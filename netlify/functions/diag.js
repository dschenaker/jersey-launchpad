exports.handler = async () => ({
  statusCode: 200,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  body: JSON.stringify({
    hasToken: !!process.env.NOTION_TOKEN,
    hasDb: !!(process.env.NOTION_PRODUCTS_DB || process.env.NOTION_DB)
  })
});
