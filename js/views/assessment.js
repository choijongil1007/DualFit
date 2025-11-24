
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

    // Calculate initial weight sums for display
    const bizWeightSum = getWeightSum(deal, 'biz');
    const techWeightSum = getWeightSum(deal, 'tech');

    container.innerHTML = `
        <div class="mb-6 flex justify-between items-center">
            <div>
                <h2 class="text-lg font-bold text-gray-900">Assessment</h2>
                <p class="text-gray-500 text-sm mt-0.5">딜 적합성(Fit) 평가</p>
            </div>
            <div class="flex gap-3">
                <button id="btn-refresh-ai" class="bg-white text-gray-700 hover:text-gray-900 border border-gray-300 hover:border-gray-400 px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm flex items-center gap-2">
                    <i class="fa-solid fa-wand-magic-sparkles text-xs text-indigo-500"></i> AI 추천 점수
                </button>
                <button id="btn-calc-result" class="bg-gray-900 text-white px-5 py-2 rounded-lg hover:bg-black text-sm font-medium shadow-md flex items-center gap-2 transition-transform active:scale-95">
                    <i class="fa-solid fa-check"></i> 저장 및 결과 보기
                </button>
            </div>
        </div>

        <div class="space-y-6 pb-10">
            <!-- Biz Fit Box -->
            <div class="bg-white border border-gray-200 rounded-xl shadow-card overflow-hidden relative transition-all duration-200 hover:shadow-md">
                <!-- Header (Discovery Style) -->
                <div class="p-5 flex justify-between items-center bg-purple-50/40 border-b border-purple-100">
                    <div class="flex items-center gap-4">
                        <div class="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-lg shadow-sm border border-purple-100">
                            <i class="fa-solid fa-briefcase text-sm"></i>
                        </div>
                        <div>
                            <div class="flex items-center gap-2">
                                <h3 class="font-bold text-gray-900 text-base tracking-tight">비즈니스 적합성 (Biz Fit)</h3>
                                <span id="biz-weight-display" class="text-[10px] font-semibold px-2 py-0.5 rounded border ${getWeightColorClass(bizWeightSum)}">
                                    가중치: <span class="val">${bizWeightSum}</span>%
                                </span>
                            </div>
                            <p class="text-gray-500 text-xs font-medium mt-0.5">BANT (예산, 권한, 니즈, 일정)</p>
                        </div>
                    </div>
                </div>

                <div class="p-6 md:p-8 bg-white">
                    <!-- Scoring Guide -->
                    <div class="relative z-10 flex items-center justify-end gap-5 mb-6 text-xs text-gray-500 font-medium">
                         <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-gray-200"></span> 1: 매우 미흡</span>
                         <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-gray-400"></span> 3: 보통</span>
                         <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-indigo-600"></span> 5: 매우 우수</span>
                    </div>
                    
                    <!-- 2x2 Grid for Biz Categories -->
                    <div class="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6">
                        ${renderScoreSection('biz', deal)}
                    </div>
                </div>
            </div>

            <!-- Tech Fit Box -->
            <div class="bg-white border border-gray-200 rounded-xl shadow-card overflow-hidden relative transition-all duration-200 hover:shadow-md">
                <!-- Header (Discovery Style) -->
                <div class="p-5 flex justify-between items-center bg-blue-50/40 border-b border-blue-100">
                    <div class="flex items-center gap-4">
                        <div class="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg shadow-sm border border-blue-100">
                            <i class="fa-solid fa-server text-sm"></i>
                        </div>
                        <div>
                            <div class="flex items-center gap-2">
                                <h3 class="font-bold text-gray-900 text-base tracking-tight">기술 적합성 (Tech Fit)</h3>
                                <span id="tech-weight-display" class="text-[10px] font-semibold px-2 py-0.5 rounded border ${getWeightColorClass(techWeightSum)}">
                                    가중치: <span class="val">${techWeightSum}</span>%
                                </span>
                            </div>
                            <p class="text-gray-500 text-xs font-medium mt-0.5">요구사항, 아키텍처, 데이터, 운영</p>
                        </div>
                    </div>
                </div>

                <div class="p-6 md:p-8 bg-white">
                    <!-- Scoring Guide -->
                    <div class="relative z-10 flex items-center justify-end gap-5 mb-6 text-xs text-gray-500 font-medium">
                         <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-gray-200"></span> 1: 매우 미흡</span>
                         <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-gray-400"></span> 3: 보통</span>
                         <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-indigo-600"></span> 5: 매우 우수</span>
                    </div>

                    <!-- 2x2 Grid for Tech Categories -->
                    <div class="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6">
                        ${renderScoreSection('tech', deal)}
                    </div>
                </div>
            </div>
        </div>

        <!-- Score Confirmation Modal (Alert Style - Black) -->
        <div id="score-confirm-modal" class="fixed inset-0 z-[120] hidden flex items-center justify-center p-4">
            <div class="absolute inset-0 bg-gray-900/30 backdrop-blur-sm modal-backdrop transition-opacity"></div>
            <div class="relative w-full max-w-sm bg-gray-900 rounded-xl shadow-modal p-8 animate-modal-in text-center border border-gray-800">
                
                <div class="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-5 text-amber-500 border border-gray-700">
                    <i class="fa-solid fa-triangle-exclamation text-xl"></i>
                </div>
                
                <h3 class="text-lg font-bold mb-2 text-white">점수 확인</h3>
                <p id="score-confirm-msg" class="text-gray-300 text-sm mb-8 leading-relaxed whitespace-pre-line">
                    AI 추천 점수와 차이가 큽니다.<br>이 점수로 확정하시겠습니까?
                </p>
                
                <div class="flex gap-3 justify-center">
                    <button type="button" class="btn-close-confirm-modal px-5 py-2.5 bg-gray-800 border border-gray-700 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium transition-colors">취소</button>
                    <button type="button" id="btn-force-score" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-md transition-colors">확인</button>
                </div>
            </div>
        </div>
    `;

    attachEvents(deal);
}

function getWeightSum(deal, type) {
    const weights = deal.assessment[type].weights;
    if (!weights) return 0;
    return Object.values(weights).reduce((a, b) => a + (parseInt(b) || 0), 0);
}

function getWeightColorClass(sum) {
    return sum === 100 
        ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
        : 'bg-red-50 border-red-200 text-red-600';
}

function renderScoreSection(type, deal) {
    const config = ASSESSMENT_CONFIG[type];
    const recs = deal.assessment.recommendations ? deal.assessment.recommendations[type] : null;

    return config.categories.map(cat => {
        // AI Recommendations for this Category
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
                    <div class="has-tooltip relative group inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded text-[10px] font-bold cursor-help border border-indigo-100 transition-colors hover:bg-indigo-100 ml-2">
                        <i class="fa-solid fa-wand-magic-sparkles text-[9px]"></i>
                        <span>${aiScore}</span>
                        <div class="tooltip text-left p-3 min-w-[240px] pointer-events-none bg-gray-800 text-white rounded-lg shadow-xl">
                            <div class="font-bold text-emerald-300 mb-1 pb-1 border-b border-gray-600 text-xs">AI 추천 점수: ${aiScore} (신뢰도: ${confKo})</div>
                            <div class="text-xs text-gray-300 leading-relaxed mt-1">${aiItem.reason}</div>
                        </div>
                    </div>
                `;
            }

            return `
                <div class="mb-5 last:mb-0">
                    <div class="flex justify-between items-center mb-2">
                        <div class="flex items-center">
                            <label class="text-xs font-semibold text-gray-700">${itemLabel}</label>
                            ${aiIndicator}
                        </div>
                        <span class="text-xs font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">${displayVal} / 5</span>
                    </div>
                    <input type="range" min="1" max="5" step="1" value="${displayVal}" 
                        class="score-slider w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-900 hover:accent-indigo-600 transition-all"
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

        // Weight Input
        const currentWeight = deal.assessment[type].weights[cat.id] || cat.defaultWeight || 0;

        return `
            <div class="bg-gray-50/50 rounded-xl p-5 border border-gray-100 hover:border-gray-200 transition-colors">
                <div class="flex justify-between items-center mb-4">
                    <h4 class="font-bold text-gray-800 text-sm">${cat.label}</h4>
                    <div class="flex items-center bg-white border border-gray-200 rounded-md px-2 py-1 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
                        <span class="text-[10px] text-gray-500 font-semibold mr-1.5">가중치</span>
                        <input type="number" 
                            class="weight-input w-10 text-right text-xs font-bold text-gray-900 bg-transparent border-none p-0 focus:ring-0" 
                            value="${currentWeight}" 
                            data-type="${type}" 
                            data-cat="${cat.id}"
                            min="0" max="100"
                            onclick="this.select()">
                        <span class="text-[10px] text-gray-400 font-bold ml-0.5">%</span>
                    </div>
                </div>
                ${itemsHtml}
            </div>
        `;
    }).join('');
}

function attachEvents(deal) {
    const sliders = document.querySelectorAll('.score-slider');
    const weightInputs = document.querySelectorAll('.weight-input');
    const modal = document.getElementById('score-confirm-modal');
    const confirmBtn = document.getElementById('btn-force-score');
    
    // 1. Slider Events
    sliders.forEach(slider => {
        slider.addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            e.target.previousElementSibling.querySelector('span:last-child').innerText = `${val} / 5`;
        });

        slider.addEventListener('change', (e) => {
            const type = e.target.dataset.type;
            const itemId = e.target.dataset.id;
            const catId = e.target.dataset.cat;
            const idx = parseInt(e.target.dataset.idx);
            const newVal = parseInt(e.target.value);

            const aiCatData = deal.assessment.recommendations?.[type]?.[catId];
            const aiItemRec = (aiCatData && Array.isArray(aiCatData)) ? aiCatData[idx] : null;
            
            if (aiItemRec && Math.abs(newVal - aiItemRec.score) >= 2) {
                pendingScoreChange = { type, id: itemId, val: newVal };
                pendingSliderElement = e.target;
                
                const msg = document.getElementById('score-confirm-msg');
                msg.innerHTML = `AI 추천 점수(${aiItemRec.score}점)와 차이가 큽니다.<br>${newVal}점으로 확정하시겠습니까?`;
                
                modal.classList.remove('hidden');
            } else {
                deal.assessment[type].scores[itemId] = newVal;
                Store.saveDeal(deal);
            }
        });
    });

    // 2. Weight Input Events & Live UI Update
    const updateWeightUI = (type) => {
        const sum = getWeightSum(deal, type);
        const display = document.getElementById(`${type}-weight-display`);
        if (display) {
            const valSpan = display.querySelector('.val');
            valSpan.innerText = sum;
            display.className = `text-[10px] font-semibold px-2 py-0.5 rounded border transition-colors ${getWeightColorClass(sum)}`;
        }
    };

    weightInputs.forEach(input => {
        // Handle input change (UI Update + Data Save)
        const handleWeightChange = (e) => {
            const type = e.target.dataset.type;
            const catId = e.target.dataset.cat;
            let val = parseInt(e.target.value);
            
            if (isNaN(val) || val < 0) val = 0;
            if (val > 100) val = 100;
            
            // Visual Update in input
            e.target.value = val;
            
            // Data Update
            if (!deal.assessment[type].weights) deal.assessment[type].weights = {};
            deal.assessment[type].weights[catId] = val;
            
            Store.saveDeal(deal);
            
            // Update Total Indicator
            updateWeightUI(type);
        };

        // Listen to both input (typing) and change (blur/enter) for responsiveness
        input.addEventListener('input', handleWeightChange);
        input.addEventListener('change', handleWeightChange);
    });

    // 3. Refresh AI
    const refreshBtn = document.getElementById('btn-refresh-ai');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            generateAssessmentAI(deal);
        });
    }

    // 4. Calculate / Save & Complete (With Validation)
    const calcBtn = document.getElementById('btn-calc-result');
    if (calcBtn) {
        calcBtn.addEventListener('click', () => {
            const bizSum = getWeightSum(deal, 'biz');
            const techSum = getWeightSum(deal, 'tech');

            if (bizSum !== 100) {
                showToast(`Biz Fit 가중치 합계는 100%여야 합니다. (현재: ${bizSum}%)`, 'error');
                return;
            }

            if (techSum !== 100) {
                showToast(`Tech Fit 가중치 합계는 100%여야 합니다. (현재: ${techSum}%)`, 'error');
                return;
            }

            // If valid, proceed
            navigateTo('summary', { id: deal.id });
        });
    }

    // 5. Modal Events
    const closeModal = () => {
        modal.classList.add('hidden');
        pendingScoreChange = null;
        pendingSliderElement = null;
    };

    modal.querySelectorAll('.btn-close-confirm-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            if (pendingScoreChange && pendingSliderElement) {
                const savedVal = deal.assessment[pendingScoreChange.type].scores[pendingScoreChange.id] || 0;
                const revertVal = savedVal === 0 ? 1 : savedVal;
                
                pendingSliderElement.value = revertVal;
                pendingSliderElement.previousElementSibling.querySelector('span:last-child').innerText = `${revertVal} / 5`;
            }
            closeModal();
        });
    });

    confirmBtn.addEventListener('click', () => {
        if (pendingScoreChange) {
            deal.assessment[pendingScoreChange.type].scores[pendingScoreChange.id] = pendingScoreChange.val;
            Store.saveDeal(deal);
            showToast('점수가 저장되었습니다.', 'success');
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
            showToast('AI 추천 점수가 업데이트되었습니다.', 'success');
        } else {
            throw new Error('Invalid AI response');
        }
    } catch (e) {
        console.error(e);
        showToast('AI 분석 업데이트 실패', 'error');
    } finally {
        hideLoader();
    }
}
