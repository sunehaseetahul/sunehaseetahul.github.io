/* Builds the publication lists from papers.bib.
   Publications page: <ol class="pubs" data-bib-group="article|inprogress|workingpaper|report|thesis">
   Research page:     <ul class="works" data-bib-theme="health|norms|work|protection"> */
(function () {
  var SELF = /seetahul/i;

  function clean(v) {
    return v.replace(/\\&/g, "&").replace(/\\%/g, "%").replace(/[{}]/g, "").replace(/\s+/g, " ").trim();
  }

  function parseBib(src) {
    var out = [], i = 0;
    while ((i = src.indexOf("@", i)) !== -1) {
      var m = /^@(\w+)\s*\{\s*([^,\s]+)\s*,/.exec(src.slice(i));
      if (!m) { i++; continue; }
      var type = m[1].toLowerCase(), j = i + m[0].length, e = { kind: type, key: m[2] };
      while (j < src.length) {
        while (j < src.length && /[\s,]/.test(src[j])) j++;
        if (src[j] === "}") { j++; break; }
        var fm = /^([A-Za-z_-]+)\s*=\s*/.exec(src.slice(j));
        if (!fm) { j++; continue; }
        var name = fm[1].toLowerCase(), val = "";
        j += fm[0].length;
        if (src[j] === "{") {
          var d = 0, s = j;
          for (; j < src.length; j++) {
            if (src[j] === "{") d++;
            else if (src[j] === "}") { d--; if (d === 0) { j++; break; } }
          }
          val = src.slice(s + 1, j - 1);
        } else if (src[j] === "\"") {
          var s2 = ++j;
          while (j < src.length && src[j] !== "\"") j++;
          val = src.slice(s2, j); j++;
        } else {
          var s3 = j;
          while (j < src.length && /[^,}\s]/.test(src[j])) j++;
          val = src.slice(s3, j);
        }
        e[name === "type" ? "reporttype" : name] = clean(val);
      }
      if (["comment", "string", "preamble"].indexOf(type) === -1) out.push(e);
      i = j;
    }
    return out;
  }

  function coauthors(e) {
    if (!e.author) return "";
    var names = e.author.split(/\s+and\s+/).filter(function (a) { return !SELF.test(a); }).map(function (a) {
      var p = a.split(",");
      if (p.length < 2) return a.trim();
      var init = p[1].trim().split(/\s+/).map(function (w) { return /\.$/.test(w) ? w : w.split("-").map(function (x) { return x.charAt(0) + "."; }).join("-"); }).join(" ");
      return init + " " + p[0].trim();
    });
    if (!names.length) return "";
    if (names.length === 1) return "With " + names[0];
    return "With " + names.slice(0, -1).join(", ") + " and " + names[names.length - 1];
  }

  function group(e) {
    if (e.kind === "article") return "article";
    if (e.kind === "unpublished") return "inprogress";
    if (e.kind === "phdthesis") return "thesis";
    if (e.kind === "techreport") return /working/i.test(e.category || "") ? "workingpaper" : "report";
    if (e.kind === "book" || e.kind === "incollection" || e.kind === "inbook") return "books";
    if (e.kind === "misc") return "commentary";
    return "report";
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function titleNode(e, title, cls) {
    var link = e.url || (e.doi ? "https://doi.org/" + e.doi : "");
    if (!link) return el("span", cls, title);
    var a = el("a", cls, title);
    a.href = link;
    return a;
  }

  function editors(e) {
    if (!e.editor) return "";
    var n = e.editor.split(/\s+and\s+/).map(function (a) {
      var p = a.split(",");
      return p.length > 1 ? p[1].trim().split(/\s+/).map(function (w) { return w.charAt(0) + "."; }).join(" ") + " " + p[0].trim() : a.trim();
    });
    return n.length > 1 ? n.slice(0, -1).join(", ") + " and " + n[n.length - 1] : n[0];
  }

  function statusNote(e) {
    var parts = [e.status, e.journal].filter(Boolean);
    var t = parts.join(", ");
    if (e.note && e.note !== e.status && !(e.journal && e.note.indexOf(e.journal) > -1)) t += (t ? ". " : "") + e.note;
    return t;
  }

  function yearLabel(e) {
    if (e.kind !== "unpublished") {
      if (e.year) return e.year;
      if (/review/i.test(e.status || "")) return "Review";
      return e.status || "";
    }
    var s = e.status || "";
    if (/resubmit/i.test(s)) return "R&R";
    if (/review/i.test(s)) return "Review";
    if (/accepted|press/i.test(s)) return "Accepted";
    return "Draft";
  }

  function volInfo(e) {
    if (e.volume && e.number) return e.volume + "(" + e.number + ")";
    return e.volume || e.number || "";
  }

  /* Publications page entry */
  function pubItem(e) {
    var li = el("li");
    li.setAttribute("data-themes", (e.keywords || "").split(/[,;]\s*/).join(" ").trim());
    li.appendChild(el("span", "yr", yearLabel(e)));
    var body = el("span");
    body.appendChild(titleNode(e, e.title, "title"));
    var meta = el("span", "meta");
    var bits = [];
    var co = coauthors(e);
    if (co) bits.push(co + ".");
    meta.appendChild(document.createTextNode(bits.join(" ") + (bits.length ? " " : "")));
    if (e.kind === "article") {
      meta.appendChild(el("span", "venue", e.journal || ""));
      var vi = volInfo(e);
      meta.appendChild(document.createTextNode((vi ? ", " + vi : "") + "."));
    } else if (e.kind === "unpublished") {
      var sn = statusNote(e);
      if (sn) meta.appendChild(document.createTextNode(sn + "."));
    } else if (e.kind === "book") {
      meta.appendChild(document.createTextNode([e.publisher, e.status].filter(Boolean).join(", ") + "."));
    } else if (e.kind === "incollection" || e.kind === "inbook") {
      meta.appendChild(document.createTextNode("In "));
      var ed = editors(e);
      if (ed) meta.appendChild(document.createTextNode(ed + " (eds), "));
      meta.appendChild(el("span", "venue", e.booktitle || ""));
      meta.appendChild(document.createTextNode([e.publisher ? ", " + e.publisher : "", e.status ? ". " + e.status : ""].join("") + "."));
    } else if (e.kind === "misc") {
      meta.appendChild(el("span", "venue", e.howpublished || ""));
      meta.appendChild(document.createTextNode("."));
    } else if (e.kind === "phdthesis") {
      meta.appendChild(document.createTextNode((e.school || "") + "."));
    } else {
      var rep = [e.institution, [e.reporttype, e.number].filter(Boolean).join(" ")].filter(Boolean).join(", ");
      meta.appendChild(document.createTextNode(rep + (e.status ? ". " + e.status : "") + "."));
    }
    if (e.rank) {
      meta.appendChild(document.createTextNode(" "));
      meta.appendChild(el("span", "rank", e.rank));
    }
    body.appendChild(meta);
    li.appendChild(body);
    li.appendChild(el("span", "tdots"));
    return li;
  }

  /* Research page entry */
  function workItem(e) {
    var li = el("li");
    var wt = el("span", "wt");
    wt.appendChild(titleNode(e, e.shorttitle || e.title));
    if (e.status) {
      wt.appendChild(document.createTextNode(" "));
      wt.appendChild(el("span", "status", e.status));
    }
    li.appendChild(wt);
    var parts = [];
    if (e.kind === "article") parts.push((e.journal || "") + ", " + (e.year || ""));
    else if (e.kind === "techreport") parts.push([e.institution, e.reporttype].filter(Boolean).join(", ") + ", " + (e.year || ""));
    else if (e.kind === "unpublished" && e.journal) parts.push(e.journal);
    else if (e.kind === "book") parts.push([e.publisher, e.year].filter(Boolean).join(", "));
    else if (e.kind === "incollection" || e.kind === "inbook") parts.push("Chapter in " + (e.booktitle || "") + (editors(e) ? ", edited by " + editors(e) : ""));
    else if (e.kind === "misc") parts.push([e.howpublished, e.year].filter(Boolean).join(", "));
    var co = coauthors(e);
    if (co) parts.push(co);
    if (e.kind === "unpublished" && e.note && e.note !== e.status && !/resubmit/i.test(e.note)) parts.push(e.note);
    li.appendChild(el("span", "wm", parts.join(". ")));
    return li;
  }

  function rank(e) {
    var g = group(e);
    return { article: 0, workingpaper: 0, books: 0, inprogress: 1, report: 2, commentary: 3, thesis: 3 }[g];
  }
  function yr(e) { return parseInt(e.year, 10) || (e.status ? 9999 : 0); }
  function byYear(a, b) { return yr(b) - yr(a); }

  function render(entries) {
    document.querySelectorAll("[data-bib-group]").forEach(function (ol) {
      var g = ol.getAttribute("data-bib-group");
      var list = entries.filter(function (e) { return group(e) === g; });
      if (g !== "inprogress" && g !== "books") list.sort(byYear);
      ol.innerHTML = "";
      list.forEach(function (e) { ol.appendChild(pubItem(e)); });
      var box = ol.closest(".pubgroup");
      if (box && !list.length) box.hidden = true;
    });
    document.querySelectorAll("[data-bib-theme]").forEach(function (ul) {
      var t = ul.getAttribute("data-bib-theme");
      var list = entries.filter(function (e) { return (e.researchpage || "").trim() === t; });
      list.sort(function (a, b) { return byYear(a, b) || rank(a) - rank(b); });
      ul.innerHTML = "";
      list.forEach(function (e) { ul.appendChild(workItem(e)); });
    });
    document.dispatchEvent(new CustomEvent("papers-ready"));
  }

  function fail() {
    document.querySelectorAll("[data-bib-group], [data-bib-theme]").forEach(function (n) {
      n.innerHTML = "";
      var li = el("li", null, "The publication list could not be loaded. Please see the CV.");
      n.appendChild(li);
    });
  }

  fetch("papers.bib", { cache: "no-cache" })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
    .then(function (txt) {
      var entries = parseBib(txt);
      render(entries);
    })
    .catch(fail);
})();
