// 在同域代理的播放器页面内运行，直接调用当前页面的播放控件。
{
  const controls = ".flex.h-14.w-full.items-center.justify-between";
  const selectors = {
    previous: `${controls} button:nth-of-type(2)`,
    toggle: `${controls} button:nth-of-type(3)`,
    next: `${controls} button:nth-of-type(4)`,
    like: ".fn-like-button",
  };
  const playbackSelectors = ["previous", "toggle", "next"];

  const labels = {
    previous: "上一首",
    toggle: "播放 / 暂停",
    next: "下一首",
    like: "收藏 / 取消收藏",
    delete: "删除歌曲",
  };
  let toastTimer;
  const showToast = (action) => {
    const toast = document.createElement("div");
    toast.className = "assan-remote-toast";
    toast.textContent = `远程控制：${labels[action]}`;
    document.body.append(toast);
    requestAnimationFrame(() =>
      toast.classList.add("assan-remote-toast-visible"),
    );
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove("assan-remote-toast-visible");
      setTimeout(() => toast.remove(), 220);
    }, 1800);
  };
  const waitForButton = (selector) =>
    new Promise((resolve) => {
      const find = () => {
        const button = document.querySelector(selector);
        return button && !button.disabled && button.getAttribute("aria-disabled") !== "true"
          ? button
          : null;
      };
      const existing = find();
      if (existing) return resolve(existing);
      const observer = new MutationObserver(() => {
        const button = find();
        if (button) finish(button);
      });
      const timer = setTimeout(() => finish(null), 3000);
      const finish = (button) => {
        observer.disconnect();
        clearTimeout(timer);
        resolve(button);
      };
      observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true });
    });
  let deleting = false;
  const activate = async (action, remote = false) => {
    if (action === "delete") {
      if (deleting || !document.querySelector(".fn-delete-button")) return false;
      deleting = true;
      try {
        for (const selector of [".fn-delete-button", ".fn-delete-file-button", ".fn-dialog-delete-confirm-button"]) {
          const button = await waitForButton(selector);
          if (!button || location.pathname === "/music/login") return false;
          button.click();
        }
        if (remote) showToast(action);
        return true;
      } finally {
        deleting = false;
      }
    }
    const button = document.querySelector(selectors[action]);
    if (!button) return false;
    button.click();
    if (remote) showToast(action);
    return true;
  };
  // Poll only while the player's controls exist. The server removes a command
  // when it returns it, so there is deliberately no client acknowledgement.
  let polling = false;
  const poll = async () => {
    if (
      polling || deleting ||
      location.pathname === "/music/login" ||
      !playbackSelectors.every((action) => document.querySelector(selectors[action]))
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
        if (data.action === "delete" || Object.hasOwn(selectors, data.action))
          await activate(data.action, true);
      }
    } catch {
      /* A later poll can resume when connectivity returns. */
    } finally {
      polling = false;
    }
  };
  const pollTimer = setInterval(() => {
    void poll();
  }, 2000);
  window.addEventListener("pagehide", () => clearInterval(pollTimer));
  const mobile = matchMedia("(hover: none) and (pointer: coarse)");
  let zone;
  let scheduled = false;

  const mount = () => {
    scheduled = false;
    const ready =
      mobile.matches &&
      location.pathname !== "/music/login" &&
      playbackSelectors.every((action) => document.querySelector(selectors[action]));
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
      "音乐手势控制区：上划上一首，下划下一首，右划收藏或取消收藏，左划删除歌曲，双击播放或暂停；键盘可用方向键、空格键和回车键",
    );
    const icon = (content) =>
      `<svg class="assan-gesture-icon" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${content}</svg>`;
    zone.innerHTML =
      `<span class="assan-gesture-item" aria-hidden="true">${icon('<path d="M32 46V19m-12 12 12-12 12 12"/>')}<small>上划<strong>上一首</strong></small></span>` +
      `<span class="assan-gesture-row" aria-hidden="true"><span class="assan-gesture-item">${icon('<path d="M46 32H18m12-12L18 32l12 12"/>')}<small>左划<strong>删除</strong></small></span><span class="assan-gesture-item">${icon('<path d="M25 20.5c0-1.8 1.9-2.9 3.5-2l17 11c1.8 1.1 1.8 3.9 0 5l-17 11c-1.6.9-3.5-.2-3.5-2z"/>')}<small>双击<strong>播放/暂停</strong></small></span><span class="assan-gesture-item">${icon('<path d="M18 32h28M34 20l12 12-12 12"/>')}<small>右划<strong>收藏</strong></small></span></span>` +
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
          void activate(dy < 0 ? "previous" : "next");
          lastTap = 0;
          event.preventDefault();
        } else if (Math.abs(dx) >= 48 && Math.abs(dx) > Math.abs(dy) * 1.5) {
          void activate(dx < 0 ? "delete" : "like");
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
            void activate("toggle");
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
        ArrowLeft: "delete",
        ArrowRight: "like",
        " ": "toggle",
        Enter: "toggle",
      }[event.key];
      if (action) {
        event.preventDefault();
        void activate(action);
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
