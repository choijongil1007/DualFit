
import { Store } from '../store.js';
import { callGemini } from '../api.js';
import { ASSESSMENT_CONFIG } from '../config.js';
import { navigateTo } from '../app.js';

export function renderSummary(container, dealId) {
    const deal = Store.getDeal(dealId);
    if (!deal) return;

    const { bizScore, techScore, lowItems } = calculateScores(deal);

    container.innerHTML = `
        <div class="mb-8 border-b border-gray-100 pb-6">
            <h2 class="text-2xl font-bold text-gray-900 mb-1">Executive Summary</h2>
            <p class="text-gray-500 text-sm">Strategic overview and action plan.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
            <!-- Left: Quadrant -->
            <div class="bg-white p-8 rounded-3xl border border-gray-100 shadow-card flex flex-col items-center">
                <h3 class="font-bold text-lg text-gray-900 mb-6">Fit Analysis</h3>
                
                <div class="quadrant-container rounded-2xl mb-8">
                    <div class="quadrant-line-x"></div>
                    <div class="quadrant-line-y"></div>
                    <span class="quadrant-label q-top-left">Tech Strong</span>
                    <span class="quadrant-label q-top-right text-primary-600">Ideal Fit</span>
                    <span class="quadrant-label q-bottom-left text-red-400">Low Fit</span>
                    <span class="quadrant-label q-bottom-right">Biz Strong</span>
                    
                    <div class="quadrant-dot" style="left: ${bizScore}%; bottom: ${techScore}%;"></div>
                </div>

                <div class="w-full grid grid-cols-2 gap-4">
                    <div class="bg-purple-50 p-4 rounded-2xl text-center">
                        <div class="text-[10px] text-purple-600 uppercase font-bold tracking-wider mb-1">Biz Score</div>
                        <div class="text-3xl font-bold text-purple-900">${bizScore}</div>
                    </div>
                    <div class="bg-blue-50 p-4 rounded-2xl text-center">
                        <div class="text-[10px] text-blue-600 uppercase font-bold tracking-wider mb-1">Tech Score</div>
                        <div class="text-3xl font-bold text-blue-900">${techScore}</div>
                    </div>
                </div>
            </div>

            <!-- Right: AI Analysis -->
            <div class="flex flex-col h-full">
                <div class="bg-white p-8 rounded-3xl border border-gray-100 shadow-card flex-grow relative overflow-hidden">
                    <div class="flex justify-between items-center mb-6 relative z-10">
                        <h3 class="font-bold text-lg text-gray-900">AI Advisor Strategy</h3>
                        <div class="w-8 h-8 rounded-full bg-yellow-50 flex items-center justify-center text-yellow-500">
                            <i class="fa-solid fa-lightbulb"></i>
                        </div>
                    </div>
                    
                    <div id="summary-ai-content" class="text-sm text-gray-600 space-y-6 relative z-10">
                        <div class="animate-pulse space-y-3">
                            <div class="h-2 bg-gray-100 rounded w-full"></div>
                            <div class="h-2 bg-gray-100 rounded w-5/6"></div>
                            <div class="h-2 bg-gray-100 rounded w-4/6"></div>
                        </div>
                        <p class="text-xs text-gray-400">Generating strategic insights based on 12 data points...</p>
                    </div>

                    <!-- Decorative blob -->
                    <div class="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-gray-50 to-transparent rounded-bl-full -z-0 opacity-50"></div>
                </div>
                
                <button id="btn-back-discovery" class="mt-4 w-full py-3 bg-white border border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300 rounded-full text-sm font-semibold transition-all shadow-sm btn-pill">
                    Update Discovery & Recalculate
                </button>
            </div>
        </div>

        <!-- Low Score Items -->
        <div class="bg-gray-50 rounded-3xl p-8 border border-gray-100">
             <div class="flex items-center gap-2 mb-6">
                <h3 class="font-bold text-lg text-gray-900">Risk Factors</h3>
                <span class="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">${lowItems.length} Detected</span>
             </div>
             
             <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                ${lowItems.length > 0 ? lowItems.map(item => `
                    <div class="p-4 bg-white border border-red-100 rounded-xl shadow-sm flex items-start gap-3">
                        <i class="fa-solid fa-triangle-exclamation text-red-500 mt-1 text-xs"></i>
                        <div>
                            <div class="font-bold text-gray-800 text-sm mb-1">${item.catLabel}</div>
                            <div class="text-xs text-gray-500 mb-2">${item.label}</div>
                            <span class="text-[10px] font-bold bg-red-50 text-red-600 px-2 py-1 rounded border border-red-100">
                                Score: ${item.val} / 5
                            </span>
                        </div>
                    </div>
                `).join('') : '<div class="col-span-full text-center text-gray-400 py-4">No critical risks identified.</div>'}
             </div>
        </div>
    `;

    document.getElementById('btn-back-discovery').addEventListener('click', () => {
        navigateTo('details', { id: dealId });
    });

    generateSummaryAI(deal, bizScore, techScore, lowItems);
}

function calculateScores(deal) {
    const calcSection = (type) => {
        const config = ASSESSMENT_CONFIG[type];
        let totalWeightedScore = 0;
        
        config.categories.forEach(cat => {
            const item1 = deal.assessment[type].scores[`${cat.id}_0`] || 0;
            const item2 = deal.assessment[type].scores[`${cat.id}_1`] || 0;
            const avg = (item1 + item2) / 2;
            const weight = deal.assessment[type].weights[cat.id] || 0;
            totalWeightedScore += avg * weight;
        });

        return Math.round(totalWeightedScore / 5);
    };

    const bizScore = calcSection('biz');
    const techScore = calcSection('tech');

    const lowItems = [];
    ['biz', 'tech'].forEach(type => {
        const config = ASSESSMENT_CONFIG[type];
        config.categories.forEach(cat => {
            cat.items.forEach((label, idx) => {
                const id = `${cat.id}_${idx}`;
                const val = deal.assessment[type].scores[id] || 0;
                if (val > 0 && val <= 2) {
                    lowItems.push({ catLabel: cat.label, label, val });
                }
            });
        });
    });

    return { bizScore, techScore, lowItems };
}

async function generateSummaryAI(deal, bizScore, techScore, lowItems) {
    const container = document.getElementById('summary-ai-content');
    
    try {
        const evidence = Object.values(deal.discovery)
            .filter(s => s.result && s.result.evidenceSummary)
            .map(s => s.result.evidenceSummary)
            .join(' ');

        const lowItemsText = lowItems.map(i => `- ${i.catLabel} (${i.label}): ${i.val}`).join('\n');

        const prompt = `
            Task: Strategic Deal Review.
            Language: Korean (Must output strictly in Korean).
            Deal: ${deal.dealName} (Biz: ${bizScore}, Tech: ${techScore})
            Risks: ${lowItemsText}
            Evidence: ${evidence}
            
            Return JSON:
            {
                "health": "Short health check sentence",
                "actions": [{"action": "Specific Action", "reason": "Why"}]
            }
        `;

        const result = await callGemini(prompt);
        
        container.innerHTML = `
            <div class="mb-6">
                <h4 class="text-xs font-bold text-gray-400 uppercase mb-2 tracking-wide">Deal Health</h4>
                <p class="font-medium text-gray-800 leading-relaxed bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                    ${result.health || 'Unable to generate health check.'}
                </p>
            </div>
            
            <div>
                <h4 class="text-xs font-bold text-gray-400 uppercase mb-2 tracking-wide">Strategic Actions</h4>
                <ul class="space-y-3">
                    ${result.actions ? result.actions.map(act => `
                        <li class="bg-white border border-gray-100 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                            <div class="font-bold text-gray-900 text-sm mb-1">👉 ${act.action}</div>
                            <div class="text-gray-500 text-xs leading-relaxed">${act.reason}</div>
                        </li>
                    `).join('') : '<li class="text-gray-400 text-sm">No specific actions recommended.</li>'}
                </ul>
            </div>
        `;

    } catch (e) {
        container.innerHTML = `<div class="text-red-400 text-sm bg-red-50 p-3 rounded-lg border border-red-100">AI Service Unavailable. Please try again.</div>`;
    }
}
