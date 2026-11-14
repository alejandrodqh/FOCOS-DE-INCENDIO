/**
 * IGNIS-Harmonize: Calendario de Actividad de Fuego (Burn Activity Calendar)
 * 
 * Renderiza la matriz interactiva de puntos calientes por Año y Mes (2001 - 2024),
 * con soporte para rampas de color científicas y accesibles para daltonismo
 * (Inferno, Viridis, Plasma, Cividis, Turbo).
 */

class BurnCalendar {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.currentPalette = "inferno";
        this.selectedCell = { year: 2024, month: 8 }; // Por defecto: Agosto 2024 (pico crítico)
        this.onSelectCallback = null;

        // Paletas de color científicas (muestras interpoladas de 0% a 100%)
        this.palettes = {
            inferno: [
                [0, "#000004"],
                [0.15, "#1f0c48"],
                [0.3, "#550f6d"],
                [0.5, "#88226a"],
                [0.65, "#bb3754"],
                [0.8, "#e35933"],
                [0.9, "#f98e09"],
                [0.97, "#f9cb35"],
                [1.0, "#fcffa4"]
            ],
            viridis: [
                [0, "#440154"],
                [0.2, "#414487"],
                [0.4, "#2a788e"],
                [0.6, "#22a884"],
                [0.8, "#7ad151"],
                [1.0, "#fde725"]
            ],
            plasma: [
                [0, "#0d0887"],
                [0.25, "#6a00a8"],
                [0.5, "#b12a90"],
                [0.75, "#e16462"],
                [0.9, "#fca636"],
                [1.0, "#f0f921"]
            ],
            cividis: [
                [0, "#00204d"],
                [0.25, "#2b4067"],
                [0.5, "#576182"],
                [0.75, "#87879e"],
                [0.9, "#bfb3bc"],
                [1.0, "#ffea46"]
            ],
            turbo: [
                [0, "#30123b"],
                [0.2, "#4662d8"],
                [0.4, "#36aaf9"],
                [0.6, "#72fe5e"],
                [0.8, "#faba39"],
                [0.95, "#d83818"],
                [1.0, "#7a0403"]
            ]
        };
    }

    setPalette(paletteName) {
        if (this.palettes[paletteName]) {
            this.currentPalette = paletteName;
        }
    }

    onSelect(callback) {
        this.onSelectCallback = callback;
    }

    /**
     * Renderiza el calendario de actividad con los datos procesados
     */
    render(processedData) {
        if (!this.container) return;
        this.container.innerHTML = "";

        const records = processedData.records;
        const years = [...new Set(records.map(r => r.year))].sort((a, b) => b - a); // Años más recientes primero
        const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
        const monthShort = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

        // Encontrar valor máximo para la escala de color
        const maxVal = Math.max(...records.map(r => r.activeCount), 1);
        const minVal = 0;

        // Crear contenedor responsive
        const wrapper = document.createElement("div");
        wrapper.className = "calendar-wrapper overflow-x-auto";

        const table = document.createElement("table");
        table.className = "w-full border-collapse text-xs select-none calendar-table";

        // Cabecera: Meses
        const thead = document.createElement("thead");
        const headerRow = document.createElement("tr");
        headerRow.className = "text-slate-400 border-b border-slate-700 bg-slate-900/80 sticky top-0 z-10";

        const yearTh = document.createElement("th");
        yearTh.className = "p-2 text-left font-semibold text-slate-300 w-16";
        yearTh.textContent = "Año";
        headerRow.appendChild(yearTh);

        months.forEach((m, idx) => {
            const th = document.createElement("th");
            th.className = "p-2 text-center font-medium";
            th.textContent = monthShort[idx];
            headerRow.appendChild(th);
        });

        const totalTh = document.createElement("th");
        totalTh.className = "p-2 text-right font-semibold text-amber-400 w-24";
        totalTh.textContent = "Total Anual";
        headerRow.appendChild(totalTh);

        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Cuerpo: Filas por año
        const tbody = document.createElement("tbody");

        years.forEach(year => {
            const tr = document.createElement("tr");
            tr.className = "border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors";

            // Columna de Año
            const yearTd = document.createElement("td");
            yearTd.className = "p-2 font-mono font-bold text-slate-300 text-left";
            
            // Si es un año récord o de crisis, destacar con un punto o badge
            const isRecordYear = [2004, 2010, 2019, 2020, 2024].includes(year);
            yearTd.innerHTML = `<span>${year}</span>${isRecordYear ? ' <span class="inline-block w-1.5 h-1.5 rounded-full bg-rose-500" title="Año de crisis / anomalía extrema"></span>' : ''}`;
            tr.appendChild(yearTd);

            let yearTotal = 0;

            // Columnas de Meses
            months.forEach(month => {
                const rec = records.find(r => r.year === year && r.month === month);
                const count = rec ? rec.activeCount : 0;
                yearTotal += count;

                const td = document.createElement("td");
                td.className = "calendar-cell p-1 text-center font-mono cursor-pointer transition-all duration-150 relative";
                
                // Normalización para color (usando escala logarítmica o raíz cuadrada para mejor rango dinámico visual)
                const normalized = Math.min(Math.max(Math.sqrt(count) / Math.sqrt(maxVal), 0), 1);
                const bgColor = this.interpolateColor(this.palettes[this.currentPalette], normalized);
                const textColor = this.getContrastingTextColor(bgColor);

                td.style.backgroundColor = bgColor;
                td.style.color = textColor;

                // Formatear texto numérico abreviado si es muy grande
                let displayCount = count.toLocaleString();
                if (count >= 10000) {
                    displayCount = (count / 1000).toFixed(1) + "k";
                }

                td.textContent = count > 0 ? displayCount : "-";

                // Atributos de datos
                td.dataset.year = year;
                td.dataset.month = month;
                td.dataset.count = count;

                // Comprobar si está seleccionado
                if (this.selectedCell.year === year && this.selectedCell.month === month) {
                    td.classList.add("ring-2", "ring-cyan-400", "scale-105", "z-20", "shadow-lg");
                }

                // Tooltip amigable y fácil de entender
                const isAbove = rec && rec.activeAnomalyPct > 0;
                const statusBadgeColor = rec ? (rec.statusLevel === 4 ? '#f43f5e' : rec.statusLevel === 3 ? '#fb923c' : rec.statusLevel === 2 ? '#facc15' : '#10b981') : '#94a3b8';
                
                const tooltipHtml = `
                    <div class="font-bold text-white text-sm mb-1.5 flex items-center justify-between border-b border-slate-700/80 pb-1">
                        <span>${rec ? rec.monthName : ''} ${year}</span>
                        <span style="color: ${statusBadgeColor}; font-size: 10px; font-weight: bold;">● ${rec ? rec.computedStatus : 'Normal'}</span>
                    </div>
                    <div class="text-xs space-y-1">
                        <div class="flex justify-between gap-4"><span>🔥 Focos activos:</span> <strong class="text-amber-300 font-mono">${count.toLocaleString()}</strong></div>
                        <div class="flex justify-between gap-4 text-slate-300"><span>📊 Promedio habitual:</span> <span class="font-mono">${rec ? rec.historicalMedian.toLocaleString() : 'N/A'}</span></div>
                        <div class="flex justify-between gap-4"><span>📈 Variación:</span> <strong class="${isAbove ? 'text-rose-400' : 'text-emerald-400'} font-mono">${rec ? (isAbove ? '+' : '') + rec.activeAnomalyPct + '%' : 'N/A'}</strong></div>
                        <div class="flex justify-between gap-4 text-slate-400 text-[11px] pt-0.5 border-t border-slate-800">
                            <span>📡 Satélite:</span> <span>${rec ? rec.sensorTag : 'MODIS'}</span>
                        </div>
                    </div>
                    <div class="mt-2 pt-1 border-t border-slate-800 text-[10px] text-sky-300 text-center font-medium">
                        👆 Toca para seleccionar y ver análisis IA
                    </div>
                `;
                td.setAttribute("data-tooltip", tooltipHtml);

                // Eventos
                td.addEventListener("click", () => {
                    this.selectCell(year, month, rec, processedData);
                });

                td.addEventListener("mouseenter", (e) => this.showTooltip(e, td));
                td.addEventListener("mouseleave", () => this.hideTooltip());

                tr.appendChild(td);
            });

            // Columna de Total Anual
            const totalTd = document.createElement("td");
            totalTd.className = "p-2 text-right font-mono font-bold text-amber-300";
            totalTd.textContent = yearTotal.toLocaleString();
            tr.appendChild(totalTd);

            tbody.appendChild(tr);
        });

        table.appendChild(tbody);
        wrapper.appendChild(table);
        this.container.appendChild(wrapper);

        // Renderizar barra de leyenda
        this.renderLegend(minVal, maxVal);
    }

    selectCell(year, month, record, processedData) {
        this.selectedCell = { year, month };
        
        // Actualizar visualmente la clase de celda activa
        const cells = this.container.querySelectorAll(".calendar-cell");
        cells.forEach(cell => {
            if (+cell.dataset.year === year && +cell.dataset.month === month) {
                cell.classList.add("ring-2", "ring-cyan-400", "scale-105", "z-20", "shadow-lg");
            } else {
                cell.classList.remove("ring-2", "ring-cyan-400", "scale-105", "z-20", "shadow-lg");
            }
        });

        if (this.onSelectCallback && record) {
            this.onSelectCallback(record, processedData);
        }
    }

    renderLegend(minVal, maxVal) {
        let legendContainer = document.getElementById("calendar-legend-bar");
        if (!legendContainer) return;

        legendContainer.innerHTML = "";
        const steps = 10;
        const gradientStops = [];
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const color = this.interpolateColor(this.palettes[this.currentPalette], t);
            gradientStops.push(`${color} ${t * 100}%`);
        }

        const legendHtml = `
            <div class="flex items-center justify-between text-xs text-slate-400 mt-2 px-1">
                <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-slate-700"></span> 0 fuegos (Bajo)</span>
                <div class="w-48 sm:w-64 h-3.5 rounded-full shadow-inner border border-slate-700 overflow-hidden" 
                     style="background: linear-gradient(to right, ${gradientStops.join(', ')})"></div>
                <span class="flex items-center gap-1.5 font-mono text-amber-300">Pico Máximo (${maxVal.toLocaleString()}) <span class="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span></span>
            </div>
        `;
        legendContainer.innerHTML = legendHtml;
    }

    interpolateColor(colorStops, t) {
        if (t <= 0) return colorStops[0][1];
        if (t >= 1) return colorStops[colorStops.length - 1][1];

        let lower = colorStops[0];
        let upper = colorStops[colorStops.length - 1];

        for (let i = 0; i < colorStops.length - 1; i++) {
            if (t >= colorStops[i][0] && t <= colorStops[i + 1][0]) {
                lower = colorStops[i];
                upper = colorStops[i + 1];
                break;
            }
        }

        const range = upper[0] - lower[0];
        const fraction = range === 0 ? 0 : (t - lower[0]) / range;

        const c1 = this.hexToRgb(lower[1]);
        const c2 = this.hexToRgb(upper[1]);

        const r = Math.round(c1.r + (c2.r - c1.r) * fraction);
        const g = Math.round(c1.g + (c2.g - c1.g) * fraction);
        const b = Math.round(c1.b + (c2.b - c1.b) * fraction);

        return `rgb(${r}, ${g}, ${b})`;
    }

    hexToRgb(hex) {
        hex = hex.replace("#", "");
        if (hex.length === 3) {
            hex = hex.split("").map(c => c + c).join("");
        }
        const num = parseInt(hex, 16);
        return {
            r: (num >> 16) & 255,
            g: (num >> 8) & 255,
            b: num & 255
        };
    }

    getContrastingTextColor(rgbString) {
        const matches = rgbString.match(/\d+/g);
        if (!matches || matches.length < 3) return "#ffffff";
        const r = +matches[0];
        const g = +matches[1];
        const b = +matches[2];
        // Luminancia percibida W3C
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance > 0.58 ? "#090d16" : "#f8fafc";
    }

    showTooltip(event, cell) {
        let tooltip = document.getElementById("calendar-floating-tooltip");
        if (!tooltip) {
            tooltip = document.createElement("div");
            tooltip.id = "calendar-floating-tooltip";
            tooltip.className = "fixed pointer-events-none z-50 p-3 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-2xl text-xs max-w-xs transition-opacity duration-150";
            document.body.appendChild(tooltip);
        }

        tooltip.innerHTML = cell.getAttribute("data-tooltip");
        tooltip.style.opacity = "1";

        const rect = cell.getBoundingClientRect();
        const tooltipX = rect.left + rect.width / 2;
        const tooltipY = rect.top - 10;

        tooltip.style.left = `${Math.min(window.innerWidth - 220, Math.max(10, tooltipX - 100))}px`;
        tooltip.style.top = `${Math.max(10, tooltipY - tooltip.offsetHeight)}px`;
    }

    hideTooltip() {
        const tooltip = document.getElementById("calendar-floating-tooltip");
        if (tooltip) {
            tooltip.style.opacity = "0";
        }
    }
}

// Instancia global
window.burnCalendar = new BurnCalendar("burn-calendar-container");
