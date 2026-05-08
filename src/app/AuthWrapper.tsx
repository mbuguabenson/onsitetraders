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
    const { loginInfo, paramsToDelete } = URLUtils.getLoginInfoFromURL();
    const { isOnline } = useOfflineDetection();

    React.useEffect(() => {
        const initializeAuth = async () => {
            try {
                const params = new URLSearchParams(window.location.search);
                const code = params.get('code');
                const state = params.get('state');

                // 1. Handle OIDC Code Exchange if present in URL
                if (code && state) {
                    console.log('[AuthWrapper] OIDC code detected, exchanging...');
                    const { validatePKCEState, popPKCEVerifier } = await import('@/utils/pkce');
                    const { getClientId, DERIV_NEW_TOKEN_URL, getAppId } = await import('@/components/shared/utils/config/config');
                    
                    if (validatePKCEState(state)) {
                        const verifier = popPKCEVerifier();
                        if (verifier) {
                            const response = await fetch(DERIV_NEW_TOKEN_URL, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                                body: new URLSearchParams({
                                    grant_type: 'authorization_code',
                                    code,
                                    client_id: getClientId(),
                                    redirect_uri: `${window.location.origin}/`,
                                    code_verifier: verifier,
                                }),
                            });

                            if (response.ok) {
                                const data = await response.json();
                                localStorage.setItem('new_api_access_token', data.access_token);
                                localStorage.setItem('new_api_refresh_token', data.refresh_token);
                                
                                // Fetch accounts
                                const accountsResponse = await fetch('https://api.derivws.com/trading/v1/options/accounts', {
                                    headers: { Authorization: `Bearer ${data.access_token}` },
                                });
                                const accountsData = await accountsResponse.json();
                                if (accountsData.data?.length > 0) {
                                    localStorage.setItem('new_api_accounts_list', JSON.stringify(accountsData.data));
                                    localStorage.setItem('new_api_account_id', accountsData.data[0].account_id);
                                }
                                
                                // Clean URL
                                window.history.replaceState({}, document.title, window.location.origin);
                                setIsAuthComplete(true);
                                return;
                            }
                        }
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
                if (loginInfo.length) {
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

        initializeAuth();
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
