
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
        <div class="w-full">
            <!-- Action Bar (Outside Report) -->
            <div class="flex justify-between items-center mb-6 px-1 no-print">
                <button id="btn-back-details" class="text-gray-500 hover:text-gray-900 flex items-center gap-2 transition-colors font-medium text-sm">
                    <i class="fa-solid fa-arrow-left"></i> 상세 화면으로
                </button>
                <div class="flex gap-3">
                    <button onclick="window.print()" class="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-all flex items-center gap-2">
                        <i class="fa-solid fa-print"></i> 인쇄 / PDF 저장
                    </button>
                    <button id="btn-recalc" class="bg-gray-900 text-white px-5 py-2 rounded-lg hover:bg-black text-sm font-medium shadow-sm transition-all flex items-center gap-2">
                        <i class="fa-solid fa-rotate"></i> 전략 재생성
                    </button>
                </div>
            </div>

            <!-- Report Container (Paper Style) -->
            <div class="bg-white rounded-none md:rounded-xl shadow-float border border-gray-200 overflow-hidden relative print:shadow-none print:border-none" id="report-content">
                
                <!-- 1. Report Header -->
                <div class="bg-gray-900 text-white p-10 md:p-12 relative overflow-hidden">
                    <div class="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-bl-full -mr-16 -mt-16 pointer-events-none"></div>
                    <div class="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-tr-full -ml-10 -mb-10 pointer-events-none"></div>
                    
                    <div class="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                        <div>
                            <div class="inline-block px-3 py-1 rounded bg-white/10 text-white/90 text-xs font-semibold mb-4 border border-white/10">
                                Final Strategy Report
                            </div>
                            <h1 class="text-3xl md:text-4xl font-bold tracking-tight text-white mb-3 leading-tight">${deal.dealName}</h1>
                            <div class="flex items-center gap-5 text-gray-300 text-sm font-medium">
                                <span class="flex items-center gap-2"><i class="fa-regular fa-building text-gray-400"></i> ${deal.clientName}</span>
                                <span class="w-1 h-1 rounded-full bg-gray-600"></span>
                                <span class="flex items-center gap-2"><i class="fa-solid fa-box-open text-gray-400"></i> ${deal.solution}</span>
                            </div>
                        </div>
                        <div class="text-right">
                            <div class="text-xs text-gray-400 font-medium mb-1">생성일</div>
                            <div class="text-lg font-bold text-white font-mono tracking-tight">${reportDate}</div>
                        </div>
                    </div>
                </div>

                <!-- 2. Executive Dashboard (Quadrant & Score Breakdown) -->
                <div class="p-10 md:p-12 border-b border-gray-100">
                    <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                        
                        <!-- Left: Quadrant Chart (5 cols) -->
                        <div class="lg:col-span-5 flex flex-col items-center">
                            <h3 class="w-full text-lg font-bold text-gray-900 border-l-4 border-gray-900 pl-4 mb-8">
                                적합성 분석 매트릭스
                            </h3>
                            <div class="quadrant-container w-full shadow-sm border border-gray-200 rounded-lg">
                                <div class="quadrant-bg">
                                    <div class="q-zone q-zone-tl"><span class="q-label-inner text-xl font-extrabold leading-tight">기술 양호<br>사업성 부족</span></div>
                                    <div class="q-zone q-zone-tr"><span class="q-label-inner text-xl font-extrabold leading-tight text-emerald-600">최적 (Best Fit)</span></div>
                                    <div class="q-zone q-zone-bl"><span class="q-label-inner text-xl font-extrabold leading-tight text-gray-400">부적합 (Drop)</span></div>
                                    <div class="q-zone q-zone-br"><span class="q-label-inner text-xl font-extrabold leading-tight">사업성 양호<br>기술 부족</span></div>
                                </div>
                                <div class="quadrant-line-x"></div>
                                <div class="quadrant-line-y"></div>
                                <div class="quadrant-dot" style="left: ${bizScore}%; bottom: ${techScore}%;">
                                    <div class="quadrant-dot-pulse"></div>
                                    <div class="quadrant-tooltip">Biz ${bizScore} / Tech ${techScore}</div>
                                </div>
                            </div>
                            
                            <!-- Total Score Badges -->
                            <div class="flex gap-4 mt-8 w-full">
                                <div class="flex-1 bg-white rounded-lg p-4 border border-gray-200 shadow-sm flex items-center justify-between">
                                    <span class="text-xs font-bold text-gray-500 tracking-wide">Biz Score</span>
                                    <span class="text-2xl font-bold text-gray-900">${bizScore}</span>
                                </div>
                                <div class="flex-1 bg-white rounded-lg p-4 border border-gray-200 shadow-sm flex items-center justify-between">
                                    <span class="text-xs font-bold text-gray-500 tracking-wide">Tech Score</span>
                                    <span class="text-2xl font-bold text-gray-900">${techScore}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Right: Detailed Score Breakdown (7 cols) -->
                        <div class="lg:col-span-7">
                            <h3 class="text-lg font-bold text-gray-900 border-l-4 border-gray-900 pl-4 mb-8">
                                세부 평가 점수
                            </h3>
                            
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
                                <!-- Biz Column -->
                                <div>
                                    <div class="flex items-center gap-2 mb-5 pb-2 border-b border-gray-100">
                                        <i class="fa-solid fa-briefcase text-purple-600"></i>
                                        <span class="font-bold text-gray-800 text-sm">Biz Fit</span>
                                    </div>
                                    <div class="space-y-5">
                                        ${renderScoreBars(categoryScores.biz)}
                                    </div>
                                </div>

                                <!-- Tech Column -->
                                <div>
                                    <div class="flex items-center gap-2 mb-5 pb-2 border-b border-gray-100">
                                        <i class="fa-solid fa-server text-blue-600"></i>
                                        <span class="font-bold text-gray-800 text-sm">Tech Fit</span>
                                    </div>
                                    <div class="space-y-5">
                                        ${renderScoreBars(categoryScores.tech)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 3. AI Strategic Analysis (New 5-Layer Engine) -->
                <div class="p-10 md:p-12 bg-gray-50/50">
                    <div class="flex items-center justify-between mb-8">
                        <h3 class="text-lg font-bold text-gray-900 border-l-4 border-indigo-500 pl-4 flex items-center gap-2">
                            AI 전략 분석 (Competitive Strategy)
                        </h3>
                        <span class="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-1 rounded hidden md:inline-block">Powered by 5-Layer Strategy Engine</span>
                    </div>

                    <div id="summary-ai-content" class="min-h-[200px]">
                        <!-- Content will be injected here -->
                        <div class="space-y-8 animate-pulse">
                            <div class="h-40 bg-gray-200 rounded-lg w-full"></div>
                            <div class="grid grid-cols-2 gap-6">
                                <div class="h-40 bg-gray-200 rounded-lg"></div>
                                <div class="h-40 bg-gray-200 rounded-lg"></div>
                            </div>
                        </div>
                        <p class="text-center text-xs text-gray-400 mt-6 font-medium">전략 수립 중...</p>
                    </div>
                </div>

                <!-- Footer -->
                <div class="bg-gray-100 p-8 text-center border-t border-gray-200">
                    <p class="text-xs text-gray-500 font-medium">DualFit AI 생성 • 대외비 (Confidential)</p>
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
    if (deal.summaryReport && deal.summaryReport.top3) {
        renderAIContent(deal.summaryReport);
    } else {
        generateSummaryAI(deal, bizScore, techScore, lowItems);
    }
}

function renderScoreBars(categoryData) {
    return categoryData.map(cat => {
        const pct = (cat.avg / 5) * 100;
        let colorClass = 'bg-gray-400';
        if (cat.avg >= 4) colorClass = 'bg-emerald-500';
        else if (cat.avg >= 3) colorClass = 'bg-blue-500';
        else if (cat.avg >= 2) colorClass = 'bg-amber-400';
        else colorClass = 'bg-red-400';

        return `
            <div>
                <div class="flex justify-between items-end mb-1.5">
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
            
            const val1 = item1 === 0 ? 1 : item1;
            const val2 = item2 === 0 ? 1 : item2;

            const avg = (val1 + val2) / 2;
            const weight = deal.assessment[type].weights[cat.id] || 0;
            totalWeightedScore += avg * weight;

            catScores.push({ id: cat.id, label: cat.label, avg: avg });
        });

        return { score: Math.round(totalWeightedScore / 5), catScores };
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
        categoryScores: { biz: bizData.catScores, tech: techData.catScores }
    };
}

function renderAIContent(result) {
    const container = document.getElementById('summary-ai-content');
    if (!container) return;

    const formatDesc = (text) => {
        if (!text) return '';
        let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-gray-900">$1</strong>');
        formatted = formatted.replace(/(^|\n)[-]\s+/g, '$1• ');
        return formatted;
    };

    const renderCard = (title, desc, colorClass) => `
        <div class="bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-all h-full flex flex-col">
            <h5 class="text-sm font-bold ${colorClass} mb-2">${title}</h5>
            <div class="text-sm text-gray-700 leading-relaxed whitespace-pre-line flex-grow">${formatDesc(desc)}</div>
        </div>
    `;

    container.innerHTML = `
        <div class="space-y-10">
            <!-- 1. Top 3 Strategic Priorities -->
            <div>
                <h4 class="text-xl font-bold text-gray-900 mb-5 flex items-center gap-2">
                    <i class="fa-solid fa-crown text-yellow-500"></i> Top 3 핵심 전략 (Priority)
                </h4>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
                    ${result.top3 ? result.top3.map((item, idx) => `
                        <div class="bg-gray-900 text-white rounded-xl p-6 shadow-lg relative overflow-hidden group">
                            <div class="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
                            <div class="relative z-10">
                                <div class="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Strategy 0${idx+1}</div>
                                <h5 class="text-lg font-bold text-white mb-3 leading-tight">${item.title}</h5>
                                <div class="text-sm text-gray-300 leading-relaxed whitespace-pre-line">${formatDesc(item.desc)}</div>
                            </div>
                        </div>
                    `).join('') : '<div class="text-gray-400">데이터 없음</div>'}
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                <!-- 2. Opportunity Strategies -->
                <div>
                    <h4 class="text-xl font-bold text-gray-900 mb-5 flex items-center gap-2">
                        <i class="fa-solid fa-rocket text-blue-600"></i> 기회 활용 전략 (Opportunity)
                    </h4>
                    <div class="space-y-4">
                        ${result.opportunities ? result.opportunities.map(item => renderCard(item.title, item.desc, 'text-blue-700')).join('') : ''}
                    </div>
                </div>

                <!-- 3. Risk Mitigation -->
                <div>
                    <h4 class="text-xl font-bold text-gray-900 mb-5 flex items-center gap-2">
                        <i class="fa-solid fa-shield-halved text-red-600"></i> 리스크 완화 전략 (Risk)
                    </h4>
                    <div class="space-y-4">
                        ${result.risks ? result.risks.map(item => renderCard(item.title, item.desc, 'text-red-700')).join('') : ''}
                    </div>
                </div>
            </div>

            <!-- 4. Differentiation Messages -->
            <div>
                <h4 class="text-xl font-bold text-gray-900 mb-5 flex items-center gap-2">
                    <i class="fa-solid fa-bullhorn text-purple-600"></i> 차별화 메시지 (Differentiation)
                </h4>
                <div class="bg-purple-50 border border-purple-100 rounded-xl p-6 md:p-8">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        ${result.differentiation ? result.differentiation.map(item => `
                            <div class="flex gap-4">
                                <div class="mt-1 flex-shrink-0 w-8 h-8 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center font-bold">
                                    <i class="fa-solid fa-quote-left text-sm"></i>
                                </div>
                                <div>
                                    <h5 class="font-bold text-gray-900 text-base mb-1">${item.title}</h5>
                                    <p class="text-gray-700 text-sm leading-relaxed">${formatDesc(item.desc)}</p>
                                </div>
                            </div>
                        `).join('') : ''}
                    </div>
                </div>
            </div>
        </div>
    `;
}

async function generateSummaryAI(deal, bizScore, techScore, lowItems) {
    const container = document.getElementById('summary-ai-content');
    
    // Skeleton UI
    container.innerHTML = `
        <div class="space-y-8 animate-pulse">
            <div class="h-40 bg-gray-200 rounded-lg w-full"></div>
            <div class="grid grid-cols-2 gap-6">
                <div class="h-40 bg-gray-200 rounded-lg"></div>
                <div class="h-40 bg-gray-200 rounded-lg"></div>
            </div>
        </div>
        <p class="text-center text-xs text-gray-400 mt-6 font-medium">5단계 추론 엔진 가동 중... (약 5-10초 소요)</p>
    `;

    try {
        const evidence = Object.values(deal.discovery)
            .filter(s => s.result && s.result.evidenceSummary)
            .map(s => s.result.evidenceSummary)
            .join(' ');

        const jtbd = Object.values(deal.discovery)
            .filter(s => s.result && s.result.jtbd)
            .flatMap(s => s.result.jtbd)
            .join(', ');

        const lowItemsText = lowItems.map(i => `- ${i.catLabel} (${i.label}): ${i.val}점`).join('\n');

        const prompt = `
            [SYSTEM]
            Role: Competitive Strategy Generator for B2B Sales.
            Goal: Generate deal-specific competitive strategies using a 5-Layer Strategy Engine.
            Language: Korean (Professional Business Tone).

            [INTERNAL ENGINE LOGIC - DO NOT OUTPUT THIS PART]
            1. Demand Signal Layer: Analyze Behavior, Emotion, Pain, JTBD to find urgency & political signals.
            2. Fit Matrix Layer: Analyze Biz/Tech scores to define Strengths/Weaknesses.
            3. Strategic Tension Layer: Combine Opportunity/Threat with Strength/Weakness -> Derive SO, ST, WO, WT strategies.
            4. Value Narrative Layer: Create differentiation messages based on JTBD.
            5. Action Playbook Layer: Generate specific actions for [AE], [PreSales], [CSM].

            [DATA INPUT]
            - Client: ${deal.clientName}
            - Deal: ${deal.dealName}
            - Biz Score: ${bizScore}/100, Tech Score: ${techScore}/100
            - Weak Points (Risk):
            ${lowItemsText}
            - Discovery Evidence: ${evidence}
            - Customer JTBD: ${jtbd}

            [OUTPUT REQUIREMENT]
            Return a SINGLE JSON object. 
            Prefix specific actions with role tags like [AE], [PreSales], [CSM] where applicable in the description.

            {
                "top3": [ 
                    { "title": "Strategy Title", "desc": "Actionable strategy description with Role tag." },
                    { "title": "Strategy Title", "desc": "..." },
                    { "title": "Strategy Title", "desc": "..." }
                ],
                "opportunities": [
                    { "title": "Opportunity Strategy 1", "desc": "Offensive strategy based on SO/WO." },
                    { "title": "Opportunity Strategy 2", "desc": "..." }
                ],
                "risks": [
                    { "title": "Risk Mitigation 1", "desc": "Defensive strategy based on ST/WT & Fit Risks." },
                    { "title": "Risk Mitigation 2", "desc": "..." }
                ],
                "differentiation": [
                    { "title": "Value Message 1", "desc": "Key differentiator against competitors." },
                    { "title": "Value Message 2", "desc": "..." }
                ]
            }
        `;

        const result = await callGemini(prompt);
        
        deal.summaryReport = result;
        Store.saveDeal(deal);
        
        renderAIContent(result);

    } catch (e) {
        console.error(e);
        container.innerHTML = `
            <div class="bg-red-50 p-6 rounded-lg border border-red-200 text-center">
                <i class="fa-solid fa-circle-exclamation text-red-500 text-2xl mb-3"></i>
                <p class="text-red-700 font-bold text-sm">전략 보고서 생성 실패</p>
                <p class="text-red-500 text-xs mt-1">AI 엔진 응답 오류. 다시 시도해주세요.</p>
            </div>
        `;
    }
}
