const DEFAULT_LIMIT = 8;

const mapNominatimRecord = (item) => ({
  id: item.place_id,
  name: item.display_name,
  lat: Number(item.lat),
  lng: Number(item.lon),
  country: item.address?.country || null,
  state: item.address?.state || item.address?.region || null,
  city: item.address?.city || item.address?.town || item.address?.village || item.address?.county || null,
  display: item.display_name
});

const fetchPlaces = async (query, limit = DEFAULT_LIMIT) => {
  const params = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    addressdetails: '1',
    limit: String(limit)
  });

  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'PharmaChain-Inventory-Demo/1.0'
    }
  });

  if (!response.ok) {
    throw new Error(`Location lookup failed with status ${response.status}`);
  }

  const data = await response.json();
  return data.map(mapNominatimRecord);
};

const searchLocations = async (req, res) => {
  try {
    const query = String(req.query.query || '').trim();
    const limit = Math.min(parseInt(req.query.limit, 10) || DEFAULT_LIMIT, 12);

    if (!query || query.length < 2) {
      return res.json({
        success: true,
        data: []
      });
    }

    const data = await fetchPlaces(query, limit);

    res.json({
      success: true,
      count: data.length,
      data
    });
  } catch (error) {
    console.error('Location search error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search locations'
    });
  }
};

module.exports = {
  searchLocations
};
