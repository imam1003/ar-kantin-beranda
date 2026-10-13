(() => {
  'use strict';
  const menus = [
    { title: 'Makanan 1', file: 'assets/poster_makanan1.png' },
    { title: 'Makanan 2', file: 'assets/poster_makanan2.png' },
    { title: 'Minuman 1', file: 'assets/poster_minuman1.png' },
    { title: 'Minuman 2', file: 'assets/poster_minuman2.png' }
  ];
  const $ = (id) => document.getElementById(id);
  const preview = $('menu-preview');
  const title = $('menu-title');
  const counter = $('counter');
  const status = $('status');
  const hint = $('hint');
  const error = $('image-error');
  const scene = $('ar-scene');
  const start = $('start-ar');
  const stop = $('stop-ar');
  const place = $('place-image');
  const texture = $('poster-texture');
  const plane = $('poster-plane');
  const reticle = $('reticle');
  let current = 0;
  let hitTestSource = null;
  let viewerSpace = null;
  let localSpace = null;
  let latestPose = null;
  let xrSession = null;
  let arReady = false;

  function setMenu(index) {
    current = (index + menus.length) % menus.length;
    const item = menus[current];
    preview.onerror = () => {
      error.classList.remove('hidden');
      preview.style.display = 'none';
      status.textContent = 'Gambar tidak ditemukan';
    };
    preview.onload = () => {
      error.classList.add('hidden');
      preview.style.display = 'block';
      if (!document.body.classList.contains('in-ar')) status.textContent = 'Pratinjau siap';
    };
    preview.src = item.file;
    preview.alt = `Poster menu ${item.title}`;
    title.textContent = item.title;
    counter.textContent = `${current + 1} / ${menus.length}`;
    document.querySelectorAll('.menu-button').forEach((button, i) => button.classList.toggle('active', i === current));
    if (texture) texture.setAttribute('src', item.file);
    if (plane) plane.setAttribute('material', 'src', '#poster-texture; shader: flat; side: double');
    if (document.body.classList.contains('in-ar')) {
      hint.textContent = 'Menu berubah. Tekan “Tempatkan / perbarui menu” atau sentuh permukaan untuk menempatkannya.';
    } else {
      hint.textContent = 'Pilih menu menggunakan tombol. Preview tetap dapat digunakan di MacBook meskipun WebXR tidak tersedia.';
    }
  }

  document.querySelectorAll('.menu-button').forEach(button => {
    button.addEventListener('click', () => setMenu(Number(button.dataset.index)));
  });
  $('previous').addEventListener('click', () => setMenu(current - 1));
  $('next').addEventListener('click', () => setMenu(current + 1));

  function cleanupAR() {
    try { if (hitTestSource) hitTestSource.cancel(); } catch (_) {}
    hitTestSource = null; viewerSpace = null; localSpace = null; latestPose = null; xrSession = null;
    if (reticle && reticle.object3D) reticle.object3D.visible = false;
    document.body.classList.remove('in-ar');
    $('ar-overlay').classList.add('hidden');
    start.classList.remove('hidden'); stop.classList.add('hidden'); place.classList.add('hidden');
    status.textContent = 'Pratinjau siap';
  }

  async function startAR() {
    if (!navigator.xr || typeof navigator.xr.isSessionSupported !== 'function') {
      status.textContent = 'Mode preview (WebXR tidak tersedia)';
      hint.textContent = 'WebXR tidak tersedia di browser MacBook ini. Kamu tetap bisa melihat dan mengganti poster menggunakan tombol menu.';
      return;
    }
    try {
      const supported = await navigator.xr.isSessionSupported('immersive-ar');
      if (!supported) {
        status.textContent = 'Mode preview (AR tidak didukung)';
        hint.textContent = 'Browser/perangkat ini tidak mendukung mode AR. Preview dan tombol menu tetap aktif.';
        return;
      }
      if (!window.AFRAME || !scene || !scene.enterVR) {
        status.textContent = 'AR belum siap';
        hint.textContent = 'A-Frame belum selesai dimuat. Muat ulang halaman dan coba lagi.';
        return;
      }
      await scene.enterVR();
    } catch (err) {
      console.error('Tidak dapat memulai AR:', err);
      status.textContent = 'AR gagal dimulai';
      hint.textContent = 'Pastikan situs dibuka melalui HTTPS di Chrome Android dan izin kamera diberikan. Preview menu tetap bisa digunakan.';
    }
  }
  start.addEventListener('click', startAR);
  stop.addEventListener('click', () => {
    if (scene && scene.is && scene.is('ar-mode')) scene.exitVR();
    else cleanupAR();
  });
  place.addEventListener('click', placeAtReticle);

  function placeAtReticle() {
    if (!latestPose || !plane) {
      hint.textContent = 'Belum menemukan permukaan. Arahkan kamera perlahan ke meja atau lantai sampai lingkaran posisi muncul.';
      return;
    }
    const p = latestPose.position;
    const q = latestPose.orientation;
    plane.object3D.position.set(p.x, p.y + 0.01, p.z);
    plane.object3D.quaternion.set(q.x, q.y, q.z, q.w);
    plane.object3D.visible = true;
    hint.textContent = 'Menu ditempatkan. Pilih menu lain lalu tekan Tempatkan / perbarui menu untuk menggantinya.';
  }

  // Register a uniquely named component once. The normal preview does not depend on this component.
  if (window.AFRAME && !AFRAME.components['kantin-poster-placement-v2']) {
    AFRAME.registerComponent('kantin-poster-placement-v2', {
      init() {
        this.sceneEl.addEventListener('enter-vr', () => {
          if (!this.sceneEl.is('ar-mode')) return;
          arReady = true;
          document.body.classList.add('in-ar');
          $('ar-overlay').classList.remove('hidden');
          start.classList.add('hidden'); stop.classList.remove('hidden'); place.classList.remove('hidden');
          status.textContent = 'Mode AR aktif';
          xrSession = this.sceneEl.renderer.xr.getSession();
          this.setupHitTest();
          if (xrSession) xrSession.addEventListener('end', cleanupAR, { once: true });
        });
        this.sceneEl.addEventListener('exit-vr', cleanupAR);
        this.sceneEl.addEventListener('click', placeAtReticle);
      },
      async setupHitTest() {
        try {
          if (!xrSession) return;
          viewerSpace = await xrSession.requestReferenceSpace('viewer');
          localSpace = await xrSession.requestReferenceSpace('local');
          hitTestSource = await xrSession.requestHitTestSource({ space: viewerSpace });
        } catch (err) {
          console.warn('Hit-test tidak tersedia:', err);
          hint.textContent = 'Sesi AR aktif, tetapi deteksi permukaan tidak tersedia pada perangkat ini.';
        }
      },
      tick() {
        const frame = this.el.sceneEl.frame;
        if (!xrSession || !hitTestSource || !frame || !localSpace) return;
        try {
          const results = frame.getHitTestResults(hitTestSource);
          if (results.length) {
            const pose = results[0].getPose(localSpace);
            if (pose) {
              latestPose = pose.transform;
              reticle.object3D.visible = true;
              reticle.object3D.position.set(pose.transform.position.x, pose.transform.position.y, pose.transform.position.z);
              reticle.object3D.quaternion.set(pose.transform.orientation.x, pose.transform.orientation.y, pose.transform.orientation.z, pose.transform.orientation.w);
              return;
            }
          }
        } catch (_) {}
        latestPose = null;
        reticle.object3D.visible = false;
      }
    });
  }
  scene.setAttribute('kantin-poster-placement-v2', '');

  // Ensure the canvas is hidden in preview mode even if the browser cannot use WebXR.
  scene.addEventListener('loaded', () => {
    scene.setAttribute('visible', 'false');
    setMenu(0);
  });
  setMenu(0);
})();
