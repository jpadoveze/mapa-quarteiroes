/* ===== MAPA ===== */

const map = L.map('map', {
  zoomControl: false,
  rotate: true,
  touchRotate: false, // ❌ desativado
  bearing: 0,
  zoomAnimation: true,
  zoomAnimationThreshold: 4,
  fadeAnimation: true
}).setView([-21.9333, -50.5164], 16);

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
          interactive: false,
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
          interactive: false,
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

  zoom >= ZOOM_ROTULOS_QUARTEIROES && map.hasLayer(camadaQuarteiroes)
    ? map.addLayer(grupoRotulos)
    : map.removeLayer(grupoRotulos);

  zoom >= ZOOM_ROTULOS_CENSITARIO && map.hasLayer(camadaCensitaria)
    ? map.addLayer(grupoRotulosCensitario)
    : map.removeLayer(grupoRotulosCensitario);
}

map.on('zoomend', atualizarVisibilidadeRotulos);


/* ===== BUSCA ===== */

function buscar() {
  const tipo = document.querySelector('input[name="tipo-busca"]:checked').value;
  tipo === 'quarteirao' ? buscarQuarteirao() : buscarCensitario();
}

function buscarQuarteirao() {
  const valor = document.getElementById('busca').value.trim();
  if (!/^\d+$/.test(valor)) return erroBusca('Digite apenas números');

  let encontrado = false;

  camadaQuarteiroes.eachLayer(layer => {
    if (layer.feature.properties.id == valor) {
      map.fitBounds(layer.getBounds(), {
        padding: [50, 50],
        maxZoom: 18,
        animate: true,
        duration: 1.0,
        easeLinearity: 0.2
      });
      map.setBearing(0);
      encontrado = true;
    }
  });

  if (!encontrado) erroBusca('Quarteirão não encontrado');
}

function buscarCensitario() {
  const valor = document.getElementById('busca').value.trim();
  if (!/^\d+$/.test(valor)) return erroBusca('Digite apenas números');

  let encontrado = false;

  camadaCensitaria.eachLayer(layer => {
    const codigo = String(layer.feature.properties.CD_GEOCODI).slice(-3);
    if (codigo === valor) {
      map.fitBounds(layer.getBounds(), {
        padding: [50, 50],
        maxZoom: 17,
        animate: true,
        duration: 1.0,
        easeLinearity: 0.2
      });
      map.setBearing(0);
      encontrado = true;
    }
  });

  if (!encontrado) erroBusca('Setor censitário não encontrado');
}


/* ===== INPUT ===== */

document.getElementById('busca').addEventListener('keydown', e => {
  if (e.key === 'Enter') buscar();
});

document.getElementById('busca').addEventListener('input', e => {
  e.target.value = e.target.value.replace(/\D/g, '');
});


/* ===== BOTÃO ROTACIONAR ===== */

let anguloAtual = 0;

function rotacionarMapa() {
  anguloAtual = (anguloAtual + 15) % 360;
  map.setBearing(anguloAtual);
}


/* ===== LOCALIZAÇÃO (btn-localizacao) ===== */

let marcadorLocalizacao = null;

function localizarUsuario() {
  map.locate({
    setView: true,
    maxZoom: 18,
    enableHighAccuracy: true
  });
}

map.on('locationfound', e => {
  if (marcadorLocalizacao) map.removeLayer(marcadorLocalizacao);

  marcadorLocalizacao = L.circleMarker(e.latlng, {
    radius: 8,
    color: '#2563eb',
    fillColor: '#3b82f6',
    fillOpacity: 1
  }).addTo(map);

  map.setBearing(0);
});

map.on('locationerror', () => {
  mostrarToast('Não foi possível obter sua localização');
});


/* ===== MENU ===== */

function toggleMenu() {
  const menu = document.getElementById('menu-opcoes');
  const botao = document.querySelector('.btn-opcoes');
  const aberto = !menu.classList.toggle('hidden');
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

function mostrarToast(msg) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('mostrar');
  setTimeout(() => toast.classList.remove('mostrar'), 2000);
}

function erroBusca(msg) {
  mostrarToast(msg);
  const input = document.getElementById('busca');
  input.classList.add('erro');
  setTimeout(() => input.classList.remove('erro'), 1500);
}
