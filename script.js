
let currentAction = '';
let processedCount = 0;
let sessionHistory = [];
let isDarkMode = false;
let currentStats = {
    totalProcessed: 0,
    sessionsCount: 0,
    averagePerSession: 0,
    errorCount: 0,
    lastUsed: null
};


document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});


function initializeApp() {
    hideLoadingScreen();
    loadStats();
    updateStatus();
    setupEventListeners();
    checkPWAInstall();
    

    setInterval(updateStatus, 1000);
    

    initializeTooltips();
    

    loadUserPreferences();
}


function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        setTimeout(() => {
            loadingScreen.classList.add('hidden');
        }, 1000);
    }
}


function loadUserPreferences() {
    try {
        const preferences = localStorage.getItem('galileo-preferences');
        if (preferences) {
            const prefs = JSON.parse(preferences);
            if (prefs.darkMode) {
                toggleDarkMode();
            }
        }
    } catch (e) {
        console.log('Failed to load preferences');
    }
}


function saveUserPreferences() {
    try {
        const preferences = {
            darkMode: isDarkMode,
            lastUsed: Date.now()
        };
        localStorage.setItem('galileo-preferences', JSON.stringify(preferences));
    } catch (e) {
        console.log('Failed to save preferences');
    }
}


function loadStats() {
    try {
        const saved = localStorage.getItem('galileo-cards-stats');
        if (saved) {
            const stats = JSON.parse(saved);
            processedCount = stats.processed || 0;
        }
    } catch (e) {
        processedCount = 0;
    }
}


function saveStats() {
    try {
        const stats = {
            processed: processedCount,
            lastUsed: Date.now()
        };
        localStorage.setItem('galileo-cards-stats', JSON.stringify(stats));
        localStorage.setItem('galileo-last-used', Date.now().toString());
        

        const lastSession = localStorage.getItem('galileo-last-session');
        const now = Date.now();
        
        if (!lastSession || (now - parseInt(lastSession)) > 24 * 60 * 60 * 1000) {
            const currentSessions = parseInt(localStorage.getItem('galileo-sessions') || '0');
            localStorage.setItem('galileo-sessions', (currentSessions + 1).toString());
            localStorage.setItem('galileo-last-session', now.toString());
        }
    } catch (e) {
        console.log('Failed to save stats');
    }
}


function updateStatus() {

    const timeElement = document.getElementById('current-time');
    if (timeElement) {
        const now = new Date();
        timeElement.textContent = now.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }
    

    const statusElement = document.getElementById('connection-status');
    if (statusElement) {
        if (navigator.onLine) {
            statusElement.textContent = '🟢 Система активна';
        } else {
            statusElement.textContent = '🔴 Нет подключения';
        }
    }
    

    const countElement = document.getElementById('processed-count');
    if (countElement) {
        countElement.textContent = `Обработано: ${processedCount}`;
    }
}


function setupEventListeners() {

    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && !e.shiftKey && !e.altKey) {
            switch(e.key) {
                case '1':
                    e.preventDefault();
                    openModal('ADD');
                    break;
                case '2':
                    e.preventDefault();
                    openModal('DELETE');
                    break;
                case '3':
                    e.preventDefault();
                    openModal('DECODE');
                    break;
                case 'v':
                case 'V':
                    const activeElement = document.activeElement;
                    if (activeElement && activeElement.id === 'card-input') {
                        return;
                    }
                    break;
            }
        }
        
        if (e.key === 'Escape') {
            closeModal();
            closeResultModal();
            closeHistoryViewModal();
        }
        
        if (e.ctrlKey && (e.key === 'v' || e.key === 'V')) {
            const modal = document.getElementById('modal');
            const cardInput = document.getElementById('card-input');
            if (modal && modal.style.display === 'flex' && cardInput) {
                if (document.activeElement !== cardInput) {
                    cardInput.focus();
                }
            }
        }

        if (e.ctrlKey && e.key === 'Enter') {
            const modal = document.getElementById('modal');
            if (modal && modal.style.display === 'block') {
                processCards();
            }
        }
    });
    

    document.addEventListener('input', function(e) {
        if (e.target.id === 'card-input') {
            const lines = e.target.value.split('\n').filter(line => line.trim());
            updateInputStats(lines.length);
        }
    });
    

    window.addEventListener('click', function(e) {
        const modal = document.getElementById('modal');
        const resultModal = document.getElementById('result-modal');
        const historyViewModal = document.getElementById('history-view-modal');
        
        if (e.target === modal) {
            closeModal();
        }
        if (e.target === resultModal) {
            closeResultModal();
        }
        if (e.target === historyViewModal) {
            closeHistoryViewModal();
        }
    });
    

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
}


function openModal(action) {
    currentAction = action;
    
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modal-title');
    const cardInput = document.getElementById('card-input');
    

    const configs = {
        'ADD': {
            title: 'Карты для ДОБАВЛЕНИЯ',
            placeholder: 'Введите десятичные номера карт...\nНапример:\n123456\n789012\n345678'
        },
        'DELETE': {
            title: 'Карты для УДАЛЕНИЯ',
            placeholder: 'Введите десятичные номера карт...\nНапример:\n123456\n789012\n345678'
        },
        'DECODE': {
            title: 'Карты для ДЕКОДИРОВАНИЯ',
            placeholder: 'Введите HEX номера карт...\nНапример:\n1E240\nC0D3F\n54678'
        }
    };
    
    const config = configs[action] || configs['ADD'];
    
    if (modalTitle) modalTitle.textContent = config.title;
    if (cardInput) {
        cardInput.placeholder = config.placeholder;
        cardInput.focus();
    }
    
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('show');
    }
}


function closeModal() {
    const modal = document.getElementById('modal');
    const cardInput = document.getElementById('card-input');
    
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
    }
    if (cardInput) cardInput.value = '';
}


function closeResultModal() {
    const resultModal = document.getElementById('result-modal');
    const resultOutput = document.getElementById('result-output');
    
    if (resultModal) {
        resultModal.style.display = 'none';
        resultModal.classList.remove('show');
    }
    if (resultOutput) resultOutput.value = '';
}


function convertToHex(cardNumber) {
    try {
        const num = parseInt(cardNumber.trim());
        if (isNaN(num) || num < 0) {
            throw new Error(`Неверный номер: ${cardNumber}`);
        }
        return num.toString(16).toUpperCase().padStart(6, '0');
    } catch (e) {
        throw new Error(`Ошиб0ЧК@ тута: ${cardNumber}`);
    }
}

function convertToDecimal(hexCard) {
    try {
        let cleanHex = hexCard.trim();
        

        if (cleanHex.toLowerCase().startsWith('addkey ')) {
            cleanHex = cleanHex.substring(7).trim();
        } else if (cleanHex.toLowerCase().startsWith('delkey ')) {
            cleanHex = cleanHex.substring(7).trim();
        }
        
        const num = parseInt(cleanHex, 16);
        if (isNaN(num)) {
            throw new Error(`Неверный HEX: ${hexCard}`);
        }
        return num.toString();
    } catch (e) {
        throw new Error(`Ошиб0ЧК@ тута: ${hexCard}`);
    }
}


function processCards() {
    const cardInput = document.getElementById('card-input');
    const input = cardInput ? cardInput.value.trim() : '';
    
    if (!input) {
        showNotification('Введите номера карт!', 'warning');
        return;
    }
    

    const processBtn = document.querySelector('.modal-btn.primary-btn');
    if (processBtn) {
        processBtn.classList.add('loading');
        processBtn.disabled = true;
    }
    
    const startTime = Date.now();
    
    try {
        const cards = input.split('\n').filter(line => line.trim());
        const results = [];
        const errors = [];
        const duplicates = new Set();
        const seen = new Set();
        

        const removeDuplicates = document.getElementById('remove-duplicates')?.checked || false;
        const sortOutput = document.getElementById('sort-output')?.checked || false;
        
        cards.forEach((card, index) => {
            try {
                const cardNumber = card.split('\t')[0].trim();
                if (!cardNumber) return;
                

                if (removeDuplicates) {
                    if (seen.has(cardNumber)) {
                        duplicates.add(cardNumber);
                        return;
                    }
                    seen.add(cardNumber);
                }
                
                let result, prefix = '';
                
                switch(currentAction) {
                    case 'ADD':
                        result = convertToHex(cardNumber);
                        prefix = 'addkey';
                        break;
                    case 'DELETE':
                        result = convertToHex(cardNumber);
                        prefix = 'delkey';
                        break;
                    case 'DECODE':
                        result = convertToDecimal(cardNumber);
                        break;
                }
                
                if (result) {
                    let finalResult = prefix ? `${prefix} ${result}` : result;
                    results.push(finalResult);
                }
            } catch (error) {

                errors.push({
                    line: index + 1,
                    card: card.trim(),
                    error: error.message
                });

                console.warn(`Error processing line ${index + 1}: ${error.message}`);
            }
        });
        

        if (errors.length > 0) {
            const errorMessage = errors.slice(0, 3).map(e => `Строка ${e.line}: пропущена (${e.error.split(':')[0]})`).join('; ');
            showNotification(`Предупреждения: ${errorMessage}${errors.length > 3 ? ` и ещё ${errors.length - 3}...` : ''}`, 'warning');
        }
        
        if (results.length === 0) {
            showNotification('Нет корректных данных для обработки!', 'error');
            if (processBtn) {
                processBtn.classList.remove('loading');
                processBtn.disabled = false;
            }
            return;
        }
        

        if (sortOutput) {
            results.sort();
        }
        
        const processingTime = Date.now() - startTime;
        

        processedCount += results.length;
        saveStats();
        updateStatus();
        

        const history = JSON.parse(localStorage.getItem('galileo-history') || '[]');
        const historyEntry = {
            id: Date.now().toString(),
            action: currentAction,
            count: results.length,
            timestamp: Date.now(),
            duplicates: duplicates.size,
            errors: errors.length,


        };
        


        if (history.length > 50) history.splice(50);
        localStorage.setItem('galileo-history', JSON.stringify(history));
        

        displayResults(results, {
            processedCards: results.length,
            processingTime: processingTime,
            duplicatesFound: duplicates.size,
            errorsFound: errors.length,
            totalProcessed: results.length,
            fileSize: Math.ceil(results.join('\n').length / 1024)
        });
        
        closeModal();
        
        const successMessage = errors.length > 0 
            ? `Обработка завершена! Успешно: ${results.length} карт, пропущено: ${errors.length} за ${processingTime}мс`
            : `Обработка завершена! Обработано: ${results.length} карт за ${processingTime}мс`;
            
        showNotification(successMessage, 'success');
        
    } catch (error) {
        showNotification(`Критическая ошибка: ${error.message}`, 'error');
    } finally {
        if (processBtn) {
            processBtn.classList.remove('loading');
            processBtn.disabled = false;
        }
    }
}


function displayResults(results, stats) {
    const resultModal = document.getElementById('result-modal');
    const resultOutput = document.getElementById('result-output');
    const resultSubtitle = document.getElementById('result-subtitle');
    

    if (resultOutput) {
        resultOutput.value = results.join('\n');
    }
    

    if (resultSubtitle) {
        resultSubtitle.textContent = `Обработано ${stats.processedCards} карт за ${stats.processingTime}мс`;
    }
    

    const processedCountEl = document.getElementById('processed-cards-count');
    const processingTimeEl = document.getElementById('processing-time');
    
    if (processedCountEl) processedCountEl.textContent = stats.processedCards;
    if (processingTimeEl) processingTimeEl.textContent = `${stats.processingTime}ms`;
    

    updateAnalysisSection(stats);
    

    if (resultModal) {
        resultModal.style.display = 'flex';
        resultModal.classList.add('show');
    }
}


function updateAnalysisSection(stats) {
    const totalProcessedEl = document.getElementById('total-processed');
    const duplicatesFoundEl = document.getElementById('duplicates-found');
    const errorsFoundEl = document.getElementById('errors-found');
    const fileSizeEl = document.getElementById('file-size');
    
    if (totalProcessedEl) totalProcessedEl.textContent = stats.totalProcessed;
    if (duplicatesFoundEl) duplicatesFoundEl.textContent = stats.duplicatesFound;
    if (errorsFoundEl) errorsFoundEl.textContent = stats.errorsFound;
    if (fileSizeEl) fileSizeEl.textContent = `${stats.fileSize} KB`;
}


function pasteFromClipboard() {
    const cardInput = document.getElementById('card-input');
    if (!cardInput) {
        showNotification('Поле ввода не найдено!', 'error');
        return;
    }
    
    const pasteButtons = document.querySelectorAll('button[onclick="pasteFromClipboard()"]');
    pasteButtons.forEach(btn => {
        btn.disabled = true;
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Вставка...</span>';
        
        setTimeout(() => {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }, 2000);
    });
    
    const isSecure = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    
    if (navigator.clipboard && navigator.clipboard.readText && isSecure) {
        navigator.clipboard.readText()
            .then(text => {
                if (text.trim()) {
                    cardInput.value = text;
                    cardInput.dispatchEvent(new Event('input', { bubbles: true }));
                    cardInput.focus();
                    showNotification('Текст вставлен из буфера обмена!', 'success');
                } else {
                    showNotification('Буфер обмена пуст', 'warning');
                }
            })
            .catch(err => {
                console.warn('Clipboard access failed:', err);
                if (err.name === 'NotAllowedError') {
                    showNotification('Доступ к буферу обмена запрещён. Используйте Ctrl+V', 'warning');
                } else {
                    showNotification('Ошибка доступа к буферу. Используйте Ctrl+V', 'warning');
                }
                showFallbackPasteOptions();
            });
    } else {
        if (!isSecure) {
            showNotification('Для доступа к буферу требуется HTTPS. Используйте Ctrl+V', 'warning');
        } else {
            showNotification('Ваш браузер не поддерживает API буфера. Используйте Ctrl+V', 'warning');
        }
        showFallbackPasteOptions();
    }
}

function showFallbackPasteOptions() {
    const cardInput = document.getElementById('card-input');
    if (cardInput) {
        cardInput.focus();
        showNotification('Используйте Ctrl+V для вставки или нажмите правой кнопкой мыши', 'info');
        
        const handlePaste = (e) => {
            setTimeout(() => {
                if (cardInput.value.trim()) {
                    showNotification('Текст вставлен!', 'success');
                }
                cardInput.removeEventListener('paste', handlePaste);
            }, 100);
        };
        
        cardInput.addEventListener('paste', handlePaste);
        
        setTimeout(() => {
            cardInput.removeEventListener('paste', handlePaste);
        }, 10000);
    }
}


function clearInput() {
    const cardInput = document.getElementById('card-input');
    if (cardInput) {
        cardInput.value = '';
        cardInput.focus();
    }
}


function copyToClipboard() {
    const resultOutput = document.getElementById('result-output');
    if (!resultOutput || !resultOutput.value.trim()) {
        showNotification('Нет данных для копирования!', 'warning');
        return;
    }
    
    resultOutput.select();
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(resultOutput.value)
            .then(() => {
                showNotification('Ай как хорошо! Скопировано в буфер.', 'success');
            })
            .catch(() => {
                document.execCommand('copy');
                showNotification('Ай как хорошо! Скопировано в буфер.', 'success');
            });
    } else {
        document.execCommand('copy');
        showNotification('Ай как хорошо! Скопировано в буфер.', 'success');
    }
}


function saveToFile() {
    const resultOutput = document.getElementById('result-output');
    const formatSelect = document.getElementById('export-format');
    
    if (!resultOutput || !resultOutput.value.trim()) {
        showNotification('Нет данных для сохранения!', 'warning');
        return;
    }
    
    const selectedFormat = formatSelect ? formatSelect.value : 'txt';
    const data = resultOutput.value.trim();
    const lines = data.split('\n');
    
    try {
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10);
        const timeStr = now.toTimeString().slice(0, 5).replace(':', '-');
        
        let content, filename, mimeType;
        
        switch(selectedFormat) {
            case 'json':

                const jsonData = {
                    exportDate: now.toISOString(),
                    action: currentAction,
                    totalCards: lines.length,
                    results: lines.map((line, index) => ({
                        id: index + 1,
                        content: line.trim(),
                        timestamp: now.toISOString()
                    }))
                };
                content = JSON.stringify(jsonData, null, 2);
                filename = `${dateStr}_${timeStr}_${currentAction}_cards.json`;
                mimeType = 'application/json';
                break;
                
            case 'csv':

                const csvHeader = 'ID,Content,Action,Timestamp\n';
                const csvRows = lines.map((line, index) => 
                    `${index + 1},"${line.trim().replace(/"/g, '""')}",${currentAction},"${now.toISOString()}"`
                ).join('\n');
                content = csvHeader + csvRows;
                filename = `${dateStr}_${timeStr}_${currentAction}_cards.csv`;
                mimeType = 'text/csv';
                break;
                

                content = data;
                filename = `${dateStr}_${timeStr}_${currentAction}_cards.txt`;
                mimeType = 'text/plain';
        }
        

        const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        const formatNames = {
            txt: 'текстовом',
            json: 'JSON',
            csv: 'CSV'
        };
        
        showNotification(`Ай как хорошо! Схоронено в ${formatNames[selectedFormat]} формате: ${filename}`, 'success');
        
    } catch (error) {
        showNotification(`Ошибка сохранения: ${error.message}`, 'error');
    }
}


function toggleDarkMode() {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('dark-theme', isDarkMode);
    
    const themeIcon = document.getElementById('theme-icon');
    if (themeIcon) {
        themeIcon.className = isDarkMode ? 'fas fa-sun' : 'fas fa-moon';
    }
    
    saveUserPreferences();
    showNotification(isDarkMode ? 'Тёмная тема включена' : 'Светлая тема включена', 'success');
}


function showHelp() {
    const helpModal = document.getElementById('help-modal');
    const helpContent = document.querySelector('.help-content');
    
    if (helpContent) {
        helpContent.innerHTML = `
            <div class="help-sections">
                <div class="help-section">
                    <h3><i class="fas fa-rocket"></i> Быстрый старт</h3>
                    <p>Выберите нужную операцию и введите номера карт для обработки.</p>
                    <ul>
                        <li><strong>Добавить:</strong> Конвертирует DEC в HEX с префиксом addkey</li>
                        <li><strong>Удалить:</strong> Конвертирует DEC в HEX с префиксом delkey</li>
                        <li><strong>Декодер:</strong> Конвертирует HEX обратно в DEC</li>
                    </ul>
                </div>
                <div class="help-section">
                    <h3><i class="fas fa-keyboard"></i> Горячие клавиши</h3>
                    <div class="shortcuts">
                        <div class="shortcut"><kbd>Ctrl</kbd> + <kbd>1</kbd> - Добавить карты</div>
                        <div class="shortcut"><kbd>Ctrl</kbd> + <kbd>2</kbd> - Удалить карты</div>
                        <div class="shortcut"><kbd>Ctrl</kbd> + <kbd>3</kbd> - Декодер</div>
                        <div class="shortcut"><kbd>Esc</kbd> - Закрыть окно</div>
                        <div class="shortcut"><kbd>Ctrl</kbd> + <kbd>Enter</kbd> - Обработать</div>
                    </div>
                </div>
                <div class="help-section">
                    <h3><i class="fas fa-file-alt"></i> Форматы данных</h3>
                    <p><strong>Для добавления/удаления:</strong> Десятичные номера (123456)</p>
                    <p><strong>Для декодирования:</strong> HEX номера с/без префикса</p>
                    <div class="format-example">
                        <strong>Пример ввода:</strong><br>
                        123456<br>
                        789012<br>
                        345678
                    </div>
                </div>
            </div>
        `;
    }
    
    if (helpModal) {
        helpModal.style.display = 'flex';
        helpModal.classList.add('show');
    }
}


function closeHelpModal() {
    const helpModal = document.getElementById('help-modal');
    if (helpModal) {
        helpModal.style.display = 'none';
    }
}


function showStats() {
    const statsModal = document.getElementById('stats-modal');
    const statsContent = document.querySelector('.stats-content');
    

    const lastUsedTimestamp = localStorage.getItem('galileo-last-used');
    const lastUsedDate = lastUsedTimestamp ? new Date(parseInt(lastUsedTimestamp)) : null;
    const lastUsedFormatted = lastUsedDate && !isNaN(lastUsedDate.getTime()) 
        ? lastUsedDate.toLocaleDateString('ru-RU', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
        : 'Никогда';
    
    const stats = {
        totalProcessed: processedCount,
        sessionsCount: parseInt(localStorage.getItem('galileo-sessions') || '0'),
        lastUsed: lastUsedFormatted,
        errorCount: parseInt(localStorage.getItem('galileo-errors') || '0')
    };
    
    if (statsContent) {
        statsContent.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">${stats.totalProcessed}</div>
                    <div class="stat-label">Всего обработано</div>
                    <i class="fas fa-credit-card stat-icon"></i>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${stats.sessionsCount}</div>
                    <div class="stat-label">Сеансов работы</div>
                    <i class="fas fa-clock stat-icon"></i>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${stats.errorCount}</div>
                    <div class="stat-label">Ошибок</div>
                    <i class="fas fa-exclamation-triangle stat-icon"></i>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${stats.lastUsed}</div>
                    <div class="stat-label">Последнее использование</div>
                    <i class="fas fa-calendar stat-icon"></i>
                </div>
            </div>
            <div class="stats-actions">
                <button class="modal-btn secondary-btn" onclick="resetStats()">
                    <i class="fas fa-trash"></i> Сбросить статистику
                </button>
                <button class="modal-btn primary-btn" onclick="exportStats()">
                    <i class="fas fa-download"></i> Экспорт данных
                </button>
            </div>
        `;
    }
    
    if (statsModal) {
        statsModal.style.display = 'flex';
        statsModal.classList.add('show');
    }
}


function closeStatsModal() {
    const statsModal = document.getElementById('stats-modal');
    if (statsModal) {
        statsModal.style.display = 'none';
    }
}


function showHistory() {
    const historyModal = document.getElementById('history-modal');
    const historyContent = document.querySelector('.history-content');
    
    const history = JSON.parse(localStorage.getItem('galileo-history') || '[]');
    
    if (historyContent) {
        if (history.length === 0) {
            historyContent.innerHTML = `
                <div class="empty-history">
                    <i class="fas fa-history"></i>
                    <h3>История пуста</h3>
                    <p>Обработанные операции будут отображаться здесь</p>
                </div>
            `;
        } else {
            const historyHTML = history.map(item => {
                const date = new Date(item.timestamp);
                const formattedDate = date.toLocaleString('ru-RU');
                const actionNames = {
                    'ADD': 'Добавление',
                    'DELETE': 'Удаление', 
                    'DECODE': 'Декодирование'
                };
                
                const previewResults = item.results ? item.results.slice(0, 3).join('\n') : 'Нет данных';
                const hasMoreResults = item.results && item.results.length > 3;
                
                return `
                    <div class="history-item enhanced">
                        <div class="history-header">
                            <div class="history-main-info">
                                <span class="history-action">${actionNames[item.action] || item.action}</span>
                                <span class="history-date">${formattedDate}</span>
                            </div>
                            <div class="history-actions">
                                ${item.results ? `
                                    <button class="history-btn" onclick="downloadHistoryItem('${item.id}')" title="Скачать результат">
                                        <i class="fas fa-download"></i>
                                    </button>
                                    <button class="history-btn" onclick="viewHistoryItem('${item.id}')" title="Посмотреть">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                    <button class="history-btn" onclick="copyHistoryItem('${item.id}')" title="Копировать">
                                        <i class="fas fa-copy"></i>
                                    </button>
                                ` : ''}
                                <button class="history-btn danger" onclick="deleteHistoryItem('${item.id}')" title="Удалить">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                        <div class="history-details">
                            <div class="history-stats">
                                <span class="stat">Обработано: <strong>${item.count}</strong></span>
                                ${item.duplicates > 0 ? `<span class="stat">Дубликатов: <strong>${item.duplicates}</strong></span>` : ''}
                                ${item.errors > 0 ? `<span class="stat error">Ошибок: <strong>${item.errors}</strong></span>` : ''}
                            </div>
                            ${item.results ? `
                                <div class="history-preview">
                                    <div class="preview-label">Предпросмотр результата:</div>
                                    <pre class="preview-text">${previewResults}${hasMoreResults ? '\n...' : ''}</pre>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `;
            }).join('');
            
            historyContent.innerHTML = `
                <div class="history-list">${historyHTML}</div>
                <div class="history-footer-actions">
                    <button class="modal-btn secondary-btn" onclick="exportAllHistory()">
                        <i class="fas fa-file-export"></i> Экспорт всей истории
                    </button>
                    <button class="modal-btn secondary-btn" onclick="clearHistory()">
                        <i class="fas fa-trash"></i> Очистить историю
                    </button>
                </div>
            `;
        }
    }
    
    if (historyModal) {
        historyModal.style.display = 'flex';
        historyModal.classList.add('show');
    }
}


function closeHistoryModal() {
    const historyModal = document.getElementById('history-modal');
    if (historyModal) {
        historyModal.style.display = 'none';
    }
}


function initializeTooltips() {

    const tooltipElements = document.querySelectorAll('[data-tooltip]');
    tooltipElements.forEach(element => {
        element.addEventListener('mouseenter', showTooltip);
        element.addEventListener('mouseleave', hideTooltip);
    });
}


function showTooltip(event) {
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.textContent = event.target.getAttribute('data-tooltip');
    tooltip.style.cssText = `
        position: absolute;
        background: #333;
        color: white;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 12px;
        z-index: 1000;
        pointer-events: none;
        white-space: nowrap;
    `;
    
    document.body.appendChild(tooltip);
    
    const rect = event.target.getBoundingClientRect();
    tooltip.style.left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + 'px';
    tooltip.style.top = rect.top - tooltip.offsetHeight - 8 + 'px';
    
    event.target.tooltipElement = tooltip;
}


function hideTooltip(event) {
    if (event.target.tooltipElement) {
        document.body.removeChild(event.target.tooltipElement);
        event.target.tooltipElement = null;
    }
}


function showNotification(message, type = 'info') {
    const toast = document.getElementById('notification-toast');
    const toastIcon = toast.querySelector('.toast-icon i');
    const toastTitle = toast.querySelector('.toast-title');
    const toastText = toast.querySelector('.toast-text');
    
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };
    
    const titles = {
        success: 'Успешно!',
        error: 'Ошибка!',
        warning: 'Внимание!',
        info: 'Информация'
    };
    
    if (toastIcon) toastIcon.className = icons[type] || icons.info;
    if (toastTitle) toastTitle.textContent = titles[type] || titles.info;
    if (toastText) toastText.textContent = message;
    
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 5000);
}


function hideToast() {
    const toast = document.getElementById('notification-toast');
    toast.classList.remove('show');
}




function validateInput() {
    const cardInput = document.getElementById('card-input');
    if (!cardInput) return;
    
    const lines = cardInput.value.split('\n').filter(line => line.trim());
    const errors = [];
    const valid = [];
    
    lines.forEach((line, index) => {
        const card = line.trim();
        if (currentAction === 'DECODE') {

            const cleanHex = card.replace(/^(addkey|delkey)\s+/i, '');
            if (!/^[0-9A-Fa-f]+$/.test(cleanHex)) {
                errors.push(`Строка ${index + 1}: неверный HEX формат`);
            } else {
                valid.push(card);
            }
        } else {

            if (!/^\d+$/.test(card) || parseInt(card) < 0) {
                errors.push(`Строка ${index + 1}: неверный десятичный формат`);
            } else {
                valid.push(card);
            }
        }
    });
    
    updateInputStats(valid.length, errors.length);
    
    if (errors.length > 0) {
        showNotification(`Найдены ошибки: ${errors.slice(0, 3).join(', ')}${errors.length > 3 ? '...' : ''}`, 'warning');
    } else {
        showNotification(`Проверка пройдена: ${valid.length} корректных записей`, 'success');
    }
}


function formatInput() {
    const cardInput = document.getElementById('card-input');
    if (!cardInput) return;
    
    const lines = cardInput.value.split('\n')
        .map(line => line.trim())
        .filter(line => line)
        .map(line => {
            if (currentAction === 'DECODE') {
                return line.toUpperCase();
            }
            return line;
        });
    
    cardInput.value = lines.join('\n');
    showNotification('Форматирование завершено', 'success');
}


function updateInputStats(count, errors = 0) {
    const inputCount = document.getElementById('input-count');
    const inputFormat = document.getElementById('input-format');
    
    if (inputCount) {
        inputCount.textContent = `${count} карт${errors > 0 ? ` (${errors} ошибок)` : ''}`;
    }
    
    if (inputFormat) {
        const formats = {
            'ADD': 'DEC → HEX (addkey)',
            'DELETE': 'DEC → HEX (delkey)',
            'DECODE': 'HEX → DEC'
        };
        inputFormat.textContent = formats[currentAction] || 'DEC формат';
    }
}


function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const cardInput = document.getElementById('card-input');
        if (cardInput) {
            cardInput.value = e.target.result;
            showNotification(`Файл ${file.name} загружен`, 'success');
            validateInput();
        }
    };
    reader.readAsText(file);
}


function showPreview() {
    const cardInput = document.getElementById('card-input');
    if (!cardInput || !cardInput.value.trim()) {
        showNotification('Введите данные для предпросмотра', 'warning');
        return;
    }
    
    const lines = cardInput.value.split('\n').filter(line => line.trim()).slice(0, 5);
    const preview = lines.map((line, index) => {
        try {
            const card = line.trim();
            let result = '';
            
            switch(currentAction) {
                case 'ADD':
                    result = `addkey ${convertToHex(card)}`;
                    break;
                case 'DELETE':
                    result = `delkey ${convertToHex(card)}`;
                    break;
                case 'DECODE':
                    result = convertToDecimal(card);
                    break;
            }
            
            return `${index + 1}. ${card} → ${result}`;
        } catch (e) {
            return `${index + 1}. ${line} → ОШИБКА`;
        }
    }).join('\n');
    
    const moreLines = cardInput.value.split('\n').filter(line => line.trim()).length - 5;
    const previewText = preview + (moreLines > 0 ? `\n... и ещё ${moreLines} строк` : '');
    
    showNotification(`Предпросмотр:\n${previewText}`, 'info');
}


function selectAllResult() {
    const resultOutput = document.getElementById('result-output');
    if (resultOutput) {
        resultOutput.select();
        resultOutput.setSelectionRange(0, 99999);
        showNotification('Весь текст выделен', 'success');
    }
}


function toggleWrap() {
    const resultOutput = document.getElementById('result-output');
    if (resultOutput) {
        const isWrapped = resultOutput.style.whiteSpace === 'pre-wrap';
        resultOutput.style.whiteSpace = isWrapped ? 'pre' : 'pre-wrap';
        showNotification(isWrapped ? 'Перенос строк отключен' : 'Перенос строк включен', 'info');
    }
}


function printResult() {
    const resultOutput = document.getElementById('result-output');
    if (!resultOutput || !resultOutput.value.trim()) {
        showNotification('Нет данных для печати', 'warning');
        return;
    }
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>Результат обработки карт Галилей</title>
            <style>
                body { font-family: monospace; margin: 20px; }
                h1 { color: #333; }
                pre { background: #f5f5f5; padding: 15px; border-radius: 5px; }
            </style>
        </head>
        <body>
            <h1>Результат обработки карт Галилей</h1>
            <p>Дата: ${new Date().toLocaleString()}</p>
            <p>Операция: ${currentAction}</p>
            <pre>${resultOutput.value}</pre>
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}


function shareResult() {
    const resultOutput = document.getElementById('result-output');
    if (!resultOutput || !resultOutput.value.trim()) {
        showNotification('Нет данных для публикации', 'warning');
        return;
    }
    
    if (navigator.share) {
        navigator.share({
            title: 'Результат обработки карт Галилей',
            text: resultOutput.value
        }).then(() => {
            showNotification('Данные переданы в приложение', 'success');
        }).catch(() => {
            copyToClipboard();
        });
    } else {
        copyToClipboard();
    }
}


function processAnother() {
    closeResultModal();
    openModal(currentAction);
}


function clearHistory() {
    if (confirm('Очистить всю историю операций?')) {
        localStorage.removeItem('galileo-history');
        closeHistoryModal();
        showNotification('История очищена', 'success');
    }
}


function bulkProcess() {
    showNotification('Функция массовой обработки будет доступна в следующей версии', 'info');
}


function resetStats() {
    if (confirm('Вы уверены, что хотите сбросить всю статистику?')) {
        localStorage.removeItem('galileo-cards-stats');
        localStorage.removeItem('galileo-sessions');
        localStorage.removeItem('galileo-errors');
        localStorage.removeItem('galileo-last-used');
        processedCount = 0;
        updateStatus();
        closeStatsModal();
        showNotification('Статистика сброшена', 'success');
    }
}


function exportStats() {
    const stats = {
        totalProcessed: processedCount,
        sessionsCount: localStorage.getItem('galileo-sessions') || 0,
        lastUsed: localStorage.getItem('galileo-last-used') || null,
        errorCount: localStorage.getItem('galileo-errors') || 0,
        exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(stats, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `galileo-stats-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('Статистика экспортирована', 'success');
}




function downloadHistoryItem(itemId) {
    const history = JSON.parse(localStorage.getItem('galileo-history') || '[]');
    const item = history.find(h => h.id === itemId);
    
    if (!item || !item.results) {
        showNotification('Нет данных для скачивания', 'warning');
        return;
    }
    
    try {
        const date = new Date(item.timestamp);
        const dateStr = date.toISOString().slice(0, 10);
        const timeStr = date.toTimeString().slice(0, 5).replace(':', '-');
        const actionName = {
            'ADD': 'ADD',
            'DELETE': 'DEL', 
            'DECODE': 'DEC'
        }[item.action] || item.action;
        
        const filename = `${dateStr}_${timeStr}_${actionName}_${item.count}cards.txt`;
        
        const blob = new Blob([item.results.join('\n')], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showNotification(`Файл ${filename} скачан`, 'success');
    } catch (error) {
        showNotification(`Ошибка скачивания: ${error.message}`, 'error');
    }
}


function viewHistoryItem(itemId) {
    const history = JSON.parse(localStorage.getItem('galileo-history') || '[]');
    const item = history.find(h => h.id === itemId);
    
    if (!item || !item.results) {
        showNotification('Нет данных для просмотра', 'warning');
        return;
    }
    

    const existingViewModal = document.getElementById('history-view-modal');
    if (existingViewModal) {
        existingViewModal.remove();
    }
    
    const viewModal = document.createElement('div');
    viewModal.id = 'history-view-modal';
    viewModal.className = 'modal';
    viewModal.style.display = 'block';
    
    const date = new Date(item.timestamp);
    const actionNames = {
        'ADD': 'Добавление',
        'DELETE': 'Удаление',
        'DECODE': 'Декодирование'
    };
    
    viewModal.innerHTML = `
        <div class="modal-content result-modal-content">
            <div class="modal-header success-header">
                <div class="modal-header-left">
                    <div class="modal-icon">
                        <i class="fas fa-history"></i>
                    </div>
                    <div class="modal-title-section">
                        <h2>${actionNames[item.action] || item.action} - ${date.toLocaleString('ru-RU')}</h2>
                        <p>Обработано ${item.count} карт</p>
                    </div>
                </div>
                <button class="close-btn" onclick="closeHistoryViewModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="result-section">
                    <div class="section-header">
                        <label>Результат обработки:</label>
                    </div>
                    <div class="result-container">
                        <textarea readonly spellcheck="false" style="min-height: 300px;">${item.results.join('\n')}</textarea>
                    </div>
                </div>
                <div class="button-group result-buttons">
                    <button class="modal-btn primary-btn" onclick="copyHistoryItem('${item.id}')">
                        <i class="fas fa-copy"></i> Копировать
                    </button>
                    <button class="modal-btn primary-btn" onclick="downloadHistoryItem('${item.id}')">
                        <i class="fas fa-download"></i> Скачать
                    </button>
                    <button class="modal-btn secondary-btn" onclick="closeHistoryViewModal()">
                        <i class="fas fa-times"></i> Закрыть
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(viewModal);
    

    viewModal.style.display = 'flex';
    viewModal.classList.add('show');
    

    viewModal.addEventListener('click', function(e) {
        if (e.target === viewModal) {
            closeHistoryViewModal();
        }
    });
}


function closeHistoryViewModal() {
    const viewModal = document.getElementById('history-view-modal');
    if (viewModal) {
        viewModal.remove();
    }
}


function copyHistoryItem(itemId) {
    const history = JSON.parse(localStorage.getItem('galileo-history') || '[]');
    const item = history.find(h => h.id === itemId);
    
    if (!item || !item.results) {
        showNotification('Нет данных для копирования', 'warning');
        return;
    }
    
    const textToCopy = item.results.join('\n');
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(textToCopy)
            .then(() => {
                showNotification(`Скопировано ${item.count} записей в буфер`, 'success');
            })
            .catch(() => {
                fallbackCopyToClipboard(textToCopy, item.count);
            });
    } else {
        fallbackCopyToClipboard(textToCopy, item.count);
    }
}


function fallbackCopyToClipboard(text, count) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    
    try {
        document.execCommand('copy');
        showNotification(`Скопировано ${count} записей в буфер`, 'success');
    } catch (err) {
        showNotification('Ошибка копирования', 'error');
    }
    
    document.body.removeChild(textArea);
}


function deleteHistoryItem(itemId) {
    if (confirm('Удалить эту запись из истории?')) {
        const history = JSON.parse(localStorage.getItem('galileo-history') || '[]');
        const filteredHistory = history.filter(h => h.id !== itemId);
        localStorage.setItem('galileo-history', JSON.stringify(filteredHistory));
        showHistory();
        showNotification('Запись удалена', 'success');
    }
}


function exportAllHistory() {
    const history = JSON.parse(localStorage.getItem('galileo-history') || '[]');
    
    if (history.length === 0) {
        showNotification('Нет истории для экспорта', 'warning');
        return;
    }
    
    try {
        const exportData = {
            exportDate: new Date().toISOString(),
            totalEntries: history.length,
            history: history.map(item => ({
                id: item.id,
                action: item.action,
                timestamp: item.timestamp,
                count: item.count,
                results: item.results || [],
                duplicates: item.duplicates || 0,
                errors: item.errors || 0
            }))
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10);
        const timeStr = now.toTimeString().slice(0, 5).replace(':', '-');
        const filename = `galileo-history-${dateStr}_${timeStr}.json`;
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showNotification(`Экспорт завершен: ${filename}`, 'success');
    } catch (error) {
        showNotification(`Ошибка экспорта: ${error.message}`, 'error');
    }
}


function checkPWAInstall() {
    let deferredPrompt;
    
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        const pwaBanner = document.getElementById('pwa-banner');
        if (pwaBanner) {
            pwaBanner.style.display = 'flex';
        }
    });
    
    window.installPWA = async function() {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                showNotification('Приложение установлено!', 'success');
            }
            deferredPrompt = null;
            hidePWABanner();
        }
    };
}

function hidePWABanner() {
    const pwaBanner = document.getElementById('pwa-banner');
    if (pwaBanner) {
        pwaBanner.style.display = 'none';
    }
}