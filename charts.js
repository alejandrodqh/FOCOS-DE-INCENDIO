/**
 * IGNIS-Harmonize: Visualizaciones Gráficas (Chart.js)
 * 
 * Genera gráficos de:
 * 1. Régimen Estacional y Climatología (Mediana, IQR 25-75%, Umbral 90% vs Año Seleccionado)
 * 2. Serie Temporal Histórica Completa (2001 - 2024) demostrando el impacto de la armonización
 * 3. Anomalías Porcentuales Mensuales del Año Seleccionado
 */

class FireChartsManager {
    constructor() {
        this.seasonalityChart = null;
        this.timeSeriesChart = null;
        this.anomalyBarChart = null;
    }

    /**
     * Actualiza o crea el gráfico de Régimen Estacional (12 meses)
     */
    renderSeasonalityChart(processedData, selectedYear = 2024) {
        const ctx = document.getElementById("seasonalityChartCanvas");
        if (!ctx) return;

        const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
        const baselines = processedData.monthlyBaselines;

        const medians = [];
        const p25s = [];
        const p75s = [];
        const p90s = [];
        const currentYearCounts = [];

        for (let m = 1; m <= 12; m++) {
            medians.push(baselines[m].median);
            p25s.push(baselines[m].p25);
            p75s.push(baselines[m].p75);
            p90s.push(baselines[m].p90);

            const rec = processedData.records.find(r => r.year === selectedYear && r.month === m);
            currentYearCounts.push(rec ? rec.activeCount : null);
        }

        if (this.seasonalityChart) {
            this.seasonalityChart.destroy();
        }

        this.seasonalityChart = new Chart(ctx, {
            type: "line",
            data: {
                labels: months,
                datasets: [
                    {
                        label: `Año Seleccionado (${selectedYear})`,
                        data: currentYearCounts,
                        borderColor: "#f43f5e", // Rose 500
                        backgroundColor: "rgba(244, 63, 94, 0.15)",
                        borderWidth: 3,
                        pointBackgroundColor: "#f43f5e",
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        tension: 0.3,
                        zIndex: 10
                    },
                    {
                        label: "Mediana Histórica (2001-2020)",
                        data: medians,
                        borderColor: "#38bdf8", // Sky 400
                        borderWidth: 2,
                        borderDash: [5, 4],
                        pointRadius: 0,
                        tension: 0.3,
                        fill: false
                    },
                    {
                        label: "Umbral Crítico (Percentil 90)",
                        data: p90s,
                        borderColor: "#f97316", // Orange 500
                        borderWidth: 1.5,
                        borderDash: [3, 3],
                        pointRadius: 0,
                        tension: 0.3,
                        fill: false
                    },
                    {
                        label: "Rango Intercuartil Histórico (p25 - p75)",
                        data: p75s,
                        borderColor: "transparent",
                        backgroundColor: "rgba(56, 189, 248, 0.12)",
                        fill: "-1",
                        pointRadius: 0,
                        tension: 0.3
                    },
                    {
                        label: "Límite Inferior (p25)",
                        data: p25s,
                        borderColor: "transparent",
                        fill: false,
                        pointRadius: 0,
                        tension: 0.3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: "index",
                    intersect: false
                },
                plugins: {
                    legend: {
                        position: "top",
                        labels: {
                            color: "#94a3b8",
                            boxWidth: 12,
                            font: { size: 11 },
                            filter: (item) => !["Límite Inferior (p25)"].includes(item.text)
                        }
                    },
                    tooltip: {
                        backgroundColor: "rgba(15, 23, 42, 0.95)",
                        titleColor: "#f8fafc",
                        bodyColor: "#cbd5e1",
                        borderColor: "#334155",
                        borderWidth: 1,
                        padding: 10
                    }
                },
                scales: {
                    x: {
                        grid: { color: "rgba(51, 65, 85, 0.3)" },
                        ticks: { color: "#94a3b8", font: { size: 11 } }
                    },
                    y: {
                        grid: { color: "rgba(51, 65, 85, 0.3)" },
                        ticks: {
                            color: "#94a3b8",
                            font: { size: 10 },
                            callback: (val) => val >= 1000 ? (val / 1000) + "k" : val
                        },
                        title: {
                            display: true,
                            text: "Puntos Calientes Detectados",
                            color: "#64748b",
                            font: { size: 11 }
                        }
                    }
                }
            }
        });
    }

    /**
     * Gráfico de Serie Temporal Completa (2001 - 2024)
     */
    renderTimeSeriesChart(processedData) {
        const ctx = document.getElementById("timeSeriesChartCanvas");
        if (!ctx) return;

        const records = processedData.records;
        const labels = records.map(r => `${r.monthShort || r.monthName.slice(0, 3)} ${r.year}`);
        const activeCounts = records.map(r => r.activeCount);
        const medians = records.map(r => r.historicalMedian);

        if (this.timeSeriesChart) {
            this.timeSeriesChart.destroy();
        }

        const isRaw = processedData.mode === "raw_discontinuous";

        this.timeSeriesChart = new Chart(ctx, {
            type: "line",
            data: {
                labels: labels,
                datasets: [
                    {
                        label: isRaw ? "Datos Crudos Sin Armonizar (Discontinuidad 2012)" : "Puntos Calientes Armonizados (MODIS + VIIRS)",
                        data: activeCounts,
                        borderColor: isRaw ? "#e11d48" : "#fbbf24", // Rose vs Amber
                        backgroundColor: isRaw ? "rgba(225, 29, 72, 0.1)" : "rgba(251, 191, 36, 0.1)",
                        fill: true,
                        borderWidth: 1.8,
                        pointRadius: 0,
                        tension: 0.2
                    },
                    {
                        label: "Mediana Climatológica Mensual",
                        data: medians,
                        borderColor: "#38bdf8",
                        borderWidth: 1.5,
                        borderDash: [4, 4],
                        pointRadius: 0,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: "top",
                        labels: { color: "#94a3b8", font: { size: 11 } }
                    },
                    tooltip: {
                        backgroundColor: "rgba(15, 23, 42, 0.95)",
                        borderColor: "#334155",
                        borderWidth: 1
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: {
                            color: "#94a3b8",
                            maxTicksLimit: 12,
                            callback: function(val, index) {
                                return records[index].month === 1 ? records[index].year : "";
                            }
                        }
                    },
                    y: {
                        grid: { color: "rgba(51, 65, 85, 0.3)" },
                        ticks: {
                            color: "#94a3b8",
                            callback: (val) => val >= 1000 ? (val / 1000) + "k" : val
                        }
                    }
                }
            }
        });
    }

    /**
     * Gráfico de barras de anomalía porcentual mensual
     */
    renderAnomalyBarChart(processedData, selectedYear = 2024) {
        const ctx = document.getElementById("anomalyBarChartCanvas");
        if (!ctx) return;

        const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
        const yearRecords = processedData.records.filter(r => r.year === selectedYear);
        const anomalyValues = [];
        const barColors = [];

        for (let m = 1; m <= 12; m++) {
            const rec = yearRecords.find(r => r.month === m);
            const anom = rec ? rec.activeAnomalyPct : 0;
            anomalyValues.push(anom);

            if (anom > 100) barColors.push("#f43f5e"); // Rojo intenso (Extremo)
            else if (anom > 50) barColors.push("#fb923c"); // Naranja (Alto)
            else if (anom > 20) barColors.push("#facc15"); // Amarillo (Moderado)
            else if (anom < -20) barColors.push("#38bdf8"); // Azul celeste (Bajo)
            else barColors.push("#10b981"); // Verde esmeralda (Normal)
        }

        if (this.anomalyBarChart) {
            this.anomalyBarChart.destroy();
        }

        this.anomalyBarChart = new Chart(ctx, {
            type: "bar",
            data: {
                labels: months,
                datasets: [
                    {
                        label: `Anomalía vs Mediana Histórica (%) en ${selectedYear}`,
                        data: anomalyValues,
                        backgroundColor: barColors,
                        borderRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `Anomalía: ${ctx.raw > 0 ? '+' : ''}${ctx.raw}% vs mediana 2001-2020`
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: "#94a3b8", font: { size: 10 } }
                    },
                    y: {
                        grid: { color: "rgba(51, 65, 85, 0.3)" },
                        ticks: {
                            color: "#94a3b8",
                            font: { size: 10 },
                            callback: (v) => `${v}%`
                        }
                    }
                }
            }
        });
    }
}

// Instancia global
window.fireChartsManager = new FireChartsManager();
