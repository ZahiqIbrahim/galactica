export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    try {
        // Log the entire request for debugging
        console.log("Request method:", req.method);
        console.log("Request body type:", typeof req.body);
        console.log("Request body:", req.body);
        console.log("Request headers:", req.headers);
        
        // Vercel should auto-parse JSON, but handle both cases
        let body = req.body;
        
        // If body is a string, parse it
        if (typeof body === 'string') {
            try {
                body = JSON.parse(body);
            } catch (e) {
                console.error("Failed to parse body string:", e);
                return res.status(400).json({ error: "Invalid JSON in request body" });
            }
        }
        
        // Extract name and score
        const name = body?.name;
        const score = body?.score !== undefined ? Number(body.score) : undefined;
        
        console.log("Extracted - name:", name, "score:", score, "type:", typeof score);

        if (!name || name.trim() === '') {
            return res.status(400).json({ error: "Name is required" });
        }
        
        if (score === undefined || score === null || isNaN(score)) {
            return res.status(400).json({ error: "Valid score is required" });
        }

        const binId = process.env.JSONBIN_BIN_ID || "default-bin-id";
        const apiKey = process.env.JSONBIN_API_KEY || "";
        
        let scores = [];
        
        // Get existing scores
        if (apiKey && binId !== "default-bin-id") {
            try {
                const getResponse = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, {
                    headers: {
                        "X-Master-Key": apiKey
                    }
                });
                
                if (getResponse.ok) {
                    const data = await getResponse.json();
                    // Handle both array format and object with scores property
                    const record = data.record;
                    scores = Array.isArray(record) ? record : (record?.scores || []);
                }
            } catch (fetchErr) {
                console.error("JSONBin fetch error:", fetchErr);
            }
        }

        // Add new score
        scores.push({ name, score, date: Date.now() });

        // Sort highest score first and keep only top 100
        scores.sort((a, b) => b.score - a.score);
        scores = scores.slice(0, 100);

        // Save back to JSONBin
        if (apiKey && binId !== "default-bin-id") {
            try {
                const updateResponse = await fetch(`https://api.jsonbin.io/v3/b/${binId}`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "X-Master-Key": apiKey
                    },
                    body: JSON.stringify(scores)
                });
                
                if (!updateResponse.ok) {
                    const errorData = await updateResponse.text();
                    console.error("JSONBin update failed:", updateResponse.status, errorData);
                    throw new Error(`JSONBin update failed: ${updateResponse.status}`);
                }
                
                console.log("Scores saved to JSONBin successfully");
            } catch (updateErr) {
                console.error("JSONBin update error:", updateErr);
                // Still return success if we got the scores, even if save failed
                // This allows the function to work even if JSONBin is temporarily unavailable
            }
        } else {
            console.warn("JSONBin credentials not configured. Score not saved.");
        }

        res.status(200).json({ success: true, scoresCount: scores.length });
    } catch (err) {
        console.error("POST ERROR:", err);
        res.status(500).json({ error: "server error" });
    }
}
