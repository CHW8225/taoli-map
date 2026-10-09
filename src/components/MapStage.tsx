"use client";

import AMapLoader from "@amap/amap-jsapi-loader";
import { useEffect, useMemo, useRef, useState } from "react";

import { ORIGIN, type LocationPoint } from "../data/locations";
import { groupStudentsByLocation, type StudentRecord } from "../domain/student-data";

declare global {
  interface Window {
    Loca?: any;
    _AMapSecurityConfig?: { serviceHost: string };
  }
}

interface MapStageProps {
  amapKey: string;
  locations: Record<string, LocationPoint>;
  visibleStudents: StudentRecord[];
  activeStudent: StudentRecord | null;
  finale: boolean;
}

interface MapRuntime {
  AMap: any;
  map: any;
  loca: any;
  lineLayer: any;
  pointLayer: any;
  infoWindow: any;
  markers: any[];
}

function createOriginMarkerElement() {
  const marker = document.createElement("div");
  marker.className = "amap-origin";
  const ring = document.createElement("i");
  const core = document.createElement("b");
  const label = document.createElement("span");
  label.textContent = `${ORIGIN.displayName} · 出发地`;
  marker.append(ring, core, label);
  return marker;
}

function createDestinationMarkerElement(count: number) {
  const marker = document.createElement("button");
  marker.type = "button";
  marker.className = "destination-marker";
  marker.setAttribute("aria-label", `查看该地点的${count}名学生`);

  const core = document.createElement("i");
  const badge = document.createElement("span");
  badge.textContent = String(count);
  marker.append(core, badge);
  return marker;
}

function createLocationPopup(
  location: LocationPoint,
  students: StudentRecord[]
) {
  const popup = document.createElement("section");
  popup.className = "location-popup";

  const title = document.createElement("strong");
  title.textContent = `${location.displayName} · ${students.length}人`;
  popup.append(title);

  students.forEach((student) => {
    const row = document.createElement("p");
    row.textContent = `${student.name}｜${student.graduationYear ?? "届次待确认"}${student.graduationYear ? "届" : ""}`;
    popup.append(row);
  });

  return popup;
}

function destinationFeatures(students: StudentRecord[], locations: Record<string, LocationPoint>) {
  return students.flatMap((student) => {
    if (!student.locationKey || student.locationKey === ORIGIN.key) return [];
    const destination = locations[student.locationKey];
    if (!destination) return [];
    return [
      {
        type: "Feature",
        properties: { id: student.id, name: student.name, location: destination.displayName },
        geometry: { type: "LineString", coordinates: [ORIGIN.coordinates, destination.coordinates] }
      }
    ];
  });
}

function pointFeatures(students: StudentRecord[], locations: Record<string, LocationPoint>) {
  const counts = new Map<string, number>();
  students.forEach((student) => {
    if (student.locationKey && student.locationKey !== ORIGIN.key) {
      counts.set(student.locationKey, (counts.get(student.locationKey) ?? 0) + 1);
    }
  });
  return [...counts.entries()].flatMap(([key, count]) => {
    const location = locations[key];
    return location
      ? [{ type: "Feature", properties: { key, count }, geometry: { type: "Point", coordinates: location.coordinates } }]
      : [];
  });
}

function FallbackMap({
  locations,
  visibleStudents,
  activeStudent
}: Pick<MapStageProps, "locations" | "visibleStudents" | "activeStudent">) {
  const domestic = visibleStudents.filter((student) => student.locationKey && locations[student.locationKey]);
  const toPoint = (coordinates: [number, number]) => ({
    x: ((coordinates[0] - 73) / 62) * 1000,
    y: ((54 - coordinates[1]) / 36) * 600
  });
  const origin = toPoint(ORIGIN.coordinates);

  return (
    <div className="fallback-map" data-testid="map-fallback">
      <div className="fallback-copy">
        <span>演示底图</span>
        <strong>等待地图授权</strong>
        <small>配置高德 Key 后自动切换为中国地图</small>
      </div>
      <svg className="fallback-network" viewBox="0 0 1000 600" aria-hidden="true">
        <defs>
          <linearGradient id="routeGlow" x1="0" x2="1">
            <stop offset="0" stopColor="#ffc86b" />
            <stop offset="1" stopColor="#32e6ff" />
          </linearGradient>
          <filter id="glow"><feGaussianBlur stdDeviation="3" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        {domestic.map((student, index) => {
          const point = toPoint(locations[student.locationKey!].coordinates);
          const active = student.id === activeStudent?.id;
          const lift = 70 + (index % 4) * 14;
          return (
            <g key={student.id} className={active ? "route active" : "route"}>
              <path
                d={`M ${origin.x} ${origin.y} Q ${(origin.x + point.x) / 2} ${Math.min(origin.y, point.y) - lift} ${point.x} ${point.y}`}
              />
              <circle cx={point.x} cy={point.y} r={active ? 7 : 3.5} />
            </g>
          );
        })}
        <g
          className={activeStudent?.locationKey === ORIGIN.key ? "origin-glyph blooming" : "origin-glyph"}
          transform={`translate(${origin.x} ${origin.y})`}
        >
          <circle r="22" />
          <circle r="8" />
        </g>
      </svg>
      <div className={activeStudent?.locationType === "overseas" ? "overseas-beam visible" : "overseas-beam"} aria-hidden="true" />
      <div className="origin-label">{ORIGIN.displayName} · 出发地</div>
    </div>
  );
}

export function MapStage({ amapKey, locations, visibleStudents, activeStudent, finale }: MapStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<MapRuntime | null>(null);
  const [mapState, setMapState] = useState<"idle" | "loading" | "ready" | "error">(amapKey ? "loading" : "idle");

  const domesticVisible = useMemo(
    () => visibleStudents.filter((student) => student.locationType === "domestic"),
    [visibleStudents]
  );

  useEffect(() => {
    if (!amapKey || !containerRef.current) return;
    let cancelled = false;
    window._AMapSecurityConfig = { serviceHost: "/_AMapService" };

    AMapLoader.load({ key: amapKey, version: "2.0", plugins: [], Loca: { version: "2.0.0" } })
      .then((AMap: any) => {
        if (cancelled || !containerRef.current || !window.Loca) return;
        const map = new AMap.Map(containerRef.current, {
          center: [104.5, 35.5],
          zoom: 4.25,
          pitch: 22,
          viewMode: "3D",
          mapStyle: "amap://styles/darkblue",
          showLabel: true,
          showBuildingBlock: false
        });
        const loca = new window.Loca.Container({ map });
        const lineLayer = new window.Loca.PulseLinkLayer({ zIndex: 120, opacity: 1, visible: true, zooms: [2, 22], depth: true });
        const pointLayer = new window.Loca.ScatterLayer({ zIndex: 121, opacity: 0.85, visible: true, zooms: [2, 22] });
        loca.add(lineLayer);
        loca.add(pointLayer);
        loca.animate.start();

        const originMarker = new AMap.Marker({
          position: ORIGIN.coordinates,
          anchor: "center",
          content: createOriginMarkerElement(),
          zIndex: 300
        });
        map.add(originMarker);
        runtimeRef.current = {
          AMap,
          map,
          loca,
          lineLayer,
          pointLayer,
          infoWindow: new AMap.InfoWindow({ anchor: "bottom-center", offset: new AMap.Pixel(0, -14) }),
          markers: [originMarker]
        };
        setMapState("ready");
      })
      .catch(() => {
        if (!cancelled) setMapState("error");
      });

    return () => {
      cancelled = true;
      runtimeRef.current?.loca?.destroy?.();
      runtimeRef.current?.map?.destroy?.();
      runtimeRef.current = null;
    };
  }, [amapKey]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime || !window.Loca) return;
    const lines = destinationFeatures(domesticVisible, locations);
    const points = pointFeatures(domesticVisible, locations);
    runtime.lineLayer.setSource(new window.Loca.GeoJSONSource({ data: { type: "FeatureCollection", features: lines } }));
    runtime.lineLayer.setStyle({
      unit: "meter",
      dash: finale ? [30000, 10000, 30000, 10000] : [50000, 0, 50000, 0],
      lineWidth: () => [finale ? 9000 : 16000, 1000],
      height: (_index: number, feature: any) => Math.max(120000, Math.abs(feature.coordinates[1][0] - ORIGIN.coordinates[0]) * 35000),
      smoothSteps: 40,
      speed: finale ? 220000 : 140000,
      flowLength: 90000,
      lineColors: ["rgba(255,202,106,.95)", "rgba(51,230,255,.92)", "rgba(45,93,255,.7)"],
      maxHeightScale: 0.28,
      headColor: "rgba(255,255,255,1)",
      trailColor: "rgba(51,230,255,0)"
    });
    runtime.pointLayer.setSource(new window.Loca.GeoJSONSource({ data: { type: "FeatureCollection", features: points } }));
    runtime.pointLayer.setStyle({
      unit: "meter",
      size: (_index: number, feature: any) => {
        const size = 65000 + feature.properties.count * 10000;
        return [size, size];
      },
      borderWidth: 3,
      color: "rgba(51,230,255,.35)",
      borderColor: "rgba(133,244,255,1)",
      duration: 1800,
      animate: true
    });

    if (runtime.markers.length > 1) {
      runtime.map.remove(runtime.markers.slice(1));
      runtime.markers = runtime.markers.slice(0, 1);
    }
    runtime.infoWindow.close();

    groupStudentsByLocation(domesticVisible)
      .filter((group) => group.locationKey !== ORIGIN.key && locations[group.locationKey])
      .forEach((group) => {
        const location = locations[group.locationKey];
        const marker = new runtime.AMap.Marker({
          position: location.coordinates,
          anchor: "center",
          content: createDestinationMarkerElement(group.students.length),
          zIndex: 260
        });
        const openPopup = () => {
          runtime.infoWindow.setContent(createLocationPopup(location, group.students));
          runtime.infoWindow.open(runtime.map, location.coordinates);
        };
        marker.on("click", openPopup);
        marker.on("mouseover", openPopup);
        runtime.markers.push(marker);
      });
    runtime.map.add(runtime.markers.slice(1));
  }, [domesticVisible, finale, locations, mapState]);

  if (!amapKey || mapState === "error") {
    return <FallbackMap locations={locations} visibleStudents={domesticVisible} activeStudent={activeStudent} />;
  }

  return (
    <div className="map-shell">
      <div ref={containerRef} className="amap-container" />
      {mapState === "loading" && <div className="map-loading">正在点亮中国地图…</div>}
      <div className={activeStudent?.locationKey === ORIGIN.key ? "local-bloom visible" : "local-bloom"} aria-hidden="true" />
      <div className={activeStudent?.locationType === "overseas" ? "overseas-beam visible" : "overseas-beam"} aria-hidden="true" />
    </div>
  );
}
