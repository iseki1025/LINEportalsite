document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('qa-search-input');
    const resultsContainer = document.getElementById('qa-results-container');
    let qaData = [];

    // CSVファイルを読み込んで解析する
    function loadQAData() {
        Papa.parse('qa-data.csv', {
            download: true,
            header: false, // ヘッダー行がない場合
            skipEmptyLines: true,
            complete: (results) => {
                // スプレッドシートのA列をquestion, B列をanswerとする
                qaData = results.data.map(row => ({
                    question: row[0],
                    answer: row[1]
                }));
                // 初期状態で全件表示
                displayResults(qaData);
            }
        });
    }

    // 結果を表示する関数
    function displayResults(data) {
        resultsContainer.innerHTML = ''; // 結果をクリア

        if (data.length === 0) {
            resultsContainer.innerHTML = '<p class="qa-no-result">該当する質問はありません。</p>';
            return;
        }

        const fragment = document.createDocumentFragment();
        data.forEach(item => {
            const qaItem = document.createElement('div');
            qaItem.className = 'qa-search-item';

            const question = document.createElement('div');
            question.className = 'qa-search-question';
            question.textContent = item.question;

            const answer = document.createElement('div');
            answer.className = 'qa-search-answer';
            // 改行を<br>に変換してHTMLに挿入
            answer.innerHTML = item.answer.replace(/\n/g, '<br>');

            qaItem.appendChild(question);
            qaItem.appendChild(answer);
            fragment.appendChild(qaItem);

            // 質問をクリックしたら回答の表示/非表示を切り替える
            question.addEventListener('click', () => {
                qaItem.classList.toggle('active');
            });
        });
        resultsContainer.appendChild(fragment);
    }

    // 検索入力イベント
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        
        if (!query) {
            displayResults(qaData); // 入力がなければ全件表示
            return;
        }

        const filteredData = qaData.filter(item => 
            item.question.toLowerCase().includes(query) || 
            item.answer.toLowerCase().includes(query)
        );
        displayResults(filteredData);
    });

    // 初期データを読み込む
    loadQAData();
});