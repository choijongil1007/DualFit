
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

    // Premium SaaS Style: Clean White Card with Subtle Shadows
    return `
        <div class="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 stage-card overflow-hidden group" data-stage="${stageConfig.id}">
            <div class="p-6 flex justify-between items-center cursor-pointer toggle-header hover:bg-gray-50/50 transition-colors select-none">
                <div class="flex items-center gap-4">
                    <!-- Accent Color applied only to the icon container -->
                    <div class="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-sm ${stageConfig.iconStyle}">
                        ${stageConfig.label.split('.')[0]}
                    </div>
                    <div>
                        <h3 class="font-bold text-gray-900 text-base tracking-tight">${stageConfig.label.split('. ')[1]}</h3>
                        ${data.frozen 
                            ? '<span class="text-xs text-emerald-600 font-medium flex items-center gap-1 mt-0.5"><i class="fa-solid fa-circle-check"></i> Analysis Complete</span>' 
                            : '<span class="text-xs text-gray-400 font-medium mt-0.5 block">Not analyzed yet</span>'}
                    </div>
                </div>
                <div class="w-8 h-8 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center transition-transform duration-300 icon-chevron group-hover:bg-white group-hover:shadow-sm group-hover:text-gray-600">
                    <i class="fa-solid fa-chevron-down text-xs"></i>
                </div>
            </div>
            
            <div class="hidden toggle-content border-t border-gray-50">
                <div class="p-6 md:p-8 space-y-8">
                    
                    ${isStale ? `
                        <div class="bg-amber-50 border border-amber-100 p-4 rounded-xl flex items-start gap-3 text-amber-800 text-sm animate-pulse">
                            <i class="fa-solid fa-triangle-exclamation mt-0.5 text-amber-500"></i>
                            <div>
                                <strong class="font-semibold block mb-0.5">Input Changed</strong>
                                Data has been modified. Please regenerate the insights.
                            </div>
                        </div>
                    ` : ''}

                    <!-- Inputs Section -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        ${renderInput('Customer Behavior', 'behavior', data.behavior, stageConfig.id)}
                        ${renderInput('Customer Emotion', 'emotion', data.emotion, stageConfig.id)}
                        ${renderInput('Touchpoint / Channel', 'touchpoint', data.touchpoint, stageConfig.id)}
                        ${renderInput('Key Problem / Pain', 'problem', data.problem, stageConfig.id)}
                    </div>

                    <!-- Action Button -->
                    <div class="flex justify-end pt-2 border-t border-dashed border-gray-100 mt-4">
                         <button class="btn-analyze bg-gray-900 text-white px-6 py-2.5 rounded-full hover:bg-black transition-all text-sm font-semibold shadow-lg shadow-gray-900/10 flex items-center gap-2 btn-pill active:scale-95 justify-center min-w-[180px]" data-stage="${stageConfig.id}">
                            <i class="fa-solid fa-wand-magic-sparkles text-yellow-300"></i> 
                            ${data.result ? 'Regenerate Analysis' : 'Generate Insights'}
                         </button>
                    </div>

                    <!-- Results Section -->
                    <div class="result-area pt-4 ${!data.result && !isStale ? 'hidden' : ''}">
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
            <label class="text-xs font-bold text-gray-500 uppercase ml-1 tracking-wider">${label}</label>
            <textarea 
                class="input-premium w-full min-h-[110px] resize-none leading-relaxed text-gray-700"
                data-stage="${stageId}" 
                data-key="${key}"
                placeholder="Enter details..."
            >${value || ''}</textarea>
        </div>
    `;
}

function renderSkeleton() {
    return `
        <div class="space-y-6 animate-pulse">
            <div class="relative flex justify-center mb-6">
                <span class="bg-white px-3 text-xs font-bold text-gray-300 uppercase tracking-widest">Generating Insights...</span>
            </div>
            
            <div class="grid grid-cols-1 gap-4">
                <div class="bg-gray-50 p-6 rounded-2xl border border-gray-100 h-28"></div>
                <div class="bg-gray-50 p-6 rounded-2xl border border-gray-100 h-24"></div>
            </div>
            <div class="bg-gray-50 p-6 rounded-2xl border border-gray-100 h-32"></div>
        </div>
    `;
}

function renderResult(result, isStale) {
    const opacity = isStale ? 'opacity-40 grayscale blur-[1px]' : 'opacity-100';
    
    if (typeof result === 'string') {
        return `<div class="bg-red-50 p-4 rounded-xl text-sm text-red-600 border border-red-100">Parse Error: ${result}</div>`;
    }

    return `
        <div class="${opacity} space-y-6 transition-all duration-500">
            
            <div class="relative">
                <div class="absolute inset-0 flex items-center" aria-hidden="true">
                    <div class="w-full border-t border-gray-100"></div>
                </div>
                <div class="relative flex justify-center">
                    <span class="bg-white px-3 text-xs font-bold text-gray-400 uppercase tracking-widest">AI Insights</span>
                </div>
            </div>

            <div class="grid grid-cols-1 gap-4">
                <!-- JTBD Card -->
                <div class="bg-gradient-to-br from-gray-50 to-white p-6 rounded-2xl border border-gray-100 hover:border-blue-200 transition-colors group shadow-sm">
                    <h4 class="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <div class="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xs shadow-sm"><i class="fa-solid fa-bullseye"></i></div>
                        Jobs to be Done
                    </h4>
                    <p class="text-sm text-gray-600 leading-relaxed whitespace-pre-line group-hover:text-gray-800 transition-colors pl-1">${result.jtbd || '-'}</p>
                </div>

                <!-- Success Criteria Card -->
                <div class="bg-gradient-to-br from-gray-50 to-white p-6 rounded-2xl border border-gray-100 hover:border-emerald-200 transition-colors group shadow-sm">
                    <h4 class="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <div class="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs shadow-sm"><i class="fa-solid fa-check"></i></div>
                        Success Criteria
                    </h4>
                    <ul class="text-sm text-gray-600 space-y-2 pl-1 group-hover:text-gray-800 transition-colors">
                         ${Array.isArray(result.sc) ? result.sc.map(item => `<li class="flex items-start gap-2"><i class="fa-solid fa-check text-emerald-400 text-[10px] mt-1.5"></i> <span>${item}</span></li>`).join('') : '<li>-</li>'}
                    </ul>
                </div>
            </div>

            <!-- To-Do List -->
            <div class="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <h4 class="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <div class="w-7 h-7 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center text-xs shadow-sm"><i class="fa-solid fa-list-check"></i></div>
                    Action Items by Role
                </h4>
                <div class="grid grid-cols-1 gap-3">
                    ${Object.entries(result.todo || {}).map(([role, task]) => `
                        <div class="flex items-start gap-4 p-3.5 rounded-xl bg-gray-50 border border-gray-100/50 hover:border-gray-200 hover:bg-white transition-all duration-200">
                            <span class="text-[10px] font-bold bg-white border border-gray-200 text-gray-700 px-2 py-1 rounded-md uppercase tracking-wide min-w-[80px] text-center shadow-sm mt-0.5">${role}</span>
                            <span class="text-sm text-gray-600 leading-snug pt-0.5">${task}</span>
                        </div>
                    `).join('') : '<div class="text-sm text-gray-400">No specific actions generated.</div>'}
                </div>
            </div>

            <!-- Evidence Summary -->
            <div class="bg-blue-50/40 p-5 rounded-2xl border border-blue-100/60 flex items-start gap-4">
                <div class="w-8 h-8 rounded-full bg-blue-100 flex-shrink-0 flex items-center justify-center">
                    <i class="fa-solid fa-fingerprint text-blue-500 text-sm"></i>
                </div>
                <div>
                    <h4 class="text-xs font-bold text-blue-800 uppercase mb-1 tracking-wide">Evidence Signal</h4>
                    <p class="text-sm text-blue-900/80 leading-relaxed">${result.evidenceSummary || 'No significant signals detected yet.'}</p>
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
                header.classList.remove('bg-gray-50/50');
            } else {
                icon.style.transform = 'rotate(180deg)';
                header.classList.add('bg-gray-50/50');
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
                   resultArea.className = 'opacity-40 grayscale blur-[1px] space-y-6 transition-all duration-500';
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
                showToast('Please provide some inputs first.', 'error');
                return;
            }

            // UI State: Loading
            setButtonLoading(btn, true);
            resultAreaContainer.classList.remove('hidden');
            resultAreaContainer.innerHTML = renderSkeleton();

            try {
                const prompt = `
                    Role: B2B Sales Expert.
                    Goal: Analyze customer inputs and extract structured sales insights.
                    
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
                    Return a SINGLE JSON object containing the following keys.
                    {
                        "jtbd": "Analyze the underlying Job to be Done (Functional & Emotional).",
                        "sc": ["List 3-5 specific Success Criteria (Measurable outcomes)."],
                        "todo": {
                            "Presales": "Specific action item",
                            "Sales": "Specific action item",
                            "Marketing": "Specific action item",
                            "CSM": "Specific action item"
                        },
                        "evidenceSummary": "A concise summary (1-2 sentences) of the key pain points, budget signals, and urgency detected in this stage. This will be used for scoring later."
                    }
                `;

                const result = await callGemini(prompt);
                
                deal.discovery[stageId].result = result;
                deal.discovery[stageId].frozen = true;
                Store.saveDeal(deal);
                
                // Render Actual Result
                resultAreaContainer.innerHTML = renderResult(result, false);
                
                showToast('Insights Generated', 'success');
                
                // Update header status icon
                card.querySelector('.toggle-header h3').nextElementSibling.innerHTML = 
                    '<span class="text-xs text-emerald-600 font-medium flex items-center gap-1 mt-0.5"><i class="fa-solid fa-circle-check"></i> Analysis Complete</span>';

            } catch (error) {
                console.error(error);
                showToast(error.message, 'error');
                resultAreaContainer.innerHTML = ''; // Clear skeleton on error
                resultAreaContainer.classList.add('hidden');
            } finally {
                setButtonLoading(btn, false);
            }
        });
    });
}
