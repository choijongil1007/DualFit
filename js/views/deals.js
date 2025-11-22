
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

        <!-- Create Modal (Modern Dark Style) -->
        <div id="create-modal" class="fixed inset-0 z-[100] hidden flex items-center justify-center p-4">
            <!-- Backdrop -->
            <div class="absolute inset-0 bg-black/60 backdrop-blur-sm modal-backdrop transition-opacity"></div>
            
            <!-- Content -->
            <div class="relative w-full max-w-lg bg-[#111111] text-white border border-white/10 rounded-xl shadow-2xl p-6 sm:p-8 animate-modal-in">
                <!-- Close Button (X) -->
                <button type="button" class="absolute top-5 right-5 text-gray-500 hover:text-white transition-colors btn-close-modal">
                    <i class="fa-solid fa-xmark text-lg"></i>
                </button>

                <h2 class="text-xl font-bold mb-6 tracking-tight">Create New Deal</h2>
                
                <form id="create-form" class="space-y-4">
                    <div>
                        <label class="block text-xs font-semibold text-gray-400 uppercase mb-1.5">Client Name</label>
                        <input type="text" name="clientName" required class="w-full bg-[#222] border border-transparent focus:border-white/30 rounded-lg p-2.5 text-sm text-white placeholder-gray-500 outline-none transition-all" placeholder="e.g. Acme Corp">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-gray-400 uppercase mb-1.5">Project Name</label>
                        <input type="text" name="dealName" required class="w-full bg-[#222] border border-transparent focus:border-white/30 rounded-lg p-2.5 text-sm text-white placeholder-gray-500 outline-none transition-all" placeholder="e.g. Cloud Migration Phase 1">
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-semibold text-gray-400 uppercase mb-1.5">Client Contact</label>
                            <input type="text" name="clientContact" class="w-full bg-[#222] border border-transparent focus:border-white/30 rounded-lg p-2.5 text-sm text-white outline-none transition-all">
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-gray-400 uppercase mb-1.5">Our Contact</label>
                            <input type="text" name="internalContact" class="w-full bg-[#222] border border-transparent focus:border-white/30 rounded-lg p-2.5 text-sm text-white outline-none transition-all">
                        </div>
                    </div>
                    <div>
                         <label class="block text-xs font-semibold text-gray-400 uppercase mb-1.5">Solution</label>
                         <input type="text" name="solution" class="w-full bg-[#222] border border-transparent focus:border-white/30 rounded-lg p-2.5 text-sm text-white outline-none transition-all">
                    </div>
                    <div>
                         <label class="block text-xs font-semibold text-gray-400 uppercase mb-1.5">Target Date</label>
                         <!-- Date input styling is tricky in dark mode, basic adjustment here -->
                         <input type="date" name="purchaseDate" class="w-full bg-[#222] border border-transparent focus:border-white/30 rounded-lg p-2.5 text-sm text-white outline-none transition-all [color-scheme:dark]">
                    </div>
                    <div>
                         <label class="block text-xs font-semibold text-gray-400 uppercase mb-1.5">Memo</label>
                         <textarea name="memo" class="w-full bg-[#222] border border-transparent focus:border-white/30 rounded-lg p-2.5 text-sm text-white outline-none transition-all resize-none" rows="3"></textarea>
                    </div>
                    
                    <div class="flex justify-end gap-3 pt-4 mt-2 border-t border-white/5">
                        <button type="button" class="btn-close-modal px-4 py-2 text-gray-400 hover:text-white rounded-lg text-sm transition-colors">Cancel</button>
                        <button type="submit" class="px-5 py-2 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition-colors text-sm shadow-lg shadow-white/5">Create Deal</button>
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
            <div class="flex justify-between items-start mb-3">
                <div class="overflow-hidden pr-2">
                    <h3 class="font-bold text-lg text-gray-900 truncate">${deal.dealName}</h3>
                    <span class="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded mt-1 inline-block">${deal.clientName}</span>
                </div>
                <button class="btn-delete-deal text-gray-300 hover:text-red-500 p-1.5 rounded hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all z-10" data-id="${deal.id}" title="Delete Deal">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
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
    const form = document.getElementById('create-form');

    // Open
    createBtn.addEventListener('click', () => modal.classList.remove('hidden'));

    // Close function
    const closeModal = () => modal.classList.add('hidden');

    // 1. Close on X button and Cancel button
    modal.querySelectorAll('.btn-close-modal').forEach(btn => {
        btn.addEventListener('click', closeModal);
    });

    // 2. Close on Backdrop click
    modal.querySelector('.modal-backdrop').addEventListener('click', closeModal);
    
    // Create Logic
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
        closeModal();
        showToast('Deal created successfully', 'success');
        
        // Reload list
        const app = document.getElementById('app');
        renderDeals(app);
    });

    // Delete Buttons Logic
    document.querySelectorAll('.btn-delete-deal').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent card click logic
            const id = btn.dataset.id;
            if (confirm('이 Deal을 삭제하시겠습니까? 삭제된 데이터는 복구할 수 없습니다.')) {
                Store.deleteDeal(id);
                showToast('Deal이 삭제되었습니다.', 'success');
                // Reload list
                renderDeals(document.getElementById('app'));
            }
        });
    });

    // Card Click Logic
    document.querySelectorAll('.deal-card').forEach(card => {
        card.addEventListener('click', () => {
            const id = card.dataset.id;
            navigateTo('details', { id });
        });
    });
}
