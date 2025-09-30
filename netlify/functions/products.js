const { Client } = require("@notionhq/client");

// Map filename or subpath -> /Images/...; keep absolute/URL as-is
function normalizeImage(val) {
  if (!val) return "/Images/placeholder.jpg";
  const s = String(val).trim();
  if (/^https?:\/\//i.test(s)) return s;       // full URL
  if (s.startsWith("/")) return encodeURI(s);   // absolute site path
  return encodeURI(`/Images/${s}`);             // filename or team path
}

exports.handler = async () => {
  const token = process.env.NOTION_TOKEN;
  const db = process.env.NOTION_PRODUCTS_DB;

  // If Notion not configured, signal the frontend to use fallback JSON
  if (!token || !db) {
    return { statusCode: 404, body: JSON.stringify({ products: [] }) };
  }

  try {
    const notion = new Client({ auth: token });

    const pages = [];
    let cursor;
    do {
      const res = await notion.databases.query({
        database_id: db,
        start_cursor: cursor
        // No API filter here; we'll filter client-side so "Status" is optional
      });
      pages.push(...res.results);
      cursor = res.has_more ? res.next_cursor : undefined;
    } while (cursor);

    const products = pages
      .map(p => {
        const s = p.properties;

        // Accept URL, Files & media, Rich text, or Title for image
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
          // handle both StripeLink and StripLink (typo)
          stripeLink: s.StripeLink?.url || s.StripLink?.url || "",
          squareLink: s.SquareLink?.url || "",
          team: (s.Team?.multi_select || []).map(t => t.name),
          status: s.Status?.select?.name || "Active"
        };
      })
      // If Status exists, only show "Active"; if not present, include
      .filter(p => !p.status || p.status === "Active");

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
