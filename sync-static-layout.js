const fs = require("fs");
const path = require("path");

const ROOT_DIR = __dirname;
const PAGES = ["about.html", "privacy-policy.html", "terms-and-conditions.html"];

function header() {
    return `<header>
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
            <a href="./#related-quotes">Related Quotes</a>

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
            <li><a href="./#categories">Categories</a></li>
            <li><a href="./#recent-quotes">Recent Quotes</a></li>
            <li><a href="./#popular-quotes">Popular Quotes</a></li>
            <li><a href="contact.html">Contact</a></li>
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
            <a href="terms-and-conditions.html">Terms & Conditions</a>
        </div>

        <div class="footer-social" aria-label="Better Day Vibes social links">
            <a href="https://www.instagram.com/betterdayvibe" target="_blank" rel="noopener" aria-label="Instagram"><i class="fa-brands fa-instagram"></i></a>
            <a href="https://www.facebook.com/betterdayvibe" target="_blank" rel="noopener" aria-label="Facebook"><i class="fa-brands fa-facebook"></i></a>
            <a href="https://threads.com/@betterdayvibe" target="_blank" rel="noopener" aria-label="Threads"><i class="fa-brands fa-threads"></i></a>
            <a href="https://pinterest.com/betterdayvibe" target="_blank" rel="noopener" aria-label="Pinterest"><i class="fa-brands fa-pinterest"></i></a>
            <a href="https://x.com/betterdayvibe" target="_blank" rel="noopener" aria-label="X"><i class="fa-brands fa-x-twitter"></i></a>
        </div>

        <p>&copy; 2026 Better Day Vibes. All Rights Reserved.</p>
    </footer>`;
}

function menuScript() {
    return `<script>
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
    </script>`;
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

for (const page of PAGES) {
    const file = path.join(ROOT_DIR, page);
    let html = fs.readFileSync(file, "utf8");

    html = ensureFontAwesome(html);
    html = html.replace(/<body>[\s\S]*?<div class="about-wrapper">/, `<body>\n    ${header()}\n\n    <div class="about-wrapper">`);
    html = html.replace(/<footer>[\s\S]*?<\/footer>/, footer());
    html = html.replace(/\s*<script src="script\.js"><\/script>/, "");

    if (!html.includes("const menuBtn = document.getElementById(\"menuBtn\")")) {
        html = html.replace("</body>", `    ${menuScript()}\n\n</body>`);
    }

    fs.writeFileSync(file, html, "utf8");
}

console.log(`Synced ${PAGES.length} static pages.`);
