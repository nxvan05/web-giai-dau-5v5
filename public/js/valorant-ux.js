// Valorant UX Upgrades (Particles, Sound, Live Updates, QR Scanner)

// 1. Play Sound Effects
function playSound(type) {
    const audio = document.getElementById(type === 'click' ? 'sfx-click' : 'sfx-win');
    if (audio) {
        audio.currentTime = 0;
        audio.play().catch(e => console.log('Audio play failed:', e));
    }
}

// Attach click sound to buttons
document.addEventListener('click', (e) => {
    if (e.target.closest('button') || e.target.closest('a')) {
        playSound('click');
    }
});

// 2. Initialize Particles
if (typeof particlesJS !== 'undefined') {
    particlesJS('particles-js', {
        particles: {
            number: { value: 60, density: { enable: true, value_area: 800 } },
            color: { value: ["#ff4655", "#00f2fe"] },
            shape: { type: "circle" },
            opacity: { value: 0.5, random: true },
            size: { value: 3, random: true },
            line_linked: { enable: true, distance: 150, color: "#ffffff", opacity: 0.1, width: 1 },
            move: { enable: true, speed: 2, direction: "top", out_mode: "out" }
        },
        interactivity: {
            detect_on: "canvas",
            events: { onhover: { enable: true, mode: "bubble" }, onclick: { enable: true, mode: "push" }, resize: true },
            modes: { bubble: { distance: 200, size: 6, duration: 2, opacity: 0.8 }, push: { particles_nb: 4 } }
        },
        retina_detect: true
    });
}

// 3. Socket.io Live Updates
if (typeof io !== 'undefined') {
    const socket = io();
    
    socket.on('data:updated', (data) => {
        console.log('Live update received:', data);
        
        // Play win sound if a match just ended
        if (data && data.type === 'match') {
            playSound('win');
            
            // Show a temporary toast
            const toast = document.createElement('div');
            toast.className = 'fixed top-4 right-4 bg-emerald-500 text-white px-4 py-3 rounded-lg shadow-lg z-[999999] font-bold animate-bounce';
            toast.innerHTML = '<i class="fa-solid fa-bolt mr-2"></i> Trận đấu vừa kết thúc!';
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 4000);
        }
        
        // Refresh active views
        if (typeof loadSchedule === 'function') loadSchedule();
        if (typeof loadLeaderboard === 'function') loadLeaderboard();
        if (typeof loadBracket === 'function') loadBracket();
        if (typeof loadDraftData === 'function') loadDraftData();
    });

    socket.on('broadcast:receive', (data) => {
        playSound('win'); // Use the win sound for attention
        
        // Show a huge screen overlay toast
        const toast = document.createElement('div');
        toast.className = 'fixed inset-0 z-[9999999] bg-valRed/90 backdrop-blur-sm flex flex-col items-center justify-center animate-fadeIn cursor-pointer';
        toast.innerHTML = `
            <i class="fa-solid fa-bullhorn text-6xl text-white mb-6 animate-pulse"></i>
            <h1 class="text-4xl font-display font-black text-white text-center uppercase tracking-widest mb-4">THÔNG BÁO HỆ THỐNG</h1>
            <p class="text-xl text-white text-center max-w-3xl font-bold bg-black/30 p-6 rounded-2xl shadow-2xl">${data.message}</p>
            <p class="text-sm text-white/50 mt-8">(Nhấn bất kỳ đâu để đóng)</p>
        `;
        toast.onclick = () => toast.remove();
        document.body.appendChild(toast);
        
        // Auto remove after 15 seconds if not clicked
        setTimeout(() => { if (document.body.contains(toast)) toast.remove(); }, 15000);
    });
}

// 4. QR Code Functions (Admin)
let html5QrcodeScanner;

function openQrScanner() {
    let modal = document.getElementById('qr-scanner-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'qr-scanner-modal';
        modal.className = 'fixed inset-0 bg-black/90 backdrop-blur-sm z-[99999] flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="bg-valCard border border-valCyan max-w-md w-full rounded-2xl p-6 relative">
                <button onclick="closeQrScanner()" class="absolute top-4 right-4 text-white hover:text-valRed"><i class="fa-solid fa-xmark text-xl"></i></button>
                <h3 class="text-center font-display text-xl font-bold text-valCyan mb-4"><i class="fa-solid fa-qrcode mr-2"></i>Quét QR Check-in</h3>
                <div id="reader" width="600px"></div>
                <div id="qr-result" class="mt-4 text-center text-sm font-bold h-6"></div>
            </div>
        `;
        document.body.appendChild(modal);
    } else {
        modal.classList.remove('hidden');
    }
    
    html5QrcodeScanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: {width: 250, height: 250} }, false);
    html5QrcodeScanner.render(onScanSuccess, onScanFailure);
}

function closeQrScanner() {
    const modal = document.getElementById('qr-scanner-modal');
    if (modal) modal.classList.add('hidden');
    if (html5QrcodeScanner) {
        html5QrcodeScanner.clear().catch(e => console.error("Failed to clear scanner", e));
    }
}

async function onScanSuccess(decodedText, decodedResult) {
    // Expected QR Format: "evancup-team-<teamId>"
    if (decodedText.startsWith('evancup-team-')) {
        const teamId = decodedText.split('evancup-team-')[1];
        document.getElementById('qr-result').innerHTML = '<span class="text-emerald-400">Thành công! Đang check-in...</span>';
        
        try {
            await api('/api/teams/' + teamId + '/approve', { method: 'PUT' });
            playSound('win');
            document.getElementById('qr-result').innerHTML = '<span class="text-emerald-400">Team đã được check-in & duyệt!</span>';
            setTimeout(closeQrScanner, 2000);
        } catch(e) {
            document.getElementById('qr-result').innerHTML = '<span class="text-valRed">Lỗi: ' + e.message + '</span>';
        }
    } else {
        document.getElementById('qr-result').innerHTML = '<span class="text-valRed">Mã QR không hợp lệ!</span>';
    }
}

function onScanFailure(error) {
    // handle scan failure, usually better to ignore and keep scanning
}

// Expose openQrScanner to window
window.openQrScanner = openQrScanner;
