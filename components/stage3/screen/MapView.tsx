"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import { Map as MapLibreMap, Marker, setWorkerUrl } from "maplibre-gl";
import { cn } from "@/lib/cn";
import styles from "./screen.module.css";

/** OpenFreeMap's light "positron" style: free, no key. */
const STYLE_URL = "https://tiles.openfreemap.org/styles/positron";
const BANGKOK: [number, number] = [100.5018, 13.7563];
const WORKER_URL = "/maplibre/maplibre-gl-worker.mjs";

/**
 * The real map, centred on Bangkok with a pulsing violet marker. Loaded only
 * when the Location tab first opens (see LocationMap). It is not interactive,
 * so it never captures scrolling, and it fades in over the placeholder once
 * its tiles are ready. If WebGL or the tiles fail, the placeholder stays.
 */
export default function MapView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let map: MapLibreMap;
    try {
      // Served from /public by scripts/copy-maplibre-worker.mjs: the bundler
      // cannot place MapLibre's worker itself.
      setWorkerUrl(WORKER_URL);
      map = new MapLibreMap({
        container,
        style: STYLE_URL,
        center: BANGKOK,
        zoom: 11.5,
        interactive: false,
        // Default options: collapses to the "i" button on a narrow container,
        // and keeps the credit OpenFreeMap and OpenStreetMap require.
        attributionControl: {},
      });
    } catch {
      return; // no WebGL: keep the placeholder
    }

    const pin = document.createElement("span");
    pin.className = styles.marker;
    new Marker({ element: pin }).setLngLat(BANGKOK).addTo(map);

    map.on("load", () => {
      // MapLibre keeps the attribution open until the map first moves, and
      // this map never moves. Collapse it; the "i" toggle keeps the credit.
      const attribution = container.querySelector(".maplibregl-ctrl-attrib");
      attribution?.classList.remove("maplibregl-compact-show");
      attribution?.removeAttribute("open");
      setReady(true);
    });
    return () => map.remove();
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(styles.mapView, ready && styles.mapReady)}
      aria-hidden="true"
    />
  );
}
