// 在同域代理的播放器页面内运行，直接调用当前页面的播放控件。
{
  const controls = ".flex.h-14.w-full.items-center.justify-between";
  const selectors = {
    previous: `${controls} button:nth-of-type(2)`,
    toggle: `${controls} button:nth-of-type(3)`,
    next: `${controls} button:nth-of-type(4)`,
  };

  const activate = (action) =>
    document.querySelector(selectors[action])?.click();
  // Poll only while the player's controls exist. The server removes a command
  // when it returns it, so there is deliberately no client acknowledgement.
  let polling = false;
  const poll = async () => {
    if (
      polling ||
      location.pathname === "/music/login" ||
      !Object.values(selectors).every((selector) =>
        document.querySelector(selector),
      )
    )
      return;
    polling = true;
    try {
      const response = await fetch("/api/v1/music/commands/next", {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (response.ok) {
        const { data } = await response.json();
        if (Object.hasOwn(selectors, data.action)) activate(data.action);
      }
    } catch {
      /* A later poll can resume when connectivity returns. */
    } finally {
      polling = false;
    }
  };
  const pollTimer = setInterval(() => {
    void poll();
  }, 3000);
  window.addEventListener("pagehide", () => clearInterval(pollTimer));
  const mobile = matchMedia("(hover: none) and (pointer: coarse)");
  let zone;
  let scheduled = false;

  const mount = () => {
    scheduled = false;
    const ready =
      mobile.matches &&
      location.pathname !== "/music/login" &&
      Object.values(selectors).every((selector) =>
        document.querySelector(selector),
      );
    if (!ready) {
      zone?.remove();
      zone = undefined;
      return;
    }
    if (zone?.isConnected || !document.body) return;

    zone = document.createElement("div");
    zone.className = "assan-gesture-zone";
    zone.setAttribute("role", "group");
    zone.setAttribute("tabindex", "0");
    zone.setAttribute(
      "aria-label",
      "音乐手势控制区：上划上一首，下划下一首，双击播放或暂停；键盘可用上下方向键和空格键",
    );
    const icon = (content) =>
      `<svg class="assan-gesture-icon" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${content}</svg>`;
    zone.innerHTML =
      `<span class="assan-gesture-item" aria-hidden="true">${icon('<path d="M32 46V19m-12 12 12-12 12 12"/>')}<small>上划<strong>上一首</strong></small></span>` +
      `<span class="assan-gesture-item" aria-hidden="true">${icon('<path d="M25 20.5c0-1.8 1.9-2.9 3.5-2l17 11c1.8 1.1 1.8 3.9 0 5l-17 11c-1.6.9-3.5-.2-3.5-2z"/>')}<small>双击<strong> 播放/暂停 </strong></small></span>` +
      `<span class="assan-gesture-item" aria-hidden="true">${icon('<path d="M32 18v27M20 33l12 12 12-12"/>')}<small>下划<strong>下一首</strong></small></span>`;

    let start;
    let lastTap = 0;
    let lastX = 0;
    let lastY = 0;
    zone.addEventListener(
      "touchstart",
      (event) => {
        if (event.touches.length !== 1) {
          start = undefined;
          lastTap = 0;
          return;
        }
        const touch = event.changedTouches[0];
        start = {
          id: touch.identifier,
          x: touch.clientX,
          y: touch.clientY,
          time: Date.now(),
        };
      },
      { passive: true },
    );
    zone.addEventListener(
      "touchend",
      (event) => {
        if (
          !start ||
          event.touches.length ||
          event.changedTouches.length !== 1 ||
          event.changedTouches[0].identifier !== start.id
        ) {
          start = undefined;
          return;
        }
        const touch = event.changedTouches[0];
        const dx = touch.clientX - start.x;
        const dy = touch.clientY - start.y;
        const now = Date.now();
        if (Math.abs(dy) >= 48 && Math.abs(dy) > Math.abs(dx) * 1.5) {
          activate(dy < 0 ? "previous" : "next");
          lastTap = 0;
          event.preventDefault();
        } else if (
          Math.abs(dx) < 20 &&
          Math.abs(dy) < 20 &&
          now - start.time < 350
        ) {
          if (
            now - lastTap < 350 &&
            Math.hypot(touch.clientX - lastX, touch.clientY - lastY) < 48
          ) {
            activate("toggle");
            lastTap = 0;
            event.preventDefault();
          } else {
            lastTap = now;
            lastX = touch.clientX;
            lastY = touch.clientY;
          }
        } else lastTap = 0;
        start = undefined;
      },
      { passive: false },
    );
    zone.addEventListener("touchcancel", () => {
      start = undefined;
      lastTap = 0;
    });
    zone.addEventListener("keydown", (event) => {
      const action = {
        ArrowUp: "previous",
        ArrowDown: "next",
        " ": "toggle",
        Enter: "toggle",
      }[event.key];
      if (action) {
        event.preventDefault();
        activate(action);
      }
    });
    document.body.append(zone);
  };

  const scheduleMount = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(mount);
  };
  new MutationObserver(scheduleMount).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
  mobile.addEventListener("change", scheduleMount);
  scheduleMount();
}
