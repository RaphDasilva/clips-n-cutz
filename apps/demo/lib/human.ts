import type { Locator, Page } from "@playwright/test";

// ── Fake cursor overlay ──────────────────────────────────────
// A small circular div injected into every page. Before every click
// we animate it to the target's centre (~600ms, eased), flash a
// ~300ms ripple, THEN click — so the viewer always sees the action.

export const CURSOR_INIT_SCRIPT = `
(() => {
  if (window.__cncCursorInstalled) return;
  window.__cncCursorInstalled = true;

  // Hide the Next.js dev-tools indicator so it never appears on camera.
  const hideDevTools = () => {
    document.querySelectorAll('nextjs-portal').forEach((el) => {
      el.style.display = 'none';
    });
  };
  const mo = new MutationObserver(hideDevTools);
  const startObserver = () => {
    hideDevTools();
    mo.observe(document.documentElement, { childList: true, subtree: true });
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startObserver);
  } else {
    startObserver();
  }
  let pos = { x: 960, y: 540 };

  function ensure() {
    let el = document.getElementById('__cnc-cursor');
    if (!el) {
      el = document.createElement('div');
      el.id = '__cnc-cursor';
      Object.assign(el.style, {
        position: 'fixed', left: pos.x + 'px', top: pos.y + 'px',
        width: '22px', height: '22px', borderRadius: '50%',
        background: 'rgba(255,255,255,0.85)',
        border: '2px solid rgba(0,0,0,0.55)',
        boxShadow: '0 2px 10px rgba(0,0,0,0.45)',
        transform: 'translate(-50%, -50%)',
        zIndex: '2147483647', pointerEvents: 'none',
        transition: 'left 0.6s cubic-bezier(0.22, 1, 0.36, 1), top 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
      });
      (document.body || document.documentElement).appendChild(el);
    }
    return el;
  }

  window.__cncCursorMove = (x, y) => {
    const el = ensure();
    pos = { x, y };
    el.style.left = x + 'px';
    el.style.top = y + 'px';
  };

  window.__cncCursorRipple = (x, y) => {
    const r = document.createElement('div');
    Object.assign(r.style, {
      position: 'fixed', left: x + 'px', top: y + 'px',
      width: '14px', height: '14px', borderRadius: '50%',
      border: '3px solid rgba(255,255,255,0.9)',
      background: 'rgba(255,255,255,0.25)',
      transform: 'translate(-50%, -50%) scale(1)',
      zIndex: '2147483646', pointerEvents: 'none',
      transition: 'transform 0.3s ease-out, opacity 0.3s ease-out',
      opacity: '1',
    });
    (document.body || document.documentElement).appendChild(r);
    requestAnimationFrame(() => {
      r.style.transform = 'translate(-50%, -50%) scale(3.4)';
      r.style.opacity = '0';
    });
    setTimeout(() => r.remove(), 400);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensure);
  } else {
    ensure();
  }
})();
`;

async function cursorTo(page: Page, x: number, y: number): Promise<void> {
  await page.evaluate(
    ([cx, cy]) => {
      const w = window as unknown as { __cncCursorMove?: (x: number, y: number) => void };
      w.__cncCursorMove?.(cx, cy);
    },
    [x, y],
  );
  await page.waitForTimeout(650);
}

async function ripple(page: Page, x: number, y: number): Promise<void> {
  await page.evaluate(
    ([cx, cy]) => {
      const w = window as unknown as { __cncCursorRipple?: (x: number, y: number) => void };
      w.__cncCursorRipple?.(cx, cy);
    },
    [x, y],
  );
  await page.waitForTimeout(300);
}

/** Animate the fake cursor to the target, flash a ripple, then click. */
export async function humanClick(page: Page, target: Locator): Promise<void> {
  await target.scrollIntoViewIfNeeded();
  await page.waitForTimeout(150);
  const box = await target.boundingBox();
  if (!box) throw new Error("humanClick: target has no bounding box");
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await cursorTo(page, x, y);
  await ripple(page, x, y);
  await target.click();
  await page.waitForTimeout(800);
}

/** Cursor to the field, click it, then type at ~90ms/char (never fill()). */
export async function humanType(page: Page, target: Locator, text: string): Promise<void> {
  await humanClick(page, target);
  await target.pressSequentially(text, { delay: 90 });
  await page.waitForTimeout(500);
}

/** Move the cursor over something without clicking (to guide the eye). */
export async function humanHover(page: Page, target: Locator): Promise<void> {
  await target.scrollIntoViewIfNeeded();
  const box = await target.boundingBox();
  if (!box) return;
  await cursorTo(page, box.x + box.width / 2, box.y + box.height / 2);
}

export async function pause(page: Page, ms = 800): Promise<void> {
  await page.waitForTimeout(ms);
}
