# Resultados: disponibilidad de insumos en sanitarios de la FIEC

Página estática (HTML, CSS y JavaScript, sin framework ni servidor) que **no captura datos**: lee `data/matriz_maestra.csv` y muestra el dashboard, el análisis espacio-temporal, las estadísticas, la comprobación de hipótesis y la descarga de la matriz.

## Estructura

```
index.html
css/styles.css
js/app.js
data/matriz_maestra.csv   <- 40 registros reales (19 al 23 de octubre de 2026)
README.md
```

Librerías por CDN (cdnjs, versión fija): Chart.js 4.4.1 y jStat 1.9.6.

## Probar en la computadora

Abrir el archivo directo desde el disco no permite que el navegador lea el CSV con `fetch`. Por eso conviene un servidor local:

```
cd carpeta_del_proyecto
python -m http.server 8000
```

Luego abrir http://localhost:8000. Si se abre `index.html` directo, aparece el botón **Cargar CSV** y mientras tanto se muestra una copia de respaldo de los mismos datos, incluida en `js/app.js`.

## Publicar en un sitio estático

- **GitHub Pages:** subir la carpeta a un repositorio, ir a *Settings > Pages* y elegir la rama (`main`) y la carpeta raíz.
- **Netlify:** entrar a *Add new site > Deploy manually* y arrastrar la carpeta completa.

## Actualizar los datos

1. Exportar la matriz maestra como CSV UTF-8 con exactamente estas 9 columnas, en este orden:
   `Id del reporte, Fecha, Hora, Edificio, Planta, Genero sanitario, Disponibilidad agua, Disponibilidad papel, Disponibilidad jabón`
2. Formato: Fecha `AAAA-MM-DD` (también acepta `DD/MM/AAAA`); Hora `08:00`, `10:00`, `12:00` o `14:00`; Edificio `A`; Planta `Alta`; Genero sanitario `Hombres` o `Mujeres`; disponibilidades `1` o `0`.
3. Guardarlo como `data/matriz_maestra.csv`. La etiqueta "DATOS REALES" depende de la constante `DATOS_REALES_EN_ARCHIVO = true` en `js/app.js`.
4. Si se cambian los datos, conviene actualizar también la copia de respaldo `EJEMPLO_CSV` de `js/app.js` (solo se usa si el navegador no puede leer el CSV).

Los registros incompletos o con valores no válidos se excluyen del cálculo, se informa cuántos fueron y N se ajusta.

## Constantes editables (`js/app.js`)

| Constante | Uso |
|---|---|
| `RECESOS` | Franjas consideradas recesos para la Hipótesis 1. **[PENDIENTE: confirmar con el horario real de la FIEC]** |
| `NIVELES` | Umbrales de clasificación del IDSI (criterio propuesto por el equipo): Óptimo ≥ 90 %, Aceptable 70 a 89.9 %, Deficiente 50 a 69.9 %, Crítico < 50 %. |
| `ALFA` | Nivel de significancia (0.05). |
| `UMBRAL_DE_PORC` | Advertencia cuando la DE supera este porcentaje de la media (10). |
| `REFERENCIAS` | Referencias tomadas tal cual del documento de la Práctica 3 (17 entradas). Una cadena por elemento. |

## Decisiones de cálculo

- Fórmulas del protocolo (6.2): V(k,j), f(k), h(k), P(k), IDSI y λ(h) con D = número de días distintos en los datos (5).
- λ(h) del ranking de franjas se suma sobre los tres insumos (faltas promedio por día, ambos sanitarios).
- Estados de las tarjetas P(k): se aplican los mismos umbrales a la disponibilidad del insumo (100 − P).
- Estadísticas: 10 mediciones por variable (% diario de disponibilidad por sanitario). Error absoluto = DE/√n; error relativo = error absoluto/media × 100. Mínimo y máximo se informan con fecha, sanitario y las horas en que faltó el insumo (una medición diaria no tiene una sola hora). Atípicos: regla de 1.5 × RIC.
- Pruebas (α = 0.05): t de Student (Hombres frente a Mujeres, varianzas iguales, sobre las mediciones diarias); ANOVA de un factor por franja horaria, regresión lineal frente a la hora y chi-cuadrado por franja y por sanitario, sobre los registros 0/1 (el ANOVA y la regresión son aproximados con datos binarios). Si una variable es constante, la prueba se marca "No calculable".
- Hipótesis 1: VERDADERA si P(papel) y P(jabón) son mayores y el IDSI menor en recesos, y el chi-cuadrado del IDSI (receso / no receso) tiene p < 0.05. Hipótesis 2: "No evaluable" si solo hay una planta; el análisis Hombres frente a Mujeres se muestra aparte como exploratorio.
- Exportación: UTF-8 con BOM, separador coma, `matriz_maestra_FIEC_AAAA-MM-DD.csv` (fecha de la descarga) e `indicadores_FIEC_AAAA-MM-DD.csv`.

## Comprobación de cálculos (resultados esperados)

Verificados con Node (`jstat` 1.9.6) y contrastados con SciPy.

| Caso | N | IDSI | P(agua) / P(papel) / P(jabón) | λ(h) por insumo y franja | Nivel |
|---|---|---|---|---|---|
| Todos los registros en 1 | 40 | 100 % | 0 % / 0 % / 0 % | 0 | Óptimo |
| Todos los registros en 0 | 40 | 0 % | 100 % / 100 % / 100 % | 2.0 (2 sanitarios × 5 días / 5) | Crítico |
| Datos reales incluidos | 40 | 60 % | 10.0 % / 32.5 % / 32.5 % | ver tabla λ de la página | Deficiente |

En los casos "todo 1" y "todo 0" las pruebas con variable constante aparecen como "No calculable" (la t da t = 0, p = 1).
