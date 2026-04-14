const EARTH_RADIUS_KM = 6371;

const toRadians = (deg) => (deg * Math.PI) / 180;

export const haversineDistanceKm = (a, b) => {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);

  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLng / 2);

  const h = s1 * s1 + Math.cos(lat1) * Math.cos(lat2) * s2 * s2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
};

const interpolate = (start, end, t) => ({
  lat: start.lat + (end.lat - start.lat) * t,
  lng: start.lng + (end.lng - start.lng) * t
});

const dynamicWarehouseCount = (distanceKm) => {
  // Always keep at least 3 hubs, add more as route length increases.
  const additional = Math.floor(distanceKm / 1500);
  return Math.min(10, Math.max(3, 3 + additional));
};

export const computeShipmentRoute = ({
  originName,
  destinationName,
  originCoordinates,
  destinationCoordinates
}) => {
  const hasOrigin = Number.isFinite(originCoordinates?.lat) && Number.isFinite(originCoordinates?.lng);
  const hasDestination = Number.isFinite(destinationCoordinates?.lat) && Number.isFinite(destinationCoordinates?.lng);

  if (!hasOrigin || !hasDestination) return null;

  const distanceKm = haversineDistanceKm(originCoordinates, destinationCoordinates);
  const warehouseCount = dynamicWarehouseCount(distanceKm);

  const warehouses = Array.from({ length: warehouseCount }, (_, index) => {
    const t = (index + 1) / (warehouseCount + 1);
    const point = interpolate(originCoordinates, destinationCoordinates, t);

    return {
      id: `wh-${index + 1}`,
      name: `Warehouse Hub ${index + 1}`,
      lat: Number(point.lat.toFixed(6)),
      lng: Number(point.lng.toFixed(6)),
      type: 'warehouse',
      sequence: index + 1
    };
  });

  const origin = {
    name: originName || 'Origin',
    lat: originCoordinates.lat,
    lng: originCoordinates.lng,
    type: 'origin'
  };

  const destination = {
    name: destinationName || 'Destination',
    lat: destinationCoordinates.lat,
    lng: destinationCoordinates.lng,
    type: 'destination'
  };

  return {
    distanceKm,
    warehouseCount,
    origin,
    destination,
    warehouses,
    path: [origin, ...warehouses, destination]
  };
};
