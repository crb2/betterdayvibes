const menuBtn = document.getElementById("menuBtn");
const sidebar = document.getElementById("sidebar");
const closeBtn = document.getElementById("closeBtn");
const searchInput = document.getElementById("searchInput");
const quoteLink = document.getElementById("quoteLink");
const quoteSection = document.getElementById("quoteSection");
const noResults = document.getElementById("noResults");
const currentCategory = document.getElementById("currentCategory");
const quotesContainer = document.getElementById("quotesContainer");

if (window.location.pathname.endsWith("/index.html")) {
    window.history.replaceState(
        null,
        "",
        window.location.pathname.replace(/\/index\.html$/, "/") + window.location.search + window.location.hash
    );
}

let activeCategory = "all";
let visibleCardLimit = 10;
const cardsPerLoad = 10;

const aliases = {
    positive: "positivity",
    positivity: "positivity",
    vibe: "positivity",
    vibes: "positivity",
    grateful: "gratitude",
    gratitude: "gratitude",
    thankful: "gratitude",
    heal: "healing",
    healing: "healing",
    relationship: "relationships",
    relationships: "relationships",
    growth: "self-growth",
    selfgrowth: "self-growth",
    boundary: "self-growth",
    boundaries: "self-growth",
    faith: "faith-hope",
    hope: "faith-hope"
};

quoteLink.addEventListener("click", (e) => {
    e.preventDefault();
    quoteSection.classList.toggle("show");
});

menuBtn.addEventListener("click", () => {
    sidebar.classList.toggle("active");
});

closeBtn.addEventListener("click", () => {
    sidebar.classList.remove("active");
});

document.addEventListener("click", (e) => {
    if (
        !sidebar.contains(e.target) &&
        !menuBtn.contains(e.target)
    ) {
        sidebar.classList.remove("active");
    }
});

function filterCategory(category) {

    activeCategory = category;
    visibleCardLimit = cardsPerLoad;
    searchInput.value = "";
    document.getElementById("clearSearch").style.display = "none";
    sidebar.classList.remove("active");
    updatePosts();
}

function updatePosts() {

    const search =
        searchInput.value.toLowerCase().trim();

    const searchTerm =
        aliases[search] || search;

    const cards =
        document.querySelectorAll(".quote-card");

    let visibleCards = [];

    cards.forEach(card => {

        const text =
            card.textContent.toLowerCase();

        const category =
            card.dataset.category.toLowerCase();

        const keywords =
            (card.dataset.keywords || "").toLowerCase();

        const categoryMatch =
            activeCategory === "all" ||
            category === activeCategory;

        const searchMatch =
            search === "" ||
            text.includes(searchTerm) ||
            category.includes(searchTerm) ||
            keywords.includes(searchTerm);

        if (categoryMatch && searchMatch) {
            visibleCards.push(card);

        } else {

            card.style.display = "none";

        }

        card.classList.remove("single-card");

    });

    visibleCards.forEach((card, index) => {

        if (index < visibleCardLimit) {

            card.style.display = "";
            card.classList.remove("hidden");

        } else {

            card.style.display = "none";
            card.classList.add("hidden");

        }

    });

    if (visibleCards.length === 1) {
        visibleCards[0].classList.add("single-card");
    }

    noResults.style.display =
        visibleCards.length === 0
            ? "block"
            : "none";

    if (search !== "") {

        currentCategory.textContent =
            "Search Results: " + search;

    } else if (activeCategory !== "all") {

        currentCategory.textContent =
            "Category: " +
            activeCategory;

    } else {

        currentCategory.textContent =
            "Category: All Posts";

    }
}

searchInput.addEventListener("input", () => {
    visibleCardLimit = cardsPerLoad;
    updatePosts();
});

document
    .querySelectorAll("[data-filter]")
    .forEach(link => {

        link.addEventListener("click", (e) => {

            e.preventDefault();

            filterCategory(
                link.dataset.filter
            );

        });

    });

function shuffleQuoteCards() {

    const cards =
        Array.from(document.querySelectorAll(".quote-card"));

    const loadTrigger =
        document.getElementById("load-trigger");

    for (let index = cards.length - 1; index > 0; index--) {

        const randomIndex =
            Math.floor(Math.random() * (index + 1));

        [cards[index], cards[randomIndex]] =
            [cards[randomIndex], cards[index]];

    }

    cards.forEach(card => {
        quotesContainer.insertBefore(card, loadTrigger);
    });

}

shuffleQuoteCards();
updatePosts();

const suggestions =
    document.getElementById("searchSuggestions");

const trendingKeywords = [
    "positivity",
    "gratitude",
    "healing",
    "self-growth",
    "kindness"
];

function getRecentSearches() {
    return JSON.parse(
        localStorage.getItem("recentSearches") || "[]"
    );
}

function saveSearch(term) {

    term = term.toLowerCase().trim();

    if (!term) return;

    let searches = getRecentSearches();

    searches = searches.filter(
        item => item !== term
    );

    searches.unshift(term);

    searches = searches.slice(0, 5);

    localStorage.setItem(
        "recentSearches",
        JSON.stringify(searches)
    );
}

function deleteSearch(term) {

    let searches = getRecentSearches();

    searches = searches.filter(
        item => item !== term
    );

    localStorage.setItem(
        "recentSearches",
        JSON.stringify(searches)
    );

    showSuggestions();
}

function selectSuggestion(term) {

    activeCategory = "all";

    searchInput.value = term;

    const clearBtn =
        document.getElementById("clearSearch");

    clearBtn.style.display = "block";

    saveSearch(term);

    suggestions.style.display = "none";

    updatePosts();

    searchInput.blur();
}

function showSuggestions() {

    const recent = getRecentSearches();

    suggestions.innerHTML = "";

    if (
        recent.length === 0 &&
        trendingKeywords.length === 0
    ) {
        suggestions.style.display = "none";
        return;
    }

    if (recent.length > 0) {

        const recentTitle =
            document.createElement("div");

        recentTitle.className =
            "suggestion-title";

        recentTitle.textContent =
            "Recent Searches";

        suggestions.appendChild(recentTitle);

        recent.forEach(term => {

            const item =
                document.createElement("div");

            item.className =
                "suggestion-item";

            const text =
                document.createElement("span");

            text.className =
                "search-text";

            text.textContent =
                term;

            text.addEventListener(
                "mousedown",
                (e) => {
                    e.preventDefault();
                    selectSuggestion(term);
                }
            );

            const remove =
                document.createElement("span");

            remove.className =
                "delete-search";

            remove.textContent =
                "✕";

            remove.addEventListener(
                "click",
                (e) => {

                    e.stopPropagation();

                    deleteSearch(term);

                }
            );

            item.appendChild(text);
            item.appendChild(remove);

            suggestions.appendChild(item);

        });

    }

    const trendingTitle =
        document.createElement("div");

    trendingTitle.className =
        "suggestion-title";

    trendingTitle.textContent =
        "Trending Searches";

    suggestions.appendChild(trendingTitle);

    trendingKeywords.forEach(term => {

        const item =
            document.createElement("div");

        item.className =
            "suggestion-item";

        item.textContent =
            term;

        item.addEventListener(
            "mousedown",
            (e) => {
                e.preventDefault();
                selectSuggestion(term);
            }
        );

        suggestions.appendChild(item);

    });

    suggestions.style.display =
        "block";

}

searchInput.addEventListener(
    "focus",
    showSuggestions
);

searchInput.addEventListener(
    "keydown",
    (e) => {

        if (
            e.key === "Enter" &&
            searchInput.value.trim()
        ) {

            saveSearch(
                searchInput.value.trim()
            );

            updatePosts();

            suggestions.style.display =
                "none";
        }

    }
);

document.addEventListener(
    "click",
    (e) => {

        if (
            !searchInput.contains(e.target) &&
            !suggestions.contains(e.target)
        ) {

            suggestions.style.display =
                "none";

        }

    }
);


const trigger =
    document.getElementById("load-trigger");

const observer =
    new IntersectionObserver(entries => {

        if (entries[0].isIntersecting) {

            loadMoreCards();

        }

    }, {
        rootMargin: "500px"
    });

observer.observe(trigger);

function loadMoreCards() {

    visibleCardLimit += cardsPerLoad;
    updatePosts();

}

const clearBtn = document.getElementById("clearSearch");

searchInput.addEventListener("input", () => {
    clearBtn.style.display =
        searchInput.value ? "block" : "none";
});

clearBtn.addEventListener("click", () => {
    searchInput.value = "";
    clearBtn.style.display = "none";
    updatePosts();
});





document.querySelectorAll(".quote-card").forEach(card => {

    const quote = card.querySelector("p")?.innerText || "";

    const facebook = card.querySelector(".share-facebook");
    const twitter = card.querySelector(".share-x");
    const whatsapp = card.querySelector(".share-whatsapp");
    const pinterest = card.querySelector(".share-pinterest");

    const image =
        card.querySelector("img");

    const slug =
        card.dataset.slug ||
        image?.getAttribute("src")
            ?.split("/")
            ?.filter(Boolean)
            ?.slice(-2, -1)[0];

    if (!slug) {
        return;
    }

    const pageUrl =
        encodeURIComponent(
            "https://betterdayvibes.life/photo/" + slug + "/"
        );
    const text = encodeURIComponent(quote);

    if (facebook) {
        facebook.href =
            `https://www.facebook.com/sharer/sharer.php?u=${pageUrl}`;
    }

    if (twitter) {
        twitter.href =
            `https://twitter.com/intent/tweet?text=${text}&url=${pageUrl}`;
    }

    if (whatsapp) {
        whatsapp.href =
            `https://wa.me/?text=${text}%20${pageUrl}`;
    }

    if (pinterest) {
        pinterest.href =
            `https://pinterest.com/pin/create/button/?url=${pageUrl}&description=${text}`;
    }

    const threads = card.querySelector(".share-threads");

    if (threads) {
        threads.href =
            `https://www.threads.net/intent/post?text=${text}%20${pageUrl}`;
    }

});

document.querySelectorAll('.share-link').forEach(btn => {
    btn.addEventListener('click', e => {
        e.preventDefault();

        navigator.clipboard.writeText(window.location.href);

        alert('Link copied!');
    });
});
