(async () => {
  const SELECTOR = "pre code:not([data-mermaid-processed])";
  const MUTATION_OBSERVER_QUERY_SELECTOR = "code";
  const BACKGROUND_WHITE = "#FFFFFF";
  const BACKGROUND_DARK = "#1E1E1E";
  const ICON_COPY = "assets/copy-16.png";
  const ICON_DOWNLOAD = "assets/download-16.png";
  const ICON_CLOSE = "assets/close-16.png";
  const ICON_CHECK = "assets/check-16.png";
  const BTN_CHECK_DELAY = 1500;
  const FULL_BTN_TITLE_ENABLE = "Enter Pan & Zoom";
  const FULL_BTN_TITLE_DISABLE = "Exit Pan & Zoom";
  const FULL_BTN_TEXT_ENABLE = "Zoom On";
  const FULL_BTN_TEXT_DISABLE = "Zoom Off";

  let overlay,
    popup,
    container,
    themeSelect,
    canvas,
    svgPanZoomObj,
    activeBtn,
    fullBtn = null;
  const downloadLink = document.createElement("a");

  let tmpTheme = null;

  async function getConfig() {
    const config = {};
    // 設定読み込み
    return new Promise((resolve) => {
      chrome.storage.local.get(["mermaidTheme", "mermaidEnabled"], (data) => {
        // Mermaidプレビューが有効かどうか
        if (data.mermaidEnabled === undefined) {
          config.mermaidEnabled = true;
        } else {
          config.mermaidEnabled = data.mermaidEnabled;
        }
        // OSのダークモードを考慮したデフォルト値
        const defaultTheme = window.matchMedia("(prefers-color-scheme: dark)")
          .matches
          ? "dark"
          : "default";
        config.mermaidTheme = tmpTheme || data.mermaidTheme || defaultTheme;

        resolve(config);
      });
    });
  }

  async function initializePopup() {
    // モーダルオーバーレイ
    overlay = document.createElement("div");
    overlay.id = "mermaid-overlay";
    overlay.style.display = "none";
    overlay.classList.add("mermaid-modal-overlay");
    document.body.appendChild(overlay);

    // ポップアップ
    popup = document.createElement("div");
    popup.id = "mermaid-popup";
    document.body.appendChild(popup);

    // SVGを表示するコンテナ
    container = document.createElement("div");
    container.id = "mermaid-container";

    // ボタン類はスティッキーに格納
    const sticky = document.createElement("div");
    sticky.id = "mermaid-sticky";
    const stickyLeft = document.createElement("div");
    const stickyCenter = document.createElement("div");
    const stickyRight = document.createElement("div");
    stickyLeft.classList.add("sticky-left");
    stickyLeft.classList.add("sticky-center");
    stickyRight.classList.add("sticky-right");
    sticky.appendChild(stickyLeft);
    sticky.appendChild(stickyCenter);
    sticky.appendChild(stickyRight);

    // 一時的にテーマを変えるセレクトボックス
    themeSelect = document.createElement("select");
    themeSelect.id = "mermaid-popup-theme";
    themeSelect.title = "Change theme";

    const themes = ["default", "neutral", "dark", "forest", "base"];
    themes.forEach((theme) => {
      const option = document.createElement("option");
      option.value = theme;
      option.textContent = theme;
      themeSelect.appendChild(option);
    });

    // tmpThemeがある場合はそれを選択
    if (tmpTheme) {
      themeSelect.value = tmpTheme;
    } else {
      const config = await getConfig();
      themeSelect.value = config.mermaidTheme;
    }

    const themeSelectLabel = document.createElement("label");
    themeSelectLabel.classList.add("theme-select-label");
    themeSelectLabel.appendChild(themeSelect);
    stickyLeft.appendChild(themeSelectLabel);

    // フル表示ボタン
    fullBtn = document.createElement("button");
    fullBtn.id = "mermaid-popup-full";
    fullBtn.title = FULL_BTN_TITLE_ENABLE;
    fullBtn.textContent = FULL_BTN_TEXT_ENABLE;
    fullBtn.addEventListener("click", () => {
      const svgElement = container.firstChild;
      if (svgPanZoomObj) {
        closePopup();
        activeBtn.click();
      } else {
        enterPanZoom(svgElement);
      }
    });

    // PNGコピー用ボタン
    const copyBtn = document.createElement("button");
    copyBtn.id = "mermaid-popup-copy";
    copyBtn.title = "Copy to clipboard";

    const copyImg = document.createElement("img");
    copyImg.src = chrome.runtime.getURL(ICON_COPY);
    copyImg.alt = "Copy";
    copyImg.style.verticalAlign = "middle";
    copyBtn.appendChild(copyImg);

    copyBtn.addEventListener("click", async (event) => {
      if (!canvas) {
        return;
      }
      await copySVGAsPNG();
      // 特定秒数だけボタンをチェック画像に変える
      showBalloon("Copied!", event.target);
      copyBtn.disabled = true;
      copyImg.src = chrome.runtime.getURL(ICON_CHECK);
      setTimeout(() => {
        copyBtn.disabled = false;
        copyImg.src = chrome.runtime.getURL(ICON_COPY);
      }, BTN_CHECK_DELAY);
    });

    // PNGダウンロード用リンク
    const downloadBtn = document.createElement("button");
    downloadBtn.id = "mermaid-popup-download";
    downloadBtn.title = "Download as PNG";

    const downloadImg = document.createElement("img");
    downloadImg.src = chrome.runtime.getURL(ICON_DOWNLOAD);
    downloadImg.alt = "Download";
    downloadImg.style.verticalAlign = "middle";
    downloadBtn.appendChild(downloadImg);

    downloadBtn.addEventListener("click", (event) => {
      if (!canvas) {
        return;
      }
      // pplx-mermaid-yyyyMMddHHmmss.png 形式で保存
      const now = new Date();
      const formattedDateTime = `${now.getFullYear()}${(now.getMonth() + 1)
        .toString()
        .padStart(2, "0")}${now.getDate().toString().padStart(2, "0")}${now
        .getHours()
        .toString()
        .padStart(2, "0")}${now.getMinutes().toString().padStart(2, "0")}${now
        .getSeconds()
        .toString()
        .padStart(2, "0")}`;
      const filename = `pplx-mermaid-${formattedDateTime}.png`;
      downloadSVGAsPNG(filename);
      // 特定秒数だけボタンをチェック画像に変える
      showBalloon("Downloading...", event.target);
      downloadBtn.disabled = true;
      downloadImg.src = chrome.runtime.getURL(ICON_CHECK);
      setTimeout(() => {
        downloadBtn.disabled = false;
        downloadImg.src = chrome.runtime.getURL(ICON_DOWNLOAD);
      }, BTN_CHECK_DELAY);
    });

    // 閉じるボタン
    const closeBtn = document.createElement("button");
    closeBtn.id = "mermaid-popup-close";
    closeBtn.title = "Close";

    const closeImg = document.createElement("img");
    closeImg.src = chrome.runtime.getURL(ICON_CLOSE);
    closeImg.alt = "Close";
    closeImg.style.verticalAlign = "middle";
    closeBtn.appendChild(closeImg);

    // ボタンボックスにボタンを追加
    stickyCenter.appendChild(fullBtn);
    stickyRight.appendChild(copyBtn);
    stickyRight.appendChild(downloadBtn);
    stickyRight.appendChild(closeBtn);

    // ポップアップに要素を追加
    popup.appendChild(container);
    popup.appendChild(sticky);

    // ポップアップを閉じる操作のイベントリスナー
    closeBtn.addEventListener("click", () => {
      closePopup();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closePopup();
      }
    });
  }

  function closePopupOnOutsideClick(event) {
    if (
      popup.style.visibility === "visible" &&
      event.target.id !== "mermaid-popup" &&
      !popup.contains(event.target)
    ) {
      closePopup();
    }
  }

  function closePopup() {
    exitPanZoom();
    popup.style.visibility = "hidden";
    overlay.style.display = "none";
    if (container.firstChild) {
      container.firstChild.remove();
    }
    document.removeEventListener("click", closePopupOnOutsideClick);
    if (svgPanZoomObj) {
      svgPanZoomObj.destroy();
      svgPanZoomObj = null;
    }
  }

  async function showPopup({ svgContent }) {
    if (!popup) {
      await initializePopup();
    }

    const oldThemeSelect = themeSelect;
    const newThemeSelect = themeSelect.cloneNode(true);
    newThemeSelect.value = tmpTheme || oldThemeSelect.value;
    themeSelect.parentNode.replaceChild(newThemeSelect, themeSelect);
    themeSelect = newThemeSelect;
    oldThemeSelect.remove();

    themeSelect.addEventListener("change", (event) => {
      tmpTheme = event.target.value;
      activeBtn.click();
    });

    // ダークテーマのクラス設定
    const config = await getConfig();
    if (config.mermaidTheme === "dark") {
      popup.classList.add("mermaid-dark");
    } else {
      popup.classList.remove("mermaid-dark");
    }

    // 既存のコンテンツをクリア
    container.innerHTML = "";

    // 新しいSVG要素を追加
    container.innerHTML = svgContent;
    const svgElement = container.firstChild;

    // viewBox属性から幅と高さを取得
    const viewBox = svgElement.getAttribute("viewBox").split(" ");
    const bbox = {
      width: parseFloat(viewBox[2]),
      height: parseFloat(viewBox[3]),
    };
    container.style.width = `${bbox.width}px`;
    container.style.height = `${bbox.height}px`;
    container.dataset.width = bbox.width;
    container.dataset.height = bbox.height;

    await makeCanvas(svgElement, bbox.width, bbox.height);

    popup.style.visibility = "visible";
    overlay.style.display = "block";

    document.addEventListener("click", closePopupOnOutsideClick);
  }

  function enterPanZoom(svgElement) {
    document.removeEventListener("click", closePopupOnOutsideClick);
    popup.style.width = "100%";
    popup.style.height = "100%";
    container.style.width = "100%";
    container.style.height = "100%";
    svgElement.removeAttribute("style");
    svgElement.style.width = "100%";
    svgElement.style.height = "100%";
    fullBtn.title = FULL_BTN_TITLE_DISABLE;
    fullBtn.textContent = FULL_BTN_TEXT_DISABLE;
    if (!svgPanZoomObj) {
      svgPanZoomObj = svgPanZoom(svgElement, {
        zoomScaleSensitivity: 0.3,
        controlIconsEnabled: true,
      });
    } else {
      svgPanZoomObj.enable();
    }
  }

  function exitPanZoom() {
    popup.style.removeProperty("width");
    popup.style.removeProperty("height");
    container.style.width = `${container.dataset.width}px`;
    container.style.height = `${container.dataset.height}px`;
    fullBtn.title = FULL_BTN_TITLE_ENABLE;
    fullBtn.textContent = FULL_BTN_TEXT_ENABLE;
  }

  async function makeCanvas(svg, width, height) {
    const scaleFactor = 1.5; // 解像度の倍率

    const svgString = new XMLSerializer().serializeToString(svg);
    canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    const imgSVG = new Image();
    imgSVG.onload = async () => {
      try {
        canvas.width = width * scaleFactor;
        canvas.height = height * scaleFactor;
        // 背景色設定
        const config = await getConfig();
        if (config.mermaidTheme === "dark") {
          ctx.fillStyle = BACKGROUND_DARK;
        } else {
          ctx.fillStyle = BACKGROUND_WHITE;
        }
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.drawImage(imgSVG, 0, 0);
      } catch (error) {
        console.error("Failed to convert SVG to PNG:", error);
        canvas = null;
      }
    };

    imgSVG.src = `data:image/svg+xml;charset=UTF-8;base64,${base64EncodeUnicode(
      svgString
    )}`;

    while (imgSVG.complete === false) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  function base64EncodeUnicode(str) {
    return btoa(
      encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function (match, p1) {
        return String.fromCharCode("0x" + p1);
      })
    );
  }

  function showBalloon(message, element) {
    const balloon = document.createElement("div");
    balloon.textContent = message;
    balloon.id = "mermaid-action-balloon";
    // 要素の直上に表示
    const rect = element.getBoundingClientRect();
    balloon.style.top = `${rect.top - 40}px`;
    balloon.style.left = `${rect.left}px`;

    document.body.appendChild(balloon);

    setTimeout(() => {
      balloon.remove();
    }, BTN_CHECK_DELAY);
  }

  function downloadSVGAsPNG(filename = "image.png") {
    downloadLink.download = filename;
    downloadLink.href = canvas.toDataURL("image/png");
    downloadLink.click();
  }

  async function copySVGAsPNG() {
    try {
      const pngBase64 = canvas.toDataURL("image/png").split(",")[1]; // "data:image/png;base64,"部分を除去
      const byteCharacters = atob(pngBase64);
      const byteArrays = [];

      for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        const byteNumbers = new Array(slice.length);

        for (let i = 0; i < slice.length; i++) {
          byteNumbers[i] = slice.charCodeAt(i);
        }

        byteArrays.push(new Uint8Array(byteNumbers));
      }

      const blob = new Blob(byteArrays, { type: "image/png" });
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
    } catch (error) {
      console.error("Failed to copy SVG as PNG:", error, canvas);
    }
  }

  function processMermaidBlock(block) {
    // 処理済みのコードブロックはスキップ
    if (block.dataset.mermaidProcessed) {
      return;
    }
    block.dataset.mermaidProcessed = true;

    // 同じブロック内に既にボタンがある場合はスキップ
    const parentBlock = block.closest("pre").parentNode;
    if (parentBlock.querySelector(".mermaid-preview-button-wrapper")) {
      return;
    }

    const codeText = block.textContent.trim();

    // 正規表現で ```mermaid の間の部分を抽出
    const supportedDiagrams = [
      "flowchart",
      "graph",
      "sequenceDiagram",
      "classDiagram",
      "stateDiagram-v2",
      "stateDiagram",
      "erDiagram",
      "journey",
      "gantt",
      "pie",
      "quadrantChart",
      "requirementDiagram",
      "gitGraph",
      "C4Context",
      "mindmap",
      "timeline",
      "zenuml",
      "sankey-beta",
      "xychart-beta",
      "block-beta",
      "packet-beta",
      "kanban",
      "architecture-beta",
    ];
    const mermaidRegEx = new RegExp(
      "^```mermaid\\s*\\n[\\s\\S]*```$|" +
        `^(${supportedDiagrams.join("|")}) ?`,
      "m"
    );
    const match = codeText.match(mermaidRegEx);

    if (match) {
      // 階層を上にたどって pre タグを探す
      const pre = block.closest("pre");
      // プレビュー表示用のボタンを作成し、コードブロックの上部に追加
      const btnDiv = document.createElement("div");
      btnDiv.classList.add("mermaid-preview-button-wrapper");
      const btn = document.createElement("button");
      btn.textContent = "Show Mermaid Diagram";
      btn.classList.add("mermaid-preview-button");
      btnDiv.appendChild(btn);
      pre.parentNode.appendChild(btnDiv);

      // ボタンをクリックしたときにポップアップでプレビューを表示
      btn.addEventListener("click", async (event) => {
        const svg = await renderMermaidDiagram(block, event);
        if (!svg) {
          return;
        }
        activeBtn = event.target;
        showPopup({ svgContent: svg });
      });
    }
  }

  // シンタックスエラーをできるだけ回避するための前処理
  function escapeMermaidSyntax(code) {
    const firstLine = code.split("\n")[0].trim();
    // "flowchart" "graph" で始まる場合
    if (firstLine.startsWith("flowchart") || firstLine.startsWith("graph")) {
      // 文字列を走査して、[] で囲まれた文字列を " で囲む
      charArray = Array.from(code);
      let inDoubleQuote = false;
      let inComment = false;
      let escapeStartIndex = -1;
      let escapeEndIndex = -1;
      charArray.forEach((char, index) => {
        if (!inComment) {
          if (char === '"' && !inDoubleQuote) {
            inDoubleQuote = true;
          } else if (char === '"' && inDoubleQuote) {
            inDoubleQuote = false;
          }
        }
        if (!inDoubleQuote && char === "%" && charArray[index - 1] === "%") {
          inComment = true;
        }
        if (char === "\n") {
          inComment = false;
        }
        if (!inDoubleQuote && !inComment) {
          if (char === "[") {
            escapeStartIndex = index;
          } else if (char === "]") {
            escapeEndIndex = index;
          }
        }
        if (escapeStartIndex !== -1 && escapeEndIndex !== -1) {
          charArray[escapeStartIndex] = '["';
          charArray[escapeEndIndex] = '"]';
          escapeStartIndex = -1;
          escapeEndIndex = -1;
        }
      });
      code = charArray.join("");
    }
    return code;
  }

  // Mermaid をレンダリングし、SVGを返却
  async function renderMermaidDiagram(node, event) {
    if (popup && popup.style.visibility === "visible") {
      closePopup();
    }

    const config = await getConfig();
    mermaid.initialize({
      startOnLoad: false,
      theme: config.mermaidTheme,
    });

    // セレクトボックスにテーマ値を同期する
    if (themeSelect && tmpTheme !== config.mermaidTheme) {
      themeSelect.value = config.mermaidTheme;
    }

    // コードブロック記号は削除
    const codeText = node.textContent.trim();
    const code = codeText.replace(/^```mermaid\s*\n|\n\s*```$/gm, "");

    // シンタックスエラーをできるだけ回避するための前処理
    const escapedCode = escapeMermaidSyntax(code);

    // パースしてエラーがあればアラートを表示
    try {
      await mermaid.parse(escapedCode);
    } catch (error) {
      const message = error.message;
      alert(`[Mermaid syntax error]\n\n${message}`);
      return;
    }

    // SVGを生成してポップアップに表示
    const { svg } = await mermaid.render("graphDiv", escapedCode);
    return svg;
  }

  function processPreElements(root) {
    // 子要素内のcode要素
    if (!root.parentNode) {
      return;
    }
    root.parentNode
      .querySelectorAll(MUTATION_OBSERVER_QUERY_SELECTOR)
      .forEach((node) => {
        if (node.matches(SELECTOR)) {
          processMermaidBlock(node);
        }
      });
  }

  // ---------- Main ----------

  const config = await getConfig();
  if (!config.mermaidEnabled) {
    return;
  }

  // ページ内の <pre> ブロックを走査
  const codeBlocks = document.querySelectorAll(SELECTOR);
  codeBlocks.forEach((block) => {
    processMermaidBlock(block);
  });

  // DOMの変更を監視して、新たに追加されたコードブロックにも処理を適用
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          processPreElements(node);
        }
      });
    });
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: false,
    characterData: false,
  });
})();
