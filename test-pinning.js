#!/usr/bin/env node

/**
 * 測試置頂功能的腳本
 * 這個腳本會測試：
 * 1. 創建帶有 pinned 欄位的短網址
 * 2. 更新短網址的置頂狀態
 * 3. 獲取短網址列表並驗證排序
 */

const API_ENDPOINT = process.env.CHAINY_API_ENDPOINT || 'https://your-api-gateway-url.amazonaws.com';

// 測試用的 JWT Token (需要替換為有效的 token)
const TEST_TOKEN = 'YOUR_JWT_TOKEN_HERE';

async function makeRequest(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${TEST_TOKEN}`
        }
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_ENDPOINT}${endpoint}`, options);

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(`HTTP ${response.status}: ${error.message}`);
    }

    return response.json();
}

async function testPinningFunctionality() {
    console.log('🧪 開始測試置頂功能...\n');

    try {
        // 1. 創建第一個短網址（不置頂）
        console.log('1️⃣ 創建第一個短網址（不置頂）');
        const link1 = await makeRequest('/links', 'POST', {
            target: 'https://example.com/test1',
            pinned: false
        });
        console.log(`✅ 創建成功: ${link1.code}`);
        console.log(`   短網址: ${link1.shortUrl || `${API_ENDPOINT}/${link1.code}`}`);
        console.log(`   置頂狀態: ${link1.pinned}\n`);

        // 2. 創建第二個短網址（置頂）
        console.log('2️⃣ 創建第二個短網址（置頂）');
        const link2 = await makeRequest('/links', 'POST', {
            target: 'https://example.com/test2',
            pinned: true
        });
        console.log(`✅ 創建成功: ${link2.code}`);
        console.log(`   短網址: ${link2.shortUrl || `${API_ENDPOINT}/${link2.code}`}`);
        console.log(`   置頂狀態: ${link2.pinned}\n`);

        // 3. 創建第三個短網址（不置頂）
        console.log('3️⃣ 創建第三個短網址（不置頂）');
        const link3 = await makeRequest('/links', 'POST', {
            target: 'https://example.com/test3',
            pinned: false
        });
        console.log(`✅ 創建成功: ${link3.code}`);
        console.log(`   短網址: ${link3.shortUrl || `${API_ENDPOINT}/${link3.code}`}`);
        console.log(`   置頂狀態: ${link3.pinned}\n`);

        // 4. 獲取短網址列表
        console.log('4️⃣ 獲取短網址列表');
        const linksList = await makeRequest('/links');
        console.log(`✅ 獲取成功，共 ${linksList.count} 個短網址\n`);

        // 5. 驗證排序（置頂的應該在前面）
        console.log('5️⃣ 驗證排序');
        console.log('短網址列表（按置頂狀態和創建時間排序）:');
        linksList.links.forEach((link, index) => {
            const pinStatus = link.pinned ? '📌 置頂' : '📄 一般';
            const createdDate = new Date(link.created_at).toLocaleString();
            console.log(`   ${index + 1}. ${link.code} - ${pinStatus} - ${createdDate}`);
        });

        // 6. 測試更新置頂狀態
        console.log('\n6️⃣ 測試更新置頂狀態');
        console.log(`將 ${link1.code} 設為置頂...`);
        const updatedLink1 = await makeRequest(`/links/${link1.code}`, 'PUT', {
            pinned: true
        });
        console.log(`✅ 更新成功: ${updatedLink1.pinned ? '已置頂' : '未置頂'}`);

        // 7. 再次獲取列表驗證更新
        console.log('\n7️⃣ 重新獲取列表驗證更新');
        const updatedLinksList = await makeRequest('/links');
        console.log('更新後的短網址列表:');
        updatedLinksList.links.forEach((link, index) => {
            const pinStatus = link.pinned ? '📌 置頂' : '📄 一般';
            const createdDate = new Date(link.created_at).toLocaleString();
            console.log(`   ${index + 1}. ${link.code} - ${pinStatus} - ${createdDate}`);
        });

        // 8. 驗證置頂的短網址確實排在前面
        const pinnedLinks = updatedLinksList.links.filter(link => link.pinned);
        const unpinnedLinks = updatedLinksList.links.filter(link => !link.pinned);

        console.log('\n8️⃣ 驗證排序邏輯');
        console.log(`置頂短網址數量: ${pinnedLinks.length}`);
        console.log(`一般短網址數量: ${unpinnedLinks.length}`);

        // 檢查置頂的短網址是否都在前面
        const firstUnpinnedIndex = updatedLinksList.links.findIndex(link => !link.pinned);
        const lastPinnedIndex = updatedLinksList.links.findLastIndex(link => link.pinned);

        if (pinnedLinks.length === 0) {
            console.log('✅ 沒有置頂短網址，排序正常');
        } else if (firstUnpinnedIndex === -1) {
            console.log('✅ 所有短網址都是置頂的，排序正常');
        } else if (lastPinnedIndex < firstUnpinnedIndex) {
            console.log('✅ 置頂短網址正確排在前面，排序正常');
        } else {
            console.log('❌ 排序有問題：置頂短網址沒有排在前面');
        }

        console.log('\n🎉 置頂功能測試完成！');

    } catch (error) {
        console.error('❌ 測試失敗:', error.message);
        process.exit(1);
    }
}

// 檢查是否提供了 JWT Token
if (TEST_TOKEN === 'YOUR_JWT_TOKEN_HERE') {
    console.error('❌ 請先設定有效的 JWT Token');
    console.log('請將腳本中的 TEST_TOKEN 替換為您的 JWT Token');
    process.exit(1);
}

// 執行測試
testPinningFunctionality();
