// Browser AI Agent - Frontend JavaScript

let isRunning = false;

// 로그 추가 함수
function addLog(message, type = 'info') {
    const log = document.getElementById('log');
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry log-${type}`;
    logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    log.appendChild(logEntry);
    log.scrollTop = log.scrollHeight;
}

// 상태 업데이트 함수
function updateStatus(message) {
    const status = document.getElementById('status');
    status.textContent = message;
}

// 명령 실행 함수
async function runCommand() {
    if (isRunning) {
        addLog('이미 실행 중입니다. 잠시 기다려주세요.', 'warning');
        return;
    }

    const userInput = document.getElementById('userInput').value.trim();
    if (!userInput) {
        addLog('명령을 입력해주세요.', 'warning');
        return;
    }

    isRunning = true;
    const runButton = document.getElementById('runButton');
    runButton.disabled = true;
    runButton.textContent = '실행 중...';

    updateStatus('🔄 AI가 명령을 분석하고 있습니다...');
    addLog(`사용자 명령: ${userInput}`, 'info');

    try {
        // API 호출
        const response = await fetch('/api/run-command', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ input: userInput })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.success) {
            updateStatus('✅ 명령이 성공적으로 실행되었습니다!');
            addLog(`AI 응답: ${result.message}`, 'success');
            
            if (result.steps) {
                addLog('실행 단계:', 'info');
                result.steps.forEach((step, index) => {
                    addLog(`  ${index + 1}. ${step}`, 'success');
                });
            }
        } else {
            updateStatus('❌ 명령 실행 중 오류가 발생했습니다.');
            addLog(`오류: ${result.error}`, 'error');
        }

    } catch (error) {
        updateStatus('❌ 연결 오류가 발생했습니다.');
        addLog(`네트워크 오류: ${error.message}`, 'error');
        addLog('Vercel 환경에서는 Playwright 브라우저 실행이 제한적일 수 있습니다.', 'warning');
    } finally {
        isRunning = false;
        runButton.disabled = false;
        runButton.textContent = '실행하기';
    }
}

// Enter 키로 실행
document.getElementById('userInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        runCommand();
    }
});

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    addLog('🌐 Browser AI Agent가 준비되었습니다.', 'success');
    addLog('💡 예시: "구글에서 쿠팡 노트북 검색해줘"', 'info');
    addLog('⚠️  Vercel 환경에서는 브라우저 자동화가 제한적일 수 있습니다.', 'warning');
});
