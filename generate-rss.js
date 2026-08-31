const fs = require("fs");
const path = require("path");

const SITE_URL = "https://betterdayvibes.life";
const FEED_URL = `${SITE_URL}/rss.xml`;
const SITE_TITLE = "Better Day Vibes";
const MAX_ITEMS = 60;
const ROOT_DIR = __dirname;
const OUTPUT_FILE = path.join(ROOT_DIR, "rss.xml");
const { quotesData } = require("./data/quotes-content");

function escapeXml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function escapeCdata(value) {
    return String(value || "").replace(/\]\]>/g, "]]]]><![CDATA[>");
}

function buildFeed(items) {
    const lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">',
        "  <channel>",
        `    <title>${escapeXml(SITE_TITLE)}</title>`,
        `    <link>${escapeXml(SITE_URL)}/</link>`,
        "    <description>Daily motivational quotes, gratitude reflections, healing wisdom, and self-growth inspiration from Better Day Vibes.</description>",
        "    <language>en-us</language>",
        `    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`,
        `    <atom:link href="${escapeXml(FEED_URL)}" rel="self" type="application/rss+xml" />`,
        "    <image>",
        `      <title>${escapeXml(SITE_TITLE)}</title>`,
        `      <url>${escapeXml(SITE_URL)}/favicon/android-chrome-512x512.png</url>`,
        `      <link>${escapeXml(SITE_URL)}/</link>`,
        "    </image>",
        "    <ttl>1440</ttl>"
    ];

    const baseTime = Date.now();

    items.forEach((item, index) => {
        const pubTime = baseTime - (index * 3600 * 1000 * 12); // Every 12 hours
        const pubDate = new Date(pubTime).toUTCString();
        const link = `${SITE_URL}/photo/${item.slug}/`;
        const imageUrl = `${SITE_URL}/photo/${item.slug}/${item.slug}.webp`;

        const contentHtml =
            `<p><strong>&ldquo;${escapeXml(item.quote)}&rdquo;</strong></p>` +
            `<p>${escapeXml(item.meaning)}</p>` +
            `<p><a href="${escapeXml(link)}"><img src="${escapeXml(imageUrl)}" alt="${escapeXml(item.title)}" /></a></p>` +
            `<p><em>Takeaway: ${escapeXml(item.takeaway)}</em></p>`;

        lines.push(
            "    <item>",
            `      <title>${escapeXml(item.title)}</title>`,
            `      <link>${escapeXml(link)}</link>`,
            `      <guid isPermaLink="true">${escapeXml(link)}</guid>`,
            `      <description>${escapeXml(item.metaDescription)}</description>`,
            `      <pubDate>${pubDate}</pubDate>`,
            `      <media:content url="${escapeXml(imageUrl)}" medium="image" />`,
            `      <media:thumbnail url="${escapeXml(imageUrl)}" />`,
            `      <media:title>${escapeXml(item.title)}</media:title>`,
            `      <content:encoded><![CDATA[${escapeCdata(contentHtml)}]]></content:encoded>`,
            "    </item>"
        );
    });

    lines.push("  </channel>", "</rss>", "");
    return lines.join("\n");
}

function main() {
    const items = quotesData.slice(0, MAX_ITEMS);
    fs.writeFileSync(OUTPUT_FILE, buildFeed(items), "utf8");
    console.log(`Generated ${items.length} RSS items at ${OUTPUT_FILE}`);
}

main();
