/* ============================================================
   PNVault — local, encrypted note storage for the Obsidian areas
   ------------------------------------------------------------
   Design constraints this satisfies:
     · The site is static (GitHub Pages). There is no server, so
       notes can never be "saved to the site" — they live in this
       browser only, in localStorage.
     · The repo is public, so nothing here may be readable without
       the PIN. Notes are AES-256-GCM encrypted with a key derived
       from the PIN via PBKDF2-SHA256 (600k iterations).
     · Obsidian is the system of record. Everything round-trips as
       plain Markdown with YAML frontmatter, exported as a .zip you
       drop straight into a vault (and imported back the same way).

   Two independent vaults ("scopes") share this engine:
     'general'  → /notes/          everyday notes
     'stocks'   → /tools/tracker/  per-ticker notes + outlooks

   The derived key is held in memory only. Closing the tab locks it.
   ============================================================ */
(function (global) {
  'use strict';

  var PREFIX = 'pn.vault.';
  var ITER = 600000;
  var VERSION = 1;

  // ---------------------------------------------------------- bytes

  function b64encode(bytes) {
    var s = '';
    for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s);
  }

  function b64decode(str) {
    var bin = atob(str), a = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
    return a;
  }

  // ---------------------------------------------------------- crypto

  async function deriveKey(pin, salt) {
    var base = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: salt, iterations: ITER, hash: 'SHA-256' },
      base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
    );
  }

  async function encryptJSON(key, obj) {
    var iv = crypto.getRandomValues(new Uint8Array(12));
    var pt = new TextEncoder().encode(JSON.stringify(obj));
    var ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, pt);
    return { iv: b64encode(iv), ct: b64encode(new Uint8Array(ct)) };
  }

  async function decryptJSON(key, iv, ct) {
    var pt = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: b64decode(iv) }, key, b64decode(ct)
    );
    return JSON.parse(new TextDecoder().decode(pt));
  }

  // ---------------------------------------------------------- storage

  function safeGet(k) {
    try { return localStorage.getItem(k); } catch (e) { return null; }
  }
  function safeSet(k, v) {
    try { localStorage.setItem(k, v); return true; } catch (e) { return false; }
  }
  function safeRemove(k) {
    try { localStorage.removeItem(k); } catch (e) { /* ignore */ }
  }

  /* A Vault instance is one scope. Construct, then unlock(pin). */
  function Vault(scope) {
    this.scope = scope;
    this.key = null;
    this.data = null;         // {v, notes: []}
    this.storageKey = PREFIX + scope;
    this.listeners = [];
  }

  Vault.prototype.exists = function () {
    return !!safeGet(this.storageKey);
  };

  Vault.prototype.storageAvailable = function () {
    try {
      var probe = '__pn_probe__';
      localStorage.setItem(probe, '1');
      localStorage.removeItem(probe);
      return true;
    } catch (e) { return false; }
  };

  /* Create a brand-new empty vault under this PIN. */
  Vault.prototype.create = async function (pin) {
    var salt = crypto.getRandomValues(new Uint8Array(16));
    this.key = await deriveKey(pin, salt);
    this.salt = salt;
    this.data = { v: VERSION, notes: [] };
    await this.persist();
    return this.data;
  };

  /* Unlock an existing vault. Throws on wrong PIN. */
  Vault.prototype.unlock = async function (pin) {
    var raw = safeGet(this.storageKey);
    if (!raw) return this.create(pin);
    var env = JSON.parse(raw);
    var salt = b64decode(env.salt);
    var key = await deriveKey(pin, salt);
    var data = await decryptJSON(key, env.iv, env.ct); // throws if wrong PIN
    this.key = key;
    this.salt = salt;
    this.data = data && data.notes ? data : { v: VERSION, notes: [] };
    return this.data;
  };

  Vault.prototype.lock = function () {
    this.key = null;
    this.data = null;
  };

  Vault.prototype.isUnlocked = function () {
    return !!this.key;
  };

  Vault.prototype.persist = async function () {
    if (!this.key) throw new Error('locked');
    var env = await encryptJSON(this.key, this.data);
    env.salt = b64encode(this.salt);
    env.v = VERSION;
    var ok = safeSet(this.storageKey, JSON.stringify(env));
    if (!ok) throw new Error('storage-full');
    this.emit();
    return true;
  };

  /* Danger: wipes this scope entirely. */
  Vault.prototype.destroy = function () {
    safeRemove(this.storageKey);
    this.lock();
  };

  Vault.prototype.onChange = function (fn) { this.listeners.push(fn); };
  Vault.prototype.emit = function () {
    var self = this;
    this.listeners.forEach(function (fn) {
      try { fn(self.data); } catch (e) { /* ignore listener errors */ }
    });
  };

  // ---------------------------------------------------------- notes CRUD

  function newId() {
    return 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  Vault.prototype.list = function () {
    return (this.data && this.data.notes) ? this.data.notes.slice() : [];
  };

  Vault.prototype.get = function (id) {
    return this.list().filter(function (n) { return n.id === id; })[0] || null;
  };

  Vault.prototype.create_note = async function (fields) {
    var now = new Date().toISOString();
    var note = {
      id: newId(),
      title: (fields && fields.title) || 'Untitled',
      body: (fields && fields.body) || '',
      tags: (fields && fields.tags) || [],
      ticker: (fields && fields.ticker) || null,
      outlook: (fields && fields.outlook) || null,
      positionKey: (fields && fields.positionKey) || null,
      purchases: (fields && fields.purchases) || [],
      created: now,
      updated: now
    };
    this.data.notes.unshift(note);
    await this.persist();
    return note;
  };

  Vault.prototype.update = async function (id, patch) {
    var note = this.get(id);
    if (!note) return null;
    Object.keys(patch).forEach(function (k) { note[k] = patch[k]; });
    note.updated = new Date().toISOString();
    await this.persist();
    return note;
  };

  Vault.prototype.remove = async function (id) {
    this.data.notes = this.data.notes.filter(function (n) { return n.id !== id; });
    await this.persist();
  };

  /* All tags across the vault, most-used first. */
  Vault.prototype.tags = function () {
    var counts = {};
    this.list().forEach(function (n) {
      (n.tags || []).forEach(function (t) { counts[t] = (counts[t] || 0) + 1; });
    });
    return Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; })
      .map(function (t) { return { tag: t, count: counts[t] }; });
  };

  /* Notes whose body links to `title` via [[wikilink]]. */
  Vault.prototype.backlinks = function (title) {
    if (!title) return [];
    var needle = '[[' + title.toLowerCase() + ']]';
    return this.list().filter(function (n) {
      return (n.body || '').toLowerCase().indexOf(needle) !== -1;
    });
  };

  Vault.prototype.search = function (q, opts) {
    opts = opts || {};
    var notes = this.list();
    if (opts.ticker) {
      notes = notes.filter(function (n) {
        return (n.ticker || '').toUpperCase() === opts.ticker.toUpperCase();
      });
    }
    if (opts.tag) {
      notes = notes.filter(function (n) { return (n.tags || []).indexOf(opts.tag) !== -1; });
    }
    if (q) {
      var needle = q.toLowerCase();
      notes = notes.filter(function (n) {
        return (n.title || '').toLowerCase().indexOf(needle) !== -1 ||
               (n.body || '').toLowerCase().indexOf(needle) !== -1 ||
               (n.ticker || '').toLowerCase().indexOf(needle) !== -1 ||
               (n.tags || []).join(' ').toLowerCase().indexOf(needle) !== -1;
      });
    }
    return notes.sort(function (a, b) {
      return (b.updated || '').localeCompare(a.updated || '');
    });
  };

  // ---------------------------------------------------------- markdown

  /* Serialize one note to Obsidian-flavoured Markdown + YAML frontmatter. */
  function toMarkdown(note) {
    var fm = ['---'];
    fm.push('title: ' + yamlStr(note.title));
    if (note.ticker) fm.push('ticker: ' + yamlStr(note.ticker));
    if (note.positionKey) fm.push('position_key: ' + yamlStr(note.positionKey));
    if (note.purchases && note.purchases.length) {
      fm.push('purchases_json: ' + yamlStr(JSON.stringify(note.purchases)));
    }
    if (note.tags && note.tags.length) {
      fm.push('tags: [' + note.tags.map(yamlStr).join(', ') + ']');
    }
    fm.push('created: ' + (note.created || ''));
    fm.push('updated: ' + (note.updated || ''));
    if (note.outlook) {
      fm.push('outlook_stance: ' + yamlStr(note.outlook.stance || ''));
      fm.push('outlook_conviction: ' + (note.outlook.conviction || 0));
      if (note.outlook.horizon) fm.push('outlook_horizon: ' + yamlStr(note.outlook.horizon));
      if (note.outlook.target) fm.push('outlook_target: ' + yamlStr(note.outlook.target));
    }
    fm.push('---', '');

    var body = '';
    if (note.outlook) {
      body += '## Outlook\n\n';
      body += '- **Stance:** ' + (note.outlook.stance || '—') + '\n';
      body += '- **Conviction:** ' + (note.outlook.conviction || 0) + '/5\n';
      if (note.outlook.horizon) body += '- **Horizon:** ' + note.outlook.horizon + '\n';
      if (note.outlook.target) body += '- **Target:** ' + note.outlook.target + '\n';
      if (note.outlook.thesis) body += '\n### Thesis\n\n' + note.outlook.thesis + '\n';
      if (note.outlook.risks) body += '\n### Risks\n\n' + note.outlook.risks + '\n';
      body += '\n---\n\n';
    }
    if (note.purchases && note.purchases.length) {
      body += '<!-- pn-purchases:start -->\n## Buy prices\n\n';
      body += '| Date | Shares | Buy price | Cost |\n|---|---:|---:|---:|\n';
      note.purchases.forEach(function (purchase) {
        var shares = Number(purchase.shares) || 0;
        var price = Number(purchase.price) || 0;
        body += '| ' + (purchase.date || 'Undated') + ' | ' + shares.toLocaleString('en-US', { maximumFractionDigits: 6 }) +
          ' | $' + price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) +
          ' | $' + (shares * price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' |\n';
      });
      body += '\n<!-- pn-purchases:end -->\n\n';
    }
    body += note.body || '';

    return fm.join('\n') + body + '\n';
  }

  function yamlStr(s) {
    s = String(s == null ? '' : s);
    return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
  }

  /* Parse a Markdown file (with or without frontmatter) back into a note. */
  function fromMarkdown(text, fallbackTitle) {
    var note = {
      title: fallbackTitle || 'Imported note',
      body: text || '',
      tags: [], ticker: null, outlook: null, positionKey: null, purchases: [],
      created: new Date().toISOString(),
      updated: new Date().toISOString()
    };

    var m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text || '');
    if (m) {
      note.body = (text || '').slice(m[0].length);
      var outlook = {};
      m[1].split(/\r?\n/).forEach(function (line) {
        var kv = /^([A-Za-z_][\w]*)\s*:\s*(.*)$/.exec(line);
        if (!kv) return;
        var k = kv[1], v = kv[2].trim();
        var unq = function (s) {
          s = s.trim();
          if ((s[0] === '"' && s.slice(-1) === '"') || (s[0] === "'" && s.slice(-1) === "'")) {
            return s.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
          }
          return s;
        };
        if (k === 'title') note.title = unq(v);
        else if (k === 'ticker') note.ticker = unq(v).toUpperCase() || null;
        else if (k === 'position_key') note.positionKey = unq(v) || null;
        else if (k === 'purchases_json') {
          try {
            var purchases = JSON.parse(unq(v));
            note.purchases = Array.isArray(purchases) ? purchases : [];
          } catch (e) { note.purchases = []; }
        }
        else if (k === 'tags') {
          var inner = v.replace(/^\[|\]$/g, '');
          note.tags = inner ? inner.split(',').map(function (t) { return unq(t); }).filter(Boolean) : [];
        }
        else if (k === 'created') note.created = unq(v) || note.created;
        else if (k === 'updated') note.updated = unq(v) || note.updated;
        else if (k === 'outlook_stance') outlook.stance = unq(v);
        else if (k === 'outlook_conviction') outlook.conviction = parseInt(unq(v), 10) || 0;
        else if (k === 'outlook_horizon') outlook.horizon = unq(v);
        else if (k === 'outlook_target') outlook.target = unq(v);
      });
      if (outlook.stance) note.outlook = outlook;
    }

    /* The readable purchase table is generated from purchases_json on
       export; remove it from the editable note body when importing so
       repeated Obsidian round trips never duplicate the table. */
    note.body = String(note.body || '').replace(/<!-- pn-purchases:start -->[\s\S]*?<!-- pn-purchases:end -->\s*/g, '');

    /* Inline #tags in the body get folded into the tag list too. */
    var inlineTags = (note.body.match(/(^|\s)#([a-z0-9][\w/-]*)/gi) || [])
      .map(function (t) { return t.trim().slice(1); });
    inlineTags.forEach(function (t) {
      if (note.tags.indexOf(t) === -1) note.tags.push(t);
    });

    if (!m) {
      var h = /^#\s+(.+)$/m.exec(note.body);
      if (h) note.title = h[1].trim();
    }
    return note;
  }

  /* Minimal Markdown → HTML. Deliberately a subset, and it escapes
     first so note content can never inject markup into the page. */
  function render(md) {
    if (!md) return '<p class="dimmed">Empty note.</p>';

    var html = String(md)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    /* fenced code first, stashed so inline rules don't touch it */
    var blocks = [];
    html = html.replace(/```([\s\S]*?)```/g, function (_, code) {
      blocks.push('<pre class="md-pre"><code>' + code.replace(/^\n/, '') + '</code></pre>');
      return ' B' + (blocks.length - 1) + ' ';
    });

    html = html
      .replace(/^###### (.*)$/gm, '<h6>$1</h6>')
      .replace(/^##### (.*)$/gm, '<h5>$1</h5>')
      .replace(/^#### (.*)$/gm, '<h4>$1</h4>')
      .replace(/^### (.*)$/gm, '<h3>$1</h3>')
      .replace(/^## (.*)$/gm, '<h2>$1</h2>')
      .replace(/^# (.*)$/gm, '<h1>$1</h1>')
      .replace(/^\s*(?:---|\*\*\*)\s*$/gm, '<hr>')
      .replace(/^&gt; ?(.*)$/gm, '<blockquote>$1</blockquote>')
      .replace(/`([^`\n]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
      .replace(/\[\[([^\]]+)\]\]/g,
        '<a class="wikilink" href="#" data-wikilink="$1">$1</a>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
        '<a href="$2" rel="noopener noreferrer" target="_blank">$1</a>')
      .replace(/(^|\s)#([a-z0-9][\w/-]*)/gi,
        '$1<span class="md-tag">#$2</span>');

    /* lists */
    html = html.replace(/(?:^[-*] .*(?:\r?\n|$))+/gm, function (chunk) {
      var items = chunk.trim().split(/\r?\n/).map(function (l) {
        return '<li>' + l.replace(/^[-*] /, '') + '</li>';
      }).join('');
      return '<ul>' + items + '</ul>';
    });
    html = html.replace(/(?:^\d+\. .*(?:\r?\n|$))+/gm, function (chunk) {
      var items = chunk.trim().split(/\r?\n/).map(function (l) {
        return '<li>' + l.replace(/^\d+\. /, '') + '</li>';
      }).join('');
      return '<ol>' + items + '</ol>';
    });

    /* paragraphs from remaining bare lines */
    html = html.split(/\n{2,}/).map(function (para) {
      var t = para.trim();
      if (!t) return '';
      if (/^<(h\d|ul|ol|pre|blockquote|hr)/.test(t)) return t;
      if (/^ B\d+ $/.test(t)) return t;
      return '<p>' + t.replace(/\n/g, '<br>') + '</p>';
    }).join('\n');

    html = html.replace(/ B(\d+) /g, function (_, i) { return blocks[+i]; });
    return html;
  }

  // ---------------------------------------------------------- zip (stored)

  var CRC_TABLE = (function () {
    var t = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return t;
  })();

  function crc32(bytes) {
    var c = 0xFFFFFFFF;
    for (var i = 0; i < bytes.length; i++) {
      c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    }
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  /* Build an uncompressed (method 0) zip. Enough for a folder of .md
     files, and avoids pulling in a compression library. */
  function makeZip(files) {
    var enc = new TextEncoder();
    var parts = [], central = [], offset = 0;

    function u16(n) { return [n & 0xFF, (n >>> 8) & 0xFF]; }
    function u32(n) { return [n & 0xFF, (n >>> 8) & 0xFF, (n >>> 16) & 0xFF, (n >>> 24) & 0xFF]; }

    files.forEach(function (f) {
      var nameBytes = enc.encode(f.name);
      var dataBytes = enc.encode(f.content);
      var crc = crc32(dataBytes);

      var local = [].concat(
        u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(0), u16(0),
        u32(crc), u32(dataBytes.length), u32(dataBytes.length),
        u16(nameBytes.length), u16(0)
      );
      parts.push(new Uint8Array(local), nameBytes, dataBytes);

      central.push([].concat(
        u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0),
        u32(crc), u32(dataBytes.length), u32(dataBytes.length),
        u16(nameBytes.length), u16(0), u16(0), u16(0), u16(0), u32(0),
        u32(offset)
      ));
      central.push(nameBytes);

      offset += local.length + nameBytes.length + dataBytes.length;
    });

    var centralBytes = [], centralSize = 0;
    central.forEach(function (c) {
      var arr = (c instanceof Uint8Array) ? c : new Uint8Array(c);
      centralBytes.push(arr);
      centralSize += arr.length;
    });

    var end = new Uint8Array([].concat(
      u32(0x06054b50), u16(0), u16(0),
      u16(files.length), u16(files.length),
      u32(centralSize), u32(offset), u16(0)
    ));

    return new Blob(parts.concat(centralBytes, [end]), { type: 'application/zip' });
  }

  function slugify(s) {
    return String(s || 'note').trim()
      .replace(/[\\/:*?"<>|]/g, '-')
      .replace(/\s+/g, ' ')
      .slice(0, 80) || 'note';
  }

  Vault.prototype.exportZip = function (filename) {
    var used = {};
    var files = this.list().map(function (n) {
      var base = slugify(n.ticker ? (n.ticker + ' — ' + n.title) : n.title);
      var name = base;
      var i = 2;
      while (used[name.toLowerCase()]) { name = base + ' ' + (i++); }
      used[name.toLowerCase()] = true;
      return { name: name + '.md', content: toMarkdown(n) };
    });
    if (!files.length) return null;
    return { blob: makeZip(files), name: filename || ('pn-vault-' + this.scope + '.zip') };
  };

  Vault.prototype.importMarkdown = async function (fileList) {
    var self = this;
    var added = 0, skipped = 0;
    var existing = {};
    this.list().forEach(function (n) {
      existing[(n.title || '').toLowerCase() + '|' + (n.ticker || '')] = true;
    });

    for (var i = 0; i < fileList.length; i++) {
      var file = fileList[i];
      if (!/\.(md|markdown|txt)$/i.test(file.name)) { skipped++; continue; }
      var text = await file.text();
      var fallback = file.name.replace(/\.(md|markdown|txt)$/i, '');
      var note = fromMarkdown(text, fallback);
      var dupKey = (note.title || '').toLowerCase() + '|' + (note.ticker || '');
      if (existing[dupKey]) { skipped++; continue; }
      existing[dupKey] = true;
      note.id = newId();
      self.data.notes.unshift(note);
      added++;
    }
    if (added) await this.persist();
    return { added: added, skipped: skipped };
  };

  // ---------------------------------------------------------- export

  global.PNVault = {
    Vault: Vault,
    toMarkdown: toMarkdown,
    fromMarkdown: fromMarkdown,
    render: render,
    makeZip: makeZip,
    slugify: slugify
  };
})(window);
