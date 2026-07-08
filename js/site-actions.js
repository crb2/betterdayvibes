(function () {
    function addGoTopButton() {
        if (document.getElementById("goTopBtn")) return;

        const style = document.createElement("style");
        style.textContent = `
            .go-top-btn {
                position: fixed;
                right: 22px;
                bottom: 22px;
                width: 46px;
                height: 46px;
                border: 0;
                border-radius: 50%;
                background: #fbbf24;
                color: #0f172a;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
                cursor: pointer;
                box-shadow: 0 12px 26px rgba(0, 0, 0, 0.35);
                opacity: 0;
                pointer-events: none;
                transform: translateY(10px);
                transition: opacity 0.25s ease, transform 0.25s ease, background 0.25s ease;
                z-index: 1200;
            }

            .go-top-btn.visible {
                opacity: 1;
                pointer-events: auto;
                transform: translateY(0);
            }

            .go-top-btn:hover,
            .go-top-btn:focus-visible {
                background: #f59e0b;
                outline: none;
            }

            @media (max-width: 640px) {
                .go-top-btn {
                    right: 16px;
                    bottom: 16px;
                    width: 42px;
                    height: 42px;
                }
            }
        `;
        document.head.appendChild(style);

        const button = document.createElement("button");
        button.id = "goTopBtn";
        button.className = "go-top-btn";
        button.type = "button";
        button.setAttribute("aria-label", "Go to top");
        button.innerHTML = '<i class="fa-solid fa-arrow-up" aria-hidden="true"></i>';

        button.addEventListener("click", () => {
            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });
        });

        const updateVisibility = () => {
            button.classList.toggle("visible", window.scrollY > 300);
        };

        window.addEventListener("scroll", updateVisibility, { passive: true });
        document.body.appendChild(button);
        updateVisibility();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", addGoTopButton);
    } else {
        addGoTopButton();
    }
})();
