const menuBtn = document.getElementById("menuBtn");
const sidebar = document.getElementById("sidebar");
const closeBtn = document.getElementById("closeBtn");
const searchInput = document.getElementById("searchInput");
const quoteLink = document.getElementById("quoteLink");
const quoteSection = document.getElementById("quoteSection");
const noResults = document.getElementById("noResults");
const currentCategory = document.getElementById("currentCategory");
const quotesContainer = document.getElementById("quotesContainer");
const clearBtn = document.getElementById("clearSearch");
const suggestions = document.getElementById("searchSuggestions");

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
const initialParams = new URLSearchParams(window.location.search);
const initialSearch = initialParams.get("search") || "";
const initialCategory = initialParams.get("category") || "";

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

if (initialCategory) {
    activeCategory = initialCategory.toLowerCase().trim();
}

if (initialSearch && searchInput) {
    searchInput.value = initialSearch;
    if (clearBtn) clearBtn.style.display = "flex";
}

if (quoteLink && quoteSection) {
    quoteLink.addEventListener("click", (e) => {
        e.preventDefault();
        quoteSection.classList.toggle("show");
    });
}

if (menuBtn && sidebar) {
    menuBtn.addEventListener("click", () => {
        sidebar.classList.toggle("active");
    });
}

if (closeBtn && sidebar) {
    closeBtn.addEventListener("click", () => {
        sidebar.classList.remove("active");
    });
}

document.addEventListener("click", (e) => {
    if (sidebar && menuBtn && !sidebar.contains(e.target) && !menuBtn.contains(e.target)) {
        sidebar.classList.remove("active");
    }
});

function filterCategory(category) {
    activeCategory = category;
    visibleCardLimit = cardsPerLoad;
    hasUserScrolled = false;
    if (searchInput) searchInput.value = "";
    if (clearBtn) clearBtn.style.display = "none";
    if (sidebar) sidebar.classList.remove("active");
    updatePosts();
}

function updatePosts() {
    if (!quotesContainer) return;

    const search = searchInput ? searchInput.value.toLowerCase().trim() : "";
    const searchTerm = aliases[search] || search;
    const cards = document.querySelectorAll(".quote-card");
    let visibleCards = [];

    cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        const category = (card.dataset.category || "").toLowerCase();
        const keywords = (card.dataset.keywords || "").toLowerCase();

        const categoryMatch = activeCategory === "all" || category === activeCategory;
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
            const img = card.querySelector("img");
            if (img && img.dataset.src && !img.getAttribute("src")) {
                img.src = img.dataset.src;
            }
        } else {
            card.style.display = "none";
            card.classList.add("hidden");
        }
    });

    if (visibleCards.length === 1) {
        visibleCards[0].classList.add("single-card");
    }

    if (noResults) {
        noResults.style.display = visibleCards.length === 0 ? "block" : "none";
    }

    if (currentCategory) {
        if (search !== "") {
            currentCategory.textContent = "Search Results: " + search;
        } else if (activeCategory !== "all") {
            currentCategory.textContent = "Category: " + activeCategory;
        } else {
            currentCategory.textContent = "Category: All Posts";
        }
    }
}

if (searchInput) {
    searchInput.addEventListener("input", () => {
        visibleCardLimit = cardsPerLoad;
        hasUserScrolled = false;
        if (clearBtn) clearBtn.style.display = searchInput.value ? "flex" : "none";
        updatePosts();
    });
}

if (clearBtn) {
    clearBtn.addEventListener("click", () => {
        if (searchInput) searchInput.value = "";
        clearBtn.style.display = "none";
        hasUserScrolled = false;
        updatePosts();
    });
}

document.querySelectorAll("[data-filter]").forEach(link => {
    link.addEventListener("click", (e) => {
        e.preventDefault();
        filterCategory(link.dataset.filter);
    });
});

function shuffleQuoteCards() {
    if (!quotesContainer) return;
    const cards = Array.from(document.querySelectorAll(".quote-card"));
    const loadTrigger = document.getElementById("load-trigger");

    for (let index = cards.length - 1; index > 0; index--) {
        const randomIndex = Math.floor(Math.random() * (index + 1));
        [cards[index], cards[randomIndex]] = [cards[randomIndex], cards[index]];
    }

    cards.forEach(card => {
        if (loadTrigger) {
            quotesContainer.insertBefore(card, loadTrigger);
        } else {
            quotesContainer.appendChild(card);
        }
    });
}

shuffleQuoteCards();
updatePosts();

function getRecentSearches() {
    return JSON.parse(localStorage.getItem("recentSearches") || "[]");
}

function saveSearch(term) {
    term = term.toLowerCase().trim();
    if (!term) return;

    let searches = getRecentSearches();
    searches = searches.filter(item => item !== term);
    searches.unshift(term);
    searches = searches.slice(0, 5);

    localStorage.setItem("recentSearches", JSON.stringify(searches));
}

function deleteSearch(term) {
    let searches = getRecentSearches();
    searches = searches.filter(item => item !== term);
    localStorage.setItem("recentSearches", JSON.stringify(searches));
    showSuggestions();
}

function selectSuggestion(term) {
    activeCategory = "all";
    if (searchInput) searchInput.value = term;
    if (clearBtn) clearBtn.style.display = "flex";

    saveSearch(term);
    if (suggestions) suggestions.style.display = "none";
    hasUserScrolled = false;
    updatePosts();
    if (searchInput) searchInput.blur();
}

function showSuggestions() {
    if (!suggestions) return;
    const recent = getRecentSearches();
    suggestions.innerHTML = "";

    if (recent.length === 0) {
        suggestions.style.display = "none";
        return;
    }

    const recentTitle = document.createElement("div");
    recentTitle.className = "suggestion-title";
    recentTitle.textContent = "Recent Searches";
    suggestions.appendChild(recentTitle);

    recent.forEach(term => {
        const item = document.createElement("div");
        item.className = "suggestion-item";

        const text = document.createElement("span");
        text.className = "search-text";
        text.textContent = term;
        text.addEventListener("mousedown", (e) => {
            e.preventDefault();
            selectSuggestion(term);
        });

        const remove = document.createElement("span");
        remove.className = "delete-search";
        remove.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
        remove.setAttribute("aria-label", "Remove search suggestion");
        remove.addEventListener("click", (e) => {
            e.stopPropagation();
            deleteSearch(term);
        });

        item.appendChild(text);
        item.appendChild(remove);
        suggestions.appendChild(item);
    });

    suggestions.style.display = "block";
}

if (searchInput) {
    searchInput.addEventListener("focus", showSuggestions);
    searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && searchInput.value.trim()) {
            saveSearch(searchInput.value.trim());
            updatePosts();
            if (suggestions) suggestions.style.display = "none";
        }
    });
}

document.addEventListener("click", (e) => {
    if (suggestions && searchInput && !searchInput.contains(e.target) && !suggestions.contains(e.target)) {
        suggestions.style.display = "none";
    }
});

let hasUserScrolled = false;
let isLoadingMore = false;

window.addEventListener("scroll", () => {
    if (!hasUserScrolled) {
        hasUserScrolled = true;
        if (trigger) {
            const rect = trigger.getBoundingClientRect();
            if (rect.top <= window.innerHeight + 250) {
                loadMoreCards();
            }
        }
    }
}, { passive: true });

const trigger = document.getElementById("load-trigger");
if (trigger) {
    const observer = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting) {
            if (hasUserScrolled || window.scrollY > 20) {
                loadMoreCards();
            }
        }
    }, {
        rootMargin: "250px"
    });
    observer.observe(trigger);
}

function loadMoreCards() {
    if (isLoadingMore) return;
    const cards = document.querySelectorAll(".quote-card");
    if (visibleCardLimit >= cards.length) return;

    isLoadingMore = true;
    visibleCardLimit += cardsPerLoad;
    updatePosts();

    setTimeout(() => {
        isLoadingMore = false;
    }, 150);
}

// Social share links
document.querySelectorAll(".quote-card").forEach(card => {
    const quote = card.querySelector("p")?.innerText || "";
    const facebook = card.querySelector(".share-facebook");
    const twitter = card.querySelector(".share-x");
    const whatsapp = card.querySelector(".share-whatsapp");
    const pinterest = card.querySelector(".share-pinterest");

    const image = card.querySelector("img");
    const slug = card.dataset.slug || (image?.getAttribute("data-src") || image?.getAttribute("src"))?.split("/")?.filter(Boolean)?.slice(-2, -1)[0];

    if (!slug) return;

    const pageUrl = encodeURIComponent("https://betterdayvibes.life/photo/" + slug + "/");
    const text = encodeURIComponent(quote);

    if (facebook) facebook.href = `https://www.facebook.com/sharer/sharer.php?u=${pageUrl}`;
    if (twitter) twitter.href = `https://twitter.com/intent/tweet?text=${text}&url=${pageUrl}`;
    if (whatsapp) whatsapp.href = `https://wa.me/?text=${text}%20${pageUrl}`;
    if (pinterest) pinterest.href = `https://pinterest.com/pin/create/button/?url=${pageUrl}&description=${text}`;

    const threads = card.querySelector(".share-threads");
    if (threads) threads.href = `https://www.threads.net/intent/post?text=${text}%20${pageUrl}`;
});

document.querySelectorAll('.share-link').forEach(btn => {
    btn.addEventListener('click', e => {
        e.preventDefault();
        navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
    });
});
