
import { renderDeals } from './views/deals.js';
import { renderDiscovery } from './views/discovery.js';
import { renderAssessment } from './views/assessment.js';
import { renderSummary } from './views/summary.js';
import { Store } from './store.js';

const appContainer = document.getElementById('app');
const backBtn = document.getElementById('nav-back-btn');

// Simple Router
export function navigateTo(view, params = {}) {
    // Clear container
    appContainer.innerHTML = '';
    
    // Update Navigation UI
    if (view === 'deals') {
        backBtn.classList.add('hidden');
    } else {
        backBtn.classList.remove('hidden');
    }

    // Scroll to top
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
        <div class="mb-6">
             <h1 class="text-3xl font-bold mb-2">${deal.dealName}</h1>
             <div class="flex gap-2 text-sm text-gray-500">
                <span class="bg-gray-100 px-2 py-1 rounded text-xs font-medium text-gray-600">${deal.clientName}</span>
                <span>${deal.solution}</span>
             </div>
        </div>

        <!-- Tabs -->
        <div class="flex border-b border-gray-200 mb-6 overflow-x-auto">
            <button class="tab-btn px-4 py-2 font-medium text-sm border-b-2 border-black text-black transition-colors whitespace-nowrap" data-tab="discovery">Discovery</button>
            <button class="tab-btn px-4 py-2 font-medium text-sm border-b-2 border-transparent text-gray-500 hover:text-black transition-colors whitespace-nowrap" data-tab="assessment">Assessment</button>
            <button class="ml-auto text-sm text-gray-400 hover:text-gray-800" id="btn-deal-info">
                <i class="fa-solid fa-circle-info"></i> Info
            </button>
        </div>

        <div id="tab-content"></div>
        
        <!-- Info Modal (Modern Dark Style) -->
        <div id="info-modal" class="fixed inset-0 z-[100] hidden flex items-center justify-center p-4">
            <!-- Backdrop -->
            <div class="absolute inset-0 bg-black/60 backdrop-blur-sm modal-backdrop transition-opacity"></div>
            
            <!-- Content -->
            <div class="relative w-full max-w-sm bg-[#111111] text-white border border-white/10 rounded-xl shadow-2xl p-6 animate-modal-in">
                <!-- Close Button (X) -->
                <button type="button" class="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors btn-close-info-modal">
                    <i class="fa-solid fa-xmark text-lg"></i>
                </button>

                <h3 class="text-lg font-bold mb-5 tracking-tight">Deal Information</h3>
                
                <div class="space-y-4 text-sm">
                    <div>
                        <span class="block text-xs font-semibold text-gray-500 uppercase mb-1">Client</span>
                        <div class="text-gray-200">${deal.clientName}</div>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <span class="block text-xs font-semibold text-gray-500 uppercase mb-1">Client Contact</span>
                            <div class="text-gray-200">${deal.clientContact || '-'}</div>
                        </div>
                        <div>
                            <span class="block text-xs font-semibold text-gray-500 uppercase mb-1">Our Contact</span>
                            <div class="text-gray-200">${deal.internalContact || '-'}</div>
                        </div>
                    </div>
                    <div>
                         <span class="block text-xs font-semibold text-gray-500 uppercase mb-1">Target Date</span>
                         <div class="text-gray-200">${deal.purchaseDate || '-'}</div>
                    </div>
                    <div>
                         <span class="block text-xs font-semibold text-gray-500 uppercase mb-1">Memo</span>
                         <div class="text-gray-300 leading-relaxed bg-[#222] p-3 rounded-lg border border-white/5">
                            ${deal.memo || '<span class="text-gray-600">No memo</span>'}
                         </div>
                    </div>
                </div>

                <div class="mt-6 pt-4 border-t border-white/10 text-center">
                    <button class="btn-close-info-modal w-full py-2 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition text-sm">Close</button>
                </div>
            </div>
        </div>
    `;

    const tabContent = document.getElementById('tab-content');
    const tabs = document.querySelectorAll('.tab-btn');

    // Tab Switching Logic
    function switchTab(tabName) {
        tabs.forEach(t => {
            if(t.dataset.tab === tabName) {
                t.classList.replace('border-transparent', 'border-black');
                t.classList.replace('text-gray-500', 'text-black');
            } else {
                t.classList.replace('border-black', 'border-transparent');
                t.classList.replace('text-black', 'text-gray-500');
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

    // Initial load
    switchTab('discovery');

    // Info Modal Logic
    const infoModal = document.getElementById('info-modal');
    
    // Open
    document.getElementById('btn-deal-info').addEventListener('click', () => {
        infoModal.classList.remove('hidden');
    });
    
    // Close functions
    const closeInfoModal = () => infoModal.classList.add('hidden');
    
    // Close on X and button
    infoModal.querySelectorAll('.btn-close-info-modal').forEach(btn => {
        btn.addEventListener('click', closeInfoModal);
    });

    // Close on Backdrop
    infoModal.querySelector('.modal-backdrop').addEventListener('click', closeInfoModal);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Nav Back Button
    backBtn.addEventListener('click', () => navigateTo('deals'));
    document.getElementById('nav-logo').addEventListener('click', () => navigateTo('deals'));

    navigateTo('deals');
});
