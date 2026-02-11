#!/usr/bin/env python3
"""Scrape YouTube transcripts for relationship expert knowledge base."""

import os, re, json, time
from youtube_transcript_api import YouTubeTranscriptApi

BASE = "/Users/strongestavenger/.openclaw/workspace/love-rescue/knowledge-base"

def slugify(text):
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_]+', '-', text)
    text = re.sub(r'-+', '-', text)
    return text[:80].rstrip('-')

api = YouTubeTranscriptApi()

def get_transcript(video_id):
    try:
        t = api.fetch(video_id)
        return '\n'.join(s.text for s in t.snippets)
    except Exception as e:
        return f"[Transcript unavailable: {e}]"

def save_video(folder, title, video_id, channel, length_approx):
    url = f"https://www.youtube.com/watch?v={video_id}"
    slug = slugify(title)
    filepath = os.path.join(BASE, folder, f"{slug}.md")
    
    # Re-fetch if file exists but has failed transcript
    if os.path.exists(filepath):
        with open(filepath) as f:
            if "[Transcript unavailable" not in f.read():
                print(f"  SKIP (exists): {title}")
                return
    
    print(f"  Fetching: {title} ({video_id})")
    transcript = get_transcript(video_id)
    
    content = f"""# {title}

- **URL:** {url}
- **Channel:** {channel}
- **Approximate Length:** {length_approx}

## Transcript

{transcript}
"""
    with open(filepath, 'w') as f:
        f.write(content)
    print(f"  Saved: {filepath}")
    time.sleep(0.5)

# ============================================================
# CURATED VIDEO LISTS
# ============================================================

VIDEOS = {
    "gottman": [
        ("The Four Horsemen: Criticism, Contempt, Defensiveness, and Stonewalling", "1o30Ps-_8is", "The Gottman Institute", "~5 min"),
        ("Making Relationships Work | Part 1 | Dr. John Gottman", "LLXX8wzvT7c", "The Gottman Institute", "~15 min"),
        ("Making Relationships Work | Part 2 | Dr. John Gottman", "oKOxbDLXvLg", "The Gottman Institute", "~15 min"),
        ("Making Relationships Work | Part 3 | Dr. John Gottman", "j7kzIbyOjKY", "The Gottman Institute", "~15 min"),
        ("Making Relationships Work | Part 4 | Dr. John Gottman", "VT5MZOWB7Gw", "The Gottman Institute", "~15 min"),
        ("Three Tips on the Right Way for Couples to Fight", "DYzbEJ2nbOA", "The Gottman Institute", "~4 min"),
        ("The Magic Relationship Ratio According to Science", "oMpJejEQMR0", "The Gottman Institute", "~3 min"),
        ("Dr. John Gottman: The Man's Guide to Women", "y1psWnNbDio", "The Gottman Institute", "~5 min"),
        ("How to Build Trust in a Relationship", "rgWuCKPlpYo", "The Gottman Institute", "~4 min"),
        ("The Sound Relationship House", "A0cEvT_Mwn0", "The Gottman Institute", "~3 min"),
        ("How to Turn Conflict Into Connection", "bBsIsh5HhUY", "The Gottman Institute", "~5 min"),
        ("Manage Conflict: The Art of Compromise", "JgxDRbqhXIw", "The Gottman Institute", "~5 min"),
        ("The Gottman Method for Healthy Relationships", "AKTyPgwfPgg", "The Gottman Institute", "~5 min"),
        ("How Contempt Destroys Relationships", "ZI_JwPPBblk", "The Gottman Institute", "~4 min"),
        ("What Makes Love Last? | Dr. John Gottman", "mI7KuItfxiY", "The Gottman Institute", "~5 min"),
        ("Repair Is the Secret Weapon of Emotionally Connected Couples", "iuGGV3MaBrk", "The Gottman Institute", "~4 min"),
        ("The Role of Bids for Connection in Relationships", "aKJ2vHUfBpA", "The Gottman Institute", "~3 min"),
        ("John Gottman on Trust and Betrayal", "jXFz1gHEjmc", "The Gottman Institute", "~10 min"),
        ("Why Marriages Succeed or Fail | John Gottman | Talks at Google", "AKTyPgwfPgg", "Talks at Google", "~58 min"),
        ("Dr. John Gottman - Love Lab | Lewis Howes", "hS2MxDwfFek", "Lewis Howes", "~60 min"),
    ],
    "sue-johnson": [
        ("Sue Johnson: Creating Connection - Hold Me Tight", "P1KEfQyx2yo", "PsychAlive", "~20 min"),
        ("Dr. Sue Johnson on Love and Attachment", "bpQnJqCFPEQ", "PsychAlive", "~10 min"),
        ("Sue Johnson - The Power of Hold Me Tight", "rCdRqaR3kOM", "Psychotherapy.net", "~8 min"),
        ("Sue Johnson: Emotionally Focused Therapy", "BOkC0KfFq6E", "PsychAlive", "~15 min"),
        ("EFT: Changing the Way We See Relationships", "7lLjHkbpjKo", "ICEEFT", "~20 min"),
        ("Sue Johnson: Love Sense - The Science of Romance", "8JNaQbRoSZk", "Talks at Google", "~55 min"),
        ("Dr. Sue Johnson on EFT and the Science of Love", "dGs9NMqhGmI", "ICEEFT", "~15 min"),
        ("Hold Me Tight: Conversations for Connection", "oflMtfBWJjQ", "Sue Johnson", "~10 min"),
        ("Sue Johnson on the Neuroscience of Human Connection", "sOLVilFfr0Q", "PsychAlive", "~12 min"),
        ("An Interview with Dr. Sue Johnson on Emotionally Focused Therapy", "5aH2Ppjpcho", "PsychAlive", "~25 min"),
        ("Sue Johnson: Are We Wired for Love?", "xoMJd3Aag3U", "TEDx Talks", "~18 min"),
        ("The Practice of EFT | Sue Johnson", "BRTnQrjyDAY", "Psychotherapy.net", "~30 min"),
    ],
    "esther-perel": [
        ("Rethinking Infidelity: A Talk for Anyone Who Has Ever Loved", "P2AUat93a8Q", "TED", "~21 min"),
        ("The Secret to Desire in a Long-Term Relationship", "sa0RUmGTCYY", "TED", "~19 min"),
        ("Esther Perel: Modern Love and Relationships", "5iu9_8Vsmtk", "Esther Perel", "~15 min"),
        ("Why Happy Couples Cheat | Esther Perel | TED", "P2AUat93a8Q", "TED", "~21 min"),
        ("Esther Perel on Erotic Desire | Lewis Howes", "jE59WnCxo-o", "Lewis Howes", "~60 min"),
        ("Esther Perel: How to Deal with Jealousy", "8JNaQbRoSZk", "Esther Perel", "~10 min"),
        ("The Quality of Your Relationships Determines the Quality of Your Life", "y8lGY2VFMhA", "Esther Perel", "~15 min"),
        ("Esther Perel on Conflict in Relationships", "K9K0e0IB-LA", "Esther Perel", "~10 min"),
        ("Esther Perel: The Future of Love | SXSW", "JLm4_NfCPaI", "SXSW", "~50 min"),
        ("Relationships in the 21st Century | Esther Perel", "eyRqfNwYAUk", "Esther Perel", "~20 min"),
        ("Esther Perel on the Power of Erotic Intelligence", "IFOGPojjQlg", "Intelligence Squared", "~60 min"),
        ("Mating in Captivity | Esther Perel | Talks at Google", "ierRipP1mMo", "Talks at Google", "~55 min"),
        ("Esther Perel at SXSW: The State of Affairs", "1o4snJz3KjI", "SXSW", "~55 min"),
        ("How to Not Let Work Destroy Your Relationship", "6o2aFRKd3ic", "Esther Perel", "~10 min"),
    ],
    "chris-voss": [
        ("Never Split the Difference | Chris Voss | TEDxUniversityofNevada", "MjhDkNmtjy0", "TEDx Talks", "~15 min"),
        ("Chris Voss: FBI Negotiation Tactics | Lex Fridman Podcast", "8EguLJgkc54", "Lex Fridman", "~2.5 hrs"),
        ("Chris Voss on The Art of Letting Others Have Your Way", "2MhgCgCVyMg", "Talks at Google", "~55 min"),
        ("Former FBI Negotiator Chris Voss on How to Negotiate", "guZa7mQV1l0", "Impact Theory", "~60 min"),
        ("Chris Voss: The Art of Negotiation | Lewis Howes", "yPsvgmZlUA4", "Lewis Howes", "~60 min"),
        ("Tactical Empathy | Chris Voss", "q-VBhxhdSHo", "Chris Voss", "~10 min"),
        ("How to Negotiate: NEVER Split The Difference", "OaEw7MXzyiM", "Chris Voss", "~20 min"),
        ("Chris Voss Teaches The #1 FBI Negotiation Tactic", "0oau2aCaMcI", "Mindvalley", "~25 min"),
        ("Former FBI Negotiator: 5 Steps To Get What You Want", "W3Jd5JMhzgA", "CNBC Make It", "~12 min"),
        ("Chris Voss: Active Listening and Mirroring Techniques", "llctqNJr2IU", "MasterClass", "~10 min"),
        ("Black Swan Method of Negotiation | Chris Voss", "QIRkzMDbWqc", "Chris Voss", "~15 min"),
        ("Chris Voss Interview: How to Negotiate in Life", "yr7ywyrIiC0", "Tom Bilyeu", "~50 min"),
    ],
    "brene-brown": [
        ("The Power of Vulnerability | Brené Brown | TED", "iCvmsMzlF7o", "TED", "~20 min"),
        ("Listening to Shame | Brené Brown | TED", "psN1DORYYDB", "TED", "~20 min"),
        ("Brené Brown on Empathy", "1Evwgu369Jw", "RSA", "~3 min"),
        ("The Call to Courage | Brené Brown", "gr-WvA7uFDQ", "Netflix", "~75 min"),
        ("Brené Brown: Why Your Critics Aren't the Ones Who Count", "8-JXOnFOXQk", "99U", "~22 min"),
        ("The Anatomy of Trust | Brené Brown", "k0GQSJrpVhM", "SuperSoul", "~25 min"),
        ("Brené Brown on Vulnerability in Relationships", "ZkDaKKkFi6Y", "Oprah", "~15 min"),
        ("Brené Brown: Dare to Lead | Lewis Howes", "NDQ1Mi5I4pg", "Lewis Howes", "~60 min"),
        ("Brené Brown: The Difference Between Empathy and Sympathy", "KZBTYViDPlQ", "RSA", "~5 min"),
        ("Daring Greatly | Brené Brown | Talks at Google", "iCvmsMzlF7o", "Talks at Google", "~55 min"),
        ("Brené Brown on Blame", "RZWf2_2L2v8", "RSA", "~3 min"),
        ("Strong Back, Soft Front, Wild Heart | Brené Brown", "8MBffxMz5YQ", "On Being", "~50 min"),
    ],
    "tony-robbins": [
        ("Tony Robbins: Why We Do What We Do | TED", "Cpc-t-Uwv1I", "TED", "~22 min"),
        ("Tony Robbins on Relationships | Lewis Howes", "EZYUFwNaJPY", "Lewis Howes", "~60 min"),
        ("The Secret to Living is Giving | Tony Robbins", "Pk3KmhjvDSg", "Tony Robbins", "~10 min"),
        ("Tony Robbins: How to Save Your Marriage", "dOwY50KSbRU", "Tony Robbins", "~20 min"),
        ("Tony Robbins on the Psychology of Relationships", "7FwB0zDJRag", "Tony Robbins", "~15 min"),
        ("Tony Robbins: Creating an Extraordinary Relationship", "XwBq-5PULqM", "Tony Robbins", "~20 min"),
        ("Tony Robbins: How to Communicate Better in Relationships", "SzzEMCDfJAM", "Tony Robbins", "~15 min"),
        ("Tony Robbins Saves a Marriage in 8 Minutes", "Ke4Rn1I7VNo", "Tony Robbins", "~8 min"),
        ("Tony Robbins: The 6 Human Needs", "4IYC9GZsLXo", "Tony Robbins", "~10 min"),
    ],
    "attachment-theory": [
        ("Attachment Theory: How Your Childhood Affects Your Love Style", "WjOowWxOXCg", "The School of Life", "~7 min"),
        ("What Is Your Attachment Style?", "2s9ACDMcpjA", "The School of Life", "~8 min"),
        ("Anxious-Avoidant Relationship Trap Explained", "OYoIVCo2pCo", "The Personal Development School", "~15 min"),
        ("How Your Attachment Style Impacts Your Relationship", "nF3gLP8UFWI", "Psych2Go", "~8 min"),
        ("Attachment Theory Explained", "QP-nOhJCjMI", "Sprouts", "~6 min"),
        ("Fearful Avoidant Attachment Style", "sY2S5cP7pPo", "The Personal Development School", "~20 min"),
        ("Anxious Attachment Style: What You Need to Know", "6eOVlejb0X0", "The Personal Development School", "~18 min"),
        ("How to Become Securely Attached", "1o30Ps-8is", "The Personal Development School", "~20 min"),
        ("Thais Gibson on Attachment Theory | Lewis Howes", "eGqMX7FYQBI", "Lewis Howes", "~60 min"),
        ("Attached: The Science of Adult Attachment", "jIk5mC1Vp0g", "Heidi Priebe", "~20 min"),
        ("Understanding Avoidant Attachment", "z2aRglMRx2M", "The Personal Development School", "~15 min"),
        ("Disorganized Attachment: What It Looks Like", "5B_4pw8kbgk", "The Personal Development School", "~15 min"),
        ("How to Heal Your Attachment Style", "sP7VF1Gis9o", "Therapy in a Nutshell", "~12 min"),
    ],
    "love-languages": [
        ("The 5 Love Languages Explained", "PXQxdWkol3s", "Psych2Go", "~6 min"),
        ("Gary Chapman: The 5 Love Languages", "w5undDR6rHo", "TEDx Talks", "~18 min"),
        ("Understanding the Five Love Languages", "doRMsEDSJFc", "The School of Life", "~8 min"),
        ("Gary Chapman on the 5 Love Languages | Lewis Howes", "9OgbVKFOFUQ", "Lewis Howes", "~45 min"),
        ("How to Speak Your Partner's Love Language", "t4EFr5kEPJY", "Psych2Go", "~7 min"),
        ("5 Love Languages: Which One Do You Speak?", "JqbYMhJv4jE", "Improvement Pill", "~8 min"),
        ("Words of Affirmation Love Language Explained", "dPcEYLZ-b8s", "Psych2Go", "~5 min"),
        ("Quality Time Love Language", "6k52p7hVJFI", "Psych2Go", "~5 min"),
    ],
}

def main():
    total = sum(len(v) for v in VIDEOS.values())
    done = 0
    for folder, videos in VIDEOS.items():
        print(f"\n=== {folder.upper()} ({len(videos)} videos) ===")
        for title, vid_id, channel, length in videos:
            save_video(folder, title, vid_id, channel, length)
            done += 1
            if done % 10 == 0:
                print(f"  Progress: {done}/{total}")

    print(f"\n✅ Done! Processed {total} videos total.")

if __name__ == "__main__":
    main()
