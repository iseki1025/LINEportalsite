document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('qa-search-input');
    const resultsContainer = document.getElementById('qa-results-container');
    let qaData = [];

    // 初期メッセージを表示する関数
    function showInitialMessage() {
        resultsContainer.innerHTML = '<p class="qa-initial-message">検索したい文字を入力してください</p>';
    }

    // CSVファイルを読み込んで解析する関数
    function loadQAData() {
        const csvFilePath = `files/qa-data.csv?t=${new Date().getTime()}`;

        Papa.parse(csvFilePath, {
            download: true,
            header: true, // ヘッダー行を自動で認識させる
            skipEmptyLines: true,

            // ===== ▼▼▼【重要】ここが今回の修正の核です ▼▼▼ =====
            // データを変換する処理を追加
            transformHeader: (header, index) => {
                // 3行目(indexが2)のヘッダーをトリムして返す
                return header.trim();
            },
            beforeFirstChunk: (chunk) => {
                // 最初のデータチャンクを受け取り、最初の2行を削除する
                const lines = chunk.split('\n'); // データを改行で分割
                lines.splice(0, 3); // 最初の2行（0番目と1番目）を削除
                return lines.join('\n'); // 再度文字列に結合して返す
            },
            // ▲▲▲ ここまでが修正の核 ▲▲▲

            complete: (results) => {
                // 'タスク'列をquestion, '回答例'列をanswerとする
                // results.meta.fields には3行目のヘッダー名が格納されている
                const taskHeader = results.meta.fields.find(h => h.includes('タスク'));
                const answerHeader = results.meta.fields.find(h => h.includes('回答例'));

                if (!taskHeader || !answerHeader) {
                    resultsContainer.innerHTML = '<p class="qa-no-result">エラー: CSVの3行目に「タスク」および「回答例」の列が見つかりません。</p>';
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