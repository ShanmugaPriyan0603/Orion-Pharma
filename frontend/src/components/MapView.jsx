import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { computeShipmentRoute } from '../utils/routePlanner';

const STAGE_COORDINATES = {
  manufacturer: { lat: 40.7128, lng: -74.0060, name: 'New York (Manufacturer)' },
  warehouse: { lat: 39.9526, lng: -75.1652, name: 'Philadelphia (Warehouse)' },
  distributor: { lat: 38.9072, lng: -77.0369, name: 'Washington DC (Distributor)' },
  pharmacy: { lat: 35.2271, lng: -80.8431, name: 'Charlotte (Pharmacy)' }
};

const createIcon = (color = '#0071e3') => {
  return L.divIcon({
    html: `<div style="
      background-color: ${color};
      width: 14px;
      height: 14px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    "></div>`,
    className: 'custom-marker',
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });
};

const truckIcon = L.divIcon({
  html: `<div style="
    font-size: 22px;
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
  ">🚛</div>`,
  className: 'truck-marker',
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});

const markerIcon = (emoji) => L.divIcon({
  html: `<div style="font-size: 18px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.25));">${emoji}</div>`,
  className: 'route-marker',
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

const MapView = ({
  currentStage,
  stages = [],
  origin,
  destination,
  originCoordinates,
  destinationCoordinates
}) => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  useEffect(() => {
    if (!mapInstance.current && mapRef.current) {
      mapInstance.current = L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: false
      }).setView([38.5, -77.5], 6);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19
      }).addTo(mapInstance.current);

      L.control.zoom({ position: 'topright' }).addTo(mapInstance.current);
    }

    const map = mapInstance.current;
    if (!map) return;

    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline) {
        map.removeLayer(layer);
      }
    });

    const dynamicRoute = computeShipmentRoute({
      originName: origin,
      destinationName: destination,
      originCoordinates,
      destinationCoordinates
    });

    const markers = [];

    if (dynamicRoute) {
      const routeNodes = dynamicRoute.path;
      const routePoints = routeNodes.map((node) => [node.lat, node.lng]);

      L.polyline(routePoints, {
        color: '#0071e3',
        weight: 4,
        opacity: 0.8
      }).addTo(map);

      routeNodes.forEach((node, idx) => {
        let icon = markerIcon('📍');
        let description = 'Checkpoint';

        if (idx === 0) {
          icon = markerIcon('🏭');
          description = 'Origin';
        } else if (idx === routeNodes.length - 1) {
          icon = markerIcon('🏥');
          description = 'Destination';
        } else {
          icon = markerIcon('📦');
          description = 'Warehouse';
        }

        L.marker([node.lat, node.lng], { icon })
          .addTo(map)
          .bindPopup(`
            <div style="color: #1d1d1f; font-family: -apple-system, sans-serif; font-size: 13px;">
              <strong>${node.name}${node.state ? `, ${node.state}` : ''}</strong><br/>
              ${description}
            </div>
          `);

        markers.push([node.lat, node.lng]);
      });

      const stageOrder = ['manufacturer', 'warehouse', 'distributor', 'pharmacy'];
      const currentIndex = Math.max(stageOrder.indexOf(currentStage), 0);
      const truckNodeIndex = Math.min(
        Math.round((currentIndex / (stageOrder.length - 1)) * (routeNodes.length - 1)),
        routeNodes.length - 1
      );
      const truckNode = routeNodes[truckNodeIndex];

      L.marker([truckNode.lat, truckNode.lng], { icon: truckIcon })
        .addTo(map)
        .bindPopup('<strong style="color: #1d1d1f; font-family: -apple-system, sans-serif; font-size: 13px;">Current Position</strong>');
    } else {
      const stageEntries = Object.entries(STAGE_COORDINATES);

      stageEntries.forEach(([key, coords]) => {
        const isCurrentStage = currentStage === key;
        const isCompleted = stages.some((s) => s.location === key);

        const marker = L.marker([coords.lat, coords.lng], {
          icon: isCurrentStage ? truckIcon : createIcon(isCompleted ? '#34c759' : '#86868b')
        }).addTo(map);

        marker.bindPopup(`
          <div style="color: #1d1d1f; font-family: -apple-system, sans-serif; font-size: 13px;">
            <strong>${coords.name}</strong><br/>
            ${isCurrentStage ? '📍 Current' : isCompleted ? '✅ Visited' : '⏳ Pending'}
          </div>
        `);

        markers.push([coords.lat, coords.lng]);
      });

      const routePoints = stageEntries
        .filter(([key]) => {
          const index = stageEntries.findIndex(([k]) => k === key);
          const currentIdx = stageEntries.findIndex(([k]) => k === currentStage);
          return index <= currentIdx;
        })
        .map(([, coords]) => [coords.lat, coords.lng]);

      if (routePoints.length > 1) {
        L.polyline(routePoints, {
          color: '#34c759',
          weight: 3,
          opacity: 0.8,
          dashArray: '8, 8'
        }).addTo(map);
      }
    }

    if (markers.length > 0) {
      const group = L.featureGroup(markers.map((pos) => L.marker(pos)));
      map.fitBounds(group.getBounds().pad(0.2));
    }

  }, [currentStage, stages, origin, destination, originCoordinates, destinationCoordinates]);

  return (
    <div className="relative w-full h-full min-h-[300px] rounded-2xl overflow-hidden border border-gray-200 map-container">
      <div ref={mapRef} className="w-full h-full" />
      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-4 py-3 rounded-xl border border-gray-200 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900">Shipment Route</h3>
        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
            Route
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
            Completed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-300"></span>
            Pending
          </span>
        </div>
      </div>
    </div>
  );
};

export default MapView;
