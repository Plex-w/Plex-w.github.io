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
  const duration = reduceMotion.matches ? 700 : 2200;
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
      }, 760);
    }, 520);
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
  }, 6000);
})();
