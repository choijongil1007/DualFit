
export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function showLoader(text = "AI 계산 중...") {
    const loader = document.getElementById('global-loader');
    const textEl = document.getElementById('loader-text');
    if (loader && textEl) {
        textEl.innerText = text;
        loader.classList.remove('hidden');
    }
}

export function hideLoader() {
    const loader = document.getElementById('global-loader');
    if (loader) loader.classList.add('hidden');
}

/**
 * 버튼 자체에 로딩 상태를 적용합니다 (화면 차단 없음)
 * @param {HTMLElement} btn - 버튼 엘리먼트
 * @param {boolean} isLoading - 로딩 중 여부
 * @param {string} loadingText - 로딩 중 표시할 텍스트
 */
export function setButtonLoading(btn, isLoading, loadingText = "Analyzing...") {
    if (!btn) return;

    if (isLoading) {
        // 기존 너비 고정 (레이아웃 흔들림 방지)
        btn.style.width = `${btn.offsetWidth}px`;
        btn.dataset.originalContent = btn.innerHTML;
        btn.disabled = true;
        btn.classList.add('cursor-not-allowed', 'opacity-80', 'bg-gray-700');
        btn.classList.remove('bg-gray-900', 'hover:bg-black', 'shadow-lg');
        
        btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin text-white"></i> <span class="ml-2">${loadingText}</span>`;
    } else {
        btn.disabled = false;
        btn.style.width = ''; // 너비 초기화
        btn.classList.remove('cursor-not-allowed', 'opacity-80', 'bg-gray-700');
        btn.classList.add('bg-gray-900', 'hover:bg-black', 'shadow-lg');
        
        if (btn.dataset.originalContent) {
            btn.innerHTML = btn.dataset.originalContent;
        }
    }
}

export function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    
    // Alert창 배경색 검정색으로 통일
    const bgClass = 'bg-gray-900 border border-gray-800';
    
    // 아이콘 색상으로 구분
    let iconHtml = '';
    if (type === 'success') {
        iconHtml = '<i class="fa-solid fa-circle-check text-emerald-400 text-lg"></i>';
    } else if (type === 'error') {
        iconHtml = '<i class="fa-solid fa-triangle-exclamation text-red-400 text-lg"></i>';
    } else {
        iconHtml = '<i class="fa-solid fa-circle-info text-blue-400 text-lg"></i>';
    }
    
    toast.className = `${bgClass} text-white px-5 py-3 rounded-full shadow-2xl text-sm font-medium transform transition-all duration-300 translate-y-10 opacity-0 flex items-center gap-3 backdrop-blur-md`;
    
    toast.innerHTML = `${iconHtml} <span>${message}</span>`;
    
    container.appendChild(toast);
    
    requestAnimationFrame(() => {
        toast.classList.remove('translate-y-10', 'opacity-0');
    });

    setTimeout(() => {
        toast.classList.add('translate-y-10', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

export function cleanJSONString(str) {
    if (!str) return "";
    
    // 1. Try to extract content inside ```json ... ``` or ``` ... ```
    const jsonBlockMatch = str.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (jsonBlockMatch && jsonBlockMatch[1]) {
        return jsonBlockMatch[1].trim();
    }
    
    // 2. Fallback: remove all backticks if no clear block structure found
    let cleaned = str.replace(/```json/gi, '').replace(/```/g, '');
    return cleaned.trim();
}

export function renderMarkdownLike(text) {
    // Very basic markdown-like rendering for descriptions
    if (!text) return '';
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
               .replace(/\n/g, '<br>');
}
