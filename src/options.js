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
    ],
    (data) => {
      // TODO: 2025-06-19 PerplexityのUIに変更が加わっている最中なので様子見
      // // Markdownエディターライクな操作設定
      // if (data.markdownEditorLike === undefined) {
      //   document.getElementById("markdown-editor-like").checked = true;
      // } else {
      //   document.getElementById("markdown-editor-like").checked =
      //     data.markdownEditorLike;
      // }

      // // 送信を Ctrl+Enter にする設定
      // if (data.ctrlEnter === undefined) {
      //   document.getElementById("ctrl-enter").checked = false;
      // } else {
      //   document.getElementById("ctrl-enter").checked = data.ctrlEnter;
      // }

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
    }
  );
});

// 設定保存
document.querySelector("form").addEventListener("submit", (e) => {
  e.preventDefault();

  // TODO: 2025-06-19 PerplexityのUIに変更が加わっている最中なので様子見
  // // Markdownエディターライクな操作設定
  // const markdownEditorLike = document.getElementById(
  //   "markdown-editor-like"
  // ).checked;
  // chrome.storage.local.set({ markdownEditorLike });

  // // 送信を Ctrl+Enter にする設定
  // const ctrlEnter = document.getElementById("ctrl-enter").checked;
  // chrome.storage.local.set({ ctrlEnter });

  // 検索オプションの設定
  const searchOption = document.getElementById(
    "shortcut-search-options"
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

  // 過去に利用していた設定の削除
  chrome.storage.local.remove("fixInputLag"); // テキストボックス入力時のラグを修正する（実験的機能）

  // 設定完了メッセージを表示
  document.getElementById("confirmation-message").style.display = "block";
});

// 変更されたら設定完了メッセージを非表示にする
document.addEventListener("change", () => {
  document.getElementById("confirmation-message").style.display = "none";
});
