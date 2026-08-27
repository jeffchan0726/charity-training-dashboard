// js/food-db-hk.js
// 本地食物資料庫：香港食物成分表第 6 版（CFS / NIIS 常用項）優先，
// 西式／補充項用 USDA SR / Foundation 對應值。數值一律「每 100 g」（飲品每 100 ml）。
// 來源標記：hk-cfs-fcd6 | usda-sr | hk-local-recipe

const HK_FOOD_DB_META = {
    version: '1.0',
    sources: {
        'hk-cfs-fcd6': '香港食物安全中心《食物成分表》第 6 版／營養資料查詢系統（NIIS）常用項',
        'usda-sr': 'USDA FoodData Central（SR Legacy / Foundation）',
        'hk-local-recipe': '以成分表組合成嘅香港常見餸式（碟頭飯／茶餐廳）'
    }
};
