const fs = require("fs");
const path = require("path");

const SITE_URL = "https://betterdayvibes.life";
const ROOT_DIR = __dirname;
const PHOTO_DIR = path.join(ROOT_DIR, "photo");
const OUTPUT_FILE = path.join(ROOT_DIR, "sitemap.xml");

function escapeXml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function formatDate(date) {
    return date.toISOString().slice(0, 10);
}

function fileLastModified(file) {
    return formatDate(fs.statSync(file).mtime);
}

const staticPages = [
    { loc: "/", file: "index.html" },
    { loc: "/about.html", file: "about.html" },
    { loc: "/contact.html", file: "contact.html" },
    { loc: "/privacy-policy.html", file: "privacy-policy.html" },
    { loc: "/terms-and-conditions.html", file: "terms-and-conditions.html" },
    { loc: "/all-quotes.html", file: "all-quotes.html" }
];

const urls = staticPages
    .filter(page => fs.existsSync(path.join(ROOT_DIR, page.file)))
    .map(page => ({
        loc: `${SITE_URL}${page.loc}`,
        lastmod: fileLastModified(path.join(ROOT_DIR, page.file))
    }));

const photoUrls = fs.readdirSync(PHOTO_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => {
        const indexFile = path.join(PHOTO_DIR, dirent.name, "index.html");
        return {
            loc: `${SITE_URL}/photo/${dirent.name}/`,
            lastmod: fs.existsSync(indexFile) ? fileLastModified(indexFile) : formatDate(new Date())
        };
    })
    .sort((a, b) => a.loc.localeCompare(b.loc));

urls.push(...photoUrls);

const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="https://www.sitemaps.org/schemas/sitemap/0.9">',
    "",
    ...urls.map(item => `    <url>
        <loc>${escapeXml(item.loc)}</loc>
        <lastmod>${escapeXml(item.lastmod)}</lastmod>
    </url>`),
    "",
    "</urlset>",
    ""
].join("\n");

fs.writeFileSync(OUTPUT_FILE, xml, "utf8");
console.log(`Generated ${urls.length} sitemap URLs at ${OUTPUT_FILE}`);
