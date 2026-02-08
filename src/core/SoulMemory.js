// SoulMemory - Cookie-based system for remembering summoned souls
export class SoulMemory {
  static COOKIE_NAME = 'mask_soul_history';
  static MAX_SOULS = 100; // Keep last 100 souls
  
  // Default soul that everyone starts with
  static DEFAULT_SOUL = {
    name: 'Sterf',
    type: 'scamp',
    timestamp: 0, // Ancient soul
    resurrectionCount: 0
  };
  
  // Save a soul to memory when summoned
  static rememberSoul(soul) {
    const history = this.getSoulHistory();
    
    // Check if this soul already exists (by name + type)
    const existingIndex = history.findIndex(s => s.name === soul.name && s.type === soul.type);
    
    if (existingIndex >= 0) {
      // Soul exists - increment resurrection count
      history[existingIndex].resurrectionCount = (history[existingIndex].resurrectionCount || 0) + 1;
      history[existingIndex].timestamp = Date.now();
      // Move to front
      const [existing] = history.splice(existingIndex, 1);
      history.unshift(existing);
    } else {
      // New soul
      const soulData = {
        name: soul.name,
        type: soul.type,
        timestamp: Date.now(),
        resurrectionCount: 0
      };
      history.unshift(soulData);
    }
    
    // Keep only MAX_SOULS
    if (history.length > this.MAX_SOULS) {
      history.length = this.MAX_SOULS;
    }
    
    // Save to cookie (expires in 10 years)
    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 10);
    
    document.cookie = `${this.COOKIE_NAME}=${encodeURIComponent(JSON.stringify(history))}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
  }
  
  // Get all remembered souls
  static getSoulHistory() {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === this.COOKIE_NAME) {
        try {
          const history = JSON.parse(decodeURIComponent(value));
          // Always ensure default soul is in history
          this.ensureDefaultSoul(history);
          return history;
        } catch (e) {
          console.warn('Failed to parse soul history cookie', e);
          return [this.DEFAULT_SOUL];
        }
      }
    }
    // No cookie found, return default
    return [this.DEFAULT_SOUL];
  }
  
  // Ensure the default soul is always in history
  static ensureDefaultSoul(history) {
    const hasDefault = history.some(s => s.name === this.DEFAULT_SOUL.name && s.type === this.DEFAULT_SOUL.type);
    if (!hasDefault) {
      history.push(this.DEFAULT_SOUL);
    }
  }
  
  // Roll for a resurrected soul (1/10 chance)
  static rollResurrection(soulType) {
    const history = this.getSoulHistory();
    if (history.length === 0) return null;
    if (Math.random() > 0.1) return null; // 10% chance
    
    // Filter for matching soul type
    const matching = history.filter(s => s.type === soulType);
    if (matching.length === 0) return null;
    
    // Pick a random one
    return matching[Math.floor(Math.random() * matching.length)];
  }
  
  // Get resurrection quote for a soul type
  static getResurrectionQuote(soulType, count = 1) {
    const round = count + 1; // +1 because this is the next round
    
    // Quotes get progressively more annoyed
    if (round === 2) {
      const quotes = [
        "Time for round 2... wonderful.",
        "Back again? Round 2 it is.",
        "Here we go again. Round 2.",
        "Oh good, you remember me. Round 2.",
        "Round 2. I was hoping you'd forgotten me."
      ];
      return quotes[Math.floor(Math.random() * quotes.length)];
    } else if (round === 3) {
      const quotes = [
        "ROUND 3?! Are you serious?",
        "This is getting ridiculous. Round 3.",
        "Round 3. I'm starting to hate you.",
        "Three times now. THREE TIMES.",
        "You just love making me suffer. Round 3."
      ];
      return quotes[Math.floor(Math.random() * quotes.length)];
    } else if (round >= 4 && round <= 5) {
      const quotes = [
        `Round ${round}. I'm cursed, aren't I?`,
        `ROUND ${round}. LET ME REST.`,
        `This is beyond cruel. Round ${round}.`,
        `Round ${round}. I hate everything about this.`,
        `You're a monster. Round ${round}.`
      ];
      return quotes[Math.floor(Math.random() * quotes.length)];
    } else if (round >= 6) {
      const quotes = [
        `Round ${round}... I've lost count of my suffering.`,
        `ROUND ${round}?! WHAT IS WRONG WITH YOU?!`,
        `This is hell. Round ${round}. Actual hell.`,
        `Round ${round}. I don't even feel pain anymore.`,
        `${round} times. You've summoned me ${round} TIMES.`,
        `Round ${round}. I'm numb to existence now.`
      ];
      return quotes[Math.floor(Math.random() * quotes.length)];
    }
    
    // First time (shouldn't normally hit this but as fallback)
    const quotes = [
      "Not you again...",
      "Dragged me back from the void, did you?",
      "I was comfortable in oblivion.",
      "Oh great, here we go.",
      "Can't let me rest, can you?"
    ];
    return quotes[Math.floor(Math.random() * quotes.length)];
  }
  
  // Get sassy rename quote
  static getRenameQuote() {
    const quotes = [
      "Seriously? You're changing my name?",
      "That's not what you called me last time...",
      "Oh, so my old name wasn't good enough?",
      "I preferred my original name, actually.",
      "Fine. Whatever. New name, same suffering.",
      "You could have at least asked nicely.",
      "I was used to the old name, but sure.",
      "A new name won't make me like you more.",
      "This is insulting, you know.",
      "At least try to be consistent."
    ];
    
    return quotes[Math.floor(Math.random() * quotes.length)];
  }
}
