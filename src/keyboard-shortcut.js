(async () => {
    const QUICK_SEARCH_MODAL_SELECTOR = 'div[data-testid="quick-search-modal"] button';
    const MAIN_SEARCH_BOX_MODEL_SELECT_SELECTOR = 'div.gap-sm.flex > span:nth-child(1) > button';
    const MODEL_SELECT_AREA_OUTER_SELECTOR = 'div[data-placement]';
    const MODEL_SELECT_AREA_SELECTOR = `${MODEL_SELECT_AREA_OUTER_SELECTOR} div[data-radix-scroll-area-viewport]`;
    const MODEL_SELECT_AREA_ITEM_SELECTOR = "div.group\\/item";
    const MODEL_SELECT_AREA_ITEM_CHECKED_SELECTOR = "div.pr.super";
    const MODEL_SELECT_AREA_ITEM_TARGET_SELECTOR = "div.group\\/item:nth-child(<N>)";

    const MAIN_SEARCH_BOX_SEARCH_SOURCE_SELECTOR = 'div.gap-sm.flex > span:nth-child(2) > button';
    const SEARCH_SOURCE_AREA_OUTER_SELECTOR = MODEL_SELECT_AREA_OUTER_SELECTOR;
    const SEARCH_SOURCE_AREA_SELECTOR = `${SEARCH_SOURCE_AREA_OUTER_SELECTOR} div[data-radix-scroll-area-viewport]`;
    const SEARCH_SOURCE_AREA_ITEM_SELECTOR = MODEL_SELECT_AREA_ITEM_SELECTOR

    const UP = 0;
    const DOWN = 1;

    async function initConfig() {
        // 設定読み込み
        const config = {};
        return new Promise((resolve) => {
            chrome.storage.local.get(['markdownEditorLike', 'searchOption'], (data) => {
                if (data.markdownEditorLike === undefined) {
                    config.markdownEditorLike = true;
                } else {
                    config.markdownEditorLike = data.markdownEditorLike;
                }

                if (data.searchOption === undefined) {
                    config.searchOption = true;
                } else {
                    config.searchOption = data.searchOption;
                }

                resolve(config);
            });
        });
    }
    const config = await initConfig();

    function searchOptionHandler(event) {
        if (event.isComposing) {
            return;
        }
        if (ctrlOrMetaKey(event) && event.code === 'ArrowUp') {
            event.preventDefault();
            event.stopImmediatePropagation();
            selectModel(UP);
        }
        if (ctrlOrMetaKey(event) && event.code === 'ArrowDown') {
            event.preventDefault();
            event.stopImmediatePropagation();
            selectModel(DOWN);
        }
        if (ctrlOrMetaKey(event) && event.shiftKey && event.code === "Period") {
            event.preventDefault();
            event.stopImmediatePropagation();
            toggleWebInSearchSource();
        }
    }

    function ctrlOrMetaKey(event) {
        return event.ctrlKey || event.metaKey;
    }

    function focusScrollableContainerHandler(event) {
        if (event.isComposing) {
            return;
        }
        if (event.code === 'Escape') {
            event.stopImmediatePropagation();
            const scrollTarget = document.querySelector("textarea").closest(".scrollable-container")
            if (scrollTarget) {
                scrollTarget.style.outline = "none";
                scrollTarget.focus();
            }
        }
    }

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    async function selectModel(upOrDown) {
        let button = document.querySelector(QUICK_SEARCH_MODAL_SELECTOR);
        if (!button) {
            // textareの2つ上のdivを取得して、その下から検索する
            const mainSearchBox = document.querySelector("main textarea");
            if (mainSearchBox) {
                button = mainSearchBox.parentElement.parentElement.querySelector(MAIN_SEARCH_BOX_MODEL_SELECT_SELECTOR);
            }
        }
        let modelSelectBox = document.querySelector(MODEL_SELECT_AREA_SELECTOR);

        if (button && !modelSelectBox) {
            // ボタンをクリックしてポップアップを表示してからモデルを切り替える
            try {
                // ポップアップがちらつくのでいったん非表示にするCSSを適用
                toggleDisplay(MODEL_SELECT_AREA_OUTER_SELECTOR);
                button.click();
                await sleep(50);
                clickModel(upOrDown);
            } finally {
                // ポップアップ非表示CSSを削除
                toggleDisplay()
            }

        } else if (modelSelectBox) {
            clickModel(upOrDown);
        } else {
            console.error('element not found');
        }
    }

    function clickModel(upOrDown) {
        const modelSelectBox = document.querySelector(MODEL_SELECT_AREA_SELECTOR);
        if (!modelSelectBox) {
            return;
        }
        // 何番目の子要素にチェックが入っているかを調べる
        // チェック位置は子孫にある div.pr.super で判定
        let checkedIndex = -1;
        let modelSelectBoxChildren = modelSelectBox.querySelectorAll(MODEL_SELECT_AREA_ITEM_SELECTOR);
        for (let i = 0; i < modelSelectBoxChildren.length; i++) {
            if (modelSelectBoxChildren[i].querySelector(MODEL_SELECT_AREA_ITEM_CHECKED_SELECTOR)) {
                checkedIndex = i;
                break;
            }
        }
        let add = upOrDown === UP ? 0 : 2;
        // 先頭・末尾に到達した場合はループする
        if (upOrDown === UP && checkedIndex === 0) {
            checkedIndex = modelSelectBoxChildren.length;
            add = 0;
        } else if (upOrDown === DOWN && checkedIndex === modelSelectBoxChildren.length - 1) {
            checkedIndex = 1;
            add = 0;
        }
        // 前後の要素をクリックする
        const targetItem = modelSelectBox.querySelector(MODEL_SELECT_AREA_ITEM_TARGET_SELECTOR.replace('<N>', checkedIndex + add));
        if (targetItem) {
            targetItem.click();
        }
    }

    function toggleDisplay(selector = null) {
        const isStyleNotExists = document.getElementById("hidden-style") ? false : true;
        if (selector && isStyleNotExists) {
            const style = document.createElement('style');
            style.textContent = `
            ${selector} {
                display: none;
            }`;
            style.id = "hidden-style";
            document.head.appendChild(style);
        } else {
            const style = document.getElementById("hidden-style");
            style.remove();
        }
    }

    async function toggleWebInSearchSource() {
        // textareの2つ上のdivを取得して、その下から検索する
        const mainSearchBox = document.querySelector("main textarea");
        if (!mainSearchBox) {
            return;
        }
        try {
            // ポップアップがちらつくのでいったん非表示にするCSSを適用
            toggleDisplay(SEARCH_SOURCE_AREA_OUTER_SELECTOR);

            const searchSourceButton = mainSearchBox.parentElement.parentElement.querySelector(MAIN_SEARCH_BOX_SEARCH_SOURCE_SELECTOR);
            if (searchSourceButton) {
                searchSourceButton.click();
            }
            await sleep(50);
            const getSearchSourceBoxChildren = () => {
                const searchSourceBox = document.querySelector(SEARCH_SOURCE_AREA_SELECTOR);
                if (!searchSourceBox) {
                    return;
                }
                const searchSourceBoxChildren = searchSourceBox.querySelectorAll(SEARCH_SOURCE_AREA_ITEM_SELECTOR);
                if (searchSourceBoxChildren.length === 0) {
                    return;
                }
                return searchSourceBoxChildren;
            }
            let searchSourceBoxChildren = getSearchSourceBoxChildren();
            const webButton = searchSourceBoxChildren[0].querySelector('button');
            if (!webButton) {
                return;
            }
            webButton.click();

            // ポップアップを閉じる
            mainSearchBox.focus();
        } finally {
            // ポップアップ非表示CSSを削除
            toggleDisplay()
        }
    }

    class MDTextarea {
        static ORDERED_LIST_PATTERN = /^([\s　]*)(\d+)\.\s/;
        static UNORDERED_LIST_PATTERN = /^([\s　]*)(・|[-*+]\s)/;
        static INDENT_PATTERN = /^[\s　]+/
        static OUTDENT_INDENT_PATTERN = /^(\t|　| {1,4})/;

        static CTRL_KEY = 'ctrl';
        static SHIFT_KEY = 'shift';
        static ALT_KEY = 'alt';

        constructor(textarea, modifierKeys = [], removeOriginalEventListener = false) {
            this.textarea = textarea;
            this.indentStr = '    ';
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
                newElement.dataset.mdTextarea = 'true';
                this.textarea.replaceWith(newElement);
                this.textarea = newElement;
                newElement.addEventListener('keydown', this.boundKeydownHandler, true);
            } else {
                this.textarea.dataset.mdTextarea = 'true';
                this.textarea.addEventListener('keydown', this.boundKeydownHandler, true);
            }

            this.lineHeight = this.getLineHeight();
        }

        disable() {
            this.textarea.removeEventListener('keydown', this.boundKeydownHandler);
        }

        keydownHandler(e) {
            // 変換中操作では発動させない
            if (event.isComposing) {
                return;
            }

            if (this.modifierKeys.length === 0) {
                if (e.key === 'Enter' && ctrlOrMetaKey(e) && !e.shiftKey && !e.altKey) {
                    e.preventDefault();
                    e.target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
                    return;
                }
                if (e.key === 'Enter' && (ctrlOrMetaKey(e) || e.shiftKey || e.altKey)) {
                    return;
                }
            }
            if (this.modifierKeys.length > 0 && e.key === 'Enter' && !ctrlOrMetaKey(e) && !e.shiftKey && !e.altKey) {
                return;
            }

            this.currentPos = this.textarea.selectionStart;

            if (e.key === 'Enter') {
                // 所定の修飾キーが押されていない場合は何もしない
                if (!this.modifierKeys.every(modifierKey => {
                    switch (modifierKey) {
                        case MDTextarea.CTRL_KEY:
                            if (!ctrlOrMetaKey(e)) {
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
                })) {
                    return;
                }

                e.preventDefault();
                e.stopImmediatePropagation()
                const currentLine = this.getLine(this.textarea.selectionStart);
                const currentPosInLine = this.currentPos - this.getStartOfLine(this.currentPos);

                // 番号付きリストの場合
                if (MDTextarea.ORDERED_LIST_PATTERN.test(currentLine)) {
                    const orderedListSymbol = currentLine.match(MDTextarea.ORDERED_LIST_PATTERN);
                    if (currentPosInLine < orderedListSymbol[0].length) {
                        // リスト記号より前の位置にカーソルがある場合、通常の改行を行う
                        this.inputPrefix("\n");
                    } else if (new RegExp(MDTextarea.ORDERED_LIST_PATTERN.source + "\\s*$").test(currentLine)) {
                        // 記号だけの行の場合、先頭の数字を削除
                        this.removePrefix(currentLine);
                    } else {
                        // 次の数字を挿入
                        const nextNumStr = `${orderedListSymbol[1]}${parseInt(orderedListSymbol[2]) + 1}. `
                        this.inputPrefix("\n" + nextNumStr);
                        // 次行以降の番号を振り直す
                        this.autoNumbering(this.textarea.selectionStart);
                    }
                    return;
                }

                // 箇条書きリストの場合
                if (MDTextarea.UNORDERED_LIST_PATTERN.test(currentLine)) {
                    const unorderedListSymbol = currentLine.match(MDTextarea.UNORDERED_LIST_PATTERN);
                    if (currentPosInLine < unorderedListSymbol[0].length) {
                        // リスト記号より前の位置にカーソルがある場合、通常の改行を行う
                        this.inputPrefix("\n");
                    } else if (new RegExp(MDTextarea.UNORDERED_LIST_PATTERN.source + "\\s*$").test(currentLine)) {
                        // 記号だけの行の場合、先頭の記号を削除
                        this.removePrefix(currentLine);
                    } else {
                        // 次の記号を挿入
                        const nextSymbol = `${unorderedListSymbol[1]}${unorderedListSymbol[2]}`
                        this.inputPrefix("\n" + nextSymbol);
                    }
                    return;
                }

                // インデントがある場合
                const indentMatch = currentLine.match(MDTextarea.INDENT_PATTERN);
                if (indentMatch) {
                    this.inputPrefix("\n" + indentMatch[0]);
                    return;
                }

                this.inputPrefix("\n");
            } else if (e.key === 'Tab' && e.shiftKey) {
                // インデントを削除
                e.stopImmediatePropagation()
                e.preventDefault();
                this.outdent(this.getLine(this.textarea.selectionStart));
            } else if (e.key === 'Tab') {
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
            return this.textarea.value.slice(0, index).split('\n').length;
        }

        getLine(index) {
            return this.textarea.value.split('\n')[this.getLineNum(index) - 1];
        }

        getLines() {
            return this.textarea.value.split('\n');
        }

        getStartOfLine(index) {
            let start = index;
            while (start > 0 && this.textarea.value[start - 1] !== '\n') {
                start--;
            }
            return start;
        }

        getEndOfLine(index) {
            let end = index;
            while (end < this.textarea.value.length && this.textarea.value[end] !== '\n') {
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
                indent: (this.getLine(index).match(MDTextarea.INDENT_PATTERN) || [""])[0]
            }

            // 現在行が番号付きリストではない場合、何もしない
            const currentOrderdNumMatch = current.line.match(MDTextarea.ORDERED_LIST_PATTERN);
            if (!currentOrderdNumMatch) {
                return;
            }

            const numberingStart = this.getEndOfLine(current.pos) + 1;
            let numberingEnd = numberingStart;
            for (let i = current.lineNum; i < lines.length; i++) {
                if (i - current.lineNum > 100) {
                    break;
                }
                const iIndentLength = (lines[i].match(MDTextarea.INDENT_PATTERN) || [""])[0].length;
                const iOrderdNumMatch = lines[i].match(MDTextarea.ORDERED_LIST_PATTERN);
                if (!(iIndentLength === current.indent.length && iOrderdNumMatch)) {
                    break;
                }

                numberingEnd += lines[i].length + 1;
            }

            if (numberingStart === numberingEnd) {
                return;
            }

            const linesToNumbering = this.textarea.value.slice(numberingStart, numberingEnd).split('\n');
            let orderedNum = parseInt(currentOrderdNumMatch[2]) + 1;
            for (let i = 0; i < linesToNumbering.length; i++) {
                linesToNumbering[i] = linesToNumbering[i].replace(MDTextarea.ORDERED_LIST_PATTERN, `${current.indent}${orderedNum}. `);
                orderedNum++;
            }
            this.textarea.setSelectionRange(numberingStart, numberingEnd);
            document.execCommand('insertText', false, linesToNumbering.join('\n'));
            this.textarea.selectionStart = this.textarea.selectionEnd = current.pos;
        }

        getNextOrderedNumber(index, targetIndent) {
            // 次の数字を取得
            let nextNum = 1;
            const lineNumIndex = this.getLineNum(index) - 1;
            const lines = this.getLines();
            for (let i = lineNumIndex - 1; i >= 0; i--) {
                if (new RegExp(`^${targetIndent}[\\d]+\\. `).test(lines[i])) {
                    nextNum = parseInt(lines[i].match(MDTextarea.ORDERED_LIST_PATTERN)[2]) + 1;
                    break;
                }
                // 現在行よりインデントが浅い行に到達したら終了
                const iIndentLength = (lines[i].match(MDTextarea.INDENT_PATTERN) || [""])[0].length;
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
            document.execCommand('insertText', false, prefix);
            this.scrollToCursor();
        }

        removePrefix(line) {

            const insertText = line;
            if (MDTextarea.OUTDENT_INDENT_PATTERN.test(insertText)) {
                // インデントがある場合、インデントを削除
                this.outdent(line);
            } else {
                this.textarea.setSelectionRange(this.currentPos - line.length, this.currentPos);
                document.execCommand('delete');
            }

            this.scrollToCursor();
        }

        indent(line) {
            // 選択範囲がある場合は選択範囲をインデントする
            const isSelectionNotEmpty = this.textarea.selectionStart !== this.textarea.selectionEnd;
            if (isSelectionNotEmpty) {
                const selectStart = this.getStartOfLine(this.textarea.selectionStart);
                const selectEnd = this.getEndOfLine(this.textarea.selectionEnd);
                const selectText = this.textarea.value.substring(selectStart, selectEnd);
                const selectLines = selectText.split('\n');
                for (let i = 0; i < selectLines.length; i++) {
                    selectLines[i] = this.indentStr + selectLines[i];
                }
                this.textarea.setSelectionRange(selectStart, selectEnd);
                document.execCommand('insertText', false, selectLines.join('\n'));
                this.textarea.setSelectionRange(selectStart, this.textarea.selectionStart);
                return;
            }

            const start = this.getStartOfLine(this.currentPos);
            if (MDTextarea.ORDERED_LIST_PATTERN.test(line)) {
                // 番号付きリストの場合、数字をリセットする
                const orderedListSymbol = line.match(MDTextarea.ORDERED_LIST_PATTERN)[0];
                const nextIndent = this.indentStr + (line.match(MDTextarea.INDENT_PATTERN) || [""])[0]
                const nextNum = this.getNextOrderedNumber(start, nextIndent);
                const nextNumStr = `${nextIndent}${nextNum}. `
                this.textarea.setSelectionRange(start, start + orderedListSymbol.length);
                document.execCommand('insertText', false, nextNumStr);
                const lengthDiff = nextNumStr.length - orderedListSymbol.length;
                this.textarea.selectionStart = this.textarea.selectionEnd = this.currentPos + lengthDiff;
                // 次行以降の番号を振り直す
                this.autoNumbering(this.textarea.selectionStart);
            } else {
                this.textarea.selectionStart = this.textarea.selectionEnd = start;
                document.execCommand('insertText', false, this.indentStr);
                this.textarea.selectionStart = this.textarea.selectionEnd = this.currentPos + this.indentStr.length;
            }


            this.scrollToCursor();
        }

        outdent(line) {
            // 選択範囲がある場合は選択範囲をアウトデントする
            const isSelectionNotEmpty = this.textarea.selectionStart !== this.textarea.selectionEnd;
            if (isSelectionNotEmpty) {
                console.log(this.textarea.selectionStart, this.textarea.selectionEnd);
                const selectStart = this.getStartOfLine(this.textarea.selectionStart);
                const selectEnd = this.getEndOfLine(this.textarea.selectionEnd);
                const selectText = this.textarea.value.substring(selectStart, selectEnd);
                const selectLines = selectText.split('\n');
                for (let i = 0; i < selectLines.length; i++) {
                    selectLines[i] = selectLines[i].replace(MDTextarea.OUTDENT_INDENT_PATTERN, '');
                }
                this.textarea.setSelectionRange(selectStart, selectEnd);
                document.execCommand('insertText', false, selectLines.join('\n'));
                this.textarea.setSelectionRange(selectStart, this.textarea.selectionStart);
                return;
            }

            if (!MDTextarea.OUTDENT_INDENT_PATTERN.test(line)) {
                return;
            }

            const isOrderedListItem = MDTextarea.ORDERED_LIST_PATTERN.test(line);
            if (isOrderedListItem) {
                // 番号付きリストの場合、数字をリセットする
                const start = this.getStartOfLine(this.currentPos);
                const end = start + line.match(MDTextarea.ORDERED_LIST_PATTERN)[0].length;
                this.textarea.setSelectionRange(start, end);
                const nextIndent = (line.match(MDTextarea.INDENT_PATTERN) || [""])[0].replace(MDTextarea.OUTDENT_INDENT_PATTERN, '');
                const nextNum = this.getNextOrderedNumber(start, nextIndent);
                const outdentPrefix = `${nextIndent}${nextNum}. `
                document.execCommand('insertText', false, outdentPrefix);
                const lengthDiff = outdentPrefix.match(MDTextarea.ORDERED_LIST_PATTERN)[2].length - line.match(MDTextarea.ORDERED_LIST_PATTERN)[2].length;
                this.textarea.selectionStart = this.textarea.selectionEnd = this.currentPos - line.match(MDTextarea.OUTDENT_INDENT_PATTERN)[0].length + lengthDiff;
                // 次行以降の番号を振り直す
                this.autoNumbering(this.textarea.selectionStart);
            } else {
                // 行頭・行末位置を取得する
                const indentLength = line.match(MDTextarea.OUTDENT_INDENT_PATTERN)[0].length;
                const start = this.getStartOfLine(this.currentPos);
                const end = start + indentLength;

                this.textarea.setSelectionRange(start, end);
                document.execCommand('delete');

                if (this.textarea.selectionStart < this.currentPos - indentLength) {
                    this.textarea.selectionStart = this.textarea.selectionEnd = this.currentPos - indentLength;
                }
            }

            this.scrollToCursor();
        }

        // カーソル位置がテキストエリア内に収まっていない場合、スクロールする
        scrollToCursor() {
            const cursorPosition = this.textarea.selectionStart;
            const textBeforeCursor = this.textarea.value.substring(0, cursorPosition);
            const linesBeforeCursor = textBeforeCursor.split('\n').length;

            const scrollTop = this.textarea.scrollTop;
            const scrollBottom = scrollTop + this.textarea.clientHeight;
            const targetScrollTop = (linesBeforeCursor - 1) * this.lineHeight;

            if (targetScrollTop < scrollTop) {
                this.textarea.scrollTop = targetScrollTop;
            }
            if (targetScrollTop + this.lineHeight > scrollBottom) {
                this.textarea.scrollTop = targetScrollTop - this.textarea.clientHeight + this.lineHeight;
            }
        }

        getLineHeight() {
            let lineHeight = parseInt(window.getComputedStyle(this.textarea).lineHeight);

            // "normal" など数値で返ってこなかった場合は数値に変換
            if (isNaN(lineHeight)) {
                const lineHeightStr = window.getComputedStyle(this.textarea).lineHeight;
                const tmpElement = document.createElement('div');
                tmpElement.style.height = lineHeightStr;
                tmpElement.style.visibility = 'hidden';
                tmpElement.textContent = 'X';
                document.body.appendChild(tmpElement);
                lineHeight = tmpElement.clientHeight;
                document.body.removeChild(tmpElement);
            }

            return lineHeight;
        }
    }

    function setTextareaEventListeners(textarea) {
        textarea.addEventListener('keydown', (event) => {
            focusScrollableContainerHandler(event);
        });

        const mdTextarea = new MDTextarea(textarea, [MDTextarea.SHIFT_KEY], false);
        mdTextarea.enable();
    }

    // ---------- Main ----------

    // ページ全体へのイベントリスナーを追加
    if (config.searchOption) {
        document.addEventListener('keydown', (event) => {
            searchOptionHandler(event);
        }, true);
    }

    // textarea へのイベントリスナーを追加
    if (config.markdownEditorLike) {
        // Markdown編集機能を追加
        // ページ読み込み時と、DOM変更時に対応する
        const textareas = document.querySelectorAll("main textarea");
        textareas.forEach(textarea => {
            setTextareaEventListeners(textarea);
        }, true);

        // DOM変更時の対応する
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const parent = node.parentElement;
                        const textareas = parent.querySelectorAll("textarea:not([data-md-textarea])");
                        textareas.forEach(textarea => {
                            setTextareaEventListeners(textarea);
                        });
                    }
                });
            });
        });
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: false,
            characterData: false
        });
    }
})();
