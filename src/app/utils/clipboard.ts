/**
 * Clipboard Utility
 * 
 * Provides a fallback method for copying text to clipboard
 * when the Clipboard API is blocked by permissions policy
 */

/**
 * Copy text to clipboard using fallback method
 * @param text - The text to copy
 * @returns Promise that resolves to true if successful, false otherwise
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // Try modern Clipboard API first (if available and not blocked)
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      // Clipboard API blocked, fall through to fallback method
      console.warn('Clipboard API blocked, using fallback method');
    }
  }

  // Fallback method using textarea and execCommand
  const textArea = document.createElement('textarea');
  textArea.value = text;
  
  // Make the textarea invisible but still functional
  textArea.style.position = 'fixed';
  textArea.style.left = '-999999px';
  textArea.style.top = '-999999px';
  textArea.setAttribute('readonly', '');
  
  document.body.appendChild(textArea);
  
  try {
    // Select the text
    textArea.focus();
    textArea.select();
    
    // Try to copy
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    
    return successful;
  } catch (err) {
    console.error('Failed to copy text:', err);
    document.body.removeChild(textArea);
    return false;
  }
}
