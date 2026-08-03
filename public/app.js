// ============================================
// BALEADAS WAR STATS — Application Logic (GSAP + Lenis + Static Dual Mode)
// ============================================

const CLAN_TAG = '#LCY8L80V';
const MONTH_NAMES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

let warLogData = null;
let selectedMonthKey = null;


// ---- Init ----
document.addEventListener('DOMContentLoaded', () => {
  refreshIcons();
  animateHeroHeader();
  loadData();
});



// ---- GSAP Hero Animation ----
function animateHeroHeader() {
  if (!window.gsap) return;

  const tl = gsap.timeline();
  tl.from('.clan-badge-wrapper', { scale: 0.6, opacity: 0, duration: 0.8, ease: 'back.out(1.7)' })
    .from('.title-pre', { y: -10, opacity: 0, duration: 0.4 }, '-=0.3')
    .from('.title-main', { y: 20, opacity: 0, duration: 0.6, ease: 'power3.out' }, '-=0.2')
    .from('.hero-subtitle', { opacity: 0, duration: 0.4 }, '-=0.3')
    .from('.clan-meta', { y: 15, opacity: 0, duration: 0.5 }, '-=0.2');
}

// Refresh Lucide SVG Icons
function refreshIcons() {
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

// ---- Data Loading (Dual Mode: Live Server API Proxy or Static JSON Fallback) ----
async function loadData() {
  showLoading();

  try {
    let warLogRes = null;
    let clanRes = null;

    // First try live local server proxy
    try {
      warLogRes = await fetch('/api/warlog?limit=20');
      if (warLogRes.ok) {
        clanRes = await fetch('/api/clan');
      }
    } catch (e) {
      console.log('Live server proxy endpoint unreachable, using static fallback.');
    }

    // Fallback to static JSON if live API proxy is missing or failed (e.g. GitHub Pages)
    if (!warLogRes || !warLogRes.ok) {
      console.log('Loading static JSON fallback...');
      warLogRes = await fetch('./data/warlog.json');
      clanRes = await fetch('./data/clan.json');
    }

    if (!warLogRes.ok) throw new Error(`No se pudieron obtener los datos de guerra (${warLogRes.status})`);

    warLogData = await warLogRes.json();

    if (clanRes && clanRes.ok) {
      const clanData = await clanRes.json();
      updateClanInfo(clanData);
    }

    processAndDisplay();
  } catch (err) {
    console.error('Error loading data:', err);
    showError(err.message);
  }
}

function showLoading() {
  document.getElementById('loadingState').classList.remove('hidden');
  document.getElementById('errorState').classList.add('hidden');
  document.getElementById('statsSummary').classList.add('hidden');
  document.getElementById('podiumSection').classList.add('hidden');
  document.getElementById('rankingSection').classList.add('hidden');
  document.getElementById('warsDetailSection').classList.add('hidden');
}

function hideLoading() {
  document.getElementById('loadingState').classList.add('hidden');
}

function showError(message) {
  hideLoading();
  const errorState = document.getElementById('errorState');
  errorState.classList.remove('hidden');
  document.getElementById('errorText').textContent = message;
  refreshIcons();
}

function updateClanInfo(clan) {
  if (clan.name) {
    document.getElementById('clanName').textContent = clan.name;
  }
  document.querySelector('#clanMembers .meta-value').textContent = `${clan.members || '--'} miembros`;
  document.querySelector('#clanTrophies .meta-value').textContent = `${(clan.clanScore || 0).toLocaleString()} trofeos`;
  document.querySelector('#clanWarTrophies .meta-value').textContent = `${(clan.clanWarTrophies || 0).toLocaleString()} trofeos de guerra`;
}

// ---- Process Data ----
function processAndDisplay() {
  hideLoading();

  if (!warLogData || !warLogData.items || warLogData.items.length === 0) {
    showError('No se encontraron datos de guerra');
    return;
  }

  // Group wars by month
  const warsByMonth = groupWarsByMonth(warLogData.items);
  const monthKeys = Object.keys(warsByMonth).sort().reverse();

  if (monthKeys.length === 0) {
    showError('No se encontraron guerras');
    return;
  }

  // Build month selector
  buildMonthSelector(monthKeys, warsByMonth);

  // Select the most recent month by default
  selectMonth(monthKeys[0], warsByMonth);
}

function groupWarsByMonth(items) {
  const grouped = {};

  items.forEach(item => {
    const ourStanding = item.standings.find(s => s.clan.tag === CLAN_TAG);
    if (!ourStanding) return;

    const dateStr = item.createdDate;
    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6)) - 1; // 0-indexed
    const day = parseInt(dateStr.substring(6, 8));

    const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

    if (!grouped[monthKey]) {
      grouped[monthKey] = [];
    }

    grouped[monthKey].push({
      seasonId: item.seasonId,
      sectionIndex: item.sectionIndex,
      createdDate: new Date(year, month, day),
      rank: ourStanding.rank,
      clanScore: ourStanding.clan.clanScore,
      participants: ourStanding.clan.participants || []
    });
  });

  return grouped;
}

function buildMonthSelector(monthKeys, warsByMonth) {
  const container = document.getElementById('monthButtons');
  container.innerHTML = '';

  monthKeys.forEach(key => {
    const [year, month] = key.split('-');
    const monthName = MONTH_NAMES_ES[parseInt(month) - 1];
    const warCount = warsByMonth[key].length;

    const btn = document.createElement('button');
    btn.className = 'month-btn';
    btn.dataset.month = key;
    btn.innerHTML = `<span>${monthName} ${year} (${warCount})</span>`;
    btn.addEventListener('click', () => selectMonth(key, warsByMonth));
    container.appendChild(btn);
  });

  if (window.gsap) {
    gsap.from('.month-btn', {
      scale: 0.9,
      opacity: 0,
      duration: 0.4,
      stagger: 0.05,
      ease: 'power2.out'
    });
  }
}

function selectMonth(monthKey, warsByMonth) {
  selectedMonthKey = monthKey;

  document.querySelectorAll('.month-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.month === monthKey);
  });

  const wars = warsByMonth[monthKey];
  const aggregated = aggregatePlayerStats(wars);

  renderStats(aggregated, wars);
  renderPodium(aggregated);
  renderRanking(aggregated);
  renderWarDetails(wars);

  refreshIcons();
}

function aggregatePlayerStats(wars) {
  const playerMap = {};

  wars.forEach(war => {
    war.participants.forEach(p => {
      if (!playerMap[p.tag]) {
        playerMap[p.tag] = {
          tag: p.tag,
          name: p.name,
          totalFame: 0,
          totalDecksUsed: 0,
          totalBoatAttacks: 0,
          warsParticipated: 0,
          warsPresent: 0
        };
      }

      playerMap[p.tag].warsPresent++;
      playerMap[p.tag].totalFame += p.fame || 0;
      playerMap[p.tag].totalDecksUsed += p.decksUsed || 0;
      playerMap[p.tag].totalBoatAttacks += p.boatAttacks || 0;

      if ((p.fame || 0) > 0 || (p.decksUsed || 0) > 0) {
        playerMap[p.tag].warsParticipated++;
      }

      if (p.name) {
        playerMap[p.tag].name = p.name;
      }
    });
  });

  return Object.values(playerMap).sort((a, b) => b.totalFame - a.totalFame);
}

// ---- Render Stats Summary ----
function renderStats(players, wars) {
  const section = document.getElementById('statsSummary');
  section.classList.remove('hidden');

  const totalWars = wars.length;
  const totalFame = players.reduce((sum, p) => sum + p.totalFame, 0);
  const topScorer = players[0];
  const activePlayers = players.filter(p => p.totalFame > 0);
  const avgFame = activePlayers.length > 0 ? Math.round(totalFame / activePlayers.length) : 0;

  document.getElementById('totalWars').textContent = totalWars;
  document.getElementById('totalFame').textContent = totalFame.toLocaleString();
  document.getElementById('topScorerName').textContent = topScorer ? topScorer.name : '--';
  document.getElementById('avgFame').textContent = avgFame.toLocaleString();

  if (window.gsap) {
    gsap.fromTo('.stat-card', 
      { y: 25, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: 'power2.out' }
    );
  }
}

// ---- Render Podium ----
function renderPodium(players) {
  const section = document.getElementById('podiumSection');
  section.classList.remove('hidden');

  const top3 = players.slice(0, 3);
  const maxFame = top3[0] ? top3[0].totalFame : 1;

  for (let i = 0; i < 3; i++) {
    const place = document.getElementById(`podium${i + 1}`);
    const player = top3[i];

    if (player) {
      place.querySelector('.podium-name').textContent = player.name;
      place.querySelector('.podium-score').textContent = player.totalFame.toLocaleString();

      const fillPercent = maxFame > 0 ? (player.totalFame / maxFame) * 100 : 0;
      setTimeout(() => {
        place.querySelector('.podium-bar-fill').style.width = `${fillPercent}%`;
      }, 300 + i * 150);
    } else {
      place.querySelector('.podium-name').textContent = '--';
      place.querySelector('.podium-score').textContent = '0';
      place.querySelector('.podium-bar-fill').style.width = '0%';
    }
  }

  if (window.gsap) {
    gsap.fromTo('.podium-place',
      { y: 40, scale: 0.95, opacity: 0 },
      { y: 0, scale: 1, opacity: 1, duration: 0.7, stagger: 0.12, ease: 'back.out(1.4)' }
    );
  }
}

// ---- Render Ranking Table ----
function renderRanking(players) {
  const section = document.getElementById('rankingSection');
  section.classList.remove('hidden');

  const tbody = document.getElementById('rankingBody');
  tbody.innerHTML = '';

  const maxFame = players[0] ? players[0].totalFame : 1;

  players.forEach((player, idx) => {
    const rank = idx + 1;
    const avgPerWar = player.warsParticipated > 0
      ? Math.round(player.totalFame / player.warsParticipated)
      : 0;
    const famePercent = maxFame > 0 ? (player.totalFame / maxFame) * 100 : 0;

    let rankClass = 'top-other';
    let rowClass = '';
    let rankBadgeHtml = `<span class="rank-badge other">${rank}</span>`;

    if (rank === 1) {
      rankClass = 'top-1';
      rowClass = 'row-top-1';
      rankBadgeHtml = `<span class="rank-badge gold">1</span>`;
    } else if (rank === 2) {
      rankClass = 'top-2';
      rowClass = 'row-top-2';
      rankBadgeHtml = `<span class="rank-badge silver">2</span>`;
    } else if (rank === 3) {
      rankClass = 'top-3';
      rowClass = 'row-top-3';
      rankBadgeHtml = `<span class="rank-badge bronze">3</span>`;
    }
    if (player.totalFame === 0) rowClass += ' row-zero';

    const tr = document.createElement('tr');
    tr.className = rowClass;
    tr.innerHTML = `
      <td class="td-rank ${rankClass}">${rankBadgeHtml}</td>
      <td class="td-player">${escapeHtml(player.name)}</td>
      <td class="td-fame fame-bar-cell">
        <div class="fame-bar-wrapper">
          <span class="mono-num">${player.totalFame.toLocaleString()}</span>
          <div class="fame-mini-bar">
            <div class="fame-mini-bar-fill" style="width: 0%"></div>
          </div>
        </div>
      </td>
      <td class="td-decks mono-num">${player.totalDecksUsed}</td>
      <td class="td-wars mono-num">${player.warsParticipated}/${player.warsPresent}</td>
      <td class="td-avg mono-num">${avgPerWar.toLocaleString()}</td>
    `;

    tbody.appendChild(tr);

    setTimeout(() => {
      const fill = tr.querySelector('.fame-mini-bar-fill');
      if (fill) fill.style.width = `${famePercent}%`;
    }, 100 + idx * 25);
  });

  if (window.gsap) {
    gsap.fromTo('#rankingBody tr',
      { y: 15, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.4, stagger: 0.02, ease: 'power1.out' }
    );
  }
}

// ---- Render War Details Accordion ----
function renderWarDetails(wars) {
  const section = document.getElementById('warsDetailSection');
  section.classList.remove('hidden');

  const container = document.getElementById('warsAccordion');
  container.innerHTML = '';

  const sortedWars = [...wars].sort((a, b) => b.createdDate - a.createdDate);

  sortedWars.forEach((war, idx) => {
    const endDate = war.createdDate;
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

    const startDateStr = startDate.toLocaleDateString('es-HN', { day: 'numeric', month: 'short' });
    const endDateStr = endDate.toLocaleDateString('es-HN', { day: 'numeric', month: 'short', year: 'numeric' });

    const dateRangeFormatted = `<i data-lucide="calendar" class="war-icon"></i> ${startDateStr} - ${endDateStr}`;
    const weekLabel = war.sectionIndex !== undefined ? `Semana ${war.sectionIndex + 1}` : `Guerra ${idx + 1}`;

    let rankBadgeClass = 'war-rank-other';
    let rankBadgeHtml = `<i data-lucide="shield" class="badge-icon"></i> #${war.rank} Lugar`;
    if (war.rank === 1) {
      rankBadgeClass = 'war-rank-1';
      rankBadgeHtml = `<i data-lucide="trophy" class="badge-icon gold"></i> 1er Lugar`;
    } else if (war.rank === 2) {
      rankBadgeClass = 'war-rank-2';
      rankBadgeHtml = `<i data-lucide="award" class="badge-icon silver"></i> 2do Lugar`;
    } else if (war.rank === 3) {
      rankBadgeClass = 'war-rank-3';
      rankBadgeHtml = `<i data-lucide="award" class="badge-icon bronze"></i> 3er Lugar`;
    }

    const sortedParticipants = [...war.participants].sort((a, b) => (b.fame || 0) - (a.fame || 0));
    const totalFame = sortedParticipants.reduce((s, p) => s + (p.fame || 0), 0);
    const activeCount = sortedParticipants.filter(p => (p.fame || 0) > 0).length;
    const maxWarFame = sortedParticipants[0] ? (sortedParticipants[0].fame || 1) : 1;

    const isOpenClass = idx === 0 ? 'open' : '';

    const warDiv = document.createElement('div');
    warDiv.className = `war-item ${isOpenClass}`;
    warDiv.innerHTML = `
      <div class="war-header" onclick="this.parentElement.classList.toggle('open')">
        <div class="war-info">
          <div class="war-title-group">
            <span class="war-week-badge">${weekLabel}</span>
            <span class="war-date">${dateRangeFormatted}</span>
          </div>
          <div class="war-meta-group">
            <span class="war-rank-badge ${rankBadgeClass}">${rankBadgeHtml}</span>
            <span class="war-summary-text">
              <i data-lucide="users" class="sm-icon"></i> ${activeCount} jugadores
              <span class="bullet-dot">•</span>
              <i data-lucide="zap" class="sm-icon"></i> ${totalFame.toLocaleString()} pts total
            </span>
          </div>
        </div>
        <i data-lucide="chevron-down" class="war-toggle-icon"></i>
      </div>
      <div class="war-body">
        <div class="war-body-inner">
          <div class="war-table-header">
            <span>Posición y Jugador</span>
            <span>Puntos (Fama)</span>
            <span>Mazos Usados</span>
          </div>
          <div class="war-participants">
            ${sortedParticipants.map((p, pIdx) => {
              const pRank = pIdx + 1;
              const pFame = p.fame || 0;
              const pDecks = p.decksUsed || 0;
              const pPercent = maxWarFame > 0 ? Math.min((pFame / maxWarFame) * 100, 100) : 0;

              let rankBadge = `<span class="rank-badge other">${pRank}</span>`;
              if (pRank === 1) rankBadge = `<span class="rank-badge gold">1</span>`;
              else if (pRank === 2) rankBadge = `<span class="rank-badge silver">2</span>`;
              else if (pRank === 3) rankBadge = `<span class="rank-badge bronze">3</span>`;

              return `
                <div class="war-participant-card ${pFame === 0 ? 'is-zero' : ''}">
                  <div class="wp-left">
                    ${rankBadge}
                    <span class="wp-name" title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</span>
                  </div>
                  <div class="wp-center">
                    <div class="wp-bar-bg">
                      <div class="wp-bar-fill" style="width: ${pPercent}%"></div>
                    </div>
                    <span class="wp-fame mono-num ${pFame === 0 ? 'zero' : ''}">${pFame.toLocaleString()} pts</span>
                  </div>
                  <div class="wp-right">
                    <span class="wp-decks mono-num">${pDecks} <i data-lucide="layers" class="deck-icon"></i></span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;

    container.appendChild(warDiv);
  });

  if (window.gsap) {
    gsap.fromTo('.war-item',
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, stagger: 0.08, ease: 'power1.out' }
    );
  }
}

// ---- Utility ----
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
