(() => {
  const MODEL_SELECT_AREA_ITEM_SELECTOR = "div.group\\/item";
  const MODEL_SELECT_AREA_ITEM_CHECKED_SELECTOR = ".tabler-icon";
  const MAIN_TEXTAREA_SELECTOR = "main div:has(#ask-input):has(button)";
  const TOP_EDITABLE_DIV_ID = "ask-input";

  const SEARCH_SOURCE_AREA_ITEM_SELECTOR = MODEL_SELECT_AREA_ITEM_SELECTOR;
  const AI_MODEL_BUTTON_GROUP_SELECTOR =
    "button.group\\/button:not([data-testid])"; // 同じclass名を持った要素が複数あるので、それは呼出時に調整する
  const SEARCH_SOURCE_BUTTON_SELECTOR =
    'button[data-testid="sources-switcher-button"]';

  const LIBRARY_PATHNAME = "/library";
  const SPACES_PATHNAME = "/spaces";
  const SPACE_DETAIL_PATHNAME = "/collections";
  const SEARCH_PATHNAME = "/search";
  const PAGE_PATHNAME = "/page";

  const UP = 0;
  const DOWN = 1;
  const SELECT_SEARCH_MODE = 1;
  const SELECT_AI_MODEL = 2;

  const SEARCH_MODE_BUTTONS_LENGTH = 3;
  const SEARCH_SOURCE_BUTTON_POS = 1;

  const libraryLinks = {
    activeIndex: -1,
    links: [],
    init: (outer) => {
      const beforeLinks = libraryLinks.links;
      libraryLinks.links = Array.from(
        outer.querySelectorAll(`a[href^="${SEARCH_PATHNAME}/"]`)
      );

      if (libraryLinks.links.length === 0) {
        return;
      }

      // 自動ページネーションが発動したかの判定
      let skipIndexInit = false;
      if (
        libraryLinks.activeIndex != -1 &&
        beforeLinks.length <= libraryLinks.links.length
      ) {
        let tmp = true;
        for (let i = 0; i < beforeLinks.length; i++) {
          if (
            beforeLinks[i].getAttribute("href") !==
            libraryLinks.links[i].getAttribute("href")
          ) {
            tmp = false;
            break;
          }
        }
        skipIndexInit = tmp;
      }

      // ブラウザバックの場合
      if (
        libraryLinks.activeIndex != -1 &&
        beforeLinks.length === libraryLinks.links.length
      ) {
        let tmp = true;
        for (let i = 0; i < libraryLinks.links.length; i++) {
          if (
            beforeLinks[i].getAttribute("href") !==
            libraryLinks.links[i].getAttribute("href")
          ) {
            tmp = false;
            break;
          }
        }
        skipIndexInit = tmp;
      }

      if (skipIndexInit) {
        for (let i = 0; i < libraryLinks.links.length; i++) {
          if (i === libraryLinks.activeIndex) {
            libraryLinks.links[i].classList.add("search-result-active");
          } else {
            libraryLinks.links[i].classList.remove("search-result-active");
          }
        }
        return;
      }

      // アクティブ項目の初期化
      const beforeActiveIndex = libraryLinks.activeIndex;
      libraryLinks.activeIndex = 0;
      for (let i = 0; i < libraryLinks.links.length; i++) {
        if (i === 0) {
          libraryLinks.links[i].classList.add("search-result-active");
        } else {
          libraryLinks.links[i].classList.remove("search-result-active");
        }
      }
      if (beforeActiveIndex > 0) {
        libraryLinks.links[0].scrollIntoView({
          block: "center",
        });
      }
      return;
    },
  };

  const timerManager = {
    timers: {},

    // 後勝ちタイマー
    debounce(id, delay, func) {
      // 既存のタイマーがあればキャンセル
      if (this.timers[id]) {
        clearTimeout(this.timers[id]);
      }

      // 新しいタイマーを設定
      this.timers[id] = setTimeout(() => {
        func();
        delete this.timers[id]; // 実行後にクリーンアップ
      }, delay);

      return this.timers[id];
    },
  };

  const tooltipManager = {
    SELECTOR: "pplx-mini-tools-tooltip",

    showTooltip(message, textarea, skipIfExist = false) {
      const oldTooltip = document.querySelector(`.${this.SELECTOR}`);
      // スキップモードがオンで既存のツールチップがあればスキップ
      if (skipIfExist && oldTooltip) {
        return;
      }
      // 既存のツールチップを削除
      if (oldTooltip) {
        oldTooltip.remove();
      }

      // テキストエリア要素の取得
      const textareaRect = textarea.getBoundingClientRect();

      // ツールチップ要素の作成
      const tooltip = document.createElement("div");
      tooltip.className = this.SELECTOR;
      tooltip.textContent = message;
      document.body.appendChild(tooltip);

      // ツールチップの位置設定（テキストエリアの上部中央）
      const tooltipRect = tooltip.getBoundingClientRect();
      tooltip.style.left =
        textareaRect.left +
        textareaRect.width / 2 -
        tooltipRect.width / 2 +
        "px";
      tooltip.style.top =
        textareaRect.top - tooltipRect.height - 10 + window.scrollY + "px";

      // ツールチップの表示
      setTimeout(() => {
        tooltip.style.opacity = "0.8";
      }, 10);
    },

    hideTooltip() {
      const tooltip = document.querySelector(`.${this.SELECTOR}`);
      if (!tooltip) {
        return;
      }
      setTimeout(() => {
        tooltip.style.opacity = "0";
        setTimeout(() => {
          tooltip.remove();
        }, 100);
      }, 100);
    },
  };

  async function initConfig() {
    // 設定読み込み
    const config = {};
    return new Promise((resolve) => {
      chrome.storage.local.get(
        [
          "markdownEditorLike",
          "searchOption",
          "simpleCopy",
          "ctrlEnter",
          "navigation",
        ],
        (data) => {
          if (data.markdownEditorLike === undefined) {
            config.markdownEditorLike = true;
          } else {
            config.markdownEditorLike = data.markdownEditorLike;
          }

          if (data.ctrlEnter === undefined) {
            config.ctrlEnter = false;
          } else {
            config.ctrlEnter = data.ctrlEnter;
          }

          if (data.searchOption === undefined) {
            config.searchOption = true;
          } else {
            config.searchOption = data.searchOption;
          }

          if (data.simpleCopy === undefined) {
            config.simpleCopy = true;
          } else {
            config.simpleCopy = data.simpleCopy;
          }

          if (data.navigation === undefined) {
            config.navigation = true;
          } else {
            config.navigation = data.navigation;
          }

          resolve(config);
        }
      );
    });
  }
  let config = null;

  function ctrlOrMetaKey(event) {
    return event.ctrlKey || event.metaKey;
  }

  function searchOptionHandler(event) {
    if (event.isComposing) {
      return;
    }
    if (ctrlOrMetaKey(event) && !event.shiftKey && event.code === "ArrowUp") {
      event.preventDefault();
      event.stopImmediatePropagation();
      selectSearchMode(UP, SELECT_SEARCH_MODE);
      return;
    }
    if (ctrlOrMetaKey(event) && !event.shiftKey && event.code === "ArrowDown") {
      event.preventDefault();
      event.stopImmediatePropagation();
      selectSearchMode(DOWN, SELECT_SEARCH_MODE);
      return;
    }
    if (ctrlOrMetaKey(event) && event.shiftKey && event.code === "ArrowUp") {
      event.preventDefault();
      event.stopImmediatePropagation();
      selectSearchMode(UP, SELECT_AI_MODEL);
      return;
    }
    if (ctrlOrMetaKey(event) && event.shiftKey && event.code === "ArrowDown") {
      event.preventDefault();
      event.stopImmediatePropagation();
      selectSearchMode(DOWN, SELECT_AI_MODEL);
      return;
    }
    if (ctrlOrMetaKey(event) && event.shiftKey && event.code === "Period") {
      event.preventDefault();
      event.stopImmediatePropagation();
      toggleWebInSearchSource();
      return;
    }
  }

  // 使用箇所で最もネストされた要素を取得する関数
  function getDeepestMainTextarea() {
    const elements = Array.from(
      document.querySelectorAll(MAIN_TEXTAREA_SELECTOR)
    );
    if (elements.length === 0) return null;
    if (elements.length === 1) return elements[0];

    // 他の要素の祖先でない要素（最も深い要素）を見つける
    return elements.find(
      (element) =>
        !elements.some((other) => other !== element && element.contains(other))
    );
  }

  function toolTipHandler(event) {
    if (event.isComposing) {
      return;
    }

    if (
      !(
        (ctrlOrMetaKey(event) && event.key === "Shift") ||
        (event.shiftKey && ["Control", "Meta"].includes(event.key))
      )
    ) {
      return;
    }

    if (event.type === "keydown") {
      const textarea = getDeepestMainTextarea();
      if (!textarea) {
        return;
      }
      const buttons = getSearchBoxButtons(textarea);
      if (!buttons) {
        return;
      }
      if (isDeepResearchOrLabs(buttons)) {
        return;
      }
      const button = textarea.querySelectorAll(
        AI_MODEL_BUTTON_GROUP_SELECTOR
      )[0];
      if (!button) {
        return;
      }
      const ariaLabel = button.getAttribute("aria-label");
      if (!ariaLabel) {
        return;
      }
      tooltipManager.showTooltip(ariaLabel, textarea, true);
    } else if (event.type === "keyup") {
      tooltipManager.hideTooltip();
    }
  }

  function navigationHandler(event) {
    if (!config.navigation) {
      return;
    }
    if (event.isComposing) {
      return;
    }
    // Ctrl+K でライブラリページに移動
    if (ctrlOrMetaKey(event) && !event.shiftKey && event.code === "KeyK") {
      event.preventDefault();
      if (location.pathname === LIBRARY_PATHNAME) {
        return;
      }
      event.preventDefault();

      showLoadingIndicator();

      const link = document.querySelector(`a[href="${LIBRARY_PATHNAME}"]`);
      if (link) {
        link.click();
        // location が変更されたら非表示
        const observer = new MutationObserver(() => {
          hideLoadingIndicator();
          observer.disconnect();
        });
        observer.observe(document.body, {
          childList: true,
          subtree: true,
        });
      } else {
        // HACK: ページ構造が変わってしまい、リンクが常に存在するわけではなくなったため直接移動も考慮
        window.location.href = LIBRARY_PATHNAME;
      }

      return;
    }
    // Ctrl+Shift+K でスペースページに移動
    if (ctrlOrMetaKey(event) && event.shiftKey && event.code === "KeyK") {
      event.preventDefault();
      if (location.pathname === SPACES_PATHNAME) {
        return;
      }
      showLoadingIndicator();
      const link = document.querySelector(
        `a[href="${SPACES_PATHNAME}"], a[href^="${SPACES_PATHNAME}#"]`
      );
      if (link) {
        link.click();
        // location が変更されたら非表示
        const observer = new MutationObserver(() => {
          hideLoadingIndicator();
          observer.disconnect();
        });
        observer.observe(document.body, {
          childList: true,
          subtree: true,
        });
      } else {
        // HACK: ページ構造が変わってしまい、リンクが常に存在するわけではなくなったため直接移動も考慮
        window.location.href = SPACES_PATHNAME;
      }
      return;
    }

    // Ctrl+U で、同じスペース内で新しいスレッド
    if (ctrlOrMetaKey(event) && event.code === "KeyU") {
      event.preventDefault();
      if (!window.location.pathname.startsWith(SEARCH_PATHNAME)) {
        return;
      }
      let spaceLink = document.querySelector(
        `.\\@container\\/main a[href^="${SPACES_PATHNAME}"]`
      );
      if (!spaceLink) {
        spaceLink = document.querySelector(
          `.\\@container\\/main a[href^="${SPACE_DETAIL_PATHNAME}"]`
        );
      }
      if (spaceLink) {
        showLoadingIndicator();
        spaceLink.click();
        // location が変更されたら非表示
        const observer = new MutationObserver(() => {
          hideLoadingIndicator();
          observer.disconnect();
        });
        observer.observe(document.body, {
          childList: true,
          subtree: true,
        });
      }
      return;
    }
  }

  // ローディングインジケーターを表示する関数
  function showLoadingIndicator() {
    // 既存のインジケーターがあれば削除
    const existingLoader = document.getElementById("pmt-loading-indicator");
    if (existingLoader) {
      existingLoader.remove();
    }

    // 新しいローディングインジケーターを作成
    const loader = document.createElement("div");
    loader.id = "pmt-loading-indicator";
    loader.innerText = "Loading...";

    document.body.appendChild(loader);
  }

  // ローディングインジケーターを非表示にする関数
  function hideLoadingIndicator() {
    const loader = document.getElementById("pmt-loading-indicator");
    if (loader) {
      loader.remove();
    }
  }

  function isDeepResearchOrLabs(buttons) {
    return (
      buttons[1].dataset.state === "checked" ||
      buttons[2].dataset.state === "checked"
    );
  }

  function getSearchModeIndex(buttons) {
    let index = -1;
    for (let i = 0; i < SEARCH_MODE_BUTTONS_LENGTH; i++) {
      if (buttons[i].dataset.state === "checked") {
        index = i;
        break;
      }
    }
    return index;
  }

  function getSearchBoxButtons(textarea) {
    const parent = textarea.closest("div:has(button)");
    return parent.querySelectorAll("button");
  }

  async function selectSearchMode(upOrDown, searchMode) {
    // buttonIndex = 0 の場合、「検索」と「リサーチ」の切り替えを行う

    // textarea を囲む span の下から検索する
    const mainSearchBox = getDeepestMainTextarea();
    if (!mainSearchBox || mainSearchBox.children.length !== 3) {
      return;
    }

    // Pro, DeepResearch, Labs ボタンの切り替え動作が指定されている場合
    const searchModeButtons =
      mainSearchBox.children[1].querySelectorAll("button");
    if (searchMode === SELECT_SEARCH_MODE) {
      const index = getSearchModeIndex(searchModeButtons);
      if (index < 0) {
        return;
      }
      if (upOrDown === UP) {
        if (index === 0) {
          searchModeButtons[SEARCH_MODE_BUTTONS_LENGTH - 1].click();
        } else {
          searchModeButtons[index - 1].click();
        }
      } else {
        if (index === SEARCH_MODE_BUTTONS_LENGTH - 1) {
          searchModeButtons[0].click();
        } else {
          searchModeButtons[index + 1].click();
        }
      }
      return;
    }

    // DeepResearch ボタンがアクティブの場合はモデル選択ボタンが表示されていないので終了
    if (isDeepResearchOrLabs(searchModeButtons)) {
      return;
    }

    if (searchMode === SELECT_AI_MODEL) {
      const button = mainSearchBox.querySelectorAll(
        AI_MODEL_BUTTON_GROUP_SELECTOR
      )[0];
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            try {
              // 通常の要素以外はスキップ
              if (node.tagName !== "DIV") {
                return;
              }

              // ポップアップがちらつくのでいったん非表示にするCSSを適用
              node.style.display = "none";

              const modelSelectBoxChildren = node.querySelectorAll(
                MODEL_SELECT_AREA_ITEM_SELECTOR
              );
              if (modelSelectBoxChildren.length === 0) {
                return;
              }
              const selectModelName = clickModel(node, upOrDown);

              // ツールチップのテキストを更新
              tooltipManager.showTooltip(selectModelName, mainSearchBox);

              // モデル選択ポップアップが消えていない場合はテキストボックスにフォーカスを移す
              if (document.body.contains(modelSelectBoxChildren[0])) {
                document.getElementById(TOP_EDITABLE_DIV_ID).focus();
              }
            } finally {
              // ポップアップ非表示CSSを削除
              if (node.tagName === "DIV") {
                node.style.display = "";
              }
            }
          });
        });
        observer.disconnect();
      });
      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
      // モデル選択ボタンをクリック
      button.click();
    }
  }

  function getSelectedModelIndex(node) {
    let checkedIndex = 0;
    let modelSelectBoxChildren = node.querySelectorAll(
      MODEL_SELECT_AREA_ITEM_SELECTOR
    );
    // チェックアイコンが表示されているアイテムを調べる
    for (let i = 0; i < modelSelectBoxChildren.length; i++) {
      const checked = modelSelectBoxChildren[i].querySelector(
        MODEL_SELECT_AREA_ITEM_CHECKED_SELECTOR
      );
      if (checked && window.getComputedStyle(checked).opacity > 0) {
        checkedIndex = i;
        break;
      }
    }
    return [modelSelectBoxChildren, checkedIndex];
  }

  function clickModel(node, upOrDown) {
    // 何番目の子要素にチェックが入っているかを調べる
    let [modelSelectBoxChildren, checkedIndex] = getSelectedModelIndex(node);
    let add = upOrDown === UP ? -1 : 1;
    // 先頭・末尾に到達した場合はループする
    if (upOrDown === UP && checkedIndex === 0) {
      checkedIndex = modelSelectBoxChildren.length - 1;
      add = 0;
    } else if (
      upOrDown === DOWN &&
      checkedIndex === modelSelectBoxChildren.length - 1
    ) {
      checkedIndex = 0;
      add = 0;
    }
    // MAXモードでしか選択できないモデルをスキップする
    let maxLoopCount = 20;
    while (maxLoopCount > 0) {
      if (
        modelSelectBoxChildren[checkedIndex + add].querySelector(".text-max")
      ) {
        if (
          upOrDown === UP &&
          checkedIndex === modelSelectBoxChildren.length - 1 &&
          add === 0
        ) {
          // 折り返しで末尾に到達している場合の判定
          checkedIndex--;
        } else if (upOrDown === DOWN && checkedIndex === 0 && add === 0) {
          // 折り返しで先頭に到達している場合の判定
          checkedIndex++;
        } else {
          checkedIndex += add * 2;
          add = 0;
        }

        if (checkedIndex >= modelSelectBoxChildren.length) {
          checkedIndex = 0;
          add = 0;
        } else if (checkedIndex < 0) {
          checkedIndex = modelSelectBoxChildren.length - 1;
          add = 0;
        }
      } else {
        break;
      }
      maxLoopCount--;
    }

    const modelName = modelSelectBoxChildren[checkedIndex + add].querySelector(
      "span"
    )
      ? modelSelectBoxChildren[checkedIndex + add].querySelector("span")
          .textContent
      : modelSelectBoxChildren[checkedIndex + add].textContent;

    // 前後の要素をクリックする
    modelSelectBoxChildren[checkedIndex + add].click();

    // モデル選択ポップアップが消えていない場合はテキストボックスにフォーカスを移す
    if (!document.body.contains(modelSelectBoxChildren[0])) {
      document.getElementById(TOP_EDITABLE_DIV_ID).focus();
    }

    return modelName;
  }

  async function toggleWebInSearchSource() {
    // 検索結果画面では発動させない
    if (location.pathname.startsWith(SEARCH_PATHNAME)) {
      return;
    }

    const mainSearchBox = getDeepestMainTextarea();
    if (!mainSearchBox || mainSearchBox.children.length !== 3) {
      return;
    }

    const searchSourceButton = document.querySelector(
      SEARCH_SOURCE_BUTTON_SELECTOR
    );
    if (!searchSourceButton) {
      return;
    }

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach(async (node) => {
          try {
            // ポップアップがちらつくのでいったん非表示にするCSSを適用
            node.style.display = "none";

            const searchSourceBoxChildren = node.querySelectorAll(
              SEARCH_SOURCE_AREA_ITEM_SELECTOR
            );
            if (searchSourceBoxChildren.length === 0) {
              return;
            }
            const webButton = node.querySelectorAll("button")[0];
            if (!webButton) {
              return;
            }
            const allButtons = node.querySelectorAll("button");

            if (webButton.dataset.state === "checked") {
              // すべてOFFにする
              webButton.click();
              for (let i = 1; i < allButtons.length; i++) {
                if (allButtons[i].dataset.state !== "checked") {
                  continue;
                }
                // HACK: ボタンクリックのタイミングでDOMが更新されてしまうので取得しなおす
                await sleep(100);
                const buttons = node.querySelectorAll("button");
                buttons[i].click();
              }
            } else {
              // webButtonのみONにする
              webButton.click();
              for (let i = 1; i < allButtons.length; i++) {
                if (allButtons[i].dataset.state !== "checked") {
                  continue;
                }
                // HACK: ボタンクリックのタイミングでDOMが更新されてしまうので取得しなおす
                await sleep(50);
                const buttons = node.querySelectorAll("button");
                buttons[i].click();
              }
            }

            // ポップアップを閉じる
            document.getElementById(TOP_EDITABLE_DIV_ID).focus();
          } finally {
            // ポップアップ非表示CSSを削除
            node.style.display = "";
          }
        });
      });
      observer.disconnect();
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
    // 検索ソースボタンをクリック
    searchSourceButton.click();
  }

  function setTextareaEventListeners(textarea) {
    textarea.dataset.pmtCustomEvent = "true";

    // TODO 2025-08-10 一旦除外
    // // Ctrl+V の際にカーソルが末尾にジャンプする不具合を予防
    // // 貼り付け形式がテキストの場合、標準のイベントリスナーには処理をさせない
    // textarea.addEventListener(
    //   "paste",
    //   (event) => {
    //     if (!event.clipboardData.types.includes("text/plain")) {
    //       return;
    //     }
    //     event.stopImmediatePropagation();
    //   },
    //   true
    // );
    // フォーカスアウト & イン時にカーソル位置が移動する不具合を予防
    // let focusByMouse = false;
    // textarea.addEventListener(
    //   "mousedown",
    //   () => {
    //     focusByMouse = true;
    //   },
    //   true
    // );
    // textarea.addEventListener(
    //   "focusout",
    //   () => {
    //     textareaSelectionManager.setPosWhenTextareaActive();
    //     focusByMouse = false;
    //   },
    //   true
    // );
    // textarea.addEventListener("focusin", async () => {
    //   if (!focusByMouse && textareaSelectionManager.textarea) {
    //     await sleep(50);
    //     const pos = textareaSelectionManager.getPos();
    //     if (
    //       textarea.selectionStart !== pos.start &&
    //       textarea.selectionEnd !== pos.end
    //     ) {
    //       textareaSelectionManager.applyPosToTextarea();
    //     }
    //   }
    //   if (textareaSelectionManager.textarea) {
    //     textareaSelectionManager.reset();
    //   }
    //   focusByMouse = false;
    // });

    let scrolling = false;
    const scrollTarget = textarea.closest(".scrollable-container");
    if (scrollTarget) {
      // フォーカスを移したときに光らないようにする
      scrollTarget.style.outline = "none";

      // 検索結果画面でのみ対応するスクロール用キーフック
      if (
        location.pathname.startsWith(SEARCH_PATHNAME) ||
        location.pathname.startsWith(PAGE_PATHNAME)
      ) {
        scrollTarget.addEventListener("keyup", (event) => {
          if (
            ["ArrowDown", "ArrowUp", "PageDown", "PageUp"].includes(event.code)
          ) {
            if (scrolling) {
              scrolling = false;
              textarea.focus();
            }
          }
        });

        textarea.addEventListener(
          "keydown",
          (event) => {
            if (event.isComposing) {
              return;
            }
            const text = textarea.textContent;
            // スクロール移動
            if (
              !event.shiftKey &&
              ["ArrowDown", "ArrowUp", "PageDown", "PageUp"].includes(
                event.code
              ) &&
              text.length === 0
            ) {
              event.stopImmediatePropagation();
              scrolling = true;
              scrollTarget.focus();
            }
          },
          true
        );
      }
      // Escape押下でスクロール可能なコンテナにフォーカスを移す
      textarea.addEventListener(
        "keydown",
        (event) => {
          if (event.isComposing) {
            return;
          }
          if (event.code === "Escape") {
            event.stopImmediatePropagation();
            scrollTarget.focus();
          }
        },
        true
      );
    }

    // トップページの場合
    if (location.pathname === "/") {
      textarea.addEventListener(
        "keydown",
        (event) => {
          // サジェスト (オートコンプリート) 選択の改善
          if (
            (event.code === "ArrowUp" || event.code === "ArrowDown") &&
            textarea.innerText.trim().length > 0 &&
            textarea.innerText.includes("\n")
          ) {
            // 改行が含まれている場合、サジェスト選択を無効化
            event.stopImmediatePropagation();
          } else if (
            event.shiftKey &&
            event.code === "Enter" &&
            !textarea.innerText.includes("\n")
          ) {
            // 最初の改行操作の際、サジェスト選択状態をリセットする
            textarea.blur();
            textarea.focus();
          }
        },
        true
      );
    }

    // Perplexity Mini Tools の TOC の操作
    textarea.addEventListener(
      "keydown",
      (event) => {
        if (
          event.shiftKey &&
          (event.code === "ArrowUp" || event.code === "ArrowDown")
        ) {
          if (textarea.textContent.length === 0) {
            tocHandler(event);
          } else {
            // document.body に対してイベントを設定しているので、
            // デフォルトのイベントを停止する
            event.stopImmediatePropagation();
          }
        }
      },
      true
    );
  }

  function tocHandler(event) {
    const toc = document.getElementById("toc-container");
    if (!toc) {
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    const tocItems = toc.querySelectorAll(".indicator-point");
    if (tocItems.length === 0) {
      return;
    }
    const activeItem = toc.querySelector(".indicator-point.active");
    if (!activeItem) {
      return;
    }
    const currentIndex = Array.from(tocItems).indexOf(activeItem);
    let index = currentIndex + (event.code === "ArrowDown" ? 1 : -1);
    if (index >= 0 && index < tocItems.length) {
      tocItems[index].click();
    }
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ライブラリページのショートカット
  function setLibraryEventListeners(parent) {
    function activeLinkHandler(event, scrollCenter = false) {
      if (event.isComposing) {
        return;
      }
      if (libraryLinks.activeIndex === -1) {
        return;
      }

      if (event.code === "Enter") {
        libraryLinks.links[libraryLinks.activeIndex].click();
        return;
      }

      if (["ArrowUp", "ArrowDown"].includes(event.code)) {
        event.preventDefault();
        const currentLink = libraryLinks.links[libraryLinks.activeIndex];
        if (currentLink) {
          currentLink.classList.remove("search-result-active");
          currentLink.removeAttribute("data-page-end");
        }

        if (event.code === "ArrowUp") {
          libraryLinks.activeIndex =
            libraryLinks.activeIndex > 0
              ? libraryLinks.activeIndex - 1
              : libraryLinks.activeIndex;
        } else if (event.code === "ArrowDown") {
          libraryLinks.activeIndex =
            libraryLinks.activeIndex < libraryLinks.links.length - 1
              ? libraryLinks.activeIndex + 1
              : libraryLinks.activeIndex;
        }

        const nextLink = libraryLinks.links[libraryLinks.activeIndex];

        nextLink.classList.add("search-result-active");

        // スクロール
        if (scrollCenter) {
          nextLink.scrollIntoView({
            block: "center",
          });
        } else {
          nextLink.scrollIntoView({
            block: "nearest",
          });
        }
        const scrollContainer = libraryLinks.links[
          libraryLinks.activeIndex
        ].closest(".scrollable-container");
        if (scrollContainer) {
          if (libraryLinks.activeIndex === libraryLinks.links.length - 1) {
            scrollContainer.scrollTop = scrollContainer.scrollHeight;
            nextLink.dataset.pageEnd = true;
          } else if (libraryLinks.activeIndex === 0) {
            scrollContainer.scrollTop = 0;
          }
        }
      }
    }

    const inputs = parent.querySelectorAll("input");
    inputs.forEach((input) => {
      // input要素にフォーカスした際に、イベントトリガーを追加

      // 親要素が非表示の場合
      let doNotFocus = false;
      let ele = input;
      while (ele) {
        if (window.getComputedStyle(ele).display === "none") {
          doNotFocus = true;
        }
        ele = ele.parentElement;
      }

      if (!doNotFocus && document.activeElement !== input) {
        input.focus();
      }

      // ナビゲーションが無効の場合、イベントハンドラーの設定はしない
      if (!config.navigation) {
        return;
      }

      if (input.dataset.searchEventAdded) {
        return;
      }

      if (input.closest(".md\\:hidden")) {
        input.addEventListener(
          "keydown",
          (event) => {
            activeLinkHandler(event, true);
          },
          true
        );
      } else {
        input.addEventListener("keydown", activeLinkHandler, true);
      }
      input.dataset.searchEventAdded = true;

      const isOuter = (current) => {
        return (
          current.querySelector(`a[href^="${SEARCH_PATHNAME}/"]`) &&
          current.classList.contains("w-full")
        );
      };

      let outer;
      let current = input;
      while (current) {
        if (isOuter(current)) {
          outer = current;
          break;
        }
        current = current.parentElement;
      }

      const setObserver = () => {
        // outerに変更があった場合、targetLinksを初期化する
        const observer = new MutationObserver(async (mutations) => {
          if (location.pathname !== LIBRARY_PATHNAME) {
            observer.disconnect();
            return;
          }

          if (!outer) {
            return;
          }

          mutations.forEach((mutation) => {
            if (mutation.type === "childList") {
              timerManager.debounce("searchLinks", 50, () => {
                libraryLinks.init(outer);
              });
            }
          });
        });
        observer.observe(outer, {
          childList: true,
          subtree: true,
          characterData: true,
        });
      };

      if (!outer) {
        // 親要素が見つからない場合、MutationObserverを使用して監視する
        const observer = new MutationObserver(async (mutations) => {
          if (location.pathname !== LIBRARY_PATHNAME) {
            observer.disconnect();
            return;
          }

          let current = input;
          while (current) {
            if (isOuter(current)) {
              outer = current;
              break;
            }
            current = current.parentElement;
          }

          if (!outer) {
            return;
          }
          libraryLinks.init(outer);
          setObserver();
          observer.disconnect();
        });
        observer.observe(document.body, {
          childList: true,
          subtree: true,
          characterData: true,
        });

        return;
      } else {
        libraryLinks.init(outer);
        setObserver();
      }
    });

    return;
  }

  // スペース一覧ページのショートカット
  function setSpacesEventListeners() {
    // ナビゲーションが無効の場合、イベントハンドラーの設定はしない
    if (!config.navigation) {
      return;
    }

    if (document.querySelector(".space-selection-active")) {
      return;
    }

    const targetItem = document.querySelector(".contents a");
    if (!targetItem) {
      return;
    }
    targetItem.classList.add("space-selection-active");

    if (document.body.dataset.spacesEventAdded) {
      return;
    }

    document.body.dataset.spacesEventAdded = true;
    document.body.addEventListener(
      "keydown",
      (event) => {
        if (location.pathname !== SPACES_PATHNAME) {
          return;
        }
        if (event.isComposing) {
          return;
        }
        if (document.body.querySelector("body > div div.fixed")) {
          // ポップアップが表示されている場合は何もしない
          return;
        }

        const tmp = document.querySelector(".contents a");
        if (!tmp) {
          return;
        }

        const spacesParent = tmp.parentElement;
        const items = spacesParent.querySelectorAll("a");
        let targetItem = spacesParent.querySelector("a.space-selection-active");
        if (!targetItem) {
          targetItem = items[0];
          targetItem.classList.add("space-selection-active");
        }

        if (event.code === "Enter") {
          event.preventDefault();
          targetItem.click();
          return;
        }

        // 折り返し要素数を取得する
        // a要素はカードスタイルで画面サイズに応じて折り返しが発生するので、
        // 画面上の絶対位置が前要素より左位置になったところで折り返し要素数とする
        let wrapCount = 0;
        for (let i = 1; i < items.length; i++) {
          if (
            items[i].getBoundingClientRect().left <
            items[i - 1].getBoundingClientRect().left
          ) {
            wrapCount = i + 1;
            break;
          }
        }

        if (event.code === "ArrowLeft") {
          event.preventDefault();
          targetItem.classList.remove("space-selection-active");
          targetItem =
            items[
              (Array.from(items).indexOf(targetItem) - 1 + items.length) %
                items.length
            ];
          targetItem.classList.add("space-selection-active");
          targetItem.scrollIntoView({ block: "nearest" });
        } else if (event.code === "ArrowRight") {
          event.preventDefault();
          targetItem.classList.remove("space-selection-active");
          targetItem =
            items[(Array.from(items).indexOf(targetItem) + 1) % items.length];
          targetItem.classList.add("space-selection-active");
          targetItem.scrollIntoView({ block: "nearest" });
        } else if (event.code === "ArrowUp") {
          event.preventDefault();
          const currentIndex = Array.from(items).indexOf(targetItem);
          let index = currentIndex - wrapCount;
          if (index < 0) {
            index =
              currentIndex +
              wrapCount *
                Math.floor((items.length - (currentIndex + 1)) / wrapCount);
          }
          targetItem.classList.remove("space-selection-active");
          targetItem = items[index];
          targetItem.classList.add("space-selection-active");
          targetItem.scrollIntoView({ block: "nearest" });
        } else if (event.code === "ArrowDown") {
          event.preventDefault();
          const currentIndex = Array.from(items).indexOf(targetItem);
          let index = currentIndex + wrapCount;
          if (index >= items.length) {
            index = currentIndex % wrapCount;
          }
          targetItem.classList.remove("space-selection-active");
          targetItem = items[index];
          targetItem.classList.add("space-selection-active");
          targetItem.scrollIntoView({ block: "nearest" });
        }
      },
      true
    );
  }

  // スペース詳細ページのショートカット
  function setSpaceDetailEventListeners(parent) {
    const scrollableContainer = parent.querySelector(".scrollable-container");
    if (!scrollableContainer) {
      return;
    }

    if (scrollableContainer.dataset.spaceDetailEventAdded) {
      return;
    }
    scrollableContainer.dataset.spaceDetailEventAdded = true;

    scrollableContainer.addEventListener("focus", (event) => {
      const activeLink = scrollableContainer.querySelector(
        "a.collection-active"
      );
      if (activeLink) {
        activeLink.focus();
        return;
      }

      const links = scrollableContainer.querySelectorAll("a");

      links.forEach((link, index) => {
        if (index === 0) {
          link.focus();
          link.classList.add("collection-active");
        } else {
          link.classList.remove("collection-active");
        }
      });
    });

    scrollableContainer.addEventListener("keydown", (event) => {
      if (event.isComposing) {
        return;
      }
      if (document.activeElement.nodeName !== "A") {
        return;
      }

      const activeLink = scrollableContainer.querySelector(
        "a.collection-active"
      );
      if (!activeLink) {
        return;
      }

      if (event.code === "Enter") {
        activeLink.click();
        return;
      }

      const links = Array.from(scrollableContainer.querySelectorAll("a"));
      const index = links.indexOf(activeLink);
      if (event.code === "ArrowUp") {
        event.preventDefault();
        const newIndex = index > 0 ? index - 1 : links.length - 1;
        const target = links[newIndex];
        target.focus();
        target.classList.add("collection-active");
        links[index].classList.remove("collection-active");
        target.scrollIntoView({ block: "nearest" });
      } else if (event.code === "ArrowDown") {
        event.preventDefault();
        const newIndex = index < links.length - 1 ? index + 1 : 0;
        const target = links[newIndex];
        target.focus();
        target.classList.add("collection-active");
        links[index].classList.remove("collection-active");
        target.scrollIntoView({ block: "nearest" });
      }
    });
  }

  function mainObserver(mutations) {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const parent = node.parentElement;
          if (!parent) {
            return;
          }

          // HACK: IME入力時にEnterが反応しなくなることがある事象への対処
          // 2025-07-30 直ったように見えるのでコメントアウト
          // const isSearchPage =
          //   location.pathname === "/" ||
          //   location.pathname.startsWith(SEARCH_PATHNAME);
          // if (isSearchPage) {
          //   const askInput = document.getElementById(TOP_EDITABLE_DIV_ID);
          //   if (askInput && !askInput.dataset.askInputEventAdded) {
          //     askInput.addEventListener("keydown", (event) => {
          //       if (event.code === "Enter" && !event.shiftKey) {
          //         if (event.isComposing) {
          //           return;
          //         }
          //         if (askInput.textContent.trim() === "") {
          //           return;
          //         }
          //         setTimeout(() => {
          //           if (!isSearchPage) {
          //             return;
          //           }
          //           if (askInput.textContent.trim() === "") {
          //             return;
          //           }
          //           const submitButton = document.querySelector(
          //             'button[data-testid="submit-button"]'
          //           );
          //           if (submitButton) {
          //             submitButton.click();
          //           }
          //         }, 500);
          //       }
          //     });
          //     askInput.dataset.askInputEventAdded = true;
          //   }
          //   return;
          // }

          // ライブラリページのショートカット
          if (location.pathname === LIBRARY_PATHNAME) {
            setLibraryEventListeners(parent);
            return;
          }

          // スペース選択のショートカット
          if (location.pathname === SPACES_PATHNAME) {
            setSpacesEventListeners();
            return;
          }

          // スペース個別画面のショートカット
          if (location.pathname.startsWith(SPACE_DETAIL_PATHNAME)) {
            setSpaceDetailEventListeners(parent);
            return;
          }

          // 追加された textarea 要素へのイベントリスナー
          const textarea = parent.querySelector(
            `#${TOP_EDITABLE_DIV_ID}:not([data-pmt-custom-event])`
          );
          if (textarea) {
            setTextareaEventListeners(textarea);
          }

          const copySvg = parent.querySelectorAll("svg.tabler-icon-copy");
          const copyButtons = [];
          copySvg.forEach((svg) => {
            const button = svg.closest("button");
            if (!button) {
              return;
            }
            if (button.dataset.simpleCopy) {
              return;
            }
            copyButtons.push(button);
          });

          // 追加されたコピーボタンへの処理
          if (config.simpleCopy && copyButtons.length > 0) {
            // Citation無しでコピーするイベントリスナーを追加
            copyButtons.forEach((button) => {
              if (button.dataset.simpleCopy) {
                return;
              }
              button.dataset.simpleCopy = true;

              button.addEventListener("click", async (event) => {
                if (!event.shiftKey) {
                  return;
                }
                await sleep(100);
                const clipText = await navigator.clipboard.readText();
                // コピーしたテキストから不要なテキストを削除
                const cleanedText = clipText
                  .replace(
                    /(\r?\nCitations:\r?\n\[1\][\s\S]+)?---\r?\n[^\r\n]+$/,
                    ""
                  ) // Citations: ... 形式
                  .replace(/\r?\n(\[[0-9]+\] https?:\/\/[^\s]+(\r?\n)?)+$/, "") // Perplexity側の形式変更に伴い追加対応 2025-06-03
                  .replace(
                    /\r?\n(\[[0-9]+\]\(https?:\/\/[^\s]+\)(\r?\n)?)+$/,
                    ""
                  ) // Perplexity側の形式変更に伴い追加対応 2025-08-22
                  .replace(/\[[0-9]+\]/g, "") // 引用番号部分を削除
                  .trim();
                // clipboardにコピー
                navigator.clipboard
                  .writeText(cleanedText)
                  .then(() => {
                    // コピー成功時の処理
                    // // ボタンの内容を一時的に保存
                    // const originalDiv = button.children[0];
                    // // ボタンをチェックマークに変更
                    // const icon = document.createElement("img");
                    // icon.src = chrome.runtime.getURL("assets/clip-check.png");
                    // icon.width = 16;
                    // icon.height = 16;
                    // icon.classList.add("ks-check-icon");
                    // const newDiv = document.createElement("div");
                    // newDiv.appendChild(icon);
                    // button.children[0].replaceWith(newDiv);
                    // // 元に戻す
                    // setTimeout(() => {
                    //   newDiv.replaceWith(originalDiv);
                    // }, 2000);
                    button.classList.add("simple-copy-success");
                    setTimeout(() => {
                      button.classList.remove("simple-copy-success");
                    }, 2000);
                  })
                  .finally(() => {
                    // buttonからフォーカスを外す
                    button.blur();
                  });
              });
            });
          }
        }
      });
    });
  }

  async function main() {
    config = await initConfig();

    // ページ全体へのイベントリスナーを追加
    if (config.searchOption) {
      document.addEventListener(
        "keydown",
        (event) => {
          // 検索オプション切り替え
          searchOptionHandler(event);
          // ナビゲーションショートカット
          navigationHandler(event);
          // ツールチップ表示
          toolTipHandler(event);
        },
        true
      );

      document.addEventListener(
        "keyup",
        (event) => {
          toolTipHandler(event);
        },
        true
      );
    }

    // Perplexity Mini Tools の TOC の操作
    document.addEventListener("keydown", (event) => {
      if (
        event.shiftKey &&
        (event.code === "ArrowUp" || event.code === "ArrowDown")
      ) {
        tocHandler(event);
      }
    });

    // ページ読み込み時と、DOM変更時に対応する
    const textarea = document.querySelector(
      `#${TOP_EDITABLE_DIV_ID}:not([data-pmt-custom-event])`
    );
    if (textarea) {
      setTextareaEventListeners(textarea);
    }

    // DOM変更時の対応をする
    const observer = new MutationObserver(mainObserver);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false,
      characterData: false,
    });
  }

  main();
})();
