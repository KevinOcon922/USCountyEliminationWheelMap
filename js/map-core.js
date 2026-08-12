const CountyMap = (() => {
  const TOPOLOGY_URL = 'assets/us-counties.json';
  const ELIMINATIONS_URL = 'data/eliminations.json';

  let svg, gZoom, gCounties, gCountyBorders, gStateBorders;
  let pathGen, zoomBehavior;
  let countyFeatures = [];   // [{fips, name, state, feature, previous}]
  let featureByFips = {};
  let stateNameByFips = {};
  let eliminations = {};     // {fips: {name, state, date, note, day, previous}}
  let selectedFips = null;
  let clickHandler = null;
  let tooltipEl = null;



  async function loadData() {
    const [topology, elimData] = await Promise.all([
      fetch(TOPOLOGY_URL).then(r => {
        if (!r.ok) throw new Error('Could not load ' + TOPOLOGY_URL + ' (' + r.status + ')');
        return r.json();
      }),
      fetch(ELIMINATIONS_URL + '?v=' + Date.now()).then(r => {
        if (!r.ok) throw new Error('Could not load ' + ELIMINATIONS_URL + ' (' + r.status + ')');
        return r.json();
      })
    ]);

    eliminations = elimData || {};

    topology.objects.states.geometries.forEach(g => {
      stateNameByFips[g.id] = g.properties.name;
    });

    const countiesGeo = topojson.feature(topology, topology.objects.counties);
    countyFeatures = countiesGeo.features.map(f => ({
      fips: f.id,
      name: f.properties.name,
      state: stateNameByFips[f.id.slice(0, 2)] || 'Unknown',
      feature: f
    }));
    featureByFips = {};
    countyFeatures.forEach(c => { featureByFips[c.fips] = c; });

    return { topology };
  }

 

  function init(containerSelector, { onCountyClick } = {}) {
    clickHandler = onCountyClick || null;

    return loadData().then(({ topology }) => {
      const container = document.querySelector(containerSelector);
      container.innerHTML = '';

      const bbox = topology.bbox || [0, 0, 975, 610];
      const pad = 8;
      const vb = [
        bbox[0] - pad,
        bbox[1] - pad,
        (bbox[2] - bbox[0]) + pad * 2,
        (bbox[3] - bbox[1]) + pad * 2
      ];

      svg = d3.select(container)
        .append('svg')
        .attr('id', 'map')
        .attr('viewBox', vb.join(' '))
        .attr('preserveAspectRatio', 'xMidYMid meet');

      buildDefs(svg);

      svg.append('rect')
        .attr('x', vb[0]).attr('y', vb[1])
        .attr('width', vb[2]).attr('height', vb[3])
        .attr('fill', 'transparent');

      gZoom = svg.append('g');
      gCounties = gZoom.append('g').attr('class', 'counties-layer');

      pathGen = d3.geoPath();

      gCounties.selectAll('path.county')
        .data(countyFeatures)
        .join('path')
        .attr('class', 'county')
        .attr('id', d => 'county-' + d.fips)
        .attr('d', d => pathGen(d.feature))
        .on('mouseenter', (event, d) => showTooltip(event, d))
        .on('mousemove', (event) => moveTooltip(event))
        .on('mouseleave', hideTooltip)
        .on('click', (event, d) => selectCounty(d.fips));

      gStateBorders = gZoom.append('path')
        .attr('class', 'state-borders')
        .attr('d', pathGen(topojson.mesh(topology, topology.objects.states, (a, b) => a !== b)));

      zoomBehavior = d3.zoom()
        .scaleExtent([1, 14])
        .on('zoom', (event) => {
          gZoom.attr('transform', event.transform);
        })
        .on('start', () => svg.classed('grabbing', true))
        .on('end', () => svg.classed('grabbing', false));

      svg.call(zoomBehavior);

      applyEliminationStyles();
      setupTooltipEl();

      return { countyFeatures };
    });
  }

  function buildDefs(svg) {
    const defs = svg.append('defs');

    const p = defs.append('pattern')
      .attr('id', 'crossedOutPattern')
      .attr('width', 6)
      .attr('height', 6)
      .attr('patternUnits', 'userSpaceOnUse')
      .attr('patternTransform', 'rotate(45)');
    p.append('rect').attr('width', 6).attr('height', 6).attr('fill', '#5c2422');
    p.append('line').attr('x1', 0).attr('y1', 0).attr('x2', 0).attr('y2', 6)
      .attr('stroke', '#ff6b61').attr('stroke-width', 2.2);
  }

  function setupTooltipEl() {
    tooltipEl = document.querySelector('.map-tooltip');
    //if (!tooltipEl) {
      //tooltipEl = document.createElement('div');
      //tooltipEl.className = 'map-tooltip';
      //document.body.appendChild(tooltipEl);
    //}
  }

  function showTooltip(event, d) {
    if(screen.width > 820) {
      const elim = eliminations[d.fips];
      tooltipEl.innerHTML =
        '<span class="name">' + d.name + ', ' + d.state + '</span>' +
        '<span class="status ' + (elim ? 'elim' : '') + '">' + (elim ? 'Eliminated' : 'Active') + '</span>';
      tooltipEl.style.display = 'block';
      moveTooltip(event);
    } else {
      tooltipEl.style.display = 'none';
  }
  function moveTooltip(event) {
    if (!tooltipEl) return;
    tooltipEl.style.left = (event.clientX + 14) + 'px';
    tooltipEl.style.top = (event.clientY + 14) + 'px';
  }
  function hideTooltip() {
    if (tooltipEl) tooltipEl.style.display = 'none';
  }



  function selectCounty(fips) {
    if (selectedFips) {
      gCounties.select('#county-' + selectedFips).classed('is-selected', false);
    }
    selectedFips = fips;
    gCounties.select('#county-' + fips).classed('is-selected', true).raise();

    if (clickHandler) {
      const record = featureByFips[fips];
      clickHandler(record, eliminations[fips] || null);
    }
  }

  function applyEliminationStyles() {
    gCounties.selectAll('path.county')
      .classed('is-eliminated', d => !!eliminations[d.fips]);
  }

  function setEliminations(newEliminations) {
    eliminations = newEliminations;
    applyEliminationStyles();
  }
  function getEliminations() { return eliminations; }
  function getFeatures() { return countyFeatures; }

  function flash(fips) {
    const sel = gCounties.select('#county-' + fips);
    sel.classed('is-flash', false);
    void sel.node().getBoundingClientRect();
    sel.classed('is-flash', true);
  }



  function zoomToFips(fips) {
    const rec = featureByFips[fips];
    if (!rec) return;
    const [[x0, y0], [x1, y1]] = pathGen.bounds(rec.feature);
    const svgNode = svg.node();
    const vb = svgNode.viewBox.baseVal;
    const w = x1 - x0, h = y1 - y0;
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const scale = Math.max(1, Math.min(10, 0.55 * Math.min(vb.width / w, vb.height / h)));
    const tx = vb.x + vb.width / 2 - scale * cx;
    const ty = vb.y + vb.height / 2 - scale * cy;
    svg.transition().duration(400)
      .call(zoomBehavior.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
    flash(fips);
  }



  function search(query) {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return countyFeatures
      .filter(c => c.name.toLowerCase().includes(q) || c.state.toLowerCase().includes(q))
      .slice(0, 30)
      .sort((a, b) => a.name.localeCompare(b.name));
  }



  function formatDate(isoDate) {
    if (!isoDate) return '';
    const [y, m, d] = isoDate.split('-').map(Number);
    if (!y || !m || !d) return isoDate;
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function todayLocalISO() {
    const d = new Date();
    const off = d.getTimezoneOffset();
    const local = new Date(d.getTime() - off * 60000);
    return local.toISOString().slice(0, 10);
  }

  return {
    init, selectCounty, setEliminations,
    getEliminations, getFeatures, 
    zoomToFips, search,
    formatDate, todayLocalISO
  };
})();
