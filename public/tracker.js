(function () {
    "use strict";

    try {
        var script = document.currentScript;
        if (!script) return;

        var SCRIPT_URL = script.src;
        var API_URL = "/api/send";

        var host = script.getAttribute("data-host") || "";
        var websiteId = script.getAttribute("data-website-id") || "";

        if (!host && SCRIPT_URL.startsWith("http")) {
            try {
                host = new URL(SCRIPT_URL).origin;
            } catch (e) { }
        }

        var endpoint = host + API_URL;
        var lastPathname = "";

        function track(type, payload) {
            try {
                var currentPathname = window.location.pathname + window.location.search;

                if (type === "pageview" && currentPathname === lastPathname) return;
                if (type === "pageview") lastPathname = currentPathname;

                var data = {
                    type: type,
                    pathname: window.location.pathname,
                    hostname: window.location.hostname,
                    referrer: document.referrer || undefined,
                    screen_width: window.screen.width,
                    language: (navigator.language || "").split("-")[0],
                    website_id: websiteId || undefined
                };

                if (payload) {
                    for (var key in payload) {
                        if (payload.hasOwnProperty(key)) data[key] = payload[key];
                    }
                }

                var searchParams = new URLSearchParams(window.location.search);
                var utmFields = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
                for (var i = 0; i < utmFields.length; i++) {
                    var field = utmFields[i];
                    if (searchParams.has(field)) {
                        data[field] = searchParams.get(field);
                    }
                }

                var body = JSON.stringify(data);

                if (navigator.sendBeacon) {
                    // Use text/plain to avoid CORS preflight on cross-origin requests.
                    // application/json requires a preflight OPTIONS request which sendBeacon
                    // handles unreliably across browsers, causing silent failures.
                    var blob = new Blob([body], { type: "text/plain" });
                    navigator.sendBeacon(endpoint, blob);
                } else {
                    var xhr = new XMLHttpRequest();
                    xhr.open("POST", endpoint, true);
                    xhr.setRequestHeader("Content-Type", "text/plain");
                    xhr.send(body);
                }
            } catch (e) { }
        }

        var history = window.history;
        if (history.pushState) {
            var pushState = history.pushState;
            history.pushState = function () {
                var ret = pushState.apply(history, arguments);
                track("pageview");
                return ret;
            };
        }

        window.addEventListener("popstate", function () {
            track("pageview");
        });

        if (document.readyState !== "loading") {
            track("pageview");
        } else {
            document.addEventListener("DOMContentLoaded", function () {
                track("pageview");
            });
        }

        window.liteAnalytics = {
            track: function (eventName, props) {
                track("custom", { event_name: eventName, properties: props });
            }
        };

    } catch (e) { }
})();
