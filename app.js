let canciones = [];
let cancionActualIndex = 0;
let semitonosDesplazados = 0;
let vistaActual = 'acordes'; 
let tamanoActual = 1.05;

const escala = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const bemolesMap = { 'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#' };
const notasPianoNombres = { 0: 'C', 1: 'C#', 2: 'D', 3: 'D#', 4: 'E', 5: 'F', 6: 'F#', 7: 'G', 8: 'G#', 9: 'A', 10: 'A#', 11: 'B' };

window.addEventListener('firebase-ready', () => {
    sincronizarConNube();
});

function alternarTema() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    if (currentTheme === 'light') {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('theme', 'dark');
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
    }
}

if (localStorage.getItem('theme') === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
}

function sincronizarConNube() {
    const q = window.collection(window.db, "canciones");
    window.onSnapshot(q, (snapshot) => {
        canciones = [];
        snapshot.forEach((doc) => {
            canciones.push({ idDoc: doc.id, ...doc.data() });
        });

        if(canciones.length === 0) agregarCancionInicial();
        else {
            actualizarSelectCanciones(cancionActualIndex);
            renderizar();
        }
    });
}

async function agregarCancionInicial() {
    const cancionInicial = {
        titulo: "Renuévame", artista: "Marcos Witt", tonoOriginal: "D",
        letra: `D    G\nRenuévame\n    A       D       G\nSeñor Jesús`,
        guitarra: "e|----------------------------------|",
        piano: "Mano Izquierda: D - A - Bm - G"
    };
    await window.addDoc(window.collection(window.db, "canciones"), cancionInicial);
}

function actualizarSelectCanciones(mantenerIndex = 0) {
    const select = document.getElementById('song-select');
    select.innerHTML = "";
    canciones.forEach((song, index) => {
        let option = document.createElement('option');
        option.value = index; option.text = song.titulo;
        select.appendChild(option);
    });
    if(mantenerIndex < canciones.length) {
        select.value = mantenerIndex;
        cancionActualIndex = mantenerIndex;
    }
}

function cargarCancion() {
    cancionActualIndex = document.getElementById('song-select').value;
    semitonosDesplazados = 0;
    renderizar();
}

function cambiarTono(cantidad) { semitonosDesplazados += cantidad; renderizar(); }

function cambiarVista(vista) {
    vistaActual = vista;
    document.getElementById('btn-acordes').classList.toggle('active', vista === 'acordes');
    document.getElementById('btn-guitarra').classList.toggle('active', vista === 'guitarra');
    document.getElementById('btn-piano').classList.toggle('active', vista === 'piano');
    renderizar();
}

function cambiarFuente(fuenteCSS) { document.documentElement.style.setProperty('--font-family', fuenteCSS); }

function cambiarTamano(cambio) {
    tamanoActual += cambio;
    if (tamanoActual < 0.8) tamanoActual = 0.8; if (tamanoActual > 1.8) tamanoActual = 1.8;
    document.documentElement.style.setProperty('--font-size-base', tamanoActual + 'rem');
}

function abrirModalCrear() {
    document.getElementById('modal-title').innerText = "➕ Agregar Nueva Canción";
    document.getElementById('edit-id').value = "";
    document.getElementById('input-titulo').value = ""; document.getElementById('input-artista').value = "";
    document.getElementById('input-tono').value = "D"; document.getElementById('input-letra').value = "";
    document.getElementById('input-guitarra').value = ""; document.getElementById('input-piano').value = "";
    document.getElementById('song-modal').style.display = 'flex';
}

function abrirModalEditar() {
    if(canciones.length === 0) return;
    let song = canciones[cancionActualIndex];
    document.getElementById('modal-title').innerText = "✏️ Editar Canción";
    document.getElementById('edit-id').value = song.idDoc;
    document.getElementById('input-titulo').value = song.titulo; document.getElementById('input-artista').value = song.artista;
    document.getElementById('input-tono').value = song.tonoOriginal; document.getElementById('input-letra').value = song.letra;
    document.getElementById('input-guitarra').value = song.guitarra || ""; document.getElementById('input-piano').value = song.piano || "";
    document.getElementById('song-modal').style.display = 'flex';
}

function cerrarModal() { document.getElementById('song-modal').style.display = 'none'; }

async function guardarCancionNube() {
    let idDoc = document.getElementById('edit-id').value;
    let titulo = document.getElementById('input-titulo').value.trim();
    let artista = document.getElementById('input-artista').value.trim();
    let tonoOriginal = document.getElementById('input-tono').value.trim().toUpperCase();
    let letra = document.getElementById('input-letra').value;
    let guitarra = document.getElementById('input-guitarra').value;
    let piano = document.getElementById('input-piano').value;

    if(!titulo || !letra) { alert("El Título y la Letra son obligatorios."); return; }
    let datosCancion = { titulo, artista, tonoOriginal, letra, guitarra, piano };

    if(!idDoc) await window.addDoc(window.collection(window.db, "canciones"), datosCancion);
    else await window.updateDoc(window.doc(window.db, "canciones", idDoc), datosCancion);
    cerrarModal();
}

async function eliminarCancionActual() {
    if(canciones.length <= 1) { alert("Debe quedar al menos una canción."); return; }
    let song = canciones[cancionActualIndex];
    if(confirm(`¿Estás seguro de eliminar "${song.titulo}" de la nube para todos?`)) {
        await window.deleteDoc(window.doc(window.db, "canciones", song.idDoc));
        cancionActualIndex = 0;
    }
}

function transponerAcorde(acorde, semitonos) {
    let match = acorde.match(/^([A-G][#b]?)(.*)$/);
    if (!match) return acorde;
    let raiz = match[1], sufijo = match[2];
    if (bemolesMap[raiz]) raiz = bemolesMap[raiz];
    let index = escala.indexOf(raiz);
    if (index === -1) return acorde;
    let nuevoIndex = (index + semitonos) % 12;
    if (nuevoIndex < 0) nuevoIndex += 12;
    return escala[nuevoIndex] + sufijo;
}

function calcularTonoActual() {
    let song = canciones[cancionActualIndex];
    if(!song) return "C";
    let index = escala.indexOf(song.tonoOriginal);
    if(index === -1) return song.tonoOriginal;
    let nuevoIndex = (index + semitonosDesplazados) % 12;
    if (nuevoIndex < 0) nuevoIndex += 12;
    return escala[nuevoIndex];
}

function esLineaDeAcordes(texto) {
    if (!texto || texto.trim() === "") return false;
    let t = texto.trim();
    if (t.startsWith('(') || t.startsWith('[')) return false;
    let palabras = t.split(/\s+/);
    if (palabras.length === 0) return false;
    let validos = 0;
    let regexAcorde = /^[A-G][#b]?(m|maj|min|dim|aug|sus|add)?[0-9]*(\/[A-G][#b]?)?$/i;
    for (let p of palabras) { if (regexAcorde.test(p)) validos++; }
    return (validos / palabras.length) >= 0.6;
}

function formatearLineaAcordesInteractiva(linea, semitonos) {
    let regex = /([A-G][#b]?(?:m|maj|min|dim|aug|sus|add)?(?:[0-9]*(?:\/[A-G][#b]?)?)?)/g;
    let resultadoHtml = "", ultimoIndice = 0, match;
    while ((match = regex.exec(linea)) !== null) {
        let acordeOriginal = match[1];
        resultadoHtml += escaparHtml(linea.substring(ultimoIndice, match.index));
        let acordeTranspuesto = transponerAcorde(acordeOriginal, semitonos);
        resultadoHtml += `<span class="clickable-chord" onclick="mostrarAcorde('${acordeTranspuesto}')">${acordeTranspuesto}</span>`;
        ultimoIndice = regex.lastIndex;
    }
    resultadoHtml += escaparHtml(linea.substring(ultimoIndice));
    return resultadoHtml;
}

function escaparHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/ /g, "&nbsp;");
}

function mostrarAcorde(acordeNombre) {
    document.getElementById('helper-chord-name').innerText = acordeNombre;
    document.getElementById('chord-helper-modal').style.display = 'flex';
    dibujarGuitarra(acordeNombre);
    dibujarPiano(acordeNombre);
}

function cerrarModalAcorde(e) { document.getElementById('chord-helper-modal').style.display = 'none'; }

const posicionesGuitarra = {
    'C': { pos: [-1, 3, 2, 0, 1, 0] },
    'C7': { pos: [-1, 3, 2, 3, 1, 0] },
    'Cm': { pos: [-1, 3, 5, 5, 4, 3], cejilla: { traste: 3, cuerdaInicio: 1, cuerdaFin: 5 } },
    'Cm7': { pos: [-1, 3, 5, 3, 4, 3], cejilla: { traste: 3, cuerdaInicio: 1, cuerdaFin: 5 } },
    'Cmaj7': { pos: [-1, 3, 2, 0, 0, 0] },
    'C#': { pos: [-1, 4, 3, 1, 2, 1], cejilla: { traste: 1, cuerdaInicio: 1, cuerdaFin: 5 } },
    'C#m': { pos: [-1, 4, 6, 6, 5, 4], cejilla: { traste: 4, cuerdaInicio: 1, cuerdaFin: 5 } },
    'D': { pos: [-1, -1, 0, 2, 3, 2] },
    'D7': { pos: [-1, -1, 0, 2, 1, 2] },
    'Dm': { pos: [-1, -1, 0, 2, 3, 1] },
    'Dm7': { pos: [-1, -1, 0, 2, 1, 1] },
    'Dmaj7': { pos: [-1, -1, 0, 2, 2, 2] },
    'Dsus4': { pos: [-1, -1, 0, 2, 3, 3] },
    'D#': { pos: [-1, -1, 1, 3, 4, 3], cejilla: { traste: 1, cuerdaInicio: 2, cuerdaFin: 5 } },
    'D#m': { pos: [-1, -1, 1, 3, 4, 2], cejilla: { traste: 1, cuerdaInicio: 2, cuerdaFin: 5 } },
    'E': { pos: [0, 2, 2, 1, 0, 0] },
    'E7': { pos: [0, 2, 0, 1, 0, 0] },
    'Em': { pos: [0, 2, 2, 0, 0, 0] },
    'Em7': { pos: [0, 2, 0, 0, 0, 0] },
    'Emaj7': { pos: [0, 2, 1, 1, 0, 0] },
    'Esus4': { pos: [0, 2, 2, 2, 0, 0] },
    'F': { pos: [1, 3, 3, 2, 1, 1], cejilla: { traste: 1, cuerdaInicio: 0, cuerdaFin: 5 } },
    'F7': { pos: [1, 3, 1, 2, 1, 1], cejilla: { traste: 1, cuerdaInicio: 0, cuerdaFin: 5 } },
    'Fm': { pos: [1, 3, 3, 1, 1, 1], cejilla: { traste: 1, cuerdaInicio: 0, cuerdaFin: 5 } },
    'Fm7': { pos: [1, 3, 1, 1, 1, 1], cejilla: { traste: 1, cuerdaInicio: 0, cuerdaFin: 5 } },
    'Fmaj7': { pos: [-1, -1, 3, 2, 1, 0] },
    'F#': { pos: [2, 4, 4, 3, 2, 2], cejilla: { traste: 2, cuerdaInicio: 0, cuerdaFin: 5 } },
    'F#m': { pos: [2, 4, 4, 2, 2, 2], cejilla: { traste: 2, cuerdaInicio: 0, cuerdaFin: 5 } },
    'F#m7': { pos: [2, 4, 2, 2, 2, 2], cejilla: { traste: 2, cuerdaInicio: 0, cuerdaFin: 5 } },
    'G': { pos: [3, 2, 0, 0, 3, 3] },
    'G7': { pos: [3, 2, 0, 0, 0, 1] },
    'Gm': { pos: [3, 5, 5, 3, 3, 3], cejilla: { traste: 3, cuerdaInicio: 0, cuerdaFin: 5 } },
    'Gm7': { pos: [3, 5, 3, 3, 3, 3], cejilla: { traste: 3, cuerdaInicio: 0, cuerdaFin: 5 } },
    'Gmaj7': { pos: [3, 2, 0, 0, 0, 2] },
    'G#': { pos: [4, 6, 6, 5, 4, 4], cejilla: { traste: 4, cuerdaInicio: 0, cuerdaFin: 5 } },
    'G#m': { pos: [4, 6, 6, 4, 4, 4], cejilla: { traste: 4, cuerdaInicio: 0, cuerdaFin: 5 } },
    'A': { pos: [-1, 0, 2, 2, 2, 0] },
    'A7': { pos: [-1, 0, 2, 0, 2, 0] },
    'Am': { pos: [-1, 0, 2, 2, 1, 0] },
    'Am7': { pos: [-1, 0, 2, 0, 1, 0] },
    'Amaj7': { pos: [-1, 0, 2, 1, 2, 0] },
    'Asus4': { pos: [-1, 0, 2, 2, 3, 0] },
    'A#': { pos: [-1, 1, 3, 3, 3, 1], cejilla: { traste: 1, cuerdaInicio: 1, cuerdaFin: 5 } },
    'A#m': { pos: [-1, 1, 3, 3, 2, 1], cejilla: { traste: 1, cuerdaInicio: 1, cuerdaFin: 5 } },
    'Bb': { pos: [-1, 1, 3, 3, 3, 1], cejilla: { traste: 1, cuerdaInicio: 1, cuerdaFin: 5 } },
    'Bbm': { pos: [-1, 1, 3, 3, 2, 1], cejilla: { traste: 1, cuerdaInicio: 1, cuerdaFin: 5 } },
    'B': { pos: [-1, 2, 4, 4, 4, 2], cejilla: { traste: 2, cuerdaInicio: 1, cuerdaFin: 5 } },
    'B7': { pos: [-1, 2, 1, 2, 0, 2] },
    'Bm': { pos: [-1, 2, 4, 4, 3, 2], cejilla: { traste: 2, cuerdaInicio: 1, cuerdaFin: 5 } },
    'Bm7': { pos: [-1, 2, 4, 2, 3, 2], cejilla: { traste: 2, cuerdaInicio: 1, cuerdaFin: 5 } }
};

function dibujarGuitarra(acorde) {
    const canvas = document.getElementById('guitar-canvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    let acordeBase = acorde.split('/')[0];
    let match = acordeBase.match(/^([A-G][#b]?)(.*)$/i);
    let datosAcorde = { pos: [-1, 3, 2, 0, 1, 0] };
    
    if (match) {
        let raizStr = match[1].charAt(0).toUpperCase() + match[1].slice(1);
        if (bemolesMap[raizStr]) raizStr = bemolesMap[raizStr];
        let sufijo = match[2];
        datosAcorde = posicionesGuitarra[raizStr + sufijo] || posicionesGuitarra[raizStr] || datosAcorde;
    }
    
    let pos = datosAcorde.pos;
    let cejilla = datosAcorde.cejilla;
    let startX = 35, startY = 40, stringSpacing = 22, fretSpacing = 32;
    
    let trastesValidos = pos.filter(p => p > 0);
    if (cejilla) trastesValidos.push(cejilla.traste);
    let trasteMinimo = trastesValidos.length > 0 ? Math.min(...trastesValidos) : 1;
    let baseFret = trasteMinimo > 2 ? trasteMinimo : 1;
    
    ctx.strokeStyle = '#9ca3af'; 
    ctx.lineWidth = (baseFret === 1) ? 4 : 1.5;
    ctx.beginPath(); 
    ctx.moveTo(startX, startY); 
    ctx.lineTo(startX + 5 * stringSpacing, startY); 
    ctx.stroke();

    if (baseFret > 1) {
        ctx.font = '11px sans-serif';
        ctx.fillStyle = '#9ca3af';
        ctx.textAlign = 'right';
        ctx.fillText(baseFret + 'fr', startX - 8, startY + 12);
    }
    
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 6; i++) {
        let x = startX + i * stringSpacing;
        ctx.beginPath(); ctx.moveTo(x, startY); ctx.lineTo(x, startY + 5 * fretSpacing); ctx.stroke();
    }
    
    for (let f = 1; f <= 5; f++) {
        let y = startY + f * fretSpacing;
        ctx.beginPath(); ctx.moveTo(startX, y); ctx.lineTo(startX + 5 * stringSpacing, y); ctx.stroke();
    }
    
    if (cejilla) {
        let relTraste = cejilla.traste - baseFret + 1;
        if (relTraste >= 1 && relTraste <= 5) {
            let xInicio = startX + cejilla.cuerdaInicio * stringSpacing;
            let xFin = startX + cejilla.cuerdaFin * stringSpacing;
            let yCejilla = startY + (relTraste - 0.5) * fretSpacing;
            
            ctx.beginPath();
            ctx.lineCap = "round";
            ctx.lineWidth = 14;
            ctx.moveTo(xInicio, yCejilla);
            ctx.lineTo(xFin, yCejilla);
            ctx.strokeStyle = '#38bdf8';
            ctx.stroke();
            ctx.lineCap = "butt";
        }
    }

    ctx.font = '14px sans-serif'; ctx.textAlign = 'center';

    pos.forEach((traste, cuerda) => {
        let x = startX + cuerda * stringSpacing;
        if (traste === -1) { 
            ctx.fillStyle = '#9ca3af'; ctx.fillText('x', x, startY - 12); 
        }
        else if (traste === 0) { 
            if (baseFret === 1) {
                ctx.fillStyle = '#9ca3af'; ctx.fillText('o', x, startY - 12); 
            }
        }
        else if (traste > 0) { 
            let relTraste = traste - baseFret + 1;
            if (relTraste >= 1 && relTraste <= 5) {
                if (cejilla && cejilla.traste === traste && cuerda >= cejilla.cuerdaInicio && cuerda <= cejilla.cuerdaFin) {
                    return; 
                }
                let y = startY + (relTraste - 0.5) * fretSpacing;
                ctx.beginPath(); ctx.arc(x, y, 7, 0, 2 * Math.PI); 
                ctx.fillStyle = '#38bdf8'; ctx.fill();
            }
        }
    });
}

function obtenerNotasAcorde(acordeNombre) {
    let baseChord = acordeNombre.split('/')[0];
    let match = baseChord.match(/^([A-G][#b]?)(.*)$/i);
    if (!match) return [0, 4, 7]; 

    let raizStr = match[1];
    let sufijo = match[2].toLowerCase();

    raizStr = raizStr.charAt(0).toUpperCase() + raizStr.slice(1);
    if (bemolesMap[raizStr]) raizStr = bemolesMap[raizStr];

    const notasBase = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    let rootIdx = notasBase.indexOf(raizStr);
    if (rootIdx === -1) return [0, 4, 7];

    let intervalos = [];
    switch(sufijo) {
        case '': intervalos = [0, 4, 7]; break;
        case 'm':
        case 'min': intervalos = [0, 3, 7]; break;
        case '+5':
        case 'aug': intervalos = [0, 4, 8]; break;
        case '7': intervalos = [0, 4, 7, 10]; break;
        case 'm7': intervalos = [0, 3, 7, 10]; break;
        case 'm7(b5)':
        case 'm7b5': intervalos = [0, 3, 6, 10]; break;
        case 'dim': intervalos = [0, 3, 6]; break;
        case 'dim7': intervalos = [0, 3, 6, 9]; break;
        case 'maj7': intervalos = [0, 4, 7, 11]; break;
        case '9': intervalos = [0, 4, 7, 10, 14]; break;
        case 'sus4':
        case 'sus': intervalos = [0, 5, 7]; break;
        case 'sus2': intervalos = [0, 2, 7]; break;
        default: intervalos = [0, 4, 7];
    }
    return intervalos.map(i => rootIdx + i);
}

function dibujarPiano(acorde) {
    const canvas = document.getElementById('piano-canvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    let notasActivas = obtenerNotasAcorde(acorde);
    let whiteKeys = 21, keyWidth = 22, keyHeight = 120, startX = 10, startY = 30;
    
    let whiteNotesMap = [];
    const isWhite = [true, false, true, false, true, true, false, true, false, true, false, true];
    for (let i = 0; i < 36; i++) {
        if (isWhite[i % 12]) whiteNotesMap.push(i);
    }

    ctx.textAlign = "center"; ctx.font = "11px sans-serif"; ctx.lineWidth = 1;

    for (let i = 0; i < whiteKeys; i++) {
        let x = startX + i * keyWidth;
        let notaVal = whiteNotesMap[i];
        let activa = notasActivas.includes(notaVal);
        
        ctx.fillStyle = activa ? '#38bdf8' : '#ffffff';
        ctx.fillRect(x, startY, keyWidth, keyHeight);
        ctx.strokeStyle = '#374151'; 
        ctx.strokeRect(x, startY, keyWidth, keyHeight);

        if (activa) {
            ctx.fillStyle = '#000000';
            ctx.fillText(notasPianoNombres[notaVal % 12], x + keyWidth / 2, startY + keyHeight - 15);
        }
    }

    let blackKeysInfo = [];
    let whiteIdxCount = 0;
    for (let i = 0; i < 36; i++) {
        if (isWhite[i % 12]) whiteIdxCount++;
        else blackKeysInfo.push({ idx: whiteIdxCount - 1, val: i });
    }

    let blackWidth = 14, blackHeight = 75;
    blackKeysInfo.forEach(bk => {
        let x = startX + bk.idx * keyWidth + keyWidth - (blackWidth / 2);
        let activa = notasActivas.includes(bk.val);

        ctx.fillStyle = activa ? '#0284c7' : '#1f2937';
        ctx.fillRect(x, startY, blackWidth, blackHeight);

        if (activa) {
            ctx.fillStyle = '#ffffff';
            ctx.fillText(notasPianoNombres[bk.val % 12], x + blackWidth / 2, startY + blackHeight - 10);
        }
    });
}

function renderizar() {
    if(canciones.length === 0) return;
    let song = canciones[cancionActualIndex];
    document.getElementById('title').innerText = song.titulo;
    document.getElementById('artist').innerText = song.artista || "";
    document.getElementById('current-tone').innerText = calcularTonoActual();

    let contenedor = document.getElementById('content-display');
    contenedor.innerHTML = "";

    if (vistaActual === 'guitarra') {
        let preTab = document.createElement('div');
        preTab.className = 'instrument-view';
        preTab.innerText = song.guitarra || "No hay tablatura disponible.";
        contenedor.appendChild(preTab);
    } else if (vistaActual === 'piano') {
        let prePiano = document.createElement('div');
        prePiano.className = 'instrument-view';
        prePiano.innerText = song.piano || "No hay notas de piano disponibles.";
        contenedor.appendChild(prePiano);
    } else {
        let lineas = song.letra.split('\n');
        for (let i = 0; i < lineas.length; i++) {
            let lineaTexto = lineas[i];
            let div = document.createElement('div');
            let trimmed = lineaTexto.trim();

            if ((trimmed.startsWith('(') && trimmed.endsWith(')')) || (trimmed.toLowerCase().includes('coro') && trimmed.length < 20)) {
                div.className = 'song-section';
                div.innerText = lineaTexto;
                contenedor.appendChild(div);
                continue;
            }

            if (trimmed === "") {
                div.style.height = "12px";
                contenedor.appendChild(div);
                continue;
            }

            if (esLineaDeAcordes(lineaTexto)) {
                div.className = 'chord-line';
                div.innerHTML = formatearLineaAcordesInteractiva(lineaTexto, semitonosDesplazados);
            } else {
                div.className = 'lyric-line';
                div.innerText = lineaTexto;
            }
            contenedor.appendChild(div);
        }
    }
}
