#!/usr/bin/env python3
"""Scrape real YouTube transcripts using yt-dlp for search + youtube_transcript_api for transcripts."""

import os, re, subprocess, time, json
from youtube_transcript_api import YouTubeTranscriptApi

BASE = "/Users/strongestavenger/.openclaw/workspace/love-rescue/knowledge-base"
api = YouTubeTranscriptApi()

def slugify(text):
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_]+', '-', text)
    text = re.sub(r'-+', '-', text)
    return text[:80].rstrip('-')

def search_youtube(query, count=15):
    """Search YouTube and return list of (id, title) tuples."""
    cmd = f'yt-dlp --flat-playlist --print "%(id)s\t%(title)s" "ytsearch{count}:{query}"'
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=60)
    videos = []
    for line in result.stdout.strip().split('\n'):
        if '\t' in line:
            vid_id, title = line.split('\t', 1)
            videos.append((vid_id, title))
    return videos

def get_transcript(video_id):
    try:
        t = api.fetch(video_id)
        return '\n'.join(s.text for s in t.snippets)
    except Exception as e:
        return None

def save_video(folder, title, video_id, channel="YouTube"):
    url = f"https://www.youtube.com/watch?v={video_id}"
    slug = slugify(title)
    filepath = os.path.join(BASE, folder, f"{slug}.md")
    
    if os.path.exists(filepath):
        with open(filepath) as f:
            if "[Transcript unavailable" not in f.read():
                return True  # already good
    
    transcript = get_transcript(video_id)
    if not transcript:
        return False
    
    content = f"""# {title}

- **URL:** {url}
- **Channel:** {channel}
- **Video ID:** {video_id}

## Transcript

{transcript}
"""
    with open(filepath, 'w') as f:
        f.write(content)
    print(f"  ✓ {title[:60]}...")
    return True

# Search queries per expert folder
SEARCHES = {
    "gottman": [
        ("Gottman Institute relationships", 20),
        ("John Gottman interview marriage", 15),
        ("Gottman four horsemen", 10),
        ("Gottman bids for connection", 5),
    ],
    "sue-johnson": [
        ("Sue Johnson EFT couples therapy", 15),
        ("Sue Johnson Hold Me Tight", 10),
        ("Sue Johnson attachment love", 10),
    ],
    "esther-perel": [
        ("Esther Perel relationship advice", 20),
        ("Esther Perel infidelity desire", 10),
        ("Esther Perel TED talk", 5),
    ],
    "chris-voss": [
        ("Chris Voss negotiation tactics", 15),
        ("Chris Voss Never Split the Difference", 10),
        ("Chris Voss empathy listening", 5),
    ],
    "brene-brown": [
        ("Brene Brown vulnerability relationships", 15),
        ("Brene Brown shame empathy", 10),
        ("Brene Brown trust courage", 5),
    ],
    "tony-robbins": [
        ("Tony Robbins relationships marriage", 10),
        ("Tony Robbins communication love", 8),
    ],
    "attachment-theory": [
        ("attachment theory relationships explained", 15),
        ("anxious avoidant attachment style", 10),
        ("Thais Gibson attachment theory", 8),
        ("secure attachment how to", 5),
    ],
    "love-languages": [
        ("five love languages Gary Chapman", 10),
        ("love languages explained relationships", 8),
    ],
}

def main():
    stats = {}
    for folder, searches in SEARCHES.items():
        print(f"\n{'='*60}")
        print(f"  {folder.upper()}")
        print(f"{'='*60}")
        
        seen_ids = set()
        success = 0
        fail = 0
        
        for query, count in searches:
            print(f"\n  Searching: {query} (top {count})")
            try:
                videos = search_youtube(query, count)
            except Exception as e:
                print(f"  Search failed: {e}")
                continue
            
            for vid_id, title in videos:
                if vid_id in seen_ids:
                    continue
                seen_ids.add(vid_id)
                
                if save_video(folder, title, vid_id):
                    success += 1
                else:
                    fail += 1
                
                time.sleep(0.3)
        
        stats[folder] = (success, fail)
        print(f"\n  → {folder}: {success} transcripts saved, {fail} failed")
    
    print(f"\n{'='*60}")
    print("FINAL SUMMARY")
    print(f"{'='*60}")
    total_success = 0
    total_fail = 0
    for folder, (s, f) in stats.items():
        print(f"  {folder}: {s} success, {f} fail")
        total_success += s
        total_fail += f
    print(f"\n  TOTAL: {total_success} transcripts, {total_fail} failed")

if __name__ == "__main__":
    main()
