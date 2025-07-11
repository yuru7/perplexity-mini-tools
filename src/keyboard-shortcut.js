(() => {
  const MODEL_SELECT_AREA_ITEM_SELECTOR = "div.group\\/item";
  const MODEL_SELECT_AREA_ITEM_CHECKED_SELECTOR = ".text-super";
  const MAIN_TEXTAREA_SELECTOR = "main div:has(#ask-input):has(button)";

  const SEARCH_SOURCE_AREA_ITEM_SELECTOR = MODEL_SELECT_AREA_ITEM_SELECTOR;

  const LIBRARY_PATHNAME = "/library";
  const SPACES_PATHNAME = "/spaces";
  const SPACE_DETAIL_PATHNAME = "/collections";
  const SEARCH_PATHNAME = "/search";
  const PAGE_PATHNAME = "/page";

  const UP = 0;
  const DOWN = 1;

  const MODEL_SELECT_BUTTON_POS = 3;
  const SEARCH_SOURCE_BUTTON_POS = 4;

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
      selectSearchMode(UP);
      return;
    }
    if (ctrlOrMetaKey(event) && !event.shiftKey && event.code === "ArrowDown") {
      event.preventDefault();
      event.stopImmediatePropagation();
      selectSearchMode(DOWN);
      return;
    }
    if (ctrlOrMetaKey(event) && event.shiftKey && event.code === "ArrowUp") {
      event.preventDefault();
      event.stopImmediatePropagation();
      selectSearchMode(UP, MODEL_SELECT_BUTTON_POS);
      return;
    }
    if (ctrlOrMetaKey(event) && event.shiftKey && event.code === "ArrowDown") {
      event.preventDefault();
      event.stopImmediatePropagation();
      selectSearchMode(DOWN, MODEL_SELECT_BUTTON_POS);
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
      const button = buttons[MODEL_SELECT_BUTTON_POS];
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
      const spaceLink = document.querySelector(
        `.\\@container\\/main a[href^="${SPACE_DETAIL_PATHNAME}"]`
      );
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

  const textareaSelectionManager = {
    pos: -1,
    textarea: null,
    setPosWhenTextareaActive: function () {
      const activeElement = document.activeElement;
      if (activeElement.tagName === "TEXTAREA") {
        this.posStart = activeElement.selectionStart;
        this.posEnd = activeElement.selectionEnd;
        this.textarea = activeElement;
      }
    },
    getPos: function () {
      return {
        start: this.posStart,
        end: this.posEnd,
      };
    },
    applyPosToTextarea: function () {
      if (this.textarea) {
        this.textarea.setSelectionRange(this.posStart, this.posEnd);
      }
    },
    reset: function () {
      this.pos = -1;
      this.textarea = null;
    },
  };

  function isDeepResearchOrLabs(buttons) {
    return (
      buttons[1].dataset.state === "checked" ||
      buttons[2].dataset.state === "checked"
    );
  }

  function getSearchModeIndex(buttons) {
    let index = -1;
    for (let i = 0; i < MODEL_SELECT_BUTTON_POS; i++) {
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

  async function selectSearchMode(upOrDown, buttonIndex = 0) {
    // buttonIndex = 0 の場合、「検索」と「リサーチ」の切り替えを行う

    // textarea がアクティブな場合、カーソル位置を取得
    const isTextareaActive = document.activeElement.tagName === "TEXTAREA";
    if (isTextareaActive) {
      textareaSelectionManager.setPosWhenTextareaActive();
    }

    // textarea を囲む span の下から検索する
    const mainSearchBox = getDeepestMainTextarea();
    let buttons, button;
    if (mainSearchBox) {
      buttons = getSearchBoxButtons(mainSearchBox);
      button =
        buttonIndex < 0
          ? buttons[buttons.length + buttonIndex]
          : buttons[buttonIndex];
    }

    if (!button) {
      return;
    }

    // Pro, DeepResearch, Labs ボタンの切り替え動作が指定されている場合
    if (buttonIndex == 0) {
      const index = getSearchModeIndex(buttons);
      if (index < 0) {
        return;
      }
      if (upOrDown === UP) {
        if (index === 0) {
          buttons[MODEL_SELECT_BUTTON_POS - 1].click();
        } else {
          buttons[index - 1].click();
        }
      } else {
        if (index === MODEL_SELECT_BUTTON_POS - 1) {
          buttons[0].click();
        } else {
          buttons[index + 1].click();
        }
      }
      return;
    }

    // DeepResearch ボタンがアクティブの場合はモデル選択ボタンが表示されていないので終了
    if (isDeepResearchOrLabs(buttons)) {
      return;
    }

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

            // textarea のカーソル位置を戻す
            if (isTextareaActive) {
              textareaSelectionManager.textarea.focus();
              textareaSelectionManager.applyPosToTextarea();
              textareaSelectionManager.reset();
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

  function getSelectedModelIndex(node) {
    let checkedIndex = -1;
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
      if (modelSelectBoxChildren[checkedIndex + add].querySelector(".bg-max")) {
        if (
          upOrDown === UP &&
          checkedIndex === modelSelectBoxChildren.length - 1
        ) {
          checkedIndex--;
          add = 0;
        } else if (upOrDown === DOWN && checkedIndex === 0) {
          checkedIndex++;
          add = 0;
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

    return modelName;
  }

  async function toggleWebInSearchSource() {
    const mainSearchBox = document.querySelector("main textarea");
    if (!mainSearchBox) {
      return;
    }

    // textarea がアクティブな場合、カーソル位置を取得
    const isTextareaActive = document.activeElement.tagName === "TEXTAREA";
    if (isTextareaActive) {
      textareaSelectionManager.setPosWhenTextareaActive();
    }

    const buttons = mainSearchBox.closest("span").querySelectorAll("button");
    const pos = isDeepResearchOrLabs(buttons)
      ? SEARCH_SOURCE_BUTTON_POS - 1
      : SEARCH_SOURCE_BUTTON_POS;
    let searchSourceButton;
    if (buttons.length > pos) {
      searchSourceButton = buttons[pos];
    }
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
            mainSearchBox.focus();

            // textarea のカーソル位置を戻す
            if (isTextareaActive) {
              textareaSelectionManager.applyPosToTextarea();
              textareaSelectionManager.reset();
            }
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

  class MDTextarea {
    static ORDERED_LIST_PATTERN = /^([\s　]*)(\d+)\.\s/;
    static UNORDERED_LIST_PATTERN = /^([\s　]*)(・|[-*+]\s)/;
    static INDENT_PATTERN = /^[\s　]+/;
    static OUTDENT_INDENT_PATTERN = /^(\t|　| {1,4})/;

    static CTRL_KEY = "ctrl";
    static SHIFT_KEY = "shift";
    static ALT_KEY = "alt";

    constructor(
      textarea,
      modifierKeys = [],
      removeOriginalEventListener = false
    ) {
      this.textarea = textarea;
      this.indentStr = "    ";
      this.currentPos = 0;
      this.lineHeight = 0;
      this.modifierKeys = modifierKeys;
      this.removeOriginalEventListener = removeOriginalEventListener;
      this.boundKeydownHandler = this.keydownHandler.bind(this);
    }

    enable() {
      if (this.removeOriginalEventListener) {
        // 元の要素をクローンで置き換える
        const newElement = this.textarea.cloneNode(true);
        newElement.dataset.mdTextarea = "true";
        this.textarea.replaceWith(newElement);
        this.textarea = newElement;
        newElement.addEventListener("keydown", this.boundKeydownHandler, true);
      } else {
        this.textarea.dataset.mdTextarea = "true";
        this.textarea.addEventListener(
          "keydown",
          this.boundKeydownHandler,
          true
        );
      }

      this.lineHeight = this.getLineHeight();
    }

    disable() {
      this.textarea.removeEventListener("keydown", this.boundKeydownHandler);
    }

    keydownHandler(e) {
      // 変換中操作では発動させない
      if (e.isComposing) {
        return;
      }

      if (this.modifierKeys.length === 0) {
        if (
          e.key === "Enter" &&
          this.ctrlOrMetaKey(e) &&
          !e.shiftKey &&
          !e.altKey
        ) {
          e.preventDefault();
          e.target.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Enter" })
          );
          return;
        }
        if (
          e.key === "Enter" &&
          (this.ctrlOrMetaKey(e) || e.shiftKey || e.altKey)
        ) {
          return;
        }
      }
      if (
        this.modifierKeys.length > 0 &&
        e.key === "Enter" &&
        !this.ctrlOrMetaKey(e) &&
        !e.shiftKey &&
        !e.altKey
      ) {
        return;
      }

      this.currentPos = this.textarea.selectionStart;

      if (e.key === "Enter") {
        // 所定の修飾キーが押されていない場合は何もしない
        if (
          !this.modifierKeys.every((modifierKey) => {
            switch (modifierKey) {
              case MDTextarea.CTRL_KEY:
                if (!this.ctrlOrMetaKey(e)) {
                  return false;
                }
                break;
              case MDTextarea.SHIFT_KEY:
                if (!e.shiftKey) {
                  return false;
                }
                break;
              case MDTextarea.ALT_KEY:
                if (!e.altKey) {
                  return false;
                }
                break;
              default:
                return false;
            }
            return true;
          })
        ) {
          return;
        }

        e.preventDefault();
        e.stopImmediatePropagation();
        const currentLine = this.getLine(this.textarea.selectionStart);
        const currentPosInLine =
          this.currentPos - this.getStartOfLine(this.currentPos);

        // 番号付きリストの場合
        if (MDTextarea.ORDERED_LIST_PATTERN.test(currentLine)) {
          const orderedListSymbol = currentLine.match(
            MDTextarea.ORDERED_LIST_PATTERN
          );
          if (currentPosInLine < orderedListSymbol[0].length) {
            // リスト記号より前の位置にカーソルがある場合、通常の改行を行う
            this.inputPrefix("\n");
          } else if (
            new RegExp(MDTextarea.ORDERED_LIST_PATTERN.source + "\\s*$").test(
              currentLine
            )
          ) {
            // 記号だけの行の場合、先頭の数字を削除
            this.removePrefix(currentLine);
          } else {
            // 次の数字を挿入
            const nextNumStr = `${orderedListSymbol[1]}${
              parseInt(orderedListSymbol[2]) + 1
            }. `;
            this.inputPrefix("\n" + nextNumStr);
            // 次行以降の番号を振り直す
            this.autoNumbering(this.textarea.selectionStart);
          }
          return;
        }

        // 箇条書きリストの場合
        if (MDTextarea.UNORDERED_LIST_PATTERN.test(currentLine)) {
          const unorderedListSymbol = currentLine.match(
            MDTextarea.UNORDERED_LIST_PATTERN
          );
          if (currentPosInLine < unorderedListSymbol[0].length) {
            // リスト記号より前の位置にカーソルがある場合、通常の改行を行う
            this.inputPrefix("\n");
          } else if (
            new RegExp(MDTextarea.UNORDERED_LIST_PATTERN.source + "\\s*$").test(
              currentLine
            )
          ) {
            // 記号だけの行の場合、先頭の記号を削除
            this.removePrefix(currentLine);
          } else {
            // 次の記号を挿入
            const nextSymbol = `${unorderedListSymbol[1]}${unorderedListSymbol[2]}`;
            this.inputPrefix("\n" + nextSymbol);
          }
          return;
        }

        // インデントがある場合
        const indentMatch = currentLine.match(MDTextarea.INDENT_PATTERN);
        if (indentMatch) {
          const posOfLine =
            this.currentPos - this.getStartOfLine(this.currentPos);
          this.inputPrefix("\n" + indentMatch[0].slice(0, posOfLine));
          return;
        }

        this.inputPrefix("\n");
      } else if (e.key === "Tab" && e.shiftKey) {
        // インデントを削除
        e.stopImmediatePropagation();
        e.preventDefault();
        this.outdent(this.getLine(this.textarea.selectionStart));
      } else if (e.key === "Tab") {
        // 先頭にインデントを追加
        e.stopImmediatePropagation();
        e.preventDefault();
        this.indent(this.getLine(this.textarea.selectionStart));
      }
    }

    ctrlOrMetaKey(event) {
      return event.ctrlKey || event.metaKey;
    }

    getLineNum(index) {
      return this.textarea.value.slice(0, index).split("\n").length;
    }

    getLine(index) {
      return this.textarea.value.split("\n")[this.getLineNum(index) - 1];
    }

    getLines() {
      return this.textarea.value.split("\n");
    }

    getStartOfLine(index) {
      let start = index;
      while (start > 0 && this.textarea.value[start - 1] !== "\n") {
        start--;
      }
      return start;
    }

    getEndOfLine(index) {
      let end = index;
      while (
        end < this.textarea.value.length &&
        this.textarea.value[end] !== "\n"
      ) {
        end++;
      }
      return end;
    }

    autoNumbering(index) {
      const lines = this.getLines();
      const current = {
        line: this.getLine(index),
        lineNum: this.getLineNum(index),
        pos: index,
        start: this.getStartOfLine(index),
        end: this.getEndOfLine(index),
        indent: (this.getLine(index).match(MDTextarea.INDENT_PATTERN) || [
          "",
        ])[0],
      };

      // 現在行が番号付きリストではない場合、何もしない
      const currentOrderdNumMatch = current.line.match(
        MDTextarea.ORDERED_LIST_PATTERN
      );
      if (!currentOrderdNumMatch) {
        return;
      }

      const numberingStart = this.getEndOfLine(current.pos) + 1;
      let numberingEnd = numberingStart;
      for (let i = current.lineNum; i < lines.length; i++) {
        if (i - current.lineNum > 100) {
          break;
        }
        const iIndentLength = (lines[i].match(MDTextarea.INDENT_PATTERN) || [
          "",
        ])[0].length;
        const iOrderdNumMatch = lines[i].match(MDTextarea.ORDERED_LIST_PATTERN);
        if (!(iIndentLength === current.indent.length && iOrderdNumMatch)) {
          break;
        }

        numberingEnd += lines[i].length + 1;
      }

      if (numberingStart === numberingEnd) {
        return;
      }

      const linesToNumbering = this.textarea.value
        .slice(numberingStart, numberingEnd)
        .split("\n");
      let orderedNum = parseInt(currentOrderdNumMatch[2]) + 1;
      for (let i = 0; i < linesToNumbering.length; i++) {
        linesToNumbering[i] = linesToNumbering[i].replace(
          MDTextarea.ORDERED_LIST_PATTERN,
          `${current.indent}${orderedNum}. `
        );
        orderedNum++;
      }
      this.textarea.setSelectionRange(numberingStart, numberingEnd);
      document.execCommand("insertText", false, linesToNumbering.join("\n"));
      this.textarea.selectionStart = this.textarea.selectionEnd = current.pos;
    }

    getNextOrderedNumber(index, targetIndent) {
      // 次の数字を取得
      let nextNum = 1;
      const lineNumIndex = this.getLineNum(index) - 1;
      const lines = this.getLines();
      for (let i = lineNumIndex - 1; i >= 0; i--) {
        if (new RegExp(`^${targetIndent}[\\d]+\\. `).test(lines[i])) {
          nextNum =
            parseInt(lines[i].match(MDTextarea.ORDERED_LIST_PATTERN)[2]) + 1;
          break;
        }
        // 現在行よりインデントが浅い行に到達したら終了
        const iIndentLength = (lines[i].match(MDTextarea.INDENT_PATTERN) || [
          "",
        ])[0].length;
        if (iIndentLength < targetIndent.length) {
          break;
        }
        // 100行でリミットをかける
        if (lineNumIndex - i > 100) {
          break;
        }
      }

      return nextNum;
    }

    inputPrefix(prefix) {
      this.modifyTextWithScroll(() => {
        document.execCommand("insertText", false, prefix);
      });
    }

    removePrefix(line) {
      this.modifyTextWithScroll(() => {
        const insertText = line;
        if (MDTextarea.OUTDENT_INDENT_PATTERN.test(insertText)) {
          // インデントがある場合、インデントを削除
          this.outdent(line);
        } else {
          this.textarea.setSelectionRange(
            this.currentPos - line.length,
            this.currentPos
          );
          document.execCommand("delete");
        }
      });
    }

    indent(line) {
      this.modifyTextWithScroll(() => {
        // 選択範囲がある場合は選択範囲をインデントする
        const isSelectionNotEmpty =
          this.textarea.selectionStart !== this.textarea.selectionEnd;
        if (isSelectionNotEmpty) {
          const selectStart = this.getStartOfLine(this.textarea.selectionStart);
          const selectEnd = this.getEndOfLine(this.textarea.selectionEnd);
          const selectText = this.textarea.value.substring(
            selectStart,
            selectEnd
          );
          const selectLines = selectText.split("\n");
          for (let i = 0; i < selectLines.length; i++) {
            selectLines[i] = this.indentStr + selectLines[i];
          }
          this.textarea.setSelectionRange(selectStart, selectEnd);
          document.execCommand("insertText", false, selectLines.join("\n"));
          this.textarea.setSelectionRange(
            selectStart,
            this.textarea.selectionStart
          );
          return;
        }

        const start = this.getStartOfLine(this.currentPos);
        if (MDTextarea.ORDERED_LIST_PATTERN.test(line)) {
          // 番号付きリストの場合、数字をリセットする
          const orderedListSymbol = line.match(
            MDTextarea.ORDERED_LIST_PATTERN
          )[0];
          const nextIndent =
            this.indentStr + (line.match(MDTextarea.INDENT_PATTERN) || [""])[0];
          const nextNum = this.getNextOrderedNumber(start, nextIndent);
          const nextNumStr = `${nextIndent}${nextNum}. `;
          this.textarea.setSelectionRange(
            start,
            start + orderedListSymbol.length
          );
          document.execCommand("insertText", false, nextNumStr);
          const lengthDiff = nextNumStr.length - orderedListSymbol.length;
          this.textarea.selectionStart = this.textarea.selectionEnd =
            this.currentPos + lengthDiff;
          // 次行以降の番号を振り直す
          this.autoNumbering(this.textarea.selectionStart);
        } else {
          this.textarea.selectionStart = this.textarea.selectionEnd = start;
          document.execCommand("insertText", false, this.indentStr);
          this.textarea.selectionStart = this.textarea.selectionEnd =
            this.currentPos + this.indentStr.length;
        }
      });
    }

    outdent(line) {
      this.modifyTextWithScroll(() => {
        // 選択範囲がある場合は選択範囲をアウトデントする
        const isSelectionNotEmpty =
          this.textarea.selectionStart !== this.textarea.selectionEnd;
        if (isSelectionNotEmpty) {
          const selectStart = this.getStartOfLine(this.textarea.selectionStart);
          const selectEnd = this.getEndOfLine(this.textarea.selectionEnd);
          const selectText = this.textarea.value.substring(
            selectStart,
            selectEnd
          );
          const selectLines = selectText.split("\n");
          for (let i = 0; i < selectLines.length; i++) {
            selectLines[i] = selectLines[i].replace(
              MDTextarea.OUTDENT_INDENT_PATTERN,
              ""
            );
          }
          this.textarea.setSelectionRange(selectStart, selectEnd);
          document.execCommand("insertText", false, selectLines.join("\n"));
          this.textarea.setSelectionRange(
            selectStart,
            this.textarea.selectionStart
          );
          return;
        }

        if (!MDTextarea.OUTDENT_INDENT_PATTERN.test(line)) {
          return;
        }

        const isOrderedListItem = MDTextarea.ORDERED_LIST_PATTERN.test(line);
        if (isOrderedListItem) {
          // 番号付きリストの場合、数字をリセットする
          const start = this.getStartOfLine(this.currentPos);
          const end =
            start + line.match(MDTextarea.ORDERED_LIST_PATTERN)[0].length;
          this.textarea.setSelectionRange(start, end);
          const nextIndent = (line.match(MDTextarea.INDENT_PATTERN) || [
            "",
          ])[0].replace(MDTextarea.OUTDENT_INDENT_PATTERN, "");
          const nextNum = this.getNextOrderedNumber(start, nextIndent);
          const outdentPrefix = `${nextIndent}${nextNum}. `;
          document.execCommand("insertText", false, outdentPrefix);
          const lengthDiff =
            outdentPrefix.match(MDTextarea.ORDERED_LIST_PATTERN)[2].length -
            line.match(MDTextarea.ORDERED_LIST_PATTERN)[2].length;
          this.textarea.selectionStart = this.textarea.selectionEnd =
            this.currentPos -
            line.match(MDTextarea.OUTDENT_INDENT_PATTERN)[0].length +
            lengthDiff;
          // 次行以降の番号を振り直す
          this.autoNumbering(this.textarea.selectionStart);
        } else {
          // 行頭・行末位置を取得する
          const indentLength = line.match(MDTextarea.OUTDENT_INDENT_PATTERN)[0]
            .length;
          const start = this.getStartOfLine(this.currentPos);
          const end = start + indentLength;

          this.textarea.setSelectionRange(start, end);
          document.execCommand("delete");

          if (this.textarea.selectionStart < this.currentPos - indentLength) {
            this.textarea.selectionStart = this.textarea.selectionEnd =
              this.currentPos - indentLength;
          }
        }
      });
    }

    // テキストを変更した後、スクロール位置を調整する
    modifyTextWithScroll(modifyTextFunc) {
      modifyTextFunc();

      // 一時的にスクロールバーを非表示にして、幅を取得
      const originalOverflow = this.textarea.style.overflow;
      this.textarea.style.overflow = "hidden";
      const widthStr = getComputedStyle(this.textarea).width;
      this.textarea.style.overflow = originalOverflow;

      const heightStr = getComputedStyle(this.textarea).height;
      const height = parseFloat(heightStr.replace("px", ""));
      const lineHeight = this.getLineHeight();

      // カーソル位置測定用の clone を作成し、見えないところでスクロールさせてカーソル位置情報を取る
      const clone = this.textarea.cloneNode(true);
      clone.style.display = "hidden";
      clone.style.position = "fixed";
      clone.style.top = "-9999px";
      clone.style.left = "-9999px";
      clone.style.width = widthStr;
      clone.style.height = heightStr;
      clone.value = this.textarea.value.substring(
        0,
        this.textarea.selectionStart
      );
      document.body.appendChild(clone);
      clone.scrollTop = clone.scrollHeight;
      const cloneScrollTop = clone.scrollTop;
      // 要素の高さを1行分とすることで、縦方向のカーソル位置を取得する
      clone.style.height = `${lineHeight}px`;
      const cursorHeight =
        clone.scrollHeight - (clone.scrollHeight % lineHeight);
      // カーソル位置計算に利用した clone を削除
      clone.remove();

      if (this.textarea.scrollTop < cloneScrollTop) {
        // 下方向にスクロールする場合
        this.textarea.scrollTop = cloneScrollTop;
      } else if (this.textarea.scrollTop > cursorHeight - lineHeight) {
        // 上方向にスクロールする場合
        if (cursorHeight <= height) {
          // 行頭に近い位置でのスクロールの場合の考慮
          this.textarea.scrollTop = cursorHeight - lineHeight;
        } else {
          this.textarea.scrollTop = cloneScrollTop + height - lineHeight;
        }
      }
    }

    getLineHeight() {
      let lineHeight = parseInt(
        window.getComputedStyle(this.textarea).lineHeight
      );

      // "normal" など数値で返ってこなかった場合は差分で計算
      if (isNaN(lineHeight)) {
        // クローン作成
        const clone = this.textarea.cloneNode(true);
        clone.style.position = "absolute";
        clone.style.visibility = "hidden";
        clone.style.height = "auto"; // 高さを自動に設定
        clone.style.width = getComputedStyle(this.textarea).width; // 幅を同じに
        clone.style.padding = getComputedStyle(this.textarea).padding;
        clone.style.border = getComputedStyle(this.textarea).border;
        clone.style.fontFamily = getComputedStyle(this.textarea).fontFamily;
        clone.style.fontSize = getComputedStyle(this.textarea).fontSize;
        clone.style.height = "1px";
        document.body.appendChild(clone);

        // 1行の高さを測定
        clone.value = "X";
        const singleLineHeight = clone.scrollHeight;

        // 2行の高さを測定
        clone.value = "X\nX";
        const doubleLineHeight = clone.scrollHeight;

        // クローンを削除
        clone.remove();

        // 1行あたりの高さを計算
        lineHeight = doubleLineHeight - singleLineHeight;

        // 計算結果が0以下の場合はフォールバック
        if (lineHeight <= 0) {
          const fontSize = parseFloat(
            window.getComputedStyle(this.textarea).fontSize
          );
          lineHeight = Math.round(fontSize * 1.2); // フォントサイズの1.2倍が一般的
        }
      }

      return lineHeight;
    }
  }

  function setTextareaEventListeners(textarea) {
    textarea.dataset.pmtCustomEvent = "true";

    textareaSelectionManager.reset();

    // Ctrl+V の際にカーソルが末尾にジャンプする不具合を予防
    // 貼り付け形式がテキストの場合、標準のイベントリスナーには処理をさせない
    textarea.addEventListener(
      "paste",
      (event) => {
        if (!event.clipboardData.types.includes("text/plain")) {
          return;
        }
        event.stopImmediatePropagation();
      },
      true
    );
    // フォーカスアウト & イン時にカーソル位置が移動する不具合を予防
    let focusByMouse = false;
    textarea.addEventListener(
      "mousedown",
      () => {
        focusByMouse = true;
      },
      true
    );
    textarea.addEventListener(
      "focusout",
      () => {
        textareaSelectionManager.setPosWhenTextareaActive();
        focusByMouse = false;
      },
      true
    );
    textarea.addEventListener("focusin", async () => {
      if (!focusByMouse && textareaSelectionManager.textarea) {
        await sleep(50);
        const pos = textareaSelectionManager.getPos();
        if (
          textarea.selectionStart !== pos.start &&
          textarea.selectionEnd !== pos.end
        ) {
          textareaSelectionManager.applyPosToTextarea();
        }
      }
      if (textareaSelectionManager.textarea) {
        textareaSelectionManager.reset();
      }
      focusByMouse = false;
    });

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
            // スクロール移動
            if (
              ["ArrowDown", "ArrowUp", "PageDown", "PageUp"].includes(
                event.code
              ) &&
              textarea.value.length === 0
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

    // TODO: 2025-06-19 PerplexityのUIに変更が加わっている最中なので様子見
    // textarea.addEventListener(
    //   "keydown",
    //   (event) => {
    //     if (event.isComposing) {
    //       return;
    //     }
    //     // Ctrl+Enter 送信の設定を考慮する
    //     if (
    //       !config.markdownEditorLike &&
    //       config.ctrlEnter &&
    //       !ctrlOrMetaKey(event) &&
    //       event.code === "Enter"
    //     ) {
    //       event.stopImmediatePropagation();
    //     }
    //   },
    //   true
    // );

    // Markdownエディターライクな操作を追加
    // TODO: 2025-06-19 PerplexityのUIに変更が加わっている最中なので様子見
    // if (config.markdownEditorLike) {
    //   if (config.ctrlEnter) {
    //     const mdTextarea = new MDTextarea(textarea, [], false);
    //     mdTextarea.enable();
    //   } else {
    //     const mdTextarea = new MDTextarea(
    //       textarea,
    //       [MDTextarea.SHIFT_KEY],
    //       false
    //     );
    //     mdTextarea.enable();
    //   }
    // }
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function mainObserver(mutations) {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const parent = node.parentElement;
          if (!parent) {
            return;
          }

          // ライブラリページのショートカット
          if (location.pathname === LIBRARY_PATHNAME) {
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
                const currentLink =
                  libraryLinks.links[libraryLinks.activeIndex];
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
                  if (
                    libraryLinks.activeIndex ===
                    libraryLinks.links.length - 1
                  ) {
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

          // スペース選択のショートカット
          if (location.pathname === SPACES_PATHNAME) {
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
                let targetItem = spacesParent.querySelector(
                  "a.space-selection-active"
                );
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
                      (Array.from(items).indexOf(targetItem) -
                        1 +
                        items.length) %
                        items.length
                    ];
                  targetItem.classList.add("space-selection-active");
                  targetItem.scrollIntoView({ block: "nearest" });
                } else if (event.code === "ArrowRight") {
                  event.preventDefault();
                  targetItem.classList.remove("space-selection-active");
                  targetItem =
                    items[
                      (Array.from(items).indexOf(targetItem) + 1) % items.length
                    ];
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
                        Math.floor(
                          (items.length - (currentIndex + 1)) / wrapCount
                        );
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

          // スペース個別画面のショートカット
          if (location.pathname.startsWith(SPACE_DETAIL_PATHNAME)) {
            const scrollableContainer = parent.querySelector(
              ".scrollable-container"
            );
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

              const links = Array.from(
                scrollableContainer.querySelectorAll("a")
              );
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

          // 追加された textarea 要素へのイベントリスナー
          const textareas = parent.querySelectorAll(
            "textarea:not([data-pmt-custom-event])"
          );
          textareas.forEach((textarea) => {
            setTextareaEventListeners(textarea);
          });

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
                  .replace(/\r?\n(\[[0-9]+\] https?:\/\/[^\s]+(\r?\n)?)+$/, "") // Citations: ... 形式ではなくなったので追加対応 2025-06-03
                  .replace(/\[[0-9]+\]/g, "")
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

    // Markdown編集機能を追加
    // ページ読み込み時と、DOM変更時に対応する
    const textareas = document.querySelectorAll(
      "main textarea:not([data-pmt-custom-event])"
    );
    textareas.forEach((textarea) => {
      setTextareaEventListeners(textarea);
    }, true);

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
