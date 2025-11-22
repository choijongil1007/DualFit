
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
        <div class="mb-8 pl-1">
            <h2 class="text-xl font-bold text-gray-900 mb-1">Discovery Analysis</h2>
            <p class="text-gray-500 text-sm">Understand the customer's journey stage by stage.</p>
        </div>
        <div class="space-y-6" id="stages-container">
            ${DISCOVERY_STAGES.map(stage => renderStage(stage, deal.discovery[stage.id])).join('')}
        </div>
    `;

    attachEvents(deal);
}

function renderStage(stageConfig, data) {
    const isStale = !data.frozen && data.result; 

    let statusHtml = '<span class="text-xs text-gray-400 font-medium mt-0.5 block flex items-center gap-1.5"><i class="fa-regular fa-circle"></i> Pending Input</span>';
    if (data.frozen) {
        statusHtml = '<span class="text-xs text-emerald-600 font-semibold flex items-center gap-1.5 mt-0.5"><i class="fa-solid fa-circle-check"></i> Analysis Complete</span>';
    }

    const staleAlert = isStale ? `
        <div class="bg-amber-50 border border-amber-100 p-4 rounded-xl flex items-start gap-3 text-amber-800 text-sm animate-pulse">
            <i class="fa-solid fa-triangle-exclamation mt-0.5 text-amber-500"></i>
            <div>
                <strong class="font-semibold block mb-0.5">Content Modified</strong>
                Inputs have changed. Please regenerate the analysis to get updated insights.
            </div>
        </div>
    ` : '';

    const btnText = data.result ? 'Regenerate' : 'Generate Insights';
    const resultHtml = data.result ? renderResult(data.result, isStale) : '';
    const resultClass = (!data.result && !isStale) ? 'hidden' : '';

    return `
        <div class="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 stage-card overflow-hidden group" data-stage="${stageConfig.id}">
            <div class="p-5 md:p-6 flex justify-between items-center cursor-pointer toggle-header select-none">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shadow-sm ${stageConfig.iconStyle} transition-transform group-hover:scale-105 duration-300">
                        <i class="fa-solid ${getIconForStage(stageConfig.id)}"></i>
                    </div>
                    <div>
                        <h3 class="font-bold text-gray-900 text-lg tracking-tight group-hover:text-primary-600 transition-colors">${stageConfig.label.split('. ')[1]}</h3>
                        ${statusHtml}
                    </div>
                </div>
                <div class="w-9 h-9 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center transition-all duration-300 icon-chevron border border-transparent group-hover:border-gray-200 group-hover:bg-white group-hover:text-gray-900">
                    <i class="fa-solid fa-chevron-down text-sm"></i>
                </div>
            </div>
            
            <div class="hidden toggle-content border-t border-gray-100">
                <div class="p-6 md:p-8 space-y-8">
                    ${staleAlert}

                    <div class="bg-gray-50/80 rounded-2xl p-6 border border-gray-100/50">
                        <h4 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Discovery Inputs</h4>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                            ${renderInput('Customer Behavior', 'behavior', data.behavior, stageConfig.id, 'What are they doing?')}
                            ${renderInput('Customer Emotion', 'emotion', data.emotion, stageConfig.id, 'How do they feel?')}
                            ${renderInput('Touchpoint / Channel', 'touchpoint', data.touchpoint, stageConfig.id, 'Where did we meet?')}
                            ${renderInput('Key Problem / Pain', 'problem', data.problem, stageConfig.id, 'What is blocking them?')}
                        </div>
                        
                        <div class="flex justify-end pt-4 mt-2">
                             <button class="btn-analyze bg-gray-900 text-white px-6 py-2.5 rounded-full hover:bg-black transition-all text-sm font-semibold shadow-lg shadow-gray-900/10 flex items-center gap-2 btn-pill active:scale-95 justify-center min-w-[160px]" data-stage="${stageConfig.id}">
                                <i class="fa-solid fa-wand-magic-sparkles text-yellow-300"></i> 
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
        <div class="space-y-1.5">
            <label class="text-[11px] font-bold text-gray-500 uppercase ml-1 tracking-wider">${label}</label>
            <textarea 
                class="input-premium w-full min-h-[80px] resize-none leading-relaxed text-gray-800 text-sm focus:bg-white bg-white shadow-sm"
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
            <div class="flex items-center gap-3 justify-center mb-4">
                 <div class="h-px bg-gray-100 flex-1"></div>
                 <span class="text-xs font-bold text-gray-400 uppercase tracking-widest bg-white px-2">AI Processing</span>
                 <div class="h-px bg-gray-100 flex-1"></div>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="h-32 rounded-2xl skeleton-shimmer border border-gray-100"></div>
                <div class="h-32 rounded-2xl skeleton-shimmer border border-gray-100"></div>
            </div>
            <div class="h-40 rounded-2xl skeleton-shimmer border border-gray-100"></div>
        </div>
    `;
}

function renderResult(result, isStale) {
    const opacity = isStale ? 'opacity-40 grayscale blur-[1px]' : 'opacity-100';
    
    if (typeof result !== 'object' || result === null) {
        return `<div class="bg-red-50 p-4 rounded-xl text-sm text-red-600 border border-red-100">Parse Error: Invalid result format.</div>`;
    }

    let scItemsHtml = '<li>-</li>';
    if (Array.isArray(result.sc) && result.sc.length > 0) {
        scItemsHtml = result.sc.map(item => 
            `<li class="flex items-start gap-2"><i class="fa-solid fa-check text-emerald-400 text-[10px] mt-1.5"></i> <span>${item}</span></li>`
        ).join('');
    }

    let todoItemsHtml = '<div class="text-sm text-gray-400">No specific actions generated.</div>';
    if (result.todo && typeof result.todo === 'object') {
        const todos = Object.entries(result.todo);
        if (todos.length > 0) {
            todoItemsHtml = todos.map(([role, task]) => `
                <div class="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-colors">
                    <span class="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded uppercase tracking-wide min-w-[70px] text-center mt-0.5">${role}</span>
                    <span class="text-sm text-gray-600 leading-snug pt-0.5">${task}</span>
                </div>
            `).join('');
        }
    }

    return `
        <div class="${opacity} space-y-6 transition-all duration-500">
            
            <div class="flex items-center gap-3 justify-center">
                 <div class="h-px bg-gray-200 flex-1"></div>
                 <span class="text-xs font-bold text-primary-600 uppercase tracking-widest bg-white px-2">Analysis Results</span>
                 <div class="h-px bg-gray-200 flex-1"></div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                <!-- JTBD Card -->
                <div class="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm relative overflow-hidden group">
                    <div class="absolute top-0 right-0 w-16 h-16 bg-blue-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                    <h4 class="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2 relative z-10">
                        <i class="fa-solid fa-bullseye text-blue-500"></i> Jobs to be Done
                    </h4>
                    <p class="text-sm text-gray-600 leading-relaxed whitespace-pre-line relative z-10">${result.jtbd || '-'}</p>
                </div>

                <!-- Success Criteria Card -->
                <div class="bg-white p-6 rounded-2xl border border-emerald-100 shadow-sm relative overflow-hidden group">
                    <div class="absolute top-0 right-0 w-16 h-16 bg-emerald-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                    <h4 class="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2 relative z-10">
                        <i class="fa-solid fa-flag-checkered text-emerald-500"></i> Success Criteria
                    </h4>
                    <ul class="text-sm text-gray-600 space-y-2 relative z-10">
                         ${scItemsHtml}
                    </ul>
                </div>
            </div>

            <!-- To-Do List -->
            <div class="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <h4 class="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <i class="fa-solid fa-list-check text-violet-500"></i> Recommended Actions
                </h4>
                <div class="grid grid-cols-1 gap-3">
                    ${todoItemsHtml}
                </div>
            </div>

            <!-- Evidence Summary -->
            <div class="bg-gradient-to-r from-gray-50 to-white p-5 rounded-2xl border border-gray-200 flex items-start gap-4">
                <div class="w-8 h-8 rounded-full bg-gray-800 text-white flex-shrink-0 flex items-center justify-center shadow-sm">
                    <i class="fa-solid fa-fingerprint text-xs"></i>
                </div>
                <div>
                    <h4 class="text-xs font-bold text-gray-800 uppercase mb-1 tracking-wide">Signal Detected</h4>
                    <p class="text-sm text-gray-600 leading-relaxed italic">"${result.evidenceSummary || 'No significant signals detected yet.'}"</p>
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

            setButtonLoading(btn, true, "Analyzing...");
            resultAreaContainer.classList.remove('hidden');
            resultAreaContainer.innerHTML = renderSkeleton();

            try {
                const contentDiv = card.querySelector('.toggle-content');
                contentDiv.classList.remove('hidden');

                // Explicit JSON structure string to avoid template literal issues
                const jsonStructure = `{
  "jtbd": "Analyze the underlying Job to be Done (Functional & Emotional).",
  "sc": ["List 3-5 specific Success Criteria (Measurable outcomes)."],
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
Return a SINGLE JSON object matching this structure:
${jsonStructure}
`;

                const result = await callGemini(prompt);
                
                deal.discovery[stageId].result = result;
                deal.discovery[stageId].frozen = true;
                Store.saveDeal(deal);
                
                resultAreaContainer.innerHTML = renderResult(result, false);
                
                showToast('Insights Generated', 'success');
                
                const statusSpan = card.querySelector('.toggle-header h3').nextElementSibling;
                statusSpan.innerHTML = '<span class="text-xs text-emerald-600 font-semibold flex items-center gap-1.5 mt-0.5"><i class="fa-solid fa-circle-check"></i> Analysis Complete</span>';
                statusSpan.className = "text-xs text-emerald-600 font-semibold flex items-center gap-1.5 mt-0.5";

            } catch (error) {
                console.error(error);
                showToast("Analysis failed. Check console for details.", 'error');
                resultAreaContainer.innerHTML = `<div class="bg-red-50 p-4 rounded-xl text-red-600 text-sm border border-red-100">
                    <strong>Analysis Failed:</strong> ${error.message}<br>
                    <span class="text-xs text-red-400 mt-1 block">Try again or check connection.</span>
                </div>`;
            } finally {
                setButtonLoading(btn, false);
            }
        });
    });
}
