
(() => {

  // =========================================
  // ELEMENT HTML
  // =========================================

  const $ = (id) => document.getElementById(id);

  const startButton = $("start-ar");
  const exitButton = $("exit-ar");
  const placeButton = $("place-menu");

  const arContainer = $("ar-container");

  const status = $("status");
  const arStatus = $("ar-status");
  const instruction = $("instruction");

  const menuTitle = $("menu-title");
  const menuCounter = $("menu-counter");

  const previousButton = $("previous-menu");
  const nextButton = $("next-menu");

  const menuList = $("menu-list");

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

  // =========================================
  // STATE AR
  // =========================================

  let currentIndex = 0;

  let renderer = null;
  let scene = null;
  let camera = null;

  let xrSession = null;
  let hitTestSource = null;
  let viewerSpace = null;
  let localSpace = null;

  let reticle = null;
  let menuPlane = null;

  let menuTextures = [];

  let arStarted = false;
  let placed = false;

  let sessionEnding = false;

  // =========================================
  // STATUS
  // =========================================

  function setStatus(message) {

    status.textContent = message;
    arStatus.textContent = message;

  }

  // =========================================
  // LOAD GAMBAR MENU
  // =========================================

  function loadMenuTextures() {

    return new Promise((resolve, reject) => {

      const loader = new THREE.TextureLoader();

      let loaded = 0;

      menus.forEach((menu, index) => {

        loader.load(

          menu.image,

          (texture) => {

            texture.colorSpace = THREE.SRGBColorSpace;

            texture.minFilter = THREE.LinearFilter;

            menuTextures[index] = texture;

            loaded++;

            if (loaded === menus.length) {
              resolve();
            }

          },

          undefined,

          (error) => {

            console.error(
              "Gagal memuat gambar:",
              menu.image,
              error
            );

            reject(error);

          }

        );

      });

    });

  }

  // =========================================
  // MEMBUAT RETICLE
  // =========================================

  function createReticle() {

    const geometry = new THREE.RingGeometry(
      0.07,
      0.10,
      32
    );

    const material = new THREE.MeshBasicMaterial({

      color: 0xffff00,

      side: THREE.DoubleSide

    });

    reticle = new THREE.Mesh(
      geometry,
      material
    );

    reticle.matrixAutoUpdate = false;

    reticle.visible = false;

    scene.add(reticle);

  }

  // =========================================
  // MEMBUAT POSTER MENU
  // =========================================

  function createMenuPlane() {

    const geometry = new THREE.PlaneGeometry(
      0.7,
      0.45
    );

    const material = new THREE.MeshBasicMaterial({

      color: 0xffffff,

      side: THREE.DoubleSide,

      transparent: false

    });

    menuPlane = new THREE.Mesh(
      geometry,
      material
    );

    menuPlane.visible = false;

    scene.add(menuPlane);

  }

  // =========================================
  // GANTI POSTER
  // =========================================

  function showMenu(index) {

    currentIndex =
      (index + menus.length) % menus.length;

    const menu = menus[currentIndex];

    menuTitle.textContent = menu.title;

    menuCounter.textContent =
      `${currentIndex + 1} / ${menus.length}`;

    if (
      menuPlane &&
      menuTextures[currentIndex]
    ) {

      menuPlane.material.map =
        menuTextures[currentIndex];

      menuPlane.material.needsUpdate = true;

    }

    if (arStarted) {

      instruction.textContent =
        placed
          ? "Menu diperbarui. Arahkan kamera ke meja."
          : "Arahkan kamera ke meja lalu tempatkan menu.";

    }

  }

  // =========================================
  // MEMBUAT RENDERER
  // =========================================

  function createRenderer() {

    renderer = new THREE.WebGLRenderer({

      alpha: true,

      antialias: true,

      powerPreference: "high-performance"

    });

    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, 2)
    );

    renderer.setSize(
      window.innerWidth,
      window.innerHeight
    );

    renderer.xr.enabled = true;

    renderer.xr.setReferenceSpaceType("local");

    renderer.outputColorSpace =
      THREE.SRGBColorSpace;

    renderer.domElement.style.position = "absolute";

    renderer.domElement.style.inset = "0";

    renderer.domElement.style.width = "100%";

    renderer.domElement.style.height = "100%";

    renderer.domElement.style.zIndex = "1";

    renderer.domElement.style.touchAction = "none";

    arContainer.appendChild(
      renderer.domElement
    );

  }

  // =========================================
  // MEMBUAT SCENE
  // =========================================

  function createScene() {

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera();

    createReticle();

    createMenuPlane();

  }

  // =========================================
  // MEMULAI AR
  // =========================================

  async function startAR() {

    if (arStarted) {
      return;
    }

    if (!navigator.xr) {

      setStatus(
        "WebXR tidak tersedia di browser ini. " +
        "Gunakan browser dan perangkat yang mendukung AR."
      );

      return;

    }

    startButton.disabled = true;

    setStatus("Memeriksa dukungan AR...");

    try {

      const supported =
        await navigator.xr.isSessionSupported(
          "immersive-ar"
        );

      if (!supported) {

        setStatus(
          "Browser atau perangkat tidak mendukung immersive-ar."
        );

        startButton.disabled = false;

        return;

      }

      setStatus("Memuat gambar menu...");

      await loadMenuTextures();

      createRenderer();

createScene();

// Memasang gambar menu ke objek AR
showMenu(currentIndex);

setStatus("Memulai sesi AR...");

      xrSession = await navigator.xr.requestSession(

        "immersive-ar",

        {

          requiredFeatures: [
            "hit-test"
          ],

          optionalFeatures: [
            "dom-overlay"
          ],

          domOverlay: {
            root: arContainer
          }

        }

      );

      await renderer.xr.setSession(
        xrSession
      );

      viewerSpace =
        await xrSession.requestReferenceSpace(
          "viewer"
        );

      localSpace =
        await xrSession.requestReferenceSpace(
          "local"
        );

      hitTestSource =
        await xrSession.requestHitTestSource({

          space: viewerSpace

        });

      arStarted = true;

      placed = false;

      arContainer.classList.add("active");

      startButton.textContent = "AR Aktif";

      startButton.disabled = false;

      placeButton.disabled = true;

      instruction.textContent =
        "Gerakkan kamera perlahan ke permukaan meja.";

      setStatus("AR aktif. Cari permukaan meja.");

      // =====================================
      // SELECT: TEMPATKAN MENU
      // =====================================

      xrSession.addEventListener(
        "select",
        placeMenu
      );

      // =====================================
      // SESSION END
      // =====================================

      xrSession.addEventListener(
        "end",
        onSessionEnd
      );

      // =====================================
      // RENDER LOOP
      // =====================================

      renderer.setAnimationLoop(
        renderAR
      );

    } catch (error) {

      console.error(
        "AR gagal dimulai:",
        error
      );

      setStatus(
        "AR gagal dimulai: " +
        (error.message || "Periksa dukungan browser.")
      );

      cleanupAR();

    }

  }

  // =========================================
  // RENDER AR
  // =========================================

  function renderAR(timestamp, frame) {

    if (!frame || !xrSession) {
      return;
    }

    const results =
      frame.getHitTestResults(
        hitTestSource
      );

    if (results.length > 0) {

      const hit = results[0];

      const pose =
        hit.getPose(localSpace);

      if (pose) {

        reticle.visible = !placed;

        reticle.matrix.fromArray(
          pose.transform.matrix
        );

        placeButton.disabled = false;

        if (!placed) {

          instruction.textContent =
            "Permukaan terdeteksi. Ketuk Tempatkan Menu.";

          arStatus.textContent =
            "Permukaan terdeteksi";

        }

      }

    } else {

      reticle.visible = false;

      placeButton.disabled = true;

      if (!placed) {

        instruction.textContent =
          "Arahkan kamera ke meja dan gerakkan perlahan.";

        arStatus.textContent =
          "Mencari permukaan";

      }

    }

    renderer.render(
      scene,
      camera
    );

  }

  // =========================================
  // MENEMPATKAN MENU
  // =========================================

  function placeMenu() {

    if (!xrSession || !reticle.visible) {

      instruction.textContent =
        "Permukaan belum terdeteksi.";

      return;

    }

    const matrix = reticle.matrix;

    const position = new THREE.Vector3();

    const rotation = new THREE.Quaternion();

    const scale = new THREE.Vector3();

    matrix.decompose(
      position,
      rotation,
      scale
    );

    // Poster berada sedikit di atas permukaan.
    position.y += 0.02;

    menuPlane.position.copy(position);

    // Gambar diletakkan horizontal di atas meja.
    menuPlane.rotation.set(
      -Math.PI / 2,
      0,
      0
    );

    menuPlane.visible = true;

    placed = true;

    reticle.visible = false;

    placeButton.disabled = true;

    instruction.textContent =
      "Menu telah ditempatkan. Gunakan tombol untuk mengganti poster.";

    setStatus("Menu AR berhasil ditempatkan.");

  }

  // =========================================
  // TOMBOL TEMPATKAN MENU
  // =========================================

  placeButton.addEventListener(
    "click",
    placeMenu
  );

  // =========================================
  // GANTI MENU SEBELUMNYA
  // =========================================

  previousButton.addEventListener(
    "click",
    () => {

      showMenu(currentIndex - 1);

    }
  );

  // =========================================
  // GANTI MENU BERIKUTNYA
  // =========================================

  nextButton.addEventListener(
    "click",
    () => {

      showMenu(currentIndex + 1);

    }
  );

  // =========================================
  // KATEGORI MENU
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

      const card =
        document.createElement("div");

      card.className = "menu-card";

      const image =
        document.createElement("img");

      image.src = menu.image;

      image.alt = menu.title;

      const content =
        document.createElement("div");

      const title =
        document.createElement("h3");

      title.textContent = menu.title;

      const button =
        document.createElement("button");

      button.textContent = "Pilih Menu";

      button.addEventListener(
        "click",
        () => {

          showMenu(index);

          window.scrollTo({

            top: arContainer.offsetTop,

            behavior: "smooth"

          });

          if (!arStarted) {

            status.textContent =
              "Menu dipilih. Tekan Mulai AR.";

          }

        }
      );

      content.appendChild(title);

      content.appendChild(button);

      card.appendChild(image);

      card.appendChild(content);

      menuList.appendChild(card);

    });

  }

  categoryButtons.forEach(button => {

    button.addEventListener(
      "click",
      () => {

        createMenuList(
          button.dataset.category
        );

      }
    );

  });

  // =========================================
  // KELUAR AR
  // =========================================

  async function exitAR() {

    if (!xrSession || sessionEnding) {
      return;
    }

    sessionEnding = true;

    try {

      await xrSession.end();

    } catch (error) {

      console.error(
        "Gagal mengakhiri sesi AR:",
        error
      );

    }

  }

  exitButton.addEventListener(
    "click",
    exitAR
  );

  // =========================================
  // SESSION END
  // =========================================

  function onSessionEnd() {

    cleanupAR();

    setStatus("Sesi AR ditutup.");

  }

  // =========================================
  // MEMBERSIHKAN AR
  // =========================================

  function cleanupAR() {

    arStarted = false;

    placed = false;

    sessionEnding = false;

    hitTestSource = null;

    viewerSpace = null;

    localSpace = null;

    xrSession = null;

    if (renderer) {

      renderer.setAnimationLoop(null);

      renderer.dispose();

      if (renderer.domElement.parentNode) {

        renderer.domElement.parentNode.removeChild(
          renderer.domElement
        );

      }

      renderer = null;

    }

    if (scene) {

      scene.traverse(object => {

        if (object.geometry) {
          object.geometry.dispose();
        }

      });

      scene = null;

    }

    camera = null;

    reticle = null;

    menuPlane = null;

    arContainer.classList.remove("active");

    startButton.disabled = false;

    startButton.textContent = "Mulai AR";

    placeButton.disabled = true;

  }

  // =========================================
  // INISIALISASI
  // =========================================

  showMenu(0);

  createMenuList("all");

  startButton.addEventListener(
    "click",
    startAR
  );

})();
