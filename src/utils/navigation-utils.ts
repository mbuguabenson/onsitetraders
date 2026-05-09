/**
 * Navigation utilities — thin wrappers around window.location to allow
 * easy mocking in tests and a consistent navigation API across the app.
 */

/**
 * Navigate to the given URL.
 * @param url     Target URL (absolute or relative).
 * @param replace When true, replaces the current history entry (no back-button entry).
 */
export const navigateToUrl = (url: string, replace = false): void => {
    if (!url) return;
    try {
        if (replace) {
            window.location.replace(url);
        } else {
            window.location.assign(url);
        }
    } catch (error) {
        console.error('[navigation-utils] Failed to navigate to URL:', url, error);
    }
};

/**
 * Opens a URL in a new browser tab.
 * @param url Target URL.
 */
export const openInNewTab = (url: string): void => {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
};

/**
 * Returns true when the app is currently on the Deriv OAuth callback page.
 */
export const isCallbackPage = (): boolean => {
    return window.location.pathname === '/callback';
};
