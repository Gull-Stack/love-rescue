# SteveRogers — Telegram Bot Setup Guide

## Step 1: Create the Bot (Thor does this)
1. Open Telegram → search `@BotFather`
2. Send `/newbot`
3. **Name:** `SteveRogers` (display name)
4. **Username:** `SteveRogersTherapist_bot` (or whatever's available)
5. Copy the **API token** BotFather gives you
6. Optional: Send `/setdescription` → "The world's greatest AI relationship therapist. Built on 8 legendary experts. Ask me anything about love."
7. Optional: Send `/setabouttext` → "🛡️ Unified therapy brain powered by Gottman, Sue Johnson, Esther Perel, Chris Voss, Brené Brown, Tony Robbins, Gary Chapman & Attachment Theory"
8. Optional: Send `/setuserpic` → upload a Captain America shield or therapy-themed avatar

## Step 2: Set Up OpenClaw Instance
```bash
# Install OpenClaw (if not already)
npm install -g openclaw

# Create SteveRogers workspace
mkdir -p ~/.openclaw-steve-rogers/workspace
cp /path/to/love-rescue/steve-rogers/SOUL.md ~/.openclaw-steve-rogers/workspace/SOUL.md
cp /path/to/love-rescue/steve-rogers/AGENTS.md ~/.openclaw-steve-rogers/workspace/AGENTS.md
cp /path/to/love-rescue/steve-rogers/INSIGHTS.md ~/.openclaw-steve-rogers/workspace/
cp /path/to/love-rescue/steve-rogers/UNIFIED-MODEL.md ~/.openclaw-steve-rogers/workspace/
cp /path/to/love-rescue/steve-rogers/STRATEGY-IMPROVEMENTS.md ~/.openclaw-steve-rogers/workspace/
cp /path/to/love-rescue/steve-rogers/GAPS.md ~/.openclaw-steve-rogers/workspace/

# Symlink the knowledge base so SteveRogers can read it
ln -s /path/to/love-rescue/knowledge-base ~/.openclaw-steve-rogers/workspace/knowledge-base
ln -s /path/to/love-rescue/marketing-supercomputer ~/.openclaw-steve-rogers/workspace/marketing-supercomputer
```

## Step 3: Configure Gateway
```bash
openclaw gateway init
```

Config should include:
```yaml
model: anthropic/claude-sonnet-4-20250514  # or opus for premium responses
channels:
  telegram:
    token: "BOT_TOKEN_FROM_BOTFATHER"
    ownerIds:
      - 6536350983   # Josh
      - 8342763479   # Bryce
```

## Step 4: Start SteveRogers
```bash
openclaw gateway start
```

## Step 5: Add to LoveRescue Group
1. Open the LoveRescue Telegram group
2. Add `@SteveRogersTherapist_bot` to the group
3. He'll introduce himself and start learning from the conversation

## Notes
- SteveRogers runs as a separate OpenClaw instance from DonaldJay
- They share the knowledge base via symlinks
- SteveRogers can be spawned by DonaldJay as a sub-agent for deep analysis tasks
- For cost efficiency, use Sonnet for daily chat and spawn Opus for deep dives
