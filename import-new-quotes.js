const fs = require("fs");
const path = require("path");

const ROOT_DIR = __dirname;
const INDEX_FILE = path.join(ROOT_DIR, "index.html");
const PHOTO_DIR = path.join(ROOT_DIR, "photo");
const SOURCE_DIR = process.argv[2];

if (!SOURCE_DIR) {
    console.error("Usage: node import-new-quotes.js <source-photo-folder>");
    process.exit(1);
}

if (!fs.existsSync(SOURCE_DIR)) {
    console.error(`Source folder not found: ${SOURCE_DIR}`);
    process.exit(1);
}

function decodeHtml(value) {
    return String(value || "")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&quot;/gi, "\"")
        .replace(/&#39;/g, "'");
}

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function normalizeQuote(value) {
    return String(value || "")
        .replace(/\.[a-z0-9]+$/i, "")
        .replace(/[_-]\d+$/i, "")
        .replace(/[.]+$/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

function comparisonKey(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/[’‘]/g, "'")
        .replace(/[“”]/g, "\"")
        .replace(/[^a-z0-9]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function slugify(value) {
    return String(value || "")
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[’‘]/g, "")
        .replace(/&/g, " and ")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .split("-")
        .filter(Boolean)
        .slice(0, 9)
        .join("-") || "quote";
}

function uniqueSlug(baseSlug, usedSlugs) {
    let slug = baseSlug;
    let suffix = 2;

    while (usedSlugs.has(slug) || fs.existsSync(path.join(PHOTO_DIR, slug))) {
        slug = `${baseSlug}-${suffix}`;
        suffix += 1;
    }

    usedSlugs.add(slug);
    return slug;
}

function getExistingData(html) {
    const usedSlugs = new Set();
    const quoteKeys = new Set();
    const cardPattern = /<div\b(?=[^>]*class=["'][^"']*quote-card[^"']*["'])[\s\S]*?(?=<div\b(?=[^>]*class=["'][^"']*quote-card[^"']*["'])|<div id="load-trigger"|<div id="loading"|<\/section>)/gi;
    let match;

    while ((match = cardPattern.exec(html)) !== null) {
        const block = match[0];
        const slug = block.match(/data-slug=["']([^"']+)["']/i)?.[1];
        const quote = decodeHtml(block.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1] || "");

        if (slug) usedSlugs.add(slug);
        if (quote) quoteKeys.add(comparisonKey(quote));
    }

    return { usedSlugs, quoteKeys };
}

function inferCategory(quote) {
    const lower = quote.toLowerCase();

    if (/\b(god|faith|pray|prayed|blessing|blessings|faithfully)\b/.test(lower)) return "faith-hope";
    if (/\b(love|loved|relationship|heart|hug|together|apology|apologies|people|someone|father|ego|victim|corner|loyal|respect)\b/.test(lower)) return "relationships";
    if (/\b(heal|healing|hurt|pain|burden|rest|forgive|forgiveness|struggle|struggles|darkest|mistakes)\b/.test(lower)) return "healing";
    if (/\b(grateful|gratitude|thankful|appreciate|appreciation)\b/.test(lower)) return "gratitude";
    if (/\b(happy|happiness|joy|excited|good things|kindness|good to people)\b/.test(lower)) return "positivity";
    if (/\b(mindset|mental|peace|calm|composed|control|worry|strategy|emotion|silence)\b/.test(lower)) return "mindset";
    if (/\b(grow|growth|version|routine|career|focus|change|transformation|project|reset|refocus|deserve|wisdom|discipline|environment)\b/.test(lower)) return "self-growth";

    return "motivation";
}

function keywordList(quote, category) {
    const words = quote
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, " ")
        .split(/\s+/)
        .filter(word => word.length > 3 && ![
            "that", "this", "with", "from", "your", "youre", "they", "them",
            "what", "when", "where", "there", "their", "about", "have", "will",
            "just", "into", "than", "more", "less", "because", "before", "after"
        ].includes(word));

    return [category, ...new Set(words)].slice(0, 12).join(" ");
}

function cardMarkup({ slug, quote, category, imageFile }) {
    return `                <div class="quote-card" data-category="${escapeHtml(category)}" data-slug="${escapeHtml(slug)}"
                    data-keywords="${escapeHtml(keywordList(quote, category))}">
                    <a href="photo/${escapeHtml(slug)}/">
                        <img src="photo/${escapeHtml(slug)}/${escapeHtml(imageFile)}" loading="lazy"
                            alt="${escapeHtml(quote)}">
                    </a>

                    <div class="quote-content">
                        <p>${escapeHtml(quote)}</p>
                        <div class="share-buttons">
                            <a class="share-facebook" target="_blank"><i class="fab fa-facebook-f"></i></a>
                            <a class="share-x" target="_blank"><i class="fab fa-twitter"></i></a>
                            <a class="share-whatsapp" target="_blank"><i class="fab fa-whatsapp"></i></a>
                            <a class="share-pinterest" target="_blank"><i class="fab fa-pinterest"></i></a>
                            <a class="share-threads" target="_blank"><i class="fa-brands fa-threads"></i></a>
                        </div>
                    </div>
                </div>`;
}

const html = fs.readFileSync(INDEX_FILE, "utf8");
const { usedSlugs, quoteKeys } = getExistingData(html);
const imageFiles = fs.readdirSync(SOURCE_DIR)
    .filter(file => /\.(jpe?g|png|webp)$/i.test(file))
    .sort((a, b) => a.localeCompare(b));
const newCards = [];
const skipped = [];

for (const file of imageFiles) {
    const quote = normalizeQuote(file);
    const quoteKey = comparisonKey(quote);

    if (!quote || quoteKeys.has(quoteKey)) {
        skipped.push(file);
        continue;
    }

    const slug = uniqueSlug(slugify(quote), usedSlugs);
    const ext = path.extname(file).toLowerCase() || ".jpg";
    const imageFile = `${slug}${ext}`;
    const targetDir = path.join(PHOTO_DIR, slug);

    fs.mkdirSync(targetDir, { recursive: true });
    fs.copyFileSync(path.join(SOURCE_DIR, file), path.join(targetDir, imageFile));

    const category = inferCategory(quote);
    newCards.push({ slug, quote, category, imageFile });
    quoteKeys.add(quoteKey);
}

if (newCards.length) {
    const insertion = newCards.map(cardMarkup).join("\n\n") + "\n\n";
    const updatedHtml = html.replace(/(\s*<div id="load-trigger")/, `\n${insertion}$1`);
    fs.writeFileSync(INDEX_FILE, updatedHtml, "utf8");
}

console.log(`Imported ${newCards.length} new quotes.`);
console.log(`Skipped ${skipped.length} duplicates or empty filenames.`);
