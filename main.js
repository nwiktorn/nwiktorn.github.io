(function () {
    const root = document.documentElement;
    const toggle = document.getElementById("themeToggle");
    const contextCursor = document.getElementById("contextCursor");
    const dotField = document.getElementById("dotField");
    const savedTheme = localStorage.getItem("portfolio-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialTheme = savedTheme || (prefersDark ? "dark" : "light");

    root.setAttribute("data-theme", initialTheme);

    toggle.addEventListener("click", function () {
      const nextTheme = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", nextTheme);
      localStorage.setItem("portfolio-theme", nextTheme);
    });

    function syncScrollBackground() {
      const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      const progress = Math.min(window.scrollY / maxScroll, 1);
      root.style.setProperty("--scroll-progress", progress.toFixed(4));
    }

    syncScrollBackground();
    window.addEventListener("scroll", syncScrollBackground, { passive: true });

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = window.matchMedia("(pointer: fine)");
    const headingStates = [];
    const typewriterStates = new WeakMap();
    const dotState = {
      width: 0,
      height: 0,
      dpr: 1,
      pointerX: window.innerWidth * 0.5,
      pointerY: window.innerHeight * 0.5,
      targetX: window.innerWidth * 0.5,
      targetY: window.innerHeight * 0.5,
      phase: 0,
      raf: null
    };

    function resizeDotField() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      dotState.width = window.innerWidth;
      dotState.height = window.innerHeight;
      dotState.dpr = dpr;
      dotField.width = Math.round(dotState.width * dpr);
      dotField.height = Math.round(dotState.height * dpr);
      dotField.style.width = dotState.width + "px";
      dotField.style.height = dotState.height + "px";
    }

    function drawDotField(time) {
      if (!dotField) {
        return;
      }

      const isDark = root.dataset.theme === "dark";
      const isLight = root.dataset.theme === "light";
      const shouldAnimate = finePointer.matches && !reduceMotion.matches;
      const ctx = dotField.getContext("2d");

      if (!ctx) {
        return;
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, dotField.width, dotField.height);

      if (!isDark && !isLight) {
        dotState.raf = requestAnimationFrame(drawDotField);
        return;
      }

      ctx.setTransform(dotState.dpr, 0, 0, dotState.dpr, 0, 0);

      dotState.pointerX += (dotState.targetX - dotState.pointerX) * 0.12;
      dotState.pointerY += (dotState.targetY - dotState.pointerY) * 0.12;
      dotState.phase = time * 0.0012;

      const spacing = 36;
      const baseRadius = 1.05;
      const influenceRadius = 520;
      const rippleRadius = 800;
      const dotColor = isDark ? "255, 255, 255" : "10, 10, 10";
      const maxAlpha = isDark ? 0.35 : 0.45;
      const baseAlpha = isDark ? 0.12 : 0.18;

      for (let y = 18; y <= dotState.height + spacing; y += spacing) {
        for (let x = 18; x <= dotState.width + spacing; x += spacing) {
          const dx = x - dotState.pointerX;
          const dy = y - dotState.pointerY;
          const distance = Math.hypot(dx, dy);
          const nx = distance > 0 ? dx / distance : 0;
          const ny = distance > 0 ? dy / distance : 0;
          const driftX = Math.sin((y * 0.016) + (dotState.phase * 0.72)) * 0.35;
          const driftY = Math.cos((x * 0.015) + (dotState.phase * 0.62)) * 0.35;

          let offsetX = driftX;
          let offsetY = driftY;
          
          // Subtle global breathing effect
          const pulse = Math.sin((time * 0.001) + (x * 0.005) + (y * 0.005));
          let radius = baseRadius + (pulse * 0.25);
          let alpha = baseAlpha + (pulse * 0.04);

          if (shouldAnimate && distance < rippleRadius) {
            const falloff = 1 - (distance / rippleRadius);
            const ripple = Math.sin((distance * 0.012) - (time * 0.0052)) * falloff * 4.2;
            const pull = Math.max(0, 1 - (distance / influenceRadius));
            offsetX += (nx * ripple) - (nx * pull * 3.2);
            offsetY += (ny * ripple) - (ny * pull * 3.2);
            radius += (pull * 0.32) + (falloff * 0.12);
            alpha += (pull * 0.12) + (falloff * 0.04);
          }

          ctx.beginPath();
          ctx.arc(x + offsetX, y + offsetY, radius, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(" + dotColor + ", " + Math.min(alpha, maxAlpha).toFixed(3) + ")";
          ctx.fill();
        }
      }

      dotState.raf = requestAnimationFrame(drawDotField);
    }

    resizeDotField();
    dotState.raf = requestAnimationFrame(drawDotField);
    window.addEventListener("resize", resizeDotField);

    function setupTypewriter(heading) {
      if (!heading || typewriterStates.has(heading)) {
        return;
      }

      const content = document.createElement("span");
      content.className = "typewriter-text";
      Array.from(heading.childNodes).forEach(function (node) {
        content.appendChild(node.cloneNode(true));
      });

      const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT);
      const textNodes = [];
      let totalChars = 0;
      let currentNode = walker.nextNode();

      while (currentNode) {
        const fullText = currentNode.nodeValue || "";
        textNodes.push({ node: currentNode, fullText: fullText });
        totalChars += fullText.length;
        currentNode.nodeValue = "";
        currentNode = walker.nextNode();
      }

      heading.setAttribute("aria-label", heading.textContent.trim());
      heading.replaceChildren(content);

      typewriterStates.set(heading, {
        content: content,
        textNodes: textNodes,
        totalChars: totalChars,
        played: false
      });
    }

    function renderTypewriter(state, charsVisible) {
      let remaining = charsVisible;

      state.textNodes.forEach(function (item) {
        const count = Math.max(0, Math.min(item.fullText.length, remaining));
        item.node.nodeValue = item.fullText.slice(0, count);
        remaining -= count;
      });
    }

    function startTypewriter(heading) {
      const state = typewriterStates.get(heading);
      if (!state || state.played) {
        return;
      }

      state.played = true;

      if (reduceMotion.matches) {
        renderTypewriter(state, state.totalChars);
        return;
      }

      const duration = Math.min(Math.max(state.totalChars * 26, 700), 1900);
      const start = performance.now();

      function step(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 2);
        const charsVisible = Math.round(state.totalChars * eased);
        renderTypewriter(state, charsVisible);

        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          renderTypewriter(state, state.totalChars);
        }
      }

      requestAnimationFrame(step);
    }

    document.querySelectorAll(".typewriter-heading").forEach(setupTypewriter);

    if (finePointer.matches && !reduceMotion.matches) {
      let activeCursorHost = null;
      const sectionHeadings = document.querySelectorAll(".section-intro h2, .section-intro p.gradient-copy, .timeline-copy h3.gradient-copy, .timeline-meta .gradient-copy, .timeline-copy .company.gradient-copy, .timeline-copy li.gradient-copy");

      sectionHeadings.forEach(function (heading) {
        headingStates.push({
          element: heading,
          currentX: 50,
          currentY: 50,
          currentWaveX: 50,
          currentWaveY: 50,
          currentActive: 0,
          targetX: 50,
          targetY: 50,
          targetWaveX: 50,
          targetWaveY: 50,
          targetActive: 0
        });
      });

      function syncHeadingGradients(clientX, clientY) {
        headingStates.forEach(function (state) {
          const heading = state.element;
          const rect = heading.getBoundingClientRect();
          const rawX = ((clientX - rect.left) / rect.width) * 100;
          const rawY = ((clientY - rect.top) / rect.height) * 100;
          const x = Math.max(10, Math.min(90, rawX));
          const y = Math.max(12, Math.min(88, rawY));
          const waveX = 50 + ((x - 50) * 0.32);
          const waveY = 50 + ((y - 50) * 0.32);
          const nearestX = Math.max(rect.left, Math.min(clientX, rect.right));
          const nearestY = Math.max(rect.top, Math.min(clientY, rect.bottom));
          const distance = Math.hypot(clientX - nearestX, clientY - nearestY);
          const active = Math.pow(Math.max(0, 1 - (distance / 240)), 1.8);

          if (active > 0.002) {
            state.targetX = x;
            state.targetY = y;
            state.targetWaveX = waveX;
            state.targetWaveY = waveY;
          } else {
            state.targetX = 50;
            state.targetY = 50;
            state.targetWaveX = 50;
            state.targetWaveY = 50;
          }

          state.targetActive = active;
        });
      }

      function animateHeadingGradients() {
        headingStates.forEach(function (state) {
          state.currentX += (state.targetX - state.currentX) * 0.14;
          state.currentY += (state.targetY - state.currentY) * 0.14;
          state.currentWaveX += (state.targetWaveX - state.currentWaveX) * 0.12;
          state.currentWaveY += (state.targetWaveY - state.currentWaveY) * 0.12;
          state.currentActive += (state.targetActive - state.currentActive) * 0.09;

          state.element.style.setProperty("--heading-x", state.currentX.toFixed(2) + "%");
          state.element.style.setProperty("--heading-y", state.currentY.toFixed(2) + "%");
          state.element.style.setProperty("--heading-wave-x", state.currentWaveX.toFixed(2) + "%");
          state.element.style.setProperty("--heading-wave-y", state.currentWaveY.toFixed(2) + "%");
          state.element.style.setProperty("--heading-active", state.currentActive.toFixed(3));
        });

        requestAnimationFrame(animateHeadingGradients);
      }

      document.addEventListener("pointermove", function (event) {
        contextCursor.style.left = event.clientX + "px";
        contextCursor.style.top = event.clientY + "px";
        dotState.targetX = event.clientX;
        dotState.targetY = event.clientY;
        syncHeadingGradients(event.clientX, event.clientY);
      }, { passive: true });

      document.querySelectorAll("[data-cursor]").forEach(function (element) {
        element.addEventListener("pointerenter", function () {
          activeCursorHost = element;
          document.body.classList.add("has-context-cursor");
          contextCursor.textContent = element.getAttribute("data-cursor");
          contextCursor.classList.toggle("is-nav-offset", element.getAttribute("data-cursor-offset") === "nav");
          contextCursor.classList.add("is-visible");
        });

        element.addEventListener("pointerdown", function () {
          if (activeCursorHost !== element) {
            return;
          }

          contextCursor.classList.remove("is-clicked");
          void contextCursor.offsetWidth;
          contextCursor.classList.add("is-clicked");
        });

        element.addEventListener("pointerleave", function () {
          if (activeCursorHost === element) {
            contextCursor.classList.remove("is-visible");
            contextCursor.classList.remove("is-clicked");
            contextCursor.classList.remove("is-nav-offset");
            document.body.classList.remove("has-context-cursor");
            activeCursorHost = null;
          }
        });
      });

      syncHeadingGradients(window.innerWidth * 0.5, window.innerHeight * 0.5);
      requestAnimationFrame(animateHeadingGradients);
    }

    const projects = document.querySelectorAll("[data-project]");
    projects.forEach(function (project) {
      const button = project.querySelector(".project-toggle");
      const panelId = button.getAttribute("aria-controls");
      const panel = document.getElementById(panelId);
      const panelInner = panel.querySelector(".project-panel-inner");

      function closePanel(targetProject, targetButton, targetPanel) {
        targetButton.setAttribute("aria-expanded", "false");
        targetButton.setAttribute("data-cursor", "Open");
        targetProject.removeAttribute("open");
        targetPanel.style.maxHeight = targetPanel.scrollHeight + "px";

        requestAnimationFrame(function () {
          targetPanel.classList.remove("is-open");
          targetPanel.style.maxHeight = "0px";
        });

        window.setTimeout(function () {
          if (!targetPanel.classList.contains("is-open")) {
            targetPanel.hidden = true;
            targetPanel.style.maxHeight = "";
          }
        }, 320);
      }



      button.addEventListener("click", function () {
        const expanded = button.getAttribute("aria-expanded") === "true";

        projects.forEach(function (item) {
          const itemButton = item.querySelector(".project-toggle");
          const itemPanel = document.getElementById(itemButton.getAttribute("aria-controls"));
          if (itemPanel === panel && expanded) {
            return;
          }

          if (itemButton.getAttribute("aria-expanded") === "true") {
            closePanel(item, itemButton, itemPanel);
          } else {
            itemButton.setAttribute("aria-expanded", "false");
            itemButton.setAttribute("data-cursor", "Open");
            item.removeAttribute("open");
            itemPanel.classList.remove("is-open");
            itemPanel.hidden = true;
            itemPanel.style.maxHeight = "";
          }
        });

        if (!expanded) {
          button.setAttribute("aria-expanded", "true");
          button.setAttribute("data-cursor", "Close");
          panel.hidden = false;
          project.setAttribute("open", "");
          panel.style.maxHeight = "0px";

          requestAnimationFrame(function () {
            panel.classList.add("is-open");
            panel.style.maxHeight = panelInner.offsetHeight + 8 + "px";
          });
        } else {
          closePanel(project, button, panel);
        }
      });
    });

    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          entry.target.querySelectorAll(".typewriter-heading").forEach(startTypewriter);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    document.querySelectorAll(".reveal").forEach(function (element) {
      observer.observe(element);
    });
  
    // Back to top logic
    const backToTop = document.getElementById("backToTop");
    if (backToTop) {
      window.addEventListener("scroll", function() {
        if (window.scrollY > window.innerHeight / 2) {
          backToTop.classList.add("is-visible");
        } else {
          backToTop.classList.remove("is-visible");
        }
      }, { passive: true });

      backToTop.addEventListener("click", function() {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }


    // Mobile hamburger menu
    const navToggle = document.getElementById("navToggle");
    const mobileMenu = document.getElementById("mobileMenu");

    if (navToggle && mobileMenu) {
      navToggle.addEventListener("click", function () {
        const expanded = navToggle.getAttribute("aria-expanded") === "true";
        navToggle.setAttribute("aria-expanded", String(!expanded));
        mobileMenu.setAttribute("aria-hidden", String(expanded));
        mobileMenu.classList.toggle("is-open", !expanded);
        document.body.classList.toggle("menu-open", !expanded);
      });

      mobileMenu.querySelectorAll("a").forEach(function (link) {
        link.addEventListener("click", function () {
          navToggle.setAttribute("aria-expanded", "false");
          mobileMenu.setAttribute("aria-hidden", "true");
          mobileMenu.classList.remove("is-open");
          document.body.classList.remove("menu-open");
        });
      });
    }


    // ===== BRAND TEXT SCRAMBLE ON HOVER =====
    const brandName = document.querySelector(".brand-name");
    if (brandName && finePointer.matches) {
      const originalBrandText = brandName.textContent;
      const scrambleChars = "!<>-_\\/[]{}=+*^?#ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let brandScrambleRaf = null;

      function runScramble(element, finalText, duration) {
        const start = performance.now();
        cancelAnimationFrame(brandScrambleRaf);

        function step(now) {
          const progress = Math.min((now - start) / duration, 1);
          const revealCount = Math.floor(progress * finalText.length);
          let out = "";

          for (let i = 0; i < finalText.length; i++) {
            if (finalText[i] === " ") {
              out += " ";
            } else if (i < revealCount) {
              out += finalText[i];
            } else {
              out += scrambleChars[Math.floor(Math.random() * scrambleChars.length)];
            }
          }

          element.textContent = out;
          if (progress < 1) {
            brandScrambleRaf = requestAnimationFrame(step);
          } else {
            element.textContent = finalText;
          }
        }

        brandScrambleRaf = requestAnimationFrame(step);
      }

      const brandEl = document.querySelector(".brand");
      if (brandEl) {
        brandEl.addEventListener("pointerenter", function () {
          if (!reduceMotion.matches) {
            runScramble(brandName, originalBrandText, 540);
          }
        });
      }
    }

    // ===== STAT COUNTERS & TEXT SCRAMBLE =====
    const statEls = document.querySelectorAll(".stat strong");
    const statScrambleChars = "!<>-_\\/[]{}=+*^#0123456789ABCDEFGHIJKLMNOPQRST";

    statEls.forEach(function (el) {
      const raw = el.textContent.trim();
      const numMatch = raw.match(/^(\d+)(\+?)$/);
      if (numMatch) {
        el.dataset.counterTarget = numMatch[1];
        el.dataset.counterSuffix = numMatch[2] || "";
        el.dataset.counterDone = "false";
        el.textContent = "0" + (numMatch[2] || "");
      } else {
        el.dataset.typewriterDone = "false";
        el.style.opacity = "0";
      }
    });

    function animateStatCounter(el, target, suffix, duration) {
      const start = performance.now();
      function step(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(eased * target) + suffix;
        if (progress < 1) { requestAnimationFrame(step); }
      }
      requestAnimationFrame(step);
    }

    function animateStatTypewriter(el, finalText, duration) {
      const start = performance.now();
      function step(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 2);
        const revealCount = Math.floor(eased * finalText.length);
        el.textContent = finalText.slice(0, revealCount);
        if (progress < 1) { requestAnimationFrame(step); }
        else { el.textContent = finalText; }
      }
      requestAnimationFrame(step);
    }

    const statObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) { return; }
        const el = entry.target;

        if (el.dataset.counterDone === "false") {
          el.dataset.counterDone = "true";
          if (!reduceMotion.matches) {
            animateStatCounter(el, parseInt(el.dataset.counterTarget), el.dataset.counterSuffix, 1400);
          } else {
            el.textContent = el.dataset.counterTarget + el.dataset.counterSuffix;
          }
          statObserver.unobserve(el);
        }

        if (el.dataset.typewriterDone === "false") {
          el.dataset.typewriterDone = "true";
          if (!reduceMotion.matches) {
            el.classList.add("stat-slide-up");
          } else {
            el.style.opacity = "1";
          }
          statObserver.unobserve(el);
        }
      });
    }, { threshold: 0.5 });

    statEls.forEach(function (el) {
      if (el.dataset.counterDone === "false" || el.dataset.typewriterDone === "false") {
        statObserver.observe(el);
      }
    });





    // ===== CONTACT FORM HANDLING (Formspree + AJAX) =====
    const contactForm = document.getElementById("contact-form");
    const contactStatus = document.getElementById("contact-status");

    if (contactForm) {
      contactForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        const data = new FormData(event.target);
        const submitBtn = contactForm.querySelector(".submit-btn");
        const originalBtnText = submitBtn.textContent;

        // Loading state
        submitBtn.disabled = true;
        submitBtn.textContent = "Sending...";
        contactStatus.textContent = "";
        contactStatus.className = "form-status";

        try {
          const response = await fetch(event.target.action, {
            method: contactForm.method,
            body: data,
            headers: { 'Accept': 'application/json' }
          });

          if (response.ok) {
            contactStatus.textContent = "Thanks! Your message has been sent successfully.";
            contactStatus.classList.add("success");
            contactForm.reset();
          } else {
            const result = await response.json();
            if (result.errors) {
              contactStatus.textContent = result.errors.map(error => error.message).join(", ");
            } else {
              contactStatus.textContent = "Oops! There was a problem submitting your form.";
            }
            contactStatus.classList.add("error");
          }
        } catch (error) {
          contactStatus.textContent = "Oops! There was a problem submitting your form.";
          contactStatus.classList.add("error");
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = originalBtnText;
        }
      });
    }

})();