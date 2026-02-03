(function () {
    var SCRIPT_URL = document.currentScript.src;
    var API_URL = "/api/send";

    // Allow overriding the API endpoint via data attribute or global config later if needed
    // For now, we assume it hits the same origin's /api/send or we might need a full URL if hosted elsewhere.
    // Since this is a "lite" self-hostable analytics, relative path is usually fine if hosted on same domain.
    // BUT the user request implies they might use it on OTHER products.
    // So we should probably allow configuration or default to the origin of the script.

    // Let's try to infer the API base from the script source if possible, or expect a data attribute.
    // Ideally: <script src="https://analytics.example.com/tracker.js" data-host="https://analytics.example.com"></script>

    var wrapper = document.currentScript;
    var host = wrapper.getAttribute("data-host") || "";

    if (!host && SCRIPT_URL.startsWith("http")) {
        try {
            var urlObj = new URL(SCRIPT_URL);
            host = urlObj.origin;
        } catch (e) { }
    }

    var endpoint = host + API_URL;

    function track(type, payload) {
        var data = {
            type: type,
            pathname: window.location.pathname,
            hostname: window.location.hostname,
            referrer: document.referrer,
            screen_width: window.screen.width,
            language: window.navigator.language,
            ...payload
        };

        // Capture UTMs
        var searchParams = new URLSearchParams(window.location.search);
        var utmFields = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
        utmFields.forEach(function (field) {
            if (searchParams.has(field)) {
                data[field] = searchParams.get(field);
            }
        });

        if (navigator.sendBeacon) {
            var blob = new Blob([JSON.stringify(data)], { type: "application/json" });
            navigator.sendBeacon(endpoint, blob);
        } else {
            fetch(endpoint, {
                method: "POST",
                body: JSON.stringify(data),
                headers: { "Content-Type": "application/json" },
                keepalive: true
            });
        }
    }

    // Auto-track pageview
    // History API overrides for SPA support
    var history = window.history;
    var pushState = history.pushState;
    history.pushState = function (state) {
        if (typeof history.onpushstate == "function") {
            history.onpushstate({ state: state });
        }
        var ret = pushState.apply(history, arguments);
        track("pageview");
        return ret;
    };

    // Listen to popstate for back/forward support
    window.addEventListener("popstate", function () {
        track("pageview");
    });

    // Track initial load
    // If document is already loaded, track immediately.
    if (document.readyState !== "loading") {
        track("pageview");
    } else {
        document.addEventListener("DOMContentLoaded", function () {
            track("pageview");
        });
    }

    // Expose global for custom events
    window.liteAnalytics = {
        track: function (eventName, props) {
            track("custom", { event_name: eventName, properties: props });
        }
    };

})();
