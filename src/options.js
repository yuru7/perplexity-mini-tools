// 設定読み込み
document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get(
    [
      "markdownEditorLike",
      "ctrlEnter",
      "searchOption",
      "navigation",
      "simpleCopy",
      "fixInputLag",
      "mermaidEnabled",
      "mermaidTheme",
    ],
    (data) => {
      // Markdownエディターライクな操作設定
      if (data.markdownEditorLike === undefined) {
        document.getElementById("markdown-editor-like").checked = true;
      } else {
        document.getElementById("markdown-editor-like").checked =
          data.markdownEditorLike;
      }

      // 送信を Ctrl+Enter にする設定
      if (data.ctrlEnter === undefined) {
        document.getElementById("ctrl-enter").checked = false;
      } else {
        document.getElementById("ctrl-enter").checked = data.ctrlEnter;
      }

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

      // テキストボックス入力時のラグを修正する（実験的機能）
      if (data.fixInputLag === undefined) {
        document.getElementById("fix-input-lag").checked = false;
      } else {
        document.getElementById("fix-input-lag").checked = data.fixInputLag;
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
    }
  );
});

// 設定保存
document.querySelector("form").addEventListener("submit", (e) => {
  e.preventDefault();

  // Markdownエディターライクな操作設定
  const markdownEditorLike = document.getElementById(
    "markdown-editor-like"
  ).checked;
  chrome.storage.local.set({ markdownEditorLike });

  // 送信を Ctrl+Enter にする設定
  const ctrlEnter = document.getElementById("ctrl-enter").checked;
  chrome.storage.local.set({ ctrlEnter });

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

  // テキストボックス入力時のラグを修正する（実験的機能）
  const fixInputLag = document.getElementById("fix-input-lag").checked;
  chrome.storage.local.set({ fixInputLag });

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

  // 設定完了メッセージを表示
  document.getElementById("confirmation-message").style.display = "block";
});

// 変更されたら設定完了メッセージを非表示にする
document.addEventListener("change", () => {
  document.getElementById("confirmation-message").style.display = "none";
});
