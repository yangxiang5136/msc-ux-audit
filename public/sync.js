/*
 * MSC.AI Feedback Sync
 * - Saves to localStorage (instant, offline-capable)
 * - Syncs to server (persistent, accessible by anyone)
 * - On page load: pulls from server, merges with local, renders
 */
const SYNC = {
  page: '',
  localKey: '',

  init(page, localKey) {
    this.page = page;
    this.localKey = localKey;
  },

  // Push a single feedback item to server
  async push(id, choice, note) {
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page: this.page,
          id: id,
          choice: choice || undefined,
          note: note || undefined
        })
      });
    } catch (e) {
      // Offline — localStorage already has it, will sync next visit
    }
  },

  // Pull all feedback for this page from server, merge with localStorage
  async pull() {
    try {
      const res = await fetch('/api/feedback/' + this.page);
      if (!res.ok) return null;
      const remote = await res.json();
      
      // Merge with localStorage (remote wins on conflict)
      let local = {};
      try { local = JSON.parse(localStorage.getItem(this.localKey) || '{}'); } catch (e) {}
      
      const merged = { ...local };
      Object.entries(remote).forEach(([id, v]) => {
        if (!merged[id]) {
          merged[id] = v;
        } else {
          // Remote wins if it has a timestamp and is newer
          if (v.t && (!merged[id].t || v.t > merged[id].t)) {
            merged[id] = v;
          }
        }
      });
      
      localStorage.setItem(this.localKey, JSON.stringify(merged));
      return merged;
    } catch (e) {
      return null;
    }
  }
};
