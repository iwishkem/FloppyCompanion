// Misc runtime features

let miscFeaturesCurrentState = { block_cpuset: '0', block_sched_setaffinity: '0' };
let miscFeaturesSavedState = { block_cpuset: '0', block_sched_setaffinity: '0' };
let miscFeaturesPendingState = { block_cpuset: '0', block_sched_setaffinity: '0' };
let miscFeaturesReferenceState = { block_cpuset: '0', block_sched_setaffinity: '0' };
let miscFeaturesCapabilities = { block_cpuset: '0', block_sched_setaffinity: '0' };
let miscFeaturesInitialized = false;
let miscFeaturesUiBound = false;

const runMiscFeaturesBackend = (...args) => window.runTweakBackend('misc_features', ...args);
const MISC_FEATURES_KEYS = ['block_cpuset', 'block_sched_setaffinity'];

function getMiscFeaturesEnabledDisabledText(val) {
    if (val === '1') {
        return window.t ? window.t('tweaks.miscFeatures.enabled') : 'Enabled';
    }
    return window.t ? window.t('tweaks.miscFeatures.disabled') : 'Disabled';
}

function getSupportedMiscFeatureKeys() {
    return MISC_FEATURES_KEYS.filter((key) => miscFeaturesCapabilities[key] === '1');
}

function setMiscFeaturesCardVisibility(visible) {
    const card = document.getElementById('misc-features-card');
    if (card) {
        card.classList.toggle('hidden', !visible);
    }
}

function updateMiscFeaturesRowVisibility() {
    const rowDefs = [
        { id: 'misc-features-row-block-cpuset', visible: miscFeaturesCapabilities.block_cpuset === '1' },
        { id: 'misc-features-row-block-sched-setaffinity', visible: miscFeaturesCapabilities.block_sched_setaffinity === '1' }
    ];

    rowDefs.forEach(({ id, visible }) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.toggle('hidden', !visible);
        el.style.borderBottom = visible ? '1px solid var(--md-sys-color-outline-variant)' : '';
    });

    const visibleRows = rowDefs
        .map(({ id }) => document.getElementById(id))
        .filter((row) => row && !row.classList.contains('hidden'));
    if (visibleRows.length > 0) {
        visibleRows[visibleRows.length - 1].style.borderBottom = 'none';
    }
}

function renderMiscFeaturesCard() {
    const blockCpusetValue = document.getElementById('misc-features-val-block-cpuset');
    const blockSchedValue = document.getElementById('misc-features-val-block-sched-setaffinity');

    if (blockCpusetValue) blockCpusetValue.textContent = getMiscFeaturesEnabledDisabledText(miscFeaturesCurrentState.block_cpuset);
    if (blockSchedValue) blockSchedValue.textContent = getMiscFeaturesEnabledDisabledText(miscFeaturesCurrentState.block_sched_setaffinity);

    const blockCpusetSwitch = document.getElementById('misc-features-block-cpuset-switch');
    const blockSchedSwitch = document.getElementById('misc-features-block-sched-setaffinity-switch');

    if (blockCpusetSwitch) blockCpusetSwitch.checked = miscFeaturesPendingState.block_cpuset === '1';
    if (blockSchedSwitch) blockSchedSwitch.checked = miscFeaturesPendingState.block_sched_setaffinity === '1';

    updateMiscFeaturesRowVisibility();
    setMiscFeaturesCardVisibility(getSupportedMiscFeatureKeys().length > 0);
    updateMiscFeaturesPendingIndicator();
}

function updateMiscFeaturesPendingIndicator() {
    const hasChanges = getSupportedMiscFeatureKeys().some((key) => miscFeaturesPendingState[key] !== miscFeaturesReferenceState[key]);
    window.setPendingIndicator('misc_features-pending-indicator', hasChanges);
}

async function loadMiscFeaturesState() {
    const capabilitiesOutput = await runMiscFeaturesBackend('get_capabilities');
    const capabilities = parseKeyValue(capabilitiesOutput);
    miscFeaturesCapabilities = {
        block_cpuset: capabilities.block_cpuset || '0',
        block_sched_setaffinity: capabilities.block_sched_setaffinity || '0'
    };

    const { current, saved } = await window.loadTweakState('misc_features');
    miscFeaturesCurrentState = {
        block_cpuset: current.block_cpuset || '0',
        block_sched_setaffinity: current.block_sched_setaffinity || '0'
    };

    const defaults = window.getDefaultTweakPreset('misc_features');
    miscFeaturesSavedState = window.buildSparseStateAgainstDefaults(saved, defaults);

    const effectiveReferenceState = window.initPendingState(miscFeaturesCurrentState, miscFeaturesSavedState, defaults);
    miscFeaturesPendingState = { ...effectiveReferenceState };
    miscFeaturesReferenceState = {
        block_cpuset: effectiveReferenceState.block_cpuset || '0',
        block_sched_setaffinity: effectiveReferenceState.block_sched_setaffinity || '0'
    };

    miscFeaturesInitialized = true;
    renderMiscFeaturesCard();
}
window.loadMiscFeaturesState = loadMiscFeaturesState;

async function saveMiscFeatures() {
    for (const key of getSupportedMiscFeatureKeys()) {
        await runMiscFeaturesBackend('save', key, miscFeaturesPendingState[key]);
        miscFeaturesSavedState[key] = miscFeaturesPendingState[key];
        miscFeaturesReferenceState[key] = miscFeaturesPendingState[key];
    }

    renderMiscFeaturesCard();
    showToast(window.t ? window.t('toast.settingsSaved') : 'Saved');
}

async function applyMiscFeatures() {
    for (const key of getSupportedMiscFeatureKeys()) {
        await runMiscFeaturesBackend('apply', key, miscFeaturesPendingState[key]);
    }

    const currentOutput = await runMiscFeaturesBackend('get_current');
    if (!currentOutput) {
        showToast(window.t ? window.t('toast.settingsFailed') : 'Failed to apply settings', true);
        return;
    }

    const current = parseKeyValue(currentOutput);
    miscFeaturesCurrentState = {
        block_cpuset: current.block_cpuset || '0',
        block_sched_setaffinity: current.block_sched_setaffinity || '0'
    };

    renderMiscFeaturesCard();
    showToast(window.t ? window.t('toast.settingsApplied') : 'Applied');
}

function initMiscFeaturesTweak() {
    const card = document.getElementById('misc-features-card');
    if (!card) return;

    if (window.KERNEL_NAME !== 'Floppy2100') {
        card.classList.add('hidden');
        return;
    }

    if (typeof window.registerTweak === 'function') {
        window.registerTweak('misc_features', {
            getState: () => ({ ...miscFeaturesPendingState }),
            setState: (config) => {
                miscFeaturesPendingState = { ...miscFeaturesPendingState, ...config };
                renderMiscFeaturesCard();
            },
            render: renderMiscFeaturesCard,
            save: saveMiscFeatures,
            apply: applyMiscFeatures
        });
    }

    if (miscFeaturesUiBound) {
        if (!miscFeaturesInitialized) {
            loadMiscFeaturesState();
            return;
        }
        renderMiscFeaturesCard();
        return;
    }

    miscFeaturesUiBound = true;

    const blockCpusetSwitch = document.getElementById('misc-features-block-cpuset-switch');
    const blockSchedSwitch = document.getElementById('misc-features-block-sched-setaffinity-switch');

    if (blockCpusetSwitch) {
        blockCpusetSwitch.addEventListener('change', (e) => {
            miscFeaturesPendingState.block_cpuset = e.target.checked ? '1' : '0';
            updateMiscFeaturesPendingIndicator();
        });
    }

    if (blockSchedSwitch) {
        blockSchedSwitch.addEventListener('change', (e) => {
            miscFeaturesPendingState.block_sched_setaffinity = e.target.checked ? '1' : '0';
            updateMiscFeaturesPendingIndicator();
        });
    }

    window.bindSaveApplyButtons('misc_features', saveMiscFeatures, applyMiscFeatures);

    document.addEventListener('languageChanged', renderMiscFeaturesCard);

    runMiscFeaturesBackend('is_available').then((availability) => {
        const available = parseKeyValue(availability).available === '1';
        if (!available) {
            setMiscFeaturesCardVisibility(false);
            return;
        }

        loadMiscFeaturesState();
    });
}

window.initMiscFeaturesTweak = initMiscFeaturesTweak;
