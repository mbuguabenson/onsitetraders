/**
 * Utility functions for authentication-related operations
 */

/**
 * Clears authentication data from local storage and reloads the page
 */
export const clearAuthData = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('active_loginid');
    localStorage.removeItem('client.country');
    localStorage.removeItem('account_type');
    localStorage.removeItem('accountsList');
    localStorage.removeItem('clientAccounts');
    localStorage.removeItem('callback_token');
    
    // Clear new OIDC tokens
    localStorage.removeItem('new_api_access_token');
    localStorage.removeItem('new_api_refresh_token');
    localStorage.removeItem('new_api_account_id');
    localStorage.removeItem('new_api_accounts_list');
    localStorage.removeItem('API_MODE');
    
    // Clear session storage as well
    sessionStorage.clear();
};
