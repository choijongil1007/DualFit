import { Store } from '../store.js';
import { callGemini } from '../api.js';
import { showToast, setButtonLoading } from '../utils.js';
import { DISCOVERY_STAGES } from '../config.js';

let currentDealId = null;

export function renderDiscovery(container, dealId) {
    currentDealId = dealId;
    const deal = Store.getDeal(dealId);
    if (!deal) return;

    container.innerHTML = `
        <div class="mb-6 flex items-end justify-between">
            <div>
                <h2 class="text-lg font-bold text-gray-900">Discovery Analysis</h2>
                <p class="text-gray-500 text-sm mt-0.5">단계별 고객 여정 분석</p>
            </div>
        </div>
        <div class="space-y-6" id="stages-container">
            ${DISCOVERY_STAGES.map(stage => renderStage(stage, deal.discovery[stage.id])).join('')}
        </div>
    `;

    attachEvents(deal);
}

function renderStage(stageConfig, data) {
    const isStale = !data.frozen && data.result; 

    let statusHtml = '<span class="text-xs text-gray-400 font-medium mt-0.5 block flex items-center gap-1.5"><i class="fa-regular fa-circle"></i> 입력 대기</span>';
    if (data.frozen) {
        statusHtml = '<span class="text-xs text-emerald-600 font-medium flex items-center gap-1.5 mt-0.5"><i class="fa-solid fa-circle-check"></i> 분석 완료</span>';
    }

    const staleAlert = isStale ? `
        <div class="bg-amber-50 border border-amber-200 p-4 rounded-lg flex items-start gap-3 text-amber-800 text-sm mb-6">
            <i class="fa-solid fa-triangle-exclamation mt-0.5 text-amber-500"></i>
            <div>
                <strong class="font-semibold block mb-0.5">입력 데이터 변경됨</strong>
                최신 입력을 반영하려면 인사이트를 재생성하세요.
            </div>
        </div>
    ` : '';

    const btnText = data.result ? '인사이트 재생성' : '인사이트 생성';
    const resultHtml = data.result ? renderResult(data.result, isStale) : '';
    const resultClass = (!data.result && !isStale) ? 'hidden' : '';

    // Stage별 컬러 매핑
    const colorMap = {
        'awareness': 'rose',
        'consideration': 'amber',
        'evaluation': 'sky',
        'purchase': 'emerald'
    };
    const color = colorMap[stageConfig.id] || 'gray';

    return `
        <div class="bg-white border border-gray-200 rounded-xl shadow-card hover:shadow-md transition-all duration-300 stage-card overflow-hidden group" data-stage="${stageConfig.id}">
            <!-- Header: Stage별 은은한 배경색 적용 -->
            <div class="p-5 flex justify-between items-center cursor-pointer toggle-header select-none bg-${color}-50/30 hover:bg-${color}-50 transition-colors border-b border-transparent hover:border-${color}-100">
                <div class="flex items-center gap-4">
                    <div class="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg shadow-sm border border-${color}-100 ${stageConfig.iconStyle.replace('bg-', 'bg-opacity-20 bg-').replace('text-', 'text-opacity-90 text-')}">
                        <i class="fa-solid ${getIconForStage(stageConfig.id)} text-sm"></i>
                    </div>
                    <div>
                        <h3 class="font-bold text-gray-900 text-base tracking-tight">${stageConfig.label.split('. ')[1]}</h3>
                        ${statusHtml}
                    </div>
                </div>
                <div class="w-8 h-8 rounded-md bg-white text-gray-400 flex items-center justify-center transition-all duration-300 icon-chevron border border-gray-200 group-hover:border-${color}-200 group-hover:text-${color}-600">
                    <i class="fa-solid fa-chevron-down text-xs"></i>
                </div>
            </div>
            
            <div class="hidden toggle-content border-t border-${color}-100 bg-white">
                <div class="p-6 md:p-8">
                    ${staleAlert}

                    <!-- Input Area: 회색 배경으로 입력 영역 구분 -->
                    <div class="bg-slate-50 rounded-xl p-6 border border-slate-200 shadow-sm mb-8">
                        <h4 class="text-base font-bold text-gray-900 mb-6 flex items-center gap-2">
                            Discovery Inputs
                        </h4>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8">
                            ${renderInput('고객 행동', 'behavior', data.behavior, stageConfig.id, '고객이 하는 행동')}
                            ${renderInput('고객 감정', 'emotion', data.emotion, stageConfig.id, '고객이 느끼는 감정과 그 이유')}
                            ${renderInput('고객 접점', 'touchpoint', data.touchpoint, stageConfig.id, '고객이 정보를 수집하는 채널')}
                            ${renderInput('고객 문제', 'problem', data.problem, stageConfig.id, '고객의 Pain Point')}
                        </div>
                        
                        <div class="flex justify-end pt-6 mt-2 border-t border-slate-200">
                             <button class="btn-analyze bg-gray-900 text-white px-5 py-2.5 rounded-lg hover:bg-black transition-all text-sm font-semibold shadow-md flex items-center gap-2 active:scale-95 justify-center min-w-[150px]" data-stage="${stageConfig.id}">
                                <i class="fa-solid fa-wand-magic-sparkles text-yellow-300 text-xs"></i> 
                                ${btnText}
                             </button>
                        </div>
                    </div>

                    <div class="result-area transition-all duration-500 ${resultClass}">
                        ${resultHtml}
                    </div>
                </div>
            </div>
        </div>
    `;
}

function getIconForStage(id) {
    switch(id) {
        case 'awareness': return 'fa-eye';
        case 'consideration': return 'fa-scale-balanced';
        case 'evaluation': return 'fa-magnifying-glass-chart';
        case 'purchase': return 'fa-file-signature';
        default: return 'fa-circle';
    }
}

function renderInput(label, key, value, stageId, placeholder) {
    return `
        <div class="space-y-2">
            <label class="text-sm font-semibold text-gray-800 block">${label}</label>
            <textarea 
                class="input-premium w-full min-h-[100px] resize-none leading-relaxed text-gray-900 text-sm focus:bg-white bg-white border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg p-3 transition-colors shadow-sm"
                data-stage="${stageId}" 
                data-key="${key}"
                placeholder="${placeholder}"
            >${value || ''}</textarea>
        </div>
    `;
}

function renderSkeleton() {
    return `
        <div class="space-y-5 animate-pulse pt-2">
            <div class="flex items-center gap-3 justify-center mb-6">
                 <div class="h-px bg-gray-200 flex-1"></div>
                 <span class="text-xs font-semibold text-gray-500 tracking-wide bg-transparent px-2">AI 분석 중</span>
                 <div class="h-px bg-gray-200 flex-1"></div>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="h-40 rounded-xl bg-white border border-gray-200"></div>
                <div class="h-40 rounded-xl bg-white border border-gray-200"></div>
            </div>
            <div class="h-48 rounded-xl bg-white border border-gray-200"></div>
        </div>
    `;
}

function renderResult(result, isStale) {
    const opacity = isStale ? 'opacity-50 grayscale-[0.5]' : 'opacity-100';
    
    // 1. Handle String Response
    if (typeof result === 'string') {
        return `
            <div class="${opacity} transition-all duration-500">
                <div class="bg-white p-6 rounded-xl border border-gray-200 shadow-sm prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-line">
                    ${result.replace(/<br>/g, '\n')} 
                </div>
            </div>
        `;
    }

    if (typeof result !== 'object' || result === null) {
        return `<div class="bg-red-50 p-4 rounded-lg text-sm text-red-600 border border-red-200">Parse Error: Invalid result format.</div>`;
    }

    const renderListItems = (inputData) => {
        let items = [];
        if (Array.isArray(inputData)) {
            items = inputData;
        } else if (typeof inputData === 'string') {
            items = inputData.split(/\n/).map(s => s.trim()).filter(s => s.length > 0);
        }

        if (items.length === 0) return '<li class="text-gray-400 italic text-sm">-</li>';

        return items.map(item => {
            const cleanText = item.replace(/^[-*•]\s*/, '');
            return `<li class="flex items-start gap-3">
                <span class="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-2 flex-shrink-0"></span>
                <span class="text-gray-700 text-sm leading-relaxed">${cleanText}</span>
            </li>`;
        }).join('');
    };

    const scItemsHtml = renderListItems(result.sc);
    const jtbdItemsHtml = renderListItems(result.jtbd);

    let todoItemsHtml = '<div class="text-sm text-gray-400">생성된 액션 아이템이 없습니다.</div>';
    if (result.todo && typeof result.todo === 'object') {
        const todos = Object.entries(result.todo)
            .filter(([role]) => {
                const r = role.toLowerCase().replace(/\s+/g, '');
                return r !== 'techsupport' && r !== 'technicalsupport' && r !== '기술지원';
            });

        if (todos.length > 0) {
            todoItemsHtml = todos.map(([role, task]) => `
                <div class="flex items-start gap-3 p-3 rounded-lg bg-white/50 border border-gray-100 hover:bg-white hover:border-gray-200 transition-colors">
                    <span class="text-[11px] font-bold bg-violet-50 text-violet-700 px-2 py-0.5 rounded border border-violet-100 min-w-[70px] text-center mt-0.5">${role}</span>
                    <span class="text-sm text-gray-700 leading-snug pt-0.5">${task}</span>
                </div>
            `).join('');
        }
    }

    return `
        <div class="${opacity} space-y-6 transition-all duration-500">
            
            <div class="flex items-center gap-3 justify-center">
                 <div class="h-px bg-gray-200 flex-1"></div>
                 <span class="text-base font-bold text-indigo-700 bg-transparent px-4">분석 결과</span>
                 <div class="h-px bg-gray-200 flex-1"></div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                <!-- JTBD Card (Blue Tint) -->
                <div class="bg-blue-50/40 p-6 rounded-xl border border-blue-100 shadow-sm relative overflow-hidden group">
                    <div class="absolute top-0 right-0 w-20 h-20 bg-blue-100/50 rounded-bl-full -mr-8 -mt-8"></div>
                    <h4 class="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2 relative z-10">
                        <i class="fa-solid fa-bullseye text-blue-600"></i> 고객이 하려는 일 (JTBD)
                    </h4>
                    <ul class="space-y-2 relative z-10">
                        ${jtbdItemsHtml}
                    </ul>
                </div>

                <!-- Success Criteria Card (Emerald Tint) -->
                <div class="bg-emerald-50/40 p-6 rounded-xl border border-emerald-100 shadow-sm relative overflow-hidden group">
                    <div class="absolute top-0 right-0 w-20 h-20 bg-emerald-100/50 rounded-bl-full -mr-8 -mt-8"></div>
                    <h4 class="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2 relative z-10">
                        <i class="fa-solid fa-flag-checkered text-emerald-600"></i> 성공 기준
                    </h4>
                    <ul class="space-y-2 relative z-10">
                         ${scItemsHtml}
                    </ul>
                </div>
            </div>

            <!-- To-Do List (Violet Tint) -->
            <div class="bg-violet-50/40 p-6 rounded-xl border border-violet-100 shadow-sm">
                <h4 class="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <i class="fa-solid fa-list-check text-violet-600"></i> 추천 액션 아이템
                </h4>
                <div class="grid grid-cols-1 gap-2">
                    ${todoItemsHtml}
                </div>
            </div>

            <!-- Evidence Summary -->
            <div class="bg-slate-50/80 p-5 rounded-xl border border-slate-200 flex items-start gap-4">
                <div class="w-8 h-8 rounded-full bg-gray-800 text-white flex-shrink-0 flex items-center justify-center shadow-sm mt-1">
                    <i class="fa-solid fa-fingerprint text-xs"></i>
                </div>
                <div>
                    <h4 class="text-sm font-bold text-gray-900 mb-1">감지된 신호</h4>
                    <p class="text-sm text-gray-600 leading-relaxed italic">"${result.evidenceSummary || '특이 신호가 감지되지 않았습니다.'}"</p>
                </div>
            </div>
        </div>
    `;
}

function attachEvents(deal) {
    document.querySelectorAll('.toggle-header').forEach(header => {
        header.addEventListener('click', () => {
            const card = header.parentElement;
            const content = card.querySelector('.toggle-content');
            const icon = card.querySelector('.icon-chevron');
            
            content.classList.toggle('hidden');
            if (content.classList.contains('hidden')) {
                icon.style.transform = 'rotate(0deg)';
                header.classList.remove('pb-0'); 
            } else {
                icon.style.transform = 'rotate(180deg)';
            }
        });
    });

    document.querySelectorAll('.input-premium').forEach(input => {
        input.addEventListener('input', (e) => {
            const stageId = e.target.dataset.stage;
            const key = e.target.dataset.key;
            const val = e.target.value;

            deal.discovery[stageId][key] = val;
            
            if (deal.discovery[stageId].frozen) {
                deal.discovery[stageId].frozen = false;
                Store.saveDeal(deal);
                
                const stageCard = input.closest('.stage-card');
                const resultAreaContainer = stageCard.querySelector('.result-area');
                const resultArea = resultAreaContainer.querySelector('div'); 
                if (resultArea) {
                   resultArea.className = 'opacity-50 grayscale-[0.5] space-y-6 transition-all duration-500';
                }
            } else {
                Store.saveDeal(deal);
            }
        });
    });

    document.querySelectorAll('.btn-analyze').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const stageId = btn.dataset.stage;
            const stageData = deal.discovery[stageId];
            const card = btn.closest('.stage-card');
            const resultAreaContainer = card.querySelector('.result-area');

            if (!stageData.behavior && !stageData.problem && !stageData.emotion) {
                showToast('분석을 위해 정보를 먼저 입력해주세요.', 'error');
                return;
            }

            setButtonLoading(btn, true, "분석 중...");
            resultAreaContainer.classList.remove('hidden');
            resultAreaContainer.innerHTML = renderSkeleton();

            try {
                const contentDiv = card.querySelector('.toggle-content');
                contentDiv.classList.remove('hidden');

                const jsonStructure = `{
  "jtbd": ["Job 1 (Functional)", "Job 2 (Emotional)", "Job 3 (Social)"],
  "sc": ["Success Criteria 1", "Success Criteria 2", "Success Criteria 3"],
  "todo": {
    "Presales": "Specific action item",
    "Sales": "Specific action item",
    "Marketing": "Specific action item",
    "CSM": "Specific action item"
  },
  "evidenceSummary": "A concise summary (1-2 sentences) of the key pain points, budget signals, and urgency detected in this stage."
}`;

                const prompt = `
Role: B2B Sales Expert.
Goal: Analyze customer inputs and extract structured sales insights.
Language: Korean (Must output strictly in Korean).

Context:
- Deal: ${deal.dealName} (${deal.clientName})
- Solution: ${deal.solution}
- Stage: ${stageId.toUpperCase()}

User Inputs:
- Behavior: ${stageData.behavior}
- Emotion: ${stageData.emotion}
- Touchpoint: ${stageData.touchpoint}
- Problem: ${stageData.problem}

Output Instructions:
Return a SINGLE JSON object matching this structure.
IMPORTANT:
1. "jtbd" MUST be an array of strings.
2. DO NOT include 'Technical Support' or 'TechSupport' key in 'todo'.

JSON Structure:
${jsonStructure}
`;

                const result = await callGemini(prompt);
                
                deal.discovery[stageId].result = result;
                deal.discovery[stageId].frozen = true;
                Store.saveDeal(deal);
                
                resultAreaContainer.innerHTML = renderResult(result, false);
                
                showToast('인사이트 생성 완료', 'success');
                
                const statusSpan = card.querySelector('.toggle-header h3').nextElementSibling;
                statusSpan.innerHTML = '<span class="text-xs text-emerald-600 font-medium flex items-center gap-1.5 mt-0.5"><i class="fa-solid fa-circle-check"></i> 분석 완료</span>';

            } catch (error) {
                console.error(error);
                const msg = error.message && error.message.includes('Proxy') ? "AI Service Error" : error.message;
                showToast(msg, 'error');
                
                resultAreaContainer.innerHTML = `<div class="bg-red-50 p-4 rounded-lg text-red-600 text-sm border border-red-200">
                    <strong>분석 실패:</strong> ${error.message}<br>
                    <span class="text-xs text-red-500 mt-1 block">잠시 후 다시 시도해주세요.</span>
                </div>`;
            } finally {
                setButtonLoading(btn, false);
            }
        });
    });
}