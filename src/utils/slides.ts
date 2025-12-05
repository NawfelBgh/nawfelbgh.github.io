(() => {
  const presentationElementSelector = "[data-presentation-wrapper=true]";
  const presentationElement: HTMLElement = document.querySelector(
    presentationElementSelector
  )!;
  if (!presentationElement) {
    console.error(`${presentationElementSelector} not found`);
    return;
  }
  const slides = Array.from(document.querySelectorAll(".slide"));
  let currentSlideIndex = 0;

  function nextSlide() {
    const index = currentSlideIndex + 1;
    const slide = slides[index];
    if (slide) {
      currentSlideIndex = index;
      presentationElement.innerHTML = slide.outerHTML;
    }
  }

  function previousSlide() {
    const index = currentSlideIndex - 1;
    const slide = slides[index];
    if (slide) {
      currentSlideIndex = index;
      presentationElement.innerHTML = slide.outerHTML;
    }
  }

  // Handle mouse wheel
  let wheelLock = 0;
  presentationElement.addEventListener("wheel", (event) => {
    if (wheelLock) {
      return;
    }
    wheelLock = 1;
    setTimeout(() => {
      wheelLock = 0;
    }, 250);
    if (event.deltaY >= 0) {
      nextSlide();
    } else {
      previousSlide();
    }
  });
  // Handle arrow keys
  presentationElement.addEventListener("keydown", (event) => {
    switch (event.key) {
      case "ArrowDown":
        nextSlide();
        break;
      case "ArrowUp":
        previousSlide();
        break;
      case "ArrowLeft":
        previousSlide();
        break;
      case "ArrowRight":
        nextSlide();
        break;
    }
  });
  // Handle mobile swipes
  let touchStartX = 0;
  let touchEndX = 0;
  let touchStartY = 0;
  let touchEndY = 0;

  function handleSwipe() {
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX < 0) {
        nextSlide();
      } else if (deltaX > 0) {
        previousSlide();
      }
    } else {
      if (deltaY < 0) {
        nextSlide();
      } else if (deltaY > 0) {
        previousSlide();
      }
    }
  }

  presentationElement.addEventListener("touchstart", (e) => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
  });

  presentationElement.addEventListener("touchend", (e) => {
    touchEndX = e.changedTouches[0].screenX;
    touchEndY = e.changedTouches[0].screenY;
    handleSwipe();
  });

  // Handle fullscreen
  function toggleFullScreen() {
    if (!document.fullscreenElement) {
      presentationElement.style.display = "flex";
      presentationElement.requestFullscreen();
      presentationElement.focus();
    } else {
      document.exitFullscreen?.();
    }
  }

  let doubleClickLock = 0;
  document.body.addEventListener("dblclick", (event) => {
    if (doubleClickLock) {
      return;
    }
    doubleClickLock = 1;
    setTimeout(() => {
      doubleClickLock = 0;
    }, 1000);
    const slideElement = (event.target as Element)?.closest?.(".slide");
    if (slideElement) {
      if (!slideElement.closest(presentationElementSelector)) {
        // The double clicked slide is not inside the presentationElement
        // So, set it as the current slide
        currentSlideIndex = slides.indexOf(slideElement);
        presentationElement.innerHTML = slideElement.outerHTML;
      }
      toggleFullScreen();
    }
  });

  presentationElement.addEventListener("fullscreenchange", (event) => {
    if (!document.fullscreenElement) {
      presentationElement.style.display = "none";
      slides[currentSlideIndex].scrollIntoView();
    }
  });
})();
