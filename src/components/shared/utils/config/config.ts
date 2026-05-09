import { isStaging } from '../url/helpers';
import { generatePKCE, generateState, storePKCEState } from '@/utils/pkce';
import brandConfig from '../../../../../brand.config.json';

export const DERIV_NEW_AUTH_URL = 'https://auth.deriv.com/oauth2/auth';
export const DERIV_NEW_TOKEN_URL = 'https://auth.deriv.com/oauth2/token';
export const getApiMode = (): 'legacy' | 'new' => {
    // Priority 1: Check for new OIDC tokens
    if (localStorage.getItem('new_api_access_token')) return 'new';
    
    // Priority 2: Check for legacy tokens
    if (localStorage.getItem('authToken')) return 'legacy';
    
    // Default to 'legacy' — uses the app's own registered app_id.
    // The OIDC client (new mode) requires pre-registering redirect URIs with
    // Deriv's auth server, which is not done for this deployment.
    return 'legacy';
};

export const API_MODE = getApiMode();

export const APP_IDS = {
    LOCALHOST: 36300,
    TMP_STAGING: 121856,
    STAGING: 121856,
    STAGING_BE: 121856,
    STAGING_ME: 121856,
    PRODUCTION: 113536,
    PRODUCTION_BE: 121856,
    PRODUCTION_ME: 121856,
    VERCEL: 121856,
};


export const livechat_license_id = 12049137;
export const livechat_client_id = '66aa088aad5a414484c1fd1fa8a5ace7';

export const domain_app_ids = {
    'master.bot-standalone.pages.dev': APP_IDS.TMP_STAGING,
    'staging-dbot.deriv.com': APP_IDS.STAGING,
    'staging-dbot.deriv.be': APP_IDS.STAGING_BE,
    'staging-dbot.deriv.me': APP_IDS.STAGING_ME,
    'dbot.deriv.com': APP_IDS.PRODUCTION,
    'dbot.deriv.be': APP_IDS.PRODUCTION_BE,
    'dbot.deriv.me': APP_IDS.PRODUCTION_ME,
    '22-dec.vercel.app': APP_IDS.PRODUCTION,
    'profithubtool.vercel.app': APP_IDS.PRODUCTION,
    'onsitetraders.vercel.app': APP_IDS.PRODUCTION,
};

export const getClientId = () => {
    return (
        process.env.VITE_CLIENT_ID ||
        (import.meta as any).env?.VITE_CLIENT_ID ||
        '33d0CwaiZBb5E0bWvKfJo'
    );
};

export const getCurrentProductionDomain = () =>
    !/^staging\./.test(window.location.hostname) &&
    Object.keys(domain_app_ids).find(domain => window.location.hostname === domain);

export const isProduction = () => {
    const all_domains = Object.keys(domain_app_ids).map(domain => `(www\\.)?${domain.replace('.', '\\.')}`);
    return new RegExp(`^(${all_domains.join('|')})$`, 'i').test(window.location.hostname);
};

export const isTestLink = () => {
    return (
        window.location.origin?.includes('.binary.sx') ||
        window.location.origin?.includes('bot-65f.pages.dev') ||
        isLocal()
    );
};

export const isLocal = () =>
    /localhost(:\d+)?$|127\.0\.0\.1(:\d+)?$|0\.0\.0\.0(:\d+)?$/i.test(window.location.hostname);

const getDefaultServerURL = () => {
    return 'ws.derivws.com';
};

export const getDefaultAppIdAndUrl = () => {
    const server_url = getDefaultServerURL();

    if (isTestLink()) {
        return { app_id: APP_IDS.LOCALHOST, server_url };
    }

    const current_domain = getCurrentProductionDomain() ?? '';
    const app_id = domain_app_ids[current_domain as keyof typeof domain_app_ids] ?? APP_IDS.PRODUCTION;

    return { app_id, server_url };
};

export const getAppId = () => {
    // 1. Priority: Environment Variable (Deployment)
    const env_app_id =
        process.env.VITE_APP_ID ||
        (import.meta as unknown as { env: { VITE_APP_ID: string } }).env?.VITE_APP_ID ||
        process.env.REACT_APP_Deriv_APP_ID;

    if (env_app_id) {
        console.log('[Config] Using App ID from environment variable:', env_app_id);
        return String(env_app_id);
    }

    let app_id = null;
    const config_app_id = window.localStorage.getItem('config.app_id');
    const current_domain = getCurrentProductionDomain() ?? '';

    // 2. Priority: LocalStorage Override (Endpoint Page)
    if (config_app_id) {
        app_id = config_app_id;
    }
    // 3. Priority: Staging/Test Environments
    else if (isStaging()) {
        app_id = APP_IDS.STAGING;
    } else if (isTestLink()) {
        app_id = APP_IDS.LOCALHOST;
    }
    // 4. Priority: Production / Default
    else {
        app_id = domain_app_ids[current_domain as keyof typeof domain_app_ids] ?? APP_IDS.PRODUCTION;
    }

    return app_id;
};

export const getSocketURL = () => {
    const local_storage_server_url = window.localStorage.getItem('config.server_url');
    if (local_storage_server_url) return local_storage_server_url;

    const server_url = getDefaultServerURL();

    return server_url;
};

export const checkAndSetEndpointFromUrl = () => {
    if (isTestLink()) {
        const url_params = new URLSearchParams(location.search.slice(1));

        if (url_params.has('qa_server') && url_params.has('app_id')) {
            const qa_server = url_params.get('qa_server') || '';
            const app_id = url_params.get('app_id') || '';

            url_params.delete('qa_server');
            url_params.delete('app_id');

            if (/^(^(www\.)?qa[0-9]{1,4}\.deriv.dev|(.*)\.derivws\.com)$/.test(qa_server) && /^[0-9]+$/.test(app_id)) {
                localStorage.setItem('config.app_id', app_id);
                localStorage.setItem('config.server_url', qa_server.replace(/"/g, ''));
            }

            const params = url_params.toString();
            const hash = location.hash;

            location.href = `${location.protocol}//${location.hostname}${location.pathname}${params ? `?${params}` : ''
                }${hash || ''}`;

            return true;
        }
    }

    return false;
};

export const getDebugServiceWorker = () => {
    const debug_service_worker_flag = window.localStorage.getItem('debug_service_worker');
    if (debug_service_worker_flag) return !!parseInt(debug_service_worker_flag);

    return false;
};

/**
 * Generates a cryptographically secure CSRF token
 * @returns A random base64url-encoded string
 */
const generateCSRFToken = (): string => {
    // Generate 32 random bytes (256 bits) for strong security
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);

    // Convert to base64url encoding (URL-safe)
    const base64 = btoa(String.fromCharCode(...array));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

/**
 * Stores CSRF token in sessionStorage for validation after OAuth callback
 * @param token The CSRF token to store
 */
const storeCSRFToken = (token: string): void => {
    sessionStorage.setItem('oauth_csrf_token', token);
    // Also store timestamp for token expiration (e.g., 10 minutes)
    sessionStorage.setItem('oauth_csrf_token_timestamp', Date.now().toString());
};

/**
 * Validates CSRF token from OAuth callback
 * @param token The token to validate
 * @returns true if token is valid and not expired
 */
export const validateCSRFToken = (token: string): boolean => {
    const storedToken = sessionStorage.getItem('oauth_csrf_token');
    const timestamp = sessionStorage.getItem('oauth_csrf_token_timestamp');

    if (!storedToken || !timestamp) {
        return false;
    }

    // Check if token matches
    if (storedToken !== token) {
        return false;
    }

    // Check if token is expired (10 minutes = 600000ms)
    const tokenAge = Date.now() - parseInt(timestamp, 10);
    if (tokenAge > 600000) {
        // Clean up expired token
        sessionStorage.removeItem('oauth_csrf_token');
        sessionStorage.removeItem('oauth_csrf_token_timestamp');
        return false;
    }

    return true;
};

/**
 * Clears CSRF token from sessionStorage after successful validation
 */
export const clearCSRFToken = (): void => {
    sessionStorage.removeItem('oauth_csrf_token');
    sessionStorage.removeItem('oauth_csrf_token_timestamp');
};


const legacyGenerateOAuthURL = () => {
    const is_local = isLocal();
    const app_id = is_local ? APP_IDS.LOCALHOST : getAppId();
    // Use /callback as redirect_uri — this is registered in the Deriv app portal
    // (api.deriv.com) for app_id 113536, and our callback-page.tsx handles
    // both legacy (acct1/token1) and new (code/state) token formats.
    const redirect_uri = `${window.location.origin}/callback`;
    const login_url = `https://oauth.deriv.com/oauth2/authorize?app_id=${app_id}&brand=deriv&redirect_uri=${encodeURIComponent(redirect_uri)}`;

    console.log('[Config] Generated Legacy OAuth URL:', login_url);
    return login_url;
};


const newGenerateOAuthURL = async (prompt?: string) => {
    const client_id = getClientId();
    const redirect_uri = `${window.location.origin}/callback`;
    
    // Generate PKCE
    const { code_verifier, code_challenge } = await generatePKCE();
    const state = generateState();
    
    // Generate and store CSRF token (for template compatibility)
    const csrfToken = generateCSRFToken();
    storeCSRFToken(csrfToken);
    
    // Store for callback
    storePKCEState(code_verifier, state);
    
    let login_url = `${DERIV_NEW_AUTH_URL}?client_id=${client_id}&redirect_uri=${encodeURIComponent(redirect_uri)}&response_type=code&scope=trade&state=${state}&code_challenge=${code_challenge}&code_challenge_method=S256`;

    if (prompt) {
        login_url += `&prompt=${encodeURIComponent(prompt)}`;
    }

    console.log('[Config] Generated New OIDC URL with PKCE:', login_url);
    return login_url;
};


export const generateOAuthURL = async (promptOrMode: string | undefined = API_MODE) => {
    // If it looks like a prompt ('registration') and we are in new mode, use it as prompt
    if (promptOrMode === 'registration' || promptOrMode === 'login') {
        return newGenerateOAuthURL(promptOrMode);
    }
    
    if (promptOrMode === 'new') {
        return newGenerateOAuthURL();
    }
    return legacyGenerateOAuthURL();
};
