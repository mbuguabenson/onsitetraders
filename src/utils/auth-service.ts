import { getClientId, DERIV_NEW_TOKEN_URL } from '@/components/shared/utils/config/config';

export const refreshToken = async () => {
    const refresh_token = localStorage.getItem('new_api_refresh_token');
    if (!refresh_token) {
        console.warn('[AuthService] No refresh token available');
        return null;
    }

    try {
        console.log('[AuthService] Attempting to refresh access token...');
        const response = await fetch(DERIV_NEW_TOKEN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token,
                client_id: getClientId(),
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error_description || errorData.error || `HTTP ${response.status}`);
        }

        const data = await response.json();
        localStorage.setItem('new_api_access_token', data.access_token);
        if (data.refresh_token) {
            localStorage.setItem('new_api_refresh_token', data.refresh_token);
        }
        
        console.log('[AuthService] Access token refreshed successfully');
        return data.access_token;
    } catch (error) {
        console.error('[AuthService] Token refresh failed:', error);
        // If refresh fails, we might need to log out or prompt for re-login
        return null;
    }
};

export const startTokenRefreshTimer = () => {
    // Refresh every 50 minutes (access token usually lasts 60m)
    const REFRESH_INTERVAL = 50 * 60 * 1000;
    
    const intervalId = setInterval(async () => {
        const token = localStorage.getItem('new_api_access_token');
        if (token) {
            await refreshToken();
        }
    }, REFRESH_INTERVAL);

    return () => clearInterval(intervalId);
};
