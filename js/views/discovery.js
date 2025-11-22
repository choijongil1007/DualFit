import { Store } from '../store.js';
import { callGemini } from '../api.js';
import { showLoader, hideLoader, showToast } from '../utils.js';
import { DISCOVERY_STAGES } from '../config.js';

let currentDealId = null;

export function renderDiscovery(container, dealId) {
    currentDealId = dealId;
    const deal = Store.getDeal(dealId);
    if (!deal) return;

    container.innerHTML = `
        <div class="mb-8">
            <h2 class="text-xl font-bold text-gray-900 mb-1">Discovery Analysis</h2>
            <p class="text-gray-500 text-sm">Understand the customer's journey stage by stage.</p>
        </div>
        <div class="space-y-5" id="stages-container">
            ${DISCOVERY_STAGES.map(stage => renderStage(stage, deal.discovery[stage.id])).join('')}
        </div>
    `;

    attachEvents(deal);
}

function renderStage(stageConfig, data) {
    const isStale = !data.frozen && data.result; 

    // Dynamic classes based on stage config colors (mapped to generic soft styling)
    // We override config colors to stick to the premium white/gray theme but keep subtle accents
    
    return `
        <div class="bg-white border border-gray-100 rounded-2xl shadow-card stage-card overflow-hidden transition-all duration-300" data-stage="${stageConfig.id}">
            <div class="p-5 flex justify-between items-center cursor-pointer toggle-header bg-white hover:bg-gray-50/50 transition-colors select-none">
                <div class="flex items-center gap-4">
                    <div class="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 text-gray-500 font-bold text-xs shadow-inner">
                        ${stageConfig.label.split('.')[0]}
                    </div>
                    <div>
                        <h3 class="font-bold text-gray-900 text-base">${stageConfig.label.split('. ')[1]}</h3>
                        ${data.frozen 
                            ? '<span class="text-xs text-green-600 font-medium flex items-center gap-1 mt-0.5"><i class="fa-solid fa-check-circle"></i> Analysis Complete</span>' 
                            : '<span class="text-xs text-gray-400 font-medium">Draft</span>'}
                    </div>
                </div>
                <div class="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 transition-transform duration-300 icon-chevron">
                    <i class="fa-solid fa-chevron-down text-sm"></i>
                </div>
            </div>
            
            <div class="hidden toggle-content border-t border-gray-50">
                <div class="p-6 md:p-8 space-y-6">
                    
                    ${isStale ? `
                        <div class="bg-amber-50 border border-amber-100 p-4 rounded-xl flex items-start gap-3 text-amber-800 text-sm">
                            <i class="fa-solid fa-triangle-exclamation mt-0.5 text-amber-500"></i>
                            <div>
                                <strong class="font-semibold block mb-0.5">Input Changed</strong>
                                Data has been modified. Please refresh the AI analysis to get updated insights.
                            </div>
                        </div>
                    ` : ''}

                    <!-- Inputs -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        ${renderInput('Behavior', 'behavior', data.behavior, stageConfig.id)}
                        ${renderInput('Emotion', 'emotion', data.emotion, stageConfig.id)}
                        ${renderInput('Touchpoint', 'touchpoint', data.touchpoint, stageConfig.id)}
                        ${renderInput('Problem / Pain', 'problem', data.problem, stageConfig.id)}
                    </div>

                    <div class="flex justify-end pt-2">
                         <button class="btn-analyze bg-gray-900 text-white px-5 py-2.5 rounded-full hover:bg-black transition-all text-sm font-semibold shadow-lg shadow-gray-900/10 flex items-center gap-2 btn-pill" data-stage="${stageConfig.id}">
                            <i class="fa-solid fa-sparkles text-yellow-400"></i> Generate Insights
                         </button>
                    </div>

                    <!-- Results -->
                    <div class="result-area pt-8 ${!data.result && !isStale ? 'hidden' : ''}">
                        <div class="flex items-center gap-2 mb-4">
                            <span class="text-xs font-bold text-gray-400 uppercase tracking-wider">AI Analysis Result</span>
                            <div class="h-px bg-gray-100 flex-grow"></div>
                        </div>
                        ${data.result ? renderResult(data.result, isStale) : ''}
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderInput(label, key, value, stageId) {
    return `
        <div class="space-y-2">
            <label class="text-xs font-bold text-gray-500 uppercase ml-1 tracking-wide">${label}</label>
            <textarea 
                class="input-premium w-full min-h-[100px] resize-none"
                data-stage="${stageId}" 
                data-key="${key}"
                placeholder="Type here..."
            >${value || ''}</textarea>
        </div>
    `;
}

function renderResult(result, isStale) {
    const opacity = isStale ? 'opacity-40 grayscale' : 'opacity-100';
    
    if (typeof result === 'string') {
        return `<div class="bg-red-50 p-4 rounded-xl text-sm text-red-600 border border-red-100">Parse Error: ${result}</div>`;
    }

    return `
        <div class="${opacity} space-y-6 transition-all duration-300">
            <div class="grid grid-cols-1 gap-4">
                <div class="bg-gray-50/50 p-5 rounded-2xl border border-gray-100 hover:border-blue-100 transition-colors group">
                    <h4 class="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                        <div class="w-6 h-6 rounded bg-blue-100 text-blue-600 flex items-center justify-center text-xs"><i class="fa-solid fa-bullseye"></i></div>
                        Jobs to be Done
                    </h4>
                    <p class="text-sm text-gray-600 leading-relaxed whitespace-pre-line group-hover:text-gray-800 transition-colors">${result.jtbd || '-'}</p>
                </div>

                <div class="bg-gray-50/50 p-5 rounded-2xl border border-gray-100 hover:border-green-100 transition-colors group">
                    <h4 class="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                        <div class="w-6 h-6 rounded bg-green-100 text-green-600 flex items-center justify-center text-xs"><i class="fa-solid fa-check"></i></div>
                        Success Criteria
                    </h4>
                    <ul class="text-sm text-gray-600 space-y-1 group-hover:text-gray-800 transition-colors list-disc list-inside">
                         ${Array.isArray(result.sc) ? result.sc.map(item => `<li>${item}</li>`).join('') : '<li>-</li>'}
                    </ul>
                </div>
            </div>

            <div class="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                <h4 class="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <div class="w-6 h-6 rounded bg-purple-100 text-purple-600 flex items-center justify-center text-xs"><i class="fa-solid fa-list-check"></i></div>
                    To-Do List
                </h4>
                <div class="grid grid-cols-1 gap-2">
                    ${Object.entries(result.todo || {}).map(([role, task]) => `
                        <div class="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                            <span class="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded uppercase tracking-wide min-w-[70px] text-center mt-0.5">${role}</span>
                            <span class="text-sm text-gray-700 leading-snug">${task}</span>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex items-start gap-3">
                <i class="fa-solid fa-info-circle text-blue-500 mt-1"></i>
                <div>
                    <h4 class="text-xs font-bold text-blue-700 uppercase mb-1">Evidence Summary</h4>
                    <p class="text-xs text-blue-800/80 leading-relaxed">${result.evidenceSummary || ''}</p>
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
                header.classList.remove('bg-gray-50');
            } else {
                icon.style.transform = 'rotate(180deg)';
                header.classList.add('bg-gray-50');
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
                const resultArea = stageCard.querySelector('.result-area > div');
                if (resultArea) {
                   resultArea.className = 'opacity-40 grayscale space-y-6 transition-all duration-300';
                }
            } else {
                Store.saveDeal(deal);
            }
        });
    });

    document.querySelectorAll('.btn-analyze').forEach(btn => {
        btn.addEventListener('click', async () => {
            const stageId = btn.dataset.stage;
            const stageData = deal.discovery[stageId];

            if (!stageData.behavior && !stageData.problem && !stageData.emotion) {
                showToast('Please provide some inputs first.', 'error');
                return;
            }

            showLoader('Analyzing...');

            try {
                const prompt = `
                    Role: B2B Sales Expert.
                    Goal: Extract JTBD, Success Criteria, Action Items, and Evidence Summary based on inputs.
                    
                    Deal: ${deal.dealName} | Client: ${deal.clientName} | Solution: ${deal.solution}
                    Stage: ${stageId}
                    
                    Inputs:
                    Behavior: ${stageData.behavior}
                    Emotion: ${stageData.emotion}
                    Touchpoint: ${stageData.touchpoint}
                    Problem: ${stageData.problem}
                    
                    Output JSON only:
                    {
                        "jtbd": "String hierarchy of jobs",
                        "sc": ["String", "String", ...],
                        "todo": {"Presales": "Action", "Sales": "Action", ...},
                        "evidenceSummary": "Concise summary of signals"
                    }
                `;

                const result = await callGemini(prompt);
                
                deal.discovery[stageId].result = result;
                deal.discovery[stageId].frozen = true;
                Store.saveDeal(deal);
                
                hideLoader();
                showToast('Analysis Complete', 'success');
                renderDiscovery(document.getElementById('app'), currentDealId); 
                
                setTimeout(() => {
                    const card = document.querySelector(`.stage-card[data-stage="${stageId}"]`);
                    if (card) {
                        card.querySelector('.toggle-content').classList.remove('hidden');
                        card.querySelector('.icon-chevron').style.transform = 'rotate(180deg)';
                    }
                }, 50);

            } catch (error) {
                hideLoader();
                showToast(error.message, 'error');
            }
        });
    });
}