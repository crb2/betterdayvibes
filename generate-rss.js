// Rebuilds rss.xml from the static post pages so the feed stays RSS 2.0,
// Pinterest-friendly, and valid UTF-8 every time it is generated.
const fs = require("fs");
const path = require("path");

const SITE_URL = "https://betterdayvibes.life";
const FEED_URL = `${SITE_URL}/rss.xml`;
const SITE_TITLE = "Better Day Vibes";
const MAX_ITEMS = 50;
const ROOT_DIR = __dirname;
const PHOTO_DIR = path.join(ROOT_DIR, "photo");
const OUTPUT_FILE = path.join(ROOT_DIR, "rss.xml");

// Common mojibake replacements fix text that was previously decoded as
// Windows-1252/Latin-1 instead of UTF-8 without touching already-correct text.
const MOJIBAKE_MAP = new Map([
    ["\u00e2\u20ac\u2122", "'"],
    ["\u00e2\u20ac\u02dc", "'"],
    ["\u00e2\u20ac\u0153", "\u201c"],
    ["\u00e2\u20ac\u009d", "\u201d"],
    ["\u00e2\u20ac\u009d", "\u201d"],
    ["\u00e2\u20ac\u00a6", "\u2026"],
    ["\u00e2\u20ac\u201c", "\u2013"],
    ["\u00e2\u20ac\u201d", "\u2014"],
    ["\u00c2 ", " "],
    ["\u00c2", ""]
]);

// Decoding only the entities we expect from the generated HTML avoids double
// encoding while still recovering clean quote text from meta tags and titles.
function decodeHtml(value) {
    return String(value || "")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&quot;/gi, "\"")
        .replace(/&apos;/gi, "'")
        .replace(/&#39;/g, "'")
        .replace(/&#x27;/gi, "'")
        .replace(/&#8216;/g, "'")
        .replace(/&#8217;/g, "'")
        .replace(/&#8220;/g, "\u201c")
        .replace(/&#8221;/g, "\u201d")
        .replace(/&#8211;/g, "\u2013")
        .replace(/&#8212;/g, "\u2014")
        .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
        .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)));
}

// XML escaping is applied exactly once at output time for text nodes and
// attribute values, which keeps ampersands and quotes valid without double encoding.
function escapeXml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

// CDATA keeps rich HTML readable for feed readers; this prevents the one token
// that can break CDATA from ever appearing in generated content.
function escapeCdata(value) {
    return String(value || "").replace(/\]\]>/g, "]]]]><![CDATA[>");
}

function normalizeText(value) {
    let text = decodeHtml(value).normalize("NFC");

    for (const [bad, good] of MOJIBAKE_MAP) {
        text = text.split(bad).join(good);
    }

    return text
        .replace(/\r?\n|\t/g, " ")
        .replace(/\s+/g, " ")
        .replace(/\s+([,.;:!?])/g, "$1")
        .trim();
}

// This catches a few known first-letter truncations from older generated titles
// while leaving valid short titles untouched.
function repairMissingFirstCharacter(text) {
    const repairs = [
        [/^ou\b/i, "You"],
        [/^oure\b/i, "You're"],
        [/^our\b/i, "Your"],
        [/^hen\b/i, "When"],
        [/^he\b/i, "The"],
        [/^his\b/i, "This"],
        [/^oday\b/i, "Today"],
        [/^ometimes\b/i, "Sometimes"],
        [/^ove\b/i, "Love"],
        [/^ife\b/i, "Life"],
        [/^ealing\b/i, "Healing"]
    ];

    for (const [pattern, replacement] of repairs) {
        if (pattern.test(text)) {
            return text.replace(pattern, replacement);
        }
    }

    return text;
}

function cleanTitle(value) {
    let title = normalizeText(value)
        .replace(/\s+\|\s+Better Day Vibes$/i, "")
        .replace(/\s+-\s+Better Day Vibes$/i, "");

    title = repairMissingFirstCharacter(title);
    title = title.replace(/\s+/g, " ").trim();

    return title || SITE_TITLE;
}

function getMetaContent(html, selector) {
    const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(
        `<meta\\s+(?:property|name)=["']${escapedSelector}["'][^>]*content=["']([^"']*)["'][^>]*>`,
        "i"
    );
    return html.match(pattern)?.[1] || "";
}

function getTitle(html) {
    return html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "";
}

function getH1(html) {
    return html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || "";
}

function stripTags(value) {
    return String(value || "").replace(/<[^>]*>/g, " ");
}

function absoluteUrl(value, slug) {
    const cleaned = normalizeText(value);

    if (/^https?:\/\//i.test(cleaned)) {
        return cleaned;
    }

    const normalizedPath = cleaned
        .replace(/^\.\//, "")
        .replace(/^\/+/, "");

    if (normalizedPath.startsWith("photo/")) {
        return `${SITE_URL}/${normalizedPath}`;
    }

    return `${SITE_URL}/photo/${slug}/${normalizedPath}`;
}

function getTopic(title, category) {
    const lower = `${title} ${category}`.toLowerCase();

    if (/heal|past|pain|hurt|tear|move forward/.test(lower)) {
        return "Positive reminder about healing and moving forward.";
    }
    if (/relationship|love|heart|people|friend|care|\bex\b/.test(lower)) {
        return "Daily motivational quote about relationships, love, and emotional peace.";
    }
    if (/grateful|gratitude|thank|bless|god|faith|hope|pray/.test(lower)) {
        return "Uplifting reflection about gratitude, faith, and hope.";
    }
    if (/confidence|worth|value|self|growth|boundary|strong|strength|achieve/.test(lower)) {
        return "Daily motivational quote about confidence and personal growth.";
    }
    if (/positive|joy|happy|smile|light|brighter|good/.test(lower)) {
        return "Encouraging thought about positivity, joy, and brighter days.";
    }

    return "Uplifting quote about mindset, peace, and personal growth.";
}

// Descriptions are intentionally varied: first sentence is the quote, second is
// a topic summary, and third keeps the Better Day Vibes discovery phrase.
function buildDescription(title, category) {
    const quote = title.replace(/\.+$/, ".");
    return `${quote} ${getTopic(title, category)} Find more daily motivation at Better Day Vibes.`;
}

function getCategoryFromIndex(slug) {
    const indexHtml = fs.readFileSync(path.join(ROOT_DIR, "index.html"), "utf8");
    const cardPattern = new RegExp(
        `<div[^>]*class=["'][^"']*quote-card[^"']*["'][^>]*data-category=["']([^"']+)["'][^>]*data-slug=["']${slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'][^>]*>`,
        "i"
    );
    return normalizeText(indexHtml.match(cardPattern)?.[1] || "");
}

function readPost(dirent) {
    const slug = dirent.name;
    const postDir = path.join(PHOTO_DIR, slug);
    const indexFile = path.join(postDir, "index.html");
    const fallbackFile = path.join(postDir, `${slug}.html`);
    const htmlFile = fs.existsSync(indexFile) ? indexFile : fallbackFile;

    if (!fs.existsSync(htmlFile)) {
        return null;
    }

    const html = fs.readFileSync(htmlFile, "utf8");
    const title = cleanTitle(getMetaContent(html, "og:title") || getTitle(html) || stripTags(getH1(html)));
    const imageFromMeta = getMetaContent(html, "og:image");
    const imageFile = fs.readdirSync(postDir).find(file => file.toLowerCase().endsWith(".webp"));
    const imageUrl = absoluteUrl(imageFromMeta || imageFile || `${slug}.webp`, slug);
    const link = `${SITE_URL}/photo/${slug}/`;
    const category = getCategoryFromIndex(slug);
    const stats = fs.statSync(postDir);

    return {
        slug,
        title,
        link,
        guid: link,
        imageUrl,
        description: buildDescription(title, category),
        pubTime: stats.mtime.getTime(),
        category
    };
}

function buildFeed(items) {
    const lines = [
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
        "<rss version=\"2.0\" xmlns:media=\"http://search.yahoo.com/mrss/\" xmlns:content=\"http://purl.org/rss/1.0/modules/content/\" xmlns:atom=\"http://www.w3.org/2005/Atom\">",
        "  <channel>",
        `    <title>${escapeXml(SITE_TITLE)}</title>`,
        `    <link>${escapeXml(SITE_URL)}/</link>`,
        "    <description>Daily motivational quotes, positive thoughts, gratitude, healing, and self-growth inspiration from Better Day Vibes.</description>",
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

    const usedPubDates = new Set();

    items.forEach((item) => {
        // Keep each post's real file publish time, but move batch duplicates
        // forward one second at a time so aggregators get stable unique dates.
        let pubTime = item.pubTime;
        let pubDate = new Date(pubTime).toUTCString();
        while (usedPubDates.has(pubDate)) {
            pubTime += 1000;
            pubDate = new Date(pubTime).toUTCString();
        }
        usedPubDates.add(pubDate);

        const contentHtml =
            `<p>${escapeXml(item.description)}</p>` +
            `<p><a href="${escapeXml(item.link)}"><img src="${escapeXml(item.imageUrl)}" alt="${escapeXml(item.title)}" /></a></p>`;

        lines.push(
            "    <item>",
            `      <title>${escapeXml(item.title)}</title>`,
            `      <link>${escapeXml(item.link)}</link>`,
            `      <guid isPermaLink="true">${escapeXml(item.guid)}</guid>`,
            `      <description>${escapeXml(item.description)}</description>`,
            `      <pubDate>${pubDate}</pubDate>`,
            `      <media:content url="${escapeXml(item.imageUrl)}" medium="image" />`,
            `      <media:thumbnail url="${escapeXml(item.imageUrl)}" />`,
            `      <media:title>${escapeXml(item.title)}</media:title>`,
            `      <content:encoded><![CDATA[${escapeCdata(contentHtml)}]]></content:encoded>`,
            "    </item>"
        );
    });

    lines.push("  </channel>", "</rss>", "");
    return lines.join("\n");
}

function main() {
    const posts = fs.readdirSync(PHOTO_DIR, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(readPost)
        .filter(Boolean)
        .sort((a, b) => b.pubTime - a.pubTime)
        .slice(0, MAX_ITEMS);

    const guids = new Set(posts.map(post => post.guid));
    if (guids.size !== posts.length) {
        throw new Error("Duplicate GUID detected while generating RSS.");
    }

    // Node writes strings as UTF-8 by default; naming the encoding here makes
    // the RSS charset explicit in both code and output.
    fs.writeFileSync(OUTPUT_FILE, buildFeed(posts), "utf8");
    console.log(`Generated ${posts.length} RSS items at ${OUTPUT_FILE}`);
}

main();
