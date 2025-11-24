
import { Store } from '../store.js';
import { generateId, showToast } from '../utils.js';
import { navigateTo } from '../app.js';

let deleteTargetId = null;
let editTargetId = null;

export function renderDeals(container) {
    const deals = Store.getDeals();

    const html = `
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
                <h1 class="text-2xl font-bold text-gray-900 tracking-tight">Deals</h1>
                <p class="text-gray-500 mt-1 text-sm">영업 기회 및 파이프라인 관리</p>
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
                    <p class="text-gray-900 font-medium">등록된 Deal이 없습니다</p>
                    <p class="text-gray-500 text-sm mt-1">새로운 Deal을 생성하여 관리를 시작하세요.</p>
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

                <h2 class="text-xl font-bold mb-6 text-gray-900 tracking-tight">새 Deal 등록</h2>
                
                <form id="create-form" class="space-y-5">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1.5 ml-0.5">고객사명 (Client)</label>
                        <input type="text" name="clientName" required class="w-full input-premium" placeholder="예: 삼성전자">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1.5 ml-0.5">프로젝트명 (Deal Name)</label>
                        <input type="text" name="dealName" required class="w-full input-premium" placeholder="예: 클라우드 마이그레이션">
                    </div>
                    <div class="grid grid-cols-2 gap-5">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1.5 ml-0.5">고객 담당자</label>
                            <input type="text" name="clientContact" class="w-full input-premium">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1.5 ml-0.5">내부 담당자</label>
                            <input type="text" name="internalContact" class="w-full input-premium">
                        </div>
                    </div>
                    <div>
                         <label class="block text-sm font-medium text-gray-700 mb-1.5 ml-0.5">제안 솔루션</label>
                         <input type="text" name="solution" class="w-full input-premium">
                    </div>
                    <div>
                         <label class="block text-sm font-medium text-gray-700 mb-1.5 ml-0.5">수주 목표일</label>
                         <input type="date" name="purchaseDate" class="w-full input-premium text-gray-700">
                    </div>
                    <div>
                         <label class="block text-sm font-medium text-gray-700 mb-1.5 ml-0.5">메모</label>
                         <textarea name="memo" class="w-full input-premium resize-none" rows="3"></textarea>
                    </div>
                    
                    <div class="flex justify-end gap-3 pt-6 mt-4 border-t border-gray-100">
                        <button type="button" class="btn-close-modal px-5 py-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors">취소</button>
                        <button type="submit" class="px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-all text-sm shadow-sm">등록</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Edit Modal -->
        <div id="edit-modal" class="fixed inset-0 z-[100] hidden flex items-center justify-center p-4">
            <div class="absolute inset-0 bg-gray-900/30 backdrop-blur-sm edit-modal-backdrop transition-opacity"></div>
            <div class="relative w-full max-w-lg bg-white rounded-2xl shadow-modal p-8 animate-modal-in border border-gray-100">
                <button type="button" class="absolute top-5 right-5 text-gray-400 hover:text-gray-600 transition-colors btn-close-edit-modal">
                    <i class="fa-solid fa-xmark text-lg"></i>
                </button>

                <h2 class="text-xl font-bold mb-6 text-gray-900 tracking-tight">Deal 정보 수정</h2>
                
                <form id="edit-form" class="space-y-5">
                    <input type="hidden" name="id">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1.5 ml-0.5">고객사명 (Client)</label>
                        <input type="text" name="clientName" required class="w-full input-premium">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1.5 ml-0.5">프로젝트명 (Deal Name)</label>
                        <input type="text" name="dealName" required class="w-full input-premium">
                    </div>
                    <div class="grid grid-cols-2 gap-5">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1.5 ml-0.5">고객 담당자</label>
                            <input type="text" name="clientContact" class="w-full input-premium">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1.5 ml-0.5">내부 담당자</label>
                            <input type="text" name="internalContact" class="w-full input-premium">
                        </div>
                    </div>
                    <div>
                         <label class="block text-sm font-medium text-gray-700 mb-1.5 ml-0.5">제안 솔루션</label>
                         <input type="text" name="solution" class="w-full input-premium">
                    </div>
                    <div>
                         <label class="block text-sm font-medium text-gray-700 mb-1.5 ml-0.5">수주 목표일</label>
                         <input type="date" name="purchaseDate" class="w-full input-premium text-gray-700">
                    </div>
                    <div>
                         <label class="block text-sm font-medium text-gray-700 mb-1.5 ml-0.5">메모</label>
                         <textarea name="memo" class="w-full input-premium resize-none" rows="3"></textarea>
                    </div>
                    
                    <div class="flex justify-end gap-3 pt-6 mt-4 border-t border-gray-100">
                        <button type="button" class="btn-close-edit-modal px-5 py-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors">취소</button>
                        <button type="submit" class="px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-all text-sm shadow-sm">저장</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Delete Modal (Alert Style - Black) -->
        <div id="delete-modal" class="fixed inset-0 z-[110] hidden flex items-center justify-center p-4">
            <div class="absolute inset-0 bg-gray-900/30 backdrop-blur-sm delete-modal-backdrop transition-opacity"></div>
            <div class="relative w-full max-w-sm bg-gray-900 rounded-2xl shadow-modal p-6 animate-modal-in text-center border border-gray-800">
                
                <div class="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4 text-red-500 border border-gray-700">
                    <i class="fa-solid fa-trash-can text-lg"></i>
                </div>
                
                <h3 class="text-lg font-bold mb-2 text-white">Deal 삭제</h3>
                <p class="text-gray-400 text-sm mb-6 leading-relaxed">
                    삭제된 데이터는 복구할 수 없습니다.<br>정말 삭제하시겠습니까?
                </p>
                
                <div class="flex gap-3 justify-center">
                    <button type="button" class="btn-close-delete-modal px-4 py-2 bg-gray-800 border border-gray-700 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium transition-colors">취소</button>
                    <button type="button" id="btn-confirm-delete" class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors">삭제</button>
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
                <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10 -mr-1 -mt-1">
