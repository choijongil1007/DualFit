
const STORAGE_KEY = 'dualfit_deals';

export const Store = {
    getDeals: () => {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    },

    getDeal: (id) => {
        const deals = Store.getDeals();
        return deals.find(d => d.id === id) || null;
    },

    saveDeal: (deal) => {
        const deals = Store.getDeals();
        const index = deals.findIndex(d => d.id === deal.id);
        
        if (index >= 0) {
            deals[index] = deal;
        } else {
            deals.push(deal);
        }
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(deals));
    },

    deleteDeal: (id) => {
        const deals = Store.getDeals().filter(d => d.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(deals));
    },

    createEmptyDeal: () => {
        return {
            id: null,
            clientName: '',
            dealName: '',
            clientContact: '',
            internalContact: '',
            solution: '',
            purchaseDate: '',
            memo: '',
            discovery: {
                awareness: { behavior: '', emotion: '', touchpoint: '', problem: '', result: null, frozen: false },
                consideration: { behavior: '', emotion: '', touchpoint: '', problem: '', result: null, frozen: false },
                evaluation: { behavior: '', emotion: '', touchpoint: '', problem: '', result: null, frozen: false },
                purchase: { behavior: '', emotion: '', touchpoint: '', problem: '', result: null, frozen: false },
            },
            assessment: {
                biz: { scores: {}, weights: { budget: 20, authority: 25, need: 35, timeline: 20 } },
                tech: { scores: {}, weights: { req: 30, arch: 25, data: 25, ops: 20 } },
                recommendations: null // Store AI recommendations here
            },
            summaryReport: null, // AI Final Report Cache
            updatedAt: new Date().toISOString()
        };
    }
};