/* ==========================================================================
   OSS Blog — random "lead story" picker
   After the feed renders, promote ONE post card per page to the horizontal
   featured/lead style (`.oss-card-v.is-featured`). The choice is random so the
   homepage and tag/author archives don't always open with the same big block.
   Runs only where a feed exists (index / tag / author). No dependencies.
   ========================================================================== */
(function () {
    'use strict';
    var feed = document.querySelector('.post-feed.oss-feed');
    if (!feed) { return; }

    /* Only promote when there is more than one card to choose from. */
    var cards = feed.querySelectorAll('.oss-card-v:not(.is-featured)');
    if (cards.length < 2) { return; }

    var idx = Math.floor(Math.random() * cards.length);
    var pick = cards[idx];
    pick.classList.add('is-featured');

    /* a11y nicety: mark the lead card for screen readers */
    pick.setAttribute('aria-label', (pick.getAttribute('aria-label') || '') + ' · Lead story');
})();
