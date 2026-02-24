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
    copyBtn.title = "Copy image to clipboard";

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
      svgString,
    )}`;

    while (imgSVG.complete === false) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  function base64EncodeUnicode(str) {
    return btoa(
      encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function (match, p1) {
        return String.fromCharCode("0x" + p1);
      }),
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
      "m",
    );
    const match = codeText.match(mermaidRegEx);

    if (match) {
      // 階層を上にたどって pre タグを探す
      const pre = block.closest("pre");
      // プレビュー表示用のボタンを作成し、コードブロックの上部に追加
      const btnDiv = document.createElement("div");
      btnDiv.classList.add("mermaid-preview-button-wrapper");
      const btn = document.createElement("button");

      const svgString = `
<span style="display:inline-flex; align-items:center; gap:2px; line-height:1;">
Mermaid Preview
<svg width="16px" height="16px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<g id="Interface / External_Link">
<path id="Vector" d="M10.0002 5H8.2002C7.08009 5 6.51962 5 6.0918 5.21799C5.71547 5.40973 5.40973 5.71547 5.21799 6.0918C5 6.51962 5 7.08009 5 8.2002V15.8002C5 16.9203 5 17.4801 5.21799 17.9079C5.40973 18.2842 5.71547 18.5905 6.0918 18.7822C6.5192 19 7.07899 19 8.19691 19H15.8031C16.921 19 17.48 19 17.9074 18.7822C18.2837 18.5905 18.5905 18.2839 18.7822 17.9076C19 17.4802 19 16.921 19 15.8031V14M20 9V4M20 4H15M20 4L13 11" stroke="#999" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</g>
</svg>
</span>
`;
      btn.innerHTML = svgString;

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

      let inDoubleQuote, inComment, bracketStart, bracketEnd, startBracket;
      const resetAllVars = () => {
        inDoubleQuote = false;
        inComment = false;
        inExpandedNodeShapes = false;
        bracketStart = -1;
        bracketEnd = -1;
        startBracket = "";
      };
      resetAllVars();

      const bracketSymbolList = [
        "[",
        "{",
        "(",
        "]",
        "}",
        ")",
        ">",
        "/",
        "\\",
        "|",
      ];
      const bracketPairs = {
        "[": "]",
        "{": "}",
        "(": ")",
        ">": "]",
      };
      for (let i = 0; i < charArray.length; i++) {
        const char = charArray[i];

        // 改行が来たらすべてリセット
        if (char === "\n") {
          resetAllVars();
          continue;
        }

        // コメントアウトの場合はスキップ
        if (inComment) {
          continue;
        }

        // 文字列内判定中で、閉じるダブルクオートが来るまではスキップ
        if (inDoubleQuote && char !== '"') {
          continue;
        }

        // 処理に関係しない文字列はスキップ
        if (!bracketSymbolList.concat(['"', "@"]).includes(char)) {
          continue;
        }

        // Expanded Node Shapes の場合はスキップ
        if (inExpandedNodeShapes && char !== "}") {
          continue;
        }

        // コメントアウトの開始
        if (char === "%" && charArray[i + 1] === "%") {
          inComment = true;
          i++;
          continue;
        }

        // Expanded Node Shapes の処理
        if (char === "@" && charArray[i + 1] === "{") {
          inExpandedNodeShapes = true;
          i++; // 次の { はスキップ
          continue;
        } else if (inExpandedNodeShapes && char === "}") {
          inExpandedNodeShapes = false;
          continue;
        }

        // カッコの開始
        if (bracketSymbolList.includes(char) && bracketStart === -1) {
          if (char === "(") {
            startBracket = char;
            bracketStart = i;
            if (charArray[i + 1] === "[") {
              startBracket = "[";
              bracketStart = i + 1;
              i++; // 次の [ はスキップ
            } else if (charArray[i + 1] === "(" && charArray[i + 2] === "(") {
              startBracket = "(";
              bracketStart = i + 2;
              i += 2; // 次の (( はスキップ
            } else if (charArray[i + 1] === "(") {
              startBracket = "(";
              bracketStart = i + 1;
              i++; // 次の ( はスキップ
            }
          } else if (char === "[") {
            startBracket = char;
            bracketStart = i;
            if (charArray[i + 1] === "[") {
              startBracket = "[";
              bracketStart = i + 1;
              i++; // 次の [ はスキップ
            } else if (charArray[i + 1] === "(") {
              startBracket = "(";
              bracketStart = i + 1;
              i++; // 次の / または \ はスキップ
            } else if (["/", "\\"].includes(charArray[i + 1])) {
              startBracket = charArray[i + 1];
              bracketStart = i + 1;
              i++; // 次の / または \ はスキップ
            }
          } else if (char === "{") {
            startBracket = char;
            bracketStart = i;
            if (charArray[i + 1] === "{") {
              startBracket = "{";
              bracketStart = i + 1;
              i++; // 次の { はスキップ
            }
          } else if (char === ">" && !["-", "="].includes(charArray[i - 1])) {
            startBracket = char;
            bracketStart = i;
          } else if (char === "|") {
            startBracket = char;
            bracketStart = i;
          }
          continue;
        }

        // ダブルクオートの処理
        if (!inDoubleQuote && startBracket > -1 && char === '"') {
          // 開始
          inDoubleQuote = true;
          continue;
        } else if (inDoubleQuote && char === '"') {
          // 終了
          inDoubleQuote = false;
          continue;
        }

        // カッコの終了
        if (
          bracketStart > -1 &&
          (char === bracketPairs[startBracket] ||
            (["/", "\\"].includes(startBracket) &&
              ["/", "\\"].includes(char)) ||
            (startBracket === "|" && char === "|"))
        ) {
          bracketEnd = i;
        }

        // ダブルクォートの追加
        if (bracketStart > -1 && bracketEnd > -1) {
          if (charArray[bracketStart + 1] !== '"') {
            charArray[bracketStart] = `${charArray[bracketStart]}"`;
          }
          if (charArray[bracketEnd - 1] !== '"') {
            charArray[bracketEnd] = `"${charArray[bracketEnd]}`;
          }
          resetAllVars();
        }
      }
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
    let code = codeText.replace(/^```mermaid\s*\n|\n\s*```$/gm, "");

    // パースしてエラーがあればアラートを表示
    let errMessage;
    try {
      await mermaid.parse(code);
    } catch (error) {
      errMessage = error.message;
      // パースエラーがあった場合はエスケープ処理をして再度パースを試みる
      try {
        code = escapeMermaidSyntax(code);
        await mermaid.parse(code);
      } catch (error) {
        alert(`[Mermaid syntax error]\n\n${errMessage}`);
        return;
      }
    }

    // SVGを生成してポップアップに表示
    const { svg } = await mermaid.render("graphDiv", code);
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
