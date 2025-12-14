document.addEventListener('DOMContentLoaded', () => {
    // ページ内のすべての Q&A セクションを取得 (.qa-search-section)
    const qaSections = document.querySelectorAll('.qa-search-section');

    qaSections.forEach(section => {
        // セクション内の要素を取得
        const searchInput = section.querySelector('.qa-search-input');
        const resultsContainer = section.querySelector('.qa-results-container');
        
        // HTMLの data属性 から設定を読み込む
        const csvPath = section.dataset.csvPath;       // data-csv-path="files/data/qa-data.csv"
        const categoryFilter = section.dataset.category; // data-category="栄養" など
        
        let qaData = []; // 読み込んだデータを格納する変数

        // CSVパスが指定されていない場合はエラー表示
        if (!csvPath) {
            resultsContainer.innerHTML = '<p class="qa-initial-message">エラー: 読み込むデータファイルが指定されていません。</p>';
            return;
        }

        // 初期メッセージ表示関数
        function showInitialMessage(message = '検索したい文字を上の枠に入力してください') {
            resultsContainer.innerHTML = `<p class="qa-initial-message">${message}</p>`;
        }

        // 文字の正規化（カタカナ→ひらがな、小文字化）
        function kataToHira(str) {
            if (!str) return '';
            return str.replace(/[\u30a1-\u30f6]/g, match => String.fromCharCode(match.charCodeAt(0) - 0x60));
        }

        function normalizeText(text) {
            if (!text) return '';
            return kataToHira(String(text).toLowerCase());
        }

        // CSV読み込み処理
        function loadQAData() {
            showInitialMessage('Q&Aデータを読み込んでいます...');
            
            // キャッシュ対策（?t=時間）をつけて読み込む
            const finalCsvPath = `${csvPath}?t=${new Date().getTime()}`;

            Papa.parse(finalCsvPath, {
                download: true,
                header: true,
                skipEmptyLines: true,
                transformHeader: header => header.trim(), // ヘッダーの空白除去
                complete: (results) => {
                    if (results.errors.length > 0 && results.data.length === 0) {
                         console.error('CSV Parse Error:', results.errors);
                         showInitialMessage('エラー: Q&Aデータの読み込みに失敗しました。');
                         return;
                    }

                    // 必要な列があるかチェック
                    const questionHeader = 'Question';
                    const answerHeader = 'Answer';
                    const categoryHeader = 'Category';

                    if (!results.meta.fields.includes(questionHeader) || 
                        !results.meta.fields.includes(answerHeader)) {
                        // Category列はなくても動くように緩和（古いCSV対策）
                        showInitialMessage(`エラー: CSVに必須列「${questionHeader}」「${answerHeader}」が見つかりません。`);
                        return;
                    }

                    // データを整形して取り込み
                    let allData = results.data.map(row => {
                        const q = String(row[questionHeader] || '').trim();
                        const a = String(row[answerHeader] || '').trim();
                        const c = String(row[categoryHeader] || '').trim();
                        
                        return {
                            question: q,
                            answer: a,
                            category: c,
                            // 検索用に正規化したテキストを作成
                            normalizedText: normalizeText(q + ' ' + a) 
                        };
                    }).filter(item => item.question); // 質問が空の行は除外

                    // カテゴリフィルタリング（data-categoryがある場合のみ）
                    if (categoryFilter) {
                        qaData = allData.filter(item => item.category === categoryFilter);
                    } else {
                        qaData = allData;
                    }
                    
                    console.log(`✅ 読み込み完了: ${categoryFilter || '全カテゴリ'} (${qaData.length}件)`);
                    showInitialMessage(); // 準備完了メッセージ
                },
                error: (err) => {
                    showInitialMessage('エラー: Q&Aデータの読み込みに失敗しました。');
                    console.error('CSV Load Error:', err);
                }
            });
        }

        // 結果表示関数
        function displayResults(data) {
            resultsContainer.innerHTML = ''; // クリア
            
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
                answerDiv.innerHTML = (item.answer || '').replace(/\n/g, '<br>');

                qaItem.appendChild(questionDiv);
                qaItem.appendChild(answerDiv);
                fragment.appendChild(qaItem);

                // クリックでアコーディオン開閉
                questionDiv.addEventListener('click', () => {
                    qaItem.classList.toggle('active');
                });
            });
            resultsContainer.appendChild(fragment);
        }

        // 検索ボックスの入力イベント
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.trim();
                
                if (!query) {
                    showInitialMessage();
                    return;
                }

                // 検索キーワードを分割して正規化
                const searchKeywords = query.split(/\s+/).filter(k => k).map(k => normalizeText(k));

                // AND検索（すべてのキーワードが含まれるものを抽出）
                const filteredData = qaData.filter(item => {
                    return searchKeywords.every(keyword => item.normalizedText.includes(keyword));
                });

                displayResults(filteredData);
            });
        }

        // データ読み込み開始
        loadQAData();
    });
});