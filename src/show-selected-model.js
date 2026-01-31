// モデル選択ボタンの隣に、選択中のモデル名を表示する

(async () => {

  // 思案中、検討中などの日本語表示を検出する正規表現
  const THINKING_STRINGS_JP = /思案中|検討中/g;

  async function getConfig() {
    const config = {};
    // 設定読み込み
    return new Promise((resolve) => {
      chrome.storage.local.get(["showSelectedModel"], (data) => {
        // 設定値の取得
        if (data.showSelectedModel === undefined) {
          config.showSelectedModel = true;
        } else {
          config.showSelectedModel = data.showSelectedModel;
        }

        resolve(config);
      });
    });
  }

  const TOP_EDITABLE_DIV_ID = "ask-input";
  const AI_MODEL_BUTTON_SELECTOR = 'button:has(use[*|href="#pplx-icon-cpu"])';

  const getSearchBox = () => {
    const editableDiv = document.getElementById(TOP_EDITABLE_DIV_ID);
    if (!editableDiv) return null;
    return editableDiv.closest("div:has(button)");
  };

  const getModelSelectionButton = () => {
    const searchBox = getSearchBox();
    if (!searchBox) return null;
    return searchBox.querySelector(AI_MODEL_BUTTON_SELECTOR);
  };

  const getModelNameFromLabel = () => {
    const button = getModelSelectionButton();
    if (!button) return null;

    if (!button.querySelector(".text-super")) {
      return null;
    }

    const label = button.getAttribute("aria-label");
    if (!label) return null;
    // ボタンの aria-label には「思案中」「検討中」などの日本語ステータスが入るため、
    // 表示用には英語の "Thinking" に統一してステータスを示す。
    return label.trim().replace(THINKING_STRINGS_JP, "Thinking");
  };

  const createModelNameElement = () => {
    const div = document.createElement("div");
    div.id = "model-name-display";
    Object.assign(div.style, {
      display: "flex",
      alignItems: "center",
      fontFamily: "ui-sans-serif, system-ui",
      fontSize: "12px",
      color: "#91928f",
      whiteSpace: "nowrap",
      paddingRight: "6px",
    });
    return div;
  };

  const addOrUpdateModelNameElement = () => {
    let modelNameElement = document.getElementById("model-name-display");

    const buttonParent = getModelSelectionButton()?.closest("div.flex");
    if (!buttonParent) {
      if (modelNameElement) {
        modelNameElement.textContent = "";
      }
      return;
    }

    if (!modelNameElement) {
      modelNameElement = createModelNameElement();
      buttonParent.insertAdjacentElement("afterbegin", modelNameElement);
    }
    const modelName = getModelNameFromLabel();
    modelNameElement.textContent = modelName ? modelName : "";
  };

  const observer = new MutationObserver(() => {
    // 遅延させてから処理を実行
    setTimeout(() => {
      const searchBox = getSearchBox();
      if (!searchBox) return;

      const modelName = getModelNameFromLabel();
      if (
        document.getElementById("model-name-display") === null ||
        modelName !== document.getElementById("model-name-display").textContent
      ) {
        addOrUpdateModelNameElement();
      }
    }, 200);
  });

  let observedTarget = null;

  const startObserving = () => {
    if (observedTarget) return;

    observedTarget = true;
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  };

  const init = () => {
    startObserving();
  };

  // ページ読み込み完了後に初期化
  const config = await getConfig();
  if (!config.showSelectedModel) return;

  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
