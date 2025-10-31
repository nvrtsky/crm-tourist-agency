/**
 * Universal clipboard copy function with fallback for iframe compatibility
 * Works in both modern browsers and restricted contexts like Bitrix24 iframe
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // Try modern Clipboard API first
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('Clipboard API failed, trying fallback method:', err);
    }
  }

  // Fallback method using textarea + execCommand (works in iframes)
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    
    // Make textarea invisible but focusable
    textarea.style.position = 'fixed';
    textarea.style.top = '-9999px';
    textarea.style.left = '-9999px';
    textarea.setAttribute('readonly', '');
    
    document.body.appendChild(textarea);
    
    // Select and copy
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    
    const success = document.execCommand('copy');
    
    // Cleanup
    document.body.removeChild(textarea);
    
    return success;
  } catch (err) {
    console.error('Fallback copy method failed:', err);
    return false;
  }
}
