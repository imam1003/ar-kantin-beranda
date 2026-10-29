
(() => {

  const startButton = document.getElementById("start-ar");
  const closeButton = document.getElementById("close-ar");

  const camera = document.getElementById("camera");
  const cameraContainer = document.getElementById("camera-container");

  const status = document.getElementById("status");
  const cameraStatus = document.getElementById("camera-status");

  const menuImage = document.getElementById("menu-image");
  const menuTitle = document.getElementById("menu-title");

  const previousButton = document.getElementById("previous-menu");
  const nextButton = document.getElementById("next-menu");

  const menuList = document.getElementById("menu-list");

  const categoryButtons = document.querySelectorAll(
    "[data-category]"
  );

  // =========================================
  // DATA MENU
  // =========================================

  const menus = [

    {
      title: "Menu Minuman 1",
      category: "drink",
      image: "assets/poster_minuman1.png"
    },

    {
      title: "Menu Minuman 2",
      category: "drink",
      image: "assets/poster_minuman2.png"
    },

    {
      title: "Menu Makanan 1",
      category: "food",
      image: "assets/poster_makanan1.png"
    },

    {
      title: "Menu Makanan 2",
      category: "food",
      image: "assets/poster_makanan2.png"
    }

  ];

  let currentIndex = 0;
  let cameraStream = null;

  // =========================================
  // MENAMPILKAN MENU
  // =========================================

  function showMenu(index) {

    currentIndex =
      (index + menus.length) % menus.length;

    const menu = menus[currentIndex];

    menuImage.src = menu.image;
    menuImage.alt = menu.title;

    menuTitle.textContent = menu.title;

    cameraStatus.textContent =
      `${menu.title} (${currentIndex + 1}/${menus.length})`;

  }

  // =========================================
  // MEMBUAT DAFTAR MENU
  // =========================================

  function createMenuList(category = "all") {

    menuList.innerHTML = "";

    menus.forEach((menu, index) => {

      if (
        category !== "all" &&
        menu.category !== category
      ) {
        return;
      }

      const card = document.createElement("div");

      card.className = "menu-card";

      const image = document.createElement("img");

      image.src = menu.image;
      image.alt = menu.title;

      const content = document.createElement("div");

      const title = document.createElement("h3");

      title.textContent = menu.title;

      const button = document.createElement("button");

      button.textContent = "Lihat Menu";

      button.addEventListener("click", () => {

        showMenu(index);

        if (cameraStream) {
          cameraContainer.scrollIntoView({
            behavior: "smooth"
          });
        } else {
          status.textContent =
            "Menu dipilih. Tekan Mulai AR untuk membuka kamera.";
        }

      });

      content.appendChild(title);
      content.appendChild(button);

      card.appendChild(image);
      card.appendChild(content);

      menuList.appendChild(card);

    });

  }

  // =========================================
  // MEMULAI KAMERA
  // =========================================

  async function startAR() {

    status.textContent = "Memulai kamera...";

    if (!navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia) {

      status.textContent =
        "Browser tidak mendukung akses kamera. Gunakan Chrome dan HTTPS.";

      return;

    }

    try {

      cameraStream =
        await navigator.mediaDevices.getUserMedia({

          video: {
            facingMode: {
              ideal: "environment"
            }
          },

          audio: false

        });

      camera.srcObject = cameraStream;

      await camera.play();

      cameraContainer.classList.add("active");

      status.textContent =
        "Kamera aktif. Menu ditampilkan pada layar kamera.";

      cameraStatus.textContent = "Kamera aktif";

      startButton.textContent = "Kamera Aktif";

      cameraContainer.scrollIntoView({
        behavior: "smooth"
      });

    } catch (error) {

      console.error("Kamera gagal:", error);

      status.textContent =
        "Kamera gagal dibuka. Periksa izin kamera dan HTTPS.";

      cameraStatus.textContent = "Kamera gagal";

      stopCamera();

    }

  }

  // =========================================
  // MENUTUP KAMERA
  // =========================================

  function stopCamera() {

    if (cameraStream) {

      cameraStream.getTracks().forEach(track => {
        track.stop();
      });

      cameraStream = null;

    }

    camera.srcObject = null;

    cameraContainer.classList.remove("active");

    startButton.textContent = "Mulai AR";

    status.textContent = "Kamera ditutup.";

  }

  // =========================================
  // TOMBOL MENU SEBELUMNYA
  // =========================================

  previousButton.addEventListener("click", () => {

    showMenu(currentIndex - 1);

  });

  // =========================================
  // TOMBOL MENU BERIKUTNYA
  // =========================================

  nextButton.addEventListener("click", () => {

    showMenu(currentIndex + 1);

  });

  // =========================================
  // TOMBOL MULAI KAMERA
  // =========================================

  startButton.addEventListener("click", () => {

    if (!cameraStream) {
      startAR();
    }

  });

  // =========================================
  // TOMBOL TUTUP KAMERA
  // =========================================

  closeButton.addEventListener("click", () => {

    stopCamera();

  });

  // =========================================
  // FILTER KATEGORI
  // =========================================

  categoryButtons.forEach(button => {

    button.addEventListener("click", () => {

      const category = button.dataset.category;

      createMenuList(category);

    });

  });

  // =========================================
  // INISIALISASI
  // =========================================

  showMenu(0);

  createMenuList("all");

  // =========================================
  // MEMBERSIHKAN KAMERA
  // =========================================

  window.addEventListener("pagehide", () => {

    stopCamera();

  });

})();
