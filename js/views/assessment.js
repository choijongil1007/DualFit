
import { Store } from '../store.js';
import { callGemini } from '../api.js';
import { showLoader, hideLoader, showToast } from '../utils.js';
import { ASSESSMENT_CONFIG } from '../config.js';

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
            <div class="bg-white border border-gray-200 rounded-3xl p-6 md:p-8 shadow-sm relative overflow-hidden">
                <!-- Decorative bg -->
                <div class="absolute top-0 right-0 w-64 h-64 bg-purple-50 rounded-bl-full -mr-10 -mt-10 opacity-50 pointer-events-none"></div>

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
            <div class="bg-white border border-gray-200 rounded-3xl p-6 md:p-8 shadow-sm relative overflow-hidden">
                <!-- Decorative bg -->
                <div class="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-bl-full -mr-10 -mt-10 opacity-50 pointer-events-none"></div>

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
                    <button type="button" class="btn-close-score-modal px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-sm font-semibold transition-colors btn-pill">Cancel</button>
                    <button type="button" id="btn-confirm-score" class="px-5 py-2.5 bg-gray-900 hover:bg-black text-white rounded-full text-sm font-semibold transition-colors btn-pill shadow-lg shadow-gray-900/10">Confirm</button>
                </div>
            </div>
        </div>
    `;

    attachEvents(deal);
    runAIRecommendations(deal, false);
}

function renderScoreSection(type, deal) {
    const config = ASSESSMENT_CONFIG[type];
    const scores = deal.assessment[type].scores;
    const weights = deal.assessment[type].weights;

    // Removed outer div wrapper to allow parent grid control
    return config.categories.map(cat => `
        <div class="bg-white border border-gray-100 rounded-2xl p-6 shadow-card hover:shadow-md transition-all duration-200 h-full flex flex-col">
            <div class="flex justify-between items-center mb-5 pb-3 border-b border-gray-50">
                <h4 class="font-bold text-gray-800 text-base">${cat.label}</h4>
                <div class="flex items-center gap-2 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                    <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Weight %</span>
                    <input type="number" class="weight-input w-10 text-center bg-transparent text-xs font-bold text-gray-700 focus:outline-none" 
                        data-type="${type}" data-cat="${cat.id}" value="${weights[cat.id]}" min="0" max="100">
                </div>
            </div>
            
            <div class="space-y-5 flex-grow">
                ${cat.items.map((item, idx) => {
                    const itemId = `${cat.id}_${idx}`;
                    const val = scores[itemId] || 0;
                    return `
                        <div class="flex justify-between items-center group">
                            <label class="text-sm font-medium text-gray-600 max-w-[60%] leading-tight">${item}</label>
                            <div class="flex items-center gap-3">
                                <!-- AI Recommendation -->
                                <div class="ai-recommendation has-tooltip relative w-6 h-6 flex items-center justify-center rounded-full bg-gray-50 text-gray-300 cursor-help hover:bg-blue-50 hover:text-blue-500 transition-colors" id="ai-rec-${type}-${itemId}">
                                    <i class="fa-solid fa-robot text-xs"></i>
                                    <span class="tooltip">AI analyzing...</span>
                                </div>
                                
                                <div class="relative">
                                    <select class="score-select appearance-none bg-white border border-gray-200 rounded-lg pl-3 pr-8 py-1.5 text-sm font-medium text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all cursor-pointer hover:border-gray-300"
                                        data-type="${type}" data-item-id="${itemId}">
                                        <option value="0" disabled ${val == 0 ? 'selected' : ''}>-</option>
                                        <option value="1" ${val == 1 ? 'selected' : ''}>1</option>
                                        <option value="2" ${val == 2 ? 'selected' : ''}>2</option>
                                        <option value="3" ${val == 3 ? 'selected' : ''}>3</option>
                                        <option value="4" ${val == 4 ? 'selected' : ''}>4</option>
                                        <option value="5" ${val == 5 ? 'selected' : ''}>5</option>
                                    </select>
                                    <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                                        <i class="fa-solid fa-chevron-down text-[10px]"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `).join('');
}

async function runAIRecommendations(deal, forceRefresh = false) {
    // Stop if we have data and not forced to refresh.
    if (!forceRefresh && deal.assessment.recommendations) {
        applyAIRecommendations(deal.assessment.recommendations);
        return;
    }

    const evidence = Object.values(deal.discovery)
        .filter(s => s.result && s.result.evidenceSummary)
        .map((s, i) => `Stage ${i+1}: ${s.result.evidenceSummary}`)
        .join('\n');

    if (!evidence.trim()) return;

    document.querySelectorAll('.ai-recommendation i').forEach(icon => {
        icon.className = 'fa-solid fa-circle-notch fa-spin text-primary-500';
    });

    if (forceRefresh) showToast("AI 추천 점수를 계산 중입니다...", "info");

    try {
        // Coupling Logic Rules are explicitly added to the prompt
        const prompt = `
            Task: B2B Deal Scoring recommendation (1-5 scale).
            Language: Korean (Must output strictly in Korean).
            Deal: ${deal.dealName}
            Evidence: ${evidence}
            
            Apply "Coupling Logic" to ensure consistency between Evidence and Scores:
            1. **Pain vs Need**: If Pain is described as weak or unclear, 'Need' score MUST be Low (1-2).
            2. **Champion vs Authority**: If no decision maker or champion is mentioned, 'Authority' score MUST be Low (1-2).
            3. **Complexity vs Tech Fit**: If environment is complex/legacy, Tech Fit scores (Integration/Arch) should be conservative.
            4. **Timeline**: If timeline is unrealistic or very tight, 'Timeline' score should be Low (risk is high).
            
            Return JSON with recommended scores and brief reason for ALL items below.
            REQUIRED KEYS:
            - budget_0, budget_1, authority_0, authority_1, need_0, need_1, timeline_0, timeline_1
            - req_0, req_1, arch_0, arch_1, data_0, data_1, ops_0, ops_1
            
            Format: {"items": {"budget_0": {"score": 4, "confidence": "High", "reason": "reason..."}, "req_0": { ... }, ... }}
        `;

        const result = await callGemini(prompt);
        
        if (result && result.items) {
            deal.assessment.recommendations = result.items;
            Store.saveDeal(deal);
            applyAIRecommendations(result.items);
            if (forceRefresh) showToast("AI 추천이 완료되었습니다.", "success");
        }

    } catch (e) {
        console.error(e);
        document.querySelectorAll('.ai-recommendation i').forEach(icon => {
            icon.className = 'fa-solid fa-exclamation text-red-400';
        });
    }
}

function applyAIRecommendations(items) {
    const keyMap = {
        'budget_0': 'biz-budget_0', 'budget_1': 'biz-budget_1',
        'authority_0': 'biz-authority_0', 'authority_1': 'biz-authority_1',
        'need_0': 'biz-need_0', 'need_1': 'biz-need_1',
        'timeline_0': 'biz-timeline_0', 'timeline_1': 'biz-timeline_1',
        'req_0': 'tech-req_0', 'req_1': 'tech-req_1',
        'arch_0': 'tech-arch_0', 'arch_1': 'tech-arch_1',
        'data_0': 'tech-data_0', 'data_1': 'tech-data_1',
        'ops_0': 'tech-ops_0', 'ops_1': 'tech-ops_1',
    };

    for (const [jsonKey, uiKeyPart] of Object.entries(keyMap)) {
        const rec = items[jsonKey];
        const [type, itemId] = uiKeyPart.split('-'); 
        const el = document.getElementById(`ai-rec-${type}-${itemId}`);
        
        if (el && rec) {
            const icon = el.querySelector('i');
            icon.className = 'fa-solid fa-robot'; 
            
            if (rec.score !== "N/A") {
                icon.classList.add('text-primary-600');
                el.classList.add('bg-primary-50');
                el.dataset.recScore = rec.score; 
            }

            const confColor = rec.confidence === 'High' ? 'text-green-400' : rec.confidence === 'Medium' ? 'text-yellow-400' : 'text-red-400';
            el.querySelector('.tooltip').innerHTML = `
                <div class="text-left">
                    <div class="font-bold mb-1 text-white">AI 추천: ${rec.score} <span class="${confColor} text-[10px]">(${rec.confidence})</span></div>
                    <div class="leading-tight text-gray-300 text-xs font-normal">${rec.reason}</div>
                </div>
            `;
        }
    }
}

function attachEvents(deal) {
    document.getElementById('btn-refresh-ai').addEventListener('click', () => {
        runAIRecommendations(deal, true);
    });

    const modal = document.getElementById('score-confirm-modal');
    const toggleModal = (show) => modal.classList.toggle('hidden', !show);
    
    modal.querySelectorAll('.btn-close-score-modal').forEach(btn => btn.addEventListener('click', () => {
        toggleModal(false);
        if (pendingScoreChange) {
            pendingScoreChange.target.value = pendingScoreChange.oldValue;
            pendingScoreChange = null;
        }
    }));

    document.getElementById('btn-confirm-score').addEventListener('click', () => {
        if (pendingScoreChange) {
            const { target, type, itemId, newValue } = pendingScoreChange;
            deal.assessment[type].scores[itemId] = newValue;
            Store.saveDeal(deal);
            pendingScoreChange = null; 
            toggleModal(false);
        }
    });

    document.querySelectorAll('.weight-input').forEach(input => {
        input.addEventListener('change', (e) => {
            const type = e.target.dataset.type;
            const cat = e.target.dataset.cat;
            deal.assessment[type].weights[cat] = parseInt(e.target.value);
            Store.saveDeal(deal);
        });
    });

    document.querySelectorAll('.score-select').forEach(select => {
        select.addEventListener('focus', () => { select.dataset.previous = select.value; });

        select.addEventListener('change', (e) => {
            const type = e.target.dataset.type;
            const itemId = e.target.dataset.itemId;
            const val = parseInt(e.target.value);
            const oldValue = select.dataset.previous || 0;
            
            const recContainer = document.getElementById(`ai-rec-${type}-${itemId}`);
            if (recContainer && recContainer.dataset.recScore) {
                const recScore = parseInt(recContainer.dataset.recScore);
                // UI Coupling Logic: Warn if deviation >= 2
                if (Math.abs(recScore - val) >= 2) {
                    pendingScoreChange = { target: e.target, type, itemId, newValue: val, oldValue: oldValue };
                    document.getElementById('score-confirm-msg').innerHTML = `AI는 <strong class="text-gray-900">${recScore}점</strong>을 추천했습니다.<br>선택하신 <strong class="text-gray-900">${val}점</strong>으로 확정하시겠습니까?`;
                    toggleModal(true);
                    return;
                }
            }

            deal.assessment[type].scores[itemId] = val;
            Store.saveDeal(deal);
            select.dataset.previous = val;
        });
    });

    document.getElementById('btn-calc-result').addEventListener('click', () => {
        import('../app.js').then(module => {
            module.navigateTo('summary', { id: deal.id });
        });
    });
}
