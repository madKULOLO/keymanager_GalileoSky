
let currentAction = '';
globalThis.getProcessedCount = function() {
    try {
        const history = JSON.parse(localStorage.getItem('galileo-history') || '[]');
        return history.reduce((total, entry) => total + (entry.count || 0), 0);
    } catch (e) {
        return 0;
    }
};
let isDarkMode = false;
let sessionStartTime = null;
let scannedCard = null;
let statsUpdateInterval = null;
let currentPageLoadTime = null;
let sessionIntervals = [];
let visitCount = 0; 

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
    
    setInterval(saveStats, 30000);
    
    initializeTooltips();
    
    loadUserPreferences();
    
    initializeMobileInterface();
    
    initializeMobileGestures();
    
    sessionStartTime = null;
    currentPageLoadTime = Date.now();
    
    loadVisitCount();
    
    try {
        const savedIntervals = localStorage.getItem('galileo-session-intervals');
        if (savedIntervals) {
            sessionIntervals = JSON.parse(savedIntervals);
        }
    } catch (e) {
        sessionIntervals = [];
    }
        try {
            const allHistory = JSON.parse(localStorage.getItem('galileo-history') || '[]');
            const totalErrors = allHistory.reduce((sum, entry) => sum + (entry.errors || 0), 0);
            localStorage.setItem('galileo-errors', totalErrors);
        } catch (e) {
            localStorage.setItem('galileo-errors', '0');
        }
}

function saveStats() {
    try {
        const stats = {
            processed: getProcessedCount(),
            lastUsed: Date.now()
        };
        localStorage.setItem('galileo-cards-stats', JSON.stringify(stats));
        localStorage.setItem('galileo-last-used', Date.now().toString());
        
        localStorage.setItem('galileo-visits', visitCount.toString());
        
        const lastSession = localStorage.getItem('galileo-last-session');
        const now = Date.now();
        
        if (!lastSession || (now - parseInt(lastSession)) > 24 * 60 * 60 * 1000) {
            const currentSessions = parseInt(localStorage.getItem('galileo-sessions') || '0');
            localStorage.setItem('galileo-sessions', (currentSessions + 1).toString());
            localStorage.setItem('galileo-last-session', now.toString());
        }
        
        if (sessionStartTime !== null) {
            const currentInterval = {
                start: sessionStartTime,
                end: Date.now()
            };
            sessionIntervals.push(currentInterval);
            
            localStorage.setItem('galileo-session-intervals', JSON.stringify(sessionIntervals));
            
            const totalTime = calculateTotalTime();
            localStorage.setItem('galileo-total-time', totalTime.toString());
        }
    } catch (e) {
        console.warn('Ошибка при сохранении статистики:', e);
    }
}


function calculateTotalTime() {
    let totalTime = 0;
    
    for (const interval of sessionIntervals) {
        totalTime += Math.floor((interval.end - interval.start) / 1000);
    }
    
    if (sessionStartTime !== null) {
        totalTime += Math.floor((Date.now() - sessionStartTime) / 1000);
    }
    
    if (sessionStartTime === null && currentPageLoadTime !== null) {
        totalTime += Math.floor((Date.now() - currentPageLoadTime) / 1000);
    }
    
    return totalTime;
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
                isDarkMode = true;
                document.body.classList.add('dark-theme');
                const themeIcon = document.getElementById('theme-icon');
                if (themeIcon) {
                    themeIcon.className = 'fas fa-sun';
                }
            }
        }
    } catch (e) {
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
    }
}


function loadStats() {
    try {
        const saved = localStorage.getItem('galileo-cards-stats');
        if (saved) {
            const stats = JSON.parse(saved);
        }
        
        const savedVisits = localStorage.getItem('galileo-visits');
        if (savedVisits) {
            visitCount = parseInt(savedVisits) || 0;
        }
    } catch (e) {
        visitCount = 0;
    }
}

function loadVisitCount() {
    try {
        visitCount = parseInt(localStorage.getItem('galileo-visits')) || 0;
        visitCount++;
        localStorage.setItem('galileo-visits', visitCount.toString());
    } catch (e) {
        visitCount = 1;
        localStorage.setItem('galileo-visits', '1');
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
    const history = JSON.parse(localStorage.getItem('galileo-history') || '[]');
    const errorCount = history.reduce((total, entry) => total + (entry.errors || 0), 0);
    countElement.textContent = `Обработано: ${getProcessedCount()} | Ошибок: ${errorCount}`;
}


function setupEventListeners() {

    function initializeSessionTime() {
        if (sessionStartTime === null) {
            sessionStartTime = Date.now();
        }
    }

    document.addEventListener('keydown', function(e) {
        initializeSessionTime();
        
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
                case '4':
                    e.preventDefault();
                    openModal('CARD_LIMIT');
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
            if (modal && (modal.style.display === 'block' || modal.style.display === 'flex')) {
                processCards();
            }
        }
    });

    document.addEventListener('input', function(e) {
        initializeSessionTime();
        
        if (e.target.id === 'card-input') {
            const lines = e.target.value.split('\n').filter(line => line.trim());
            updateInputStats(lines.length);
        }
    });
    

    window.addEventListener('click', function(e) {
        initializeSessionTime();
        
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
        },
        'CARD_LIMIT': {
            title: 'Работа с лимитными картами',
            placeholder: 'Введите десятичные номера карт...\nНапример:\n3719739126\n123456789\n987654321'
        }
    };
    
    const config = configs[action] || configs['ADD'];
    
    if (modalTitle) modalTitle.textContent = config.title;
    if (cardInput) {
        cardInput.value = '';
        cardInput.placeholder = config.placeholder;
        cardInput.focus();
    }
    
    const processingOptions = document.querySelector('.processing-options');
    if (processingOptions) {
        const existingLimitOptions = document.getElementById('limit-card-options');
        if (existingLimitOptions) {
            existingLimitOptions.remove();
        }
        
        if (action === 'CARD_LIMIT') {
            const limitOptions = document.createElement('div');
            limitOptions.id = 'limit-card-options';
            limitOptions.className = 'option-group limit-card-options';
            limitOptions.innerHTML = `
                <div class="option-section">
                    <label class="option-label">
                        <input type="checkbox" id="add-limit-card" checked>
                        <span class="checkmark"></span>
                        add_limit_card
                    </label>
                    <label class="option-label">
                        <input type="checkbox" id="del-limit-card">
                        <span class="checkmark"></span>
                        del_limit_card
                    </label>
                </div>
                <div class="option-section">
                    <label class="option-label">
                        <input type="checkbox" id="add-ident-card">
                        <span class="checkmark"></span>
                        add_ident_card
                    </label>
                    <label class="option-label">
                        <input type="checkbox" id="del-ident-card">
                        <span class="checkmark"></span>
                        del_ident_card
                    </label>
                </div>
                <div class="option-section">
                    <label class="option-label">
                        <input type="checkbox" id="dual-ident" checked>
                        <span class="checkmark"></span>
                        Двойная идентификация
                    </label>
                </div>
            `;
            processingOptions.appendChild(limitOptions);
        }
    }
    
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('show');
    }
}


function closeModal() {
    const modal = document.getElementById('modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
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

function processAddLimitCard(cardNumber, addLimitCard, delLimitCard, addIdentCard, delIdentCard, dualIdent) {
    try {
        const num = parseInt(cardNumber.trim());
        if (isNaN(num) || num < 0) {
            throw new Error(`Неверный номер: ${cardNumber}`);
        }
        
        const results = [];
        
        if (num < 1001 || num > 2147483647) {
            const adjustedNumber = num - 4294967296;
            
            if (addLimitCard) {
                if (dualIdent) {
                    results.push(`add_limit_card ${adjustedNumber},1`);
                } else {
                    results.push(`add_limit_card ${adjustedNumber}`);
                }
            }
            
            if (delLimitCard) {
                results.push(`del_limit_card ${adjustedNumber}`);
            }
            
            if (addIdentCard) {
                results.push(`add_ident_card ${adjustedNumber}`);
            }
            
            if (delIdentCard) {
                results.push(`del_ident_card ${adjustedNumber}`);
            }
        } else {
            if (addLimitCard) {
                if (dualIdent) {
                    results.push(`add_limit_card ${num},1`);
                } else {
                    results.push(`add_limit_card ${num}`);
                }
            }
            
            if (delLimitCard) {
                results.push(`del_limit_card ${num}`);
            }
            
            if (addIdentCard) {
                results.push(`add_ident_card ${num}`);
            }
            
            if (delIdentCard) {
                results.push(`del_ident_card ${num}`);
            }
        }
        
        return results;
    } catch (e) {
        throw new Error(`Ошибка обработки: ${cardNumber}`);
    }
}


function processCards() {
    const cardInput = document.getElementById('card-input');
    const input = cardInput ? cardInput.value.trim() : '';
    
    if (!input) {
        showNotification('Введите номера карт!', 'warning');
        return;
    }
    
    const addLimitCard = document.getElementById('add-limit-card')?.checked || false;
    const delLimitCard = document.getElementById('del-limit-card')?.checked || false;
    const addIdentCard = document.getElementById('add-ident-card')?.checked || false;
    const delIdentCard = document.getElementById('del-ident-card')?.checked || false;
    const dualIdent = document.getElementById('dual-ident')?.checked || false;

    if (currentAction === 'CARD_LIMIT') {
        console.log('Limit card options:', {
            addLimitCard,
            delLimitCard,
            addIdentCard,
            delIdentCard,
            dualIdent
        });
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
                    case 'CARD_LIMIT':
                        result = processAddLimitCard(cardNumber, addLimitCard, delLimitCard, addIdentCard, delIdentCard, dualIdent);
                        break;
                }
                
                if (result) {
                    if (Array.isArray(result)) {
                        results.push(...result);
                    } else {
                        let finalResult = prefix ? `${prefix} ${result}` : result;
                        results.push(finalResult);
                    }
                }
            } catch (error) {
                errors.push({
                    line: index + 1,
                    card: card.trim(),
                    error: error.message
                });
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
        
        updateStatus();
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
            results: results
        };
        
        history.unshift(historyEntry);
        
        if (history.length > 1000) history.splice(1000); 
        localStorage.setItem('galileo-history', JSON.stringify(history));
        
        displayResults(results, {
            processedCards: results.length,
            processingTime: processingTime,
            duplicatesFound: duplicates.size,
            errorsFound: errors.length,
            totalProcessed: results.length,
            fileSize: Math.ceil(results.join('\n').length / 1024)
        });

        const allHistory = JSON.parse(localStorage.getItem('galileo-history') || '[]');
        const totalErrors = allHistory.reduce((sum, entry) => sum + (entry.errors || 0), 0);
        localStorage.setItem('galileo-errors', totalErrors);

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

        let actionName = currentAction || 'export';
        if (actionName === 'CARD_LIMIT') {
            const addLimitCard = document.getElementById('add-limit-card')?.checked || false;
            const delLimitCard = document.getElementById('del-limit-card')?.checked || false;
            const addIdentCard = document.getElementById('add-ident-card')?.checked || false;
            const delIdentCard = document.getElementById('del-ident-card')?.checked || false;
            const dualIdent = document.getElementById('dual-ident')?.checked || false;

            const parts = [];
            if (addLimitCard) parts.push('add_limit_card');
            if (delLimitCard) parts.push('del_limit_card');
            if (addIdentCard) parts.push('add_ident_card');
            if (delIdentCard) parts.push('del_ident_card');
            if (dualIdent) parts.push('dual_ident');

            actionName = parts.length ? parts.join('+') : 'CARD_LIMIT';
        }

        let content, filename, mimeType;

        switch(selectedFormat) {
            case 'json':

                const jsonData = {
                    exportDate: now.toISOString(),
                    action: currentAction || 'export',
                    totalCards: lines.length,
                    results: lines.map((line, index) => ({
                        id: index + 1,
                        content: line.trim(),
                        timestamp: now.toISOString()
                    }))
                };
                content = JSON.stringify(jsonData, null, 2);
                filename = `${dateStr}_${timeStr}_${actionName}_cards.json`;
                mimeType = 'application/json';
                break;
                
            case 'csv':

                const csvHeader = 'ID,Content,Action,Timestamp\n';
                const csvRows = lines.map((line, index) => 
                    `${index + 1},"${line.trim().replace(/"/g, '""')}",${currentAction || 'export'},"${now.toISOString()}"`
                ).join('\n');
                content = csvHeader + csvRows;
                filename = `${dateStr}_${timeStr}_${actionName}_cards.csv`;
                mimeType = 'text/csv';
                break;
                
            case 'txt':
            default:
                content = data;
        filename = `${dateStr}_${timeStr}_${actionName}_cards.txt`;
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
    
    const isMobile = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
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
                        <li><strong>Работа с лимитными картами:</strong> Работа с лимитными и идентификационными картами с дополнительными опциями</li>
                    </ul>
                </div>
                ${!isMobile ? `
                <div class="help-section">
                    <h3><i class="fas fa-keyboard"></i> Горячие клавиши</h3>
                    <div class="shortcuts">
                        <div class="shortcut"><kbd>Ctrl</kbd> + <kbd>1</kbd> - Добавить карты</div>
                        <div class="shortcut"><kbd>Ctrl</kbd> + <kbd>2</kbd> - Удалить карты</div>
                        <div class="shortcut"><kbd>Ctrl</kbd> + <kbd>3</kbd> - Декодер</div>
                        <div class="shortcut"><kbd>Ctrl</kbd> + <kbd>4</kbd> - Работа с лимитными картами</div>
                        <div class="shortcut"><kbd>Ctrl</kbd> + <kbd>Enter</kbd> - Обработать</div>
                        <div class="shortcut"><kbd>Esc</kbd> - Закрыть окно</div>
                    </div>
                </div>
                ` : `
                <div class="help-section">
                    <h3><i class="fas fa-mobile-alt"></i> Функции на смартфоне</h3>
                    <div class="mobile-tips">
                        <div class="mobile-tip">📱 Тап на кнопку - быстрый доступ</div>
                        <div class="mobile-tip">✋ Долгий тап - копировать результат</div>
                        <div class="mobile-tip">👆 Свайп ← - удалить запись</div>
                        <div class="mobile-tip">🔄 Потянуть ↓ - обновить</div>
                        <div class="mobile-tip">📋 "Вставить" - быстрый ввод</div>
                        <div class="mobile-tip">📷 Сканирование QR/Barcode - для ввода данных</div>
                    </div>
                </div>
                `}
                <div class="help-section">
                    <h3><i class="fas fa-file-alt"></i> Форматы данных</h3>
                    <p><strong>Для добавления/удаления:</strong> Десятичные номера (123456)</p>
                    <p><strong>Для декодирования:</strong> HEX номера с/без префикса</p>
                    <p><strong>Для работы с лимитными картами:</strong> Десятичные номера с дополнительными опциями</p>
                    <div class="format-example">
                        <strong>Пример ввода:</strong><br>
                        123456<br>
                        789012<br>
                        345678
                    </div>
                </div>
                <div class="help-section">
                    <h3><i class="fas fa-cogs"></i> Опции лимитных карт</h3>
                    <p>При работе с лимитными картами доступны следующие опции:</p>
                    <ul>
                        <li><strong>add_limit_card</strong> - Добавить лимитную карту</li>
                        <li><strong>del_limit_card</strong> - Удалить лимитную карту</li>
                        <li><strong>add_ident_card</strong> - Добавить идентификационную карту</li>
                        <li><strong>del_ident_card</strong> - Удалить идентификационную карту</li>
                        <li><strong>Двойная идентификация</strong> - Включить двойную идентификацию</li>
                    </ul>
                </div>
                ${isMobile ? `
                <div class="help-section">
                    <h3><i class="fas fa-qrcode"></i> Сканирование QR и штрих-кодов</h3>
                    <p>На мобильных устройствах вы можете сканировать QR-коды и штрих-коды с помощью встроенной камеры:</p>
                    <ul>
                        <li>Нажмите кнопку сканирования <i class="fas fa-qrcode"></i> в поле ввода</li>
                        <li>Наведите камеру на QR-код или штрих-код</li>
                        <li>После сканирования подтвердите результат или продолжите сканирование</li>
                        <li>Отсканированные данные будут добавлены в поле ввода</li>
                    </ul>
                    <p><strong>Поддерживаемые форматы:</strong> QR Code, CODE 128, CODE 39, EAN-13, UPC-A</p>
                </div>
                ` : ''}
                <div class="help-section">
                    <h3><i class="fas fa-chart-bar"></i> Статистика и время сэкономленное</h3>
                    <p>В разделе "Статистика использования" вы можете увидеть:</p>
                    <ul>
                        <li><strong>Всего обработано:</strong> Общее количество обработанных карт</li>
                        <li><strong>Количество заходов:</strong> Сколько раз вы открывали приложение</li>
                        <li><strong>Ошибок:</strong> Количество ошибок при обработке</li>
                        <li><strong>Последнее использование:</strong> Дата и время последней операции</li>
                        <li><strong>Времени сэкономлено:</strong> Расчет времени, которое вы сэкономили при использовании приложения.</li>
                    </ul>
                    <p>При обработке одной карты вручную требуется в среднем ~15 секунд. Дедова система позволяет обработать миллесекундно, значительно экономя ваше время.</p>
                </div>
                <div class="help-section">
                    <h3><i class="fas fa-download"></i> Установка приложения</h3>
                    <p>Установите приложение на ${isMobile ? 'главный экран' : 'рабочий стол'} для быстрого доступа без браузера.</p>
                    <div class="pwa-install-section">
                        <div class="pwa-install-info">
                            <p><strong>Преимущества установки:</strong></p>
                            <ul>
                                <li>Быстрый запуск с ${isMobile ? 'главного экрана' : 'рабочего стола'}</li>
                                <li>Работа без браузера</li>
                                <li>Офлайн доступ к функциям</li>
                                <li>Уведомления о статусе операций</li>
                            </ul>
                        </div>
                        <div class="pwa-install-buttons">
                            <button class="modal-btn primary-btn" onclick="tryInstallPWA()" id="install-pwa-btn">
                                <i class="fas fa-download"></i> Установить приложение
                            </button>
                            <div class="install-instructions" id="install-instructions" style="display: none;">
                                <p><small>Для установки используйте меню браузера: "Установить приложение" или "Добавить на главный экран"</small></p>
                            </div>
                        </div>
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
    
    const visits = visitCount || parseInt(localStorage.getItem('galileo-visits')) || 0;
    
    const totalProcessed = getProcessedCount();
    const timeSavedSeconds = totalProcessed * 23;
    const hours = Math.floor(timeSavedSeconds / 3600);
    const minutes = Math.floor((timeSavedSeconds % 3600) / 60);
    const seconds = timeSavedSeconds % 60;
    const timeSavedFormatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    const stats = {
        totalProcessed: totalProcessed,
        timeSaved: timeSavedFormatted,
        lastUsed: lastUsedFormatted,
        errorCount: parseInt(localStorage.getItem('galileo-errors') || '0'),
        visits: visits 
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
                    <div class="stat-value">${stats.visits}</div>
                    <div class="stat-label">Количество заходов</div>
                    <i class="fas fa-user stat-icon"></i>
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
                <div class="stat-card time-saved-card">
                    <div class="stat-value">${stats.timeSaved}</div>
                    <div class="stat-label">~Времени сэкономлено</div>
                    <i class="fas fa-clock stat-icon"></i>
                </div>
            </div>
            <div class="stats-actions">
                <button class="modal-btn secondary-btn" onclick="resetStats()">
                    <i class="fas fa-trash"></i> Сбросить статистику
                </button>
                <button class="modal-btn primary-btn" onclick="exportStats()">
                    <i class="fas fa-download"></i> Экспорт данных
                </button>
                <button class="modal-btn secondary-btn" onclick="importStats()">
                    <i class="fas fa-upload"></i> Импорт данных
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
    
    if (statsUpdateInterval) {
        clearInterval(statsUpdateInterval);
        statsUpdateInterval = null;
    }
    saveStats();
}


function showHistory() {
    const historyModal = document.getElementById('history-modal');
    const historyContent = document.querySelector('.history-content');
    
    const history = JSON.parse(localStorage.getItem('galileo-history') || '[]');
    
    if (historyContent) {
        renderHistoryContent(history);
    }
    
    if (historyModal) {
        historyModal.style.display = 'flex';
        historyModal.classList.add('show');
        
        const searchInput = document.getElementById('history-search');
        if (searchInput) {
            searchInput.value = '';
            updateSearchClearButton();
        }
        
        setTimeout(() => {
            addHistorySwipeListeners();
        }, 100);
    }
}

function renderHistoryContent(history) {
    const historyContent = document.querySelector('.history-content');
    
    if (history.length === 0) {
        historyContent.innerHTML = `
            <div class="empty-history">
                <i class="fas fa-history"></i>
                <h3>История пуста</h3>
                <p>Обработанные операции будут отображаться здесь</p>
                <button class="modal-btn secondary-btn" onclick="importHistory()" style="margin-top: 20px; max-width: 200px;">
                    <li class="fas fa-file-import"></i> Импорт истории
                </button>
            </div>
        `;
    } else {
        const historyHTML = history.map(item => {
            const date = new Date(item.timestamp);
            const formattedDate = date.toLocaleString('ru-RU');
            const actionNames = {
                'ADD': 'Добавление',
                'DELETE': 'Удаление', 
                'DECODE': 'Декодирование',
                'CARD_LIMIT': 'Лимитные карты'
            };
            
            const previewResults = item.results ? item.results.slice(0, 3).join('\n') : 'Нет данных';
            const hasMoreResults = item.results && item.results.length > 3;
            
            return `
                <div class="history-item enhanced" data-history-id="${item.id}">
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
                <button class="modal-btn secondary-btn" onclick="importHistory()">
                    <i class="fas fa-file-import"></i> Импорт истории
                </button>
                <button class="modal-btn secondary-btn" onclick="clearHistory()">
                    <i class="fas fa-trash"></i> Очистить историю
                </button>
            </div>
        `;
    }
}

function filterHistory() {
    try {
        const searchInput = document.getElementById('history-search');
        const searchTerm = searchInput.value.trim();
        
        updateSearchClearButton();
        
        if (!searchTerm) {
            const history = JSON.parse(localStorage.getItem('galileo-history') || '[]');
            renderHistoryContent(history);
            return;
        }
        
        const history = JSON.parse(localStorage.getItem('galileo-history') || '[]');
        const filteredHistory = history.filter(item => {
            if (!item.results || !Array.isArray(item.results)) {
                return false;
            }
            
            return item.results.some(result => {
                return searchInCardNumber(result, searchTerm);
            });
        });
        
        renderHistoryContent(filteredHistory);
        
        if (searchTerm && filteredHistory.length !== history.length) {
            const historyContent = document.querySelector('.history-content');
            if (filteredHistory.length === 0) {
                historyContent.innerHTML = `
                    <div class="empty-history">
                        <i class="fas fa-search"></i>
                        <h3>Ничего не найдено</h3>
                        <p>По запросу "${searchTerm}" результатов не найдено</p>
                        <button class="modal-btn secondary-btn" onclick="clearHistorySearch()">
                            Очистить поиск
                        </button>
                    </div>
                `;
            } else {
                const historyList = historyContent.querySelector('.history-list');
                if (historyList) {
                    const searchHeader = document.createElement('div');
                    searchHeader.className = 'search-results-header';
                    searchHeader.innerHTML = `
                        <i class="fas fa-search"></i> 
                        Найдено ${filteredHistory.length} из ${history.length} записей по запросу "${searchTerm}"
                    `;
                    historyContent.insertBefore(searchHeader, historyList);
                }
            }
        }
    } catch (error) {
        console.error('Error in filterHistory:', error);
        showNotification('Ошибка при поиске: ' + error.message, 'error');
    }
}


function searchInCardNumber(cardResult, searchTerm) {
    if (!cardResult || !searchTerm) {
        return false;
    }
    
    try {
        const cleanResult = cardResult.replace(/^(addkey|delkey|add_limit_card|del_limit_card|add_ident_card|del_ident_card)\s+/i, '').trim();
        const normalizedResult = cleanResult.toUpperCase();
        const normalizedSearch = searchTerm.toUpperCase();
        
        if (normalizedResult.includes(normalizedSearch)) {
            return true;
        }
        
        if (/^\d+$/.test(searchTerm)) {
            const decimalValue = parseInt(searchTerm, 10);
            if (!isNaN(decimalValue)) {
                const hexFromDecimal = decimalValue.toString(16).toUpperCase();
                if (normalizedResult.includes(hexFromDecimal)) {
                    return true;
                }
                if (hexFromDecimal.includes(normalizedSearch)) {
                    return true;
                }
            }
        }
        
        if (/^[0-9A-F]+$/i.test(searchTerm)) {
            const hexValue = parseInt(searchTerm, 16);
            if (!isNaN(hexValue)) {
                const decimalFromHex = hexValue.toString(10);
                if (cleanResult.includes(decimalFromHex)) {
                    return true;
                }
                if (decimalFromHex.includes(searchTerm)) {
                    return true;
                }
            }
        }
        
        return false;
    } catch (error) {
        console.warn('Error in searchInCardNumber:', error);
        return false;
    }
}

function clearHistorySearch() {
    const searchInput = document.getElementById('history-search');
    if (searchInput) {
        searchInput.value = '';
        filterHistory();
        searchInput.focus();
    }
}

function updateSearchClearButton() {
    const searchInput = document.getElementById('history-search');
    const clearBtn = document.querySelector('.search-clear-btn');
    
    if (searchInput && clearBtn) {
        if (searchInput.value.trim()) {
            clearBtn.style.display = 'flex';
        } else {
            clearBtn.style.display = 'none';
        }
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
            
            const cleanHex = card.replace(/^(addkey|delkey)\s+/i, '').trim();
            if (!/^[0-9A-Fa-f]+$/.test(cleanHex)) {
                errors.push(`Строка ${index + 1}: неверный HEX формат`);
            } else {
                valid.push(card);
            }
        } else {
            
            const cleanNumber = card.match(/\d+/);
            if (!cleanNumber) {
                errors.push(`Строка ${index + 1}: не найдены числовые данные`);
            } else if (!/^\d+$/.test(cleanNumber[0]) || parseInt(cleanNumber[0]) < 0) {
                errors.push(`Строка ${index + 1}: неверный десятичный формат`);
            } else {
                valid.push(cleanNumber[0]);
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
                
                return line.replace(/^(addkey|delkey)\s+/i, '').trim().toUpperCase();
            } else {
                
                const match = line.match(/\d+/);
                return match ? match[0] : line;
            }
        })
        .filter(line => line); 
    
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
        localStorage.removeItem('galileo-total-time');
        localStorage.removeItem('galileo-session-intervals');
        localStorage.removeItem('galileo-visits'); 
        sessionStartTime = null;
        currentPageLoadTime = Date.now();
        sessionIntervals = [];
        visitCount = 0; 
        updateStatus();
        closeStatsModal();
        showNotification('Статистика сброшена', 'success');
    }
}

function exportStats() {
    const stats = {
        totalProcessed: getProcessedCount(),
        sessionsCount: localStorage.getItem('galileo-sessions') || 0,
        lastUsed: localStorage.getItem('galileo-last-used') || null,
        errorCount: localStorage.getItem('galileo-errors') || 0,
        totalTime: localStorage.getItem('galileo-total-time') || 0,
        sessionIntervals: sessionIntervals,
        visits: visitCount || parseInt(localStorage.getItem('galileo-visits')) || 0,
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

function importStats() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = function(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const stats = JSON.parse(e.target.result);
                
                
                if (stats.totalProcessed !== undefined) {
                    updateStatus();
                }
                
                if (stats.sessionsCount !== undefined) {
                    localStorage.setItem('galileo-sessions', stats.sessionsCount);
                }
                
                if (stats.lastUsed !== undefined) {
                    localStorage.setItem('galileo-last-used', stats.lastUsed);
                }
                
                if (stats.errorCount !== undefined) {
                    localStorage.setItem('galileo-errors', stats.errorCount);
                }
                
                if (stats.totalTime !== undefined) {
                    localStorage.setItem('galileo-total-time', stats.totalTime);
                }
                
                if (stats.sessionIntervals !== undefined) {
                    sessionIntervals = stats.sessionIntervals;
                    localStorage.setItem('galileo-session-intervals', JSON.stringify(sessionIntervals));
                }
                
                if (stats.visits !== undefined) {
                    visitCount = stats.visits;
                    localStorage.setItem('galileo-visits', stats.visits);
                }
                
                showNotification('Статистика импортирована', 'success');
                closeStatsModal();
                showStats(); 
            } catch (error) {
                showNotification('Ошибка импорта статистики: ' + error.message, 'error');
            }
        };
        reader.readAsText(file);
    };
    
    input.click();
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
        }[item.action] || item.action || 'export';
        
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
        'DECODE': 'Декодирование',
        'CARD_LIMIT': 'Лимитные карты'
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

function importHistory() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = function(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const importData = JSON.parse(e.target.result);
                
                if (!importData.history || !Array.isArray(importData.history)) {
                    throw new Error('Неверный формат файла импорта');
                }
                
                
                const currentHistory = JSON.parse(localStorage.getItem('galileo-history') || '[]');
                
                
                const newHistory = [...importData.history, ...currentHistory];
                
                
                if (newHistory.length > 1000) {
                    newHistory.splice(1000);
                }
                
                
                localStorage.setItem('galileo-history', JSON.stringify(newHistory));
                
                showNotification(`Импортировано ${importData.history.length} записей`, 'success');
                closeHistoryModal();
                showHistory(); 
            } catch (error) {
                showNotification('Ошибка импорта истории: ' + error.message, 'error');
            }
        };
        reader.readAsText(file);
    };
    
    input.click();
}


function checkPWAInstall() {
    let deferredPrompt;
    
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        console.log('PWA installation prompt available');
    });
    
    window.installPWA = async function() {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                showNotification('Приложение установлено!', 'success');
            }
            deferredPrompt = null;
        } else {
            showNotification('Для установки используйте меню браузера', 'info');
        }
    };
}

function tryInstallPWA() {
    const installBtn = document.getElementById('install-pwa-btn');
    const instructionsDiv = document.getElementById('install-instructions');
    
    if (window.installPWA && typeof window.installPWA === 'function') {
        window.installPWA();
    } else {
        if (installBtn) {
            installBtn.style.display = 'none';
        }
        if (instructionsDiv) {
            instructionsDiv.style.display = 'block';
        }
        showNotification('Для установки используйте меню браузера: "Установить приложение"', 'info');
    }
}


function openQrScanner() {
    const scannerModal = document.getElementById('qr-scanner-modal');
    if (scannerModal) {
        scannerModal.style.display = 'flex';
        scannerModal.classList.add('show');
        
        
        initializeQrScanner();
    }
}

function closeQrScanner() {
    const scannerModal = document.getElementById('qr-scanner-modal');
    if (scannerModal) {
        scannerModal.style.display = 'none';
        scannerModal.classList.remove('show');
    }
    
    
    if (window.html5QrCode) {
        window.html5QrCode.stop().catch(() => {});
    }
}

function handleQrScanResult(decodedText) {
    if (!decodedText) return;
    
    
    scannedCard = decodedText;
    
    
    const confirmBtn = document.getElementById('confirm-scan-btn');
    const continueBtn = document.getElementById('continue-scan-btn');
    
    if (confirmBtn) confirmBtn.style.display = 'flex';
    if (continueBtn) continueBtn.style.display = 'flex';
    
    
    const resultsDiv = document.getElementById('qr-reader-results');
    if (resultsDiv) {
        resultsDiv.innerHTML = `
            <div class="scan-result">
                <h4>Отсканировано:</h4>
                <p>${decodedText}</p>
            </div>
        `;
    }
}

function confirmScan() {
    if (!scannedCard) return;
    
    
    const cardInput = document.getElementById('card-input');
    if (cardInput) {
        const currentValue = cardInput.value.trim();
        const newValue = currentValue ? `${currentValue}\n${scannedCard}` : scannedCard;
        cardInput.value = newValue;
        cardInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
    
    
    scannedCard = null;
    
    
    closeQrScanner();
    showNotification('Карта добавлена в поле ввода', 'success');
}

function continueScanning() {
    if (!scannedCard) return;
    
    
    const cardInput = document.getElementById('card-input');
    if (cardInput) {
        const currentValue = cardInput.value.trim();
        const newValue = currentValue ? `${currentValue}\n${scannedCard}` : scannedCard;
        cardInput.value = newValue;
        cardInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
    
    
    const confirmBtn = document.getElementById('confirm-scan-btn');
    const continueBtn = document.getElementById('continue-scan-btn');
    
    if (confirmBtn) confirmBtn.style.display = 'none';
    if (continueBtn) continueBtn.style.display = 'none';
    
    
    const resultsDiv = document.getElementById('qr-reader-results');
    if (resultsDiv) resultsDiv.innerHTML = '';
    
    
    showNotification('Карта добавлена в фоне', 'success');
    
    
    scannedCard = null;
    
    
    setTimeout(() => {
        startQrScanner();
    }, 500);
}

function initializeQrScanner() {
    startQrScanner();
}

function startQrScanner() {
    const qrReader = document.getElementById('qr-reader');
    if (!qrReader) return;
    
    
    qrReader.innerHTML = '';
    
    
    const resultsDiv = document.getElementById('qr-reader-results');
    if (resultsDiv) resultsDiv.innerHTML = '';
    
    
    window.html5QrCode = new Html5Qrcode("qr-reader");
    
    const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.CODE_93,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.ITF,
            Html5QrcodeSupportedFormats.MAXICODE,
            Html5QrcodeSupportedFormats.RSS_14,
            Html5QrcodeSupportedFormats.RSS_EXPANDED,
            Html5QrcodeSupportedFormats.PDF_417,
            Html5QrcodeSupportedFormats.AZTEC,
            Html5QrcodeSupportedFormats.DATA_MATRIX
        ]
    };

    navigator.mediaDevices.enumerateDevices()
        .then(devices => {
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            let selectedDevice = null;
            const environmentCameras = videoDevices.filter(device =>
                /environment|back|rear/i.test(device.label)
            );
            if (environmentCameras.length > 0) {
                selectedDevice = environmentCameras[0];
            } else if (videoDevices.length > 0) {
                selectedDevice = videoDevices[0];
            }

            let isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
            let cameraConfig;
            if (isIOS) {
                cameraConfig = { facingMode: { exact: 'environment' } };
            } else if (selectedDevice) {
                cameraConfig = { deviceId: { exact: selectedDevice.deviceId } };
            } else {
                cameraConfig = { facingMode: 'environment' };
            }

            return html5QrCode.start(
                cameraConfig,
                config,
                (decodedText, decodedResult) => {
                    handleQrScanResult(decodedText);
                },
                async (errorMessage) => {
                    if (window.Tesseract && window.tesseractLoaded) {
                        try {
                            const video = document.querySelector('#qr-reader video');
                            if (video) {
                                const canvas = document.createElement('canvas');
                                canvas.width = video.videoWidth;
                                canvas.height = video.videoHeight;
                                const ctx = canvas.getContext('2d');
                                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                                const { data: { text } } = await Tesseract.recognize(canvas, 'eng', { tessedit_char_whitelist: '0123456789' });
                                const digits = text.replace(/\D/g, '');
                                if (digits.length >= 4) {
                                    handleQrScanResult(digits);
                                    showNotification('Распознаны цифры с камеры: ' + digits, 'success');
                                }
                            }
                        } catch (ocrErr) {}
                    }
                }
            );
        })
        .catch(err => {
            return html5QrCode.start(
                { facingMode: 'environment' },
                config,
                (decodedText, decodedResult) => {
                    handleQrScanResult(decodedText);
                },
                async (errorMessage) => {
                    if (window.Tesseract && window.tesseractLoaded) {
                        try {
                            const video = document.querySelector('#qr-reader video');
                            if (video) {
                                const canvas = document.createElement('canvas');
                                canvas.width = video.videoWidth;
                                canvas.height = video.videoHeight;
                                const ctx = canvas.getContext('2d');
                                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                                const { data: { text } } = await Tesseract.recognize(canvas, 'eng', { tessedit_char_whitelist: '0123456789' });
                                const digits = text.replace(/\D/g, '');
                                if (digits.length >= 4) {
                                    handleQrScanResult(digits);
                                    showNotification('Распознаны цифры с камеры: ' + digits, 'success');
                                }
                            }
                        } catch (ocrErr) {}
                    }
                }
            );
        })
        .catch(err => {
            showNotification('Ошибка запуска сканера: ' + err, 'error');
            closeQrScanner();
        });
}

function switchCamera(deviceId) {
    if (window.html5QrCode) {
        window.html5QrCode.stop().then(() => {
            const config = {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
                formatsToSupport: [
                    Html5QrcodeSupportedFormats.QR_CODE,
                    Html5QrcodeSupportedFormats.CODE_128,
                ]
            };
            
            window.html5QrCode.start(
                { deviceId: { exact: deviceId } },
                config,
                (decodedText, decodedResult) => {
                    handleQrScanResult(decodedText);
                },
                (errorMessage) => {
                    
                }
            ).catch(err => {
                showNotification('Ошибка переключения камеры: ' + err, 'error');
            });
        }).catch(() => {
            showNotification('Ошибка остановки сканера', 'error');
        });
    }
}

function addCameraControls(videoDevices) {
    const existingControls = document.querySelector('.camera-controls');
    if (existingControls) {
        existingControls.remove();
    }
    
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'camera-controls';
    controlsContainer.style.cssText = `
        position: absolute;
        top: 10px;
        left: 10px;
        right: 10px;
        z-index: 1000;
        display: flex;
        gap: 10px;
        justify-content: center;
        background: rgba(0, 0, 0, 0.5);
        padding: 10px;
        border-radius: 8px;
    `;
    
    if (videoDevices.length > 1) {
        const cameraSelect = document.createElement('select');
        cameraSelect.id = 'camera-select';
        cameraSelect.style.cssText = `
            padding: 8px 12px;
            border-radius: 4px;
            border: 1px solid #ccc;
            background: rgba(255, 255, 255, 0.9);
            color: #333;
            font-size: 14px;
            cursor: pointer;
        `;
        
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Выберите камеру';
        defaultOption.disabled = true;
        defaultOption.selected = true;
        cameraSelect.appendChild(defaultOption);
        
        videoDevices.forEach((device, index) => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.textContent = device.label || `Камера ${index + 1}`;
            cameraSelect.appendChild(option);
        });
        
        cameraSelect.addEventListener('change', function() {
            if (this.value) {
                switchCamera(this.value);
            }
        });
        
        controlsContainer.appendChild(cameraSelect);
    }
    
    const modalContent = document.querySelector('.qr-scanner-modal .modal-content');
    if (modalContent) {
        modalContent.style.position = 'relative';
        modalContent.prepend(controlsContainer);
    }
}

function initializeMobileInterface() {
    const isMobile = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const scanBtn = document.getElementById('scan-btn');
    
    if (scanBtn) {
        if (isMobile && hasCamera()) {
            scanBtn.style.display = 'flex';
        } else {
            scanBtn.style.display = 'none';
        }
    }
    
    updateFooterForDevice(isMobile);
    
    window.addEventListener('resize', function() {
        const isMobileNow = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const scanBtn = document.getElementById('scan-btn');
        
        if (scanBtn) {
            if (isMobileNow && hasCamera()) {
                scanBtn.style.display = 'flex';
            } else {
                scanBtn.style.display = 'none';
            }
        }
        updateFooterForDevice(isMobileNow);
    });
}

function updateFooterForDevice(isMobile) {
    const footerSection = document.querySelector('.footer-section:last-child');
    if (!footerSection) return;
    
    if (isMobile) {
        footerSection.innerHTML = `
            <h4>Подсказка</h4>
            <ul>
                <li>📱 Тап - выбор</li>
                <li>✋ Долгий тап - копировать</li>
                <li>👆 Свайп ← - удалить</li>
                <li>🔄 Потянуть ↓ - обновить</li>
                <li>📷 Сканирование - QR/Barcode</li>
            </ul>
        `;
    } else {
        footerSection.innerHTML = `
            <h4>Горячие клавиши</h4>
            <ul>
                <li><kbd>Ctrl</kbd> + <kbd>1</kbd> - Добавить</li>
                <li><kbd>Ctrl</kbd> + <kbd>2</kbd> - Удалить</li>
                <li><kbd>Ctrl</kbd> + <kbd>3</kbd> - Декодер</li>
                <li><kbd>Ctrl</kbd> + <kbd>4</kbd> - Работа с лимитными картами</li>
                <li><kbd>Ctrl</kbd> + <kbd>Enter</kbd> - Обработать</li>
                <li><kbd>Esc</kbd> - Закрыть окно</li>
            </ul>
        `;
    }
}

function initializeMobileGestures() {
    const isMobile = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (!isMobile) return;
    
    initializeButtonSwipes();
    initializeLongPress();
    initializePullToRefresh();
    initializeHistorySwipes();
}

function initializeButtonSwipes() {
    const actionButtons = document.querySelectorAll('.action-btn');
    
    actionButtons.forEach(button => {
        let startX = 0;
        let startY = 0;
        
        button.addEventListener('touchstart', function(e) {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        }, { passive: true });
        
        button.addEventListener('touchend', function(e) {
            if (!e.changedTouches) return;
            
            const endX = e.changedTouches[0].clientX;
            const endY = e.changedTouches[0].clientY;
            
            const deltaX = endX - startX;
            const deltaY = endY - startY;
            
            if (deltaX > 50 && Math.abs(deltaY) < 100) {
                e.preventDefault();
                button.style.transform = 'translateX(10px)';
                setTimeout(() => {
                    button.style.transform = '';
                    button.click();
                }, 150);
            }
        }, { passive: false });
    });
}

function initializeLongPress() {
    let longPressTimer;
    const longPressDuration = 800; 
    
    document.addEventListener('touchstart', function(e) {
        const resultOutput = document.getElementById('result-output');
        if (resultOutput && e.target === resultOutput) {
            longPressTimer = setTimeout(() => {
                if (resultOutput.value.trim()) {
                    copyToClipboard();
                    if (navigator.vibrate) {
                        navigator.vibrate(100);
                    }
                    resultOutput.style.background = '#e6f3ff';
                    setTimeout(() => {
                        resultOutput.style.background = '';
                    }, 300);
                }
            }, longPressDuration);
        }
    }, { passive: true });
    
    document.addEventListener('touchend', function() {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
    }, { passive: true });
    
    document.addEventListener('touchmove', function() {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
    }, { passive: true });
}

function initializePullToRefresh() {
    let startY = 0;
    let currentY = 0;
    let isPulling = false;
    const pullThreshold = 80;
    
    const container = document.querySelector('.container');
    if (!container) return;
    
    document.addEventListener('touchstart', function(e) {
        if (window.scrollY === 0) {
            startY = e.touches[0].clientY;
            isPulling = false;
        }
    }, { passive: true });
    
    document.addEventListener('touchmove', function(e) {
        if (window.scrollY === 0 && startY) {
            currentY = e.touches[0].clientY;
            const pullDistance = currentY - startY;
            
            if (pullDistance > 0 && pullDistance < pullThreshold * 2) {
                isPulling = true;
                const opacity = Math.min(pullDistance / pullThreshold, 1);
                container.style.transform = `translateY(${pullDistance * 0.3}px)`;
                container.style.opacity = 1 - (opacity * 0.1);
            }
        }
    }, { passive: true });
    
    document.addEventListener('touchend', function() {
        if (isPulling && currentY - startY > pullThreshold) {
            showNotification('Обновление страницы...', 'info');
            setTimeout(() => {
                window.location.reload();
            }, 500);
        }
        
        container.style.transform = '';
        container.style.opacity = '';
        startY = 0;
        currentY = 0;
        isPulling = false;
    }, { passive: true });
}

function initializeHistorySwipes() {
}

function addHistorySwipeListeners() {
    const historyItems = document.querySelectorAll('.history-item');
    
    historyItems.forEach(item => {
        let startX = 0;
        let currentX = 0;
        let isSwipingLeft = false;
        
        item.addEventListener('touchstart', function(e) {
            startX = e.touches[0].clientX;
            isSwipingLeft = false;
        }, { passive: true });
        
        item.addEventListener('touchmove', function(e) {
            currentX = e.touches[0].clientX;
            const deltaX = currentX - startX;
            
            if (deltaX < -50) { 
                isSwipingLeft = true;
                item.style.transform = `translateX(${Math.max(deltaX, -100)}px)`;
                item.style.opacity = 1 + (deltaX / 200); 
            }
        }, { passive: true });
        
        item.addEventListener('touchend', function() {
            if (isSwipingLeft && Math.abs(currentX - startX) > 80) {
                const itemId = item.dataset.historyId;
                if (itemId) {
                    item.style.transform = '';
                    item.style.opacity = '';
                    
                    if (confirm('Удалить эту запись из истории?')) {
                        item.style.transform = 'translateX(-100%)';
                        item.style.opacity = '0';
                        setTimeout(() => {
                            const history = JSON.parse(localStorage.getItem('galileo-history') || '[]');
                            const filteredHistory = history.filter(h => h.id !== itemId);
                            localStorage.setItem('galileo-history', JSON.stringify(filteredHistory));
                            showHistory();
                            showNotification('Запись удалена', 'success');
                        }, 300);
                    }
                }
            } else {
                item.style.transform = '';
                item.style.opacity = '';
            }
            
            startX = 0;
            currentX = 0;
            isSwipingLeft = false;
        }, { passive: true });
    });
}




function hasCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        return Promise.resolve(false);
    }
    
    return navigator.mediaDevices.enumerateDevices()
        .then(devices => devices.some(device => device.kind === 'videoinput'))
        .catch(() => false);
}

function processAddLimitCard(cardNumber, addLimitCard, delLimitCard, addIdentCard, delIdentCard, dualIdent) {
    try {
        const num = parseInt(cardNumber.trim());
        if (isNaN(num) || num < 0) {
            throw new Error(`Неверный номер: ${cardNumber}`);
        }
        
        const results = [];
        
        if (num < 1001 || num > 2147483647) {
            const adjustedNumber = num - 4294967296;
            
            if (addLimitCard) {
                if (dualIdent) {
                    results.push(`add_limit_card ${adjustedNumber},1`);
                } else {
                    results.push(`add_limit_card ${adjustedNumber}`);
                }
            }
            
            if (delLimitCard) {
                results.push(`del_limit_card ${adjustedNumber}`);
            }
            
            if (addIdentCard) {
                results.push(`add_ident_card ${adjustedNumber}`);
            }
            
            if (delIdentCard) {
                results.push(`del_ident_card ${adjustedNumber}`);
            }
        } else {
            if (addLimitCard) {
                if (dualIdent) {
                    results.push(`add_limit_card ${num},1`);
                } else {
                    results.push(`add_limit_card ${num}`);
                }
            }
            
            if (delLimitCard) {
                results.push(`del_limit_card ${num}`);
            }
            
            if (addIdentCard) {
                results.push(`add_ident_card ${num}`);
            }
            
            if (delIdentCard) {
                results.push(`del_ident_card ${num}`);
            }
        }
        
        return results;
    } catch (e) {
        throw new Error(`Ошибка обработки: ${cardNumber}`);
    }
}

