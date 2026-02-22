const STOPPING_ICON_SELECTOR = 'svg:has(use[*|href="#pplx-icon-player-stop-filled"])';
const RUNNING_ICON = "🏃";
const RUNNING_TITLEBAR_ENABLED_KEY = "runningTitlebarEnabled";

const OBSERVER_FLAG_KEY = "__perplexityMiniToolsRunningTitlebarObserverInstalled";

function stripRunningPrefix(title) {
	const prefix = `${RUNNING_ICON} `;
	if (title.startsWith(prefix)) {
		return title.slice(prefix.length);
	}
	return title;
}

function createRunningTitlebar() {
	if (window[OBSERVER_FLAG_KEY]) {
		return;
	}
	window[OBSERVER_FLAG_KEY] = true;

	let isRunning = false;
	let isApplyingTitle = false;
	let isSyncScheduled = false;

	const applyTitle = () => {
		const baseTitle = stripRunningPrefix(document.title);
		const nextTitle = isRunning ? `${RUNNING_ICON} ${baseTitle}` : baseTitle;

		if (document.title !== nextTitle) {
			isApplyingTitle = true;
			document.title = nextTitle;
			isApplyingTitle = false;
		}
	};

	const syncRunningState = () => {
		const hasStoppingIcon = Boolean(document.querySelector(STOPPING_ICON_SELECTOR));
		if (hasStoppingIcon !== isRunning) {
			isRunning = hasStoppingIcon;
			applyTitle();
			return;
		}

		if (isRunning && !document.title.startsWith(`${RUNNING_ICON} `)) {
			applyTitle();
		}

		if (!isRunning && document.title.startsWith(`${RUNNING_ICON} `)) {
			applyTitle();
		}
	};

	const scheduleSync = () => {
		if (isSyncScheduled) {
			return;
		}
		isSyncScheduled = true;
		queueMicrotask(() => {
			isSyncScheduled = false;
			syncRunningState();
		});
	};

	const observer = new MutationObserver(() => {
		if (isApplyingTitle) {
			return;
		}
		scheduleSync();
	});

	observer.observe(document.documentElement, {
		childList: true,
		subtree: true,
		characterData: true,
	});

	syncRunningState();
}

function initializeRunningTitlebar() {
	if (typeof chrome === "undefined" || !chrome.storage?.local) {
		createRunningTitlebar();
		return;
	}

	chrome.storage.local.get([RUNNING_TITLEBAR_ENABLED_KEY], (data) => {
		const isEnabled = data[RUNNING_TITLEBAR_ENABLED_KEY] !== false;
		if (!isEnabled) {
			document.title = stripRunningPrefix(document.title);
			return;
		}
		createRunningTitlebar();
	});
}

if (document.documentElement) {
	initializeRunningTitlebar();
} else {
	document.addEventListener("DOMContentLoaded", initializeRunningTitlebar, { once: true });
}
