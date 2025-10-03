document.addEventListener('DOMContentLoaded', () => {
    const qaSections = document.querySelectorAll('.qa-search-section');

    qaSections.forEach(section => {
        const searchInput = section.querySelector('.qa-search-input');
        const resultsContainer = section.querySelector('.qa-results-container');
        
        const csvPath = section.dataset.csvPath;
        const categoryFilter = section.dataset.category;
        let qaData = [];

        if (!csvPath) {
            resultsContainer.innerHTML = '<p class="qa-initial-message">エラー: 読み込むデータファイルが指定されていません。</p>';
            return;
        }

        function showInitialMessage(message = '検索したい文字を上の枠に入力してください') {
            resultsContainer.innerHTML = `<p class="qa-initial-message">${message}</p>`;
        }

        function kataToHira(str) {
            if (!str) return '';
            return str.replace(/[\u30a1-\u30f6]/g, match => String.fromCharCode(match.charCodeAt(0) - 0x60));
        }

        function normalizeText(text) {
            if (!text) return '';
            return kataToHira(String(text).toLowerCase());
        }

        function loadQAData() {
            showInitialMessage('Q&Aデータを読み込んでいます...');
            const finalCsvPath = `${csvPath}?t=${new Date().getTime()}`;

            Papa.parse(finalCsvPath, {
                download: true,
                header: true,
                skipEmptyLines: true,
                transformHeader: header => header.trim(),
                complete: (results) => {
                    if (results.errors.length > 0 && results.data.length === 0) {
                         console.error('CSV Parse Error:', results.errors);
                         showInitialMessage('エラー: Q&Aデータの読み込みに失敗しました。');
                         return;
                    }

                    const questionHeader = 'Question';
                    const answerHeader = 'Answer';
                    const categoryHeader = 'Category';

                    if (!results.meta.fields.includes(questionHeader) || 
                        !results.meta.fields.includes(answerHeader) ||
                        !results.meta.fields.includes(categoryHeader)) {
                        showInitialMessage(`エラー: CSVに必須列「${questionHeader}」「${answerHeader}」「${categoryHeader}」のいずれかが見つかりません。`);
                        return;
                    }

                    let allData = results.data.map(row => {
                        const questionText = String(row[questionHeader] || '').trim();
                        const answerText = String(row[answerHeader] || '').trim();
                        const categoryText = String(row[categoryHeader] || '').trim();
                        
                        return {
                            question: questionText,
                            answer: answerText,
                            category: categoryText,
                            normalizedText: normalizeText(questionText + ' ' + answerText) 
                        };
                    // ▼▼▼【修正点】回答(answer)が空でも、質問とカテゴリがあれば読み込むように条件を緩和 ▼▼▼
                    }).filter(item => item.question && item.category);
                    
                    if (categoryFilter) {
                        qaData = allData.filter(item => item.category === categoryFilter);
                    } else {
                        qaData = allData;
                    }
                    
                    console.log(`✅ ${csvPath} の読み込み完了。「${categoryFilter || '全'}」カテゴリのQ&Aを${qaData.length}件準備しました。`);
                    showInitialMessage();
                },
                error: (err) => {
                    showInitialMessage('エラー: Q&Aデータの読み込みに失敗しました。');
                    console.error('CSV Load Error:', err);
                }
            });
        }

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
                // 回答が空の場合でもエラーにならないようにする
                answerDiv.innerHTML = (item.answer || '').replace(/\n/g, '<br>');
                qaItem.appendChild(questionDiv);
                qaItem.appendChild(answerDiv);
                fragment.appendChild(qaItem);
                questionDiv.addEventListener('click', () => {
                    qaItem.classList.toggle('active');
                });
            });
            resultsContainer.appendChild(fragment);
        }

        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            if (!query) {
                showInitialMessage();
                return;
            }
            const searchKeywords = query.split(/\s+/).filter(k => k).map(k => normalizeText(k));
            const filteredData = qaData.filter(item => {
                return searchKeywords.every(keyword => item.normalizedText.includes(keyword));
            });
            displayResults(filteredData);
        });

        loadQAData();
    });
});