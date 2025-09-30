/**
 * Netlify Function: /api/products
 * - Uses Notion REST API (no SDK) to avoid runtime mismatches
 * - Accepts NOTION_PRODUCTS_DB or NOTION_DB
 * - Normalizes images to /images/... (lowercase) if you supply filenames
 */
const NOTION_VERSION = "2022-06-28";
const enc = (s) => encodeURI(String(s));
const normalizeImage = (raw) => {
  if (!raw) return "/images/placeholder.jpg";
  const s = String(raw).trim();
  if (/^https?:\/\//i.test(s)) return s;     // external URL
  if (s.startsWith("/")) return enc(s);       // absolute path you provided
  return enc(`/images/${s}`);                 // filename/subfolder -> public/images/...
};

async function notionQueryAll(db, token) {
  const results = [];
  let cursor = undefined;
  do {
    const res = await fetch(`https://api.notion.com/v1/databases/${db}/query`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(cursor ? { start_cursor: cursor } : {})
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Notion ${res.status}: ${text}`);
    }
    const data = await res.json();
    results.push(...(data.results || []));
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);
  return results;
}

exports.handler = async () => {
  const token = process.env.NOTION_TOKEN;
  const db = process.env.NOTION_PRODUCTS_DB || process.env.NOTION_DB;

  // If Notion not configured, tell frontend to fallback to /products.json
  if (!token || !db) {
    return {
      statusCode: 404,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: JSON.stringify({ products: [], reason: "NOTION env missing" })
    };
  }

  try {
    const pages = await notionQueryAll(db, token);

    const products = pages.map(p => {
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

      const status = s.Status?.select?.name || null;

      return {
        id: p.id,
        name: s.Name?.title?.[0]?.plain_text || "Untitled",
        price: s.Price?.number ?? 0,
        tagline: s.Tagline?.rich_text?.[0]?.plain_text || "",
        image: normalizeImage(imageRaw),
        stripeLink: s.StripeLink?.url || s.StripLink?.url || "",
        squareLink: s.SquareLink?.url || "",
        team: (s.Team?.multi_select || []).map(t => t.name),
        status
      };
    })
    // If Status exists, only show "Active"; if Status not present, include all
    .filter(p => !p.status || p.status === "Active");

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: JSON.stringify({ products })
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: JSON.stringify({ error: e.message || "Unknown error" })
    };
  }
};
