import React from 'react';
import ChunkLoader from '@/components/loader/chunk-loader';
import { useOfflineDetection } from '@/hooks/useOfflineDetection';
import { localize } from '@deriv-com/translations';
import { URLUtils } from '@deriv-com/utils';
import App from './App';

// Extend Window interface to include is_tmb_enabled property
declare global {
    interface Window {
        is_tmb_enabled?: boolean;
    }
}

const setLocalStorageToken = async (loginInfo: URLUtils.LoginInfo[], paramsToDelete: string[]) => {
    if (loginInfo.length) {
        try {
            const defaultActiveAccount = URLUtils.getDefaultActiveAccount(loginInfo);
            if (!defaultActiveAccount) return;

            const accountsList: Record<string, string> = {};
            const clientAccounts: Record<string, { loginid: string; token: string; currency: string }> = {};

            loginInfo.forEach((account: { loginid: string; token: string; currency: string }) => {
                accountsList[account.loginid] = account.token;
                clientAccounts[account.loginid] = account;
            });

            localStorage.setItem('accountsList', JSON.stringify(accountsList));
            localStorage.setItem('clientAccounts', JSON.stringify(clientAccounts));

            URLUtils.filterSearchParams(paramsToDelete);
            localStorage.setItem('authToken', loginInfo[0].token);
            localStorage.setItem('active_loginid', loginInfo[0].loginid);
        } catch (error) {
            console.error('Error setting up login info:', error);
        }
    }
};

export const AuthWrapper = () => {
    const [isAuthComplete, setIsAuthComplete] = React.useState(false);
    const isExchangingRef = React.useRef(false);
    const { loginInfo, paramsToDelete } = URLUtils.getLoginInfoFromURL();
    const { isOnline } = useOfflineDetection();

    React.useEffect(() => {
        const initializeAuth = async () => {
            try {
                const params = new URLSearchParams(window.location.search);
                const code = params.get('code');
                const state = params.get('state');

                // 1. Handle OIDC Code Exchange if present in URL
                if (code && state && !isExchangingRef.current) {
                    isExchangingRef.current = true;
                    console.log('[AuthWrapper] OIDC code detected, exchanging...');
                    const { validatePKCEState, popPKCEVerifier, clearPKCEVerifier } = await import('@/utils/pkce');
                    const { getClientId, DERIV_NEW_TOKEN_URL, getAppId, getRedirectUri } = await import('@/components/shared/utils/config/config');
                    
                    if (validatePKCEState(state)) {
                        const verifier = popPKCEVerifier();
                        if (verifier) {
                            const redirect_uri = getRedirectUri();
                            console.log('[AuthWrapper] Exchange Config:', {
                                client_id: getClientId(),
                                redirect_uri,
                                grant_type: 'authorization_code'
                            });

                            const response = await fetch(DERIV_NEW_TOKEN_URL, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                                body: new URLSearchParams({
                                    grant_type: 'authorization_code',
                                    code,
                                    client_id: getClientId(),
                                    redirect_uri,
                                    code_verifier: verifier,
                                }),
                            });

                            if (response.ok) {
                                const data = await response.json();
                                localStorage.setItem('new_api_access_token', data.access_token);
                                localStorage.setItem('new_api_refresh_token', data.refresh_token);
                                
                                // Fetch accounts
                                console.log('[AuthWrapper] Fetching account list...');
                                const accountsResponse = await fetch('https://api.derivws.com/trading/v1/options/accounts', {
                                    headers: { 
                                        Authorization: `Bearer ${data.access_token}`,
                                        'Deriv-App-Id': String(getAppId())
                                    },
                                });
                                
                                if (!accountsResponse.ok) {
                                    const text = await accountsResponse.text();
                                    console.error('[AuthWrapper] Accounts fetch failed:', text);
                                    throw new Error(`Accounts fetch failed: ${accountsResponse.status} ${text}`);
                                }
                                
                                const accountsData = await accountsResponse.json();
                                console.log('[AuthWrapper] Accounts Response:', JSON.stringify(accountsData, null, 2));

                                if (accountsData.data?.length > 0) {
                                    localStorage.setItem('new_api_accounts_list', JSON.stringify(accountsData.data));
                                    localStorage.setItem('new_api_account_id', accountsData.data[0].account_id);
                                    
                                    // Populate legacy keys for backward compatibility (ClientStore, App.tsx, etc.)
                                    const accountsList: Record<string, string> = {};
                                    const clientAccounts: Record<string, any> = {};
                                    
                                    accountsData.data.forEach((acc: any) => {
                                        // For OIDC, we reuse the same token for all accounts in the legacy format
                                        accountsList[acc.account_id] = data.access_token;
                                        clientAccounts[acc.account_id] = {
                                            loginid: acc.account_id,
                                            token: data.access_token,
                                            currency: acc.currency || 'USD',
                                            balance: acc.balance || 0,
                                            is_virtual: acc.account_type === 'demo' ? 1 : 0
                                        };
                                    });
                                    
                                    localStorage.setItem('accountsList', JSON.stringify(accountsList));
                                    localStorage.setItem('clientAccounts', JSON.stringify(clientAccounts));
                                    localStorage.setItem('authToken', data.access_token);
                                    localStorage.setItem('active_loginid', accountsData.data[0].account_id);
                                    localStorage.setItem('account_type', accountsData.data[0].account_type === 'demo' ? 'demo' : 'real');
                                }
                                
                                clearPKCEVerifier();
                                
                                // Clean URL
                                window.history.replaceState({}, document.title, window.location.origin);
                                setIsAuthComplete(true);
                                return;
                            } else {
                                const errorData = await response.json().catch(() => ({}));
                                console.error('[AuthWrapper] Token Exchange Error:', errorData);
                            }
                        } else {
                            console.error('[AuthWrapper] PKCE verifier missing');
                        }
                    } else {
                        console.error('[AuthWrapper] PKCE state mismatch');
                    }
                }

                // 2. Check for existing New API (OIDC) tokens
                const new_token = localStorage.getItem('new_api_access_token');
                const new_account_id = localStorage.getItem('new_api_account_id');
                
                if (new_token && new_account_id) {
                    console.log('[AuthWrapper] New API session detected');
                    setIsAuthComplete(true);
                    return;
                }

                // 3. Fallback to Legacy tokens
                if (loginInfo && loginInfo.length > 0) {
                    await setLocalStorageToken(loginInfo, paramsToDelete);
                }
                
                URLUtils.filterSearchParams(['lang']);
                setIsAuthComplete(true);
            } catch (error) {
                console.error('[AuthWrapper] Authentication initialization failed:', error);
                setIsAuthComplete(true);
            }
        };

        // If offline, set auth complete immediately but still run initializeAuth
        // to save login info to localStorage for offline use
        if (!isOnline) {
            setIsAuthComplete(true);
        }

        let stopRefresh: (() => void) | null = null;
        
        initializeAuth().then(async () => {
            const { startTokenRefreshTimer } = await import('@/utils/auth-service');
            stopRefresh = startTokenRefreshTimer();
        });

        return () => {
            if (stopRefresh) stopRefresh();
        };
    }, [loginInfo, paramsToDelete, isOnline]);

    // Add timeout for offline scenarios to prevent infinite loading
    React.useEffect(() => {
        if (!isOnline && !isAuthComplete) {
            const timeout = setTimeout(() => {
                setIsAuthComplete(true);
            }, 2000); // 2 second timeout for offline

            return () => clearTimeout(timeout);
        }
    }, [isOnline, isAuthComplete]);

    const getLoadingMessage = () => {
        if (!isOnline) return localize('Loading offline mode...');
        return localize('Initializing...');
    };

    if (!isAuthComplete) {
        return <ChunkLoader message={getLoadingMessage()} />;
    }

    return <App />;
};
