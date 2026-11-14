/**
 * IGNIS-Harmonize: Coordinador Principal de la Aplicación
 * 
 * Gestiona el ciclo de vida, navegación por pestañas y sincronización entre:
 * - Selector de Ecorregiones y Navegador Rápido de Mes/Año
 * - Pestañas de Trabajo (Calendario, Mapa Satelital, Gemini AI, Panel de Administración)
 * - Motor de Armonización MODIS & VIIRS
 * - Carga personalizada de archivos CSV
 * - Mapas Leaflet y Gráficos Chart.js
 * - Gemini Fire Intelligence
 */

class AppCoordinator {
    constructor() {
        this.currentRegionKey = "chiquitania";
        this.selectedYear = 2024;
        this.selectedMonth = 8; // Agosto (pico de incendios)
        this.harmonizationMode = "harmonized";
        this.currentPalette = "inferno";
        this.processedData = null;
        this.activeRecord = null;
        this.activeTab = "tab-calendar";
    }

    init() {
        console.log("Inicializando IGNIS-Harmonize (Modo Intuitivo y Accesible)...");

        // 1. Inicializar mapa
        window.fireMapManager.init();

        // 2. Cargar estado inicial de Gemini
        window.geminiFireIntelligence.updateConnectionStatus();

        // 3. Configurar listeners de la interfaz
        this.setupEventListeners();
        this.setupTabNavigation();
        this.setupQuickMonthNavigation();
        this.setupCsvDropzone();

        // 4. Cargar dataset inicial
        this.loadRegion(this.currentRegionKey);

        // 5. Configurar callbacks del calendario
        window.burnCalendar.onSelect((record, processedData) => {
            this.handleCellSelect(record, processedData);
        });
    }

    setupEventListeners() {
        // Selector de Región
        const regionSelect = document.getElementById("region-select");
        if (regionSelect) {
            regionSelect.addEventListener("change", (e) => {
                this.loadRegion(e.target.value);
            });
        }

        // Modo de Armonización (Botones de administración)
        const modeButtons = document.querySelectorAll(".harmonization-mode-btn");
        modeButtons.forEach(btn => {
            btn.addEventListener("click", () => {
                modeButtons.forEach(b => {
                    b.classList.remove("bg-sky-600", "text-white", "shadow-lg", "border-sky-400");
                    b.classList.add("bg-slate-800", "text-slate-300", "border-slate-700");
                });
                btn.classList.add("bg-sky-600", "text-white", "shadow-lg", "border-sky-400");
                btn.classList.remove("bg-slate-800", "text-slate-300", "border-slate-700");

                this.harmonizationMode = btn.dataset.mode;
                this.recalculateAndRender();
            });
        });

        // Selector de Paleta de Color
        const paletteSelect = document.getElementById("palette-select");
        if (paletteSelect) {
            paletteSelect.addEventListener("change", (e) => {
                this.currentPalette = e.target.value;
                window.burnCalendar.setPalette(this.currentPalette);
                window.burnCalendar.render(this.processedData);
            });
        }

        // Botón Diagnóstico Gemini
        const btnGeminiReport = document.getElementById("btn-generate-gemini-report");
        if (btnGeminiReport) {
            btnGeminiReport.addEventListener("click", () => {
                this.requestGeminiReport();
            });
        }

        // Botón secundario en el resumen del mes
        const btnAnalyzeMonth = document.getElementById("btn-analyze-current-month");
        if (btnAnalyzeMonth) {
            btnAnalyzeMonth.addEventListener("click", () => {
                this.switchTab("tab-gemini");
                this.requestGeminiReport();
            });
        }

        // Botón Descargar CSV
        const btnDownloadCsv = document.getElementById("btn-download-csv");
        if (btnDownloadCsv) {
            btnDownloadCsv.addEventListener("click", () => {
                this.downloadDatasetCSV();
            });
        }

        // Modal de API Key de Gemini
        this.setupApiKeyModal();

        // Chat de Gemini
        this.setupChatUI();

        // Suite Gemini 2.0: Pestañas y Nuevas Capacidades
        this.setupGeminiTabs();
        this.setupRadioDispatch();
        this.setupOfficialBulletin();
        this.setupVisionMultimodal();
        this.setupScenarioSimulator();

        // Coordenadas manuales
        const btnApplyCoords = document.getElementById("btn-apply-coords");
        if (btnApplyCoords) {
            btnApplyCoords.addEventListener("click", () => {
                const latMin = parseFloat(document.getElementById("coord-lat-min").value);
                const latMax = parseFloat(document.getElementById("coord-lat-max").value);
                const lonMin = parseFloat(document.getElementById("coord-lon-min").value);
                const lonMax = parseFloat(document.getElementById("coord-lon-max").value);

                if (!isNaN(latMin) && !isNaN(latMax) && !isNaN(lonMin) && !isNaN(lonMax)) {
                    window.fireMapManager.setManualCoordinates(latMin, latMax, lonMin, lonMax);
                    this.handleCustomCoordinates([[latMin, lonMin], [latMax, lonMax]]);
                } else {
                    alert("Por favor ingrese coordenadas numéricas válidas.");
                }
            });
        }
    }

    /**
     * Sistema de Pestañas (Vistas Claras y Espaciosas)
     */
    setupTabNavigation() {
        const tabButtons = document.querySelectorAll(".nav-tab-btn");
        tabButtons.forEach(btn => {
            btn.addEventListener("click", () => {
                const targetTab = btn.dataset.tab;
                this.switchTab(targetTab);
            });
        });
    }

    switchTab(tabId) {
        this.activeTab = tabId;

        // Actualizar botones
        const tabButtons = document.querySelectorAll(".nav-tab-btn");
        tabButtons.forEach(btn => {
            if (btn.dataset.tab === tabId) {
                btn.className = "nav-tab-btn flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-sky-600 text-white shadow-lg shadow-sky-950/40 border border-sky-400 transition-all";
            } else {
                btn.className = "nav-tab-btn flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-all";
            }
        });

        // Actualizar paneles
        const panes = document.querySelectorAll(".tab-content-pane");
        panes.forEach(pane => {
            if (pane.id === tabId) {
                pane.classList.remove("hidden");
                pane.classList.add("block");
            } else {
                pane.classList.add("hidden");
                pane.classList.remove("block");
            }
        });

        // Si se activa el mapa, recalcular tamaño de Leaflet para visualización perfecta
        if (tabId === "tab-map") {
            window.fireMapManager.invalidateSize();
        }

        // Si se activa el calendario o los gráficos, asegurar redibujado
        if (tabId === "tab-calendar" && this.processedData) {
            window.fireChartsManager.renderSeasonalityChart(this.processedData, this.selectedYear);
        }
        if (tabId === "tab-trends" && this.processedData) {
            window.fireChartsManager.renderTimeSeriesChart(this.processedData);
            window.fireChartsManager.renderAnomalyBarChart(this.processedData, this.selectedYear);
        }
    }

    /**
     * Navegación Rápida de Mes y Año (Botones ◀ y ▶)
     */
    setupQuickMonthNavigation() {
        const btnPrev = document.getElementById("btn-prev-month");
        const btnNext = document.getElementById("btn-next-month");

        if (btnPrev) {
            btnPrev.addEventListener("click", () => this.navigateMonth(-1));
        }
        if (btnNext) {
            btnNext.addEventListener("click", () => this.navigateMonth(1));
        }
    }

    navigateMonth(delta) {
        let newMonth = this.selectedMonth + delta;
        let newYear = this.selectedYear;

        if (newMonth < 1) {
            newMonth = 12;
            newYear = Math.max(2001, newYear - 1);
        } else if (newMonth > 12) {
            newMonth = 1;
            newYear = Math.min(2024, newYear + 1);
        }

        const targetRecord = this.processedData.records.find(r => r.year === newYear && r.month === newMonth);
        if (targetRecord) {
            window.burnCalendar.selectCell(newYear, newMonth, targetRecord, this.processedData);
        }
    }

    /**
     * Zona de Carga de Archivo CSV (Panel de Administración)
     */
    setupCsvDropzone() {
        const fileInput = document.getElementById("csv-file-input");
        const dropzone = document.getElementById("csv-dropzone");

        if (!fileInput || !dropzone) return;

        dropzone.addEventListener("click", () => fileInput.click());

        dropzone.addEventListener("dragover", (e) => {
            e.preventDefault();
            dropzone.classList.add("border-sky-400", "bg-sky-950/20");
        });

        dropzone.addEventListener("dragleave", () => {
            dropzone.classList.remove("border-sky-400", "bg-sky-950/20");
        });

        dropzone.addEventListener("drop", (e) => {
            e.preventDefault();
            dropzone.classList.remove("border-sky-400", "bg-sky-950/20");
            if (e.dataTransfer.files.length) {
                this.handleUploadedCSV(e.dataTransfer.files[0]);
            }
        });

        fileInput.addEventListener("change", (e) => {
            if (e.target.files.length) {
                this.handleUploadedCSV(e.target.files[0]);
            }
        });
    }

    handleUploadedCSV(file) {
        const statusEl = document.getElementById("csv-upload-status");
        if (statusEl) {
            statusEl.textContent = `Procesando archivo: ${file.name}...`;
            statusEl.className = "text-xs text-sky-400 font-medium";
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target.result;
                const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
                if (lines.length < 2) throw new Error("El archivo CSV no contiene suficientes filas.");

                const headers = lines[0].toLowerCase().split(",").map(h => h.trim().replace(/['"]/g, ""));
                const yearIdx = headers.findIndex(h => h.includes("year") || h.includes("año"));
                const monthIdx = headers.findIndex(h => h.includes("month") || h.includes("mes"));
                const countIdx = headers.findIndex(h => h.includes("count") || h.includes("harmonized") || h.includes("focos"));

                if (yearIdx === -1 || monthIdx === -1) {
                    throw new Error("El CSV debe contener al menos las columnas 'year' y 'month'.");
                }

                alert(`¡Archivo CSV "${file.name}" cargado exitosamente!`);
                if (statusEl) {
                    statusEl.textContent = `✅ Archivo "${file.name}" cargado (${lines.length - 1} registros).`;
                    statusEl.className = "text-xs text-emerald-400 font-medium";
                }
            } catch (err) {
                alert(`Error al procesar el archivo CSV: ${err.message}`);
                if (statusEl) {
                    statusEl.textContent = `❌ Error: ${err.message}`;
                    statusEl.className = "text-xs text-rose-400 font-medium";
                }
            }
        };
        reader.readAsText(file);
    }

    loadRegion(regionKey) {
        this.currentRegionKey = regionKey;
        const timeSeriesData = generateHistoricalTimeSeries(regionKey);
        this.recalculateAndRender(timeSeriesData);
    }

    recalculateAndRender(timeSeriesData = null) {
        if (!timeSeriesData) {
            timeSeriesData = generateHistoricalTimeSeries(this.currentRegionKey);
        }

        // Procesar según el modo de armonización
        this.processedData = window.harmonizationEngine.processDataset(timeSeriesData, this.harmonizationMode);

        // Buscar el registro actualmente seleccionado
        this.activeRecord = this.processedData.records.find(
            r => r.year === this.selectedYear && r.month === this.selectedMonth
        ) || this.processedData.records[this.processedData.records.length - 5];

        // 1. Renderizar Calendario Matricial
        window.burnCalendar.setPalette(this.currentPalette);
        window.burnCalendar.render(this.processedData);

        // 2. Renderizar Gráficos
        window.fireChartsManager.renderSeasonalityChart(this.processedData, this.selectedYear);
        window.fireChartsManager.renderTimeSeriesChart(this.processedData);
        window.fireChartsManager.renderAnomalyBarChart(this.processedData, this.selectedYear);

        // 3. Actualizar Mapa
        window.fireMapManager.updateRegion(this.processedData.region, this.activeRecord);

        // 4. Actualizar Tarjetas KPI y Semáforo Humano
        this.updateKPICards();

        // 5. Actualizar alerta de discontinuidad si está en modo crudo
        this.updateDiscontinuityWarning();
    }

    handleCellSelect(record, processedData) {
        this.selectedYear = record.year;
        this.selectedMonth = record.month;
        this.activeRecord = record;

        // Actualizar gráficos
        window.fireChartsManager.renderSeasonalityChart(processedData, this.selectedYear);
        window.fireChartsManager.renderAnomalyBarChart(processedData, this.selectedYear);

        // Actualizar mapa
        window.fireMapManager.updateRegion(processedData.region, record);

        // Actualizar tarjetas de métricas
        this.updateKPICards();

        // Feedback sutil para sugerir generar diagnóstico
        const reportBadge = document.getElementById("gemini-report-focal-label");
        if (reportBadge) {
            reportBadge.textContent = `${record.monthName} ${record.year}`;
        }
    }

    updateKPICards() {
        if (!this.activeRecord) return;

        const rec = this.activeRecord;
        const reg = this.processedData.region;

        // KPI 1: Puntos Activos
        const kpiCount = document.getElementById("kpi-hotspots-count");
        if (kpiCount) kpiCount.textContent = rec.activeCount.toLocaleString();

        const kpiSensor = document.getElementById("kpi-hotspots-sensor");
        if (kpiSensor) kpiSensor.textContent = rec.sensorTag;

        // KPI 2: Anomalía
        const kpiAnomaly = document.getElementById("kpi-anomaly-pct");
        if (kpiAnomaly) {
            kpiAnomaly.textContent = (rec.activeAnomalyPct > 0 ? "+" : "") + rec.activeAnomalyPct + "%";
            kpiAnomaly.className = `text-2xl sm:text-3xl font-bold font-mono ${rec.activeAnomalyPct > 0 ? "text-rose-400" : "text-emerald-400"}`;
        }

        const kpiMedian = document.getElementById("kpi-historical-median");
        if (kpiMedian) kpiMedian.textContent = `Mediana: ${rec.historicalMedian.toLocaleString()} focos`;

        // KPI 3: Estado de Riesgo & Semáforo
        const kpiStatus = document.getElementById("kpi-risk-status");
        if (kpiStatus) {
            kpiStatus.textContent = rec.computedStatus;
            let badgeClass = "bg-slate-700 text-slate-200";
            if (rec.statusLevel === 4) badgeClass = "bg-rose-500/20 text-rose-300 border border-rose-500/30";
            else if (rec.statusLevel === 3) badgeClass = "bg-orange-500/20 text-orange-300 border border-orange-500/30";
            else if (rec.statusLevel === 2) badgeClass = "bg-amber-500/20 text-amber-300 border border-amber-500/30";
            else badgeClass = "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30";
            kpiStatus.className = `inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${badgeClass}`;
        }

        // Semáforo Global en el Header
        const headerPill = document.getElementById("main-emergency-pill");
        if (headerPill) {
            if (rec.statusLevel === 4) {
                headerPill.className = "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse";
                headerPill.innerHTML = `<span class="w-2 h-2 rounded-full bg-rose-500"></span> 🔴 Alerta Roja (Peligro Crítico)`;
            } else if (rec.statusLevel === 3) {
                headerPill.className = "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-500/20 text-orange-300 border border-orange-500/40";
                headerPill.innerHTML = `<span class="w-2 h-2 rounded-full bg-orange-500"></span> 🟠 Alerta Naranja (Alto Riesgo)`;
            } else if (rec.statusLevel === 2) {
                headerPill.className = "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40";
                headerPill.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-500"></span> 🟡 Alerta Amarilla (Vigilancia)`;
            } else {
                headerPill.className = "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40";
                headerPill.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-500"></span> 🟢 Alerta Verde (Condición Normal)`;
            }
        }

        // KPI 4: Potencia Radiativa (FRP)
        const kpiFrp = document.getElementById("kpi-frp-mean");
        if (kpiFrp) kpiFrp.textContent = rec.frpMeanMW + " MW";

        // Actualizar etiqueta del mes seleccionado
        const currentPeriodLabels = document.querySelectorAll(".active-period-indicator");
        currentPeriodLabels.forEach(lbl => {
            lbl.textContent = `${rec.monthName} de ${rec.year}`;
        });

        // Frase de Resumen Humano Explicativa
        const humanSummary = document.getElementById("human-status-summary");
        if (humanSummary) {
            const isAbove = rec.activeAnomalyPct > 0;
            const diffWord = isAbove ? "más incendios" : "menos incendios";
            humanSummary.innerHTML = `
                En <strong>${rec.monthName} de ${rec.year}</strong>, la región de <strong>${reg.name}</strong> registró 
                <strong class="text-amber-300 font-mono">${rec.activeCount.toLocaleString()} focos de calor</strong>, lo que representa un 
                <strong class="${isAbove ? 'text-rose-400' : 'text-emerald-400'}">${isAbove ? '+' : ''}${rec.activeAnomalyPct}% ${diffWord}</strong> que el promedio habitual histórico de los últimos 20 años (${rec.historicalMedian.toLocaleString()} focos).
            `;
        }
    }

    updateDiscontinuityWarning() {
        const warningBanner = document.getElementById("discontinuity-warning-banner");
        if (!warningBanner) return;

        if (this.harmonizationMode === "raw_discontinuous") {
            warningBanner.classList.remove("hidden");
            warningBanner.innerHTML = `
                <div class="flex items-start gap-3 p-3.5 bg-rose-950/50 border border-rose-500/50 rounded-2xl text-xs text-rose-200 shadow-lg">
                    <i class="fas fa-triangle-exclamation text-rose-400 text-lg mt-0.5 animate-bounce"></i>
                    <div>
                        <strong class="font-bold text-rose-300 text-sm">Demostración: Discontinuidad Satelital Activa (Sin Armonizar)</strong>
                        <p class="mt-0.5 text-rose-200/90 leading-relaxed">
                            Observa el salto artificial en el año 2012. Al no armonizar, la mayor resolución de VIIRS (375m) aparenta un falso aumento del 300% de incendios. Puedes volver a activar <strong class="text-sky-300 underline cursor-pointer" onclick="document.querySelector('[data-mode=\\'harmonized\\']').click()">"Armonizado (MODIS+VIIRS)"</strong> en la pestaña de Administración para corregir la serie temporal científicamente.
                        </p>
                    </div>
                </div>
            `;
        } else {
            warningBanner.classList.add("hidden");
        }
    }

    async requestGeminiReport() {
        const outputContainer = document.getElementById("gemini-report-output");
        const btn = document.getElementById("btn-generate-gemini-report");
        if (!outputContainer) return;

        outputContainer.innerHTML = `
            <div class="flex flex-col items-center justify-center p-8 text-center space-y-3">
                <div class="w-10 h-10 border-4 border-amber-500/20 border-t-amber-400 rounded-full animate-spin"></div>
                <p class="text-sm font-semibold text-slate-200">Consultando a Google Gemini AI...</p>
                <p class="text-xs text-slate-400">Analizando el régimen ecológico y anomalías de ${this.activeRecord.monthName} ${this.activeRecord.year}</p>
            </div>
        `;

        if (btn) btn.disabled = true;

        try {
            const report = await window.geminiFireIntelligence.generateExecutiveBriefing(
                this.processedData.region,
                this.activeRecord,
                this.processedData
            );

            outputContainer.innerHTML = this.formatMarkdown(report);
        } catch (error) {
            outputContainer.innerHTML = `
                <div class="p-4 bg-rose-900/30 border border-rose-700/50 rounded-xl text-xs text-rose-300">
                    <strong class="font-bold block mb-1">Error al generar diagnóstico:</strong>
                    ${error.message}
                </div>
            `;
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    setupChatUI() {
        const chatForm = document.getElementById("gemini-chat-form");
        const chatInput = document.getElementById("gemini-chat-input");
        const chatMessages = document.getElementById("gemini-chat-messages");

        if (chatForm && chatInput && chatMessages) {
            chatForm.addEventListener("submit", async (e) => {
                e.preventDefault();
                const msg = chatInput.value.trim();
                if (!msg) return;

                this.appendChatMessage("user", msg);
                chatInput.value = "";
                const typingId = this.appendChatTyping();

                try {
                    const reply = await window.geminiFireIntelligence.chatWithAssistant(msg, {
                        region: this.processedData.region,
                        selectedYear: this.selectedYear,
                        activeRecord: this.activeRecord,
                        mode: this.harmonizationMode
                    });

                    this.removeChatTyping(typingId);
                    this.appendChatMessage("assistant", reply);
                } catch (err) {
                    this.removeChatTyping(typingId);
                    this.appendChatMessage("assistant", "⚠️ Error al consultar con Gemini: " + err.message);
                }
            });

            // Prompt chips rápidos
            const chips = document.querySelectorAll(".quick-prompt-chip");
            chips.forEach(chip => {
                chip.addEventListener("click", () => {
                    chatInput.value = chip.dataset.prompt;
                    chatForm.dispatchEvent(new Event("submit"));
                });
            });
        }
    }

    appendChatMessage(role, text) {
        const chatMessages = document.getElementById("gemini-chat-messages");
        if (!chatMessages) return;

        const isUser = role === "user";
        const div = document.createElement("div");
        div.className = `flex gap-2.5 ${isUser ? "justify-end" : "justify-start"} text-xs leading-relaxed`;

        const bubble = document.createElement("div");
        bubble.className = `p-3.5 rounded-2xl max-w-[85%] ${
            isUser 
                ? "bg-sky-600 text-white rounded-br-none shadow-md" 
                : "bg-slate-800/90 text-slate-200 border border-slate-700/60 rounded-bl-none shadow-md"
        }`;
        bubble.innerHTML = this.formatMarkdown(text);

        div.appendChild(bubble);
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    appendChatTyping() {
        const chatMessages = document.getElementById("gemini-chat-messages");
        if (!chatMessages) return null;

        const id = "typing-" + Date.now();
        const div = document.createElement("div");
        div.id = id;
        div.className = "flex gap-2 justify-start text-xs text-slate-400";
        div.innerHTML = `
            <div class="p-3 bg-slate-800/80 rounded-2xl rounded-bl-none border border-slate-700/60 flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"></span>
                <span class="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.2s]"></span>
                <span class="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.4s]"></span>
            </div>
        `;
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return id;
    }

    removeChatTyping(id) {
        if (!id) return;
        const el = document.getElementById(id);
        if (el) el.remove();
    }

    setupApiKeyModal() {
        const modal = document.getElementById("gemini-key-modal");
        const btnOpen = document.getElementById("btn-open-api-modal");
        const btnClose = document.getElementById("btn-close-api-modal");
        const btnSave = document.getElementById("btn-save-api-key");
        const keyInput = document.getElementById("gemini-api-key-input");
        const modelSelect = document.getElementById("gemini-model-select");

        if (btnOpen && modal) {
            btnOpen.addEventListener("click", () => {
                if (keyInput) keyInput.value = window.geminiFireIntelligence.getApiKey();
                if (modelSelect) modelSelect.value = window.geminiFireIntelligence.getModel();
                modal.classList.remove("hidden");
                modal.classList.add("flex");
            });
        }

        if (btnClose && modal) {
            btnClose.addEventListener("click", () => {
                modal.classList.add("hidden");
                modal.classList.remove("flex");
            });
        }

        if (btnSave && modal) {
            btnSave.addEventListener("click", () => {
                if (keyInput) window.geminiFireIntelligence.setApiKey(keyInput.value);
                if (modelSelect) window.geminiFireIntelligence.setModel(modelSelect.value);
                modal.classList.add("hidden");
                modal.classList.remove("flex");
                alert("Configuración de Gemini actualizada correctamente.");
            });
        }
    }

    /**
     * Gestión de pestañas internas de Gemini Fire Intelligence
     */
    setupGeminiTabs() {
        const tabBtns = document.querySelectorAll(".gemini-tab-btn");
        const panels = document.querySelectorAll(".gemini-tab-panel");

        tabBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                const target = btn.dataset.tab;

                tabBtns.forEach(b => {
                    b.classList.remove("bg-sky-600", "text-white", "shadow-sm", "active");
                    b.classList.add("text-slate-400", "hover:text-slate-200");
                });
                btn.classList.add("bg-sky-600", "text-white", "shadow-sm", "active");
                btn.classList.remove("text-slate-400", "hover:text-slate-200");

                panels.forEach(p => {
                    if (p.id === `tab-content-${target}`) {
                        p.classList.remove("hidden");
                    } else {
                        p.classList.add("hidden");
                    }
                });
            });
        });
    }

    /**
     * Radio Despacho Táctico para Brigadas (Web Audio Chirp + SpeechSynthesis)
     */
    setupRadioDispatch() {
        const btnRadio = document.getElementById("btn-radio-dispatch");
        const btnStop = document.getElementById("btn-stop-radio");
        const banner = document.getElementById("radio-broadcasting-banner");

        if (btnRadio) {
            btnRadio.addEventListener("click", () => {
                this.playRadioDispatch();
            });
        }

        if (btnStop) {
            btnStop.addEventListener("click", () => {
                if (window.speechSynthesis) {
                    window.speechSynthesis.cancel();
                }
                if (banner) banner.classList.add("hidden");
            });
        }
    }

    playRadioDispatch() {
        if (!this.processedData || !this.activeRecord) return;
        const banner = document.getElementById("radio-broadcasting-banner");
        if (banner) banner.classList.remove("hidden");

        // 1. Tono de radio walkie-talkie militar con Web Audio API
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                const ctx = new AudioCtx();
                const now = ctx.currentTime;
                
                // Tono 1 (750 Hz)
                const osc1 = ctx.createOscillator();
                const gain1 = ctx.createGain();
                osc1.type = "sine";
                osc1.frequency.setValueAtTime(750, now);
                gain1.gain.setValueAtTime(0.15, now);
                gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
                osc1.connect(gain1);
                gain1.connect(ctx.destination);
                osc1.start(now);
                osc1.stop(now + 0.12);

                // Tono 2 (1150 Hz)
                const osc2 = ctx.createOscillator();
                const gain2 = ctx.createGain();
                osc2.type = "sine";
                osc2.frequency.setValueAtTime(1150, now + 0.14);
                gain2.gain.setValueAtTime(0.15, now + 0.14);
                gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
                osc2.connect(gain2);
                gain2.connect(ctx.destination);
                osc2.start(now + 0.14);
                osc2.stop(now + 0.28);
            }
        } catch (e) {
            console.warn("AudioContext no disponible:", e);
        }

        // 2. Transmisión de voz táctica con SpeechSynthesis
        const dispatchText = window.geminiFireIntelligence.synthesizeRadioDispatch(
            this.processedData.region,
            this.activeRecord
        );

        if ("speechSynthesis" in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(dispatchText);
            utterance.lang = "es-ES";
            utterance.rate = 1.05;
            utterance.pitch = 1.0;

            utterance.onend = () => {
                if (banner) banner.classList.add("hidden");
            };
            utterance.onerror = () => {
                if (banner) banner.classList.add("hidden");
            };

            setTimeout(() => {
                window.speechSynthesis.speak(utterance);
            }, 320);
        } else {
            alert(dispatchText);
            if (banner) banner.classList.add("hidden");
        }
    }

    /**
     * Boletín Oficial de Alerta Temprana & Protección Civil
     */
    setupOfficialBulletin() {
        const btnGenerate = document.getElementById("btn-generate-bulletin");
        const btnPrintDirect = document.getElementById("btn-print-bulletin-direct");
        const btnModalPrint = document.getElementById("btn-modal-print-action");
        const btnCloseModal = document.getElementById("btn-close-bulletin-modal");
        const modal = document.getElementById("bulletin-modal");

        if (btnGenerate) {
            btnGenerate.addEventListener("click", async () => {
                const output = document.getElementById("gemini-bulletin-output");
                if (!output) return;

                output.innerHTML = `
                    <div class="flex flex-col items-center justify-center p-8 text-center space-y-3">
                        <div class="w-10 h-10 border-4 border-rose-500/20 border-t-rose-500 rounded-full animate-spin"></div>
                        <p class="text-sm font-semibold text-rose-300">Redactando Boletín Oficial de Emergencia con Gemini...</p>
                        <p class="text-xs text-slate-400">Estructurando directivas vinculantes para el mando de incidentes</p>
                    </div>
                `;

                btnGenerate.disabled = true;
                try {
                    const result = await window.geminiFireIntelligence.generateOfficialBulletin(
                        this.processedData.region,
                        this.activeRecord,
                        this.processedData
                    );
                    this.lastGeneratedBulletin = result;
                    output.innerHTML = this.formatMarkdown(result.content);
                } catch (err) {
                    output.innerHTML = `<div class="p-4 bg-rose-950/40 border border-rose-700/60 rounded-xl text-rose-300">Error: ${err.message}</div>`;
                } finally {
                    btnGenerate.disabled = false;
                }
            });
        }

        const openBulletinModal = () => {
            if (!modal) return;
            const body = document.getElementById("modal-bulletin-body");
            const codeLabel = document.getElementById("modal-bulletin-code");

            if (!this.lastGeneratedBulletin) {
                // Generar uno inmediato si no existe aún
                btnGenerate.click();
            }

            if (this.lastGeneratedBulletin && body) {
                if (codeLabel) codeLabel.textContent = this.lastGeneratedBulletin.code;
                body.innerHTML = `
                    <div class="border-b-2 border-slate-900 pb-3 mb-4 flex justify-between items-start">
                        <div>
                            <h2 class="text-base font-extrabold uppercase tracking-wide text-slate-900">NASA FIRMS &bull; IGNIS Fire Intelligence</h2>
                            <p class="text-[11px] text-slate-600 font-serif">Centro Conjunto de Alerta Temprana de Incendios Forestales</p>
                        </div>
                        <div class="text-right font-mono text-[11px]">
                            <span class="font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded border border-rose-300">MANDO OPERATIVO</span>
                            <div class="text-slate-500 text-[10px] mt-1">${this.lastGeneratedBulletin.code}</div>
                        </div>
                    </div>
                    <div class="prose prose-sm max-w-none text-slate-800 leading-relaxed">
                        ${this.formatMarkdown(this.lastGeneratedBulletin.content)}
                    </div>
                    <div class="mt-8 pt-4 border-t border-slate-300 grid grid-cols-2 gap-8 text-[11px] text-slate-600">
                        <div class="border-t border-dashed border-slate-400 pt-2 text-center">
                            Firma: Comandante General de Incidencias
                        </div>
                        <div class="border-t border-dashed border-slate-400 pt-2 text-center">
                            Firma: Director de Gestión de Riesgo y Desastres
                        </div>
                    </div>
                `;
            }

            modal.classList.remove("hidden");
            modal.classList.add("flex");
        };

        if (btnPrintDirect) {
            btnPrintDirect.addEventListener("click", openBulletinModal);
        }

        if (btnModalPrint) {
            btnModalPrint.addEventListener("click", () => {
                window.print();
            });
        }

        if (btnCloseModal && modal) {
            btnCloseModal.addEventListener("click", () => {
                modal.classList.add("hidden");
                modal.classList.remove("flex");
            });
        }
    }

    /**
     * Analizador Multimodal de Frentes Térmicos y Drones con Gemini Vision
     */
    setupVisionMultimodal() {
        const sampleBtns = document.querySelectorAll(".vision-sample-btn");
        const dropzone = document.getElementById("vision-dropzone");
        const fileInput = document.getElementById("vision-file-input");
        const btnRunVision = document.getElementById("btn-run-vision-analysis");
        const output = document.getElementById("gemini-vision-output");

        this.currentVisionImage = {
            data: null,
            mimeType: "image/svg+xml",
            title: "Chiquitania: Térmico VIIRS (375m)"
        };

        // Cargar muestra por defecto
        this.loadSampleImage("assets/chiquitania_thermal_firms.svg", "Chiquitania: Térmico VIIRS (375m)");

        sampleBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                sampleBtns.forEach(b => {
                    b.classList.remove("border-sky-500", "bg-slate-800");
                    b.classList.add("border-slate-700", "bg-slate-900");
                });
                btn.classList.add("border-sky-500", "bg-slate-800");
                btn.classList.remove("border-slate-700", "bg-slate-900");

                const src = btn.dataset.src;
                const title = btn.dataset.title;
                this.loadSampleImage(src, title);
            });
        });

        if (dropzone && fileInput) {
            dropzone.addEventListener("click", (e) => {
                if (e.target.tagName !== "INPUT") fileInput.click();
            });

            dropzone.addEventListener("dragover", (e) => {
                e.preventDefault();
                dropzone.classList.add("border-sky-400", "bg-sky-950/30");
            });
            dropzone.addEventListener("dragleave", () => {
                dropzone.classList.remove("border-sky-400", "bg-sky-950/30");
            });
            dropzone.addEventListener("drop", (e) => {
                e.preventDefault();
                dropzone.classList.remove("border-sky-400", "bg-sky-950/30");
                if (e.dataTransfer.files.length) {
                    this.handleUploadedImage(e.dataTransfer.files[0]);
                }
            });

            fileInput.addEventListener("change", (e) => {
                if (e.target.files.length) {
                    this.handleUploadedImage(e.target.files[0]);
                }
            });
        }

        if (btnRunVision) {
            btnRunVision.addEventListener("click", async () => {
                if (!output) return;

                output.innerHTML = `
                    <div class="flex flex-col items-center justify-center p-6 text-center space-y-3">
                        <div class="w-8 h-8 border-3 border-sky-500/20 border-t-sky-400 rounded-full animate-spin"></div>
                        <p class="text-xs font-semibold text-sky-300">Analizando imagen satelital/dron con Gemini Vision...</p>
                        <p class="text-[11px] text-slate-500">Mapeando líneas de avance, dispersión de humo y riesgo de spotting</p>
                    </div>
                `;

                btnRunVision.disabled = true;
                try {
                    const result = await window.geminiFireIntelligence.analyzeMultimodalImage(
                        this.currentVisionImage.data,
                        this.currentVisionImage.mimeType,
                        {
                            region: this.processedData.region,
                            activeRecord: this.activeRecord
                        },
                        `Muestra analizada: ${this.currentVisionImage.title}`
                    );
                    output.innerHTML = this.formatMarkdown(result);
                } catch (err) {
                    output.innerHTML = `<div class="p-3 bg-rose-950/40 text-rose-300 rounded-lg">Error: ${err.message}</div>`;
                } finally {
                    btnRunVision.disabled = false;
                }
            });
        }
    }

    loadSampleImage(src, title) {
        const previewImg = document.getElementById("vision-preview-img");
        const previewContainer = document.getElementById("vision-preview-container");
        const previewEmpty = document.getElementById("vision-preview-empty");
        const previewTitle = document.getElementById("vision-preview-title");

        fetch(src)
            .then(res => res.text())
            .then(svgText => {
                const base64 = btoa(unescape(encodeURIComponent(svgText)));
                this.currentVisionImage = {
                    data: base64,
                    mimeType: "image/svg+xml",
                    title: title
                };

                if (previewImg && previewContainer && previewEmpty) {
                    previewImg.src = `data:image/svg+xml;base64,${base64}`;
                    previewEmpty.classList.add("hidden");
                    previewContainer.classList.remove("hidden");
                    if (previewTitle) previewTitle.textContent = title;
                }
            })
            .catch(err => console.warn("Error al cargar muestra visual:", err));
    }

    handleUploadedImage(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            const commaIndex = dataUrl.indexOf(",");
            const base64 = dataUrl.substring(commaIndex + 1);

            this.currentVisionImage = {
                data: base64,
                mimeType: file.type || "image/jpeg",
                title: file.name
            };

            const previewImg = document.getElementById("vision-preview-img");
            const previewContainer = document.getElementById("vision-preview-container");
            const previewEmpty = document.getElementById("vision-preview-empty");
            const previewTitle = document.getElementById("vision-preview-title");

            if (previewImg && previewContainer && previewEmpty) {
                previewImg.src = dataUrl;
                previewEmpty.classList.add("hidden");
                previewContainer.classList.remove("hidden");
                if (previewTitle) previewTitle.textContent = `Archivo: ${file.name}`;
            }
        };
        reader.readAsDataURL(file);
    }

    /**
     * Simulador de Escenarios "What-If" con Gemini
     */
    setupScenarioSimulator() {
        const droughtSlider = document.getElementById("sim-drought-slider");
        const complianceSlider = document.getElementById("sim-compliance-slider");
        const windSlider = document.getElementById("sim-wind-slider");

        const droughtVal = document.getElementById("sim-drought-val");
        const complianceVal = document.getElementById("sim-compliance-val");
        const windVal = document.getElementById("sim-wind-val");

        const btnRunSim = document.getElementById("btn-run-simulation");
        const output = document.getElementById("gemini-simulation-output");

        if (droughtSlider && droughtVal) {
            droughtSlider.addEventListener("input", (e) => {
                droughtVal.textContent = `+${e.target.value} días`;
            });
        }

        if (complianceSlider && complianceVal) {
            complianceSlider.addEventListener("input", (e) => {
                complianceVal.textContent = `${e.target.value}%`;
            });
        }

        if (windSlider && windVal) {
            windSlider.addEventListener("input", (e) => {
                windVal.textContent = `${e.target.value} km/h`;
            });
        }

        if (btnRunSim) {
            btnRunSim.addEventListener("click", async () => {
                if (!output) return;

                const params = {
                    droughtDays: parseInt(droughtSlider.value, 10) || 20,
                    compliancePct: parseInt(complianceSlider.value, 10) || 50,
                    windSpeedKmH: parseInt(windSlider.value, 10) || 35
                };

                output.innerHTML = `
                    <div class="flex flex-col items-center justify-center p-6 text-center space-y-3">
                        <div class="w-8 h-8 border-3 border-emerald-500/20 border-t-emerald-400 rounded-full animate-spin"></div>
                        <p class="text-xs font-semibold text-emerald-300">Simulando régimen de fuego con Gemini AI...</p>
                        <p class="text-[11px] text-slate-500">Modelando ${params.droughtDays} días de sequía y vientos de ${params.windSpeedKmH} km/h</p>
                    </div>
                `;

                btnRunSim.disabled = true;
                try {
                    const result = await window.geminiFireIntelligence.simulateScenario(
                        this.processedData.region,
                        this.activeRecord,
                        params
                    );
                    output.innerHTML = this.formatMarkdown(result);
                } catch (err) {
                    output.innerHTML = `<div class="p-3 bg-rose-950/40 text-rose-300 rounded-lg">Error: ${err.message}</div>`;
                } finally {
                    btnRunSim.disabled = false;
                }
            });
        }
    }

    handleCustomCoordinates(bounds) {
        this.recalculateAndRender();
    }

    downloadDatasetCSV() {
        if (!this.processedData) return;
        const csvContent = window.harmonizationEngine.generateCSV(this.processedData);
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `NASA_FIRMS_Harmonized_${this.currentRegionKey}_${this.harmonizationMode}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    formatMarkdown(text) {
        if (!text) return "";
        let html = text
            .replace(/### (.*?)\n/g, '<h4 class="font-bold text-amber-300 text-sm mt-3 mb-1.5">$1</h4>')
            .replace(/## (.*?)\n/g, '<h3 class="font-bold text-sky-300 text-base mt-3.5 mb-2">$1</h3>')
            .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>')
            .replace(/\*(.*?)\*/g, '<em class="text-slate-300">$1</em>')
            .replace(/---/g, '<hr class="border-slate-700/60 my-3" />')
            .replace(/\n\n/g, '<p class="my-2 leading-relaxed"></p>')
            .replace(/\n- (.*?)/g, '<li class="ml-4 list-disc text-slate-300 my-1 leading-relaxed">$1</li>');
        return html;
    }
}

// Instancia global e inicio al cargar DOM
window.appCoordinator = new AppCoordinator();
document.addEventListener("DOMContentLoaded", () => {
    window.appCoordinator.init();
});
