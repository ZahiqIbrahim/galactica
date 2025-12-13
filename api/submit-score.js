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
        
        // Get existing scores and preserve the original format
        let originalFormat = null; // Track if it was an array or object
        if (apiKey && binId !== "default-bin-id") {
            try {
                const getResponse = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, {
                    headers: {
                        "X-Master-Key": apiKey
                    }
                });
                
                if (getResponse.ok) {
                    const data = await getResponse.json();
                    const record = data.record;
                    
                    // Check the format and preserve it
                    if (Array.isArray(record)) {
                        scores = record;
                        originalFormat = 'array';
                    } else if (record && typeof record === 'object' && record.scores) {
                        scores = record.scores || [];
                        originalFormat = 'object';
                    } else {
                        scores = [];
                        originalFormat = 'object'; // Default to object format since that's what the bin was created with
                    }
                    
                    console.log("Loaded scores format:", originalFormat, "count:", scores.length);
                }
            } catch (fetchErr) {
                console.error("JSONBin fetch error:", fetchErr);
                originalFormat = 'object'; // Default to object format
            }
        } else {
            originalFormat = 'object'; // Default format
        }

        // Check if player name already exists and handle best score logic
        const existingPlayerIndex = scores.findIndex(entry => entry.name.toLowerCase() === name.toLowerCase());
        
        if (existingPlayerIndex !== -1) {
            // Player exists, compare scores
            const existingScore = scores[existingPlayerIndex].score;
            
            if (score > existingScore) {
                // New score is better, replace the existing entry
                scores[existingPlayerIndex] = { name, score, date: Date.now() };
                console.log(`Updated ${name}'s score from ${existingScore} to ${score}`);
            } else {
                // Existing score is better or equal, don't add the new score
                console.log(`${name}'s existing score ${existingScore} is better than or equal to new score ${score}, keeping existing`);
            }
        } else {
            // New player, add the score
            scores.push({ name, score, date: Date.now() });
            console.log(`Added new player ${name} with score ${score}`);
        }

        // Remove any duplicate entries for the same player (case-insensitive)
        // This handles edge cases where there might be multiple entries
        const uniqueScores = [];
        const seenPlayers = new Set();
        
        for (const entry of scores) {
            const playerKey = entry.name.toLowerCase();
            if (!seenPlayers.has(playerKey)) {
                seenPlayers.add(playerKey);
                uniqueScores.push(entry);
            } else {
                // If we find a duplicate, keep the one with higher score
                const existingIndex = uniqueScores.findIndex(e => e.name.toLowerCase() === playerKey);
                if (existingIndex !== -1 && entry.score > uniqueScores[existingIndex].score) {
                    uniqueScores[existingIndex] = entry;
                }
            }
        }
        
        scores = uniqueScores;

        // Sort highest score first and keep only top 100
        scores.sort((a, b) => b.score - a.score);
        scores = scores.slice(0, 100);

        // Prepare data to save - preserve original format
        let dataToSave;
        if (originalFormat === 'array') {
            dataToSave = scores;
        } else {
            // Save as object with scores property
            dataToSave = { scores: scores };
        }

        // Save back to JSONBin
        if (apiKey && binId !== "default-bin-id") {
            try {
                console.log("Saving to JSONBin, format:", originalFormat, "data:", JSON.stringify(dataToSave).substring(0, 100));
                const updateResponse = await fetch(`https://api.jsonbin.io/v3/b/${binId}`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "X-Master-Key": apiKey
                    },
                    body: JSON.stringify(dataToSave)
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
