document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('qa-search-input');
    const resultsContainer = document.getElementById('qa-results-container');
    let qaData = [];

    // 初期メッセージを表示する関数
    function showInitialMessage() {
        resultsContainer.innerHTML = '<p class="qa-initial-message">検索したい文字を上の枠に入力してください</p>';
    }

// CSVファイルを読み込んで解析する関数
    function loadQAData() {
        const csvFilePath = `files/qa-data.csv?t=${new Date().getTime()}`;

        Papa.parse(csvFilePath, {
            download: true,
            header: true, // ヘッダー行を自動で認識させる
            skipEmptyLines: true,

            // ヘッダーをトリムする処理は維持
            transformHeader: (header, index) => {
                return header.trim();
            },
            // ここが今回の主な修正点: beforeFirstChunkを削除または正しく修正
            // 現在のCSVでは最初の行がヘッダーなので、この処理は不要です
            // もしCSVの先頭に確実にスキップすべき行がある場合は、その行数に合わせて調整
            // 例: もし最初の行と2行目が不要で、3行目からがヘッダーなら lines.splice(0, 2);
            // 今回のCSVではヘッダーが1行目なので、このブロック全体を削除します。
            // beforeFirstChunk: (chunk) => {
            //     const lines = chunk.split('\n');
            //     lines.splice(0, 5); // 最初の5行を削除
            //     return lines.join('\n');
            // },

            complete: (results) => {
                // 'Question'列と'Answer'列を直接指定
                // results.meta.fields には正しいヘッダー名が格納されているはずです。
                const taskHeader = 'Question'; // CSVのヘッダー名と完全に一致させる
                const answerHeader = 'Answer'; // CSVのヘッダー名と完全に一致させる

                if (!results.meta.fields.includes(taskHeader) || !results.meta.fields.includes(answerHeader)) {
                    resultsContainer.innerHTML = `<p class="qa-no-result">エラー: CSVのヘッダーに「${taskHeader}」または「${answerHeader}」の列が見つかりません。見つかったヘッダー: ${results.meta.fields.join(', ')}</p>`;
                    console.error("必要なヘッダーが見つかりません:", results.meta.fields);
                    return;
                }

                qaData = results.data.map(row => ({
                    question: row[taskHeader] ? row[taskHeader].trim() : '',
                    answer: row[answerHeader] ? row[answerHeader].trim() : ''
                })).filter(item => item.question && item.answer);

                showInitialMessage();
            },
            error: (err, file) => {
                resultsContainer.innerHTML = '<p class="qa-no-result">エラー: Q&Aデータの読み込みに失敗しました。<br>filesフォルダ内にqa-data.csvが正しく設置されているか確認してください。</p>';
                console.error('CSV Parse Error:', err, file);
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
        const query = e.target.value.toLowerCase().trim();
        
        if (!query) {
            showInitialMessage();
            return;
        }

        const filteredData = qaData.filter(item => 
            item.question.toLowerCase().includes(query) || 
            item.answer.toLowerCase().includes(query)
        );
        displayResults(filteredData);
    });

    // ページが読み込まれたら、CSVデータの読み込みを開始する
    loadQAData();
});