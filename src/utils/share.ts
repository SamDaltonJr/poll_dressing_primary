const SHARE_TEXT = 'Help us place campaign signs at polling locations!';

function getAppUrl(): string {
  return window.location.origin + window.location.pathname;
}

export interface ShareResult {
  method: 'share' | 'clipboard';
  success: boolean;
}

export async function shareInviteLink(): Promise<ShareResult> {
  const url = getAppUrl();
  const shareData = {
    title: 'Campaign Sign Tracker',
    text: SHARE_TEXT,
    url,
  };

  if (navigator.share && navigator.canShare?.(shareData)) {
    try {
      await navigator.share(shareData);
      return { method: 'share', success: true };
    } catch (err) {
      if ((err as DOMException).name === 'AbortError') {
        return { method: 'share', success: false };
      }
    }
  }

  const text = `${SHARE_TEXT} ${url}`;

  // Try modern clipboard API first
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return { method: 'clipboard', success: true };
    } catch {
      // Fall through to execCommand fallback
    }
  }

  // Fallback: hidden textarea + execCommand
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return { method: 'clipboard', success: ok };
  } catch {
    return { method: 'clipboard', success: false };
  }
}
