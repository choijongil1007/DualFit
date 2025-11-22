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

export function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    
    const colors = type === 'error' ? 'bg-red-500' : type === 'success' ? 'bg-green-600' : 'bg-gray-800';
    
    toast.className = `${colors} text-white px-4 py-3 rounded shadow-lg text-sm transform transition-all duration-300 translate-y-10 opacity-0 flex items-center gap-2`;
    toast.innerHTML = `<span>${message}</span>`;
    
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
    // Remove markdown code blocks if present
    return str.replace(/```json/g, '').replace(/```/g, '').trim();
}

export function renderMarkdownLike(text) {
    // Very basic markdown-like rendering for descriptions
    if (!text) return '';
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
               .replace(/\n/g, '<br>');
}