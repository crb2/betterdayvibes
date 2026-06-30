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
        `This quote is a gentle reminder about ${theme.noun}. It encourages you to ${theme.action}, especially on the days when life feels noisy, uncertain, or emotionally heavy. A meaningful quote does not have to solve everything at once. Sometimes it simply gives you a calmer way to look at the moment in front of you. When you pause with these words, you give yourself room to breathe before reacting, room to understand what you really feel, and room to choose a response that protects your peace.`,
        `${theme.lesson} The message behind "${post.quote}" is not about pretending that every situation is easy. It is about learning how to carry yourself with more honesty, patience, and self-respect while you move through it. There may be people, memories, worries, or expectations pulling your attention in different directions, but this reminder brings you back to what you can control: your mindset, your boundaries, your effort, your gratitude, and the way you speak to yourself when no one else is listening.`,
        `Use this quote as a small daily reset. Let it remind you that growth can be quiet, healing can take time, and better days are often built from simple choices repeated with care. You do not need to have every answer today. You only need to keep choosing the next healthy step, the next honest thought, and the next moment of courage. Over time, those small choices shape the kind of life that feels lighter, wiser, and more aligned with who you are becoming.`,
        `If this message connects with your current season, save it, share it, or return to it when you need encouragement. Quotes like this can become anchors during stressful seasons because they point your attention back toward hope instead of fear. They remind you that your story is still moving, your heart is still learning, and your future can still hold peace, love, confidence, and joy. Let this be more than a sentence on a page. Let it be a quiet push toward a better day.`
    ];
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
    const meaningParagraphs = buildMeaning(post)
        .map(paragraph => `            <p>${escapeHtml(paragraph)}</p>`)
        .join("\n");
    const image = escapeHtml(post.image);
    const canonical = `${SITE_URL}/photo/${post.slug}/`;
    const description = escapeHtml(`${post.quote} Read a thoughtful reflection and related motivational quotes from Better Day Vibes.`);

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
    <link rel="stylesheet" href="../../style.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">

    <style>
        .post-container {
            max-width: 820px;
            margin: 0 auto;
            padding: 30px 24px 44px;
        }

        .post-image {
            width: 100%;
            max-width: 520px;
            display: block;
            margin: 0 auto 24px;
            border-radius: 14px;
        }

        .post-quote {
            max-width: 680px;
            margin: 0 auto 26px;
            color: #ffffff;
            font-size: 22px;
            line-height: 1.65;
            font-weight: 700;
            text-align: center;
        }

        .post-description {
            max-width: 760px;
            margin: 0 auto;
        }

        .post-description p {
            font-size: 18px;
            line-height: 1.75;
            color: #e5e7eb;
            margin: 0 0 18px;
        }

        .related-quotes {
            margin-top: 28px;
            padding-top: 22px;
            border-top: 1px solid rgba(255, 255, 255, 0.14);
        }

        .related-quotes h2 {
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

        .related-quotes a {
            color: #fbbf24;
            text-decoration: none;
            font-weight: 600;
        }

        @media (max-width: 640px) {
            .post-container {
                padding: 18px;
            }
        }
    </style>
</head>

<body>
    <header>
        <div class="logo">
            <a href="../../">
                <img src="../../better-day-vibes-logo.jpg" alt="Better Day Vibes Logo">
                <span>Better Day Vibes</span>
            </a>
        </div>

        <nav>
            <a href="../../">Home</a>
            <a href="../../#recent-quotes">Recent Quotes</a>
            <a href="../../#popular-quotes">Popular Quotes</a>
            <a href="#related-quotes">Related Quotes</a>

            <button id="menuBtn" class="menu-btn">
                &#9776;
            </button>
        </nav>
    </header>

    <aside id="sidebar" class="sidebar">
        <button id="closeBtn" class="close-btn">
            &#10005;
        </button>
        <h3>Categories</h3>

        <ul>
            <li><a href="../../#categories">All Categories</a></li>
            <li><a href="../../#recent-quotes">Recent Quotes</a></li>
            <li><a href="../../#popular-quotes">Popular Quotes</a></li>
            <li><a href="../../contact.html">Contact</a></li>
        </ul>
    </aside>

    <main class="post-container">
        <img class="post-image" src="${image}" alt="${title}">
        <p class="post-quote">${quote}</p>

        <section class="post-description">
${meaningParagraphs}
        </section>

        <section class="related-quotes" id="related-quotes">
            <h2>Related Quotes</h2>
            <ul>
${relatedLinks}
            </ul>
        </section>
    </main>

    <footer>
        <div class="footer-links">
            <a href="../../about.html">About Us</a>
            <span>|</span>
            <a href="../../contact.html">Contact</a>
            <span>|</span>
            <a href="../../privacy-policy.html">Privacy Policy</a>
            <span>|</span>
            <a href="../../terms-and-conditions.html">Terms & Conditions</a>
        </div>

        <div class="footer-social" aria-label="Better Day Vibes social links">
            <a href="https://www.instagram.com/betterdayvibe" target="_blank" rel="noopener" aria-label="Instagram"><i class="fa-brands fa-instagram"></i></a>
            <a href="https://www.facebook.com/betterdayvibe" target="_blank" rel="noopener" aria-label="Facebook"><i class="fa-brands fa-facebook"></i></a>
            <a href="https://threads.com/@betterdayvibe" target="_blank" rel="noopener" aria-label="Threads"><i class="fa-brands fa-threads"></i></a>
            <a href="https://pinterest.com/betterdayvibe" target="_blank" rel="noopener" aria-label="Pinterest"><i class="fa-brands fa-pinterest"></i></a>
            <a href="https://x.com/betterdayvibe" target="_blank" rel="noopener" aria-label="X"><i class="fa-brands fa-x-twitter"></i></a>
        </div>

        <p>&copy; 2026 Better Day Vibes. All Rights Reserved.</p>
    </footer>

    <script>
        const menuBtn = document.getElementById("menuBtn");
        const sidebar = document.getElementById("sidebar");
        const closeBtn = document.getElementById("closeBtn");

        menuBtn.addEventListener("click", () => {
            sidebar.classList.toggle("active");
        });

        closeBtn.addEventListener("click", () => {
            sidebar.classList.remove("active");
        });

        document.addEventListener("click", event => {
            if (!sidebar.contains(event.target) && !menuBtn.contains(event.target)) {
                sidebar.classList.remove("active");
            }
        });
    </script>
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
