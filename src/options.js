// 設定読み込み
document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get(
    [
      "markdownEditorLike",
      "ctrlEnter",
      "searchOption",
      "navigation",
      "simpleCopy",
      "mermaidEnabled",
      "mermaidTheme",
      "tocEnabled",
      "showSelectedModel",
    ],
    (data) => {
      // 検索オプション切り替えの設定
      if (data.searchOption === undefined) {
        document.getElementById("shortcut-search-options").checked = true;
      } else {
        document.getElementById("shortcut-search-options").checked =
          data.searchOption;
      }

      // ナビゲーション設定
      if (data.navigation === undefined) {
        document.getElementById("shortcut-navigation").checked = true;
      } else {
        document.getElementById("shortcut-navigation").checked =
          data.navigation;
      }

      // 引用リンク無しコピーの設定
      if (data.simpleCopy === undefined) {
        document.getElementById("shortcut-simple-copy").checked = true;
      } else {
        document.getElementById("shortcut-simple-copy").checked =
          data.simpleCopy;
      }

      // Mermaidプレビュー 有効状態
      if (data.mermaidEnabled === undefined) {
        document.getElementById("mermaid-enabled").checked = true;
      } else {
        document.getElementById("mermaid-enabled").checked =
          data.mermaidEnabled;
      }

      // Mermaidのテーマ設定
      document.getElementById("mermaid-theme").value =
        data.mermaidTheme || "auto";

      // TOC機能の設定
      if (data.tocEnabled === undefined) {
        document.getElementById("toc-enabled").checked = true;
      } else {
        document.getElementById("toc-enabled").checked = data.tocEnabled;
      }

      // 選択中モデル表示の設定
      if (data.showSelectedModel === undefined) {
        document.getElementById("show-selected-model").checked = true;
      } else {
        document.getElementById("show-selected-model").checked =
          data.showSelectedModel;
      }
    },
  );
});

// 設定保存
document.querySelector("form").addEventListener("submit", (e) => {
  e.preventDefault();
  // 検索オプションの設定
  const searchOption = document.getElementById(
    "shortcut-search-options",
  ).checked;
  chrome.storage.local.set({ searchOption });

  // ナビゲーション設定
  const navigation = document.getElementById("shortcut-navigation").checked;
  chrome.storage.local.set({ navigation });

  // 引用リンク無しコピーの設定
  const simpleCopy = document.getElementById("shortcut-simple-copy").checked;
  chrome.storage.local.set({ simpleCopy });

  // Mermaidプレビュー 有効状態
  const mermaidEnabled = document.getElementById("mermaid-enabled").checked;
  chrome.storage.local.set({ mermaidEnabled });

  // Mermaidのテーマ設定
  const mermaidTheme = document.getElementById("mermaid-theme").value;
  if (mermaidTheme === "auto") {
    chrome.storage.local.remove("mermaidTheme");
  } else {
    chrome.storage.local.set({ mermaidTheme });
  }

  // TOC機能の設定
  const tocEnabled = document.getElementById("toc-enabled").checked;
  chrome.storage.local.set({ tocEnabled });

  // 選択中モデル表示の設定
  const showSelectedModel = document.getElementById(
    "show-selected-model",
  ).checked;
  chrome.storage.local.set({ showSelectedModel });

  // 過去に利用していた設定の削除
  chrome.storage.local.remove("fixInputLag"); // テキストボックス入力時のラグを修正する（実験的機能）

  // 設定完了メッセージを表示
  document.getElementById("confirmation-message").style.display = "block";
});

// 変更されたら設定完了メッセージを非表示にする
document.addEventListener("change", () => {
  document.getElementById("confirmation-message").style.display = "none";
});
