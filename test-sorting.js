#!/usr/bin/env node

/**
 * 測試置頂排序功能的腳本
 * 這個腳本會測試排序邏輯是否正確
 */

// 模擬測試資料
const testLinks = [
    {
        code: 'test1',
        target: 'https://example.com/test1',
        pinned: false,
        created_at: '2024-01-01T10:00:00Z',
        clicks: 5
    },
    {
        code: 'test2',
        target: 'https://example.com/test2',
        pinned: true,
        created_at: '2024-01-02T10:00:00Z',
        clicks: 10
    },
    {
        code: 'test3',
        target: 'https://example.com/test3',
        pinned: false,
        created_at: '2024-01-03T10:00:00Z',
        clicks: 3
    },
    {
        code: 'test4',
        target: 'https://example.com/test4',
        pinned: true,
        created_at: '2024-01-04T10:00:00Z',
        clicks: 7
    },
    {
        code: 'test5',
        target: 'https://example.com/test5',
        pinned: false,
        created_at: '2024-01-05T10:00:00Z',
        clicks: 2
    }
];

function testSortingLogic() {
    console.log('🧪 測試置頂排序邏輯...\n');

    console.log('原始資料:');
    testLinks.forEach((link, index) => {
        const pinStatus = link.pinned ? '📌 置頂' : '📄 一般';
        const createdDate = new Date(link.created_at).toLocaleDateString();
        console.log(`   ${index + 1}. ${link.code} - ${pinStatus} - ${createdDate}`);
    });

    console.log('\n排序後的資料:');

    // 使用與後端和前端相同的排序邏輯
    const sortedLinks = testLinks.sort((a, b) => {
        // Ensure pinned is treated as boolean
        const aPinned = Boolean(a.pinned);
        const bPinned = Boolean(b.pinned);

        // Pinned items first (return -1 means a comes before b)
        if (aPinned && !bPinned) return -1;
        if (!aPinned && bPinned) return 1;

        // Then by creation date (newest first)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    sortedLinks.forEach((link, index) => {
        const pinStatus = link.pinned ? '📌 置頂' : '📄 一般';
        const createdDate = new Date(link.created_at).toLocaleDateString();
        console.log(`   ${index + 1}. ${link.code} - ${pinStatus} - ${createdDate}`);
    });

    // 驗證排序結果
    console.log('\n🔍 驗證排序結果:');

    const pinnedLinks = sortedLinks.filter(link => link.pinned);
    const unpinnedLinks = sortedLinks.filter(link => !link.pinned);

    console.log(`置頂短網址數量: ${pinnedLinks.length}`);
    console.log(`一般短網址數量: ${unpinnedLinks.length}`);

    // 檢查置頂的短網址是否都在前面
    const firstUnpinnedIndex = sortedLinks.findIndex(link => !link.pinned);
    const lastPinnedIndex = sortedLinks.findLastIndex(link => link.pinned);

    if (pinnedLinks.length === 0) {
        console.log('✅ 沒有置頂短網址，排序正常');
    } else if (firstUnpinnedIndex === -1) {
        console.log('✅ 所有短網址都是置頂的，排序正常');
    } else if (lastPinnedIndex < firstUnpinnedIndex) {
        console.log('✅ 置頂短網址正確排在前面，排序正常');
    } else {
        console.log('❌ 排序有問題：置頂短網址沒有排在前面');
        console.log(`   最後一個置頂項目的索引: ${lastPinnedIndex}`);
        console.log(`   第一個非置頂項目的索引: ${firstUnpinnedIndex}`);
    }

    // 檢查置頂項目內部的排序（應該按創建時間，最新的在前）
    if (pinnedLinks.length > 1) {
        console.log('\n🔍 檢查置頂項目內部排序:');
        let pinnedSortedCorrectly = true;
        for (let i = 0; i < pinnedLinks.length - 1; i++) {
            const current = new Date(pinnedLinks[i].created_at).getTime();
            const next = new Date(pinnedLinks[i + 1].created_at).getTime();
            if (current < next) {
                pinnedSortedCorrectly = false;
                break;
            }
        }
        console.log(pinnedSortedCorrectly ? '✅ 置頂項目內部排序正確（最新的在前）' : '❌ 置頂項目內部排序有問題');
    }

    // 檢查非置頂項目內部的排序
    if (unpinnedLinks.length > 1) {
        console.log('\n🔍 檢查非置頂項目內部排序:');
        let unpinnedSortedCorrectly = true;
        for (let i = 0; i < unpinnedLinks.length - 1; i++) {
            const current = new Date(unpinnedLinks[i].created_at).getTime();
            const next = new Date(unpinnedLinks[i + 1].created_at).getTime();
            if (current < next) {
                unpinnedSortedCorrectly = false;
                break;
            }
        }
        console.log(unpinnedSortedCorrectly ? '✅ 非置頂項目內部排序正確（最新的在前）' : '❌ 非置頂項目內部排序有問題');
    }

    console.log('\n🎉 排序邏輯測試完成！');
}

// 執行測試
testSortingLogic();
