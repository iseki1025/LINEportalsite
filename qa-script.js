document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('qa-search-input');
    const resultsContainer = document.getElementById('qa-results-container');
    let qaData = [];

    // 初期メッセージを表示する関数
    function showInitialMessage() {
        resultsContainer.innerHTML = '<p class="qa-initial-message">検索したい文字を上の枠に入力してください</p>';
    }

    // ひらがなをカタカナに変換する関数
    function hiraToKata(str) {
        return str.replace(/[\u3041-\u3096]/g, function(match) {
            return String.fromCharCode(match.charCodeAt(0) + 0x60);
        });
    }

    // カタカナをひらがなに変換する関数
    function kataToHira(str) {
        return str.replace(/[\u30a1-\u30f6]/g, function(match) {
            return String.fromCharCode(match.charCodeAt(0) - 0x60);
        });
    }

    // テキストを正規化する関数（ひらがなとカタカナを両方考慮）
    function normalizeText(text) {
        if (!text) return '';
        const hira = kataToHira(text.toLowerCase());
        const kata = hiraToKata(text.toLowerCase());
        return { hira, kata, original: text.toLowerCase() };
    }

    // CSVファイルを読み込んで解析する関数
    function loadQAData() {
        const csvFilePath = `files/qa-data.csv?t=${new Date().getTime()}`;

        Papa.parse(csvFilePath, {
            download: true,
            header: true, // ヘッダー行を自動で認識させる
            skipEmptyLines: true,

            transformHeader: (header) => {
                return header.trim();
            },

            complete: (results) => {
                const questionHeader = 'Question';
                const answerHeader = 'Answer';

                if (!results.meta.fields.includes(questionHeader) || !results.meta.fields.includes(answerHeader)) {
                    resultsContainer.innerHTML = `<p class="qa-no-result">エラー: CSVのヘッダーに「${questionHeader}」または「${answerHeader}」の列が見つかりません。見つかったヘッダー: ${results.meta.fields.join(', ')}</p>`;
                    console.error("必要なヘッダーが見つかりません:", results.meta.fields);
                    return;
                }

                qaData = results.data.map(row => {
                    const questionText = row[questionHeader] ? row[questionHeader].trim() : '';
                    const answerText = row[answerHeader] ? row[answerHeader].trim() : '';
                    return {
                        question: questionText,
                        answer: answerText,
                        // 検索用に正規化したテキストも保持
                        normalizedQuestion: normalizeText(questionText),
                        normalizedAnswer: normalizeText(answerText)
                    };
                }).filter(item => item.question && item.answer);

                showInitialMessage();
            },
            error: (err, file) => {
                resultsContainer.innerHTML = '<p class="qa-no-result">エラー: Q&Aデータの読み込みに失敗しました。<br>filesフォルダ内にqa-data.csvが正しく設置されているか確認してください。</p>';
                console.error('CSV Parse Error:', err, file);
            }
        });
    }

    // 検索結果を表示する関数
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
        const query = e.target.value.toLowerCase().trim();
        
        if (!query) {
            showInitialMessage();
            return;
        }

        // 検索クエリをスペースで分割し、それぞれのキーワードを正規化
        const searchKeywords = query.split(/\s+/) // 1つ以上のスペースで分割
                                    .filter(keyword => keyword) // 空のキーワードを除外
                                    .map(keyword => ({
                                        hira: kataToHira(keyword),
                                        kata: hiraToKata(keyword),
                                        original: keyword
                                    }));

        const filteredData = qaData.filter(item => {
            // すべてのキーワードが質問または回答に含まれているかチェック
            return searchKeywords.every(keyword => {
                const questionMatch = (
                    item.normalizedQuestion.hira.includes(keyword.hira) ||
                    item.normalizedQuestion.kata.includes(keyword.kata) ||
                    item.normalizedQuestion.original.includes(keyword.original)
                );
                const answerMatch = (
                    item.normalizedAnswer.hira.includes(keyword.hira) ||
                    item.normalizedAnswer.kata.includes(keyword.kata) ||
                    item.normalizedAnswer.original.includes(keyword.original)
                );
                return questionMatch || answerMatch;
            });
        });
        displayResults(filteredData);
    });

    // ページが読み込まれたら、CSVデータの読み込みを開始する
    loadQAData();
});