document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('qa-search-input');
    const resultsContainer = document.getElementById('qa-results-container');
    let qaData = [];

    // CSVファイルを読み込んで解析する関数
    function loadQAData() {
        // CSVファイルへのパス。キャッシュを避けるためにタイムスタンプを追加
        const csvFilePath = `files/qa-data.csv?t=${new Date().getTime()}`;

        Papa.parse(csvFilePath, {
            download: true,
            header: false, // スプレッドシートにヘッダー行（タイトル行）はないのでfalse
            skipEmptyLines: true,
            complete: (results) => {
                // スプレッドシートのA列(0番目)をquestion, B列(1番目)をanswerとする
                qaData = results.data.map(row => {
                    // 念の為、データがundefinedにならないようにチェック
                    const question = row[0] ? row[0].trim() : '';
                    const answer = row[1] ? row[1].trim() : '';
                    return { question, answer };
                }).filter(item => item.question && item.answer); // 質問と回答が両方あるものだけを対象とする

                // 初期状態で全件表示
                displayResults(qaData);
            },
            error: (err, file) => {
                resultsContainer.innerHTML = '<p class="qa-no-result">エラー: Q&Aデータの読み込みに失敗しました。<br>qa-data.csvファイルが正しく設置されているか確認してください。</p>';
                console.error('CSV Parse Error:', err, file);
            }
        });
    }

    // 検索結果を表示する関数
    function displayResults(data) {
        resultsContainer.innerHTML = ''; // 表示エリアを一旦クリア

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
            // 回答文の改行をHTMLの<br>タグに変換して表示
            answerDiv.innerHTML = item.answer.replace(/\n/g, '<br>');

            qaItem.appendChild(questionDiv);
            qaItem.appendChild(answerDiv);
            fragment.appendChild(qaItem);

            // 質問部分をクリックしたら、親のqa-itemに'active'クラスを付け外しする
            questionDiv.addEventListener('click', () => {
                qaItem.classList.toggle('active');
            });
        });
        resultsContainer.appendChild(fragment);
    }

    // 検索ボックスに入力があった時のイベント
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        
        // 入力がない場合は、全件を再表示
        if (!query) {
            displayResults(qaData);
            return;
        }

        // 質問(question)または回答(answer)に検索キーワードが含まれるものをフィルタリング
        const filteredData = qaData.filter(item => 
            item.question.toLowerCase().includes(query) || 
            item.answer.toLowerCase().includes(query)
        );
        displayResults(filteredData);
    });

    // ページが読み込まれたら、CSVデータの読み込みを開始する
    loadQAData();
});