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
  // 与飞牛音乐当前客户端的 authx 算法保持一致；这些常量来自公开的播放器代码，
  // 并非用户凭据。music-token 仍由浏览器 Cookie 经同域代理发送。
  const musicSignaturePrefix = "NDzZTVxnRKP8Z0jXg1VAMonaG8akvh";
  const musicApiKey = "6D5602D4-A342-4799-A0F0-BB795E7167D0";
  const md5 = (text) => {
    const input = new TextEncoder().encode(text);
    const length = Math.ceil((input.length + 9) / 64) * 64;
    const bytes = new Uint8Array(length);
    bytes.set(input);
    bytes[input.length] = 128;
    const view = new DataView(bytes.buffer);
    view.setUint32(length - 8, (input.length * 8) >>> 0, true);
    view.setUint32(length - 4, Math.floor(input.length / 0x20000000), true);
    const shifts = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
    const constants = Array.from({ length: 64 }, (_, i) =>
      Math.floor(Math.abs(Math.sin(i + 1)) * 0x100000000),
    );
    const state = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476];
    for (let offset = 0; offset < length; offset += 64) {
      let [a, b, c, d] = state;
      for (let i = 0; i < 64; i++) {
        let f, g, shift;
        if (i < 16) {
          f = (b & c) | (~b & d); g = i; shift = shifts[i % 4];
        } else if (i < 32) {
          f = (d & b) | (~d & c); g = (5 * i + 1) % 16; shift = shifts[4 + i % 4];
        } else if (i < 48) {
          f = b ^ c ^ d; g = (3 * i + 5) % 16; shift = shifts[8 + i % 4];
        } else {
          f = c ^ (b | ~d); g = (7 * i) % 16; shift = shifts[12 + i % 4];
        }
        const sum = (a + f + constants[i] + view.getUint32(offset + g * 4, true)) | 0;
        const rotated = (sum << shift) | (sum >>> (32 - shift));
        [a, b, c, d] = [d, (b + rotated) | 0, b, c];
      }
      state[0] = (state[0] + a) | 0;
      state[1] = (state[1] + b) | 0;
      state[2] = (state[2] + c) | 0;
      state[3] = (state[3] + d) | 0;
    }
    return state.map((word) =>
      Array.from({ length: 4 }, (_, i) => ((word >>> (i * 8)) & 255).toString(16).padStart(2, "0")).join(""),
    ).join("");
  };
  const musicAuthx = (path, payload) => {
    const nonce = String(Math.floor(Math.random() * 900000) + 100000);
    const timestamp = String(Date.now());
    const digest = md5(payload);
    const sign = md5([musicSignaturePrefix, path, nonce, timestamp, digest, musicApiKey].join("_"));
    return `nonce=${nonce}&timestamp=${timestamp}&sign=${sign}`;
  };
  const musicRequest = async (path, options = {}) => {
    const method = options.method ?? "GET";
    const payload = method === "GET" ? new URLSearchParams(new URL(path, location.origin).search).toString() : options.body;
    const response = await fetch(path, {
      ...options,
      credentials: "same-origin",
      cache: "no-store",
      headers: { ...options.headers, authx: musicAuthx(new URL(path, location.origin).pathname, payload) },
    });
    if (!response.ok) throw new Error(`音乐接口返回 ${response.status}`);
    const result = await response.json();
    if (result?.code !== 0) throw new Error(result?.msg || "音乐接口操作失败");
    return result.data;
  };
  let deleting = false;
  const activate = async (action, remote = false) => {
    if (action === "delete") {
      if (deleting || location.pathname === "/music/login") return false;
      deleting = true;
      try {
        const history = await musicRequest("/music/api/v1/play-history/list?page=1&size=1");
        const guid = history?.list?.[0]?.guid;
        if (typeof guid !== "string" || !/^[a-zA-Z0-9_-]+$/.test(guid)) return false;
        const body = JSON.stringify({ folderPaths: [], isPermanent: true, trackGUIDs: [guid] });
        await musicRequest("/music/api/v1/folder-view/delete", {
          method: "POST", body, headers: { "Content-Type": "application/json" },
        });
        if (remote) showToast(action);
        return true;
      } catch (error) {
        console.error("删除歌曲失败", error);
        return false;
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
