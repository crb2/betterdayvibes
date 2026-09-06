const fs = require("fs");
const path = require("path");

const ROOT_DIR = __dirname;
const PAGES = ["about.html", "privacy-policy.html", "terms-and-conditions.html", "contact.html"];

function header() {
    return `<header>
        <div class="logo">
            <a href="./">
                <img src="better-day-vibes-logo.jpg" alt="Better Day Vibes Logo">
                <span>Better Day Vibes</span>
            </a>
        </div>

        <div class="header-search">
            <form action="./" method="GET" class="search-wrapper">
                <input type="text" name="search" id="searchInput" placeholder="Search motivational quotes..." aria-label="Search motivational quotes">
                <button type="button" id="clearSearch" class="clear-search" aria-label="Clear search input">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </form>
        </div>

        <div class="header-controls">
            <button id="themeToggleBtn" class="theme-toggle-btn" aria-label="Switch to light mode" title="Switch to light mode">
                <svg class="theme-icon-sun" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="4"></circle>
                    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"></path>
                </svg>
                <svg class="theme-icon-moon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                </svg>
            </button>

            <button id="menuBtn" class="menu-btn" aria-label="Open navigation menu">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <line x1="3" y1="12" x2="21" y2="12"></line>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
            </button>
        </div>
    </header>`;
}

function sidebar() {
    return `<aside id="sidebar" class="sidebar" aria-label="Categories menu">
        <div class="sidebar-header">
            <h3>Categories</h3>
            <button id="closeBtn" class="close-btn" aria-label="Close categories menu">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>

        <ul>
            <li><a href="./#categories">All Categories</a></li>
            <li><a href="./?category=gratitude#quotesContainer">Gratitude</a></li>
            <li><a href="./?category=positivity#quotesContainer">Positivity</a></li>
            <li><a href="./?category=healing#quotesContainer">Healing</a></li>
            <li><a href="./?category=relationships#quotesContainer">Relationships</a></li>
            <li><a href="./?category=self-growth#quotesContainer">Self-Growth</a></li>
            <li><a href="./?category=faith-hope#quotesContainer">Faith &amp; Hope</a></li>
            <li><a href="contact.html">Contact Us</a></li>
        </ul>
    </aside>`;
}

function footer() {
    return `<footer>
        <div class="footer-links">
            <a href="about.html">About Us</a>
            <span>|</span>
            <a href="contact.html">Contact</a>
            <span>|</span>
            <a href="privacy-policy.html">Privacy Policy</a>
            <span>|</span>
            <a href="terms-and-conditions.html">Terms &amp; Conditions</a>
        </div>

        <div class="footer-social" aria-label="Better Day Vibes social links">
            <a href="https://www.instagram.com/betterdayvibe" target="_blank" rel="noopener" aria-label="Instagram"><i class="fa-brands fa-instagram"></i></a>
            <a href="https://www.facebook.com/betterdayvibe" target="_blank" rel="noopener" aria-label="Facebook"><i class="fa-brands fa-facebook"></i></a>
            <a href="https://threads.com/@betterdayvibe" target="_blank" rel="noopener" aria-label="Threads"><i class="fa-brands fa-threads"></i></a>
            <a href="https://pinterest.com/betterdayvibe" target="_blank" rel="noopener" aria-label="Pinterest"><i class="fa-brands fa-pinterest"></i></a>
            <a href="https://x.com/betterdayvibe" target="_blank" rel="noopener" aria-label="X"><i class="fa-brands fa-x-twitter"></i></a>
        </div>

        <p>&copy; 2026 Better Day Vibes v1.0.1. All Rights Reserved.</p>
    </footer>

    <!-- Floating Scroll Navigation Button -->
    <button id="scrollNavBtn" class="scroll-nav-btn" aria-label="Scroll to bottom" title="Scroll to bottom" aria-hidden="true">
        <svg class="scroll-icon scroll-icon-down" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <polyline points="19 12 12 19 5 12"></polyline>
        </svg>
        <svg class="scroll-icon scroll-icon-up" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="12" y1="19" x2="12" y2="5"></line>
            <polyline points="5 12 12 5 19 12"></polyline>
        </svg>
    </button>`;
}

function ensureThemeHeadScript(html) {
    if (html.includes("themePreference")) {
        return html;
    }

    const script = `    <script>
        (function () {
            var saved = localStorage.getItem("themePreference") || "dark";
            document.documentElement.setAttribute("data-theme", saved);
        })();
    </script>\n`;

    return html.replace(/<meta charset="UTF-8">/i, `${script}    <meta charset="UTF-8">`);
}

function ensureFontAwesome(html) {
    if (html.includes("cdnjs.cloudflare.com/ajax/libs/font-awesome")) {
        return html;
    }

    return html.replace(
        "</head>",
        `    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">\n</head>`
    );
}

function ensureGstatic(html) {
    if (html.includes("fonts.gstatic.com")) {
        return html;
    }

    return html.replace(
        '<link rel="preconnect" href="https://fonts.googleapis.com">',
        '<link rel="preconnect" href="https://fonts.googleapis.com">\n    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
    );
}

function ensureAdSenseScript(html) {
    if (html.includes("ca-pub-1514260178834754")) {
        return html;
    }

    const script = `    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1514260178834754"
        crossorigin="anonymous"></script>\n`;

    return html.replace(/<meta charset="UTF-8">/i, `${script}    <meta charset="UTF-8">`);
}

for (const page of PAGES) {
    const file = path.join(ROOT_DIR, page);
    let html = fs.readFileSync(file, "utf8");

    html = ensureThemeHeadScript(html);
    html = ensureAdSenseScript(html);
    html = ensureFontAwesome(html);
    html = ensureGstatic(html);
    
    html = html.replace(/<header>[\s\S]*?<\/header>/, header());
    html = html.replace(/<aside id="sidebar"[\s\S]*?<\/aside>/, sidebar());
    html = html.replace(/<footer>[\s\S]*?(?=<script\s+src="theme\.js"|<script>)/, footer() + "\n\n    ");

    fs.writeFileSync(file, html, "utf8");
}

console.log(`Synced ${PAGES.length} static pages safely.`);
