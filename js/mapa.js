/* ===== MAPA ===== */

const map = L.map('map', {
  zoomControl: false,
  rotate: true,
  touchRotate: true,
  bearing: 0,
  zoomAnimation: true,
  zoomAnimationThreshold: 4,
  fadeAnimation: true  
}).setView([-21.9348, -50.5136], 16);

L.control.zoom({ position: 'topleft' }).addTo(map);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap'
}).addTo(map);


/* ===== ESTILOS ===== */

const estiloPadrao = {
  color: '#0b3c8a',
  weight: 2,
  fillOpacity: 0
};

const estiloCensitario = {
  color: '#d97706',
  weight: 5,
  fillOpacity: 0
};

const ZOOM_ROTULOS_QUARTEIROES = 16;
const ZOOM_ROTULOS_CENSITARIO = 15;


/* ===== CAMADAS ===== */

let camadaQuarteiroes;
let camadaCensitaria;

const grupoRotulos = L.layerGroup().addTo(map);
const grupoRotulosCensitario = L.layerGroup().addTo(map);


/* ===== QUARTEIRÕES ===== */

fetch('quarteiroes.geojson')
  .then(r => r.json())
  .then(data => {
    camadaQuarteiroes = L.geoJSON(data, {
      style: estiloPadrao,
      onEachFeature: (feature, layer) => {
        const id = feature.properties.id;

        const centro = layer.getBounds().getCenter();
        const rotulo = L.marker(centro, {
          icon: L.divIcon({
            className: 'rotulo-quarteirao',
            html: id
          })
        });

        grupoRotulos.addLayer(rotulo);
      }
    }).addTo(map);

    atualizarVisibilidadeRotulos();
  });


/* ===== SETOR CENSITÁRIO ===== */

fetch('censitario.geojson')
  .then(r => r.json())
  .then(data => {
    camadaCensitaria = L.geoJSON(data, {
      style: estiloCensitario,
      onEachFeature: (feature, layer) => {
        if (!feature.properties.CD_GEOCODI) return;

        const codigo = String(feature.properties.CD_GEOCODI).slice(-3);

        const centro = layer.getBounds().getCenter();
        const rotulo = L.marker(centro, {
          icon: L.divIcon({
            className: 'rotulo-censitario',
            html: codigo
          })
        });

        grupoRotulosCensitario.addLayer(rotulo);
      }
    }).addTo(map);

    camadaQuarteiroes?.bringToFront();
  });


/* ===== RÓTULOS POR ZOOM ===== */

function atualizarVisibilidadeRotulos() {
  const zoom = map.getZoom();

  if (zoom >= ZOOM_ROTULOS_QUARTEIROES && map.hasLayer(camadaQuarteiroes)) {
    map.addLayer(grupoRotulos);
  } else {
    map.removeLayer(grupoRotulos);
  }

  if (zoom >= ZOOM_ROTULOS_CENSITARIO && map.hasLayer(camadaCensitaria)) {
    map.addLayer(grupoRotulosCensitario);
  } else {
    map.removeLayer(grupoRotulosCensitario);
  }
}

map.on('zoomend', atualizarVisibilidadeRotulos);


/* ===== BUSCA ===== */

function buscar() {
  const tipo = document.querySelector('input[name="tipo-busca"]:checked').value;
  tipo === 'quarteirao' ? buscarQuarteirao() : buscarCensitario();
}

function buscarQuarteirao() {
  const valor = document.getElementById('busca').value.trim();
  if (!/^\d+$/.test(valor)) {
    mostrarToast('Digite apenas números');
    destacarBuscaInvalida();
    return;
  }

  let encontrado = false;

  camadaQuarteiroes.eachLayer(layer => {
    if (layer.feature.properties.id == valor) {
      map.fitBounds(layer.getBounds(), {
        padding: [40, 40],
        maxZoom: 18,
        animate: true,
        duration: 0.8,
        easeLinearity: 0.25
      });
      map.setBearing(0);
      encontrado = true;
    }
  });

  if (!encontrado) {
    mostrarToast('Quarteirão não encontrado');
    destacarBuscaInvalida();
  }
}

function buscarCensitario() {
  const valor = document.getElementById('busca').value.trim();
  if (!/^\d+$/.test(valor)) {
    mostrarToast('Digite apenas números');
    destacarBuscaInvalida();
    return;
  }

  let encontrado = false;

  camadaCensitaria.eachLayer(layer => {
    const codigo = String(layer.feature.properties.CD_GEOCODI).slice(-3);
    if (codigo === valor) {
      map.fitBounds(layer.getBounds(), {
        padding: [40, 40],
        maxZoom: 17,
        animate: true,
        duration: 0.9,
        easeLinearity: 0.25
      });
      map.setBearing(0);
      encontrado = true;
    }
  });

  if (!encontrado) {
    mostrarToast('Setor censitário não encontrado');
    destacarBuscaInvalida();
  }
}


/* ===== INPUT ===== */

document.getElementById('busca').addEventListener('keydown', e => {
  if (e.key === 'Enter') buscar();
});

document.getElementById('busca').addEventListener('input', e => {
  e.target.value = e.target.value.replace(/\D/g, '');
});


/* ===== ROTACAO – CORREÇÃO MOBILE ===== */

let camadasOcultas = false;
const container = map.getContainer();

container.addEventListener('touchstart', e => {
  if (e.touches.length === 2 && !camadasOcultas) {
    camadasOcultas = true;
    ocultarCamadas();
  }
}, { passive: true });

container.addEventListener('touchend', e => {
  if (e.touches.length < 2 && camadasOcultas) {
    camadasOcultas = false;
    mostrarCamadas();
  }
}, { passive: true });

function ocultarCamadas() {
  if (camadaQuarteiroes) map.removeLayer(camadaQuarteiroes);
  if (camadaCensitaria) map.removeLayer(camadaCensitaria);
  map.removeLayer(grupoRotulos);
  map.removeLayer(grupoRotulosCensitario);
}

function mostrarCamadas() {
  if (document.getElementById('chk-quarteiroes').checked) {
    map.addLayer(camadaQuarteiroes);
    camadaQuarteiroes?.bringToFront();
  }

  if (document.getElementById('chk-censitario').checked) {
    map.addLayer(camadaCensitaria);
  }

  atualizarVisibilidadeRotulos();
}


/* ===== BOTÃO ROTACIONAR ===== */

let anguloAtual = 0;

function rotacionarMapa() {
  anguloAtual += 30;
  if (anguloAtual >= 360) anguloAtual = 0;
  map.setBearing(anguloAtual);
}


/* ===== MENU ===== */

function toggleMenu() {
  const menu = document.getElementById('menu-opcoes');
  const botao = document.querySelector('.btn-opcoes');

  const aberto = menu.classList.toggle('hidden') === false;
  botao.classList.toggle('ativo', aberto);
}


function toggleQuarteiroes() {
  const chk = document.getElementById('chk-quarteiroes');
  chk.checked ? map.addLayer(camadaQuarteiroes) : map.removeLayer(camadaQuarteiroes);
  atualizarVisibilidadeRotulos();
}

function toggleCensitario() {
  const chk = document.getElementById('chk-censitario');
  chk.checked ? map.addLayer(camadaCensitaria) : map.removeLayer(camadaCensitaria);
  atualizarVisibilidadeRotulos();
}


/* ===== TOAST ===== */

function mostrarToast(mensagem) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = mensagem;
  toast.classList.add('mostrar');
  setTimeout(() => toast.classList.remove('mostrar'), 2000);
}

function destacarBuscaInvalida() {
  const input = document.getElementById('busca');
  input.classList.add('erro');
  setTimeout(() => input.classList.remove('erro'), 1500);
}

document.addEventListener('click', function (e) {
  const menu = document.getElementById('menu-opcoes');
  const botao = document.querySelector('.btn-opcoes');

  if (!menu || menu.classList.contains('hidden')) return;

  if (menu.contains(e.target) || botao.contains(e.target)) return;

  menu.classList.add('hidden');
  botao.classList.remove('ativo');
});
