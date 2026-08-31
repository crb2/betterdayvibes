(function () {
    function getTheme() {
        return localStorage.getItem("themePreference") || "dark";
    }

    function applyTheme(theme) {
        document.documentElement.setAttribute("data-theme", theme);
        const metaTheme = document.querySelector('meta[name="theme-color"]');
        if (metaTheme) {
            metaTheme.setAttribute("content", theme === "light" ? "#ffffff" : "#121212");
        }
        const btn = document.getElementById("themeToggleBtn");
        if (btn) {
            const nextMode = theme === "dark" ? "light" : "dark";
            btn.setAttribute("aria-label", `Switch to ${nextMode} mode`);
            btn.setAttribute("title", `Switch to ${nextMode} mode`);
        }
    }

    // Apply immediately to avoid any flash of wrong theme
    applyTheme(getTheme());

    function initTheme() {
        const btn = document.getElementById("themeToggleBtn");
        if (btn) {
            applyTheme(getTheme());
            btn.addEventListener("click", function () {
                const current = getTheme();
                const next = current === "dark" ? "light" : "dark";
                localStorage.setItem("themePreference", next);
                applyTheme(next);
            });
        }
    }

    function initHeaderScroll() {
        const header = document.querySelector("header");
        if (!header) return;

        let lastHeaderScrollY = window.scrollY || window.pageYOffset || 0;
        const DELTA_THRESHOLD = 6;
        const TOP_THRESHOLD = 60;
        let headerTicking = false;

        function updateHeader() {
            const currentScrollY = window.scrollY || window.pageYOffset || 0;

            if (currentScrollY <= TOP_THRESHOLD) {
                header.classList.remove("header-hidden");
            } else {
                const delta = currentScrollY - lastHeaderScrollY;
                if (Math.abs(delta) >= DELTA_THRESHOLD) {
                    if (delta > 0) {
                        // User scrolling DOWN -> smoothly hide header
                        header.classList.add("header-hidden");
                    } else {
                        // User scrolling UP -> smoothly show header
                        header.classList.remove("header-hidden");
                    }
                }
            }

            lastHeaderScrollY = currentScrollY;
            headerTicking = false;
        }

        window.addEventListener("scroll", function () {
            if (!headerTicking) {
                window.requestAnimationFrame(updateHeader);
                headerTicking = true;
            }
        }, { passive: true });
    }

    function initScrollNav() {
        const btn = document.getElementById("scrollNavBtn");
        if (!btn) return;

        const TOP_THRESHOLD = 100;
        const BOTTOM_THRESHOLD = 60;
        const DELTA_THRESHOLD = 5;

        let lastScrollY = window.scrollY || window.pageYOffset || 0;
        let currentDirection = "down"; // "down" | "up"
        let ticking = false;

        function setDownArrow() {
            currentDirection = "down";
            btn.classList.add("visible");
            btn.classList.remove("scroll-up");
            btn.removeAttribute("aria-hidden");
            btn.setAttribute("aria-label", "Scroll to bottom");
            btn.setAttribute("title", "Scroll to bottom");
        }

        function setUpArrow() {
            currentDirection = "up";
            btn.classList.add("visible", "scroll-up");
            btn.removeAttribute("aria-hidden");
            btn.setAttribute("aria-label", "Scroll to top");
            btn.setAttribute("title", "Scroll to top");
        }

        function hideButton() {
            btn.classList.remove("visible", "scroll-up");
            btn.setAttribute("aria-hidden", "true");
        }

        function updateScrollBtn() {
            const currentScrollY = window.scrollY || window.pageYOffset || 0;
            const windowHeight = window.innerHeight;
            const scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;

            if (scrollHeight <= windowHeight + 200) {
                hideButton();
                lastScrollY = currentScrollY;
                ticking = false;
                return;
            }

            const atTop = currentScrollY <= TOP_THRESHOLD;
            const atBottom = windowHeight + currentScrollY >= scrollHeight - BOTTOM_THRESHOLD;

            if (atTop) {
                hideButton();
                currentDirection = "down";
            } else if (atBottom) {
                setUpArrow();
            } else {
                const delta = currentScrollY - lastScrollY;
                if (Math.abs(delta) >= DELTA_THRESHOLD) {
                    if (delta > 0) {
                        // User physically scrolling DOWN
                        setDownArrow();
                    } else {
                        // User physically scrolling UP
                        setUpArrow();
                    }
                }
            }

            lastScrollY = currentScrollY;
            ticking = false;
        }

        window.addEventListener("scroll", function () {
            if (!ticking) {
                window.requestAnimationFrame(updateScrollBtn);
                ticking = true;
            }
        }, { passive: true });

        window.addEventListener("resize", function () {
            if (!ticking) {
                window.requestAnimationFrame(updateScrollBtn);
                ticking = true;
            }
        }, { passive: true });

        btn.addEventListener("click", function () {
            if (currentDirection === "up" || btn.classList.contains("scroll-up")) {
                window.scrollTo({ top: 0, behavior: "smooth" });
            } else {
                window.scrollTo({
                    top: document.documentElement.scrollHeight || document.body.scrollHeight,
                    behavior: "smooth"
                });
            }
        });

        updateScrollBtn();
    }

    function onInit() {
        initTheme();
        initHeaderScroll();
        initScrollNav();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", onInit);
    } else {
        onInit();
    }
})();
