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
        if (!str) return ''; // nullやundefined対策
        return str.replace(/[\u3041-\u3096]/g, function(match) {
            return String.fromCharCode(match.charCodeAt(0) + 0x60);
        });
    }

    // カタカナをひらがなに変換する関数
    function kataToHira(str) {
        if (!str) return ''; // nullやundefined対策
        return str.replace(/[\u30a1-\u30f6]/g, function(match) {
            return String.fromCharCode(match.charCodeAt(0) - 0x60);
        });
    }

    // テキストを正規化する関数（ひらがな、カタカナ、オリジナル小文字）
    function normalizeText(text) {
        if (!text) return { hira: '', kata: '', original: '' }; // nullやundefined対策
        const lowerText = text.toLowerCase();
        return {
            hira: kataToHira(lowerText),
            kata: hiraToKata(lowerText),
            original: lowerText
        };
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
                    const questionText = row[questionHeader] ? String(row[questionHeader]).trim() : ''; // String()で確実に文字列に
                    const answerText = row[answerHeader] ? String(row[answerHeader]).trim() : '';     // String()で確実に文字列に
                    return {
                        question: questionText,
                        answer: answerText,
                        normalizedQuestion: normalizeText(questionText),
                        normalizedAnswer: normalizeText(answerText)
                    };
                }).filter(item => item.question && item.answer); // 質問と回答が両方あるもののみをフィルタ

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
                                    .map(keyword => normalizeText(keyword)); // 各キーワードを正規化

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