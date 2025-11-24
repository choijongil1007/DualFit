
import { Store } from '../store.js';
import { callGemini } from '../api.js';
import { ASSESSMENT_CONFIG } from '../config.js';
import { navigateTo } from '../app.js';

export function renderSummary(container, dealId) {
    const deal = Store.getDeal(dealId);
    if (!deal) return;

    const { bizScore, techScore, lowItems, categoryScores } = calculateScores(deal);
    const reportDate = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

    container.innerHTML = `
        <div class="max-w-4xl mx-auto">
            <!-- Action Bar (Outside Report) -->
            <div class="flex justify-between items-center mb-6 px-2 no-print">
                <button id="btn-back-details" class="text-gray-500 hover:text-gray-900 flex items-center gap-2 transition-colors font-medium text-sm">
                    <i class="fa-solid fa-arrow-left"></i> 돌아가기
                </button>
                <div class="flex gap-3">
                    <button onclick="window.print()" class="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-full text-sm font-semibold shadow-sm transition-all flex items-center gap-2">
                        <i class="fa-solid fa-print"></i> 인쇄 / PDF 저장
                    </button>
                    <button id="btn-recalc" class="bg-gray-900 text-white px-5 py-2 rounded-full hover:bg-black text-sm font-semibold shadow-lg shadow-gray-900/20 transition-all flex items-center gap-2">
                        <i class="fa-solid fa-rotate"></i> AI 전략 재생성
                    </button>
                </div>
            </div>

            <!-- Report Container (Paper Style) -->
            <div class="bg-white rounded-t-3xl rounded-b-3xl shadow-2xl border border-gray-200 overflow-hidden relative" id="report-content">
                
                <!-- 1. Report Header -->
                <div class="bg-[#1e293b] text-white p-8 md:p-10 relative overflow-hidden">
                    <div class="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-bl-full -mr-16 -mt-16 pointer-events-none"></div>
                    <div class="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-tr-full -ml-10 -mb-10 pointer-events-none"></div>
                    
                    <div class="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                        <div>
                            <div class="inline-block px-3 py-1 rounded-full bg-white/10 text-white/90 text-xs font-bold uppercase tracking-wider mb-3 border border-white/10">
                                Final Strategy Report
                            </div>
                            <h1 class="text-3xl md:text-4xl font-bold tracking-tight text-white mb-2">${deal.dealName}</h1>
                            <div class="flex items-center gap-4 text-gray-300 text-sm">
                                <span class="flex items-center gap-1.5"><i class="fa-regular fa-building"></i> ${deal.clientName}</span>
                                <span class="w-1 h-1 rounded-full bg-gray-500"></span>
                                <span class="flex items-center gap-1.5"><i class="fa-solid fa-box-open"></i> ${deal.solution}</span>
                            </div>
                        </div>
                        <div class="text-right">
                            <div class="text-xs text-gray-400 uppercase tracking-widest mb-1">Report Date</div>
                            <div class="text-lg font-bold text-white font-mono">${reportDate}</div>
                        </div>
                    </div>
                </div>

                <!-- 2. Executive Dashboard (Quadrant & Score Breakdown) -->
                <div class="p-8 md:p-10 border-b border-gray-100">
                    <div class="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                        
                        <!-- Left: Quadrant Chart (5 cols) -->
                        <div class="lg:col-span-5 flex flex-col items-center">
                            <h3 class="w-full text-xl font-bold text-gray-900 uppercase tracking-wide border-l-4 border-gray-900 pl-3 mb-6">
                                적합도 분석 매트릭스
                            </h3>
                            <div class="quadrant-container w-full shadow-sm border border-gray-200 rounded-xl">
                                <div class="quadrant-bg">
                                    <div class="q-zone q-zone-tl"><span class="q-label-inner text-[10px]">Tech OK<br>Biz Weak</span></div>
                                    <div class="q-zone q-zone-tr"><span class="q-label-inner text-[10px] text-emerald-600">Best Fit</span></div>
                                    <div class="q-zone q-zone-bl"><span class="q-label-inner text-[10px] text-gray-400">Drop</span></div>
                                    <div class="q-zone q-zone-br"><span class="q-label-inner text-[10px]">Biz OK<br>Tech Weak</span></div>
                                </div>
                                <div class="quadrant-line-x"></div>
                                <div class="quadrant-line-y"></div>
                                <div class="quadrant-dot" style="left: ${bizScore}%; bottom: ${techScore}%;">
                                    <div class="quadrant-dot-pulse"></div>
                                    <div class="quadrant-tooltip">Biz ${bizScore} / Tech ${techScore}</div>
                                </div>
                            </div>
                            
                            <!-- Total Score Badges -->
                            <div class="flex gap-4 mt-6 w-full">
                                <div class="flex-1 bg-gray-50 rounded-xl p-3 border border-gray-100 flex items-center justify-between">
                                    <span class="text-xs font-bold text-gray-500">Biz Score</span>
                                    <span class="text-xl font-bold text-gray-900">${bizScore}</span>
                                </div>
                                <div class="flex-1 bg-gray-50 rounded-xl p-3 border border-gray-100 flex items-center justify-between">
                                    <span class="text-xs font-bold text-gray-500">Tech Score</span>
                                    <span class="text-xl font-bold text-gray-900">${techScore}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Right: Detailed Score Breakdown (7 cols) -->
                        <div class="lg:col-span-7">
                            <h3 class="text-xl font-bold text-gray-900 uppercase tracking-wide border-l-4 border-gray-900 pl-3 mb-6">
                                적합도 점수 상세
                            </h3>
                            
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                <!-- Biz Column -->
                                <div>
                                    <div class="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
                                        <i class="fa-solid fa-briefcase text-purple-600"></i>
                                        <span class="font-bold text-gray-800 text-sm">Biz Fit</span>
                                    </div>
                                    <div class="space-y-4">
                                        ${renderScoreBars(categoryScores.biz)}
                                    </div>
                                </div>

                                <!-- Tech Column -->
                                <div>
                                    <div class="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
                                        <i class="fa-solid fa-server text-blue-600"></i>
                                        <span class="font-bold text-gray-800 text-sm">Tech Fit</span>
                                    </div>
                                    <div class="space-y-4">
                                        ${renderScoreBars(categoryScores.tech)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 3. AI Strategic Analysis -->
                <div class="p-8 md:p-10 bg-gray-50/50">
                    <h3 class="text-xl font-bold text-gray-900 uppercase tracking-wide border-l-4 border-indigo-500 pl-3 mb-6 flex items-center gap-2">
                        AI 전략 분석 <i class="fa-solid fa-wand-magic-sparkles text-indigo-400 text-sm"></i>
                    </h3>

                    <div id="summary-ai-content" class="min-h-[200px]">
                        <!-- Content will be injected here (Skeleton or Result) -->
                        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-pulse">
                            <div class="lg:col-span-2 space-y-3">
                                <div class="h-32 bg-gray-200 rounded-xl w-full"></div>
                            </div>
                            <div class="space-y-3">
                                <div class="h-8 bg-gray-200 rounded-lg w-full"></div>
                                <div class="h-8 bg-gray-200 rounded-lg w-full"></div>
                                <div class="h-8 bg-gray-200 rounded-lg w-full"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 4. Risk Factors (Full Width) -->
                ${lowItems.length > 0 ? `
                <div class="p-8 md:p-10 border-t border-gray-200 bg-red-50/30">
                    <h3 class="text-xl font-bold text-red-700 uppercase tracking-wide border-l-4 border-red-500 pl-3 mb-6 flex items-center gap-2">
                        주의 사항 <span class="bg-red-100 text-red-600 text-[10px] px-2 py-0.5 rounded-full">${lowItems.length}</span>
                    </h3>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        ${lowItems.map(item => `
                            <div class="bg-white border border-red-100 p-4 rounded-xl shadow-sm flex items-start gap-3">
                                <div class="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0 text-red-500 mt-1">
                                    <i class="fa-solid fa-triangle-exclamation text-xs"></i>
                                </div>
                                <div>
                                    <div class="text-xs font-bold text-gray-400 uppercase mb-0.5">${item.catLabel}</div>
                                    <div class="text-sm font-bold text-gray-800 mb-1 leading-tight">${item.label}</div>
                                    <div class="text-xs text-red-600 font-medium">Score: ${item.val} / 5 (Risky)</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : `
                <div class="p-8 md:p-10 border-t border-gray-200 bg-emerald-50/30 flex items-center justify-center gap-3 text-emerald-700">
                    <i class="fa-solid fa-circle-check text-xl"></i>
                    <span class="font-medium">No critical risk factors detected. Deal looks healthy.</span>
                </div>
                `}

                <!-- Footer -->
                <div class="bg-gray-100 p-6 text-center border-t border-gray-200">
                    <p class="text-xs text-gray-400 font-medium">Generated by DualFit AI • Confidential</p>
                </div>
            </div>
            
            <div class="h-20 no-print"></div> <!-- Spacer -->
        </div>
    `;

    document.getElementById('btn-back-details').addEventListener('click', () => {
        navigateTo('details', { id: dealId });
    });

    document.getElementById('btn-recalc').addEventListener('click', () => {
         generateSummaryAI(deal, bizScore, techScore, lowItems);
    });

    // Initial Load Logic: Use Cached or Generate New
    // Ensure we check strictly for existing report data
    if (deal.summaryReport && typeof deal.summaryReport === 'object' && deal.summaryReport.executiveSummary) {
        console.log("DualFit: Loading Summary from Cache");
        renderAIContent(deal.summaryReport);
    } else {
        console.log("DualFit: Generating New Summary");
        generateSummaryAI(deal, bizScore, techScore, lowItems);
    }
}

function renderScoreBars(categoryData) {
    return categoryData.map(cat => {
        // Calculate width percentage (score / 5 * 100)
        const pct = (cat.avg / 5) * 100;
        let colorClass = 'bg-gray-400';
        if (cat.avg >= 4) colorClass = 'bg-emerald-500';
        else if (cat.avg >= 3) colorClass = 'bg-blue-500';
        else if (cat.avg >= 2) colorClass = 'bg-amber-400';
        else colorClass = 'bg-red-400';

        return `
            <div>
                <div class="flex justify-between items-end mb-1">
                    <span class="text-xs font-semibold text-gray-600">${cat.label}</span>
                    <span class="text-xs font-bold text-gray-900">${cat.avg.toFixed(1)}</span>
                </div>
                <div class="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div class="${colorClass} h-2 rounded-full transition-all duration-500" style="width: ${pct}%"></div>
                </div>
            </div>
        `;
    }).join('');
}

function calculateScores(deal) {
    const calcSection = (type) => {
        const config = ASSESSMENT_CONFIG[type];
        let totalWeightedScore = 0;
        const catScores = [];
        
        config.categories.forEach(cat => {
            const item1 = deal.assessment[type].scores[`${cat.id}_0`] || 0;
            const item2 = deal.assessment[type].scores[`${cat.id}_1`] || 0;
            
            // Treat 0 as 1 for calculation
            const val1 = item1 === 0 ? 1 : item1;
            const val2 = item2 === 0 ? 1 : item2;

            const avg = (val1 + val2) / 2;
            const weight = deal.assessment[type].weights[cat.id] || 0;
            totalWeightedScore += avg * weight;

            catScores.push({
                id: cat.id,
                label: cat.label,
                avg: avg
            });
        });

        return { 
            score: Math.round(totalWeightedScore / 5), 
            catScores 
        };
    };

    const bizData = calcSection('biz');
    const techData = calcSection('tech');

    const lowItems = [];
    ['biz', 'tech'].forEach(type => {
        const config = ASSESSMENT_CONFIG[type];
        config.categories.forEach(cat => {
            cat.items.forEach((label, idx) => {
                const id = `${cat.id}_${idx}`;
                const val = deal.assessment[type].scores[id] || 0;
                const displayVal = val === 0 ? 1 : val;
                if (displayVal <= 2) {
                    lowItems.push({ catLabel: cat.label, label, val: displayVal });
                }
            });
        });
    });

    return { 
        bizScore: bizData.score, 
        techScore: techData.score, 
        lowItems,
        categoryScores: {
            biz: bizData.catScores,
            tech: techData.catScores
        }
    };
}

function renderAIContent(result) {
    const container = document.getElementById('summary-ai-content');
    if (!container) return;

    // Helper to format text: render bold, replace hyphens with bullets
    const formatText = (text) => {
        if (!text) return '';
        // 1. Replace markdown bold with HTML bold
        let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-gray-900">$1</strong>');
        // 2. Replace hyphens with bullets (handles start of string or newline followed by hyphen)
        formatted = formatted.replace(/(^|\n)[-]\s+/g, '$1• ');
        return formatted;
    };

    container.innerHTML = `
        <div class="flex flex-col gap-8">
            <!-- Executive Summary -->
            <div class="w-full">
                <h4 class="text-xs font-bold text-gray-500 uppercase mb-3">Executive Summary</h4>
                <div class="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm text-gray-700 leading-relaxed text-sm whitespace-pre-line">
                    ${result.executiveSummary || '종합 분석 내용을 생성하지 못했습니다.'}
                </div>
            </div>
            
            <!-- Action Plan -->
            <div class="w-full">
                <h4 class="text-xs font-bold text-gray-500 uppercase mb-3">Strategic Actions</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    ${result.actions ? result.actions.map(act => {
                        let icon = 'fa-check';
                        let bgClass = 'bg-white border-gray-200';
                        if (act.type === 'strategic') { icon = 'fa-chess'; bgClass = 'bg-indigo-50 border-indigo-100 text-indigo-900'; }
                        if (act.type === 'risk') { icon = 'fa-shield-halved'; bgClass = 'bg-amber-50 border-amber-100 text-amber-900'; }
                        
                        return `
                            <div class="${bgClass} border p-5 rounded-xl shadow-sm hover:shadow-md transition-all h-full">
                                <div class="flex items-start gap-3">
                                    <div class="mt-1 flex-shrink-0"><i class="fa-solid ${icon} text-sm opacity-70"></i></div>
                                    <div class="w-full">
                                        <div class="text-base font-bold mb-2 text-gray-900">${act.title}</div>
                                        <div class="text-sm text-gray-700 leading-relaxed whitespace-pre-line pl-1">${formatText(act.desc)}</div>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('') : '<div class="text-gray-400 text-sm col-span-2">추천 액션이 없습니다.</div>'}
                </div>
            </div>
        </div>
    `;
}

async function generateSummaryAI(deal, bizScore, techScore, lowItems) {
    const container = document.getElementById('summary-ai-content');
    
    // Show Skeleton
    container.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-pulse">
            <div class="lg:col-span-2 space-y-3">
                <div class="h-32 bg-gray-200 rounded-xl w-full"></div>
            </div>
            <div class="space-y-3">
                <div class="h-8 bg-gray-200 rounded-lg w-full"></div>
                <div class="h-8 bg-gray-200 rounded-lg w-full"></div>
                <div class="h-8 bg-gray-200 rounded-lg w-full"></div>
            </div>
        </div>
        <p class="text-center text-xs text-gray-400 mt-4">AI evaluating deal strategy...</p>
    `;

    try {
        const evidence = Object.values(deal.discovery)
            .filter(s => s.result && s.result.evidenceSummary)
            .map(s => s.result.evidenceSummary)
            .join(' ');

        const lowItemsText = lowItems.map(i => `- ${i.catLabel} (${i.label}): ${i.val}점`).join('\n');

        const prompt = `
            Role: Senior Sales Strategist.
            Task: Write a final executive summary for a sales deal.
            Language: Korean (Professional Report Style).
            
            Deal Context:
            - Client: ${deal.clientName}
            - Deal: ${deal.dealName}
            - Biz Score: ${bizScore} / 100
            - Tech Score: ${techScore} / 100
            - Risk Factors:
            ${lowItemsText}
            
            Key Evidence from Discovery:
            ${evidence}
            
            JSON Requirements:
            {
                "executiveSummary": "A comprehensive summary diagnosing the deal's health, main strengths, and critical weaknesses. Split into 2-3 paragraphs separated by line breaks(\\n\\n). Be direct and professional.",
                "actions": [
                    { "type": "strategic", "title": "Action Title", "desc": "Detailed explanation. Use bullet points (- ) and line breaks if there are multiple steps." },
                    { "type": "tactical", "title": "Action Title", "desc": "Detailed explanation. Use bullet points (- ) and line breaks if there are multiple steps." },
                    { "type": "risk", "title": "Action Title", "desc": "Detailed explanation. Use bullet points (- ) and line breaks if there are multiple steps." }
                ]
            }
        `;

        const result = await callGemini(prompt);
        
        // Save Result to Deal and Store
        // Update the deal object strictly before saving
        deal.summaryReport = result;
        Store.saveDeal(deal);
        
        // Render Final AI Content
        renderAIContent(result);

    } catch (e) {
        console.error(e);
        container.innerHTML = `
            <div class="bg-red-50 p-6 rounded-xl border border-red-100 text-center">
                <i class="fa-solid fa-circle-exclamation text-red-400 text-2xl mb-2"></i>
                <p class="text-red-700 font-medium text-sm">AI 전략 리포트 생성 실패</p>
                <p class="text-red-500 text-xs mt-1">네트워크 상태를 확인하고 다시 시도해주세요.</p>
            </div>
        `;
    }
}
