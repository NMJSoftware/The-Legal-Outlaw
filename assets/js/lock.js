(() => {
    const UNLOCK_KEY = 'legalOutlaw.vaultUnlocked.v1';
    const game = document.querySelector('[data-vault-game]');
    if (!game) return;

    const indicators = Array.from(game.querySelectorAll('[data-indicator]'));
    const button = game.querySelector('[data-lock-btn]');
    const status = game.querySelector('[data-lock-status]');
    const reward = game.querySelector('[data-lock-reward]');

    if (!indicators.length || !button || !status || !reward) return;

    let currentIndex = 0;
    let isSettling = false;
    let solved = false;

    const getUnlocked = () => {
        try {
            return window.sessionStorage && window.sessionStorage.getItem(UNLOCK_KEY) === 'granted';
        } catch (error) {
            return false;
        }
    };

    const setUnlocked = () => {
        try {
            if (window.sessionStorage) window.sessionStorage.setItem(UNLOCK_KEY, 'granted');
        } catch (error) {
            // Ignore storage write errors.
        }
    };

    const setStatus = (text) => {
        status.textContent = text;
    };

    const enableReward = () => {
        reward.classList.remove('is-disabled');
        reward.removeAttribute('aria-disabled');
    };

    const disableReward = () => {
        reward.classList.add('is-disabled');
        reward.setAttribute('aria-disabled', 'true');
    };

    const startAnimations = () => {
        indicators.forEach((indicator, index) => {
            indicator.classList.add('is-animating');
            indicator.style.animationDuration = `${1 + index * 0.45}s`;
            indicator.style.top = '0px';
        });
    };

    const resetGame = () => {
        currentIndex = 0;
        solved = false;
        isSettling = false;
        disableReward();
        button.disabled = false;
        button.textContent = 'Pick Tumbler';
        setStatus('Awaiting first pick...');
        startAnimations();
    };

    const lockOpenState = () => {
        solved = true;
        isSettling = false;
        setUnlocked();
        enableReward();
        button.disabled = true;
        button.textContent = 'Vault Open';
        setStatus('Access granted. Vault unlocked.');
        indicators.forEach((indicator) => {
            indicator.classList.remove('is-animating');
            indicator.style.top = '39%';
        });
    };

    const isInSweetSpot = (indicator) => {
        const tumbler = indicator.parentElement;
        if (!tumbler) return false;

        const tumblerHeight = tumbler.clientHeight;
        const indicatorHeight = indicator.clientHeight;
        const maxTravel = Math.max(tumblerHeight - indicatorHeight, 1);
        const currentTop = Number.parseFloat(window.getComputedStyle(indicator).top) || 0;

        const minSpot = maxTravel * 0.37;
        const maxSpot = maxTravel * 0.63;
        return currentTop >= minSpot && currentTop <= maxSpot;
    };

    button.addEventListener('click', () => {
        if (isSettling) return;
        if (solved) return;

        const indicator = indicators[currentIndex];
        if (!indicator) return;

        const top = Number.parseFloat(window.getComputedStyle(indicator).top) || 0;
        indicator.classList.remove('is-animating');
        indicator.style.top = `${top}px`;

        if (isInSweetSpot(indicator)) {
            currentIndex += 1;

            if (currentIndex === indicators.length) {
                lockOpenState();
            } else {
                setStatus(`Tumbler ${currentIndex} set. Continue...`);
            }
            return;
        }

        isSettling = true;
        setStatus('Lock jammed. Resetting...');
        window.setTimeout(() => {
            resetGame();
        }, 1200);
    });

    reward.addEventListener('click', (event) => {
        if (reward.classList.contains('is-disabled')) {
            event.preventDefault();
        }
    });

    if (getUnlocked()) {
        lockOpenState();
    } else {
        resetGame();
    }
})();
