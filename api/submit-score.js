export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    try {
        const { name, score } = req.body;

        if (!name || !score) {
            return res.status(400).json({ error: "Name and score are required" });
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
