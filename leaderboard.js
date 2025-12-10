async function loadLeaderboard() {
    try {
        const res = await fetch("/api/get-scores");
        
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const scores = await res.json();

        const lbDiv = document.getElementById("leaderboard");
        
        if (!lbDiv) {
            console.error("Leaderboard div not found");
            return;
        }
        
        if (!scores || scores.length === 0) {
            lbDiv.innerHTML = "<h2>Top Players</h2><p>No scores yet. Be the first!</p>";
            return;
        }
        
        lbDiv.innerHTML = "<h2>Top Players</h2>";

        scores.forEach((entry, index) => {
            lbDiv.innerHTML += `
                <p>${index + 1}. <strong>${entry.name}</strong> — ${entry.score}</p>
            `;
        });
    } catch (err) {
        console.error("Error loading leaderboard:", err);
        const lbDiv = document.getElementById("leaderboard");
        if (lbDiv) {
            lbDiv.innerHTML = "<h2>Top Players</h2><p>Unable to load leaderboard.</p>";
        }
    }
}

// Load leaderboard when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadLeaderboard);
} else {
    loadLeaderboard();
}

// Also reload leaderboard after a score is submitted
window.addEventListener('scoreSubmitted', loadLeaderboard);