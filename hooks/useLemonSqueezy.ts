import { useEffect } from 'react';

declare global {
  interface Window {
    createLemonSqueezy?: () => void;
    LemonSqueezy?: {
      Setup: (opts: { eventHandler: (event: { event: string; data: unknown }) => void }) => void;
      Url: {
        Open: (url: string) => void;
        Close: () => void;
      };
    };
  }
}

function initLemonSqueezy(onSuccess?: (data: unknown) => void) {
  if (window.createLemonSqueezy) {
    window.createLemonSqueezy();
  }
  if (window.LemonSqueezy && onSuccess) {
    window.LemonSqueezy.Setup({
      eventHandler: (event) => {
        if (event.event === 'Checkout.Success') {
          onSuccess(event.data);
        }
      },
    });
  }
}

export function useLemonSqueezy(onSuccess?: (data: unknown) => void) {
  useEffect(() => {
    const existingScript = document.getElementById('lemon-squeezy-js');
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = 'https://app.lemonsqueezy.com/js/lemon.js';
      script.id = 'lemon-squeezy-js';
      script.defer = true;
      script.onload = () => initLemonSqueezy(onSuccess);
      document.body.appendChild(script);
    } else {
      initLemonSqueezy(onSuccess);
    }
  }, []);
}
