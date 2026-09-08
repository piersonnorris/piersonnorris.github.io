/* ============================================================
   PNMarkdown — a small, dependency-free Markdown renderer.

     PNMarkdown.render(text, opts) → HTML string

   The site had no renderer before this. /notes/ and /atlas/ escape the
   body and linkify [[brackets]], which is right for a three-sentence
   curated note and wrong for BLUEPRINT.md. /vault/ needs headings,
   lists, tables, fenced code, quotes, callouts and task boxes.

   THE ONE RULE THAT MATTERS: escape first, structure second.

   Every character of note text is HTML-escaped before a single tag is
   emitted, and tags are only ever added afterwards, by this file, from
   its own string literals. A renderer that builds structure and escapes
   later — or that escapes "the parts that need it" — is one forgotten
   branch away from letting a note write markup into the page. Here that
   mistake is not available: esc() runs at the top of render() and the
   inline pass only ever *adds* tags to already-safe text. Raw HTML in a
   note is therefore shown, not executed — a deliberate feature for a
   public page rendering a personal vault.

   Options:
     resolve(title) → {href, missing:bool} | null
        How [[wikilinks]] become anchors. Omitted: they render as plain
        bracket text rather than dead links.
     headingIds: bool  add id="" to headings (default true)
   ============================================================ */
(function (global) {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function slug(s) {
    return String(s).toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 60);
  }

  /* Everything except code spans. Input is ALREADY escaped; this only
     adds tags. Never call it on a code span — see inline(). */
  function marks(text, opts) {
    var out = String(text);

    /* [[wikilink]] and [[wikilink|alias]] — the vault's own link form,
       resolved by the caller, because only it knows what exists. */
    out = out.replace(/\[\[([^\[\]|]+)(?:\|([^\[\]]+))?\]\]/g, function (whole, target, alias) {
      var label = (alias || target).trim();
      var hit = opts.resolve ? opts.resolve(target.trim()) : null;
      if (!hit) return '<span class="md-wl md-wl-plain">' + label + '</span>';
      if (hit.missing) return '<span class="md-wl md-broken" title="No note with this title">' + label + '</span>';
      return '<a class="md-wl" href="' + esc(hit.href) + '">' + label + '</a>';
    });

    /* ![alt](src) is deliberately NOT rendered as an image. A public page
       should not fetch whatever URL a note happens to contain, and vault
       image paths point at files that were never published anyway. */
    out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)[^)]*\)/g, function (_, alt) {
      return '<span class="md-img">' + (alt || 'image') + '</span>';
    });

    out = out.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+&quot;[^)]*&quot;)?\)/g, function (whole, label, href) {
      /* Only http(s), mailto and same-site hrefs become anchors.
         javascript: and data: are rendered as plain text instead. */
      if (!/^(https?:\/\/|mailto:|\/|#)/i.test(href)) return label;
      var ext = /^https?:\/\//i.test(href);
      return '<a href="' + esc(href) + '"' + (ext ? ' rel="noopener"' : '') + '>' + label + '</a>';
    });

    return out
      .replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>')
      .replace(/(^|[\s(])_([^_\n]+)_(?=$|[\s.,;:)!?])/g, '$1<em>$2</em>')
      .replace(/~~([^~]+)~~/g, '<del>$1</del>')
      .replace(/==([^=]+)==/g, '<mark>$1</mark>');
  }

  /* Inline pass. Code spans are split out rather than stashed behind a
     placeholder: a placeholder needs a sentinel that cannot occur in the
     text, and every candidate for that is either a control character
     (which turns the source file binary) or something a note might
     legitimately contain. Splitting has neither problem, and it makes
     "emphasis inside `back *ticks*` stays literal" structural. */
  function inline(text, opts) {
    return String(text).split(/(`[^`\n]+`)/).map(function (part, i) {
      if (i % 2 === 0) return marks(part, opts);
      return '<code>' + part.slice(1, -1) + '</code>';
    }).join('');
  }

  /* Obsidian callouts: > [!note] Title */
  var CALLOUT = /^\[!(\w+)\]([+-]?)\s*(.*)$/;
  /* A blockquote marker, as it looks after esc() has run. */
  var QUOTE = /^\s*&gt;/;
  var QUOTE_MARK = /^\s*&gt;\s?/;

  function renderQuote(lines, opts) {
    var first = CALLOUT.exec(lines[0] || '');
    if (!first) return '<blockquote>' + blocks(lines.join('\n'), opts) + '</blockquote>';
    var kind = first[1].toLowerCase();
    var title = first[3] || (kind.charAt(0).toUpperCase() + kind.slice(1));
    return '<div class="md-callout md-callout-' + esc(kind) + '">' +
      '<p class="md-callout-title">' + inline(title, opts) + '</p>' +
      blocks(lines.slice(1).join('\n'), opts) + '</div>';
  }

  function renderTable(rows, opts) {
    var cells = function (row) {
      return row.replace(/^\||\|$/g, '').split('|').map(function (c) { return c.trim(); });
    };
    /* The alignment row is markdown's own, not content: it is consumed,
       and its colons decide each column's text-align. */
    var align = cells(rows[1]).map(function (spec) {
      if (/^:-+:$/.test(spec)) return 'center';
      if (/^-+:$/.test(spec)) return 'right';
      return '';
    });
    var rowHTML = function (row, tag) {
      return '<tr>' + cells(row).map(function (c, i) {
        var a = align[i] ? ' style="text-align:' + align[i] + '"' : '';
        return '<' + tag + a + '>' + inline(c, opts) + '</' + tag + '>';
      }).join('') + '</tr>';
    };
    return '<div class="md-tablewrap"><table>' +
      '<thead>' + rowHTML(rows[0], 'th') + '</thead><tbody>' +
      rows.slice(2).map(function (r) { return rowHTML(r, 'td'); }).join('') +
      '</tbody></table></div>';
  }

  function renderList(items, ordered, opts) {
    var html = items.map(function (item) {
      var task = /^\[([ xX])\]\s+([\s\S]*)$/.exec(item.text);
      if (task) {
        return '<li class="md-task' + (task[1] === ' ' ? '' : ' done') + '">' +
          '<span class="md-box" aria-hidden="true">' + (task[1] === ' ' ? '' : '✓') + '</span>' +
          '<span>' + blocks(task[2], opts) + '</span></li>';
      }
      return '<li>' + blocks(item.text, opts) + '</li>';
    }).join('');
    return ordered ? '<ol>' + html + '</ol>' : '<ul>' + html + '</ul>';
  }

  function blocks(text, opts) {
    var lines = String(text == null ? '' : text).replace(/\r\n?/g, '\n').split('\n');
    var out = [];
    var i = 0;

    while (i < lines.length) {
      var line = lines[i];
      if (!line.trim()) { i += 1; continue; }

      /* fenced code — the fence language becomes a data attribute and
         the body is emitted exactly as written */
      var fence = /^\s*(```|~~~)\s*([\w+-]*)\s*$/.exec(line);
      if (fence) {
        var body = [];
        i += 1;
        while (i < lines.length && !new RegExp('^\\s*' + fence[1]).test(lines[i])) { body.push(lines[i]); i += 1; }
        i += 1;
        out.push('<pre' + (fence[2] ? ' data-lang="' + esc(fence[2]) + '"' : '') +
          '><code>' + body.join('\n') + '</code></pre>');
        continue;
      }

      var head = /^(#{1,6})\s+(.+?)\s*#*$/.exec(line);
      if (head) {
        var level = head[1].length;
        var id = opts.headingIds === false ? '' : ' id="' + esc(slug(head[2])) + '"';
        out.push('<h' + level + id + '>' + inline(head[2], opts) + '</h' + level + '>');
        i += 1;
        continue;
      }

      if (/^\s{0,3}(---+|\*\*\*+|___+)\s*$/.test(line)) { out.push('<hr>'); i += 1; continue; }

      /* &gt;, not >: escaping runs before block parsing, so by the time
         the parser sees a blockquote its marker has already become an
         entity. That is the price of escape-first, and it is paid here
         rather than by moving the escape later. */
      if (QUOTE.test(line)) {
        var quoted = [];
        while (i < lines.length && QUOTE.test(lines[i])) { quoted.push(lines[i].replace(QUOTE_MARK, '')); i += 1; }
        out.push(renderQuote(quoted, opts));
        continue;
      }

      /* a table needs a header row with an alignment row directly under it */
      if (/\|/.test(line) && /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(lines[i + 1] || '')) {
        var rows = [];
        while (i < lines.length && /\|/.test(lines[i]) && lines[i].trim()) { rows.push(lines[i].trim()); i += 1; }
        out.push(renderTable(rows, opts));
        continue;
      }

      var bullet = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/.exec(line);
      if (bullet) {
        var ordered = /\d/.test(bullet[2]);
        var items = [];
        while (i < lines.length) {
          var next = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/.exec(lines[i]);
          if (!next || /\d/.test(next[2]) !== ordered || next[1].length !== bullet[1].length) {
            /* Deeper indentation and lazy continuations belong to the item
               above: fold them into its text and let the recursive call
               render them, rather than ending the list early. */
            if (items.length && lines[i] && /^\s+\S/.test(lines[i])) {
              items[items.length - 1].text += '\n' +
                lines[i].replace(new RegExp('^\\s{0,' + (bullet[1].length + 2) + '}'), '');
              i += 1;
              continue;
            }
            break;
          }
          items.push({ text: next[3] });
          i += 1;
        }
        out.push(renderList(items, ordered, opts));
        continue;
      }

      var para = [];
      while (i < lines.length && lines[i].trim() &&
             !/^\s*(#{1,6}\s|&gt;|```|~~~|[-*+]\s|\d+[.)]\s)/.test(lines[i]) &&
             !/^\s{0,3}(---+|\*\*\*+|___+)\s*$/.test(lines[i])) {
        para.push(lines[i]);
        i += 1;
      }
      if (!para.length) { i += 1; continue; }
      /* two trailing spaces is markdown's hard line break */
      out.push('<p>' + inline(para.join('\n').replace(/ {2,}\n/g, '<br>\n'), opts) + '</p>');
    }

    return out.join('\n');
  }

  function render(text, opts) {
    opts = opts || {};
    /* THE escape. Everything downstream operates on safe text. */
    return blocks(esc(text), opts);
  }

  /* Headings, for a table of contents, without rendering anything. */
  function outline(text) {
    return String(text == null ? '' : text).split(/\r?\n/).reduce(function (acc, line) {
      var head = /^(#{1,6})\s+(.+?)\s*#*$/.exec(line);
      if (head) acc.push({ level: head[1].length, text: head[2], id: slug(head[2]) });
      return acc;
    }, []);
  }

  global.PNMarkdown = { render: render, outline: outline, esc: esc, slug: slug };
}(typeof window !== 'undefined' ? window : globalThis));
