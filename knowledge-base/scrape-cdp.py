#!/usr/bin/env python3
"""Scrape YouTube transcripts via CDP connection to existing browser."""

import asyncio, json, os, re, sys
from playwright.async_api import async_playwright

BASE = "/Users/strongestavenger/.openclaw/workspace/love-rescue/knowledge-base"
CDP_URL = "http://127.0.0.1:18800"

VIDEOS = {
    "gottman": [
        ("1o30Ps-_8is", "Four Horsemen of the Apocalypse", "The Gottman Institute", "~5 min"),
        ("nBN9zG1JNPg", "Even Healthy Couples Fight - the Difference Is How | TED", "TED", "~17 min"),
        ("910-SqNfno4", "5 Ways to Strengthen Your Relationship in 24 Hours", "The Gottman Institute", "~8 min"),
        ("nQ5DYlbi9y8", "The Key Habits for a Successful Relationship", "The Gottman Institute", "~12 min"),
        ("_ci6R4kAvnE", "7 Steps to a Better Relationship", "The Gottman Institute", "~6 min"),
        ("ib7Ain2aVR0", "The Easiest Way to Improve Your Relationship", "The Gottman Institute", "~5 min"),
        ("SqPvgDYmJnY", "Relationship Repair that Works | Dr. John Gottman", "The Gottman Institute", "~8 min"),
        ("bShsyKUFjKE", "How to Complain Without Hurting Your Partner", "The Gottman Institute", "~6 min"),
        ("-uazFBCDvVw", "The Science of Love | John Gottman | TEDxVeniceBeach", "TEDx Talks", "~27 min"),
        ("QHN2EKd9tuE", "Invest in Your Relationship: The Emotional Bank Account", "The Gottman Institute", "~5 min"),
        ("mS3bfCt0K88", "The Gottman Doctors | The Diary Of A CEO", "The Diary Of A CEO", "~90 min"),
        ("V8XlHGHP98I", "Eight Dates: Essential Conversations for a Lifetime of Love", "Family Action Network", "~60 min"),
        ("8r9bfEIOc5E", "Good Relationships: The Gottman Method | Ten Percent Happier", "10% Happier", "~45 min"),
        ("LLXX8wzvT7c", "Making Relationships Work Part 1", "The Gottman Institute", "~15 min"),
        ("DYzbEJ2nbOA", "Three Tips on the Right Way for Couples to Fight", "The Gottman Institute", "~4 min"),
        ("kk1TxUgMCtQ", "The Truth About Every Marriage: Dr. Julie Gottman", "The Gottman Institute", "~10 min"),
    ],
    "sue-johnson": [
        ("5aH2Ppjpcho", "An Interview with Dr. Sue Johnson on EFT", "PsychAlive", "~25 min"),
        ("xoMJd3Aag3U", "Sue Johnson: Are We Wired for Love? TEDx", "TEDx Talks", "~18 min"),
        ("P1KEfQyx2yo", "Sue Johnson: Creating Connection - Hold Me Tight", "PsychAlive", "~20 min"),
        ("7lLjHkbpjKo", "EFT: Changing the Way We See Relationships", "ICEEFT", "~20 min"),
        ("bpQnJqCFPEQ", "Dr. Sue Johnson on Love and Attachment", "PsychAlive", "~10 min"),
        ("BOkC0KfFq6E", "Sue Johnson: Emotionally Focused Therapy", "PsychAlive", "~15 min"),
        ("rCdRqaR3kOM", "Sue Johnson - The Power of Hold Me Tight", "Psychotherapy.net", "~8 min"),
        ("sOLVilFfr0Q", "Sue Johnson on the Neuroscience of Human Connection", "PsychAlive", "~12 min"),
        ("BRTnQrjyDAY", "The Practice of EFT | Sue Johnson", "Psychotherapy.net", "~30 min"),
        ("dGs9NMqhGmI", "Dr. Sue Johnson on EFT and the Science of Love", "ICEEFT", "~15 min"),
        ("oflMtfBWJjQ", "Hold Me Tight: Conversations for Connection", "Sue Johnson", "~10 min"),
    ],
    "esther-perel": [
        ("P2AUat93a8Q", "Rethinking Infidelity | TED", "TED", "~21 min"),
        ("sa0RUmGTCYY", "The Secret to Desire in a Long-Term Relationship | TED", "TED", "~19 min"),
        ("ierRipP1mMo", "Mating in Captivity | Talks at Google", "Talks at Google", "~55 min"),
        ("5iu9_8Vsmtk", "Esther Perel: Modern Love and Relationships", "Esther Perel", "~15 min"),
        ("eyRqfNwYAUk", "Relationships in the 21st Century | Esther Perel", "Esther Perel", "~20 min"),
        ("K9K0e0IB-LA", "Esther Perel on Conflict in Relationships", "Esther Perel", "~10 min"),
        ("y8lGY2VFMhA", "The Quality of Your Relationships Determines Quality of Life", "Esther Perel", "~15 min"),
        ("6o2aFRKd3ic", "How to Not Let Work Destroy Your Relationship", "Esther Perel", "~10 min"),
        ("IFOGPojjQlg", "The Power of Erotic Intelligence", "Intelligence Squared", "~60 min"),
        ("1o4snJz3KjI", "Esther Perel at SXSW: The State of Affairs", "SXSW", "~55 min"),
        ("JLm4_NfCPaI", "Esther Perel: The Future of Love | SXSW", "SXSW", "~50 min"),
        ("jE59WnCxo-o", "Esther Perel on Erotic Desire | Lewis Howes", "Lewis Howes", "~60 min"),
    ],
    "chris-voss": [
        ("MjhDkNmtjy0", "Never Split the Difference | TEDx", "TEDx Talks", "~15 min"),
        ("8EguLJgkc54", "Chris Voss: FBI Negotiation Tactics | Lex Fridman", "Lex Fridman", "~150 min"),
        ("guZa7mQV1l0", "Former FBI Negotiator on How to Negotiate | Impact Theory", "Impact Theory", "~60 min"),
        ("2MhgCgCVyMg", "The Art of Letting Others Have Your Way | Talks at Google", "Talks at Google", "~55 min"),
        ("yPsvgmZlUA4", "Chris Voss: The Art of Negotiation | Lewis Howes", "Lewis Howes", "~60 min"),
        ("llctqNJr2IU", "Active Listening and Mirroring Techniques", "MasterClass", "~10 min"),
        ("W3Jd5JMhzgA", "5 Steps To Get What You Want | CNBC", "CNBC Make It", "~12 min"),
        ("yr7ywyrIiC0", "Chris Voss Interview: How to Negotiate in Life", "Tom Bilyeu", "~50 min"),
        ("0oau2aCaMcI", "Chris Voss Teaches The #1 FBI Negotiation Tactic", "Mindvalley", "~25 min"),
        ("q-VBhxhdSHo", "Tactical Empathy | Chris Voss", "Chris Voss", "~10 min"),
        ("OaEw7MXzyiM", "How to Negotiate: NEVER Split The Difference", "Chris Voss", "~20 min"),
    ],
    "brene-brown": [
        ("iCvmsMzlF7o", "The Power of Vulnerability | TED", "TED", "~20 min"),
        ("psN1DORYYDB", "Listening to Shame | TED", "TED", "~20 min"),
        ("1Evwgu369Jw", "Brene Brown on Empathy | RSA", "RSA", "~3 min"),
        ("k0GQSJrpVhM", "The Anatomy of Trust", "SuperSoul", "~25 min"),
        ("8-JXOnFOXQk", "Why Your Critics Aren't the Ones Who Count", "99U", "~22 min"),
        ("RZWf2_2L2v8", "Brene Brown on Blame | RSA", "RSA", "~3 min"),
        ("NDQ1Mi5I4pg", "Brene Brown: Dare to Lead | Lewis Howes", "Lewis Howes", "~60 min"),
        ("ZkDaKKkFi6Y", "Brene Brown on Vulnerability in Relationships", "Oprah", "~15 min"),
        ("KZBTYViDPlQ", "The Difference Between Empathy and Sympathy", "RSA", "~5 min"),
        ("gr-WvA7uFDQ", "The Call to Courage", "Netflix", "~75 min"),
        ("8MBffxMz5YQ", "Strong Back, Soft Front, Wild Heart", "On Being", "~50 min"),
    ],
    "tony-robbins": [
        ("Cpc-t-Uwv1I", "Why We Do What We Do | TED", "TED", "~22 min"),
        ("Ke4Rn1I7VNo", "Tony Robbins Saves a Marriage in 8 Minutes", "Tony Robbins", "~8 min"),
        ("dOwY50KSbRU", "Tony Robbins: How to Save Your Marriage", "Tony Robbins", "~20 min"),
        ("EZYUFwNaJPY", "Tony Robbins on Relationships | Lewis Howes", "Lewis Howes", "~60 min"),
        ("XwBq-5PULqM", "Creating an Extraordinary Relationship", "Tony Robbins", "~20 min"),
        ("SzzEMCDfJAM", "How to Communicate Better in Relationships", "Tony Robbins", "~15 min"),
        ("7FwB0zDJRag", "Psychology of Relationships", "Tony Robbins", "~15 min"),
        ("4IYC9GZsLXo", "The 6 Human Needs", "Tony Robbins", "~10 min"),
    ],
    "attachment-theory": [
        ("WjOowWxOXCg", "How Your Childhood Affects Your Love Style", "The School of Life", "~7 min"),
        ("2s9ACDMcpjA", "What Is Your Attachment Style?", "The School of Life", "~8 min"),
        ("OYoIVCo2pCo", "Anxious-Avoidant Relationship Trap Explained", "Personal Development School", "~15 min"),
        ("nF3gLP8UFWI", "How Your Attachment Style Impacts Your Relationship", "Psych2Go", "~8 min"),
        ("QP-nOhJCjMI", "Attachment Theory Explained", "Sprouts", "~6 min"),
        ("sY2S5cP7pPo", "Fearful Avoidant Attachment Style", "Personal Development School", "~20 min"),
        ("6eOVlejb0X0", "Anxious Attachment Style: What You Need to Know", "Personal Development School", "~18 min"),
        ("eGqMX7FYQBI", "Thais Gibson on Attachment Theory | Lewis Howes", "Lewis Howes", "~60 min"),
        ("z2aRglMRx2M", "Understanding Avoidant Attachment", "Personal Development School", "~15 min"),
        ("5B_4pw8kbgk", "Disorganized Attachment: What It Looks Like", "Personal Development School", "~15 min"),
        ("sP7VF1Gis9o", "How to Heal Your Attachment Style", "Therapy in a Nutshell", "~12 min"),
    ],
    "love-languages": [
        ("PXQxdWkol3s", "The 5 Love Languages Explained", "Psych2Go", "~6 min"),
        ("w5undDR6rHo", "Gary Chapman: The 5 Love Languages | TEDx", "TEDx Talks", "~18 min"),
        ("doRMsEDSJFc", "Understanding the Five Love Languages", "The School of Life", "~8 min"),
        ("9OgbVKFOFUQ", "Gary Chapman on the 5 Love Languages | Lewis Howes", "Lewis Howes", "~45 min"),
        ("t4EFr5kEPJY", "How to Speak Your Partner's Love Language", "Psych2Go", "~7 min"),
        ("JqbYMhJv4jE", "5 Love Languages: Which One Do You Speak?", "Improvement Pill", "~8 min"),
        ("dPcEYLZ-b8s", "Words of Affirmation Love Language Explained", "Psych2Go", "~5 min"),
        ("6k52p7hVJFI", "Quality Time Love Language", "Psych2Go", "~5 min"),
    ],
}

def slugify(text):
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_]+', '-', text)
    text = re.sub(r'-+', '-', text)
    return text[:80].rstrip('-')

EXTRACT_JS = """
async () => {
    // Expand description
    const expandBtn = document.querySelector('#expand');
    if (expandBtn) { expandBtn.click(); await new Promise(r => setTimeout(r, 1500)); }
    
    // Find Show transcript button
    let transcriptBtn = null;
    for (const btn of document.querySelectorAll('button')) {
        if (btn.textContent.trim() === 'Show transcript') {
            transcriptBtn = btn; break;
        }
    }
    if (!transcriptBtn) return 'ERROR: No transcript button';
    
    transcriptBtn.click();
    await new Promise(r => setTimeout(r, 3000));
    
    const panel = document.querySelector('ytd-transcript-renderer');
    if (!panel) return 'ERROR: No transcript panel';
    
    const segments = panel.querySelectorAll('ytd-transcript-segment-renderer');
    if (!segments.length) return 'ERROR: No segments';
    
    const texts = [];
    segments.forEach(s => {
        const t = s.querySelector('.segment-text');
        if (t) texts.push(t.textContent.trim());
    });
    return texts.join('\\n');
}
"""

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.connect_over_cdp(CDP_URL)
        context = browser.contexts[0]
        page = context.pages[0] if context.pages else await context.new_page()
        
        total = sum(len(v) for v in VIDEOS.values())
        done = 0
        success = 0
        fail = 0
        
        for folder, videos in VIDEOS.items():
            print(f"\n{'='*50}", flush=True)
            print(f"  {folder.upper()} ({len(videos)} videos)", flush=True)
            print(f"{'='*50}", flush=True)
            
            for vid_id, title, channel, length in videos:
                done += 1
                slug = slugify(title)
                filepath = os.path.join(BASE, folder, f"{slug}.md")
                
                # Check if we already have a good transcript
                if os.path.exists(filepath):
                    with open(filepath) as f:
                        content = f.read()
                        if "[Transcript unavailable" not in content and len(content) > 1000:
                            print(f"  [{done}/{total}] SKIP: {title[:50]}...", flush=True)
                            success += 1
                            continue
                
                url = f"https://www.youtube.com/watch?v={vid_id}"
                print(f"  [{done}/{total}] Fetching: {title[:50]}...", flush=True)
                
                try:
                    await page.goto(url, wait_until='networkidle', timeout=30000)
                    await page.wait_for_timeout(3000)
                    
                    transcript = await page.evaluate(EXTRACT_JS)
                    
                    if transcript.startswith('ERROR:'):
                        print(f"    FAIL: {transcript}", flush=True)
                        fail += 1
                        continue
                    
                    md = f"""# {title}

- **URL:** {url}
- **Channel:** {channel}
- **Video ID:** {vid_id}
- **Approximate Length:** {length}

## Transcript

{transcript}
"""
                    with open(filepath, 'w') as f:
                        f.write(md)
                    print(f"    OK ({len(transcript)} chars)", flush=True)
                    success += 1
                    
                except Exception as e:
                    print(f"    ERROR: {e}", flush=True)
                    fail += 1
                
                await page.wait_for_timeout(1000)
        
        print(f"\n{'='*50}", flush=True)
        print(f"DONE: {success} success, {fail} fail out of {total}", flush=True)

asyncio.run(main())
