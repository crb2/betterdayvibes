const menuBtn = document.getElementById("menuBtn");
const sidebar = document.getElementById("sidebar");
const closeBtn = document.getElementById("closeBtn");
const searchInput = document.getElementById("searchInput");
const quoteLink = document.getElementById("quoteLink");
const quoteSection = document.getElementById("quoteSection");
const noResults = document.getElementById("noResults");
const currentCategory = document.getElementById("currentCategory");


let activeCategory = "all";

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

            card.style.display = "";
            visibleCards.push(card);

        } else {

            card.style.display = "none";

        }

        card.classList.remove("single-card");

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
            "All Posts";

    }
}

searchInput.addEventListener("input", updatePosts);

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

let currentIndex = 12;

function loadMoreCards() {

    const hiddenCards =
        document.querySelectorAll(".quote-card.hidden");

    let count = 0;

    hiddenCards.forEach(card => {

        if (count < 12) {

            card.classList.remove("hidden");

            count++;

        }

    });

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

