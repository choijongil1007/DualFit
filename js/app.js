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
        
        <!-- Edit Info Modal (Simplified) -->
        <div id="info-modal" class="hidden fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
            <div class="bg-white p-6 rounded-lg max-w-sm w-full">
                <h3 class="font-bold mb-4">Deal Info</h3>
                <div class="space-y-2 text-sm mb-4">
                    <p><strong>Client:</strong> ${deal.clientName}</p>
                    <p><strong>Client Contact:</strong> ${deal.clientContact || '-'}</p>
                    <p><strong>Our Contact:</strong> ${deal.internalContact || '-'}</p>
                    <p><strong>Date:</strong> ${deal.purchaseDate || '-'}</p>
                    <p><strong>Memo:</strong> ${deal.memo || '-'}</p>
                </div>
                <button class="w-full bg-black text-white py-2 rounded text-sm" onclick="this.parentElement.parentElement.classList.add('hidden')">Close</button>
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

    // Info Modal
    document.getElementById('btn-deal-info').addEventListener('click', () => {
        document.getElementById('info-modal').classList.remove('hidden');
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Nav Back Button
    backBtn.addEventListener('click', () => navigateTo('deals'));
    document.getElementById('nav-logo').addEventListener('click', () => navigateTo('deals'));

    navigateTo('deals');
});