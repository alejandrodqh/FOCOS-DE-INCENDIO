/**
 * IGNIS-Harmonize: Motor de Armonización MODIS & VIIRS
 * 
 * Implementa la calibración y armonización de series temporales
 * de anomalías térmicas (hotspots) de NASA FIRMS:
 * - MODIS (Terra / Aqua) - Resolución 1 km (2000 - presente)
 * - VIIRS (S-NPP / NOAA-20 / NOAA-21) - Resolución 375 m (2012 - presente)
 */

class HarmonizationEngine {
    constructor() {
        this.scientificNotes = {
            modisResolution: "1000 m (1.0 km) en nadir, se expande hasta ~10 km² en bordes de barrido (efecto corbatín).",
            viirsResolution: "375 m en bandas de imágenes (I-band). Agregación a bordo que limita la distorsión a ~0.8 km².",
            sensitivityRatio: "VIIRS detecta fuegos de menor temperatura y tamaño (hasta 10-50 m²), produciendo entre 3.0x y 4.2x más detecciones que MODIS para el mismo incendio.",
            harmonizationMethod: "Normalización de densidad espacial empírica basada en el periodo de solapamiento (2012-2023) y calibración espectral de Potencia Radiativa del Fuego (FRP)."
        };
    }

    /**
     * Procesa los registros aplicando el modo seleccionado:
     * - 'harmonized': MODIS normalizado con VIIRS calibrado (serie consistente 2001-2024)
     * - 'raw_discontinuous': MODIS (2001-2011) + VIIRS crudo sin armonizar (2012-2024), demostrando el salto artificial del 300%
     * - 'modis_only': Solo detecciones de MODIS
     * - 'viirs_only': Solo detecciones de VIIRS (inicia en 2012)
     */
    processDataset(timeSeriesData, mode = "harmonized") {
        const { region, records } = timeSeriesData;
        const processedRecords = records.map(rec => {
            let activeCount = rec.harmonizedCount;
            let sensorTag = "MODIS + VIIRS Armonizado";

            if (mode === "raw_discontinuous") {
                if (rec.year < 2012) {
                    activeCount = rec.modisRaw;
                    sensorTag = "MODIS (Crudo)";
                } else {
                    activeCount = rec.viirsRaw;
                    sensorTag = "VIIRS (Crudo - Sin Armonizar)";
                }
            } else if (mode === "modis_only") {
                activeCount = rec.modisRaw;
                sensorTag = "Solo MODIS";
            } else if (mode === "viirs_only") {
                activeCount = rec.viirsRaw !== null ? rec.viirsRaw : 0;
                sensorTag = "Solo VIIRS";
            }

            // Recalcular anomalía según el conteo activo
            const anomalyPct = +(((activeCount - rec.historicalMedian) / rec.historicalMedian) * 100).toFixed(1);
            let status = "Normal";
            let statusLevel = 1; // 1: Verde, 2: Amarillo, 3: Naranja, 4: Rojo

            if (anomalyPct >= 100) {
                status = "Extremo (+100%)";
                statusLevel = 4;
            } else if (anomalyPct >= 50) {
                status = "Alto (+50%)";
                statusLevel = 3;
            } else if (anomalyPct >= 20) {
                status = "Moderado (+20%)";
                statusLevel = 2;
            } else if (anomalyPct <= -40) {
                status = "Déficit severo";
                statusLevel = 1;
            } else if (anomalyPct <= -20) {
                status = "Bajo (-20%)";
                statusLevel = 1;
            }

            return {
                ...rec,
                activeCount: activeCount,
                sensorTag: sensorTag,
                activeAnomalyPct: anomalyPct,
                statusLevel: statusLevel,
                computedStatus: status
            };
        });

        // Calcular estadísticas agregadas
        const monthlyBaselines = this.computeMonthlyBaselines(processedRecords);

        return {
            region: region,
            records: processedRecords,
            monthlyBaselines: monthlyBaselines,
            mode: mode
        };
    }

    /**
     * Calcula la climatología y percentiles históricos mensuales (periodo de referencia 2001-2020)
     */
    computeMonthlyBaselines(records) {
        const baselines = {};
        for (let m = 1; m <= 12; m++) {
            const monthRecords = records.filter(r => r.month === m && r.year >= 2001 && r.year <= 2020);
            const counts = monthRecords.map(r => r.harmonizedCount).sort((a, b) => a - b);

            const median = this.calculatePercentile(counts, 50);
            const p25 = this.calculatePercentile(counts, 25);
            const p75 = this.calculatePercentile(counts, 75);
            const p90 = this.calculatePercentile(counts, 90);

            baselines[m] = {
                month: m,
                median: median,
                p25: p25,
                p75: p75,
                p90: p90
            };
        }
        return baselines;
    }

    calculatePercentile(sortedArr, p) {
        if (!sortedArr.length) return 0;
        const index = (p / 100) * (sortedArr.length - 1);
        const lower = Math.floor(index);
        const upper = Math.ceil(index);
        const weight = index - lower;
        if (lower === upper) return sortedArr[lower];
        return Math.round(sortedArr[lower] * (1 - weight) + sortedArr[upper] * weight);
    }

    /**
     * Genera un archivo CSV compatible con Excel y herramientas GIS (QGIS, ArcGIS)
     */
    generateCSV(processedData) {
        const headers = [
            "region",
            "year",
            "month",
            "month_name",
            "active_count",
            "modis_raw",
            "viirs_raw",
            "harmonized_count",
            "sensor_tag",
            "frp_mean_mw",
            "historical_median",
            "anomaly_pct",
            "risk_status",
            "confidence_pct"
        ];

        const rows = processedData.records.map(r => [
            `"${processedData.region.name}"`,
            r.year,
            r.month,
            `"${r.monthName}"`,
            r.activeCount,
            r.modisRaw,
            r.viirsRaw !== null ? r.viirsRaw : "N/A",
            r.harmonizedCount,
            `"${r.sensorTag}"`,
            r.frpMeanMW,
            r.historicalMedian,
            r.activeAnomalyPct + "%",
            `"${r.computedStatus}"`,
            r.confidence + "%"
        ]);

        return [headers.join(","), ...rows.map(row => row.join(","))].join("\r\n");
    }
}

// Instancia global
window.harmonizationEngine = new HarmonizationEngine();
