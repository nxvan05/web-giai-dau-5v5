// Lớp vỏ bọc gọi API và xử lý JWT Auto-Refresh
window.api = async function(endpoint, opts = {}, retryCount = 0) {
    const headers = { 'Content-Type': 'application/json' };
    if (window.apiToken) headers['Authorization'] = 'Bearer ' + window.apiToken;
    if (opts.body && typeof opts.body === 'object') opts.body = JSON.stringify(opts.body);
    let res;
    try { 
        res = await fetch(window.API + endpoint, { credentials: 'include', ...opts, headers: { ...headers, ...opts.headers } }); 
    } catch(e) { 
        throw new Error('Không thể kết nối server — kiểm tra mạng'); 
    }
    
    // Auto-refresh token handling
    if (res.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/discord/refresh') && retryCount === 0) {
        if (!window.isRefreshing) {
            window.isRefreshing = true;
            try {
                const refreshRes = await fetch(window.API + '/api/discord/refresh', { method: 'POST', credentials: 'include' });
                window.isRefreshing = false;
                if (refreshRes.ok) return window.api(endpoint, opts, 1);
            } catch(e) { window.isRefreshing = false; }
        } else {
            await new Promise(r => setTimeout(r, 1000));
            return window.api(endpoint, opts, 1);
        }
    }
    
    if (!res.ok) { 
        let err; 
        try { err = await res.json(); } catch(e) { err = { error: 'HTTP ' + res.status }; } 
        throw new Error(err.error || 'Lỗi kết nối'); 
    }
    
    if (res.status === 204) return null;
    try { return await res.json(); } catch(e) { throw new Error('Server trả về dữ liệu không hợp lệ'); }
};

window.apiLogout = function() {
    window.apiToken = null;
    localStorage.removeItem('evan_api_token');
    window.api('/api/auth/logout', { method: 'POST' }).catch(()=>{});
};
