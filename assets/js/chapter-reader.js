(() => {
    const pagers = Array.from(document.querySelectorAll('[data-pageable]'));
    if (!pagers.length) return;

    const STORAGE_KEY = 'legalOutlaw.adjourn.v1';
    const shouldResumeFromQuery = new URLSearchParams(window.location.search).get('adjourn') === '1';
    const desktopQuery = window.matchMedia('(min-width: 1080px)');
    const chapterTitleNode = document.querySelector('.chapter-title');

    const currentChapterTitle = chapterTitleNode
        ? chapterTitleNode.textContent.trim()
        : document.title.replace(' — The Legal Outlaw', '').trim();

    const currentChapterHref = (() => {
        const slug = window.location.pathname.split('/').pop() || '';
        if (!slug) return 'index.html';
        return slug.endsWith('.html') ? slug : `${slug}.html`;
    })();

    const getMode = () => (desktopQuery.matches ? 'desktop' : 'mobile');

    const getBookmark = () => {
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

    const getResumePageForMode = (bookmark, mode) => {
        if (!bookmark || !bookmark.pages) return null;
        const current = bookmark.pages[mode];
        if (current && Number.isInteger(current.page)) return current.page;

        const fallbackMode = bookmark.lastMode;
        const fallback = fallbackMode && bookmark.pages[fallbackMode];
        if (fallback && Number.isInteger(fallback.page)) return fallback.page;

        return null;
    };

    const createTextPage = (nodes, dropcap) => {
        const page = document.createElement('article');
        page.className = 'chapter-page';
        if (dropcap) page.classList.add('has-dropcap');

        const body = document.createElement('div');
        body.className = 'body-text';
        nodes.forEach((node) => body.appendChild(node));
        page.appendChild(body);

        return page;
    };

    const createStandalonePage = (node) => {
        const page = document.createElement('article');
        page.className = 'chapter-page chapter-image-page';
        page.appendChild(node);
        return page;
    };

    pagers.forEach((pager) => {
        const source = pager.querySelector('[data-page-source]');
        const prevButton = pager.querySelector('[data-page-prev]');
        const nextButton = pager.querySelector('[data-page-next]');
        const indicator = pager.querySelector('[data-page-indicator]');

        if (!source || !prevButton || !nextButton || !indicator) return;

        const pageSizeMobile = Number.parseInt(pager.dataset.pageSizeMobile || '4', 10);
        const pageSizeDesktop = Number.parseInt(pager.dataset.pageSizeDesktop || '6', 10);

        const originalBlocks = Array.from(source.children).map((node) => node.cloneNode(true));
        let pageIndex = 0;
        let pages = [];
        let touchStartX = 0;
        let resumeApplied = false;

        const getPageSize = () => (desktopQuery.matches ? pageSizeDesktop : pageSizeMobile);

        const render = () => {
            pages.forEach((page, index) => page.classList.toggle('is-active', index === pageIndex));
            prevButton.disabled = pageIndex === 0;
            nextButton.disabled = pageIndex >= pages.length - 1;
            indicator.textContent = `Page ${pageIndex + 1} of ${pages.length}`;

            document.dispatchEvent(
                new CustomEvent('outlaw:page-change', {
                    detail: {
                        chapterHref: currentChapterHref,
                        chapterTitle: currentChapterTitle,
                        page: pageIndex + 1,
                        total: pages.length,
                        mode: getMode(),
                    },
                })
            );
        };

        const goTo = (index) => {
            if (!pages.length) return;
            pageIndex = Math.max(0, Math.min(index, pages.length - 1));
            render();
        };

        const build = () => {
            const blocks = originalBlocks.map((node) => node.cloneNode(true));
            const pageSize = Math.max(getPageSize(), 1);

            source.innerHTML = '';
            pages = [];

            let textBuffer = [];
            let seenTextPage = false;

            const flushTextBuffer = () => {
                if (!textBuffer.length) return;
                for (let i = 0; i < textBuffer.length; i += pageSize) {
                    const chunk = textBuffer.slice(i, i + pageSize);
                    const textPage = createTextPage(chunk, !seenTextPage);
                    seenTextPage = true;
                    source.appendChild(textPage);
                    pages.push(textPage);
                }
                textBuffer = [];
            };

            blocks.forEach((block) => {
                if (block.hasAttribute('data-standalone-page')) {
                    flushTextBuffer();
                    const standalonePage = createStandalonePage(block);
                    source.appendChild(standalonePage);
                    pages.push(standalonePage);
                    return;
                }
                textBuffer.push(block);
            });

            flushTextBuffer();

            if (!pages.length) {
                const empty = document.createElement('article');
                empty.className = 'chapter-page is-active';
                source.appendChild(empty);
                pages = [empty];
            }

            if (shouldResumeFromQuery && !resumeApplied) {
                const bookmark = getBookmark();
                if (bookmark && bookmark.chapterHref === currentChapterHref) {
                    const resumePage = getResumePageForMode(bookmark, getMode());
                    if (Number.isInteger(resumePage)) {
                        pageIndex = Math.max(0, Math.min(resumePage - 1, pages.length - 1));
                    }
                }
                resumeApplied = true;
            } else {
                pageIndex = Math.min(pageIndex, pages.length - 1);
            }

            render();
        };

        prevButton.addEventListener('click', () => goTo(pageIndex - 1));
        nextButton.addEventListener('click', () => goTo(pageIndex + 1));

        pager.addEventListener('touchstart', (event) => {
            touchStartX = event.changedTouches[0].clientX;
        });

        pager.addEventListener('touchend', (event) => {
            const touchEndX = event.changedTouches[0].clientX;
            const deltaX = touchEndX - touchStartX;
            if (Math.abs(deltaX) < 64) return;
            if (deltaX < 0) goTo(pageIndex + 1);
            if (deltaX > 0) goTo(pageIndex - 1);
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'ArrowRight') goTo(pageIndex + 1);
            if (event.key === 'ArrowLeft') goTo(pageIndex - 1);
        });

        if (desktopQuery.addEventListener) {
            desktopQuery.addEventListener('change', build);
        } else {
            desktopQuery.addListener(build);
        }

        build();
    });
})();
