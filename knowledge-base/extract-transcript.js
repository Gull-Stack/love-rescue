// Extract transcript from current YouTube video page
// Returns transcript text or error message
async function extractTranscript() {
    // First try to find and click "Show transcript" button
    const buttons = document.querySelectorAll('button');
    let transcriptBtn = null;
    for (const btn of buttons) {
        if (btn.textContent.trim() === 'Show transcript') {
            transcriptBtn = btn;
            break;
        }
    }
    
    if (!transcriptBtn) {
        // Try expanding description first
        const moreBtn = document.querySelector('#expand');
        if (moreBtn) {
            moreBtn.click();
            await new Promise(r => setTimeout(r, 1000));
            // Try again
            for (const btn of document.querySelectorAll('button')) {
                if (btn.textContent.trim() === 'Show transcript') {
                    transcriptBtn = btn;
                    break;
                }
            }
        }
    }
    
    if (!transcriptBtn) {
        return 'ERROR: No transcript button found';
    }
    
    transcriptBtn.click();
    await new Promise(r => setTimeout(r, 2000));
    
    // Extract transcript segments
    const panel = document.querySelector('ytd-transcript-renderer');
    if (!panel) return 'ERROR: No transcript panel';
    
    const segments = panel.querySelectorAll('ytd-transcript-segment-renderer');
    if (!segments.length) return 'ERROR: No transcript segments';
    
    const texts = [];
    segments.forEach(s => {
        const t = s.querySelector('.segment-text');
        if (t) texts.push(t.textContent.trim());
    });
    
    return texts.join('\n');
}

return await extractTranscript();
