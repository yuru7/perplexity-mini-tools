// 検索結果画面で、目次を表示する。
// 目次にするための要素 (以降、"目次要素"と呼ぶ) は、 document.querySelectorAll('.group\\/title') で取得できる
// 目次は、画面右上に固定表示します。
// 目次アイテムをクリックすると、そのアイテムの位置にスクロールします。
// アクティブになっている目次対象の要素が画面に表示されている場合、目次アイテムには左側に縦の白色の帯を表示します
// 対象ページはSPAアプリなので、 MutationObserver で監視して、随時目次を更新する
// 目次アイテムの表示文字は、目次要素のテキストをそのまま表示します。
// 目次アイテムの表示順は、目次要素の出現順になります。
// 目次アイテムの表示は、最大2行とする。
(() => {
  let tocContainer = null;
  let currentTocItems = [];
  let isScrolling = false;
  let isEnabled = false; // TOC機能の有効/無効状態
  let scrollTimeout;

  // 設定を読み込んでTOC機能を初期化
  function initializeToc() {
    if (typeof chrome !== "undefined" && chrome.storage) {
      chrome.storage.local.get(["tocEnabled"], (data) => {
        // デフォルトは有効
        isEnabled = data.tocEnabled !== false;
      });
    } else {
      // Chrome APIが利用できない場合はデフォルトで有効
      isEnabled = true;
    }
  }

  // 目次コンテナーを作成
  function createTocContainer() {
    if (tocContainer) {
      tocContainer.remove();
    }

    tocContainer = document.createElement("div");
    tocContainer.id = "toc-container";

    // インジケーター部分（常に表示）
    const indicator = document.createElement("div");
    indicator.className = "toc-indicator";

    // TOC本体（ホバー時に表示）
    const tocBody = document.createElement("div");
    tocBody.classList.add(
      "toc-body",
      "scrollbar-subtle" // HACK: Perplexityのスクロールバーのスタイルを適用
    );

    // ホバーイベント
    tocContainer.addEventListener("mouseenter", () => {
      tocBody.classList.add("visible");
    });

    tocContainer.addEventListener("mouseleave", () => {
      tocBody.classList.remove("visible");
    });

    tocContainer.appendChild(indicator);
    tocContainer.appendChild(tocBody);
    document.body.appendChild(tocContainer);
  }

  // 目次アイテムを作成
  function createTocItem(element, index) {
    const item = document.createElement("div");
    item.className = "toc-item";

    // インジケーター上のポイント
    const indicatorPoint = document.createElement("div");
    indicatorPoint.className = "indicator-point";

    // クリックでスクロール
    const scrollToElement = () => {
      isScrolling = true;

      // クリック時に即座にアクティブアイテムを更新
      setActiveItem(index);

      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });

      // スクロール完了後にフラグをリセットし、再度更新
      setTimeout(() => {
        isScrolling = false;
        if (!scrollTimeout) {
          updateActiveItem();
        }
      }, 1000);
    };

    item.addEventListener("click", scrollToElement);
    indicatorPoint.addEventListener("click", scrollToElement);

    let textContent = "";
    let query = element.querySelector(".group\\/query");
    if (query) {
      textContent = query.textContent.trim();
    } else {
      textContent = element.textContent.trim();
    }
    item.textContent =
      textContent.length > 170
        ? textContent.substring(0, 170) + "..."
        : textContent;
    item.dataset.index = index;
    indicatorPoint.dataset.index = index;

    return { item, indicatorPoint };
  }

  // 目次を更新
  function updateToc() {
    const tocElements = document.querySelectorAll(".group\\/title");

    if (tocElements.length === 0) {
      if (tocContainer) {
        tocContainer.style.display = "none";
      }
      return;
    }

    if (!tocContainer) {
      createTocContainer();
    } else {
      tocContainer.style.display = "block";
    }

    const indicator = tocContainer.querySelector(".toc-indicator");
    const tocBody = tocContainer.querySelector(".toc-body");

    // 既存の目次アイテムをクリア
    const existingItems = tocBody.querySelectorAll(".toc-item");
    const existingPoints = indicator.querySelectorAll(".indicator-point");
    existingItems.forEach((item) => item.remove());
    existingPoints.forEach((point) => point.remove());

    currentTocItems = [];

    // インジケーターの高さを計算
    const totalHeight = Math.max(200, tocElements.length * 14);
    indicator.style.height = `${totalHeight}px`;

    // 新しい目次アイテムを作成
    tocElements.forEach((element, index) => {
      const { item, indicatorPoint } = createTocItem(element, index);

      // TOC本体に追加
      tocBody.appendChild(item);

      // インジケーターに追加
      indicator.appendChild(indicatorPoint);

      currentTocItems.push({
        element: element,
        tocItem: item,
        indicatorPoint: indicatorPoint,
      });
    });

    // 初回のアクティブアイテム更新
    updateActiveItem();
  }

  // 指定したインデックスのアイテムをアクティブにする
  function setActiveItem(activeIndex) {
    if (currentTocItems.length === 0) return;

    // 全ての目次アイテムから active クラスを削除
    currentTocItems.forEach((item) => {
      item.tocItem.classList.remove("active");
      item.indicatorPoint.classList.remove("active");
    });

    // 指定されたアイテムにクラスを追加
    if (activeIndex >= 0 && activeIndex < currentTocItems.length) {
      currentTocItems[activeIndex].tocItem.classList.add("active");
      currentTocItems[activeIndex].indicatorPoint.classList.add("active");
    }
  }

  // アクティブな目次アイテムを更新
  function updateActiveItem() {
    if (isScrolling || currentTocItems.length === 0) return;

    let activeIndex = -1;

    // 現在画面に表示されている要素を検索
    let beforeTop = 0;
    for (let i = 0; i < currentTocItems.length; i++) {
      const element = currentTocItems[i].element;
      const rect = element.getBoundingClientRect();

      if (
        (i == 0 && rect.top >= 0) ||
        (i == currentTocItems.length - 1 && rect.top <= 0) ||
        (beforeTop < 0 && rect.top < 60 && rect.top > 0)
      ) {
        activeIndex = i;
        break;
      }

      if (beforeTop < 0 && rect.top >= 0) {
        activeIndex = i - 1;
        break;
      }

      beforeTop = rect.top;
    }

    // 全ての目次アイテムから active クラスを削除
    currentTocItems.forEach((item) => {
      item.tocItem.classList.remove("active");
      item.indicatorPoint.classList.remove("active");
    });

    // アクティブな目次アイテムにクラスを追加
    if (activeIndex >= 0) {
      currentTocItems[activeIndex].tocItem.classList.add("active");
      currentTocItems[activeIndex].indicatorPoint.classList.add("active");
    }
  }

  // MutationObserver でDOMの変更を監視
  let updateTimeout;
  const observer = new MutationObserver((mutations) => {
    if (!isEnabled) {
      return;
    }
    if (!location.pathname.startsWith("/search")) {
      if (tocContainer) {
        tocContainer.remove();
        tocContainer = null;
      }
      return;
    }

    let shouldUpdate = false;

    mutations.forEach((mutation) => {
      // 新しいノードが追加されたか、削除されたかをチェック
      if (mutation.type === "childList") {
        const addedNodes = Array.from(mutation.addedNodes);
        const removedNodes = Array.from(mutation.removedNodes);

        // 目次要素が含まれているかチェック
        const hasRelevantChanges = [...addedNodes, ...removedNodes].some(
          (node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              return (
                node.matches(".group\\/title") ||
                node.querySelector(".group\\/title")
              );
            }
            return false;
          }
        );

        if (hasRelevantChanges) {
          shouldUpdate = true;
        }

        // スクロールイベントでアクティブアイテムを更新
        if (isScrolling) {
          return;
        }
        const scrollableContainer = document.querySelector(
          ".scrollable-container"
        );
        if (
          scrollableContainer &&
          scrollableContainer.dataset.tocEnabled !== "true"
        ) {
          scrollableContainer.dataset.tocEnabled = "true";
          scrollableContainer.addEventListener(
            "scroll",
            () => {
              //   clearTimeout(scrollTimeout);
              if (scrollTimeout) {
                return;
              }
              scrollTimeout = setTimeout(() => {
                updateActiveItem();
                scrollTimeout = null;
              }, 300);
            },
            { passive: true }
          );
        }
      }
    });

    if (shouldUpdate) {
      // 少し遅延させて更新（DOM更新の完了を待つため）
      clearTimeout(updateTimeout);
      updateTimeout = setTimeout(updateToc, 500);
    }
  });

  // 監視開始
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // 初期化
  initializeToc();

  // ページ読み込み完了時に更新
  if (location.pathname.startsWith("/search")) {
    if (document.readyState === "complete") {
      updateToc();
    } else {
      document.addEventListener("DOMContentLoaded", updateToc);
    }
  }
})();
