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

function pickVariant(items, seed) {
    return items[Math.abs(seed) % items.length];
}

function seedFor(post) {
    return post.slug.split("").reduce((total, char) => total + char.charCodeAt(0), 0);
}

function sentenceCase(value) {
    const text = String(value || "").trim();
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
}

function detectFocus(post) {
    const lower = `${post.category} ${post.quote} ${post.slug}`.toLowerCase();

    if (/dream|pray|prayer|faith|god|bless|receive|meant/.test(lower)) {
        return {
            name: "faith during the waiting season",
            everyday: "when a goal is taking longer than expected, when prayers feel unanswered, or when you are trying to stay hopeful while life is still unfinished",
            example: "You might be applying for a better job, rebuilding after a hard season, saving for something important, or quietly working on a dream that no one else can fully see yet.",
            practice: "write down one sign of progress you can see today, even if it is small, and pair it with one faithful action you can take before the day ends",
            question: "What would I keep doing today if I truly believed my patient effort still mattered?",
            action: "Choose one next step that supports the future you have been praying for."
        };
    }

    if (/relationship|love|friend|people|partner|care|heart|hug|loyal|honest/.test(lower)) {
        return {
            name: "healthier relationships",
            everyday: "when you are deciding who deserves your time, how much access someone should have to your heart, or whether a connection brings peace or pressure",
            example: "It may show up in a friendship where you always initiate, a relationship where you feel unseen, or a family conversation where you need to stay kind without abandoning your own needs.",
            practice: "notice one relationship that leaves you lighter and one that leaves you drained, then choose a boundary or conversation that honors what you notice",
            question: "Do my closest connections help me become more honest, peaceful, and grounded?",
            action: "Give more energy to the people who make respect feel natural, not negotiated."
        };
    }

    if (/heal|pain|past|tear|forgive|hurt|let go|heavy|burden|recover/.test(lower)) {
        return {
            name: "emotional healing",
            everyday: "when memories still sting, when your energy feels low, or when you are learning how to move forward without pretending nothing happened",
            example: "You may be healing from disappointment, a breakup, grief, burnout, or a version of yourself that survived by staying quiet for too long.",
            practice: "name what still hurts without judging yourself for it, then choose one gentle act of care that makes today a little easier to carry",
            question: "What part of me needs patience instead of pressure right now?",
            action: "Let one small act of care prove that healing does not have to be rushed."
        };
    }

    if (/worth|value|enough|confidence|self|boundary|standards|shine|deserve/.test(lower)) {
        return {
            name: "self-worth and confidence",
            everyday: "when you are tempted to measure yourself by approval, productivity, comparison, or how perfectly you handled a difficult moment",
            example: "It can matter before an interview, after a mistake, while setting a boundary, or when you catch yourself shrinking so other people feel more comfortable.",
            practice: "write one sentence that separates your worth from your performance, then make one choice that treats that sentence as true",
            question: "Where am I asking permission to be valuable when I already am?",
            action: "Act from self-respect before you wait for someone else to validate it."
        };
    }

    if (/mind|calm|worry|stress|peace|negative|positive|thought|mental/.test(lower)) {
        return {
            name: "a calmer mindset",
            everyday: "when your thoughts are moving faster than the situation requires, or when stress makes every problem feel permanent",
            example: "This can happen during a busy workday, before a difficult conversation, while scrolling through other people's lives, or late at night when worries get louder.",
            practice: "pause for sixty seconds, breathe slowly, and write the next controllable step instead of trying to solve the entire future at once",
            question: "What is actually mine to handle today, and what can I release for now?",
            action: "Respond to the next moment from calm, not from panic."
        };
    }

    if (/gratitude|thank|appreciate|blessed|grateful|woke|morning/.test(lower)) {
        return {
            name: "gratitude in ordinary moments",
            everyday: "when life feels routine, when you forget how many quiet gifts are already present, or when comparison makes your blessings look smaller than they are",
            example: "It may be the roof over your head, a message from someone who cares, your ability to try again, or the simple fact that you woke up with another chance.",
            practice: "list three specific things you would miss if they disappeared tomorrow, then show appreciation through one small action",
            question: "What blessing have I started treating as ordinary?",
            action: "Let gratitude change the tone of one ordinary part of your day."
        };
    }

    return {
        name: "steady motivation",
        everyday: "when you need encouragement to keep going, make a better choice, or believe that one hard moment does not define the whole story",
        example: "It can apply to rebuilding a routine, starting over after disappointment, staying patient with slow progress, or choosing hope even when motivation feels quiet.",
        practice: "choose one small promise you can keep today and complete it before looking for a bigger sign of progress",
        question: "What is the next small choice that would make tomorrow feel a little lighter?",
        action: "Take one honest step, then let that step become evidence that you are still moving."
    };
}

function buildArticle(post, index) {
    const theme = getTheme(post.category, post.quote);
    const focus = detectFocus(post);
    const seed = seedFor(post) + index;
    const title = post.title.replace(/\.$/, "");
    const opening = pickVariant([
        `The quote "${post.quote}" speaks to ${focus.name}.`,
        `"${post.quote}" is more than a short line of encouragement; it is a reminder about ${focus.name}.`,
        `At its heart, "${post.quote}" points toward ${focus.name}.`
    ], seed);

    const meaning = [
        `${opening} The message is not asking you to ignore reality or pretend that every day feels easy. It asks you to look at your situation with more patience, honesty, and courage. When a quote like this lands at the right time, it can interrupt the anxious story running in your mind and replace it with a steadier one. It says that your current feelings are real, but they are not the whole truth. There is still room for wisdom, growth, support, and a better response than the one fear might choose first.`,
        `The deeper meaning of ${title} is connected to ${theme.noun}. It encourages you to ${theme.action}. That matters because many people wait for life to feel completely clear before they make a healthy choice. In reality, clarity often comes after the choice. You choose the calmer response, the kinder boundary, the faithful step, or the grateful perspective first, and then your heart slowly catches up. This quote becomes useful when it moves from something you read into something you practice in a real moment.`
    ];

    const examples = [
        `In everyday life, this message can show up ${focus.everyday}. ${focus.example} In those moments, the quote gives you language for what your wiser self already knows. It reminds you to stop measuring the entire future by the mood of one difficult day. A delayed answer, a quiet season, a hard conversation, or a tired heart does not mean you are failing. It may simply mean you are being invited to move more carefully and choose what supports your peace instead of what feeds your fear.`,
        `A practical example is the moment between feeling triggered and deciding what to do next. You may want to overthink, withdraw, chase reassurance, compare yourself, or give up because progress is not visible yet. This is where the quote becomes a small pause button. Instead of reacting from the most wounded part of you, you can ask what the next respectful choice looks like. Sometimes that choice is sending the message. Sometimes it is not sending the message. Sometimes it is resting, praying, planning, apologizing, forgiving yourself, or returning to the work with a softer heart.`
    ];

    const steps = [
        `Name the real situation without exaggerating it. Write what happened, what you feel, and what you actually know.`,
        `Choose one response that matches the person you are becoming, not just the emotion you are feeling.`,
        `Use the quote as a reminder before a specific habit: morning prayer, journaling, walking, working, studying, or preparing for sleep.`,
        sentenceCase(focus.practice),
        focus.action
    ];

    const practice = [
        `A simple way to practice this quote is to turn it into a short check-in. Ask yourself, "What is this trying to teach me today?" Then answer honestly. Do not look for a perfect answer. Look for the answer that helps you take care of your mind, your relationships, and your next step. If the quote is about hope, let it help you keep going. If it is about healing, let it give you permission to be gentle with yourself. If it is about self-worth, let it remind you not to bargain with your value. The goal is not to force a positive mood. The goal is to create a wiser direction.`,
        `You can also use the quote as a journaling prompt. Write the line at the top of a page, then describe where it meets your real life right now. What part feels true? What part feels difficult to believe? What would change if you acted as if the message were trustworthy for just one day? This kind of reflection makes the page more than inspiration. It turns the quote into a mirror, helping you see the pattern, pressure, or possibility that deserves your attention.`
    ];

    const reflection = [
        focus.question,
        `What habit, relationship, thought, or fear makes it hardest for me to live this message?`,
        `What is one choice I can make today that would support ${focus.name}?`,
        `If someone I loved needed this quote, what would I gently tell them?`
    ];

    const closing = [
        `Let this quote meet you where you are, not where you think you should be. You do not have to turn your whole life around in one dramatic moment. Most better days are built quietly: one honest thought, one healthier boundary, one grateful pause, one brave conversation, one decision not to give up on yourself. Come back to this message whenever you need a reminder that your story is still active and your next chapter can still be shaped with care.`,
        `If ${title} resonates with you, save it for a day when your heart needs a steadier voice. Share it with someone who may be walking through a similar season. Most of all, let it become practical. Let it change how you speak to yourself today. Let it guide one action, one pause, or one decision. That is how a quote becomes more than words: it becomes a small piece of wisdom you can carry into the ordinary parts of life.`
    ];

    return {
        readingMinutes: Math.max(4, Math.ceil([...meaning, ...examples, ...practice, ...closing].join(" ").split(/\s+/).length / 210)),
        description: `${post.quote} Explore the meaning of this quote with practical examples, reflection prompts, and gentle guidance for ${focus.name}.`,
        faqAnswer: `${post.quote} is a reminder about ${focus.name}. It encourages you to ${theme.action} while responding to real life with patience, self-respect, and hope.`,
        sections: [
            { heading: "What This Quote Means", paragraphs: meaning },
            { heading: "How It Can Show Up In Real Life", paragraphs: examples },
            { heading: "Practical Ways To Use This Quote", list: steps },
            { heading: "A Simple Reflection Practice", paragraphs: practice },
            { heading: "Questions To Ask Yourself", list: reflection },
            { heading: "Final Encouragement", paragraphs: closing }
        ]
    };
}

function articleMarkup(article) {
    return article.sections
        .map(section => {
            const paragraphs = (section.paragraphs || [])
                .map(paragraph => `            <p>${escapeHtml(paragraph)}</p>`)
                .join("\n");
            const list = (section.list || [])
                .map(item => `                <li>${escapeHtml(item)}</li>`)
                .join("\n");

            return `            <section class="article-section">
                <h2>${escapeHtml(section.heading)}</h2>
${paragraphs}${list ? `\n                <ul>\n${list}\n                </ul>` : ""}
            </section>`;
        })
        .join("\n\n");
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

function buildPage(post, related, previous, next, index) {
    const title = escapeHtml(post.title);
    const quote = escapeHtml(post.quote);
    const article = buildArticle(post, index);
    const articleSections = articleMarkup(article);
    const image = escapeHtml(post.image);
    const canonical = `${SITE_URL}/photo/${post.slug}/`;
    const imageUrl = `${SITE_URL}/photo/${post.slug}/${post.image}`;
    const description = escapeHtml(article.description);
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
            answer: article.faqAnswer
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
    "dateModified": "2026-07-08",
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

        .article-section {
            margin: 0 0 30px;
        }

        .article-section h2 {
            margin: 0 0 14px;
            color: #fbbf24;
            font-size: 25px;
            line-height: 1.3;
        }

        .article-section ul {
            margin: 0 0 18px 20px;
            padding: 0;
        }

        .article-section li {
            color: #e5e7eb;
            font-size: 17px;
            line-height: 1.75;
            margin: 0 0 10px;
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
            display: flex;
            gap: 8px;
            justify-content: flex-start;
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

        .related-card .share-facebook {
            background: #1877f2;
        }

        .related-card .share-x {
            background: #000000;
        }

        .related-card .share-whatsapp {
            background: #25d366;
        }

        .related-card .share-pinterest {
            background: #e60023;
        }

        .related-card .share-threads {
            background: #111111;
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
        </ul>
    </aside>

    <main class="post-container">
        <nav class="breadcrumb" aria-label="Breadcrumb">
            <a href="../../">Home</a> / <a href="../../#quotesContainer">${escapeHtml(categoryLabel(post.category))}</a> / <span>${title}</span>
        </nav>
        <div class="post-meta">
            <span>Published: July 4, 2026</span>
            <span>Updated: July 8, 2026</span>
            <span>Reading time: ${article.readingMinutes} min</span>
        </div>
        <img class="post-image" src="${image}" alt="${title}">
        ${shareButtons(canonical, post.quote, imageUrl)}
        <p class="post-quote">${quote}</p>

        <article class="post-description">
${articleSections}
        </article>

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
                <p>${escapeHtml(article.faqAnswer)}</p>
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
            <a href="../${escapeHtml(previous.slug)}/">&larr; Previous Quote</a>
            <a href="../${escapeHtml(next.slug)}/">Next Quote &rarr;</a>
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
    <script src="../../js/site-actions.js"></script>
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
    const page = buildPage(post, related, previous, next, index);

    fs.writeFileSync(path.join(dir, "index.html"), page, "utf8");
    fs.writeFileSync(path.join(dir, `${post.slug}.html`), page, "utf8");
});

console.log(`Updated ${posts.length} quote pages.`);
