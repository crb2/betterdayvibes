const fs = require("fs");
const path = require("path");

const SITE_URL = "https://betterdayvibes.life";
const ROOT_DIR = __dirname;
const INDEX_FILE = path.join(ROOT_DIR, "index.html");

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function normalizeText(value) {
    return String(value || "")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&quot;/gi, "\"")
        .replace(/&#39;/g, "'")
        .replace(/<br\s*\/?>/gi, " ")
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function resolveConflictMarkers(html) {
    return String(html || "").replace(
        /^<<<<<<<[^\r\n]*\r?\n([\s\S]*?)^=======\r?\n[\s\S]*?^>>>>>>>[^\r\n]*(?:\r?\n)?/gm,
        "$1"
    );
}

function getAttribute(tag, name) {
    const pattern = new RegExp(`${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, "i");
    return tag.match(pattern)?.[2] || "";
}

function getCards(html) {
    const cardPattern = /<div\b(?=[^>]*class=["'][^"']*quote-card[^"']*["'])[\s\S]*?(?=<div\b(?=[^>]*class=["'][^"']*quote-card[^"']*["'])|<div id="load-trigger"|<div id="loading"|<\/section>)/gi;
    const cards = [];
    let match;

    while ((match = cardPattern.exec(html)) !== null) {
        const block = match[0];
        const anchorTag = block.match(/<a\b[^>]*>/i)?.[0] || "";
        const imageTag = block.match(/<img\b[^>]*>/i)?.[0] || "";
        const href = getAttribute(anchorTag, "href");
        const slug = href.match(/^photo\/([^\/]+)\/?$/i)?.[1];
        const image = getAttribute(imageTag, "src");
        const alt = getAttribute(imageTag, "alt");
        const category = block.match(/data-category=["']([^"']+)["']/i)?.[1] || "motivation";
        const quote = normalizeText(block.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1] || alt);

        if (!slug || !image) continue;
        cards.push({ slug, href, image, title: normalizeText(alt || quote), quote, category });
    }

    return cards;
}

function cardMarkup(card) {
    const url = `${SITE_URL}/${card.href}`;
    const text = encodeURIComponent(card.quote || card.title);
    const pageUrl = encodeURIComponent(url);
    const imageUrl = encodeURIComponent(`${SITE_URL}/${card.image}`);
    const facebookUrl = escapeHtml(`https://www.facebook.com/sharer/sharer.php?u=${pageUrl}`);
    const xUrl = escapeHtml(`https://twitter.com/intent/tweet?text=${text}&url=${pageUrl}`);
    const whatsappUrl = escapeHtml(`https://wa.me/?text=${text}%20${pageUrl}`);
    const pinterestUrl = escapeHtml(`https://pinterest.com/pin/create/button/?url=${pageUrl}&media=${imageUrl}&description=${text}`);
    const threadsUrl = escapeHtml(`https://www.threads.net/intent/post?text=${text}%20${pageUrl}`);

    return `            <article class="mini-quote-card">
                <a class="mini-image-link" href="${escapeHtml(card.href)}">
                    <img src="${escapeHtml(card.image)}" loading="lazy" alt="${escapeHtml(card.title)}">
                </a>
                <div class="share-buttons" aria-label="Share this quote">
                    <a class="share-facebook" href="${facebookUrl}" target="_blank" rel="noopener" aria-label="Share on Facebook"><i class="fab fa-facebook-f"></i></a>
                    <a class="share-x" href="${xUrl}" target="_blank" rel="noopener" aria-label="Share on X"><i class="fab fa-twitter"></i></a>
                    <a class="share-whatsapp" href="${whatsappUrl}" target="_blank" rel="noopener" aria-label="Share on WhatsApp"><i class="fab fa-whatsapp"></i></a>
                    <a class="share-pinterest" href="${pinterestUrl}" target="_blank" rel="noopener" aria-label="Share on Pinterest"><i class="fab fa-pinterest"></i></a>
                    <a class="share-threads" href="${threadsUrl}" target="_blank" rel="noopener" aria-label="Share on Threads"><i class="fa-brands fa-threads"></i></a>
                </div>
                <a class="mini-title-link" href="${escapeHtml(card.href)}">
                    <span>${escapeHtml(card.title)}</span>
                </a>
            </article>`;
}

function pick(cards, options) {
    if (options.slugs) {
        return options.slugs
            .map(slug => cards.find(card => card.slug === slug))
            .filter(Boolean)
            .slice(0, 4);
    }

    if (options.category) {
        return cards.filter(card => card.category === options.category).slice(0, 4);
    }

    if (options.search) {
        const pattern = new RegExp(options.search, "i");
        return cards.filter(card => pattern.test(`${card.category} ${card.title} ${card.quote}`)).slice(0, 4);
    }

    if (options.offset) {
        return cards.slice(options.offset, options.offset + 4);
    }

    return cards.slice(0, 4);
}

function sectionMarkup(id, title, cards) {
    return `    <section class="link-section quote-card-section" id="${id}">
        <h2>${title}</h2>
        <div class="mini-quote-grid">
${cards.map(cardMarkup).join("\n")}
        </div>
    </section>`;
}

function newsletterMarkup() {
    return `    <section class="link-section newsletter-block" id="newsletter">
        <h2>Newsletter</h2>
        <p>Get one motivational quote every morning.</p>
        <form class="newsletter-form">
            <input type="email" placeholder="Email" aria-label="Email address">
            <button type="submit">Subscribe</button>
        </form>
    </section>`;
}

function faqMarkup() {
    return `    <section class="link-section faq-block" id="faq">
        <h2>FAQ</h2>
        <details>
            <summary>What is Better Day Vibes?</summary>
            <p>Better Day Vibes shares motivational quotes, positive thoughts, and daily inspiration for personal growth, gratitude, resilience, and mindfulness.</p>
        </details>
        <details>
            <summary>Can I search quotes by topic?</summary>
            <p>Yes. Use the search box to find quotes about love, life, hope, happiness, friendship, healing, motivation, and more.</p>
        </details>
        <details>
            <summary>Can I share these quotes?</summary>
            <p>Yes. Use the social share icons under each quote card to share your favorite quote.</p>
        </details>
        <details>
            <summary>How often are new quotes added?</summary>
            <p>New inspirational quotes are added regularly so you can keep finding fresh motivation, encouragement, and positive reminders.</p>
        </details>
        <details>
            <summary>Can I browse all quotes in one place?</summary>
            <p>Yes. Open the All Quotes page from the footer to explore the full quote collection by title and topic.</p>
        </details>
        <details>
            <summary>Can I request a quote topic?</summary>
            <p>Yes. Use the contact page or social links to suggest quote topics, feedback, or collaboration ideas.</p>
        </details>
        <details>
            <summary>Are these quotes good for social media captions?</summary>
            <p>Yes. Many quotes are written to be easy to share as captions, status updates, story posts, and daily reminders.</p>
        </details>
    </section>`;
}

function updateHead(html) {
    const extras = [
        '<link rel="canonical" href="https://betterdayvibes.life/">',
        '<meta property="og:site_name" content="Better Day Vibes">',
        '<meta property="og:url" content="https://betterdayvibes.life/">',
        '<meta name="twitter:card" content="summary_large_image">',
        '<meta name="twitter:site" content="@betterdayvibe">',
        '<meta name="twitter:creator" content="@betterdayvibe">'
    ];

    for (const tag of extras) {
        const key = tag.match(/(?:property|name|rel)=["']([^"']+)/)?.[1];
        if (key && html.includes(key)) continue;
        html = html.replace("</head>", `    ${tag}\n</head>`);
    }

    const schema = `{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "name": "Better Day Vibes",
      "url": "https://betterdayvibes.life",
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://betterdayvibes.life/?q={search_term_string}",
        "query-input": "required name=search_term_string"
      }
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://betterdayvibes.life/"
        }
      ]
    }
  ]
}`;

    html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, `<script type="application/ld+json">\n${schema}\n</script>`);
    return html;
}

function addFooterText(html) {
    if (html.includes("Follow on our social media")) return html;
    return html.replace(/(\s*)<div class="footer-social"/g, `$1<p class="footer-follow">Follow on our social media</p>$1<div class="footer-social"`);
}

function addAllQuotesFooterLink(html, prefix = "") {
    if (html.includes(`${prefix}all-quotes.html`)) return html;
    return html.replace(
        /<a href="([^"]*terms-and-conditions\.html)">Terms (?:&amp;|&) Conditions<\/a>/,
        `<a href="$1">Terms & Conditions</a>
            <span>|</span>
            <a href="${prefix}all-quotes.html">All Quotes</a>`
    );
}

function buildHomeSections(cards) {
    const sections = [
        sectionMarkup("recent-quotes", "Recent Quotes", pick(cards, { offset: Math.max(cards.length - 4, 0) })),
        sectionMarkup("popular-quotes", "Popular Quotes", pick(cards, {
            slugs: [
                "keep-being-authentic",
                "being-positive-doesnt-mean-you-need-to-be-happy-all-the-time",
                "you-are-blessed-in-countless-ways",
                "never-give-up-on-joy"
            ]
        })),
        sectionMarkup("love-quotes", "Love Quotes", pick(cards, { search: "love|relationship|heart|friend" })),
        sectionMarkup("healing-quotes", "Healing Quotes", pick(cards, { category: "healing" })),
        sectionMarkup("success-quotes", "Success Quotes", pick(cards, { search: "success|achieve|dream|purpose|growth|strength" })),
        sectionMarkup("related-quotes", "Related Quotes", pick(cards, { offset: 8 })),
        sectionMarkup("trending-this-week", "Trending This Week", pick(cards, { search: "hope|joy|mindset|gratitude|peace" }))
    ];

    return `${sections.join("\n\n")}\n\n${newsletterMarkup()}\n\n${faqMarkup()}`;
}

function updateHomepage() {
    let html = resolveConflictMarkers(fs.readFileSync(INDEX_FILE, "utf8"));
    const cards = getCards(html);

    html = updateHead(html);
    html = html.replace(
        /<section class="quote-day" id="quoteSection">[\s\S]*?<\/section>/,
        `<section class="quote-day" id="quoteSection">
                <h2>Quote Of The Day</h2>

                <p>
                    Your story isn't over yet. The most meaningful chapters are still waiting to be written.
                </p>
            </section>`
    );
    html = html.replace(
        /    <section class="link-section(?: quote-card-section)?" id="recent-quotes">[\s\S]*?    <section class="link-section faq-block" id="faq">[\s\S]*?    <\/section>/,
        buildHomeSections(cards)
    );
    html = addFooterText(html);
    html = addAllQuotesFooterLink(html);

    fs.writeFileSync(INDEX_FILE, html, "utf8");
    return cards;
}

function sitemapPage(cards) {
    const byLetter = new Map();
    const byCategory = new Map();

    for (const card of cards) {
        const letter = (card.title[0] || "#").toUpperCase();
        if (!byLetter.has(letter)) byLetter.set(letter, []);
        byLetter.get(letter).push(card);
        if (!byCategory.has(card.category)) byCategory.set(card.category, []);
        byCategory.get(card.category).push(card);
    }

    const letterSections = [...byLetter.keys()].sort().map(letter => `            <section>
                <h2>${escapeHtml(letter)}</h2>
                <ul>
${byLetter.get(letter).map(card => `                    <li><a href="${escapeHtml(card.href)}">${escapeHtml(card.title)}</a></li>`).join("\n")}
                </ul>
            </section>`).join("\n");

    const categorySections = [...byCategory.keys()].sort().map(category => `            <section>
                <h2>${escapeHtml(category.replace(/-/g, " "))}</h2>
                <ul>
${byCategory.get(category).slice(0, 20).map(card => `                    <li><a href="${escapeHtml(card.href)}">${escapeHtml(card.title)}</a></li>`).join("\n")}
                </ul>
            </section>`).join("\n");

    return `<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>All Quotes | Better Day Vibes</title>
    <meta name="description" content="Browse all motivational quotes, love quotes, healing quotes, life quotes, and positive thoughts from Better Day Vibes.">
    <link rel="canonical" href="${SITE_URL}/all-quotes.html">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="Better Day Vibes">
    <meta property="og:title" content="All Quotes | Better Day Vibes">
    <meta property="og:description" content="Browse all motivational quotes and daily inspiration from Better Day Vibes.">
    <meta property="og:url" content="${SITE_URL}/all-quotes.html">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:site" content="@betterdayvibe">
    <link rel="stylesheet" href="style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">
</head>

<body>
    <header>
        <div class="logo">
            <a href="./">
                <img src="better-day-vibes-logo.jpg" alt="Better Day Vibes Logo">
                <span>Better Day Vibes</span>
            </a>
        </div>
        <nav>
            <a href="./">Home</a>
            <a href="./#recent-quotes">Recent Quotes</a>
            <a href="./#popular-quotes">Popular Quotes</a>
            <button id="menuBtn" class="menu-btn">&#9776;</button>
        </nav>
    </header>

    <main class="sitemap-main">
        <h1>All Quotes</h1>
        <p>Browse every Better Day Vibes quote by title or topic.</p>
        <div class="sitemap-grid">
${letterSections}
        </div>
        <h2>Topics</h2>
        <div class="sitemap-grid">
${categorySections}
        </div>
    </main>

    <footer>
        <div class="footer-links">
            <a href="about.html">About Us</a>
            <span>|</span>
            <a href="contact.html">Contact</a>
            <span>|</span>
            <a href="privacy-policy.html">Privacy Policy</a>
            <span>|</span>
            <a href="terms-and-conditions.html">Terms &amp; Conditions</a>
        </div>
        <p class="footer-follow">Follow on our social media</p>
        <div class="footer-social" aria-label="Better Day Vibes social links">
            <a href="https://www.instagram.com/betterdayvibe" target="_blank" rel="noopener" aria-label="Instagram"><i class="fa-brands fa-instagram"></i></a>
            <a href="https://www.facebook.com/betterdayvibe" target="_blank" rel="noopener" aria-label="Facebook"><i class="fa-brands fa-facebook"></i></a>
            <a href="https://threads.com/@betterdayvibe" target="_blank" rel="noopener" aria-label="Threads"><i class="fa-brands fa-threads"></i></a>
            <a href="https://pinterest.com/betterdayvibe" target="_blank" rel="noopener" aria-label="Pinterest"><i class="fa-brands fa-pinterest"></i></a>
            <a href="https://x.com/betterdayvibe" target="_blank" rel="noopener" aria-label="X"><i class="fa-brands fa-x-twitter"></i></a>
        </div>
        <p>&copy; 2026 Better Day Vibes. All Rights Reserved.</p>
    </footer>
    <script src="js/site-actions.js"></script>
</body>

</html>
`;
}

function updateStaticPages() {
    const pages = ["about.html", "contact.html", "privacy-policy.html", "terms-and-conditions.html"];

    for (const page of pages) {
        const file = path.join(ROOT_DIR, page);
        if (!fs.existsSync(file)) continue;
        let html = fs.readFileSync(file, "utf8");
        const canonical = `${SITE_URL}/${page}`;
        if (!html.includes('rel="canonical"')) {
            html = html.replace("</head>", `    <link rel="canonical" href="${canonical}">\n</head>`);
        }
        if (!html.includes("og:site_name")) {
            html = html.replace("</head>", `    <meta property="og:site_name" content="Better Day Vibes">\n</head>`);
        }
        if (!html.includes("twitter:site")) {
            html = html.replace("</head>", `    <meta name="twitter:site" content="@betterdayvibe">\n</head>`);
        }
        html = addFooterText(html);
        html = addAllQuotesFooterLink(html);
        if (!html.includes("js/site-actions.js")) {
            html = html.replace("</body>", `    <script src="js/site-actions.js"></script>\n</body>`);
        }
        fs.writeFileSync(file, html, "utf8");
    }
}

const cards = updateHomepage();
fs.writeFileSync(path.join(ROOT_DIR, "all-quotes.html"), sitemapPage(cards), "utf8");
updateStaticPages();

console.log(`Enhanced homepage, static pages, and HTML sitemap with ${cards.length} quotes.`);
