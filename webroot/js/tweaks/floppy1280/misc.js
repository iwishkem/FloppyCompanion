// Misc Tweaks

let miscCurrentState = { block_ed3: '0', gpu_clklck: '0', gpu_unlock: '0' };
let miscSavedState = { block_ed3: '0', gpu_clklck: '0', gpu_unlock: '0' };
let miscPendingState = { block_ed3: '0', gpu_clklck: '0', gpu_unlock: '0' };
let miscReferenceState = { block_ed3: '0', gpu_clklck: '0', gpu_unlock: '0' };
let miscCapabilities = { block_ed3: '0', gpu_clklck: '0', gpu_unlock: '0' };

const runMiscBackend = (...args) => window.runTweakBackend('misc', ...args);
const MISC_STATE_KEYS = ['block_ed3', 'gpu_clklck', 'gpu_unlock'];

function getEnabledDisabledText(val) {
    if (val === '1') {
        return window.t ? window.t('tweaks.misc.enabled') : 'Enabled';
    }
    return window.t ? window.t('tweaks.misc.disabled') : 'Disabled';
}

function getMiscSupportedKeys() {
    const keys = [];

    if (miscCapabilities.block_ed3 === '1') {
        keys.push('block_ed3');
    }

    if (miscCapabilities.gpu_clklck === '1' && window.KERNEL_NAME !== 'Floppy2100') {
        keys.push('gpu_clklck');
    }

    if (miscCapabilities.gpu_unlock === '1') {
        keys.push('gpu_unlock');
    }

    return keys;
}

function isMiscKeySupported(key) {
    return getMiscSupportedKeys().includes(key);
}

function updateMiscRowVisibility() {
    const rowBlocked3 = document.getElementById('misc-row-blocked3');
    const rowGpuClkLck = document.getElementById('misc-row-gpuclklck');
    const rowGpuUnlock = document.getElementById('misc-row-gpuunlock');

    const rowDefs = [
        { el: rowBlocked3, visible: isMiscKeySupported('block_ed3') },
        { el: rowGpuClkLck, visible: isMiscKeySupported('gpu_clklck') },
        { el: rowGpuUnlock, visible: isMiscKeySupported('gpu_unlock') }
    ];

    rowDefs.forEach(({ el, visible }) => {
        if (!el) return;
        el.classList.toggle('hidden', !visible);
        el.style.borderBottom = visible ? '1px solid var(--md-sys-color-outline-variant)' : '';
    });

    const visibleRows = rowDefs.filter(({ el, visible }) => el && visible).map(({ el }) => el);
    if (visibleRows.length > 0) {
        visibleRows[visibleRows.length - 1].style.borderBottom = 'none';
    }
}

function getGpuUnlockTooltipText() {
    const key = window.KERNEL_NAME === 'Floppy2100'
        ? 'tweaks.tooltip.gpuUnlock2100'
        : 'tweaks.tooltip.gpuUnlock';

    const translated = window.t ? window.t(key) : '';
    if (translated && !String(translated).startsWith(key)) {
        return translated;
    }

    return window.t ? window.t('tweaks.tooltip.gpuUnlock') : 'Enables GPU overclocking immediately.';
}

function updateMiscCopy() {
    const gpuUnlockBubble = document.getElementById('bubble-misc-gpuunlock');
    if (gpuUnlockBubble) {
        gpuUnlockBubble.textContent = getGpuUnlockTooltipText();
    }
}

function renderMiscCard() {
    updateMiscRowVisibility();
    updateMiscCopy();

    // Update value labels from current state
    const valBlocked3 = document.getElementById('misc-val-blocked3');
    const valGpuClkLck = document.getElementById('misc-val-gpuclklck');
    const valGpuUnlock = document.getElementById('misc-val-gpuunlock');

    if (valBlocked3) valBlocked3.textContent = getEnabledDisabledText(miscCurrentState.block_ed3);
    if (valGpuClkLck) valGpuClkLck.textContent = getEnabledDisabledText(miscCurrentState.gpu_clklck);
    if (valGpuUnlock) valGpuUnlock.textContent = getEnabledDisabledText(miscCurrentState.gpu_unlock);

    // Update switches from pending state
    const blockEd3Switch = document.getElementById('misc-blocked3-switch');
    const gpuClkLckSwitch = document.getElementById('misc-gpuclklck-switch');
    const gpuUnlockSwitch = document.getElementById('misc-gpuunlock-switch');

    if (blockEd3Switch) blockEd3Switch.checked = (miscPendingState.block_ed3 === '1');
    if (gpuClkLckSwitch) gpuClkLckSwitch.checked = (miscPendingState.gpu_clklck === '1');
    if (gpuUnlockSwitch) gpuUnlockSwitch.checked = (miscPendingState.gpu_unlock === '1');

    updateMiscPendingIndicator();
    updateGpuUnlockAvailability();
}

function updateMiscPendingIndicator() {
    const hasChanges = getMiscSupportedKeys().some((key) => miscPendingState[key] !== miscReferenceState[key]);

    window.setPendingIndicator('misc-pending-indicator', hasChanges);
}

function updateGpuUnlockAvailability() {
    const gpuUnlockSwitch = document.getElementById('misc-gpuunlock-switch');
    if (!gpuUnlockSwitch) return;

    const switchContainer = gpuUnlockSwitch.closest('.tweak-switch-container');
    if (!isMiscKeySupported('gpu_unlock')) {
        gpuUnlockSwitch.disabled = true;
        if (switchContainer) switchContainer.style.opacity = '0.5';
        return;
    }

    if (window.KERNEL_NAME === 'Floppy2100') {
        gpuUnlockSwitch.disabled = false;
        if (switchContainer) switchContainer.style.opacity = '1';
        return;
    }

    // If schema-driven control rules are available, let the generic engine handle it.
    if (window.__tweaksSchema) {
        const kernelName = window.KERNEL_NAME || '';
        if (kernelName !== 'Floppy1280') {
            applyControlAvailability(window.__tweaksSchema);
            return;
        }
    }

    // Prefer schema-declared condition, fallback to derived vars / raw superfloppy mode.
    let isOcMode = truthy(getTweakVar('isUnlockedOcMode'));
    if (!isOcMode) {
        const superfloppyMode = String(getTweakVar('superfloppyMode') ?? window.currentSuperfloppyMode ?? '0');
        isOcMode = ['1', '2', '3'].includes(superfloppyMode);
    }

    if (!isOcMode) {
        gpuUnlockSwitch.disabled = true;
        if (switchContainer) switchContainer.style.opacity = '0.5';
    } else {
        gpuUnlockSwitch.disabled = false;
        if (switchContainer) switchContainer.style.opacity = '1';
    }
}

async function loadMiscState() {
    const capabilitiesOutput = await runMiscBackend('get_capabilities');
    const capabilities = parseKeyValue(capabilitiesOutput);
    miscCapabilities = {
        block_ed3: capabilities.block_ed3 || '0',
        gpu_clklck: capabilities.gpu_clklck || '0',
        gpu_unlock: capabilities.gpu_unlock || '0'
    };

    // Get current kernel state
    const { current, saved } = await window.loadTweakState('misc');
    miscCurrentState = {
        block_ed3: current.block_ed3 || '0',
        gpu_clklck: current.gpu_clklck || '0',
        gpu_unlock: current.gpu_unlock || '0'
    };

    miscSavedState = { ...saved };

    const defMisc = window.getDefaultTweakPreset('misc');
    miscPendingState = window.initPendingState(miscCurrentState, miscSavedState, defMisc);

    const { reference } = window.resolveTweakReference(miscCurrentState, miscSavedState, defMisc);
    miscReferenceState = {
        block_ed3: reference.block_ed3 || '0',
        gpu_clklck: reference.gpu_clklck || '0',
        gpu_unlock: reference.gpu_unlock || '0'
    };

    renderMiscCard();
}

async function saveMisc() {
    for (const key of getMiscSupportedKeys()) {
        if (key === 'gpu_unlock') {
            const gpuUnlockSwitch = document.getElementById('misc-gpuunlock-switch');
            if (gpuUnlockSwitch && gpuUnlockSwitch.disabled) continue;
        }
        await runMiscBackend('save', key, miscPendingState[key]);
    }

    miscSavedState = { ...miscPendingState };
    miscReferenceState = { ...miscSavedState };
    updateMiscPendingIndicator();
    showToast(window.t ? window.t('toast.settingsSaved') : 'Saved');
}

async function applyMisc() {
    for (const key of getMiscSupportedKeys()) {
        if (key === 'gpu_unlock') {
            const gpuUnlockSwitch = document.getElementById('misc-gpuunlock-switch');
            if (gpuUnlockSwitch && gpuUnlockSwitch.disabled) continue;
        }
        await runMiscBackend('apply', key, miscPendingState[key]);
    }

    // Refresh only current kernel state so active values update,
    // but do NOT reset pending state back to saved.
    const currentOutput = await runMiscBackend('get_current');
    if (!currentOutput) {
        showToast(window.t ? window.t('toast.settingsFailed') : 'Failed to apply settings', true);
        return;
    }

    const current = parseKeyValue(currentOutput);
    miscCurrentState = {
        block_ed3: current.block_ed3 || '0',
        gpu_clklck: current.gpu_clklck || '0',
        gpu_unlock: current.gpu_unlock || '0'
    };

    renderMiscCard();
    showToast(window.t ? window.t('toast.settingsApplied') : 'Applied');
}

// Clear GPU unlock persistence (called on Unlocked Mode category change)
async function clearGpuUnlockPersistence() {
    await runMiscBackend('clear_saved_key', 'gpu_unlock');
    delete miscSavedState.gpu_unlock;
    miscPendingState.gpu_unlock = miscCurrentState.gpu_unlock;
    renderMiscCard();
}
window.clearGpuUnlockPersistence = clearGpuUnlockPersistence;

function initMiscTweak() {
    // Register tweak immediately (Early Registration)
    if (typeof window.registerTweak === 'function') {
        window.registerTweak('misc', {
            getState: () => ({ ...miscPendingState }),
            setState: (config) => {
                MISC_STATE_KEYS.forEach((key) => {
                    if (Object.prototype.hasOwnProperty.call(config || {}, key)) {
                        miscPendingState[key] = config[key];
                    }
                });
                renderMiscCard();
            },
            render: renderMiscCard,
            save: saveMisc,
            apply: applyMisc
        });
    }

    const miscCard = document.getElementById('misc-card');
    if (!miscCard) return;

    // Only show on Floppy1280 and Floppy2100
    if (window.KERNEL_NAME !== 'Floppy1280' && window.KERNEL_NAME !== 'Floppy2100') {
        miscCard.classList.add('hidden');
        return;
    }

    // Show card
    miscCard.classList.remove('hidden');

    const blockEd3Switch = document.getElementById('misc-blocked3-switch');
    const gpuClkLckSwitch = document.getElementById('misc-gpuclklck-switch');
    const gpuUnlockSwitch = document.getElementById('misc-gpuunlock-switch');

    // Switch change handlers - update pending state only
    if (blockEd3Switch) {
        blockEd3Switch.addEventListener('change', (e) => {
            miscPendingState.block_ed3 = e.target.checked ? '1' : '0';
            updateMiscPendingIndicator();
        });
    }

    if (gpuClkLckSwitch) {
        gpuClkLckSwitch.addEventListener('change', (e) => {
            miscPendingState.gpu_clklck = e.target.checked ? '1' : '0';
            updateMiscPendingIndicator();
        });
    }

    if (gpuUnlockSwitch) {
        gpuUnlockSwitch.addEventListener('change', (e) => {
            miscPendingState.gpu_unlock = e.target.checked ? '1' : '0';
            updateMiscPendingIndicator();
        });
    }

    window.bindSaveApplyButtons('misc', saveMisc, applyMisc);

    // Load initial state
    loadMiscState();

    if (window.KERNEL_NAME === 'Floppy1280') {
        // Track GPU unlock mode category for reset on transition
        let lastGpuUnlockCategory = null;

        // Listen for superfloppy mode changes
        document.addEventListener('superfloppyModeChanged', (e) => {
            const mode = String(e?.detail?.mode ?? window.currentSuperfloppyMode ?? '0');
            const newCategory = ['1', '2', '3'].includes(mode) ? 'oc' : 'other';

            // On category transition, clear saved gpu_unlock and reset to kernel default
            if (lastGpuUnlockCategory !== null && lastGpuUnlockCategory !== newCategory) {
                if (window.clearGpuUnlockPersistence) {
                    window.clearGpuUnlockPersistence();
                }
            }
            lastGpuUnlockCategory = newCategory;

            updateGpuUnlockAvailability();
        });

        // Seed initial category from current mode (so first real change can be detected)
        const initialMode = String(window.currentSuperfloppyMode ?? '0');
        lastGpuUnlockCategory = ['1', '2', '3'].includes(initialMode) ? 'oc' : 'other';
    }

    // Language change listener
    document.addEventListener('languageChanged', () => {
        renderMiscCard();
    });
}
