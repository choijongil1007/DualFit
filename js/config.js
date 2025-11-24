
export const API_URL = "https://script.google.com/macros/s/AKfycbzcdRKb5yBKr5bu9uvGt28KTQqUkPsAR80GwbURPzFeOmaRY2_i1lA4Kk_GsuNpBZuVRA/exec";

export const DISCOVERY_STAGES = [
    { id: 'awareness', label: '1. 인식 (Awareness)', iconStyle: 'bg-rose-50 text-rose-600' },
    { id: 'consideration', label: '2. 고려 (Consideration)', iconStyle: 'bg-amber-50 text-amber-600' },
    { id: 'evaluation', label: '3. 평가 (Evaluation)', iconStyle: 'bg-sky-50 text-sky-600' },
    { id: 'purchase', label: '4. 구매 (Purchase)', iconStyle: 'bg-emerald-50 text-emerald-600' }
];

export const ASSESSMENT_CONFIG = {
    biz: {
        categories: [
            { id: 'budget', label: '예산 (Budget)', items: ['예산 존재 여부', '예산 적합성'], defaultWeight: 20 },
            { id: 'authority', label: '권한 (Authority)', items: ['의사결정권자 접근성', '내부 지지자 파워'], defaultWeight: 25 },
            { id: 'need', label: '니즈 (Need)', items: ['문제 적합성', '도입 필요성'], defaultWeight: 35 },
            { id: 'timeline', label: '일정 (Timeline)', items: ['의사결정 타임라인 명확성', '도입 용이성'], defaultWeight: 20 }
        ]
    },
    tech: {
        categories: [
            { id: 'req', label: '요구사항 적합성', items: ['필수 요구사항 충족도', '유스케이스 적합성'], defaultWeight: 30 },
            { id: 'arch', label: '아키텍처 & 인프라', items: ['현행 인프라·환경 호환성', '보안·정책 준수 여부'], defaultWeight: 25 },
            { id: 'data', label: '데이터 & 통합', items: ['데이터 구조·형식 호환성', '기존 시스템과의 연동 난이도'], defaultWeight: 25 },
            { id: 'ops', label: '실행 & 운영 가능성', items: ['구현 난이도', '운영·유지보수 가능성'], defaultWeight: 20 }
        ]
    }
};