(function() {
    var card = document.getElementById('player-hover-card');
    if (!card) return;

    var cache = {};
    var hideTimer = null;
    var currentDiscordId = null;
    var isVisible = false;
    var hoveredEl = null;

    function getDiscordId(el) {
        if (!el || el === document.body || el === document.documentElement) return null;
        var d = el.getAttribute('data-discord-id') || el.getAttribute('data-player-discord');
        if (d) return d;
        var onclick = el.getAttribute('onclick');
        if (onclick) {
            var m = onclick.match(/openProfile\s*\(\s*['"]([^'"]+)['"]/);
            if (m) return m[1];
        }
        return null;
    }

    function findDiscordId(el) {
        var cur = el;
        for (var i = 0; i < 10 && cur && cur !== document.body; i++) {
            var d = getDiscordId(cur);
            if (d) return { id: d, el: cur };
            cur = cur.parentElement;
        }
        return null;
    }

    function showCard(info, e) {
        if (!info || !info.id) return;
        if (info.id === currentDiscordId && isVisible) return;

        currentDiscordId = info.id;
        hoveredEl = info.el;
        clearTimeout(hideTimer);

        if (cache[info.id]) {
            renderCard(cache[info.id], e);
            return;
        }
        card.classList.remove('hidden');
        card.querySelector('#hc-name').textContent = 'Đang tải...';
        card.querySelector('#hc-elo').textContent = '...';
        positionCard(e);

        window.api('/api/players/profile/' + encodeURIComponent(info.id)).then(function(data) {
            cache[info.id] = data;
            if (currentDiscordId === info.id) renderCard(data, e);
        }).catch(function() {
            if (currentDiscordId === info.id) {
                card.classList.add('hidden');
                isVisible = false;
            }
        });
    }

    function renderCard(data, e) {
        var p = data.player;
        if (currentDiscordId !== p.discordId) return;
        card.classList.remove('hidden');
        isVisible = true;

        document.getElementById('hc-name').textContent = p.displayName || '?';
        document.getElementById('hc-riotid').textContent = p.riotId || 'N/A';
        document.getElementById('hc-role').textContent = p.role || 'Flex';
        document.getElementById('hc-elo').textContent = p.elo || 0;

        var pts = p.pts != null ? p.pts : (typeof window.getPtsFromRank === 'function' ? window.getPtsFromRank(p.peakRank || p.rank) : 3);
        document.getElementById('hc-pts').textContent = pts + 'đ';

        var sr = data.seasonStats && data.seasonStats.playerRank ? '#' + data.seasonStats.playerRank + '/' + (data.seasonStats.totalPlayers || '?') : '—';
        document.getElementById('hc-rank').textContent = sr;

        var hsEl = document.getElementById('hc-hs');
        if (p.headshotPct != null && p.headshotPct !== undefined) {
            hsEl.textContent = p.headshotPct.toFixed(1) + '%';
            hsEl.className = 'text-sm font-bold ' + (p.headshotPct >= 25 ? 'text-emerald-400' : p.headshotPct >= 15 ? 'text-yellow-400' : 'text-red-400');
        } else {
            hsEl.textContent = '-';
            hsEl.className = 'text-sm font-bold text-gray-500';
        }

        var total = (p.wins || 0) + (p.losses || 0);
        var wr = total > 0 ? Math.round(((p.wins || 0) / total) * 100) : 0;
        document.getElementById('hc-wr').innerHTML = total > 0 ? `<span class="text-emerald-400">${p.wins||0}W</span> <span class="text-gray-500">/</span> <span class="text-red-400">${p.losses||0}L</span>` : '-';

        var k = (data.kda && data.kda.kills) || 0, d = (data.kda && data.kda.deaths) || 0, a = (data.kda && data.kda.assists) || 0;
        document.getElementById('hc-kda').textContent = k + '/' + d + '/' + a;

        var avatarEl = document.getElementById('hc-avatar');
        var aurl = '';
        if (p.discordAvatar) {
            aurl = 'https://cdn.discordapp.com/avatars/' + p.discordId + '/' + p.discordAvatar + '.png?size=64';
        } else if (p.discordId) {
            try { var idx = Number((BigInt(p.discordId) >> 22n) % 6n); aurl = 'https://cdn.discordapp.com/embed/avatars/' + idx + '.png'; } catch(_e) { aurl = 'https://cdn.discordapp.com/embed/avatars/0.png'; }
        }
        avatarEl.src = aurl;
        avatarEl.onerror = function() {
            if (typeof window.getFallbackAvatar === 'function') {
                this.src = window.getFallbackAvatar(p.discordId, p.displayName || p.discordId, 64);
            } else {
                this.src = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" rx="16" fill="#5865F2"/><text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" fill="white" font-size="28" font-weight="700" font-family="Arial">?</text></svg>');
            }
        };

        var iconEl = document.getElementById('hc-rank-icon');
        var bestIcon = (typeof window.getRankIconUrl === 'function' ? window.getRankIconUrl(p.peakRank || p.rank) : '');
        if (bestIcon) {
            iconEl.innerHTML = '<img src="' + bestIcon + '" class="w-4 h-4">';
        } else { iconEl.innerHTML = ''; }

        positionCard(e);
    }

    function positionCard(e) {
        var cardW = 272;
        var x = e.clientX + 12;
        if (x + cardW > window.innerWidth - 8) x = window.innerWidth - cardW - 8;
        if (x < 4) x = 4;
        var y = e.clientY + 8;
        if (y + card.offsetHeight > window.innerHeight - 8) y = window.innerHeight - card.offsetHeight - 8;
        if (y < 4) y = 4;
        card.style.left = x + 'px';
        card.style.top = y + 'px';
    }

    function hideCard() {
        clearTimeout(hideTimer);
        hideTimer = setTimeout(function() {
            card.classList.add('hidden');
            isVisible = false;
            currentDiscordId = null;
            hoveredEl = null;
        }, 200);
    }

    // Dùng mouseenter/mouseleave trên từng element thay vì mouseover/mouseout delegation
    // để tránh flickering
    document.addEventListener('mouseover', function(e) {
        var target = e.target;
        // Bỏ qua nếu đang ở trong card hoặc modal
        if (target.closest('#player-hover-card, #player-profile-modal')) return;

        var info = findDiscordId(target);
        if (info) {
            // Chỉ show card khi hover vào element mới
            if (hoveredEl !== info.el) {
                showCard(info, e);
            }
        }
    });

    document.addEventListener('mousemove', function(e) {
        if (isVisible) {
            positionCard(e);
        }
    });

    // Khi rời khỏi element đang hover, ẩn card
    document.addEventListener('mouseout', function(e) {
        if (!hoveredEl) return;
        if (e.target.closest('#player-hover-card, #player-profile-modal')) return;
        // Nếu mouse rời khỏi hoveredEl hoặc con của nó
        if (hoveredEl === e.target || hoveredEl.contains(e.target)) {
            var related = e.relatedTarget;
            // Chỉ ẩn nếu relatedTarget KHÔNG nằm trong hoveredEl
            if (!related || !hoveredEl.contains(related)) {
                hideCard();
            }
        }
    });

    // Khi chuột vào lại element cũ trước khi timer chạy xong, hủy ẩn
    card.addEventListener('mouseenter', function() {
        clearTimeout(hideTimer);
    });
    card.addEventListener('mouseleave', function() {
        hideCard();
    });
})();
