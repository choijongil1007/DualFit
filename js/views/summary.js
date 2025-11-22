import { Store } from '../store.js';
import { callGemini } from '../api.js';
import { showLoader, hideLoader, renderMarkdownLike } from '../utils.js';
import { ASSESSMENT_CONFIG } from '../config.js';
import { navigateTo } from '../app.js';

export function renderSummary(container, dealId) {
    const deal = Store.getDeal(dealId);
    if (!deal) return;

    const { bizScore, techScore, lowItems } = calculateScores(deal);

    container.innerHTML = `
        <div class="mb-6 border-b pb-4">
            <h2 class="text-2xl font-bold">Deal Summary</h2>
            <p class="text-gray-500 text-sm">종합 평가 결과 및 권장 액션</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <!-- Left: Quadrant -->
            <div class="bg-white p-6 rounded-lg border border-gray-200 shadow-sm flex flex-col items-center">
                <h3 class="font-bold text-lg mb-4">Quadrant Analysis</h3>
                
                <div class="quadrant-container rounded-lg mb-6">
                    <div class="quadrant-line-x"></div>
                    <div class="quadrant-line-y"></div>
                    <span class="quadrant-label q-top-left">Tech Only</span>
                    <span class="quadrant-label q-top-right text-blue-600">Go / Strong</span>
                    <span class="quadrant-label q-bottom-left text-red-600">No-Go</span>
                    <span class="quadrant-label q-bottom-right">Biz Only</span>
                    
                    <!-- The Dot -->
                    <div class="quadrant-dot" style="left: ${bizScore}%; bottom: ${techScore}%;"></div>
                </div>

                <div class="w-full grid grid-cols-2 gap-4 text-center">
                    <div class="bg-purple-50 p-3 rounded">
                        <div class="text-xs text-purple-800 uppercase font-bold">Biz Fit Score</div>
                        <div class="text-2xl font-bold text-purple-900">${bizScore}</div>
                    </div>
                    <div class="bg-blue-50 p-3 rounded">
                        <div class="text-xs text-blue-800 uppercase font-bold">Tech Fit Score</div>
                        <div class="text-2xl font-bold text-blue-900">${techScore}</div>
                    </div>
                </div>
            </div>

            <!-- Right: AI Analysis -->
            <div class="space-y-6">
                <div class="bg-white p-6 rounded-lg border border-gray-200 shadow-sm h-full flex flex-col">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="font-bold text-lg">AI Strategy Advisor</h3>
                        <i class="fa-solid fa-sparkles text-yellow-500"></i>
                    </div>
                    
                    <div id="summary-ai-content" class="flex-grow text-sm text-gray-700 space-y-4">
                        <div class="animate-pulse space-y-2">
                            <div class="h-4 bg-gray-200 rounded w-3/4"></div>
                            <div class="h-4 bg-gray-200 rounded w-full"></div>
                            <div class="h-4 bg-gray-200 rounded w-5/6"></div>
                        </div>
                    </div>

                    <div class="mt-6 pt-4 border-t border-gray-100">
                        <button id="btn-back-discovery" class="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded text-sm font-medium transition">
                            Discovery 업데이트 후 재평가
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Low Score Items -->
        <div class="mt-8">
             <h3 class="font-bold text-lg mb-3">Risk Items (1-2점)</h3>
             <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                ${lowItems.length > 0 ? lowItems.map(item => `
                    <div class="p-3 border border-red-200 bg-red-50 rounded-md text-sm">
                        <div class="font-bold text-red-800 mb-1">${item.catLabel} > ${item.label}</div>
                        <div class="flex justify-between items-center">
                            <span class="text-red-600 font-medium">${item.val === 1 ? '⚠️ 주의 (1점)' : '⚠️ 유의 (2점)'}</span>
                        </div>
                    </div>
                `).join('') : '<div class="text-gray-500 text-sm italic">위험 항목이 없습니다.</div>'}
             </div>
        </div>
    `;

    document.getElementById('btn-back-discovery').addEventListener('click', () => {
        navigateTo('details', { id: dealId });
    });

    generateSummaryAI(deal, bizScore, techScore, lowItems);
}

function calculateScores(deal) {
    // Helper to calc section
    const calcSection = (type) => {
        const config = ASSESSMENT_CONFIG[type];
        let totalWeightedScore = 0;
        
        config.categories.forEach(cat => {
            // Avg of 2 items
            const item1 = deal.assessment[type].scores[`${cat.id}_0`] || 0;
            const item2 = deal.assessment[type].scores[`${cat.id}_1`] || 0;
            const avg = (item1 + item2) / 2;
            const weight = deal.assessment[type].weights[cat.id] || 0;
            totalWeightedScore += avg * weight;
        });

        // Max possible is 5 * 100 = 500. Scale to 100.
        // Current sum is (Avg 0-5) * Weight. Sum of weights is 100.
        // So totalWeightedScore range is 0 to 500.
        // Score = totalWeightedScore / 5.
        return Math.round(totalWeightedScore / 5);
    };

    const bizScore = calcSection('biz');
    const techScore = calcSection('tech');

    // Find low items
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

        const lowItemsText = lowItems.map(i => `- ${i.catLabel} (${i.label}): ${i.val}점`).join('\n');

        const prompt = `
            역할: 전략적 딜 리뷰어.
            
            [Input]
            Deal: ${deal.dealName}
            Biz Score: ${bizScore}/100
            Tech Score: ${techScore}/100
            
            Low Score Items:
            ${lowItemsText}
            
            Evidence Summary:
            ${evidence}
            
            [Task]
            1. Provide a 1-2 sentence Health Check of this deal.
            2. Provide 1-3 Strategic Recommendations to move this deal forward, specifically addressing the low score items.
            
            [Format]
            Return JSON:
            {
                "health": "String...",
                "actions": [
                    { "action": "...", "reason": "..." }
                ]
            }
        `;

        const result = await callGemini(prompt);
        
        container.innerHTML = `
            <div class="mb-4">
                <h4 class="text-xs font-bold text-gray-500 uppercase mb-1">Deal Health</h4>
                <p class="font-medium text-gray-900 bg-gray-50 p-2 rounded border border-gray-100">
                    ${result.health || '분석 불가'}
                </p>
            </div>
            
            <div>
                <h4 class="text-xs font-bold text-gray-500 uppercase mb-1">Recommended Actions</h4>
                <ul class="space-y-3">
                    ${result.actions ? result.actions.map(act => `
                        <li class="bg-yellow-50 border border-yellow-100 p-3 rounded text-sm">
                            <div class="font-bold text-gray-800 mb-1">👉 ${act.action}</div>
                            <div class="text-gray-600 text-xs">${act.reason}</div>
                        </li>
                    `).join('') : '<li>추천 액션 없음</li>'}
                </ul>
            </div>
        `;

    } catch (e) {
        container.innerHTML = `<div class="text-red-500 text-sm">AI 분석 로드 실패. 다시 시도해주세요.</div>`;
    }
}