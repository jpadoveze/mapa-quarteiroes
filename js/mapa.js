const map = L.map('map').setView([-21.9032, -50.5972], 16);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap'
}).addTo(map);

/* ===== ESTILOS ===== */

const estiloPadrao = {
  color: '#0b3c8a',
  weight: 2,
  fillOpacity: 0
};

const estiloSelecionado = {
  color: '#4da3ff',
  weight: 3,
  fillOpacity: 0
};

const estiloCensitario = {
  color: '#FFD700',
  weight: 2,
  fillOpacity: 0
};

/* ===== CAMADAS ===== */

let camadaQuarteiroes;
let camadaCensitaria;
let quarteiraoSelecionado = null;

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

        layer.on('click', () => selecionar(layer));

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
        const codigo = feature.properties.CD_GEOCODI;

        if (!codigo) return;

        const centro = layer.getBounds().getCenter();
        const rotulo = L.marker(centro, {
          icon: L.divIcon({
            className: 'rotulo-quarteirao',
            html: codigo
          })
        });

        grupoRotulosCensitario.addLayer(rotulo);
      }
    }).addTo(map);

    camadaQuarteiroes.bringToFront();
  });

/* ===== CONTROLE DE ZOOM DOS RÓTULOS ===== */

function atualizarVisibilidadeRotulos() {
  if (map.getZoom() < 16) {
    map.removeLayer(grupoRotulos);
    map.removeLayer(grupoRotulosCensitario);
    return;
  }

  if (map.hasLayer(camadaQuarteiroes)) {
    map.addLayer(grupoRotulos);
  } else {
    map.removeLayer(grupoRotulos);
  }

  if (map.hasLayer(camadaCensitaria)) {
    map.addLayer(grupoRotulosCensitario);
  } else {
    map.removeLayer(grupoRotulosCensitario);
  }
}


map.on('zoomend', atualizarVisibilidadeRotulos);

/* ===== FUNÇÕES ===== */

function selecionar(layer) {
  if (quarteiraoSelecionado) {
    quarteiraoSelecionado.setStyle(estiloPadrao);
  }
  layer.setStyle(estiloSelecionado);
  quarteiraoSelecionado = layer;
  map.fitBounds(layer.getBounds());
}

function buscarQuarteirao() {
  const valor = document.getElementById('busca').value;
  if (!valor || !camadaQuarteiroes) return;

  let encontrado = false;

  camadaQuarteiroes.eachLayer(layer => {
    if (layer.feature.properties.id == valor) {
      selecionar(layer);
      encontrado = true;
    }
  });

  if (!encontrado) {
    alert('Quarteirão não encontrado');
  }
}

document.getElementById('busca').addEventListener('keydown', e => {
  if (e.key === 'Enter') buscarQuarteirao();
});

let marcadorLocalizacao = null;

function minhaLocalizacao() {
  if (!navigator.geolocation) return;

  navigator.geolocation.getCurrentPosition(pos => {
    const latlng = [pos.coords.latitude, pos.coords.longitude];
    map.setView(latlng, 18);

    if (marcadorLocalizacao) {
      marcadorLocalizacao.setLatLng(latlng);
    } else {
      marcadorLocalizacao = L.circleMarker(latlng, { radius: 6 }).addTo(map);
    }

    camadaQuarteiroes.eachLayer(layer => {
      if (layer.getBounds().contains(latlng)) {
        selecionar(layer);
      }
    });
  });
}

function toggleMenu() {
  const menu = document.getElementById('menu-opcoes');
  menu.classList.toggle('hidden');
}

function toggleQuarteiroes() {
  const chk = document.getElementById('chk-quarteiroes');

  if (!camadaQuarteiroes) return;

  if (chk.checked) {
    map.addLayer(camadaQuarteiroes);
    camadaQuarteiroes.bringToFront();
    atualizarVisibilidadeRotulos();
  } else {
    map.removeLayer(camadaQuarteiroes);
    map.removeLayer(grupoRotulos);
  }
}


function toggleCensitario() {
  const chk = document.getElementById('chk-censitario');

  if (!camadaCensitaria) return;

  if (chk.checked) {
    map.addLayer(camadaCensitaria);
    camadaQuarteiroes?.bringToFront();
    atualizarVisibilidadeRotulos();
  } else {
    map.removeLayer(camadaCensitaria);
    map.removeLayer(grupoRotulosCensitario);
  }
}

