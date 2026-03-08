(() => {
    const UNLOCK_KEY = 'legalOutlaw.vaultUnlocked.v1';
    const VAULT_PAGE = 'vault.html';
    const targetChapterPattern = /\/chapter-27(\.html)?$/i;

    const slug = window.location.pathname.split('/').pop() || '';
    const pathname = slug ? `/${slug}` : '/index.html';
    if (!targetChapterPattern.test(pathname)) return;

    let unlocked = false;
    try {
        unlocked = window.sessionStorage && window.sessionStorage.getItem(UNLOCK_KEY) === 'granted';
    } catch (error) {
        unlocked = false;
    }

    if (unlocked) return;

    const next = `${slug || 'chapter-27.html'}${window.location.search || ''}${window.location.hash || ''}`;
    const destination = `${VAULT_PAGE}?next=${encodeURIComponent(next)}`;
    window.location.replace(destination);
})();
