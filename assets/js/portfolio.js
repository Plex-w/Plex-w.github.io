/* ==========================================================================
   PORTFOLIO / MAIN SITE
   Folder-based work archive, gallery dialog, navigation and quiet reveals.
   No dependencies.
   ========================================================================== */

(() => {
  document.documentElement.classList.add("js");

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const body = document.body;

  /* ---------------------------------------------------------------------
     Helpers
     --------------------------------------------------------------------- */
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  const escapeHTML = (value) =>
    String(value).replace(/[&<>"']/g, (character) => {
      const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
      return map[character];
    });

  let toastTimer;
  function showToast(message) {
    const toast = $(".toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2200);
  }

  // Keep only the background video near the viewport decoding/playing.
  function pauseWhenHidden(video, target, onVisible) {
    if (!video || !target || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          delete video.dataset.offscreen;
          onVisible();
        } else {
          video.dataset.offscreen = "true";
          video.pause();
        }
      },
      { rootMargin: "120px 0px", threshold: 0.01 }
    );
    observer.observe(target);
  }

  /* ---------------------------------------------------------------------
     Hero background video
     --------------------------------------------------------------------- */
  const heroVideo = $("#hero-video");

  if (heroVideo) {
    const heroSource = heroVideo.querySelector("source");
    const heroSrc = heroSource?.src;
    let heroLoaded = Boolean(heroSrc);
    if (heroSource) heroSource.remove();
    if (heroSrc) heroVideo.src = heroSrc;

    heroVideo.muted = true;
    heroVideo.loop = true;
    heroVideo.setAttribute("playsinline", "");

    const playHeroVideo = () => {
      if (!heroLoaded || !heroVideo.paused) return;
      const attempt = heroVideo.play();
      if (attempt?.catch) attempt.catch(() => {});
    };

    if (heroVideo.readyState >= 2) playHeroVideo();
    else {
      ["loadeddata", "canplay", "canplaythrough"].forEach((eventName) => {
        heroVideo.addEventListener(eventName, playHeroVideo, { once: true });
      });
    }

    document.addEventListener(
      "visibilitychange",
      () => {
        if (!document.hidden) playHeroVideo();
      },
      { passive: true }
    );
    document.addEventListener("pointerdown", playHeroVideo, { passive: true });
    document.addEventListener("keydown", playHeroVideo);
    window.setInterval(() => {
      if (!document.hidden) playHeroVideo();
    }, 5000);

    // Let the page text and images paint before the large hero video starts.
    const startHeroVideo = () => {
      if (!heroLoaded) return;
      heroVideo.preload = "auto";
      if (heroVideo.readyState < 1) heroVideo.load();
      playHeroVideo();
    };
    window.setTimeout(() => {
      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(startHeroVideo, { timeout: 700 });
      } else {
        startHeroVideo();
      }
    }, 350);

    // Release the large hero file once it leaves the viewport, so the lower
    // sections and project videos get the connection on mobile.
    const heroSection = $("#top");
    if (heroSection && heroSrc && "IntersectionObserver" in window) {
      const unloadHeroVideo = () => {
        if (!heroLoaded) return;
        heroLoaded = false;
        heroVideo.pause();
        heroVideo.removeAttribute("src");
        heroVideo.load();
      };
      const reloadHeroVideo = () => {
        if (heroLoaded) return;
        heroLoaded = true;
        heroVideo.src = heroSrc;
        heroVideo.load();
        playHeroVideo();
      };
      const heroObserver = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) reloadHeroVideo();
          else unloadHeroVideo();
        },
        { threshold: 0.01 }
      );
      heroObserver.observe(heroSection);
    }
  }

  /* ---------------------------------------------------------------------
     About background video
     --------------------------------------------------------------------- */
  const aboutStage = $(".about-stage:not(.about-stage--evidence)");
  const aboutVideos = $$(
    ".about-stage:not(.about-stage--evidence) .about-stage__video"
  );
  let aboutActive = false;

  aboutVideos.forEach((aboutVideo) => {
    aboutVideo.muted = true;
    aboutVideo.loop = true;
    aboutVideo.setAttribute("playsinline", "");

    const playAboutVideo = () => {
      if (
        !aboutActive ||
        aboutVideo.dataset.offscreen === "true" ||
        !aboutVideo.paused
      ) return;
      const attempt = aboutVideo.play();
      if (attempt?.catch) attempt.catch(() => {});
    };

    if (aboutVideo.readyState >= 2) playAboutVideo();
    else {
      ["loadeddata", "canplay", "canplaythrough"].forEach((eventName) => {
        aboutVideo.addEventListener(eventName, playAboutVideo, { once: true });
      });
    }

    document.addEventListener(
      "visibilitychange",
      () => {
        if (!document.hidden) playAboutVideo();
      },
      { passive: true }
    );
    document.addEventListener("pointerdown", playAboutVideo, { passive: true });
    document.addEventListener("keydown", playAboutVideo);
    window.setInterval(() => {
      if (!document.hidden) playAboutVideo();
    }, 5000);

    pauseWhenHidden(aboutVideo, aboutStage, playAboutVideo);
  });

  const activateAboutVideo = () => {
    aboutActive = true;
    aboutVideos.forEach((aboutVideo) => {
      aboutVideo.preload = "auto";
      if (aboutVideo.readyState < 1) aboutVideo.load();
      const attempt = aboutVideo.play();
      if (attempt?.catch) attempt.catch(() => {});
    });
  };

  if (aboutStage && "IntersectionObserver" in window) {
    const aboutVideoObserver = new IntersectionObserver(
      (entries, observer) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        activateAboutVideo();
        observer.disconnect();
      },
      { rootMargin: "200px 0px" }
    );
    aboutVideoObserver.observe(aboutStage);
  } else {
    activateAboutVideo();
  }

  /* Gentle pointer parallax for the portrait. */
  const aboutPhotoFloat = $(".about-photo__float");
  if (aboutStage && aboutPhotoFloat) {
    const finePointer = window.matchMedia("(pointer: fine)");

    if (finePointer.matches) {
      let photoFrame = 0;
      const movePhoto = (event) => {
        if (photoFrame) return;
        photoFrame = window.requestAnimationFrame(() => {
          const rect = aboutStage.getBoundingClientRect();
          const x = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width - 0.5) * 2));
          const y = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height - 0.5) * 2));
          aboutPhotoFloat.style.setProperty("--photo-x", `${(x * 9).toFixed(2)}px`);
          aboutPhotoFloat.style.setProperty("--photo-y", `${(y * 7).toFixed(2)}px`);
          photoFrame = 0;
        });
      };
      const resetPhoto = () => {
        aboutPhotoFloat.style.setProperty("--photo-x", "0px");
        aboutPhotoFloat.style.setProperty("--photo-y", "0px");
      };

      aboutStage.addEventListener("pointermove", movePhoto, { passive: true });
      aboutStage.addEventListener("pointerleave", resetPhoto, { passive: true });
    }
  }

  const evidenceVideo = $(".about-stage__video--evidence");
  if (evidenceVideo) {
    const evidenceStage = $(".about-stage--evidence");
    let evidenceActive = false;

    const playEvidenceVideo = () => {
      if (!evidenceActive || evidenceVideo.dataset.offscreen === "true") return;
      const attempt = evidenceVideo.play();
      if (attempt?.catch) attempt.catch(() => {});
    };

    const warmEvidenceVideo = () => {
      evidenceActive = true;
      evidenceVideo.muted = true;
      evidenceVideo.preload = "auto";
      if (evidenceVideo.readyState < 1) evidenceVideo.load();
      playEvidenceVideo();
    };

    pauseWhenHidden(evidenceVideo, evidenceStage, playEvidenceVideo);

    if (evidenceStage && "IntersectionObserver" in window) {
      const evidenceObserver = new IntersectionObserver(
        (entries, observer) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          warmEvidenceVideo();
          observer.disconnect();
        },
        { rootMargin: "300px 0px" }
      );
      evidenceObserver.observe(evidenceStage);
    } else {
      warmEvidenceVideo();
    }
  }

  /* ---------------------------------------------------------------------
     Work section background video
     Full source duration, muted, looping, no play control.
     --------------------------------------------------------------------- */
  const workBackgroundVideo = $("#work-background-video");
  let workActive = false;

  if (workBackgroundVideo) {
    workBackgroundVideo.muted = true;
    workBackgroundVideo.loop = true;
    workBackgroundVideo.playsInline = true;
    workBackgroundVideo.setAttribute("playsinline", "");

    const playWorkBackgroundVideo = () => {
      if (
        !workActive ||
        workBackgroundVideo.dataset.offscreen === "true" ||
        !workBackgroundVideo.paused
      ) return;
      const attempt = workBackgroundVideo.play();
      if (attempt?.catch) attempt.catch(() => {});
    };

    if (workBackgroundVideo.readyState >= 2) playWorkBackgroundVideo();
    else {
      ["loadeddata", "canplay", "canplaythrough"].forEach((eventName) => {
        workBackgroundVideo.addEventListener(eventName, playWorkBackgroundVideo, {
          once: true,
        });
      });
    }

    document.addEventListener(
      "visibilitychange",
      () => {
        if (!document.hidden) playWorkBackgroundVideo();
      },
      { passive: true }
    );
    document.addEventListener("pointerdown", playWorkBackgroundVideo, { passive: true });
    document.addEventListener("keydown", playWorkBackgroundVideo);

    window.setInterval(() => {
      if (!document.hidden) playWorkBackgroundVideo();
    }, 4000);

    const activateWorkBackgroundVideo = () => {
      workActive = true;
      workBackgroundVideo.preload = "auto";
      if (workBackgroundVideo.readyState < 1) workBackgroundVideo.load();
      playWorkBackgroundVideo();
    };

    const videoScope = $(".video-scope");
    if (videoScope && "IntersectionObserver" in window) {
      const workVideoObserver = new IntersectionObserver(
        (entries, observer) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          activateWorkBackgroundVideo();
          observer.disconnect();
        },
        { rootMargin: "600px 0px" }
      );
      workVideoObserver.observe(videoScope);
      pauseWhenHidden(workBackgroundVideo, videoScope, playWorkBackgroundVideo);
    } else {
      activateWorkBackgroundVideo();
    }
  }

  /* ---------------------------------------------------------------------
     Contact background video
     Full source duration, muted, looping, no play control.
     --------------------------------------------------------------------- */
  const contactBackgroundVideo = $("#contact-background-video");
  let contactActive = false;

  if (contactBackgroundVideo) {
    const useCompactContactVideo = window.matchMedia(
      "(max-width: 900px), (pointer: coarse)"
    ).matches;
    const contactVideoSource = document.createElement("source");
    contactVideoSource.type = "video/mp4";
    contactVideoSource.src = useCompactContactVideo
      ? "assets/video/contact-background-mobile.mp4"
      : "assets/video/contact-background-desktop.mp4";
    contactBackgroundVideo.appendChild(contactVideoSource);

    contactBackgroundVideo.muted = true;
    contactBackgroundVideo.loop = true;
    contactBackgroundVideo.playsInline = true;
    contactBackgroundVideo.setAttribute("playsinline", "");

    const CONTACT_VIDEO_RATE = 0.5;
    const applyContactVideoRate = () => {
      contactBackgroundVideo.defaultPlaybackRate = CONTACT_VIDEO_RATE;
      if (Math.abs(contactBackgroundVideo.playbackRate - CONTACT_VIDEO_RATE) > 0.001) {
        contactBackgroundVideo.playbackRate = CONTACT_VIDEO_RATE;
      }
    };
    applyContactVideoRate();

    const playContactBackgroundVideo = () => {
      if (
        !contactActive ||
        contactBackgroundVideo.dataset.offscreen === "true"
      ) return;
      applyContactVideoRate();
      if (!contactBackgroundVideo.paused) return;
      const attempt = contactBackgroundVideo.play();
      if (attempt?.catch) attempt.catch(() => {});
    };

    ["loadedmetadata", "play", "playing", "ratechange"].forEach((eventName) => {
      contactBackgroundVideo.addEventListener(eventName, applyContactVideoRate);
    });

    if (contactBackgroundVideo.readyState >= 2) playContactBackgroundVideo();
    else {
      ["loadeddata", "canplay", "canplaythrough"].forEach((eventName) => {
        contactBackgroundVideo.addEventListener(eventName, playContactBackgroundVideo, {
          once: true,
        });
      });
    }

    contactBackgroundVideo.addEventListener("ended", () => {
      try {
        contactBackgroundVideo.currentTime = 0;
      } catch (_error) {
        // The loop attribute normally handles this; ignore failed seeks.
      }
      playContactBackgroundVideo();
    });

    document.addEventListener(
      "visibilitychange",
      () => {
        if (!document.hidden) playContactBackgroundVideo();
      },
      { passive: true }
    );
    document.addEventListener("pointerdown", playContactBackgroundVideo, { passive: true });
    document.addEventListener("keydown", playContactBackgroundVideo);

    window.setInterval(() => {
      if (!document.hidden) playContactBackgroundVideo();
    }, 4000);

    const activateContactVideo = () => {
      contactActive = true;
      contactBackgroundVideo.preload = "auto";
      if (contactBackgroundVideo.readyState < 1) contactBackgroundVideo.load();
      try {
        contactBackgroundVideo.currentTime = 0;
      } catch (_error) {
        // Metadata may still be loading; playback starts at zero anyway.
      }
      playContactBackgroundVideo();
    };

    const contactSection = $("#contact");
    if (contactSection && "IntersectionObserver" in window) {
      const contactVideoObserver = new IntersectionObserver(
        (entries, observer) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          activateContactVideo();
          observer.disconnect();
        },
        { rootMargin: "300px 0px", threshold: 0.01 }
      );
      contactVideoObserver.observe(contactSection);
      pauseWhenHidden(contactBackgroundVideo, contactSection, playContactBackgroundVideo);
    } else {
      activateContactVideo();
    }
  }

  /* ---------------------------------------------------------------------
     Folder-based work archive
     --------------------------------------------------------------------- */
  const workData = window.WORK_DATA;
  const mediaData = window.MEDIA_DATA;
  const workArchive = $("#workArchive");
  const workToc = $("#work-toc");
  const projectIndex = new Map();
  const videoProjects = mediaData?.videos?.projects || [];
  const allWorkCategories = [
    ...(workData?.categories || []),
    ...(mediaData?.links ? [mediaData.links] : []),
    ...(mediaData?.videos ? [mediaData.videos] : []),
  ];

  function layoutClassFor(project) {
    if (project.id === "qingqiu") return "image-wall--panorama";
    if (project.id === "arui") return "image-wall--book";
    if (project.id === "poster-ai") return "image-wall--single";
    if (project.id === "poster-charity") return "image-wall--duo";
    if (project.id === "poster-nyota") return "image-wall--posters";
    return "image-wall--masonry";
  }

  function renderImage(image, index, projectId, total) {
    return `
      <figure class="archive-image">
        <button
          class="archive-image__button"
          type="button"
          data-gallery-project="${escapeHTML(projectId)}"
          data-gallery-index="${index}"
          aria-label="查看大图：${escapeHTML(image.title)}（${index + 1} / ${total}）"
        >
          <img
            src="${escapeHTML(image.src)}"
            alt="${escapeHTML(image.alt)}"
            width="${image.width}"
            height="${image.height}"
            loading="lazy"
            decoding="async"
          />
          <span class="archive-image__zoom" aria-hidden="true">↗</span>
        </button>
        <figcaption class="archive-image__caption">
          <span class="archive-image__no">${String(index + 1).padStart(2, "0")}</span>
          <span class="archive-image__title">${escapeHTML(image.title)}</span>
          <span class="archive-image__group">${escapeHTML(image.group)}</span>
        </figcaption>
      </figure>
    `;
  }

  function renderCircularGallery(project) {
    const isUiGallery = project.id === "nightflow";
    const cards = project.images
      .map(
        (image, index) => `
          <button
            class="circular-gallery__item"
            type="button"
            data-gallery-project="${escapeHTML(project.id)}"
            data-gallery-index="${index}"
            aria-label="查看大图：${escapeHTML(image.title)}（${index + 1} / ${project.images.length}）"
          >
            <img
              src="${escapeHTML(image.src)}"
              alt="${escapeHTML(image.alt)}"
              width="${image.width}"
              height="${image.height}"
              loading="lazy"
              decoding="async"
              draggable="false"
            />
          </button>`
      )
      .join("");

    return `
      <p class="circular-gallery__hint circular-gallery__hint--orbit">
        <span class="circular-gallery__hint-desktop">拖动轨道浏览 · 点击图片查看详情</span>
        <span class="circular-gallery__hint-touch">左右拖动轨道 · 点击图片查看详情</span>
      </p>
      <div class="circular-gallery circular-gallery--orbit" data-circular-gallery aria-label="三维课堂练习轨道图像">
        <div class="circular-gallery__orbit-path" aria-hidden="true"></div>
        <div class="circular-gallery__viewport" data-circular-gallery-viewport>
          ${cards}
        </div>
      </div>
    `;
  }

  function renderUiShowcase(project) {
    const first = project.images[0];
    const cards = project.images
      .map(
        (image, index) => `
          <button
            class="ui-fan__card"
            type="button"
            data-gallery-project="${escapeHTML(project.id)}"
            data-gallery-index="${index}"
            aria-label="查看大图：${escapeHTML(image.title)}（${index + 1} / ${project.images.length}）"
          >
            <img
              src="${escapeHTML(image.src)}"
              alt="${escapeHTML(image.alt)}"
              width="${image.width}"
              height="${image.height}"
              loading="lazy"
              decoding="async"
              draggable="false"
            />
          </button>`
      )
      .join("");

    return `
      <p class="circular-gallery__hint circular-gallery__hint--ui ui-showcase__hint">
        <span class="circular-gallery__hint-desktop">按住鼠标左键拖动图片滚动 · 点击图片查看详情</span>
        <span class="circular-gallery__hint-touch">左右拖动图片滚动 · 点击图片查看详情</span>
      </p>
      <div class="ui-showcase" data-ui-showcase aria-label="UI 界面与交互设计手机样机画廊">
        <div class="ui-showcase__stage">
          <div class="ui-fan" data-ui-fan>
            ${cards}
          </div>
          <div
            class="ui-phone"
            data-ui-phone
            data-gallery-project="${escapeHTML(project.id)}"
            data-gallery-index="0"
            role="button"
            tabindex="0"
            aria-label="查看当前 UI 作品：${escapeHTML(first.title)}"
          >
            <div class="ui-phone__frame">
              <div class="ui-phone__screen">
                <img
                  class="ui-phone__image"
                  data-ui-phone-image
                  src="${escapeHTML(first.src)}"
                  alt="${escapeHTML(first.alt)}"
                  width="${first.width}"
                  height="${first.height}"
                  decoding="async"
                  draggable="false"
                />
              </div>
              <span class="ui-phone__island" aria-hidden="true"></span>
              <span class="ui-phone__glare" aria-hidden="true"></span>
            </div>
            <span class="ui-phone__button ui-phone__button--mute" aria-hidden="true"></span>
            <span class="ui-phone__button ui-phone__button--volume" aria-hidden="true"></span>
            <span class="ui-phone__button ui-phone__button--power" aria-hidden="true"></span>
          </div>
        </div>
      </div>
    `;
  }

  function renderProject(project, category, projectNumber) {
    projectIndex.set(project.id, { ...project, categoryTitle: category.title });
    const isAigc = category.id === "aigc";
    const is3dClass = project.id === "3d-class";
    const isUiGallery = project.id === "nightflow";
    const layoutClass = isAigc ? "image-wall--aigc" : layoutClassFor(project);
    const projectClass = isAigc ? " archive-project--aigc" : "";
    const projectBody = is3dClass
      ? renderCircularGallery(project)
      : isUiGallery
        ? renderUiShowcase(project)
        : `
        <div class="image-wall ${layoutClass}" data-project="${escapeHTML(project.id)}">
          ${project.images
            .map((image, index) =>
              renderImage(image, index, project.id, project.images.length)
            )
            .join("")}
        </div>`;
    return `
      <section
        class="archive-project${projectClass}"
        id="project-${escapeHTML(project.id)}"
        aria-labelledby="project-${escapeHTML(project.id)}-title"
      >
        <header class="archive-project__head" data-reveal>
          <div class="archive-project__heading">
            <span class="archive-project__index">${category.index}.${projectNumber}</span>
            <h4 id="project-${escapeHTML(project.id)}-title">${escapeHTML(project.title)}</h4>
            <p class="archive-project__subtitle">${escapeHTML(project.subtitle)}</p>
            <p class="archive-project__folder">${escapeHTML(project.folder)}</p>
          </div>
          <div class="archive-project__copy">
            <p>${escapeHTML(project.description)}</p>
            <ul class="archive-project__tags" aria-label="项目标签">
              ${project.tags.map((tag) => `<li>${escapeHTML(tag)}</li>`).join("")}
            </ul>
          </div>
          <div class="archive-project__meta">
            <strong>${String(project.images.length).padStart(2, "0")}</strong>
            <span>张图片</span>
            <em>${escapeHTML(project.kicker)}</em>
          </div>
        </header>
        ${projectBody}
      </section>
    `;
  }

  function renderChapterHead(category, meta) {
    return `
      <header class="chapter-head" data-reveal>
        <span class="chapter-head__number">${category.index}</span>
        <div class="chapter-head__heading">
          <p class="chapter-head__folder">${escapeHTML(category.folder)}</p>
          <h3 id="work-${escapeHTML(category.id)}-title">${escapeHTML(category.title)}</h3>
          <p class="chapter-head__en">${escapeHTML(category.en)}</p>
        </div>
        <p class="chapter-head__intro">${escapeHTML(category.intro)}</p>
        <div class="chapter-head__meta">${meta}</div>
      </header>
    `;
  }

  function chapterMeta(category, { unit, projectUnit } = {}) {
    const count = String(category.count).padStart(2, "0");
    if (unit) {
      return `<strong>${count}</strong><span>${unit}</span>`;
    }
    return `<strong>${count}</strong><span>张图片 / ${category.projects.length} ${projectUnit || "个项目"}</span>`;
  }

  function renderCategory(category) {
    const projects = category.projects
      .map((project, index) => renderProject(project, category, index + 1))
      .join("");

    return `
      <article
        class="work-chapter"
        id="work-${escapeHTML(category.id)}"
        data-work-category="${escapeHTML(category.id)}"
        aria-labelledby="work-${escapeHTML(category.id)}-title"
      >
        ${renderChapterHead(category, chapterMeta(category))}
        <div class="chapter-projects">${projects}</div>
      </article>
    `;
  }

  function renderLinkCategory(category) {
    const cards = category.projects
      .map((project, index) => {
        const host = (() => {
          try {
            return new URL(project.url).host;
          } catch (_error) {
            return project.url.replace(/^https?:\/\//, "").split("/")[0];
          }
        })();
        const mark = project.theme === "craft" ? "匠" : project.theme === "spring" ? "春" : "H5";

        return `
          <a
            class="h5-card h5-card--${escapeHTML(project.theme || "neutral")}"
            href="${escapeHTML(project.url)}"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="在新窗口打开：${escapeHTML(project.title)}"
          >
            <span class="h5-card__top">
              <span class="h5-card__index">${category.index}.${index + 1}</span>
              <span class="h5-card__tag">${escapeHTML(project.tag)}</span>
            </span>
            <span class="h5-card__mark" aria-hidden="true">${mark}</span>
            <span class="h5-card__body">
              <span class="h5-card__title">${escapeHTML(project.title)}</span>
              <span class="h5-card__subtitle">${escapeHTML(project.subtitle)}</span>
              <span class="h5-card__desc">${escapeHTML(project.description)}</span>
            </span>
            <span class="h5-card__foot">
              <span>${escapeHTML(host)}</span>
              <span>打开线上项目 <i aria-hidden="true">↗</i></span>
            </span>
          </a>
        `;
      })
      .join("");

    return `
      <article
        class="work-chapter work-chapter--media"
        id="work-${escapeHTML(category.id)}"
        data-work-category="${escapeHTML(category.id)}"
        aria-labelledby="work-${escapeHTML(category.id)}-title"
      >
        ${renderChapterHead(category, chapterMeta(category, { unit: "个线上项目" }))}
        <div class="h5-grid">${cards}</div>
      </article>
    `;
  }

  function renderVideoCategory(category) {
    const cards = category.projects
      .map(
        (video, index) => `
          <button
            class="video-card"
            type="button"
            data-video-index="${index}"
            data-cursor="view"
            aria-label="播放视频：${escapeHTML(video.title)}，${escapeHTML(video.duration)}"
          >
            <span class="video-card__media">
              <img
                src="${escapeHTML(video.poster)}"
                alt=""
                width="${video.posterWidth}"
                height="${video.posterHeight}"
                loading="lazy"
                decoding="async"
              />
              <span class="video-card__shade" aria-hidden="true"></span>
              <span class="video-card__play" aria-hidden="true"><i></i></span>
              <span class="video-card__duration">${escapeHTML(video.duration)}</span>
            </span>
            <span class="video-card__body">
              <span class="video-card__meta">${escapeHTML(video.category)} / ${escapeHTML(video.resolution)}</span>
              <span class="video-card__title">${escapeHTML(video.title)}</span>
              <span class="video-card__desc">${escapeHTML(video.description)}</span>
            </span>
          </button>
        `
      )
      .join("");

    return `
      <article
        class="work-chapter work-chapter--media"
        id="work-${escapeHTML(category.id)}"
        data-work-category="${escapeHTML(category.id)}"
        aria-labelledby="work-${escapeHTML(category.id)}-title"
      >
        ${renderChapterHead(category, chapterMeta(category, { unit: "支视频" }))}
        <div class="video-grid">${cards}</div>
      </article>
    `;
  }

  function renderWork() {
    if (!workArchive) return;

    const mediaCount =
      (mediaData?.links?.projects?.length || 0) +
      (mediaData?.videos?.projects?.length || 0);
    const stats = {
      categories: allWorkCategories.length,
      images: workData?.total?.images || 0,
      media: mediaCount,
    };

    $$("[data-work-stat]").forEach((element) => {
      const key = element.dataset.workStat;
      const value = stats[key];
      if (typeof value === "number") {
        element.textContent = String(value).padStart(2, "0");
      }
    });

    if (workToc) {
      workToc.innerHTML = allWorkCategories
        .map(
          (category) => `
            <a href="#work-${escapeHTML(category.id)}" data-work-toc="${escapeHTML(category.id)}">
              <span class="work-toc__number">${category.index}</span>
              <span class="work-toc__name">${escapeHTML(category.title)}</span>
              <span class="work-toc__count">${String(category.count).padStart(2, "0")}</span>
            </a>
          `
        )
        .join("");
    }

    workArchive.innerHTML = allWorkCategories
      .map((category) => {
        if (category.type === "links") return renderLinkCategory(category);
        if (category.type === "videos") return renderVideoCategory(category);
        return renderCategory(category);
      })
      .join("");
  }

  renderWork();

  /* ---------------------------------------------------------------------
     Circular 3D class gallery
     Horizontal ring, front/back scaling, sequential intro, drag rotation.
     --------------------------------------------------------------------- */
  function initCircularGalleryOne(gallery) {
    if (!gallery) return;

    const items = $$(".circular-gallery__item", gallery);
    if (items.length < 2) return;

    const step = (Math.PI * 2) / items.length;
    const slotAngles = items.map((_, index) => {
      if (index === 0) return 0;
      const side = index % 2 === 1 ? 1 : -1;
      const distance = Math.ceil(index / 2);
      return side * distance * step;
    });

    let rotation = 0;
    let velocity = 0;
    let dragging = false;
    let lastX = 0;
    let dragDistance = 0;
    let suppressClick = false;
    let introStarted = false;
    let introActive = false;
    let introStart = 0;
    let lastFrame = 0;
    let rafId = 0;

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    const easeOutCubic = (value) => 1 - Math.pow(1 - value, 3);
    const isUiGallery = gallery.classList.contains("circular-gallery--ui");
    const radiusFactor = isUiGallery ? 0.4156 : 0.4021;
    const dense = items.length > 12;
    const introDelay = 1180;
    const introStagger = dense ? 45 : 95;
    const introSpread = dense ? 560 : 720;
    const introEnd = introDelay + (items.length - 2) * introStagger + introSpread;

    const scaleFor = (angle) => {
      const depth = (Math.cos(angle) + 1) / 2;
      return 0.32 + 0.68 * Math.pow(depth, 3);
    };

    const depthFor = (angle) => {
      const depth = (Math.cos(angle) + 1) / 2;
      return 100 + Math.round(depth * 100);
    };

    function render(now) {
      const radius = gallery.clientWidth * radiusFactor;
      const elapsed = introActive ? now - introStart : introEnd;
      const staggerAmplitude = isUiGallery ? Math.min(42, gallery.clientWidth * 0.03) : 0;

      items.forEach((item, index) => {
        let angle = rotation + slotAngles[index];
        let scale = scaleFor(angle);
        let x = Math.sin(angle) * radius;
        let y = 0;
        let opacity = 1;
        let zIndex = depthFor(angle);

        if (introActive) {
          if (index === 0) {
            const progress = easeOutCubic(clamp((elapsed - 140) / 1000, 0, 1));
            angle = rotation;
            x = 0;
            scale = 0.02 + 0.98 * progress;
            opacity = elapsed >= 80 ? 1 : 0;
            zIndex = 1000;
          } else {
            const startAt = introDelay + (index - 1) * introStagger;
            const progress = easeOutCubic(clamp((elapsed - startAt) / introSpread, 0, 1));
            angle = rotation + slotAngles[index] * progress;
            x = Math.sin(angle) * radius;
            scale = 0.22 + (scaleFor(angle) - 0.22) * progress;
            opacity = elapsed >= startAt ? 1 : 0;
            zIndex = depthFor(angle);
          }
        }

        if (staggerAmplitude && (index !== 0 || !introActive)) {
          y =
            Math.sin(angle * 2) * staggerAmplitude +
            Math.sin(angle * 1.5) * staggerAmplitude * 0.25;
          if (introActive && index !== 0) {
            const startAt = introDelay + (index - 1) * introStagger;
            const progress = easeOutCubic(clamp((elapsed - startAt) / introSpread, 0, 1));
            y *= progress;
          }
        }

        item.style.transform = `translate(-50%, -50%) translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
        item.style.opacity = String(opacity);
        item.style.zIndex = String(zIndex);
      });
    }

    function schedule() {
      if (rafId) return;
      rafId = window.requestAnimationFrame(tick);
    }

    function tick(now) {
      rafId = 0;
      if (!lastFrame) lastFrame = now;
      const frameStep = Math.min((now - lastFrame) / 16.667, 2.5);
      lastFrame = now;

      if (introActive) {
        if (now - introStart >= introEnd) {
          introActive = false;
          render(now);
        } else {
          render(now);
          schedule();
        }
        return;
      }

      if (!dragging) {
        rotation += velocity * frameStep;
        velocity *= Math.pow(0.94, frameStep);
        if (Math.abs(velocity) < 0.00004) velocity = 0;
      }

      render(now);
      if (Math.abs(velocity) > 0.00004) schedule();
    }

    function beginIntro() {
      if (introStarted) return;
      introStarted = true;
      introActive = true;
      introStart = performance.now();
      lastFrame = introStart;
      render(introStart);
      schedule();
    }

    const firstImage = $("img", items[0]);
    const startWhenReady = () => {
      if (!firstImage || (firstImage.complete && firstImage.naturalWidth)) {
        beginIntro();
        return;
      }
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        beginIntro();
      };
      firstImage.addEventListener("load", finish, { once: true });
      firstImage.addEventListener("error", finish, { once: true });
      window.setTimeout(finish, 1200);
    };

    if ("IntersectionObserver" in window) {
      const galleryObserver = new IntersectionObserver(
        (entries, observer) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          observer.disconnect();
          startWhenReady();
        },
        { threshold: 0.32 }
      );
      galleryObserver.observe(gallery);
    } else {
      startWhenReady();
    }

    gallery.addEventListener("pointerdown", (event) => {
      if (!introStarted || introActive) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      dragging = true;
      lastX = event.clientX;
      dragDistance = 0;
      velocity = 0;
      suppressClick = false;
      gallery.classList.add("is-dragging");
    });

    gallery.addEventListener("pointermove", (event) => {
      if (!dragging) return;
      const deltaX = event.clientX - lastX;
      lastX = event.clientX;
      dragDistance += Math.abs(deltaX);
      rotation += deltaX * 0.004;
      velocity = clamp(deltaX * 0.0016, -0.055, 0.055);
      if (dragDistance > 4) suppressClick = true;
      render(performance.now());
    });

    const endDrag = () => {
      if (!dragging) return;
      dragging = false;
      gallery.classList.remove("is-dragging");
      schedule();
      window.setTimeout(() => {
        suppressClick = false;
      }, 90);
    };

    gallery.addEventListener("pointerup", endDrag);
    gallery.addEventListener("pointercancel", endDrag);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);

    gallery.addEventListener(
      "click",
      (event) => {
        if (!suppressClick) return;
        event.preventDefault();
        event.stopPropagation();
        suppressClick = false;
      },
      true
    );

    window.addEventListener("resize", () => {
      if (introStarted) render(performance.now());
    });
  }

  function initUiGallery(gallery) {
    if (!gallery) return;

    const items = $$(".circular-gallery__item", gallery);
    if (items.length < 2) return;

    const count = items.length;
    const half = count / 2;
    const scaleTable = [1, 0.97, 0.93, 0.88];
    const xTable = [0, 0.17014, 0.31597, 0.45486];
    const yRight = [0, 45, 95, 130];
    const yLeft = [0, 35, 85, 120];
    const rotRight = [0, -3.5, 4.5, -5.5];
    const rotLeft = [0, 3.5, -4.5, 5.5];

    let center = 0;
    let velocity = 0;
    let dragging = false;
    let lastX = 0;
    let dragDistance = 0;
    let suppressClick = false;
    let introStarted = false;
    let introActive = false;
    let introStart = 0;
    let lastFrame = 0;
    let rafId = 0;

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    const easeOutCubic = (value) => 1 - Math.pow(1 - value, 3);
    const introDelay = 1180;
    const introStagger = 80;
    const introSpread = 600;
    const introEnd = introDelay + 5 * introStagger + introSpread;

    const interpolate = (table, value) => {
      const v = clamp(value, 0, table.length - 1);
      const index = Math.min(table.length - 2, Math.floor(v));
      const fraction = v - index;
      return table[index] + (table[index + 1] - table[index]) * fraction;
    };

    const signedIntroIndex = (index) => (index <= Math.floor(half) ? index : index - count);

    const relativeOffset = (index) => {
      let offset = index - center;
      offset = ((offset + half) % count + count) % count - half;
      return offset;
    };

    function render(now) {
      const spacing = gallery.clientWidth * 0.1312;
      const elapsed = introActive ? now - introStart : introEnd;

      items.forEach((item, index) => {
        let offset = relativeOffset(index);
        let scale = interpolate(scaleTable, Math.abs(offset));
        let opacity = Math.abs(offset) <= 3.2 ? 1 : 0;
        let zIndex = 200 - Math.round(Math.abs(offset) * 20);
        let visible = opacity > 0;

        if (introActive) {
          if (index === 0) {
            const progress = easeOutCubic(clamp((elapsed - 140) / 1000, 0, 1));
            offset = 0;
            scale = 0.02 + 0.98 * progress;
            opacity = elapsed >= 80 ? 1 : 0;
            visible = opacity > 0;
            zIndex = 1000;
          } else {
            const target = signedIntroIndex(index);
            if (Math.abs(target) > 3) {
              opacity = 0;
              visible = false;
              offset = 0;
            } else {
              const order = (Math.abs(target) - 1) * 2 + (target > 0 ? 0 : 1);
              const startAt = introDelay + order * introStagger;
              const progress = easeOutCubic(clamp((elapsed - startAt) / introSpread, 0, 1));
              offset = target * progress;
              scale =
                0.22 +
                (interpolate(scaleTable, Math.abs(target)) - 0.22) * progress;
              opacity = elapsed >= startAt ? 1 : 0;
              visible = opacity > 0;
              zIndex = 200 - Math.round(Math.abs(offset) * 20);
            }
          }
        }

        const abs = Math.abs(offset);
        const sign = offset >= 0 ? 1 : -1;
        const x = sign * interpolate(xTable, abs) * gallery.clientWidth;
        const y = interpolate(sign > 0 ? yRight : yLeft, abs);
        const rotate = interpolate(sign > 0 ? rotRight : rotLeft, abs);

        item.style.transform = `translate(-50%, -50%) translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${scale.toFixed(4)}) rotate(${rotate.toFixed(2)}deg)`;
        item.style.opacity = String(opacity);
        item.style.zIndex = String(zIndex);
        item.style.pointerEvents = visible ? "auto" : "none";
        item.tabIndex = visible ? 0 : -1;
      });
    }

    function schedule() {
      if (rafId) return;
      rafId = window.requestAnimationFrame(tick);
    }

    function tick(now) {
      rafId = 0;
      if (!lastFrame) lastFrame = now;
      const frameStep = Math.min((now - lastFrame) / 16.667, 2.5);
      lastFrame = now;

      if (introActive) {
        if (now - introStart >= introEnd) {
          introActive = false;
          render(now);
        } else {
          render(now);
          schedule();
        }
        return;
      }

      if (!dragging) {
        center += velocity * frameStep;
        velocity *= Math.pow(0.94, frameStep);
        if (Math.abs(velocity) < 0.00004) velocity = 0;
      }

      render(now);
      if (Math.abs(velocity) > 0.00004) schedule();
    }

    function beginIntro() {
      if (introStarted) return;
      introStarted = true;
      introActive = true;
      introStart = performance.now();
      lastFrame = introStart;
      render(introStart);
      schedule();
    }

    const firstImage = $("img", items[0]);
    const startWhenReady = () => {
      if (!firstImage || (firstImage.complete && firstImage.naturalWidth)) {
        beginIntro();
        return;
      }
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        beginIntro();
      };
      firstImage.addEventListener("load", finish, { once: true });
      firstImage.addEventListener("error", finish, { once: true });
      window.setTimeout(finish, 1200);
    };

    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries, io) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          io.disconnect();
          startWhenReady();
        },
        { threshold: 0.32 }
      );
      observer.observe(gallery);
    } else {
      startWhenReady();
    }

    gallery.addEventListener("pointerdown", (event) => {
      if (!introStarted || introActive) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      dragging = true;
      lastX = event.clientX;
      dragDistance = 0;
      velocity = 0;
      suppressClick = false;
      gallery.classList.add("is-dragging");
    });

    gallery.addEventListener("pointermove", (event) => {
      if (!dragging) return;
      const spacing = gallery.clientWidth * 0.17;
      const deltaX = event.clientX - lastX;
      lastX = event.clientX;
      dragDistance += Math.abs(deltaX);
      center -= deltaX / spacing;
      velocity = clamp(-(deltaX / spacing) * 0.35, -0.25, 0.25);
      if (dragDistance > 4) suppressClick = true;
      render(performance.now());
    });

    const endDrag = () => {
      if (!dragging) return;
      dragging = false;
      gallery.classList.remove("is-dragging");
      schedule();
      window.setTimeout(() => {
        suppressClick = false;
      }, 90);
    };

    gallery.addEventListener("pointerup", endDrag);
    gallery.addEventListener("pointercancel", endDrag);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);

    gallery.addEventListener(
      "click",
      (event) => {
        if (!suppressClick) return;
        event.preventDefault();
        event.stopPropagation();
        suppressClick = false;
      },
      true
    );

    window.addEventListener("resize", () => {
      if (introStarted) render(performance.now());
    });
  }

  function initUiGalleryV2(gallery) {
    if (!gallery) return;

    const items = $$(".circular-gallery__item", gallery);
    if (items.length < 2) return;

    const count = items.length;
    const half = count / 2;

    const slots = {
      x: [35, 170, 340, 500, 650, 810, 955],
      y: [330, 390, 300, 250, 350, 390, 300],
      w: [130, 165, 175, 180, 175, 165, 130],
      scale: [0.85, 0.9, 0.95, 1, 0.95, 0.9, 0.85],
      rot: [-4, 2, -3, 0, 3, -2, 4],
      z: [2, 4, 3, 5, 3, 4, 2]
    };

    let center = 3;
    let velocity = 0;
    let dragging = false;
    let lastX = 0;
    let dragDistance = 0;
    let suppressClick = false;
    let lastFrame = 0;
    let rafId = 0;

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

    const sample = (key, offset) => {
      const table = slots[key];
      const positive = table.slice(3);
      const negative = [table[3], table[2], table[1], table[0]];
      const values = offset >= 0 ? positive : negative;
      const value = Math.abs(offset);
      if (value >= 3) return values[3];
      const index = Math.min(2, Math.floor(value));
      const fraction = value - index;
      return values[index] + (values[index + 1] - values[index]) * fraction;
    };

    const relativeOffset = (index) => {
      let offset = index - center;
      offset = ((offset + half) % count + count) % count - half;
      return offset;
    };

    function render() {
      const width = gallery.clientWidth;
      if (!width) return;
      const height = width * 0.5625;
      const unit = width / 1000;

      items.forEach((item, index) => {
        const offset = relativeOffset(index);
        const distance = Math.abs(offset);
        const visible = distance <= 3.05;
        const x = sample("x", offset) * unit;
        const y = sample("y", offset) * unit;
        const cardWidth = sample("w", offset) * unit;
        const scale = sample("scale", offset);
        const rotate = sample("rot", offset);
        const z = Math.round(sample("z", offset));

        item.style.width = `${cardWidth.toFixed(2)}px`;
        item.style.transform = `translate(-50%, -50%) translate3d(${(x - width / 2).toFixed(2)}px, ${(y - height / 2).toFixed(2)}px, 0) scale(${scale.toFixed(4)}) rotate(${rotate.toFixed(2)}deg)`;
        item.style.opacity = visible ? "1" : "0";
        item.style.zIndex = String(z);
        item.style.pointerEvents = visible ? "auto" : "none";
        item.tabIndex = visible ? 0 : -1;
      });
    }

    function schedule() {
      if (rafId) return;
      rafId = window.requestAnimationFrame(tick);
    }

    function tick(now) {
      rafId = 0;
      if (!lastFrame) lastFrame = now;
      const frameStep = Math.min((now - lastFrame) / 16.667, 2.5);
      lastFrame = now;

      if (!dragging) {
        center += velocity * frameStep;
        velocity *= Math.pow(0.94, frameStep);
        if (Math.abs(velocity) < 0.00004) velocity = 0;
      }

      render();
      if (Math.abs(velocity) > 0.00004) schedule();
    }

    gallery.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      dragging = true;
      lastX = event.clientX;
      dragDistance = 0;
      velocity = 0;
      suppressClick = false;
      gallery.classList.add("is-dragging");
    });

    gallery.addEventListener("pointermove", (event) => {
      if (!dragging) return;
      const unit = gallery.clientWidth / 1000;
      const deltaX = event.clientX - lastX;
      lastX = event.clientX;
      dragDistance += Math.abs(deltaX);
      const step = 165 * unit;
      center -= deltaX / step;
      velocity = clamp(-(deltaX / step) * 0.35, -0.25, 0.25);
      if (dragDistance > 4) suppressClick = true;
      render();
    });

    const endDrag = () => {
      if (!dragging) return;
      dragging = false;
      gallery.classList.remove("is-dragging");
      schedule();
      window.setTimeout(() => {
        suppressClick = false;
      }, 90);
    };

    gallery.addEventListener("pointerup", endDrag);
    gallery.addEventListener("pointercancel", endDrag);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);

    gallery.addEventListener(
      "click",
      (event) => {
        if (!suppressClick) return;
        event.preventDefault();
        event.stopPropagation();
        suppressClick = false;
      },
      true
    );

    window.addEventListener("resize", render);
    render();
  }

  function initUiShowcase(root) {
    if (!root) return;

    const stage = $(".ui-showcase__stage", root);
    const phone = $("[data-ui-phone]", root);
    const phoneImage = $("[data-ui-phone-image]", root);
    const cards = $$(".ui-fan__card", root);
    if (!stage || !phone || !phoneImage || cards.length < 2) return;

    const images = cards.map((card) => {
      const image = $("img", card);
      return { src: image.getAttribute("src"), alt: image.getAttribute("alt") || "" };
    });
    const count = cards.length;
    const half = count / 2;

    let metrics;
    let position = 0;
    let active = 0;
    let velocity = 0;
    let dragging = false;
    let lastX = 0;
    let dragDistance = 0;
    let suppressClick = false;
    let lastFrame = 0;
    let rafId = 0;
    let swapToken = 0;

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

    const sample = (values, rawValue) => {
      const value = clamp(rawValue, 0, 5);
      const index = Math.min(4, Math.floor(value));
      const fraction = value - index;
      return values[index] + (values[index + 1] - values[index]) * fraction;
    };

    function buildMetrics() {
      const phoneWidth = phone.offsetWidth || 300;
      const phoneGap = clamp(phoneWidth * 0.106, 30, 36);
      const cardGap = phoneGap;
      const widths = [0, phoneWidth * 0.6, phoneWidth * 0.52, phoneWidth * 0.45, phoneWidth * 0.39, phoneWidth * 0.34];
      widths[0] = widths[1];

      const xs = [0];
      const ys = [0];
      const rots = [0];
      const ops = [0];
      const zs = [1];
      const yScale = clamp(phoneWidth / 310, 0.58, 1.1);
      const ySlots = [0, -14, 22, 0, 0, 0];
      const rotSlots = [0, 0, 0, 0, 0, 0];
      const opacitySlots = [0, 1, 0.9, 0.85, 0, 0];
      const zSlots = [1, 90, 80, 70, 0, 0];

      xs[1] = phoneWidth / 2 + phoneGap + widths[1] / 2;
      for (let index = 1; index <= 5; index += 1) {
        if (index > 1) {
          xs[index] =
            xs[index - 1] +
            widths[index - 1] / 2 +
            cardGap +
            widths[index] / 2;
        }
        ys[index] = ySlots[index] * yScale;
        rots[index] = rotSlots[index];
        ops[index] = opacitySlots[index];
        zs[index] = zSlots[index];
      }

      return { phoneWidth, phoneGap, cardGap, widths, xs, ys, rots, ops, zs };
    }

    metrics = buildMetrics();

    function setActive(index) {
      if (index === active) return;
      active = index;
      const image = images[index];
      phone.dataset.galleryIndex = String(index);
      phone.setAttribute("aria-label", `查看当前 UI 作品：${cards[index].getAttribute("aria-label") || image.alt}`);
      phoneImage.alt = image.alt;
      phoneImage.classList.add("is-changing");
      const token = ++swapToken;
      phoneImage.src = image.src;
      window.setTimeout(() => {
        if (token === swapToken) phoneImage.classList.remove("is-changing");
      }, 120);
    }

    function render() {
      const width = stage.clientWidth;
      if (!width) return;
      const height = stage.clientHeight;
      const activeIndex = ((Math.round(position) % count) + count) % count;
      setActive(activeIndex);

      cards.forEach((card, index) => {
        let offset = index - position;
        offset = ((offset + half) % count + count) % count - half;
        const distance = Math.abs(offset);
        const visible = distance >= 0.52 && distance <= 3.2;

        if (!visible) {
          card.style.opacity = "0";
          card.style.pointerEvents = "none";
          card.tabIndex = -1;
          return;
        }

        const cardWidth = sample(metrics.widths, distance);
        const x = Math.sign(offset) * sample(metrics.xs, distance);
        const y = sample(metrics.ys, distance);
        const rotate = Math.sign(offset) * sample(metrics.rots, distance);
        const opacity = sample(metrics.ops, distance);
        const z = Math.round(sample(metrics.zs, distance));

        card.style.width = `${cardWidth.toFixed(2)}px`;
        card.style.transform = `translate(-50%, -50%) translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotate(${rotate.toFixed(2)}deg)`;
        card.style.opacity = String(opacity);
        card.style.zIndex = String(z);
        card.style.pointerEvents = "auto";
        card.tabIndex = 0;
      });
    }

    function schedule() {
      if (rafId) return;
      rafId = window.requestAnimationFrame(tick);
    }

    function tick(now) {
      rafId = 0;
      if (!lastFrame) lastFrame = now;
      const frameStep = Math.min((now - lastFrame) / 16.667, 2.5);
      lastFrame = now;

      if (!dragging) {
        position += velocity * frameStep;
        velocity *= Math.pow(0.94, frameStep);
        if (Math.abs(velocity) < 0.00004) velocity = 0;
      }

      render();
      if (Math.abs(velocity) > 0.00004) schedule();
    }

    stage.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      dragging = true;
      lastX = event.clientX;
      dragDistance = 0;
      velocity = 0;
      suppressClick = false;
      stage.classList.add("is-dragging");
    });

    stage.addEventListener("pointermove", (event) => {
      if (!dragging) return;
      const step = Math.max(120, metrics.phoneWidth * 0.62);
      const deltaX = event.clientX - lastX;
      lastX = event.clientX;
      dragDistance += Math.abs(deltaX);
      position -= deltaX / step;
      velocity = clamp(-(deltaX / step) * 0.32, -0.22, 0.22);
      if (dragDistance > 4) suppressClick = true;
      render();
    });

    const endDrag = () => {
      if (!dragging) return;
      dragging = false;
      stage.classList.remove("is-dragging");
      schedule();
      window.setTimeout(() => {
        suppressClick = false;
      }, 90);
    };

    stage.addEventListener("pointerup", endDrag);
    stage.addEventListener("pointercancel", endDrag);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);

    stage.addEventListener(
      "click",
      (event) => {
        if (!suppressClick) return;
        event.preventDefault();
        event.stopPropagation();
        suppressClick = false;
      },
      true
    );

    phone.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      phone.click();
    });

    window.addEventListener("resize", () => {
      metrics = buildMetrics();
      render();
    });

    render();
  }

  function initUiShowcases() {
    $$("[data-ui-showcase]").forEach(initUiShowcase);
  }

  function initClassroomStrip(gallery) {
    const viewport = $(".circular-gallery__viewport", gallery);
    const items = $$(".circular-gallery__item", gallery);
    if (!viewport || items.length < 2) return;

    // The reference composition leads with five portrait/square works; the
    // remaining landscape studies sit further along the same draggable row.
    const order = [7, 9, 8, 6, 4, 0, 1, 2, 3, 5];
    const ordered = order
      .map((index) => items[index])
      .filter(Boolean)
      .concat(items.filter((_, index) => !order.includes(index)));

    ordered.forEach((item, index) => {
      item.style.setProperty("--classroom-index", String(index));
      viewport.appendChild(item);
    });

    let offset = 0;
    let minOffset = 0;
    let maxOffset = 0;
    let velocity = 0;
    let dragging = false;
    let lastX = 0;
    let dragDistance = 0;
    let suppressClick = false;
    let lastFrame = 0;
    let rafId = 0;
    let introStarted = false;

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

    function measure() {
      const gap = parseFloat(getComputedStyle(viewport).columnGap) || 0;
      const widths = ordered.map((item) => item.getBoundingClientRect().width);
      const trackWidth = widths.reduce((sum, width) => sum + width, 0) + gap * (ordered.length - 1);
      const leadWidth =
        widths.slice(0, 5).reduce((sum, width) => sum + width, 0) + gap * 4;
      const stageWidth = gallery.clientWidth;
      const initial = stageWidth >= leadWidth ? (stageWidth - leadWidth) / 2 : 24;
      minOffset = Math.min(initial, stageWidth - trackWidth - 24);
      maxOffset = initial;
      return initial;
    }

    function applyOffset(value) {
      offset = clamp(value, minOffset, maxOffset);
      viewport.style.transform = `translate3d(${offset.toFixed(2)}px, -50%, 0)`;
    }

    function resetOffset() {
      const initial = measure();
      applyOffset(initial);
    }

    function schedule() {
      if (rafId) return;
      rafId = window.requestAnimationFrame(tick);
    }

    function tick(now) {
      rafId = 0;
      if (!lastFrame) lastFrame = now;
      const frameStep = Math.min((now - lastFrame) / 16.667, 2.5);
      lastFrame = now;

      if (!dragging && velocity) {
        applyOffset(offset + velocity * frameStep);
        velocity *= Math.pow(0.94, frameStep);
        if (Math.abs(velocity) < 0.00004) velocity = 0;
        if (offset <= minOffset || offset >= maxOffset) velocity = 0;
      }

      if (!dragging) scheduleIfNeeded();
    }

    function scheduleIfNeeded() {
      if (Math.abs(velocity) > 0.00004) schedule();
    }

    function reveal() {
      if (introStarted) return;
      introStarted = true;
      resetOffset();
      gallery.classList.add("is-revealed");
    }

    const firstItem = ordered[0];
    const firstImage = $("img", firstItem);
    const startWhenReady = () => {
      if (!firstImage || (firstImage.complete && firstImage.naturalWidth)) {
        window.requestAnimationFrame(() => window.requestAnimationFrame(reveal));
        return;
      }
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        window.requestAnimationFrame(() => window.requestAnimationFrame(reveal));
      };
      firstImage.addEventListener("load", finish, { once: true });
      firstImage.addEventListener("error", finish, { once: true });
      window.setTimeout(finish, 1200);
    };

    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries, io) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          io.disconnect();
          startWhenReady();
        },
        { threshold: 0.28 }
      );
      observer.observe(gallery);
    } else {
      startWhenReady();
    }

    gallery.addEventListener("pointerdown", (event) => {
      if (!introStarted) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      dragging = true;
      lastFrame = 0;
      lastX = event.clientX;
      dragDistance = 0;
      velocity = 0;
      suppressClick = false;
      gallery.classList.add("is-dragging");
    });

    gallery.addEventListener("pointermove", (event) => {
      if (!dragging) return;
      const deltaX = event.clientX - lastX;
      lastX = event.clientX;
      dragDistance += Math.abs(deltaX);
      velocity = clamp(deltaX * 0.35, -18, 18);
      applyOffset(offset + deltaX);
      if (dragDistance > 4) suppressClick = true;
    });

    const endDrag = () => {
      if (!dragging) return;
      dragging = false;
      gallery.classList.remove("is-dragging");
      schedule();
      window.setTimeout(() => {
        suppressClick = false;
      }, 90);
    };

    gallery.addEventListener("pointerup", endDrag);
    gallery.addEventListener("pointercancel", endDrag);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);

    gallery.addEventListener(
      "click",
      (event) => {
        if (!suppressClick) return;
        event.preventDefault();
        event.stopPropagation();
        suppressClick = false;
      },
      true
    );

    window.addEventListener("resize", resetOffset);

    window.requestAnimationFrame(() => {
      resetOffset();
      // Ensure the initial row is measured after the images establish width.
      window.requestAnimationFrame(resetOffset);
    });
  }

  function initOrbitGallery(gallery) {
    const viewport = $(".circular-gallery__viewport", gallery);
    const orbitPath = $(".circular-gallery__orbit-path", gallery);
    const items = $$(".circular-gallery__item", gallery);
    if (!viewport || !orbitPath || items.length < 2) return;

    const ORBIT_DURATION = 40;
    const ORBIT_TILT = (-8 * Math.PI) / 180;
    const DEPTH = 0.55;
    const HOVER_SPEED = 0.3;
    const INTRO_DURATION = 1.3;
    const cosTilt = Math.cos(ORBIT_TILT);
    const sinTilt = Math.sin(ORBIT_TILT);
    const stepAngle = (Math.PI * 2) / items.length;
    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    const wrap = (value) => value - Math.round(value);
    const easeOutQuint = (value) => 1 - Math.pow(1 - value, 5);

    let width = 0;
    let height = 0;
    let centerX = 0;
    let centerY = 0;
    let radiusX = 320;
    let radiusY = 110;
    let itemSize = 64;
    let angle = 0;
    let manualAngle = 0;
    let velocity = 0;
    let active = false;
    let visible = false;
    let introStart = 0;
    let introPending = false;
    let hoveredIndex = -1;
    let rafId = 0;
    let lastFrame = 0;
    let dragging = false;
    let dragPointerId = null;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragLastX = 0;
    let suppressClick = false;

    function measure() {
      const rect = gallery.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      centerX = width / 2;
      centerY = height / 2;
      itemSize = clamp(width * 0.112, 66, 142);
      radiusX = Math.max(130, Math.min(width * 0.42, 500));
      radiusY = Math.max(62, Math.min(130, height * 0.3));

      items.forEach((item) => {
        item.style.width = `${itemSize}px`;
        item.style.height = `${itemSize}px`;
      });
      orbitPath.style.width = `${radiusX * 2}px`;
      orbitPath.style.height = `${radiusY * 2}px`;
    }

    function render(now = performance.now()) {
      const introElapsed = introStart ? (now - introStart) / 1000 : Infinity;
      const introActive = introPending && introElapsed < INTRO_DURATION;
      const spread = introActive
        ? easeOutQuint(clamp(introElapsed / INTRO_DURATION, 0, 1))
        : 1;
      const appear = introActive ? clamp(introElapsed / 0.48, 0, 1) : 1;

      items.forEach((item, index) => {
        let itemAngle = angle + manualAngle + index * stepAngle;
        if (introActive) {
          itemAngle = Math.PI / 2 + wrap(itemAngle - Math.PI / 2) * spread;
        }

        const localX = Math.cos(itemAngle) * radiusX;
        const localY = Math.sin(itemAngle) * radiusY;
        const x = localX * cosTilt - localY * sinTilt;
        const y = localX * sinTilt + localY * cosTilt;
        const depth = clamp(y / Math.max(1, radiusY), -1, 1);
        const weight = (depth + 1) / 2;
        let scale = 1 + DEPTH * (0.35 * weight - 0.5 * (1 - weight));
        let opacity = 1 - DEPTH * 0.55 * (1 - weight);
        let zIndex = 20 + Math.round((depth + 1) * 50);

        if (index === hoveredIndex) {
          scale *= 1.08;
          opacity = 1;
          zIndex += 120;
        }

        if (introActive) {
          scale *= 0.7 + 0.3 * appear;
          opacity *= appear;
        }

        item.style.transform = `translate3d(${(centerX + x - itemSize / 2).toFixed(2)}px, ${(centerY + y - itemSize / 2).toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
        item.style.opacity = active ? opacity.toFixed(3) : "0";
        item.style.zIndex = String(zIndex);
      });
    }

    function schedule() {
      if (rafId || !visible || !active) return;
      rafId = window.requestAnimationFrame(tick);
    }

    function tick(now) {
      rafId = 0;
      if (!visible || document.hidden) return;

      const delta = lastFrame ? Math.min((now - lastFrame) / 1000, 0.05) : 1 / 60;
      lastFrame = now;
      const introElapsed = introStart ? (now - introStart) / 1000 : Infinity;
      const introRunning = introPending && introElapsed < INTRO_DURATION;

      if (!reduceMotion.matches && !dragging) {
        const speed = hoveredIndex >= 0 ? HOVER_SPEED : 1;
        angle += ((Math.PI * 2) / ORBIT_DURATION) * delta * speed;
      }

      if (!dragging && Math.abs(velocity) > 0.0004) {
        manualAngle += velocity * delta;
        velocity *= Math.exp(-delta / 0.62);
        if (Math.abs(velocity) < 0.0004) velocity = 0;
      }

      render(now);

      if (!reduceMotion.matches || introRunning || Math.abs(velocity) > 0.0004) {
        schedule();
      }
    }

    function activate() {
      if (active) return;
      active = true;
      visible = true;
      gallery.classList.add("is-active");
      if (reduceMotion.matches) {
        introPending = false;
      } else {
        introPending = true;
        introStart = performance.now();
      }
      measure();
      render(performance.now());
      schedule();
    }

    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[entries.length - 1];
          visible = entry.isIntersecting;
          if (visible) {
            if (!active) activate();
            else {
              lastFrame = 0;
              schedule();
            }
          } else if (rafId) {
            window.cancelAnimationFrame(rafId);
            rafId = 0;
          }
        },
        { threshold: 0.08, rootMargin: "160px 0px" }
      );
      observer.observe(gallery);
    } else {
      activate();
    }

    gallery.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      dragPointerId = event.pointerId;
      dragStartX = event.clientX;
      dragStartY = event.clientY;
      dragLastX = event.clientX;
      suppressClick = false;
      dragging = false;
    });

    gallery.addEventListener("pointermove", (event) => {
      if (event.pointerId !== dragPointerId) return;
      const deltaX = event.clientX - dragLastX;
      const totalX = event.clientX - dragStartX;
      const totalY = event.clientY - dragStartY;

      if (!dragging) {
        if (Math.abs(totalX) < 5) return;
        if (Math.abs(totalY) > Math.abs(totalX)) {
          dragPointerId = null;
          return;
        }
        dragging = true;
        suppressClick = true;
        gallery.classList.add("is-dragging");
        try {
          gallery.setPointerCapture(event.pointerId);
        } catch (_error) {
          // Pointer capture is a progressive enhancement.
        }
        dragLastX = event.clientX;
        return;
      }

      dragLastX = event.clientX;
      manualAngle += (deltaX / Math.max(180, radiusX)) * 1.35;
      velocity = clamp(deltaX * 0.014, -1.8, 1.8);
      render();
    });

    const endDrag = (event) => {
      if (event && dragPointerId !== null && event.pointerId !== dragPointerId) return;
      if (dragging) {
        gallery.classList.remove("is-dragging");
        if (!reduceMotion.matches) schedule();
      }
      dragging = false;
      dragPointerId = null;
      if (suppressClick) {
        window.setTimeout(() => {
          suppressClick = false;
        }, 350);
      }
    };

    gallery.addEventListener("pointerup", endDrag);
    gallery.addEventListener("pointercancel", endDrag);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);

    gallery.addEventListener(
      "click",
      (event) => {
        if (!suppressClick) return;
        event.preventDefault();
        event.stopPropagation();
        suppressClick = false;
      },
      true
    );

    gallery.addEventListener("pointerover", (event) => {
      const item = event.target.closest(".circular-gallery__item");
      if (!item || !gallery.contains(item)) return;
      const index = items.indexOf(item);
      if (index === hoveredIndex) return;
      hoveredIndex = index;
      render();
      schedule();
    });

    gallery.addEventListener("pointerleave", () => {
      if (hoveredIndex === -1) return;
      hoveredIndex = -1;
      render();
      schedule();
    });

    gallery.addEventListener("focusin", (event) => {
      const item = event.target.closest(".circular-gallery__item");
      if (item) {
        hoveredIndex = items.indexOf(item);
        render();
        schedule();
      }
    });

    gallery.addEventListener("focusout", () => {
      hoveredIndex = -1;
      render();
      schedule();
    });

    const onResize = () => {
      measure();
      render();
    };
    window.addEventListener("resize", onResize);

    measure();
    render();
  }

  function initCircularGallery() {
    $$("[data-circular-gallery]").forEach((gallery) => {
      if (gallery.classList.contains("circular-gallery--orbit")) initOrbitGallery(gallery);
      else initCircularGalleryOne(gallery);
    });
  }

  initUiShowcases();
  initCircularGallery();

  /* Deep links from the entry cover. The work chapters are rendered after
     first paint, so the browser cannot resolve these hashes by itself. */
  function scrollToInitialHash() {
    if (!window.location.hash) return;
    let target = null;
    try {
      target = document.querySelector(window.location.hash);
    } catch (_error) {
      return;
    }
    if (!target) return;
    window.setTimeout(() => {
      target.scrollIntoView({ block: "start", behavior: "instant" });
    }, 60);
  }

  scrollToInitialHash();
  window.addEventListener("load", () => window.setTimeout(scrollToInitialHash, 100), {
    once: true,
  });
  window.addEventListener("hashchange", scrollToInitialHash);

  /* Highlight the current folder in the sticky work index. */
  const workChapters = $$("[data-work-category]");
  const workTocLinks = $$("[data-work-toc]");
  if ("IntersectionObserver" in window && workChapters.length) {
    const chapterObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = entry.target.dataset.workCategory;
          workTocLinks.forEach((link) => {
            link.classList.toggle("is-active", link.dataset.workToc === id);
          });
          if (workToc && window.innerWidth <= 840) {
            const activeLink = workTocLinks.find((link) => link.dataset.workToc === id);
            if (activeLink) {
              const left =
                activeLink.offsetLeft -
                (workToc.clientWidth - activeLink.offsetWidth) / 2;
              workToc.scrollTo({
                left: Math.max(0, left),
                behavior: reduceMotion.matches ? "auto" : "smooth",
              });
            }
          }
        });
      },
      { rootMargin: "-24% 0px -62% 0px", threshold: 0 }
    );
    workChapters.forEach((chapter) => chapterObserver.observe(chapter));
  }

  /* ---------------------------------------------------------------------
     Back to the previous page
     --------------------------------------------------------------------- */
  $$("[data-back]").forEach((link) => {
    link.addEventListener("click", (event) => {
      if (
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        link.target === "_blank"
      ) {
        return;
      }

      if (!document.referrer || window.history.length <= 1) return;

      let samePage = false;
      try {
        samePage = new URL(document.referrer).pathname === window.location.pathname;
      } catch (_error) {
        samePage = false;
      }
      if (samePage) return;

      event.preventDefault();
      window.history.back();
    });
  });

  /* ---------------------------------------------------------------------
     Header + scroll progress
     --------------------------------------------------------------------- */
  const header = $(".site-header");
  const progress = $(".scroll-progress span");
  const navLinks = $$(".site-nav a");
  const sectionIds = ["about", "work", "approach", "contact"];
  const sections = sectionIds.map((id) => document.getElementById(id)).filter(Boolean);

  let scrollQueued = false;

  function setActiveNav() {
    const marker = window.innerHeight * 0.36;
    let current = "";
    for (const section of sections) {
      const rect = section.getBoundingClientRect();
      if (rect.top <= marker && rect.bottom > marker) {
        current = section.id;
        break;
      }
    }

    navLinks.forEach((link) => {
      const isActive = current && link.getAttribute("href") === `#${current}`;
      link.classList.toggle("is-active", Boolean(isActive));
      if (isActive) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  }

  function updateOnScroll() {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    if (header) header.classList.toggle("is-scrolled", scrollTop > 18);

    if (progress) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = max > 0 ? Math.min(Math.max(scrollTop / max, 0), 1) : 0;
      progress.style.width = `${(ratio * 100).toFixed(2)}%`;
    }

    setActiveNav();

    // When the visitor is above the first chapter, keep the horizontal work
    // index at its beginning instead of leaving it scrolled to a later folder.
    if (workToc && workChapters.length) {
      const firstChapterRect = workChapters[0].getBoundingClientRect();
      if (firstChapterRect.top > window.innerHeight * 0.55) {
        workToc.scrollLeft = 0;
        workTocLinks.forEach((link) => link.classList.remove("is-active"));
      }
    }

    scrollQueued = false;
  }

  window.addEventListener(
    "scroll",
    () => {
      if (scrollQueued) return;
      scrollQueued = true;
      window.requestAnimationFrame(updateOnScroll);
    },
    { passive: true }
  );
  window.addEventListener("resize", updateOnScroll, { passive: true });
  updateOnScroll();

  /* ---------------------------------------------------------------------
     Reveal-in-view
     --------------------------------------------------------------------- */
  const revealItems = $$("[data-reveal]");
  if ("IntersectionObserver" in window && !reduceMotion.matches) {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-inview");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -9% 0px", threshold: 0.06 }
    );
    revealItems.forEach((item) => revealObserver.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add("is-inview"));
  }

  /* ---------------------------------------------------------------------
     Mobile menu
     --------------------------------------------------------------------- */
  const menu = $("#site-menu");
  const menuToggle = $(".menu-toggle");
  const menuClose = $(".site-menu__close");
  const menuLinks = $$(".site-menu a");
  let menuOpen = false;
  let menuTrigger = null;

  const pageRegions = [$(".site-header"), $("#main"), $(".skip-link")].filter(Boolean);

  function getMenuFocusables() {
    if (!menu) return [];
    return $$('a[href], button:not([disabled])', menu).filter(
      (element) => element.getClientRects().length > 0
    );
  }

  function openMenu() {
    if (!menu || !menuToggle || menuOpen) return;
    menuOpen = true;
    menuTrigger = document.activeElement;
    menu.classList.add("is-open");
    menu.setAttribute("aria-hidden", "false");
    menuToggle.setAttribute("aria-expanded", "true");
    menuToggle.setAttribute("aria-label", "关闭导航菜单");
    body.classList.add("menu-open");
    pageRegions.forEach((region) => region.setAttribute("inert", ""));
    window.setTimeout(() => {
      if (menuClose) menuClose.focus();
      else getMenuFocusables()[0]?.focus();
    }, 40);
  }

  function closeMenu({ restoreFocus = true } = {}) {
    if (!menu || !menuToggle || !menuOpen) return;
    menuOpen = false;
    menu.classList.remove("is-open");
    menu.setAttribute("aria-hidden", "true");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "打开导航菜单");
    body.classList.remove("menu-open");
    pageRegions.forEach((region) => region.removeAttribute("inert"));
    if (restoreFocus && menuTrigger instanceof HTMLElement) menuTrigger.focus();
  }

  if (menu && menuToggle) {
    menuToggle.addEventListener("click", () => {
      if (menuOpen) closeMenu();
      else openMenu();
    });
    menuClose?.addEventListener("click", () => closeMenu());
    menuLinks.forEach((link) =>
      link.addEventListener("click", () => closeMenu({ restoreFocus: false }))
    );

    document.addEventListener("keydown", (event) => {
      if (!menuOpen) return;
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
        return;
      }
      if (event.key !== "Tab") return;
      const focusables = getMenuFocusables();
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 1080 && menuOpen) closeMenu({ restoreFocus: false });
    });
  }

  /* ---------------------------------------------------------------------
     Custom cursor
     --------------------------------------------------------------------- */
  const cursor = $(".cursor");
  if (cursor && finePointer.matches && !reduceMotion.matches) {
    let hasMoved = false;

    const moveCursor = (event) => {
      if (event.pointerType === "touch") return;
      if (!hasMoved) {
        hasMoved = true;
        body.classList.add("has-custom-cursor");
      }
      body.style.setProperty("--cursor-x", `${event.clientX}px`);
      body.style.setProperty("--cursor-y", `${event.clientY}px`);
    };

    window.addEventListener("pointermove", moveCursor, { passive: true });
    window.addEventListener("pointerdown", () => cursor.classList.add("is-pressed"));
    window.addEventListener("pointerup", () => cursor.classList.remove("is-pressed"));
    window.addEventListener("pointerleave", () => {
      body.classList.remove("has-custom-cursor");
      hasMoved = false;
    });

    document.addEventListener("pointerover", (event) => {
      if (event.pointerType === "touch") return;
      const target = event.target.closest?.('[data-cursor="view"]');
      cursor.classList.toggle("is-view", Boolean(target));
    });

    document.addEventListener("pointerout", (event) => {
      const from = event.target.closest?.('[data-cursor="view"]');
      const to = event.relatedTarget?.closest?.('[data-cursor="view"]');
      if (from && !to) cursor.classList.remove("is-view");
    });
  }

  /* ---------------------------------------------------------------------
     Dialog scroll locking
     --------------------------------------------------------------------- */
  function syncModalState() {
    body.classList.toggle(
      "modal-open",
      [...document.querySelectorAll("dialog")].some((dialog) => dialog.open)
    );
  }

  /* ---------------------------------------------------------------------
     Gallery dialog
     --------------------------------------------------------------------- */
  const galleryDialog = $("#gallery-dialog");
  const galleryImage = $("#gallery-image");
  const galleryProjectLabel = $("#gallery-project");
  const galleryCounter = $("#gallery-counter");
  const galleryCaptionTitle = $("#gallery-caption-title");
  const galleryCaptionMeta = $("#gallery-caption-meta");
  const galleryCaptionDetail = $("#gallery-caption-detail");
  const galleryPrev = $(".gallery-dialog__nav--prev");
  const galleryNext = $(".gallery-dialog__nav--next");
  const galleryClose = $(".gallery-dialog__close");

  let activeProject = null;
  let activeImageList = [];
  let activeImageIndex = 0;

  function updateGallery() {
    if (!activeProject || !activeImageList.length) return;
    const image = activeImageList[activeImageIndex];
    if (galleryImage) {
      galleryImage.src = image.src;
      galleryImage.alt = image.alt;
      galleryImage.width = image.width;
      galleryImage.height = image.height;
    }
    if (galleryProjectLabel) {
      galleryProjectLabel.textContent = `${activeProject.title} / ${activeProject.categoryTitle}`;
    }
    if (galleryCounter) {
      galleryCounter.textContent = `${String(activeImageIndex + 1).padStart(2, "0")} / ${String(
        activeImageList.length
      ).padStart(2, "0")}`;
    }
    if (galleryCaptionTitle) galleryCaptionTitle.textContent = image.title;
    if (galleryCaptionMeta) {
      galleryCaptionMeta.textContent = image.group
        ? `${image.group} · 点击左右按钮切换`
        : "点击左右按钮切换";
    }
    if (galleryCaptionDetail) {
      galleryCaptionDetail.textContent = `${activeProject.title} · ${image.alt}`;
    }
    if (galleryPrev) galleryPrev.disabled = activeImageList.length <= 1;
    if (galleryNext) galleryNext.disabled = activeImageList.length <= 1;
  }

  function openGallery(projectId, imageIndex, trigger) {
    const project = projectIndex.get(projectId);
    if (!project || !galleryDialog) return;
    activeProject = project;
    activeImageList = project.images;
    activeImageIndex = Number(imageIndex) || 0;
    if (galleryDialog.open) galleryDialog.close();
    if (trigger) trigger.setAttribute("data-gallery-open", "true");
    updateGallery();
    galleryDialog.showModal();
    syncModalState();
    galleryClose?.focus();
  }

  function moveGallery(amount) {
    if (!activeImageList.length) return;
    activeImageIndex =
      (activeImageIndex + amount + activeImageList.length) % activeImageList.length;
    updateGallery();
  }

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-gallery-project]");
    if (!trigger) return;
    openGallery(
      trigger.dataset.galleryProject,
      Number(trigger.dataset.galleryIndex),
      trigger
    );
  });

  galleryPrev?.addEventListener("click", () => moveGallery(-1));
  galleryNext?.addEventListener("click", () => moveGallery(1));
  galleryClose?.addEventListener("click", () => galleryDialog?.close());

  galleryDialog?.addEventListener("close", () => {
    syncModalState();
    if (galleryImage) {
      galleryImage.removeAttribute("src");
      galleryImage.alt = "";
    }
    const trigger = $('[data-gallery-open="true"]');
    if (trigger) {
      trigger.removeAttribute("data-gallery-open");
      trigger.focus({ preventScroll: true });
    }
  });

  galleryDialog?.addEventListener("click", (event) => {
    if (event.target === galleryDialog) galleryDialog.close();
  });

  document.addEventListener("keydown", (event) => {
    if (!galleryDialog?.open) return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveGallery(-1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      moveGallery(1);
    }
  });

  /* ---------------------------------------------------------------------
     Video dialog
     --------------------------------------------------------------------- */
  const videoDialog = $("#video-dialog");
  const videoPlayer = $("#video-player");
  const videoTitle = $("#video-title");
  const videoCategory = $("#video-category");
  const videoDescription = $("#video-description");
  const videoResolution = $("#video-resolution");
  const videoDuration = $("#video-duration");
  const videoSourceLink = $("#video-source-link");
  const videoClose = $(".video-dialog__close");
  let activeVideoTrigger = null;

  function openVideo(index, trigger) {
    const video = videoProjects[index];
    if (!video || !videoDialog || !videoPlayer) return;
    activeVideoTrigger = trigger || null;

    if (videoTitle) videoTitle.textContent = video.title;
    if (videoCategory) videoCategory.textContent = `VIDEO / ${video.category}`;
    if (videoDescription) videoDescription.textContent = video.description;
    if (videoResolution) videoResolution.textContent = video.resolution;
    if (videoDuration) videoDuration.textContent = video.duration;

    const source = encodeURI(video.src);
    videoPlayer.poster = video.poster;
    videoPlayer.src = source;
    if (videoSourceLink) videoSourceLink.href = source;

    if (!videoDialog.open) videoDialog.showModal();
    syncModalState();
    videoPlayer.load();
    const playAttempt = videoPlayer.play();
    if (playAttempt?.catch) playAttempt.catch(() => {});
    videoClose?.focus();
  }

  function resetVideo() {
    if (!videoPlayer) return;
    videoPlayer.pause();
    videoPlayer.removeAttribute("src");
    videoPlayer.removeAttribute("poster");
    videoPlayer.load();
    if (videoSourceLink) videoSourceLink.removeAttribute("href");
  }

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-video-index]");
    if (!trigger) return;
    openVideo(Number(trigger.dataset.videoIndex), trigger);
  });

  videoClose?.addEventListener("click", () => videoDialog?.close());
  videoDialog?.addEventListener("click", (event) => {
    if (event.target === videoDialog) videoDialog.close();
  });
  videoDialog?.addEventListener("close", () => {
    resetVideo();
    syncModalState();
    if (activeVideoTrigger) {
      activeVideoTrigger.focus({ preventScroll: true });
      activeVideoTrigger = null;
    }
  });

  /* ---------------------------------------------------------------------
     Software copyright certificates
     --------------------------------------------------------------------- */
  const certificateDialog = $("#certificate-dialog");
  const certificateImage = $("#certificate-image");
  const certificateTitle = $("#certificate-title");
  const certificateMeta = $("#certificate-meta");
  const certificateCounter = $("#certificate-counter");
  const certificateClose = $(".certificate-dialog__close");
  const certificatePrev = $(".certificate-dialog__nav--prev");
  const certificateNext = $(".certificate-dialog__nav--next");
  const certificateCards = $$("[data-certificate]");
  const certificates = certificateCards.map((card) => ({
    image: card.getAttribute("href"),
    title: card.dataset.certTitle || "",
    registration: card.dataset.certReg || "",
    date: card.dataset.certDate || "",
  }));
  let activeCertificateIndex = 0;
  let activeCertificateTrigger = null;

  function updateCertificate() {
    const certificate = certificates[activeCertificateIndex];
    if (!certificate) return;
    if (certificateImage) {
      certificateImage.src = certificate.image;
      certificateImage.alt = `${certificate.title} 计算机软件著作权登记证书`;
    }
    if (certificateTitle) certificateTitle.textContent = certificate.title;
    if (certificateMeta) {
      certificateMeta.textContent = `登记号 ${certificate.registration} · ${certificate.date}`;
    }
    if (certificateCounter) {
      certificateCounter.textContent = `${String(activeCertificateIndex + 1).padStart(
        2,
        "0"
      )} / ${String(certificates.length).padStart(2, "0")}`;
    }
  }

  function openCertificate(index, trigger) {
    if (!certificateDialog || !certificates.length) return;
    activeCertificateIndex =
      ((Number(index) || 0) % certificates.length + certificates.length) %
      certificates.length;
    activeCertificateTrigger = trigger || null;
    updateCertificate();
    if (!certificateDialog.open) certificateDialog.showModal();
    syncModalState();
    certificateClose?.focus();
  }

  function moveCertificate(amount) {
    if (!certificates.length) return;
    activeCertificateIndex =
      (activeCertificateIndex + amount + certificates.length) % certificates.length;
    updateCertificate();
  }

  certificateCards.forEach((card, index) => {
    card.addEventListener("click", (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      openCertificate(index, card);
    });
  });

  certificatePrev?.addEventListener("click", () => moveCertificate(-1));
  certificateNext?.addEventListener("click", () => moveCertificate(1));
  certificateClose?.addEventListener("click", () => certificateDialog?.close());

  certificateDialog?.addEventListener("click", (event) => {
    if (event.target === certificateDialog) certificateDialog.close();
  });

  certificateDialog?.addEventListener("close", () => {
    syncModalState();
    if (certificateImage) {
      certificateImage.removeAttribute("src");
      certificateImage.alt = "";
    }
    if (activeCertificateTrigger) {
      activeCertificateTrigger.focus({ preventScroll: true });
      activeCertificateTrigger = null;
    }
  });

  document.addEventListener("keydown", (event) => {
    if (!certificateDialog?.open) return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveCertificate(-1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      moveCertificate(1);
    }
  });

  /* ---------------------------------------------------------------------
     Copy email
     --------------------------------------------------------------------- */
  function fallbackCopy(text) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";
    document.body.appendChild(textarea);
    textarea.select();
    let succeeded = false;
    try {
      succeeded = document.execCommand("copy");
    } catch (_error) {
      succeeded = false;
    }
    textarea.remove();
    return succeeded;
  }

  $$(".copy-button").forEach((button) => {
    const original = button.querySelector(".copy-button__label")?.textContent || "复制邮箱";
    const label = button.querySelector(".copy-button__label");
    const feedback = button.querySelector(".copy-feedback");
    let resetTimer;

    button.addEventListener("click", async () => {
      const text = button.dataset.copy || "";
      let copied = false;
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text);
          copied = true;
        } else {
          copied = fallbackCopy(text);
        }
      } catch (_error) {
        copied = fallbackCopy(text);
      }

      if (copied) {
        if (label) label.textContent = "已复制";
        if (feedback) feedback.textContent = "COPIED";
        showToast("邮箱地址已复制");
      } else {
        if (feedback) feedback.textContent = "请手动选择";
        showToast("未能自动复制，请手动选择邮箱地址");
      }

      window.clearTimeout(resetTimer);
      resetTimer = window.setTimeout(() => {
        if (label) label.textContent = original;
        if (feedback) feedback.textContent = "";
      }, 1900);
    });
  });

  /* ---------------------------------------------------------------------
     Reference-style contact form
     --------------------------------------------------------------------- */
  const contactForm = $("[data-contact-form]");
  const contactToast = $("[data-contact-toast]");

  if (contactForm) {
    let toastTimer;

    const hideContactToast = () => {
      if (!contactToast) return;
      contactToast.classList.remove("is-visible");
      window.setTimeout(() => {
        if (!contactToast.classList.contains("is-visible")) {
          contactToast.hidden = true;
        }
      }, 280);
    };

    const showContactToast = () => {
      if (!contactToast) return;
      window.clearTimeout(toastTimer);
      contactToast.hidden = false;
      window.requestAnimationFrame(() => {
        contactToast.classList.add("is-visible");
      });
      toastTimer = window.setTimeout(hideContactToast, 6500);
    };

    contactForm.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!contactForm.reportValidity()) return;

      const formData = new FormData(contactForm);
      const name = String(formData.get("name") || "").trim();
      const contact = String(formData.get("contact") || "").trim();
      const message = String(formData.get("message") || "").trim();

      const subject = `作品集联系｜${name}`;
      const body = [
        `称呼：${name}`,
        `联系方式：${contact}`,
        "",
        message,
      ].join("\n");

      const composeParams = new URLSearchParams({
        to: "3256654392@qq.com",
        subject,
        body,
      });
      const composeUrl = `https://outlook.live.com/mail/0/deeplink/compose?${composeParams.toString()}`;
      const composeLink = contactToast?.querySelector(".contact-toast__link");
      if (composeLink) composeLink.href = composeUrl;

      // Open the webmail composer synchronously while this is still a user gesture.
      window.open(composeUrl, "_blank", "noopener,noreferrer");
      showContactToast();
      contactForm.reset();
    });

    contactToast?.querySelector("[data-contact-toast-close]")?.addEventListener("click", hideContactToast);
  }

  /* ---------------------------------------------------------------------
     Local time
     --------------------------------------------------------------------- */
  const timeElement = $("#dg-time");
  function updateClock() {
    if (!timeElement) return;
    try {
      const value = new Intl.DateTimeFormat("zh-CN", {
        timeZone: "Asia/Shanghai",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date());
      timeElement.textContent = `${value} CST`;
    } catch (_error) {
      timeElement.textContent = "";
    }
  }
  updateClock();
  window.setInterval(updateClock, 30_000);

  /* ---------------------------------------------------------------------
     Tiny niceties
     --------------------------------------------------------------------- */
  $$('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", () => {
      if (galleryDialog?.open) galleryDialog.close();
      if (videoDialog?.open) videoDialog.close();
      if (menuOpen) closeMenu({ restoreFocus: false });
    });
  });

  // The archive changes the page height. Recalculate the progress line once
  // everything has rendered and once the fonts are ready.
  window.requestAnimationFrame(updateOnScroll);
  if (document.fonts?.ready) {
    document.fonts.ready.then(updateOnScroll).catch(() => {});
  }
})();
