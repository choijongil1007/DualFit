import { Store } from '../store.js';
import { callGemini } from '../api.js';
import { showLoader, hideLoader, showToast, renderMarkdownLike } from '../utils.js';
import { DISCOVERY_STAGES } from '../config.js';

let currentDealId = null;

export function renderDiscovery(container, dealId) {
    currentDealId = dealId;
    const deal = Store.getDeal(dealId);
    if (!deal) return;

    container.innerHTML = `
        <div class="mb-6 border-b pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h2 class="text-2xl font-bold">Discovery</h2>
                <p class="text-gray-500 text-sm">고객의 구매 여정 4단계를 분석합니다.</p>
            </div>
            <div class="text-sm text-gray-600 bg-gray-50 px-3 py-1 rounded border">
                <strong>Project:</strong> ${deal.dealName}
            </div>
        </div>
        <div class="space-y-6" id="stages-container">
            ${DISCOVERY_STAGES.map(stage => renderStage(stage, deal.discovery[stage.id])).join('')}
        </div>
    `;

    attachEvents(deal);
}

function renderStage(stageConfig, data) {
    const hasResult = data.result && data.frozen;
    const isStale = !data.frozen && data.result; // Result exists but modified

    return `
        <div class="border border-gray-200 rounded-lg bg-white overflow-hidden shadow-sm stage-card" data-stage="${stageConfig.id}">
            <div class="p-4 ${stageConfig.color} flex justify-between items-center cursor-pointer toggle-header">
                <h3 class="font-semibold text-lg">${stageConfig.label}</h3>
                <div class="flex items-center gap-2">
                    ${data.frozen ? '<span class="text-xs bg-white/50 px-2 py-0.5 rounded font-medium">완료</span>' : ''}
                    <i class="fa-solid fa-chevron-down transition-transform duration-200"></i>
                </div>
            </div>
            
            <div class="p-0 hidden toggle-content">
                <div class="p-5 space-y-4">
                    
                    ${isStale ? `
                        <div class="bg-yellow-50 border-l-4 border-yellow-400 p-3 text-yellow-700 text-sm mb-4 flex justify-between items-center">
                            <span><i class="fa-solid fa-circle-exclamation mr-1"></i> 입력값이 수정되었습니다. '결과 보기'를 다시 실행해 주세요.</span>
                        </div>
                    ` : ''}

                    <!-- Inputs -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        ${renderInput('Behavior', 'behavior', data.behavior, stageConfig.id)}
                        ${renderInput('Emotion', 'emotion', data.emotion, stageConfig.id)}
                        ${renderInput('Touchpoint', 'touchpoint', data.touchpoint, stageConfig.id)}
                        ${renderInput('Problem / Pain', 'problem', data.problem, stageConfig.id)}
                    </div>

                    <div class="flex justify-end pt-2">
                         <button class="btn-analyze bg-black text-white px-5 py-2 rounded hover:bg-gray-800 transition text-sm flex items-center gap-2" data-stage="${stageConfig.id}">
                            <i class="fa-solid fa-wand-magic-sparkles"></i> 결과 보기 (AI)
                         </button>
                    </div>

                    <!-- Results -->
                    <div class="result-area mt-6 pt-6 border-t border-gray-100 ${!hasResult && !isStale ? 'hidden' : ''}">
                        ${data.result ? renderResult(data.result, isStale) : ''}
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderInput(label, key, value, stageId) {
    return `
        <div class="space-y-1">
            <label class="text-xs font-bold text-gray-500 uppercase">${label}</label>
            <textarea 
                class="input-field w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 focus:ring-black focus:border-transparent outline-none min-h-[80px]"
                data-stage="${stageId}" 
                data-key="${key}"
                placeholder="입력하세요..."
            >${value || ''}</textarea>
        </div>
    `;
}

function renderResult(result, isStale) {
    const opacity = isStale ? 'opacity-50' : 'opacity-100';
    return `
        <div class="${opacity} space-y-5 transition-opacity">
            <div>
                <h4 class="text-sm font-bold text-gray-800 mb-2"><i class="fa-solid fa-bullseye mr-1 text-blue-500"></i> Jobs to be Done (JTBD)</h4>
                <div class="bg-gray-50 p-3 rounded text-sm text-gray-700 whitespace-pre-line border border-gray-100">
                    ${result.jtbd || 'N/A'}
                </div>
            </div>

            <div>
                <h4 class="text-sm font-bold text-gray-800 mb-2"><i class="fa-solid fa-check-double mr-1 text-green-500"></i> Success Criteria</h4>
                <ul class="list-disc list-inside bg-gray-50 p-3 rounded text-sm text-gray-700 border border-gray-100 space-y-1">
                    ${Array.isArray(result.sc) ? result.sc.map(item => `<li>${item}</li>`).join('') : '<li>N/A</li>'}
                </ul>
            </div>

            <div>
                <h4 class="text-sm font-bold text-gray-800 mb-2"><i class="fa-solid fa-list-check mr-1 text-purple-500"></i> To-Do</h4>
                <div class="grid grid-cols-1 gap-2">
                    ${Object.entries(result.todo || {}).map(([role, task]) => `
                        <div class="text-sm bg-white border border-gray-200 p-2 rounded flex gap-2">
                            <span class="font-bold text-gray-500 text-xs uppercase min-w-[80px]">${role}</span>
                            <span class="text-gray-700">${task}</span>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="bg-blue-50 p-3 rounded border border-blue-100">
                <h4 class="text-xs font-bold text-blue-800 mb-1 uppercase">Evidence Summary for Assessment</h4>
                <p class="text-xs text-blue-900">${result.evidenceSummary || ''}</p>
            </div>
        </div>
    `;
}

function attachEvents(deal) {
    // Toggle Toggles
    document.querySelectorAll('.toggle-header').forEach(header => {
        header.addEventListener('click', () => {
            const content = header.nextElementSibling;
            const icon = header.querySelector('.fa-chevron-down');
            content.classList.toggle('hidden');
            icon.style.transform = content.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(180deg)';
        });
    });

    // Inputs Change Event
    document.querySelectorAll('.input-field').forEach(input => {
        input.addEventListener('input', (e) => {
            const stageId = e.target.dataset.stage;
            const key = e.target.dataset.key;
            const val = e.target.value;

            // Update local object reference immediately for responsiveness
            deal.discovery[stageId][key] = val;
            
            // Invalidate result
            if (deal.discovery[stageId].frozen) {
                deal.discovery[stageId].frozen = false;
                Store.saveDeal(deal);
                // Re-render just this stage card header/content warning without full reload to keep focus? 
                // Simplest is to reload the UI, but that kills focus. 
                // Better: Just update UI classes.
                
                // For this implementation, we will save state, then show warning on next interaction or reload.
                // But let's try to update the specific UI element "modified" banner dynamically.
                const stageCard = input.closest('.stage-card');
                const resultArea = stageCard.querySelector('.result-area');
                if (resultArea) {
                   // Add visual indication
                   resultArea.querySelector('div').classList.add('opacity-50');
                }
            } else {
                Store.saveDeal(deal); // Just save text
            }
        });
    });

    // Analyze Button
    document.querySelectorAll('.btn-analyze').forEach(btn => {
        btn.addEventListener('click', async () => {
            const stageId = btn.dataset.stage;
            const stageData = deal.discovery[stageId];

            // Validation
            if (!stageData.behavior && !stageData.problem && !stageData.emotion) {
                showToast('분석할 내용을 입력해주세요 (행동, 감정, 문제 등)', 'error');
                return;
            }

            showLoader(`${stageId.toUpperCase()} 단계 분석 중...`);

            try {
                const prompt = `
                    역할: B2B 세일즈 전문가.
                    목표: 사용자가 입력한 Discovery 정보를 바탕으로 JTBD, Success Criteria, Action Item, Evidence Summary를 도출.
                    
                    [Context]
                    Deal Name: ${deal.dealName}
                    Client: ${deal.clientName}
                    Solution: ${deal.solution}
                    
                    [Discovery Stage]
                    Stage: ${stageId}
                    
                    [User Input]
                    Behavior: ${stageData.behavior}
                    Emotion: ${stageData.emotion}
                    Touchpoint: ${stageData.touchpoint}
                    Problem: ${stageData.problem}
                    
                    [Output Requirement]
                    Return ONLY a JSON object (no markdown) with the following keys:
                    1. "jtbd": (String) Hierarchy of jobs (Functional, Emotional, Social).
                    2. "sc": (Array of Strings) 3-5 Success Criteria (Biz/Tech/Project balance).
                    3. "todo": (Object) Key is role (Presales, Sales, Marketing, CSM, TechSupport), Value is specific action string.
                    4. "evidenceSummary": (String) Short summary of key signals (Budget, Authority, Need urgency, Timeline constraints) derived from this input for scoring later.
                `;

                const result = await callGemini(prompt);
                
                // Update Deal
                deal.discovery[stageId].result = result;
                deal.discovery[stageId].frozen = true;
                Store.saveDeal(deal);
                
                hideLoader();
                showToast('분석 완료!', 'success');
                renderDiscovery(document.getElementById('app'), currentDealId); // Re-render to show results
                
                // Auto-expand the card we just worked on
                setTimeout(() => {
                    const card = document.querySelector(`.stage-card[data-stage="${stageId}"]`);
                    if (card) {
                        card.querySelector('.toggle-content').classList.remove('hidden');
                        card.querySelector('.fa-chevron-down').style.transform = 'rotate(180deg)';
                    }
                }, 50);

            } catch (error) {
                hideLoader();
                showToast('AI 분석 실패: ' + error.message, 'error');
            }
        });
    });
}