// Firebase Config y Inicialización
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getDatabase, ref, set, get } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBnYP5aFbCPo_CXJtMIgfKBJCC35B02-pQ",
  authDomain: "estoescolombia-ee08a.firebaseapp.com",
  projectId: "estoescolombia-ee08a",
  storageBucket: "estoescolombia-ee08a.appspot.com",
  messagingSenderId: "1003515854120",
  appId: "1:1003515854120:web:f0ac30d564c6fd3df8641d",
  measurementId: "G-SBTKKEGF8V"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

function dbRef(path) {
  return ref(db, path);
}

async function guardar(path, data) {
  try {
    await set(dbRef(path), data);
  } catch (e) {
    console.error("Error guardando en Firebase:", e);
  }
}

function cargar(path) {
  return get(dbRef(path)).then(snap => snap.exists() ? snap.val() : null);
}

document.addEventListener("DOMContentLoaded", async () => {
  const plano = document.querySelector(".plano");

  let estadoMesas = await cargar('estadoMesas') || {};
  let posicionesMesas = await cargar('posicionesMesas') || {};
  let posicionesZonas = await cargar('posicionesZonas') || {};
  let rotacionesZonas = await cargar('rotacionesZonas') || {};

  let modoEdicion = false;
  let mesaCounter = 1000;
  let zonaCounter = 500;

  const banner = document.getElementById('bannerModoEdicion');
  const btnSave = document.getElementById('btnSave');
  const sidebar = document.getElementById('editor-sidebar');

  if (!document.getElementById('btn-close-sidebar')) {
    const btnCerrarSidebar = document.createElement('button');
    btnCerrarSidebar.id = 'btn-close-sidebar';
    btnCerrarSidebar.textContent = '✖';
    Object.assign(btnCerrarSidebar.style, {
      position: 'absolute', top: '5px', right: '5px', background: 'transparent',
      border: 'none', fontSize: '20px', cursor: 'pointer', color: '#333'
    });
    sidebar.appendChild(btnCerrarSidebar);
    btnCerrarSidebar.addEventListener('click', () => cambiarModoEdicion(false));
  }

  function generarIDMesa() { return `mesa-${mesaCounter++}`; }
  function generarIDZona() { return `zona-${zonaCounter++}`; }

  function habilitarMesa(mesa) {
    const id = mesa.dataset.id;
    mesa.style.position = 'absolute';
    if (estadoMesas[id]) mesa.classList.add('ocupada');
    if (posicionesMesas[id]) {
      mesa.style.top = posicionesMesas[id].top;
      mesa.style.left = posicionesMesas[id].left;
    }

    mesa.addEventListener('click', () => {
      if (!modoEdicion) {
        mesa.classList.toggle('ocupada');
        estadoMesas[id] = mesa.classList.contains('ocupada');
        guardar('estadoMesas', estadoMesas);
      }
    });

    let isDragging = false, offsetX, offsetY;

    mesa.addEventListener('mousedown', (e) => {
      if (!modoEdicion) return;
      isDragging = true;
      offsetX = e.offsetX;
      offsetY = e.offsetY;
      mesa.style.zIndex = 1000;
    });

    document.addEventListener('mousemove', (e) => {
      if (isDragging) {
        const rect = plano.getBoundingClientRect();
        mesa.style.left = `${e.clientX - rect.left - offsetX}px`;
        mesa.style.top = `${e.clientY - rect.top - offsetY}px`;
      }
    });

    document.addEventListener('mouseup', async () => {
      if (isDragging) {
        isDragging = false;
        mesa.style.zIndex = '';
        posicionesMesas[id] = {
          top: mesa.style.top,
          left: mesa.style.left
        };
        await guardar('posicionesMesas', posicionesMesas);
      }
    });
  }

  document.querySelectorAll('.mesa').forEach(habilitarMesa);

  function inicializarZona(zona) {
    const id = zona.dataset.id || zona.innerText.replace(/\s+/g, '_').toLowerCase();
    zona.dataset.id = id;
    zona.style.position = 'absolute';
    zona.style.height = zona.style.height || '120px';
    zona.style.width = zona.style.width || '120px';

    if (posicionesZonas[id]) {
      zona.style.top = posicionesZonas[id].top;
      zona.style.left = posicionesZonas[id].left;
      zona.style.width = posicionesZonas[id].width;
      zona.style.height = posicionesZonas[id].height;
    }

    if (rotacionesZonas[id]) zona.classList.add('rotado');

    const btnRotar = document.createElement('button');
    btnRotar.textContent = '⤾';
    btnRotar.title = 'Rotar Zona';
    Object.assign(btnRotar.style, {
      position: 'absolute', top: '2px', right: '2px', fontSize: '14px',
      padding: '2px 6px', border: 'none', background: '#3498db', color: 'white',
      borderRadius: '4px', cursor: 'pointer', display: modoEdicion ? 'block' : 'none'
    });
    zona.appendChild(btnRotar);

    btnRotar.addEventListener('click', async (e) => {
      e.stopPropagation();
      zona.classList.toggle('rotado');
      rotacionesZonas[id] = zona.classList.contains('rotado');
      await guardar('rotacionesZonas', rotacionesZonas);
    });

    let isDragging = false, offsetX, offsetY;

    zona.addEventListener('mousedown', (e) => {
      if (!modoEdicion) return;
      const rect = zona.getBoundingClientRect();
      const edgeSize = 10;
      if (e.clientX >= rect.right - edgeSize || e.clientY >= rect.bottom - edgeSize) return;
      isDragging = true;
      offsetX = e.clientX - zona.offsetLeft;
      offsetY = e.clientY - zona.offsetTop;
      e.preventDefault();
    });

    function mover(ev) {
      if (!isDragging) return;
      zona.style.left = `${ev.clientX - offsetX}px`;
      zona.style.top = `${ev.clientY - offsetY}px`;
    }

    async function soltar() {
      if (!isDragging) return;
      isDragging = false;
      posicionesZonas[id] = {
        top: zona.style.top,
        left: zona.style.left,
        width: zona.style.width,
        height: zona.style.height
      };
      await guardar('posicionesZonas', posicionesZonas);
      document.removeEventListener('mousemove', mover);
      document.removeEventListener('mouseup', soltar);
    }

    document.addEventListener('mousemove', mover);
    document.addEventListener('mouseup', soltar);

    const resizeObserver = new ResizeObserver(async () => {
      if (!modoEdicion) return;
      posicionesZonas[id] = {
        top: zona.style.top,
        left: zona.style.left,
        width: zona.style.width,
        height: zona.style.height
      };
      await guardar('posicionesZonas', posicionesZonas);
    });
    resizeObserver.observe(zona);
  }

  document.querySelectorAll('.zona').forEach(inicializarZona);

  // Login
  const btnEdicion = document.getElementById("btn-edicion");
  const modal = document.getElementById("login-modal");
  const closeModal = document.querySelector(".close");
  const loginBtn = document.getElementById("login-btn");
  const errorMsg = document.getElementById("login-error");

  btnEdicion.onclick = () => modal.classList.add('show');
  closeModal.onclick = () => {
    modal.classList.remove('show');
    errorMsg.style.display = "none";
  };

  loginBtn.onclick = () => {
    const user = document.getElementById("usuario").value;
    const pass = document.getElementById("contrasena").value;
    if (user === "admin" && pass === "Colombia@1") {
      modal.classList.remove('show');
      cambiarModoEdicion(true);
    } else {
      errorMsg.style.display = "block";
    }
  };

  window.onclick = (event) => {
    if (event.target === modal) {
      modal.classList.remove('show');
      errorMsg.style.display = "none";
    }
  };

  btnSave.addEventListener('click', async () => {
    cambiarModoEdicion(false);
    await guardar('estadoMesas', estadoMesas);
    await guardar('posicionesMesas', posicionesMesas);
    await guardar('posicionesZonas', posicionesZonas);
    await guardar('rotacionesZonas', rotacionesZonas);
    setTimeout(() => location.reload(), 300);
  });

  function cambiarModoEdicion(activo) {
    modoEdicion = activo;
    plano.classList.toggle("editable", activo);
    banner.style.display = activo ? 'block' : 'none';
    btnSave.style.display = activo ? 'inline-block' : 'none';
    document.querySelectorAll('.zona button').forEach(btn => {
      btn.style.display = activo ? 'block' : 'none';
    });
    sidebar.style.display = activo ? 'flex' : 'none';
  }

  document.getElementById('btn-add-mesa').addEventListener('click', async (e) => {
    e.preventDefault();
    const id = generarIDMesa();
    const mesa = document.createElement('div');
    mesa.className = 'mesa';
    mesa.dataset.id = id;
    mesa.textContent = id;
    mesa.style.top = '100px';
    mesa.style.left = '100px';
    mesa.style.position = 'absolute';
    plano.appendChild(mesa);
    posicionesMesas[id] = { top: '100px', left: '100px' };
    estadoMesas[id] = false;
    await guardar('posicionesMesas', posicionesMesas);
    await guardar('estadoMesas', estadoMesas);
    habilitarMesa(mesa);
  });

  document.getElementById('btn-remove-mesa').addEventListener('click', async (e) => {
    e.preventDefault();
    const mesas = document.querySelectorAll('.mesa');
    if (mesas.length === 0) return;
    const ultima = mesas[mesas.length - 1];
    const id = ultima.dataset.id;
    ultima.remove();
    delete posicionesMesas[id];
    delete estadoMesas[id];
    await guardar('posicionesMesas', posicionesMesas);
    await guardar('estadoMesas', estadoMesas);
  });

  document.getElementById('btn-add-zona').addEventListener('click', async (e) => {
    e.preventDefault();
    const id = generarIDZona();
    const zona = document.createElement('div');
    zona.className = 'zona';
    zona.dataset.id = id;
    zona.textContent = 'Nueva Zona';
    zona.style.top = '200px';
    zona.style.left = '200px';
    zona.style.position = 'absolute';
    zona.style.width = '120px';
    zona.style.height = '120px';
    plano.appendChild(zona);
    posicionesZonas[id] = {
      top: '200px',
      left: '200px',
      width: '120px',
      height: '120px'
    };
    await guardar('posicionesZonas', posicionesZonas);
    inicializarZona(zona);
  });

  document.getElementById('btn-remove-zona').addEventListener('click', async (e) => {
    e.preventDefault();
    const zonas = document.querySelectorAll('.zona');
    if (zonas.length === 0) return;
    const ultima = zonas[zonas.length - 1];
    const id = ultima.dataset.id;
    ultima.remove();
    delete posicionesZonas[id];
    delete rotacionesZonas[id];
    await guardar('posicionesZonas', posicionesZonas);
    await guardar('rotacionesZonas', rotacionesZonas);
  });
  document.getElementById("toggle-sidebar").addEventListener("click", () => {
    const sidebar = document.getElementById("editor-sidebar");
    sidebar.classList.toggle("show");
  });
});
