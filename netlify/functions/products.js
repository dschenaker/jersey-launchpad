const { Client } = require("@notionhq/client");

exports.handler = async () => {
  try {
    const notion = new Client({ auth: process.env.NOTION_TOKEN });
    const db = process.env.NOTION_PRODUCTS_DB;

    const pages = [];
    let cursor = undefined;

    do {
      const res = await notion.databases.query({
        database_id: db,
        start_cursor: cursor,
        filter: {
          property: "Status",
          select: { equals: "Active" }
        }
      });
      pages.push(...res.results);
      cursor = res.has_more ? res.next_cursor : undefined;
    } while (cursor);

    // Map Notion properties -> product shape expected by the UI
    const products = pages.map(p => {
      const props = p.properties;
      const name = props.Name?.title?.[0]?.plain_text || "Untitled";
      const price = props.Price?.number ?? 0;
      const tagline = props.Tagline?.rich_text?.[0]?.plain_text || "";
      const image = props.ImageURL?.url || "/images/placeholder.jpg";
      const stripeLink = props.StripeLink?.url || "";
      const squareLink = props.SquareLink?.url || "";
      const team = (props.Team?.multi_select || []).map(t => t.name);

      return {
        id: p.id,
        name,
        price,
        tagline,
        image,
        stripeLink,
        squareLink,
        team
      };
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: JSON.stringify({ products })
    };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: "Failed to load products" }) };
  }
};