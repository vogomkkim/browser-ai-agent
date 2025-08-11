const API_BASE = 'http://localhost:3001';
let isProcessing = false;

// 초기 시간 설정
document.getElementById('welcomeTime').textContent = new Date().toLocaleTimeString();

// 폼 제출 이벤트
document.getElementById('chatForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('chatInput').value.trim();
    if (!input || isProcessing) return;

    await sendMessage(input);
    document.getElementById('chatInput').value = '';
});

// 메시지 전송
async function sendMessage(input) {
    if (isProcessing) return;
    isProcessing = true;

    // 사용자 메시지 표시
    addMessage(input, 'user');
    
    // 타이핑 표시
    showTyping();

    try {
        const response = await fetch(`${API_BASE}/run-command`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ input })
        });

        const result = await response.json();
        
        if (result.success) {
            // 성공 메시지
            const successSummary = result?.executionResult?.executionSummary;
            const successMsg = successSummary ? (
                `✅ 작업이 완료되었습니다.\n\n` +
                `🤖 총 ${successSummary.total}개의 명령어가 처리되었습니다.\n` +
                `✅ 성공: ${successSummary.successful} | ❌ 실패: ${successSummary.failed}\n` +
                `🌐 브라우저 상태: ${result?.executionResult?.browserStatus}\n\n` +
                `**성공한 명령어:**\n` +
                successSummary.commands.filter(c => c.status === 'success').map(cmd => `• ${cmd.description}`).join('\n')
            ) : '✅ 작업이 완료되었습니다.';
            
            addMessage(successMsg, 'bot');
        } else {
            // 에러 메시지
            addMessage(`❌ 오류가 발생했습니다: ${result.error}`, 'bot');
        }

    } catch (error) {
        addMessage(`❌ 연결 오류: ${error.message}`, 'bot');
    } finally {
        hideTyping();
        isProcessing = false;
    }
}

// 메시지 추가
function addMessage(content, sender) {
    const messagesContainer = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    
    const time = new Date().toLocaleTimeString();
    messageDiv.innerHTML = `
        <div class="message-content">
            ${content.replace(/\n/g, '<br>')}
            <div class="message-time">${time}</div>
        </div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// 타이핑 표시/숨김
function showTyping() {
    document.getElementById('typingIndicator').style.display = 'block';
    document.getElementById('sendButton').disabled = true;
}

function hideTyping() {
    document.getElementById('typingIndicator').style.display = 'none';
    document.getElementById('sendButton').disabled = false;
}

// 브라우저 상태 확인
async function checkBrowserStatus() {
    try {
        const response = await fetch(`${API_BASE}/browser/status`);
        const result = await response.json();
        
        if (result.success) {
            const status = result.browser.isOpen ? '열림' : '닫힘';
            addMessage(`🌐 브라우저 상태: ${status}`, 'bot');
        }
    } catch (error) {
        addMessage(`❌ 상태 확인 실패: ${error.message}`, 'bot');
    }
}

// 브라우저 닫기
async function closeBrowser() {
    try {
        const response = await fetch(`${API_BASE}/browser/close`, { method: 'POST' });
        const result = await response.json();
        
        if (result.success) {
            addMessage(`🔒 브라우저가 닫혔습니다.`, 'bot');
        } else {
            addMessage(`❌ 브라우저 닫기 실패: ${result.result.message}`, 'bot');
        }
    } catch (error) {
        addMessage(`❌ 브라우저 닫기 실패: ${error.message}`, 'bot');
    }
}

// 연결 상태 확인
async function checkConnection() {
    try {
        const response = await fetch(`${API_BASE}/health`);
        if (response.ok) {
            document.getElementById('statusIndicator').className = 'status-indicator status-online';
            document.getElementById('statusText').textContent = '연결됨';
        } else {
            throw new Error('서버 응답 오류');
        }
    } catch (error) {
        document.getElementById('statusIndicator').className = 'status-indicator status-offline';
        document.getElementById('statusText').textContent = '연결 끊김';
    }
}

// 주기적으로 연결 상태 확인
setInterval(checkConnection, 5000);
checkConnection();
