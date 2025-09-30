const { Client } = require("@notionhq/client");

// convert any filename/path to a safe site path under /Images, keep URLs as-is
function normalizeImage(val) {
  if (!val) return "/Images/placeholder.jpg";
  const s = String(val).trim();
  // Full URL? pass through
  if (/^https?:\/\//i.test(s)) return s;
  // Already an absolute site path? (starts with /)
  if (s.startsWith("/")) return encodeURI(s);
  // Otherwise treat it as a file or subpath under /Images
  const path = `/Images/${s}`;
  // encodeURI keeps slashes, but encodes spaces/quotes etc
  return encodeURI(path);
}

exports.handler = async () => {
  try {
    const token = process.env.NOTION_TOKEN;
    const db = process.env.NOTION_PRODUCTS_DB;

    // No Notion configured -> let frontend fall back to /products.json
    if (!token || !db) {
      return { statusCode: 200, body: JSON.stringify({ products: [] }) };
    }

    const notion = new Client({ auth: token });

    const pages = [];
    let cursor;
    do {
      const res = await notion.databases.query({
        database_id: db,
        start_cursor: cursor,
        filter: { property: "Status", select: { equals: "Active" } }
      });
      pages.push(...res.results);
      cursor = res.has_more ? res.next_cursor : undefined;
    } while (cursor);

    const products = pages.map(p => {
      const s = p.properties;

      // Accept any of these property names for image source:
      // ImageURL (URL), Image (Files & media / Rich text / Title / URL), Picture (alt)
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
        stripeLink: s.StripeLink?.url || "",
        squareLink: s.SquareLink?.url || "",
        team: (s.Team?.multi_select || []).map(t => t.name)
      };
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: JSON.stringify({ products })
    };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, body: JSON.stringify({ error: "Failed to load products" }) };
  }
};
