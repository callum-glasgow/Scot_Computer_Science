/* ===========================
   SQA Past Papers — Application Logic (Performance-Optimised)
   =========================== */
(function () {
  'use strict';

  // ── Configuration ─────────────────────────────────────────
  var LEVELS = [
    { id: 'N5', name: 'National 5' },
    { id: 'higher', name: 'Higher' },
    { id: 'AH', name: 'Advanced Higher' }
  ];

  var YEARS = ['2025', '2024', '2023', '2022', 'specimen'];
  var BASE = '../computer_science';

  // ── State ─────────────────────────────────────────────────
  var state = {
    selectedLevel: null,
    selectedSection: null,
    selectedSubsection: null,
    expandedYears: {},   // year -> true
    expandedSubs: {}     // key -> true
  };

  // ── Pre-built index (built once per level) ────────────────
  // index[level] = { sections: Map<section, count>,
  //                  subsections: Map<section, Map<subsection, count>>,
  //                  byYear: { year: questionMap } }
  var index = {};

  function buildIndex(levelId) {
    if (index[levelId]) return;
    var sections = {};
    var subsections = {};
    var byYear = {};

    for (var y = 0; y < YEARS.length; y++) {
      var year = YEARS[y];
      var key = levelId + '_' + year;
      var data = (typeof PAPER_DATA !== 'undefined') ? PAPER_DATA[key] : null;
      if (!data) continue;
      byYear[year] = data.question_map;

      var qmap = data.question_map;
      for (var qi = 0; qi < qmap.length; qi++) {
        var subs = qmap[qi].subquestions;
        for (var si = 0; si < subs.length; si++) {
          var sq = subs[si];
          var sec = sq.course_section;
          var sub = sq.course_subsection;

          // Count sections
          sections[sec] = (sections[sec] || 0) + 1;

          // Count subsections per section
          if (!subsections[sec]) subsections[sec] = {};
          subsections[sec][sub] = (subsections[sec][sub] || 0) + 1;
        }
      }
    }

    // Sort section names
    var sortedSections = Object.keys(sections).sort();
    var sectionList = [];
    for (var i = 0; i < sortedSections.length; i++) {
      sectionList.push([sortedSections[i], sections[sortedSections[i]]]);
    }

    index[levelId] = {
      sectionList: sectionList,
      subsections: subsections,
      byYear: byYear
    };
  }

  function getSections(levelId) {
    return index[levelId] ? index[levelId].sectionList : [];
  }

  function getSubsections(levelId, section) {
    if (!index[levelId] || !index[levelId].subsections[section]) return [];
    var obj = index[levelId].subsections[section];
    var keys = Object.keys(obj).sort();
    var result = [];
    for (var i = 0; i < keys.length; i++) {
      result.push([keys[i], obj[keys[i]]]);
    }
    return result;
  }

  // ── DOM refs ──────────────────────────────────────────────
  function $(id) { return document.getElementById(id); }
  var els = {
    levelBadges: $('level-badges'),
    sectionContainer: $('section-container'),
    sectionBadges: $('section-badges'),
    subsectionContainer: $('subsection-container'),
    subsectionBadges: $('subsection-badges'),
    papersContainer: $('papers-container'),
    papersList: $('papers-list'),
    resultsCount: $('results-count'),
    emptyState: $('empty-state'),
    modal: $('pdf-modal'),
    modalTitle: $('modal-title'),
    modalDownload: $('modal-download'),
    modalNewTab: $('modal-newtab'),
    modalClose: $('modal-close'),
    iframe: $('pdf-iframe'),
    loading: $('loading')
  };

  // ── Helpers ───────────────────────────────────────────────
  function show(el) {
    if (typeof el === 'string') el = $(el);
    el.classList.remove('hidden');
  }

  function hide(el) {
    if (typeof el === 'string') el = $(el);
    el.classList.add('hidden');
  }

  function yearDisplayName(y) {
    return y === 'specimen' ? 'Specimen Paper' : y;
  }

  function qpPath(level, year, questionNum) {
    return BASE + '/Single_Qestions/' + level + '/' + year + '/Q' + questionNum + '.pdf';
  }

  function miPath(level, year, questionNum, subId) {
    return BASE + '/Single_Qestions/' + level + '/' + year +
      '/MI_Q' + questionNum + '/MI_Q' + questionNum + '_' + subId + '.pdf';
  }

  // Fast HTML escape — no DOM element creation
  var ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) { return ESC_MAP[c]; });
  }

  function encodeAttr(str) {
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ── SVG Icons ─────────────────────────────────────────────
  var ICONS = {
    chevronDown: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>',
    chevronRight: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>',
    eye: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
    download: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>'
  };

  // ── Filtering ─────────────────────────────────────────────
  function filterQuestions(questionMap) {
    var result = [];
    for (var i = 0; i < questionMap.length; i++) {
      var q = questionMap[i];
      var filtered = [];
      for (var j = 0; j < q.subquestions.length; j++) {
        var sq = q.subquestions[j];
        if (state.selectedSection && sq.course_section !== state.selectedSection) continue;
        if (state.selectedSubsection && sq.course_subsection !== state.selectedSubsection) continue;
        filtered.push(sq);
      }
      if (filtered.length > 0) {
        result.push({ question: q.question, subquestions: filtered });
      }
    }
    return result;
  }

  function groupBySubsection(questions) {
    var groups = {};
    var order = [];
    for (var i = 0; i < questions.length; i++) {
      var q = questions[i];
      for (var j = 0; j < q.subquestions.length; j++) {
        var sq = q.subquestions[j];
        var key = sq.course_subsection;
        if (!groups[key]) {
          groups[key] = [];
          order.push(key);
        }
        groups[key].push({
          questionNum: q.question,
          id: sq.id,
          description: sq.description,
          course_subsection: sq.course_subsection
        });
      }
    }
    return { groups: groups, order: order };
  }

  // ── Rendering ─────────────────────────────────────────────

  function renderLevelBadges() {
    els.levelBadges.innerHTML = '';
    var frag = document.createDocumentFragment();
    for (var i = 0; i < LEVELS.length; i++) {
      var lvl = LEVELS[i];
      var badge = document.createElement('button');
      badge.className = 'badge' + (state.selectedLevel === lvl.id ? ' active' : '');
      badge.textContent = lvl.name;
      badge.setAttribute('role', 'radio');
      badge.setAttribute('aria-checked', state.selectedLevel === lvl.id);
      badge.dataset.level = lvl.id;
      frag.appendChild(badge);
    }
    els.levelBadges.appendChild(frag);
  }

  // Use event delegation for level badges
  els.levelBadges.addEventListener('click', function (e) {
    var btn = e.target.closest('.badge');
    if (btn && btn.dataset.level) onLevelSelect(btn.dataset.level);
  });

  function renderSectionBadges(sections) {
    els.sectionBadges.innerHTML = '';
    var frag = document.createDocumentFragment();
    for (var i = 0; i < sections.length; i++) {
      var name = sections[i][0];
      var badge = document.createElement('button');
      badge.className = 'badge' + (state.selectedSection === name ? ' active' : '');
      badge.textContent = name;
      badge.setAttribute('role', 'radio');
      badge.setAttribute('aria-checked', state.selectedSection === name);
      badge.dataset.section = name;
      frag.appendChild(badge);
    }
    els.sectionBadges.appendChild(frag);
  }

  els.sectionBadges.addEventListener('click', function (e) {
    var btn = e.target.closest('.badge');
    if (btn && btn.dataset.section) onSectionSelect(btn.dataset.section);
  });

  function renderSubsectionBadges(subsections) {
    els.subsectionBadges.innerHTML = '';
    var frag = document.createDocumentFragment();

    // "All" badge
    var allBadge = document.createElement('button');
    allBadge.className = 'badge' + (state.selectedSubsection === null ? ' active' : '');
    allBadge.textContent = 'All';
    allBadge.dataset.subsection = '__all__';
    frag.appendChild(allBadge);

    for (var i = 0; i < subsections.length; i++) {
      var name = subsections[i][0];
      var badge = document.createElement('button');
      badge.className = 'badge' + (state.selectedSubsection === name ? ' active' : '');
      badge.textContent = name;
      badge.setAttribute('role', 'radio');
      badge.setAttribute('aria-checked', state.selectedSubsection === name);
      badge.dataset.subsection = name;
      frag.appendChild(badge);
    }
    els.subsectionBadges.appendChild(frag);
  }

  els.subsectionBadges.addEventListener('click', function (e) {
    var btn = e.target.closest('.badge');
    if (!btn) return;
    var sub = btn.dataset.subsection;
    if (sub === '__all__') onSubsectionSelect(null);
    else if (sub) onSubsectionSelect(sub);
  });

  // ── Papers rendering with LAZY accordion bodies ───────────

  function renderPapers() {
    els.papersList.innerHTML = '';
    var totalQuestions = 0;
    var frag = document.createDocumentFragment();
    var levelIdx = index[state.selectedLevel];
    if (!levelIdx) return;

    for (var y = 0; y < YEARS.length; y++) {
      var year = YEARS[y];
      var qmap = levelIdx.byYear[year];
      if (!qmap) continue;

      var filtered = filterQuestions(qmap);
      if (filtered.length === 0) continue;

      var count = 0;
      for (var qi = 0; qi < filtered.length; qi++) {
        count += filtered[qi].subquestions.length;
      }
      totalQuestions += count;

      frag.appendChild(createYearAccordion(year, filtered, count));
    }

    els.papersList.appendChild(frag);
    els.resultsCount.textContent = totalQuestions + ' question' + (totalQuestions !== 1 ? 's' : '') + ' found';
  }

  function createYearAccordion(year, questions, count) {
    var wrapper = document.createElement('div');
    wrapper.className = 'year-accordion';
    var isExpanded = !!state.expandedYears[year];
    if (isExpanded) wrapper.classList.add('expanded');

    // Header
    var header = document.createElement('div');
    header.className = 'year-header';
    header.innerHTML =
      '<div class="year-header-left">' +
      '<span class="year-label">' + yearDisplayName(year) + '</span>' +
      '<span class="year-count">' + count + ' question' + (count !== 1 ? 's' : '') + '</span>' +
      '</div>' +
      '<span class="year-chevron">' + ICONS.chevronDown + '</span>';

    // Body — LAZY: only build content when first expanded
    var body = document.createElement('div');
    body.className = 'year-body';
    var built = isExpanded; // track if content was built

    if (isExpanded) {
      body.appendChild(buildYearContent(year, questions));
    }

    header.addEventListener('click', function () {
      var nowExpanded = wrapper.classList.toggle('expanded');
      if (nowExpanded) {
        state.expandedYears[year] = true;
        if (!built) {
          body.appendChild(buildYearContent(year, questions));
          built = true;
        }
      } else {
        delete state.expandedYears[year];
      }
    });

    wrapper.appendChild(header);
    wrapper.appendChild(body);
    return wrapper;
  }

  function buildYearContent(year, questions) {
    var content = document.createElement('div');
    content.className = 'year-content';

    var grouped = groupBySubsection(questions);

    if (grouped.order.length === 1 && state.selectedSubsection) {
      var items = grouped.groups[grouped.order[0]];
      for (var i = 0; i < items.length; i++) {
        content.appendChild(createQuestionRow(items[i], year));
      }
    } else {
      for (var j = 0; j < grouped.order.length; j++) {
        var subName = grouped.order[j];
        content.appendChild(createSubsectionGroup(subName, grouped.groups[subName], year));
      }
    }

    return content;
  }

  function createSubsectionGroup(name, items, year) {
    var groupKey = year + '::' + name;
    var wrapper = document.createElement('div');
    wrapper.className = 'subsection-group';

    var shouldExpand = state.selectedSubsection || items.length <= 3 || !!state.expandedSubs[groupKey];
    if (shouldExpand) {
      wrapper.classList.add('expanded');
      state.expandedSubs[groupKey] = true;
    }

    var header = document.createElement('div');
    header.className = 'subsection-header';
    header.innerHTML =
      '<span class="subsection-chevron">' + ICONS.chevronRight + '</span>' +
      '<span class="subsection-dot"></span>' +
      '<span class="subsection-label">' + escapeHtml(name) + ' <span class="year-count">(' + items.length + ')</span></span>';

    header.addEventListener('click', function () {
      var nowExpanded = wrapper.classList.toggle('expanded');
      if (nowExpanded) state.expandedSubs[groupKey] = true;
      else delete state.expandedSubs[groupKey];
    });

    var body = document.createElement('div');
    body.className = 'subsection-body';

    var content = document.createElement('div');
    content.className = 'subsection-content';

    // Build all rows using a single innerHTML for speed
    var html = '';
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var qpUrl = encodeURI(qpPath(state.selectedLevel, year, item.questionNum));
      var miUrl = encodeURI(miPath(state.selectedLevel, year, item.questionNum, item.id));
      html +=
        '<div class="question-row">' +
        '<span class="question-id">Q' + escapeHtml(item.id) + '</span>' +
        '<span class="question-desc">' + escapeHtml(item.description) + '</span>' +
        '<div class="question-actions">' +
        '<a class="btn btn-sm btn-qp" href="' + encodeAttr(qpUrl) + '" target="_blank" rel="noopener" title="View Question Paper">' +
        ICONS.eye + '<span class="btn-label">QP</span>' +
        '</a>' +
        '<a class="btn btn-sm btn-mi" href="' + encodeAttr(miUrl) + '" target="_blank" rel="noopener" title="View Marking Instructions">' +
        ICONS.eye + '<span class="btn-label">MI</span>' +
        '</a>' +
        '<button class="btn btn-sm btn-download" data-qp="' + encodeAttr(qpUrl) + '" data-mi="' + encodeAttr(miUrl) + '" title="Download QP + MI">' +
        ICONS.download + '<span class="btn-label">Both</span>' +
        '</button>' +
        '</div>' +
        '</div>';
    }
    content.innerHTML = html;

    body.appendChild(content);
    wrapper.appendChild(header);
    wrapper.appendChild(body);
    return wrapper;
  }

  // Single-row fallback (used when no subsection grouping)
  function createQuestionRow(item, year) {
    var row = document.createElement('div');
    row.className = 'question-row';

    var qpUrl = encodeURI(qpPath(state.selectedLevel, year, item.questionNum));
    var miUrl = encodeURI(miPath(state.selectedLevel, year, item.questionNum, item.id));

    row.innerHTML =
      '<span class="question-id">Q' + escapeHtml(item.id) + '</span>' +
      '<span class="question-desc">' + escapeHtml(item.description) + '</span>' +
      '<div class="question-actions">' +
      '<a class="btn btn-sm btn-qp" href="' + encodeAttr(qpUrl) + '" target="_blank" rel="noopener" title="View Question Paper">' +
      ICONS.eye + '<span class="btn-label">QP</span>' +
      '</a>' +
      '<a class="btn btn-sm btn-mi" href="' + encodeAttr(miUrl) + '" target="_blank" rel="noopener" title="View Marking Instructions">' +
      ICONS.eye + '<span class="btn-label">MI</span>' +
      '</a>' +
      '<button class="btn btn-sm btn-download" data-qp="' + encodeAttr(qpUrl) + '" data-mi="' + encodeAttr(miUrl) + '" title="Download QP + MI">' +
      ICONS.download + '<span class="btn-label">Both</span>' +
      '</button>' +
      '</div>';

    return row;
  }

  // ── Event delegation for download buttons ─────────────────
  els.papersList.addEventListener('click', function (e) {
    var btn = e.target.closest('.btn-download');
    if (!btn) return;
    downloadFile(btn.dataset.qp);
    var mi = btn.dataset.mi;
    setTimeout(function () { downloadFile(mi); }, 300);
  });

  // ── Event Handlers ────────────────────────────────────────

  function onLevelSelect(levelId) {
    state.selectedLevel = levelId;
    state.selectedSection = null;
    state.selectedSubsection = null;
    state.expandedYears = {};
    state.expandedSubs = {};

    renderLevelBadges();
    buildIndex(levelId);

    var sections = getSections(levelId);
    renderSectionBadges(sections);
    show(els.sectionContainer);

    hide(els.subsectionContainer);
    hide(els.papersContainer);
    hide(els.emptyState);
  }

  function onSectionSelect(section) {
    state.selectedSection = section;
    state.selectedSubsection = null;
    state.expandedYears = {};
    state.expandedSubs = {};

    renderSectionBadges(getSections(state.selectedLevel));

    var subsections = getSubsections(state.selectedLevel, section);
    renderSubsectionBadges(subsections);
    show(els.subsectionContainer);

    renderPapers();
    show(els.papersContainer);
    hide(els.emptyState);

    setTimeout(function () {
      els.papersContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  }

  function onSubsectionSelect(subsection) {
    state.selectedSubsection = subsection;
    state.expandedSubs = {};

    renderSubsectionBadges(getSubsections(state.selectedLevel, state.selectedSection));
    renderPapers();
  }

  // ── Modal ─────────────────────────────────────────────────

  function openPdfModal(url, title) {
    els.modalTitle.textContent = title || 'PDF Viewer';
    els.iframe.src = url;
    els.modalDownload.href = url;
    els.modalNewTab.href = url;
    els.modal.classList.add('visible');
    document.body.style.overflow = 'hidden';
  }

  function closePdfModal() {
    els.modal.classList.remove('visible');
    document.body.style.overflow = '';
    setTimeout(function () { els.iframe.src = 'about:blank'; }, 300);
  }

  els.modalClose.addEventListener('click', closePdfModal);
  els.modal.addEventListener('click', function (e) {
    if (e.target === els.modal) closePdfModal();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && els.modal.classList.contains('visible')) {
      closePdfModal();
    }
  });

  els.modalNewTab.addEventListener('click', function (e) {
    e.preventDefault();
    window.open(this.href, '_blank');
  });

  // ── Download Helper ───────────────────────────────────────

  function downloadFile(url) {
    var a = document.createElement('a');
    a.href = url;
    a.download = url.split('/').pop();
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // ── Init ──────────────────────────────────────────────────
  function init() {
    renderLevelBadges();
    hide(els.sectionContainer);
    hide(els.subsectionContainer);
    hide(els.papersContainer);
    show(els.emptyState);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
