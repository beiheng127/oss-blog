/* ==========================================================================
   OSS Blog — enhancement script (Experiment 01: extra customization)
   Two small features, zero dependencies, no build step required:
   1. Copy button on every code block (technical-blog essential)
   2. Back-to-top button (appears after scrolling down)
   ========================================================================== */
(function () {
    'use strict';

    /* --- Feature 1: copy button for code blocks --------------------------- */
    var COPY_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
    var CHECK_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>';

    function markCopied(btn) {
        btn.classList.add('is-copied');
        btn.innerHTML = CHECK_ICON;
        setTimeout(function () {
            btn.classList.remove('is-copied');
            btn.innerHTML = COPY_ICON;
        }, 1600);
    }

    function initCopyButtons() {
        var blocks = document.querySelectorAll('.gh-content pre');
        blocks.forEach(function (pre) {
            if (pre.querySelector('.oss-copy-btn')) { return; }
            var btn = document.createElement('button');
            btn.className = 'oss-copy-btn';
            btn.type = 'button';
            btn.setAttribute('aria-label', 'Copy code');
            btn.innerHTML = COPY_ICON;
            btn.addEventListener('click', function () {
                var code = pre.querySelector('code');
                var text = code ? code.innerText : pre.innerText;
                var done = function () { markCopied(btn); };
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(text).then(done).catch(function () {
                        fallbackCopy(text); done();
                    });
                } else {
                    fallbackCopy(text); done();
                }
            });
            pre.appendChild(btn);
        });
    }

    /* Legacy fallback for browsers without the async clipboard API */
    function fallbackCopy(text) {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch (e) { /* no-op */ }
        document.body.removeChild(ta);
    }

    /* --- Feature 2: back-to-top button ------------------------------------ */
    function initBackToTop() {
        if (document.getElementById('oss-back-top')) { return; }
        var btn = document.createElement('button');
        btn.id = 'oss-back-top';
        btn.type = 'button';
        btn.setAttribute('aria-label', 'Back to top');
        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="18 15 12 9 6 15"></polyline></svg>';
        btn.addEventListener('click', function () {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        document.body.appendChild(btn);

        var update = function () {
            btn.classList.toggle('is-visible', window.scrollY > 600);
        };
        window.addEventListener('scroll', update, { passive: true });
        update();
    }

    /* --- Boot -------------------------------------------------------------- */
    function boot() {
        initCopyButtons();
        initBackToTop();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
