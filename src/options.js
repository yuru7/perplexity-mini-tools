// 設定読み込み
document.addEventListener('DOMContentLoaded', () => {
    // Markdownエディターライクな操作設定
    chrome.storage.local.get('markdownEditorLike', (data) => {
        if (data.markdownEditorLike === undefined) {
            document.getElementById('markdown-editor-like').checked = true;
            return;
        }
        document.getElementById('markdown-editor-like').checked = data.markdownEditorLike;
    });
    // 検索オプションの設定
    chrome.storage.local.get('searchOption', (data) => {
        if (data.searchOption === undefined) {
            document.getElementById('shortcut-search-options').checked = true;
            return;
        }
        document.getElementById('shortcut-search-options').checked = data.searchOption || false;
    });
    // Mermaidプレビュー 有効状態
    chrome.storage.local.get('mermaidEnabled', (data) => {
        if (data.mermaidEnabled === undefined) {
            document.getElementById('mermaid-enabled').checked = true;
            return;
        }
        document.getElementById('mermaid-enabled').checked = data.mermaidEnabled;
    });
    // Mermaidのテーマ設定
    chrome.storage.local.get('mermaidTheme', (data) => {
        document.getElementById('mermaid-theme').value = data.mermaidTheme || "auto";
    });
});

// 設定保存
document.querySelector('form').addEventListener('submit', (e) => {
    e.preventDefault();

    // Markdownエディターライクな操作設定
    const markdownEditorLike = document.getElementById('markdown-editor-like').checked;
    chrome.storage.local.set({ markdownEditorLike });

    // 検索オプションの設定
    const searchOption = document.getElementById('shortcut-search-options').checked;
    chrome.storage.local.set({ searchOption });

    // Mermaidプレビュー 有効状態
    const mermaidEnabled = document.getElementById('mermaid-enabled').checked;
    chrome.storage.local.set({ mermaidEnabled });

    // Mermaidのテーマ設定
    const mermaidTheme = document.getElementById('mermaid-theme').value;
    if (mermaidTheme === 'auto') {
        chrome.storage.local.remove('mermaidTheme');
    } else {
        chrome.storage.local.set({ mermaidTheme });
    }

    // 設定完了メッセージを表示
    document.getElementById('confirmation-message').style.display = 'block';
});

// 変更されたら設定完了メッセージを非表示にする
document.addEventListener('change', () => {
    document.getElementById('confirmation-message').style.display = 'none';
});
