document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('qa-search-input');
    const resultsContainer = document.getElementById('qa-results-container');
    let qaData = [];
    let tokenizer; // kuromojiのtokenizer

    // --- 初期状態の設定 ---
    searchInput.disabled = true;
    searchInput.placeholder = "検索エンジンの準備中です...";
    showInitialMessage('検索エンジンの準備をしています...');

    // --- kuromoji.jsの初期化 ---
    // ▼▼▼【修正点1】辞書ファイルの場所を完全なURLで指定する ▼▼▼
    kuromoji.builder({ dicPath: "https://cdn.jsdelivr.net/npm/kuromoji@0.1.2/dict/" }).build((err, builtTokenizer) => {
        if (err) {
            console.error("Kuromoji.jsの初期化に失敗しました:", err);
            showInitialMessage('エラー: 検索エンジンの準備に失敗しました。');
            searchInput.placeholder = "検索利用不可";
            return;
        }
        console.log("✅ Kuromoji.jsの準備が完了しました。");
        tokenizer = builtTokenizer;
        // 初期化が完了したらCSVを読み込む
        loadQAData();
    });

    // メッセージを表示する関数
    function showInitialMessage(message = '検索したい文字を上の枠に入力してください') {
        resultsContainer.innerHTML = `<p class="qa-initial-message">${message}</p>`;
    }

    // カタカナをひらがなに変換
    function kataToHira(str) {
        if (!str) return '';
        return str.replace(/[\u30a1-\u30f6]/g, match => String.fromCharCode(match.charCodeAt(0) - 0x60));
    }
    
    // kuromojiを使ってテキストの読みがな（ひらがな）を生成する関数
    function getReading(text) {
        if (!text || !tokenizer) return '';
        try {
            const tokens = tokenizer.tokenize(text);
            return tokens.map(token => {
                return token.reading ? kataToHira(token.reading) : kataToHira(token.surface_form);
            }).join('');
        } catch (e) {
            console.error("読みがなの生成に失敗しました:", text, e);
            return ''; // エラーが発生した場合は空文字を返す
        }
    }

    // テキストを正規化する関数（読みがなを含む）
    function normalizeText(text) {
        if (!text) return { hira: '', reading: '' };
        const lowerText = text.toLowerCase();
        return {
            hira: kataToHira(lowerText), // 元のテキストのひらがな版
            reading: getReading(text)     // 漢字の読みがな
        };
    }

    // CSVファイルを読み込んで解析する関数
    function loadQAData() {
        showInitialMessage('Q&Aデータを読み込んでいます...');
        // ▼▼▼【修正点2】CSVファイル名をリポジトリに合わせて修正 ▼▼▼
        const csvFilePath = `files/qa-data (2).csv?t=${new Date().getTime()}`;

        Papa.parse(csvFilePath, {
            download: true,
            header: true,
            skipEmptyLines: true,
            transformHeader: header => header.trim(),
            complete: (results) => {
                // ファイルが見つからなかった場合のエラーチェック
                if (results.errors.length > 0 && results.data.length === 0) {
                     console.error('CSV Parse Error:', results.errors);
                     showInitialMessage('エラー: Q&Aデータの読み込みに失敗しました。ファイルパスを確認してください。');
                     return;
                }

                const questionHeader = 'Question';
                const answerHeader = 'Answer';

                if (!results.meta.fields.includes(questionHeader) || !results.meta.fields.includes(answerHeader)) {
                    showInitialMessage(`エラー: CSVに「${questionHeader}」または「${answerHeader}」列が見つかりません。`);
                    return;
                }

                qaData = results.data.map(row => {
                    const questionText = String(row[questionHeader] || '').trim();
                    const answerText = String(row[answerHeader] || '').trim();
                    return {
                        question: questionText,
                        answer: answerText,
                        normalizedQuestion: normalizeText(questionText),
                        normalizedAnswer: normalizeText(answerText)
                    };
                }).filter(item => item.question && item.answer);
                
                console.log("✅ Q&Aデータの読み込みと、読みがな解析が完了しました。");
                
                // すべての準備が完了
                searchInput.disabled = false;
                searchInput.placeholder = "検索キーワードを入力";
                showInitialMessage();
            },
            error: (err) => { // 通信エラーなど
                showInitialMessage('エラー: Q&Aデータの読み込みに失敗しました。');
                console.error('CSV Load Error:', err);
            }
        });
    }

    // 検索結果を表示する関数 (変更なし)
    function displayResults(data) {
        resultsContainer.innerHTML = '';
        if (data.length === 0) {
            resultsContainer.innerHTML = '<p class="qa-no-result">該当する質問はありません。</p>';
            return;
        }
        const fragment = document.createDocumentFragment();
        data.forEach(item => {
            const qaItem = document.createElement('div');
            qaItem.className = 'qa-search-item';
            const questionDiv = document.createElement('div');
            questionDiv.className = 'qa-search-question';
            questionDiv.textContent = item.question;
            const answerDiv = document.createElement('div');
            answerDiv.className = 'qa-search-answer';
            answerDiv.innerHTML = item.answer.replace(/\n/g, '<br>');
            qaItem.appendChild(questionDiv);
            qaItem.appendChild(answerDiv);
            fragment.appendChild(qaItem);
            questionDiv.addEventListener('click', () => {
                qaItem.classList.toggle('active');
            });
        });
        resultsContainer.appendChild(fragment);
    }

    // 検索ボックスに入力があった時のイベント (変更なし)
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        
        if (!query) {
            showInitialMessage();
            return;
        }

        const searchKeywords = query.split(/\s+/)
                                    .filter(keyword => keyword)
                                    .map(keyword => kataToHira(keyword.toLowerCase()));

        const filteredData = qaData.filter(item => {
            return searchKeywords.every(keyword => {
                const questionMatch = item.normalizedQuestion.hira.includes(keyword) || 
                                      item.normalizedQuestion.reading.includes(keyword);
                
                const answerMatch = item.normalizedAnswer.hira.includes(keyword) || 
                                    item.normalizedAnswer.reading.includes(keyword);
                
                return questionMatch || answerMatch;
            });
        });
        displayResults(filteredData);
    });
});