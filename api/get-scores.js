export default async function handler(req, res) {
    try {
        // Use JSONBin.io for free JSON storage
        const binId = process.env.JSONBIN_BIN_ID || "default-bin-id";
        const apiKey = process.env.JSONBIN_API_KEY || "";
        
        let scores = [];
        
        if (apiKey && binId !== "default-bin-id") {
            try {
                const response = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, {
                    headers: {
                        "X-Master-Key": apiKey
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    // Handle both array format and object with scores property
                    const record = data.record;
                    if (Array.isArray(record)) {
                        scores = record;
                    } else if (record && typeof record === 'object' && record.scores) {
                        scores = record.scores || [];
                    } else {
                        scores = [];
                    }
                    console.log(`Loaded ${scores.length} scores from JSONBin`);
                } else {
                    const errorText = await response.text();
                    console.error("JSONBin fetch failed:", response.status, errorText);
                }
            } catch (fetchErr) {
                console.error("JSONBin fetch error:", fetchErr);
            }
        } else {
            console.warn("JSONBin credentials not configured");
        }
        
        // Sort by score descending and limit to top 10
        scores.sort((a, b) => b.score - a.score);
        scores = scores.slice(0, 10);

        res.status(200).json(scores);
    } catch (err) {
        console.error("GET ERROR:", err);
        // Return empty array on error so the page still loads
        res.status(200).json([]);
    }
}
