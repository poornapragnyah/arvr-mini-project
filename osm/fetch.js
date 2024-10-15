import fetch from 'node-fetch';

const fetchOsmData = async (minLat, minLon, maxLat, maxLon) => {
    console.log(`Fetching OSM data for bounds: ${minLat}, ${minLon}, ${maxLat}, ${maxLon}`);
    const query = `
    [out:json];
    (
      way["building"]
        (${minLat},${minLon},${maxLat},${maxLon});
    );
    out geom;
    `;
    
    try {
        const response = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            body: query,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });
        
        const data = await response.json();
        console.log("OSM data fetched successfully:", JSON.stringify(data, null, 2));
    } catch (error) {
        console.error("Error fetching OSM data:", error);
    }
};

// Replace the coordinates below with your desired bounds
const minLat = 40.7128;
const minLon = -74.0060;
const maxLat = 40.7138;
const maxLon = -74.0050;

fetchOsmData(minLat, minLon, maxLat, maxLon);
