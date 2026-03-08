(() => {
    const ACCESS_KEY = 'legalOutlaw.pinAccess.v1';
    const REQUIRED_PIN = '1234';
    const LOGIN_PAGE = 'login.html';
    const FALLBACK_PAGE = 'contents.html';

    const getAccess = () => {
        try {
            if (!window.sessionStorage) return null;
            return window.sessionStorage.getItem(ACCESS_KEY);
        } catch (error) {
            return null;
        }
    };

    const setAccess = (value) => {
        try {
            if (window.sessionStorage) window.sessionStorage.setItem(ACCESS_KEY, value);
        } catch (error) {
            // Ignore storage write errors.
        }
    };

    // Clear any legacy persistent grant so access is session-only going forward.
    try {
        if (window.localStorage) window.localStorage.removeItem(ACCESS_KEY);
    } catch (error) {
        // Ignore unavailable storage.
    }

    const getCurrentPage = () => {
        const slug = window.location.pathname.split('/').pop() || '';
        if (!slug) return 'index.html';
        return slug;
    };

    const isSafeNextTarget = (value) => {
        if (!value) return false;
        if (/^(https?:)?\/\//i.test(value)) return false;
        if (/^(#|mailto:|tel:|javascript:)/i.test(value)) return false;
        return /\.html([?#].*)?$/i.test(value);
    };

    const getRequestedTarget = () => {
        const params = new URLSearchParams(window.location.search);
        const next = params.get('next') || '';
        return isSafeNextTarget(next) ? next : '';
    };

    const buildLoginHref = () => {
        const current = getCurrentPage();
        const suffix = `${current}${window.location.search || ''}${window.location.hash || ''}`;
        return `${LOGIN_PAGE}?next=${encodeURIComponent(suffix)}`;
    };

    const currentPage = getCurrentPage();
    const isLoginPage = currentPage.toLowerCase() === LOGIN_PAGE;
    const hasAccess = getAccess() === 'granted';

    if (!isLoginPage && !hasAccess) {
        window.location.replace(buildLoginHref());
        return;
    }

    if (isLoginPage && hasAccess) {
        window.location.replace(getRequestedTarget() || FALLBACK_PAGE);
        return;
    }

    document.addEventListener('DOMContentLoaded', () => {
        if (!isLoginPage) return;

        const form = document.querySelector('[data-pin-form]');
        const input = document.querySelector('[data-pin-input]');
        const error = document.querySelector('[data-pin-error]');

        if (!form || !input) return;

        form.addEventListener('submit', (event) => {
            event.preventDefault();

            const entered = String(input.value || '').trim();
            if (entered === REQUIRED_PIN) {
                setAccess('granted');
                if (error) error.textContent = '';
                window.location.replace(getRequestedTarget() || FALLBACK_PAGE);
                return;
            }

            if (error) error.textContent = 'Incorrect PIN. Please try again.';
            input.focus();
            input.select();
        });
    });
})();
