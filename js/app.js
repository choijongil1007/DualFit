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
        <div class="mb-8">
             <div class="flex items-center gap-3 mb-3">
                <span class="bg-gray-100 border border-gray-200 px-2.5 py-0.5 rounded-full text-xs font-semibold text-gray-600 tracking-wide uppercase">${deal.clientName}</span>
                <span class="text-gray-300">|</span>
                <span class="text-sm text-gray-500">${deal.solution}</span>
             </div>
             <div class="flex justify-between items-start">
                 <h1 class="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">${deal.dealName}</h1>
                 <button class="text-gray-400 hover:text-gray-800 transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100" id="btn-deal-info">
                    <i class="fa-solid fa-circle-info text-lg"></i>
                 </button>
             </div>
        </div>

        <!-- Segmented Tabs -->
        <div class="bg-gray-100/80 p-1.5 rounded-2xl inline-flex mb-8 shadow-inner">
            <button class="tab-btn px-6 py-2 rounded-xl font-semibold text-sm transition-all duration-200 btn-pill" data-tab="discovery">Discovery</button>
            <button class="tab-btn px-6 py-2 rounded-xl font-semibold text-sm transition-all duration-200 btn-pill" data-tab="assessment">Assessment</button>
        </div>

        <div id="tab-content"></div>
        
        <!-- Info Modal (Premium White Style) -->
        <div id="info-modal" class="fixed inset-0 z-[100] hidden flex items-center justify-center p-4">
            <div class="absolute inset-0 bg-gray-900/20 backdrop-blur-sm modal-backdrop transition-opacity duration-300"></div>
            
            <div class="relative w-full max-w-sm bg-white text-gray-900 rounded-3xl shadow-modal p-8 animate-modal-in">
                <button type="button" class="absolute top-6 right-6 text-gray-400 hover:text-gray-900 transition-colors btn-close-info-modal">
                    <i class="fa-solid fa-xmark text-lg"></i>
                </button>

                <h3 class="text-xl font-bold mb-6 text-gray-900">Deal Details</h3>
                
                <div class="space-y-5">
                    <div class="grid grid-cols-2 gap-6">
                         <div>
                            <span class="block text-xs font-bold text-gray-400 uppercase mb-1.5">Client Contact</span>
                            <div class="text-sm font-medium text-gray-900">${deal.clientContact || '-'}</div>
                        </div>
                        <div>
                            <span class="block text-xs font-bold text-gray-400 uppercase mb-1.5">Internal Lead</span>
                            <div class="text-sm font-medium text-gray-900">${deal.internalContact || '-'}</div>
                        </div>
                    </div>
                    <div>
                         <span class="block text-xs font-bold text-gray-400 uppercase mb-1.5">Target Date</span>
                         <div class="text-sm font-medium text-gray-900">${deal.purchaseDate || '-'}</div>
                    </div>
                    <div>
                         <span class="block text-xs font-bold text-gray-400 uppercase mb-1.5">Memo</span>
                         <div class="text-sm text-gray-600 bg-gray-50 p-4 rounded-xl border border-gray-100 leading-relaxed">
                            ${deal.memo || '<span class="text-gray-400 italic">No memo</span>'}
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
                // Active State: White bg, Shadow, Strong Text
                t.className = 'tab-btn px-6 py-2 rounded-xl font-semibold text-sm transition-all duration-200 btn-pill bg-white text-gray-900 shadow-sm ring-1 ring-gray-200/50';
            } else {
                // Inactive State: Transparent, Gray Text
                t.className = 'tab-btn px-6 py-2 rounded-xl font-medium text-sm transition-all duration-200 btn-pill text-gray-500 hover:text-gray-700 hover:bg-gray-200/50';
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