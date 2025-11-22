
import { Store } from '../store.js';
import { callGemini } from '../api.js';
import { showLoader, hideLoader, showToast } from '../utils.js';
import { ASSESSMENT_CONFIG } from '../config.js';

let currentDealId = null;
let pendingScoreChange = null; // To store state for modal confirmation

export function renderAssessment(container, dealId) {
    currentDealId = dealId;
    const deal = Store.getDeal(dealId);
    if (!deal) return;

    container.innerHTML = `
        <div class="mb-6 border-b pb-4 flex justify-between items-center">
            <div>
                <h2 class="text-2xl font-bold">Assessment</h2>
                <p class="text-gray-500 text-sm">Discovery 근거를 기반으로 적합성을 판단합니다.</p>
            </div>
             <button id="btn-calc-result" class="bg-black text-white px-4 py-2 rounded hover:bg-zinc-800 text-sm shadow-sm">
                <i class="fa-solid fa-calculator mr-2"></i> 결과 계산 (Score)
            </button>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Biz Fit -->
            <div>
                <h3 class="text-xl font-bold mb-4 text-purple-800">Biz Fit (BANT)</h3>
                ${renderScoreSection('biz', deal)}
            </div>

            <!-- Tech Fit -->
            <div>
                <h3 class="text-xl font-bold mb-4 text-blue-800">Tech Fit</h3>
                ${renderScoreSection('tech', deal)}
            </div>
        </div>

        <!-- Score Confirmation Modal (Modern Black Style) -->
        <div id="score-confirm-modal" class="fixed inset-0 z-[120] hidden flex items-center justify-center p-4">
            <div class="absolute inset-0 bg-black/60 backdrop-blur-sm modal-backdrop transition-opacity"></div>
            <div class="relative w-full max-w-sm bg-zinc-900 text-white border border-white/10 rounded-xl shadow-2xl p-6 animate-modal-in text-center">
                <button type="button" class="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors btn-close-score-modal">
                    <i class="fa-solid fa-xmark text-lg"></i>
                </button>
                
                <div class="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-4 text-yellow-500">
                    <i class="fa-solid fa-triangle-exclamation text-xl"></i>
                </div>
                
                <h3 class="text-lg font-bold mb-2">점수 확인</h3>
                <p id="score-confirm-msg" class="text-gray-400 text-sm mb-6 whitespace-pre-line">
                    AI 추천 점수와 차이가 큽니다.<br>이 점수로 확정하시겠습니까?
                </p>
                
                <div class="flex gap-3 justify-center">
                    <button type="button" class="btn-close-score-modal px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-medium transition-colors">취소</button>
                    <button type="button" id="btn-confirm-score" class="px-4 py-2 bg-white text-black hover:bg-gray-200 rounded-lg text-sm font-bold transition-colors">확인</button>
                </div>
            </div>
        </div>
    `;

    attachEvents(deal);
    
    // Trigger AI background check
    runAIRecommendations(deal);
}

function renderScoreSection(type, deal) {
    const config = ASSESSMENT_CONFIG[type];
    const scores = deal.assessment[type].scores;
    const weights = deal.assessment[type].weights;

    return `
        <div class="space-y-4">
            ${config.categories.map(cat => `
                <div class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm relative group">
                    <div class="flex justify-between items-center mb-3">
                        <h4 class="font-bold text-gray-800">${cat.label}</h4>
                        <div class="flex items-center gap-2">
                            <span class="text-xs text-gray-500">가중치(%)</span>
                            <input type="number" class="weight-input w-12 text-center border rounded text-xs p-1" 
                                data-type="${type}" data-cat="${cat.id}" value="${weights[cat.id]}" min="0" max="100">
                        </div>
                    </div>
                    
                    <div class="space-y-3">
                        ${cat.items.map((item, idx) => {
                            const itemId = `${cat.id}_${idx}`;
                            const val = scores[itemId] || 0;
                            return `
                                <div class="flex justify-between items-center assessment-row" data-id="${itemId}" data-label="${item}">
                                    <label class="text-sm text-gray-600">${item}</label>
                                    <div class="flex items-center gap-2">
                                        <!-- AI Recommendation Tooltip Placeholder -->
                                        <div class="ai-recommendation has-tooltip relative w-6 h-6 flex items-center justify-center text-gray-300 cursor-help" id="ai-rec-${type}-${itemId}">
                                            <i class="fa-solid fa-robot text-sm"></i>
                                            <span class="tooltip top">AI 분석 대기중...</span>
                                        </div>
                                        
                                        <select class="score-select border border-gray-300 rounded px-2 py-1 text-sm outline-none focus:border-black"
                                            data-type="${type}" data-item-id="${itemId}">
                                            <option value="0" disabled ${val == 0 ? 'selected' : ''}>-</option>
                                            <option value="1" ${val == 1 ? 'selected' : ''}>1 (매우 미흡)</option>
                                            <option value="2" ${val == 2 ? 'selected' : ''}>2 (미흡)</option>
                                            <option value="3" ${val == 3 ? 'selected' : ''}>3 (보통)</option>
                                            <option value="4" ${val == 4 ? 'selected' : ''}>4 (우수)</option>
                                            <option value="5" ${val == 5 ? 'selected' : ''}>5 (매우 우수)</option>
                                        </select>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

async function runAIRecommendations(deal) {
    // ... (Same as previous) ...
    const evidence = Object.values(deal.discovery)
        .filter(s => s.result && s.result.evidenceSummary)
        .map((s, i) => `Stage ${i+1}: ${s.result.evidenceSummary}`)
        .join('\n');

    if (!evidence.trim()) {
        document.querySelectorAll('.ai-recommendation .tooltip').forEach(el => el.innerText = "Discovery 정보 부족");
        return;
    }

    document.querySelectorAll('.ai-recommendation i').forEach(icon => icon.classList.add('animate-pulse', 'text-blue-300'));

    try {
        const prompt = `
            역할: 세일즈 딜 평가 AI.
            목표: 아래 Evidence Summary를 바탕으로 각 평가 항목에 대한 1~5점 점수를 추천.
            
            [Context]
            Deal: ${deal.dealName}
            Solution: ${deal.solution}
            
            [Evidence Summary]
            ${evidence}
            
            [Task]
            Analyze the evidence and provide a recommended score (1-5) for EACH item below.
            If no evidence found for an item, score "N/A", confidence "Low".
            
            Items to Score:
            - Budget: 예산 존재 여부, 예산 적합성
            - Authority: 의사결정권자 접근성, 내부 지지자 파워
            - Need: 문제 적합성, 도입 필요성
            - Timeline: 의사결정 타임라인 명확성, 도입 용이성
            - Tech Req: 필수 요구사항 충족도, 유스케이스 적합성
            - Tech Arch: 현행 인프라·환경 호환성, 보안·정책 준수 여부
            - Tech Data: 데이터 구조·형식 호환성, 기존 시스템과의 연동 난이도
            - Tech Ops: 구현 난이도, 운영·유지보수 가능성
            
            [Output JSON Format]
            {
                "items": {
                    "budget_0": { "score": 4, "confidence": "High", "reason": "..." },
                    "budget_1": { ... },
                    ... map to all items logically ...
                }
            }
        `;

        const result = await callGemini(prompt);
        
        if (result && result.items) {
            applyAIRecommendations(result.items);
        }

    } catch (e) {
        console.error("AI Rec Error", e);
        document.querySelectorAll('.ai-recommendation .tooltip').forEach(el => el.innerText = "AI 연결 실패");
    } finally {
         document.querySelectorAll('.ai-recommendation i').forEach(icon => icon.classList.remove('animate-pulse', 'text-blue-300'));
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
        const elId = `ai-rec-${type}-${itemId}`;
        const el = document.getElementById(elId);
        
        if (el && rec) {
            const icon = el.querySelector('i');
            icon.className = 'fa-solid fa-robot'; 
            
            if (rec.score !== "N/A") {
                icon.classList.add('text-blue-600');
                el.dataset.recScore = rec.score; 
            } else {
                icon.classList.add('text-gray-300');
            }

            const confColor = rec.confidence === 'High' ? 'text-green-400' : rec.confidence === 'Medium' ? 'text-yellow-400' : 'text-red-400';
            el.querySelector('.tooltip').innerHTML = `
                <div class="text-left">
                    <div class="font-bold mb-1">추천: ${rec.score} <span class="${confColor} text-xs">(${rec.confidence})</span></div>
                    <div class="leading-tight text-gray-300">${rec.reason}</div>
                </div>
            `;
        }
    }
}

function attachEvents(deal) {
    /* --- MODAL LOGIC --- */
    const modal = document.getElementById('score-confirm-modal');
    const closeBtn = modal.querySelector('.btn-close-score-modal');
    const backdrop = modal.querySelector('.modal-backdrop');
    const confirmBtn = document.getElementById('btn-confirm-score');
    const msgEl = document.getElementById('score-confirm-msg');

    const closeModal = () => {
        modal.classList.add('hidden');
        if (pendingScoreChange) {
            // Revert UI if cancelled/closed without confirm
            const { target, oldValue } = pendingScoreChange;
            target.value = oldValue;
            pendingScoreChange = null;
        }
    };

    // Close events
    modal.querySelectorAll('.btn-close-score-modal').forEach(btn => btn.addEventListener('click', closeModal));
    backdrop.addEventListener('click', closeModal);

    // Confirm Action
    confirmBtn.addEventListener('click', () => {
        if (pendingScoreChange) {
            const { target, type, itemId, newValue } = pendingScoreChange;
            // Apply new value
            deal.assessment[type].scores[itemId] = newValue;
            Store.saveDeal(deal);
            // Reset pending state but don't revert UI (it's already set to new value)
            pendingScoreChange = null; 
            modal.classList.add('hidden');
        }
    });

    // Weight Inputs
    document.querySelectorAll('.weight-input').forEach(input => {
        input.addEventListener('change', (e) => {
            const type = e.target.dataset.type;
            const cat = e.target.dataset.cat;
            const val = parseInt(e.target.value);
            deal.assessment[type].weights[cat] = val;
            Store.saveDeal(deal);
        });
    });

    // Score Selects
    document.querySelectorAll('.score-select').forEach(select => {
        // Store initial value for potential revert
        select.addEventListener('focus', () => {
            select.dataset.previous = select.value;
        });

        select.addEventListener('change', (e) => {
            const type = e.target.dataset.type;
            const itemId = e.target.dataset.itemId;
            const val = parseInt(e.target.value);
            const oldValue = select.dataset.previous || 0;
            
            // Validation Logic
            const recContainer = document.getElementById(`ai-rec-${type}-${itemId}`);
            if (recContainer && recContainer.dataset.recScore) {
                const recScore = parseInt(recContainer.dataset.recScore);
                
                if (Math.abs(recScore - val) >= 2) {
                    // Trigger Custom Modal
                    pendingScoreChange = { target: e.target, type, itemId, newValue: val, oldValue: oldValue };
                    msgEl.innerHTML = `AI 추천 점수(<strong class="text-yellow-400">${recScore}점</strong>)와 차이가 큽니다.<br>정말 <strong class="text-white">${val}점</strong>으로 설정하시겠습니까?`;
                    modal.classList.remove('hidden');
                    return; // Stop here, wait for modal
                }
            }

            // Normal save if no warning
            deal.assessment[type].scores[itemId] = val;
            Store.saveDeal(deal);
            select.dataset.previous = val;
        });
    });

    // Result Button
    document.getElementById('btn-calc-result').addEventListener('click', () => {
        const bizWeightSum = Object.values(deal.assessment.biz.weights).reduce((a, b) => a + b, 0);
        const techWeightSum = Object.values(deal.assessment.tech.weights).reduce((a, b) => a + b, 0);

        if (bizWeightSum !== 100) { showToast(`Biz 가중치 합이 100이 아닙니다 (현재 ${bizWeightSum})`, 'error'); return; }
        if (techWeightSum !== 100) { showToast(`Tech 가중치 합이 100이 아닙니다 (현재 ${techWeightSum})`, 'error'); return; }

        import('../app.js').then(module => {
            module.navigateTo('summary', { id: deal.id });
        });
    });
}
