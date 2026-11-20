/* ==========================================================================
   Difusión de resultados - Disponibilidad de insumos en sanitarios (FIEC, UV)
   JavaScript sin framework. Librerías externas: Chart.js 4.4.1 y jStat 1.9.6.
   La página NO captura datos: solo lee un CSV y calcula con las fórmulas del
   protocolo (Módulo VI, sección 6.2).
   ========================================================================== */
(function (global) {
  'use strict';

  /* ------------------------------------------------------------------------
     1. CONSTANTES EDITABLES
     ------------------------------------------------------------------------ */

  // Franjas horarias válidas de las rondas de medición.
  var FRANJAS = ['08:00', '10:00', '12:00', '14:00'];

  // Insumos medidos (clave interna -> etiqueta visible).
  var INSUMOS = ['agua', 'papel', 'jabon'];
  var ETIQUETA = { agua: 'Agua', papel: 'Papel', jabon: 'Jabón', idsi: 'IDSI' };

  // Franjas consideradas recesos / cambios de clase para la Hipótesis 1.
  // [PENDIENTE: confirmar con el horario real de la FIEC]
  var RECESOS = ['10:00', '12:00'];

  // Umbrales de clasificación según el IDSI (criterio propuesto por el equipo).
  // Se evalúan de mayor a menor; "min" es el valor mínimo (%) del nivel.
  var NIVELES = [
    { clave: 'optimo',     nombre: 'Óptimo',     min: 90, icono: '✔', rango: '90 % o más' },
    { clave: 'aceptable',  nombre: 'Aceptable',  min: 70, icono: '◆', rango: '70 a 89.9 %' },
    { clave: 'deficiente', nombre: 'Deficiente', min: 50, icono: '▲', rango: '50 a 69.9 %' },
    { clave: 'critico',    nombre: 'Crítico',    min: -Infinity, icono: '✖', rango: 'menos de 50 %' }
  ];

  // Nivel de significancia de todas las pruebas.
  var ALFA = 0.05;

  // Umbral de advertencia: DE mayor a este porcentaje de la media.
  var UMBRAL_DE_PORC = 10;

  // Columnas exactas del CSV (orden y nombres).
  var COLUMNAS = ['Id del reporte', 'Fecha', 'Hora', 'Edificio', 'Planta',
    'Genero sanitario', 'Disponibilidad agua', 'Disponibilidad papel', 'Disponibilidad jabón'];

  // Si es true, el archivo data/matriz_maestra.csv se etiqueta "DATOS REALES".
  // Los CSV elegidos con el botón "Cargar CSV" siempre se etiquetan como reales.
  var DATOS_REALES_EN_ARCHIVO = true;

  // Referencias tomadas tal cual de la sección "Referencias" del documento de la
  // Práctica 3 (orden alfabético). Una cadena por referencia.
  var REFERENCIAS = [
    "Cohen, J. (1960). A coefficient of agreement for nominal scales. Educational and Psychological Measurement, 20(1), 37–46. https://doi.org/10.1177/001316446002000104",
    "Curtis, V., & Cairncross, S. (2003). Effect of washing hands with soap on diarrhoea risk in the community: A systematic review. The Lancet Infectious Diseases, 3(5), 275–281. https://doi.org/10.1016/S1473-3099(03)00606-6",
    "Darley, J. M., & Latané, B. (1968). Bystander intervention in emergencies: Diffusion of responsibility. Journal of Personality and Social Psychology, 8(4, Pt.1), 377–383. https://doi.org/10.1037/h0025589",
    "Fischer, P., Krueger, J. I., Greitemeyer, T., Vogrincic, C., Kastenmüller, A., Frey, D., Heene, M., Wicher, M., & Kainbacher, M. (2011). The bystander-effect: A meta-analytic review on bystander intervention in dangerous and non-dangerous emergencies. Psychological Bulletin, 137(4), 517–537. https://doi.org/10.1037/a0023304",
    "Freeman, M. C., Stocks, M. E., Cumming, O., Jeandron, A., Higgins, J. P. T., Wolf, J., Prüss-Ustün, A., Bonjour, S., Hunter, P. R., Fewtrell, L., & Curtis, V. (2014). Hygiene and health: Systematic review of handwashing practices worldwide and update of health effects. Tropical Medicine & International Health, 19(8), 906–916. https://doi.org/10.1111/tmi.12339",
    "Hernández Sampieri, R., Fernández Collado, C., & Baptista Lucio, P. (2014). Metodología de la investigación (6.ª ed.). McGraw-Hill Education.",
    "International Organization for Standardization. (2018). Facility management — Management systems — Requirements with guidance for use (ISO 41001:2018). https://www.iso.org/standard/68021.html",
    "Jasper, C., Le, T.-T., & Bartram, J. (2012). Water and sanitation in schools: A systematic review of the health and educational outcomes. International Journal of Environmental Research and Public Health, 9(8), 2772–2787. https://doi.org/10.3390/ijerph9082772",
    "Joint Task Force on Computing Curricula, Association for Computing Machinery & IEEE Computer Society. (2020). Computing curricula 2020: Paradigms for global computing education. ACM. https://doi.org/10.1145/3467967",
    "Kok, H. B., Mobach, M., & Omta, O. (2011). The added value of facility management in the educational environment. Journal of Facilities Management, 9(4), 249–265. https://doi.org/10.1108/14725961111170662",
    "Landis, J. R., & Koch, G. G. (1977). The measurement of observer agreement for categorical data. Biometrics, 33(1), 159–174. https://doi.org/10.2307/2529310",
    "Lawson, A., & Vaganay-Miller, M. (2019). The effectiveness of a poster intervention on hand hygiene practice and compliance when using public restrooms in a university setting. International Journal of Environmental Research and Public Health, 16(24), 5036. https://doi.org/10.3390/ijerph16245036",
    "OECD. (2015). Frascati manual 2015: Guidelines for collecting and reporting data on research and experimental development. OECD Publishing. https://doi.org/10.1787/9789264239012-en",
    "UNICEF & World Health Organization. (2018). Drinking water, sanitation and hygiene in schools: Global baseline report 2018. https://data.unicef.org/resources/wash-in-schools/",
    "Universidad Veracruzana, Coordinación Universitaria para la Sustentabilidad. (2010). Plan Maestro para la Sustentabilidad. https://www.uv.mx/cosustenta/noticias/cartel-planmas/",
    "Wickham, H. (2014). Tidy data. Journal of Statistical Software, 59(10), 1–23. https://doi.org/10.18637/jss.v059.i10",
    "World Health Organization. (2009). WHO guidelines on hand hygiene in health care. WHO Press. https://www.who.int/publications/i/item/9789241597906"
  ];

  var TITULO_PROYECTO = 'Estudio descriptivo de disponibilidad de insumos en sanitarios (agua, papel y jabón) ' +
    'en la Facultad de Ingeniería Electrónica y Comunicaciones: durante el periodo octubre-noviembre del 2026 ' +
    'mediante mediciones presenciales';

  // Diccionario de datos de las 9 columnas.
  var DICCIONARIO = [
    ['Id del reporte', 'Entero', 'Número consecutivo del registro.'],
    ['Fecha', 'Fecha AAAA-MM-DD', 'Día de la medición (al importar también se acepta DD/MM/AAAA).'],
    ['Hora', 'Texto HH:MM', 'Franja de la ronda: 08:00, 10:00, 12:00 o 14:00.'],
    ['Edificio', 'Texto', 'Edificio inspeccionado ("A").'],
    ['Planta', 'Texto', 'Nivel inspeccionado ("Alta").'],
    ['Genero sanitario', 'Texto', '"Hombres" o "Mujeres".'],
    ['Disponibilidad agua', '0 / 1', '1 = disponible, 0 = agotado.'],
    ['Disponibilidad papel', '0 / 1', '1 = disponible, 0 = agotado.'],
    ['Disponibilidad jabón', '0 / 1', '1 = disponible, 0 = agotado.']
  ];

  /* ------------------------------------------------------------------------
     2. LECTURA Y VALIDACIÓN DEL CSV
     ------------------------------------------------------------------------ */

  // Lee texto CSV (separador coma, comillas dobles, BOM) y devuelve filas de campos.
  function parsearCSV(texto) {
    if (texto.charCodeAt(0) === 0xFEFF) texto = texto.slice(1);
    var filas = [], fila = [], campo = '', enComillas = false, i, c;
    for (i = 0; i < texto.length; i++) {
      c = texto[i];
      if (enComillas) {
        if (c === '"') {
          if (texto[i + 1] === '"') { campo += '"'; i++; } else { enComillas = false; }
        } else { campo += c; }
      } else if (c === '"') { enComillas = true; }
      else if (c === ',') { fila.push(campo); campo = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && texto[i + 1] === '\n') i++;
        fila.push(campo); filas.push(fila); fila = []; campo = '';
      } else { campo += c; }
    }
    if (campo !== '' || fila.length) { fila.push(campo); filas.push(fila); }
    // Se descartan líneas totalmente vacías.
    return filas.filter(function (f) { return f.some(function (x) { return x.trim() !== ''; }); });
  }

  // Convierte AAAA-MM-DD o DD/MM/AAAA a AAAA-MM-DD; devuelve null si no es válida.
  function normalizarFecha(s) {
    var m, d, mes, a;
    s = s.trim();
    if ((m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s))) { a = +m[1]; mes = +m[2]; d = +m[3]; }
    else if ((m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s))) { d = +m[1]; mes = +m[2]; a = +m[3]; }
    else return null;
    var f = new Date(Date.UTC(a, mes - 1, d));
    if (f.getUTCFullYear() !== a || f.getUTCMonth() !== mes - 1 || f.getUTCDate() !== d) return null;
    return a + '-' + ('0' + mes).slice(-2) + '-' + ('0' + d).slice(-2);
  }

  // Normaliza horas como "8:00" a "08:00".
  function normalizarHora(s) {
    var m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
    return m ? ('0' + m[1]).slice(-2) + ':' + m[2] : null;
  }

  function sinAcentos(s) {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  }

  /* Valida las filas. Devuelve:
     { fatal: texto|null, registros: [...válidos], errores: [textos],
       excluidos: n, total: n filas de datos } */
  function validarCSV(filas) {
    var res = { fatal: null, registros: [], errores: [], excluidos: 0, total: 0 };
    if (!filas.length) { res.fatal = 'El archivo está vacío.'; return res; }
    var enc = filas[0].map(function (x) { return x.trim(); });
    var faltan = COLUMNAS.filter(function (c) { return enc.indexOf(c) === -1; });
    if (faltan.length) {
      res.fatal = 'Faltan columnas o los nombres no coinciden con los exactos: ' + faltan.join(', ') +
        '. Las columnas esperadas, en orden, son: ' + COLUMNAS.join(', ') + '.';
      return res;
    }
    if (enc.length !== COLUMNAS.length || COLUMNAS.some(function (c, i) { return enc[i] !== c; })) {
      res.errores.push('Aviso: las columnas no están en el orden esperado o hay columnas adicionales; se leyeron por nombre.');
    }
    var idx = {};
    COLUMNAS.forEach(function (c) { idx[c] = enc.indexOf(c); });
    var ids = {};
    for (var r = 1; r < filas.length; r++) {
      var f = filas[r], n = r + 1, motivos = [], incompleto = false;
      res.total++;
      var v = {};
      COLUMNAS.forEach(function (c) { v[c] = (f[idx[c]] === undefined ? '' : f[idx[c]]).trim(); });
      COLUMNAS.forEach(function (c) { if (v[c] === '') incompleto = true; });
      if (incompleto) {
        res.excluidos++;
        res.errores.push('Fila ' + n + ': registro incompleto (hay campos vacíos); se excluye del cálculo.');
        continue;
      }
      var fecha = normalizarFecha(v['Fecha']);
      if (!fecha) motivos.push('fecha no válida ("' + v['Fecha'] + '"; use AAAA-MM-DD o DD/MM/AAAA)');
      var hora = normalizarHora(v['Hora']);
      if (!hora || FRANJAS.indexOf(hora) === -1) motivos.push('hora no válida ("' + v['Hora'] + '"; use 08:00, 10:00, 12:00 o 14:00)');
      var gen = null;
      if (sinAcentos(v['Genero sanitario']) === 'hombres') gen = 'Hombres';
      else if (sinAcentos(v['Genero sanitario']) === 'mujeres') gen = 'Mujeres';
      else motivos.push('género sanitario no válido ("' + v['Genero sanitario'] + '"; use Hombres o Mujeres)');
      var disp = {};
      ['Disponibilidad agua', 'Disponibilidad papel', 'Disponibilidad jabón'].forEach(function (c, k) {
        if (v[c] === '0' || v[c] === '1') disp[INSUMOS[k]] = +v[c];
        else motivos.push('"' + c + '" debe valer 0 o 1 (se encontró "' + v[c] + '")');
      });
      var id = v['Id del reporte'];
      if (ids[id]) motivos.push('Id del reporte repetido (' + id + ')');
      ids[id] = true;
      if (motivos.length) {
        res.excluidos++;
        res.errores.push('Fila ' + n + ': ' + motivos.join('; ') + '. Se excluye del cálculo.');
        continue;
      }
      res.registros.push({
        id: id, fecha: fecha, hora: hora, edificio: v['Edificio'], planta: v['Planta'], genero: gen,
        agua: disp.agua, papel: disp.papel, jabon: disp.jabon,
        idsi: disp.agua * disp.papel * disp.jabon
      });
    }
    if (!res.registros.length) res.fatal = 'No hay ningún registro válido para calcular.';
    return res;
  }

  /* ------------------------------------------------------------------------
     3. INDICADORES DEL PROTOCOLO (fórmulas 6.2)
     ------------------------------------------------------------------------ */

  // f(k) = Σ (1 − V(k,j)) sobre el conjunto de inspecciones dado.
  function frecuenciaF(regs, k) {
    return regs.reduce(function (s, r) { return s + (1 - r[k]); }, 0);
  }
  // h(k) = f(k) / N
  function frecuenciaH(regs, k) { return regs.length ? frecuenciaF(regs, k) / regs.length : NaN; }
  // P(k) = h(k) × 100
  function porcentajeP(regs, k) { return frecuenciaH(regs, k) * 100; }
  // IDSI = [Σ V(agua)·V(papel)·V(jabón) / N] × 100
  function idsi(regs) {
    if (!regs.length) return NaN;
    var s = regs.reduce(function (a, r) { return a + r.agua * r.papel * r.jabon; }, 0);
    return (s / regs.length) * 100;
  }
  // λ(h) = [Σ_d f(k,h,d)] / D : faltas promedio por día en la franja h.
  function lambdaH(regs, k, hora, D) {
    var sub = regs.filter(function (r) { return r.hora === hora; });
    return D ? frecuenciaF(sub, k) / D : NaN;
  }

  function diasDistintos(regs) {
    var o = {}; regs.forEach(function (r) { o[r.fecha] = 1; });
    return Object.keys(o).sort();
  }
  function filtrar(regs, campo, valor) {
    return regs.filter(function (r) { return r[campo] === valor; });
  }

  // Clasifica un valor de IDSI (%) con los umbrales editables.
  function clasificar(valor) {
    if (valor === null || valor === undefined || isNaN(valor)) return null;
    for (var i = 0; i < NIVELES.length; i++) if (valor >= NIVELES[i].min) return NIVELES[i];
    return NIVELES[NIVELES.length - 1];
  }

  // Resumen completo de indicadores de un subconjunto de registros.
  function resumen(regs, D) {
    var o = { N: regs.length, idsi: idsi(regs), P: {}, f: {}, lambda: {}, lambdaTotal: 0 };
    INSUMOS.forEach(function (k) {
      o.f[k] = frecuenciaF(regs, k);
      o.P[k] = porcentajeP(regs, k);
    });
    return o;
  }

  // Indicadores por sanitario × franja (λ calculada con D días).
  function matrizEspacioTemporal(regs, D) {
    var generos = ['Hombres', 'Mujeres'], filas = [];
    generos.forEach(function (g) {
      FRANJAS.forEach(function (h) {
        var sub = regs.filter(function (r) { return r.genero === g && r.hora === h; });
        var f = { genero: g, hora: h, N: sub.length, idsi: idsi(sub), P: {}, lambda: {}, lambdaTotal: 0 };
        INSUMOS.forEach(function (k) {
          f.P[k] = porcentajeP(sub, k);
          f.lambda[k] = D ? frecuenciaF(sub, k) / D : NaN;
          f.lambdaTotal += f.lambda[k];
        });
        filas.push(f);
      });
    });
    return filas;
  }

  // Indicadores por franja sobre ambos sanitarios, con λ(h) por insumo.
  function porFranja(regs, D) {
    return FRANJAS.map(function (h) {
      var sub = filtrar(regs, 'hora', h);
      var f = { hora: h, N: sub.length, idsi: idsi(sub), P: {}, lambda: {}, lambdaTotal: 0 };
      INSUMOS.forEach(function (k) {
        f.P[k] = porcentajeP(sub, k);
        f.lambda[k] = lambdaH(regs, k, h, D);
        f.lambdaTotal += f.lambda[k];
      });
      return f;
    });
  }

  // Ranking de franjas más vulnerables: mayor λ total (suma de los tres insumos);
  // empata por menor IDSI.
  function rankingFranjas(filas) {
    return filas.slice().sort(function (a, b) {
      if (b.lambdaTotal !== a.lambdaTotal) return b.lambdaTotal - a.lambdaTotal;
      return a.idsi - b.idsi;
    });
  }

  /* ------------------------------------------------------------------------
     4. ESTADÍSTICA DESCRIPTIVA (10 mediciones por variable)
     ------------------------------------------------------------------------ */

  // Mediciones: % diario de disponibilidad por sanitario (días × 2 sanitarios).
  function medicionesDiarias(regs, variable) {
    var grupos = {}, out = [];
    regs.forEach(function (r) {
      var key = r.fecha + '|' + r.genero;
      (grupos[key] = grupos[key] || []).push(r);
    });
    Object.keys(grupos).sort().forEach(function (key) {
      var g = grupos[key], p = key.split('|');
      var disponibles = g.reduce(function (s, r) { return s + r[variable]; }, 0);
      var faltas = g.filter(function (r) { return r[variable] === 0; })
        .map(function (r) { return r.hora; }).sort();
      out.push({ fecha: p[0], genero: p[1], valor: (disponibles / g.length) * 100, faltas: faltas, n: g.length });
    });
    return out;
  }

  function media(a) { return a.reduce(function (s, x) { return s + x; }, 0) / a.length; }
  function desvEst(a) {
    if (a.length < 2) return NaN;
    var m = media(a);
    return Math.sqrt(a.reduce(function (s, x) { return s + (x - m) * (x - m); }, 0) / (a.length - 1));
  }
  // Cuantil con interpolación lineal.
  function cuantil(ordenado, q) {
    var pos = (ordenado.length - 1) * q, b = Math.floor(pos), r = pos - b;
    return ordenado[b + 1] !== undefined ? ordenado[b] + r * (ordenado[b + 1] - ordenado[b]) : ordenado[b];
  }

  /* Estadísticas de una variable:
     media, DE muestral, error absoluto (error estándar = DE/√n), error relativo
     (error absoluto / media × 100), mínimo y máximo con fecha, sanitario y horas
     de faltas, y casos atípicos por la regla de 1.5 × RIC. */
  function estadisticas(mediciones) {
    var vals = mediciones.map(function (m) { return m.valor; });
    var n = vals.length;
    var o = { n: n, media: media(vals), de: desvEst(vals) };
    o.errAbs = isNaN(o.de) ? NaN : o.de / Math.sqrt(n);
    o.errRel = o.media > 0 ? (o.errAbs / o.media) * 100 : NaN;
    o.deSobreMedia = o.media > 0 ? (o.de / o.media) * 100 : NaN;
    o.advertencia = o.media > 0 && o.de > (UMBRAL_DE_PORC / 100) * o.media;
    var imin = 0, imax = 0;
    mediciones.forEach(function (m, i) {
      if (m.valor < mediciones[imin].valor) imin = i;
      if (m.valor > mediciones[imax].valor) imax = i;
    });
    o.min = mediciones[imin]; o.max = mediciones[imax];
    var ord = vals.slice().sort(function (a, b) { return a - b; });
    var q1 = cuantil(ord, 0.25), q3 = cuantil(ord, 0.75), ric = q3 - q1;
    o.q1 = q1; o.q3 = q3;
    o.atipicos = mediciones.filter(function (m) {
      return m.valor < q1 - 1.5 * ric || m.valor > q3 + 1.5 * ric;
    });
    return o;
  }

  /* ------------------------------------------------------------------------
     5. PRUEBAS DE HIPÓTESIS (α = 0.05; p-valores con jStat)
     ------------------------------------------------------------------------ */

  function jst() { return global.jStat; }

  function noCalculable(nombre, motivo, extra) {
    var o = { nombre: nombre, calculable: false, motivo: motivo };
    for (var k in extra) o[k] = extra[k];
    return o;
  }

  // Prueba t de Student para dos muestras independientes (varianzas iguales).
  function pruebaT(g1, g2, etiqueta1, etiqueta2, variable) {
    var base = {
      h0: 'Las medias del porcentaje diario de disponibilidad de ' + variable + ' son iguales entre ' + etiqueta1 + ' y ' + etiqueta2 + ' (μ1 = μ2).',
      h1: 'Las medias de ' + etiqueta1 + ' y ' + etiqueta2 + ' son distintas (μ1 ≠ μ2).'
    };
    if (g1.length < 2 || g2.length < 2) return noCalculable('t de Student', 'Se necesitan al menos 2 mediciones por grupo.', base);
    var n1 = g1.length, n2 = g2.length, m1 = media(g1), m2 = media(g2);
    var v1 = Math.pow(desvEst(g1), 2), v2 = Math.pow(desvEst(g2), 2);
    var gl = n1 + n2 - 2;
    var sp2 = ((n1 - 1) * v1 + (n2 - 1) * v2) / gl;
    var ee = Math.sqrt(sp2 * (1 / n1 + 1 / n2)), t, p;
    if (ee === 0) {
      if (m1 === m2) { t = 0; p = 1; } else { t = m1 > m2 ? Infinity : -Infinity; p = 0; }
    } else {
      t = (m1 - m2) / ee;
      p = 2 * (1 - jst().studentt.cdf(Math.abs(t), gl));
    }
    var rech = p < ALFA;
    base.nombre = 't de Student'; base.calculable = true;
    base.estadistico = 't(' + gl + ') = ' + fmt(t, 3); base.p = p; base.rechaza = rech;
    base.detalle = etiqueta1 + ': media ' + fmt(m1, 1) + ' % (n = ' + n1 + '); ' + etiqueta2 + ': media ' + fmt(m2, 1) + ' % (n = ' + n2 + ').';
    base.interpretacion = rech
      ? 'Hay diferencia estadísticamente significativa entre ' + etiqueta1 + ' y ' + etiqueta2 + ' en ' + variable + '.'
      : 'No hay evidencia suficiente de diferencia entre ' + etiqueta1 + ' y ' + etiqueta2 + ' en ' + variable + '.';
    return base;
  }

  // ANOVA de un factor: disponibilidad (0/1) por franja horaria.
  function pruebaAnova(regs, variable) {
    var base = {
      nombre: 'ANOVA de un factor (franja horaria)',
      h0: 'La disponibilidad de ' + variable + ' tiene la misma media en las cuatro franjas horarias.',
      h1: 'Al menos una franja tiene una media de disponibilidad distinta.'
    };
    var grupos = FRANJAS.map(function (h) {
      return filtrar(regs, 'hora', h).map(function (r) { return r[variable === 'IDSI' ? 'idsi' : claveInsumo(variable)]; });
    }).filter(function (g) { return g.length > 0; });
    var k = grupos.length, N = grupos.reduce(function (s, g) { return s + g.length; }, 0);
    if (k < 2 || N - k < 1) return noCalculable(base.nombre, 'No hay suficientes franjas o registros.', base);
    var todos = [].concat.apply([], grupos), mg = media(todos);
    var ssb = 0, ssw = 0;
    grupos.forEach(function (g) {
      var m = media(g);
      ssb += g.length * (m - mg) * (m - mg);
      g.forEach(function (x) { ssw += (x - m) * (x - m); });
    });
    var df1 = k - 1, df2 = N - k, F, p;
    if (ssw === 0) {
      if (ssb === 0) { F = 0; p = 1; } else { F = Infinity; p = 0; }
    } else {
      F = (ssb / df1) / (ssw / df2);
      p = 1 - jst().centralF.cdf(F, df1, df2);
    }
    base.calculable = true;
    base.estadistico = 'F(' + df1 + ', ' + df2 + ') = ' + fmt(F, 3);
    base.p = p; base.rechaza = p < ALFA;
    base.detalle = 'Medias por franja: ' + FRANJAS.map(function (h) {
      var g = filtrar(regs, 'hora', h).map(function (r) { return r[variable === 'IDSI' ? 'idsi' : claveInsumo(variable)]; });
      return h + ' = ' + (g.length ? fmt(media(g) * 100, 1) + ' %' : 's/d');
    }).join('; ') + '. Los datos son 0/1, por lo que el ANOVA es aproximado.';
    base.interpretacion = base.rechaza
      ? 'La disponibilidad de ' + variable + ' cambia de forma significativa entre franjas horarias.'
      : 'No hay evidencia de que la disponibilidad de ' + variable + ' cambie entre franjas horarias.';
    return base;
  }

  // Regresión lineal simple: disponibilidad (0/1) contra la hora del día.
  function pruebaRegresion(regs, variable) {
    var campo = variable === 'IDSI' ? 'idsi' : claveInsumo(variable);
    var base = {
      nombre: 'Regresión lineal (disponibilidad frente a la hora)',
      h0: 'La pendiente es cero: la disponibilidad de ' + variable + ' no cambia con la hora (β1 = 0).',
      h1: 'La pendiente es distinta de cero (β1 ≠ 0).'
    };
    var x = regs.map(function (r) { return +r.hora.slice(0, 2) + (+r.hora.slice(3)) / 60; });
    var y = regs.map(function (r) { return r[campo]; });
    var n = x.length;
    if (n < 3) return noCalculable(base.nombre, 'Se necesitan al menos 3 registros.', base);
    var mx = media(x), my = media(y), sxx = 0, syy = 0, sxy = 0;
    for (var i = 0; i < n; i++) {
      sxx += (x[i] - mx) * (x[i] - mx); syy += (y[i] - my) * (y[i] - my); sxy += (x[i] - mx) * (y[i] - my);
    }
    if (sxx === 0 || syy === 0) {
      return noCalculable(base.nombre, syy === 0 ? 'La variable es constante (siempre vale ' + y[0] + '); no hay pendiente que probar.' : 'Todos los registros tienen la misma hora.', base);
    }
    var b1 = sxy / sxx, b0 = my - b1 * mx, r = sxy / Math.sqrt(sxx * syy), r2 = r * r, gl = n - 2;
    var t, p;
    if (r2 >= 1) { t = Infinity; p = 0; }
    else { t = r * Math.sqrt(gl / (1 - r2)); p = 2 * (1 - jst().studentt.cdf(Math.abs(t), gl)); }
    base.calculable = true;
    base.estadistico = 't(' + gl + ') = ' + fmt(t, 3);
    base.p = p; base.rechaza = p < ALFA;
    base.pendiente = b1; base.r = r; base.r2 = r2; base.intercepto = b0;
    base.detalle = 'ŷ = ' + fmt(b0, 3) + (b1 >= 0 ? ' + ' : ' − ') + fmt(Math.abs(b1), 4) + '·hora; r = ' + fmt(r, 3) +
      '; R² = ' + fmt(r2, 3) + '; cambio estimado: ' + fmtSigno(b1 * 2 * 100, 1) + ' puntos porcentuales cada 2 h.';
    base.tendencia = !base.rechaza ? 'sin tendencia significativa' : (b1 < 0 ? 'descendente' : 'ascendente');
    base.interpretacion = base.rechaza
      ? 'La disponibilidad de ' + variable + ' muestra una tendencia ' + base.tendencia + ' a lo largo de la jornada.'
      : 'No hay una tendencia lineal significativa de ' + variable + ' a lo largo de la jornada.';
    return base;
  }

  // Chi-cuadrado de independencia sobre una tabla de contingencia
  // (filas = categorías del factor; columnas = No / Sí).
  function chiCuadrado(tabla, nombre, base) {
    // Se eliminan filas y columnas con total cero (no aportan información).
    var filas = tabla.filter(function (f) { return f.celdas[0] + f.celdas[1] > 0; });
    var colTot = [0, 0];
    filas.forEach(function (f) { colTot[0] += f.celdas[0]; colTot[1] += f.celdas[1]; });
    var cols = [0, 1].filter(function (c) { return colTot[c] > 0; });
    var df = (filas.length - 1) * (cols.length - 1);
    if (df < 1) return noCalculable(nombre, 'La variable no cambia (todos los valores son iguales) o hay una sola categoría; no se puede calcular.', base);
    var N = colTot[0] + colTot[1], chi = 0, esperadosBajos = 0;
    filas.forEach(function (f) {
      var tf = f.celdas[0] + f.celdas[1];
      cols.forEach(function (c) {
        var E = tf * colTot[c] / N;
        chi += Math.pow(f.celdas[c] - E, 2) / E;
        if (E < 5) esperadosBajos++;
      });
    });
    var p = 1 - jst().chisquare.cdf(chi, df);
    base.nombre = nombre; base.calculable = true;
    base.estadistico = 'χ²(' + df + ') = ' + fmt(chi, 3);
    base.p = p; base.rechaza = p < ALFA;
    base.detalle = 'Tabla (No / Sí): ' + filas.map(function (f) { return f.etiqueta + ' = ' + f.celdas[0] + ' / ' + f.celdas[1]; }).join('; ') + '.' +
      (esperadosBajos ? ' Aviso: ' + esperadosBajos + ' celda(s) con frecuencia esperada menor que 5; la aproximación chi-cuadrado es limitada.' : '');
    return base;
  }

  function tablaContingencia(regs, campoFactor, valores, campoVar) {
    return valores.map(function (v) {
      var sub = filtrar(regs, campoFactor, v), no = 0, si = 0;
      sub.forEach(function (r) { if (r[campoVar] === 1) si++; else no++; });
      return { etiqueta: v, celdas: [no, si] };
    });
  }

  function claveInsumo(nombreVisible) {
    return nombreVisible === 'Agua' ? 'agua' : nombreVisible === 'Papel' ? 'papel' : nombreVisible === 'Jabón' ? 'jabon' : 'idsi';
  }

  function pruebaChiFranja(regs, variable) {
    var campo = claveInsumo(variable);
    var base = {
      h0: 'La disponibilidad de ' + variable + ' es independiente de la franja horaria.',
      h1: 'La disponibilidad de ' + variable + ' depende de la franja horaria.'
    };
    var res = chiCuadrado(tablaContingencia(regs, 'hora', FRANJAS, campo), 'Chi-cuadrado (franja horaria)', base);
    if (res.calculable) res.interpretacion = res.rechaza
      ? 'La disponibilidad de ' + variable + ' está asociada con la franja horaria.'
      : 'No hay evidencia de asociación entre la disponibilidad de ' + variable + ' y la franja horaria.';
    return res;
  }

  function pruebaChiSanitario(regs, variable) {
    var campo = claveInsumo(variable);
    var base = {
      h0: 'La disponibilidad de ' + variable + ' es independiente del sanitario (Hombres / Mujeres).',
      h1: 'La disponibilidad de ' + variable + ' depende del sanitario.'
    };
    var res = chiCuadrado(tablaContingencia(regs, 'genero', ['Hombres', 'Mujeres'], campo), 'Chi-cuadrado (sanitario)', base);
    if (res.calculable) res.interpretacion = res.rechaza
      ? 'La disponibilidad de ' + variable + ' está asociada con el sanitario.'
      : 'No hay evidencia de asociación entre la disponibilidad de ' + variable + ' y el sanitario.';
    return res;
  }

  // Todas las pruebas de una variable.
  function pruebasVariable(regs, variable) {
    var campo = claveInsumo(variable);
    var med = medicionesDiarias(regs, campo);
    var h = med.filter(function (m) { return m.genero === 'Hombres'; }).map(function (m) { return m.valor; });
    var m = med.filter(function (m) { return m.genero === 'Mujeres'; }).map(function (m) { return m.valor; });
    return [
      pruebaT(h, m, 'Hombres', 'Mujeres', variable),
      pruebaAnova(regs, variable),
      pruebaRegresion(regs, variable),
      pruebaChiFranja(regs, variable),
      pruebaChiSanitario(regs, variable)
    ];
  }

  /* ------------------------------------------------------------------------
     6. COMPROBACIÓN DE HIPÓTESIS
     ------------------------------------------------------------------------ */

  // Hipótesis 1: carencia de papel y jabón mayor y IDSI menor en recesos.
  function hipotesis1(regs) {
    var rec = regs.filter(function (r) { return RECESOS.indexOf(r.hora) !== -1; });
    var no = regs.filter(function (r) { return RECESOS.indexOf(r.hora) === -1; });
    if (!rec.length || !no.length) return { veredicto: 'No evaluable', motivo: 'No hay registros en recesos o fuera de recesos con la constante RECESOS actual.' };
    var d = {
      rec: { N: rec.length, papel: porcentajeP(rec, 'papel'), jabon: porcentajeP(rec, 'jabon'), idsi: idsi(rec) },
      no: { N: no.length, papel: porcentajeP(no, 'papel'), jabon: porcentajeP(no, 'jabon'), idsi: idsi(no) }
    };
    var tabla = [
      { etiqueta: 'Recesos', celdas: [rec.filter(function (r) { return r.idsi === 0; }).length, rec.filter(function (r) { return r.idsi === 1; }).length] },
      { etiqueta: 'Fuera de recesos', celdas: [no.filter(function (r) { return r.idsi === 0; }).length, no.filter(function (r) { return r.idsi === 1; }).length] }
    ];
    var chi = chiCuadrado(tabla, 'Chi-cuadrado (receso / no receso, IDSI)', {
      h0: 'El IDSI es independiente de que la franja sea receso.', h1: 'El IDSI depende de que la franja sea receso.'
    });
    var dir = d.rec.papel > d.no.papel && d.rec.jabon > d.no.jabon && d.rec.idsi < d.no.idsi;
    var sig = chi.calculable && chi.rechaza;
    var verd = dir && sig ? 'VERDADERA' : 'FALSA';
    var razon = dir
      ? (sig ? 'La carencia de papel y de jabón es mayor y el IDSI menor en recesos, con diferencia significativa.'
             : 'La dirección esperada se cumple, pero la diferencia del IDSI entre recesos y no recesos no es significativa' + (chi.calculable ? '' : ' (' + chi.motivo + ')') + '.')
      : 'No se cumple la dirección esperada: la carencia de papel y de jabón no es mayor, o el IDSI no es menor, en recesos.';
    return { veredicto: verd, datos: d, chi: chi, razon: razon };
  }

  // Hipótesis 2: IDSI distinto entre plantas. Solo evaluable con 2 o más plantas.
  function hipotesis2(regs) {
    var plantas = {};
    regs.forEach(function (r) { plantas[r.planta] = 1; });
    plantas = Object.keys(plantas).sort();
    var exploratorio = {
      hombres: idsi(filtrar(regs, 'genero', 'Hombres')),
      mujeres: idsi(filtrar(regs, 'genero', 'Mujeres')),
      t: pruebaT(
        medicionesDiarias(regs, 'idsi').filter(function (m) { return m.genero === 'Hombres'; }).map(function (m) { return m.valor; }),
        medicionesDiarias(regs, 'idsi').filter(function (m) { return m.genero === 'Mujeres'; }).map(function (m) { return m.valor; }),
        'Hombres', 'Mujeres', 'IDSI'),
      chi: pruebaChiSanitario(regs, 'IDSI')
    };
    if (plantas.length < 2) {
      return { veredicto: 'No evaluable', plantas: plantas,
        razon: 'No evaluable con el alcance actual: solo se midió la planta ' + (plantas[0] ? plantas[0].toLowerCase() : 'alta') + '.',
        exploratorio: exploratorio };
    }
    var datos = plantas.map(function (p) { return { planta: p, N: filtrar(regs, 'planta', p).length, idsi: idsi(filtrar(regs, 'planta', p)) }; });
    var chi = chiCuadrado(tablaContingencia(regs, 'planta', plantas, 'idsi'), 'Chi-cuadrado (planta, IDSI)', {
      h0: 'El IDSI es independiente de la planta.', h1: 'El IDSI depende de la planta.'
    });
    var verd = chi.calculable && chi.rechaza ? 'VERDADERA' : 'FALSA';
    return { veredicto: verd, plantas: plantas, datos: datos, chi: chi,
      razon: verd === 'VERDADERA' ? 'El IDSI difiere de forma significativa entre plantas.' : 'No hay diferencia significativa del IDSI entre plantas.',
      exploratorio: exploratorio };
  }

  /* ------------------------------------------------------------------------
     7. FORMATO
     ------------------------------------------------------------------------ */
  function fmt(x, d) {
    if (x === Infinity) return '∞';
    if (x === -Infinity) return '−∞';
    if (x === null || x === undefined || isNaN(x)) return '—';
    return Number(x).toFixed(d).replace('-', '−');
  }
  function fmtSigno(x, d) { return (x > 0 ? '+' : '') + fmt(x, d); }
  function fmtP(p) { return p === undefined || isNaN(p) ? '—' : (p < 0.0001 ? '< 0.0001' : p.toFixed(4)); }
  function fmtPct(x) { return isNaN(x) ? '—' : fmt(x, 1) + ' %'; }

  /* ------------------------------------------------------------------------
     8. EXPORTACIÓN A CSV
     ------------------------------------------------------------------------ */
  // Escapa un campo: comillas dobles, comas y saltos de línea.
  function campoCSV(v) {
    var s = String(v === null || v === undefined ? '' : v);
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function filaCSV(arr) { return arr.map(campoCSV).join(','); }

  // CSV de la Matriz Maestra con las 9 cabeceras exactas.
  function matrizACSV(regs) {
    var lineas = [filaCSV(COLUMNAS)];
    regs.forEach(function (r) {
      lineas.push(filaCSV([r.id, r.fecha, r.hora, r.edificio, r.planta, r.genero, r.agua, r.papel, r.jabon]));
    });
    return lineas.join('\r\n') + '\r\n';
  }

  function hoyISO() {
    var d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }

  // Descarga creada en el navegador con Blob y un enlace temporal. UTF-8 con BOM.
  function descargar(texto, nombre) {
    var blob = new Blob(['﻿' + texto], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = nombre;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  // CSV con las tablas de indicadores y estadísticas (secciones separadas por línea en blanco).
  function indicadoresACSV(modelo) {
    var s = [];
    function seccion(titulo, cab, filas) {
      s.push(filaCSV([titulo]));
      s.push(filaCSV(cab));
      filas.forEach(function (f) { s.push(filaCSV(f)); });
      s.push('');
    }
    var D = modelo.D;
    seccion('Indicadores globales', ['Indicador', 'Valor'], [
      ['N de inspecciones válidas', modelo.N], ['Registros excluidos', modelo.excluidos], ['Días distintos (D)', D],
      ['IDSI (%)', fmt(modelo.global.idsi, 2)],
      ['P(agua) (%)', fmt(modelo.global.P.agua, 2)], ['P(papel) (%)', fmt(modelo.global.P.papel, 2)], ['P(jabón) (%)', fmt(modelo.global.P.jabon, 2)]
    ]);
    seccion('Sanitario por franja horaria', ['Sanitario', 'Franja', 'N', 'IDSI (%)', 'Nivel', 'P(agua) (%)', 'P(papel) (%)', 'P(jabón) (%)', 'λ agua', 'λ papel', 'λ jabón'],
      modelo.matriz.map(function (f) {
        var n = clasificar(f.idsi);
        return [f.genero, f.hora, f.N, fmt(f.idsi, 2), n ? n.nombre : '', fmt(f.P.agua, 2), fmt(f.P.papel, 2), fmt(f.P.jabon, 2),
          fmt(f.lambda.agua, 2), fmt(f.lambda.papel, 2), fmt(f.lambda.jabon, 2)];
      }));
    seccion('Ranking de franjas por λ(h) total', ['Posición', 'Franja', 'λ agua', 'λ papel', 'λ jabón', 'λ total', 'IDSI (%)'],
      modelo.ranking.map(function (f, i) {
        return [i + 1, f.hora, fmt(f.lambda.agua, 2), fmt(f.lambda.papel, 2), fmt(f.lambda.jabon, 2), fmt(f.lambdaTotal, 2), fmt(f.idsi, 2)];
      }));
    seccion('Estadísticas descriptivas (mediciones diarias por sanitario)', ['Variable', 'n', 'Media (%)', 'DE (%)', 'Error absoluto', 'Error relativo (%)', 'Mínimo (%)', 'Fecha mínimo', 'Sanitario mínimo', 'Máximo (%)', 'Fecha máximo', 'Sanitario máximo', 'Atípicos', 'Advertencia DE > 10 % de la media'],
      ['agua', 'papel', 'jabon', 'idsi'].map(function (k) {
        var e = modelo.stats[k];
        return [ETIQUETA[k], e.n, fmt(e.media, 2), fmt(e.de, 2), fmt(e.errAbs, 2), fmt(e.errRel, 2), fmt(e.min.valor, 1), e.min.fecha, e.min.genero,
          fmt(e.max.valor, 1), e.max.fecha, e.max.genero, e.atipicos.length, e.advertencia ? 'Sí' : 'No'];
      }));
    var filasT = [];
    ['agua', 'papel', 'jabon', 'idsi'].forEach(function (k) {
      modelo.pruebas[k].forEach(function (t) {
        filasT.push([ETIQUETA[k], t.nombre, t.calculable ? t.estadistico : 'No calculable', t.calculable ? fmtP(t.p) : '',
          t.calculable ? (t.rechaza ? 'Rechazar H0' : 'No rechazar H0') : t.motivo, t.calculable ? t.interpretacion : '']);
      });
    });
    seccion('Pruebas de hipótesis (α = 0.05)', ['Variable', 'Prueba', 'Estadístico', 'p-valor', 'Decisión', 'Interpretación'], filasT);
    return s.join('\r\n') + '\r\n';
  }

  /* ------------------------------------------------------------------------
     9. MODELO COMPLETO
     ------------------------------------------------------------------------ */
  function construirModelo(regs, excluidos) {
    var dias = diasDistintos(regs), D = dias.length;
    var m = { regs: regs, N: regs.length, excluidos: excluidos, dias: dias, D: D };
    m.global = resumen(regs, D);
    m.franjas = porFranja(regs, D);
    m.ranking = rankingFranjas(m.franjas);
    m.matriz = matrizEspacioTemporal(regs, D);
    m.generos = { Hombres: resumen(filtrar(regs, 'genero', 'Hombres'), D), Mujeres: resumen(filtrar(regs, 'genero', 'Mujeres'), D) };
    m.stats = {}; m.mediciones = {}; m.pruebas = {};
    ['agua', 'papel', 'jabon', 'idsi'].forEach(function (k) {
      m.mediciones[k] = medicionesDiarias(regs, k);
      m.stats[k] = estadisticas(m.mediciones[k]);
      m.pruebas[k] = pruebasVariable(regs, ETIQUETA[k]);
    });
    m.porDia = dias.map(function (f) {
      var sub = filtrar(regs, 'fecha', f);
      return { fecha: f, total: idsi(sub), Hombres: idsi(filtrar(sub, 'genero', 'Hombres')), Mujeres: idsi(filtrar(sub, 'genero', 'Mujeres')) };
    });
    m.h1 = hipotesis1(regs);
    m.h2 = hipotesis2(regs);
    return m;
  }

  /* Interfaz pública para pruebas en Node. */
  var API = {
    FRANJAS: FRANJAS, NIVELES: NIVELES, COLUMNAS: COLUMNAS,
    parsearCSV: parsearCSV, validarCSV: validarCSV, construirModelo: construirModelo,
    idsi: idsi, porcentajeP: porcentajeP, frecuenciaF: frecuenciaF, lambdaH: lambdaH, clasificar: clasificar,
    matrizACSV: matrizACSV, indicadoresACSV: indicadoresACSV, campoCSV: campoCSV, estadisticas: estadisticas,
    setRecesos: function (r) { RECESOS = r; }
  };
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; }
  if (typeof document === 'undefined') { return; }

  /* ==========================================================================
     INTERFAZ (solo navegador)
     ========================================================================== */

  var EJEMPLO_CSV = "Id del reporte,Fecha,Hora,Edificio,Planta,Genero sanitario,Disponibilidad agua,Disponibilidad papel,Disponibilidad jabón\n1,2026-10-19,08:00,A,Alta,Hombres,1,1,1\n2,2026-10-19,08:00,A,Alta,Mujeres,1,1,1\n3,2026-10-19,10:00,A,Alta,Hombres,1,0,1\n4,2026-10-19,10:00,A,Alta,Mujeres,1,1,1\n5,2026-10-19,12:00,A,Alta,Hombres,1,0,0\n6,2026-10-19,12:00,A,Alta,Mujeres,1,1,1\n7,2026-10-19,14:00,A,Alta,Hombres,0,0,0\n8,2026-10-19,14:00,A,Alta,Mujeres,1,1,1\n9,2026-10-20,08:00,A,Alta,Hombres,1,1,1\n10,2026-10-20,08:00,A,Alta,Mujeres,1,1,1\n11,2026-10-20,10:00,A,Alta,Hombres,1,1,0\n12,2026-10-20,10:00,A,Alta,Mujeres,1,1,1\n13,2026-10-20,12:00,A,Alta,Hombres,1,0,0\n14,2026-10-20,12:00,A,Alta,Mujeres,1,1,1\n15,2026-10-20,14:00,A,Alta,Hombres,1,0,0\n16,2026-10-20,14:00,A,Alta,Mujeres,1,1,1\n17,2026-10-21,08:00,A,Alta,Hombres,1,1,1\n18,2026-10-21,08:00,A,Alta,Mujeres,1,1,1\n19,2026-10-21,10:00,A,Alta,Hombres,1,0,1\n20,2026-10-21,10:00,A,Alta,Mujeres,1,1,0\n21,2026-10-21,12:00,A,Alta,Hombres,1,0,0\n22,2026-10-21,12:00,A,Alta,Mujeres,1,1,1\n23,2026-10-21,14:00,A,Alta,Hombres,0,0,0\n24,2026-10-21,14:00,A,Alta,Mujeres,1,1,1\n25,2026-10-22,08:00,A,Alta,Hombres,1,1,1\n26,2026-10-22,08:00,A,Alta,Mujeres,1,1,1\n27,2026-10-22,10:00,A,Alta,Hombres,1,1,1\n28,2026-10-22,10:00,A,Alta,Mujeres,1,1,1\n29,2026-10-22,12:00,A,Alta,Hombres,1,0,1\n30,2026-10-22,12:00,A,Alta,Mujeres,1,1,1\n31,2026-10-22,14:00,A,Alta,Hombres,1,0,0\n32,2026-10-22,14:00,A,Alta,Mujeres,1,1,0\n33,2026-10-23,08:00,A,Alta,Hombres,1,1,1\n34,2026-10-23,08:00,A,Alta,Mujeres,1,1,1\n35,2026-10-23,10:00,A,Alta,Hombres,1,0,0\n36,2026-10-23,10:00,A,Alta,Mujeres,1,1,1\n37,2026-10-23,12:00,A,Alta,Hombres,0,0,0\n38,2026-10-23,12:00,A,Alta,Mujeres,1,1,1\n39,2026-10-23,14:00,A,Alta,Hombres,0,0,0\n40,2026-10-23,14:00,A,Alta,Mujeres,1,1,1\n";

  var estado = { modelo: null, esEjemplo: true, origen: '', erroresCarga: [], charts: [],
    orden: { col: 'id', asc: true }, filtros: { genero: '', hora: '', fecha: '' } };

  function $(id) { return document.getElementById(id); }
  // Crea un elemento con atributos y texto (siempre con textContent: sin HTML inyectado).
  function el(tag, attrs, texto) {
    var e = document.createElement(tag), k;
    if (attrs) for (k in attrs) {
      if (k === 'class') e.className = attrs[k]; else e.setAttribute(k, attrs[k]);
    }
    if (texto !== undefined && texto !== null) e.textContent = texto;
    return e;
  }
  function vaciar(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  function hijos(padre, lista) { lista.forEach(function (c) { if (c) padre.appendChild(c); }); return padre; }

  // Construye una tabla accesible y adaptable a celular (etiquetas data-label).
  function tabla(cabeceras, filas, opciones) {
    opciones = opciones || {};
    var t = el('table', { 'class': 'tabla-resp' });
    if (opciones.titulo) t.appendChild(el('caption', null, opciones.titulo));
    var thead = el('thead'), trh = el('tr');
    cabeceras.forEach(function (c) { trh.appendChild(el('th', { scope: 'col' }, c)); });
    thead.appendChild(trh); t.appendChild(thead);
    var tb = el('tbody');
    filas.forEach(function (f) {
      var tr = el('tr');
      f.forEach(function (c, i) {
        var td = el('td', { 'data-label': cabeceras[i] });
        if (c && c.nodeType) td.appendChild(c); else td.textContent = (c === null || c === undefined) ? '—' : c;
        tr.appendChild(td);
      });
      tb.appendChild(tr);
    });
    t.appendChild(tb);
    return t;
  }

  // Etiqueta de nivel con ícono y texto (no solo color).
  function insignia(nivel) {
    if (!nivel) return el('span', { 'class': 'nivel nivel-nd' }, '— Sin datos');
    var s = el('span', { 'class': 'nivel nivel-' + nivel.clave });
    s.appendChild(el('span', { 'class': 'nivel-icono', 'aria-hidden': 'true' }, nivel.icono));
    s.appendChild(document.createTextNode(' ' + nivel.nombre));
    return s;
  }

  /* ---- Carga de datos ---- */
  function aplicarCSV(texto, esEjemplo, origen) {
    var val = validarCSV(parsearCSV(texto));
    if (val.fatal) {
      mostrarErrores([val.fatal].concat(val.errores), true);
      return false;
    }
    estado.esEjemplo = esEjemplo; estado.origen = origen;
    estado.erroresCarga = val.errores;
    estado.modelo = construirModelo(val.registros, val.excluidos);
    estado.modelo.totalFilas = val.total;
    mostrarErrores(val.errores, false);
    renderTodo();
    return true;
  }

  function mostrarErrores(lista, fatal) {
    var c = $('errores-carga');
    vaciar(c);
    if (!lista.length) { c.hidden = true; return; }
    c.hidden = false;
    c.className = 'aviso ' + (fatal ? 'aviso-error' : 'aviso-info');
    c.setAttribute('role', fatal ? 'alert' : 'status');
    c.appendChild(el('strong', null, fatal ? 'No se pudo cargar el archivo:' : 'Avisos de la carga (' + lista.length + '):'));
    var ul = el('ul');
    lista.slice(0, 30).forEach(function (m) { ul.appendChild(el('li', null, m)); });
    if (lista.length > 30) ul.appendChild(el('li', null, '… y ' + (lista.length - 30) + ' más.'));
    c.appendChild(ul);
  }

  function cargarInicial() {
    // Intenta leer data/matriz_maestra.csv; si falla, usa el ejemplo y muestra "Cargar CSV".
    fetch('data/matriz_maestra.csv', { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
      .then(function (t) {
        if (!aplicarCSV(t, !DATOS_REALES_EN_ARCHIVO, 'data/matriz_maestra.csv')) usarEjemploEmbebido();
        $('bloque-cargar').hidden = true;
      })
      .catch(function () {
        usarEjemploEmbebido();
        $('bloque-cargar').hidden = false;
        $('aviso-fetch').hidden = false;
      });
  }
  function usarEjemploEmbebido() {
    // Copia de respaldo de los datos reales, incluida en la página.
    aplicarCSV(EJEMPLO_CSV, false, 'copia de respaldo incluida en la página');
  }

  /* ---- Renderizado ---- */
  function renderTodo() {
    var m = estado.modelo;
    renderEncabezado(m);
    renderDashboard(m);
    renderClasificacion(m);
    renderEspacioTemporal(m);
    renderEstadisticas(m);
    renderHipotesis(m);
    renderMatriz();
  }

  function renderEncabezado(m) {
    var et = $('etiqueta-datos');
    et.textContent = estado.esEjemplo ? 'DATOS DE EJEMPLO' : 'DATOS REALES';
    et.className = 'etiqueta-datos ' + (estado.esEjemplo ? 'es-ejemplo' : 'es-real');
    $('detalle-datos').textContent = estado.esEjemplo
      ? 'Datos de ejemplo. Fuente: ' + estado.origen + '.'
      : 'Fuente: ' + estado.origen + '.';
    $('periodo-datos').textContent = m.dias.length
      ? 'Datos del ' + m.dias[0] + ' al ' + m.dias[m.dias.length - 1] + ' (' + m.D + ' días)'
      : '';
    document.querySelectorAll('.marca-ejemplo').forEach(function (n) { n.hidden = !estado.esEjemplo; });
  }

  function tarjeta(titulo, valor, nivel, nota) {
    var c = el('div', { 'class': 'tarjeta' });
    c.appendChild(el('h3', null, titulo));
    c.appendChild(el('p', { 'class': 'valor' }, valor));
    var est = el('p', { 'class': 'estado' });
    if (nivel === 'completo') est.appendChild(el('span', { 'class': 'nivel nivel-optimo' }, '✔ Datos completos'));
    else if (nivel === 'excluidos') est.appendChild(el('span', { 'class': 'nivel nivel-deficiente' }, '▲ Con registros excluidos'));
    else est.appendChild(insignia(nivel));
    c.appendChild(est);
    if (nota) c.appendChild(el('p', { 'class': 'nota' }, nota));
    return c;
  }

  function renderDashboard(m) {
    var c = $('tarjetas'); vaciar(c);
    var g = m.global;
    c.appendChild(tarjeta('N de inspecciones', String(m.N), m.excluidos ? 'excluidos' : 'completo',
      m.excluidos ? m.excluidos + ' registro(s) excluido(s) por estar incompletos o inválidos.' : 'Sin registros excluidos.'));
    c.appendChild(tarjeta('IDSI global', fmtPct(g.idsi), clasificar(g.idsi), 'Inspecciones con agua, papel y jabón a la vez.'));
    INSUMOS.forEach(function (k) {
      c.appendChild(tarjeta('P(' + ETIQUETA[k].toLowerCase() + ') carencia', fmtPct(g.P[k]), clasificar(100 - g.P[k]),
        'Estado según la disponibilidad del insumo (100 − P) con los mismos umbrales.'));
    });
  }

  function renderClasificacion(m) {
    // Leyenda de niveles.
    var l = $('leyenda-niveles'); vaciar(l);
    NIVELES.forEach(function (n) {
      var li = el('li'); li.appendChild(insignia(n)); li.appendChild(document.createTextNode(' — ' + n.rango));
      l.appendChild(li);
    });
    // Sanitarios.
    var cs = $('clasif-sanitarios'); vaciar(cs);
    cs.appendChild(tabla(['Sanitario', 'N', 'IDSI', 'Nivel'], ['Hombres', 'Mujeres'].map(function (g) {
      var r = m.generos[g]; return [g, r.N, fmtPct(r.idsi), insignia(clasificar(r.idsi))];
    }), { titulo: 'Clasificación por sanitario' }));
    // Franjas.
    var cf = $('clasif-franjas'); vaciar(cf);
    cf.appendChild(tabla(['Franja', 'N', 'IDSI', 'Nivel'], m.franjas.map(function (f) {
      return [f.hora, f.N, fmtPct(f.idsi), insignia(clasificar(f.idsi))];
    }), { titulo: 'Clasificación por franja horaria' }));
    // Global.
    var cg = $('clasif-global'); vaciar(cg);
    cg.appendChild(hijos(el('p'), [el('strong', null, 'Global: '), document.createTextNode(fmtPct(m.global.idsi) + ' '), insignia(clasificar(m.global.idsi))]));
    // Ranking.
    var cr = $('ranking'); vaciar(cr);
    cr.appendChild(tabla(['Posición', 'Franja', 'λ agua', 'λ papel', 'λ jabón', 'λ total', 'IDSI'], m.ranking.map(function (f, i) {
      return [String(i + 1), f.hora, fmt(f.lambda.agua, 2), fmt(f.lambda.papel, 2), fmt(f.lambda.jabon, 2), fmt(f.lambdaTotal, 2), fmtPct(f.idsi)];
    }), { titulo: 'Franjas más vulnerables (mayor λ total = faltas promedio por día)' }));
  }

  function renderEspacioTemporal(m) {
    // Mapa de calor sanitario × franja (color + ícono + texto).
    var h = $('mapa-calor'); vaciar(h);
    var t = el('table', { 'class': 'mapa' });
    t.appendChild(el('caption', null, 'Mapa de calor: IDSI por sanitario y franja horaria'));
    var th = el('thead'), tr = el('tr'); tr.appendChild(el('th', { scope: 'col' }, 'Sanitario'));
    FRANJAS.forEach(function (f) { tr.appendChild(el('th', { scope: 'col' }, f)); });
    th.appendChild(tr); t.appendChild(th);
    var tb = el('tbody');
    ['Hombres', 'Mujeres'].forEach(function (g) {
      var r = el('tr'); r.appendChild(el('th', { scope: 'row' }, g));
      FRANJAS.forEach(function (hh) {
        var f = m.matriz.filter(function (x) { return x.genero === g && x.hora === hh; })[0];
        var n = clasificar(f.idsi);
        var td = el('td', { 'class': 'celda-mapa nivel-bg-' + (n ? n.clave : 'nd') });
        td.appendChild(el('span', { 'class': 'mapa-valor' }, fmtPct(f.idsi)));
        td.appendChild(el('span', { 'class': 'mapa-nivel' }, n ? n.icono + ' ' + n.nombre : '—'));
        r.appendChild(td);
      });
      tb.appendChild(r);
    });
    t.appendChild(tb); h.appendChild(t);

    // Tabla detallada.
    var d = $('tabla-espacio'); vaciar(d);
    d.appendChild(tabla(['Sanitario', 'Franja', 'N', 'IDSI', 'P agua', 'P papel', 'P jabón', 'λ agua', 'λ papel', 'λ jabón'],
      m.matriz.map(function (f) {
        return [f.genero, f.hora, f.N, fmtPct(f.idsi), fmtPct(f.P.agua), fmtPct(f.P.papel), fmtPct(f.P.jabon),
          fmt(f.lambda.agua, 2), fmt(f.lambda.papel, 2), fmt(f.lambda.jabon, 2)];
      }), { titulo: 'Indicadores por sanitario y franja horaria (λ en faltas por día, D = ' + m.D + ')' }));

    renderGraficas(m);
  }

  /* ---- Gráficas (Chart.js) ---- */
  function colorCSS(nombre) { return getComputedStyle(document.documentElement).getPropertyValue(nombre).trim(); }

  function crearGrafica(idCanvas, tipo, datos, titulo, tituloX, tituloY, maxY) {
    var cv = $(idCanvas);
    if (!global.Chart) { cv.parentNode.insertBefore(el('p', { 'class': 'aviso aviso-error' }, 'No se pudo cargar Chart.js; consulte la tabla alternativa.'), cv); return; }
    var texto = colorCSS('--texto'), rejilla = colorCSS('--borde');
    var ch = new global.Chart(cv, {
      type: tipo, data: datos,
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          title: { display: true, text: titulo, color: texto, font: { size: 14, weight: '600' } },
          legend: { display: true, labels: { color: texto } },
          tooltip: { callbacks: { label: function (c) { return c.dataset.label + ': ' + fmt(c.parsed.y, 1) + ' %'; } } }
        },
        scales: {
          x: { title: { display: true, text: tituloX, color: texto }, ticks: { color: texto }, grid: { color: rejilla } },
          y: { min: 0, max: maxY || 100, title: { display: true, text: tituloY, color: texto }, ticks: { color: texto }, grid: { color: rejilla } }
        }
      }
    });
    estado.charts.push(ch);
  }

  function tablaAlterna(idContenedor, cabeceras, filas, titulo) {
    var c = $(idContenedor); vaciar(c);
    var d = el('details');
    d.appendChild(el('summary', null, 'Ver tabla alternativa de la gráfica'));
    d.appendChild(tabla(cabeceras, filas, { titulo: titulo }));
    c.appendChild(d);
  }

  function renderGraficas(m) {
    estado.charts.forEach(function (c) { c.destroy(); }); estado.charts = [];
    var azul = colorCSS('--c1'), naranja = colorCSS('--c2'), verde = colorCSS('--c3');
    var g = m.global;

    // 1. P(k) por insumo.
    crearGrafica('g1', 'bar', {
      labels: ['Agua', 'Papel', 'Jabón'],
      datasets: [{ label: 'Carencia P(k) (%)', data: INSUMOS.map(function (k) { return +fmt(g.P[k], 1); }), backgroundColor: [azul, naranja, verde] }]
    }, 'Porcentaje de carencia por insumo', 'Insumo', 'Carencia P(k) (% de inspecciones)');
    tablaAlterna('t1', ['Insumo', 'P(k) (%)'], INSUMOS.map(function (k) { return [ETIQUETA[k], fmt(g.P[k], 1)]; }), 'Carencia por insumo');

    // 2. IDSI por franja.
    crearGrafica('g2', 'bar', {
      labels: FRANJAS,
      datasets: [{ label: 'IDSI (%)', data: m.franjas.map(function (f) { return isNaN(f.idsi) ? null : +fmt(f.idsi, 1); }), backgroundColor: azul }]
    }, 'IDSI por franja horaria', 'Franja horaria (hh:mm)', 'IDSI (% de inspecciones con los tres insumos)');
    tablaAlterna('t2', ['Franja', 'IDSI (%)'], m.franjas.map(function (f) { return [f.hora, fmt(f.idsi, 1)]; }), 'IDSI por franja');

    // 3. Hombres vs Mujeres.
    var H = m.generos.Hombres, M = m.generos.Mujeres;
    var etiquetas = ['IDSI', 'Carencia agua', 'Carencia papel', 'Carencia jabón'];
    function vals(r) { return [r.idsi, r.P.agua, r.P.papel, r.P.jabon].map(function (x) { return isNaN(x) ? null : +fmt(x, 1); }); }
    crearGrafica('g3', 'bar', {
      labels: etiquetas,
      datasets: [{ label: 'Hombres', data: vals(H), backgroundColor: azul }, { label: 'Mujeres', data: vals(M), backgroundColor: naranja }]
    }, 'Hombres frente a Mujeres', 'Indicador', 'Porcentaje de inspecciones (%)');
    tablaAlterna('t3', ['Indicador', 'Hombres (%)', 'Mujeres (%)'], etiquetas.map(function (e, i) { return [e, fmt(vals(H)[i], 1), fmt(vals(M)[i], 1)]; }), 'Hombres frente a Mujeres');

    // 4. IDSI por día.
    function ser(c) { return m.porDia.map(function (d) { return isNaN(d[c]) ? null : +fmt(d[c], 1); }); }
    crearGrafica('g4', 'line', {
      labels: m.porDia.map(function (d) { return d.fecha; }),
      datasets: [
        { label: 'Total', data: ser('total'), borderColor: azul, backgroundColor: azul, tension: 0.2 },
        { label: 'Hombres', data: ser('Hombres'), borderColor: naranja, backgroundColor: naranja, borderDash: [6, 3], tension: 0.2 },
        { label: 'Mujeres', data: ser('Mujeres'), borderColor: verde, backgroundColor: verde, borderDash: [2, 2], tension: 0.2 }
      ]
    }, 'IDSI por día de medición', 'Fecha (AAAA-MM-DD)', 'IDSI (% de inspecciones con los tres insumos)');
    tablaAlterna('t4', ['Fecha', 'Total (%)', 'Hombres (%)', 'Mujeres (%)'],
      m.porDia.map(function (d) { return [d.fecha, fmt(d.total, 1), fmt(d.Hombres, 1), fmt(d.Mujeres, 1)]; }), 'IDSI por día');
  }

  /* ---- Estadísticas ---- */
  function renderEstadisticas(m) {
    var c = $('estadisticas'); vaciar(c);
    var tendencias = [];
    ['agua', 'papel', 'jabon', 'idsi'].forEach(function (k, i) {
      var e = m.stats[k], det = el('details', i === 0 ? { open: '' } : null);
      det.appendChild(el('summary', null, ETIQUETA[k] + ' — media ' + fmtPct(e.media) + ', DE ' + fmt(e.de, 2) + (e.advertencia ? '  ⚠ DE > 10 % de la media' : '')));
      if (m.mediciones[k].length !== 10) {
        det.appendChild(el('p', { 'class': 'aviso aviso-info' }, 'Aviso: se esperaban 10 mediciones (5 días × 2 sanitarios) y hay ' + m.mediciones[k].length + '.'));
      }
      if (e.advertencia) {
        det.appendChild(el('p', { 'class': 'aviso aviso-warn', role: 'status' },
          '⚠ Advertencia: la desviación estándar (' + fmt(e.de, 2) + ') supera el ' + UMBRAL_DE_PORC + ' % de la media (' + fmt(e.media, 2) +
          '); DE/media = ' + fmt(e.deSobreMedia, 1) + ' %. Hay mucha variabilidad entre días y sanitarios.'));
      }
      function fm(x) { return fmt(x.valor, 1) + ' % — ' + x.fecha + ', ' + x.genero + '; horas sin ' + (k === 'idsi' ? 'los tres insumos' : ETIQUETA[k].toLowerCase()) + ': ' + (x.faltas.length ? x.faltas.join(', ') : 'ninguna'); }
      det.appendChild(tabla(['Estadístico', 'Valor'], [
        ['Mediciones (n)', e.n], ['Media', fmtPct(e.media)], ['Desviación estándar (muestral)', fmt(e.de, 2) + ' %'],
        ['Error absoluto (DE/√n)', fmt(e.errAbs, 2) + ' puntos'], ['Error relativo (error abs./media)', fmtPct(e.errRel)],
        ['Mínimo (fecha y horas)', fm(e.min)], ['Máximo (fecha y horas)', fm(e.max)],
        ['Casos atípicos (1.5 × RIC)', e.atipicos.length ? e.atipicos.map(function (a) { return fmt(a.valor, 1) + ' % (' + a.fecha + ', ' + a.genero + ')'; }).join('; ') : 'Ninguno']
      ], { titulo: 'Estadísticas de ' + ETIQUETA[k] + ': % diario de disponibilidad por sanitario' }));
      det.appendChild(el('h4', null, 'Pruebas de hipótesis (α = ' + ALFA + ')'));
      m.pruebas[k].forEach(function (t) {
        var b = el('div', { 'class': 'prueba' });
        b.appendChild(el('h5', null, t.nombre));
        b.appendChild(hijos(el('p'), [el('strong', null, 'H0: '), document.createTextNode(t.h0)]));
        b.appendChild(hijos(el('p'), [el('strong', null, 'H1: '), document.createTextNode(t.h1)]));
        if (!t.calculable) {
          b.appendChild(hijos(el('p'), [el('strong', null, 'Resultado: '), document.createTextNode('No calculable. ' + t.motivo)]));
        } else {
          b.appendChild(hijos(el('p'), [el('strong', null, 'Estadístico: '), document.createTextNode(t.estadistico + '   p = ' + fmtP(t.p))]));
          b.appendChild(hijos(el('p'), [el('strong', null, 'Decisión (α = 0.05): '), document.createTextNode(t.rechaza ? 'Rechazar H0' : 'No rechazar H0')]));
          if (t.detalle) b.appendChild(el('p', { 'class': 'nota' }, t.detalle));
          b.appendChild(hijos(el('p'), [el('strong', null, 'Interpretación: '), document.createTextNode(t.interpretacion)]));
        }
        det.appendChild(b);
      });
      var reg = m.pruebas[k][2];
      tendencias.push([ETIQUETA[k], reg.calculable ? reg.tendencia : 'no calculable (variable constante)',
        reg.calculable ? fmtSigno(reg.pendiente * 200, 1) + ' pp / 2 h' : '—', reg.calculable ? fmtP(reg.p) : '—']);
      c.appendChild(det);
    });
    var tend = $('tendencia'); vaciar(tend);
    tend.appendChild(tabla(['Variable', 'Tendencia declarada', 'Cambio estimado', 'p (pendiente)'], tendencias,
      { titulo: 'Tendencia de los datos a lo largo de la jornada (regresión lineal, α = 0.05)' }));
  }

  /* ---- Comprobación de hipótesis ---- */
  function veredicto(v) {
    var cls = v === 'VERDADERA' ? 'v-ok' : v === 'FALSA' ? 'v-no' : 'v-nd';
    var ic = v === 'VERDADERA' ? '✔ ' : v === 'FALSA' ? '✖ ' : '… ';
    return el('span', { 'class': 'veredicto ' + cls }, ic + v);
  }

  function renderHipotesis(m) {
    var c = $('hipotesis'); vaciar(c);
    // Hipótesis 1.
    var h1 = m.h1, b1 = el('article', { 'class': 'tarjeta-h' });
    b1.appendChild(el('h3', null, 'Hipótesis 1: la carencia de papel y jabón aumenta en recesos y cambios de clase, y baja el IDSI'));
    b1.appendChild(el('p', { 'class': 'nota' }, 'Recesos considerados (constante RECESOS): ' + RECESOS.join(', ') + ' [PENDIENTE: confirmar con el horario real de la FIEC]. ' +
      'Regla del veredicto: VERDADERA si P(papel) y P(jabón) son mayores y el IDSI es menor en recesos que fuera de ellos, y el chi-cuadrado del IDSI (receso / no receso) tiene p < 0.05; en otro caso, FALSA.'));
    if (h1.datos) {
      b1.appendChild(tabla(['Grupo', 'N', 'P(papel)', 'P(jabón)', 'IDSI'], [
        ['Recesos', h1.datos.rec.N, fmtPct(h1.datos.rec.papel), fmtPct(h1.datos.rec.jabon), fmtPct(h1.datos.rec.idsi)],
        ['Fuera de recesos', h1.datos.no.N, fmtPct(h1.datos.no.papel), fmtPct(h1.datos.no.jabon), fmtPct(h1.datos.no.idsi)]
      ], { titulo: 'Datos que verifican la Hipótesis 1' }));
      if (h1.chi.calculable) b1.appendChild(el('p', null, h1.chi.estadistico + ', p = ' + fmtP(h1.chi.p) + ' (' + (h1.chi.rechaza ? 'rechaza H0' : 'no rechaza H0') + '). ' + h1.chi.detalle));
      else b1.appendChild(el('p', null, 'Chi-cuadrado no calculable: ' + h1.chi.motivo));
    }
    b1.appendChild(hijos(el('p'), [el('strong', null, 'Veredicto: '), veredicto(h1.veredicto)]));
    b1.appendChild(el('p', null, h1.razon || h1.motivo));
    b1.appendChild(el('p', { 'class': 'nota' }, 'Limitación: las rondas coinciden con cambios de clase, por lo que no se puede separar el efecto de un receso del de un cambio de clase.'));
    c.appendChild(b1);
    // Hipótesis 2.
    var h2 = m.h2, b2 = el('article', { 'class': 'tarjeta-h' });
    b2.appendChild(el('h3', null, 'Hipótesis 2: el IDSI se degrada de forma distinta entre plantas'));
    b2.appendChild(hijos(el('p'), [el('strong', null, 'Veredicto: '), veredicto(h2.veredicto)]));
    b2.appendChild(el('p', null, h2.razon));
    if (h2.datos) {
      b2.appendChild(tabla(['Planta', 'N', 'IDSI'], h2.datos.map(function (d) { return [d.planta, d.N, fmtPct(d.idsi)]; }), { titulo: 'IDSI por planta' }));
      if (h2.chi.calculable) b2.appendChild(el('p', null, h2.chi.estadistico + ', p = ' + fmtP(h2.chi.p) + '.'));
    }
    var ex = h2.exploratorio, bx = el('div', { 'class': 'exploratorio' });
    bx.appendChild(el('h4', null, 'Análisis exploratorio: IDSI Hombres frente a Mujeres'));
    bx.appendChild(el('p', { 'class': 'nota' }, 'Análisis exploratorio, no corresponde a la hipótesis planteada.'));
    bx.appendChild(tabla(['Sanitario', 'IDSI'], [['Hombres', fmtPct(ex.hombres)], ['Mujeres', fmtPct(ex.mujeres)]], { titulo: 'IDSI por sanitario' }));
    [ex.t, ex.chi].forEach(function (t) {
      bx.appendChild(el('p', null, t.nombre + ': ' + (t.calculable ? t.estadistico + ', p = ' + fmtP(t.p) + ' → ' + (t.rechaza ? 'rechazar H0. ' : 'no rechazar H0. ') + t.interpretacion : 'no calculable (' + t.motivo + ')')));
    });
    b2.appendChild(bx);
    c.appendChild(b2);
  }

  /* ---- Matriz maestra: orden y filtros ---- */
  function registrosFiltrados() {
    var f = estado.filtros, o = estado.orden;
    var regs = estado.modelo.regs.filter(function (r) {
      return (!f.genero || r.genero === f.genero) && (!f.hora || r.hora === f.hora) && (!f.fecha || r.fecha === f.fecha);
    });
    var campo = { id: 'id', fecha: 'fecha', hora: 'hora', edificio: 'edificio', planta: 'planta', genero: 'genero', agua: 'agua', papel: 'papel', jabon: 'jabon' }[o.col] || 'id';
    regs.sort(function (a, b) {
      var x = a[campo], y = b[campo];
      var nx = parseFloat(x), ny = parseFloat(y);
      var cmp = (!isNaN(nx) && !isNaN(ny) && campo !== 'fecha' && campo !== 'hora') ? nx - ny : String(x).localeCompare(String(y));
      return o.asc ? cmp : -cmp;
    });
    return regs;
  }

  function renderMatriz() {
    var m = estado.modelo;
    // Opciones de filtros (se conservan los valores elegidos si existen).
    var sd = $('f-dia'), prev = estado.filtros.fecha;
    vaciar(sd); sd.appendChild(el('option', { value: '' }, 'Todos los días'));
    m.dias.forEach(function (d) { sd.appendChild(el('option', { value: d }, d)); });
    sd.value = m.dias.indexOf(prev) !== -1 ? prev : ''; estado.filtros.fecha = sd.value;

    var regs = registrosFiltrados();
    $('conteo-matriz').textContent = 'Mostrando ' + regs.length + ' de ' + m.N + ' registros válidos.';
    var cont = $('matriz'); vaciar(cont);
    var cols = [['id', 'Id del reporte'], ['fecha', 'Fecha'], ['hora', 'Hora'], ['edificio', 'Edificio'], ['planta', 'Planta'],
      ['genero', 'Genero sanitario'], ['agua', 'Disponibilidad agua'], ['papel', 'Disponibilidad papel'], ['jabon', 'Disponibilidad jabón']];
    var t = el('table', { 'class': 'tabla-resp' });
    t.appendChild(el('caption', null, 'Matriz Maestra de datos (' + (estado.esEjemplo ? 'datos de ejemplo' : 'datos reales') + ')'));
    var th = el('thead'), tr = el('tr');
    cols.forEach(function (c) {
      var activo = estado.orden.col === c[0];
      var cel = el('th', { scope: 'col', 'aria-sort': activo ? (estado.orden.asc ? 'ascending' : 'descending') : 'none' });
      var b = el('button', { type: 'button', 'class': 'btn-orden', 'data-col': c[0] }, c[1] + (activo ? (estado.orden.asc ? ' ▲' : ' ▼') : ''));
      b.addEventListener('click', function () {
        if (estado.orden.col === c[0]) estado.orden.asc = !estado.orden.asc; else { estado.orden.col = c[0]; estado.orden.asc = true; }
        renderMatriz();
        var nuevo = document.querySelector('.btn-orden[data-col="' + c[0] + '"]'); if (nuevo) nuevo.focus();
      });
      cel.appendChild(b); tr.appendChild(cel);
    });
    th.appendChild(tr); t.appendChild(th);
    var tb = el('tbody');
    regs.forEach(function (r) {
      var f = el('tr');
      cols.forEach(function (c) { f.appendChild(el('td', { 'data-label': c[1] }, String(r[c[0]]))); });
      tb.appendChild(f);
    });
    t.appendChild(tb); cont.appendChild(t);
  }

  function renderDiccionario() {
    var c = $('diccionario'); vaciar(c);
    c.appendChild(tabla(['Columna', 'Tipo', 'Descripción'], DICCIONARIO, { titulo: 'Diccionario de datos de la Matriz Maestra' }));
  }

  // Agrega texto a un elemento convirtiendo las URL en enlaces (sin HTML inyectado).
  function conEnlaces(padre, texto) {
    var partes = texto.split(/(https?:\/\/\S+)/);
    partes.forEach(function (p) {
      if (/^https?:\/\//.test(p)) {
        var a = el('a', { href: p, rel: 'noopener noreferrer', target: '_blank' }, p);
        padre.appendChild(a);
      } else if (p) { padre.appendChild(document.createTextNode(p)); }
    });
  }

  function renderMetodologia() {
    var r = $('referencias'); vaciar(r);
    if (!REFERENCIAS.length) {
      r.appendChild(el('p', { 'class': 'aviso aviso-warn' }, '[PENDIENTE: lista de referencias permitidas.]'));
    } else {
      var ul = el('ul', { 'class': 'lista-refs' });
      REFERENCIAS.forEach(function (x) { var li = el('li'); conEnlaces(li, x); ul.appendChild(li); });
      r.appendChild(ul);
    }
  }

  /* ---- Tema claro / oscuro ---- */
  function aplicarTema(t) {
    document.documentElement.setAttribute('data-tema', t);
    var b = $('btn-tema'); if (b) { b.textContent = t === 'oscuro' ? '☀ Modo claro' : '☾ Modo oscuro'; b.setAttribute('aria-pressed', t === 'oscuro' ? 'true' : 'false'); }
  }
  function iniciarTema() {
    var t = null;
    try { t = localStorage.getItem('tema'); } catch (e) { /* almacenamiento no disponible */ }
    if (!t) t = (global.matchMedia && global.matchMedia('(prefers-color-scheme: dark)').matches) ? 'oscuro' : 'claro';
    aplicarTema(t);
    $('btn-tema').addEventListener('click', function () {
      var nuevo = document.documentElement.getAttribute('data-tema') === 'oscuro' ? 'claro' : 'oscuro';
      aplicarTema(nuevo);
      try { localStorage.setItem('tema', nuevo); } catch (e) { /* se ignora */ }
      if (estado.modelo) renderGraficas(estado.modelo);
    });
  }

  /* ---- Arranque ---- */
  function iniciar() {
    iniciarTema();
    $('titulo-proyecto').textContent = TITULO_PROYECTO;
    renderDiccionario(); renderMetodologia();

    $('archivo-csv').addEventListener('change', function (ev) {
      var f = ev.target.files[0]; if (!f) return;
      var lector = new FileReader();
      lector.onload = function () { aplicarCSV(String(lector.result), false, 'archivo cargado: ' + f.name); };
      lector.onerror = function () { mostrarErrores(['No se pudo leer el archivo seleccionado.'], true); };
      lector.readAsText(f, 'utf-8');
    });
    ['f-sanitario', 'f-franja', 'f-dia'].forEach(function (id) {
      $(id).addEventListener('change', function () {
        estado.filtros.genero = $('f-sanitario').value; estado.filtros.hora = $('f-franja').value; estado.filtros.fecha = $('f-dia').value;
        renderMatriz();
      });
    });
    $('btn-exportar').addEventListener('click', function () {
      if (!estado.modelo) return;
      var completa = $('exportar-completa').checked;
      var regs = completa ? estado.modelo.regs.slice().sort(function (a, b) { return parseFloat(a.id) - parseFloat(b.id); }) : registrosFiltrados();
      descargar(matrizACSV(regs), 'matriz_maestra_FIEC_' + hoyISO() + '.csv');
    });
    $('btn-exportar-ind').addEventListener('click', function () {
      if (!estado.modelo) return;
      descargar(indicadoresACSV(estado.modelo), 'indicadores_FIEC_' + hoyISO() + '.csv');
    });
    cargarInicial();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();

})(typeof window !== 'undefined' ? window : globalThis);
