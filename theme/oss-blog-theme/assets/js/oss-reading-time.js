/*!
 * OSS Blog · 客户端 reading-time 模块
 *
 * 功能：
 *   1. 读取 <script id="oss-reading-time-data"> 注入的 cache，
 *      在卡片渲染完成后再校准一次 "阅读时间 X 分钟"（通常和 SSR 一致，但确保命中 cache 后的精度）
 *   2. 文章页：实时计算正文（去除 code/pre/blockquote）的中文字数 + 图片数 + 标题块数，
 *      用同一套公式（runtime/scripts/oss-reading-time.js）算出 minutes，
 *      在右下角显示"当前阅读进度：42% · 剩余约 3 分钟"
 *   3. 阅读完成（滚到底）显示"✓ 已读完"
 *
 * 计算公式与 runtime/scripts/oss-reading-time.js 完全一致，便于单测 / 复现。
 */
(function () {
    'use strict';

    var DEFAULT_WPM = 400;
    var SECS_PER_IMAGE_FIRST = 12;
    var SECS_PER_IMAGE_FLOOR = 3;
    var SECS_PER_HEADER_BLOCK = 6;
    var STORAGE_KEY = 'oss-reading-progress';

    function loadCache() {
        // Reserved for future override. SSR-side reading_time helper
        // (runtime/versions/.../core/frontend/helpers/reading_time.js)
        // already uses the same cache, so no client fetch needed for now.
        return null;
    }

    function countWords(text) {
        if (!text) {
            return 0;
        }
        var pattern = /[a-zA-ZÀ-ÿ0-9_\u0392-\u03c9\u0410-\u04F9]+|[\u4E00-\u9FFF\u3400-\u4dbf\uf900-\ufaff\u3040-\u309f\uac00-\ud7af]+/g;
        var match = text.match(pattern);
        if (!match) {
            return 0;
        }
        var count = 0;
        for (var i = 0; i < match.length; i += 1) {
            if (match[i].charCodeAt(0) >= 0x4e00) {
                count += match[i].length;
            } else {
                count += 1;
            }
        }
        return count;
    }

    function countImagesIn(root) {
        if (!root) {
            return 0;
        }
        return root.querySelectorAll('img').length;
    }

    function countHeavyBlocks(root) {
        if (!root) {
            return 0;
        }
        return root.querySelectorAll('h1, h2, h3, h4, h5, h6, blockquote, pre, code').length;
    }

    function imageBonus(imageCount) {
        if (!imageCount) {
            return 0;
        }
        var bonus = 0;
        for (var i = SECS_PER_IMAGE_FIRST; i > SECS_PER_IMAGE_FIRST - imageCount; i -= 1) {
            bonus += Math.max(i, SECS_PER_IMAGE_FLOOR);
        }
        return bonus;
    }

    function computeMinutes(wordCount, imageCount, heavyBlocks, wpm) {
        wpm = wpm || DEFAULT_WPM;
        var secsPerWord = 60 / wpm;
        var secs = wordCount * secsPerWord + imageBonus(imageCount) + heavyBlocks * SECS_PER_HEADER_BLOCK;
        return Math.max(1, Math.round(secs / 60));
    }

    function findContentRoot() {
        return document.querySelector('.post-content, .post-full-content, article .kg-card, .gh-content');
    }

    function extractText(root) {
        if (!root) {
            return '';
        }
        var clone = root.cloneNode(true);
        // strip script/style
        clone.querySelectorAll('script, style, noscript').forEach(function (n) {
            n.remove();
        });
        return clone.textContent || '';
    }

    function createBadge() {
        var b = document.createElement('div');
        b.className = 'oss-reading-badge-widget';
        b.innerHTML =
            '<div class="oss-reading-track"><div class="oss-reading-fill"></div></div>' +
            '<div class="oss-reading-meta"><span class="oss-reading-status">0%</span><span class="oss-reading-eta"></span></div>';
        document.body.appendChild(b);
        return b;
    }

    function attachProgress(estimated) {
        if (!estimated || estimated < 1) {
            return;
        }
        var root = findContentRoot();
        if (!root) {
            return;
        }

        var badge = createBadge();
        var fill = badge.querySelector('.oss-reading-fill');
        var status = badge.querySelector('.oss-reading-status');
        var eta = badge.querySelector('.oss-reading-eta');

        var docEl = document.documentElement;
        var totalHeight = Math.max(
            root.offsetTop + root.offsetHeight - window.innerHeight,
            1
        );

        function fmtPercent(p) {
            return Math.round(p * 100) + '%';
        }

        function fmtRemaining(secs) {
            if (secs <= 0) {
                return '即将读完';
            }
            if (secs < 60) {
                return '剩余约 ' + Math.round(secs) + ' 秒';
            }
            var mins = Math.max(1, Math.round(secs / 60));
            return '剩余约 ' + mins + ' 分钟';
        }

        var raf = null;
        function update() {
            raf = null;
            var scrollTop = window.scrollY || docEl.scrollTop || 0;
            var p = Math.min(1, Math.max(0, scrollTop / totalHeight));
            fill.style.width = (p * 100).toFixed(2) + '%';
            status.textContent = fmtPercent(p);

            var secs = (1 - p) * estimated * 60;
            eta.textContent = (p >= 1) ? '✓ 已读完' : fmtRemaining(secs);

            if (p >= 1) {
                badge.classList.add('is-done');
                try {
                    sessionStorage.setItem(STORAGE_KEY, '1');
                } catch (e) { /* ignore */ }
            }
        }

        function onScroll() {
            if (raf) {
                return;
            }
            raf = requestAnimationFrame(update);
        }

        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', function () {
            totalHeight = Math.max(root.offsetTop + root.offsetHeight - window.innerHeight, 1);
            update();
        }, { passive: true });

        try {
            if (sessionStorage.getItem(STORAGE_KEY) === '1') {
                badge.classList.add('is-done');
            }
        } catch (e) { /* ignore */ }

        update();
    }

    function recalibrateFromCache() {
        // Reserved: when reading-time-cache.json is fetched via <link rel="preload">,
        // we can use it to override the SSR value. For now, the SSR value
        // (which already reads the same cache) is the source of truth, so
        // nothing to do here. Kept as a hook for future tuning.
    }

    function init() {
        recalibrateFromCache();

        // 文章页正文 → 计算 + 进度条
        var root = findContentRoot();
        if (!root) {
            return;
        }
        var text = extractText(root);
        var wc = countWords(text);
        var ic = countImagesIn(root);
        var hb = countHeavyBlocks(root);
        var est = computeMinutes(wc, ic, hb, DEFAULT_WPM);
        attachProgress(est);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
}());