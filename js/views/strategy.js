
import { Store } from '../store.js';
import { callGemini } from '../api.js';
import { ASSESSMENT_CONFIG } from '../config.js';
import { showToast, setButtonLoading, renderMarkdownLike } from '../utils.js';

export function renderStrategy(container, dealId, isTab = false) {
    const deal = Store.getDeal(dealId);
    if (!deal) return;
    
    // Data Migration: summaryReport -> strategyReport
    if (deal.summaryReport && !deal.strategyReport) {
        deal.strategyReport = deal.summaryReport;
        delete deal.summaryReport;
        Store.saveDeal(deal);
    }

    let bizScore = 0;
    let techScore = 0;
    let categoryScores = { biz: {}, tech: {} };

    try {
        const scores = calculateScores(deal);
        bizScore = scores.bizScore;
        techScore = scores.techScore;
        categoryScores = scores.categoryScores;
    } catch (e) {
        console.warn("Score calculation failed:", e);
    }

    const reportDate = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

    // Check prerequisites
    // Discovery: Relaxed check - consider done if ANY stage has a result (ignoring frozen state for UX)
    const isDiscoveryDone = deal.discovery && Object.values(deal.discovery).some(stage => !!stage.result);
    // Assessment: Scores must be calculated (non-zero implies some assessment done)
    const isAssessmentDone = (bizScore > 0 && techScore > 0); 
    
    const isReady = isDiscoveryDone && isAssessmentDone;

    const actionBarClass = isTab ? 'hidden' : 'flex';

    const html = `
        <div class="w-full">
            <!-- Action Bar -->
             <div class="${actionBarClass} justify-between items-center mb-6 px-1 no-print">
                <button id="btn-back-details" class="text-gray-500 hover:text-gray-900 flex items-center gap-2 transition-colors font-medium text-sm">
                    <i class="fa-solid fa-arrow-left"></i> 상세 화면으로
                </button>
                <div class="flex gap-3">
                    <button onclick="window.print()" class="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-all flex items-center gap-2">
                        <i class="fa-solid fa-print"></i> 인쇄 / PDF 저장
                    </button>
                    ${isReady ? `
                    <button id="btn-recalc-strategy" class="bg-gray-900 text-white px-5 py-2 rounded-lg hover:bg-black text-sm font-medium shadow-sm transition-all flex items-center gap-2">
                        <i class="fa-solid fa-rotate"></i> 전략 재생성
                    </button>
                    ` : ''}
                </div>
            </div>

            ${isTab ? `
            <div class="flex justify-end gap-3 mb-6 no-print">
                <button onclick="window.print()" class="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-all flex items-center gap-2">
                    <i class="fa-solid fa-print"></i> 인쇄 / PDF 저장
                </button>
                ${isReady ? `
                <button id="btn-recalc-tab-strategy" class="bg-gray-900 text-white px-5 py-2 rounded-lg hover:bg-black text-sm font-medium shadow-sm transition-all flex items-center gap-2">
                    <i class="fa-solid fa-rotate"></i> 전략 재생성
                </button>
                ` : ''}
            </div>
            ` : ''}

            <!-- Report Content -->
             <div class="bg-white rounded-none md:rounded-xl shadow-float border border-gray-200 overflow-hidden relative print:shadow-none print:border-none" id="report-content">
                <!-- Header -->
                <div class="bg-gray-900 text-white p-10 md:p-12 relative overflow-hidden">
                     <!-- decorative elements -->
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

                <!-- Dashboard -->
                 <div class="p-10 md:p-12 border-b border-gray-100">
                    <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                         <!-- Quadrant -->
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
                            <!-- Score Badges -->
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
                        
                        <!-- Breakdown -->
                        <div class="lg:col-span-7">
                            <h3 class="text-lg font-bold text-gray-900 border-l-4 border-gray-900 pl-4 mb-8">
                                세부 평가 점수
                            </h3>
                             <div class="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
                                <!-- Biz -->
                                <div>
                                    <div class="flex items-center gap-2 mb-5 pb-2 border-b border-gray-100">
                                        <i class="fa-solid fa-briefcase text-purple-600"></i>
                                        <span class="font-bold text-gray-800 text-sm">Biz Fit</span>
                                    </div>
                                    <div class="space-y-5">
                                        ${renderScoreBars(categoryScores.biz)}
                                    </div>
                                </div>
                                <!-- Tech -->
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

                 <!-- AI Section -->
                 <div class="p-10 md:p-12 bg-gray-50/50">
                    <div class="flex items-center justify-between mb-8">
                        <h3 class="text-lg font-bold text-gray-900 border-l-4 border-indigo-500 pl-4 flex items-center gap-2">
                            AI 전략 분석 (Competitive Strategy)
                        </h3>
                        <span class="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-1 rounded hidden md:inline-block">Powered by 5-Layer Strategy Engine</span>
                    </div>
                    
                    <div id="strategy-ai-content" class="min-h-[200px]">
                        ${!isReady ? `
                             <div class="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-gray-300 rounded-xl bg-white">
                                <div class="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center shadow-sm mb-4 text-gray-400 border border-gray-200">
                                    <i class="fa-solid fa-clipboard-list text-2xl"></i>
                                </div>
                                <h3 class="text-lg font-bold text-gray-900 mb-2">데이터가 충분하지 않습니다</h3>
                                <p class="text-gray-500 max-w-md mx-auto mb-8 text-sm leading-relaxed">
                                    효과적인 AI 전략 보고서를 생성하기 위해서는<br>
                                    <span class="font-semibold text-indigo-600">Discovery</span> 분석과 <span class="font-semibold text-indigo-600">Assessment</span> 평가가 먼저 완료되어야 합니다.
                                </p>
                                <div class="flex flex-col sm:flex-row gap-3">
                                    <button id="btn-go-discovery-missing" class="px-5 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 hover:text-indigo-600 transition-all shadow-sm flex items-center justify-center gap-2">
                                        <i class="fa-regular fa-compass"></i> Discovery 진행하기
                                    </button>
                                    <button id="btn-go-assessment-missing" class="px-5 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 hover:text-indigo-600 transition-all shadow-sm flex items-center justify-center gap-2">
                                        <i class="fa-solid fa-chart-pie"></i> Assessment 진행하기
                                    </button>
                                </div>
                            </div>
                        ` : (deal.strategyReport ? renderStrategyContent(deal.strategyReport) : `
                            <div class="flex flex-col items-center justify-center py-16">
                                <p class="text-gray-500 font-medium mb-6">생성된 전략 보고서가 없습니다.</p>
                                <button id="btn-init-strategy" class="bg-gray-900 text-white px-6 py-3 rounded-lg hover:bg-black font-bold shadow-lg transition-all flex items-center gap-2">
                                    <i class="fa-solid fa-wand-magic-sparkles text-yellow-300"></i> AI 전략 보고서 생성
                                </button>
                            </div>
                        `)}
                    </div>
                 </div>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
    attachEvents(container, deal, isReady);
}

// Helper: Calculate scores safely
function calculateScores(deal) {
    let categoryScores = { biz: {}, tech: {} };
    let bizTotal = 0;
    let techTotal = 0;
    let bizWeightTotal = 0;
    let techWeightTotal = 0;

    ['biz', 'tech'].forEach(type => {
        const config = ASSESSMENT_CONFIG[type];
        if (!config || !config.categories) return;

        config.categories.forEach(cat => {
            let catSum = 0;
            // Handle missing scores
            const scores = (deal.assessment[type] && deal.assessment[type].scores) ? deal.assessment[type].scores : {};
            
            cat.items.forEach((_, idx) => {
                const val = scores[`${cat.id}_${idx}`] || 0;
                catSum += (val === 0 ? 1 : val); // default to 1 if 0
            });
            const avg = catSum / (cat.items.length || 1);
            
            // Handle missing weights
            const weights = (deal.assessment[type] && deal.assessment[type].weights) ? deal.assessment[type].weights : {};
            const weight = (weights[cat.id] !== undefined) ? weights[cat.id] : (cat.defaultWeight || 0);
            
            categoryScores[type][cat.id] = avg;

            if(type === 'biz') {
                bizTotal += avg * weight;
                bizWeightTotal += weight;
            } else {
                techTotal += avg * weight;
                techWeightTotal += weight;
            }
        });
    });

    // Normalize to 0-100
    // Max avg is 5. So max total is 5 * 100 = 500. 
    // We want 0-100 scale. So divide by 5.
    
    // Safety check for 0 weights
    const finalBiz = bizWeightTotal > 0 ? Math.round((bizTotal / bizWeightTotal) * 20) : 0; 
    const finalTech = techWeightTotal > 0 ? Math.round((techTotal / techWeightTotal) * 20) : 0;

    return { 
        bizScore: finalBiz, 
        techScore: finalTech, 
        categoryScores 
    };
}

function renderScoreBars(catScores) {
    if (!catScores) return '';
    const labels = {
        // Biz
        budget: "예산 (Budget)",
        authority: "권한 (Authority)",
        need: "니즈 (Need)",
        timeline: "일정 (Timeline)",
        // Tech
        req: "요구사항 적합성",
        arch: "아키텍처 호환성",
        data: "데이터 & 통합",
        ops: "운영 용이성"
    };

    return Object.entries(catScores).map(([key, score]) => {
        const pct = (score / 5) * 100;
        return `
            <div>
                <div class="flex justify-between text-xs font-semibold text-gray-500 mb-1.5">
                    <span>${labels[key] || key}</span>
                    <span class="text-gray-900">${score.toFixed(1)} / 5.0</span>
                </div>
                <div class="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div class="bg-gray-800 h-2 rounded-full" style="width: ${pct}%"></div>
                </div>
            </div>
        `;
    }).join('');
}

function renderStrategyContent(report) {
    if (!report) return '';
    
    // Safety check: ensure actionItems is an array
    const actionItems = Array.isArray(report.actionItems) ? report.actionItems : [];

    return `
        <div class="space-y-8 animate-modal-in">
             <!-- 1. Executive Summary -->
             <div class="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
                <h4 class="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <i class="fa-solid fa-quote-left text-indigo-500"></i> Executive Summary
                </h4>
                <div class="text-gray-700 text-sm leading-relaxed whitespace-pre-line">
                    ${renderMarkdownLike(report.executiveSummary)}
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- 2. Winning Strategy -->
                <div class="bg-white p-8 rounded-xl border border-gray-200 shadow-sm border-l-4 border-l-indigo-500">
                    <h4 class="text-base font-bold text-gray-900 mb-4">Winning Strategy</h4>
                    <div class="text-gray-700 text-sm leading-relaxed whitespace-pre-line">
                        ${renderMarkdownLike(report.winningStrategy)}
                    </div>
                </div>
                
                <!-- 3. Risk Mitigation -->
                <div class="bg-white p-8 rounded-xl border border-gray-200 shadow-sm border-l-4 border-l-rose-500">
                    <h4 class="text-base font-bold text-gray-900 mb-4">Risk Mitigation</h4>
                    <div class="text-gray-700 text-sm leading-relaxed whitespace-pre-line">
                        ${renderMarkdownLike(report.riskMitigation)}
                    </div>
                </div>
            </div>

            <!-- 4. Key Action Items -->
            <div class="bg-slate-800 text-white p-8 rounded-xl shadow-lg">
                <h4 class="text-base font-bold text-white mb-6 flex items-center gap-2">
                    <i class="fa-solid fa-check-double text-emerald-400"></i> Key Action Items
                </h4>
                <div class="grid grid-cols-1 gap-4">
                    ${actionItems.length > 0 ? actionItems.map((item, i) => `
                        <div class="flex items-start gap-3 p-3 rounded-lg bg-white/10 border border-white/5">
                            <span class="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold mt-0.5">${i+1}</span>
                            <span class="text-sm text-gray-200 leading-relaxed">${item}</span>
                        </div>
                    `).join('') : '<div class="text-gray-400 text-sm italic p-2">추천 액션 아이템이 없습니다.</div>'}
                </div>
            </div>
        </div>
    `;
}

function attachEvents(container, deal, isReady) {
    const btnBack = container.querySelector('#btn-back-details');
    if (btnBack) {
        btnBack.addEventListener('click', () => {
             if (window.app && window.app.navigateTo) {
                window.app.navigateTo('details', { id: deal.id });
             }
        });
    }

    const btnRecalc = container.querySelector('#btn-recalc-strategy');
    if (btnRecalc) {
        btnRecalc.addEventListener('click', () => generateStrategy(deal));
    }
    
    const btnRecalcTab = container.querySelector('#btn-recalc-tab-strategy');
    if (btnRecalcTab) {
        btnRecalcTab.addEventListener('click', () => generateStrategy(deal));
    }

    const btnInit = container.querySelector('#btn-init-strategy');
    if (btnInit) {
        btnInit.addEventListener('click', () => generateStrategy(deal));
    }

    // Missing data navigation buttons
    const btnGoDiscovery = container.querySelector('#btn-go-discovery-missing');
    if (btnGoDiscovery) {
        btnGoDiscovery.addEventListener('click', () => {
             if (window.app && window.app.navigateTo) {
                window.app.navigateTo('details', { id: deal.id, tab: 'discovery' });
             }
        });
    }

    const btnGoAssessment = container.querySelector('#btn-go-assessment-missing');
    if (btnGoAssessment) {
        btnGoAssessment.addEventListener('click', () => {
             if (window.app && window.app.navigateTo) {
                window.app.navigateTo('details', { id: deal.id, tab: 'assessment' });
             }
        });
    }
}

async function generateStrategy(deal) {
    const contentArea = document.getElementById('strategy-ai-content');
    if (!contentArea) {
        console.error("Strategy content area not found.");
        return;
    }

    // Loading State
    contentArea.innerHTML = `
        <div class="space-y-8 animate-pulse">
            <div class="h-40 bg-gray-200 rounded-lg w-full"></div>
            <div class="grid grid-cols-2 gap-6">
                <div class="h-40 bg-gray-200 rounded-lg"></div>
                <div class="h-40 bg-gray-200 rounded-lg"></div>
            </div>
        </div>
        <p class="text-center text-xs text-gray-400 mt-6 font-medium">5-Layer Engine 분석 중...</p>
    `;

    try {
        // Construct prompt context
        const context = {
            dealName: deal.dealName,
            client: deal.clientName,
            solution: deal.solution,
            discovery: deal.discovery,
            assessment: deal.assessment
        };
        
        // Helper to safe stringify
        const safeJSON = (obj) => JSON.stringify(obj, null, 2);

        const prompt = `
Role: Senior B2B Strategy Consultant.
Goal: Generate a comprehensive Deal Strategy Report.
Language: Korean.

Context:
${safeJSON(context)}

Task:
Analyze the Discovery data (customer journey, pain points) and Assessment data (Biz/Tech fit scores) to create a winning strategy.

Output JSON Structure:
{
  "executiveSummary": "Overall assessment of the deal health and key status (3-4 sentences).",
  "winningStrategy": "Specific approach to win this deal, focusing on strengths and opportunities.",
  "riskMitigation": "Analysis of potential risks (low scores, red flags) and how to overcome them.",
  "actionItems": [
    "Action 1",
    "Action 2",
    "Action 3"
  ]
}
`;

        const result = await callGemini(prompt);
        
        deal.strategyReport = result;
        Store.saveDeal(deal);
        
        contentArea.innerHTML = renderStrategyContent(result);
        showToast('전략 보고서가 생성되었습니다.', 'success');

    } catch (error) {
        console.error("Strategy generation error:", error);
        contentArea.innerHTML = `
            <div class="flex flex-col items-center justify-center py-12 text-red-500">
                <i class="fa-solid fa-triangle-exclamation text-2xl mb-3"></i>
                <p class="font-bold">분석 실패</p>
                <p class="text-sm mt-1 text-red-400">${error.message}</p>
                <button onclick="document.getElementById('btn-recalc-strategy')?.click() || document.getElementById('btn-recalc-tab-strategy')?.click()" class="mt-4 px-4 py-2 bg-white border border-red-200 rounded text-sm text-red-600 hover:bg-red-50">다시 시도</button>
            </div>
        `;
        showToast('전략 생성 실패', 'error');
    }
}
