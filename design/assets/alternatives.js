(() => {
  "use strict";

  const motionButton = document.querySelector(".motion-toggle");
  if (motionButton) {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let paused = reducedMotion.matches;
    const updateMotion = () => {
      document.body.classList.toggle("orbits-paused", paused);
      motionButton.setAttribute("aria-pressed", String(paused));
      motionButton.textContent = paused ? "Orbits paused · Play" : "Pause orbits Ⅱ";
      // Motion preference stays authoritative, even if the browser setting changes.
      if (reducedMotion.matches) {
        motionButton.textContent = "Motion reduced";
        motionButton.disabled = true;
      } else {
        motionButton.disabled = false;
      }
    };
    motionButton.addEventListener("click", () => { paused = !paused; updateMotion(); });
    reducedMotion.addEventListener("change", () => { paused = reducedMotion.matches; updateMotion(); });
    updateMotion();
  }

  const remixButton = document.querySelector(".remix-button");
  if (remixButton) {
    const suns = [...document.querySelectorAll(".toy-sun")];
    const orbits = [...document.querySelectorAll(".scribble-orbit")];
    const announcement = document.querySelector(".remix-announcement");
    // Original arrangements in an imaginary system, not a physical simulation.
    const arrangements = [
      [[0, 0], [0, 0], [0, 0]],
      [[144, 4], [-146, 58], [77, -28]],
      [[92, 126], [-5, -73], [-46, -111]],
      [[-3, 87], [-33, 67], [83, -162]],
    ];
    let current = 0;
    remixButton.addEventListener("click", () => {
      current = (current + 1) % arrangements.length;
      suns.forEach((sun, i) => {
        const [x, y] = arrangements[current][i];
        sun.style.transform = `translate(${x}px, ${y}px)`;
      });
      orbits.forEach((orbit, i) => {
        orbit.style.transform = `rotate(${current * (i + 1) * 19}deg)`;
      });
      announcement.textContent = `Imaginary solar system rearranged. Arrangement ${current + 1} of ${arrangements.length}.`;
    });
  }

  const dial = document.querySelector("#signal-dial");
  if (dial) {
    const reading = document.querySelector("#signal-reading");
    const wave = document.querySelector(".wave-path");
    const message = document.querySelector(".transmission-text");
    const updateRadio = () => {
      const value = Number(dial.value);
      reading.textContent = `${value}%`;
      const noise = (100 - value) / 100;
      const points = [];
      for (let x = 0; x <= 400; x += 2) {
        const clean = Math.sin(x / 23) * 29;
        const staticNoise = (Math.sin(x * 1.3) * 13 + Math.sin(x * .57) * 18 + Math.sin(x * .13) * 9) * noise;
        const y = 75 + clean + staticNoise;
        points.push(`${x === 0 ? "M" : "L"}${x},${y.toFixed(2)}`);
      }
      wave.setAttribute("d", points.join(" "));
      if (value >= 80) message.textContent = "Signal received. Hello, fellow curious human.";
      else if (value >= 45) message.textContent = "Getting clearer. There’s someone out there.";
      else message.textContent = "A little static. A lot of curiosity.";
    };
    dial.addEventListener("input", updateRadio);
    updateRadio();
  }
})();
