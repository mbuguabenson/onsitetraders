import { getInitialLanguage } from '@deriv-com/translations';

/**
 * Appends the current app_id and language as query parameters to an internal
 * Deriv standalone URL, ensuring the destination page knows which app to
 * redirect back to after completing its flow.
 *
 * @param path  A relative or absolute URL (e.g. from standalone_routes).
 * @returns     The URL with `app_id` and `lang` params appended.
 */
export const generateUrlWithRedirect = (path: string): string => {
    if (!path) return '/';

    try {
        // Resolve full URL — handles both absolute and relative paths
        const base = path.startsWith('http') ? path : `${window.location.origin}${path}`;
        const url = new URL(base);

        // Append current language if available
        const lang = getInitialLanguage();
        if (lang) {
            url.searchParams.set('lang', lang);
        }

        // Append app_id from env so downstream services can identify the caller
        const appId = process.env.VITE_APP_ID || '';
        if (appId) {
            url.searchParams.set('app_id', appId);
        }

        // Append redirect URI so the destination can send the user back
        const { getRedirectUri } = await import('@/components/shared/utils/config/config');
        url.searchParams.set('redirect_uri', getRedirectUri());

        return url.toString();
    } catch (error) {
        console.error('[url-redirect-utils] Failed to generate URL with redirect:', path, error);
        return path;
    }
};

/**
 * Appends `redirect_uri` pointing back to the current origin's root page.
 * Useful when a standalone page needs to return the user to the trading bot.
 */
export const generateRedirectUri = (): string => {
    // Note: This is now a synchronous wrapper but the actual URI might be async in some apps.
    // In this project config.ts getRedirectUri is sync.
    const { getRedirectUri } = require('@/components/shared/utils/config/config');
    return getRedirectUri();
};
