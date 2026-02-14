/* ===========================
   SQA Past Papers — Application Logic
   =========================== */
(function () {
  'use strict';

  // ── Configuration ─────────────────────────────────────────
  const LEVELS = [
    { id: 'N5', name: 'National 5' },
    { id: 'higher', name: 'Higher' },
    { id: 'AH', name: 'Advanced Higher' }
  ];

  const YEARS = ['2025', '2024', '2023', '2022', 'specimen'];

  const BASE = '../computer_science';

  // ── State ─────────────────────────────────────────────────
  const state = {
    selectedLevel: null,
    selectedSection: null,
    selectedSubsection: null,
    paperData: {},          // key: "level_year" -> parsed JSON
    expandedYears: new Set(),
    expandedSubs: new Set()
  };

  // ── DOM refs ──────────────────────────────────────────────
  const $ = (id) => document.getElementById(id);
  const els = {
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

  // ── SVG Icons ─────────────────────────────────────────────
  const ICONS = {
    chevronDown: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>',
    chevronRight: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>',
    eye: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
    download: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>'
  };

  // ── Data Loading ──────────────────────────────────────────
  function loadPapersForLevel(levelId) {
    YEARS.forEach(function (year) {
      var key = levelId + '_' + year;
      if (state.paperData[key]) return; // already loaded
      if (typeof PAPER_DATA !== 'undefined' && PAPER_DATA[key]) {
        state.paperData[key] = PAPER_DATA[key];
      }
    });
  }

  function extractSections() {
    const sections = new Map(); // name -> count
    for (const key in state.paperData) {
      if (!key.startsWith(state.selectedLevel + '_')) continue;
      const data = state.paperData[key];
      for (const q of data.question_map) {
        for (const sq of q.subquestions) {
          sections.set(sq.course_section, (sections.get(sq.course_section) || 0) + 1);
        }
      }
    }
    return [...sections.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }

  function extractSubsections(section) {
    const subs = new Map();
    for (const key in state.paperData) {
      if (!key.startsWith(state.selectedLevel + '_')) continue;
      const data = state.paperData[key];
      for (const q of data.question_map) {
        for (const sq of q.subquestions) {
          if (sq.course_section === section) {
            subs.set(sq.course_subsection, (subs.get(sq.course_subsection) || 0) + 1);
          }
        }
      }
    }
    return [...subs.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }

  function filterQuestions(questionMap) {
    const result = [];
    for (const q of questionMap) {
      const filtered = q.subquestions.filter(function (sq) {
        if (state.selectedSection && sq.course_section !== state.selectedSection) return false;
        if (state.selectedSubsection && sq.course_subsection !== state.selectedSubsection) return false;
        return true;
      });
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

  // Level badges
  function renderLevelBadges() {
    els.levelBadges.innerHTML = '';
    LEVELS.forEach(function (lvl) {
      var badge = document.createElement('button');
      badge.className = 'badge' + (state.selectedLevel === lvl.id ? ' active' : '');
      badge.textContent = lvl.name;
      badge.setAttribute('role', 'radio');
      badge.setAttribute('aria-checked', state.selectedLevel === lvl.id);
      badge.addEventListener('click', function () { onLevelSelect(lvl.id); });
      els.levelBadges.appendChild(badge);
    });
  }

  // Section badges
  function renderSectionBadges(sections) {
    els.sectionBadges.innerHTML = '';
    sections.forEach(function (entry) {
      var name = entry[0];
      var badge = document.createElement('button');
      badge.className = 'badge' + (state.selectedSection === name ? ' active' : '');
      badge.textContent = name;
      badge.setAttribute('role', 'radio');
      badge.setAttribute('aria-checked', state.selectedSection === name);
      badge.addEventListener('click', function () { onSectionSelect(name); });
      els.sectionBadges.appendChild(badge);
    });
  }

  // Subsection badges
  function renderSubsectionBadges(subsections) {
    els.subsectionBadges.innerHTML = '';

    // "All" badge
    var allBadge = document.createElement('button');
    allBadge.className = 'badge' + (state.selectedSubsection === null ? ' active' : '');
    allBadge.textContent = 'All';
    allBadge.addEventListener('click', function () { onSubsectionSelect(null); });
    els.subsectionBadges.appendChild(allBadge);

    subsections.forEach(function (entry) {
      var name = entry[0];
      var badge = document.createElement('button');
      badge.className = 'badge' + (state.selectedSubsection === name ? ' active' : '');
      badge.textContent = name;
      badge.setAttribute('role', 'radio');
      badge.setAttribute('aria-checked', state.selectedSubsection === name);
      badge.addEventListener('click', function () { onSubsectionSelect(name); });
      els.subsectionBadges.appendChild(badge);
    });
  }

  // Papers list
  function renderPapers() {
    els.papersList.innerHTML = '';
    var totalQuestions = 0;

    YEARS.forEach(function (year) {
      var key = state.selectedLevel + '_' + year;
      var data = state.paperData[key];
      if (!data) return;

      var filtered = filterQuestions(data.question_map);
      if (filtered.length === 0) return;

      // Count subquestions
      var count = 0;
      filtered.forEach(function (q) { count += q.subquestions.length; });
      totalQuestions += count;

      var accordion = createYearAccordion(year, filtered, count);
      els.papersList.appendChild(accordion);
    });

    els.resultsCount.textContent = totalQuestions + ' question' + (totalQuestions !== 1 ? 's' : '') + ' found';
  }

  function createYearAccordion(year, questions, count) {
    var wrapper = document.createElement('div');
    wrapper.className = 'year-accordion';
    if (state.expandedYears.has(year)) wrapper.classList.add('expanded');

    // Header
    var header = document.createElement('div');
    header.className = 'year-header';
    header.innerHTML =
      '<div class="year-header-left">' +
      '<span class="year-label">' + yearDisplayName(year) + '</span>' +
      '<span class="year-count">' + count + ' question' + (count !== 1 ? 's' : '') + '</span>' +
      '</div>' +
      '<span class="year-chevron">' + ICONS.chevronDown + '</span>';

    header.addEventListener('click', function () {
      var isExpanded = wrapper.classList.toggle('expanded');
      if (isExpanded) {
        state.expandedYears.add(year);
      } else {
        state.expandedYears.delete(year);
      }
    });

    // Body
    var body = document.createElement('div');
    body.className = 'year-body';

    var content = document.createElement('div');
    content.className = 'year-content';

    // Group questions by subsection
    var grouped = groupBySubsection(questions);

    if (grouped.order.length === 1 && state.selectedSubsection) {
      // Single subsection selected: show questions directly without nesting
      grouped.groups[grouped.order[0]].forEach(function (item) {
        content.appendChild(createQuestionRow(item, year));
      });
    } else {
      // Multiple subsections: create sub-accordions
      grouped.order.forEach(function (subName) {
        var subGroup = createSubsectionGroup(subName, grouped.groups[subName], year);
        content.appendChild(subGroup);
      });
    }

    body.appendChild(content);
    wrapper.appendChild(header);
    wrapper.appendChild(body);
    return wrapper;
  }

  function createSubsectionGroup(name, items, year) {
    var groupKey = year + '::' + name;
    var wrapper = document.createElement('div');
    wrapper.className = 'subsection-group';
    // Auto-expand if there's only one subsection or the user selected one
    if (state.selectedSubsection || items.length <= 3) {
      wrapper.classList.add('expanded');
      state.expandedSubs.add(groupKey);
    } else if (state.expandedSubs.has(groupKey)) {
      wrapper.classList.add('expanded');
    }

    var header = document.createElement('div');
    header.className = 'subsection-header';
    header.innerHTML =
      '<span class="subsection-chevron">' + ICONS.chevronRight + '</span>' +
      '<span class="subsection-dot"></span>' +
      '<span class="subsection-label">' + escapeHtml(name) + ' <span class="year-count">(' + items.length + ')</span></span>';

    header.addEventListener('click', function () {
      var isExpanded = wrapper.classList.toggle('expanded');
      if (isExpanded) state.expandedSubs.add(groupKey);
      else state.expandedSubs.delete(groupKey);
    });

    var body = document.createElement('div');
    body.className = 'subsection-body';

    var content = document.createElement('div');
    content.className = 'subsection-content';

    items.forEach(function (item) {
      content.appendChild(createQuestionRow(item, year));
    });

    body.appendChild(content);
    wrapper.appendChild(header);
    wrapper.appendChild(body);
    return wrapper;
  }

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

    // Download both handler
    row.querySelector('.btn-download').addEventListener('click', function () {
      downloadFile(this.dataset.qp);
      var mi = this.dataset.mi;
      setTimeout(function () { downloadFile(mi); }, 300);
    });

    return row;
  }

  // ── Event Handlers ────────────────────────────────────────

  function onLevelSelect(levelId) {
    state.selectedLevel = levelId;
    state.selectedSection = null;
    state.selectedSubsection = null;
    state.expandedYears.clear();
    state.expandedSubs.clear();

    renderLevelBadges();

    loadPapersForLevel(levelId);

    var sections = extractSections();
    renderSectionBadges(sections);
    show(els.sectionContainer);

    hide(els.subsectionContainer);
    hide(els.papersContainer);
    hide(els.emptyState);
  }

  function onSectionSelect(section) {
    state.selectedSection = section;
    state.selectedSubsection = null;
    state.expandedYears.clear();
    state.expandedSubs.clear();

    renderSectionBadges(extractSections());

    var subsections = extractSubsections(section);
    renderSubsectionBadges(subsections);
    show(els.subsectionContainer);

    renderPapers();
    show(els.papersContainer);
    hide(els.emptyState);

    // Scroll papers into view
    setTimeout(function () {
      els.papersContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  }

  function onSubsectionSelect(subsection) {
    state.selectedSubsection = subsection;
    state.expandedSubs.clear();

    renderSubsectionBadges(extractSubsections(state.selectedSection));
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
    // Delay clearing iframe to allow animation
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

  // New tab link
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

  // ── Loading ───────────────────────────────────────────────

  function showLoading() {
    els.loading.classList.add('visible');
  }

  function hideLoading() {
    els.loading.classList.remove('visible');
  }

  // ── Util ──────────────────────────────────────────────────

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function encodeAttr(str) {
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ── Init ──────────────────────────────────────────────────
  function init() {
    renderLevelBadges();
    // Sections are hidden until a level is chosen
    hide(els.sectionContainer);
    hide(els.subsectionContainer);
    hide(els.papersContainer);
    show(els.emptyState);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
