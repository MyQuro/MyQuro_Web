// AUTH DEBUG UTILITY
// Use this in browser console to debug auth issues

export const authDebug = {
  async checkSession() {
    console.log('=== AUTH DEBUG: Session Check ===');

    try {
      const response = await fetch('https://backend.myquro.com/api/auth/session', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('Session Response Status:', response.status);
      console.log('Session Response Headers:', Object.fromEntries(response.headers.entries()));

      const data = await response.json();
      console.log('Session Data:', data);

      return data;
    } catch (error) {
      console.error('Session Check Error:', error);
      return null;
    }
  },

  checkCookies() {
    console.log('=== AUTH DEBUG: Cookies ===');
    console.log('Document Cookies:', document.cookie);

    const cookies = document.cookie.split(';').map(c => c.trim());
    cookies.forEach(cookie => {
      const [name, value] = cookie.split('=');
      console.log(`  ${name}: ${value}`);
    });
  },

  async testAuth() {
    console.log('=== AUTH DEBUG: Full Test ===');
    this.checkCookies();
    await this.checkSession();
  }
};

// Make it available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).authDebug = authDebug;
}