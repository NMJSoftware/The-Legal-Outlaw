(() => {
    const STORAGE_KEY = 'legalOutlaw.adjourn.v1';
    const VERSION = 1;
    const chapterModeQuery = window.matchMedia('(min-width: 1080px)');

    const storageAvailable = (() => {
        try {
            localStorage.setItem('__outlaw_storage_test__', '1');
            localStorage.removeItem('__outlaw_storage_test__');
            return true;
        } catch (error) {
            return false;
        }
    })();

    const getMode = () => (chapterModeQuery.matches ? 'desktop' : 'mobile');

    const getCurrentChapterHref = () => {
        const slug = window.location.pathname.split('/').pop() || '';
        if (!slug) return 'index.html';
        return slug.endsWith('.html') ? slug : `${slug}.html`;
    };

    const getCurrentChapterTitle = () => {
        const titleNode = document.querySelector('.chapter-title');
        if (titleNode) return titleNode.textContent.trim();
        return document.title.replace(' — The Legal Outlaw', '').trim();
    };

    const getBookmark = () => {
        if (!storageAvailable) return null;
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (!parsed || parsed.version !== 1 || typeof parsed.chapterHref !== 'string') return null;
            return parsed;
        } catch (error) {
            return null;
        }
    };

    const setBookmark = (bookmark) => {
        if (!storageAvailable) return false;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmark));
            return true;
        } catch (error) {
            return false;
        }
    };

    const clearBookmark = () => {
        if (!storageAvailable) return;
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (error) {
            // Swallow storage errors so UI stays usable.
        }
    };

    const formatBookmarkMeta = (bookmark) => {
        const pages = bookmark && bookmark.pages ? bookmark.pages : null;
        const preferred = pages && bookmark.lastMode ? pages[bookmark.lastMode] : null;
        const fallback = preferred || (pages ? pages.desktop : null) || (pages ? pages.mobile : null) || null;
        if (!fallback) return `${bookmark.chapterTitle}`;

        let dateText = '';
        if (bookmark.updatedAt) {
            const date = new Date(bookmark.updatedAt);
            if (!Number.isNaN(date.getTime())) {
                dateText = ` on ${date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}`;
            }
        }

        return `${bookmark.chapterTitle} — Page ${fallback.page} of ${fallback.total}${dateText}`;
    };

    const chapterAdjournButton = document.querySelector('[data-adjourn-btn]');
    const chapterAdjournStatus = document.querySelector('[data-adjourn-status]');
    const isChapterPage = Boolean(document.querySelector('[data-pageable]'));

    let latestPageDetail = null;

    const saveAdjournment = (detail) => {
        if (!storageAvailable || !detail) return false;

        const existing = getBookmark() || { pages: {} };
        const pages = existing.pages || {};
        pages[detail.mode] = { page: detail.page, total: detail.total };

        const next = {
            version: VERSION,
            chapterHref: detail.chapterHref,
            chapterTitle: detail.chapterTitle,
            pages,
            lastMode: detail.mode,
            updatedAt: new Date().toISOString(),
        };

        return setBookmark(next);
    };

    if (isChapterPage) {
        if (!storageAvailable) {
            if (chapterAdjournButton) chapterAdjournButton.style.display = 'none';
            if (chapterAdjournStatus) chapterAdjournStatus.textContent = '';
        } else {
            document.addEventListener('outlaw:page-change', (event) => {
                latestPageDetail = event.detail || null;
                if (latestPageDetail) saveAdjournment(latestPageDetail);
            });

            if (chapterAdjournButton) {
                chapterAdjournButton.addEventListener('click', () => {
                    if (!latestPageDetail) return;
                    const saved = saveAdjournment(latestPageDetail);
                    if (!chapterAdjournStatus) return;
                    chapterAdjournStatus.textContent = saved
                        ? `Adjourned at Page ${latestPageDetail.page}.`
                        : 'Adjournment could not be recorded.';
                });
            }
        }
    }

    const panel = document.querySelector('[data-adjourn-panel]');
    const meta = document.querySelector('[data-adjourn-meta]');
    const reconvene = document.querySelector('[data-adjourn-reconvene]');
    const clear = document.querySelector('[data-adjourn-clear]');

    if (panel && meta && reconvene && clear) {
        const renderPanel = () => {
            if (!storageAvailable) {
                panel.classList.add('is-storage-unavailable');
                meta.textContent = 'Adjournment unavailable on this device.';
                reconvene.classList.add('is-disabled');
                reconvene.setAttribute('aria-disabled', 'true');
                reconvene.setAttribute('href', '#');
                clear.disabled = true;
                return;
            }

            const bookmark = getBookmark();
            if (!bookmark) {
                panel.classList.remove('has-bookmark');
                meta.textContent = 'No adjournment called.';
                reconvene.classList.add('is-disabled');
                reconvene.setAttribute('aria-disabled', 'true');
                reconvene.setAttribute('href', '#');
                clear.disabled = true;
                return;
            }

            panel.classList.add('has-bookmark');
            meta.textContent = formatBookmarkMeta(bookmark);
            reconvene.classList.remove('is-disabled');
            reconvene.removeAttribute('aria-disabled');
            reconvene.setAttribute('href', `${bookmark.chapterHref}?adjourn=1`);
            clear.disabled = false;
        };

        reconvene.addEventListener('click', (event) => {
            if (reconvene.classList.contains('is-disabled')) {
                event.preventDefault();
            }
        });

        clear.addEventListener('click', () => {
            clearBookmark();
            renderPanel();
        });

        renderPanel();
    }
})();

(() => {
    const chapterPathPattern = /\/chapter-\d+(\.html)?$/i;
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const defaultTitle = 'Chapter Hearing';

    const overlay = document.createElement('div');
    overlay.className = 'court-transition';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = `
        <div class="court-transition-panel">
            <p class="court-transition-kicker">COURT IN SESSION</p>
            <p class="court-transition-title" data-court-transition-title></p>
            <p class="court-transition-status">Proceedings commencing...</p>
        </div>
    `;
    document.body.appendChild(overlay);

    const titleNode = overlay.querySelector('[data-court-transition-title]');
    let isTransitioning = false;

    const getDestinationFromLink = (link) => {
        if (!link || !link.getAttribute) return null;
        const rawHref = link.getAttribute('href');
        if (!rawHref) return null;
        if (/^(#|mailto:|tel:|javascript:)/i.test(rawHref)) return null;

        const parser = document.createElement('a');
        parser.href = rawHref;

        const origin =
            parser.origin ||
            `${window.location.protocol}//${window.location.host}`;
        const pathname = parser.pathname.charAt(0) === '/' ? parser.pathname : `/${parser.pathname}`;

        return { href: parser.href, origin, pathname };
    };

    const isChapterLink = (destination) =>
        destination &&
        destination.origin === window.location.origin &&
        chapterPathPattern.test(destination.pathname);

    const cleanTitle = (value) => value.replace(/\s+/g, ' ').trim();
    const tidyDisplayedTitle = (value) =>
        cleanTitle(value)
            .replace(/^[←→\s]+/, '')
            .replace(/[←→\s]+$/, '')
            .replace(/^\d+\s*/, '');

    const titleFromBookmarkMeta = () => {
        const meta = document.querySelector('[data-adjourn-meta]');
        if (!meta) return '';
        const raw = tidyDisplayedTitle(meta.textContent || '');
        if (!raw || /^No adjournment (on record|called)\.?$/i.test(raw)) return '';
        const [beforePage] = raw.split(' — Page ');
        return tidyDisplayedTitle(beforePage || '');
    };

    const titleFromLink = (link) => {
        if (link.matches('[data-adjourn-reconvene]')) return titleFromBookmarkMeta();
        return tidyDisplayedTitle(link.textContent || '');
    };

    const findAnchorFromEventTarget = (target) => {
        let node = target;
        while (node) {
            if (node.tagName && node.tagName.toLowerCase() === 'a' && node.getAttribute && node.getAttribute('href')) {
                return node;
            }
            node = node.parentNode;
        }
        return null;
    };

    document.addEventListener('click', (event) => {
        const link = findAnchorFromEventTarget(event.target);
        if (!link || isTransitioning) return;
        if (event.defaultPrevented) return;
        if (typeof event.button === 'number' && event.button !== 0) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        if (link.target && link.target !== '_self') return;
        if (link.hasAttribute('download')) return;

        const destination = getDestinationFromLink(link);
        if (!isChapterLink(destination)) return;

        event.preventDefault();
        isTransitioning = true;

        const chapterTitle = titleFromLink(link) || defaultTitle;
        if (titleNode) titleNode.textContent = chapterTitle;
        overlay.classList.add('is-visible');

        const delayMs = reducedMotionQuery.matches ? 260 : 2000;
        window.setTimeout(() => {
            window.location.href = destination.href;
        }, delayMs);
    }, true);
})();
