import { Store } from '../store.js';
import { generateId, showToast } from '../utils.js';
import { navigateTo } from '../app.js';

let deleteTargetId = null;

export function renderDeals(container) {
    const deals = Store.getDeals();

    const html = `
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
                <h1 class="text-2xl font-bold text-gray-900 tracking-tight">Deals</h1>
                <p class="text-gray-500 mt-1 text-sm">Manage your sales opportunities</p>
            </div>
            <button id="btn-create-deal" class="bg-indigo-600 hover:bg-indigo-700 text-white pl-4 pr-5 py-2.5 rounded-lg shadow-sm transition-all text-sm font-medium flex items-center gap-2 active:scale-95 border border-transparent">
                <i class="fa-solid fa-plus text-xs"></i> New Deal
            </button>
        </div>

        <div id="deals-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            ${deals.length === 0 ? `
                <div class="col-span-full flex flex-col items-center justify-center py-24 text-center border border-dashed border-gray-300 rounded-xl bg-white">
                    <div class="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <i class="fa-regular fa-folder-open text-gray-400 text-xl"></i>
                    </div>
                    <p class="text-gray-900 font-medium">No deals yet</p>
                    <p class="text-gray-500 text-sm mt-1">Create your first deal to get started.</p>
                </div>
            ` : deals.map(deal => createDealCard(deal)).join('')}
        </div>

        <!-- Create Modal -->
        <div id="create-modal" class="fixed inset-0 z-[100] hidden flex items-center justify-center p-4">
            <div class="absolute inset-0 bg-gray-900/30 backdrop-blur-sm modal-backdrop transition-opacity"></div>
            <div class="relative w-full max-w-lg bg-white rounded-2xl shadow-modal p-8 animate-modal-in border border-gray-100">
                <button type="button" class="absolute top-5 right-5 text-gray-400 hover:text-gray-600 transition-colors btn-close-modal">
                    <i class="fa-solid fa-xmark text-lg"></i>
                </button>

                <h2 class="text-xl font-bold mb-6 text-gray-900 tracking-tight">New Deal</h2>
                
                <form id="create-form" class="space-y-5">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1.5 ml-0.5">Client Name</label>
                        <input type="text" name="clientName" required class="w-full input-premium" placeholder="e.g. Acme Corp">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1.5 ml-0.5">Project Name</label>
                        <input type="text" name="dealName" required class="w-full input-premium" placeholder="e.g. Cloud Migration">
                    </div>
                    <div class="grid grid-cols-2 gap-5">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1.5 ml-0.5">Client Contact</label>
                            <input type="text" name="clientContact" class="w-full input-premium">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1.5 ml-0.5">Our Contact</label>
                            <input type="text" name="internalContact" class="w-full input-premium">
                        </div>
                    </div>
                    <div>
                         <label class="block text-sm font-medium text-gray-700 mb-1.5 ml-0.5">Solution</label>
                         <input type="text" name="solution" class="w-full input-premium">
                    </div>
                    <div>
                         <label class="block text-sm font-medium text-gray-700 mb-1.5 ml-0.5">Target Date</label>
                         <input type="date" name="purchaseDate" class="w-full input-premium text-gray-700">
                    </div>
                    <div>
                         <label class="block text-sm font-medium text-gray-700 mb-1.5 ml-0.5">Memo</label>
                         <textarea name="memo" class="w-full input-premium resize-none" rows="3"></textarea>
                    </div>
                    
                    <div class="flex justify-end gap-3 pt-6 mt-4 border-t border-gray-100">
                        <button type="button" class="btn-close-modal px-5 py-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors">Cancel</button>
                        <button type="submit" class="px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-all text-sm shadow-sm">Create Deal</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Delete Modal -->
        <div id="delete-modal" class="fixed inset-0 z-[110] hidden flex items-center justify-center p-4">
            <div class="absolute inset-0 bg-gray-900/30 backdrop-blur-sm delete-modal-backdrop transition-opacity"></div>
            <div class="relative w-full max-w-sm bg-white rounded-2xl shadow-modal p-6 animate-modal-in text-center border border-gray-100">
                
                <div class="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4 text-red-500 border border-red-100">
                    <i class="fa-solid fa-trash-can text-lg"></i>
                </div>
                
                <h3 class="text-lg font-bold mb-2 text-gray-900">Delete Deal?</h3>
                <p class="text-gray-500 text-sm mb-6 leading-relaxed">
                    This action cannot be undone. Are you sure you want to delete this deal?
                </p>
                
                <div class="flex gap-3 justify-center">
                    <button type="button" class="btn-close-delete-modal px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium transition-colors">Cancel</button>
                    <button type="button" id="btn-confirm-delete" class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors">Delete</button>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;
    attachEvents();
}

function createDealCard(deal) {
    const discoveryStages = Object.values(deal.discovery).filter(s => s.frozen).length;
    const discoveryPct = Math.round((discoveryStages / 4) * 100);
    
    const bizScores = Object.keys(deal.assessment.biz.scores).length;
    const techScores = Object.keys(deal.assessment.tech.scores).length;
    const totalItems = 16; 
    const assessPct = Math.round(((bizScores + techScores) / totalItems) * 100);

    return `
        <div class="group relative bg-white border border-gray-200 rounded-xl p-6 shadow-card hover:shadow-md hover:border-gray-300 transition-all duration-200 cursor-pointer deal-card flex flex-col h-full" data-id="${deal.id}">
            <div class="flex justify-between items-start mb-3">
                <div class="overflow-hidden pr-2">
                    <span class="text-xs font-semibold text-indigo-600 mb-1 inline-block">${deal.clientName}</span>
                    <h3 class="font-bold text-lg text-gray-900 truncate leading-snug">${deal.dealName}</h3>
                </div>
                <button type="button" class="btn-delete-deal text-gray-300 hover:text-red-500 p-1.5 rounded-md hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10 -mr-1 -mt-1">
                    <i class="fa-solid fa-trash-can text-sm"></i>
                </button>
            </div>
            
            <p class="text-sm text-gray-500 mb-6 line-clamp-2 leading-relaxed flex-grow font-normal">${deal.memo || 'No details available.'}</p>
            
            <div class="space-y-3 mt-auto pt-4 border-t border-gray-50">
                <div>
                    <div class="flex justify-between text-xs font-medium text-gray-500 mb-1.5">
                        <span>Discovery</span>
                        <span class="text-gray-700 font-semibold">${discoveryPct}%</span>
                    </div>
                    <div class="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div class="bg-emerald-500 h-1.5 rounded-full transition-all duration-500" style="width: ${discoveryPct}%"></div>
                    </div>
                </div>
                <div>
                    <div class="flex justify-between text-xs font-medium text-gray-500 mb-1.5">
                        <span>Assessment</span>
                        <span class="text-gray-700 font-semibold">${assessPct}%</span>
                    </div>
                    <div class="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div class="bg-indigo-500 h-1.5 rounded-full transition-all duration-500" style="width: ${assessPct}%"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function attachEvents() {
    /* Create Modal Events */
    const createModal = document.getElementById('create-modal');
    const createBtn = document.getElementById('btn-create-deal');
    const createForm = document.getElementById('create-form');

    const toggleCreateModal = (show) => createModal.classList.toggle('hidden', !show);

    if (createBtn) createBtn.addEventListener('click', () => toggleCreateModal(true));

    createModal.querySelectorAll('.btn-close-modal').forEach(btn => {
        btn.addEventListener('click', () => toggleCreateModal(false));
    });
    createModal.querySelector('.modal-backdrop').addEventListener('click', () => toggleCreateModal(false));
    
    createForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(createForm);
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
        toggleCreateModal(false);
        showToast('Deal created successfully', 'success');
        renderDeals(document.getElementById('app'));
    });

    /* Delete Modal Events */
    const deleteModal = document.getElementById('delete-modal');
    
    const toggleDeleteModal = (show) => {
        deleteModal.classList.toggle('hidden', !show);
        if (!show) deleteTargetId = null;
    };

    deleteModal.querySelectorAll('.btn-close-delete-modal').forEach(btn => {
        btn.addEventListener('click', () => toggleDeleteModal(false));
    });
    deleteModal.querySelector('.delete-modal-backdrop').addEventListener('click', () => toggleDeleteModal(false));

    document.getElementById('btn-confirm-delete').addEventListener('click', () => {
        if (deleteTargetId) {
            Store.deleteDeal(deleteTargetId);
            showToast('Deal deleted', 'success');
            toggleDeleteModal(false);
            renderDeals(document.getElementById('app'));
        }
    });

    /* Card Events */
    document.querySelectorAll('.btn-delete-deal').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            deleteTargetId = btn.dataset.id;
            toggleDeleteModal(true);
        });
    });

    document.querySelectorAll('.deal-card').forEach(card => {
        card.addEventListener('click', () => {
            const id = card.dataset.id;
            navigateTo('details', { id });
        });
    });
}