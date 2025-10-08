(function () {
  const CSV_URL = 'Sprint 1 Feedback Form-68b904bdfedea2208c5b26ab.csv';
  const HEADER_START = 'Response ID';
  
  // Team headcounts provided by you
  const TEAM_HEADCOUNT = new Map([
    ['AI', 2],
    ['AI AHA', 3],
    ['AI Can Do It', 2],
    ['AI Frontiers', 3],
    ['AI Newcomer', 3],
    ['AI-YOYO', 3],
    ['Bright Bytes', 3],
    ['DataSage Partners', 3],
    ["Dumbledore's Army", 2],
    ['Fast & Curious – Ask more. Build faster.', 3],
    ['Insight Out (ISO.AI)', 3],
    ['Insight Out 2 (ISO2.Ai)', 3],
    ['Minute Makers', 3],
    ['OE Data Team 1', 3],
    ['OE Data Team 2', 2],
    ['PEANUT (Partnerships & Engagement AI Navigation Unit Team)', 3],
    ['ProcureLogic', 3],
    ['ProphAI$y', 2],
    ['Query Quester', 2],
    ['ReADI (Real-time Analytics & Digital Intelligence)', 3],
    ['SAGE', 2],
    ['SPD 1', 3],
    ['SumUpFollowUp', 2],
    ['T3 (Tender Tech Titans)', 3],
    ['The Web Rangers', 2],
  ]);
  
  const COLS = {
    id: 'Response ID',
    ts: 'Timestamp',
    team: 'Which Sprint team are you from?',
    division: 'Which division are you from?',
    rating: 'On a scale of 1-5, how would you rate your SCG AI-First Sprint Experience?',
    worked: 'What worked best during the sprint process?',
    challenge: 'What was the biggest challenge your team faced?',
    better: 'Anything you would like us to do better for upcoming Sprints?',
    adoption: 'How is the adoption of your solution?',
    vision: 'Where do you envision taking your solution next?',
    continue: 'Do you plan to continue working on this solution beyond the sprint?',
    steps: 'What are your next 2-3 priority steps for development?',
    timeline: 'What is your realistic timeline for moving forward?',
    support: 'What type of support would be most valuable for advancing your solution? (Check all that apply)',
    barriers: 'What are the biggest barriers you foresee in scaling or adopting your solution?',
    followup: 'Would you be interested in ongoing check-ins or follow-up sessions?'
  };
  
  const el = (html) => { const t=document.createElement('template'); t.innerHTML=html.trim(); return t.content.firstChild; };
  const txt = (v) => (v == null ? '' : String(v).trim());
  const parseRating = (v) => { const n = Number(v); return Number.isFinite(n) ? n : null; };
  const classifyRatingBadge = (r) => r >= 5 ? 'rating-5' : r >= 4 ? 'rating-4' : 'rating-3';
  const statusBadge = (value, mapping) => {
    const t = txt(value).toLowerCase();
    for (const [key, cls] of mapping) if (t.startsWith(key)) return cls;
    return 'status-unsure';
  };
  
  // Member color palette and text color
  const MEMBER_COLORS = [
    '#FFCDD2', '#F8BBD0', '#E1BEE7', '#D1C4E9', '#C5CAE9',
    '#BBDEFB', '#B3E5FC', '#B2EBF2', '#B2DFDB', '#C8E6C9',
    '#DCEDC8', '#F0F4C3', '#FFF9C4', '#FFECB3', '#FFE0B2',
    '#FFCCBC', '#D7CCC8', '#CFD8DC'
  ];
  const MEMBER_TEXT = '#1f2937';
  
  function groupByTeam(rows) {
    const map = new Map();
    for (const r of rows) {
      const team = txt(r[COLS.team]) || 'Unknown Team';
      if (!map.has(team)) map.set(team, []);
      map.get(team).push(r);
    }
    return map;
  }
  
  function buildMemberColorMap(teamRows) {
    const map = new Map();
    teamRows.forEach((r, idx) => {
      const key = txt(r[COLS.id]) || `idx-${idx}`;
      map.set(key, MEMBER_COLORS[idx % MEMBER_COLORS.length]);
    });
    return map;
  }
  
  function summarizeTeam(teamRows) {
    const ratings = teamRows.map(r => parseRating(r[COLS.rating])).filter(n => n != null);
    const avg = ratings.length ? (ratings.reduce((a,b)=>a+b,0)/ratings.length) : null;
    const ratingDist = [1,2,3,4,5].map(k => ({
      value: k,
      count: teamRows.filter(r => parseRating(r[COLS.rating]) === k).length
    }));
  
    const contCounts = { yes: 0, maybe: 0, no: 0, unsure: 0 };
    teamRows.forEach(r => {
      const c = txt(r[COLS.continue]).toLowerCase();
      if (c.startsWith('yes')) contCounts.yes++;
      else if (c.startsWith('maybe')) contCounts.maybe++;
      else if (c.startsWith('no')) contCounts.no++;
      else contCounts.unsure++;
    });
  
    const adoptCounts = { beyond: 0, team: 0, some: 0, none: 0, unsure: 0 };
    teamRows.forEach(r => {
      const a = txt(r[COLS.adoption]).toLowerCase();
      if (!a) { adoptCounts.unsure++; return; }
      if (a.startsWith("i'll definitely use")) adoptCounts.beyond++;
      else if (a.startsWith('my immediate team')) adoptCounts.team++;
      else if (a.startsWith('some people')) adoptCounts.some++;
      else if (a.startsWith('no one')) adoptCounts.none++;
      else adoptCounts.unsure++;
    });
  
    return { avgRating: avg, ratingDist, size: teamRows.length, contCounts, adoptCounts };
  }
  
  function groupAnswersWithMembers(teamRows, key) {
    const items = [];
    teamRows.forEach((r, idx) => {
      const memberKey = txt(r[COLS.id]) || `idx-${idx}`;
      const raw = txt(r[key]);
      if (!raw) return;
      const parts = raw.split('\n').map(s => txt(s)).filter(Boolean);
      if (parts.length === 0) return;
      parts.forEach(p => items.push({ answer: p, memberKey, memberIndex: idx }));
    });
  
    const map = new Map();
    for (const it of items) {
      if (!map.has(it.answer)) map.set(it.answer, []);
      map.get(it.answer).push({ memberKey: it.memberKey, memberIndex: it.memberIndex });
    }
    return map;
  }
  
  function render(rows) {
    rows = rows.filter(r => txt(r[COLS.id]) && txt(r[COLS.team]));
  
    // Global metrics
    const ratings = rows.map(r => parseRating(r[COLS.rating])).filter(n => n != null);
    const avg = ratings.length ? (ratings.reduce((a,b)=>a+b,0)/ratings.length) : null;
    const contYesMaybe = rows.filter(r => {
      const c = txt(r[COLS.continue]).toLowerCase();
      return c.startsWith('yes') || c.startsWith('maybe');
    }).length;
    const contRate = rows.length ? Math.round((contYesMaybe / rows.length) * 100) : null;
  
    const adoptionPos = rows.filter(r => {
      const a = txt(r[COLS.adoption]).toLowerCase();
      // Only count 'my immediate team' or 'some people' as positive adoption
      return a.startsWith('my immediate team') || a.startsWith('some people'); 
    }).length;
    const adoptionRate = rows.length ? Math.round((adoptionPos / rows.length) * 100) : null;
  
    document.getElementById('avg-rating').textContent = avg != null ? (Math.round(avg*10)/10).toFixed(1) : '-';
    document.getElementById('total-responses').textContent = rows.length;
    document.getElementById('continuation-rate').textContent = contRate != null ? `${contRate}%` : '-';
    document.getElementById('adoption-rate').textContent = adoptionRate != null ? `${adoptionRate}%` : '-';
  
    // Group by team
    const byTeam = groupByTeam(rows);
    const teamCards = document.getElementById('team-cards');
    teamCards.innerHTML = '';
  
    // Render team cards (one per team)
    [...byTeam.entries()].sort((a,b) => a[0].localeCompare(b[0])).forEach(([teamName, teamRows]) => {
      const memberColorMap = buildMemberColorMap(teamRows);
      const s = summarizeTeam(teamRows);
      const avgRating = s.avgRating != null ? (Math.round(s.avgRating*10)/10).toFixed(1) : '-';
      const ratingClass = classifyRatingBadge(s.avgRating ?? 3);
  
      const teamTotal = TEAM_HEADCOUNT.get(teamName);
      const respondedDisplay = teamTotal ? `${s.size} / ${teamTotal}` : `${s.size}`;
  
      // --- START: CONCISE CARD RENDER LOGIC ---
  
      // Calculate Continuation and Adoption Display for concise metrics
      const teamContYesMaybe = s.contCounts.yes + s.contCounts.maybe;
      const teamContRate = s.size > 0 ? Math.round((teamContYesMaybe / s.size) * 100) : 0;
  
      const teamAdoptPos = s.adoptCounts.team + s.adoptCounts.beyond;
      const adoptValue = s.adoptCounts.beyond >= 1 ? 'Beyond' : s.adoptCounts.team >= 1 ? 'Team' : s.adoptCounts.some >= 1 ? 'Some' : 'None';
  
      // Prepare the Concise Rating Distribution Bar segments
      const totalRatings = s.size;
      // Note: Only showing 3/4/5 in the bar as per original request, but including all for calculation accuracy
      const ratingCounts = s.ratingDist.reduce((acc, curr) => { acc[curr.value] = curr.count; return acc; }, {});
      const width5 = totalRatings > 0 ? (ratingCounts[5] / totalRatings) * 100 : 0;
      const width4 = totalRatings > 0 ? (ratingCounts[4] / totalRatings) * 100 : 0;
      const width3 = totalRatings > 0 ? (ratingCounts[3] / totalRatings) * 100 : 0;
  
      // Build the rating bar HTML (adjusting for percentages and border-radius)
      const barSegmentsHtml = `
        <span class="rating-bar-segment rating-5" style="width: ${width5.toFixed(0)}%; ${width5 > 0 && width5 + width4 + width3 === 100 ? 'border-radius: 4px 0 0 4px;' : width5 > 0 ? 'border-radius: 4px 0 0 4px;' : ''}"></span>        <span class="rating-bar-segment rating-4" style="width: ${width4.toFixed(0)}%; border-radius: 0;"></span>        <span class="rating-bar-segment rating-3" style="width: ${width3.toFixed(0)}%; ${width3 > 0 && width5 === 0 && width4 === 0 ? 'border-radius: 4px 4px 4px 4px;' : width3 > 0 && width5 + width4 < 100 ? 'border-radius: 0 4px 4px 0;' : ''}"></span>      `.trim();
  
      // Determine primary Continuation status badge
      const primaryContStatus = s.contCounts.yes > s.contCounts.no ? 'YES' : s.contCounts.no > 0 ? 'NO' : 'MAYBE';
      const primaryContClass = statusBadge(primaryContStatus, [['yes','status-yes'],['maybe','status-maybe'],['no','status-no']]);
  
      // Determine primary Adoption status badge
      const primaryAdoptStatus = s.adoptCounts.beyond > 0 ? 'Beyond Team' : s.adoptCounts.team > 0 ? 'Team-wide' : 'Limited';
      const primaryAdoptClass = statusBadge(primaryAdoptStatus, [['beyond','status-yes'],['team','status-team'],['limited','status-some'],['none','status-no']]);
  
      // Member-level collapsible list is reused, but now goes below the main summary
      const membersHtml = teamRows.map((r, idx) => {
        const rid = txt(r[COLS.id]);
        const rating = parseRating(r[COLS.rating]) ?? '-';
        const cont = txt(r[COLS.continue]) || '-';
        const worked = txt(r[COLS.worked]);
        const challenge = txt(r[COLS.challenge]);
        const color = memberColorMap.get(rid) || MEMBER_COLORS[idx % MEMBER_COLORS.length];
        return `
          <details style="background:#f8fafc; border-radius:10px; padding:10px 12px; border-left:6px solid ${color};">
            <summary style="cursor:pointer; display:flex; gap:10px; align-items:center;">
              <span style="font-weight:600; color:#2d3748;">Member ${idx+1}</span>
              <span class="status-badge ${classifyRatingBadge(rating)}">${rating}/5</span>
              <span class="status-badge ${statusBadge(cont, [['yes','status-yes'],['maybe','status-maybe'],['no','status-no']])}">${cont}</span>
              <span style="color:#718096; font-size:0.8rem;">ID: ${rid}</span>
            </summary>
            <div style="margin-top:8px;">
              ${worked ? `<div style="margin:6px 0;"><strong>Worked best:</strong><br>${worked.replaceAll('\n','<br/>')}</div>` : ''}
              ${challenge ? `<div style="margin:6px 0;"><strong>Challenge:</strong><br>${challenge.replaceAll('\n','<br/>')}</div>` : ''}
            </div>
          </details>
        `;
      }).join('');
  
      // **REWRITTEN CARD HTML TEMPLATE**
      const card = el(`
        <div class="team-card">
          <div class="team-header">
            <div class="team-name">${teamName}</div>
            <div class="rating-badge ${ratingClass}">${avgRating} / 5</div>
          </div>
  
                    <div class="concise-metrics-grid">
            <div class="metric-item">
              <div class="metric-value-sm">${avgRating}</div>
              <div class="metric-label-sm">Avg. Rating</div>
            </div>
            <div class="metric-item">
              <div class="metric-value-sm">${respondedDisplay}</div>
              <div class="metric-label-sm">Responses${teamTotal ? ' (of ' + teamTotal + ')' : ''}</div>
            </div>
            <div class="metric-item">
              <div class="metric-value-sm">${teamContRate}%</div>
              <div class="metric-label-sm">Continuation (Y/M)</div>
            </div>
            <div class="metric-item">
              <div class="metric-value-sm">${teamAdoptPos}</div>
              <div class="metric-label-sm">Adoption Responses</div>
            </div>
          </div>
  
                    <div class="rating-bar-container">
            <div class="metric-label-sm" style="margin-bottom: 4px; text-align: left;">Rating Distribution (5/4/3+)</div>
            <div class="rating-distribution-bar" title="5 Star: ${ratingCounts[5]}, 4 Star: ${ratingCounts[4]}, 3 Star: ${ratingCounts[3]}">
              ${barSegmentsHtml}
            </div>
          </div>
  
                    <div class="status-summary">
            <div class="status-row-sm">
              <span class="status-label-sm">Continue:</span>
              <span class="status-badge ${primaryContClass}">${primaryContStatus} (${teamContYesMaybe} / ${s.size})</span>
            </div>
            <div class="status-row-sm">
              <span class="status-label-sm">Adoption:</span>
              <span class="status-badge ${primaryAdoptClass}">${primaryAdoptStatus}</span>
            </div>
          </div>
  
                    <div class="status-summary" style="margin-top: 15px;">
            <span class="status-label-sm" style="width: auto; margin-bottom: 8px;">Individual Feedback:</span>
            <div style="display: grid; gap:8px;">
              ${membersHtml}
            </div>
          </div>
        </div>
      `);
      teamCards.appendChild(card);
    });
  
    // Tables (Logic remains unchanged as it was not part of the card refactoring)
    const tbodyExp = document.getElementById('table-experience');
    const tbodyFuture = document.getElementById('table-future');
    const tbodySupport = document.getElementById('table-support');
  
    const teamEntries = [...byTeam.entries()].sort((a,b) => a[0].localeCompare(b[0]));
  
    function renderAnswerCell(teamRows, key) {
      const memberColorMap = buildMemberColorMap(teamRows);
      const grouped = groupAnswersWithMembers(teamRows, key);
      const blocks = [...grouped.entries()].map(([answer, members]) => {
        const chips = members.map(({memberKey, memberIndex}) => {
          const color = memberColorMap.get(memberKey) || MEMBER_COLORS[memberIndex % MEMBER_COLORS.length];
          return `<span title="${memberKey}" style="display:inline-block; background:${color}; color:${MEMBER_TEXT}; padding:3px 8px; border-radius:10px; margin:2px; font-size:0.85rem;">#${memberIndex+1}</span>`;
        }).join('');
        return `
          <div style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:10px; padding:8px 10px; margin:6px 0;">
            <div style="color:#111827; margin-bottom:6px;">${answer}</div>
            <div>${chips}</div>
          </div>
        `;
      });
      return blocks.join('');
    }
  
    function respondentLegend(teamRows) {
      const memberColorMap = buildMemberColorMap(teamRows);
      return teamRows.map((r, idx) => {
        const key = txt(r[COLS.id]) || `idx-${idx}`;
        const color = memberColorMap.get(key) || MEMBER_COLORS[idx % MEMBER_COLORS.length];
        return `<span title="ID ${key}" style="display:inline-block; background:${color}; color:${MEMBER_TEXT}; padding:4px 8px; border-radius:12px; margin:2px; font-size:0.85rem;">#${idx+1}</span>`;
      }).join('');
    }
  
    tbodyExp.innerHTML = teamEntries.map(([team, teamRows]) => `
      <tr>
        <td>
          <strong>${team}</strong><br/>
          <span style="color:#718096; font-size:0.85rem;">respondents: ${teamRows.length}${TEAM_HEADCOUNT.has(team) ? ` / ${TEAM_HEADCOUNT.get(team)}` : ''}</span><br/>
          <div style="margin-top:4px;">${respondentLegend(teamRows)}</div>
        </td>
        <td>${renderAnswerCell(teamRows, COLS.worked)}</td>
        <td>${renderAnswerCell(teamRows, COLS.challenge)}</td>
        <td>${renderAnswerCell(teamRows, COLS.better)}</td>
      </tr>
    `).join('');
  
    tbodyFuture.innerHTML = teamEntries.map(([team, teamRows]) => `
      <tr>
        <td>
          <strong>${team}</strong><br/>
          <span style="color:#718096; font-size:0.85rem;">respondents: ${teamRows.length}${TEAM_HEADCOUNT.has(team) ? ` / ${TEAM_HEADCOUNT.get(team)}` : ''}</span><br/>
          <div style="margin-top:4px;">${respondentLegend(teamRows)}</div>
        </td>
        <td>${renderAnswerCell(teamRows, COLS.vision)}</td>
        <td>${renderAnswerCell(teamRows, COLS.steps)}</td>
        <td>${renderAnswerCell(teamRows, COLS.timeline)}</td>
      </tr>
    `).join('');
  
    tbodySupport.innerHTML = teamEntries.map(([team, teamRows]) => `
      <tr>
        <td>
          <strong>${team}</strong><br/>
          <span style="color:#718096; font-size:0.85rem;">respondents: ${teamRows.length}${TEAM_HEADCOUNT.has(team) ? ` / ${TEAM_HEADCOUNT.get(team)}` : ''}</span><br/>
          <div style="margin-top:4px;">${respondentLegend(teamRows)}</div>
        </td>
        <td>${renderAnswerCell(teamRows, COLS.support)}</td>
        <td>${renderAnswerCell(teamRows, COLS.barriers)}</td>
      </tr>
    `).join('');
  }
  
  fetch(CSV_URL)
    .then(resp => {
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      return resp.text();
    })
    .then(text => {
      const lines = text.split(/\r?\n/);
      const headerIdx = lines.findIndex(l => l.split(',')[0].trim() === HEADER_START);
      if (headerIdx === -1) throw new Error('Could not locate header row starting with "Response ID".');
      const trimmed = lines.slice(headerIdx).join('\n');
  
      Papa.parse(trimmed, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => render(results.data),
        error: (err) => { console.error('CSV parse error:', err); alert('Failed to parse CSV. See console for details.'); }
      });
    })
    .catch(err => {
      console.error('CSV load error:', err);
      alert('Failed to load CSV. Check path/CORS or header detection.');
    });
})();
