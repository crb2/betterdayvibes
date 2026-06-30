const fs = require("fs");
const path = require("path");

const SITE_URL = "https://betterdayvibes.life";
const ROOT_DIR = __dirname;
const INDEX_FILE = path.join(ROOT_DIR, "index.html");
const PHOTO_DIR = path.join(ROOT_DIR, "photo");

function decodeHtml(value) {
    return String(value || "")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&quot;/gi, "\"")
        .replace(/&#39;/g, "'")
        .replace(/&#x27;/gi, "'")
        .replace(/â€™/g, "'")
        .replace(/â€œ/g, "\"")
        .replace(/â€/g, "\"")
        .replace(/â€“/g, "-")
        .replace(/â€”/g, "-")
        .replace(/â€¦/g, "...")
        .replace(/â†/g, "<-")
        .replace(/âœ•/g, "x");
}

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function normalizeText(value) {
    return decodeHtml(value)
        .replace(/<br\s*\/?>/gi, " ")
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function getAttribute(tag, name) {
    const pattern = new RegExp(`${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, "i");
    return tag.match(pattern)?.[2] || "";
}

function titleCaseSlug(slug) {
    return slug
        .split("-")
        .filter(Boolean)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

function repairTitle(text, slug) {
    let title = normalizeText(text || titleCaseSlug(slug));

    if (/^don't\b/i.test(title)) {
        return title.replace(/\s+/g, " ").trim();
    }

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
        [/^ealing\b/i, "Healing"],
        [/^don\b/i, "Don't"]
    ];

    for (const [pattern, replacement] of repairs) {
        if (pattern.test(title)) {
            title = title.replace(pattern, replacement);
            break;
        }
    }

    return title.replace(/\s+/g, " ").trim();
}

function getCards(html) {
    const cardPattern = /<div\b(?=[^>]*class=["'][^"']*quote-card[^"']*["'])[\s\S]*?(?=<div\b(?=[^>]*class=["'][^"']*quote-card[^"']*["'])|<div id="loading"|<\/section>)/gi;
    const cards = [];
    let match;

    while ((match = cardPattern.exec(html)) !== null) {
        const block = match[0];
        const anchorTag = block.match(/<a\b[^>]*>/i)?.[0] || "";
        const imageTag = block.match(/<img\b[^>]*>/i)?.[0] || "";
        const href = getAttribute(anchorTag, "href").match(/^photo\/([^\/]+)\/?$/i)?.[1];
        const image = getAttribute(imageTag, "src");
        const alt = getAttribute(imageTag, "alt");
        const category = block.match(/data-category=["']([^"']+)["']/i)?.[1] || "motivation";
        const paragraph = block.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1] || alt;

        if (!href) continue;

        const quote = normalizeText(paragraph);
        const titleSource = normalizeText(alt).length > 6 ? alt : quote;
        const title = repairTitle(titleSource, href);

        cards.push({
            slug: href,
            category,
            title,
            quote: quote || title,
            image: image.split("/").pop() || `${href}.webp`
        });
    }

    return cards;
}

function categoryLabel(category) {
    return category
        .split("-")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

function getTheme(category, quote) {
    const lower = `${category} ${quote}`.toLowerCase();

    if (/relationship|love|people|friend|heart|care/.test(lower)) {
        return {
            noun: "relationships",
            action: "choose connections that feel honest, peaceful, and mutual",
            lesson: "It is a reminder to notice who brings calm to your life and who only asks you to shrink yourself."
        };
    }

    if (/gratitude|thank|bless|god|faith|hope|pray/.test(lower)) {
        return {
            noun: "gratitude and faith",
            action: "slow down, recognize what is already supporting you, and keep hope close",
            lesson: "It gently points your attention toward the blessings, lessons, and quiet help that can be easy to overlook."
        };
    }

    if (/heal|pain|past|tear|forgive|let go/.test(lower)) {
        return {
            noun: "healing",
            action: "give yourself patience while you recover, grow, and release what has been heavy",
            lesson: "It honors the fact that progress can be quiet, uneven, and still deeply meaningful."
        };
    }

    if (/mind|calm|worry|peace|self-care|mental/.test(lower)) {
        return {
            noun: "inner peace",
            action: "protect your energy and respond to life with more calm than fear",
            lesson: "It encourages you to create space between what happens around you and how you choose to carry it."
        };
    }

    if (/growth|worth|value|strong|strength|boundar|confidence|achieve/.test(lower)) {
        return {
            noun: "personal growth",
            action: "trust your value, build healthy boundaries, and keep becoming stronger one choice at a time",
            lesson: "It reminds you that your worth is not measured by perfection, approval, or one difficult season."
        };
    }

    return {
        noun: "motivation",
        action: "keep moving with patience, courage, and a more hopeful mindset",
        lesson: "It reminds you that even small shifts in thought and action can help create a better day."
    };
}

function buildMeaning(post) {
    const theme = getTheme(post.category, post.quote);

    return [
        `This quote is about ${theme.noun}. It encourages you to ${theme.action}.`,
        theme.lesson,
        `When you read "${post.quote}", let it become a small pause in your day: breathe, reflect, and choose the next step that feels healthier for your heart.`,
        "A better life is often built through simple moments like this, where you return to yourself and decide to keep going with kindness."
    ].join(" ");
}

function getRelated(posts, post, index) {
    const sameCategory = posts.filter(item => item.slug !== post.slug && item.category === post.category);
    const fallback = posts.filter(item => item.slug !== post.slug);
    const pool = sameCategory.length >= 4 ? sameCategory : [...sameCategory, ...fallback];
    const start = index % Math.max(pool.length, 1);

    return [...pool.slice(start), ...pool.slice(0, start)].slice(0, 4);
}

function buildPage(post, related) {
    const title = escapeHtml(post.title);
    const quote = escapeHtml(post.quote);
    const category = escapeHtml(categoryLabel(post.category));
    const meaning = escapeHtml(buildMeaning(post));
    const image = escapeHtml(post.image);
    const canonical = `${SITE_URL}/photo/${post.slug}/`;
    const description = escapeHtml(`${post.quote} Meaning and related motivational quotes from Better Day Vibes.`);

    const relatedLinks = related
        .map(item => `                <li><a href="../${escapeHtml(item.slug)}/">${escapeHtml(item.title)}</a></li>`)
        .join("\n");

    return `<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title} | Better Day Vibes</title>
    <meta name="description" content="${description}">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="${canonical}">
    <meta property="og:type" content="article">
    <meta property="og:site_name" content="Better Day Vibes">
    <meta property="og:title" content="${title} | Better Day Vibes">
    <meta property="og:description" content="${description}">
    <meta property="og:url" content="${canonical}">
    <meta property="og:image" content="${SITE_URL}/photo/${escapeHtml(post.slug)}/${image}">
    <meta property="og:image:alt" content="${title}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${title} | Better Day Vibes">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="${SITE_URL}/photo/${escapeHtml(post.slug)}/${image}">

    <link rel="icon" type="image/png" sizes="16x16" href="../../favicon/favicon-16x16.png">
    <link rel="icon" type="image/png" sizes="32x32" href="../../favicon/favicon-32x32.png">
    <link rel="apple-touch-icon" href="../../favicon/apple-touch-icon.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">

    <style>
        body {
            margin: 0;
            background: #0f172a;
            color: #f8fafc;
            font-family: Poppins, sans-serif;
        }

        header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 20px;
            padding: 16px 24px;
            background: #111827;
            flex-wrap: wrap;
        }

        .brand {
            color: #f8fafc;
            font-weight: 800;
            text-decoration: none;
        }

        nav {
            display: flex;
            gap: 16px;
            flex-wrap: wrap;
        }

        nav a,
        .back-link,
        .related-quotes a,
        .social-links a {
            color: #fbbf24;
            text-decoration: none;
            font-weight: 600;
        }

        nav a:hover,
        .back-link:hover,
        .related-quotes a:hover,
        .social-links a:hover {
            color: #fde68a;
        }

        .container {
            max-width: 760px;
            margin: 0 auto;
            padding: 24px;
        }

        h1 {
            font-size: clamp(30px, 5vw, 46px);
            line-height: 1.15;
            margin: 18px 0;
        }

        .category {
            color: #93c5fd;
            font-weight: 700;
            margin: 0;
        }

        img {
            width: 100%;
            max-width: 520px;
            display: block;
            margin: 22px auto;
            border-radius: 14px;
        }

        p {
            font-size: 18px;
            line-height: 1.75;
            color: #e5e7eb;
        }

        .quote-text {
            font-size: 20px;
            color: #ffffff;
            font-weight: 600;
        }

        .meaning,
        .related-quotes,
        .social-links {
            margin-top: 28px;
            padding-top: 22px;
            border-top: 1px solid rgba(255, 255, 255, 0.14);
        }

        h2 {
            margin: 0 0 10px;
            font-size: 24px;
        }

        .related-quotes ul {
            list-style: none;
            padding: 0;
            margin: 0;
            display: grid;
            gap: 12px;
        }

        footer {
            text-align: center;
            padding: 28px 20px;
            color: #9ca3af;
            background: #111827;
        }

        @media (max-width: 640px) {
            header,
            nav {
                justify-content: center;
            }

            .container {
                padding: 18px;
            }
        }
    </style>
</head>

<body>
    <header>
        <a class="brand" href="../../">Better Day Vibes</a>
        <nav aria-label="Main navigation">
            <a href="../../#categories">Categories</a>
            <a href="../../#recent-quotes">Recent Quotes</a>
            <a href="../../#popular-quotes">Popular Quotes</a>
            <a href="#related-quotes">Related Quotes</a>
            <a href="../../contact.html">Contact</a>
        </nav>
    </header>

    <main class="container">
        <a href="../../" class="back-link">Back to all quotes</a>
        <p class="category">${category}</p>
        <h1>${title}</h1>
        <img src="${image}" alt="${title}">
        <p class="quote-text">${quote}</p>

        <section class="meaning">
            <h2>What this quote means</h2>
            <p>${meaning}</p>
        </section>

        <section class="related-quotes" id="related-quotes">
            <h2>Related Quotes</h2>
            <ul>
${relatedLinks}
            </ul>
        </section>

        <section class="social-links">
            <h2>Follow Better Day Vibes</h2>
            <p>
                <a href="https://www.instagram.com/betterdayvibe">Instagram</a> |
                <a href="https://www.facebook.com/betterdayvibe">Facebook</a> |
                <a href="https://threads.com/@betterdayvibe">Threads</a> |
                <a href="https://pinterest.com/betterdayvibe">Pinterest</a> |
                <a href="https://x.com/betterdayvibe">X</a>
            </p>
        </section>
    </main>

    <footer>
        <p>&copy; 2026 Better Day Vibes. All Rights Reserved.</p>
    </footer>
</body>

</html>
`;
}

const html = fs.readFileSync(INDEX_FILE, "utf8");
const posts = getCards(html);

posts.forEach((post, index) => {
    const dir = path.join(PHOTO_DIR, post.slug);
    if (!fs.existsSync(dir)) return;

    const related = getRelated(posts, post, index);
    const page = buildPage(post, related);

    fs.writeFileSync(path.join(dir, "index.html"), page, "utf8");
    fs.writeFileSync(path.join(dir, `${post.slug}.html`), page, "utf8");
});

console.log(`Updated ${posts.length} quote pages.`);
