
import { Store } from '../store.js';
import { generateId, showToast } from '../utils.js';
import { navigateTo } from '../app.js';

let deleteTargetId = null;

export function renderDeals(container) {
    const deals = Store.getDeals();

    const html = `
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
            <div>
                <h1 class="text-3xl font-bold text-gray-900 tracking-tight">Deals</h1>
                <p class="text-gray-500 mt-1 text-sm">Deal 목록 관리</p>
            </div>
            <button id="btn-create-deal" class="bg-[#5A0E7A] hover:bg-[#450b5e] text-white pl-4 pr-5 py-2.5 rounded-full transition-all shadow-lg shadow-[#5A0E7A]/30 text-sm font-semibold flex items-center gap-2 btn-pill active:scale-95">
                <i class="fa-solid fa-plus text-xs"></i> New Deal
            </button>
        </div>

        <div id="deals-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            ${deals.length === 0 ? `
                <div class="col-span-full flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                    <div class="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                        <i class="fa-regular fa-folder-open text-gray-300 text-2xl"></i>
                    </div>
                    <p class="text-gray-500 font-medium">No deals yet.</p>
                    <p class="text-gray-400 text-sm mt-1">Create your first deal to get started.</p>
                </div>
            ` : deals.map(deal => createDealCard(deal)).join('')}
        </div>

        <!-- Create Modal (Premium White) -->
        <div id="create-modal" class="fixed inset-0 z-[100] hidden flex items-center justify-center p-4">
            <div class="absolute inset-0 bg-gray-900/20 backdrop-blur-sm modal-backdrop transition-opacity"></div>
            <div class="relative w-full max-w-lg bg-white rounded-3xl shadow-modal p-8 animate-modal-in">
                <button type="button" class="absolute top-6 right-6 text-gray-400 hover:text-gray-900 transition-colors btn-close-modal">
                    <i class="fa-solid fa-xmark text-lg"></i>
                </button>

                <h2 class="text-2xl font-bold mb-8 text-gray-900 tracking-tight">New Deal</h2>
                
                <form id="create-form" class="space-y-5">
                    <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Client Name</label>
                        <input type="text" name="clientName" required class="w-full input-premium" placeholder="e.g. Acme Corp">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Project Name</label>
                        <input type="text" name="dealName" required class="w-full input-premium" placeholder="e.g. Cloud Migration">
                    </div>
                    <div class="grid grid-cols-2 gap-5">
                        <div>
                            <label class="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Client Contact</label>
                            <input type="text" name="clientContact" class="w-full input-premium">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Our Contact</label>
                            <input type="text" name="internalContact" class="w-full input-premium">
                        </div>
                    </div>
                    <div>
                         <label class="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Solution</label>
                         <input type="text" name="solution" class="w-full input-premium">
                    </div>
                    <div>
                         <label class="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Target Date</label>
                         <input type="date" name="purchaseDate" class="w-full input-premium text-gray-700">
                    </div>
                    <div>
                         <label class="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Memo</label>
                         <textarea name="memo" class="w-full input-premium resize-none" rows="3"></textarea>
                    </div>
                    
                    <div class="flex justify-end gap-3 pt-6 mt-4 border-t border-gray-100">
                        <button type="button" class="btn-close-modal px-5 py-2.5 text-gray-500 hover:text-gray-900 rounded-full text-sm font-medium transition-colors">Cancel</button>
                        <button type="submit" class="px-6 py-2.5 bg-gray-900 text-white font-semibold rounded-full hover:bg-black transition-all text-sm shadow-lg shadow-gray-900/10 btn-pill">Create Deal</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Delete Modal (Premium White) -->
        <div id="delete-modal" class="fixed inset-0 z-[110] hidden flex items-center justify-center p-4">
            <div class="absolute inset-0 bg-gray-900/20 backdrop-blur-sm delete-modal-backdrop transition-opacity"></div>
            <div class="relative w-full max-w-sm bg-white rounded-3xl shadow-modal p-8 animate-modal-in text-center">
                
                <div class="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-5 text-red-500 border border-red-100">
                    <i class="fa-solid fa-trash-can text-xl"></i>
                </div>
                
                <h3 class="text-lg font-bold mb-2 text-gray-900">Delete Deal?</h3>
                <p class="text-gray-500 text-sm mb-8 leading-relaxed">
                    Deal을 삭제할까요? 이 작업은 취소할 수 없습니다.
                </p>
                
                <div class="flex gap-3 justify-center">
                    <button type="button" class="btn-close-delete-modal px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-sm font-semibold transition-colors btn-pill">Cancel</button>
                    <button type="button" id="btn-confirm-delete" class="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-full text-sm font-semibold shadow-lg shadow-red-500/30 transition-colors btn-pill">Delete</button>
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
        <div class="group relative bg-white border border-gray-100/50 rounded-2xl p-6 shadow-card hover:shadow-soft card-hover-effect cursor-pointer deal-card flex flex-col h-full" data-id="${deal.id}">
            <div class="flex justify-between items-start mb-4">
                <div class="overflow-hidden pr-2">
                    <span class="text-xs font-semibold bg-gray-50 text-gray-500 px-2 py-1 rounded-md border border-gray-100 mb-2 inline-block">${deal.clientName}</span>
                    <h3 class="font-bold text-lg text-gray-900 truncate leading-tight">${deal.dealName}</h3>
                </div>
                <button type="button" class="btn-delete-deal text-gray-300 hover:text-red-500 p-2 rounded-full hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10 -mr-2 -mt-2">
                    <i class="fa-solid fa-trash-can text-sm"></i>
                </button>
            </div>
            
            <p class="text-sm text-gray-500 mb-6 line-clamp-2 leading-relaxed flex-grow">${deal.memo || 'No details provided.'}</p>
            
            <div class="space-y-4 mt-auto">
                <div>
                    <div class="flex justify-between text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">
                        <span>Discovery</span>
                        <span class="text-gray-700">${discoveryPct}%</span>
                    </div>
                    <div class="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div class="bg-emerald-500 h-1.5 rounded-full transition-all duration-500" style="width: ${discoveryPct}%"></div>
                    </div>
                </div>
                <div>
                    <div class="flex justify-between text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">
                        <span>Assessment</span>
                        <span class="text-gray-700">${assessPct}%</span>
                    </div>
                    <div class="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div class="bg-emerald-500 h-1.5 rounded-full transition-all duration-500" style="width: ${assessPct}%"></div>
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
