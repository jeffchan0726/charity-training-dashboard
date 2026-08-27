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

function _f(id, names, en, per100, extra) {
    const row = Object.assign({
        id: id,
        names: names,
        en: en,
        kcal: per100[0],
        protein: per100[1],
        carbs: per100[2],
        fat: per100[3],
        fiber: per100[4] == null ? 0 : per100[4],
        sodium: per100[5] == null ? 0 : per100[5],
        source: 'hk-cfs-fcd6',
        cooking: 'ready',
        typical_g: 100,
        usda_query: en
    }, extra || {});
    return row;
}

// per100: [kcal, protein_g, carbs_g, fat_g, fiber_g, sodium_mg]
const HK_FOODS = [
    // ── 主食 ──
    _f('rice_white', ['白飯', '米飯', '蒸飯', '白米飯'], 'rice white cooked', [116, 2.6, 25.6, 0.3, 0.3, 1], { typical_g: 200, cooking: 'steamed' }),
    _f('rice_brown', ['糙米飯', '糙米'], 'rice brown cooked', [111, 2.6, 23.0, 0.9, 1.8, 1], { typical_g: 200, cooking: 'steamed' }),
    _f('congee_plain', ['白粥', '稀飯', '粥'], 'rice congee plain', [46, 1.1, 10.1, 0.1, 0.1, 2], { typical_g: 350, cooking: 'boiled' }),
    _f('rice_fried', ['炒飯', '揚州炒飯', '蛋炒飯'], 'fried rice', [168, 4.2, 25.0, 5.5, 0.6, 380], { typical_g: 300, cooking: 'stir_fry', stir_fry: true }),
    _f('rice_noodle_wet', ['河粉', '濕河粉', '沙河粉'], 'rice noodles cooked', [109, 1.8, 24.0, 0.2, 0.5, 10], { typical_g: 250, cooking: 'boiled' }),
    _f('rice_noodle_stir', ['炒河粉', '乾炒牛河'], 'stir-fried rice noodles', [158, 4.5, 22.0, 5.8, 0.7, 520], { typical_g: 400, cooking: 'stir_fry', stir_fry: true }),
    _f('vermicelli', ['米粉', '米線', '湯米粉'], 'rice vermicelli cooked', [109, 1.6, 24.2, 0.2, 0.4, 15], { typical_g: 250, cooking: 'boiled' }),
    _f('vermicelli_stir', ['炒米粉', '星洲炒米'], 'stir-fried rice vermicelli', [155, 3.8, 23.0, 5.2, 0.6, 540], { typical_g: 350, cooking: 'stir_fry', stir_fry: true }),
    _f('egg_noodles', ['麵', '蛋麵', '湯麵', '淨麵'], 'egg noodles cooked', [138, 5.0, 25.2, 2.0, 1.2, 80], { typical_g: 220, cooking: 'boiled' }),
    _f('yee_mein', ['伊麵', '意麵', '撈伊麵'], 'yi mein noodles', [175, 5.5, 24.0, 6.0, 1.4, 420], { typical_g: 250, cooking: 'stir_fry', stir_fry: true }),
    _f('udon', ['烏冬', '烏龍麵'], 'udon cooked', [99, 2.6, 21.0, 0.4, 0.9, 180], { typical_g: 250, cooking: 'boiled' }),
    _f('spaghetti', ['意粉', '意大利粉', '通粉'], 'spaghetti cooked', [158, 5.8, 30.9, 0.9, 1.8, 1], { typical_g: 200, source: 'usda-sr', cooking: 'boiled' }),
    _f('instant_noodle', ['即食麵', '公仔麵', '杯麵'], 'instant noodles cooked', [188, 4.3, 26.0, 7.0, 1.0, 720], { typical_g: 300, cooking: 'boiled' }),
    _f('cheung_fun', ['腸粉', '齋腸'], 'rice noodle roll', [107, 2.5, 21.0, 1.2, 0.3, 280], { typical_g: 180, cooking: 'steamed' }),
    _f('congee_pork', ['肉粥', '皮蛋瘦肉粥'], 'pork century egg congee', [62, 3.2, 8.5, 1.6, 0.2, 310], { typical_g: 400, cooking: 'boiled' }),

    // ── 燒味／肉類 ──
    _f('char_siu', ['叉燒', '蜜汁叉燒'], 'char siu barbecued pork', [278, 16.5, 8.2, 19.5, 0, 620], { typical_g: 80, cooking: 'roast' }),
    _f('siu_yuk', ['燒肉', '脆皮燒肉'], 'siu yuk roast pork belly', [376, 14.8, 0.5, 35.0, 0, 540], { typical_g: 80, cooking: 'roast' }),
    _f('roast_duck', ['燒鴨', '片皮鴨'], 'roast duck cantonese', [284, 16.2, 2.8, 22.8, 0, 580], { typical_g: 90, cooking: 'roast' }),
    _f('roast_goose', ['燒鵝'], 'roast goose', [320, 16.0, 1.5, 27.0, 0, 560], { typical_g: 90, cooking: 'roast' }),
    _f('soy_chicken', ['豉油雞', '油雞'], 'soy sauce chicken', [192, 19.0, 2.4, 11.6, 0, 680], { typical_g: 120, cooking: 'braised' }),
    _f('white_chicken', ['白切雞', '白斬雞', '手撕雞'], 'white cut chicken', [167, 20.2, 0.2, 9.2, 0, 210], { typical_g: 120, cooking: 'boiled' }),
    _f('pork_chop', ['豬扒', '煎豬扒'], 'pork chop pan fried', [242, 22.0, 1.0, 16.5, 0, 390], { typical_g: 120, cooking: 'pan_fry', stir_fry: true }),
    _f('steamed_pork_patty', ['蒸肉餅', '咸魚肉餅'], 'steamed minced pork', [198, 15.5, 2.0, 14.2, 0.2, 430], { typical_g: 150, cooking: 'steamed' }),
    _f('beef_stir', ['炒牛肉', '滑蛋牛肉', '牛肉'], 'stir-fried beef', [175, 22.0, 2.0, 8.8, 0, 410], { typical_g: 100, cooking: 'stir_fry', stir_fry: true }),
    _f('pork_stir', ['炒豬肉', '肉片', '叉燒以外豬肉'], 'stir-fried pork', [198, 18.5, 2.2, 12.5, 0, 380], { typical_g: 100, cooking: 'stir_fry', stir_fry: true }),
    _f('spare_ribs', ['排骨', '蒸排骨', '豉汁排骨'], 'steamed spare ribs', [210, 18.0, 3.5, 13.5, 0.2, 480], { typical_g: 120, cooking: 'steamed' }),
    _f('luncheon_meat', ['午餐肉', '餐肉'], 'luncheon meat', [315, 12.5, 3.4, 28.0, 0, 1100], { typical_g: 60, source: 'usda-sr', cooking: 'pan_fry' }),
    _f('ham', ['火腿', '腿蛋'], 'ham sliced', [145, 18.0, 1.5, 7.2, 0, 1200], { typical_g: 40, source: 'usda-sr' }),
    _f('egg_boiled', ['烚蛋', '水煮蛋', '雞蛋'], 'egg boiled', [155, 12.6, 1.1, 10.6, 0, 124], { typical_g: 50, source: 'usda-sr', cooking: 'boiled' }),
    _f('egg_fried', ['煎蛋', '荷包蛋', '奄列', '炒蛋'], 'egg fried', [196, 13.6, 0.8, 15.3, 0, 207], { typical_g: 60, source: 'usda-sr', cooking: 'pan_fry', stir_fry: true }),
    _f('egg_steamed', ['蒸蛋', '蛋蒸水蛋'], 'steamed egg custard', [78, 6.8, 1.4, 5.0, 0, 180], { typical_g: 150, cooking: 'steamed' }),
    _f('tofu', ['豆腐', '嫩豆腐', '老豆腐'], 'tofu firm', [76, 8.1, 1.9, 4.2, 0.3, 7], { typical_g: 120, cooking: 'steamed' }),
    _f('tofu_fried', ['油豆腐', '炸豆腐', '豆腐泡'], 'fried tofu', [240, 17.0, 8.5, 15.0, 2.3, 15], { typical_g: 80, cooking: 'deep_fry' }),
    _f('mapo_tofu', ['麻婆豆腐'], 'mapo tofu', [130, 8.5, 5.0, 8.4, 0.8, 520], { typical_g: 220, cooking: 'stir_fry', stir_fry: true }),

    // ── 海鮮 ──
    _f('steamed_fish', ['蒸魚', '清蒸魚', '蒸鱸魚', '蒸鯇魚'], 'steamed fish', [105, 20.0, 0.2, 2.5, 0, 60], { typical_g: 150, cooking: 'steamed' }),
    _f('fried_fish', ['煎魚', '炸魚'], 'pan fried fish', [180, 20.0, 1.5, 10.5, 0, 220], { typical_g: 140, cooking: 'pan_fry', stir_fry: true }),
    _f('shrimp', ['蝦', '蝦仁', '白灼蝦'], 'shrimp cooked', [99, 24.0, 0.2, 0.3, 0, 150], { typical_g: 80, cooking: 'boiled' }),
    _f('fish_ball', ['魚蛋', '魚丸'], 'fish ball', [112, 11.5, 6.5, 4.2, 0.2, 720], { typical_g: 60, cooking: 'boiled' }),
    _f('siu_mai_fish', ['燒賣'], 'siu mai dumpling', [185, 10.5, 16.0, 8.2, 0.6, 480], { typical_g: 80, cooking: 'steamed' }),
    _f('har_gow', ['蝦餃'], 'har gow shrimp dumpling', [155, 8.2, 18.5, 5.0, 0.4, 360], { typical_g: 70, cooking: 'steamed' }),
    _f('wonton', ['雲吞', '鮮蝦雲吞'], 'wonton shrimp', [168, 9.0, 16.5, 6.8, 0.5, 420], { typical_g: 80, cooking: 'boiled' }),
    _f('salted_egg', ['咸蛋', '鹹蛋'], 'salted duck egg', [190, 13.5, 1.5, 14.0, 0, 980], { typical_g: 60, cooking: 'boiled' }),
    _f('century_egg', ['皮蛋', '松花蛋'], 'century egg', [171, 13.1, 4.5, 10.7, 0, 550], { typical_g: 50 }),

    // ── 蔬菜 ──
    _f('choi_sum', ['菜心', '炒菜心', '油菜'], 'choy sum', [19, 2.2, 2.5, 0.3, 1.8, 20], { typical_g: 120, cooking: 'stir_fry', stir_fry: true }),
    _f('bok_choy', ['白菜', '小白菜', '上海青'], 'bok choy', [16, 1.5, 2.2, 0.2, 1.0, 65], { typical_g: 120, cooking: 'stir_fry', stir_fry: true }),
    _f('kai_lan', ['芥蘭'], 'gai lan chinese broccoli', [32, 2.8, 3.8, 0.7, 2.5, 30], { typical_g: 120, cooking: 'stir_fry', stir_fry: true }),
    _f('lettuce', ['生菜', '唐生菜'], 'lettuce', [15, 1.4, 2.9, 0.2, 1.3, 8], { typical_g: 80, source: 'usda-sr', cooking: 'raw' }),
    _f('broccoli', ['西蘭花', '椰菜花'], 'broccoli cooked', [35, 2.4, 7.2, 0.4, 3.3, 41], { typical_g: 100, source: 'usda-sr', cooking: 'stir_fry', stir_fry: true }),
    _f('tomato', ['番茄', '西紅柿'], 'tomato raw', [18, 0.9, 3.9, 0.2, 1.2, 5], { typical_g: 80, source: 'usda-sr', cooking: 'raw' }),
    _f('cucumber', ['青瓜', '黃瓜'], 'cucumber', [15, 0.7, 3.6, 0.1, 0.5, 2], { typical_g: 80, source: 'usda-sr', cooking: 'raw' }),
    _f('potato_boiled', ['薯仔', '土豆', '烚薯'], 'potato boiled', [77, 1.9, 17.5, 0.1, 1.8, 5], { typical_g: 150, source: 'usda-sr', cooking: 'boiled' }),
    _f('french_fries', ['薯條'], 'french fries', [312, 3.4, 41.0, 15.0, 3.8, 210], { typical_g: 100, source: 'usda-sr', cooking: 'deep_fry' }),
    _f('sweet_corn', ['粟米', '玉米'], 'sweet corn cooked', [96, 3.4, 21.0, 1.5, 2.4, 1], { typical_g: 80, source: 'usda-sr', cooking: 'boiled' }),
    _f('eggplant', ['茄子', '魚香茄子'], 'eggplant cooked', [35, 0.8, 8.7, 0.2, 2.5, 1], { typical_g: 150, cooking: 'stir_fry', stir_fry: true }),
    _f('bitter_melon', ['涼瓜', '苦瓜'], 'bitter melon', [17, 1.0, 3.7, 0.2, 2.6, 13], { typical_g: 120, cooking: 'stir_fry', stir_fry: true }),
    _f('bean_sprout', ['芽菜', '銀芽', '綠豆芽'], 'bean sprouts', [31, 3.0, 5.9, 0.2, 1.8, 6], { typical_g: 80, cooking: 'stir_fry', stir_fry: true }),
    _f('mushroom', ['冬菇', '蘑菇', '鮮菇'], 'mushroom cooked', [28, 2.2, 5.3, 0.3, 2.0, 4], { typical_g: 60, source: 'usda-sr' }),

    // ── 點心／包點 ──
    _f('char_siu_bao', ['叉燒包'], 'char siu bao', [265, 8.5, 42.0, 6.8, 1.2, 380], { typical_g: 80, cooking: 'steamed' }),
    _f('pineapple_bun', ['菠蘿包'], 'pineapple bun', [338, 7.2, 52.0, 11.5, 1.5, 320], { typical_g: 90, cooking: 'baked' }),
    _f('egg_tart', ['蛋撻'], 'egg tart', [377, 6.0, 38.0, 22.0, 0.8, 180], { typical_g: 70, cooking: 'baked' }),
    _f('sausage_bun', ['腸仔包'], 'sausage bun', [310, 10.0, 36.0, 14.0, 1.4, 520], { typical_g: 95, cooking: 'baked' }),
    _f('cocktail_bun', ['雞尾包'], 'cocktail bun', [345, 6.5, 48.0, 14.0, 1.3, 280], { typical_g: 85, cooking: 'baked' }),
    _f('french_toast_hk', ['西多士'], 'hong kong french toast', [312, 7.5, 32.0, 17.5, 1.2, 340], { typical_g: 180, cooking: 'pan_fry', stir_fry: true }),
    _f('steamed_rice_roll_filling', ['鮮蝦腸', '牛肉腸'], 'cheung fun with filling', [128, 5.5, 18.0, 3.6, 0.4, 420], { typical_g: 200, cooking: 'steamed' }),
    _f('turnip_cake', ['蘿蔔糕'], 'turnip cake', [145, 3.2, 22.0, 4.8, 1.6, 480], { typical_g: 90, cooking: 'pan_fry' }),
    _f('spring_roll', ['春卷', '春捲'], 'spring roll', [250, 6.5, 24.0, 14.0, 1.5, 420], { typical_g: 60, cooking: 'deep_fry' }),
    _f('wonton_noodle', ['雲吞麵'], 'wonton noodles', [142, 6.8, 20.0, 3.6, 0.9, 480], { typical_g: 380, cooking: 'boiled' }),

    // ── 茶餐廳／快餐 ──
    _f('macaroni_soup', ['通粉', '湯通粉', '餐肉通粉'], 'macaroni soup hk', [78, 3.2, 12.5, 1.6, 0.6, 380], { typical_g: 400, cooking: 'boiled' }),
    _f('satay_beef_noodle', ['沙爹牛肉麵'], 'satay beef noodles', [128, 6.5, 16.0, 4.2, 0.8, 620], { typical_g: 450, cooking: 'boiled' }),
    _f('curry_fish_ball', ['咖喱魚蛋'], 'curry fish balls', [132, 8.5, 11.0, 5.5, 0.6, 780], { typical_g: 150, cooking: 'boiled' }),
    _f('siu_mai_street', ['燒賣（街邊）'], 'street siu mai', [175, 9.5, 14.0, 8.5, 0.5, 520], { typical_g: 70, cooking: 'steamed' }),
    _f('hotdog', ['熱狗'], 'hot dog bun', [290, 10.0, 28.0, 15.0, 1.2, 680], { typical_g: 110, source: 'usda-sr' }),
    _f('pork_chop_bun', ['豬扒包'], 'pork chop bun', [285, 13.0, 26.0, 14.0, 1.2, 520], { typical_g: 160, cooking: 'pan_fry' }),
    _f('baked_pork_chop_rice', ['焗豬扒飯'], 'baked pork chop rice', [178, 8.5, 20.0, 7.2, 0.8, 430], { typical_g: 450, cooking: 'baked' }),
    _f('tomato_pork_rice', ['茄汁豬扒飯'], 'tomato pork chop rice', [155, 8.0, 20.5, 4.8, 0.9, 410], { typical_g: 450, cooking: 'pan_fry' }),
    _f('chicken_rice', ['海南雞飯', '雞飯'], 'hainanese chicken rice', [162, 8.5, 18.5, 6.0, 0.4, 380], { typical_g: 400, cooking: 'boiled' }),
    _f('curry_beef_brisket', ['咖喱牛腩'], 'curry beef brisket', [165, 12.0, 8.5, 9.2, 1.2, 620], { typical_g: 250, cooking: 'braised' }),
    _f('beef_brisket_noodle', ['牛腩麵'], 'beef brisket noodles', [118, 7.2, 14.5, 3.4, 0.8, 580], { typical_g: 500, cooking: 'boiled' }),
    _f('cart_noodle', ['車仔麵'], 'cart noodles', [125, 6.0, 16.0, 4.0, 1.0, 720], { typical_g: 450, cooking: 'boiled' }),

    // ── 湯／飲品 ──
    _f('soup_clear', ['清湯', '例湯'], 'clear soup', [18, 1.2, 1.5, 0.5, 0.2, 280], { typical_g: 250, cooking: 'soup' }),
    _f('soup_pork_bone', ['豬骨湯', '菜湯'], 'pork bone soup', [32, 2.4, 1.8, 1.6, 0.3, 320], { typical_g: 250, cooking: 'soup' }),
    _f('milk_tea', ['奶茶', '港式奶茶', '絲襪奶茶'], 'hong kong milk tea', [48, 1.4, 6.5, 1.8, 0, 35], { typical_g: 250, cooking: 'drink' }),
    _f('lemon_tea', ['檸檬茶', '凍檸茶'], 'lemon tea', [32, 0.1, 8.0, 0, 0, 8], { typical_g: 350, cooking: 'drink' }),
    _f('yuan_yang', ['鴛鴦'], 'yuan yang coffee tea', [52, 1.5, 7.0, 1.9, 0, 40], { typical_g: 250, cooking: 'drink' }),
    _f('soy_milk', ['豆漿', '豆奶'], 'soy milk', [54, 3.3, 6.3, 1.8, 0.6, 51], { typical_g: 250, source: 'usda-sr', cooking: 'drink' }),
    _f('cola', ['可樂', '汽水'], 'cola soda', [42, 0, 10.6, 0, 0, 4], { typical_g: 330, source: 'usda-sr', cooking: 'drink' }),
    _f('orange_juice', ['橙汁'], 'orange juice', [45, 0.7, 10.4, 0.2, 0.2, 1], { typical_g: 250, source: 'usda-sr', cooking: 'drink' }),

    // ── 醬／油（ fortify 用）──
    _f('peanut_oil', ['花生油', '食油', '炒餸油', '鑊油'], 'peanut oil', [884, 0, 0, 100, 0, 0], { typical_g: 14, source: 'usda-sr', cooking: 'oil' }),
    _f('soy_sauce', ['豉油', '醬油'], 'soy sauce', [53, 8.1, 4.9, 0.1, 0.8, 5493], { typical_g: 10, source: 'usda-sr' }),
    _f('oyster_sauce', ['蠔油'], 'oyster sauce', [51, 1.3, 11.0, 0.2, 0.3, 2733], { typical_g: 12 }),
    _f('chili_oil', ['辣椒油', '紅油'], 'chili oil', [820, 0.4, 2.0, 90, 0.5, 180], { typical_g: 8, cooking: 'oil' }),

    // ── 西式 USDA 常用 ──
    _f('chicken_breast', ['雞胸', '雞胸肉'], 'chicken breast cooked', [165, 31.0, 0, 3.6, 0, 74], { typical_g: 120, source: 'usda-sr', cooking: 'steamed' }),
    _f('salmon', ['三文魚', '鮭魚'], 'salmon cooked', [206, 22.1, 0, 12.4, 0, 61], { typical_g: 130, source: 'usda-sr', cooking: 'pan_fry' }),
    _f('broccoli_raw', ['西蘭花（生）'], 'broccoli raw', [34, 2.8, 6.6, 0.4, 2.6, 33], { typical_g: 100, source: 'usda-sr', cooking: 'raw' }),
    _f('apple', ['蘋果'], 'apple raw with skin', [52, 0.3, 13.8, 0.2, 2.4, 1], { typical_g: 180, source: 'usda-sr', cooking: 'raw' }),
    _f('banana', ['香蕉'], 'banana raw', [89, 1.1, 22.8, 0.3, 2.6, 1], { typical_g: 120, source: 'usda-sr', cooking: 'raw' }),
    _f('white_bread', ['白麵包', '方包'], 'white bread', [265, 9.0, 49.0, 3.2, 2.7, 491], { typical_g: 60, source: 'usda-sr' }),
    _f('milk_whole', ['全脂奶', '牛奶'], 'milk whole', [61, 3.2, 4.8, 3.3, 0, 43], { typical_g: 250, source: 'usda-sr', cooking: 'drink' }),
    _f('yogurt', ['乳酪', 'yogurt', 'yogurt plain'], 'yogurt plain whole', [61, 3.5, 4.7, 3.3, 0, 46], { typical_g: 150, source: 'usda-sr' }),
    _f('avocado', ['牛油果'], 'avocado', [160, 2.0, 8.5, 14.7, 6.7, 7], { typical_g: 100, source: 'usda-sr', cooking: 'raw' }),
    _f('oats', ['燕麥', '燕麥片'], 'oats cooked', [71, 2.5, 12.0, 1.5, 1.7, 4], { typical_g: 200, source: 'usda-sr', cooking: 'boiled' }),
    _f('cheeseburger', ['芝士漢堡', '芝士汉堡', '漢堡', '汉堡', '漢堡包', '芝士漢堡包'], 'cheeseburger', [263, 15.0, 22.0, 14.0, 1.2, 510], { typical_g: 220, source: 'usda-sr', cooking: 'ready' }),
    _f('hamburger_bun', ['芝麻包', '漢堡包麵', 'sesame bun'], 'hamburger bun sesame', [270, 8.5, 50.0, 4.0, 2.0, 490], { typical_g: 50, source: 'usda-sr' }),
    _f('beef_patty', ['漢堡扒', '牛肉餅', '漢堡肉餅'], 'beef patty cooked', [247, 25.0, 0, 16.0, 0, 70], { typical_g: 90, source: 'usda-sr', cooking: 'pan_fry' }),
    _f('cheddar', ['車打芝士', '芝士片', '車打'], 'cheddar cheese', [403, 23.0, 1.3, 33.0, 0, 621], { typical_g: 20, source: 'usda-sr' }),
    _f('mayonnaise', ['蛋黃醬', '美乃滋', 'mayo'], 'mayonnaise', [680, 1.0, 0.6, 75.0, 0, 635], { typical_g: 15, source: 'usda-sr' })
];

const HK_DISHES = [
    {
        id: 'char_siu_rice',
        names: ['叉燒飯', '叉烧饭'],
        en: 'char siu rice',
        parts: [
            { foodId: 'rice_white', grams: 250 },
            { foodId: 'char_siu', grams: 80 },
            { foodId: 'choi_sum', grams: 40 }
        ]
    },
    {
        id: 'siu_yuk_rice',
        names: ['燒肉飯', '烧肉饭'],
        en: 'roast pork rice',
        parts: [
            { foodId: 'rice_white', grams: 250 },
            { foodId: 'siu_yuk', grams: 80 },
            { foodId: 'choi_sum', grams: 40 }
        ]
    },
    {
        id: 'roast_duck_rice',
        names: ['燒鴨飯', '烧鸭饭', '鴨飯'],
        en: 'roast duck rice',
        parts: [
            { foodId: 'rice_white', grams: 250 },
            { foodId: 'roast_duck', grams: 90 },
            { foodId: 'choi_sum', grams: 40 }
        ]
    },
    {
        id: 'soy_chicken_rice',
        names: ['豉油雞飯', '油雞飯', '雞腿飯'],
        en: 'soy chicken rice',
        parts: [
            { foodId: 'rice_white', grams: 250 },
            { foodId: 'soy_chicken', grams: 130 },
            { foodId: 'choi_sum', grams: 40 }
        ]
    },
    {
        id: 'three_bbq_rice',
        names: ['三拼飯', '雙拼飯', '叉燒燒肉飯'],
        en: 'mixed siu mei rice',
        parts: [
            { foodId: 'rice_white', grams: 250 },
            { foodId: 'char_siu', grams: 50 },
            { foodId: 'siu_yuk', grams: 50 },
            { foodId: 'roast_duck', grams: 40 }
        ]
    },
    {
        id: 'tomato_pork_chop_rice',
        names: ['茄汁豬扒飯', '豬扒飯'],
        en: 'tomato pork chop rice',
        parts: [
            { foodId: 'rice_white', grams: 250 },
            { foodId: 'pork_chop', grams: 130 },
            { foodId: 'tomato', grams: 80 }
        ],
        stir_fry: true
    },
    {
        id: 'cheeseburger_dish',
        names: ['芝士漢堡', '芝士汉堡', '漢堡包', 'cheeseburger'],
        en: 'cheeseburger',
        parts: [
            { foodId: 'hamburger_bun', grams: 50 },
            { foodId: 'beef_patty', grams: 90 },
            { foodId: 'cheddar', grams: 20 },
            { foodId: 'lettuce', grams: 20 },
            { foodId: 'tomato', grams: 25 },
            { foodId: 'mayonnaise', grams: 15 }
        ]
    },
    {
        id: 'fried_rice_dish',
        names: ['炒飯', '揚州炒飯', '蛋炒飯'],
        en: 'fried rice plate',
        parts: [{ foodId: 'rice_fried', grams: 350 }],
        stir_fry: true
    },
    {
        id: 'beef_chow_fun',
        names: ['乾炒牛河', '炒牛河', '牛河'],
        en: 'beef chow fun',
        parts: [{ foodId: 'rice_noodle_stir', grams: 420 }],
        stir_fry: true
    },
    {
        id: 'singapore_noodles',
        names: ['星洲炒米', '炒米粉'],
        en: 'singapore noodles',
        parts: [{ foodId: 'vermicelli_stir', grams: 380 }],
        stir_fry: true
    }
];

const HK_FOOD_BY_ID = {};
HK_FOODS.forEach(function (f) { HK_FOOD_BY_ID[f.id] = f; });

function _normFoodKey(s) {
    return String(s || '')
        .toLowerCase()
        .replace(/[()（）\[\]\s_\-·.,，。]/g, '')
        .replace(/飯$/g, '饭')
        .replace(/麵/g, '面')
        .replace(/餘/g, '余');
}

const HK_FOOD_INDEX = (function buildIndex() {
    const idx = [];
    function add(names, en, kind, ref) {
        (names || []).concat(en ? [en] : []).forEach(function (n) {
            const key = _normFoodKey(n);
            if (key) idx.push({ key: key, kind: kind, ref: ref, len: key.length });
        });
    }
    HK_DISHES.forEach(function (d) { add(d.names, d.en, 'dish', d); });
    HK_FOODS.forEach(function (f) { add(f.names, f.en, 'food', f); });
    idx.sort(function (a, b) { return b.len - a.len; });
    return idx;
})();

function lookupHkFood(name) {
    const key = _normFoodKey(name);
    if (!key) return null;
    for (let i = 0; i < HK_FOOD_INDEX.length; i++) {
        const row = HK_FOOD_INDEX[i];
        if (key === row.key) return { kind: row.kind, item: row.ref, match: row.key };
    }
    for (let i = 0; i < HK_FOOD_INDEX.length; i++) {
        const row = HK_FOOD_INDEX[i];
        if (row.len >= 2 && key.indexOf(row.key) !== -1) {
            return { kind: row.kind, item: row.ref, match: row.key };
        }
    }
    return null;
}

function scaleNutrients(food, grams) {
    const g = Number(grams) || 0;
    const m = g / 100;
    return {
        id: food.id,
        name: (food.names && food.names[0]) || food.en,
        en: food.en,
        grams: Math.round(g),
        calories: Math.round((food.kcal || 0) * m),
        protein_g: roundFoodMacro((food.protein || 0) * m),
        carbs_g: roundFoodMacro((food.carbs || 0) * m),
        fat_g: roundFoodMacro((food.fat || 0) * m),
        fiber_g: roundFoodMacro((food.fiber || 0) * m),
        sodium_mg: Math.round((food.sodium || 0) * m),
        source: food.source,
        cooking: food.cooking,
        stir_fry: false,
        portion: Math.round(g) + ' g'
    };
}

function expandHkDish(dish, scale) {
    const s = (scale && scale > 0) ? scale : 1;
    return (dish.parts || []).map(function (p) {
        const food = HK_FOOD_BY_ID[p.foodId];
        if (!food) return null;
        const row = scaleNutrients(food, (p.grams || food.typical_g || 100) * s);
        row.dishId = dish.id;
        if (dish.stir_fry) row.stir_fry = true;
        return row;
    }).filter(Boolean);
}

function roundFoodMacro(n) {
    const v = Number(n) || 0;
    return Math.round(v * 10) / 10;
}
