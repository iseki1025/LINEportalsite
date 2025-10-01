document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('qa-search-input');
    const resultsContainer = document.getElementById('qa-results-container');
    let qaData = [];
    let tokenizer; // kuromojiのtokenizerを保持する変数

    // 初期メッセージを表示
    showInitialMessage();
    resultsContainer.innerHTML = '<p class="qa-initial-message">検索エンジンの準備をしています...</p>';

    // --- kuromoji.jsの初期化 ---
    kuromoji.builder({ dicPath: "https://cdn.jsdelivr.net/npm/kuromoji@0.1.2/dict/" }).build((err, builtTokenizer) => {
        if (err) {
            console.error("Kuromoji.jsの初期化に失敗しました:", err);
            resultsContainer.innerHTML = '<p class="qa-no-result">エラー: 検索エンジンの準備に失敗しました。ページを再読み込みしてください。</p>';
            return;
        }
        tokenizer = builtTokenizer;
        // 初期化が完了したらCSVを読み込む
        loadQAData();
    });

    // 初期メッセージを表示する関数
    function showInitialMessage() {
        resultsContainer.innerHTML = '<p class="qa-initial-message">検索したい文字を上の枠に入力してください</p>';
    }

    // ひらがなをカタカナに変換
    function hiraToKata(str) {
        if (!str) return '';
        return str.replace(/[\u3041-\u3096]/g, match => String.fromCharCode(match.charCodeAt(0) + 0x60));
    }

    // カタカナをひらがなに変換
    function kataToHira(str) {
        if (!str) return '';
        return str.replace(/[\u30a1-\u30f6]/g, match => String.fromCharCode(match.charCodeAt(0) - 0x60));
    }
    
    // kuromojiを使ってテキストの読みがな（ひらがな）を生成する関数
    function getReading(text) {
        if (!text || !tokenizer) return '';
        const tokens = tokenizer.tokenize(text);
        return tokens.map(token => {
            // readingはカタカナで返るのでひらがな化する。読みがない場合は単語そのものをひらがな化
            return token.reading ? kataToHira(token.reading) : kataToHira(token.surface_form);
        }).join('');
    }

    // テキストを正規化する関数
    function normalizeText(text) {
        if (!text) return { hira: '', kata: '', original: '', reading: '' };
        const lowerText = text.toLowerCase();
        return {
            hira: kataToHira(lowerText),
            kata: hiraToKata(lowerText),
            original: lowerText,
            reading: getReading(text) // 読みがなを生成して追加
        };
    }

    // CSVファイルを読み込んで解析する関数
    function loadQAData() {
        const csvFilePath = `files/qa-data.csv?t=${new Date().getTime()}`;

        Papa.parse(csvFilePath, {
            download: true,
            header: true,
            skipEmptyLines: true,
            transformHeader: header => header.trim(),
            complete: (results) => {
                const questionHeader = 'Question';
                const answerHeader = 'Answer';

                if (!results.meta.fields.includes(questionHeader) || !results.meta.fields.includes(answerHeader)) {
                    resultsContainer.innerHTML = `<p class="qa-no-result">エラー: CSVのヘッダーに「${questionHeader}」または「${answerHeader}」の列が見つかりません。</p>`;
                    return;
                }

                qaData = results.data.map(row => {
                    const questionText = String(row[questionHeader] || '').trim();
                    const answerText = String(row[answerHeader] || '').trim();
                    return {
                        question: questionText,
                        answer: answerText,
                        // 検索用に、あらかじめ読みがなを含めて正規化しておく
                        normalizedQuestion: normalizeText(questionText),
                        normalizedAnswer: normalizeText(answerText)
                    };
                }).filter(item => item.question && item.answer);

                showInitialMessage(); // 準備が完了したので初期メッセージに戻す
            },
            error: (err) => {
                resultsContainer.innerHTML = '<p class="qa-no-result">エラー: Q&Aデータの読み込みに失敗しました。</p>';
                console.error('CSV Parse Error:', err);
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

    // 検索ボックスに入力があった時のイベント
    searchInput.addEventListener('input', (e) => {
        if (!tokenizer) return; // kuromojiが準備できていなければ何もしない

        const query = e.target.value.trim();
        
        if (!query) {
            showInitialMessage();
            return;
        }

        // 検索キーワードをひらがな化して配列にする
        const searchKeywords = query.split(/\s+/)
                                    .filter(keyword => keyword)
                                    .map(keyword => kataToHira(keyword.toLowerCase()));

        const filteredData = qaData.filter(item => {
            // すべてのキーワードがヒットするかどうかをチェック
            return searchKeywords.every(keyword => {
                // 質問文に対して、[元のテキストのひらがな化] or [読みがな] のいずれかにヒットするか
                const questionMatch = item.normalizedQuestion.hira.includes(keyword) || 
                                      item.normalizedQuestion.reading.includes(keyword);
                
                // 回答文に対して、[元のテキストのひらがな化] or [読みがな] のいずれかにヒットするか
                const answerMatch = item.normalizedAnswer.hira.includes(keyword) || 
                                    item.normalizedAnswer.reading.includes(keyword);
                
                return questionMatch || answerMatch;
            });
        });
        displayResults(filteredData);
    });
});