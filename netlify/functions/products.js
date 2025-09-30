const { Client } = require("@notionhq/client");

// Map filename/subpath -> /images/... (lowercase to match your repo)
// - full URLs are preserved
// - absolute site paths starting with "/" are preserved (and encoded)
function normalizeImage(val) {
  if (!val) return "/images/placeholder.jpg";
  const s = String(val).trim();
  if (/^https?:\/\//i.test(s)) return s;        // external URL
  if (s.startsWith("/")) return encodeURI(s);    // absolute site path
  return encodeURI(`/images/${s}`);              // filename or subfolder/filename
}

exports.handler = async () => {
  const token = process.env.NOTION_TOKEN;
  // Accept NOTION_PRODUCTS_DB or NOTION_DB (either name works)
  const db = process.env.NOTION_PRODUCTS_DB || process.env.NOTION_DB;

  // If Notion not configured, tell the frontend to fallback to /products.json
  if (!token || !db) {
    return {
      statusCode: 404,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: JSON.stringify({ products: [], reason: "NOTION env missing" })
    };
  }

  try {
    const notion = new Client({ auth: token });

    const pages = [];
    let cursor;
    do {
      const res = await notion.databases.query({
        database_id: db,
        start_cursor: cursor
      });
      pages.push(...res.results);
      cursor = res.has_more ? res.next_cursor : undefined;
    } while (cursor);

    const products = pages
      .map(p => {
        const s = p.properties || {};
        const imageRaw =
          s.ImageURL?.url ||
          s.Image?.files?.[0]?.file?.url ||
          s.Image?.files?.[0]?.external?.url ||
          s.Image?.url ||
          s.Image?.rich_text?.[0]?.plain_text ||
          s.Image?.title?.[0]?.plain_text ||
          s.Picture?.files?.[0]?.file?.url ||
          s.Picture?.files?.[0]?.external?.url ||
          null;

        return {
          id: p.id,
          name: s.Name?.title?.[0]?.plain_text || "Untitled",
          price: s.Price?.number ?? 0,
          tagline: s.Tagline?.rich_text?.[0]?.plain_text || "",
          image: normalizeImage(imageRaw),
          stripeLink: s.StripeLink?.url || s.StripLink?.url || "",
          squareLink: s.SquareLink?.url || "",
          team: (s.Team?.multi_select || []).map(t => t.name),
          status: s.Status?.select?.name || "Active"
        };
      })
      // If Status property exists, only show "Active"; if not present, include
      .filter(p => !p.status || p.status === "Active");

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: JSON.stringify({ products })
    };
  } catch (e) {
    // Return the error message so we can see it in the browser (helps debugging 500s)
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: JSON.stringify({ error: e.message || "Unknown error" })
    };
  }
};
