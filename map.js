/**
 * IGNIS-Harmonize: Módulo Cartográfico Interactivo (Leaflet.js)
 * 
 * Permite:
 * - Visualización de la región seleccionada y biomas clave
 * - Capas satelitales (Esri World Imagery, CartoDB Dark Matter, OpenStreetMap)
 * - Simulación de puntos calientes activos con gradiente térmico
 * - Dibujo interactivo de Área de Interés (Bounding Box / ROI)
 * - Entrada manual de coordenadas de Latitud y Longitud
 */

class FireMapManager {
    constructor(mapContainerId) {
        this.containerId = mapContainerId;
        this.map = null;
        this.currentRegionLayer = null;
        this.hotspotsLayer = null;
        this.drawLayer = null;
        this.isDrawing = false;
        this.drawStartPoint = null;
        this.drawRectangle = null;
    }

    init() {
        if (!document.getElementById(this.containerId)) return;

        // Capas base
        const cartoDark = L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
            attribution: '&copy; <a href="https://carto.com/">CARTO</a> & NASA FIRMS',
            maxZoom: 18
        });

        const esriSatellite = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
            attribution: 'Tiles &copy; Esri, Earthstar Geographics',
            maxZoom: 18
        });

        const osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 18
        });

        this.map = L.map(this.containerId, {
            center: [-16.5, -60.5],
            zoom: 6,
            layers: [cartoDark],
            zoomControl: false
        });

        L.control.zoom({ position: "topright" }).addTo(this.map);

        const baseMaps = {
            "Oscuro CartoDB (Predeterminado)": cartoDark,
            "Satelital (Esri World Imagery)": esriSatellite,
            "OpenStreetMap": osm
        };

        L.control.layers(baseMaps, null, { position: "topright" }).addTo(this.map);

        this.currentRegionLayer = L.featureGroup().addTo(this.map);
        this.hotspotsLayer = L.featureGroup().addTo(this.map);
        this.drawLayer = L.featureGroup().addTo(this.map);

        this.setupCustomDrawing();
    }

    /**
     * Recalcula el tamaño del mapa cuando se activa la pestaña del mapa
     */
    invalidateSize() {
        if (this.map) {
            setTimeout(() => {
                this.map.invalidateSize();
            }, 150);
        }
    }

    /**
     * Centra y visualiza la región seleccionada
     */
    updateRegion(region, activeRecord = null) {
        if (!this.map) return;

        this.currentRegionLayer.clearLayers();
        this.hotspotsLayer.clearLayers();

        // Dibujar polígono/rectángulo de la región
        const bounds = region.bounds;
        const rect = L.rectangle(bounds, {
            color: "#38bdf8",
            weight: 2,
            fillColor: "#0284c7",
            fillOpacity: 0.15,
            dashArray: "6, 4"
        }).addTo(this.currentRegionLayer);

        rect.bindPopup(`
            <div class="text-xs p-1">
                <strong class="text-sky-300 font-bold block mb-1">${region.name}</strong>
                <div>Bioma: <span class="text-slate-300">${region.biome}</span></div>
                <div>Ratio VIIRS/MODIS: <span class="font-mono text-amber-300">${region.viirsRatio}x</span></div>
            </div>
        `);

        this.map.flyToBounds(bounds, { padding: [25, 25], duration: 1.2 });

        // Generar puntos calientes simulados según el conteo del mes activo
        this.renderHotspotsSample(region, activeRecord);
    }

    /**
     * Muestra una muestra visual representativa de puntos calientes en el mapa
     */
    renderHotspotsSample(region, activeRecord) {
        if (!activeRecord || !this.hotspotsLayer) return;

        this.hotspotsLayer.clearLayers();
        const count = activeRecord.activeCount || 500;
        
        // Muestra de puntos proporcional para rendimiento (máx 150 puntos visibles)
        const sampleSize = Math.min(150, Math.max(15, Math.round(count / 150)));
        const [[minLat, minLon], [maxLat, maxLon]] = region.bounds;

        // Distribución con agrupamiento (clusters de fuego realistas)
        const clusters = 4;
        const centers = [];
        for (let c = 0; c < clusters; c++) {
            centers.push({
                lat: minLat + Math.random() * (maxLat - minLat),
                lon: minLon + Math.random() * (maxLon - minLon)
            });
        }

        for (let i = 0; i < sampleSize; i++) {
            const cluster = centers[Math.floor(Math.random() * clusters)];
            const lat = cluster.lat + (Math.random() - 0.5) * (maxLat - minLat) * 0.4;
            const lon = cluster.lon + (Math.random() - 0.5) * (maxLon - minLon) * 0.4;

            // FRP simulado
            const frp = activeRecord.frpMeanMW * (0.6 + Math.random() * 0.9);
            const radius = Math.min(8, Math.max(3, Math.round(frp / 25)));
            
            // Color según FRP
            const color = frp > 120 ? "#f43f5e" : frp > 70 ? "#fb923c" : "#facc15";

            const marker = L.circleMarker([lat, lon], {
                radius: radius,
                fillColor: color,
                color: "#ffffff",
                weight: 0.5,
                opacity: 0.9,
                fillOpacity: 0.75
            });

            marker.bindTooltip(`
                <div class="text-xs">
                    <div>🔥 <strong>Punto Caliente FIRMS</strong></div>
                    <div>FRP: ${frp.toFixed(1)} MW</div>
                    <div>Confianza: ${(80 + Math.random() * 19).toFixed(0)}%</div>
                </div>
            `);

            this.hotspotsLayer.addLayer(marker);
        }
    }

    /**
     * Herramienta interactiva para dibujar un Área de Interés (Bounding Box)
     */
    setupCustomDrawing() {
        const drawBtn = document.getElementById("btn-draw-roi");
        if (!drawBtn) return;

        drawBtn.addEventListener("click", () => {
            this.toggleDrawMode(drawBtn);
        });
    }

    toggleDrawMode(btn) {
        this.isDrawing = !this.isDrawing;
        if (this.isDrawing) {
            btn.classList.add("bg-rose-600", "text-white", "animate-pulse");
            btn.classList.remove("bg-slate-800", "text-slate-300");
            btn.innerHTML = `<i class="fas fa-crosshairs mr-1.5"></i> Haz clic y arrastra en el mapa`;
            this.map.getContainer().style.cursor = "crosshair";
            this.map.dragging.disable();

            this.map.once("mousedown", (e) => {
                this.drawStartPoint = e.latlng;
                
                const onMouseMove = (moveEvent) => {
                    if (!this.drawStartPoint) return;
                    const bounds = L.latLngBounds(this.drawStartPoint, moveEvent.latlng);
                    if (this.drawRectangle) {
                        this.drawRectangle.setBounds(bounds);
                    } else {
                        this.drawRectangle = L.rectangle(bounds, {
                            color: "#f43f5e",
                            weight: 2,
                            fillColor: "#f43f5e",
                            fillOpacity: 0.2
                        }).addTo(this.drawLayer);
                    }
                };

                const onMouseUp = (upEvent) => {
                    this.map.off("mousemove", onMouseMove);
                    this.map.off("mouseup", onMouseUp);
                    this.map.dragging.enable();
                    this.map.getContainer().style.cursor = "";

                    const finalBounds = L.latLngBounds(this.drawStartPoint, upEvent.latlng);
                    this.finishCustomDrawing(finalBounds, btn);
                };

                this.map.on("mousemove", onMouseMove);
                this.map.on("mouseup", onMouseUp);
            });
        } else {
            this.resetDrawButton(btn);
        }
    }

    resetDrawButton(btn) {
        this.isDrawing = false;
        btn.classList.remove("bg-rose-600", "text-white", "animate-pulse");
        btn.classList.add("bg-slate-800", "text-slate-300");
        btn.innerHTML = `<i class="fas fa-draw-polygon mr-1.5 text-sky-400"></i> Dibujar Área (ROI)`;
        this.map.getContainer().style.cursor = "";
        this.map.dragging.enable();
    }

    finishCustomDrawing(bounds, btn) {
        this.resetDrawButton(btn);
        const southWest = bounds.getSouthWest();
        const northEast = bounds.getNorthEast();

        // Actualizar inputs de coordenadas
        const latMinInput = document.getElementById("coord-lat-min");
        const latMaxInput = document.getElementById("coord-lat-max");
        const lonMinInput = document.getElementById("coord-lon-min");
        const lonMaxInput = document.getElementById("coord-lon-max");

        if (latMinInput) latMinInput.value = southWest.lat.toFixed(3);
        if (latMaxInput) latMaxInput.value = northEast.lat.toFixed(3);
        if (lonMinInput) lonMinInput.value = southWest.lng.toFixed(3);
        if (lonMaxInput) lonMaxInput.value = northEast.lng.toFixed(3);

        // Notificar al controlador principal para recalcular
        if (window.appCoordinator && window.appCoordinator.handleCustomCoordinates) {
            window.appCoordinator.handleCustomCoordinates([
                [southWest.lat, southWest.lng],
                [northEast.lat, northEast.lng]
            ]);
        }
    }

    setManualCoordinates(latMin, latMax, lonMin, lonMax) {
        const bounds = [[latMin, lonMin], [latMax, lonMax]];
        this.drawLayer.clearLayers();
        L.rectangle(bounds, {
            color: "#38bdf8",
            weight: 2,
            fillColor: "#0284c7",
            fillOpacity: 0.2
        }).addTo(this.drawLayer);
        this.map.flyToBounds(bounds, { padding: [20, 20] });
    }
}

// Instancia global
window.fireMapManager = new FireMapManager("fire-map-container");
