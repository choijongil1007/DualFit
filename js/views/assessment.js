
import { Store } from '../store.js';
import { callGemini } from '../api.js';
import { showLoader, hideLoader, showToast } from '../utils.js';
import { ASSESSMENT_CONFIG } from '../config.js';
import { navigateTo } from '../app.js';

let currentDealId = null;
let pendingScoreChange = null;
let pendingSliderElement = null;

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
                    <i class="fa-solid fa-wand-magic-sparkles text-xs text-indigo-500"></i> AI 추천 점수
                </button>
                <button id="btn-calc-result" class="bg-gray-900 text-white px-5 py-2 rounded-full hover:bg-black text-sm font-semibold shadow-lg shadow-gray-900/10 flex items-center gap-2 btn-pill transition-transform active:scale-95">
                    <i class="fa-solid fa-check"></i> 저장 & 완료
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

                <div class="relative z-10 mb-6 pb-4 border-b border-gray-100 flex items-center gap-4">
                    <div class="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shadow-sm">
                        <i class="fa-solid fa-briefcase text-lg"></i>
                    </div>
                    <div>
                        <h3 class="text-xl font-bold text-gray-900">Biz Fit Analysis</h3>
                        <p class="text-gray-500 text-sm mt-0.5 font-medium">BANT (Budget, Authority, Need, Timeline)</p>
                    </div>
                </div>

                <!-- Scoring Guide -->
                <div class="relative z-10 flex items-center justify-end gap-4 mb-6 text-xs text-gray-500">
                     <span class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-gray-300"></span> 1점: 매우 미흡</span>
                     <span class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-gray-400"></span> 3점: 보통</span>
                     <span class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-primary-500"></span> 5점: 매우 적합</span>
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

                <div class="relative z-10 mb-6 pb-4 border-b border-gray-100 flex items-center gap-4">
                    <div class="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-sm">
                        <i class="fa-solid fa-server text-lg"></i>
                    </div>
                    <div>
                        <h3 class="text-xl font-bold text-gray-900">Tech Fit Analysis</h3>
                        <p class="text-gray-500 text-sm mt-0.5 font-medium">Requirements, Architecture, Data, Operations</p>
                    </div>
                </div>

                <!-- Scoring Guide -->
                <div class="relative z-10 flex items-center justify-end gap-4 mb-6 text-xs text-gray-500">
                     <span class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-gray-300"></span> 1점: 매우 미흡</span>
                     <span class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-gray-400"></span> 3점: 보통</span>
                     <span class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-primary-500"></span> 5점: 매우 적합</span>
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
                
                <h3 class="text-lg font-bold mb-2 text-gray-900">점수 확인</h3>
                <p id="score-confirm-msg" class="text-gray-500 text-sm mb-8 leading-relaxed whitespace-pre-line">
                    AI 추천 점수와 차이가 큽니다.<br>이 점수로 설정하시겠습니까?
                </p>
                
                <div class="flex gap-3 justify-center">
                    <button type="button" class="btn-close-confirm-modal px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-sm font-semibold transition-colors btn-pill">취소</button>
                    <button type="button" id="btn-force-score" class="px-5 py-2.5 bg-gray-900 hover:bg-black text-white rounded-full text-sm font-semibold shadow-lg shadow-gray-900/10 transition-colors btn-pill">확인</button>
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
        // AI Recommendations for this Category (Should be an Array corresponding to items)
        const aiCategoryData = recs ? recs[cat.id] : null;

        const itemsHtml = cat.items.map((itemLabel, idx) => {
            const itemId = `${cat.id}_${idx}`;
            // Default to 1 if no score is set yet, since range is 1-5
            const currentVal = deal.assessment[type].scores[itemId] || 0;
            const displayVal = currentVal === 0 ? 1 : currentVal;
            
            // AI Data for this specific item (Array index based)
            let aiIndicator = '';
            let aiScore = null;

            if (aiCategoryData && Array.isArray(aiCategoryData) && aiCategoryData[idx]) {
                const aiItem = aiCategoryData[idx];
                aiScore = aiItem.score;
                const confMap = { 'High': '높음', 'Medium': '보통', 'Low': '낮음' };
                const confKo = confMap[aiItem.confidence] || '보통';

                aiIndicator = `
                    <div class="has-tooltip relative group inline-flex items-center gap-1 bg-gray-100 text-gray-900 px-1.5 py-0.5 rounded-md text-[10px] font-bold cursor-help border border-gray-200 transition-colors hover:bg-gray-200 ml-2">
                        <i class="fa-solid fa-wand-magic-sparkles text-[9px] text-gray-600"></i>
                        <span>${aiScore}</span>
                        <div class="tooltip text-left p-3 min-w-[240px] pointer-events-none">
                            <div class="font-bold text-emerald-300 mb-1 pb-1 border-b border-gray-700">AI 추천 점수: ${aiScore}점. 신뢰도: ${confKo}</div>
                            <div class="text-xs text-gray-300 leading-relaxed mt-1">${aiItem.reason}</div>
                        </div>
                    </div>
                `;
            }

            return `
                <div class="mb-4 last:mb-0">
                    <div class="flex justify-between items-center mb-2">
                        <div class="flex items-center">
                            <label class="text-xs font-semibold text-gray-600">${itemLabel}</label>
                            ${aiIndicator}
                        </div>
                        <span class="text-xs font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">${displayVal} / 5</span>
                    </div>
                    <input type="range" min="1" max="5" step="1" value="${displayVal}" 
                        class="score-slider w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-gray-900 hover:accent-primary-600 transition-all"
                        data-type="${type}" data-id="${itemId}" data-cat="${cat.id}" data-idx="${idx}">
                    <div class="flex justify-between px-1 mt-1 text-[10px] text-gray-400 font-medium">
                        <span class="w-3 text-center">1</span>
                        <span class="w-3 text-center">2</span>
                        <span class="w-3 text-center">3</span>
                        <span class="w-3 text-center">4</span>
                        <span class="w-3 text-center">5</span>
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="bg-gray-50/50 rounded-2xl p-5 border border-gray-100 hover:border-gray-200 transition-colors">
                <div class="flex items-center mb-4">
                    <h4 class="font-bold text-gray-800 text-sm tracking-tight">${cat.label}</h4>
                </div>
                ${itemsHtml}
            </div>
        `;
    }).join('');
}

function attachEvents(deal) {
    const sliders = document.querySelectorAll('.score-slider');
    const modal = document.getElementById('score-confirm-modal');
    const confirmBtn = document.getElementById('btn-force-score');
    
    // 1. Slider Events
    sliders.forEach(slider => {
        // 'input' event: Update UI immediately while dragging
        slider.addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            e.target.previousElementSibling.querySelector('span:last-child').innerText = `${val} / 5`;
        });

        // 'change' event: Handle Deviation Logic & Saving
        slider.addEventListener('change', (e) => {
            const type = e.target.dataset.type;
            const itemId = e.target.dataset.id;
            const catId = e.target.dataset.cat;
            const idx = parseInt(e.target.dataset.idx);
            const newVal = parseInt(e.target.value);

            // Get AI Recommendation for this SPECIFIC item
            const aiCatData = deal.assessment.recommendations?.[type]?.[catId];
            const aiItemRec = (aiCatData && Array.isArray(aiCatData)) ? aiCatData[idx] : null;
            
            // Check Deviation (If AI score exists and diff >= 2)
            if (aiItemRec && Math.abs(newVal - aiItemRec.score) >= 2) {
                // Trigger Warning
                pendingScoreChange = { type, id: itemId, val: newVal };
                pendingSliderElement = e.target;
                
                const msg = document.getElementById('score-confirm-msg');
                msg.innerHTML = `AI 추천 점수(${aiItemRec.score}점)와 2점 이상 차이가 납니다.<br>현재 입력하신 ${newVal}점으로 설정하시겠습니까?`;
                
                modal.classList.remove('hidden');
            } else {
                // Safe to save immediately
                deal.assessment[type].scores[itemId] = newVal;
                Store.saveDeal(deal);
            }
        });
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
            navigateTo('summary', { id: deal.id });
        });
    }

    // 4. Modal Events
    const closeModal = () => {
        modal.classList.add('hidden');
        pendingScoreChange = null;
        pendingSliderElement = null;
    };

    // Cancel: Revert Slider to previous saved value
    modal.querySelectorAll('.btn-close-confirm-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            if (pendingScoreChange && pendingSliderElement) {
                // Revert visual slider
                const savedVal = deal.assessment[pendingScoreChange.type].scores[pendingScoreChange.id] || 0;
                const revertVal = savedVal === 0 ? 1 : savedVal;
                
                pendingSliderElement.value = revertVal;
                pendingSliderElement.previousElementSibling.querySelector('span:last-child').innerText = `${revertVal} / 5`;
            }
            closeModal();
        });
    });

    // Confirm: Save the risky score
    confirmBtn.addEventListener('click', () => {
        if (pendingScoreChange) {
            deal.assessment[pendingScoreChange.type].scores[pendingScoreChange.id] = pendingScoreChange.val;
            Store.saveDeal(deal);
            showToast('점수가 반영되었습니다.', 'success');
        }
        closeModal();
    });
}

async function generateAssessmentAI(deal) {
    showLoader("AI 분석 중...");
    
    // Prepare context from Discovery
    const discoverySummary = Object.entries(deal.discovery).map(([stage, data]) => {
        return `${stage.toUpperCase()}: ${data.result ? JSON.stringify(data.result) : 'No analysis'}`;
    }).join('\n');

    // Build structure explanation dynamically
    let structureHint = "";
    ['biz', 'tech'].forEach(type => {
        structureHint += `[${type.toUpperCase()}]\n`;
        ASSESSMENT_CONFIG[type].categories.forEach(cat => {
            structureHint += ` - ${cat.id}: [${cat.items.join(', ')}]\n`;
        });
    });

    const prompt = `
Role: B2B Sales Coach.
Goal: Evaluate Deal Fit (Biz & Tech) based on Discovery data.
Language: Korean.

Data:
${discoverySummary}

Items to Evaluate (Structure):
${structureHint}

Task:
For each category, return an ARRAY of objects. Each object corresponds to an item in the list above, in the exact same order.
Provide a score (1-5), confidence (High/Medium/Low), and a short Korean reason for EACH item.

JSON Output Format:
{
  "biz": {
    "budget": [
       { "score": 3, "confidence": "High", "reason": "Reason for item 1..." },
       { "score": 2, "confidence": "Low", "reason": "Reason for item 2..." }
    ],
    "authority": [ ... ]
  },
  "tech": {
     "req": [ ... ],
     ...
  }
}
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
