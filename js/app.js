import { renderDeals } from './views/deals.js';
import { renderDiscovery } from './views/discovery.js';
import { renderAssessment } from './views/assessment.js';
import { renderSummary } from './views/summary.js';
import { Store } from './store.js';

const appContainer = document.getElementById('app');
const backBtn = document.getElementById('nav-back-btn');

// Simple Router
export function navigateTo(view, params = {}) {
    appContainer.innerHTML = '';
    
    if (view === 'deals') {
        backBtn.classList.add('hidden');
    } else {
        backBtn.classList.remove('hidden');
    }

    window.scrollTo(0, 0);

    switch (view) {
        case 'deals':
            renderDeals(appContainer);
            break;
        case 'details':
            renderDetailsLayout(appContainer, params.id);
            break;
        case 'summary':
            renderSummary(appContainer, params.id);
            break;
        default:
            renderDeals(appContainer);
    }
}

// Layout for Discovery & Assessment tabs
function renderDetailsLayout(container, dealId) {
    const deal = Store.getDeal(dealId);
    if (!deal) {
        navigateTo('deals');
        return;
    }

    container.innerHTML = `
        <div class="bg-white border border-gray-200 rounded-xl p-8 shadow-card mb-8 relative overflow-hidden">
             <!-- Background accent -->
             <div class="absolute top-0 right-0 w-32 h-32 bg-gray-50 rounded-bl-full pointer-events-none"></div>

             <div class="relative z-10">
                 <div class="flex items-center gap-3 mb-2">
                    <span class="bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded text-xs font-bold text-indigo-700 tracking-wide">${deal.clientName}</span>
                    <span class="text-gray-300">|</span>
                    <span class="text-sm text-gray-500 font-medium">${deal.solution}</span>
                 </div>
                 <div class="flex justify-between items-start">
                     <h1 class="text-3xl font-bold text-gray-900 tracking-tight leading-tight">${deal.dealName}</h1>
                     <button class="text-gray-400 hover:text-gray-900 transition-colors w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200" id="btn-deal-info">
                        <i class="fa-solid fa-circle-info text-lg"></i>
                     </button>
                 </div>
             </div>
        </div>

        <!-- Segmented Control Tabs -->
        <div class="flex border-b border-gray-200 mb-8">
            <button class="tab-btn px-6 py-3 font-semibold text-sm transition-all duration-200 border-b-2" data-tab="discovery">Discovery</button>
            <button class="tab-btn px-6 py-3 font-semibold text-sm transition-all duration-200 border-b-2" data-tab="assessment">Assessment</button>
        </div>

        <div id="tab-content"></div>
        
        <!-- Info Modal -->
        <div id="info-modal" class="fixed inset-0 z-[100] hidden flex items-center justify-center p-4">
            <div class="absolute inset-0 bg-gray-900/30 backdrop-blur-sm modal-backdrop transition-opacity duration-300"></div>
            
            <div class="relative w-full max-w-md bg-white text-gray-900 rounded-xl shadow-modal p-8 animate-modal-in border border-gray-100">
                <button type="button" class="absolute top-5 right-5 text-gray-400 hover:text-gray-600 transition-colors btn-close-info-modal">
                    <i class="fa-solid fa-xmark text-lg"></i>
                </button>

                <h3 class="text-xl font-bold mb-6 text-gray-900">Deal Details</h3>
                
                <div class="space-y-6">
                    <div class="grid grid-cols-2 gap-6">
                         <div>
                            <span class="block text-xs font-semibold text-gray-500 mb-1">Client Contact</span>
                            <div class="text-sm font-bold text-gray-900">${deal.clientContact || '-'}</div>
                        </div>
                        <div>
                            <span class="block text-xs font-semibold text-gray-500 mb-1">Internal Lead</span>
                            <div class="text-sm font-bold text-gray-900">${deal.internalContact || '-'}</div>
                        </div>
                    </div>
                    <div>
                         <span class="block text-xs font-semibold text-gray-500 mb-1">Target Date</span>
                         <div class="text-sm font-bold text-gray-900">${deal.purchaseDate || '-'}</div>
                    </div>
                    <div>
                         <span class="block text-xs font-semibold text-gray-500 mb-1">Memo</span>
                         <div class="text-sm text-gray-700 bg-gray-50 p-4 rounded-lg border border-gray-200 leading-relaxed font-medium">
                            ${deal.memo || '<span class="text-gray-400 italic font-normal">No memo</span>'}
                         </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    const tabContent = document.getElementById('tab-content');
    const tabs = document.querySelectorAll('.tab-btn');

    function switchTab(tabName) {
        tabs.forEach(t => {
            if(t.dataset.tab === tabName) {
                // Active State: Border Bottom, Text Color
                t.className = 'tab-btn px-6 py-3 font-bold text-sm transition-all duration-200 border-b-2 border-indigo-600 text-indigo-700';
            } else {
                // Inactive State: Transparent Border, Gray Text
                t.className = 'tab-btn px-6 py-3 font-medium text-sm transition-all duration-200 border-b-2 border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300';
            }
        });

        if (tabName === 'discovery') {
            renderDiscovery(tabContent, dealId);
        } else {
            renderAssessment(tabContent, dealId);
        }
    }

    tabs.forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    switchTab('discovery');

    const infoModal = document.getElementById('info-modal');
    document.getElementById('btn-deal-info').addEventListener('click', () => infoModal.classList.remove('hidden'));
    
    const closeInfoModal = () => infoModal.classList.add('hidden');
    infoModal.querySelectorAll('.btn-close-info-modal').forEach(btn => btn.addEventListener('click', closeInfoModal));
    infoModal.querySelector('.modal-backdrop').addEventListener('click', closeInfoModal);
}

document.addEventListener('DOMContentLoaded', () => {
    backBtn.addEventListener('click', () => navigateTo('deals'));
    document.getElementById('nav-logo').addEventListener('click', () => navigateTo('deals'));
    navigateTo('deals');
});