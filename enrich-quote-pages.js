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

function jsonEscape(value) {
    return String(value || "")
        .replace(/\\/g, "\\\\")
        .replace(/"/g, "\\\"")
        .replace(/\n/g, "\\n");
}

function keywordTags(post) {
    const lower = `${post.category} ${post.quote}`.toLowerCase();
    const tags = [categoryLabel(post.category)];

    if (/motivat|keep|strong|strength|persever|success|dream|achiev/.test(lower)) tags.push("Motivation");
    if (/hope|faith|god|pray|bless|work out/.test(lower)) tags.push("Hope");
    if (/heal|pain|past|tear|forgive|recover|let go/.test(lower)) tags.push("Healing");
    if (/growth|worth|value|boundar|mindset|self/.test(lower)) tags.push("Self Growth");
    if (/life|chapter|story|time|choice/.test(lower)) tags.push("Life");
    if (/mind|calm|worry|peace|positive|thought/.test(lower)) tags.push("Mindset");
    if (/love|relationship|heart|friend|people|care/.test(lower)) tags.push("Love");
    if (/happy|joy|gratitude|thank|appreciate/.test(lower)) tags.push("Happiness");

    return [...new Set(tags)].slice(0, 6);
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

function shareButtons(url, text, imageUrl) {
    const encodedUrl = encodeURIComponent(url);
    const encodedText = encodeURIComponent(text);
    const encodedImage = encodeURIComponent(imageUrl);
    const facebookUrl = escapeHtml(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`);
    const xUrl = escapeHtml(`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`);
    const whatsappUrl = escapeHtml(`https://wa.me/?text=${encodedText}%20${encodedUrl}`);
    const pinterestUrl = escapeHtml(`https://pinterest.com/pin/create/button/?url=${encodedUrl}&media=${encodedImage}&description=${encodedText}`);
    const threadsUrl = escapeHtml(`https://www.threads.net/intent/post?text=${encodedText}%20${encodedUrl}`);

    return `<div class="share-buttons quote-share" aria-label="Share this quote">
                <a class="share-facebook" href="${facebookUrl}" target="_blank" rel="noopener" aria-label="Share on Facebook"><i class="fab fa-facebook-f"></i></a>
                <a class="share-x" href="${xUrl}" target="_blank" rel="noopener" aria-label="Share on X"><i class="fab fa-twitter"></i></a>
                <a class="share-whatsapp" href="${whatsappUrl}" target="_blank" rel="noopener" aria-label="Share on WhatsApp"><i class="fab fa-whatsapp"></i></a>
                <a class="share-pinterest" href="${pinterestUrl}" target="_blank" rel="noopener" aria-label="Share on Pinterest"><i class="fab fa-pinterest"></i></a>
                <a class="share-threads" href="${threadsUrl}" target="_blank" rel="noopener" aria-label="Share on Threads"><i class="fa-brands fa-threads"></i></a>
            </div>`;
}

function buildPage(post, related, previous, next) {
    const title = escapeHtml(post.title);
    const quote = escapeHtml(post.quote);
    const meaningParagraphs = buildMeaning(post)
        .map(paragraph => `            <p>${escapeHtml(paragraph)}</p>`)
        .join("\n");
    const image = escapeHtml(post.image);
    const canonical = `${SITE_URL}/photo/${post.slug}/`;
    const imageUrl = `${SITE_URL}/photo/${post.slug}/${post.image}`;
    const description = escapeHtml(`${post.quote} Read a thoughtful reflection and related motivational quotes from Better Day Vibes.`);
    const tags = keywordTags(post);

    const relatedCards = related
        .map(item => {
            const itemUrl = `${SITE_URL}/photo/${item.slug}/`;
            const itemImageUrl = `${SITE_URL}/photo/${item.slug}/${item.image}`;

            return `                <li class="related-card">
                    <a class="related-image-link" href="../${escapeHtml(item.slug)}/">
                        <img src="../${escapeHtml(item.slug)}/${escapeHtml(item.image)}" loading="lazy" alt="${escapeHtml(item.title)}">
                    </a>
                    ${shareButtons(itemUrl, item.quote, itemImageUrl)}
                    <a class="related-title-link" href="../${escapeHtml(item.slug)}/">
                        <span>${escapeHtml(item.title)}</span>
                    </a>
                </li>`;
        })
        .join("\n");

    const tagLinks = tags
        .map(tag => `                <a href="../../#quotesContainer" data-filter="${escapeHtml(post.category)}">${escapeHtml(tag)}</a>`)
        .join("\n");

    const faqSchema = [
        {
            question: `What is the meaning of this quote?`,
            answer: `${post.quote} is a reminder to pause, reflect, and choose a hopeful mindset while moving through life with patience and self-respect.`
        },
        {
            question: `Can I share this Better Day Vibes quote?`,
            answer: `Yes. You can share this quote using the social sharing buttons on this page.`
        },
        {
            question: `Where can I find more related quotes?`,
            answer: `You can explore related quote cards, popular quotes, recent quotes, and quote categories on Better Day Vibes.`
        }
    ];

    const schema = `[
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "${jsonEscape(post.title)}",
    "description": "${jsonEscape(normalizeText(post.quote))}",
    "image": "${jsonEscape(imageUrl)}",
    "datePublished": "2026-07-04",
    "dateModified": "2026-07-04",
    "author": {
      "@type": "Organization",
      "name": "Better Day Vibes"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Better Day Vibes",
      "logo": {
        "@type": "ImageObject",
        "url": "${SITE_URL}/better-day-vibes-logo.jpg"
      }
    },
    "mainEntityOfPage": "${canonical}",
    "keywords": "${jsonEscape(tags.join(", "))}"
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "${SITE_URL}/"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "${jsonEscape(categoryLabel(post.category))}",
        "item": "${SITE_URL}/#${jsonEscape(post.category)}"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": "${jsonEscape(post.title)}",
        "item": "${canonical}"
      }
    ]
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
${faqSchema.map(item => `      {
        "@type": "Question",
        "name": "${jsonEscape(item.question)}",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "${jsonEscape(item.answer)}"
        }
      }`).join(",\n")}
    ]
  }
]`;

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
    <meta name="twitter:site" content="@betterdayvibe">
    <meta name="twitter:creator" content="@betterdayvibe">
    <meta name="twitter:title" content="${title} | Better Day Vibes">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="${SITE_URL}/photo/${escapeHtml(post.slug)}/${image}">
    <script type="application/ld+json">
${schema}
    </script>

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

        .post-meta {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 10px 16px;
            margin: 0 auto 18px;
            color: #cbd5e1;
            font-size: 14px;
        }

        .breadcrumb {
            max-width: 760px;
            margin: 0 auto 18px;
            color: #cbd5e1;
            font-size: 14px;
        }

        .breadcrumb a {
            color: #fbbf24;
            text-decoration: none;
        }

        .quote-share {
            justify-content: center;
            margin: -10px 0 18px;
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
            grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
            gap: 14px;
        }

        .related-card {
            display: block;
            overflow: hidden;
            background: #111827;
            border: 1px solid rgba(251, 191, 36, 0.2);
            border-radius: 8px;
        }

        .related-card a {
            display: block;
            color: #f8fafc;
            text-decoration: none;
            font-weight: 600;
        }

        .related-card img {
            width: 100%;
            aspect-ratio: 4/5;
            object-fit: cover;
            display: block;
        }

        .related-card span {
            display: block;
            padding: 12px;
            line-height: 1.45;
        }

        .related-card .quote-share {
            justify-content: center;
            margin: 0;
            padding: 10px 10px 0;
        }

        .related-card .share-buttons a {
            width: 34px;
            height: 34px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            color: #ffffff;
        }

        .post-panel {
            margin-top: 28px;
            padding-top: 22px;
            border-top: 1px solid rgba(255, 255, 255, 0.14);
        }

        .post-panel h2 {
            margin: 0 0 12px;
            font-size: 24px;
        }

        .post-panel p,
        .post-panel li {
            color: #d1d5db;
            line-height: 1.7;
        }

        .tag-list {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
        }

        .tag-list a {
            color: #0f172a;
            background: #fbbf24;
            border-radius: 999px;
            padding: 8px 12px;
            text-decoration: none;
            font-weight: 700;
            font-size: 14px;
        }

        .post-nav {
            display: flex;
            justify-content: space-between;
            gap: 16px;
        }

        .post-nav a {
            color: #fbbf24;
            text-decoration: none;
            font-weight: 700;
        }

        .newsletter-form {
            display: flex;
            gap: 10px;
            margin-top: 14px;
        }

        .newsletter-form input {
            flex: 1;
            min-width: 0;
            padding: 12px 14px;
            border: 1px solid #334155;
            border-radius: 8px;
            background: #111827;
            color: #fff;
            font-family: inherit;
        }

        .newsletter-form button {
            border: 0;
            border-radius: 8px;
            padding: 12px 16px;
            background: #fbbf24;
            color: #0f172a;
            font-weight: 800;
            font-family: inherit;
        }

        @media (max-width: 640px) {
            .post-container {
                padding: 18px;
            }

            .post-nav,
            .newsletter-form {
                flex-direction: column;
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
            <li><a href="../../all-quotes.html">All Quotes</a></li>
            <li><a href="../../contact.html">Contact</a></li>
        </ul>
    </aside>

    <main class="post-container">
        <nav class="breadcrumb" aria-label="Breadcrumb">
            <a href="../../">Home</a> / <a href="../../#quotesContainer">${escapeHtml(categoryLabel(post.category))}</a> / <span>${title}</span>
        </nav>
        <div class="post-meta">
            <span>Published: July 4, 2026</span>
            <span>Updated: July 4, 2026</span>
            <span>Reading time: 3 min</span>
        </div>
        <img class="post-image" src="${image}" alt="${title}">
        ${shareButtons(canonical, post.quote, imageUrl)}
        <p class="post-quote">${quote}</p>

        <section class="post-description">
${meaningParagraphs}
        </section>

        <section class="post-panel about-bdv">
            <h2>About Better Day Vibes</h2>
            <p>Better Day Vibes shares motivational quotes, positive thoughts, and daily inspiration to encourage personal growth, resilience, gratitude, and mindfulness.</p>
        </section>

        <section class="post-panel tag-section">
            <h2>Tags</h2>
            <div class="tag-list">
${tagLinks}
            </div>
        </section>

        <section class="related-quotes" id="related-quotes">
            <h2>Related Quotes</h2>
            <ul>
${relatedCards}
            </ul>
        </section>

        <section class="post-panel faq-section">
            <h2>FAQ</h2>
            <details>
                <summary>What is the meaning of this quote?</summary>
                <p>${quote} is a reminder to pause, reflect, and choose a hopeful mindset while moving through life with patience and self-respect.</p>
            </details>
            <details>
                <summary>Can I share this Better Day Vibes quote?</summary>
                <p>Yes. Use the social sharing icons near the quote to share it on Facebook, X, WhatsApp, Pinterest, or Threads.</p>
            </details>
            <details>
                <summary>Where can I read more quotes like this?</summary>
                <p>Explore the related quote cards on this page, visit the <a href="../../#popular-quotes">popular quotes</a>, or browse <a href="../../#recent-quotes">recent quotes</a>.</p>
            </details>
        </section>

        <section class="post-panel newsletter-section">
            <h2>Newsletter</h2>
            <p>Get one motivational quote every morning.</p>
            <form class="newsletter-form">
                <input type="email" placeholder="Email" aria-label="Email address">
                <button type="submit">Subscribe</button>
            </form>
        </section>

        <nav class="post-panel post-nav" aria-label="Previous and next quotes">
            <a href="../${escapeHtml(previous.slug)}/">← Previous Quote</a>
            <a href="../${escapeHtml(next.slug)}/">Next Quote →</a>
        </nav>
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
            <span>|</span>
            <a href="../../all-quotes.html">All Quotes</a>
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

const html = resolveConflictMarkers(fs.readFileSync(INDEX_FILE, "utf8"));
const posts = getCards(html);

posts.forEach((post, index) => {
    const dir = path.join(PHOTO_DIR, post.slug);
    if (!fs.existsSync(dir)) return;

    const related = getRelated(posts, post, index);
    const previous = posts[(index - 1 + posts.length) % posts.length];
    const next = posts[(index + 1) % posts.length];
    const page = buildPage(post, related, previous, next);

    fs.writeFileSync(path.join(dir, "index.html"), page, "utf8");
    fs.writeFileSync(path.join(dir, `${post.slug}.html`), page, "utf8");
});

console.log(`Updated ${posts.length} quote pages.`);
