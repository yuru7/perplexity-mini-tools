const STOPPING_ICON_SELECTOR =
  'svg:has(use[*|href="#pplx-icon-player-stop-filled"])';
const RUNNING_ICON = "🏃";
const UNREAD_COMPLETED_ICON = "✅️";
const RUNNING_TITLEBAR_ENABLED_KEY = "runningTitlebarEnabled";

const OBSERVER_FLAG_KEY =
  "__perplexityMiniToolsRunningTitlebarObserverInstalled";

function stripRunningPrefix(title) {
  const prefix = `${RUNNING_ICON} `;
  if (title.startsWith(prefix)) {
    return title.slice(prefix.length);
  }
  return title;
}

function stripUnreadCompletedPrefix(title) {
  const prefix = `${UNREAD_COMPLETED_ICON} `;
  if (title.startsWith(prefix)) {
    return title.slice(prefix.length);
  }
  return title;
}

function stripManagedPrefixes(title) {
  return stripUnreadCompletedPrefix(stripRunningPrefix(title));
}

function createRunningTitlebar() {
  if (window[OBSERVER_FLAG_KEY]) {
    return;
  }
  window[OBSERVER_FLAG_KEY] = true;

  let isRunning = false;
  let hasUnreadCompletion = false;
  let isApplyingTitle = false;
  let isSyncScheduled = false;

  const applyTitle = () => {
    const baseTitle = stripManagedPrefixes(document.title);
    const prefixes = [];
    if (hasUnreadCompletion) {
      prefixes.push(UNREAD_COMPLETED_ICON);
    }
    if (isRunning) {
      prefixes.push(RUNNING_ICON);
    }
    const nextTitle =
      prefixes.length > 0 ? `${prefixes.join(" ")} ${baseTitle}` : baseTitle;

    if (document.title !== nextTitle) {
      isApplyingTitle = true;
      document.title = nextTitle;
      isApplyingTitle = false;
    }
  };

  const syncRunningState = () => {
    const hasStoppingIcon = Boolean(
      document.querySelector(STOPPING_ICON_SELECTOR),
    );
    if (hasStoppingIcon !== isRunning) {
      const wasRunning = isRunning;
      isRunning = hasStoppingIcon;
      if (wasRunning && !isRunning) {
        hasUnreadCompletion =
          document.visibilityState !== "visible" || !document.hasFocus();
      }
      if (!wasRunning && isRunning) {
        hasUnreadCompletion = false;
      }
      applyTitle();
      return;
    }

    applyTitle();
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

  // タブが非アクティブな状態で完了した場合に未読完了状態をクリア
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && hasUnreadCompletion) {
      hasUnreadCompletion = false;
      applyTitle();
    }
  });

  // ブラウザウィンドウがアクティブになったときにも未読完了状態をクリア
  window.addEventListener("focus", () => {
    if (hasUnreadCompletion && document.visibilityState === "visible") {
      hasUnreadCompletion = false;
      applyTitle();
    }
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
      document.title = stripManagedPrefixes(document.title);
      return;
    }
    createRunningTitlebar();
  });
}

if (document.documentElement) {
  initializeRunningTitlebar();
} else {
  document.addEventListener("DOMContentLoaded", initializeRunningTitlebar, {
    once: true,
  });
}
