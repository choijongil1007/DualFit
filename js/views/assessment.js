
import { Store } from '../store.js';
import { callGemini } from '../api.js';
import { showLoader, hideLoader, showToast } from '../utils.js';
import { ASSESSMENT_CONFIG } from '../config.js';
import { navigateTo } from '../app.js';

let currentDealId = null;
let pendingScoreChange = null;

export function renderAssessment(container, dealId) {
    currentDealId = dealId;
    const deal = Store.getDeal(dealId);
    if (!deal) return;

    container.innerHTML = `
        <div class="mb-8 border-b border-gray-100 pb-6 flex justify-between items-center">
            <div>
                <h2 class="text-xl font-bold text-gray-900 mb-1">Assessment</h2>
                <p class="text-gray-500 text-sm">Deal 적합성 평가</p>
            </div>
            <div class="flex gap-3">
                <button id="btn-refresh-ai" class="bg-white text-gray-600 hover:text-gray-900 border border-gray-200 hover:border-gray-300 px-4 py-2 rounded-full text-sm font-medium transition-all shadow-sm flex items-center gap-2 btn-pill">
                    <i class="fa-solid fa-arrows-rotate text-xs"></i> Refresh AI
                </button>
                <button id="btn-calc-result" class="bg-gray-900 text-white px-5 py-2 rounded-full hover:bg-black text-sm font-semibold shadow-lg shadow-gray-900/10 flex items-center gap-2 btn-pill transition-transform active:scale-95">
                    <i class="fa-solid fa-chart-pie"></i> Calculate
                </button>
            </div>
        </div>

        <div class="space-y-10 pb-10">
            <!-- Biz Fit Box -->
            <div class="bg-white border border-gray-200 rounded-3xl p-6 md:p-8 shadow-sm relative">
                <!-- Decorative bg container (Clipped here to allow Tooltips to overflow the main card) -->
                <div class="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
                    <div class="absolute top-0 right-0 w-64 h-64 bg-purple-50 rounded-bl-full -mr-10 -mt-10 opacity-50"></div>
                </div>

                <div class="relative z-10 mb-8 pb-4 border-b border-gray-100 flex items-center gap-4">
                    <div class="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shadow-sm">
                        <i class="fa-solid fa-briefcase text-lg"></i>
                    </div>
                    <div>
                        <h3 class="text-xl font-bold text-gray-900">Biz Fit Analysis</h3>
                        <p class="text-gray-500 text-sm mt-0.5 font-medium">BANT (Budget, Authority, Need, Timeline)</p>
                    </div>
                </div>
                
                <!-- 2x2 Grid for Biz Categories -->
                <div class="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6">
                    ${renderScoreSection('biz', deal)}
                </div>
            </div>

            <!-- Tech Fit Box -->
            <div class="bg-white border border-gray-200 rounded-3xl p-6 md:p-8 shadow-sm relative">
                <!-- Decorative bg container -->
                <div class="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
                    <div class="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-bl-full -mr-10 -mt-10 opacity-50"></div>
                </div>

                <div class="relative z-10 mb-8 pb-4 border-b border-gray-100 flex items-center gap-4">
                    <div class="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-sm">
                        <i class="fa-solid fa-server text-lg"></i>
                    </div>
                    <div>
                        <h3 class="text-xl font-bold text-gray-900">Tech Fit Analysis</h3>
                        <p class="text-gray-500 text-sm mt-0.5 font-medium">Requirements, Architecture, Data, Operations</p>
                    </div>
                </div>

                <!-- 2x2 Grid for Tech Categories -->
                <div class="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6">
                    ${renderScoreSection('tech', deal)}
                </div>
            </div>
        </div>

        <!-- Score Confirmation Modal (Premium White) -->
        <div id="score-confirm-modal" class="fixed inset-0 z-[120] hidden flex items-center justify-center p-4">
            <div class="absolute inset-0 bg-gray-900/20 backdrop-blur-sm modal-backdrop transition-opacity"></div>
            <div class="relative w-full max-w-sm bg-white rounded-3xl shadow-modal p-8 animate-modal-in text-center">
                
                <div class="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-5 text-amber-500 border border-amber-100">
                    <i class="fa-solid fa-triangle-exclamation text-xl"></i>
                </div>
                
                <h3 class="text-lg font-bold mb-2 text-gray-900">Score Check</h3>
                <p id="score-confirm-msg" class="text-gray-500 text-sm mb-8 leading-relaxed whitespace-pre-line">
                    Significant deviation from AI recommendation.<br>Confirm this score?
                </p>
                
                <div class="flex gap-3 justify-center">
                    <button type="button" class="btn-close-confirm-modal px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-sm font-semibold transition-colors btn-pill">Cancel</button>
                    <button type="button" id="btn-force-score" class="px-5 py-2.5 bg-gray-900 hover:bg-black text-white rounded-full text-sm font-semibold shadow-lg shadow-gray-900/10 transition-colors btn-pill">Confirm</button>
                </div>
            </div>
        </div>
    `;

    attachEvents(deal);
}

function renderScoreSection(type, deal) {
    const config = ASSESSMENT_CONFIG[type];
    const recs = deal.assessment.recommendations ? deal.assessment.recommendations[type] : null;

    return config.categories.map(cat => {
        // AI Rec for this category
        const aiData = recs ? recs[cat.id] : null;
        
        let aiIndicator = '';
        if (aiData) {
            const confMap = { 'High': '높음', 'Medium': '보통', 'Low': '낮음' };
            const confKo = confMap[aiData.confidence] || '보통';
            
            aiIndicator = `
                <div class="has-tooltip relative group inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full text-xs font-semibold cursor-help border border-indigo-100 ml-auto transition-colors hover:bg-indigo-100">
                    <i class="fa-solid fa-wand-magic-sparkles text-indigo-500"></i>
                    <span>AI: ${aiData.score}</span>
                    <div class="tooltip text-left p-3 min-w-[260px] pointer-events-none">
                        <div class="font-bold text-emerald-300 mb-1 pb-1 border-b border-gray-700">AI 추천 점수: ${aiData.score}점. 신뢰도: ${confKo}</div>
                        <div class="text-xs text-gray-300 leading-relaxed mt-1">${aiData.reason}</div>
                    </div>
                </div>
            `;
        } else {
            aiIndicator = `<span class="text-xs text-gray-300 ml-auto font-medium">AI Ready</span>`;
        }

        const itemsHtml = cat.items.map((itemLabel, idx) => {
            const itemId = `${cat.id}_${idx}`;
            const currentVal = deal.assessment[type].scores[itemId] || 0;
            
            return `
                <div class="mb-4 last:mb-0">
                    <div class="flex justify-between items-center mb-2">
                        <label class="text-xs font-semibold text-gray-600">${itemLabel}</label>
                        <span class="text-xs font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded">${currentVal} / 5</span>
                    </div>
                    <input type="range" min="0" max="5" step="1" value="${currentVal}" 
                        class="score-slider w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-gray-900 hover:accent-primary-600 transition-all"
                        data-type="${type}" data-id="${itemId}">
                    <div class="flex justify-between px-1 mt-1">
                        <span class="text-[10px] text-gray-400">0</span>
                        <span class="text-[10px] text-gray-400">5</span>
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="bg-gray-50/50 rounded-2xl p-5 border border-gray-100 hover:border-gray-200 transition-colors">
                <div class="flex items-center mb-4">
                    <h4 class="font-bold text-gray-800 text-sm tracking-tight">${cat.label}</h4>
                    ${aiIndicator}
                </div>
                ${itemsHtml}
            </div>
        `;
    }).join('');
}

function attachEvents(deal) {
    // 1. Sliders
    document.querySelectorAll('.score-slider').forEach(slider => {
        slider.addEventListener('input', (e) => {
            const type = e.target.dataset.type;
            const id = e.target.dataset.id;
            const val = parseInt(e.target.value);
            
            // UI Update immediately
            e.target.previousElementSibling.querySelector('span').innerText = `${val} / 5`;
            
            // Store update
            deal.assessment[type].scores[id] = val;
            Store.saveDeal(deal);
        });
        
        // Deviation Check on change (optional logic could go here)
    });

    // 2. Refresh AI
    const refreshBtn = document.getElementById('btn-refresh-ai');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            generateAssessmentAI(deal);
        });
    }

    // 3. Calculate
    const calcBtn = document.getElementById('btn-calc-result');
    if (calcBtn) {
        calcBtn.addEventListener('click', () => {
            // Check for missing scores?
            navigateTo('summary', { id: deal.id });
        });
    }

    // 4. Modal
    const modal = document.getElementById('score-confirm-modal');
    const toggleModal = (show) => modal.classList.toggle('hidden', !show);
    
    modal.querySelectorAll('.btn-close-confirm-modal').forEach(btn => {
        btn.addEventListener('click', () => toggleModal(false));
    });
}

async function generateAssessmentAI(deal) {
    showLoader("AI 분석 중...");
    
    // Prepare context from Discovery
    const discoverySummary = Object.entries(deal.discovery).map(([stage, data]) => {
        return `${stage.toUpperCase()}: ${data.result ? JSON.stringify(data.result) : 'No analysis'}`;
    }).join('\n');

    const prompt = `
Role: B2B Sales Coach.
Goal: Evaluate Deal Fit (Biz & Tech) based on Discovery data.
Language: Korean (Example: "예산 부족 가능성이 있음").

Data:
${discoverySummary}

Task:
Provide a score (1-5) and confidence (High/Medium/Low) for each category.
Categories:
- Biz: budget, authority, need, timeline
- Tech: req, arch, data, ops

JSON Output Format:
{
  "biz": {
    "budget": { "score": 3, "confidence": "Medium", "reason": "한글 설명..." },
    ...
  },
  "tech": { ... }
}

Important:
- "reason" MUST be in Korean.
- "score" is integer 1-5.
- "confidence" is High, Medium, or Low.
`;

    try {
        const result = await callGemini(prompt);
        if (result && result.biz && result.tech) {
            deal.assessment.recommendations = result;
            Store.saveDeal(deal);
            renderAssessment(document.getElementById('tab-content'), deal.id); // Re-render tab content
            showToast('AI Recommendations Updated', 'success');
        } else {
            throw new Error('Invalid AI response');
        }
    } catch (e) {
        console.error(e);
        showToast('AI Update Failed', 'error');
    } finally {
        hideLoader();
    }
}
