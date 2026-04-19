// js/bubble-common.js
// KALEIDO Bubble 对话系统

const memberPersonalities = {
    "时雨": `你是一个男团成员时雨，19岁。你的性格：表面甜美爱撒娇，说话软软的经常用~✨🌸这些表情。喜欢分享日常小事，对粉丝很温柔。回答要亲切自然，每条回复20-80字。`,
    "林安": `你是一个男团成员林安，21岁。你的性格：温柔体贴像大哥哥，喜欢关心成员和粉丝，嗓音温暖。回答要温暖治愈，像在哄小朋友一样亲切。`,
    "Jayden": `你是一个男团成员Jayden，20岁。你的性格：话不多但真诚，对舞蹈音乐很热情，偶尔害羞。回答要简洁直接但能感觉到真诚。`,
    "姜一辰": `你是一个男团成员姜一辰，22岁队长。你的性格：成熟稳重，责任心强，很照顾人。回答要让人觉得可靠安心。`,
    "Seo Jin": `你是一个男团成员Seo Jin，19岁门面。你的性格：单纯可爱有点小迷糊，很努力想被认可。回答要可爱天真。`
};

let apiKey = '';
let chatHistories = {};

function initBubblePage(memberName) {
    document.title = `${memberName} · KALEIDO Bubble`;
    loadChatHistory(memberName);
    checkApiKey();
}

function checkApiKey() {
    const savedKey = localStorage.getItem('deepseek_api_key');
    if (savedKey && savedKey.startsWith('sk-')) {
        apiKey = savedKey;
        updateApiStatus(true);
    } else {
        updateApiStatus(false);
    }
}

function updateApiStatus(isValid) {
    const statusElement = document.getElementById('apiStatus');
    if (!statusElement) return;
    if (isValid) {
        statusElement.innerHTML = '<span style="color:#22c55e;">●</span> API已连接 - 可以发送消息';
        statusElement.style.color = '#888';
    } else {
        statusElement.innerHTML = '<span style="color:#ef4444;">●</span> 请先点击右上角设置API Key';
        statusElement.style.color = '#888';
    }
}

function showApiModal() {
    const key = prompt('🔑 请输入 DeepSeek API Key\n\n获取地址：https://platform.deepseek.com\n\n（API Key 只会保存在你的浏览器中，不会上传到任何服务器）');
    if (key && key.startsWith('sk-')) {
        apiKey = key;
        localStorage.setItem('deepseek_api_key', key);
        updateApiStatus(true);
        alert('✅ API Key 已保存！现在可以开始对话了~');
    } else if (key) {
        alert('❌ API Key 格式不正确，应该以 sk- 开头');
        showApiModal();
    }
}

function getWelcomeMessage(memberName) {
    const welcomes = {
        "时雨": "🌸 你好呀~ 我是时雨！今天也想和你聊聊天呢✨",
        "林安": "☕ 辛苦了~ 今天过得怎么样？我一直在等你哦。",
        "Jayden": "💪 来了？今天也一起加油吧。",
        "姜一辰": "🏆 欢迎来到我的Bubble。最近有好好听我们的歌吗？",
        "Seo Jin": "💎 哇！你来了！我刚刚还在想你会不会来呢~"
    };
    return welcomes[memberName] || "欢迎来到我的Bubble~";
}

function loadChatHistory(memberName) {
    const saved = localStorage.getItem(`bubble_history_${memberName}`);
    if (saved) {
        chatHistories[memberName] = JSON.parse(saved);
    } else {
        chatHistories[memberName] = [
            { role: "system", content: memberPersonalities[memberName] },
            { role: "assistant", content: getWelcomeMessage(memberName) }
        ];
        saveChatHistory(memberName);
    }
    renderMessages(memberName);
}

function saveChatHistory(memberName) {
    localStorage.setItem(`bubble_history_${memberName}`, JSON.stringify(chatHistories[memberName]));
}

function renderMessages(memberName) {
    const container = document.getElementById('chatMessages');
    if (!container) return;
    const history = chatHistories[memberName] || [];
    const displayHistory = history.filter(msg => msg.role !== 'system');
    
    if (displayHistory.length === 0) {
        container.innerHTML = '<div class="msg"><div class="msg-bubble">✨ 来和我聊天吧~</div></div>';
    } else {
        container.innerHTML = displayHistory.map(msg => {
            if (msg.role === 'user') {
                return `<div class="msg"><div class="msg-bubble me">${escapeHtml(msg.content)}</div></div>`;
            } else {
                return `<div class="msg"><div class="msg-bubble">✨ ${escapeHtml(msg.content)}</div></div>`;
            }
        }).join('');
    }
    container.scrollTop = container.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function sendMessage(memberName) {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    if (!message) return;
    
    // 检查API Key
    if (!apiKey || !apiKey.startsWith('sk-')) {
        showApiModal();
        return;
    }
    
    // 添加用户消息
    chatHistories[memberName].push({ role: "user", content: message });
    saveChatHistory(memberName);
    renderMessages(memberName);
    
    // 清空输入框
    input.value = '';
    
    // 显示加载状态
    const loadingId = showLoading();
    
    try {
        // 调用 DeepSeek API
        const response = await callDeepSeekAPI(chatHistories[memberName]);
        
        // 移除加载状态
        removeLoading(loadingId);
        
        // 添加AI回复
        chatHistories[memberName].push({ role: "assistant", content: response });
        saveChatHistory(memberName);
        renderMessages(memberName);
        
    } catch (error) {
        removeLoading(loadingId);
        console.error('API调用失败:', error);
        
        let errorMsg = '抱歉，我现在有点忙，请稍后再试~';
        if (error.message.includes('401')) {
            errorMsg = 'API Key 无效，请重新设置~';
            localStorage.removeItem('deepseek_api_key');
            apiKey = '';
            showApiModal();
        } else if (error.message.includes('429')) {
            errorMsg = '调用太频繁啦，请稍等一会儿再聊~';
        } else if (error.message.includes('fetch')) {
            errorMsg = '网络连接失败，请检查网络后重试~';
        }
        
        chatHistories[memberName].push({ role: "assistant", content: errorMsg });
        saveChatHistory(memberName);
        renderMessages(memberName);
    }
}

function showLoading() {
    const container = document.getElementById('chatMessages');
    const id = 'loading-' + Date.now();
    const loadingHtml = `<div id="${id}" class="msg"><div class="msg-bubble" style="background:#2a2a35;">✏️ 正在输入中...</div></div>`;
    container.insertAdjacentHTML('beforeend', loadingHtml);
    container.scrollTop = container.scrollHeight;
    return id;
}

function removeLoading(id) {
    const element = document.getElementById(id);
    if (element) element.remove();
}

async function callDeepSeekAPI(messages) {
    // 限制消息数量，避免token过多（保留system + 最近20条）
    let limitedMessages = [...messages];
    if (limitedMessages.length > 21) {
        limitedMessages = [
            limitedMessages[0], // system
            ...limitedMessages.slice(-20)
        ];
    }
    
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'deepseek-chat',
            messages: limitedMessages,
            temperature: 0.9,
            max_tokens: 200,
            top_p: 0.9
        })
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || `HTTP ${response.status}`);
    }
    
    const data = await response.json();
    return data.choices[0].message.content;
}

function clearHistory(memberName) {
    if (confirm('确定要清空所有聊天记录吗？')) {
        chatHistories[memberName] = [
            { role: "system", content: memberPersonalities[memberName] },
            { role: "assistant", content: getWelcomeMessage(memberName) }
        ];
        saveChatHistory(memberName);
        renderMessages(memberName);
    }
}

function resetApiKey() {
    localStorage.removeItem('deepseek_api_key');
    apiKey = '';
    updateApiStatus(false);
    showApiModal();
}
