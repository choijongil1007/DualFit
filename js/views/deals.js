import { Store } from '../store.js';
import { generateId, showToast } from '../utils.js';
import { navigateTo } from '../app.js';

export function renderDeals(container) {
    const deals = Store.getDeals();

    const html = `
        <div class="flex justify-between items-center mb-8">
            <h1 class="text-3xl font-bold tracking-tight">Deals</h1>
            <button id="btn-create-deal" class="bg-black text-white px-4 py-2 rounded hover:bg-gray-800 transition text-sm font-medium shadow-sm">
                <i class="fa-solid fa-plus mr-2"></i> New Deal
            </button>
        </div>

        <div id="deals-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            ${deals.length === 0 ? `
                <div class="col-span-full text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                    No deals found. Create one to get started.
                </div>
            ` : deals.map(deal => createDealCard(deal)).join('')}
        </div>

        <!-- Create Modal (Hidden by default) -->
        <div id="create-modal" class="fixed inset-0 bg-black/50 hidden z-50 flex items-center justify-center p-4">
            <div class="bg-white w-full max-w-md rounded-lg shadow-2xl p-6">
                <h2 class="text-xl font-bold mb-4">Create New Deal</h2>
                <form id="create-form" class="space-y-3">
                    <div>
                        <label class="block text-xs font-semibold text-gray-500 uppercase mb-1">Client Name</label>
                        <input type="text" name="clientName" required class="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 focus:ring-black focus:border-transparent outline-none">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-gray-500 uppercase mb-1">Project Name (Deal ID)</label>
                        <input type="text" name="dealName" required class="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 focus:ring-black focus:border-transparent outline-none">
                    </div>
                    <div class="grid grid-cols-2 gap-2">
                        <div>
                            <label class="block text-xs font-semibold text-gray-500 uppercase mb-1">Client Contact</label>
                            <input type="text" name="clientContact" class="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 focus:ring-black outline-none">
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-gray-500 uppercase mb-1">Our Contact</label>
                            <input type="text" name="internalContact" class="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 focus:ring-black outline-none">
                        </div>
                    </div>
                    <div>
                         <label class="block text-xs font-semibold text-gray-500 uppercase mb-1">Solution</label>
                         <input type="text" name="solution" class="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 focus:ring-black outline-none">
                    </div>
                    <div>
                         <label class="block text-xs font-semibold text-gray-500 uppercase mb-1">Target Date</label>
                         <input type="date" name="purchaseDate" class="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 focus:ring-black outline-none">
                    </div>
                    <div>
                         <label class="block text-xs font-semibold text-gray-500 uppercase mb-1">Memo</label>
                         <textarea name="memo" class="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 focus:ring-black outline-none" rows="2"></textarea>
                    </div>
                    <div class="flex justify-end gap-2 pt-4">
                        <button type="button" id="btn-cancel-create" class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded text-sm">Cancel</button>
                        <button type="submit" class="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 text-sm">Create</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    container.innerHTML = html;
    attachEvents();
}

function createDealCard(deal) {
    // Calc Progress roughly
    const discoveryStages = Object.values(deal.discovery).filter(s => s.frozen).length;
    const discoveryPct = Math.round((discoveryStages / 4) * 100);
    
    // Assessment rough calc (count filled scores)
    const bizScores = Object.keys(deal.assessment.biz.scores).length;
    const techScores = Object.keys(deal.assessment.tech.scores).length;
    const totalItems = 8 + 8; // 4 cats * 2 items each for both
    const assessPct = Math.round(((bizScores + techScores) / totalItems) * 100);

    return `
        <div class="group relative bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-all cursor-pointer deal-card" data-id="${deal.id}">
            <div class="flex justify-between items-start mb-2">
                <h3 class="font-bold text-lg text-gray-900 truncate pr-2">${deal.dealName}</h3>
                <span class="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded">${deal.clientName}</span>
            </div>
            <p class="text-sm text-gray-500 mb-4 line-clamp-2 h-10">${deal.memo || 'No memo'}</p>
            
            <div class="space-y-2">
                <div>
                    <div class="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Discovery</span>
                        <span>${discoveryPct}%</span>
                    </div>
                    <div class="w-full bg-gray-100 rounded-full h-1.5">
                        <div class="bg-blue-600 h-1.5 rounded-full" style="width: ${discoveryPct}%"></div>
                    </div>
                </div>
                <div>
                    <div class="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Assessment</span>
                        <span>${assessPct}%</span>
                    </div>
                    <div class="w-full bg-gray-100 rounded-full h-1.5">
                        <div class="bg-purple-600 h-1.5 rounded-full" style="width: ${assessPct}%"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function attachEvents() {
    const modal = document.getElementById('create-modal');
    const createBtn = document.getElementById('btn-create-deal');
    const cancelBtn = document.getElementById('btn-cancel-create');
    const form = document.getElementById('create-form');
    
    createBtn.addEventListener('click', () => modal.classList.remove('hidden'));
    cancelBtn.addEventListener('click', () => modal.classList.add('hidden'));
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const newDeal = Store.createEmptyDeal();
        
        newDeal.id = generateId();
        newDeal.clientName = formData.get('clientName');
        newDeal.dealName = formData.get('dealName');
        newDeal.clientContact = formData.get('clientContact');
        newDeal.internalContact = formData.get('internalContact');
        newDeal.solution = formData.get('solution');
        newDeal.purchaseDate = formData.get('purchaseDate');
        newDeal.memo = formData.get('memo');
        
        Store.saveDeal(newDeal);
        modal.classList.add('hidden');
        showToast('Deal created successfully', 'success');
        
        // Reload list
        const app = document.getElementById('app');
        renderDeals(app);
    });

    document.querySelectorAll('.deal-card').forEach(card => {
        card.addEventListener('click', () => {
            const id = card.dataset.id;
            navigateTo('details', { id });
        });
    });
}