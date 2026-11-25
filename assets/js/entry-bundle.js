/* ==== loader.js ==== */
/* ==========================================================================
   SITE LOADER / COSMIC-INSPIRED
   Star field, orbit system, counter and a clean hand-off to the entry cover.
   ========================================================================== */

(() => {
  const loader = document.querySelector("[data-site-loader]");
  if (!loader) return;

  document.documentElement.classList.add("is-loading");

  const counter = loader.querySelector("[data-loader-counter]");
  const status = loader.querySelector("[data-loader-status]");
  const progressBar = loader.querySelector("[data-loader-progress]");
  const canvas = loader.querySelector("[data-loader-stars]");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const duration = reduceMotion.matches ? 450 : 900;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const stars = [];
  const shootingStars = [];
  let canvasContext = null;
  let canvasWidth = 0;
  let canvasHeight = 0;
  let startedAt = 0;
  let rafId = 0;
  let finished = false;
  let lastStarFrame = 0;
  let nextShootingAt = 0;

  function resizeCanvas() {
    if (!canvas) return;
    canvasWidth = window.innerWidth;
    canvasHeight = window.innerHeight;
    canvas.width = Math.round(canvasWidth * dpr);
    canvas.height = Math.round(canvasHeight * dpr);
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;
    canvasContext = canvas.getContext("2d");
    if (canvasContext) canvasContext.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function seedStars() {
    stars.length = 0;
    const count = Math.round((canvasWidth * canvasHeight) / 4600);
    for (let index = 0; index < count; index += 1) {
      stars.push({
        x: Math.random() * canvasWidth,
        y: Math.random() * canvasHeight,
        radius: 0.45 + Math.random() * 1.15,
        alpha: 0.16 + Math.random() * 0.62,
        phase: Math.random() * Math.PI * 2,
        speed: 0.00018 + Math.random() * 0.00042,
        drift: 1.4 + Math.random() * 5.2,
      });
    }
  }

  function drawStars(now) {
    if (!canvasContext) return;
    const delta = lastStarFrame ? Math.min(now - lastStarFrame, 48) : 16;
    lastStarFrame = now;
    canvasContext.clearRect(0, 0, canvasWidth, canvasHeight);

    for (const star of stars) {
      const pulse = 0.55 + 0.45 * Math.sin(now * star.speed + star.phase);
      const x = star.x + Math.sin(now * star.speed * 0.55 + star.phase) * star.drift;
      const y = star.y + Math.cos(now * star.speed * 0.42 + star.phase) * star.drift * 0.55;
      canvasContext.beginPath();
      canvasContext.fillStyle = `rgba(225, 240, 235, ${(star.alpha * pulse).toFixed(3)})`;
      canvasContext.arc(x, y, star.radius, 0, Math.PI * 2);
      canvasContext.fill();
    }

    if (!nextShootingAt) nextShootingAt = now + 1400;
    if (now > nextShootingAt && shootingStars.length < 2) {
      const fromLeft = Math.random() > 0.5;
      const speed = 0.32 + Math.random() * 0.25;
      const angle = fromLeft ? Math.PI * 0.16 : Math.PI * 0.84;
      shootingStars.push({
        x: fromLeft
          ? Math.random() * canvasWidth * 0.36
          : canvasWidth * 0.64 + Math.random() * canvasWidth * 0.36,
        y: Math.random() * canvasHeight * 0.42,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
      });
      nextShootingAt = now + 2100 + Math.random() * 2300;
    }

    for (let index = shootingStars.length - 1; index >= 0; index -= 1) {
      const shootingStar = shootingStars[index];
      shootingStar.x += shootingStar.vx * delta;
      shootingStar.y += shootingStar.vy * delta;
      shootingStar.life -= delta / 1250;

      if (
        shootingStar.life <= 0 ||
        shootingStar.x < -80 ||
        shootingStar.x > canvasWidth + 80 ||
        shootingStar.y > canvasHeight + 80
      ) {
        shootingStars.splice(index, 1);
        continue;
      }

      const alpha = Math.max(0, shootingStar.life) * 0.52;
      canvasContext.beginPath();
      canvasContext.strokeStyle = `rgba(230, 242, 236, ${alpha.toFixed(3)})`;
      canvasContext.lineWidth = 0.9;
      canvasContext.moveTo(shootingStar.x, shootingStar.y);
      canvasContext.lineTo(
        shootingStar.x - shootingStar.vx * 68,
        shootingStar.y - shootingStar.vy * 68
      );
      canvasContext.stroke();
    }
  }

  function paintStaticStars() {
    if (!canvasContext) return;
    canvasContext.clearRect(0, 0, canvasWidth, canvasHeight);
    for (const star of stars) {
      canvasContext.beginPath();
      canvasContext.fillStyle = `rgba(225, 240, 235, ${star.alpha.toFixed(3)})`;
      canvasContext.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      canvasContext.fill();
    }
  }

  function finish() {
    if (finished) return;
    finished = true;
    if (counter) counter.textContent = "100%";
    if (status) status.textContent = "正在进入";
    if (progressBar) progressBar.style.transform = "scaleX(1)";
    loader.setAttribute("aria-valuenow", "100");
    loader.setAttribute("aria-valuetext", "100%");
    loader.classList.add("is-complete");

    window.setTimeout(() => {
      loader.classList.add("is-leaving");
      document.documentElement.classList.remove("is-loading");

      window.setTimeout(() => {
        loader.remove();
        window.dispatchEvent(new CustomEvent("xw:loader-complete"));
      }, 500);
    }, 250);
  }

  function frame(now) {
    if (finished) return;
    if (!startedAt) startedAt = now;
    const progress = Math.min((now - startedAt) / duration, 1);
    const percent = Math.round(progress * 100);
    if (counter) counter.textContent = `${percent}%`;
    if (progressBar) progressBar.style.transform = `scaleX(${progress.toFixed(4)})`;
    loader.setAttribute("aria-valuenow", String(percent));
    loader.setAttribute("aria-valuetext", `${percent}%`);
    if (canvasContext) {
      if (reduceMotion.matches) paintStaticStars();
      else drawStars(now);
    }

    if (progress < 1) {
      rafId = window.requestAnimationFrame(frame);
    } else {
      finish();
    }
  }

  resizeCanvas();
  seedStars();
  if (canvasContext) {
    if (reduceMotion.matches) paintStaticStars();
    else drawStars(performance.now());
  }

  window.addEventListener("resize", () => {
    resizeCanvas();
    seedStars();
    shootingStars.length = 0;
    lastStarFrame = 0;
    nextShootingAt = 0;
    if (canvasContext) paintStaticStars();
  });

  rafId = window.requestAnimationFrame(frame);

  // Failsafe: never let the loading cover become a dead end.
  window.setTimeout(() => {
    if (!finished) {
      if (rafId) window.cancelAnimationFrame(rafId);
      finish();
    }
  }, duration + 450);
})();

/* ==== entry.js ==== */
/* ==========================================================================
   ENTRY / LIVING BACKGROUND
   Autoplaying video, pointer parallax, dust, magnetic CTA and transition.
   No dependencies.
   ========================================================================== */

(() => {
  const body = document.body;
  const root = document.documentElement;
  const entry = document.querySelector(".entry");
  const video = document.getElementById("hero-video");
  const pointerGlow = document.getElementById("pointer-glow");
  const cursor = document.querySelector(".entry-cursor");
  const cursorLabel = document.querySelector(".entry-cursor__label");
  const timeLabel = document.getElementById("local-time");
  const canvas = document.getElementById("cosmos-canvas");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const defaultAccent = "#a9e4d2";
  const defaultAccentRgb = "169, 228, 210";

  let leaving = false;
  let revealDone = false;
  let parallaxFrame = 0;

  /* Autoplaying background ------------------------------------------------ */

  let videoLoadStarted = false;

  async function playVideo() {
    if (!video || !videoLoadStarted) return;
    video.muted = true;
    video.loop = true;
    try {
      await video.play();
    } catch (_error) {
      /* The poster remains until the next visibility / pointer retry. */
    }
  }

  function startVideoLoad() {
    if (!video || videoLoadStarted) return;
    videoLoadStarted = true;
    video.preload = "auto";
    if (video.readyState < 1) video.load();
    playVideo();
  }

  if (video) {
    video.muted = true;
    video.loop = true;
    video.setAttribute("playsinline", "");

    const startPlayback = () => {
      if (videoLoadStarted) playVideo();
    };

    if (video.readyState >= 2) startPlayback();
    else {
      video.addEventListener("loadeddata", startPlayback, { once: true });
      video.addEventListener("canplay", startPlayback, { once: true });
    }

    document.addEventListener(
      "visibilitychange",
      () => {
        if (!document.hidden) playVideo();
      },
      { passive: true }
    );
    document.addEventListener(
      "pointerdown",
      () => {
        if (video?.paused) playVideo();
      },
      { passive: true }
    );
    document.addEventListener("keydown", () => {
      if (video?.paused) playVideo();
    });

    window.setInterval(() => {
      if (video && video.paused && !document.hidden) playVideo();
    }, 5000);
  }

  const scheduleVideoLoad = () => {
    if (videoLoadStarted) return;
    const begin = () => {
      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(startVideoLoad, { timeout: 900 });
      } else {
        startVideoLoad();
      }
    };
    window.setTimeout(begin, 220);
  };

  if (video) {
    if (!document.documentElement.classList.contains("is-loading")) {
      scheduleVideoLoad();
    } else {
      window.addEventListener("xw:loader-complete", scheduleVideoLoad, { once: true });
      window.addEventListener(
        "load",
        () => {
          if (!document.documentElement.classList.contains("is-loading")) {
            scheduleVideoLoad();
          }
        },
        { once: true }
      );
      window.setTimeout(scheduleVideoLoad, 2600);
    }
  }

  const handleMotionPreference = () => {
    if (reduceMotion.matches) {
      stopParallax();
      resetParallax();
      hideCursor();
    } else {
      startParallax();
    }
    // The background video is the requested content, so it keeps playing even
    // when the operating system asks for reduced decorative motion.
    playVideo();
  };

  reduceMotion.addEventListener?.("change", handleMotionPreference);

  /* Reveal ---------------------------------------------------------------- */

  function reveal() {
    if (revealDone) return;
    revealDone = true;
    body.classList.add("is-ready");
  }

  const posterUrl = video?.getAttribute("poster");
  const posterReady = (() => {
    if (!posterUrl) return Promise.resolve();
    return new Promise((resolve) => {
      const image = new Image();
      image.onload = () => resolve();
      image.onerror = () => resolve();
      image.src = posterUrl;
      if (image.decode) image.decode().then(resolve).catch(() => {});
    });
  })();
  const fontsReady = document.fonts?.ready || Promise.resolve();
  const revealDelay = new Promise((resolve) => window.setTimeout(resolve, 80));
  const revealFallback = new Promise((resolve) => window.setTimeout(resolve, 1700));

  Promise.race([
    Promise.all([posterReady, fontsReady, revealDelay]).then(reveal),
    revealFallback.then(reveal),
  ]);
  window.addEventListener("load", () => window.setTimeout(reveal, 140), { once: true });

  /* Clock ----------------------------------------------------------------- */

  function updateClock() {
    if (!timeLabel) return;
    try {
      timeLabel.textContent = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Shanghai",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date());
    } catch (_error) {
      timeLabel.textContent = "";
    }
  }
  updateClock();
  window.setInterval(updateClock, 30_000);

  /* Accent / chapter index ------------------------------------------------ */

  function hexToRgb(hex) {
    const value = hex.replace("#", "");
    if (value.length !== 6) return defaultAccentRgb;
    const number = Number.parseInt(value, 16);
    return `${(number >> 16) & 255}, ${(number >> 8) & 255}, ${number & 255}`;
  }

  function setAccent(hex) {
    if (!entry) return;
    entry.style.setProperty("--scene-accent", hex);
    entry.style.setProperty("--scene-accent-rgb", hexToRgb(hex));
  }

  function resetAccent() {
    setAccent(defaultAccent);
  }

  document.querySelectorAll(".chapter-index a[data-accent]").forEach((link) => {
    const apply = () => setAccent(link.dataset.accent || defaultAccent);
    link.addEventListener("pointerenter", apply);
    link.addEventListener("focus", apply);
    link.addEventListener("pointerleave", resetAccent);
    link.addEventListener("blur", resetAccent);
  });
  resetAccent();

  /* Cursor ----------------------------------------------------------------- */

  let cursorVisible = false;

  function markCursorVisible() {
    if (reduceMotion.matches || cursorVisible) return;
    cursorVisible = true;
    body.classList.add("has-custom-cursor");
  }

  function hideCursor() {
    cursorVisible = false;
    body.classList.remove("has-custom-cursor");
  }

  function updateCursor(event) {
    if (!cursor || reduceMotion.matches || event.pointerType === "touch") return;
    markCursorVisible();
    root.style.setProperty("--cursor-x", `${event.clientX}px`);
    root.style.setProperty("--cursor-y", `${event.clientY}px`);

    const interactive = event.target instanceof Element
      ? event.target.closest("a, button, [data-cursor]")
      : null;
    if (cursorLabel) cursorLabel.textContent = interactive ? "OPEN" : "ENTER";
    cursor.classList.toggle("is-link", Boolean(interactive));
  }

  /* Parallax --------------------------------------------------------------- */

  const motion = {
    targetX: 0,
    targetY: 0,
    currentX: 0,
    currentY: 0,
    pointerX: window.innerWidth / 2,
    pointerY: window.innerHeight / 2,
  };

  function startParallax() {
    if (reduceMotion.matches) return;
    if (parallaxFrame) return;
    const step = () => {
      motion.currentX += (motion.targetX - motion.currentX) * 0.075;
      motion.currentY += (motion.targetY - motion.currentY) * 0.075;
      if (entry) {
        entry.style.setProperty("--bg-x", `${(-motion.currentX * 14).toFixed(2)}px`);
        entry.style.setProperty("--bg-y", `${(-motion.currentY * 10).toFixed(2)}px`);
      }
      parallaxFrame = window.requestAnimationFrame(step);
    };
    parallaxFrame = window.requestAnimationFrame(step);
  }

  function stopParallax() {
    if (!parallaxFrame) return;
    window.cancelAnimationFrame(parallaxFrame);
    parallaxFrame = 0;
  }

  function resetParallax() {
    motion.targetX = 0;
    motion.targetY = 0;
    motion.currentX = 0;
    motion.currentY = 0;
    if (!entry) return;
    entry.style.setProperty("--bg-x", "0px");
    entry.style.setProperty("--bg-y", "0px");
  }

  function onPointerMove(event) {
    updateCursor(event);

    if (!reduceMotion.matches) {
      motion.pointerX = event.clientX;
      motion.pointerY = event.clientY;
      motion.targetX = (event.clientX / window.innerWidth - 0.5) * 2;
      motion.targetY = (event.clientY / window.innerHeight - 0.5) * 2;
      if (pointerGlow) {
        root.style.setProperty("--pointer-x", `${event.clientX}px`);
        root.style.setProperty("--pointer-y", `${event.clientY}px`);
      }
      startParallax();
    }
  }

  document.addEventListener("pointermove", onPointerMove, { passive: true });
  document.addEventListener("pointerleave", hideCursor, { passive: true });

  /* Magnetic CTA ----------------------------------------------------------- */

  document.querySelectorAll(".magnetic").forEach((element) => {
    element.addEventListener("pointermove", (event) => {
      if (event.pointerType === "touch" || reduceMotion.matches) return;
      const bounds = element.getBoundingClientRect();
      const dx = (event.clientX - (bounds.left + bounds.width / 2)) / bounds.width;
      const dy = (event.clientY - (bounds.top + bounds.height / 2)) / bounds.height;
      element.style.setProperty("--mag-x", `${(dx * 7).toFixed(2)}px`);
      element.style.setProperty("--mag-y", `${(dy * 5).toFixed(2)}px`);
    });
    element.addEventListener("pointerleave", () => {
      element.style.setProperty("--mag-x", "0px");
      element.style.setProperty("--mag-y", "0px");
    });
    element.addEventListener("blur", () => {
      element.style.setProperty("--mag-x", "0px");
      element.style.setProperty("--mag-y", "0px");
    });
  });

  /* Canvas dust ------------------------------------------------------------ */

  if (canvas) {
    const ctx = canvas.getContext("2d", { alpha: true });
    const dust = [];
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    let canvasWidth = 0;
    let canvasHeight = 0;
    let canvasFrame = 0;
    let lastTime = 0;
    let elapsed = 0;

    for (let index = 0; index < 58; index += 1) {
      dust.push({
        x: Math.random(),
        y: Math.random(),
        vx: (Math.random() - 0.5) * 0.00004,
        vy: -(0.000008 + Math.random() * 0.000018),
        size: 0.35 + Math.random() * 1.2,
        alpha: 0.07 + Math.random() * 0.3,
        phase: Math.random() * Math.PI * 2,
        teal: Math.random() > 0.62,
      });
    }

    function resizeCanvas() {
      canvasWidth = window.innerWidth;
      canvasHeight = window.innerHeight;
      canvas.width = Math.round(canvasWidth * dpr);
      canvas.height = Math.round(canvasHeight * dpr);
      canvas.style.width = `${canvasWidth}px`;
      canvas.style.height = `${canvasHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function drawDust(time = 0) {
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      ctx.globalCompositeOperation = "lighter";
      for (const particle of dust) {
        particle.x += particle.vx;
        particle.y += particle.vy;
        if (particle.y < -0.02) particle.y = 1.02;
        if (particle.x < -0.02) particle.x = 1.02;
        if (particle.x > 1.02) particle.x = -0.02;

        const x = particle.x * canvasWidth;
        const y = particle.y * canvasHeight;
        const dx = x - motion.pointerX;
        const dy = y - motion.pointerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const proximity = Math.max(0, 1 - distance / 190);
        const shimmer = 0.72 + Math.sin(time * 0.0006 + particle.phase) * 0.28;
        const alpha = particle.alpha * shimmer + proximity * 0.22;
        const color = particle.teal ? "154, 226, 207" : "241, 225, 195";
        const radius = particle.size + proximity * 0.6;

        ctx.fillStyle = `rgba(${color}, ${Math.min(0.85, alpha) * 0.1})`;
        ctx.beginPath();
        ctx.arc(x, y, radius * 3.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(${color}, ${Math.min(0.9, alpha)})`;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
    }

    function animateDust(now) {
      if (document.hidden) {
        canvasFrame = window.requestAnimationFrame(animateDust);
        return;
      }
      if (!lastTime) lastTime = now;
      const delta = Math.min(48, now - lastTime);
      lastTime = now;
      elapsed += delta;
      drawDust(elapsed);
      canvasFrame = window.requestAnimationFrame(animateDust);
    }

    function startDust() {
      resizeCanvas();
      if (reduceMotion.matches) {
        drawDust(0);
        return;
      }
      if (!canvasFrame) {
        lastTime = 0;
        canvasFrame = window.requestAnimationFrame(animateDust);
      }
    }

    function stopDust() {
      if (!canvasFrame) return;
      window.cancelAnimationFrame(canvasFrame);
      canvasFrame = 0;
    }

    window.addEventListener("resize", resizeCanvas, { passive: true });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stopDust();
      else startDust();
    });

    reduceMotion.addEventListener?.("change", () => {
      stopDust();
      startDust();
    });

    startDust();
  }

  /* Entry transition ------------------------------------------------------- */

  function setEnterOrigin(event) {
    let x = window.innerWidth * 0.54;
    let y = window.innerHeight * 0.52;

    if (event && Number.isFinite(event.clientX) && Number.isFinite(event.clientY)) {
      x = event.clientX || x;
      y = event.clientY || y;
    }

    root.style.setProperty("--enter-x", `${(x / window.innerWidth) * 100}%`);
    root.style.setProperty("--enter-y", `${(y / window.innerHeight) * 100}%`);
  }

  function enter(url, event) {
    if (leaving) return;
    leaving = true;
    setEnterOrigin(event);
    body.classList.add("is-leaving");
    body.setAttribute("aria-busy", "true");
    hideCursor();

    const delay = reduceMotion.matches ? 0 : 300;
    window.setTimeout(() => {
      window.location.href = url;
    }, delay);
  }

  function resolveInternal(href) {
    try {
      return new URL(href, window.location.href);
    } catch (_error) {
      return null;
    }
  }

  document.addEventListener("click", (event) => {
    if (leaving) return;

    const link = event.target instanceof Element
      ? event.target.closest("[data-enter-link]")
      : null;

    if (link) {
      if (
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        link.target === "_blank"
      ) {
        return;
      }
      const url = resolveInternal(link.getAttribute("href"));
      if (!url) return;
      if (url.origin !== window.location.origin) return;
      event.preventDefault();
      enter(url.href, event);
      return;
    }

    if (
      event.target instanceof Element &&
      event.target.closest("a, button, .skip-link, .entry-cursor")
    ) {
      return;
    }

    if (String(window.getSelection() || "").trim()) return;
    const url = resolveInternal("portfolio.html");
    if (url) enter(url.href, event);
  });

  /* Keep the chapter index and lower homepage copy from colliding. --------- */
  const chapterIndex = document.querySelector(".chapter-index");
  const entryCopy = document.querySelector(".entry-copy");
  let textLayoutFrame = 0;

  const separateHomepageText = () => {
    textLayoutFrame = 0;
    if (!chapterIndex || !entryCopy) return;
    chapterIndex.style.transform = "";
    const main = document.querySelector(".entry-main");
    if (!main) return;
    const indexBounds = chapterIndex.getBoundingClientRect();
    const copyBounds = entryCopy.getBoundingClientRect();
    const gap = copyBounds.top - indexBounds.bottom;
    const desiredGap = 20;
    if (gap >= desiredGap) return;
    const mainBounds = main.getBoundingClientRect();
    const roomAbove = Math.max(0, indexBounds.top - mainBounds.top - 16);
    const shift = Math.min(desiredGap - gap, roomAbove);
    if (shift > 0.5) {
      chapterIndex.style.transform = `translateY(-${shift.toFixed(1)}px)`;
    }
  };

  const scheduleHomepageText = () => {
    if (textLayoutFrame) return;
    textLayoutFrame = window.requestAnimationFrame(separateHomepageText);
  };

  if (chapterIndex && entryCopy) {
    scheduleHomepageText();
    window.addEventListener("load", scheduleHomepageText, { passive: true });
    window.addEventListener("resize", scheduleHomepageText, { passive: true });
    window.setTimeout(scheduleHomepageText, 900);
    window.setTimeout(scheduleHomepageText, 1800);
    window.setTimeout(scheduleHomepageText, 2800);
    window.setTimeout(scheduleHomepageText, 3800);
    let textSeparationTries = 0;
    const textSeparationTimer = window.setInterval(() => {
      scheduleHomepageText();
      textSeparationTries += 1;
      if (textSeparationTries >= 14) window.clearInterval(textSeparationTimer);
    }, 400);
    if (document.fonts?.ready) document.fonts.ready.then(scheduleHomepageText);
    if ("ResizeObserver" in window) {
      const textResizeObserver = new ResizeObserver(scheduleHomepageText);
      textResizeObserver.observe(chapterIndex);
      textResizeObserver.observe(entryCopy);
    }
  }

  /* Initial values --------------------------------------------------------- */

  root.style.setProperty("--cursor-x", "-100px");
  root.style.setProperty("--cursor-y", "-100px");
  root.style.setProperty("--pointer-x", "50vw");
  root.style.setProperty("--pointer-y", "50vh");
})();

